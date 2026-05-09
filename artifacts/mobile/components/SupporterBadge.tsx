import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HAND_FONT, PAINT } from "@/components/paint";

export function SupporterBadge({
  size = "md",
}: {
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <View style={[styles.wrap, small && styles.wrapSm]}>
      <Svg width={small ? 12 : 14} height={small ? 12 : 14} viewBox="0 0 24 24">
        <Path
          d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"
          fill={PAINT.red}
          stroke={PAINT.ink}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={[styles.text, small && styles.textSm]}>supporter</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  wrapSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  text: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.ink,
    lineHeight: 16,
  },
  textSm: {
    fontSize: 12,
    lineHeight: 14,
  },
});
