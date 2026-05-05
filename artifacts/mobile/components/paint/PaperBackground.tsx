import React from "react";
import { StyleSheet, View } from "react-native";

import { PAINT } from "./theme";

/**
 * Paper-textured background. Implemented as a plain View with a solid
 * background color (no SVG / no Pattern). The dotted texture was removed
 * because react-native-svg <Pattern> + Fabric/New Architecture caused
 * native crashes on iOS when two screens with PaperBackground were mounted
 * simultaneously in the navigation stack.
 */
export function PaperBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={styles.solid} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  solid: { ...StyleSheet.absoluteFillObject, backgroundColor: PAINT.paper },
});
