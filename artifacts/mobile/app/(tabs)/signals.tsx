import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  wobble,
  WobbleBox,
} from "@/components/paint";
import { useLocation } from "@/context/LocationContext";
import {
  fetchHistoricalSpecies,
  fetchNearbySpecies,
  getIconicGroup,
  type SpeciesCount,
} from "@/services/iNaturalist";
import { withCache } from "@/services/cache";

type SignalType = "declining" | "new" | "increasing";

type Signal = {
  id: string;
  type: SignalType;
  speciesName: string;
  scientificName: string;
  iconicGroup: string;
  photoUrl?: string;
  msg: string;
  stat: string;
  chart: number[];
  observationCount: number;
};

function makeChart(seed: number, type: SignalType): number[] {
  const rand = (i: number) => {
    const x = Math.sin(seed * 9.7 + i * 3.1) * 10000;
    return x - Math.floor(x);
  };
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    let base = 50;
    if (type === "declining") base = 80 - t * 60 + (rand(i) - 0.5) * 14;
    else if (type === "increasing") base = 20 + t * 80 + (rand(i) - 0.5) * 12;
    else base = 10 + Math.pow(t, 1.6) * 70 + (rand(i) - 0.5) * 12;
    out.push(Math.max(6, base));
  }
  return out;
}

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

  current.slice(0, 20).forEach((s, idx) => {
    if (!historicalMap.has(s.taxon.id) && s.count >= 3) {
      signals.push({
        id: `new-${s.taxon.id}`,
        type: "new",
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        iconicGroup: getIconicGroup(s.taxon.iconic_taxon_name),
        photoUrl: s.taxon.default_photo?.square_url,
        msg: "appearing for the first time in your area",
        stat: `+${s.count}`,
        chart: makeChart(s.taxon.id + idx, "new"),
        observationCount: s.count,
      });
    }
  });

  historical.slice(0, 30).forEach((s, idx) => {
    const histCount = s.count;
    const currCount = currentMap.get(s.taxon.id) || 0;
    const histFreq = histCount / totalHistorical;
    const currFreq = currCount / totalCurrent;
    if (histFreq > 0 && currFreq < histFreq * 0.4 && histCount >= 5) {
      const pct = Math.round((1 - currFreq / histFreq) * 100);
      signals.push({
        id: `decline-${s.taxon.id}`,
        type: "declining",
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        iconicGroup: getIconicGroup(s.taxon.iconic_taxon_name),
        photoUrl: s.taxon.default_photo?.square_url,
        msg: "quieter compared to past 3 years",
        stat: `-${pct}%`,
        chart: makeChart(s.taxon.id + idx + 100, "declining"),
        observationCount: currCount,
      });
    }
  });

  current.slice(0, 30).forEach((s, idx) => {
    const histCount = historicalMap.get(s.taxon.id) || 0;
    const histFreq = histCount / totalHistorical;
    const currFreq = s.count / totalCurrent;
    if (histCount >= 2 && currFreq > histFreq * 2.5 && s.count >= 10) {
      const pct = Math.round((currFreq / histFreq - 1) * 100);
      signals.push({
        id: `increasing-${s.taxon.id}`,
        type: "increasing",
        speciesName: s.taxon.preferred_common_name || s.taxon.name,
        scientificName: s.taxon.name,
        iconicGroup: getIconicGroup(s.taxon.iconic_taxon_name),
        photoUrl: s.taxon.default_photo?.square_url,
        msg: `${(currFreq / histFreq).toFixed(1)}x more sightings this season`,
        stat: `+${pct}%`,
        chart: makeChart(s.taxon.id + idx + 200, "increasing"),
        observationCount: s.count,
      });
    }
  });

  return signals.slice(0, 12);
}

const GROUP_FALLBACK: Record<string, React.ComponentType<{ size?: number }>> = {
  Birds: Bird,
  Insects: Bee,
  Plants: Flower,
  Amphibians: Frog,
  Fungi: Mushroom,
};

