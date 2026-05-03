import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getConservationLabel } from "@/services/iNaturalist";

interface Props {
  status?: string;
  small?: boolean;
}

export function ConservationBadge({ status, small = false }: Props) {
  if (!status || status.toUpperCase() === "LC" || status.toUpperCase() === "NE") {
    return null;
  }
  const { label, color } = getConservationLabel(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color, fontSize: small ? 10 : 11 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
