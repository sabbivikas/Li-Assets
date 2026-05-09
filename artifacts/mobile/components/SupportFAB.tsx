import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { HAND_FONT, PAINT } from "@/components/paint";
import { useSupporter } from "@/lib/revenuecat";

const HIDDEN_ROUTES = new Set(["/profile", "/support", "/settings"]);

export function SupportFAB() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSupporter } = useSupporter();
  const pathname = usePathname();

  if (HIDDEN_ROUTES.has(pathname)) return null;

  function handlePress() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.push("/support");
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { top: insets.top + 8, right: 16 }]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pill,
          isSupporter && styles.pillSupporter,
          { opacity: pressed ? 0.75 : 1 },
        ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    zIndex: 999,
  },
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
});
