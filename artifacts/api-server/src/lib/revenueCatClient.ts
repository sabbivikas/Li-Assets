// Replit RevenueCat integration: server-side authenticated client.
// Tokens are short-lived; never cache the client.
import { createClient } from "@replit/revenuecat-sdk/client";
import { listCustomerActiveEntitlements } from "@replit/revenuecat-sdk";

import { logger } from "./logger.js";

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

interface CacheEntry {
  isSupporter: boolean;
  expiresAt: number;
}
const entitlementCache = new Map<string, CacheEntry>();

/**
 * Returns true if the given app_user_id (Clerk userId) has the
 * "supporter" entitlement active in RevenueCat. Cached for 60s.
 *
 * Returns false on any error (graceful degrade so AI generation
 * isn't blocked by a RevenueCat outage — but the free-tier cap
 * still applies to non-supporters in that case).
 */
export async function hasSupporterEntitlement(
  appUserId: string,
): Promise<boolean> {
  if (!process.env.REVENUECAT_PROJECT_ID) return false;
  const cached = entitlementCache.get(appUserId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.isSupporter;

  try {
    const client = await getRevenueCatClient();
    const { data, error } = await listCustomerActiveEntitlements({
      client,
      path: {
        project_id: process.env.REVENUECAT_PROJECT_ID,
        customer_id: appUserId,
      },
      query: { limit: 50 },
    });
    if (error) {
      // 404 means customer doesn't exist yet (never made a purchase) — that's not a supporter.
      const isNotFound =
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type?: string }).type === "resource_not_found";
      if (!isNotFound) {
        logger.warn({ err: error, appUserId }, "revenuecat entitlement check failed");
      }
      entitlementCache.set(appUserId, { isSupporter: false, expiresAt: now + ENTITLEMENT_TTL_MS });
      return false;
    }
    // The "supporter" entitlement is the only one we provision in this project,
    // so any active entitlement on the customer means they have supporter access.
    const isSupporter = (data?.items?.length ?? 0) > 0;
    entitlementCache.set(appUserId, { isSupporter, expiresAt: now + ENTITLEMENT_TTL_MS });
    return isSupporter;
  } catch (err) {
    logger.warn({ err, appUserId }, "revenuecat entitlement check threw");
    entitlementCache.set(appUserId, { isSupporter: false, expiresAt: now + ENTITLEMENT_TTL_MS });
    return false;
  }
}
