import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useUser } from "@clerk/expo";
import { useLocation } from "@/context/LocationContext";
import { LocationMap } from "@/components/LocationMap";
import { LiveEarth } from "@/components/LiveEarth";
import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";
import { PaperBackground } from "@/components/paint/PaperBackground";
import { WobbleButton } from "@/components/paint/WobbleButton";
import { HAND_FONT, LABEL_FONT, PAINT } from "@/components/paint/theme";
import { fetchNearbySpecies } from "@/services/iNaturalist";
import { useQuery } from "@tanstack/react-query";

// Feather-only mapping for iconic taxa. We can't reuse
// services/iNaturalist#getGroupIcon because some of its glyphs
// (`bug`, `leaf`, `paw-print`, `droplets`, `fish`) aren't in the
// Feather icon set and would render blank inside the onboarding
// species cards.
const ICONIC_FEATHER_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  Aves: "feather",
  Plantae: "wind",
  Insecta: "circle",
  Arachnida: "circle",
  Mammalia: "circle",
  Amphibia: "droplet",
  Reptilia: "zap",
  Fungi: "umbrella",
  Actinopterygii: "anchor",
  Mollusca: "circle",
  Animalia: "circle",
};

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const NUM_SCREENS = 7;

function lightTap() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

const ENTRANCE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

interface OnboardingScreenProps {
  index: number;
  active: boolean;
  scrollX: SharedValue<number>;
  hero: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: React.ReactNode;
}

function OnboardingScreen({
  index,
  active,
  scrollX,
  hero,
  title,
  subtitle,
  cta,
}: OnboardingScreenProps) {
  const heroProgress = useSharedValue(0);
  const textProgress = useSharedValue(0);
  const ctaProgress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      heroProgress.value = withTiming(1, { duration: 700, easing: ENTRANCE_EASE });
      textProgress.value = withDelay(
        320,
        withTiming(1, { duration: 600, easing: ENTRANCE_EASE }),
      );
      ctaProgress.value = withDelay(
        650,
        withTiming(1, { duration: 550, easing: ENTRANCE_EASE }),
      );
    } else {
      heroProgress.value = withTiming(0, { duration: 250 });
      textProgress.value = withTiming(0, { duration: 250 });
      ctaProgress.value = withTiming(0, { duration: 250 });
    }
  }, [active, heroProgress, textProgress, ctaProgress]);

  // Parallax driven by horizontal scroll position.
  const parallaxStyle = useAnimatedStyle(() => {
    const x = scrollX.value;
    const offset = x - index * SCREEN_W;
    const translateX = interpolate(
      offset,
      [-SCREEN_W, 0, SCREEN_W],
      [SCREEN_W * 0.25, 0, -SCREEN_W * 0.25],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      Math.abs(offset),
      [0, SCREEN_W],
      [1, 0.92],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }, { scale }] };
  });

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroProgress.value,
    transform: [
      { translateY: interpolate(heroProgress.value, [0, 1], [24, 0]) },
      { scale: interpolate(heroProgress.value, [0, 1], [0.92, 1]) },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: textProgress.value,
    transform: [{ translateY: interpolate(textProgress.value, [0, 1], [18, 0]) }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaProgress.value,
    transform: [{ scale: interpolate(ctaProgress.value, [0, 1], [0.94, 1]) }],
  }));

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.screenInner, parallaxStyle]}>
        <Animated.View style={[styles.heroWrap, heroStyle]}>{hero}</Animated.View>
        <View style={styles.textBlock}>
          <Animated.Text style={[styles.title, titleStyle]}>{title}</Animated.Text>
          {subtitle ? (
            <Animated.Text style={[styles.subtitle, titleStyle]}>{subtitle}</Animated.Text>
          ) : null}
        </View>
        {cta ? <Animated.View style={[styles.ctaWrap, ctaStyle]}>{cta}</Animated.View> : null}
      </Animated.View>
    </View>
  );
}

function AnimatedEarth({ size = 240 }: { size?: number }) {
  return <LiveEarth size={size} />;
}

