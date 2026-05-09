import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import {
  GenerateReportWithAIBody,
  type GenerateReportRequest,
  type GenerateReportResponse,
  type GenerateReportSpecies,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

import { getSupporterStatus } from "../lib/revenueCatClient.js";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You write short civic biodiversity report narratives for the "Life Web" app.
The report is generated from publicly available iNaturalist community-science observations.
Tone: warm, grounded, careful, neighborly. Hand-written field-notebook voice.
- Never make legal, medical, or formal scientific claims.
- Use hedged language: "may suggest", "appears", "could indicate", "worth a closer look".
- Never invent species, numbers, or locations beyond what is provided.
- Treat absence of data as inconclusive, not as proof of decline.
- Keep prose plain and readable — no jargon, no purple prose, no marketing.
You must respond with a single valid JSON object matching the requested schema. No prose outside the JSON.`;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000;
const USER_LIMIT = 10;
const IP_LIMIT = 20;

const userRateMap = new Map<string, RateLimitEntry>();
const ipRateMap = new Map<string, RateLimitEntry>();

const userConcurrency = new Map<string, number>();
const MAX_USER_CONCURRENCY = 2;

// Free-tier monthly cap. Server-side source of truth so clearing local
// storage on the device cannot bypass the limit. Supporters bypass via
// active "supporter" entitlement in RevenueCat.
const FREE_MONTHLY_REPORT_CAP = 5;
const monthlyReportCount = new Map<string, number>();

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthlyKey(userId: string): string {
  return `${userId}:${currentYearMonth()}`;
}

function purgeStaleMonthlyEntries(): void {
  const ym = currentYearMonth();
  for (const key of monthlyReportCount.keys()) {
    if (!key.endsWith(`:${ym}`)) monthlyReportCount.delete(key);
  }
}
setInterval(purgeStaleMonthlyEntries, 60 * 60_000).unref();

function purgeStaleEntries(): void {
  const now = Date.now();
  for (const [key, entry] of userRateMap) {
    if (now - entry.windowStart > WINDOW_MS) userRateMap.delete(key);
  }
  for (const [key, entry] of ipRateMap) {
    if (now - entry.windowStart > WINDOW_MS) ipRateMap.delete(key);
  }
}

setInterval(purgeStaleEntries, WINDOW_MS).unref();

function checkRateLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= limit) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function aiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = getAuth(req).userId ?? null;
  const ip = req.ip ?? "unknown";

  const ipCheck = checkRateLimit(ipRateMap, ip, IP_LIMIT);
  if (!ipCheck.allowed) {
    res
      .status(429)
      .set("Retry-After", String(ipCheck.retryAfterSec))
      .json({
        error: "rate_limit_exceeded",
        message: "Too many requests from this IP. Please wait before retrying.",
        retryAfterSec: ipCheck.retryAfterSec,
      });
    return;
  }

  if (userId !== null) {
    const userCheck = checkRateLimit(userRateMap, userId, USER_LIMIT);
    if (!userCheck.allowed) {
      res
        .status(429)
        .set("Retry-After", String(userCheck.retryAfterSec))
        .json({
          error: "rate_limit_exceeded",
          message: "Too many report requests. Please wait before retrying.",
          retryAfterSec: userCheck.retryAfterSec,
        });
      return;
    }

    const concurrent = userConcurrency.get(userId) ?? 0;
    if (concurrent >= MAX_USER_CONCURRENCY) {
      res
        .status(429)
        .set("Retry-After", "5")
        .json({
          error: "concurrent_limit_exceeded",
          message: "A report is already being generated. Please wait.",
          retryAfterSec: 5,
        });
      return;
    }
  }

  next();
}

router.post(
  "/openai/generate-report",
  requireAuth(),
  aiRateLimiter,
  async (req, res) => {
    const userId = getAuth(req).userId ?? null;

    if (userId !== null) {
      userConcurrency.set(userId, (userConcurrency.get(userId) ?? 0) + 1);
    }

    const release = () => {
      if (userId !== null) {
        const current = userConcurrency.get(userId) ?? 1;
        if (current <= 1) {
          userConcurrency.delete(userId);
        } else {
          userConcurrency.set(userId, current - 1);
        }
      }
    };

    const parsed = GenerateReportWithAIBody.safeParse(req.body);
    if (!parsed.success) {
      release();
      req.log.warn({ err: parsed.error.flatten() }, "invalid generate-report body");
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }

    const ctx = parsed.data as GenerateReportRequest;

    // Free-tier monthly cap enforcement (server-side source of truth).
    // Supporters bypass the cap via active "supporter" entitlement; everyone
    // else (including "unknown" when RC is unreachable) is rate-limited.
    // NOTE: counts are kept in-memory and reset on restart — acceptable for the
    // current single-instance deployment. Move to durable storage if scaled out.
    let shouldCountUsage = false;
    let usageKey: string | null = null;
    if (userId !== null) {
      const supporterStatus = await getSupporterStatus(userId);
      // Fail closed: enforce the cap unless we explicitly confirm the user
      // is a supporter. Treating "unknown" as not-a-supporter keeps the free
      // tier honest when RevenueCat is unconfigured/unreachable, which is the
      // current deployment reality before the seed step has run.
      if (supporterStatus !== "supporter") {
        usageKey = monthlyKey(userId);
        const used = monthlyReportCount.get(usageKey) ?? 0;
        if (used >= FREE_MONTHLY_REPORT_CAP) {
          release();
          res.status(402).json({
            error: "free_cap_reached",
            message:
              "You've reached this month's free AI report limit. Become a Natura Supporter for unlimited reports.",
            used,
            limit: FREE_MONTHLY_REPORT_CAP,
          });
          return;
        }
        shouldCountUsage = true;
      }
    }

    const userPrompt = [
      `Report type: ${ctx.type}`,
      `Area: ${ctx.city}`,
      `Radius: ${ctx.radiusKm} km`,
      `Group filter: ${ctx.group}`,
      `Recent research-grade observations (current window): ${ctx.recentObservations}`,
      `Historical observations (prior years, comparable window): ${ctx.historicalObservations}`,
      `Unique species observed: ${ctx.uniqueSpecies}`,
      ctx.focusSpecies
        ? `Focus species: ${ctx.focusSpecies.commonName} (${ctx.focusSpecies.scientificName}) — role: ${ctx.focusSpecies.role ?? "unspecified"}, recent count: ${ctx.focusSpecies.recentCount}, conservation: ${ctx.focusSpecies.conservation ?? "least concern"}`
        : "No single focus species.",
      "",
      "Top species near the user (up to 5):",
      ...ctx.topSpecies.slice(0, 5).map(
        (s: GenerateReportSpecies, i: number) =>
          `  ${i + 1}. ${s.commonName} (${s.scientificName}) — role: ${s.role ?? "—"}, recent: ${s.recentCount}, conservation: ${s.conservation ?? "—"}`
      ),
      "",
      "Write a short report. Return ONLY a JSON object with these exact keys:",
      "  title:           string — concise, includes the city; do not include the report type's emoji",
      "  executiveSummary: string — 2 to 3 sentences",
      "  keyFinding:      string — 1 sentence stating the main observation",
      "  whyItMatters:    string — 2 to 3 sentences on ecological context",
      "  bullets:         array of exactly 3 short strings (max ~14 words each) for an email summary",
      "  recommendations: array of 4 short imperative strings (max ~12 words each)",
      "",
      "Write in plain prose. Do not use markdown formatting inside any string.",
    ].join("\n");

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "";
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch (e) {
        req.log.error({ raw }, "openai returned non-json");
        res.status(500).json({ error: "ai_invalid_json" });
        return;
      }

      const obj = parsedJson as Partial<GenerateReportResponse>;
      if (
        typeof obj.title !== "string" ||
        typeof obj.executiveSummary !== "string" ||
        typeof obj.keyFinding !== "string" ||
        typeof obj.whyItMatters !== "string" ||
        !Array.isArray(obj.bullets) ||
        !Array.isArray(obj.recommendations)
      ) {
        req.log.error({ obj }, "openai returned malformed shape");
        res.status(500).json({ error: "ai_malformed_shape" });
        return;
      }

      const out: GenerateReportResponse = {
        title: obj.title,
        executiveSummary: obj.executiveSummary,
        keyFinding: obj.keyFinding,
        whyItMatters: obj.whyItMatters,
        bullets: obj.bullets.slice(0, 3).map(String),
        recommendations: obj.recommendations.slice(0, 4).map(String),
      };
      // Only count successful generations against the free-tier cap.
      if (shouldCountUsage && usageKey !== null) {
        monthlyReportCount.set(usageKey, (monthlyReportCount.get(usageKey) ?? 0) + 1);
      }
      res.json(out);
    } catch (err) {
      req.log.error({ err }, "openai generate-report failed");
      res.status(500).json({ error: "ai_request_failed" });
    } finally {
      release();
    }
  }
);

export default router;
