import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
} from "react-native-svg";

// LiveEarth — cute satellite-style cartoon globe with floating clouds,
// blinking eyes that wander, and a gentle bob. Ported from the
// `World_Is_Changing` reference bundle.

const OCEAN = "#7fc6e8";
const LAND = "#9ad65c";
const OUTLINE = "#1f4e6b";
const SHADOW = "#a8d8f0";

function useClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const tick = () => {
      setT((now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

function EarthCloud({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <G transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`}>
      <Path
        d="M 8 14 Q 4 14 4 10 Q 4 4 12 4 Q 16 -2 24 0 Q 30 -2 34 4 Q 42 4 42 10 Q 42 14 38 14 Z"
        fill="#ffffff"
        stroke={OUTLINE}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </G>
  );
}

export function LiveEarth({ size = 240 }: { size?: number }) {
  const t = useClock();

  const bob = Math.sin(t * 1.0) * 3;
  const lookX = Math.sin(t * 0.6) * 2.5;
  const lookY = Math.cos(t * 0.5) * 1.5;
  const blinkPhase = t % 3.5;
  const isBlinking = blinkPhase > 3.36 && blinkPhase < 3.5;
  const eyeOpen = isBlinking ? 0.05 : 1;

  const cAx = 30 + ((t * 8) % 360) - 30;
  const cAy = 78 + Math.sin(t * 0.8) * 2;
  const cBx = 260 - ((t * 6) % 320) + 60;
  const cBy = 168 + Math.sin(t * 0.6 + 1) * 2;
  const cCx = 10 + ((t * 5 + 100) % 380) - 40;
  const cCy = 238 + Math.sin(t * 0.7 + 2) * 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 320 320">
        <Defs>
          <ClipPath id="earthBodyClip">
            <Circle cx={160} cy={160} r={112} />
          </ClipPath>
        </Defs>

        <Ellipse
          cx={160}
          cy={294}
          rx={70}
          ry={6}
          fill={SHADOW}
          opacity={0.35}
        />

        <EarthCloud x={cAx} y={cAy} scale={0.95} />
        <EarthCloud x={cBx} y={cBy} scale={0.85} />
        <EarthCloud x={cCx} y={cCy} scale={0.7} />

        <G transform={`translate(0 ${bob.toFixed(2)})`}>
          <Circle cx={160} cy={160} r={114} fill={OUTLINE} />
          <Circle cx={160} cy={160} r={108} fill={OCEAN} />

          <G clipPath="url(#earthBodyClip)">
            <Path
              d="M 78 96 Q 60 108 64 132 Q 70 152 86 158 Q 96 164 92 178 Q 84 196 92 214 Q 102 234 124 240 Q 138 244 144 232 Q 150 218 142 202 Q 134 188 140 174 Q 148 160 138 146 Q 128 132 120 122 Q 110 110 96 100 Q 86 94 78 96 Z"
              fill={LAND}
              stroke={OUTLINE}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <Path
              d="M 188 88 Q 178 100 184 114 Q 192 124 206 122 Q 218 120 224 132 Q 230 148 220 162 Q 208 174 214 188 Q 222 204 240 200 Q 256 194 252 178 Q 248 162 256 150 Q 264 138 256 124 Q 248 110 232 102 Q 216 94 204 90 Q 194 86 188 88 Z"
              fill={LAND}
              stroke={OUTLINE}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <Ellipse
              cx={160}
              cy={96}
              rx={6}
              ry={3.5}
              fill={LAND}
              stroke={OUTLINE}
              strokeWidth={3}
            />
          </G>

          <Ellipse cx={144} cy={152} rx={9} ry={9 * eyeOpen} fill={OUTLINE} />
          <Ellipse cx={176} cy={152} rx={9} ry={9 * eyeOpen} fill={OUTLINE} />
          {!isBlinking ? (
            <>
              <Circle cx={146 + lookX} cy={150 + lookY} r={2.6} fill="#ffffff" />
              <Circle cx={178 + lookX} cy={150 + lookY} r={2.6} fill="#ffffff" />
            </>
          ) : null}

          <Path
            d="M 148 172 Q 160 184 172 172"
            stroke={OUTLINE}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}