function AnimatedLocationPin({
  active,
  size = 260,
  lat,
  lng,
}: {
  active: boolean;
  size?: number;
  lat?: number | null;
  lng?: number | null;
}) {
  // When the user has granted location, swap the Rive/SVG faux map for
  // a real LocationMap of their area; the pin-drop + ripple overlay
  // stays on top so the emotional beat is preserved.
  const hasLocation = typeof lat === "number" && typeof lng === "number";
  if (hasLocation) {
    return (
      <AnimatedLocationPinFallback
        active={active}
        size={size}
        lat={lat}
        lng={lng}
      />
    );
  }
  return (
    <RiveAnimation
      source={riveAssets.pin}
      style={{ width: size, height: size }}
      fallback={<AnimatedLocationPinFallback active={active} size={size} />}
    />
  );
}

function AnimatedLocationPinFallback({
  active,
  size = 260,
  lat,
  lng,
}: {
  active: boolean;
  size?: number;
  lat?: number | null;
  lng?: number | null;
}) {
  const hasLocation = typeof lat === "number" && typeof lng === "number";
  const mapFade = useSharedValue(0);
  useEffect(() => {
    mapFade.value = withTiming(hasLocation ? 1 : 0, { duration: 600 });
  }, [hasLocation, mapFade]);
  const mapStyle = useAnimatedStyle(() => ({ opacity: mapFade.value }));
  const drop = useSharedValue(0);
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);

  useEffect(() => {
    if (active) {
      drop.value = withDelay(
        300,
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }),
          withTiming(1, { duration: 220 }),
        ),
      );
      ripple1.value = withDelay(
        900,
        withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false),
      );
      ripple2.value = withDelay(
        1700,
        withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false),
      );
    } else {
      drop.value = 0;
      ripple1.value = 0;
      ripple2.value = 0;
    }
  }, [active, drop, ripple1, ripple2]);

  const pinStyle = useAnimatedStyle(() => ({
    opacity: drop.value > 0 ? 1 : 0,
    transform: [
      { translateY: interpolate(drop.value, [0, 1], [-80, 0], Extrapolation.CLAMP) },
      { scale: drop.value },
    ],
  }));

  const r1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple1.value, [0, 0.1, 1], [0, 0.6, 0]),
    transform: [{ scale: interpolate(ripple1.value, [0, 1], [0.4, 2.2]) }],
  }));
  const r2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ripple2.value, [0, 0.1, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(ripple2.value, [0, 1], [0.4, 2.4]) }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: PAINT.ink + "30",
          backgroundColor: PAINT.paperDeep,
        }}
      >
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={(size / 6) * i}
              x2={size}
              y2={(size / 6) * i}
              stroke={PAINT.ink}
              strokeOpacity={0.07}
              strokeWidth={0.8}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`v${i}`}
              x1={(size / 6) * i}
              y1={0}
              x2={(size / 6) * i}
              y2={size}
              stroke={PAINT.ink}
              strokeOpacity={0.07}
              strokeWidth={0.8}
            />
          ))}
        </Svg>
        {hasLocation && (
          <Animated.View
            style={[StyleSheet.absoluteFill, mapStyle]}
            pointerEvents="none"
          >
            <LocationMap
              lat={lat as number}
              lng={lng as number}
              radiusKm={2}
              height={size}
              preview
            />
          </Animated.View>
        )}
      </View>

      <Animated.View
        style={[
          {
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: PAINT.grass,
          },
          r1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: PAINT.sky,
          },
          r2Style,
        ]}
      />

      <Animated.View style={[{ position: "absolute" }, pinStyle]}>
        <View style={pinStyles.shadow} />
        <View style={pinStyles.pin}>
          <Feather name="map-pin" size={28} color={PAINT.ink} />
        </View>
      </Animated.View>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  shadow: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: PAINT.ink,
    opacity: 0.25,
  },
  pin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PAINT.sun,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PAINT.ink,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    borderWidth: 2.5,
    borderColor: PAINT.ink,
  },
});

interface SpeciesNode {
  icon: string;
  label: string;
  color: string;
  x: number; // -1..1 around center
  y: number;
  delay: number;
}

