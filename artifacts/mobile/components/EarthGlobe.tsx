import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  ClipPath,
} from "react-native-svg";

// `react-native-svg`'s G/Circle types don't declare a `style` prop, but
// the underlying components forward it just fine — we use it for the
// animated transform on the rotating continent strip and the pulsing
// pin. Cast to `any` so the AnimatedProps type doesn't strip `style`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedG = Animated.createAnimatedComponent(G) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedCircle = Animated.createAnimatedComponent(Circle) as any;

interface Props {
  size?: number;
  pinLat?: number | null;
  pinLng?: number | null;
}

const CX = 110;
const CY = 110;
const R = 92;

const CONTINENTS_PATH = `
M 22 70 Q 18 50 38 45 L 58 42 Q 78 44 82 62 L 80 88 Q 70 100 52 96 L 38 92 Q 22 84 22 70 Z
M 65 102 Q 68 96 76 100 L 82 122 Q 80 148 72 162 L 64 174 Q 56 168 58 152 L 60 128 Z
M 142 76 Q 138 64 158 60 L 178 62 Q 192 70 188 90 L 182 116 Q 172 134 156 130 L 144 116 Q 138 96 142 76 Z
M 138 44 L 178 42 Q 192 46 186 60 L 162 60 L 144 58 Q 130 52 138 44 Z
M 196 38 L 286 38 Q 312 44 308 72 L 282 84 L 244 78 L 216 74 Q 192 60 196 38 Z
M 296 134 L 336 132 Q 348 140 340 156 L 314 158 Q 298 152 296 134 Z
M 250 168 L 270 165 Q 285 168 280 184 L 260 188 Q 245 184 250 168 Z
`;

export function EarthGlobe({ size = 220, pinLat = null, pinLng = null }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const haloA = useRef(new Animated.Value(0.5)).current;
  const haloB = useRef(new Animated.Value(0.3)).current;
  const pinPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloA, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(haloA, { toValue: 0.5, duration: 3500, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloB, { toValue: 0.7, duration: 4500, useNativeDriver: true }),
        Animated.timing(haloB, { toValue: 0.25, duration: 4500, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(pinPulse, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const stripShift = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -184],
  });

  const pinScale = pinPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3.2],
  });
  const pinOpacity = pinPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0],
  });

  // Project lat/lng onto the static sphere (small cosmetic indicator).
  let pinX = CX;
  let pinY = CY - R * 0.3;
  if (pinLat != null && pinLng != null) {
    const phi = (pinLat * Math.PI) / 180;
    const lambda = (((pinLng + 540) % 360) - 180) * (Math.PI / 180);
    pinX = CX + R * 0.85 * Math.cos(phi) * Math.sin(lambda);
    pinY = CY - R * 0.85 * Math.sin(phi);
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Soft outer atmosphere glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.atmosphere,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: (size * 1.35) / 2,
            opacity: haloB,
            backgroundColor: "#0EA5E920",
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.atmosphere,
          {
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: (size * 1.15) / 2,
            opacity: haloA,
            backgroundColor: "#22C55E18",
          },
        ]}
      />

      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Defs>
          {/* Ocean radial gradient — gives the sphere a 3D feel */}
          <RadialGradient id="ocean" cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor="#3DB8E8" stopOpacity={1} />
            <Stop offset="35%" stopColor="#1E6BA8" stopOpacity={1} />
            <Stop offset="75%" stopColor="#0A2540" stopOpacity={1} />
            <Stop offset="100%" stopColor="#04101F" stopOpacity={1} />
          </RadialGradient>
          {/* Continent gradient — lush green */}
          <LinearGradient id="land" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#86EFAC" />
            <Stop offset="55%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#15803D" />
          </LinearGradient>
          {/* Specular highlight — top-left shine */}
          <RadialGradient id="shine" cx="28%" cy="22%" r="40%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.45} />
            <Stop offset="60%" stopColor="#FFFFFF" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          {/* Inner shadow on the sphere edge for depth */}
          <RadialGradient id="rim" cx="50%" cy="50%" r="50%">
            <Stop offset="80%" stopColor="#000000" stopOpacity={0} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.55} />
          </RadialGradient>

          <ClipPath id="globeClip">
            <Circle cx={CX} cy={CY} r={R} />
          </ClipPath>
        </Defs>

        {/* Ocean sphere */}
        <Circle cx={CX} cy={CY} r={R} fill="url(#ocean)" />

        {/* Rotating continent strip clipped to sphere */}
        <G clipPath="url(#globeClip)">
          <AnimatedG style={{ transform: [{ translateX: stripShift }] }}>
            {/* Strip width = 368, drawn twice side-by-side for seamless loop */}
            <G transform={`translate(${CX - 92}, ${CY - 92})`}>
              <Path d={CONTINENTS_PATH} fill="url(#land)" opacity={0.92} />
              <G transform="translate(184, 0)">
                <Path d={CONTINENTS_PATH} fill="url(#land)" opacity={0.92} />
              </G>
            </G>
          </AnimatedG>

          {/* Latitude lines */}
          <Ellipse
            cx={CX}
            cy={CY}
            rx={R}
            ry={R * 0.35}
            stroke="#FFFFFF"
            strokeOpacity={0.08}
            strokeWidth={0.6}
            fill="none"
          />
          <Ellipse
            cx={CX}
            cy={CY - R * 0.4}
            rx={R * 0.92}
            ry={R * 0.18}
            stroke="#FFFFFF"
            strokeOpacity={0.06}
            strokeWidth={0.5}
            fill="none"
          />
          <Ellipse
            cx={CX}
            cy={CY + R * 0.4}
            rx={R * 0.92}
            ry={R * 0.18}
            stroke="#FFFFFF"
            strokeOpacity={0.06}
            strokeWidth={0.5}
            fill="none"
          />
          {/* Meridian */}
          <Ellipse
            cx={CX}
            cy={CY}
            rx={R * 0.4}
            ry={R}
            stroke="#FFFFFF"
            strokeOpacity={0.07}
            strokeWidth={0.5}
            fill="none"
          />
        </G>

        {/* Specular highlight + rim shadow */}
        <Circle cx={CX} cy={CY} r={R} fill="url(#shine)" />
        <Circle cx={CX} cy={CY} r={R} fill="url(#rim)" />

        {/* Subtle outer ring */}
        <Circle
          cx={CX}
          cy={CY}
          r={R + 0.5}
          stroke="#22D3EE"
          strokeOpacity={0.25}
          strokeWidth={1}
          fill="none"
        />

        {/* Pulsing location pin */}
        <AnimatedCircle
          cx={pinX}
          cy={pinY}
          r={4}
          fill="#FACC15"
          opacity={pinOpacity}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{ transform: [{ scale: pinScale as any }] } as any}
        />
        <Circle cx={pinX} cy={pinY} r={3} fill="#FACC15" />
        <Circle cx={pinX} cy={pinY} r={1.4} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  atmosphere: {
    position: "absolute",
  },
});
