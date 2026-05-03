import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConservationBadge } from "@/components/ConservationBadge";
import { LoadingShimmer } from "@/components/LoadingShimmer";
import { useLocation } from "@/context/LocationContext";
import {
  fetchSpeciesById,
  fetchObservationHistogram,
  fetchSpeciesObservations,
  getConservationLabel,
  getIconicGroup,
} from "@/services/iNaturalist";
import { getEcosystemRoles, getRoleLabel, getRoleColor } from "@/services/ecologyModel";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 80;

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lat, lng, radius } = useLocation();
  const taxonId = parseInt(id || "0");

  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  React.useEffect(() => {
    if (taxon) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [taxon]);

  const isLoading = loadingTaxon || loadingObs || loadingHist;

  const photoUrl =
    taxon?.taxon_photos?.[0]?.photo?.large_url ||
    taxon?.taxon_photos?.[0]?.photo?.medium_url ||
    taxon?.default_photo?.medium_url;

  const group = getIconicGroup(taxon?.iconic_taxon_name);
  const roles = getEcosystemRoles(taxon?.iconic_taxon_name, taxon?.preferred_common_name);
  const conservationStatus = taxon?.conservation_status?.status;
  const conservationInfo = getConservationLabel(conservationStatus);

  // Observation dates
  const dates = observations
    ?.map((o) => o.observed_on)
    .filter(Boolean)
    .sort() as string[];
  const firstSeen = dates?.[dates.length - 1];
  const lastSeen = dates?.[0];

  // Histogram chart
  const histData = histogram?.results || {};
  const histEntries = Object.entries(histData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24);
  const maxCount = Math.max(...histEntries.map(([, v]) => v as number), 1);

  // Year trend
  const currentYear = new Date().getFullYear();
  const yearCounts: Record<string, number> = {};
  histEntries.forEach(([date, count]) => {
    const year = date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + (count as number);
  });

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.earthDark }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomInsets + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.heroWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: "#0F1824" }]}>
              <Feather name="image" size={44} color="#334155" />
            </View>
          )}
          <View style={styles.heroOverlay} />
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                top: topInsets + 12,
                backgroundColor: "#00000060",
              },
            ]}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </Pressable>
          {/* Hero text overlay */}
          {taxon && (
            <Animated.View style={[styles.heroTextWrap, { opacity: fadeAnim }]}>
              <Text style={styles.heroCommonName}>
                {taxon.preferred_common_name || taxon.name}
              </Text>
              <Text style={styles.heroSciName}>{taxon.name}</Text>
              <View style={styles.heroBadges}>
                <View style={[styles.groupPill, { backgroundColor: "#FFFFFF20" }]}>
                  <Text style={styles.groupPillText}>{group}</Text>
                </View>
                <ConservationBadge status={conservationStatus} />
              </View>
            </Animated.View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContent}>
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingShimmer
                key={i}
                width={i % 2 === 0 ? "80%" : "60%"}
                height={i === 0 ? 18 : 14}
                borderRadius={6}
              />
            ))}
          </View>
        ) : taxon ? (
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Conservation status detail */}
            {conservationStatus && conservationStatus.toUpperCase() !== "LC" && (
              <View
                style={[
                  styles.conservationBanner,
                  {
                    backgroundColor: conservationInfo.color + "15",
                    borderColor: conservationInfo.color + "40",
                  },
                ]}
              >
                <Feather name="alert-triangle" size={15} color={conservationInfo.color} />
                <Text style={[styles.conservationText, { color: conservationInfo.color }]}>
                  {conservationInfo.label} — IUCN Red List
                </Text>
              </View>
            )}

            {/* Observation stats */}
            <View style={styles.statsRow}>
              <StatBox
                icon="eye"
                label="Nearby Observations"
                value={observations?.length?.toLocaleString() || "0"}
                color="#22D3EE"
              />
              <StatBox
                icon="calendar"
                label="First Observed"
                value={firstSeen ? formatDate(firstSeen) : "—"}
                color="#4ADE80"
              />
              <StatBox
                icon="clock"
                label="Last Observed"
                value={lastSeen ? formatDate(lastSeen) : "—"}
                color="#FBBF24"
              />
            </View>

            {/* Ecosystem roles */}
            <SectionHeader title="Ecosystem Roles" icon="layers" />
            <View style={styles.rolesWrap}>
              {roles.map((role) => (
                <View
                  key={role}
                  style={[
                    styles.rolePill,
                    { backgroundColor: getRoleColor(role) + "20" },
                  ]}
                >
                  <View
                    style={[
                      styles.roleDot,
                      { backgroundColor: getRoleColor(role) },
                    ]}
                  />
                  <Text style={[styles.roleText, { color: getRoleColor(role) }]}>
                    {getRoleLabel(role)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Observation timeline chart */}
            {histEntries.length > 0 && (
              <>
                <SectionHeader title="Observation Timeline" icon="bar-chart-2" />
                <View style={[styles.chartCard, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}>
                  <View style={styles.chartBars}>
                    {histEntries.map(([date, count]) => {
                      const height = ((count as number) / maxCount) * CHART_HEIGHT;
                      const year = date.slice(0, 4);
                      const month = date.slice(5, 7);
                      const isCurrentYear = year === String(currentYear);
                      return (
                        <View key={date} style={styles.barWrap}>
                          <View style={styles.barContainer}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height: Math.max(height, 2),
                                  backgroundColor: isCurrentYear
                                    ? "#4ADE80"
                                    : "#22D3EE50",
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.chartLegend}>
                    <Text style={[styles.chartLegendText, { color: "#334155" }]}>
                      Past 24 months
                    </Text>
                    <View style={styles.legendItems}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#4ADE80" }]} />
                        <Text style={[styles.legendLabel, { color: "#475569" }]}>This year</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#22D3EE50" }]} />
                        <Text style={[styles.legendLabel, { color: "#475569" }]}>Previous</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Year-by-year summary */}
            {Object.keys(yearCounts).length > 1 && (
              <>
                <SectionHeader title="Yearly Activity" icon="trending-up" />
                <View style={styles.yearRows}>
                  {Object.entries(yearCounts)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 5)
                    .map(([year, count]) => (
                      <View
                        key={year}
                        style={[styles.yearRow, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}
                      >
                        <Text style={[styles.yearLabel, { color: "#94A3B8" }]}>{year}</Text>
                        <View style={styles.yearBarWrap}>
                          <View
                            style={[
                              styles.yearBar,
                              {
                                width: `${(count / Math.max(...Object.values(yearCounts))) * 100}%`,
                                backgroundColor:
                                  year === String(currentYear)
                                    ? "#4ADE80"
                                    : "#22D3EE40",
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.yearCount, { color: "#FFFFFF" }]}>{count}</Text>
                      </View>
                    ))}
                </View>
              </>
            )}

            {/* Wikipedia link */}
            {taxon.wikipedia_url && (
              <>
                <SectionHeader title="Learn More" icon="book-open" />
                <Pressable
                  onPress={() => {
                    if (taxon.wikipedia_url) {
                      const { Linking } = require("react-native");
                      Linking.openURL(taxon.wikipedia_url);
                    }
                  }}
                  style={[styles.wikiBtn, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}
                >
                  <Feather name="external-link" size={16} color="#22D3EE" />
                  <Text style={[styles.wikiBtnText, { color: "#22D3EE" }]}>
                    View on Wikipedia
                  </Text>
                </Pressable>
              </>
            )}

            {/* Impact simulation CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                router.push(`/impact/${taxonId}` as any);
              }}
              style={({ pressed }) => [
                styles.impactBtn,
                {
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View style={styles.impactBtnInner}>
                <View style={styles.impactBtnLeft}>
                  <Feather name="zap" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.impactBtnTitle}>
                      What happens if this disappears?
                    </Text>
                    <Text style={styles.impactBtnDesc}>
                      See the ecological chain reaction
                    </Text>
                  </View>
                </View>
                <Feather name="arrow-right" size={18} color="#FFFFFF80" />
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.errorState}>
            <Feather name="alert-circle" size={28} color="#EF4444" />
            <Text style={[styles.errorText, { color: "#94A3B8" }]}>Could not load species data</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}>
      <Feather name={icon as any} size={14} color={color} />
      <Text style={[styles.statValue, { color: "#FFFFFF" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: "#475569" }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon as any} size={14} color="#4ADE80" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {},
  heroWrap: {
    height: 300,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  heroPlaceholder: {
    width: "100%",
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    opacity: 0.45,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    gap: 4,
  },
  heroCommonName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSciName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    color: "#FFFFFF99",
  },
  heroBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  groupPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  groupPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  loadingContent: {
    padding: 20,
    gap: 10,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  conservationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  conservationText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: 2,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
  },
  barContainer: {
    width: "100%",
    justifyContent: "flex-end",
    height: CHART_HEIGHT,
  },
  bar: {
    width: "100%",
    borderRadius: 3,
    minHeight: 2,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  chartLegendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  legendItems: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  yearRows: { gap: 6 },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  yearLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 38,
  },
  yearBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  yearBar: {
    height: 6,
    borderRadius: 3,
  },
  yearCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 30,
    textAlign: "right",
  },
  wikiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  wikiBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  impactBtn: {
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 4,
  },
  impactBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    backgroundColor: "#16A34A",
    gap: 14,
  },
  impactBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  impactBtnTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  impactBtnDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF99",
    marginTop: 1,
  },
  errorState: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
