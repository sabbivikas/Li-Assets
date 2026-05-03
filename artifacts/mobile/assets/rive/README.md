# Rive animation assets

This folder holds `.riv` files used by the app via the shared `<RiveAnimation>`
wrapper in `components/RiveAnimation.tsx`.

## Conventions

- Filenames map 1:1 to a logical role in the UI:
  - `globe.riv` — Home screen earth/globe (state machine inputs:
    `locating: bool`, `located: bool`, `density: number 0..1`).
  - `pin.riv` — User location pin overlay on the map and onboarding
    (`locating: bool`, `located: bool`).
  - `loading.riv` — Shared loading shimmer / spinner for tab content.
  - `empty.riv` — Empty / "no results" state across Species, Signals,
    Reports, Impact.
  - `hero.riv` — Onboarding hero scenes (`step: number 0..n` to advance
    between cinematic beats).
- Use a single state machine named `State` per file so the wrapper can drive
  inputs uniformly. Any other state machine name still works — pass it via
  the `stateMachineName` prop.
- Keep individual files small (target < 200 KB). Prefer vector-only scenes;
  bitmap embeds defeat the size advantage.

## Adding a new `.riv` file

1. Drop the file into this folder.
2. Reference it via `require("../assets/rive/<file>.riv")` and pass through
   the `<RiveAnimation>` wrapper.
3. If the scene has a state machine, set `stateMachineName` and pass an
   `inputs` object — the wrapper will diff inputs and call
   `setInputState(...)` for each change.
4. Always provide a `fallback` prop (a static or RN-Animated equivalent).
   The wrapper renders it when the native module is unavailable
   (Expo Go, web, reduced motion).

## Current assets

The files checked in today are starter community placeholders sourced from
the public Rive examples (`avatars.riv` from rive-app/rive-react-native and
two demo scenes from `cdn.rive.app`). They give the wrapper something to
load on a dev build but are **not** themed for Life Web. Follow-up work:
commission or curate proper biodiversity-themed scenes for the slots above.

## Dev build requirement

`rive-react-native` is a native module. It does **not** load in Expo Go.
Run the app via an Expo development build (`eas build --profile
development` or `npx expo run:ios|android`) to see the Rive scenes. In
Expo Go the wrapper falls back to the existing RN-Animated visuals.
