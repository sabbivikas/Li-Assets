import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, G, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LifeCardView, PaperStamp } from "@/components/LifeCardView";
import {
  CrayonUnderline,
  HAND_FONT,
  LABEL_FONT,
  PaperBackground,
  PAINT,
  Sparkle,
  wobble,
  wobbleRect,
} from "@/components/paint";
import { useLocation } from "@/context/LocationContext";
import {
  fetchObservationHistogram,
  fetchSpeciesById,
  fetchSpeciesObservations,
} from "@/services/iNaturalist";
import {
  enrichCard,
  loadCards,
  type LifeCard,
} from "@/services/lifeCards";

const TABS = ["Story", "Activity", "Impact"] as const;
type TabKey = (typeof TABS)[number];

const ROLE_COLORS: Record<string, string> = {
  Pollinator: PAINT.sun,
  Decomposer: PAINT.purple,
  Predator: PAINT.red,
  "Seed disperser": PAINT.red,
  "Seed spreader": PAINT.red,
  Herbivore: PAINT.grassDeep,
  "Indicator species": PAINT.grass,
  "Habitat / food source": PAINT.purple,
  Generalist: PAINT.inkMute,
  "Part of local food web": PAINT.brown,
};

const MONTH_LETTERS = [
  "J","F","M","A","M","J","J","A","S","O","N","D",
];

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lat, lng, radius } = useLocation();
  const taxonId = parseInt(id || "0", 10);
  const [tab, setTab] = useState<TabKey>("Story");
  const [card, setCard] = useState<LifeCard | null>(null);

  const loadCardFromStore = useCallback(async () => {
    const stored = await loadCards();
    const match = stored.find((c) => c.taxonId === taxonId);
    setCard(match ? enrichCard(match) : null);
  }, [taxonId]);

  useFocusEffect(
    useCallback(() => {
      loadCardFromStore();
    }, [loadCardFromStore])
  );

  const { data: taxon } = useQuery({
    queryKey: ["taxon", taxonId],
    queryFn: () => fetchSpeciesById(taxonId),
    enabled: !!taxonId,
  });

  const hasLoc = lat != null && lng != null;
  const { data: observations } = useQuery({
    queryKey: ["observations", taxonId, lat, lng, radius],
    queryFn: () => fetchSpeciesObservations(taxonId, lat!, lng!, radius),
    enabled: !!taxonId && hasLoc,
  });

  const { data: histogram } = useQuery({
    queryKey: ["histogram", taxonId, lat, lng, radius],
    queryFn: () => fetchObservationHistogram(taxonId, lat!, lng!, radius),
    enabled: !!taxonId && hasLoc,
  });

  // Aggregate histogram by month-of-year (Jan..Dec)
  const monthlyActivity = useMemo<number[]>(() => {
    const buckets = Array(12).fill(0);
    const data = histogram?.results;
    if (!data) return buckets;
    for (const [date, count] of Object.entries(data)) {
      const m = parseInt(date.slice(5, 7), 10);
      if (m >= 1 && m <= 12) buckets[m - 1] += count as number;
    }
    return buckets;
  }, [histogram]);

  const timeline = useMemo(() => {
    if (!card) return [] as TimelineItem[];
    const items: TimelineItem[] = [];
    if (card.lastSeenDate) {
      items.push({
        d: formatRelative(card.lastSeenDate),
        emoji: "📍",
        color: ROLE_COLORS[card.role] ?? PAINT.sun,
        label: "Last observed nearby",
      });
    }
    if (observations && observations.length >= 5) {
      items.push({
        d: `${observations.length} obs`,
        emoji: "✦",
        color: PAINT.grass,
        label: "Active in your area",
      });
    }
    items.push({
      d: formatRelative(card.unlockedAt),
      emoji: "🥇",
      color: PAINT.orange,
      label: "You discovered her",
      highlight: true,
    });
    if (card.unlockMethods.includes("impact")) {
      items.push({
        d: "—",
        emoji: "📊",
        color: PAINT.purple,
        label: "Impact understood",
      });
    }
    return items;
  }, [card, observations]);

  if (!card) {
    return (
      <View style={[styles.container, { backgroundColor: PAINT.paper }]}>
        <PaperBackground />
        <View style={[styles.notFound, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.notFoundTitle}>Card not in your collection</Text>
          <Text style={styles.notFoundBody}>
            Open the species page first to discover and unlock this Life Card.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backLinkBtn, { marginTop: 18 }]}
          >
            <Text style={styles.backLinkText}>← back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const roleColor = ROLE_COLORS[card.role] ?? PAINT.brown;
  const topPad = insets.top + (Platform.OS === "web" ? 40 : 0);
  const bottomPad = insets.bottom + 24;

  async function onShare() {
    if (!card) return;
    Haptics.selectionAsync();
    const title = card.commonName || card.taxonName;
    const msg = `${title} — Level ${card.level}/5 on my Natura. ${card.nearbyCount} nearby observations.`;
    try {
      await Share.share({ message: msg, title });
    } catch {
      // ignore
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a2030", "#2a3045", "#1a2030"]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* sparkly stars background */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {Array.from({ length: 24 }).map((_, i) => {
          const x = (i * 47) % 360;
          const y = (i * 71) % 700 + 40;
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={1 + (i % 3) * 0.5}
              fill="white"
              opacity={0.35}
            />
          );
        })}
      </Svg>

      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: bottomPad + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top nav */}
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backLinkBtn}
          >
            <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.backLinkText}>back</Text>
          </Pressable>
          <Text style={styles.kicker}>Life Card</Text>
          <Pressable onPress={onShare} hitSlop={12} style={styles.backLinkBtn}>
            <Feather name="share" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        {/* Focused card */}
        <View style={styles.cardWrap}>
          <LifeCardView card={card} size="full" focused />
        </View>

        {/* Badges row */}
        {card.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {card.badges.map((b, i) => (
              <PaperStamp key={b} kind={b} idx={i} />
            ))}
          </View>
        )}

        {/* Paper sheet */}
        <View style={styles.paperSheet}>
          <Svg
            width="100%"
            height="100%"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            preserveAspectRatio="none"
            viewBox="0 0 358 800"
          >
            <Path
              d={wobbleRect(2, 2, 354, 796, 2, 99)}
              fill="none"
              stroke={PAINT.ink}
              strokeWidth={2}
            />
          </Svg>
          {/* Tabs */}
          <View style={styles.tabsRow}>
            {TABS.map((tb, i) => {
              const active = tab === tb;
              return (
                <Pressable
                  key={tb}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(tb);
                  }}
                  style={{ flex: 1, height: 30 }}
                >
                  <Svg width="100%" height={30} preserveAspectRatio="none" viewBox="0 0 100 30">
                    <Path
                      d={wobbleRect(2, 2, 96, 26, 1, i + 110)}
                      fill={active ? PAINT.ink : "white"}
                      stroke={PAINT.ink}
                      strokeWidth={1.8}
                    />
                  </Svg>
                  <View style={styles.tabLabelWrap}>
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: active ? PAINT.paper : PAINT.ink },
                      ]}
                    >
                      {tb}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {tab === "Story" && (
            <StoryTab card={card} roleColor={roleColor} />
          )}
          {tab === "Activity" && (
            <ActivityTab
              monthlyActivity={monthlyActivity}
              roleColor={roleColor}
              timeline={timeline}
            />
          )}
          {tab === "Impact" && (
            <ImpactTab card={card} roleColor={roleColor} />
          )}

          {/* Confidence (always visible) */}
          <View style={styles.confidenceWrap}>
            <Svg
              width="100%"
              height="100%"
              style={StyleSheet.absoluteFill}
              preserveAspectRatio="none"
              viewBox="0 0 326 96"
            >
              <Path
                d={wobbleRect(2, 2, 322, 92, 1.5, 155)}
                fill="rgba(167,139,217,0.1)"
                stroke={PAINT.purple}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            </Svg>
            <View style={{ padding: 12 }}>
              <View style={styles.confTopRow}>
                <Text style={styles.confTitle}>Data confidence</Text>
                <Text style={styles.confPct}>{card.confidence}%</Text>
              </View>
              <View style={styles.confBar}>
                <Svg width="100%" height={8} preserveAspectRatio="none" viewBox="0 0 300 8">
                  <Path
                    d={wobbleRect(1, 1, 298, 6, 0.5, 156)}
                    fill="white"
                    stroke={PAINT.ink}
                    strokeWidth={1}
                  />
                  <Path
                    d={wobbleRect(2, 2, (card.confidence / 100) * 296, 4, 0.4, 157)}
                    fill={PAINT.purple}
                  />
                </Svg>
              </View>
              <Text style={styles.confNote}>
                Based on {card.nearbyCount} observations · level {card.level}/5.
                {"\n"}Missing observations don&apos;t always mean a species is absent.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ marginTop: 18, gap: 10 }}>
            <ActionButton
              label="See Impact Cascade →"
              sub="what changes if she disappears?"
              color={roleColor}
              onPress={() =>
                router.push({
                  pathname: "/impact/[id]",
                  params: { id: String(card.taxonId) },
                } as never)
              }
            />
            {card.level >= 5 ? (
              <ActionButton
                label="Generate Civic Report"
                sub="prefilled with iNat data"
                icon="📜"
                color={PAINT.orange}
                onPress={() =>
                  router.push("/(tabs)/reports" as never)
                }
              />
            ) : (
              <View style={styles.lockedBtn}>
                <Svg
                  width="100%"
                  height={48}
                  preserveAspectRatio="none"
                  viewBox="0 0 326 48"
                >
                  <Path
                    d={wobbleRect(3, 3, 320, 42, 1, 220)}
                    fill="white"
                    stroke="#aaa"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                </Svg>
                <View style={styles.lockedInner}>
                  <Feather name="lock" size={14} color="#888" />
                  <Text style={styles.lockedText}>
                    Unlock report at L{card.level + 1}
                  </Text>
                </View>
              </View>
            )}
            <ActionButton
              label="Share this card"
              sub="without precise location"
              icon="↗"
              color={PAINT.ink}
              textColor={PAINT.paper}
              onPress={onShare}
            />
          </View>

          <Text style={styles.respect}>
            Observe respectfully. Don&apos;t disturb wildlife or enter
            restricted areas.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- tabs ---------- */