function OnboardingSpeciesCard({
  active,
  node,
  dimmed,
  containerSize,
}: {
  active: boolean;
  node: SpeciesNode;
  dimmed?: boolean;
  containerSize: number;
}) {
  const appear = useSharedValue(0);
  const float = useSharedValue(0);
  const dim = useSharedValue(0);

  useEffect(() => {
    if (active) {
      appear.value = withDelay(
        node.delay,
        withTiming(1, { duration: 600, easing: ENTRANCE_EASE }),
      );
      float.value = withDelay(
        node.delay,
        withRepeat(
          withTiming(1, { duration: 2800 + node.delay, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      );
    } else {
      appear.value = 0;
      float.value = 0;
    }
  }, [active, appear, float, node.delay]);

  useEffect(() => {
    dim.value = withTiming(dimmed ? 1 : 0, { duration: 600 });
  }, [dimmed, dim]);

  const cx = containerSize / 2 + node.x * (containerSize * 0.36);
  const cy = containerSize / 2 + node.y * (containerSize * 0.36);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value * interpolate(dim.value, [0, 1], [1, 0.25]),
    transform: [
      { translateX: cx - 32 },
      { translateY: cy - 32 + interpolate(float.value, [0, 1], [-3, 3]) },
      { scale: interpolate(appear.value, [0, 1], [0.7, 1]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: "white",
          borderWidth: 2,
          borderColor: node.color,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: PAINT.ink,
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        },
        style,
      ]}
    >
      <Feather name={node.icon as keyof typeof Feather.glyphMap} size={26} color={node.color} />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          position: "absolute",
          bottom: -16,
          maxWidth: 96,
          textAlign: "center",
          fontSize: 10,
          color: PAINT.inkSoft,
          fontFamily: LABEL_FONT,
        }}
      >
        {node.label}
      </Text>
    </Animated.View>
  );
}

function ConnectorLines({
  active,
  nodes,
  size,
  highlight,
}: {
  active: boolean;
  nodes: SpeciesNode[];
  size: number;
  highlight?: number; // index that pulses
}) {
  const draw = useSharedValue(0);
  useEffect(() => {
    if (active) {
      draw.value = withDelay(900, withTiming(1, { duration: 1200, easing: ENTRANCE_EASE }));
    } else {
      draw.value = 0;
    }
  }, [active, draw]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (highlight !== undefined && active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      pulse.value = 0;
    }
  }, [highlight, active, pulse]);

  const cx = size / 2;
  const cy = size / 2;

  const style = useAnimatedStyle(() => ({ opacity: draw.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="conn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={PAINT.grass} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={PAINT.sky} stopOpacity={0.4} />
          </SvgLinearGradient>
        </Defs>
        {nodes.map((n, i) => {
          const x = size / 2 + n.x * (size * 0.36);
          const y = size / 2 + n.y * (size * 0.36);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="url(#conn)"
              strokeWidth={highlight === i ? 1.8 : 1}
              strokeOpacity={0.85}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

const CHAIN_STEPS = [
  { icon: "circle", label: "Bee", color: PAINT.sun },
  { icon: "feather", label: "Flowers", color: PAINT.pink },
  { icon: "droplet", label: "Fruit", color: PAINT.orange },
  { icon: "wind", label: "Birds", color: PAINT.sky },
  { icon: "git-branch", label: "Diversity", color: PAINT.grass },
];

function EcosystemChain({ active }: { active: boolean }) {
  // Each item progresses through: appear → glow → dim
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withDelay(
        400,
        withTiming(CHAIN_STEPS.length, {
          duration: CHAIN_STEPS.length * 700,
          easing: Easing.linear,
        }),
      );
    } else {
      progress.value = 0;
    }
  }, [active, progress]);

  return (
    <View style={chainStyles.wrap}>
      {CHAIN_STEPS.map((s, i) => (
        <ChainNode key={i} index={i} step={s} progress={progress} />
      ))}
    </View>
  );
}

function ChainNode({
  index,
  step,
  progress,
}: {
  index: number;
  step: (typeof CHAIN_STEPS)[number];
  progress: SharedValue<number>;
}) {
  const local = useDerivedValue(() => {
    "worklet";
    const p = progress.value - index;
    return Math.max(0, Math.min(1, p));
  });
  const dimmed = useDerivedValue(() => {
    "worklet";
    return progress.value > index + 0.6 ? 1 : 0;
  });

  const nodeStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + local.value * 0.75,
    transform: [{ scale: 0.85 + local.value * 0.15 }],
  }));
  const glowStyle = useAnimatedStyle(() => {
    const fade = interpolate(local.value, [0, 0.5, 1], [0, 0.7, 0]);
    const dimFade = interpolate(dimmed.value, [0, 1], [1, 0.3]);
    return { opacity: fade * dimFade };
  });
  const dimOverlay = useAnimatedStyle(() => ({
    opacity: interpolate(dimmed.value, [0, 1], [0, 0.55]),
  }));

  return (
    <View style={chainStyles.row}>
      <View style={chainStyles.nodeWrap}>
        <Animated.View
          style={[
            chainStyles.glow,
            { backgroundColor: step.color + "60", shadowColor: step.color },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            chainStyles.node,
            { borderColor: step.color, backgroundColor: PAINT.cream },
            nodeStyle,
          ]}
        >
          <Feather name={step.icon as keyof typeof Feather.glyphMap} size={20} color={step.color} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            chainStyles.node,
            {
              position: "absolute",
              borderColor: "transparent",
              backgroundColor: PAINT.paper,
            },
            dimOverlay,
          ]}
        />
      </View>
      <Animated.Text style={[chainStyles.label, nodeStyle]}>{step.label}</Animated.Text>
      {index < CHAIN_STEPS.length - 1 ? (
        <ChainArrow index={index} progress={progress} color={step.color} />
      ) : null}
    </View>
  );
}

