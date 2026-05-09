/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";
import type { IncomingHttpHeaders } from "http";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Normalizes a hostname for allowlist comparison: lowercases it and strips the
 * default port suffix (:80 for http, :443 for https) so that platform-provided
 * hostnames and request Host headers compare consistently regardless of how the
 * proxy or client formats them.
 */
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:(80|443)$/, "");
}

/**
 * The set of trusted hostnames, built once at startup from REPLIT_DOMAINS.
 * Entries are normalized so comparisons against request Host values are stable.
 * In production this set must be non-empty; if it is empty the server has no
 * reliable way to validate the effective host and will fail closed.
 */
const trustedHosts: Set<string> = new Set(
  (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => normalizeHost(d.trim()))
    .filter(Boolean),
);

/**
 * Extracts the leftmost raw host value from forwarding headers or the Host
 * header without any validation. Callers must validate this value before use
 * in security-sensitive contexts.
 */
function extractRawHost(headers: IncomingHttpHeaders): string | undefined {
  const forwarded = headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const fromForwarded = raw?.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;
  return headers.host?.trim() || undefined;
}

/**
 * Returns the validated canonical public hostname for Clerk authentication.
 *
 * In production the effective host (from x-forwarded-host or Host) is checked
 * against the REPLIT_DOMAINS allowlist:
 *   - If it matches, the validated hostname is returned.
 *   - If it does not match, or if REPLIT_DOMAINS is empty (no allowlist
 *     configured), undefined is returned so callers can reject the request.
 *     This is fail-closed behaviour: an unknown or unconfigured production host
 *     never reaches Clerk key derivation or Clerk-Proxy-Url construction.
 *
 * In non-production environments no allowlist is enforced so local dev flows
 * are unaffected.
 *
 * Exported so that app.ts (clerkMiddleware callback) and this proxy middleware
 * agree on which hostname is canonical.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const raw = extractRawHost(req.headers);
  if (!IS_PRODUCTION) {
    return raw;
  }
  if (!raw) {
    return undefined;
  }
  const normalized = normalizeHost(raw);
  if (trustedHosts.size === 0 || !trustedHosts.has(normalized)) {
    return undefined;
  }
  return normalized;
}

/**
 * Returns a safe protocol string for use in Clerk-Proxy-Url.
 * In production, always returns "https" — Replit production traffic is always
 * TLS-terminated at the platform edge, so the scheme is never ambiguous and
 * must not be derived from client-supplied headers.
 * In non-production, accepts only the literal strings "http" or "https" from
 * x-forwarded-proto, defaulting to "https" for any other value.
 */
function getTrustedProto(headers: IncomingHttpHeaders): string {
  if (IS_PRODUCTION) {
    return "https";
  }
  const raw = headers["x-forwarded-proto"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  return value === "http" ? "http" : "https";
}

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (!IS_PRODUCTION) {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const host = getClerkProxyHost(req);
        if (!host) {
          proxyReq.destroy(new Error("untrusted host for Clerk proxy"));
          return;
        }

        const protocol = getTrustedProto(req.headers);
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
    },
  }) as RequestHandler;
}
