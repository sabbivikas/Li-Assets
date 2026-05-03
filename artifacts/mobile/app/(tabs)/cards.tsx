import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenPadding } from "@/theme";
import Svg, { Circle, Path } from "react-native-svg";

import { LifeCardView } from "@/components/LifeCardView";
import {
  Bee,
  CrayonUnderline,
  Frog,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PaperBackground,
  PAINT,
  WobbleButton,
  wobble,
  wobbleRect,
} from "@/components/paint";
import {
  enrichCard,
  loadCards,
  type CardBadge,
  type LifeCard,
} from "@/services/lifeCards";

type FilterKey =
  | "all"
  | "Birds"
  | "Insects"
  | "Plants"
  | "Mammals"
  | "Amphibians"
  | "Fungi"
  | "missing"
  | "keystone"
  | "rare";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Birds", label: "Birds" },
  { key: "Insects", label: "Insects" },
  { key: "Plants", label: "Plants" },
  { key: "Mammals", label: "Mammals" },
  { key: "Amphibians", label: "Amphibians" },
  { key: "Fungi", label: "Fungi" },
  { key: "missing", label: "Missing" },
  { key: "keystone", label: "Keystone" },
  { key: "rare", label: "Rare" },
];

const WEEK_MS = 7 * 86_400_000;

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cards, setCards] = useState<LifeCard[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    const stored = await loadCards();
    setCards(stored.map(enrichCard));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = useMemo(() => {
    let list = cards;
    if (filter !== "all") {
      const groupSet: FilterKey[] = [
        "Birds",
        "Insects",
        "Plants",
        "Mammals",
        "Amphibians",
        "Fungi",
      ];
      if (groupSet.includes(filter)) {
        list = list.filter((c) => c.group === filter);
      } else {
        list = list.filter((c) =>
          (c.badges as CardBadge[]).includes(filter as CardBadge)
        );
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.commonName || "").toLowerCase().includes(q) ||
          c.taxonName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cards, filter, search]);

  const sections = useMemo(() => {
    const now = Date.now();
    const isRecent = (iso?: string) =>
      iso ? now - new Date(iso).getTime() < WEEK_MS : false;
    const collection = filtered;
    const newNearYou = filtered.filter(
      (c) => c.signalFlags.isNewActivity && isRecent(c.lastSeenDate)
    );
    const missing = filtered.filter((c) => c.badges.includes("missing"));
    const keystone = filtered.filter((c) => c.badges.includes("keystone"));
    return { collection, newNearYou, missing, keystone };
  }, [filtered]);

  const dailyHook = useMemo(() => {
    const now = Date.now();
    const active = cards.filter(
      (c) =>
        c.lastSeenDate && now - new Date(c.lastSeenDate).getTime() < WEEK_MS
    ).length;
    const missing = cards.filter((c) => c.badges.includes("missing")).length;
    const newish = cards.filter(
      (c) => now - new Date(c.unlockedAt).getTime() < WEEK_MS
    ).length;
    return { active, missing, newish };
  }, [cards]);

  const { top: screenTop, bottom: screenBottom } = useScreenPadding({ hasTabBar: true });

  function openCard(c: LifeCard) {
    Haptics.selectionAsync();
    router.push({
      pathname: "/cards/[id]",
      params: { id: String(c.taxonId) },
    } as never);
  }

  return (
    <View style={styles.container}>
      <PaperBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: screenTop,
            paddingBottom: screenBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — kicker + title + count */}
        <Text style={styles.kicker}>~ Local Field Collection ~</Text>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Life Cards</Text>
            <CrayonUnderline width={140} color={PAINT.sun} seed={2} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.countBig}>{cards.length}</Text>
            <Text style={styles.countSub}>collected nearby</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={PAINT.inkMute} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="search by common or scientific name…"
            placeholderTextColor={PAINT.inkMute}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Feather name="x" size={16} color={PAINT.inkMute} />
            </Pressable>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f, i) => {
            const active = filter === f.key;
            const w = f.label.length * 8 + 28;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(f.key);
                }}
                style={{ height: 30, marginRight: 6 }}
              >
                <Svg width={w} height={30}>
                  <Path
                    d={wobbleRect(2, 2, w - 4, 26, 1, i + 50)}
                    fill={active ? PAINT.ink : "white"}
                    stroke={PAINT.ink}
                    strokeWidth={1.8}
                  />
                </Svg>
                <View style={styles.chipLabelWrap}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: active ? PAINT.paper : PAINT.ink },
                    ]}
                  >
                    {f.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Today near you */}
        {cards.length > 0 && <DailyHook hook={dailyHook} />}

        {cards.length === 0 ? (
          <EmptyState
            onExplore={() => router.push("/(tabs)/species" as never)}
          />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyFiltered}>
            <Mushroom size={36} />
            <Text style={styles.emptyText}>
              No cards match this filter yet.
            </Text>
          </View>
        ) : (
          <>
            {/* Local Collection */}
            <SectionHeader
              title="Your Local Collection"
              sub="cards earned near you"
              color={PAINT.grass}
            />
            <View style={styles.grid}>
              {sections.collection.map((c, i) => (
                <CardCell key={c.taxonId} idx={i}>
                  <LifeCardView
                    card={c}
                    seedOffset={i * 5 + 41}
                    onPress={() => openCard(c)}
                  />
                </CardCell>
              ))}
            </View>

            {/* New Near You — locked teasers with NEW stamp */}
            {sections.newNearYou.length > 0 && (
              <>
                <SectionHeader
                  title="New Near You"
                  sub="recent activity — tap to unlock"
                  color={PAINT.orange}
                  pulse
                />
                <View style={styles.grid}>
                  {sections.newNearYou.slice(0, 4).map((c, i) => (
                    <CardCell key={`n-${c.taxonId}`} idx={i}>
                      <View style={{ position: "relative" }}>
                        <LifeCardView
                          card={c}
                          seedOffset={i * 5 + 71}
                          locked
                          onPress={() => openCard(c)}
                        />
                        <NewStamp />
                      </View>
                    </CardCell>
                  ))}
                </View>
              </>
            )}

            {/* Missing */}
            {sections.missing.length > 0 && (
              <>
                <SectionHeader
                  title="Missing Cards"
                  sub="historically here, not seen recently"
                  color={PAINT.red}
                />
                <View style={styles.grid}>
                  {sections.missing.map((c, i) => (
                    <CardCell key={`m-${c.taxonId}`} idx={i}>
                      <LifeCardView
                        card={c}
                        seedOffset={i * 5 + 131}
                        onPress={() => openCard(c)}
                      />
                    </CardCell>
                  ))}
                </View>
              </>
            )}

            {/* Keystone */}
            {sections.keystone.length > 0 && (
              <>
                <SectionHeader
                  title="Keystone Species"
                  sub="critical to your local web"
                  color={PAINT.sun}
                />
                <View style={styles.grid}>
                  {sections.keystone.map((c, i) => (
                    <CardCell key={`k-${c.taxonId}`} idx={i}>
                      <LifeCardView
                        card={c}
                        seedOffset={i * 5 + 91}
                        onPress={() => openCard(c)}
                      />
                    </CardCell>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Caveat */}
        <View style={styles.caveat}>
          <Text style={styles.caveatText}>
            Based on community-science observations.{"\n"}
            Missing observations don&apos;t always mean absent.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- daily hook card ---------- */
function DailyHook({
  hook,
}: {
  hook: { active: number; missing: number; newish: number };
}) {
  const W = 358;
  return (
    <View style={{ marginTop: 14, height: 100 }}>
      <Svg width="100%" height={100} viewBox={`0 0 ${W} 100`} preserveAspectRatio="none">
        <Path
          d={wobbleRect(3, 3, W - 6, 94, 2, 71)}
          fill="#fff8d6"
          stroke={PAINT.ink}
          strokeWidth={2.5}
        />
        <Path
          d={wobbleRect(7, 7, W - 14, 86, 1.5, 72)}
          fill="none"
          stroke={PAINT.sun}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </Svg>
      <View style={styles.hookContent}>
        <View style={styles.hookHeader}>
          <Text style={styles.hookTitle}>Today near you</Text>
          <Text style={styles.hookDate}>
            {new Date()
              .toLocaleDateString(undefined, { weekday: "short" })
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.hookStats}>
          <HookStat
            icon={<Bee size={26} />}
            big={`${hook.active} active`}
            small="recent sightings"
            color={PAINT.grass}
          />
          <HookStat
            icon={<Frog size={26} />}
            big={`${hook.missing} missing`}
            small="not seen lately"
            color={PAINT.red}
          />
          <HookStat
            icon={<Mushroom size={26} />}
            big={`${hook.newish} new`}
            small="just unlocked"
            color={PAINT.purple}
          />
        </View>
      </View>
    </View>
  );
}

function HookStat({
  icon,
  big,
  small,
  color,
}: {
  icon: React.ReactNode;
  big: string;
  small: string;
  color: string;
}) {
  return (
    <View style={styles.hookStat}>
      <View>{icon}</View>
      <View>
        <Text style={styles.hookStatBig}>{big}</Text>
        <Text style={[styles.hookStatSmall, { color }]}>{small}</Text>
      </View>
    </View>
  );
}

/* ---------- section header ---------- */
function SectionHeader({
  title,
  sub,
  color,
  pulse = false,
}: {
  title: string;
  sub: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Svg width={60} height={6} style={{ marginTop: 1, marginLeft: -1 }}>
          <Path
            d={wobble(0, 3, 60, 3, 1.2, 8, title.length)}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.7}
          />
        </Svg>
        <Text style={styles.sectionSub}>{sub}</Text>
      </View>
      {pulse && (
        <Svg width={14} height={14} style={{ marginLeft: 8 }}>
          <Circle cx={7} cy={7} r={5} fill={color} opacity={0.5} />
          <Circle cx={7} cy={7} r={3} fill={color} />
        </Svg>
      )}
    </View>
  );
}

/* ---------- NEW corner stamp ---------- */
function NewStamp() {
  const w = 56;
  const h = 32;
  return (
    <View
      style={{
        position: "absolute",
        top: -4,
        left: -10,
        width: w,
        height: h,
        transform: [{ rotate: "-12deg" }],
      }}
    >
      <Svg width={w} height={h}>
        <Path
          d={wobbleRect(2, 2, w - 4, h - 4, 1, 88)}
          fill={PAINT.orange}
          stroke={PAINT.ink}
          strokeWidth={2}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.newStampInner]}>
        <Text style={styles.newStampText}>NEW</Text>
      </View>
    </View>
  );
}

function CardCell({
  children,
  idx,
}: {
  children: React.ReactNode;
  idx: number;
}) {
  return (
    <View
      style={{
        width: "50%",
        alignItems: "center",
        marginTop: idx < 2 ? 0 : 18,
      }}
    >
      {children}
    </View>
  );
}

function EmptyState({ onExplore }: { onExplore: () => void }) {
  return (
    <View style={styles.empty}>
      <Bee size={64} />
      <Text style={styles.emptyTitle}>No cards yet</Text>
      <Text style={styles.emptyBody}>
        Tap any species in the Species tab to discover and unlock its Life
        Card. As you learn its role and signal, the card grows with you.
      </Text>
      <View style={{ marginTop: 12 }}>
        <WobbleButton
          label="Explore species near me"
          onPress={onExplore}
          color={PAINT.grass}
          width={260}
          height={50}
          seed={5}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAINT.paper },
  scroll: { paddingHorizontal: 20 },

  kicker: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#888",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontFamily: HAND_FONT,
    fontSize: 32,
    color: PAINT.ink,
    transform: [{ rotate: "-1deg" }],
    lineHeight: 36,
  },
  countBig: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.grass,
    lineHeight: 28,
  },
  countSub: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#7a6a4a",
  },

  searchWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
  },
  searchInput: {
    flex: 1,
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
    padding: 0,
  },

  chipsRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  chipLabelWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    fontWeight: "700",
  },

  hookContent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: 14,
  },
  hookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  hookTitle: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
  },
  hookDate: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
    color: "#7a6a4a",
    letterSpacing: 1,
  },
  hookStats: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  hookStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hookStatBig: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.ink,
    lineHeight: 16,
  },
  hookStatSmall: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.ink,
    transform: [{ rotate: "-0.5deg" }],
    lineHeight: 24,
  },
  sectionSub: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: "#7a6a4a",
    marginTop: 2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  newStampInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  newStampText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    fontWeight: "700",
    color: PAINT.paper,
    letterSpacing: 1,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: HAND_FONT,
    fontSize: 26,
    color: PAINT.ink,
  },
  emptyBody: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyFiltered: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
  },

  caveat: {
    marginTop: 32,
    paddingVertical: 20,
  },
  caveatText: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
});
