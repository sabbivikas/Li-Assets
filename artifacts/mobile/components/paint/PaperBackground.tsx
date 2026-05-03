import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { PAINT } from "./theme";

export function PaperBackground() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={styles.solid} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="paperDots" width={31} height={31} patternUnits="userSpaceOnUse">
            <Circle cx={6} cy={9} r={0.9} fill="rgba(180,140,100,0.18)" />
            <Circle cx={20} cy={22} r={0.7} fill="rgba(180,140,100,0.12)" />
            <Circle cx={14} cy={2} r={0.6} fill="rgba(180,140,100,0.10)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#paperDots)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  solid: { ...StyleSheet.absoluteFillObject, backgroundColor: PAINT.paper },
});
