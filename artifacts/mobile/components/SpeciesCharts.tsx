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
  MonthlySeriesData,
  fetchLifeStageSeasonality,
  fetchSeasonalityData,
  fetchSexSeasonality,
  fetchYearlyHistogram,
} from "@/services/iNaturalist";

const TABS = ["Seasonality", "History", "Life Stage", "Sex"] as const;
type Tab = (typeof TABS)[number];

const MONTH_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TAB_COLORS: Record<Tab, string> = {
  Seasonality: PAINT.grass,
  History: PAINT.blue,
  "Life Stage": PAINT.orange,
  Sex: PAINT.pink,
};

const BOX_W = 358;
const BOX_PAD = 14;
const INNER_W = BOX_W - BOX_PAD * 2;
const Y_AXIS_W = 34;
const PLOT_W = INNER_W - Y_AXIS_W;
const PLOT_H = 115;
const X_AXIS_H = 14;
const SVG_W = INNER_W;
const SVG_H = PLOT_H + X_AXIS_H;
const CHART_BOX_H = SVG_H + BOX_PAD * 2;

function colW(n: number) {
  return PLOT_W / n;
}

function monthlyToPoints(monthData: number[], maxVal: number) {
  const w = colW(12);
  return monthData.map((count, i) => ({
    x: Y_AXIS_W + i * w + w / 2,
    y: PLOT_H - (count / maxVal) * (PLOT_H - 10) + 5,
  }));
}

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp = (points[i - 1].x + points[i].x) / 2;
    d += ` C ${cp} ${points[i - 1].y} ${cp} ${points[i].y} ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function buildArea(linePath: string, points: Array<{ x: number; y: number }>): string {
  if (!linePath || points.length === 0) return "";
  return `${linePath} L ${points[points.length - 1].x} ${PLOT_H} L ${points[0].x} ${PLOT_H} Z`;
}

function yTicks(maxVal: number) {
  return [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: maxVal * pct,
    y: PLOT_H - pct * (PLOT_H - 10) + 5,
  }));
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n > 0 ? String(Math.round(n)) : "0";
}

interface DetailRow {
  label: string;
  value: string;
  color: string;
}

interface Props {
  taxonId: number;
}

export function SpeciesCharts({ taxonId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Seasonality");
  const [selected, setSelected] = useState<number | null>(null);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSelected(null);
  };

  const { data: seasonality, isLoading: loadSeason } = useQuery({
    queryKey: ["seasonality", taxonId],
    queryFn: () => fetchSeasonalityData(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: yearly, isLoading: loadYearly } = useQuery({
    queryKey: ["yearly", taxonId],
    queryFn: () => fetchYearlyHistogram(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: lifeStage, isLoading: loadLS } = useQuery({
    queryKey: ["lifestage-seasonal", taxonId],
    queryFn: () => fetchLifeStageSeasonality(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sex, isLoading: loadSex } = useQuery({
    queryKey: ["sex-seasonal", taxonId],
    queryFn: () => fetchSexSeasonality(taxonId),
    enabled: !!taxonId,
    staleTime: 10 * 60 * 1000,
  });

  const isLoading =
    (activeTab === "Seasonality" && loadSeason) ||
    (activeTab === "History" && loadYearly) ||
    (activeTab === "Life Stage" && loadLS) ||
    (activeTab === "Sex" && loadSex);

  const totalMonthly = (seasonality ?? []).map((d) => d.count);
  const visibleYears = (yearly ?? []).slice(-22);
  const currentYear = new Date().getFullYear();

  // --- Detail panel content (below the chart) ----------------------------
  const detail = (() => {
    // Selected → tooltip
    if (selected !== null) {
      if (activeTab === "Seasonality" && seasonality) {
        const d = seasonality[selected];
        if (!d) return null;
        return {
          title: MONTH_FULL[selected],
          rows: [
            {
              label: "Observations",
              value: d.count.toLocaleString(),
              color: PAINT.grassDeep,
            },
          ] as DetailRow[],
        };
      }
      if (activeTab === "History") {
        const d = visibleYears[selected];
        if (!d) return null;
        return {
          title: String(d.year),
          rows: [
            {
              label: "Observations",
              value: d.count.toLocaleString(),
              color: d.year === currentYear ? PAINT.grassDeep : PAINT.blue,
            },
          ] as DetailRow[],
        };
      }
      const series =
        activeTab === "Life Stage" ? lifeStage : activeTab === "Sex" ? sex : null;
      if (series && series.length > 0) {
        return {
          title: MONTH_FULL[selected],
          rows: [
            ...series.map((s) => ({
              label: s.label,
              value: (s.monthData[selected] ?? 0).toLocaleString(),
              color: s.color,
            })),
            {
              label: "Total",
              value: (totalMonthly[selected] ?? 0).toLocaleString(),
              color: PAINT.inkMute,
            },
          ] as DetailRow[],
        };
      }
    }

    // Not selected → legend for overlay tabs only
    if (activeTab === "Life Stage" && lifeStage && lifeStage.length > 0) {
      return { legend: lifeStage };
    }
    if (activeTab === "Sex" && sex && sex.length > 0) {
      return { legend: sex };
    }
    return null;
  })();

  return (
    <View style={styles.root}>
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>Charts</Text>
        <CrayonUnderline width={72} color={PAINT.grassDeep} seed={77} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <Pressable key={tab} onPress={() => switchTab(tab)}>
              <View
                style={[
                  styles.tab,
                  active && {
                    backgroundColor: TAB_COLORS[tab],
                    borderColor: PAINT.ink,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    active && { color: PAINT.ink, fontFamily: HAND_FONT },
                  ]}
                >
                  {tab}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <WobbleBox width={BOX_W} height={CHART_BOX_H} fill="white" seed={99} padding={BOX_PAD}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={TAB_COLORS[activeTab]} size="small" />
            <Text style={styles.loadingText}>loading chart…</Text>
          </View>
        ) : (
          <>
            {activeTab === "Seasonality" && (
              <SeasonalityChart
                data={seasonality ?? []}
                selected={selected}
                onSelect={setSelected}
              />
            )}
            {activeTab === "History" && (
              <HistoryChart
                data={visibleYears}
                selected={selected}
                onSelect={setSelected}
              />
            )}
            {activeTab === "Life Stage" && (
              <OverlayChart
                series={lifeStage ?? []}
                totalMonthly={totalMonthly}
                emptyMsg="No annotated life stage data"
                selected={selected}
                onSelect={setSelected}
              />
            )}
            {activeTab === "Sex" && (
              <OverlayChart
                series={sex ?? []}
                totalMonthly={totalMonthly}
                emptyMsg="No annotated sex data"
                selected={selected}
                onSelect={setSelected}
              />
            )}
          </>
        )}
      </WobbleBox>

      {/* Detail panel — sits below the chart, never overflows */}
      {detail && "rows" in detail && detail.rows ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{detail.title}</Text>
          <View style={{ gap: 4 }}>
            {detail.rows.map((r, i) => (
              <View key={i} style={styles.detailRow}>
                <View style={[styles.detailDot, { backgroundColor: r.color }]} />
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {detail && "legend" in detail && detail.legend ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: PAINT.inkMute }]} />
            <Text style={styles.legendLabel}>Total</Text>
          </View>
          {detail.legend.map((s, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GridAndAxes({
  maxVal,
  labels,
  highlightIndex,
}: {
  maxVal: number;
  labels: string[];
  highlightIndex: number | null;
}) {
  const ticks = yTicks(maxVal);
  const w = colW(labels.length);
  return (
    <>
      {ticks.map((tick, i) => (
        <React.Fragment key={i}>
          <Path
            d={`M ${Y_AXIS_W} ${tick.y} L ${SVG_W} ${tick.y}`}
            stroke={PAINT.ink + "14"}
            strokeWidth={1}
          />
          <SvgText
            x={Y_AXIS_W - 3}
            y={tick.y + 3}
            fontSize={8}
            fontFamily={LABEL_FONT}
            fill={PAINT.inkMute}
            textAnchor="end"
          >
            {formatNum(tick.value)}
          </SvgText>
        </React.Fragment>
      ))}
      {highlightIndex !== null && highlightIndex >= 0 && highlightIndex < labels.length ? (
        <Rect
          x={Y_AXIS_W + highlightIndex * w + 1}
          y={5}
          width={w - 2}
          height={PLOT_H - 5}
          fill={PAINT.ink + "0d"}
          rx={3}
        />
      ) : null}
      <Path
        d={wobble(Y_AXIS_W, PLOT_H + 1, SVG_W, PLOT_H + 1, 0.15, 8, 5)}
        stroke={PAINT.ink}
        strokeWidth={1}
        fill="none"
      />
      {labels.map((label, i) => (
        <SvgText
          key={i}
          x={Y_AXIS_W + i * w + w / 2}
          y={SVG_H - 1}
          fontSize={8}
          fontFamily={LABEL_FONT}
          fill={highlightIndex === i ? PAINT.ink : PAINT.inkSoft}
          textAnchor="middle"
          fontWeight={highlightIndex === i ? "bold" : "normal"}
        >
          {label}
        </SvgText>
      ))}
    </>
  );
}

function TouchOverlay({
  count,
  selected,
  onSelect,
}: {
  count: number;
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  const w = colW(count);
  return (
    <View style={[styles.touchOverlay, { left: Y_AXIS_W, width: PLOT_W, height: PLOT_H + 5 }]}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable
          key={i}
          onPress={() => onSelect(selected === i ? null : i)}
          style={{ width: w, height: "100%" }}
        />
      ))}
    </View>
  );
}

function SeasonalityChart({
  data,
  selected,
  onSelect,
}: {
  data: Array<{ month: number; count: number }>;
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);
  if (!hasData) return <EmptyState msg="No seasonality data" />;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const monthData = data.map((d) => d.count);
  const pts = monthlyToPoints(monthData, maxVal);
  const line = buildPath(pts);
  const area = buildArea(line, pts);

  const selVal = selected !== null ? monthData[selected] : null;
  const selPt = selected !== null ? pts[selected] : null;

  return (
    <View style={{ width: SVG_W, height: SVG_H }}>
      <Svg width={SVG_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.grass} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={PAINT.grass} stopOpacity={0.04} />
          </LinearGradient>
        </Defs>
        <GridAndAxes maxVal={maxVal} labels={MONTH_SHORT} highlightIndex={selected} />
        {area ? <Path d={area} fill="url(#sg)" /> : null}
        {line ? (
          <Path
            d={line}
            stroke={PAINT.grassDeep}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        {pts.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={selected === i ? 5 : 3}
            fill={selected === i ? PAINT.ink : PAINT.grassDeep}
            stroke={selected === i ? PAINT.grassDeep : "none"}
            strokeWidth={selected === i ? 2 : 0}
          />
        ))}
        {selPt && selVal !== null && selVal > 0 ? (
          <SvgText
            x={selPt.x}
            y={Math.max(selPt.y - 9, 12)}
            fontSize={9}
            fontFamily={LABEL_FONT}
            fill={PAINT.ink}
            textAnchor="middle"
            fontWeight="bold"
          >
            {formatNum(selVal)}
          </SvgText>
        ) : null}
      </Svg>
      <TouchOverlay count={12} selected={selected} onSelect={onSelect} />
    </View>
  );
}

function HistoryChart({
  data,
  selected,
  onSelect,
}: {
  data: Array<{ year: number; count: number }>;
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  if (data.length === 0) return <EmptyState msg="No history data" />;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const w = colW(data.length);
  const gap = Math.max(1, w * 0.15);
  const currentYear = new Date().getFullYear();
  const ticks = yTicks(maxVal);

  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  return (
    <View style={{ width: SVG_W, height: SVG_H }}>
      <Svg width={SVG_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.blue} stopOpacity={0.85} />
            <Stop offset="100%" stopColor={PAINT.blue} stopOpacity={0.35} />
          </LinearGradient>
          <LinearGradient id="hgc" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.grassDeep} stopOpacity={1} />
            <Stop offset="100%" stopColor={PAINT.grassDeep} stopOpacity={0.5} />
          </LinearGradient>
          <LinearGradient id="hgs" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.orange} stopOpacity={1} />
            <Stop offset="100%" stopColor={PAINT.orange} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>

        {ticks.map((tick, i) => (
          <React.Fragment key={i}>
            <Path
              d={`M ${Y_AXIS_W} ${tick.y} L ${SVG_W} ${tick.y}`}
              stroke={PAINT.ink + "14"}
              strokeWidth={1}
            />
            <SvgText
              x={Y_AXIS_W - 3}
              y={tick.y + 3}
              fontSize={8}
              fontFamily={LABEL_FONT}
              fill={PAINT.inkMute}
              textAnchor="end"
            >
              {formatNum(tick.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {data.map((d, i) => {
          const h = Math.max(2, (d.count / maxVal) * (PLOT_H - 10));
          const isCur = d.year === currentYear;
          const isSel = selected === i;
          const fill = isSel ? "url(#hgs)" : isCur ? "url(#hgc)" : "url(#hg)";
          return (
            <Rect
              key={d.year}
              x={Y_AXIS_W + i * w + gap}
              y={PLOT_H - h + 5}
              width={w - gap * 2}
              height={h}
              fill={fill}
              stroke={PAINT.ink}
              strokeWidth={isSel ? 1 : 0.4}
              rx={2}
            />
          );
        })}

        <Path
          d={wobble(Y_AXIS_W, PLOT_H + 1, SVG_W, PLOT_H + 1, 0.15, 8, 5)}
          stroke={PAINT.ink}
          strokeWidth={1}
          fill="none"
        />

        {labelIndices.map((i) => (
          <SvgText
            key={i}
            x={Y_AXIS_W + i * w + w / 2}
            y={SVG_H - 1}
            fontSize={8}
            fontFamily={LABEL_FONT}
            fill={PAINT.inkSoft}
            textAnchor="middle"
          >
            {data[i]?.year}
          </SvgText>
        ))}
      </Svg>
      <TouchOverlay count={data.length} selected={selected} onSelect={onSelect} />
    </View>
  );
}

function OverlayChart({
  series,
  totalMonthly,
  emptyMsg,
  selected,
  onSelect,
}: {
  series: MonthlySeriesData[];
  totalMonthly: number[];
  emptyMsg: string;
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  if (series.length === 0) return <EmptyState msg={emptyMsg} />;

  const allValues = [...totalMonthly, ...series.flatMap((s) => s.monthData)];
  const maxVal = Math.max(...allValues, 1);

  const totalPts = monthlyToPoints(totalMonthly, maxVal);
  const totalLine = buildPath(totalPts);
  const totalArea = buildArea(totalLine, totalPts);

  return (
    <View style={{ width: SVG_W, height: SVG_H }}>
      <Svg width={SVG_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={PAINT.inkMute} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={PAINT.inkMute} stopOpacity={0.02} />
          </LinearGradient>
          {series.map((s, si) => (
            <LinearGradient key={si} id={`og${si}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
            </LinearGradient>
          ))}
        </Defs>

        <GridAndAxes maxVal={maxVal} labels={MONTH_SHORT} highlightIndex={selected} />

        {totalArea ? <Path d={totalArea} fill="url(#tg)" /> : null}
        {totalLine ? (
          <Path
            d={totalLine}
            stroke={PAINT.inkMute}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            fill="none"
          />
        ) : null}

        {[...series].reverse().map((s, ri) => {
          const si = series.length - 1 - ri;
          const pts = monthlyToPoints(s.monthData, maxVal);
          const line = buildPath(pts);
          const area = buildArea(line, pts);
          return (
            <React.Fragment key={si}>
              {area ? <Path d={area} fill={`url(#og${si})`} /> : null}
              {line ? (
                <Path
                  d={line}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                />
              ) : null}
              {pts.map((pt, i) => (
                <Circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={selected === i ? 4.5 : 2.5}
                  fill={selected === i ? PAINT.ink : s.color}
                  stroke={selected === i ? s.color : "none"}
                  strokeWidth={selected === i ? 1.5 : 0}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
      <TouchOverlay count={12} selected={selected} onSelect={onSelect} />
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: PAINT.ink + "44",
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
    paddingVertical: 28,
    gap: 8,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkMute,
  },
  touchOverlay: {
    position: "absolute",
    top: 0,
    flexDirection: "row",
  },
  detailCard: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PAINT.cream,
    borderWidth: 1,
    borderColor: PAINT.ink + "1f",
    gap: 6,
  },
  detailTitle: {
    fontFamily: HAND_FONT,
    fontSize: 17,
    color: PAINT.ink,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  detailLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    flex: 1,
  },
  detailValue: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.ink,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: "45%",
  },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: PAINT.ink + "22",
  },
  legendLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
  },
});
