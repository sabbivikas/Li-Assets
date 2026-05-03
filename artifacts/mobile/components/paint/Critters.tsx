import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { PAINT } from "./theme";
import { wobble } from "./wobble";

const INK = PAINT.ink;

export function Bee({ size = 64, seed = 1 }: { size?: number; seed?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={22} cy={20} rx={11} ry={8} fill="#e0f4ff" stroke={INK} strokeWidth={2} opacity={0.85} />
      <Ellipse cx={42} cy={20} rx={11} ry={8} fill="#e0f4ff" stroke={INK} strokeWidth={2} opacity={0.85} />
      <Ellipse cx={32} cy={36} rx={18} ry={14} fill={PAINT.sun} stroke={INK} strokeWidth={2.5} />
      <Path d={wobble(20, 32, 44, 32, 1, 8, seed)} stroke={INK} strokeWidth={3} fill="none" />
      <Path d={wobble(22, 40, 42, 40, 1, 8, seed + 2)} stroke={INK} strokeWidth={3} fill="none" />
      <Circle cx={26} cy={32} r={3.5} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={36} cy={32} r={3.5} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={26.5} cy={32.5} r={1.5} fill={INK} />
      <Circle cx={36.5} cy={32.5} r={1.5} fill={INK} />
      <Path d="M 28 40 Q 31 43 34 40" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M 26 22 Q 22 14 20 12" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M 38 22 Q 42 14 44 12" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx={20} cy={11} r={2} fill={INK} />
      <Circle cx={44} cy={11} r={2} fill={INK} />
    </Svg>
  );
}