function ChainArrow({
  index,
  progress,
  color,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const arrowStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, progress.value - index - 0.4));
    return {
      opacity: p,
      transform: [{ scaleX: p }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          height: 2,
          backgroundColor: color + "80",
          marginHorizontal: 6,
          borderRadius: 1,
          transformOrigin: "left",
        },
        arrowStyle,
      ]}
    />
  );
}

const chainStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 8,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nodeWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  node: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: LABEL_FONT,
    color: PAINT.ink,
    width: 80,
  },
});

const DASHBOARD_CARDS = [
  { icon: "layers", label: "Species", value: "184", color: PAINT.grass },
  { icon: "activity", label: "Climate signal", value: "3 alerts", color: PAINT.sky },
  { icon: "git-branch", label: "Impact chain", value: "12 links", color: PAINT.sun },
  { icon: "file-text", label: "Civic report", value: "Ready", color: PAINT.pink },
];

function DashboardPreview({ active }: { active: boolean }) {
  return (
    <View style={dashStyles.wrap}>
      {DASHBOARD_CARDS.map((c, i) => (
        <DashCard key={i} index={i} card={c} active={active} />
      ))}
      <ConnectorGlow active={active} count={DASHBOARD_CARDS.length} />
    </View>
  );
}

function DashCard({
  index,
  card,
  active,
}: {
  index: number;
  card: (typeof DASHBOARD_CARDS)[number];
  active: boolean;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withDelay(index * 180, withTiming(1, { duration: 600, easing: ENTRANCE_EASE }));
    } else {
      v.value = 0;
    }
  }, [active, index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: interpolate(v.value, [0, 1], [22, 0]) }],
  }));

  return (
    <Animated.View
      style={[
        dashStyles.card,
        { borderColor: card.color + "40", shadowColor: card.color },
        style,
      ]}
    >
      <View style={[dashStyles.iconWrap, { backgroundColor: card.color + "20" }]}>
        <Feather name={card.icon as keyof typeof Feather.glyphMap} size={18} color={card.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={dashStyles.cardLabel}>{card.label}</Text>
        <Text style={[dashStyles.cardValue, { color: card.color }]}>{card.value}</Text>
      </View>
    </Animated.View>
  );
}

function ConnectorGlow({ active, count }: { active: boolean; count: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withDelay(
        count * 180 + 200,
        withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    } else {
      v.value = 0;
    }
  }, [active, count, v]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [0.25, 0.85]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 32,
          top: 30,
          bottom: 30,
          width: 2,
          borderRadius: 1,
          backgroundColor: PAINT.grass,
          shadowColor: PAINT.grass,
          shadowOpacity: 0.6,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

const dashStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 10,
    position: "relative",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.ink + "18",
    shadowColor: PAINT.ink,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 12,
    color: PAINT.inkSoft,
    fontFamily: LABEL_FONT,
  },
  cardValue: {
    fontSize: 17,
    fontFamily: HAND_FONT,
    marginTop: 2,
  },
});

