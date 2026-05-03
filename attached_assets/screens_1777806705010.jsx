/* global React, IOSFrame */
const { useEffect, useRef, useState } = React;

// ============================================================
// PAINT-STYLE PRIMITIVES
// ============================================================
// Whimsy MS-Paint vibe: wobbly hand-drawn paths, pixel dithering,
// crayon scribble fills, googly eyes, paper texture, chunky borders.

const PAPER_BG = "#fdf6e3"; // warm parchment
const INK = "#1a1a1a";
const SKY = "#a8d8f0";
const GRASS = "#7fc77f";
const SUN = "#ffd24a";
const RED = "#e25555";
const PINK = "#f5a3c7";
const PURPLE = "#a78bd9";
const ORANGE = "#f08a3a";
const BLUE = "#5b8def";
const BROWN = "#8b6f47";

// Paper background pattern
const paperBgStyle = {
  background: `
    radial-gradient(circle at 20% 30%, rgba(180,140,100,0.07) 1px, transparent 1px),
    radial-gradient(circle at 70% 60%, rgba(180,140,100,0.06) 1px, transparent 1px),
    radial-gradient(circle at 40% 80%, rgba(180,140,100,0.05) 1px, transparent 1px),
    ${PAPER_BG}
  `,
  backgroundSize: "23px 23px, 31px 31px, 17px 17px, auto",
};

// Wobble path generator — turns straight line into hand-drawn squiggle
function wobble(x1, y1, x2, y2, intensity = 2, segments = 8, seed = 0) {
  const dx = x2 - x1, dy = y2 - y1;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const r = Math.sin((seed + i) * 1.7) * intensity + Math.cos((seed + i) * 2.3) * intensity * 0.6;
    const nx = -dy / Math.hypot(dx, dy);
    const ny = dx / Math.hypot(dx, dy);
    d += ` L ${(px + nx * r).toFixed(1)} ${(py + ny * r).toFixed(1)}`;
  }
  return d;
}

// Wobbly rectangle path
function wobbleRect(x, y, w, h, intensity = 1.8, seed = 1) {
  const seg = 6;
  let d = `M ${x} ${y}`;
  const sides = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
  sides.forEach(([x1, y1, x2, y2], si) => {
    for (let i = 1; i <= seg; i++) {
      const t = i / seg;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      const r = Math.sin((seed + si * 7 + i) * 1.7) * intensity;
      d += ` L ${(px + r).toFixed(1)} ${(py + r * 0.7).toFixed(1)}`;
    }
  });
  return d + " Z";
}

// Dithering pattern (MS-paint style 50% checker)
function DitherPatterns() {
  return (
    <defs>
      <pattern id="dither50" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="transparent" />
        <rect x="0" y="0" width="2" height="2" fill="currentColor" />
        <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      </pattern>
      <pattern id="dither25" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="transparent" />
        <rect x="0" y="0" width="2" height="2" fill="currentColor" />
      </pattern>
      <pattern id="crayon" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="currentColor" />
        <line x1="0" y1="0" x2="6" y2="6" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
        <line x1="6" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
      </pattern>
      <filter id="rough">
        <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="1.2" />
      </filter>
    </defs>
  );
}

// Wobbly box that wraps content
function WobbleBox({ children, fill = "#fff", stroke = INK, sw = 3, style = {}, w = 280, h = 100, seed = 1 }) {
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(4, 4, w - 8, h - 8, 1.5, seed)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ position: "relative", padding: 12, width: "100%", height: "100%", boxSizing: "border-box" }}>{children}</div>
    </div>
  );
}

// Hand-lettered heading (chunky outline + slight rotation)
const handFont = `"Caveat", "Marker Felt", "Comic Sans MS", cursive`;
const labelFont = `"Patrick Hand", "Marker Felt", "Comic Sans MS", cursive`;

