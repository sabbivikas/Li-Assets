import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { HAND_FONT, PAINT } from "./theme";
import { wobble, wobbleRect } from "./wobble";

interface Props {
  label: string;
  onPress?: () => void;
  color?: string;
  width?: number;
  height?: number;
  seed?: number;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "search" | "image" | "keyboardkey" | "text" | "adjustable" | "imagebutton" | "header" | "summary" | "none";
}

export function WobbleButton({
  label,
  onPress,
  color = PAINT.grass,
  width = 260,
  height = 60,
  seed = 5,
  loading = false,
  disabled = false,
  style,
  textColor = PAINT.ink,
  leading,
  accessibilityLabel,
  accessibilityRole = "button",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
      style={({ pressed }) => [
        { width, height },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.85, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={wobbleRect(4, 4, width - 8, height - 8, 1.8, seed)}
          fill={color}
          stroke={PAINT.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path
          d={wobble(20, 14, width - 20, 14, 0.8, 8, seed + 4)}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={2}
          fill="none"
        />
      </Svg>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={PAINT.ink} />
        ) : (
          <>
            {leading}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontFamily: HAND_FONT,
    fontSize: 24,
  },
});