export function Bird({
  size = 64,
  color = PAINT.blue,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={30} cy={36} rx={18} ry={14} fill={color} stroke={INK} strokeWidth={2.5} />
      <Ellipse cx={28} cy={40} rx={9} ry={6} fill="#fff8d6" />
      <Path d="M 28 30 Q 18 28 16 38 Q 24 40 32 36 Z" fill="rgba(0,0,0,0.18)" stroke={INK} strokeWidth={2} />
      <Circle cx={44} cy={28} r={11} fill={color} stroke={INK} strokeWidth={2.5} />
      <Path d="M 53 28 L 60 26 L 53 31 Z" fill={PAINT.orange} stroke={INK} strokeWidth={1.5} />
      <Circle cx={46} cy={26} r={2.5} fill="white" stroke={INK} strokeWidth={1.2} />
      <Circle cx={46.5} cy={26.3} r={1.3} fill={INK} />
      <Path d="M 28 50 L 26 58" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <Path d="M 34 50 L 36 58" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <Path d="M 24 58 L 28 58 M 34 58 L 38 58" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function Flower({
  size = 64,
  petal = PAINT.pink,
}: {
  size?: number;
  petal?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M 32 64 Q 30 50 32 36" stroke={PAINT.grass} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M 32 50 Q 38 46 42 48" stroke={PAINT.grass} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={42} cy={48} rx={5} ry={3} fill={PAINT.grass} stroke={INK} strokeWidth={1.5} transform="rotate(20 42 48)" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <Ellipse
          key={deg}
          cx={32}
          cy={14}
          rx={7}
          ry={11}
          fill={petal}
          stroke={INK}
          strokeWidth={2}
          transform={`rotate(${deg} 32 26)`}
        />
      ))}
      <Circle cx={32} cy={26} r={6} fill={PAINT.sun} stroke={INK} strokeWidth={2} />
      <Circle cx={30} cy={24} r={1.2} fill={INK} />
      <Circle cx={34} cy={24} r={1.2} fill={INK} />
      <Path d="M 30 28 Q 32 30 34 28" stroke={INK} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Frog({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={32} cy={42} rx={22} ry={15} fill={PAINT.grass} stroke={INK} strokeWidth={2.5} />
      <Ellipse cx={32} cy={46} rx={13} ry={8} fill="#d6f5d6" />
      <Ellipse cx={12} cy={48} rx={6} ry={9} fill={PAINT.grass} stroke={INK} strokeWidth={2} transform="rotate(-20 12 48)" />
      <Ellipse cx={52} cy={48} rx={6} ry={9} fill={PAINT.grass} stroke={INK} strokeWidth={2} transform="rotate(20 52 48)" />
      <Circle cx={22} cy={22} r={9} fill={PAINT.grass} stroke={INK} strokeWidth={2.5} />
      <Circle cx={42} cy={22} r={9} fill={PAINT.grass} stroke={INK} strokeWidth={2.5} />
      <Circle cx={22} cy={22} r={6} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={42} cy={22} r={6} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={23} cy={23} r={3} fill={INK} />
      <Circle cx={43} cy={23} r={3} fill={INK} />
      <Path d="M 22 38 Q 32 48 42 38" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={20} cy={40} r={2} fill={PAINT.pink} opacity={0.6} />
      <Circle cx={44} cy={40} r={2} fill={PAINT.pink} opacity={0.6} />
    </Svg>
  );
}

export function Mushroom({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M 24 36 Q 24 56 24 60 L 40 60 Q 40 56 40 36 Z" fill="#fff8d6" stroke={INK} strokeWidth={2.5} />
      <Path d="M 8 34 Q 8 12 32 12 Q 56 12 56 34 Q 56 38 32 38 Q 8 38 8 34 Z" fill={PAINT.red} stroke={INK} strokeWidth={2.5} />
      <Circle cx={20} cy={22} r={3.5} fill="#fff8d6" stroke={INK} strokeWidth={1.5} />
      <Circle cx={34} cy={18} r={4} fill="#fff8d6" stroke={INK} strokeWidth={1.5} />
      <Circle cx={46} cy={24} r={3} fill="#fff8d6" stroke={INK} strokeWidth={1.5} />
      <Circle cx={28} cy={48} r={1.5} fill={INK} />
      <Circle cx={36} cy={48} r={1.5} fill={INK} />
      <Path d="M 28 53 Q 32 56 36 53" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Cloud({
  size = 60,
  scale = 1,
}: {
  size?: number;
  scale?: number;
}) {
  const w = 36 * scale;
  const h = 28 * scale;
  return (
    <Svg width={w} height={h} viewBox="-10 -8 46 32">
      <Path
        d="M 0 20 Q -8 18 -8 12 Q -8 6 -2 5 Q 0 -2 8 0 Q 14 -4 20 2 Q 28 0 28 8 Q 32 12 28 18 Q 24 22 16 20 Q 8 24 0 20 Z"
        fill="white"
        stroke={INK}
        strokeWidth={2}
      />
    </Svg>
  );
}

function sparklePath(s: number) {
  return `M 0 ${-s} L ${s * 0.3} ${-s * 0.3} L ${s} 0 L ${s * 0.3} ${s * 0.3} L 0 ${s} L ${-s * 0.3} ${s * 0.3} L ${-s} 0 L ${-s * 0.3} ${-s * 0.3} Z`;
}

export function Earth({ size = 200 }: { size?: number }) {
  // Halo: dotted ring around the planet (sun color)
  const haloDots = Array.from({ length: 36 }).map((_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return {
      cx: 100 + Math.cos(a) * 95,
      cy: 100 + Math.sin(a) * 95,
      r: 1.4 + ((i % 3) === 0 ? 0.6 : 0),
    };
  });

  // Shadow side: dither-style dots on the right hemisphere (blue)
  const shadowDots: { cx: number; cy: number; r: number }[] = [];
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 18; col++) {
      const x = 100 + (col - 8.5) * 4.6;
      const y = 28 + row * 4.6;
      const dx = x - 100;
      const dy = y - 100;
      const dist = Math.hypot(dx, dy);
      if (dist > 76) continue;
      // right hemisphere only, with a soft diagonal cut
      if (dx + dy * 0.25 < 8) continue;
      if ((row + col) % 2 !== 0) continue;
      shadowDots.push({ cx: x, cy: y, r: 1.2 });
    }
  }

  // Orbiting sparkles
  const stars = [20, 100, 175, 250, 320].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    return {
      x: 100 + Math.cos(a) * 95,
      y: 100 + Math.sin(a) * 95,
      s: 5 + (i % 3) * 2,
    };
  });

  return (
    <Svg width={size} height={size} viewBox="-10 -10 220 220">
      {haloDots.map((d, i) => (
        <Circle key={`h${i}`} cx={d.cx} cy={d.cy} r={d.r} fill={PAINT.sun} opacity={0.65} />
      ))}
      <Circle cx={100} cy={100} r={80} fill={PAINT.sky} stroke={INK} strokeWidth={3.5} />
      {shadowDots.map((d, i) => (
        <Circle key={`s${i}`} cx={d.cx} cy={d.cy} r={d.r} fill={PAINT.blue} opacity={0.5} />
      ))}
      <Path
        d="M 50 75 Q 38 82 42 95 Q 48 110 65 108 Q 82 105 78 90 Q 80 76 65 72 Q 55 70 50 75 Z"
        fill={PAINT.grass}
        stroke={INK}
        strokeWidth={2.5}
      />
      <Path
        d="M 110 60 Q 98 65 102 80 Q 110 92 128 88 Q 142 82 138 70 Q 132 58 120 58 Q 113 58 110 60 Z"
        fill={PAINT.grass}
        stroke={INK}
        strokeWidth={2.5}
      />
      <Path
        d="M 95 120 Q 80 125 86 140 Q 96 152 115 148 Q 128 142 125 130 Q 120 118 105 118 Q 98 118 95 120 Z"
        fill={PAINT.grass}
        stroke={INK}
        strokeWidth={2.5}
      />
      <Path
        d="M 145 115 Q 138 120 144 132 Q 154 138 162 130 Q 165 122 158 116 Q 150 113 145 115 Z"
        fill={PAINT.grass}
        stroke={INK}
        strokeWidth={2.5}
      />
      <Ellipse cx={75} cy={65} rx={18} ry={10} fill="white" opacity={0.45} transform="rotate(-25 75 65)" />
      <Circle cx={80} cy={95} r={4} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={120} cy={95} r={4} fill="white" stroke={INK} strokeWidth={1.5} />
      <Circle cx={81} cy={96} r={2} fill={INK} />
      <Circle cx={121} cy={96} r={2} fill={INK} />
      <Path d="M 88 115 Q 100 125 112 115" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={72} cy={108} r={3} fill={PAINT.pink} opacity={0.5} />
      <Circle cx={128} cy={108} r={3} fill={PAINT.pink} opacity={0.5} />
      {stars.map((st, i) => (
        <Path
          key={`st${i}`}
          d={sparklePath(st.s)}
          fill={PAINT.sun}
          stroke={INK}
          strokeWidth={1.2}
          transform={`translate(${st.x} ${st.y})`}
        />
      ))}
    </Svg>
  );
}

export function Sun({ size = 60 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <Path
          key={deg}
          d="M 30 6 L 30 30"
          stroke={PAINT.sun}
          strokeWidth={3.5}
          strokeLinecap="round"
          transform={`rotate(${deg} 30 30)`}
        />
      ))}
      <Circle cx={30} cy={30} r={14} fill={PAINT.sun} stroke={INK} strokeWidth={2.5} />
      <Circle cx={26} cy={28} r={1.5} fill={INK} />
      <Circle cx={34} cy={28} r={1.5} fill={INK} />
      <Path d="M 26 33 Q 30 36 34 33" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Tree({
  size = 80,
  color = PAINT.grass,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Rect x={32} y={50} width={16} height={28} fill={PAINT.brown} stroke={INK} strokeWidth={2.5} />
      <Path
        d="M 12 48 Q 8 22 32 18 Q 40 4 56 16 Q 76 18 72 44 Q 70 56 56 54 Q 40 60 24 54 Q 12 56 12 48 Z"
        fill={color}
        stroke={INK}
        strokeWidth={2.5}
      />
    </Svg>
  );
}
