import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpeciesCard } from "@/components/SpeciesCard";
import { RiveEmptyState } from "@/components/RiveEmptyState";
import { RiveLoadingShimmer } from "@/components/RiveLoadingShimmer";
import { useLocation } from "@/context/LocationContext";
import { fetchNearbySpecies, getIconicGroup, type SpeciesCount } from "@/services/iNaturalist";
import { withCache } from "@/services/cache";
import { useColors } from "@/hooks/useColors";

const GROUPS = ["All", "Birds", "Plants", "Insects", "Mammals", "Amphibians", "Reptiles", "Fungi", "Other"];

export default function SpeciesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lat, lng, radius } = useLocation();

  const [selectedGroup, setSelectedGroup] = useState("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(`nearby-${lat}-${lng}-${radius}`, () =>
        fetchNearbySpecies(lat!, lng!, radius, 100)
      ),
    enabled: !!lat && !!lng,
  });

  const filtered: SpeciesCount[] = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (selectedGroup !== "All") {
      result = result.filter(
        (s) => getIconicGroup(s.taxon.iconic_taxon_name) === selectedGroup
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.taxon.preferred_common_name?.toLowerCase().includes(q) ||
          s.taxon.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, selectedGroup, search]);

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.earthDark }]}>
      {/* Fixed header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topInsets + 16,
            backgroundColor: colors.earthDark,
            borderBottomColor: "#1E293B",
          },
        ]}
      >
        <Text style={styles.title}>Local Species</Text>
        <Text style={styles.subtitle}>
          {data?.length || 0} species within {radius}km
        </Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}>
          <Feather name="search" size={16} color="#475569" />
          <TextInput
            style={[styles.searchInput, { color: "#FFFFFF" }]}
            placeholder="Search species…"
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="#475569" />
            </Pressable>
          )}
        </View>

        {/* Group filter */}
        <FlatList
          horizontal
          data={GROUPS}
          keyExtractor={(g) => g}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: group }) => {
            const active = selectedGroup === group;
            const count = group === "All"
              ? data?.length || 0
              : data?.filter((s) => getIconicGroup(s.taxon.iconic_taxon_name) === group).length || 0;
            return (
              <Pressable
                onPress={() => setSelectedGroup(group)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? "#4ADE80" : "#0F1824",
                    borderColor: active ? "#4ADE80" : "#1E293B",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#080C14" : "#94A3B8" },
                  ]}
                >
                  {group}
                </Text>
                {count > 0 && (
                  <Text
                    style={[
                      styles.filterCount,
                      {
                        color: active ? "#080C1480" : "#475569",
                        backgroundColor: active ? "#00000020" : "#1E293B",
                      },
                    ]}
                  >
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          <RiveLoadingShimmer hero width={140} height={140} />
          <Text style={styles.loadingText}>Finding nearby species…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.taxon.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomInsets + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: "#0F1824" }]}>
              <RiveEmptyState
                icon="search"
                title="No species found"
                description={
                  search
                    ? "Try a different search term"
                    : "No observations in this group nearby"
                }
              />
            </View>
          }
          renderItem={({ item }) => <SpeciesCard item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    marginTop: -6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterList: { gap: 8, paddingBottom: 2 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  filterCount: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 100,
  },
  list: { paddingHorizontal: 20, paddingTop: 14 },
  skeletonList: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#334155",
    textAlign: "center",
  },
});
