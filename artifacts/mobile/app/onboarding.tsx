import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  RadialGradient,
  Stop,
} from "react-native-svg";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useLocation } from "@/context/LocationContext";
import { LocationMap } from "@/components/LocationMap";
import { RiveAnimation, riveAssets } from "@/components/RiveAnimation";

const ONBOARDING_COMPLETED_KEY = "onboardingCompleted";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const NUM_SCREENS = 6;

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
  return (
    <RiveAnimation
      source={riveAssets.hero}
      style={{ width: size, height: size }}
      fallback={<AnimatedEarthFallback size={size} />}
    />
  );
}

function AnimatedEarthFallback({ size = 240 }: { size?: number }) {
  const rotate = useSharedValue(0);
  const halo = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(1, { duration: 28000, easing: Easing.linear }),
      -1,
      false,
    );
    halo.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    float.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [rotate, halo, float]);

  const earthStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-6, 6]) },
      { rotate: `${interpolate(rotate.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  const haloOuterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0.18, 0.45]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [0.96, 1.06]) }],
  }));
  const haloInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0.3, 0.6]),
    transform: [{ scale: interpolate(halo.value, [0, 1], [1.02, 0.98]) }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            backgroundColor: "#1E3A8A40",
          },
          haloOuterStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: size * 0.575,
            backgroundColor: "#22C55E30",
          },
          haloInnerStyle,
        ]}
      />
      <StarParticles size={size} />
      <Animated.View style={earthStyle}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <RadialGradient id="ocean" cx="35%" cy="30%" r="75%">
              <Stop offset="0%" stopColor="#3DB8E8" stopOpacity={1} />
              <Stop offset="40%" stopColor="#1E6BA8" stopOpacity={1} />
              <Stop offset="80%" stopColor="#0A2540" stopOpacity={1} />
              <Stop offset="100%" stopColor="#04101F" stopOpacity={1} />
            </RadialGradient>
            <SvgLinearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#86EFAC" />
              <Stop offset="60%" stopColor="#22C55E" />
              <Stop offset="100%" stopColor="#15803D" />
            </SvgLinearGradient>
            <RadialGradient id="shine" cx="28%" cy="22%" r="40%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.4} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="rim" cx="50%" cy="50%" r="50%">
              <Stop offset="80%" stopColor="#000" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000" stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={120} r={92} fill="url(#ocean)" />
          <Circle cx={84} cy={90} r={26} fill="url(#land)" opacity={0.92} />
          <Circle cx={150} cy={108} r={22} fill="url(#land)" opacity={0.9} />
          <Circle cx={108} cy={150} r={18} fill="url(#land)" opacity={0.88} />
          <Circle cx={172} cy={148} r={14} fill="url(#land)" opacity={0.85} />
          <Circle cx={68} cy={140} r={10} fill="url(#land)" opacity={0.8} />
          <Circle cx={120} cy={120} r={92} fill="url(#shine)" />
          <Circle cx={120} cy={120} r={92} fill="url(#rim)" />
          <Circle
            cx={120}
            cy={120}
            r={92.5}
            stroke="#22D3EE"
            strokeOpacity={0.3}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function StarParticles({ size }: { size: number }) {
  // 14 drifting stars positioned around the earth
  const stars = useRef(
    Array.from({ length: 14 }).map((_, i) => ({
      angle: (i / 14) * Math.PI * 2 + Math.random() * 0.5,
      radius: size * (0.55 + Math.random() * 0.25),
      r: 1 + Math.random() * 1.6,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random(),
    })),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Star key={i} size={size} {...s} />
      ))}
    </View>
  );
}

function Star({
  size,
  angle,
  radius,
  r,
  speed,
  phase,
}: {
  size: number;
  angle: number;
  radius: number;
  r: number;
  speed: number;
  phase: number;
}) {
  const t = useSharedValue(phase);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(phase + 1, { duration: 6000 / speed, easing: Easing.linear }),
      -1,
      false,
    );
  }, [t, phase, speed]);

  const style = useAnimatedStyle(() => {
    const a = angle + t.value * 0.6;
    const x = size / 2 + Math.cos(a) * radius - r;
    const y = size / 2 + Math.sin(a) * radius - r;
    const tw = (Math.sin(t.value * Math.PI * 2) + 1) / 2;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: 0.35 + tw * 0.55,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          backgroundColor: "#E0F2FE",
        },
        style,
      ]}
    />
  );
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
          borderWidth: 1,
          borderColor: "#22C55E40",
        }}
      >
        <LinearGradient
          colors={["#0F2027", "#082014", "#04101F"]}
          style={StyleSheet.absoluteFill}
        />
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={(size / 6) * i}
              x2={size}
              y2={(size / 6) * i}
              stroke="#22C55E"
              strokeOpacity={0.08}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`v${i}`}
              x1={(size / 6) * i}
              y1={0}
              x2={(size / 6) * i}
              y2={size}
              stroke="#22C55E"
              strokeOpacity={0.08}
              strokeWidth={0.5}
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
            borderColor: "#4ADE80",
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
            borderColor: "#22D3EE",
          },
          r2Style,
        ]}
      />

      <Animated.View style={[{ position: "absolute" }, pinStyle]}>
        <View style={pinStyles.shadow} />
        <View style={pinStyles.pin}>
          <Feather name="map-pin" size={28} color="#080C14" />
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
    backgroundColor: "#000",
    opacity: 0.5,
  },
  pin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ADE80",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF40",
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
          backgroundColor: "#0F1824",
          borderWidth: 1.5,
          borderColor: node.color + "70",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: node.color,
          shadowOpacity: 0.6,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        style,
      ]}
    >
      <Feather name={node.icon as keyof typeof Feather.glyphMap} size={26} color={node.color} />
      <Text
        style={{
          position: "absolute",
          bottom: -16,
          fontSize: 10,
          color: "#CBD5E1",
          fontFamily: "Inter_600SemiBold",
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
            <Stop offset="0%" stopColor="#4ADE80" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#22D3EE" stopOpacity={0.4} />
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
  { icon: "circle", label: "Bee", color: "#FBBF24" },
  { icon: "feather", label: "Flowers", color: "#F472B6" },
  { icon: "droplet", label: "Fruit", color: "#FB923C" },
  { icon: "wind", label: "Birds", color: "#22D3EE" },
  { icon: "git-branch", label: "Diversity", color: "#4ADE80" },
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
            { borderColor: step.color, backgroundColor: "#0F1824" },
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
              backgroundColor: "#080C14",
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
    fontFamily: "Inter_600SemiBold",
    color: "#E2E8F0",
    width: 80,
  },
});

const DASHBOARD_CARDS = [
  { icon: "layers", label: "Species", value: "184", color: "#4ADE80" },
  { icon: "activity", label: "Climate signal", value: "3 alerts", color: "#22D3EE" },
  { icon: "git-branch", label: "Impact chain", value: "12 links", color: "#FBBF24" },
  { icon: "file-text", label: "Civic report", value: "Ready", color: "#F472B6" },
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
          backgroundColor: "#4ADE80",
          shadowColor: "#4ADE80",
          shadowOpacity: 1,
          shadowRadius: 12,
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
    backgroundColor: "#0F1824",
    borderWidth: 1,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
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
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
  },
  cardValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});

const SHARE_CARDS = [
  { icon: "user", label: "Local Leader", color: "#4ADE80", angle: -16 },
  { icon: "tv", label: "Media", color: "#22D3EE", angle: 0 },
  { icon: "users", label: "Community", color: "#F472B6", angle: 16 },
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
            backgroundColor: "#22C55E40",
          },
          earthStyle,
        ]}
      />
      {SHARE_CARDS.map((c, i) => (
        <FanCard key={i} card={c} fan={fan} index={i} />
      ))}
      <Animated.View style={[shareStyles.baseCard, baseStyle]}>
        <View style={[shareStyles.iconWrap, { backgroundColor: "#FBBF2420" }]}>
          <Feather name="file-text" size={20} color="#FBBF24" />
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
    backgroundColor: "#0F1824",
    borderWidth: 1.5,
    borderColor: "#FBBF2460",
    width: 240,
    shadowColor: "#FBBF24",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  fanCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#0F1824",
    borderWidth: 1.5,
    width: 160,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
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
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  cardSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#94A3B8",
    marginTop: 2,
  },
});

const HIDDEN_NODES: SpeciesNode[] = [
  { icon: "circle", label: "Bee", color: "#FBBF24", x: 0, y: -1, delay: 200 },
  { icon: "feather", label: "Bird", color: "#22D3EE", x: 0.95, y: -0.35, delay: 450 },
  { icon: "wind", label: "Flower", color: "#F472B6", x: 0.6, y: 0.85, delay: 700 },
  { icon: "droplet", label: "Frog", color: "#4ADE80", x: -0.6, y: 0.85, delay: 950 },
  { icon: "umbrella", label: "Mushroom", color: "#FB923C", x: -0.95, y: -0.35, delay: 1200 },
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
      backgroundColor: t > 0.5 ? "#4ADE80" : "#94A3B8",
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export default function OnboardingScreenRoot() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requestLocation, completeOnboarding, lat, lng } = useLocation();

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
        setActiveIndex(idx);
      }
    },
    [activeIndex, scrollX],
  );

  const goTo = useCallback((i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
  }, []);

  const finishOnboarding = useCallback(async () => {
    await Promise.all([
      completeOnboarding(),
      AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true"),
    ]);
    router.replace("/(tabs)" as never);
  }, [completeOnboarding, router]);

  const handleContinue = useCallback(async () => {
    lightTap();
    if (activeIndex < NUM_SCREENS - 1) {
      goTo(activeIndex + 1);
    } else {
      await finishOnboarding();
    }
  }, [activeIndex, finishOnboarding, goTo]);

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
        return locationDone === "granted"
          ? "Location found — continue"
          : locationDone === "mock"
            ? "Continue without location"
            : locationLoading
              ? "Finding your location…"
              : "Show my local ecosystem";
      case 2:
        return "Continue";
      case 3:
        return "Continue";
      case 4:
        return "Continue";
      case 5:
        return "Explore my area";
      default:
        return "Continue";
    }
  })();

  const onPrimaryPress = activeIndex === 1 ? handleLocateRequest : handleContinue;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={["#04080F", "#080C14", "#0A1628"]}
        style={StyleSheet.absoluteFill}
      />
      {activeIndex >= 1 && activeIndex < NUM_SCREENS - 1 ? (
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
          hero={<AnimatedEarth size={Math.min(SCREEN_W * 0.72, 280)} />}
          title="Nature around you is changing."
          subtitle="A quiet shift is happening in your neighborhood — and most of us never notice."
        />

        <OnboardingScreen
          index={1}
          active={activeIndex === 1}
          scrollX={scrollX}
          hero={
            <AnimatedLocationPin
              active={activeIndex === 1}
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
          index={2}
          active={activeIndex === 2}
          scrollX={scrollX}
          hero={
            <View
              style={{
                width: Math.min(SCREEN_W * 0.85, 320),
                height: Math.min(SCREEN_W * 0.85, 320),
              }}
            >
              <ConnectorLines
                active={activeIndex === 2}
                nodes={HIDDEN_NODES}
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
                  backgroundColor: "#4ADE80",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#4ADE80",
                  shadowOpacity: 0.8,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                }}
              >
                <Feather name="map-pin" size={20} color="#080C14" />
              </View>
              {HIDDEN_NODES.map((n, i) => (
                <OnboardingSpeciesCard
                  key={i}
                  active={activeIndex === 2}
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
          index={3}
          active={activeIndex === 3}
          scrollX={scrollX}
          hero={<EcosystemChain active={activeIndex === 3} />}
          title="Lose one. Lose many."
          subtitle="When pollinators vanish, flowers fade, fruit drops, birds leave. One loss ripples outward."
        />

        <OnboardingScreen
          index={4}
          active={activeIndex === 4}
          scrollX={scrollX}
          hero={<DashboardPreview active={activeIndex === 4} />}
          title="See it. Track it. Act on it."
          subtitle="Species → signals → impact → action. Life Web turns nature into something you can read."
        />

        <OnboardingScreen
          index={5}
          active={activeIndex === 5}
          scrollX={scrollX}
          hero={<ReportSharePreview active={activeIndex === 5} />}
          title="Your voice for the wild."
          subtitle="One tap turns your local ecosystem into a report you can share with leaders, media, and neighbors."
        />
      </Animated.ScrollView>

      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PageIndicator scrollX={scrollX} count={NUM_SCREENS} />
        <Animated.View style={[styles.ctaWrapAbs, dockCtaStyle]}>
          <Pressable
            onPress={onPrimaryPress}
            accessibilityLabel={ctaCopy}
            accessibilityRole="button"
            disabled={locationLoading}
            style={({ pressed }) => [
              styles.cta,
              {
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={["#4ADE80", "#22C55E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.ctaText}>{ctaCopy}</Text>
            <Feather
              name={activeIndex === NUM_SCREENS - 1 ? "arrow-right" : "chevron-right"}
              size={20}
              color="#062014"
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#04080F",
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
    fontSize: 28,
    lineHeight: 34,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#94A3B8",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 320,
  },
  ctaWrap: {
    width: "100%",
    alignItems: "center",
  },
  ctaWrapAbs: {
    width: "100%",
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 16,
    alignItems: "center",
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
  cta: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#062014",
    letterSpacing: 0.2,
  },
  skip: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF10",
    borderWidth: 1,
    borderColor: "#FFFFFF18",
  },
  skipText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
