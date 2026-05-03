import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
import { useScreenPadding } from "@/theme";

import { BadgeMedal } from "@/components/BadgeMedal";
import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  WobbleBox,
} from "@/components/paint";
import {
  CATEGORY_META,
  RARITY_META,
  computeBadgeStates,
  type BadgeCategory,
  type BadgeRarity,
  type BadgeState,
} from "@/services/badges";
import { loadCards, type StoredCard } from "@/services/lifeCards";
import { loadReports, type SavedReport } from "@/services/savedReports";

type CategoryTab = "all" | BadgeCategory;
type RarityFilter = "all" | BadgeRarity;
type LockFilter = "all" | "unlocked" | "locked";

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const { top: screenTop, bottom: screenBottom } = useScreenPadding({ hasTabBar: false });
  const router = useRouter();
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [tab, setTab] = useState<CategoryTab>("all");
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [lock, setLock] = useState<LockFilter>("all");

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

  const states = useMemo(
    () => computeBadgeStates({ cards, reports }),
    [cards, reports]
  );

  const totalUnlocked = states.filter((s) => s.unlocked).length;

  const filtered = useMemo(() => {
    return states.filter((s) => {
      if (tab !== "all" && s.def.category !== tab) return false;
      if (rarity !== "all" && s.def.rarity !== rarity) return false;
      if (lock === "unlocked" && !s.unlocked) return false;
      if (lock === "locked" && s.unlocked) return false;
      return true;
    });
  }, [states, tab, rarity, lock]);

  const tap = (fn: () => void) => () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    fn();
  };

  const tabOrder: CategoryTab[] = [
    "all",
    "explorer",
    "lifeweb",
    "signal",
    "civic",
    "collection",
  ];
  const rarityOrder: RarityFilter[] = [
    "all",
    "common",
    "uncommon",
    "rare",
    "keystone",
  ];

  return (
    <View style={styles.root}>
      <PaperBackground />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: screenTop, paddingBottom: screenBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={26} color={PAINT.ink} />
          </Pressable>
          <View style={styles.countPill}>
            <Feather name="award" size={13} color={PAINT.grassDeep} />
            <Text style={styles.countPillText}>
              {totalUnlocked} / {states.length}
            </Text>
          </View>
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.h1}>Badge case</Text>
          <CrayonUnderline width={170} color={PAINT.sun} seed={9} />
          <Text style={styles.subtitle}>
            Earn badges by discovering, understanding, and protecting your local
            life web.
          </Text>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {tabOrder.map((t) => {
            const active = tab === t;
            const meta = t === "all" ? null : CATEGORY_META[t];
            return (
              <Pressable
                key={t}
                onPress={tap(() => setTab(t))}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active
                      ? meta?.color ?? PAINT.ink
                      : "white",
                    borderColor: active ? PAINT.ink : PAINT.inkMute,
                  },
                ]}
              >
                {meta ? (
                  <Feather
                    name={meta.icon as keyof typeof Feather.glyphMap}
                    size={13}
                    color={active ? "white" : PAINT.inkSoft}
                  />
                ) : null}
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "white" : PAINT.inkSoft },
                  ]}
                >
                  {t === "all" ? "All" : meta!.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filters */}
        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Rarity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {rarityOrder.map((r) => {
              const active = rarity === r;
              const meta = r === "all" ? null : RARITY_META[r];
              return (
                <Pressable
                  key={r}
                  onPress={tap(() => setRarity(r))}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? PAINT.ink : PAINT.inkMute,
                      backgroundColor: active
                        ? meta?.ring ?? PAINT.paperDeep
                        : "white",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? PAINT.ink : PAINT.inkSoft },
                    ]}
                  >
                    {r === "all" ? "All" : meta!.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 10 }]}>Status</Text>
          <View style={styles.chipsRow}>
            {(["all", "unlocked", "locked"] as LockFilter[]).map((l) => {
              const active = lock === l;
              return (
                <Pressable
                  key={l}
                  onPress={tap(() => setLock(l))}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? PAINT.ink : PAINT.inkMute,
                      backgroundColor: active ? PAINT.cream : "white",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? PAINT.ink : PAINT.inkSoft },
                    ]}
                  >
                    {l === "all" ? "All" : l === "unlocked" ? "Unlocked" : "Locked"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {filtered.map((s) => (
            <BadgeGridItem
              key={s.def.id}
              state={s}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                router.push(`/badges/${s.def.id}`);
              }}
            />
          ))}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No badges match these filters.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function BadgeGridItem({
  state,
  onPress,
}: {
  state: BadgeState;
  onPress: () => void;
}) {
  const { def, progress, unlocked } = state;
  const rarity = RARITY_META[def.rarity];
  return (
    <Pressable onPress={onPress} style={styles.gridItem}>
      <WobbleBox
        width={150}
        height={210}
        fill="white"
        seed={(def.id.charCodeAt(0) + def.id.length) % 17}
        padding={10}
      >
        <View style={{ alignItems: "center", flex: 1 }}>
          <BadgeMedal state={state} size="md" seed={def.id.charCodeAt(1) % 11} />
          <Text
            numberOfLines={2}
            style={[
              styles.gridName,
              { color: unlocked ? PAINT.ink : PAINT.inkMute },
            ]}
          >
            {def.name}
          </Text>
          <View
            style={[
              styles.rarityPill,
              { borderColor: rarity.color, backgroundColor: unlocked ? rarity.ring : "white" },
            ]}
          >
            <Text style={[styles.rarityText, { color: rarity.color }]}>
              {rarity.label}
            </Text>
          </View>
          <Text style={styles.progressText}>
            {unlocked ? "Earned" : `${progress} / ${def.target}`}
          </Text>
        </View>
      </WobbleBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20, alignItems: "stretch" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PAINT.grassDeep,
  },
  countPillText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.grassDeep,
  },
  titleWrap: { marginBottom: 14 },
  h1: { fontFamily: HAND_FONT, fontSize: 38, color: PAINT.ink, lineHeight: 44 },
  subtitle: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    marginTop: 8,
    lineHeight: 19,
  },
  tabsRow: { gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  tabText: { fontFamily: LABEL_FONT, fontSize: 13 },
  filterBlock: { marginTop: 12 },
  filterLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  chipsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  chipText: { fontFamily: LABEL_FONT, fontSize: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginTop: 18,
  },
  gridItem: { width: "48%", alignItems: "center" },
  gridName: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.2,
    marginTop: 4,
  },
  rarityText: { fontFamily: LABEL_FONT, fontSize: 11 },
  progressText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.inkSoft,
    marginTop: 4,
  },
  empty: { width: "100%", padding: 30, alignItems: "center" },
  emptyText: { fontFamily: LABEL_FONT, fontSize: 14, color: PAINT.inkMute },
});
