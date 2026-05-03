import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Bee,
  Bird,
  Flower,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PAINT,
  WobbleBox,
} from "@/components/paint";
import {
  BADGE_META,
  LEVEL_NAMES,
  type CardBadge,
  type LifeCard,
} from "@/services/lifeCards";

interface Props {
  card: LifeCard;
  size?: "compact" | "full";
  onPress?: () => void;
  seed?: number;
}

export function LifeCardView({ card, size = "full", onPress, seed = 1 }: Props) {
  if (size === "compact") {
    return <CompactCard card={card} onPress={onPress} seed={seed} />;
  }
  return <FullCard card={card} onPress={onPress} seed={seed} />;
}

function FullCard({
  card,
  onPress,
  seed,
}: {
  card: LifeCard;
  onPress?: () => void;
  seed: number;
}) {
  const accent = pickAccent(card.badges);
  const showLocation = !card.isSensitive;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <WobbleBox
        width={336}
        height={460}
        fill="white"
        stroke={accent}
        strokeWidth={3.5}
        seed={seed}
        padding={0}
      >
        <View style={styles.cardInner}>
          {/* Photo */}
          <View style={styles.photoWrap}>
            {card.photoUrl ? (
              <Image
                source={{ uri: card.photoUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.photoFallback]}>
                <FallbackCritter group={card.group} />
              </View>
            )}
            {card.isSensitive && (
              <View style={styles.sensitiveOverlay}>
                <Text style={styles.sensitiveText}>
                  ✦ generalized location ✦
                </Text>
              </View>
            )}
          </View>

          {/* Names */}
          <View style={styles.namesRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.commonName} numberOfLines={1}>
                {card.commonName || card.taxonName}
              </Text>
              <Text style={styles.sciName} numberOfLines={1}>
                {card.taxonName}
              </Text>
            </View>
            <LevelDots level={card.level} />
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {card.badges.length === 0 ? (
              <View style={[styles.badge, { backgroundColor: PAINT.cream }]}>
                <Text style={styles.badgeText}>seen</Text>
              </View>
            ) : (
              card.badges.map((b) => <Badge key={b} kind={b} />)
            )}
          </View>

          {/* Role + level label */}
          <View style={styles.roleRow}>
            <View style={styles.rolePill}>
              <Feather name="git-branch" size={12} color={PAINT.ink} />
              <Text style={styles.roleText}>{card.role}</Text>
            </View>
            <Text style={styles.levelLabel}>{LEVEL_NAMES[card.level]}</Text>
          </View>

          {/* Stats — gradually revealed */}
          {card.level >= 2 && (
            <View style={styles.statsRow}>
              <Stat
                label="nearby"
                value={String(card.nearbyCount)}
                color={PAINT.grassDeep}
              />
              {showLocation && (
                <Stat
                  label="last seen"
                  value={
                    card.lastSeenDate
                      ? formatRelative(card.lastSeenDate)
                      : "—"
                  }
                  color={PAINT.blue}
                />
              )}
              <Stat
                label="confidence"
                value={`${card.confidence}%`}
                color={PAINT.orange}
              />
            </View>
          )}

          {/* Signal/impact strip */}
          {card.level >= 3 && (
            <View style={styles.signalStrip}>
              <Text style={styles.signalText} numberOfLines={2}>
                {signalLine(card)}
              </Text>
            </View>
          )}

          {/* Bottom hint */}
          <View style={styles.bottomHint}>
            <Text style={styles.bottomHintText}>
              {card.level === 5
                ? "tap to take action →"
                : card.level >= 3
                ? "tap to read more →"
                : "tap to keep exploring →"}
            </Text>
          </View>
        </View>
      </WobbleBox>
    </Pressable>
  );
}

function CompactCard({
  card,
  onPress,
  seed,
}: {
  card: LifeCard;
  onPress?: () => void;
  seed: number;
}) {
  const accent = pickAccent(card.badges);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ marginBottom: 8 }}>
      <WobbleBox
        width={164}
        height={210}
        fill="white"
        stroke={accent}
        strokeWidth={3}
        seed={seed}
        padding={0}
      >
        <View style={styles.compactInner}>
          <View style={styles.compactPhoto}>
            {card.photoUrl ? (
              <Image
                source={{ uri: card.photoUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.photoFallback]}>
                <FallbackCritter group={card.group} />
              </View>
            )}
          </View>
          <View style={{ padding: 8, flex: 1 }}>
            <Text style={styles.compactName} numberOfLines={1}>
              {card.commonName || card.taxonName}
            </Text>
            <Text style={styles.compactSci} numberOfLines={1}>
              {card.taxonName}
            </Text>
            <View style={styles.compactBadgeRow}>
              {card.badges.slice(0, 2).map((b) => (
                <View
                  key={b}
                  style={[
                    styles.miniBadge,
                    { backgroundColor: BADGE_META[b].color + "55" },
                  ]}
                >
                  <Text style={styles.miniBadgeText}>
                    {BADGE_META[b].label.toLowerCase()}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.compactFooter}>
              <LevelDots level={card.level} small />
              <Text style={styles.compactCount}>{card.nearbyCount}×</Text>
            </View>
          </View>
        </View>
      </WobbleBox>
    </Pressable>
  );
}

