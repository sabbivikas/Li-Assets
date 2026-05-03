import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Bee,
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  wobble,
  WobbleBox,
  WobbleButton,
} from "@/components/paint";
import { buildImpactChain } from "@/services/ecologyModel";
import { fetchSpeciesById } from "@/services/iNaturalist";

const SEVERITY_COLOR: Record<string, string> = {
  high: PAINT.red,
  medium: PAINT.orange,
  low: PAINT.grassDeep,
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "high impact",
  medium: "medium impact",
  low: "lower impact",
};

export default function ImpactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonId = parseInt(id || "0");

  const [activeNodeIndex, setActiveNodeIndex] = useState(-1);
  const [animationStarted, setAnimationStarted] = useState(false);

  const nodeAnims = useRef<Animated.Value[]>([]).current;

  const { data: taxon, isLoading } = useQuery({
    queryKey: ["taxon", taxonId],
    queryFn: () => fetchSpeciesById(taxonId),
    enabled: !!taxonId,
  });

  const chain = taxon
    ? buildImpactChain(taxon.name, taxon.iconic_taxon_name, taxon.preferred_common_name)
    : null;

  useEffect(() => {
    if (!chain) return;
    chain.nodes.forEach((_, i) => {
      if (!nodeAnims[i]) nodeAnims[i] = new Animated.Value(0);
    });
  }, [chain]);

  function startAnimation() {
    if (!chain || animationStarted) return;
    setAnimationStarted(true);
    const seq: Animated.CompositeAnimation[] = [];
    chain.nodes.forEach((_, i) => {
      if (!nodeAnims[i]) nodeAnims[i] = new Animated.Value(0);
      seq.push(
        Animated.timing(nodeAnims[i], {
          toValue: 1,
          duration: 450,
          delay: 120,
          useNativeDriver: true,
        })
      );
    });
    Animated.sequence(seq).start();
    chain.nodes.forEach((_, i) => {
      setTimeout(
        () => setActiveNodeIndex(i),
        (i + 1) * 600
      );
    });
  }

  function resetAnimation() {
    setAnimationStarted(false);
    setActiveNodeIndex(-1);
    chain?.nodes.forEach((_, i) => {
      nodeAnims[i]?.setValue(0);
    });
  }

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const speciesName =
    taxon?.preferred_common_name || taxon?.name || "This Species";

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
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <WobbleBox width={92} height={40} fill="white" seed={1} padding={0}>
              <View style={styles.backInner}>
                <Feather name="arrow-left" size={16} color={PAINT.ink} />
                <Text style={styles.backText}>back</Text>
              </View>
            </WobbleBox>
          </Pressable>
        </View>

        {/* Title */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.kicker}>~ Cascade Story ~</Text>
          <Text style={styles.title}>What if {speciesName} disappears?</Text>
          <CrayonUnderline width={280} color={PAINT.red} seed={3} />
        </View>

        {isLoading || !chain ? (
          <View style={styles.loadingWrap}>
            <Bee size={64} />
            <Text style={styles.loadingText}>
              tracing the threads of the web…
            </Text>
          </View>
        ) : (
          <>
            {/* Intro */}
            <View style={styles.intro}>
              <Text style={styles.introText}>{chain.summary}</Text>
            </View>

            {/* Chain nodes */}
            <View style={styles.chainWrap}>
              {chain.nodes.map((node, i) => {
                const nodeAnim =
                  nodeAnims[i] || new Animated.Value(animationStarted ? 0 : 1);
                const sev = SEVERITY_COLOR[node.severity] ?? PAINT.inkSoft;
                const fill = i === 0 ? PAINT.cream : "white";
                const showActive = animationStarted ? i <= activeNodeIndex : true;
                const opacityVal = animationStarted ? nodeAnim : 1;

                return (
                  <View key={node.id}>
                    {/* Connector */}
                    {i > 0 && (
                      <View style={styles.connector}>
                        <Svg width={60} height={50} viewBox="0 0 60 50">
                          <Path
                            d={wobble(30, 2, 30, 38, 1.2, 5, i * 7 + 11)}
                            stroke={PAINT.ink}
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <Path
                            d="M 24 32 L 30 42 L 36 32"
                            stroke={PAINT.ink}
                            strokeWidth={2.2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                        <View style={styles.connectorLabel}>
                          <Text style={styles.connectorLabelText}>
                            {chain.edges[i - 1]?.label || "leads to"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Node card */}
                    <Animated.View
                      style={{
                        opacity: opacityVal,
                        transform: [
                          {
                            translateY: animationStarted
                              ? nodeAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [12, 0],
                                })
                              : 0,
                          },
                        ],
                      }}
                    >
                      <WobbleBox
                        width={358}
                        height={104}
                        fill={fill}
                        stroke={i === 0 ? PAINT.red : PAINT.ink}
                        strokeWidth={i === 0 ? 3 : 2.5}
                        seed={i * 7 + 21}
                        padding={12}
                      >
                        <View style={styles.nodeRow}>
                          <View
                            style={[
                              styles.nodeIcon,
                              {
                                backgroundColor: sev + "33",
                                borderColor: sev,
                              },
                            ]}
                          >
                            <Feather
                              name={node.icon as any}
                              size={22}
                              color={PAINT.ink}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={styles.nodeHeader}>
                              <Text style={styles.nodeLabel} numberOfLines={1}>
                                {node.label}
                              </Text>
                              {i === 0 && (
                                <View
                                  style={[
                                    styles.atRiskBadge,
                                    {
                                      backgroundColor: PAINT.red + "33",
                                      borderColor: PAINT.red,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.atRiskText,
                                      { color: PAINT.red },
                                    ]}
                                  >
                                    AT RISK
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={styles.nodeDesc}
                              numberOfLines={3}
                            >
                              {node.description}
                            </Text>
                            {showActive && (
                              <View style={styles.severityRow}>
                                <View
                                  style={[
                                    styles.severityDot,
                                    { backgroundColor: sev },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.severityText,
                                    { color: sev },
                                  ]}
                                >
                                  {SEVERITY_LABEL[node.severity] ?? "impact"}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </WobbleBox>
                    </Animated.View>
                  </View>
                );
              })}
            </View>

            {/* Action button */}
            <View style={{ alignItems: "center", marginTop: 18 }}>
              {!animationStarted ? (
                <WobbleButton
                  label="Trace the Cascade"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    startAnimation();
                  }}
                  color={PAINT.grass}
                  width={280}
                  height={58}
                  seed={51}
                  leading={<Feather name="play" size={18} color={PAINT.ink} />}
                />
              ) : (
                <WobbleButton
                  label="Reset"
                  onPress={resetAnimation}
                  color={PAINT.cream}
                  width={180}
                  height={48}
                  seed={61}
                  leading={
                    <Feather name="refresh-cw" size={14} color={PAINT.ink} />
                  }
                />
              )}
            </View>

            {/* Severity legend */}
            <View style={{ alignItems: "center", marginTop: 18 }}>
              <WobbleBox
                width={358}
                height={70}
                fill="white"
                seed={71}
                padding={12}
              >
                <View style={{ gap: 6 }}>
                  <Text style={styles.legendTitle}>impact level</Text>
                  <View style={styles.legendRow}>
                    {(["high", "medium", "low"] as const).map((sev) => (
                      <View key={sev} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: SEVERITY_COLOR[sev] },
                          ]}
                        />
                        <Text style={styles.legendLabel}>
                          {SEVERITY_LABEL[sev]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </WobbleBox>
            </View>

            {/* Credibility */}
            <View style={styles.credNote}>
              <Feather name="info" size={14} color={PAINT.inkSoft} />
              <Text style={styles.credText}>{chain.credibilityNote}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row" },
  backInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  backText: { fontFamily: HAND_FONT, fontSize: 18, color: PAINT.ink },
  kicker: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 30,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 34,
    marginTop: 2,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 12,
  },
  loadingText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
  },
  intro: {
    marginTop: 16,
    padding: 14,
    backgroundColor: PAINT.cream,
    borderWidth: 2,
    borderColor: PAINT.ink,
    borderStyle: "dashed",
  },
  introText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
    lineHeight: 20,
  },
  chainWrap: {
    marginTop: 18,
    alignItems: "center",
  },
  connector: {
    alignItems: "center",
    height: 50,
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  connectorLabel: {
    backgroundColor: PAINT.sun + "55",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    transform: [{ rotate: "-3deg" }],
  },
  connectorLabelText: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.ink,
  },
  nodeRow: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  nodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  nodeLabel: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    flex: 1,
    lineHeight: 24,
  },
  atRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  atRiskText: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nodeDesc: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    lineHeight: 18,
  },
  severityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  legendTitle: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
  },
  credNote: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: PAINT.inkMute,
    borderStyle: "dashed",
    backgroundColor: PAINT.paperDeep + "55",
  },
  credText: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    lineHeight: 17,
  },
});
