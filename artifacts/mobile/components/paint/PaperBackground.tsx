import React from "react";
import { StyleSheet, View } from "react-native";

import { PAPER_THEMES, usePaperTheme } from "@/context/PaperThemeContext";
import { useSupporter } from "@/lib/revenuecat";

/**
 * Paper-textured background. Tinted by the active paper theme so supporters
 * can switch between Classic, Forest, and Dusk palettes.
 *
 * If the user lost their supporter entitlement (e.g., post-churn) but a
 * supporter-only theme is still persisted locally, we transparently fall
 * back to the Classic palette so the perk does not leak.
 */
export function PaperBackground() {
  const { theme } = usePaperTheme();
  const { isSupporter } = useSupporter();
  const active =
    theme.supporterOnly && !isSupporter ? PAPER_THEMES[0] : theme;
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={[styles.solid, { backgroundColor: active.paper }]} />
      {/* Subtle deeper-paper band along the top edge so theme palette
          differences (paperDeep) read clearly between Classic / Forest / Dusk. */}
      <View
        style={[styles.topBand, { backgroundColor: active.paperDeep }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  solid: { ...StyleSheet.absoluteFillObject },
  topBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.55,
  },
});