// Crayon-stroke underline for emphasis
function CrayonUnderline({ width = 120, color = SUN, y = 0 }) {
  return (
    <svg width={width} height="10" style={{ display: "block", marginTop: -2 }}>
      <path d={wobble(2, 5, width - 2, 6, 2, 10, 4)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ============================================================
// CRITTERS — hand-drawn googly creatures
// ============================================================

function Bee({ size = 64, wobbleSeed = 1 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
      {/* wings */}
      <ellipse cx="22" cy="20" rx="11" ry="8" fill="#e0f4ff" stroke={INK} strokeWidth="2" opacity="0.85" />
      <ellipse cx="42" cy="20" rx="11" ry="8" fill="#e0f4ff" stroke={INK} strokeWidth="2" opacity="0.85" />
      {/* body */}
      <ellipse cx="32" cy="36" rx="18" ry="14" fill={SUN} stroke={INK} strokeWidth="2.5" />
      {/* stripes */}
      <path d={wobble(20, 32, 44, 32, 1, 8, wobbleSeed)} stroke={INK} strokeWidth="3" fill="none" />
      <path d={wobble(22, 40, 42, 40, 1, 8, wobbleSeed + 2)} stroke={INK} strokeWidth="3" fill="none" />
      {/* eyes */}
      <circle cx="26" cy="32" r="3.5" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="36" cy="32" r="3.5" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="26.5" cy="32.5" r="1.5" fill={INK} />
      <circle cx="36.5" cy="32.5" r="1.5" fill={INK} />
      {/* smile */}
      <path d="M 28 40 Q 31 43 34 40" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {/* antennae */}
      <path d="M 26 22 Q 22 14 20 12" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 38 22 Q 42 14 44 12" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="11" r="2" fill={INK} />
      <circle cx="44" cy="11" r="2" fill={INK} />
    </svg>
  );
}

function Bird({ size = 64, color = BLUE }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
      {/* body */}
      <ellipse cx="30" cy="36" rx="18" ry="14" fill={color} stroke={INK} strokeWidth="2.5" />
      {/* belly */}
      <ellipse cx="28" cy="40" rx="9" ry="6" fill="#fff8d6" stroke="none" />
      {/* wing */}
      <path d="M 28 30 Q 18 28 16 38 Q 24 40 32 36 Z" fill={color} stroke={INK} strokeWidth="2" filter="brightness(0.85)" />
      <path d="M 28 30 Q 18 28 16 38 Q 24 40 32 36 Z" fill="rgba(0,0,0,0.15)" stroke={INK} strokeWidth="2" />
      {/* head */}
      <circle cx="44" cy="28" r="11" fill={color} stroke={INK} strokeWidth="2.5" />
      {/* beak */}
      <path d="M 53 28 L 60 26 L 53 31 Z" fill={ORANGE} stroke={INK} strokeWidth="1.5" />
      {/* eye */}
      <circle cx="46" cy="26" r="2.5" fill="white" stroke={INK} strokeWidth="1.2" />
      <circle cx="46.5" cy="26.3" r="1.3" fill={INK} />
      {/* legs */}
      <path d="M 28 50 L 26 58" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M 34 50 L 36 58" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M 24 58 L 28 58 M 34 58 L 38 58" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Flower({ size = 64, petal = PINK }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
      {/* stem */}
      <path d="M 32 64 Q 30 50 32 36" stroke={GRASS} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 32 50 Q 38 46 42 48" stroke={GRASS} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="48" rx="5" ry="3" fill={GRASS} stroke={INK} strokeWidth="1.5" transform="rotate(20 42 48)" />
      {/* petals */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <ellipse key={i} cx="32" cy="14" rx="7" ry="11" fill={petal} stroke={INK} strokeWidth="2" transform={`rotate(${deg} 32 26)`} />
      ))}
      {/* center */}
      <circle cx="32" cy="26" r="6" fill={SUN} stroke={INK} strokeWidth="2" />
      <circle cx="30" cy="24" r="1.2" fill={INK} />
      <circle cx="34" cy="24" r="1.2" fill={INK} />
      <path d="M 30 28 Q 32 30 34 28" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Frog({ size = 64 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
      {/* body */}
      <ellipse cx="32" cy="42" rx="22" ry="15" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      {/* belly */}
      <ellipse cx="32" cy="46" rx="13" ry="8" fill="#d6f5d6" />
      {/* legs back */}
      <ellipse cx="12" cy="48" rx="6" ry="9" fill={GRASS} stroke={INK} strokeWidth="2" transform="rotate(-20 12 48)" />
      <ellipse cx="52" cy="48" rx="6" ry="9" fill={GRASS} stroke={INK} strokeWidth="2" transform="rotate(20 52 48)" />
      {/* eyes (huge) */}
      <circle cx="22" cy="22" r="9" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      <circle cx="42" cy="22" r="9" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      <circle cx="22" cy="22" r="6" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="42" cy="22" r="6" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="23" cy="23" r="3" fill={INK} />
      <circle cx="43" cy="23" r="3" fill={INK} />
      <circle cx="24" cy="22" r="1" fill="white" />
      <circle cx="44" cy="22" r="1" fill="white" />
      {/* mouth */}
      <path d="M 22 38 Q 32 48 42 38" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="40" r="2" fill={PINK} opacity="0.6" />
      <circle cx="44" cy="40" r="2" fill={PINK} opacity="0.6" />
    </svg>
  );
}

function Mushroom({ size = 64 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ overflow: "visible" }}>
      {/* stem */}
      <path d="M 24 36 Q 24 56 24 60 L 40 60 Q 40 56 40 36 Z" fill="#fff8d6" stroke={INK} strokeWidth="2.5" />
      {/* cap */}
      <path d="M 8 34 Q 8 12 32 12 Q 56 12 56 34 Q 56 38 32 38 Q 8 38 8 34 Z" fill={RED} stroke={INK} strokeWidth="2.5" />
      {/* spots */}
      <circle cx="20" cy="22" r="3.5" fill="#fff8d6" stroke={INK} strokeWidth="1.5" />
      <circle cx="34" cy="18" r="4" fill="#fff8d6" stroke={INK} strokeWidth="1.5" />
      <circle cx="46" cy="24" r="3" fill="#fff8d6" stroke={INK} strokeWidth="1.5" />
      <circle cx="40" cy="30" r="2.5" fill="#fff8d6" stroke={INK} strokeWidth="1.5" />
      {/* face */}
      <circle cx="28" cy="48" r="1.5" fill={INK} />
      <circle cx="36" cy="48" r="1.5" fill={INK} />
      <path d="M 28 53 Q 32 56 36 53" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Earth({ size = 200 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      {/* halo dither */}
      <g style={{ color: SUN }}>
        <circle cx="100" cy="100" r="98" fill="url(#dither25)" opacity="0.6" />
      </g>
      {/* ocean */}
      <circle cx="100" cy="100" r="80" fill={SKY} stroke={INK} strokeWidth="3.5" />
      {/* dither shadow */}
      <g style={{ color: BLUE }}>
        <path d="M 100 20 A 80 80 0 0 1 180 100 A 80 80 0 0 1 100 180 Z" fill="url(#dither50)" opacity="0.5" />
      </g>
      {/* continents (blob shapes) */}
      <path d="M 50 75 Q 38 82 42 95 Q 48 110 65 108 Q 82 105 78 90 Q 80 76 65 72 Q 55 70 50 75 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      <path d="M 110 60 Q 98 65 102 80 Q 110 92 128 88 Q 142 82 138 70 Q 132 58 120 58 Q 113 58 110 60 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      <path d="M 95 120 Q 80 125 86 140 Q 96 152 115 148 Q 128 142 125 130 Q 120 118 105 118 Q 98 118 95 120 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      <path d="M 145 115 Q 138 120 144 132 Q 154 138 162 130 Q 165 122 158 116 Q 150 113 145 115 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
      {/* shine highlight */}
      <ellipse cx="75" cy="65" rx="18" ry="10" fill="white" opacity="0.45" transform="rotate(-25 75 65)" />
      {/* face */}
      <circle cx="80" cy="95" r="4" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="120" cy="95" r="4" fill="white" stroke={INK} strokeWidth="1.5" />
      <circle cx="81" cy="96" r="2" fill={INK} />
      <circle cx="121" cy="96" r="2" fill={INK} />
      <path d="M 88 115 Q 100 125 112 115" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="72" cy="108" r="3" fill={PINK} opacity="0.5" />
      <circle cx="128" cy="108" r="3" fill={PINK} opacity="0.5" />

      {/* orbiting stars */}
      <g>
        {[20, 100, 175, 250, 320].map((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const r = 95;
          const x = 100 + Math.cos(a) * r;
          const y = 100 + Math.sin(a) * r;
          return <Sparkle key={i} x={x} y={y} size={6 + (i % 3) * 2} />;
        })}
      </g>
    </svg>
  );
}

function Sparkle({ x, y, size = 8, color = SUN }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M 0 ${-size} L ${size * 0.3} ${-size * 0.3} L ${size} 0 L ${size * 0.3} ${size * 0.3} L 0 ${size} L ${-size * 0.3} ${size * 0.3} L ${-size} 0 L ${-size * 0.3} ${-size * 0.3} Z`} fill={color} stroke={INK} strokeWidth="1.2" />
    </g>
  );
}

function Cloud({ x = 0, y = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M 0 20 Q -8 18 -8 12 Q -8 6 -2 5 Q 0 -2 8 0 Q 14 -4 20 2 Q 28 0 28 8 Q 32 12 28 18 Q 24 22 16 20 Q 8 24 0 20 Z" fill="white" stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Sun({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ overflow: "visible" }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <line key={i} x1="30" y1="30" x2="30" y2="6" stroke={SUN} strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${deg} 30 30)`} />
      ))}
      <circle cx="30" cy="30" r="14" fill={SUN} stroke={INK} strokeWidth="2.5" />
      <circle cx="26" cy="28" r="1.5" fill={INK} />
      <circle cx="34" cy="28" r="1.5" fill={INK} />
      <path d="M 26 33 Q 30 36 34 33" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Tree({ size = 80, color = GRASS }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ overflow: "visible" }}>
      <rect x="32" y="50" width="16" height="28" fill={BROWN} stroke={INK} strokeWidth="2.5" />
      <path d="M 34 56 L 34 70 M 40 52 L 40 76 M 46 56 L 46 72" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <path d="M 12 48 Q 8 22 32 18 Q 40 4 56 16 Q 76 18 72 44 Q 70 56 56 54 Q 40 60 24 54 Q 12 56 12 48 Z" fill={color} stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

