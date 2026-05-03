import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 *
 * Life Web is intentionally dark-only — this hook always returns the
 * dark palette regardless of the device's appearance setting, plus
 * scheme-independent values like `radius`. If `constants/colors.ts`
 * ever drops the `dark` key we fall back to the light palette so the
 * app still renders.
 */
export function useColors() {
  const palette = colors.dark ?? colors.light;
  return { ...palette, radius: colors.radius };
}
