import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  subtitle?: string;
}

export function StatCard({ icon, value, label, color, subtitle }: Props) {
  const colors = useColors();
  const accentColor = color || colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentColor + "30" }]}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor + "15" }]}>
        <Feather name={icon as any} size={18} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: accentColor }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 15,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