// Scribble line connector with arrow
function Scribble({ x1, y1, x2, y2, color = INK, sw = 2.5, dashed = false, arrow = true, intensity = 3, seed = 1 }) {
  const id = `arr-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <g>
      {arrow && (
        <defs>
          <marker id={id} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 Z" fill={color} />
          </marker>
        </defs>
      )}
      <path
        d={wobble(x1, y1, x2, y2, intensity, 12, seed)}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={dashed ? "5 4" : "none"}
        markerEnd={arrow ? `url(#${id})` : undefined}
      />
    </g>
  );
}

// ============================================================
// SCREEN: ONBOARDING — "Nature around you is changing"
// ============================================================

function Screen_Onboarding() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      {/* Sky band */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: `linear-gradient(180deg, #c4e5f5 0%, #fdf6e3 100%)` }} />
      {/* Clouds */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 390 844" preserveAspectRatio="none">
        <Cloud x={50} y={120} scale={1.3} />
        <Cloud x={260} y={80} scale={1} />
        <Cloud x={300} y={200} scale={0.8} />
        {/* sparkle stars */}
        <Sparkle x={60} y={180} size={6} color={SUN} />
        <Sparkle x={330} y={150} size={8} color={PINK} />
        <Sparkle x={200} y={90} size={5} color={PURPLE} />
      </svg>

      <div style={{ position: "relative", padding: "80px 28px 40px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%", boxSizing: "border-box" }}>
        {/* Earth in middle of page */}
        <div style={{ marginTop: 60, position: "relative" }}>
          <Earth size={220} />
        </div>

        {/* Title */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <h1 style={{ fontFamily: handFont, fontSize: 38, color: INK, margin: 0, lineHeight: 1, transform: "rotate(-1deg)" }}>
            Nature around you
          </h1>
          <h1 style={{ fontFamily: handFont, fontSize: 38, color: INK, margin: "4px 0 0", lineHeight: 1, transform: "rotate(1.5deg)" }}>
            is <span style={{ color: RED, textDecoration: "underline wavy" }}>changing</span>.
          </h1>
          <p style={{ fontFamily: labelFont, fontSize: 20, color: "#4a4a4a", margin: "18px 0 0", transform: "rotate(-0.3deg)" }}>
            Most people never notice it.
          </p>
        </div>

        {/* dots */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", marginBottom: 24 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <svg key={i} width="14" height="14">
              <circle cx="7" cy="7" r="5" fill={i === 0 ? INK : "transparent"} stroke={INK} strokeWidth="2" />
            </svg>
          ))}
        </div>

        {/* CTA button — wobbly */}
        <div style={{ position: "relative", width: 260, height: 60 }}>
          <svg width="260" height="60" style={{ position: "absolute", inset: 0 }}>
            <path d={wobbleRect(4, 4, 252, 52, 1.8, 5)} fill={GRASS} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d={wobble(20, 14, 240, 14, 0.8, 8, 9)} stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: handFont, fontSize: 24, color: INK }}>
            Show me my world →
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: HOME — Map with hand-drawn species
// ============================================================

