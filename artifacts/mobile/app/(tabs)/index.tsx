import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenPadding } from "@/theme";

import {
  Bee,
  Bird,
  CrayonUnderline,
  Flower,
  Frog,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PaperBackground,
  PAINT,
  Sparkle,
  WobbleBox,
  WobbleButton,
} from "@/components/paint";
import {
  LocationMap,
  MAX_PIN_POOL,
  type PinTapPayload,
  type SpeciesPin,
} from "@/components/LocationMap";
import {
  SpeciesBottomSheet,
  type SpeciesSelection,
} from "@/components/SpeciesBottomSheet";
import { SpeciesListSheet } from "@/components/SpeciesListSheet";
import { useLocation, type Radius } from "@/context/LocationContext";
import { coarsenCoord, withCache } from "@/services/cache";
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

const DAY_MS = 24 * 60 * 60 * 1000;
const RADIUS_STEPS: Radius[] = [5, 10, 25, 50];

const GROUP_CRITTER: Record<string, React.ComponentType<{ size?: number }>> = {
  Birds: Bird,
  Insects: Bee,
  Plants: Flower,
  Amphibians: Frog,
  Fungi: Mushroom,
};

const GROUP_COLOR: Record<string, string> = {
  Birds: PAINT.blue,
  Plants: PAINT.grass,
  Insects: PAINT.sun,
  Mammals: PAINT.pink,
  Amphibians: PAINT.grass,
  Reptiles: PAINT.purple,
  Fungi: PAINT.red,
  Fish: PAINT.blue,
  Other: PAINT.inkSoft,
};

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

type PaintStat = {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  Icon: React.ComponentType<{ size?: number }>;
};

function PaintStatCard({
  stat,
  width,
  seed,
}: {
  stat: PaintStat;
  width: number;
  seed: number;
}) {
  return (
    <WobbleBox width={width} height={108} fill="white" seed={seed} padding={10}>
      <View style={statStyles.row}>
        <View style={[statStyles.iconWrap, { backgroundColor: stat.color + "33" }]}>
          <stat.Icon size={44} />
        </View>
        <View style={statStyles.text}>
          <Text style={statStyles.value}>{stat.value}</Text>
          <Text style={statStyles.label}>{stat.label}</Text>
          {stat.sub ? (
            <Text style={statStyles.sub} numberOfLines={1}>
              {stat.sub}
            </Text>
          ) : null}
        </View>
      </View>
    </WobbleBox>
  );
}