function Badge({ kind }: { kind: CardBadge }) {
  const meta = BADGE_META[kind];
  return (
    <View style={[styles.badge, { backgroundColor: meta.color + "55", borderColor: meta.color }]}>
      <Text style={styles.badgeText}>{meta.label.toLowerCase()}</Text>
    </View>
  );
}

function LevelDots({ level, small }: { level: number; small?: boolean }) {
  const size = small ? 6 : 9;
  return (
    <View style={{ flexDirection: "row", gap: small ? 3 : 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: PAINT.ink,
            backgroundColor: i <= level ? PAINT.sun : "white",
          }}
        />
      ))}
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FallbackCritter({ group }: { group: string }) {
  if (group === "Birds") return <Bird size={56} />;
  if (group === "Plants") return <Flower size={56} petal={PAINT.pink} />;
  if (group === "Fungi") return <Mushroom size={56} />;
  return <Bee size={56} />;
}

function pickAccent(badges: CardBadge[]): string {
  if (badges.includes("missing")) return PAINT.red;
  if (badges.includes("keystone")) return PAINT.sun;
  if (badges.includes("rare")) return PAINT.purple;
  if (badges.includes("sensitive")) return PAINT.blue;
  if (badges.includes("seasonal")) return PAINT.orange;
  if (badges.includes("common")) return PAINT.grassDeep;
  return PAINT.ink;
}

function signalLine(card: LifeCard): string {
  if (card.signalFlags.isMissing)
    return "This species was historically observed here but hasn't been seen recently.";
  if (card.signalFlags.isNewActivity)
    return "Fresh sightings this week — community scientists are spotting it now.";
  if (card.badges.includes("keystone"))
    return `As a ${card.role.toLowerCase()}, this species shapes the local food web.`;
  if (card.badges.includes("rare"))
    return "Few nearby observations — every sighting helps build the picture.";
  return "Part of the local life web around you.";
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

const styles = StyleSheet.create({
  cardInner: { flex: 1, padding: 14, gap: 10 },
  photoWrap: {
    height: 170,
    borderWidth: 2.5,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
    overflow: "hidden",
    position: "relative",
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PAINT.sun + "55",
  },
  sensitiveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PAINT.blue + "cc",
    paddingVertical: 4,
  },
  sensitiveText: {
    fontFamily: HAND_FONT,
    fontSize: 12,
    color: "white",
    textAlign: "center",
    letterSpacing: 0.6,
  },
  namesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commonName: {
    fontFamily: HAND_FONT,
    fontSize: 24,
    color: PAINT.ink,
    lineHeight: 26,
  },
  sciName: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    color: PAINT.inkSoft,
    fontStyle: "italic",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: HAND_FONT,
    fontSize: 13,
    color: PAINT.ink,
    letterSpacing: 0.4,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderRadius: 4,
  },
  roleText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.ink,
  },
  levelLabel: {
    fontFamily: HAND_FONT,
    fontSize: 16,
    color: PAINT.inkMute,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  stat: {
    flex: 1,
    borderWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: "white",
    padding: 6,
    alignItems: "center",
  },
  statValue: {
    fontFamily: HAND_FONT,
    fontSize: 18,
    lineHeight: 20,
  },
  statLabel: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
    color: PAINT.inkSoft,
    marginTop: 2,
  },
  signalStrip: {
    backgroundColor: PAINT.cream,
    borderWidth: 1.5,
    borderColor: PAINT.ink,
    borderStyle: "dashed",
    padding: 8,
  },
  signalText: {
    fontFamily: LABEL_FONT,
    fontSize: 12,
    color: PAINT.ink,
    lineHeight: 16,
  },
  bottomHint: {
    alignItems: "flex-end",
    marginTop: "auto",
  },
  bottomHintText: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.inkMute,
  },

  /* compact */
  compactInner: { flex: 1 },
  compactPhoto: {
    height: 100,
    borderBottomWidth: 2,
    borderColor: PAINT.ink,
    backgroundColor: PAINT.cream,
    overflow: "hidden",
  },
  compactName: {
    fontFamily: HAND_FONT,
    fontSize: 17,
    color: PAINT.ink,
    lineHeight: 19,
  },
  compactSci: {
    fontFamily: LABEL_FONT,
    fontSize: 10,
    color: PAINT.inkSoft,
    fontStyle: "italic",
  },
  compactBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  miniBadge: {
    borderWidth: 1,
    borderColor: PAINT.ink,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  miniBadgeText: {
    fontFamily: HAND_FONT,
    fontSize: 11,
    color: PAINT.ink,
  },
  compactFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 4,
  },
  compactCount: {
    fontFamily: HAND_FONT,
    fontSize: 14,
    color: PAINT.grassDeep,
  },
});