function Screen_Home() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "60px 20px 12px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: handFont, fontSize: 30, color: INK, lineHeight: 1, transform: "rotate(-1deg)" }}>
              Your Life Web
            </div>
            <CrayonUnderline width={170} color={SUN} />
            <div style={{ fontFamily: labelFont, fontSize: 15, color: "#5a5a5a", marginTop: 6 }}>
              📍 Berkeley, CA · 10km
            </div>
          </div>
          <svg width="44" height="44">
            <path d={wobbleRect(2, 2, 40, 40, 1.5, 3)} fill="white" stroke={INK} strokeWidth="2.5" />
            <text x="22" y="29" textAnchor="middle" fontSize="20" fontFamily={handFont}>☀</text>
          </svg>
        </div>
      </div>

      {/* MAP */}
      <div style={{ margin: "0 16px", position: "relative" }}>
        <svg width="100%" viewBox="0 0 360 320" style={{ display: "block" }}>
          <DitherPatterns />
          {/* map paper */}
          <path d={wobbleRect(4, 4, 352, 312, 2, 11)} fill="#e8f4d6" stroke={INK} strokeWidth="3" />
          {/* terrain dither */}
          <g style={{ color: GRASS }}>
            <path d="M 40 60 Q 90 40 150 70 Q 210 100 280 80 Q 320 75 340 100 L 340 280 L 20 280 Z" fill="url(#dither25)" opacity="0.7" />
          </g>
          {/* river */}
          <path d={wobble(20, 180, 340, 220, 5, 18, 5)} stroke={SKY} strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d={wobble(20, 180, 340, 220, 5, 18, 5)} stroke={BLUE} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* trees scattered */}
          <g transform="translate(60 100)"><Tree size={50} color="#5fae5f" /></g>
          <g transform="translate(240 70)"><Tree size={56} color={GRASS} /></g>
          <g transform="translate(280 240)"><Tree size={48} color="#5fae5f" /></g>
          <g transform="translate(40 240)"><Tree size={44} color={GRASS} /></g>

          {/* Radius circle dashed */}
          <circle cx="180" cy="170" r="120" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
          <circle cx="180" cy="170" r="120" fill={RED} opacity="0.06" />

          {/* You-are-here pin */}
          <g transform="translate(180 170)">
            <ellipse cx="0" cy="14" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
            <path d="M -10 -16 Q -10 -28 0 -28 Q 10 -28 10 -16 Q 10 -8 0 6 Q -10 -8 -10 -16 Z" fill={RED} stroke={INK} strokeWidth="2.5" />
            <circle cx="0" cy="-16" r="4" fill="white" stroke={INK} strokeWidth="1.5" />
          </g>

          {/* Species pins on map */}
          <g transform="translate(95 110)"><Bee size={48} /></g>
          <g transform="translate(260 100)"><Bird size={48} color={BLUE} /></g>
          <g transform="translate(75 220)"><Frog size={46} /></g>
          <g transform="translate(255 220)"><Flower size={46} /></g>
          <g transform="translate(155 90)"><Mushroom size={42} /></g>
          <g transform="translate(295 175)"><Bird size={42} color={ORANGE} /></g>

          {/* hand label */}
          <g transform="translate(20 30)">
            <text fontFamily={handFont} fontSize="14" fill={INK} transform="rotate(-3)">~ creatures spotted near you ~</text>
          </g>
          <Scribble x1={120} y1={45} x2={155} y2={75} color={INK} sw={1.5} arrow seed={3} intensity={2} />
        </svg>
      </div>

      {/* stats row */}
      <div style={{ display: "flex", gap: 10, padding: "16px 16px 0" }}>
        {[
          { n: 47, l: "species", c: GRASS, e: "🌱" },
          { n: 12, l: "active now", c: SUN, e: "✨" },
          { n: 3, l: "at risk", c: RED, e: "!" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, position: "relative", height: 80 }}>
            <svg width="100%" height="80" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none" viewBox="0 0 110 80">
              <path d={wobbleRect(3, 3, 104, 74, 1.5, i + 2)} fill="white" stroke={INK} strokeWidth="2.5" />
            </svg>
            <div style={{ position: "absolute", inset: 0, padding: "8px 10px", boxSizing: "border-box" }}>
              <div style={{ fontFamily: handFont, fontSize: 28, color: s.c, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: labelFont, fontSize: 13, color: "#5a5a5a", marginTop: 2 }}>{s.l} {s.e}</div>
            </div>
          </div>
        ))}
      </div>

      {/* whats happening */}
      <div style={{ padding: "16px 16px 80px" }}>
        <div style={{ fontFamily: handFont, fontSize: 22, color: INK, transform: "rotate(-0.5deg)" }}>
          What's happening here
        </div>
        <CrayonUnderline width={200} color={PINK} />
        <div style={{ marginTop: 12, position: "relative", height: 64 }}>
          <svg width="100%" height="64" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none" viewBox="0 0 360 64">
            <path d={wobbleRect(3, 3, 354, 58, 1.5, 13)} fill="#fff8d6" stroke={INK} strokeWidth="2.5" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 14px", gap: 12 }}>
            <div style={{ fontSize: 28 }}>🐝</div>
            <div>
              <div style={{ fontFamily: labelFont, fontSize: 15, color: INK, fontWeight: 600 }}>Pollinators are buzzing!</div>
              <div style={{ fontFamily: labelFont, fontSize: 13, color: "#5a5a5a" }}>14 bee sightings this week</div>
            </div>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <TabBar active={0} />
    </div>
  );
}

function TabBar({ active = 0 }) {
  const tabs = [
    { i: "🌍", l: "Home" },
    { i: "🌿", l: "Species" },
    { i: "📡", l: "Signals" },
    { i: "📜", l: "Reports" },
    { i: "🙂", l: "You" },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88 }}>
      <svg width="100%" height="88" viewBox="0 0 390 88" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(4, 4, 382, 80, 2, 21)} fill="white" stroke={INK} strokeWidth="3" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 14px 26px" }}>
        {tabs.map((t, i) => (
          <div key={i} style={{ textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: 24, transform: i === active ? "scale(1.2) rotate(-5deg)" : "none", filter: i === active ? "none" : "grayscale(0.4)" }}>{t.i}</div>
            <div style={{ fontFamily: labelFont, fontSize: 11, color: i === active ? INK : "#888", fontWeight: i === active ? 700 : 400 }}>{t.l}</div>
            {i === active && (
              <svg width="36" height="6" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -6 }}>
                <path d={wobble(2, 3, 34, 3, 1, 6, 7)} stroke={SUN} strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: SPECIES LIST
// ============================================================

function SpeciesRow({ critter, name, sci, count, role, roleColor, seed = 1 }) {
  return (
    <div style={{ position: "relative", height: 88, marginBottom: 12 }}>
      <svg width="100%" height="88" viewBox="0 0 358 88" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(3, 3, 352, 82, 1.5, seed)} fill="white" stroke={INK} strokeWidth="2.5" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 14px", gap: 14 }}>
        <div style={{ width: 64, height: 64, position: "relative" }}>
          <svg width="64" height="64" style={{ position: "absolute", inset: 0 }}>
            <circle cx="32" cy="32" r="30" fill="#fff8d6" stroke={INK} strokeWidth="2" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{critter}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: handFont, fontSize: 22, color: INK, lineHeight: 1 }}>{name}</div>
          <div style={{ fontFamily: labelFont, fontSize: 12, color: "#777", fontStyle: "italic" }}>{sci}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <div style={{ fontFamily: labelFont, fontSize: 12, color: "#5a5a5a" }}>👀 {count}</div>
            <div style={{ position: "relative" }}>
              <svg width="80" height="20">
                <path d={wobbleRect(2, 2, 76, 16, 1, seed + 5)} fill={roleColor} fillOpacity="0.25" stroke={roleColor} strokeWidth="1.5" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: labelFont, fontSize: 11, color: roleColor === SUN ? "#8a6a00" : roleColor, fontWeight: 700 }}>{role}</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#aaa" }}>›</div>
      </div>
    </div>
  );
}

