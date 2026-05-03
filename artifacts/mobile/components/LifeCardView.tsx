import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  Path,
  Pattern,
  Rect,
  G,
  ClipPath,
  Image as SvgImage,
} from "react-native-svg";

import {
  Bee,
  Bird,
  Flower,
  Frog,
  HAND_FONT,
  LABEL_FONT,
  Mushroom,
  PAINT,
  Sparkle,
  wobble,
  wobbleCircle,
  wobbleRect,
} from "@/components/paint";
import {
  BADGE_META,
  type CardBadge,
  type LifeCard,
} from "@/services/lifeCards";

const CARD_W = 168;
const CARD_H = 240;
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

interface Props {
  card: LifeCard;
  size?: "compact" | "full";
  onPress?: () => void;
  focused?: boolean;
  locked?: boolean;
  /** Wobble seed offset; defaults derived from taxonId. */
  seedOffset?: number;
}

export function LifeCardView({
  card,
  size = "compact",
  onPress,
  focused = false,
  locked = false,
  seedOffset = 0,
}: Props) {
  const scale = size === "full" ? 1.45 : 1;
  const W = CARD_W * scale;
  const H = CARD_H * scale;
  const roleColor = ROLE_COLORS[card.role] ?? PAINT.brown;
  const seed = (card.taxonId % 97) + seedOffset + 5;
  const idStr = `c${card.taxonId}`;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={{ width: W, height: H, position: "relative" }}>
        {focused && (
          <Svg
            width={W + 32}
            height={H + 32}
            style={{ position: "absolute", left: -16, top: -16 }}
          >
            <Path
              d={wobbleRect(8, 8, W + 16, H + 16, 3, seed + 99)}
              fill="none"
              stroke={roleColor}
              strokeWidth={3}
              opacity={0.7}
            />
          </Svg>
        )}
        <Svg width={W} height={H} viewBox={`0 0 ${CARD_W} ${CARD_H}`}>
          <Defs>
            <Pattern
              id={`pap-${idStr}`}
              width={3}
              height={3}
              patternUnits="userSpaceOnUse"
            >
              <Rect width={3} height={3} fill={PAINT.paper} />
              <Rect x={1} y={1} width={0.6} height={0.6} fill="rgba(180,140,100,0.18)" />
            </Pattern>
            <Pattern
              id={`d-${idStr}`}
              width={3}
              height={3}
              patternUnits="userSpaceOnUse"
            >
              <Rect width={3} height={3} fill="transparent" />
              <Rect x={0} y={0} width={1.5} height={1.5} fill={roleColor} />
            </Pattern>
            <ClipPath id={`pc-${idStr}`}>
              <Path d={wobbleCircle(84, 56, 30, 1, 28, seed + 9)} />
            </ClipPath>
          </Defs>

          {/* Outer paper card */}
          <Path
            d={wobbleRect(3, 3, CARD_W - 6, CARD_H - 6, 1.6, seed)}
            fill={`url(#pap-${idStr})`}
            stroke={PAINT.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {/* Inner role-color border */}
          <Path
            d={wobbleRect(7, 7, CARD_W - 14, CARD_H - 14, 1.2, seed + 1)}
            fill="none"
            stroke={roleColor}
            strokeWidth={1.5}
            opacity={0.8}
          />
          {/* Corner crosses */}
          {[
            [12, 12],
            [CARD_W - 12, 12],
            [12, CARD_H - 12],
            [CARD_W - 12, CARD_H - 12],
          ].map(([x, y], i) => (
            <G key={i}>
              <Path
                d={`M ${x - 4} ${y} L ${x + 4} ${y}`}
                stroke={roleColor}
                strokeWidth={1.5}
              />
              <Path
                d={`M ${x} ${y - 4} L ${x} ${y + 4}`}
                stroke={roleColor}
                strokeWidth={1.5}
              />
            </G>
          ))}

          {/* Dithered halo */}
          <Path
            d={wobbleCircle(84, 56, 36, 1.2, 30, seed + 8)}
            fill={`url(#d-${idStr})`}
            opacity={0.5}
          />
          {/* Inner white portrait circle */}
          <Path
            d={wobbleCircle(84, 56, 30, 1, 28, seed + 9)}
            fill="white"
            stroke={PAINT.ink}
            strokeWidth={2}
          />
          {/* Photo (clipped) */}
          {!locked && card.photoUrl && (
            <SvgImage
              href={{ uri: card.photoUrl }}
              x={54}
              y={26}
              width={60}
              height={60}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#pc-${idStr})`}
            />
          )}
        </Svg>

        {/* Foreground content */}
        <View style={[StyleSheet.absoluteFill, { padding: 12 * scale }]}>
          {/* header — group + level */}
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>{card.group}</Text>
            <Text style={styles.headerText}>L{card.level}/5</Text>
          </View>

          {/* Portrait area — fallback critter when no photo */}
          <View style={[styles.portraitArea, { height: 84 * scale }]}>
            {!card.photoUrl && !locked && (
              <FallbackCritter group={card.group} />
            )}
            {locked && (
              <Text style={[styles.lockedQ, { fontSize: 48 * scale }]}>?</Text>
            )}
            {!locked && card.level >= 3 && (
              <View style={styles.cornerSparkle}>
                <Sparkle size={4} color={PAINT.sun} />
              </View>
            )}
          </View>

          {/* name */}
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <Text
              style={[styles.name, { fontSize: 18 * scale }]}
              numberOfLines={1}
            >
              {locked ? "—— ——" : card.commonName || card.taxonName}
            </Text>
            {!locked && (
              <Text
                style={[styles.sci, { fontSize: 10 * scale }]}
                numberOfLines={1}
              >
                {card.taxonName}
              </Text>
            )}
          </View>

          {/* role pill */}
          <View style={{ alignItems: "center", marginTop: 6 }}>
            <View
              style={[
                styles.rolePill,
                {
                  borderColor: roleColor,
                  backgroundColor: roleColor + "2e",
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: roleColor, fontSize: 11 * scale },
                ]}
                numberOfLines={1}
              >
                {locked ? "??? role" : card.role}
              </Text>
            </View>
          </View>

          {/* progress dots */}
          <View style={styles.dotsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: 10 * scale,
                    height: 10 * scale,
                    borderRadius: 5 * scale,
                    backgroundColor:
                      i <= card.level ? roleColor : "transparent",
                  },
                ]}
              />
            ))}
          </View>

          {/* footer stats */}
          <View style={styles.footer}>
            <View>
              <Text
                style={[
                  styles.statBig,
                  { color: roleColor, fontSize: 16 * scale },
                ]}
              >
                {locked ? "?" : card.nearbyCount}
              </Text>
              <Text style={styles.statSmall}>nearby</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={[
                  styles.statBigDark,
                  { fontSize: 12 * scale },
                ]}
                numberOfLines={1}
              >
                {locked ? "—" : formatRelative(card.lastSeenDate)}
              </Text>
              <Text style={styles.statSmall}>last seen</Text>
            </View>
          </View>

          {/* badges floating top-right */}
          {!locked && card.badges.length > 0 && (
            <View style={styles.stampStack}>
              {card.badges.slice(0, 2).map((b, i) => (
                <PaperStamp key={b} kind={b} idx={i} small={size === "compact"} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* ===== Paper stamp badge ===== */
export function PaperStamp({
  kind,
  idx = 0,
  small = false,
}: {
  kind: CardBadge;
  idx?: number;
  small?: boolean;
}) {
  const meta = BADGE_META[kind];
  const sym: Record<CardBadge, string> = {
    common: "●",
    rare: "✦",
    seasonal: "❋",
    missing: "?",
    keystone: "✶",
    sensitive: "◐",
  };
  const w = small ? 60 : 78;
  const h = small ? 22 : 26;
  const fs = small ? 10 : 11;
  const rot = idx % 2 === 0 ? -2 : 2;
  return (
    <View style={{ width: w, height: h, transform: [{ rotate: `${rot}deg` }] }}>
      <Svg width={w} height={h}>
        <Path
          d={wobbleRect(2, 2, w - 4, h - 4, 0.8, idx + 33)}
          fill="white"
          stroke={meta.color}
          strokeWidth={1.5}
        />
        <Path
          d={wobbleRect(4, 4, w - 8, h - 8, 0.6, idx + 34)}
          fill="none"
          stroke={meta.color}
          strokeWidth={0.8}
          strokeDasharray="2 2"
          opacity={0.6}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.stampInner]}>
        <Text style={[styles.stampSym, { color: meta.color, fontSize: fs + 2 }]}>
          {sym[kind]}
        </Text>
        <Text style={[styles.stampLabel, { color: meta.color, fontSize: fs }]}>
          {meta.label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function FallbackCritter({ group }: { group: string }) {
  if (group === "Birds") return <Bird size={56} />;
  if (group === "Plants") return <Flower size={56} petal={PAINT.pink} />;
  if (group === "Fungi") return <Mushroom size={56} />;
  if (group === "Amphibians") return <Frog size={56} />;
  return <Bee size={56} />;
}

function formatRelative(iso?: string): string {
  if (!iso) return "—";
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

// Re-export wobble helpers used by callers
export { wobble, wobbleRect, wobbleCircle };

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    fontFamily: LABEL_FONT,
    fontSize: 9,
    color: "#7a6a4a",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  portraitArea: {
    marginTop: 4,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedQ: {
    fontFamily: HAND_FONT,
    color: "#666",
  },
  cornerSparkle: {
    position: "absolute",
    top: 8,
    right: 22,
  },
  name: {
    fontFamily: HAND_FONT,
    color: PAINT.ink,
    lineHeight: 20,
    textAlign: "center",
  },
  sci: {
    fontFamily: LABEL_FONT,
    color: "#7a6a4a",
    fontStyle: "italic",
    marginTop: 1,
    textAlign: "center",
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderRadius: 3,
  },
  roleText: {
    fontFamily: LABEL_FONT,
    fontWeight: "700",
  },
  dotsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    borderWidth: 1.2,
    borderColor: PAINT.ink,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  statBig: {
    fontFamily: HAND_FONT,
    lineHeight: 18,
  },
  statBigDark: {
    fontFamily: HAND_FONT,
    color: PAINT.ink,
    lineHeight: 14,
  },
  statSmall: {
    fontFamily: LABEL_FONT,
    fontSize: 9,
    color: "#7a6a4a",
    marginTop: 1,
  },
  stampStack: {
    position: "absolute",
    top: -4,
    right: -2,
    gap: 4,
  },
  stampInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  stampSym: {
    fontFamily: LABEL_FONT,
    fontWeight: "700",
  },
  stampLabel: {
    fontFamily: LABEL_FONT,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
