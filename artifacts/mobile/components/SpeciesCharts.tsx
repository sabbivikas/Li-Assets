import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PAINT,
  WobbleBox,
  wobble,
} from "@/components/paint";
import {
  fetchLifeStageCounts,
  fetchSeasonalityData,
  fetchSexCounts,
  fetchYearlyHistogram,
} from "@/services/iNaturalist";

const TABS = ["Seasonality", "History", "Life Stage", "Sex"] as const;
type Tab = (typeof TABS)[number];

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const TAB_COLORS: Record<Tab, string> = {
  Seasonality: PAINT.grass,
  History: PAINT.blue,
  "Life Stage": PAINT.orange,
  Sex: PAINT.pink,
};

const CHART_W = 318;
const CHART_H = 110;
const BAR_COLORS = [PAINT.grassDeep, PAINT.blue, PAINT.orange, PAINT.pink, PAINT.purple, PAINT.sun, PAINT.red];

interface Props {
  taxonId: number;
}

export function SpeciesCharts({ taxonId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Seasonality");

  const { data: seasonality, isLoading: loadSeason } = useQuery({
    queryKey: ["seasonality", taxonId],
    queryFn: () => fetchSeasonalityData(taxonId),
    enabled: !!taxonId,
  });

  const { data: yearly, isLoading: loadYearly } = useQuery({
    queryKey: ["yearly", taxonId],
    queryFn: () => fetchYearlyHistogram(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: lifeStage, isLoading: loadLS } = useQuery({
    queryKey: ["lifestage", taxonId],
    queryFn: () => fetchLifeStageCounts(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sex, isLoading: loadSex } = useQuery({
    queryKey: ["sex", taxonId],
    queryFn: () => fetchSexCounts(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const isLoading =
    (activeTab === "Seasonality" && loadSeason) ||
    (activeTab === "History" && loadYearly) ||
    (activeTab === "Life Stage" && loadLS) ||
    (activeTab === "Sex" && loadSex);

  const boxHeight = (() => {
    if (isLoading) return 130;
    if (activeTab === "Seasonality") return 162;
    if (activeTab === "History") return 162;
    if (activeTab === "Life Stage") {
      const n = lifeStage?.length ?? 0;
      return n === 0 ? 90 : 40 + n * 44 + 24;
    }
    if (activeTab === "Sex") {
      const n = sex?.length ?? 0;
      return n === 0 ? 90 : 40 + n * 44 + 24;
    }
    return 162;
  })();

  return (
    <View style={styles.root}>
      {/* Section header */}
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>Charts</Text>
        <CrayonUnderline width={72} color={PAINT.grassDeep} seed={77} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <Pressable key={tab} onPress={() => setActiveTab(tab)}>
              <View
                style={[
                  styles.tab,
                  active && { backgroundColor: TAB_COLORS[tab], borderColor: PAINT.ink },
                ]}
              >
                <Text
                  style={[styles.tabText, active && { color: PAINT.ink, fontFamily: HAND_FONT }]}
                >
                  {tab}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Chart area */}
      <WobbleBox
        width={358}
        height={boxHeight}
        fill="white"
        seed={99}
        padding={14}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={TAB_COLORS[activeTab]} size="small" />
            <Text style={styles.loadingText}>loading chart…</Text>
          </View>
        ) : (
          <>
            {activeTab === "Seasonality" && (
              <SeasonalityChart data={seasonality ?? []} />
            )}
            {activeTab === "History" && (
              <HistoryChart data={yearly ?? []} />
            )}
            {activeTab === "Life Stage" && (
              <HorizontalBars data={lifeStage ?? []} colors={BAR_COLORS} emptyMsg="No annotated life stage data" />
            )}
            {activeTab === "Sex" && (
              <HorizontalBars
                data={sex ?? []}
                colors={[PAINT.pink, PAINT.blue, PAINT.inkMute]}
                emptyMsg="No annotated sex data"
              />
            )}
          </>
        )}
      </WobbleBox>
    </View>
  );
}

function SeasonalityChart({ data }: { data: Array<{ month: number; count: number }> }) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);
  if (!hasData) return <EmptyState msg="No seasonality data available" />;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barW = CHART_W / 12;
  const usableH = CHART_H - 20;

  const points = data.map((d, i) => ({
    x: i * barW + barW / 2,
    y: usableH - (d.count / maxCount) * (usableH - 6) + 4,
  }));

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cp1x = (points[i - 1].x + points[i].x) / 2;
      pathD += ` C ${cp1x} ${points[i - 1].y} ${cp1x} ${points[i].y} ${points[i].x} ${points[i].y}`;
    }
  }
  const areaD = pathD
    ? `${pathD} L ${points[points.length - 1].x} ${usableH + 4} L ${points[0].x} ${usableH + 4} Z`
    : "";

  const peakMonth = data.reduce(
    (best, d) => (d.count > best.count ? d : best),
    data[0] ?? { month: 1, count: 0 }
  );

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H + 20}>
        <Defs>
          <LinearGradient id="seasonGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.grass} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={PAINT.grass} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        {/* Area fill */}
        {areaD ? <Path d={areaD} fill="url(#seasonGrad)" /> : null}
        {/* Line */}
        {pathD ? (
          <Path d={pathD} stroke={PAINT.grassDeep} strokeWidth={2} fill="none" strokeLinecap="round" />
        ) : null}
        {/* Dots */}
        {points.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={3} fill={PAINT.grassDeep} />
        ))}
        {/* Peak label */}
        {peakMonth && (
          <SvgText
            x={points[peakMonth.month - 1]?.x ?? 0}
            y={(points[peakMonth.month - 1]?.y ?? 0) - 8}
            fontSize={9}
            fontFamily={LABEL_FONT}
            fill={PAINT.grassDeep}
            textAnchor="middle"
          >
            {formatK(peakMonth.count)}
          </SvgText>
        )}
        {/* Baseline */}
        <Path
          d={wobble(0, usableH + 4, CHART_W, usableH + 4, 0.2, 10, 7)}
          stroke={PAINT.ink}
          strokeWidth={1}
          fill="none"
        />
        {/* Month labels */}
        {MONTH_LABELS.map((label, i) => (
          <SvgText
            key={i}
            x={i * barW + barW / 2}
            y={CHART_H + 17}
            fontSize={9}
            fontFamily={LABEL_FONT}
            fill={PAINT.inkSoft}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function HistoryChart({ data }: { data: Array<{ year: number; count: number }> }) {
  if (data.length === 0) {
    return <EmptyState msg="No history data available" />;
  }
  const visible = data.slice(-20);
  const maxCount = Math.max(...visible.map((d) => d.count), 1);
  const barW = Math.floor(CHART_W / visible.length);
  const gap = 2;
  const usableH = CHART_H - 18;
  const currentYear = new Date().getFullYear();

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H + 20}>
        <Defs>
          <LinearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.blue} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={PAINT.blue} stopOpacity={0.4} />
          </LinearGradient>
          <LinearGradient id="histGradCur" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.grassDeep} stopOpacity={1} />
            <Stop offset="100%" stopColor={PAINT.grassDeep} stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
        {visible.map((d, i) => {
          const h = Math.max(2, (d.count / maxCount) * (usableH - 6));
          const isCur = d.year === currentYear;
          return (
            <Rect
              key={d.year}
              x={i * barW + gap}
              y={usableH - h + 2}
              width={barW - gap * 2}
              height={h}
              fill={isCur ? "url(#histGradCur)" : "url(#histGrad)"}
              stroke={PAINT.ink}
              strokeWidth={0.5}
              rx={2}
            />
          );
        })}
        <Path
          d={wobble(0, usableH + 2, CHART_W, usableH + 2, 0.2, 10, 7)}
          stroke={PAINT.ink}
          strokeWidth={1}
          fill="none"
        />
        {/* Year labels — show first, middle, last */}
        {[0, Math.floor(visible.length / 2), visible.length - 1]
          .filter((i, idx, arr) => arr.indexOf(i) === idx)
          .map((i) => (
            <SvgText
              key={i}
              x={i * barW + barW / 2}
              y={CHART_H + 17}
              fontSize={9}
              fontFamily={LABEL_FONT}
              fill={PAINT.inkSoft}
              textAnchor="middle"
            >
              {visible[i]?.year}
            </SvgText>
          ))}
      </Svg>
    </View>
  );
}

function HorizontalBars({
  data,
  colors,
  emptyMsg,
}: {
  data: Array<{ label: string; count: number }>;
  colors: string[];
  emptyMsg: string;
}) {
  if (data.length === 0) return <EmptyState msg={emptyMsg} />;
  const total = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={{ gap: 10 }}>
      {data.map((d, i) => {
        const pct = (d.count / maxCount) * 100;
        const share = total > 0 ? Math.round((d.count / total) * 100) : 0;
        const color = colors[i % colors.length];
        return (
          <View key={d.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{d.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.barPct, { color }]}>{share}%</Text>
          </View>
        );
      })}
      <Text style={styles.totalLabel}>
        {total.toLocaleString()} total annotated
      </Text>
    </View>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <View style={styles.loadingWrap}>
      <Text style={styles.loadingText}>{msg}</Text>
    </View>
  );
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: PAINT.ink + "55",
    backgroundColor: "transparent",
  },
  tabText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkMute,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.ink,
    width: 72,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: PAINT.paperDeep,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: PAINT.ink + "33",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 7,
  },
  barPct: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    width: 36,
    textAlign: "right",
  },
  totalLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkMute,
    textAlign: "right",
    marginTop: 2,
  },
});
