// Replit RevenueCat integration: server-side authenticated client.
// Tokens are short-lived; never cache the client.
import { createClient } from "@replit/revenuecat-sdk/client";
import {
  listCustomerActiveEntitlements,
  listEntitlements,
} from "@replit/revenuecat-sdk";

import { logger } from "./logger.js";

const SUPPORTER_ENTITLEMENT_LOOKUP_KEY = "supporter";

let connectionSettings:
  | {
      settings: {
        expires_at?: string;
        access_token?: string;
        oauth?: { credentials?: { access_token?: string } };
      };
    }
  | undefined;

async function getApiKey(): Promise<string> {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    const tok = connectionSettings.settings.access_token;
    if (tok) return tok;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not found for repl/depl");

  const res = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=revenuecat",
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } },
  );
  const data = (await res.json()) as { items?: Array<typeof connectionSettings> };
  connectionSettings = data.items?.[0];

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) {
    throw new Error("RevenueCat not connected");
  }
  return accessToken;
}

async function getRevenueCatClient() {
  const apiKey = await getApiKey();
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: { Authorization: "Bearer " + apiKey },
  });
}

const ENTITLEMENT_TTL_MS = 60_000;
const SUPPORTER_ID_TTL_MS = 10 * 60_000;

export type SupporterStatus = "supporter" | "not_supporter" | "unknown";

interface CacheEntry {
  status: SupporterStatus;
  expiresAt: number;
}
const entitlementCache = new Map<string, CacheEntry>();

interface SupporterIdCache {
  id: string | null; // null = lookup ran but key not found in this project
  expiresAt: number;
}
let supporterIdCache: SupporterIdCache | null = null;

/**
 * Resolves the RevenueCat internal entitlement_id for our "supporter" lookup_key.
 * Cached for 10 minutes. Returns null if the lookup ran but the key is missing
 * (project misconfigured), or throws if RC was unreachable.
 */
async function getSupporterEntitlementId(
  client: ReturnType<typeof createClient>,
  projectId: string,
): Promise<string | null> {
  const now = Date.now();
  if (supporterIdCache && supporterIdCache.expiresAt > now) {
    return supporterIdCache.id;
  }
  const { data, error } = await listEntitlements({
    client,
    path: { project_id: projectId },
    query: { limit: 50 },
  });
  if (error) throw error;
  const match = data?.items?.find(
    (e) => e.lookup_key === SUPPORTER_ENTITLEMENT_LOOKUP_KEY,
  );
  supporterIdCache = {
    id: match?.id ?? null,
    expiresAt: now + SUPPORTER_ID_TTL_MS,
  };
  if (!match) {
    logger.warn(
      { lookupKey: SUPPORTER_ENTITLEMENT_LOOKUP_KEY, projectId },
      "supporter entitlement lookup_key not found in RevenueCat project",
    );
  }
  return supporterIdCache.id;
}

/**
 * Resolves the supporter status for the given app_user_id (Clerk userId).
 * Cached for 60s.
 *
 * Returns:
 *   - "supporter"     — RC confirms an active entitlement
 *   - "not_supporter" — RC confirms no active entitlement (incl. unknown customer)
 *   - "unknown"       — RC was unreachable / errored / not configured
 *
 * Callers should treat "unknown" as a non-supporter for any paid feature
 * gating: we never grant supporter perks unless RC explicitly confirms the
 * entitlement. The /openai/generate-report route fails closed on "unknown"
 * so the free-tier cap stays enforced when RC is misconfigured/unreachable.
 */
export async function getSupporterStatus(
  appUserId: string,
): Promise<SupporterStatus> {
  if (!process.env.REVENUECAT_PROJECT_ID) return "unknown";
  const cached = entitlementCache.get(appUserId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.status;

  const setCache = (status: SupporterStatus, ttl = ENTITLEMENT_TTL_MS) => {
    entitlementCache.set(appUserId, { status, expiresAt: now + ttl });
    return status;
  };

  try {
    const client = await getRevenueCatClient();
    const projectId = process.env.REVENUECAT_PROJECT_ID;

    // Resolve the supporter entitlement_id (cached). If the lookup_key isn't
    // found in this project, fail closed with "unknown" so paid features stay
    // gated until config is corrected.
    const supporterId = await getSupporterEntitlementId(client, projectId);
    if (!supporterId) return setCache("unknown", 30_000);

    const { data, error } = await listCustomerActiveEntitlements({
      client,
      path: {
        project_id: projectId,
        customer_id: appUserId,
      },
      query: { limit: 50 },
    });
    if (error) {
      // 404 = customer doesn't exist yet (never made a purchase) — definitively not a supporter.
      const isNotFound =
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type?: string }).type === "resource_not_found";
      if (isNotFound) return setCache("not_supporter");
      logger.warn({ err: error, appUserId }, "revenuecat entitlement check failed");
      // Cache "unknown" briefly to avoid hammering RC during an outage.
      return setCache("unknown", 15_000);
    }
    // Explicitly require the supporter entitlement_id; any other active
    // entitlement (future tiers, A/B grants, etc.) does NOT bypass the cap.
    const hasSupporter = (data?.items ?? []).some(
      (e) => e.entitlement_id === supporterId,
    );
    return setCache(hasSupporter ? "supporter" : "not_supporter");
  } catch (err) {
    logger.warn({ err, appUserId }, "revenuecat entitlement check threw");
    return setCache("unknown", 15_000);
  }
}