const SHARE_CARDS = [
  { icon: "user", label: "Local Leader", color: PAINT.grass, angle: -16 },
  { icon: "tv", label: "Media", color: PAINT.sky, angle: 0 },
  { icon: "users", label: "Community", color: PAINT.pink, angle: 16 },
];

function ReportSharePreview({ active }: { active: boolean }) {
  const slide = useSharedValue(0);
  const fan = useSharedValue(0);
  const earth = useSharedValue(0);

  useEffect(() => {
    if (active) {
      slide.value = withDelay(200, withTiming(1, { duration: 600, easing: ENTRANCE_EASE }));
      fan.value = withDelay(900, withTiming(1, { duration: 800, easing: ENTRANCE_EASE }));
      earth.value = withDelay(
        1200,
        withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    } else {
      slide.value = 0;
      fan.value = 0;
      earth.value = 0;
    }
  }, [active, slide, fan, earth]);

  const earthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(earth.value, [0, 1], [0.25, 0.6]),
    transform: [{ scale: interpolate(earth.value, [0, 1], [0.95, 1.06]) }],
  }));

  const baseStyle = useAnimatedStyle(() => ({
    opacity: slide.value,
    transform: [
      { translateY: interpolate(slide.value, [0, 1], [40, 0]) },
      { scale: interpolate(fan.value, [0, 1], [1, 0.85]) },
    ],
  }));

  return (
    <View style={shareStyles.wrap}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: PAINT.grass + "40",
          },
          earthStyle,
        ]}
      />
      {SHARE_CARDS.map((c, i) => (
        <FanCard key={i} card={c} fan={fan} index={i} />
      ))}
      <Animated.View style={[shareStyles.baseCard, baseStyle]}>
        <View style={[shareStyles.iconWrap, { backgroundColor: PAINT.sun + "30" }]}>
          <Feather name="file-text" size={20} color={PAINT.sun} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={shareStyles.cardTitle}>Biodiversity Report</Text>
          <Text style={shareStyles.cardSub}>Ready to share</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function FanCard({
  card,
  fan,
  index,
}: {
  card: (typeof SHARE_CARDS)[number];
  fan: SharedValue<number>;
  index: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = fan.value;
    const dx = Math.sin((card.angle * Math.PI) / 180) * 110 * p;
    const dy = -p * (60 + index * 4);
    const rot = card.angle * p;
    return {
      opacity: p,
      transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${rot}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        shareStyles.fanCard,
        { borderColor: card.color + "60", shadowColor: card.color },
        style,
      ]}
    >
      <View style={[shareStyles.iconWrap, { backgroundColor: card.color + "20" }]}>
        <Feather name={card.icon as keyof typeof Feather.glyphMap} size={18} color={card.color} />
      </View>
      <Text style={[shareStyles.cardTitle, { fontSize: 13 }]}>{card.label}</Text>
    </Animated.View>
  );
}

const shareStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  baseCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: PAINT.sun,
    width: 240,
    shadowColor: PAINT.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fanCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: PAINT.ink + "20",
    width: 160,
    shadowColor: PAINT.ink,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: HAND_FONT,
    color: PAINT.ink,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: LABEL_FONT,
    color: PAINT.inkSoft,
    marginTop: 2,
  },
});

const HIDDEN_NODES: SpeciesNode[] = [
  { icon: "circle", label: "Bee", color: PAINT.sun, x: 0, y: -1, delay: 200 },
  { icon: "feather", label: "Bird", color: PAINT.sky, x: 0.95, y: -0.35, delay: 450 },
  { icon: "wind", label: "Flower", color: PAINT.pink, x: 0.6, y: 0.85, delay: 700 },
  { icon: "droplet", label: "Frog", color: PAINT.grass, x: -0.6, y: 0.85, delay: 950 },
  { icon: "umbrella", label: "Mushroom", color: PAINT.orange, x: -0.95, y: -0.35, delay: 1200 },
];