function Screen_Species() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      <div style={{ padding: "60px 16px 12px" }}>
        <div style={{ fontFamily: handFont, fontSize: 32, color: INK, transform: "rotate(-1deg)" }}>
          Local Species
        </div>
        <CrayonUnderline width={180} color={GRASS} />
        <div style={{ fontFamily: labelFont, fontSize: 14, color: "#5a5a5a", marginTop: 6 }}>
          47 critters within 10km
        </div>

        {/* search */}
        <div style={{ marginTop: 14, position: "relative", height: 48 }}>
          <svg width="100%" height="48" viewBox="0 0 358 48" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            <path d={wobbleRect(3, 3, 352, 42, 1.5, 31)} fill="white" stroke={INK} strokeWidth="2.5" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, fontFamily: labelFont, fontSize: 16, color: "#999" }}>
            <span style={{ fontSize: 18 }}>🔍</span> search the wild...
          </div>
        </div>

        {/* filter chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflow: "auto" }}>
          {[
            { l: "All", c: GRASS, n: 47, active: true },
            { l: "🐦 Birds", c: BLUE, n: 18 },
            { l: "🌸 Plants", c: PINK, n: 12 },
            { l: "🐝 Bugs", c: SUN, n: 9 },
            { l: "🍄 Fungi", c: PURPLE, n: 8 },
          ].map((f, i) => (
            <div key={i} style={{ position: "relative", height: 34, flexShrink: 0 }}>
              <svg width={f.l.length * 8 + 50} height="34" style={{ position: "absolute", inset: 0 }}>
                <path d={wobbleRect(2, 2, f.l.length * 8 + 46, 30, 1.2, i + 40)} fill={f.active ? f.c : "white"} stroke={INK} strokeWidth="2" />
              </svg>
              <div style={{ position: "relative", padding: "0 14px", height: "100%", display: "flex", alignItems: "center", fontFamily: labelFont, fontSize: 14, color: f.active ? INK : "#444", fontWeight: 700 }}>
                {f.l} <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>{f.n}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 16px 100px", overflow: "auto", height: "calc(100% - 200px)" }}>
        <SpeciesRow critter={<Bee size={48} />} name="Honey Bee" sci="Apis mellifera" count="142 nearby" role="POLLINATOR" roleColor={SUN} seed={1} />
        <SpeciesRow critter={<Bird size={48} color={BLUE} />} name="Western Bluebird" sci="Sialia mexicana" count="89 nearby" role="SEED-SPREADER" roleColor={BLUE} seed={3} />
        <SpeciesRow critter={<Flower size={48} petal={PINK} />} name="California Poppy" sci="Eschscholzia californica" count="201 nearby" role="PRODUCER" roleColor={GRASS} seed={5} />
        <SpeciesRow critter={<Frog size={48} />} name="Pacific Tree Frog" sci="Pseudacris regilla" count="34 nearby" role="INDICATOR" roleColor={"#22a3c7"} seed={7} />
        <SpeciesRow critter={<Mushroom size={48} />} name="Fly Agaric" sci="Amanita muscaria" count="12 nearby" role="DECOMPOSER" roleColor={PURPLE} seed={9} />
        <SpeciesRow critter={<Bird size={48} color={ORANGE} />} name="Anna's Hummingbird" sci="Calypte anna" count="56 nearby" role="POLLINATOR" roleColor={SUN} seed={11} />
      </div>

      <TabBar active={1} />
    </div>
  );
}

// ============================================================
// SCREEN: SPECIES DETAIL
// ============================================================

function Screen_SpeciesDetail() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      {/* hero */}
      <div style={{ height: 280, background: `linear-gradient(180deg, ${SUN} 0%, #ffe89a 100%)`, position: "relative", borderBottom: `3px solid ${INK}` }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 390 280" preserveAspectRatio="xMidYMid slice">
          <DitherPatterns />
          {/* dither sun rays */}
          <g style={{ color: ORANGE }}>
            <circle cx="195" cy="100" r="200" fill="url(#dither25)" opacity="0.4" />
          </g>
          <Cloud x={50} y={50} scale={1.1} />
          <Cloud x={300} y={80} scale={0.9} />
          <Sparkle x={80} y={200} size={6} color={PINK} />
          <Sparkle x={320} y={180} size={8} color={BLUE} />
          <Sparkle x={200} y={50} size={7} color={RED} />
          {/* big bee in middle */}
          <g transform="translate(135 70) scale(2)"><Bee size={60} /></g>
        </svg>
        <div style={{ position: "absolute", top: 56, left: 16, width: 40, height: 40 }}>
          <svg width="40" height="40">
            <path d={wobbleRect(2, 2, 36, 36, 1.5, 99)} fill="white" stroke={INK} strokeWidth="2.5" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>←</div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ fontFamily: handFont, fontSize: 36, color: INK, lineHeight: 1, transform: "rotate(-0.5deg)" }}>Honey Bee</div>
        <div style={{ fontFamily: labelFont, fontSize: 14, color: "#777", fontStyle: "italic", marginTop: 4 }}>Apis mellifera</div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[{ l: "🐝 Insect", c: SUN }, { l: "Pollinator", c: PINK }, { l: "Common", c: GRASS }].map((b, i) => (
            <div key={i} style={{ position: "relative", height: 28 }}>
              <svg width={b.l.length * 7 + 22} height="28" style={{ position: "absolute", inset: 0 }}>
                <path d={wobbleRect(2, 2, b.l.length * 7 + 18, 24, 1, i + 50)} fill={b.c} fillOpacity="0.3" stroke={b.c === SUN ? "#c9a72b" : b.c} strokeWidth="2" />
              </svg>
              <div style={{ position: "relative", padding: "0 11px", height: "100%", display: "flex", alignItems: "center", fontFamily: labelFont, fontSize: 13, color: INK, fontWeight: 700 }}>{b.l}</div>
            </div>
          ))}
        </div>

        {/* stats */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {[
            { n: "142", l: "sightings", c: GRASS },
            { n: "Mar", l: "first seen", c: BLUE },
            { n: "2d", l: "ago", c: SUN },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, position: "relative", height: 64 }}>
              <svg width="100%" height="64" preserveAspectRatio="none" viewBox="0 0 110 64" style={{ position: "absolute", inset: 0 }}>
                <path d={wobbleRect(2, 2, 106, 60, 1.2, i + 60)} fill="white" stroke={INK} strokeWidth="2.5" />
              </svg>
              <div style={{ position: "absolute", inset: 0, padding: "8px", boxSizing: "border-box", textAlign: "center" }}>
                <div style={{ fontFamily: handFont, fontSize: 22, color: s.c, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: labelFont, fontSize: 11, color: "#666", marginTop: 4 }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* timeline chart */}
        <div style={{ marginTop: 20, fontFamily: handFont, fontSize: 22, color: INK }}>~ activity timeline ~</div>
        <div style={{ marginTop: 8, position: "relative", height: 130 }}>
          <svg width="100%" height="130" viewBox="0 0 358 130" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            <path d={wobbleRect(3, 3, 352, 124, 1.5, 71)} fill="white" stroke={INK} strokeWidth="2.5" />
            {/* bars */}
            {[20, 35, 28, 50, 70, 90, 110, 95, 80, 60, 40, 30].map((h, i) => {
              const x = 18 + i * 28;
              return (
                <g key={i}>
                  <path d={wobbleRect(x, 110 - h, 18, h, 0.8, i + 80)} fill={i >= 5 && i <= 7 ? SUN : `${SUN}80`} stroke={INK} strokeWidth="1.5" />
                </g>
              );
            })}
            {/* baseline */}
            <path d={wobble(10, 112, 350, 112, 0.5, 20, 9)} stroke={INK} strokeWidth="1.5" fill="none" />
            <text x="18" y="125" fontFamily={labelFont} fontSize="10" fill="#666">J F M A M J J A S O N D</text>
          </svg>
        </div>

        {/* big CTA */}
        <div style={{ marginTop: 20, position: "relative", height: 76 }}>
          <svg width="100%" height="76" viewBox="0 0 358 76" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            <path d={wobbleRect(3, 3, 352, 70, 2, 17)} fill={RED} stroke={INK} strokeWidth="3" />
            <g style={{ color: "white" }}>
              <path d={wobbleRect(3, 3, 352, 70, 2, 17)} fill="url(#dither25)" opacity="0.15" />
            </g>
          </svg>
          <div style={{ position: "absolute", inset: 0, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36 }}>💥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: handFont, fontSize: 20, color: "white", lineHeight: 1 }}>What if it disappears?</div>
              <div style={{ fontFamily: labelFont, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>See the chain reaction →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: IMPACT CASCADE
// ============================================================

function Screen_Impact() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#fdf6e3", overflow: "hidden" }}>
      <div style={{ ...paperBgStyle, position: "absolute", inset: 0 }} />

      <div style={{ position: "relative", padding: "60px 20px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="40" height="40">
            <path d={wobbleRect(2, 2, 36, 36, 1.5, 1)} fill="white" stroke={INK} strokeWidth="2.5" />
          </svg>
          <div>
            <div style={{ fontFamily: labelFont, fontSize: 11, color: RED, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>If this disappears...</div>
            <div style={{ fontFamily: handFont, fontSize: 28, color: INK, lineHeight: 1 }}>The Honey Bee</div>
          </div>
        </div>

        {/* big chain illustration */}
        <div style={{ marginTop: 24, position: "relative", height: 540 }}>
          <svg width="100%" height="540" viewBox="0 0 350 540" style={{ position: "absolute", inset: 0 }}>
            <DitherPatterns />

            {/* paper card behind */}
            <path d={wobbleRect(8, 8, 334, 524, 2, 5)} fill="#fff8d6" stroke={INK} strokeWidth="3" />

            {/* node 1 - Bee */}
            <g transform="translate(175 70)">
              <circle cx="0" cy="0" r="48" fill="white" stroke={RED} strokeWidth="3" strokeDasharray="3 3" />
              <g transform="translate(-32 -32)"><Bee size={64} /></g>
              <text x="0" y="68" fontFamily={handFont} fontSize="18" fill={INK} textAnchor="middle">🐝 BEES vanish</text>
            </g>

            <Scribble x1={155} y1={155} x2={120} y2={205} color={RED} sw={2.5} arrow seed={1} />
            <text x="65" y="195" fontFamily={labelFont} fontSize="12" fill={RED} fontStyle="italic">no more pollination</text>

            {/* node 2 - Flowers */}
            <g transform="translate(85 245)">
              <circle cx="0" cy="0" r="42" fill="white" stroke={INK} strokeWidth="2.5" />
              <g transform="translate(-32 -32)"><Flower size={64} petal={PINK} /></g>
              <text x="0" y="60" fontFamily={handFont} fontSize="16" fill={INK} textAnchor="middle">🌸 fewer flowers</text>
            </g>

            <Scribble x1={130} y1={245} x2={230} y2={245} color={INK} sw={2.5} arrow seed={2} />
            <text x="180" y="235" fontFamily={labelFont} fontSize="12" fill="#666" fontStyle="italic" textAnchor="middle">means...</text>

            {/* node 3 - Fruit */}
            <g transform="translate(265 245)">
              <circle cx="0" cy="0" r="42" fill="white" stroke={INK} strokeWidth="2.5" />
              <g transform="translate(-22 -22)">
                <circle cx="22" cy="22" r="20" fill={RED} stroke={INK} strokeWidth="2" />
                <path d="M 22 4 L 24 -2 L 28 -4" stroke={GRASS} strokeWidth="2.5" fill="none" />
                <ellipse cx="16" cy="16" rx="4" ry="2" fill="white" opacity="0.5" />
              </g>
              <text x="0" y="60" fontFamily={handFont} fontSize="16" fill={INK} textAnchor="middle">🍎 less fruit</text>
            </g>

            <Scribble x1={265} y1={290} x2={265} y2={355} color={INK} sw={2.5} arrow seed={3} />
            <text x="285" y="328" fontFamily={labelFont} fontSize="12" fill="#666" fontStyle="italic">no food...</text>

            {/* node 4 - Bird */}
            <g transform="translate(265 400)">
              <circle cx="0" cy="0" r="42" fill="white" stroke={INK} strokeWidth="2.5" opacity="0.7" />
              <g transform="translate(-32 -32)" opacity="0.5"><Bird size={64} color={BLUE} /></g>
              <text x="0" y="60" fontFamily={handFont} fontSize="16" fill="#888" textAnchor="middle">🐦 birds leave</text>
            </g>

            <Scribble x1={225} y1={400} x2={125} y2={400} color={INK} sw={2.5} arrow seed={4} />
            <text x="175" y="390" fontFamily={labelFont} fontSize="12" fill="#666" fontStyle="italic" textAnchor="middle">and the web...</text>

            {/* node 5 - sad earth */}
            <g transform="translate(85 400)">
              <circle cx="0" cy="0" r="48" fill="#c8d8d8" stroke={INK} strokeWidth="3" />
              <g transform="translate(-30 -30) scale(0.3)"><Earth size={200} /></g>
              {/* sad face overlay */}
              <circle cx="-12" cy="-5" r="3" fill={INK} />
              <circle cx="12" cy="-5" r="3" fill={INK} />
              <path d="M -12 14 Q 0 6 12 14" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M -22 -22 L -28 -16" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M -28 -22 L -22 -16" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
              <text x="0" y="68" fontFamily={handFont} fontSize="16" fill={INK} textAnchor="middle">~ unravels ~</text>
            </g>

            {/* dramatic exclamation */}
            <g transform="translate(295 95) rotate(15)">
              <Sparkle x={0} y={0} size={14} color={RED} />
            </g>
            <g transform="translate(60 110) rotate(-10)">
              <Sparkle x={0} y={0} size={10} color={SUN} />
            </g>
          </svg>
        </div>

        {/* credibility */}
        <div style={{ marginTop: 16, padding: 12, background: "rgba(91,141,239,0.1)", border: `2px dashed ${BLUE}`, borderRadius: 0, fontFamily: labelFont, fontSize: 12, color: "#444", lineHeight: 1.5 }}>
          ℹ️ This is a friendly sketch of how species connect — a simplified ecology model based on iNaturalist observations near you. Not a scientific prediction!
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: SIGNALS
// ============================================================

function Screen_Signals() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      <div style={{ padding: "60px 16px 12px" }}>
        <div style={{ fontFamily: handFont, fontSize: 32, color: INK, transform: "rotate(-1deg)" }}>
          Signals
        </div>
        <CrayonUnderline width={120} color={BLUE} />
        <div style={{ fontFamily: labelFont, fontSize: 13, color: "#5a5a5a", marginTop: 6, lineHeight: 1.4 }}>
          What's shifting in your neck of the woods.
        </div>
      </div>

      <div style={{ padding: "12px 16px 100px", overflow: "auto", maxHeight: "calc(100% - 200px)" }}>
        {/* ↘ DECLINING */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <svg width="28" height="28">
            <path d={wobble(4, 6, 24, 24, 1, 6, 1)} stroke={RED} strokeWidth="3" fill="none" strokeLinecap="round" markerEnd="" />
            <path d="M 24 24 L 20 20 M 24 24 L 24 18" stroke={RED} strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ fontFamily: handFont, fontSize: 22, color: RED }}>going quiet</div>
        </div>
        <SignalCard
          critter={<Frog size={56} />}
          title="Pacific Tree Frog"
          msg="quieter compared to past 3 years"
          stat="-58%"
          color={RED}
          chart={[80, 70, 75, 60, 50, 35, 25, 30, 28, 22, 18, 15]}
          seed={1}
        />
        <SignalCard
          critter={<Bee size={56} />}
          title="Bumble Bee"
          msg="seen less than this time last year"
          stat="-32%"
          color={RED}
          chart={[60, 70, 65, 80, 55, 50, 48, 45, 42, 40, 38, 35]}
          seed={3}
        />

        {/* ✨ NEW ARRIVALS */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <div style={{ fontFamily: handFont, fontSize: 22, color: GRASS }}>new arrivals</div>
        </div>
        <SignalCard
          critter={<Bird size={56} color={ORANGE} />}
          title="Anna's Hummingbird"
          msg="appearing earlier than usual seasons"
          stat="+12 days"
          color={GRASS}
          chart={[10, 5, 8, 15, 25, 40, 55, 70, 65, 60, 50, 45]}
          seed={5}
        />

        {/* 📈 INCREASING */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
          <span style={{ fontSize: 22 }}>📈</span>
          <div style={{ fontFamily: handFont, fontSize: 22, color: BLUE }}>more & more</div>
        </div>
        <SignalCard
          critter={<Mushroom size={56} />}
          title="Fly Agaric"
          msg="3x more sightings this season"
          stat="+218%"
          color={BLUE}
          chart={[10, 12, 14, 18, 22, 30, 38, 50, 65, 78, 90, 110]}
          seed={7}
        />

        <div style={{ marginTop: 16, padding: 12, background: "rgba(245,163,199,0.15)", border: `2px dashed ${PINK}`, fontFamily: labelFont, fontSize: 12, color: "#444", lineHeight: 1.5 }}>
          🐾 These are friendly hints from community sightings, not scientific facts. Maybe more people are looking, or maybe nature is shifting!
        </div>
      </div>

      <TabBar active={2} />
    </div>
  );
}

function SignalCard({ critter, title, msg, stat, color, chart, seed = 1 }) {
  const max = Math.max(...chart);
  return (
    <div style={{ position: "relative", marginTop: 10, height: 110 }}>
      <svg width="100%" height="110" viewBox="0 0 358 110" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(3, 3, 352, 104, 1.5, seed)} fill="white" stroke={INK} strokeWidth="2.5" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", padding: 12, gap: 12, alignItems: "center" }}>
        <div>{critter}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: handFont, fontSize: 20, color: INK, lineHeight: 1 }}>{title}</div>
          <div style={{ fontFamily: labelFont, fontSize: 12, color: "#666", marginTop: 4 }}>{msg}</div>
          <div style={{ marginTop: 6 }}>
            <svg width="170" height="28" viewBox="0 0 170 28">
              {chart.map((v, i) => {
                const x = 4 + i * 13;
                const h = (v / max) * 22;
                return <rect key={i} x={x} y={26 - h} width="9" height={h} fill={color} fillOpacity="0.6" stroke={color} strokeWidth="0.8" />;
              })}
              <path d={wobble(4, 27, 162, 27, 0.4, 8, seed + 10)} stroke={INK} strokeWidth="0.8" fill="none" />
            </svg>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: handFont, fontSize: 22, color, lineHeight: 1 }}>{stat}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: REPORT / SHARE CARD
// ============================================================

function Screen_Report() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      <div style={{ padding: "60px 16px 12px" }}>
        <div style={{ fontFamily: handFont, fontSize: 30, color: INK, transform: "rotate(-1deg)" }}>
          Make a Report
        </div>
        <CrayonUnderline width={170} color={ORANGE} />
        <div style={{ fontFamily: labelFont, fontSize: 13, color: "#5a5a5a", marginTop: 6 }}>
          Tell your local leaders what's happening.
        </div>
      </div>

      <div style={{ padding: "12px 16px 100px" }}>
        {/* The "card" — looks like a polaroid/postcard */}
        <div style={{ position: "relative", padding: 14, background: "white", border: `3px solid ${INK}`, transform: "rotate(-1.5deg)", boxShadow: "6px 6px 0 rgba(0,0,0,0.15)" }}>
          {/* tape */}
          <div style={{ position: "absolute", top: -14, left: 30, width: 60, height: 22, background: "rgba(255,210,74,0.7)", border: `1.5px solid ${INK}`, transform: "rotate(-8deg)" }} />
          <div style={{ position: "absolute", top: -10, right: 40, width: 50, height: 18, background: "rgba(245,163,199,0.7)", border: `1.5px solid ${INK}`, transform: "rotate(6deg)" }} />

          <div style={{ fontFamily: handFont, fontSize: 12, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>~ Biodiversity Bulletin ~</div>
          <div style={{ fontFamily: handFont, fontSize: 26, color: INK, marginTop: 4, lineHeight: 1.1 }}>The Bees of Berkeley</div>
          <div style={{ fontFamily: labelFont, fontSize: 11, color: "#666", marginTop: 2 }}>📍 Berkeley, CA · 10km radius · drawn today</div>

          {/* hero */}
          <div style={{ marginTop: 12, height: 130, position: "relative", background: SUN, border: `2.5px solid ${INK}` }}>
            <svg width="100%" height="100%" viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice">
              <DitherPatterns />
              <g style={{ color: ORANGE }}>
                <rect width="320" height="130" fill="url(#dither25)" opacity="0.4" />
              </g>
              <Cloud x={30} y={20} scale={0.8} />
              <Cloud x={240} y={30} scale={0.7} />
              <g transform="translate(110 25) scale(1.2)"><Bee size={64} /></g>
              <g transform="translate(40 60) scale(0.7)"><Flower size={64} petal={PINK} /></g>
              <g transform="translate(210 60) scale(0.8)"><Flower size={64} petal={PURPLE} /></g>
            </svg>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <Stat n="142" l="bee sightings" c={SUN} />
            <Stat n="-32%" l="vs. last yr" c={RED} />
            <Stat n="3" l="species at risk" c={RED} />
          </div>

          {/* finding */}
          <div style={{ marginTop: 14, padding: 10, background: "#fff8d6", border: `2px solid ${INK}` }}>
            <div style={{ fontFamily: handFont, fontSize: 18, color: INK }}>What we found:</div>
            <div style={{ fontFamily: labelFont, fontSize: 13, color: "#333", marginTop: 4, lineHeight: 1.5 }}>
              Honey bee sightings near Berkeley have <span style={{ background: SUN, padding: "0 4px" }}>dropped 32% this year</span>. Pollinators feed our gardens & farms. We can help by planting native flowers and keeping pesticides out of parks.
            </div>
          </div>

          <div style={{ marginTop: 12, fontFamily: handFont, fontSize: 14, color: "#777", textAlign: "right" }}>
            — drawn from iNaturalist sightings ✏️
          </div>
        </div>

        {/* SEND TO */}
        <div style={{ marginTop: 24, fontFamily: handFont, fontSize: 22, color: INK }}>send to →</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          {[
            { i: "🏛️", l: "City Council", c: BLUE, s: 8 },
            { i: "🌳", l: "Parks Dept", c: GRASS, s: 12 },
            { i: "📰", l: "Local News", c: ORANGE, s: 16 },
            { i: "❤️", l: "Nonprofit", c: PINK, s: 20 },
          ].map((opt, i) => (
            <div key={i} style={{ position: "relative", height: 60 }}>
              <svg width="100%" height="60" viewBox="0 0 170 60" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                <path d={wobbleRect(3, 3, 164, 54, 1.5, opt.s)} fill="white" stroke={INK} strokeWidth="2.5" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 12px", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: opt.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `2px solid ${INK}` }}>{opt.i}</div>
                <div style={{ fontFamily: labelFont, fontSize: 14, color: INK, fontWeight: 700 }}>{opt.l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active={3} />
    </div>
  );
}

function Stat({ n, l, c }) {
  return (
    <div style={{ flex: 1, position: "relative", height: 56 }}>
      <svg width="100%" height="56" viewBox="0 0 100 56" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(2, 2, 96, 52, 1.2, Math.floor(Math.random() * 30) + 1)} fill="white" stroke={INK} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", inset: 0, padding: 6, textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ fontFamily: handFont, fontSize: 22, color: c, lineHeight: 1 }}>{n}</div>
        <div style={{ fontFamily: labelFont, fontSize: 10, color: "#666", marginTop: 2 }}>{l}</div>
      </div>
    </div>
  );
}

// ============================================================
// SCREEN: SHAREABLE GRAPHIC
// ============================================================

function Screen_ShareCard() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#1a2030", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* dark twinkle bg */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <Sparkle key={i} x={Math.random() * 390} y={Math.random() * 844} size={2 + Math.random() * 4} color="white" />
        ))}
      </svg>

      {/* The shareable card */}
      <div style={{ position: "relative", width: 320, height: 480, transform: "rotate(-2deg)" }}>
        <svg width="320" height="480" style={{ position: "absolute", inset: 0 }}>
          <DitherPatterns />
          <path d={wobbleRect(4, 4, 312, 472, 2, 7)} fill={PAPER_BG} stroke={INK} strokeWidth="4" />
          <g style={{ color: SUN }}>
            <path d={wobbleRect(4, 4, 312, 472, 2, 7)} fill="url(#dither25)" opacity="0.3" />
          </g>
        </svg>

        <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: labelFont, fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>Life Web · Berkeley, CA</div>
          <div style={{ fontFamily: handFont, fontSize: 36, color: INK, lineHeight: 1, marginTop: 8 }}>
            If the <span style={{ color: SUN, background: INK, padding: "0 6px", display: "inline-block", transform: "rotate(-2deg)" }}>BEES</span>
          </div>
          <div style={{ fontFamily: handFont, fontSize: 36, color: INK, lineHeight: 1, marginTop: 4, transform: "rotate(0.5deg)" }}>disappear here...</div>

          <div style={{ position: "relative", margin: "20px auto 0", width: 200, height: 200 }}>
            <Bee size={120} />
            <div style={{ position: "absolute", top: 0, right: 0 }}>
              <Flower size={70} petal={PINK} />
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0 }}>
              <Bird size={70} color={BLUE} />
            </div>
            <svg width="200" height="200" style={{ position: "absolute", inset: 0 }}>
              <Scribble x1={70} y1={50} x2={140} y2={30} color={INK} sw={2} arrow seed={1} dashed />
              <Scribble x1={50} y1={130} x2={70} y2={150} color={INK} sw={2} arrow seed={2} dashed />
            </svg>
          </div>

          <div style={{ marginTop: "auto", textAlign: "center" }}>
            <div style={{ fontFamily: handFont, fontSize: 22, color: INK, lineHeight: 1.2 }}>
              ...flowers, fruit, & 4 birds<br />in our backyard go too.
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: GRASS, border: `2px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>🌍</div>
              <div style={{ fontFamily: handFont, fontSize: 16, color: INK }}>see your life web</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

Object.assign(window, {
  Bee, Bird, Flower, Frog, Mushroom, Earth, Sun, Tree, Cloud, Sparkle,
  TabBar, DitherPatterns,
  Screen_Onboarding,
  Screen_Home,
  Screen_Species,
  Screen_SpeciesDetail,
  Screen_Impact,
  Screen_Signals,
  Screen_Report,
  Screen_ShareCard,
});
