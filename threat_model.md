# Threat Model

## Project Overview

This is a pnpm workspace TypeScript monorepo for the Life Web / Natura application. The production backend is an Express 5 API server in `artifacts/api-server`, using Clerk authentication and Replit AI/OpenAI integration to generate civic biodiversity report narratives. The primary client is an Expo React Native mobile app in `artifacts/mobile` that signs users in with Clerk, fetches public biodiversity data from iNaturalist, and calls the backend AI endpoint with a bearer token. The repository also contains shared generated OpenAPI/Zod/API-client packages under `lib/`, a Drizzle/PostgreSQL library scaffold, build scripts, and a mockup sandbox that is development-only.

Production assumptions: `NODE_ENV` is set to `production`; Replit platform TLS terminates client/server traffic; the mockup sandbox is never deployed to production and is out of scope unless production reachability is demonstrated.

## Assets

- **User accounts and sessions** -- Clerk session tokens and user profile information. Compromise allows account impersonation and access to authenticated AI/report functionality.
- **Application secrets** -- Clerk secret keys, OpenAI integration API keys/base URL, and any database connection strings. Leakage could allow unauthorized auth-provider, AI-provider, or database access.
- **AI provider quota and generated content** -- The `/api/openai/generate-report` endpoint consumes paid/limited AI resources and returns civic report text shown to users.
- **Location-derived report context** -- City/radius/species observations sent by the mobile app may reveal approximate user location or interests, even though source observations are public iNaturalist data.
- **Saved reports on device** -- Reports saved in mobile storage are user-facing civic messages and may include location/species context.

## Trust Boundaries

- **Mobile/browser client to API server** -- Requests to `artifacts/api-server/src/routes/*` cross from untrusted clients into the backend. The server must authenticate protected endpoints, validate request bodies, constrain resource use, and avoid trusting client-supplied report context beyond narrative generation.
- **API server to Clerk** -- Authentication depends on Clerk middleware and the production Clerk frontend proxy under `/api/__clerk`. Proxy headers must not allow attacker-controlled hosts/protocols to confuse Clerk configuration.
- **API server to OpenAI/Replit AI integration** -- The backend sends prompts derived from client-supplied report context to the AI provider with server-side secrets. Prompt size/content must be constrained to control cost and prevent provider-side abuse.
- **API server to database** -- The shared DB package uses PostgreSQL/Drizzle, but current production API routes do not appear to perform database reads/writes. Future use must keep queries parameterized and scoped.
- **Mobile app to external public APIs** -- The mobile app fetches public iNaturalist data and opens external URLs. External URLs and media are untrusted and must be treated as display/navigation data only.
- **Development-only surfaces** -- `artifacts/mockup-sandbox`, generated Vite preview code, and build scripts are out of production scope unless deployed or reachable from production.

## Scan Anchors

- Production API entry point: `artifacts/api-server/src/app.ts`, mounted routes in `artifacts/api-server/src/routes/index.ts`.
- Authenticated AI endpoint: `artifacts/api-server/src/routes/openai.ts` (`POST /api/openai/generate-report`, Clerk `requireAuth`).
- Clerk production proxy: `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`, mounted at `/api/__clerk` before body parsing.
- Shared request/response schemas: `lib/api-spec/openapi.yaml`, `lib/api-zod/src/generated/api.ts`, `lib/api-client-react/src/custom-fetch.ts`.
- Mobile auth/API call sites: `artifacts/mobile/app/_layout.tsx`, `artifacts/mobile/app/(auth)/sign-in.tsx`, `artifacts/mobile/services/aiReport.ts`, `artifacts/mobile/app/(tabs)/reports.tsx`.
- Public/unauthenticated surfaces: `/api/healthz`, mobile screens using public iNaturalist APIs, static mobile web serving if deployed.
- Dev-only/out-of-scope areas: `artifacts/mockup-sandbox`, mockup preview plugin, attached design assets, and local build scripts unless production reachability is shown.

## Threat Categories

### Spoofing

The API relies on Clerk middleware to identify authenticated users. Protected endpoints that access paid resources or user data must require Clerk authentication server-side, not just rely on the mobile client. Clerk proxy behavior must derive public host/protocol only from trusted platform forwarding headers to avoid auth-domain confusion.

### Tampering

Clients can send arbitrary report context to `/api/openai/generate-report`. The server must validate types, ranges, string lengths, and array sizes; it must not rely on mobile UI constraints. Any future database-backed reports or profile data must use server-side authorization and parameterized database operations.

### Information Disclosure

Request logs, AI error logs, and API responses must not expose auth tokens, provider secrets, stack traces, or unnecessary location/report context. Browser-facing CORS policy must not allow arbitrary origins to read authenticated API responses. Mobile navigation to external URLs must treat URLs as untrusted.

### Denial of Service

AI generation is comparatively expensive. Authenticated users, compromised sessions, or cross-origin browser requests must not be able to trigger unbounded AI calls or large prompts. Public endpoints should remain cheap, and body size/timeouts/rate limits should protect production resources.

### Elevation of Privilege

Any future admin, database, or report-management endpoints must enforce role/ownership checks on the server. Build-time and development utilities should not be reachable in production. File and shell operations in scripts are out of production scope unless exposed through deployed routes.
