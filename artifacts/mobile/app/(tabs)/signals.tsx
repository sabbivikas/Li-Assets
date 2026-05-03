import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignalCard, type Signal, type SignalType } from "@/components/SignalCard";
import { RiveEmptyState } from "@/components/RiveEmptyState";
import { RiveLoadingShimmer } from "@/components/RiveLoadingShimmer";
import { useLocation } from "@/context/LocationContext";
import {
  fetchNearbySpecies,
  fetchHistoricalSpecies,
  type SpeciesCount,
} from "@/services/iNaturalist";
import { withCache } from "@/services/cache";
import { useColors } from "@/hooks/useColors";

function generateSignals(
  current: SpeciesCount[],
  historical: SpeciesCount[]
): Signal[] {
  const signals: Signal[] = [];
  const historicalMap = new Map<number, number>();
  historical.forEach((s) => historicalMap.set(s.taxon.id, s.count));
  const currentMap = new Map<number, number>();
  current.forEach((s) => currentMap.set(s.taxon.id, s.count));

  const totalCurrent = current.reduce((s, i) => s + i.count, 0) || 1;
  const totalHistorical = historical.reduce((s, i) => s + i.count, 0) || 1;

  // Find species not seen historically but now present
  current.slice(0, 20).forEach((s) => {
    if (!historicalMap.has(s.taxon.id) && s.count >= 3) {
      signals.push({
        id: `new-${s.taxon.id}`,
        type: "new" as SignalType,
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        photoUrl: s.taxon.default_photo?.square_url,
        description: `Possible signal from community observations. ${s.taxon.preferred_common_name || s.taxon.name} has ${s.count} recent observations nearby but was not recorded in earlier years.`,
        dataNote: "Based on iNaturalist research-grade observations. New detections may reflect expanded observer activity, not just species range changes.",
        observationCount: s.count,
      });
    }
  });

  // Find significant declines
  historical.slice(0, 30).forEach((s) => {
    const histCount = s.count;
    const currCount = currentMap.get(s.taxon.id) || 0;
    const histFreq = histCount / totalHistorical;
    const currFreq = currCount / totalCurrent;

    if (histFreq > 0 && currFreq < histFreq * 0.4 && histCount >= 5) {
      signals.push({
        id: `decline-${s.taxon.id}`,
        type: "declining" as SignalType,
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        photoUrl: s.taxon.default_photo?.square_url,
        description: `Possible signal from community observations. Observation frequency of ${s.taxon.preferred_common_name || s.taxon.name} appears lower compared to previous years when normalized for total observation effort.`,
        dataNote: "Frequency decline may reflect habitat change, observer behavior shifts, or population changes. This is not a scientific assessment.",
        observationCount: currCount,
        previousCount: histCount,
      });
    }
  });

  // Find species increasing strongly
  current.slice(0, 30).forEach((s) => {
    const histCount = historicalMap.get(s.taxon.id) || 0;
    const histFreq = histCount / totalHistorical;
    const currFreq = s.count / totalCurrent;

    if (histCount >= 2 && currFreq > histFreq * 2.5 && s.count >= 10) {
      signals.push({
        id: `increasing-${s.taxon.id}`,
        type: "increasing" as SignalType,
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        photoUrl: s.taxon.default_photo?.square_url,
        description: `Possible signal from community observations. ${s.taxon.preferred_common_name || s.taxon.name} shows notably higher normalized observation frequency compared to previous years.`,
        dataNote: "Increases may reflect more observers, range expansion, or population growth. Community science data alone cannot confirm trends.",
        observationCount: s.count,
        previousCount: histCount,
      });
    }
  });

  return signals.slice(0, 12);
}

export default function SignalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lat, lng, radius } = useLocation();

  const { data: current, isLoading: l1, refetch: r1, isRefetching: rf1 } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(`nearby-${lat}-${lng}-${radius}`, () =>
        fetchNearbySpecies(lat!, lng!, radius, 100)
      ),
    enabled: !!lat && !!lng,
  });

  const { data: historical, isLoading: l2, refetch: r2, isRefetching: rf2 } = useQuery({
    queryKey: ["historical-species", lat, lng, radius],
    queryFn: () =>
      withCache(`historical-${lat}-${lng}-${radius}`, () =>
        fetchHistoricalSpecies(lat!, lng!, radius, 3)
      ),
    enabled: !!lat && !!lng,
  });

  const isLoading = l1 || l2;
  const isRefreshing = rf1 || rf2;

  const signals = useMemo(() => {
    if (!current || !historical) return [];
    return generateSignals(current, historical);
  }, [current, historical]);

  const declines = signals.filter((s) => s.type === "declining");
  const newObs = signals.filter((s) => s.type === "new");
  const increases = signals.filter((s) => s.type === "increasing");

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.earthDark }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topInsets + 16,
            paddingBottom: bottomInsets + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { r1(); r2(); }}
            tintColor="#22D3EE"
          />
        }
      >
        <Text style={styles.title}>Biodiversity Signals</Text>
        <Text style={styles.subtitle}>
          Patterns from community observations — possible signals, not scientific findings.
        </Text>

        {/* Caveat banner */}
        <View style={[styles.caveatBanner, { backgroundColor: "#22D3EE10", borderColor: "#22D3EE30" }]}>
          <Feather name="info" size={15} color="#22D3EE" />
          <Text style={[styles.caveatText, { color: "#94A3B8" }]}>
            All signals below are derived from iNaturalist community data. Observer effort, location biases, and seasonal variation all affect these patterns. These are not scientific assessments.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.skeletons}>
            <RiveLoadingShimmer hero width={140} height={140} />
            <Text style={[styles.caveatText, { color: "#64748B", textAlign: "center" }]}>
              Comparing recent observations against historical baselines…
            </Text>
          </View>
        ) : signals.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: "#0F1824" }]}>
            <RiveEmptyState
              icon="activity"
              title="No signals detected"
              description="Not enough historical data to compare. Try a larger radius or check back after more community observations accumulate."
            />
          </View>
        ) : (
          <>
            {declines.length > 0 && (
              <Section
                title="Possible Declines"
                icon="trending-down"
                color="#EF4444"
                signals={declines}
              />
            )}
            {newObs.length > 0 && (
              <Section
                title="Newly Observed Species"
                icon="plus-circle"
                color="#4ADE80"
                signals={newObs}
              />
            )}
            {increases.length > 0 && (
              <Section
                title="Increasing Activity"
                icon="trending-up"
                color="#22D3EE"
                signals={increases}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  icon,
  color,
  signals,
}: {
  title: string;
  icon: string;
  color: string;
  signals: Signal[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={16} color={color} />
        <Text style={[styles.sectionTitle, { color: "#FFFFFF" }]}>{title}</Text>
      </View>
      {signals.map((s) => (
        <SignalCard key={s.id} signal={s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
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
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 18,
  },
  caveatBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  caveatText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  skeletons: { gap: 10 },
  skeletonCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    gap: 12,
    alignItems: "center",
  },
  empty: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginTop: 12,
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
    lineHeight: 19,
  },
});
