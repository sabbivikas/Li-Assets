import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { LABEL_FONT, PAINT } from "@/components/paint/theme";
import { WobbleBox } from "@/components/paint";
import {
  RARITY_META,
  type BadgeRarity,
  type BadgeState,
} from "@/services/badges";

type Size = "sm" | "md" | "lg";

interface Props {
  state: BadgeState;
  size?: Size;
  showLabel?: boolean;
  style?: ViewStyle;
  seed?: number;
}

const SIZES: Record<Size, { box: number; icon: number; ring: number; stroke: number }> = {
  sm: { box: 70, icon: 24, ring: 64, stroke: 4 },
  md: { box: 96, icon: 32, ring: 88, stroke: 5 },
  lg: { box: 150, icon: 56, ring: 140, stroke: 7 },
};

function rarityFill(rarity: BadgeRarity, unlocked: boolean): string {
  if (!unlocked) return PAINT.paperDeep;
  switch (rarity) {
    case "keystone":
      return PAINT.cream;
    case "rare":
      return "#efe7ff";
    case "uncommon":
      return "#e7f7e0";
    case "legacy":
      return "#fde6ee";
    case "common":
    default:
      return "white";
  }
}

export function BadgeMedal({
  state,
  size = "md",
  showLabel = false,
  style,
  seed = 7,
}: Props) {
  const dims = SIZES[size];
  const { def, progress, unlocked } = state;
  const rarity = RARITY_META[def.rarity];
  const fill = rarityFill(def.rarity, unlocked);
  const stroke = unlocked ? rarity.color : PAINT.inkMute;
  const ringColor = unlocked ? rarity.ring : PAINT.paperDeep;

  const ratio = Math.min(1, progress / def.target);
  const radius = dims.ring / 2 - dims.stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const a11yLabel = unlocked
    ? `${def.name} badge, ${rarity.label}, earned`
    : `${def.name} badge, ${rarity.label}, locked, ${progress} of ${def.target}`;

  return (
    <View
      style={[{ alignItems: "center" }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: !unlocked }}
    >
      <View>
        <WobbleBox
          width={dims.box}
          height={dims.box}
          fill={fill}
          stroke={stroke}
          strokeWidth={unlocked ? 2.5 : 1.8}
          seed={seed}
          padding={0}
        >
          <View style={styles.center}>
            <Feather
              name={def.icon as keyof typeof Feather.glyphMap}
              size={dims.icon}
              color={unlocked ? rarity.color : PAINT.inkMute}
            />
          </View>
        </WobbleBox>
        {/* Progress ring (only when not yet unlocked and any progress) */}
        {!unlocked && ratio > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.ringWrap,
              { width: dims.ring, height: dims.ring, top: (dims.box - dims.ring) / 2, left: (dims.box - dims.ring) / 2 },
            ]}
          >
            <Svg width={dims.ring} height={dims.ring}>
              <Circle
                cx={dims.ring / 2}
                cy={dims.ring / 2}
                r={radius}
                stroke={ringColor}
                strokeWidth={dims.stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${dashOffset}`}
                transform={`rotate(-90 ${dims.ring / 2} ${dims.ring / 2})`}
                opacity={0.85}
              />
            </Svg>
          </View>
        ) : null}
        {/* Lock indicator */}
        {!unlocked ? (
          <View style={styles.lockDot}>
            <Feather name="lock" size={10} color={PAINT.inkSoft} />
          </View>
        ) : null}
        {/* Keystone shine */}
        {unlocked && def.rarity === "keystone" ? (
          <View style={[styles.shine, { backgroundColor: PAINT.sun }]} />
        ) : null}
      </View>
      {showLabel ? (
        <Text
          style={[
            styles.label,
            { color: unlocked ? PAINT.ink : PAINT.inkMute },
          ]}
          numberOfLines={2}
        >
          {def.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  ringWrap: { position: "absolute" },
  lockDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PAINT.paper,
    borderWidth: 1.5,
    borderColor: PAINT.inkMute,
    alignItems: "center",
    justifyContent: "center",
  },
  shine: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.85,
  },
  label: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 110,
    lineHeight: 14,
  },
});
