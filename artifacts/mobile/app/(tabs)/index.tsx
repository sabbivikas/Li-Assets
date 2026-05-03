import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EarthGlobe } from "@/components/EarthGlobe";
import { LocationMap } from "@/components/LocationMap";
import { StatCard } from "@/components/StatCard";
import { SpeciesCard } from "@/components/SpeciesCard";
import { LoadingShimmer, SpeciesCardSkeleton } from "@/components/LoadingShimmer";
import { useLocation } from "@/context/LocationContext";
import {
  fetchNearbySpecies,
  fetchRecentObservations,
  getIconicGroup,
} from "@/services/iNaturalist";
import { withCache } from "@/services/cache";
import { useColors } from "@/hooks/useColors";

const GROUP_COLORS: Record<string, string> = {
  Birds: "#22D3EE",
  Plants: "#4ADE80",
  Insects: "#FBBF24",
  Mammals: "#F472B6",
  Amphibians: "#60A5FA",
  Reptiles: "#A78BFA",
  Fungi: "#FB923C",
  Fish: "#38BDF8",
  Other: "#94A3B8",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius, cityName, permissionGranted, requestLocation } =
    useLocation();
  const [requestingLoc, setRequestingLoc] = useState(false);

  async function handleUseMyLocation() {
    setRequestingLoc(true);
    await requestLocation();
    setRequestingLoc(false);
  }

  const cacheKey = `nearby-${lat}-${lng}-${radius}`;
  const {
    data: species,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(cacheKey, () => fetchNearbySpecies(lat!, lng!, radius, 50)),
    enabled: !!lat && !!lng,
  });

  // Real recent observations (with coords) — only fetched when location is granted
  const { data: observations } = useQuery({
    queryKey: ["recent-observations", lat, lng, radius],
    queryFn: () =>
      withCache(`obs-${lat}-${lng}-${radius}`, () =>
        fetchRecentObservations(lat!, lng!, radius),
      ),
    enabled: permissionGranted && !!lat && !!lng,
  });

  const mapPins = React.useMemo(() => {
    if (!observations) return [];
    return observations
      .map((o) => {
        if (!o.location) return null;
        const [obsLat, obsLng] = o.location.split(",").map(Number);
        if (!isFinite(obsLat) || !isFinite(obsLng)) return null;
        const group = getIconicGroup(o.taxon?.iconic_taxon_name);
        return {
          id: o.id,
          name:
            o.taxon?.preferred_common_name ||
            o.taxon?.name ||
            "Observation",
          lat: obsLat,
          lng: obsLng,
          color: GROUP_COLORS[group] || GROUP_COLORS.Other,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [observations]);

  const topSpecies = species?.slice(0, 3) || [];

  const groupCounts: Record<string, number> = {};
  species?.forEach((s) => {
    const g = getIconicGroup(s.taxon.iconic_taxon_name);
    groupCounts[g] = (groupCounts[g] || 0) + 1;
  });
  const topGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];

  const threatenedCount = species?.filter((s) => {
    const cs = s.taxon.conservation_status?.status?.toUpperCase();
    return cs && ["CR", "EN", "VU"].includes(cs);
  }).length || 0;

  const totalSpecies = species?.length || 0;

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.earthDark }]}>
      {/* Soft background glow */}
      <View style={styles.bgGlow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInsets + 16, paddingBottom: bottomInsets + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#4ADE80"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Your Local Life Web</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color="#4ADE80" />
              <Text style={styles.locationText}>{cityName || "Your Location"}</Text>
              <Text style={styles.radiusText}>· {radius}km</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/species" as any)}
            style={styles.exploreBtn}
          >
            <Feather name="compass" size={18} color="#4ADE80" />
          </Pressable>
        </View>

        {/* Hero visual: real map when location is granted, animated Earth otherwise */}
        {permissionGranted && lat && lng ? (
          <View style={styles.mapSection}>
            <LocationMap
              lat={lat}
              lng={lng}
              radiusKm={radius}
              pins={mapPins}
              height={300}
            />
            {mapPins.length > 0 && (
              <View style={styles.mapLegend}>
                <Feather name="map-pin" size={11} color="#4ADE80" />
                <Text style={styles.mapLegendText}>
                  {mapPins.length} recent observations · last 30 days
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.globeSection}>
            <EarthGlobe size={260} pinLat={lat} pinLng={lng} />
            <Pressable
              onPress={handleUseMyLocation}
              disabled={requestingLoc}
              style={({ pressed }) => [
                styles.locateBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {requestingLoc ? (
                <ActivityIndicator size="small" color="#080C14" />
              ) : (
                <Feather name="navigation" size={15} color="#080C14" />
              )}
              <Text style={styles.locateBtnText}>
                {requestingLoc ? "Finding you…" : "Use my location"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Hero status banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroDot} />
          <Text style={styles.heroText}>
            {totalSpecies > 0
              ? `Tracking ${totalSpecies} species within ${radius}km of ${cityName}`
              : `Listening to the life web around ${cityName ?? "you"}`}
          </Text>
        </View>

        {/* Stats row */}
        {isLoading ? (
          <View style={styles.statsRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.statSkeleton, { backgroundColor: colors.card }]}>
                <LoadingShimmer width={36} height={36} borderRadius={10} />
                <LoadingShimmer width="60%" height={20} borderRadius={6} />
                <LoadingShimmer width="80%" height={12} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              icon="layers"
              value={totalSpecies}
              label="Species Nearby"
              color="#4ADE80"
            />
            <StatCard
              icon="alert-triangle"
              value={threatenedCount}
              label="Threatened"
              color="#EF4444"
            />
            <StatCard
              icon={
                topGroup?.[0] === "Birds"
                  ? "feather"
                  : topGroup?.[0] === "Plants"
                  ? "leaf"
                  : "globe"
              }
              value={topGroup?.[1] || 0}
              label="Most Common"
              subtitle={topGroup?.[0]}
              color="#22D3EE"
            />
          </View>
        )}

        {/* Top species */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Observed Nearby</Text>
            <Pressable onPress={() => router.push("/(tabs)/species" as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <>
              <SpeciesCardSkeleton />
              <SpeciesCardSkeleton />
              <SpeciesCardSkeleton />
            </>
          ) : topSpecies.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Feather name="search" size={28} color="#475569" />
              <Text style={styles.emptyTitle}>No observations found</Text>
              <Text style={styles.emptyDesc}>
                Try increasing your search radius in settings.
              </Text>
            </View>
          ) : (
            topSpecies.map((s) => <SpeciesCard key={s.taxon.id} item={s} />)
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionCard, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}
            onPress={() => router.push("/(tabs)/signals" as any)}
          >
            <Feather name="activity" size={20} color="#22D3EE" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Biodiversity Signals</Text>
              <Text style={styles.actionDesc}>Changes in local species patterns</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#475569" />
          </Pressable>

          <Pressable
            style={[styles.actionCard, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}
            onPress={() => router.push("/(tabs)/reports" as any)}
          >
            <Feather name="file-text" size={20} color="#FBBF24" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Generate Report</Text>
              <Text style={styles.actionDesc}>Create a civic biodiversity report</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#475569" />
          </Pressable>
        </View>

        {/* Data credit */}
        <View style={styles.credit}>
          <Feather name="database" size={11} color="#334155" />
          <Text style={styles.creditText}>Powered by iNaturalist community observations</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: "absolute",
    top: -200,
    left: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: "#0F3020",
  },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#94A3B8",
  },
  radiusText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#475569",
  },
  exploreBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#4ADE8015",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#4ADE8030",
  },
  globeSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    height: 320,
  },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#4ADE80",
    marginTop: 8,
  },
  locateBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#080C14",
  },
  mapSection: {
    marginBottom: 14,
    gap: 8,
  },
  mapLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#0F1824",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  mapLegendText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#94A3B8",
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#0F2027",
    borderWidth: 1,
    borderColor: "#22C55E25",
    marginBottom: 22,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  heroText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#94A3B8",
  },
  globeOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  globeMiddle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
  },
  globe: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0F2027",
    borderWidth: 1,
    borderColor: "#22C55E30",
    alignItems: "center",
    justifyContent: "center",
  },
  locationDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    bottom: 28,
    right: 30,
    shadowColor: "#4ADE80",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  orbDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  orbDot1: { top: 14, right: 56 },
  orbDot2: { bottom: 22, right: 40 },
  orbDot3: { bottom: 30, left: 44 },
  orbDot4: { top: 40, left: 30 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statSkeleton: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#4ADE80",
  },
  emptyState: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
  },
  quickActions: { gap: 10, marginBottom: 20 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  actionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    marginTop: 1,
  },
  credit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 4,
  },
  creditText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#334155",
  },
});
