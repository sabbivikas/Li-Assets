import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export type SignalType = "new" | "declining" | "early_season" | "late_season" | "increasing";

export interface Signal {
  id: string;
  type: SignalType;
  speciesName: string;
  scientificName: string;
  photoUrl?: string;
  description: string;
  dataNote: string;
  observationCount?: number;
  previousCount?: number;
}

interface Props {
  signal: Signal;
}

const SIGNAL_CONFIG: Record<
  SignalType,
  { icon: string; color: string; label: string }
> = {
  new: { icon: "plus-circle", color: "#4ADE80", label: "Newly Observed" },
  declining: { icon: "trending-down", color: "#EF4444", label: "Possible Decline" },
  early_season: { icon: "sunrise", color: "#FBBF24", label: "Earlier Appearance" },
  late_season: { icon: "sunset", color: "#F97316", label: "Later Appearance" },
  increasing: { icon: "trending-up", color: "#22D3EE", label: "Increasing Activity" },
};

export function SignalCard({ signal }: Props) {
  const colors = useColors();
  const config = SIGNAL_CONFIG[signal.type];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: config.color + "30" }]}>
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: config.color + "15" }]}>
          <Feather name={config.icon as any} size={18} color={config.color} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: config.color + "20" }]}>
            <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={[styles.speciesName, { color: colors.foreground }]}>{signal.speciesName}</Text>
        <Text style={[styles.sciName, { color: colors.mutedForeground }]}>{signal.scientificName}</Text>
        <Text style={[styles.description, { color: colors.foreground }]}>{signal.description}</Text>
        <View style={[styles.dataNote, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={11} color={colors.mutedForeground} />
          <Text style={[styles.dataNoteText, { color: colors.mutedForeground }]}>{signal.dataNote}</Text>
        </View>
      </View>

      {signal.photoUrl && (
        <Image source={{ uri: signal.photoUrl }} style={styles.photo} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  left: {
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  typeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  speciesName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sciName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  dataNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  dataNoteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 15,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
});
