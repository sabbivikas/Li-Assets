import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { PAINT } from "./theme";
import { wobbleRect } from "./wobble";

interface Props {
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  intensity?: number;
  seed?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  padding?: number;
}

export function WobbleBox({
  width,
  height,
  fill = "white",
  stroke = PAINT.ink,
  strokeWidth = 2.5,
  intensity = 1.5,
  seed = 1,
  style,
  children,
  padding = 12,
}: Props) {
  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={wobbleRect(4, 4, width - 8, height - 8, intensity, seed)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      {children !== undefined && (
        <View style={{ flex: 1, padding }}>{children}</View>
      )}
    </View>
  );
}