function PageIndicator({
  scrollX,
  count,
}: {
  scrollX: SharedValue<number>;
  count: number;
}) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} />
      ))}
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const offset = Math.abs(scrollX.value - index * SCREEN_W);
    const t = interpolate(offset, [0, SCREEN_W], [1, 0], Extrapolation.CLAMP);
    return {
      width: interpolate(t, [0, 1], [8, 28]),
      opacity: interpolate(t, [0, 1], [0.35, 1]),
      backgroundColor: t > 0.5 ? PAINT.ink : PAINT.inkMute,
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function NameInputHero({
  value,
  onChange,
  active,
}: {
  value: string;
  onChange: (s: string) => void;
  active: boolean;
}) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (active) {
      glow.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      glow.value = 0;
    }
  }, [active, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0.8]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.96, 1.04]) }],
  }));
  return (
    <View style={{ width: "100%", alignItems: "center", gap: 28 }}>
      <View
        style={{
          width: 140,
          height: 140,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: PAINT.grass + "30",
            },
            glowStyle,
          ]}
        />
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: PAINT.cream,
            borderWidth: 2.5,
            borderColor: PAINT.ink,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: PAINT.ink,
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 6,
          }}
        >
          <Feather name="edit-3" size={36} color={PAINT.grass} />
        </View>
      </View>
      <View style={nameStyles.inputCard}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Your name"
          placeholderTextColor={PAINT.inkMute}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={40}
          style={nameStyles.input}
          accessibilityLabel="Your name"
        />
      </View>
    </View>
  );
}

const nameStyles = StyleSheet.create({
  inputCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: PAINT.ink + "30",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: PAINT.ink,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    fontFamily: LABEL_FONT,
    fontSize: 20,
    color: PAINT.ink,
    textAlign: "center",
    paddingVertical: 4,
  },
});

