import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { LocationMap, type SpeciesPin } from "@/components/LocationMap";
import { LoadingShimmer, SpeciesCardSkeleton } from "@/components/LoadingShimmer";
import {
  SpeciesBottomSheet,
  type SpeciesSelection,
} from "@/components/SpeciesBottomSheet";
import { SpeciesCard } from "@/components/SpeciesCard";
import { StatCard } from "@/components/StatCard";
import { useLocation } from "@/context/LocationContext";
import { useColors } from "@/hooks/useColors";
import { withCache } from "@/services/cache";
import {
  getEcosystemRoles,
  getRoleColor,
  getRoleLabel,
} from "@/services/ecologyModel";
import {
  fetchNearbySpecies,
  fetchRecentObservations,
  getIconicGroup,
} from "@/services/iNaturalist";
import { generateInsights } from "@/services/insights";

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

const DAY_MS = 24 * 60 * 60 * 1000;

const roleCache = new Map<string, ReturnType<typeof getEcosystemRoles>>();
function cachedRoles(iconic?: string, name?: string) {
  const key = `${iconic || ""}|${name || ""}`;
  let r = roleCache.get(key);
  if (!r) {
    r = getEcosystemRoles(iconic, name);
    roleCache.set(key, r);
  }
  return r;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius, cityName, permissionGranted, requestLocation } =
    useLocation();
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [selection, setSelection] = useState<SpeciesSelection | null>(null);

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

  const { data: observations } = useQuery({
    queryKey: ["recent-observations", lat, lng, radius],
    queryFn: () =>
      withCache(`obs-${lat}-${lng}-${radius}`, () =>
        fetchRecentObservations(lat!, lng!, radius),
      ),
    enabled: permissionGranted && !!lat && !!lng,
  });

  const mapPins: (SpeciesPin & {
    observedOn?: string;
    conservationStatus?: string;
  })[] = useMemo(() => {
    if (!observations) return [];

    const speciesCounts: Record<number, number> = {};
    observations.forEach((o) => {
      const id = o.taxon?.id;
      if (typeof id === "number") speciesCounts[id] = (speciesCounts[id] || 0) + 1;
    });
    const maxFreq = Math.max(1, ...Object.values(speciesCounts));
    const KEY_ROLES = new Set(["pollinator", "predator", "indicator", "primary_producer"]);

    const pins = observations
      .map((o) => {
        if (!o.location) return null;
        const [obsLat, obsLng] = o.location.split(",").map(Number);
        if (!isFinite(obsLat) || !isFinite(obsLng)) return null;
        const taxon = o.taxon;
        const square = taxon?.default_photo?.square_url;
        const medium = taxon?.default_photo?.medium_url;
        // Photo-only markers — we never render generic dots on the home map.
        if (!square && !medium) return null;

        const primaryRole = cachedRoles(
          taxon?.iconic_taxon_name,
          taxon?.preferred_common_name,
        )[0];
        const roleBoost = KEY_ROLES.has(primaryRole)
          ? 1
          : primaryRole === "decomposer" || primaryRole === "seed_disperser"
            ? 0.6
            : 0.2;
        const freq = (taxon?.id && speciesCounts[taxon.id]) || 1;
        const importance = Math.min(1, 0.25 + roleBoost * 0.45 + (freq / maxFreq) * 0.3);

        return {
          id: o.id,
          taxonId: taxon?.id,
          name: taxon?.preferred_common_name || taxon?.name || "Observation",
          scientificName: taxon?.name,
          lat: obsLat,
          lng: obsLng,
          color: getRoleColor(primaryRole),
          photoUrl: square || medium,
          photoMediumUrl: medium || square,
          importance,
          role: getRoleLabel(primaryRole),
          group: getIconicGroup(taxon?.iconic_taxon_name),
          recentNearbyCount: freq,
          observedOn: o.observed_on,
          conservationStatus: taxon?.conservation_status?.status?.toUpperCase(),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return pins
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 25);
  }, [observations]);

  const insights = useMemo(() => generateInsights(mapPins), [mapPins]);

  // Stats are derived from the EXACT rendered map dataset (capped 25 pins)
  // so map and cards tell the same story.
  const stats = useMemo(() => {
    const now = Date.now();
    const uniqueIds = new Set<number>();
    const speciesFreq = new Map<number, { name: string; group: string; count: number }>();
    const activeIds = new Set<number>();
    const atRiskIds = new Set<number>();

    mapPins.forEach((p) => {
      if (typeof p.taxonId === "number") {
        uniqueIds.add(p.taxonId);
        const cur = speciesFreq.get(p.taxonId);
        if (cur) {
          cur.count += 1;
        } else {
          speciesFreq.set(p.taxonId, {
            name: p.name,
            group: p.group || "Other",
            count: 1,
          });
        }
        if (p.observedOn) {
          const t = Date.parse(p.observedOn);
          if (isFinite(t) && now - t <= 7 * DAY_MS) activeIds.add(p.taxonId);
        }
        if (p.conservationStatus && ["CR", "EN", "VU", "NT"].includes(p.conservationStatus)) {
          atRiskIds.add(p.taxonId);
        }
      }
    });

    // Most common = species (not group) with highest visible-marker density
    type TopSpecies = { name: string; group: string; count: number };
    const topSpecies: TopSpecies | null = Array.from(speciesFreq.values()).reduce<
      TopSpecies | null
    >((best, v) => (!best || v.count > best.count ? v : best), null);

    return {
      uniqueSpecies: uniqueIds.size,
      activeNow: activeIds.size,
      topSpecies,
      atRisk: atRiskIds.size,
    };
  }, [mapPins]);

  const topSpecies = species?.slice(0, 3) || [];

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.earthDark }]}>
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
            onPress={() => router.push("/(tabs)/species" as never)}
            style={styles.exploreBtn}
          >
            <Feather name="compass" size={18} color="#4ADE80" />
          </Pressable>
        </View>

        {/* Hero map / globe */}
        {permissionGranted && lat && lng ? (
          <View style={styles.mapSection}>
            <LocationMap
              lat={lat}
              lng={lng}
              radiusKm={radius}
              pins={mapPins}
              height={340}
              selectedPinId={selection?.id ?? null}
              onPinSelect={(pin) => {
                setSelection({
                  id: pin.id,
                  taxonId: pin.taxonId,
                  name: pin.name,
                  scientificName: pin.scientificName,
                  role: pin.role,
                  roleColor: pin.roleColor,
                  photoUrl: pin.photoUrl,
                  photoMediumUrl: pin.photoMediumUrl,
                  recentNearbyCount: pin.recentNearbyCount,
                  group: pin.group,
                });
              }}
            />
            {mapPins.length > 0 && (
              <View style={styles.mapLegend}>
                <Feather name="map-pin" size={11} color="#4ADE80" />
                <Text style={styles.mapLegendText}>
                  {mapPins.length} of {observations?.length ?? 0} sightings · last 30 days · tap a photo
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
            {stats.uniqueSpecies > 0
              ? `${stats.uniqueSpecies} species pulsing within ${radius}km of ${cityName ?? "you"}`
              : `Listening to the life web around ${cityName ?? "you"}`}
          </Text>
        </View>

        {/* Stats row — every number derived from the same observations dataset */}
        {isLoading ? (
          <View style={styles.statsRow}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.statSkeleton, { backgroundColor: colors.card }]}
              >
                <LoadingShimmer width={36} height={36} borderRadius={10} />
                <LoadingShimmer width="60%" height={20} borderRadius={6} />
                <LoadingShimmer width="80%" height={12} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <StatCard
                icon="layers"
                value={stats.uniqueSpecies}
                label="Species Nearby"
                color="#4ADE80"
              />
            </View>
            <View style={styles.statCell}>
              <StatCard
                icon="zap"
                value={stats.activeNow}
                label="Active This Week"
                color="#22D3EE"
              />
            </View>
            <View style={styles.statCell}>
              <StatCard
                icon={
                  stats.topSpecies?.group === "Birds"
                    ? "feather"
                    : stats.topSpecies?.group === "Plants"
                      ? "leaf"
                      : "globe"
                }
                value={stats.topSpecies?.count || 0}
                label="Most Common"
                subtitle={stats.topSpecies?.name}
                color={
                  stats.topSpecies?.group
                    ? GROUP_COLORS[stats.topSpecies.group] || "#A78BFA"
                    : "#A78BFA"
                }
              />
            </View>
            <View style={styles.statCell}>
              <StatCard
                icon="alert-triangle"
                value={stats.atRisk}
                label="At Risk"
                subtitle={stats.atRisk > 0 ? "Needs protection" : "None on map"}
                color="#EF4444"
              />
            </View>
          </View>
        )}

        {/* What's happening here — insights derived from observations */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What&apos;s happening here</Text>
            <View style={styles.insightsList}>
              {insights.map((ins) => (
                <View
                  key={ins.id}
                  style={[
                    styles.insightCard,
                    { borderColor: ins.color + "30" },
                  ]}
                >
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: ins.color + "1A" },
                    ]}
                  >
                    <Feather name={ins.icon as never} size={15} color={ins.color} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>{ins.title}</Text>
                    <Text style={styles.insightDetail}>{ins.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top species */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Observed Nearby</Text>
            <Pressable onPress={() => router.push("/(tabs)/species" as never)}>
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
          {stats.atRisk > 0 && (
            <Pressable
              style={[
                styles.actionCard,
                { backgroundColor: "#1A0F0F", borderColor: "#7F1D1D" },
              ]}
              onPress={() => router.push("/(tabs)/species" as never)}
            >
              <Feather name="alert-triangle" size={20} color="#EF4444" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>
                  {stats.atRisk} threatened {stats.atRisk === 1 ? "species" : "species"} nearby
                </Text>
                <Text style={styles.actionDesc}>
                  Worth protecting in your area
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#475569" />
            </Pressable>
          )}
          <Pressable
            style={[
              styles.actionCard,
              { backgroundColor: "#0F1824", borderColor: "#1E293B" },
            ]}
            onPress={() => router.push("/(tabs)/signals" as never)}
          >
            <Feather name="activity" size={20} color="#22D3EE" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Biodiversity Signals</Text>
              <Text style={styles.actionDesc}>
                Changes in local species patterns
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#475569" />
          </Pressable>

          <Pressable
            style={[
              styles.actionCard,
              { backgroundColor: "#0F1824", borderColor: "#1E293B" },
            ]}
            onPress={() => router.push("/(tabs)/reports" as never)}
          >
            <Feather name="file-text" size={20} color="#FBBF24" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Generate Report</Text>
              <Text style={styles.actionDesc}>
                Create a civic biodiversity report
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#475569" />
          </Pressable>
        </View>

        {/* Data credit */}
        <View style={styles.credit}>
          <Feather name="database" size={11} color="#334155" />
          <Text style={styles.creditText}>
            Powered by iNaturalist community observations
          </Text>
        </View>
      </ScrollView>

      <SpeciesBottomSheet
        selection={selection}
        onClose={() => setSelection(null)}
      />
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCell: {
    width: "48%",
    flexGrow: 1,
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
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#4ADE80",
  },
  insightsList: { gap: 8 },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(15, 24, 36, 0.85)",
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: { flex: 1, gap: 2 },
  insightTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#F8FAFC",
    letterSpacing: -0.1,
  },
  insightDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    lineHeight: 16,
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