const statStyles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  value: { fontFamily: HAND_FONT, fontSize: 32, color: PAINT.ink, lineHeight: 34 },
  label: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    marginTop: -2,
  },
  sub: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    marginTop: 1,
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius, cityName, permissionGranted, requestLocation, setRadius } =
    useLocation();
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [selection, setSelection] = useState<SpeciesSelection | null>(null);
  const [clusterSelection, setClusterSelection] = useState<
    SpeciesSelection[] | null
  >(null);

  function pinToSelection(p: PinTapPayload): SpeciesSelection {
    return {
      id: p.id,
      taxonId: p.taxonId,
      name: p.name,
      scientificName: p.scientificName,
      role: p.role,
      roleColor: p.roleColor,
      photoUrl: p.photoUrl,
      photoMediumUrl: p.photoMediumUrl,
      recentNearbyCount: p.recentNearbyCount,
      group: p.group,
    };
  }

  async function handleUseMyLocation() {
    setRequestingLoc(true);
    await requestLocation();
    setRequestingLoc(false);
  }

  const cacheKey = `nearby-${coarsenCoord(lat!)}-${coarsenCoord(lng!)}-${radius}`;
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

  const {
    data: observations,
    isError: observationsError,
    refetch: refetchObservations,
    isRefetching: refetchingObservations,
  } = useQuery({
    queryKey: ["recent-observations", lat, lng, radius],
    queryFn: () =>
      withCache(`obs-${coarsenCoord(lat!)}-${coarsenCoord(lng!)}-${radius}`, () =>
        fetchRecentObservations(lat!, lng!, radius),
      ),
    enabled: permissionGranted && !!lat && !!lng,
    retry: false,
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
      .slice(0, MAX_PIN_POOL);
  }, [observations]);

  const insights = useMemo(() => generateInsights(mapPins), [mapPins]);

  const isEmpty =
    permissionGranted &&
    lat != null &&
    lng != null &&
    !isLoading &&
    !observationsError &&
    observations !== undefined &&
    observations.length === 0;

  const nextRadius = RADIUS_STEPS.find((r) => r > radius) ?? null;

  function openInaturalistNearby() {
    if (lat == null || lng == null) return;
    const url =
      `https://www.inaturalist.org/observations?` +
      `lat=${lat}&lng=${lng}&radius=${radius}&place_id=any`;
    void Linking.openURL(url);
  }

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

  const { top: screenTop, bottom: screenBottom } = useScreenPadding({ hasTabBar: true });

  const TopCritter = stats.topSpecies?.group
    ? GROUP_CRITTER[stats.topSpecies.group] ?? Flower
    : Flower;

  const paintStats: PaintStat[] = [
    {
      label: "species nearby",
      value: stats.uniqueSpecies,
      color: PAINT.grass,
      Icon: Flower,
    },
    {
      label: "active this week",
      value: stats.activeNow,
      color: PAINT.sun,
      Icon: Bee,
    },
    {
      label: "most common",
      value: stats.topSpecies?.count || 0,
      sub: stats.topSpecies?.name,
      color:
        (stats.topSpecies?.group && GROUP_COLOR[stats.topSpecies.group]) ||
        PAINT.purple,
      Icon: TopCritter,
    },
    {
      label: "at risk",
      value: stats.atRisk,
      sub: stats.atRisk > 0 ? "needs protection" : "none on map",
      color: PAINT.red,
      Icon: Mushroom,
    },
  ];

  return (
    <View style={styles.container}>
      <PaperBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: screenTop, paddingBottom: screenBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={PAINT.grassDeep}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.greeting}>Your local life web</Text>
              <View style={styles.titleSparkle}>
                <Sparkle size={7} color={PAINT.sun} />
              </View>
            </View>
            <CrayonUnderline width={170} color={PAINT.pink} seed={2} />
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={PAINT.grassDeep} />
              <Text style={styles.locationText}>
                {cityName || "your location"}
              </Text>
              <Text style={styles.radiusText}>· {radius}km</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/species")}
            style={styles.exploreBtn}
          >
            <Feather name="compass" size={20} color={PAINT.ink} />
          </Pressable>
        </View>

        {/* Hero map area */}
        {isEmpty ? (
          <WobbleBox
            width={340}
            height={220}
            fill={PAINT.cream}
            seed={3}
            padding={20}
            style={styles.heroBlock}
          >
            <View style={styles.emptyContent}>
              <Frog size={70} />
              <Text style={styles.emptyTitle}>No sightings here yet</Text>
              <Text style={styles.emptyText}>
                iNaturalist hasn&apos;t logged anything within {radius}km of{" "}
                {cityName ?? "you"} in the last 30 days.
              </Text>
              <View style={styles.emptyActions}>
                {nextRadius != null && (
                  <WobbleButton
                    label={`widen to ${nextRadius}km`}
                    onPress={() => void setRadius(nextRadius)}
                    color={PAINT.grass}
                    width={170}
                    height={50}
                    seed={11}
                  />
                )}
                <Pressable onPress={openInaturalistNearby} hitSlop={8}>
                  <Text style={styles.linkText}>open in iNaturalist ↗</Text>
                </Pressable>
              </View>
            </View>
          </WobbleBox>
        ) : permissionGranted && lat && lng ? (
          <View style={styles.mapSection}>
            <View style={styles.mapBorder}>
              <LocationMap
                lat={lat}
                lng={lng}
                radiusKm={radius}
                pins={mapPins}
                height={300}
                selectedPinId={selection?.id ?? null}
                onPinSelect={(pin) => setSelection(pinToSelection(pin))}
                onClusterSelect={(pins) =>
                  setClusterSelection(pins.map(pinToSelection))
                }
              />
            </View>
            {mapPins.length > 0 && (
              <Text style={styles.mapHint}>
                {mapPins.length} of {observations?.length ?? 0} sightings · last 30
                days · tap a critter
              </Text>
            )}
            {observationsError && (
              <View style={styles.errorPill}>
                <Feather name="wifi-off" size={12} color={PAINT.red} />
                <Text style={styles.errorPillText}>iNaturalist is slow right now</Text>
                <Pressable
                  onPress={() => refetchObservations()}
                  disabled={refetchingObservations}
                  hitSlop={8}
                >
                  <Text style={styles.errorRetry}>
                    {refetchingObservations ? "retrying…" : "retry"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <WobbleBox
            width={340}
            height={300}
            fill={PAINT.cream}
            seed={5}
            padding={16}
            style={styles.heroBlock}
          >
            <View style={styles.locateContent}>
              <View style={{ marginBottom: 12 }}>
                <Bee size={70} />
              </View>
              <Text style={styles.locateTitle}>Hello, friend</Text>
              <Text style={styles.locateSub}>
                Share your location and we&apos;ll show you the wild lives nearby
              </Text>
              <View style={{ marginTop: 18 }}>
                <WobbleButton
                  label={requestingLoc ? "finding you…" : "use my location"}
                  onPress={handleUseMyLocation}
                  loading={requestingLoc}
                  color={PAINT.grass}
                  width={240}
                  height={56}
                  seed={9}
                  leading={
                    <Feather name="navigation" size={16} color={PAINT.ink} />
                  }
                />
              </View>
            </View>
          </WobbleBox>
        )}

        {/* Hero banner */}
        {!isEmpty && (
          <View style={styles.banner}>
            <View style={styles.bannerDot} />
            <Text style={styles.bannerText}>
              {stats.uniqueSpecies > 0
                ? `${stats.uniqueSpecies} species pulsing within ${radius}km of ${cityName ?? "you"}`
                : `Listening to the life web around ${cityName ?? "you"}`}
            </Text>
          </View>
        )}

        {/* Stats */}
        {!isEmpty && (
          <View style={styles.statsGrid}>
            {paintStats.map((s, i) => (
              <PaintStatCard
                key={s.label}
                stat={s}
                width={163}
                seed={i * 4 + 1}
              />
            ))}
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What&apos;s happening here</Text>
            <CrayonUnderline width={210} color={PAINT.sun} seed={4} />
            <View style={{ height: 12 }} />
            {insights.map((ins, i) => (
              <WobbleBox
                key={ins.id}
                width={340}
                height={76}
                fill="white"
                seed={i * 5 + 17}
                padding={12}
                style={{ marginBottom: 10 }}
              >
                <View style={styles.insightRow}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: ins.color + "33" },
                    ]}
                  >
                    <Feather
                      name={ins.icon as keyof typeof Feather.glyphMap}
                      size={18}
                      color={PAINT.ink}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightTitle}>{ins.title}</Text>
                    <Text style={styles.insightDetail}>{ins.detail}</Text>
                  </View>
                </View>
              </WobbleBox>
            ))}
          </View>
        )}

        {/* Top species */}
        {!isEmpty && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Most observed nearby</Text>
                <CrayonUnderline width={200} color={PAINT.pink} seed={6} />
              </View>
              <Pressable onPress={() => router.push("/(tabs)/species")} hitSlop={8}>
                <Text style={styles.seeAll}>see all →</Text>
              </Pressable>
            </View>

            {isLoading ? (
              <Text style={styles.loadingText}>looking around...</Text>
            ) : topSpecies.length === 0 ? (
              <Text style={styles.loadingText}>nothing yet — try a wider radius</Text>
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {topSpecies.map((s, i) => {
                  const photo =
                    s.taxon.default_photo?.medium_url ||
                    s.taxon.default_photo?.square_url;
                  const name =
                    s.taxon.preferred_common_name || s.taxon.name || "Species";
                  const group = getIconicGroup(s.taxon.iconic_taxon_name);
                  return (
                    <Pressable
                      key={s.taxon.id}
                      onPress={() =>
                        router.push({
                          pathname: "/species/[id]",
                          params: { id: String(s.taxon.id) },
                        })
                      }
                    >
                      <WobbleBox
                        width={340}
                        height={88}
                        fill="white"
                        seed={i * 7 + 23}
                        padding={10}
                      >
                        <View style={styles.speciesRow}>
                          {photo ? (
                            <Image
                              source={{ uri: photo }}
                              style={styles.speciesPhoto}
                              contentFit="cover"
                            />
                          ) : (
                            <View
                              style={[
                                styles.speciesPhoto,
                                { backgroundColor: PAINT.paperDeep },
                              ]}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.speciesName} numberOfLines={1}>
                              {name}
                            </Text>
                            <Text style={styles.speciesSci} numberOfLines={1}>
                              {s.taxon.name}
                            </Text>
                            <Text style={styles.speciesCount}>
                              {s.count} sightings · {group}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={20} color={PAINT.inkMute} />
                        </View>
                      </WobbleBox>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actions}>
          {stats.atRisk > 0 && (
            <Pressable onPress={() => router.push("/(tabs)/species")}>
              <WobbleBox
                width={340}
                height={70}
                fill={PAINT.cream}
                stroke={PAINT.red}
                seed={31}
                padding={12}
              >
                <View style={styles.actionRow}>
                  <Feather name="alert-triangle" size={22} color={PAINT.red} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>
                      {stats.atRisk} threatened species nearby
                    </Text>
                    <Text style={styles.actionDesc}>worth protecting</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={PAINT.inkMute} />
                </View>
              </WobbleBox>
            </Pressable>
          )}
          <Pressable onPress={() => router.push("/(tabs)/signals")}>
            <WobbleBox width={340} height={70} fill="white" seed={33} padding={12}>
              <View style={styles.actionRow}>
                <Feather name="activity" size={22} color={PAINT.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Biodiversity signals</Text>
                  <Text style={styles.actionDesc}>changes in local patterns</Text>
                </View>
                <Feather name="chevron-right" size={18} color={PAINT.inkMute} />
              </View>
            </WobbleBox>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/reports")}>
            <WobbleBox width={340} height={70} fill="white" seed={35} padding={12}>
              <View style={styles.actionRow}>
                <Feather name="file-text" size={22} color={PAINT.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Generate report</Text>
                  <Text style={styles.actionDesc}>create a civic biodiversity report</Text>
                </View>
                <Feather name="chevron-right" size={18} color={PAINT.inkMute} />
              </View>
            </WobbleBox>
          </Pressable>
        </View>

        <Text style={styles.credit}>
          powered by iNaturalist community observations
        </Text>
      </ScrollView>

      <SpeciesBottomSheet
        selection={selection}
        onClose={() => setSelection(null)}
      />
      <SpeciesListSheet
        pins={clusterSelection}
        onClose={() => setClusterSelection(null)}
        onSelect={(pin) => {
          setClusterSelection(null);
          setTimeout(() => setSelection(pin), 260);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20, alignItems: "center" },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start" },
  greeting: {
    fontFamily: HAND_FONT,
    fontSize: 38,
    color: PAINT.ink,
    lineHeight: 42,
  },
  titleSparkle: { marginLeft: 4, marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  locationText: { fontFamily: LABEL_FONT, fontSize: 16, color: PAINT.inkSoft },
  radiusText: { fontFamily: LABEL_FONT, fontSize: 16, color: PAINT.inkMute },
  exploreBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PAINT.sun,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: PAINT.ink,
    marginTop: 6,
  },
  heroBlock: { marginBottom: 16 },
  mapSection: { width: "100%", marginBottom: 16, alignItems: "center" },
  mapBorder: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.mapPaper,
  },
  mapHint: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    marginTop: 8,
    textAlign: "center",
  },
  errorPill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PAINT.cream,
    borderWidth: 2,
    borderColor: PAINT.red,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  errorPillText: { fontFamily: LABEL_FONT, fontSize: 13, color: PAINT.red },
  errorRetry: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.red,
    marginLeft: 4,
  },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    marginTop: 6,
  },
  emptyText: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  emptyActions: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14 },
  linkText: { fontFamily: HAND_FONT, fontSize: 18, color: PAINT.blue },
  locateContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  locateTitle: { fontFamily: HAND_FONT, fontSize: 32, color: PAINT.ink },
  locateSub: {
    fontFamily: LABEL_FONT,
    fontSize: 16,
    color: PAINT.inkSoft,
    textAlign: "center",
    paddingHorizontal: 18,
    marginTop: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: PAINT.grass + "44",
    borderWidth: 2,
    borderColor: PAINT.grassDeep,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    width: "100%",
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PAINT.grassDeep,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  bannerText: { flex: 1, fontFamily: LABEL_FONT, fontSize: 15, color: PAINT.ink },
  statsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginBottom: 14,
  },
  section: { width: "100%", marginTop: 8 },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 30,
    color: PAINT.ink,
    lineHeight: 34,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  seeAll: { fontFamily: HAND_FONT, fontSize: 18, color: PAINT.blue },
  insightRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  insightTitle: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    lineHeight: 26,
  },
  insightDetail: { fontFamily: LABEL_FONT, fontSize: 14, color: PAINT.inkSoft },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkMute,
    marginTop: 12,
    textAlign: "center",
  },
  speciesRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  speciesPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: PAINT.ink,
  },
  speciesName: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    lineHeight: 26,
  },
  speciesSci: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkMute,
    fontStyle: "italic",
  },
  speciesCount: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    marginTop: 1,
  },
  actions: { width: "100%", gap: 10, marginTop: 16 },
  actionRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  actionTitle: { fontFamily: HAND_FONT, fontSize: 22, color: PAINT.ink, lineHeight: 24 },
  actionDesc: { fontFamily: LABEL_FONT, fontSize: 13, color: PAINT.inkSoft },
  credit: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkMute,
    textAlign: "center",
    marginTop: 22,
  },
});
