import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeMedal } from "@/components/BadgeMedal";
import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  WobbleBox,
  WobbleButton,
} from "@/components/paint";
import {
  CATEGORY_META,
  RARITY_META,
  getBadgeState,
} from "@/services/badges";
import { loadCards, type StoredCard } from "@/services/lifeCards";
import { loadReports, type SavedReport } from "@/services/savedReports";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function BadgeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [c, r] = await Promise.all([loadCards(), loadReports()]);
        if (alive) {
          setCards(c);
          setReports(r);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const state = useMemo(
    () => (id ? getBadgeState(id, { cards, reports }) : undefined),
    [id, cards, reports]
  );

  if (!state) {
    return (
      <View style={[styles.root, { padding: 24 }]}>
        <PaperBackground />
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={26} color={PAINT.ink} />
        </Pressable>
        <Text style={[styles.h1, { marginTop: 30 }]}>Badge not found</Text>
      </View>
    );
  }

  const { def, progress, unlocked, earnedDate, relatedTaxonIds } = state;
  const cat = CATEGORY_META[def.category];
  const rarity = RARITY_META[def.rarity];
  const ratio = Math.min(1, progress / def.target);

  const ctaLabel =
    def.ctaKind === "report"
      ? "Generate report"
      : def.ctaKind === "species"
      ? "View related species"
      : "Explore more";

  const onCta = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    if (def.ctaKind === "report") router.push("/(tabs)/reports");
    else if (def.ctaKind === "species") router.push("/(tabs)/cards");
    else router.push("/(tabs)/cards");
  };

  const relatedCards = relatedTaxonIds
    .map((tid) => cards.find((c) => c.taxonId === tid))
    .filter((c): c is StoredCard => !!c);

  return (
    <View style={styles.root}>
      <PaperBackground />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={26} color={PAINT.ink} />
          </Pressable>
          <View
            style={[
              styles.catPill,
              { borderColor: cat.color, backgroundColor: "white" },
            ]}
          >
            <Feather
              name={cat.icon as keyof typeof Feather.glyphMap}
              size={12}
              color={cat.color}
            />
            <Text style={[styles.catPillText, { color: cat.color }]}>
              {cat.label}
            </Text>
          </View>
        </View>

        <View style={styles.medalCenter}>
          <BadgeMedal state={state} size="lg" seed={3} />
        </View>

        <Text style={styles.title}>{def.name}</Text>
        <View style={{ alignItems: "center" }}>
          <CrayonUnderline width={150} color={rarity.ring} seed={11} />
        </View>

        <View
          style={[
            styles.rarityPill,
            { borderColor: rarity.color, backgroundColor: rarity.ring },
          ]}
        >
          <Feather name="star" size={12} color={rarity.color} />
          <Text style={[styles.rarityText, { color: rarity.color }]}>
            {rarity.label}
          </Text>
        </View>

        {/* Progress */}
        <WobbleBox
          width={340}
          height={unlocked ? 110 : 130}
          fill={PAINT.cream}
          seed={5}
          padding={16}
          style={styles.card}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>How to earn</Text>
            <Text style={styles.cardBody}>{def.unlockCondition}</Text>
            {!unlocked ? (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${ratio * 100}%`,
                        backgroundColor: rarity.ring,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {progress} / {def.target}
                </Text>
              </View>
            ) : (
              <View style={styles.earnedRow}>
                <Feather name="check-circle" size={14} color={PAINT.grassDeep} />
                <Text style={styles.earnedText}>
                  Earned {formatDate(earnedDate)}
                </Text>
              </View>
            )}
          </View>
        </WobbleBox>

        <WobbleBox
          width={340}
          height={110}
          fill="white"
          seed={9}
          padding={16}
          style={styles.card}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Why it matters</Text>
            <Text style={styles.cardBody}>{def.meaning}</Text>
          </View>
        </WobbleBox>

        {/* Related species */}
        {relatedCards.length > 0 ? (
          <View style={{ width: 340 }}>
            <Text style={styles.sectionTitle}>Related species</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
            >
              {relatedCards.map((c) => (
                <Pressable
                  key={c.taxonId}
                  onPress={() => router.push(`/cards/${c.taxonId}`)}
                  style={styles.relatedCard}
                >
                  {c.photoUrl ? (
                    <Image
                      source={{ uri: c.photoUrl }}
                      style={styles.relatedPhoto}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[styles.relatedPhoto, { backgroundColor: PAINT.paperDeep }]}
                    />
                  )}
                  <Text style={styles.relatedName} numberOfLines={1}>
                    {c.commonName ?? c.taxonName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* CTA */}
        <View style={{ marginTop: 18, alignItems: "center" }}>
          <WobbleButton
            label={ctaLabel}
            onPress={onCta}
            color={unlocked ? PAINT.grass : rarity.ring}
            width={220}
            height={52}
            seed={13}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 16, alignItems: "center" },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.4,
  },
  catPillText: { fontFamily: LABEL_FONT, fontSize: 12 },
  medalCenter: { marginTop: 18, marginBottom: 14 },
  h1: { fontFamily: HAND_FONT, fontSize: 32, color: PAINT.ink },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 38,
    color: PAINT.ink,
    textAlign: "center",
    lineHeight: 42,
  },
  rarityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.4,
    marginTop: 12,
    marginBottom: 4,
  },
  rarityText: { fontFamily: LABEL_FONT, fontSize: 13 },
  card: { marginTop: 14 },
  cardLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: LABEL_FONT,
    fontSize: 15,
    color: PAINT.ink,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderWidth: 1.2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  progressText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    minWidth: 50,
    textAlign: "right",
  },
  earnedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  earnedText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.grassDeep,
  },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    marginTop: 18,
    marginBottom: 4,
  },
  relatedCard: { width: 88, alignItems: "center" },
  relatedPhoto: {
    width: 80,
    height: 80,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.paperDeep,
  },
  relatedName: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: PAINT.inkSoft,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 90,
  },
});
