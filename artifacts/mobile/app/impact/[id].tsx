import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { fetchSpeciesById } from "@/services/iNaturalist";
import { buildImpactChain, type ImpactNode } from "@/services/ecologyModel";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ImpactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const taxonId = parseInt(id || "0");

  const [activeNodeIndex, setActiveNodeIndex] = useState(-1);
  const [animationStarted, setAnimationStarted] = useState(false);

  const nodeAnims = useRef<Animated.Value[]>([]).current;
  const arrowAnims = useRef<Animated.Value[]>([]).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  const { data: taxon, isLoading } = useQuery({
    queryKey: ["taxon", taxonId],
    queryFn: () => fetchSpeciesById(taxonId),
    enabled: !!taxonId,
  });

  const chain = taxon
    ? buildImpactChain(taxon.name, taxon.iconic_taxon_name, taxon.preferred_common_name)
    : null;

  // Initialize animations
  useEffect(() => {
    if (!chain) return;
    chain.nodes.forEach((_, i) => {
      if (!nodeAnims[i]) nodeAnims[i] = new Animated.Value(0);
      if (i > 0 && !arrowAnims[i - 1]) arrowAnims[i - 1] = new Animated.Value(0);
    });
  }, [chain]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  function startAnimation() {
    if (!chain || animationStarted) return;
    setAnimationStarted(true);

    const sequence: Animated.CompositeAnimation[] = [];
    chain.nodes.forEach((_, i) => {
      if (!nodeAnims[i]) nodeAnims[i] = new Animated.Value(0);
      sequence.push(
        Animated.timing(nodeAnims[i], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      );
      if (i < chain.nodes.length - 1) {
        if (!arrowAnims[i]) arrowAnims[i] = new Animated.Value(0);
        sequence.push(
          Animated.timing(arrowAnims[i], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        );
      }
    });

    Animated.sequence(sequence).start();

    // Update active node index
    chain.nodes.forEach((_, i) => {
      setTimeout(() => setActiveNodeIndex(i), (i + 1) * 900);
    });
  }

  function resetAnimation() {
    setAnimationStarted(false);
    setActiveNodeIndex(-1);
    chain?.nodes.forEach((_, i) => {
      nodeAnims[i]?.setValue(0);
      if (i > 0) arrowAnims[i - 1]?.setValue(0);
    });
  }

  const topInsets = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInsets = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const speciesName = taxon?.preferred_common_name || taxon?.name || "This Species";

  return (
    <View style={[styles.container, { backgroundColor: "#040810" }]}>
      {/* Deep space background glow */}
      <Animated.View
        style={[styles.bgGlow, { opacity: glowAnim }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.bgGlow2, { opacity: glowAnim }]}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInsets + 16, paddingBottom: bottomInsets + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: "#FFFFFF10" }]}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>Extinction Impact</Text>
            <Text style={styles.headerTitle}>{speciesName}</Text>
          </View>
        </Animated.View>

        {isLoading || !chain ? (
          <View style={styles.loadingState}>
            <Animated.View
              style={[styles.loadingOrb, { opacity: glowAnim, backgroundColor: "#14532D" }]}
            />
            <Text style={[styles.loadingText, { color: "#64748B" }]}>
              Modeling ecological impact…
            </Text>
          </View>
        ) : (
          <>
            {/* Intro */}
            <Animated.View style={[styles.introCard, { opacity: headerAnim }]}>
              <Text style={styles.introQuestion}>What happens if this disappears?</Text>
              <Text style={[styles.introDesc, { color: "#94A3B8" }]}>
                {chain.summary}
              </Text>
            </Animated.View>

            {/* Chain visualization */}
            <View style={styles.chainWrap}>
              {chain.nodes.map((node, i) => {
                const nodeAnim = nodeAnims[i] || new Animated.Value(animationStarted ? 0 : 0);
                const isActive = i <= activeNodeIndex;
                const isFirst = i === 0;

                return (
                  <View key={node.id} style={styles.nodeSection}>
                    {/* Arrow connector */}
                    {i > 0 && (
                      <Animated.View
                        style={[
                          styles.arrowWrap,
                          { opacity: arrowAnims[i - 1] || new Animated.Value(0) },
                        ]}
                      >
                        <View style={[styles.arrowLine, { backgroundColor: node.color + "60" }]} />
                        <View style={[styles.arrowLabel, { backgroundColor: "#0F1824" }]}>
                          <Text style={[styles.arrowLabelText, { color: node.color + "AA" }]}>
                            {chain.edges[i - 1]?.label || "causes"}
                          </Text>
                        </View>
                        <View style={[styles.arrowHead, { borderTopColor: node.color + "60" }]} />
                      </Animated.View>
                    )}

                    {/* Node card */}
                    <Animated.View
                      style={[
                        styles.nodeCard,
                        {
                          backgroundColor: isFirst ? node.color + "20" : "#0F1824",
                          borderColor: isFirst ? node.color : node.color + "40",
                          borderWidth: isFirst ? 1.5 : 1,
                          opacity: nodeAnim,
                          transform: [
                            {
                              translateY: nodeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.nodeLeft}>
                        <View
                          style={[
                            styles.nodeIcon,
                            { backgroundColor: node.color + "20" },
                          ]}
                        >
                          <Feather name={node.icon as any} size={20} color={node.color} />
                        </View>
                        {/* Severity indicator */}
                        <View
                          style={[
                            styles.severityDot,
                            {
                              backgroundColor:
                                node.severity === "high"
                                  ? "#EF4444"
                                  : node.severity === "medium"
                                  ? "#FBBF24"
                                  : "#4ADE80",
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.nodeContent}>
                        <View style={styles.nodeHeader}>
                          <Text style={[styles.nodeLabel, { color: node.color }]}>
                            {node.label}
                          </Text>
                          {isFirst && (
                            <View style={[styles.affectedBadge, { backgroundColor: "#EF444420" }]}>
                              <Text style={[styles.affectedText, { color: "#EF4444" }]}>
                                At Risk
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.nodeDesc, { color: "#94A3B8" }]}>
                          {node.description}
                        </Text>
                      </View>
                    </Animated.View>
                  </View>
                );
              })}
            </View>

            {/* Action buttons */}
            {!animationStarted ? (
              <Pressable
                onPress={startAnimation}
                style={({ pressed }) => [
                  styles.simulateBtn,
                  {
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Feather name="play" size={18} color="#080C14" />
                <Text style={styles.simulateBtnText}>Simulate Cascade</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={resetAnimation}
                style={[styles.resetBtn, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}
              >
                <Feather name="refresh-cw" size={16} color="#64748B" />
                <Text style={[styles.resetBtnText, { color: "#64748B" }]}>Reset</Text>
              </Pressable>
            )}

            {/* Severity legend */}
            <View style={[styles.legend, { backgroundColor: "#0F1824", borderColor: "#1E293B" }]}>
              <Text style={[styles.legendTitle, { color: "#475569" }]}>Impact Level</Text>
              <View style={styles.legendItems}>
                {[
                  { color: "#EF4444", label: "High impact" },
                  { color: "#FBBF24", label: "Medium impact" },
                  { color: "#4ADE80", label: "Lower impact" },
                ].map((l) => (
                  <View key={l.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                    <Text style={[styles.legendLabel, { color: "#64748B" }]}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Credibility note */}
            <View style={[styles.credNote, { backgroundColor: "#22D3EE08", borderColor: "#22D3EE20" }]}>
              <Feather name="info" size={13} color="#22D3EE60" />
              <Text style={[styles.credText, { color: "#475569" }]}>
                {chain.credibilityNote}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: "absolute",
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: SCREEN_WIDTH * 0.75,
    top: -SCREEN_WIDTH * 0.6,
    left: -SCREEN_WIDTH * 0.25,
    backgroundColor: "#0A2010",
  },
  bgGlow2: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: SCREEN_WIDTH * 0.5,
    bottom: 0,
    right: -SCREEN_WIDTH * 0.3,
    backgroundColor: "#0A1525",
  },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 20,
  },
  loadingOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  introCard: {
    marginBottom: 24,
    gap: 8,
  },
  introQuestion: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  introDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  chainWrap: {
    gap: 0,
    marginBottom: 24,
  },
  nodeSection: {
    alignItems: "center",
  },
  arrowWrap: {
    alignItems: "center",
    height: 60,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  arrowLine: {
    width: 2,
    flex: 1,
  },
  arrowLabel: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  arrowLabelText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  nodeCard: {
    flexDirection: "row",
    width: "100%",
    padding: 16,
    borderRadius: 18,
    gap: 14,
    alignItems: "flex-start",
  },
  nodeLeft: {
    alignItems: "center",
    gap: 6,
  },
  nodeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nodeContent: { flex: 1, gap: 5 },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  nodeLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  affectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  affectedText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nodeDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: "#4ADE80",
    marginBottom: 16,
  },
  simulateBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#080C14",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  legend: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  legendTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItems: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  credNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  credText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