function StoryTab({ card, roleColor }: { card: LifeCard; roleColor: string }) {
  const subject = guessSubject(card);
  const story = useMemo(() => buildStory(card, subject), [card, subject]);
  return (
    <View style={{ marginTop: 16, position: "relative" }}>
      <Text style={styles.sectionH}>Why {subject} matters</Text>
      <CrayonUnderline width={170} color={roleColor} seed={3} />
      <Text style={styles.bodyText}>{story}</Text>
      {card.isSensitive && (
        <View style={styles.sensitiveBox}>
          <Text style={styles.sensitiveTitle}>◐ Sensitive species</Text>
          <Text style={styles.sensitiveBody}>
            Locations are generalised to protect this species. We never share
            precise coordinates.
          </Text>
        </View>
      )}
    </View>
  );
}

function ActivityTab({
  monthlyActivity,
  roleColor,
  timeline,
}: {
  monthlyActivity: number[];
  roleColor: string;
  timeline: TimelineItem[];
}) {
  const maxAct = Math.max(...monthlyActivity, 1);
  const currentMonth = new Date().getMonth();

  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.activityHead}>
        <Text style={styles.sectionH}>Activity through the year</Text>
        <Text style={styles.activityHint}>obs / month</Text>
      </View>
      <CrayonUnderline width={220} color={roleColor} seed={4} />
      <View style={{ marginTop: 12, height: 110 }}>
        <Svg
          width="100%"
          height={110}
          viewBox="0 0 326 110"
          preserveAspectRatio="none"
        >
          <Path
            d={wobble(8, 96, 320, 96, 0.6, 24, 121)}
            stroke={PAINT.ink}
            strokeWidth={1.2}
            fill="none"
          />
          {monthlyActivity.map((v, i) => {
            const x = 14 + i * 26;
            const h = (v / maxAct) * 76;
            const cur = i === currentMonth;
            return (
              <G key={i}>
                <Path
                  d={wobbleRect(x, 96 - h, 18, h, 0.7, i + 130)}
                  fill={cur ? roleColor : `${roleColor}55`}
                  stroke={PAINT.ink}
                  strokeWidth={1.2}
                />
                <SvgText
                  x={x + 9}
                  y={106}
                  textAnchor="middle"
                  fontFamily={LABEL_FONT}
                  fontSize={9}
                  fill="#666"
                >
                  {MONTH_LETTERS[i]}
                </SvgText>
              </G>
            );
          })}
          <SvgText
            x={14 + currentMonth * 26 + 9}
            y={20}
            textAnchor="middle"
            fontFamily={HAND_FONT}
            fontSize={13}
            fill={PAINT.ink}
          >
            now ↓
          </SvgText>
        </Svg>
      </View>

      {/* Timeline */}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.sectionH}>Your local timeline</Text>
        <View style={styles.timelineWrap}>
          <Svg
            width={3}
            height={timeline.length * 50}
            style={{ position: "absolute", left: 8, top: 6 }}
          >
            <Line
              x1={1.5}
              y1={0}
              x2={1.5}
              y2={timeline.length * 50}
              stroke={PAINT.ink}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          </Svg>
          {timeline.map((item, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot}>
                <Svg width={20} height={20}>
                  <Circle
                    cx={10}
                    cy={10}
                    r={9}
                    fill={item.color}
                    stroke={PAINT.ink}
                    strokeWidth={1.5}
                  />
                </Svg>
                <Text style={styles.timelineEmoji}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timelineDate}>{item.d}</Text>
                <Text
                  style={[
                    styles.timelineLabel,
                    item.highlight && { fontWeight: "700" },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ImpactTab({
  card,
  roleColor,
}: {
  card: LifeCard;
  roleColor: string;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.sectionH}>Role in the local web</Text>
      <CrayonUnderline width={200} color={roleColor} seed={5} />
      <View style={[styles.roleCard, { borderColor: roleColor }]}>
        <View style={[styles.roleSwatch, { backgroundColor: roleColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitle}>{card.role}</Text>
          <Text style={styles.bodyText}>
            {ROLE_DESCRIPTIONS[card.role] ??
              "Connected to other species in your local food web."}
          </Text>
        </View>
      </View>
      <Sparkle size={6} color={roleColor} />
      <Text
        style={[
          styles.bodyText,
          { marginTop: 6, fontStyle: "italic", color: PAINT.inkSoft },
        ]}
      >
        Tap &quot;See Impact Cascade&quot; below to see what shifts when this
        species fades from the area.
      </Text>
    </View>
  );
}

/* ---------- pieces ---------- */
function ActionButton({
  label,
  sub,
  icon,
  color,
  textColor = "white",
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: string;
  color: string;
  textColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ height: 56 }}>
      <Svg width="100%" height={56} preserveAspectRatio="none" viewBox="0 0 326 56">
        <Path
          d={wobbleRect(3, 3, 320, 50, 1.5, color.length + 200)}
          fill={color}
          stroke={PAINT.ink}
          strokeWidth={2.5}
        />
      </Svg>
      <View style={styles.actionBtnInner}>
        {icon && <Text style={styles.actionIcon}>{icon}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionLabel, { color: textColor }]}>
            {label}
          </Text>
          {sub && (
            <Text style={[styles.actionSub, { color: textColor, opacity: 0.85 }]}>
              {sub}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- types & helpers ---------- */
interface TimelineItem {
  d: string;
  emoji: string;
  color: string;
  label: string;
  highlight?: boolean;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 0) return "—";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function guessSubject(card: LifeCard): string {
  if (card.group === "Plants" || card.group === "Fungi") return "this one";
  return "she";
}

function buildStory(card: LifeCard, subject: string): string {
  const cap = subject[0].toUpperCase() + subject.slice(1);
  const role = (card.role || "").toLowerCase();
  if (role.includes("pollinat")) {
    return `${cap} pollinates the wildflowers, fruit trees, and crops in your neighborhood — quietly, daily, and mostly unnoticed. Without pollinators, much of the food web around you stalls.`;
  }
  if (role.includes("decompos")) {
    return `${cap} breaks down dead wood and leaf litter, recycling nutrients back into the soil so the next generation of plants can grow.`;
  }
  if (role.includes("predator")) {
    return `${cap} keeps populations of smaller animals in balance. Predators are how an ecosystem prevents any one species from taking over.`;
  }
  if (role.includes("seed")) {
    return `${cap} carries seeds across your neighborhood, helping plants spread to new places — including across roads and fences they can't cross alone.`;
  }
  if (role.includes("indicator")) {
    return `${cap} only thrives when conditions are right — clean water, intact habitat. When ${subject} disappears, it usually means something larger has shifted.`;
  }
  if (role.includes("habitat")) {
    return `${cap} provides food and shelter for many other species. Whole communities of insects, birds, and small mammals depend on plants like this one.`;
  }
  return `${cap} is part of the local food web — connected to other species that share this place with you.`;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Pollinator:
    "Moves pollen between flowers — without her, fruit and seed sets crash.",
  Decomposer:
    "Returns nutrients to the soil. The recycling crew of your local web.",
  Predator: "Keeps prey populations in check; shapes the whole community.",
  "Seed disperser":
    "Spreads plant seeds across the landscape, helping plants colonise new ground.",
  "Seed spreader":
    "Spreads plant seeds across the landscape, helping plants colonise new ground.",
  Herbivore: "Grazes plants — links sunlight energy to the rest of the web.",
  "Indicator species":
    "Sensitive to disturbance — her presence is a sign the habitat is healthy.",
  "Habitat / food source":
    "Provides shelter and food for many other species in your area.",
  Generalist:
    "Adaptable, found in many habitats. Often connects multiple food chains.",
  "Part of local food web":
    "Connected to other species through what eats it and what it eats.",
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  topNav: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backLinkText: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  kicker: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  cardWrap: {
    marginTop: 18,
    alignItems: "center",
  },
  badgesRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },

  paperSheet: {
    marginTop: 22,
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: PAINT.paper,
    borderRadius: 4,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tabLabelWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    fontWeight: "700",
  },

  sectionH: {
    fontFamily: HAND_FONT,
    fontSize: 20,
    color: PAINT.ink,
    transform: [{ rotate: "-0.3deg" }],
  },
  bodyText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: "#3a3a3a",
    marginTop: 8,
    lineHeight: 20,
  },

  activityHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  activityHint: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#888",
  },

  timelineWrap: {
    marginTop: 10,
    paddingLeft: 28,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 12,
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: -22,
    top: 0,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineEmoji: {
    position: "absolute",
    fontSize: 11,
    lineHeight: 14,
  },
  timelineDate: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#888",
  },
  timelineLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.ink,
  },

  roleCard: {
    marginTop: 12,
    padding: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    backgroundColor: PAINT.cream,
  },
  roleSwatch: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    marginTop: 2,
  },
  roleTitle: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    color: PAINT.ink,
  },

  sensitiveBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#7a7a9a",
    backgroundColor: "#f3eeff",
  },
  sensitiveTitle: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: "#5a5a7a",
  },
  sensitiveBody: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: "#5a5a7a",
    lineHeight: 16,
    marginTop: 4,
  },

  confidenceWrap: {
    marginTop: 18,
    minHeight: 96,
  },
  confTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  confTitle: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.ink,
  },
  confPct: {
    fontFamily: HAND_FONT,
    fontSize: 22,
    color: PAINT.purple,
  },
  confBar: { marginTop: 6, height: 8 },
  confNote: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#666",
    marginTop: 8,
    lineHeight: 15,
  },

  actionBtnInner: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    lineHeight: 20,
  },
  actionSub: {
    fontFamily: LABEL_FONT,
    fontSize: 11,
    marginTop: 1,
  },
  lockedBtn: { height: 48 },
  lockedInner: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lockedText: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: "#888",
    fontWeight: "700",
  },

  respect: {
    marginTop: 16,
    fontFamily: LABEL_FONT,
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 16,
  },

  notFound: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  notFoundTitle: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    textAlign: "center",
  },
  notFoundBody: {
    fontFamily: LABEL_FONT,
    fontSize: 14,
    color: PAINT.inkSoft,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
});
