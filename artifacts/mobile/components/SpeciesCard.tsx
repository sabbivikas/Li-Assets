import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ConservationBadge } from "@/components/ConservationBadge";
import { getRoleLabel, getRoleColor, getEcosystemRoles } from "@/services/ecologyModel";
import { getIconicGroup, type SpeciesCount } from "@/services/iNaturalist";
import { useColors } from "@/hooks/useColors";

interface Props {
  item: SpeciesCount;
  lastSeen?: string;
}

export function SpeciesCard({ item, lastSeen }: Props) {
  const colors = useColors();
  const router = useRouter();
  const taxon = item.taxon;
  const photoUrl = taxon.default_photo?.medium_url || taxon.default_photo?.square_url;
  const group = getIconicGroup(taxon.iconic_taxon_name);
  const roles = getEcosystemRoles(taxon.iconic_taxon_name, taxon.preferred_common_name);
  const primaryRole = roles[0];
  const roleColor = getRoleColor(primaryRole);
  const conservationStatus = taxon.conservation_status?.status;

  function handlePress() {
    router.push(`/species/${taxon.id}` as any);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.photoContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="image" size={22} color={colors.mutedForeground} />
          </View>
        )}
        <View style={[styles.groupBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.groupText, { color: colors.mutedForeground }]}>{group}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.commonName, { color: colors.foreground }]} numberOfLines={1}>
            {taxon.preferred_common_name || taxon.name}
          </Text>
          <ConservationBadge status={conservationStatus} small />
        </View>

        <Text style={[styles.sciName, { color: colors.mutedForeground }]} numberOfLines={1}>
          {taxon.name}
        </Text>

        <View style={styles.footer}>
          <View style={[styles.rolePill, { backgroundColor: roleColor + "22" }]}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(primaryRole)}</Text>
          </View>
          <View style={styles.meta}>
            <Feather name="eye" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {item.count.toLocaleString()}
            </Text>
            {lastSeen && (
              <>
                <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{lastSeen}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  photoContainer: {
    position: "relative",
  },
  photo: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  groupBadge: {
    position: "absolute",
    bottom: -4,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  commonName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  sciName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  roleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    fontSize: 11,
  },
});
