import React from "react";
import { StyleSheet, View } from "react-native";

import { PAPER_THEMES, usePaperTheme } from "@/context/PaperThemeContext";
import { useSupporter } from "@/lib/revenuecat";
import { PAINT } from "./theme";

/**
 * Paper-textured background. Tinted by the active paper theme so supporters
 * can switch between Classic, Forest, and Dusk palettes.
 *
 * If the user lost their supporter entitlement (e.g., post-churn) but a
 * supporter-only theme is still persisted locally, we transparently fall
 * back to the Classic palette so the perk does not leak.
 */
export function PaperBackground() {
  let bg = PAINT.paper;
  try {
    const { theme } = usePaperTheme();
    const { isSupporter } = useSupporter();
    if (theme.supporterOnly && !isSupporter) {
      bg = PAPER_THEMES[0].paper; // Classic
    } else {
      bg = theme.paper;
    }
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
