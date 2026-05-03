# EAS Build Setup for Natura

Follow these steps before running `eas build` or `eas submit` for the first time.

## 1. Set your EAS account slug

Open `artifacts/mobile/app.json` and replace `REPLACE_WITH_EAS_ACCOUNT_SLUG`
with your Expo / EAS username or organization slug (visible at expo.dev).

## 2. Register EAS secrets

The production build needs your Clerk publishable key injected at bundle time.
Run the following from the repo root (EAS secrets are project-scoped):

```bash
eas secret:create \
  --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY \
  --value pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --scope project
```

Once registered the secret is automatically injected into every EAS build
without needing to list it in `eas.json`.

## 3. Fill in Apple submission credentials

Open `eas.json` and fill in the three fields under `submit.production.ios`:

| Field | Where to find it |
|---|---|
| `appleId` | Your Apple ID email (e.g. you@example.com) |
| `appleTeamId` | 10-character team ID from developer.apple.com > Account > Membership |
| `ascAppId` | Numeric App ID from App Store Connect > App Information |

## 4. Build and submit

```bash
# From the repo root:
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

EAS auto-detects pnpm from the `pnpm-lock.yaml` and `packageManager` field in
`artifacts/mobile/package.json` and installs from the workspace root, so all
`workspace:*` dependencies resolve correctly.
