import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";

interface Props {
  title: string;
  description?: string;
  icon?: keyof typeof Feather.glyphMap;
  size?: number;
}

/**
 * Shared "no results yet" empty state. Renders the Rive `empty.riv` scene
 * with a Feather icon fallback for Expo Go / web.
 */
export function RiveEmptyState({
  title,
  description,
  icon = "search",
  size = 140,
}: Props) {
  return (
    <View style={styles.wrap}>
      <RiveAnimation
        source={riveAssets.empty}
        style={{ width: size, height: size }}
        fallback={
          <View
            style={{
              width: size,
              height: size,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={icon} size={Math.min(40, size * 0.32)} color="#334155" />
          </View>
        }
      />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 19,
  },
});
