import { Router, type IRouter } from "express";
import { requireAuth } from "@clerk/express";
import {
  GenerateReportWithAIBody,
  type GenerateReportRequest,
  type GenerateReportResponse,
  type GenerateReportSpecies,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

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

router.post("/openai/generate-report", requireAuth(), async (req, res) => {
  const parsed = GenerateReportWithAIBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ err: parsed.error.flatten() }, "invalid generate-report body");
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const ctx = parsed.data as GenerateReportRequest;

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
    res.json(out);
  } catch (err) {
    req.log.error({ err }, "openai generate-report failed");
    res.status(500).json({ error: "ai_request_failed" });
  }
});

export default router;