export default function OnboardingScreenRoot() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const {
    requestLocation,
    completeOnboarding,
    lat,
    lng,
    permissionGranted,
    setDisplayName,
    displayName,
  } = useLocation();
  const [nameDraft, setNameDraft] = useState<string>(displayName ?? "");

  // Pre-fetch a small sample of nearby species so screen 3 can replace
  // the generic bee/bird/flower placeholders with real local taxa once
  // the user has actually granted location on screen 2. Gating on
  // `permissionGranted` (not just truthy lat/lng) prevents us from
  // showing San-Francisco-default species to users who haven't shared
  // their location yet. Non-blocking: if the query hasn't resolved by
  // the time the user reaches screen 3, the existing stylized
  // HIDDEN_NODES placeholders are shown.
  const hasRealLocation = permissionGranted && lat != null && lng != null;
  const { data: nearbySpecies } = useQuery({
    queryKey: ["onboarding-nearby-species", lat, lng],
    queryFn: () => fetchNearbySpecies(lat as number, lng as number, 10, 8),
    enabled: hasRealLocation,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const screen3Nodes = useMemo<SpeciesNode[]>(() => {
    if (!nearbySpecies || nearbySpecies.length === 0) return HIDDEN_NODES;
    return HIDDEN_NODES.map((base, i) => {
      const sp = nearbySpecies[i];
      const taxon = sp?.taxon;
      const name = taxon?.preferred_common_name || taxon?.name;
      if (!name) return base;
      const icon =
        ICONIC_FEATHER_ICON[taxon?.iconic_taxon_name ?? ""] ??
        (base.icon as keyof typeof Feather.glyphMap);
      return { ...base, label: name, icon };
    });
  }, [nearbySpecies]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDone, setLocationDone] = useState<"granted" | "mock" | null>(null);

  // Dock CTA entrance — fires after hero/text on each screen change.
  const dockCta = useSharedValue(0);
  useEffect(() => {
    dockCta.value = 0;
    dockCta.value = withDelay(
      650,
      withTiming(1, { duration: 550, easing: ENTRANCE_EASE }),
    );
  }, [activeIndex, dockCta]);
  const dockCtaStyle = useAnimatedStyle(() => ({
    opacity: dockCta.value,
    transform: [{ scale: interpolate(dockCta.value, [0, 1], [0.94, 1]) }],
  }));

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      scrollX.value = x;
      const idx = Math.round(x / SCREEN_W);
      if (idx !== activeIndex && idx >= 0 && idx < NUM_SCREENS) {
        // If the user swipes off the name screen (rather than tapping
        // Continue), persist whatever non-empty draft they typed so the
        // name isn't lost if the app backgrounds before onboarding ends.
        if (activeIndex === 0 && idx > 0) {
          const trimmed = nameDraft.trim();
          if (trimmed && trimmed !== displayName) {
            void setDisplayName(trimmed);
          }
        }
        setActiveIndex(idx);
      }
    },
    [activeIndex, scrollX, nameDraft, displayName, setDisplayName],
  );

  const goTo = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
  }, []);

  const finishOnboarding = useCallback(async () => {
    await Promise.all([
      completeOnboarding(user?.id),
      AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true"),
    ]);
    router.replace("/(tabs)" as never);
  }, [completeOnboarding, router, user?.id]);

  const handleContinue = useCallback(async () => {
    lightTap();
    if (activeIndex === 0) {
      // Persist name before leaving the name screen.
      const trimmed = nameDraft.trim();
      if (!trimmed) return;
      await setDisplayName(trimmed);
    }
    if (activeIndex < NUM_SCREENS - 1) {
      goTo(activeIndex + 1);
    } else {
      await finishOnboarding();
    }
  }, [activeIndex, finishOnboarding, goTo, nameDraft, setDisplayName]);

  const handleSkip = useCallback(async () => {
    lightTap();
    await finishOnboarding();
  }, [finishOnboarding]);

  const handleLocateRequest = useCallback(async () => {
    if (locationLoading || locationDone) {
      handleContinue();
      return;
    }
    setLocationLoading(true);
    // Race the location request against a 4s timeout so the flow always
    // progresses even if the geolocation API hangs (common in proxied
    // iframes / when the permission prompt is dismissed).
    const granted = await Promise.race<boolean>([
      requestLocation(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000)),
    ]);
    setLocationLoading(false);
    setLocationDone(granted ? "granted" : "mock");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        granted
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    setTimeout(() => goTo(activeIndex + 1), 650);
  }, [locationLoading, locationDone, requestLocation, handleContinue, activeIndex, goTo]);

  // Persistent CTA copy depends on screen.
  const ctaCopy = (() => {
    switch (activeIndex) {
      case 0:
        return "Continue";
      case 1:
        return "Continue";
      case 2:
        return locationDone === "granted"
          ? "Location found — continue"
          : locationDone === "mock"
            ? "Continue without location"
            : locationLoading
              ? "Finding your location…"
              : "Show my local ecosystem";
      case 3:
        return "Continue";
      case 4:
        return "Continue";
      case 5:
        return "Continue";
      case 6:
        return "Explore my area";
      default:
        return "Continue";
    }
  })();

  const onPrimaryPress = activeIndex === 2 ? handleLocateRequest : handleContinue;
  const ctaDisabled =
    locationLoading || (activeIndex === 0 && !nameDraft.trim());

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <PaperBackground />
      {activeIndex >= 2 && activeIndex < NUM_SCREENS - 1 ? (
        <Pressable
          onPress={handleSkip}
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
          style={[styles.skip, { top: insets.top + 12 }]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      ) : null}


      <Animated.ScrollView
        ref={scrollRef as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        style={styles.scroll}
      >
        <OnboardingScreen
          index={0}
          active={activeIndex === 0}
          scrollX={scrollX}
          hero={
            <NameInputHero
              value={nameDraft}
              onChange={setNameDraft}
              active={activeIndex === 0}
            />
          }
          title="Welcome to Natura."
          subtitle="What should we call you, naturalist?"
        />

        <OnboardingScreen
          index={1}
          active={activeIndex === 1}
          scrollX={scrollX}
          hero={<AnimatedEarth size={Math.min(SCREEN_W * 0.72, 280)} />}
          title="Nature around you is changing."
          subtitle="A quiet shift is happening in your neighborhood — and most of us never notice."
        />

        <OnboardingScreen
          index={2}
          active={activeIndex === 2}
          scrollX={scrollX}
          hero={
            <AnimatedLocationPin
              active={activeIndex === 2}
              size={Math.min(SCREEN_W * 0.72, 280)}
              lat={locationDone === "granted" ? lat : null}
              lng={locationDone === "granted" ? lng : null}
            />
          }
          title="It starts where you stand."
          subtitle={
            locationDone === "mock"
              ? "We'll show you a sample ecosystem for now — you can enable location anytime."
              : "We map the living world within walking distance of you."
          }
        />

        <OnboardingScreen
          index={3}
          active={activeIndex === 3}
          scrollX={scrollX}
          hero={
            <View
              style={{
                width: Math.min(SCREEN_W * 0.85, 320),
                height: Math.min(SCREEN_W * 0.85, 320),
              }}
            >
              <ConnectorLines
                active={activeIndex === 3}
                nodes={screen3Nodes}
                size={Math.min(SCREEN_W * 0.85, 320)}
              />
              <View
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  marginLeft: -22,
                  marginTop: -22,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: PAINT.sun,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2.5,
                  borderColor: PAINT.ink,
                  shadowColor: PAINT.ink,
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Feather name="map-pin" size={20} color={PAINT.ink} />
              </View>
              {screen3Nodes.map((n, i) => (
                <OnboardingSpeciesCard
                  key={i}
                  active={activeIndex === 3}
                  node={n}
                  containerSize={Math.min(SCREEN_W * 0.85, 320)}
                />
              ))}
            </View>
          }
          title="Hidden life, all around you."
          subtitle="Bees, birds, frogs, flowers, fungi — connected in ways you can finally see."
        />

        <OnboardingScreen
          index={4}
          active={activeIndex === 4}
          scrollX={scrollX}
          hero={<EcosystemChain active={activeIndex === 4} />}
          title="Lose one. Lose many."
          subtitle="When pollinators vanish, flowers fade, fruit drops, birds leave. One loss ripples outward."
        />

        <OnboardingScreen
          index={5}
          active={activeIndex === 5}
          scrollX={scrollX}
          hero={<DashboardPreview active={activeIndex === 5} />}
          title="See it. Track it. Act on it."
          subtitle="Species → signals → impact → action. Natura turns the wild into something you can read."
        />

        <OnboardingScreen
          index={6}
          active={activeIndex === 6}
          scrollX={scrollX}
          hero={<ReportSharePreview active={activeIndex === 6} />}
          title="Your voice for the wild."
          subtitle="One tap turns your local ecosystem into a report you can share with leaders, media, and neighbors."
        />
      </Animated.ScrollView>

      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PageIndicator scrollX={scrollX} count={NUM_SCREENS} />
        <Animated.View style={[styles.ctaWrapAbs, dockCtaStyle]}>
          <WobbleButton
            label={ctaCopy}
            onPress={onPrimaryPress}
            color={PAINT.sun}
            width={SCREEN_W - 56}
            height={60}
            loading={locationLoading}
            disabled={ctaDisabled}
            seed={7}
            accessibilityLabel={ctaCopy}
            accessibilityRole="button"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAINT.paper,
  },
  scroll: {
    flex: 1,
  },
  screen: {
    width: SCREEN_W,
    height: "100%",
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  screenInner: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  heroWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
    width: "100%",
  },
  textBlock: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    color: PAINT.ink,
    fontFamily: HAND_FONT,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: PAINT.inkSoft,
    fontFamily: LABEL_FONT,
    textAlign: "center",
    maxWidth: 320,
  },
  ctaWrap: {
    width: "100%",
    alignItems: "center",
  },
  ctaWrapAbs: {
    width: "100%",
    alignItems: "center",
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 0,
    gap: 16,
    alignItems: "center",
    backgroundColor: PAINT.paper + "ee",
    borderTopWidth: 1.5,
    borderTopColor: PAINT.ink + "18",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  skip: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PAINT.paperDeep,
    borderWidth: 1.5,
    borderColor: PAINT.ink + "30",
  },
  skipText: {
    color: PAINT.inkSoft,
    fontSize: 13,
    fontFamily: LABEL_FONT,
  },
});
