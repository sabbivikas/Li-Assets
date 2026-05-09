import React from "react";
import { StyleSheet, View } from "react-native";

import { usePaperTheme } from "@/context/PaperThemeContext";
import { PAINT } from "./theme";

/**
 * Paper-textured background. Tinted by the active paper theme so supporters
 * can switch between Classic, Forest, and Dusk palettes.
 */
export function PaperBackground() {
  // usePaperTheme is safe inside any tab/modal screen because the provider
  // is mounted at the root layout. Fall back to PAINT.paper if context isn't
  // ready (during initial mount).
  let bg = PAINT.paper;
  try {
    bg = usePaperTheme().theme.paper;
  } catch {
    /* outside provider — use default */
  }
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.solid, { backgroundColor: bg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  solid: { ...StyleSheet.absoluteFillObject },
});
