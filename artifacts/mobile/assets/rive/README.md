# Rive animation assets

This folder holds `.riv` files used by the app via the shared
`<RiveAnimation>` wrapper in `components/RiveAnimation.tsx`.

> **Status (May 2026):** the off-brand community placeholders that
> previously occupied these slots (generic vehicle / avatar demos)
> have been removed. `riveAssets` in
> `components/RiveAnimation.tsx` now exposes `null` for every slot,
> which makes the wrapper render the on-brand RN-Animated fallback
> every caller already provides — on every platform, including dev
> builds with `rive-react-native` linked. To wire up a real scene,
> author it in the Rive editor against the brief below, drop the
> `.riv` file into this folder, and replace the corresponding `null`
> in `riveAssets` with `require("../assets/rive/<file>.riv")`.

The rest of this document is the **designer brief** for replacing
those five files.

---

## Wrapper contract (do not change without updating callers)

The `<RiveAnimation>` wrapper diffs and pushes inputs to a single
state machine per file. Use the conventions below or every screen
that consumes the file will need to be updated.

- One state machine named **`State`** per file.
- One artboard, named to match the filename (e.g. `Globe`, `Pin`).
- File size budget **≤ 200 KB**. Vector only — no embedded bitmaps.
- Looping idle animations should be seamless (start frame == end
  frame) so re-entry doesn't pop.
- Provide a static "first frame" pose that reads correctly even if
  the runtime never advances — this is what users see on slow
  devices.

## Per-file brief

### `globe.riv` — Home screen earth

**Used by:** `components/EarthGlobeRive.tsx` (Home).

Visual direction: a stylized night-side Earth, deep space-blue
(`#04101F`) background, soft cyan continent strokes (`#22D3EE`),
warm species "fireflies" rising out of forested regions as density
climbs. Slow rotation (~40s/loop) on idle. When `locating` is true,
overlay a soft scanning ring sweep around the globe; when `located`
flips to true, snap a single bright pulse from the center outward.

State machine **`State`** inputs:

| name      | type   | range  | meaning                                    |
| --------- | ------ | ------ | ------------------------------------------ |
| `locating` | bool  | —      | scanning overlay active                    |
| `located` | bool   | —      | one-shot "located" pulse, then steady glow |
| `density` | number | 0..1   | firefly count and brightness               |

Acceptance: granting location must produce a visible reaction
within 600ms; raising density from 0 → 1 must be a continuous
visual change, not a step.

### `pin.riv` — User location pin

**Used by:** `components/RiveLocationPin.tsx`, the map and the
onboarding hero on screen 2.

Visual direction: a bioluminescent map drop pin in Life Web green
(`#4ADE80`) sitting above three concentric ripple rings in the
same hue. Idle pose: pin floating gently with a subtle ripple. On
`locating`: ripples accelerate, pin gently bounces. On `located`:
one decisive ripple bursts outward and the pin settles.

State machine **`State`** inputs:

| name      | type | meaning                                  |
| --------- | ---- | ---------------------------------------- |
| `locating` | bool | searching state                         |
| `located` | bool | one-shot bloom into steady glow         |

Acceptance: the pin must read clearly at 56–96px without anti-alias
fuzz; the located bloom must complete within 1.2s.

### `hero.riv` — Onboarding cinematic

**Used by:** `app/onboarding.tsx` hero on screens 0 and 1 (and
optionally 3).

Visual direction: a single artboard that morphs between cinematic
beats keyed by `step` — beat 0: a stylized Earth in space; beat 1:
zoom into a city block; beat 2: zoom into a backyard with floating
species nodes. Transitions between beats should be smooth (no hard
cut), 600–900ms each.

State machine **`State`** inputs:

| name   | type   | range | meaning                          |
| ------ | ------ | ----- | -------------------------------- |
| `step` | number | 0..n  | current onboarding beat          |

Acceptance: setting `step` from 0 → 1 → 2 must never flash white
or briefly show the wrong beat. Out-of-range values clamp to the
nearest beat.

### `loading.riv` — Ambient loading shimmer

**Used by:** `components/RiveLoadingShimmer.tsx` across tabs.

Visual direction: a low-key vine/branch growing and retracting in
Life Web green over a faint dotted geometry. Loops every 2.4s. No
inputs needed; autoplay only.

Acceptance: must not draw attention away from the surrounding card
content; opacity peaks ≤ 0.55.

### `empty.riv` — "No results" state

**Used by:** `components/RiveEmptyState.tsx` across Species,
Signals, Reports, Impact.

Visual direction: a small biodiversity vignette — a bare branch
where one tiny critter appears, looks around, then hides. Loops
every 4–5s. No inputs needed; autoplay only.

Acceptance: must read at 96px square inside a card with the
existing background `#04101F`. Includes its own subtle drop
shadow rather than relying on the host card.

---

## Adding a new `.riv` file

1. Drop the file into this folder.
2. Reference it via `require("../assets/rive/<file>.riv")` and pass
   it through the `<RiveAnimation>` wrapper.
3. If the scene has a state machine, set `stateMachineName` and
   pass an `inputs` object — the wrapper will diff inputs and call
   `setInputState(...)` for each change.
4. Always provide a `fallback` prop (a static or RN-Animated
   equivalent). The wrapper renders it when the native module is
   unavailable (Expo Go, web, reduced motion, or if the runtime
   throws).

## Dev build requirement

`rive-react-native` is a native module. It does **not** load in
Expo Go. Run the app via an Expo development build (`eas build
--profile development` or `npx expo run:ios|android`) to see the
Rive scenes. In Expo Go the wrapper falls back to the existing
RN-Animated visuals.
