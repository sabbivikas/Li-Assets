import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Linking,
  Platform,
  Pressable,
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
  WobbleButton,
} from "@/components/paint";
import { useLocation } from "@/context/LocationContext";
import {
  getEcosystemRoles,
  getRoleColor,
  getRoleLabel,
} from "@/services/ecologyModel";
import {
  fetchObservationHistogram,
  fetchSpeciesById,
  fetchSpeciesObservations,
  getConservationLabel,
  getIconicGroup,
} from "@/services/iNaturalist";
import { unlockCard } from "@/services/lifeCards";

const CHART_HEIGHT = 90;

const GROUP_CRITTER: Record<string, React.ComponentType<{ size?: number }>> = {
  Birds: Bird,
  Insects: Bee,
  Plants: Flower,
  Amphibians: Frog,
  Fungi: Mushroom,
};

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius } = useLocation();
  const taxonId = parseInt(id || "0");

  const { data: taxon, isLoading: loadingTaxon } = useQuery({
    queryKey: ["taxon", taxonId],
    queryFn: () => fetchSpeciesById(taxonId),
    enabled: !!taxonId,
  });

  const { data: observations, isLoading: loadingObs } = useQuery({
    queryKey: ["observations", taxonId, lat, lng, radius],
    queryFn: () => fetchSpeciesObservations(taxonId, lat!, lng!, radius),
    enabled: !!taxonId && !!lat && !!lng,
  });

  const { data: histogram, isLoading: loadingHist } = useQuery({
    queryKey: ["histogram", taxonId, lat, lng, radius],
    queryFn: () => fetchObservationHistogram(taxonId, lat!, lng!, radius),
    enabled: !!taxonId && !!lat && !!lng,
  });

  const isLoading = loadingTaxon || loadingObs || loadingHist;

  // Discovery unlock — fires once when the species + nearby observations resolve.
  useEffect(() => {
    if (!taxon) return;
    unlockCard({
      method: "discovery",
      taxon,
      nearbyCount: observations?.length ?? 0,
      lastSeenDate: observations?.[0]?.observed_on,
    }).catch(() => {});
  }, [taxon, observations]);

  const photoUrl =
    taxon?.taxon_photos?.[0]?.photo?.large_url ||
    taxon?.taxon_photos?.[0]?.photo?.medium_url ||
    taxon?.default_photo?.medium_url;

  const group = getIconicGroup(taxon?.iconic_taxon_name);
  const Critter = GROUP_CRITTER[group] ?? Flower;
  const roles = getEcosystemRoles(
    taxon?.iconic_taxon_name,
    taxon?.preferred_common_name
  );
  const conservationStatus = taxon?.conservation_status?.status;
  const conservationInfo = getConservationLabel(conservationStatus);

  const dates = observations
    ?.map((o) => o.observed_on)
    .filter(Boolean)
    .sort() as string[];
  const firstSeen = dates?.[dates.length - 1];
  const lastSeen = dates?.[0];

  const histData = histogram?.results || {};
  const histEntries = Object.entries(histData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24);
  const maxCount = Math.max(...histEntries.map(([, v]) => v as number), 1);
  const currentYear = new Date().getFullYear();

  const yearCounts: Record<string, number> = {};
  histEntries.forEach(([date, count]) => {
    const year = date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + (count as number);
  });

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInsets + 8, paddingBottom: bottomInsets + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backWrap}>
          <WobbleBox width={92} height={40} fill="white" seed={1} padding={0}>
            <View style={styles.backInner}>
              <Feather name="arrow-left" size={16} color={PAINT.ink} />
              <Text style={styles.backText}>back</Text>
            </View>
          </WobbleBox>
        </Pressable>

        {/* Hero polaroid */}
        <View style={styles.polaroidWrap}>
          <View style={[styles.tape, styles.tapeLeft]} />
          <View style={[styles.tape, styles.tapeRight]} />
          <View style={styles.polaroid}>
            <View style={styles.heroFrame}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                  <Critter size={96} />
                </View>
              )}
            </View>
            <View style={styles.polaroidCaption}>
              {taxon ? (
                <>
                  <Text style={styles.commonName} numberOfLines={2}>
                    {taxon.preferred_common_name || taxon.name}
                  </Text>
                  <Text style={styles.sciName}>{taxon.name}</Text>
                  <View style={styles.heroBadges}>
                    <View
                      style={[
                        styles.groupPill,
                        { backgroundColor: PAINT.sun + "55" },
                      ]}
                    >
                      <Text style={styles.groupPillText}>{group}</Text>
                    </View>
                    {conservationStatus &&
                      conservationStatus.toUpperCase() !== "LC" && (
                        <View
                          style={[
                            styles.groupPill,
                            { backgroundColor: conservationInfo.color + "44" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.groupPillText,
                              { color: conservationInfo.color },
                            ]}
                          >
                            {conservationInfo.label}
                          </Text>
                        </View>
                      )}
                  </View>
                </>
              ) : (
                <Text style={styles.commonName}>loading…</Text>
              )}
            </View>
          </View>
        </View>

        {isLoading || !taxon ? (
          <View style={styles.loadingWrap}>
            <Bee size={56} />
            <Text style={styles.loadingText}>
              flipping through field notes…
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Stat row */}
            <View style={styles.statsRow}>
              <PaintStat
                label="Sightings"
                value={observations?.length?.toLocaleString() || "0"}
                color={PAINT.blue}
                seed={3}
                emoji="👀"
              />
              <PaintStat
                label="First seen"
                value={firstSeen ? formatDate(firstSeen) : "—"}
                color={PAINT.grass}
                seed={9}
                emoji="📅"
              />
              <PaintStat
                label="Last seen"
                value={lastSeen ? formatDate(lastSeen) : "—"}
                color={PAINT.sun}
                seed={17}
                emoji="🕓"
              />
            </View>

            {/* Roles */}
            <SectionTitle text="Ecosystem Roles" color={PAINT.grassDeep} seed={5} />
            <View style={styles.rolesWrap}>
              {roles.map((role) => {
                const c = getRoleColor(role);
                return (
                  <View
                    key={role}
                    style={[
                      styles.rolePill,
                      { backgroundColor: c + "33", borderColor: c },
                    ]}
                  >
                    <View style={[styles.roleDot, { backgroundColor: c }]} />
                    <Text style={[styles.roleText, { color: PAINT.ink }]}>
                      {getRoleLabel(role)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Observation timeline */}
            {histEntries.length > 0 && (
              <>
                <SectionTitle
                  text="Observation Timeline"
                  color={PAINT.blue}
                  seed={11}
                />
                <WobbleBox
                  width={358}
                  height={CHART_HEIGHT + 56}
                  fill="white"
                  seed={21}
                  padding={14}
                >
                  <View>
                    <Svg
                      width={330}
                      height={CHART_HEIGHT}
                      viewBox={`0 0 ${histEntries.length * 13} ${CHART_HEIGHT}`}
                    >
                      {histEntries.map(([date, count], i) => {
                        const h = ((count as number) / maxCount) * (CHART_HEIGHT - 14);
                        const isCurrent = date.slice(0, 4) === String(currentYear);
                        return (
                          <Rect
                            key={date}
                            x={i * 13 + 2}
                            y={CHART_HEIGHT - h - 8}
                            width={9}
                            height={h}
                            fill={isCurrent ? PAINT.grassDeep : PAINT.blue}
                            fillOpacity={isCurrent ? 0.85 : 0.5}
                            stroke={PAINT.ink}
                            strokeWidth={0.6}
                          />
                        );
                      })}
                      <Path
                        d={wobble(
                          0,
                          CHART_HEIGHT - 6,
                          histEntries.length * 13,
                          CHART_HEIGHT - 6,
                          0.3,
                          12,
                          7
                        )}
                        stroke={PAINT.ink}
                        strokeWidth={1}
                        fill="none"
                      />
                    </Svg>
                    <View style={styles.chartLegend}>
                      <Text style={styles.chartLegendText}>past 24 months</Text>
                      <View style={styles.legendItems}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: PAINT.grassDeep },
                            ]}
                          />
                          <Text style={styles.legendLabel}>this year</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: PAINT.blue, opacity: 0.5 },
                            ]}
                          />
                          <Text style={styles.legendLabel}>previous</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </WobbleBox>
              </>
            )}

            {/* Yearly */}
            {Object.keys(yearCounts).length > 1 && (
              <>
                <SectionTitle
                  text="Yearly Activity"
                  color={PAINT.orange}
                  seed={31}
                />
                <View style={{ gap: 8 }}>
                  {Object.entries(yearCounts)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 5)
                    .map(([year, count], i) => {
                      const max = Math.max(...Object.values(yearCounts));
                      const widthPct = (count / max) * 100;
                      const isCurrent = year === String(currentYear);
                      return (
                        <WobbleBox
                          key={year}
                          width={358}
                          height={42}
                          fill="white"
                          seed={i * 5 + 41}
                          padding={0}
                        >
                          <View style={styles.yearRow}>
                            <Text style={styles.yearLabel}>{year}</Text>
                            <View style={styles.yearBarTrack}>
                              <View
                                style={[
                                  styles.yearBarFill,
                                  {
                                    width: `${widthPct}%`,
                                    backgroundColor: isCurrent
                                      ? PAINT.grassDeep
                                      : PAINT.blue + "99",
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.yearCount}>{count}</Text>
                          </View>
                        </WobbleBox>
                      );
                    })}
                </View>
              </>
            )}

            {/* Wikipedia */}
            {taxon.wikipedia_url && (
              <>
                <SectionTitle
                  text="Learn More"
                  color={PAINT.purple}
                  seed={51}
                />
                <Pressable
                  onPress={() =>
                    taxon.wikipedia_url &&
                    Linking.openURL(taxon.wikipedia_url)
                  }
                >
                  <WobbleBox
                    width={358}
                    height={56}
                    fill={PAINT.cream}
                    seed={55}
                    padding={0}
                  >
                    <View style={styles.wikiInner}>
                      <Feather name="external-link" size={18} color={PAINT.blue} />
                      <Text style={styles.wikiText}>View on Wikipedia</Text>
                      <Feather name="chevron-right" size={18} color={PAINT.inkMute} />
                    </View>
                  </WobbleBox>
                </Pressable>
              </>
            )}

            {/* Impact CTA */}
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <WobbleButton
                label="What if it disappears?"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/impact/${taxonId}` as any);
                }}
                color={PAINT.red}
                width={320}
                height={62}
                seed={71}
                textColor="white"
                leading={<Feather name="zap" size={20} color="white" />}
              />
              <Text style={styles.ctaCaption}>
                see the ecological chain reaction →
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PaintStat({
  label,
  value,
  color,
  seed,
  emoji,
}: {
  label: string;
  value: string;
  color: string;
  seed: number;
  emoji: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <WobbleBox width={108} height={86} fill="white" seed={seed} padding={0}>
        <View style={styles.statInner}>
          <Text style={styles.statEmoji}>{emoji}</Text>
          <Text style={[styles.statValue, { color }]} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </WobbleBox>
    </View>
  );
}

function SectionTitle({
  text,
  color,
  seed,
}: {
  text: string;
  color: string;
  seed: number;
}) {
  return (
    <View style={{ marginTop: 8, marginBottom: 6 }}>
      <Text style={styles.sectionTitle}>{text}</Text>
      <CrayonUnderline width={text.length * 14} color={color} seed={seed} />
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 16 },
  backWrap: { alignSelf: "flex-start", marginBottom: 8 },
  backInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backText: { fontFamily: HAND_FONT, fontSize: 18, color: PAINT.ink },
  polaroidWrap: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  polaroid: {
    width: 326,
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: PAINT.ink,
    padding: 12,
    transform: [{ rotate: "-1deg" }],
  },
  tape: {
    position: "absolute",
    top: -10,
    width: 64,
    height: 22,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    zIndex: 2,
  },
  tapeLeft: {
    left: 30,
    backgroundColor: PAINT.sun + "cc",
    transform: [{ rotate: "-7deg" }],
  },
  tapeRight: {
    right: 30,
    backgroundColor: PAINT.pink + "cc",
    transform: [{ rotate: "9deg" }],
  },
  heroFrame: {
    width: "100%",
    height: 240,
    borderWidth: 2.5,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
    overflow: "hidden",
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PAINT.sun + "55",
  },
  polaroidCaption: { paddingTop: 12, gap: 4 },
  commonName: {
    fontFamily: HAND_FONT,
    fontSize: 28,
    color: PAINT.ink,
    lineHeight: 30,
  },
  sciName: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    fontStyle: "italic",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  groupPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
  },
  groupPillText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.ink,
    fontWeight: "700",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 10,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
  },
  content: { gap: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  statEmoji: { fontSize: 18 },
  statValue: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    lineHeight: 20,
  },
  statLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
  },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  rolesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleText: { fontFamily: LABEL_FONT, fontSize: 12, fontWeight: "700" },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chartLegendText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkMute,
  },
  legendItems: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: LABEL_FONT, fontSize: 11, color: PAINT.inkSoft },
  yearRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  yearLabel: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    width: 46,
    color: PAINT.ink,
  },
  yearBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: PAINT.paperDeep,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PAINT.ink,
    overflow: "hidden",
  },
  yearBarFill: { height: "100%" },
  yearCount: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
    width: 36,
    textAlign: "right",
  },
  wikiInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  wikiText: {
    flex: 1,
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
  },
  ctaCaption: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginTop: 6,
  },
});
