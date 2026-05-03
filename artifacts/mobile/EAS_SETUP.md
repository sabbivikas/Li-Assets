# Publishing Natura to TestFlight

Natura uses **Replit's Expo Launch** for iOS builds and TestFlight submission.
Do NOT run `eas build` or `eas submit` manually — Replit handles that for you.

## Prerequisites

- Apple Developer Program membership (paid, $99/year)
- App already created in App Store Connect with Bundle ID `app.replit.natura`
- Expo account: `vikas_sabbi` (expo.dev)

## Credentials (enter when Replit prompts during publish)

| Field | Value |
|---|---|
| Apple ID | sabbi.vikas@gmail.com |
| Apple Team ID | BA9NL64C62 |
| App Store Connect App ID | 6766054385 |
| Bundle ID | app.replit.natura |

## How to publish

1. Click the **Publish** button in Replit's top bar
2. Select the **Natura** mobile artifact
3. When prompted, connect your Apple Developer account using the credentials above
4. Replit builds the native iOS binary in the cloud and submits to TestFlight automatically
5. After Apple's beta review passes (usually a few hours), the build appears in TestFlight

## Environment secrets needed for the build

These are already set as Replit secrets and will be injected automatically:

- `CLERK_PUBLISHABLE_KEY` → injected as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_INATURALIST_API_TOKEN` → used directly

No manual `eas secret:create` steps needed.

## App config

- `app.json` owner: `vikas_sabbi`
- Bundle ID: `app.replit.natura`
- Version: `1.0.0` / Build number: `1`
- To bump the build number for a new TestFlight build, increment `buildNumber` in `app.json`