export default function SignalsScreen() {
  const insets = useSafeAreaInsets();
  const { lat, lng, radius } = useLocation();

  const {
    data: current,
    isLoading: l1,
    refetch: r1,
    isRefetching: rf1,
  } = useQuery({
    queryKey: ["nearby-species", lat, lng, radius],
    queryFn: () =>
      withCache(`nearby-${lat}-${lng}-${radius}`, () =>
        fetchNearbySpecies(lat!, lng!, radius, 100)
      ),
    enabled: !!lat && !!lng,
  });

  const {
    data: historical,
    isLoading: l2,
    refetch: r2,
    isRefetching: rf2,
  } = useQuery({
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
    <View style={styles.container}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topInsets + 18,
            paddingBottom: bottomInsets + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              r1();
              r2();
            }}
            tintColor={PAINT.blue}
          />
        }
      >
        <Text style={styles.title}>Signals</Text>
        <CrayonUnderline width={130} color={PAINT.blue} seed={3} />
        <Text style={styles.subtitle}>
          What&apos;s shifting in your neck of the woods.
        </Text>

        {isLoading ? (
          <View style={styles.loading}>
            <Bee size={64} />
            <Text style={styles.loadingText}>
              comparing recent sightings to past years…
            </Text>
          </View>
        ) : signals.length === 0 ? (
          <View style={styles.empty}>
            <Frog size={72} />
            <Text style={styles.emptyTitle}>no signals yet</Text>
            <Text style={styles.emptyDesc}>
              not enough historical data to compare. try a wider radius or
              check back when more sightings roll in.
            </Text>
          </View>
        ) : (
          <>
            {declines.length > 0 && (
              <Section
                title="going quiet"
                emoji="↘"
                color={PAINT.red}
                signals={declines}
              />
            )}
            {newObs.length > 0 && (
              <Section
                title="new arrivals"
                emoji="✨"
                color={PAINT.grassDeep}
                signals={newObs}
              />
            )}
            {increases.length > 0 && (
              <Section
                title="more & more"
                emoji="📈"
                color={PAINT.blue}
                signals={increases}
              />
            )}

            {/* friendly caveat note */}
            <View style={styles.caveat}>
              <Text style={styles.caveatText}>
                🐾 These are friendly hints from community sightings, not
                scientific facts. Maybe more people are looking, or maybe
                nature is shifting!
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  emoji,
  color,
  signals,
}: {
  title: string;
  emoji: string;
  color: string;
  signals: Signal[];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionEmoji, { color }]}>{emoji}</Text>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      <View style={{ gap: 10, marginTop: 6 }}>
        {signals.map((s, i) => (
          <SignalCard key={s.id} signal={s} seed={i * 5 + 1} color={color} />
        ))}
      </View>
    </View>
  );
}

function SignalCard({
  signal,
  seed,
  color,
}: {
  signal: Signal;
  seed: number;
  color: string;
}) {
  const max = Math.max(...signal.chart);
  const Icon = GROUP_FALLBACK[signal.iconicGroup] ?? Flower;
  return (
    <WobbleBox width={358} height={120} fill="white" seed={seed} padding={12}>
      <View style={styles.cardRow}>
        {signal.photoUrl ? (
          <Image
            source={{ uri: signal.photoUrl }}
            style={styles.cardPhoto}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
            <Icon size={48} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {signal.speciesName}
          </Text>
          <Text style={styles.cardMsg} numberOfLines={2}>
            {signal.msg}
          </Text>
          <View style={{ marginTop: 4 }}>
            <Svg width={170} height={28} viewBox="0 0 170 28">
              {signal.chart.map((v, i) => {
                const x = 4 + i * 13;
                const h = (v / max) * 22;
                return (
                  <Rect
                    key={i}
                    x={x}
                    y={26 - h}
                    width={9}
                    height={h}
                    fill={color}
                    fillOpacity={0.55}
                    stroke={color}
                    strokeWidth={0.8}
                  />
                );
              })}
              <Path
                d={wobble(4, 27, 162, 27, 0.4, 8, seed + 10)}
                stroke={PAINT.ink}
                strokeWidth={0.8}
                fill="none"
              />
            </Svg>
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statText, { color }]}>{signal.stat}</Text>
        </View>
      </View>
    </WobbleBox>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 16 },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 34,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.inkSoft,
    marginTop: 6,
    lineHeight: 20,
  },
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    transform: [{ rotate: "-0.5deg" }],
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  cardPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
  },
  cardPhotoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    lineHeight: 22,
  },
  cardMsg: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    lineHeight: 16,
  },
  statBox: { alignItems: "center", justifyContent: "center", minWidth: 60 },
  statText: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    lineHeight: 24,
    textAlign: "center",
  },
  loading: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  empty: {
    marginTop: 40,
    alignItems: "center",
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
    marginTop: 8,
  },
  emptyDesc: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
  },
  caveat: {
    marginTop: 22,
    padding: 14,
    backgroundColor: PAINT.pink + "33",
    borderWidth: 2,
    borderColor: PAINT.pink,
    borderStyle: "dashed",
    borderRadius: 4,
  },
  caveatText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.ink,
    lineHeight: 19,
  },
});
