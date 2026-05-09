import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

import { HAND_FONT, PAINT } from "@/components/paint";
import { useSupporter } from "@/lib/revenuecat";

type Props = {
  compact?: boolean;
};

export function SupportButton({ compact = false }: Props) {
  const router = useRouter();
  const { isSupporter } = useSupporter();

  function handlePress() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push("/support");
  }

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          isSupporter && styles.iconBtnSupporter,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isSupporter ? "supporter" : "support Natura"}
      >
        {isSupporter ? (
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"
              fill={PAINT.grass}
              stroke={PAINT.grassDeep}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Feather name="coffee" size={16} color={PAINT.ink} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pill,
        isSupporter && styles.pillSupporter,
        { opacity: pressed ? 0.75 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isSupporter ? "supporter" : "support Natura"}
    >
      {isSupporter ? (
        <>
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path
              d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"
              fill={PAINT.grass}
              stroke={PAINT.grassDeep}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.label, styles.labelSupporter]}>supporter</Text>
        </>
      ) : (
        <>
          <Feather name="coffee" size={13} color={PAINT.ink} />
          <Text style={styles.label}>support</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderRadius: 20,
  },
  pillSupporter: {
    backgroundColor: PAINT.grass + "33",
    borderColor: PAINT.grassDeep,
  },
  label: {
    fontFamily: HAND_FONT,
    fontSize: 15,
    color: PAINT.ink,
    lineHeight: 18,
  },
  labelSupporter: {
    color: PAINT.grassDeep,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSupporter: {
    backgroundColor: PAINT.grass + "33",
    borderColor: PAINT.grassDeep,
  },
});
