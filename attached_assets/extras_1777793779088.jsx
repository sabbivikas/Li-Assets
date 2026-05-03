/* global React */
const { useEffect, useRef, useState } = React;

// reuse globals
const { Bee, Bird, Flower, Frog, Mushroom, Earth, Sun, Tree, Cloud, Sparkle, TabBar, DitherPatterns } = window;

const PAPER_BG = "#fdf6e3";
const INK = "#1a1a1a";
const SKY = "#a8d8f0";
const GRASS = "#7fc77f";
const SUN_C = "#ffd24a";
const RED = "#e25555";
const PINK = "#f5a3c7";
const PURPLE = "#a78bd9";
const ORANGE = "#f08a3a";
const BLUE = "#5b8def";
const BROWN = "#8b6f47";

const handFont = `"Caveat", "Marker Felt", cursive`;
const labelFont = `"Patrick Hand", "Marker Felt", cursive`;

const paperBgStyle = {
  background: `
    radial-gradient(circle at 20% 30%, rgba(180,140,100,0.07) 1px, transparent 1px),
    radial-gradient(circle at 70% 60%, rgba(180,140,100,0.06) 1px, transparent 1px),
    radial-gradient(circle at 40% 80%, rgba(180,140,100,0.05) 1px, transparent 1px),
    ${PAPER_BG}
  `,
  backgroundSize: "23px 23px, 31px 31px, 17px 17px, auto",
};

// wobble helpers (re-declared locally so we don't depend on screens.jsx scope)
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

function CrayonUnderline({ width = 120, color = SUN_C }) {
  return (
    <svg width={width} height="10" style={{ display: "block", marginTop: -2 }}>
      <path d={wobble(2, 5, width - 2, 6, 2, 10, 4)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ===========================================================
// LIVE TIME HOOK — drives all animations
// ===========================================================
function useTime() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf, start = performance.now();
    const tick = (now) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

// ===========================================================
// LIVE ANIMATED EARTH — wobbles, breathes, sparkles orbit, eyes blink
// ===========================================================
function LiveEarth({ size = 220 }) {
  const t = useTime();
  const breath = 1 + Math.sin(t * 1.4) * 0.025;
  const tilt = Math.sin(t * 0.8) * 2;
  const blink = (Math.sin(t * 1.3) > 0.97) ? 0.15 : 1; // occasional blink
  const eyeY = 95;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      <defs>
        <pattern id="dither25e" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="transparent" />
          <rect x="0" y="0" width="2" height="2" fill="currentColor" />
        </pattern>
        <pattern id="dither50e" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="transparent" />
          <rect x="0" y="0" width="2" height="2" fill="currentColor" />
          <rect x="2" y="2" width="2" height="2" fill="currentColor" />
        </pattern>
      </defs>
      <g transform={`rotate(${tilt} 100 100) scale(${breath}) translate(${100 - 100 * breath}, ${100 - 100 * breath})`}>
        <g style={{ color: SUN_C }}>
          <circle cx="100" cy="100" r="98" fill="url(#dither25e)" opacity="0.6" />
        </g>
        <circle cx="100" cy="100" r="80" fill={SKY} stroke={INK} strokeWidth="3.5" />
        <g style={{ color: BLUE }}>
          <path d="M 100 20 A 80 80 0 0 1 180 100 A 80 80 0 0 1 100 180 Z" fill="url(#dither50e)" opacity="0.5" />
        </g>
        {/* drifting continents — rotate slowly */}
        <g transform={`rotate(${t * 4} 100 100)`}>
          <path d="M 50 75 Q 38 82 42 95 Q 48 110 65 108 Q 82 105 78 90 Q 80 76 65 72 Q 55 70 50 75 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
          <path d="M 110 60 Q 98 65 102 80 Q 110 92 128 88 Q 142 82 138 70 Q 132 58 120 58 Q 113 58 110 60 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
          <path d="M 95 120 Q 80 125 86 140 Q 96 152 115 148 Q 128 142 125 130 Q 120 118 105 118 Q 98 118 95 120 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
          <path d="M 145 115 Q 138 120 144 132 Q 154 138 162 130 Q 165 122 158 116 Q 150 113 145 115 Z" fill={GRASS} stroke={INK} strokeWidth="2.5" />
        </g>
        <ellipse cx="75" cy="65" rx="18" ry="10" fill="white" opacity="0.45" transform="rotate(-25 75 65)" />
        {/* eyes - blink */}
        <g>
          <ellipse cx="80" cy={eyeY} rx="4" ry={4 * blink} fill="white" stroke={INK} strokeWidth="1.5" />
          <ellipse cx="120" cy={eyeY} rx="4" ry={4 * blink} fill="white" stroke={INK} strokeWidth="1.5" />
          {blink > 0.3 && <>
            <circle cx="81" cy={eyeY + 1} r="2" fill={INK} />
            <circle cx="121" cy={eyeY + 1} r="2" fill={INK} />
          </>}
        </g>
        <path d="M 88 115 Q 100 125 112 115" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="72" cy="108" r="3" fill={PINK} opacity="0.5" />
        <circle cx="128" cy="108" r="3" fill={PINK} opacity="0.5" />
      </g>

      {/* orbiting sparkles */}
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const a = ((deg + t * 30) * Math.PI) / 180;
        const r = 95 + Math.sin(t * 2 + i) * 4;
        const x = 100 + Math.cos(a) * r;
        const y = 100 + Math.sin(a) * r;
        const sz = 5 + (i % 3) * 2 + Math.sin(t * 3 + i) * 1.5;
        return <Sparkle key={i} x={x} y={y} size={sz} color={[SUN_C, PINK, PURPLE, BLUE, ORANGE][i]} />;
      })}

      {/* floating creatures around earth */}
      <g transform={`translate(${30 + Math.sin(t) * 6}, ${40 + Math.cos(t * 0.8) * 4})`}>
        <g transform="scale(0.5)"><Bee size={50} /></g>
      </g>
      <g transform={`translate(${160 + Math.cos(t * 1.2) * 5}, ${150 + Math.sin(t * 0.9) * 6})`}>
        <g transform="scale(0.5)"><Flower size={50} petal={PINK} /></g>
      </g>
    </svg>
  );
}

// ===========================================================
// LIVE ANIMATED MAP — critters bounce, river flows, radius pulses
// ===========================================================
function LiveMap() {
  const t = useTime();
  const pulse = 120 + Math.sin(t * 1.5) * 6;
  const dashOffset = -(t * 12) % 100;
  const flow = Math.sin(t * 0.6) * 4;

  // critter positions with little movement
  const critters = [
    { Comp: Bee, x: 95, y: 110, sz: 48, sx: 8, sy: 4, sp: 1.4, ph: 0 },
    { Comp: (p) => <Bird {...p} color={BLUE} />, x: 260, y: 100, sz: 48, sx: 6, sy: 3, sp: 1.1, ph: 1 },
    { Comp: Frog, x: 75, y: 220, sz: 46, sx: 2, sy: 6, sp: 1.6, ph: 2 },
    { Comp: (p) => <Flower {...p} petal={PINK} />, x: 255, y: 220, sz: 46, sx: 0, sy: 2, sp: 0.8, ph: 3 },
    { Comp: Mushroom, x: 155, y: 90, sz: 42, sx: 1, sy: 1, sp: 0.5, ph: 4 },
    { Comp: (p) => <Bird {...p} color={ORANGE} />, x: 295, y: 175, sz: 42, sx: 9, sy: 3, sp: 1.7, ph: 5 },
  ];

  return (
    <svg width="100%" viewBox="0 0 360 320" style={{ display: "block" }}>
      <defs>
        <pattern id="dither25m" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="transparent" />
          <rect x="0" y="0" width="2" height="2" fill="currentColor" />
        </pattern>
      </defs>
      <path d={wobbleRect(4, 4, 352, 312, 2, 11)} fill="#e8f4d6" stroke={INK} strokeWidth="3" />
      <g style={{ color: GRASS }}>
        <path d="M 40 60 Q 90 40 150 70 Q 210 100 280 80 Q 320 75 340 100 L 340 280 L 20 280 Z" fill="url(#dither25m)" opacity="0.7" />
      </g>
      {/* river — flowing animation via wobble seed shift */}
      <path d={wobble(20, 180 + flow, 340, 220 - flow, 5, 18, t * 2)} stroke={SKY} strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={wobble(20, 180 + flow, 340, 220 - flow, 5, 18, t * 2)} stroke={BLUE} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* trees — gentle sway */}
      <g transform={`translate(60 100) rotate(${Math.sin(t) * 2} 25 40)`}><Tree size={50} color="#5fae5f" /></g>
      <g transform={`translate(240 70) rotate(${Math.sin(t * 1.2 + 1) * 2} 28 40)`}><Tree size={56} color={GRASS} /></g>
      <g transform={`translate(280 240) rotate(${Math.sin(t * 0.9 + 2) * 2} 24 40)`}><Tree size={48} color="#5fae5f" /></g>
      <g transform={`translate(40 240) rotate(${Math.sin(t * 1.1 + 3) * 2} 22 40)`}><Tree size={44} color={GRASS} /></g>

      {/* radius — pulsing dashed circle */}
      <circle cx="180" cy="170" r={pulse} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="6 4" strokeDashoffset={dashOffset} opacity="0.5" />
      <circle cx="180" cy="170" r={pulse} fill={RED} opacity="0.06" />
      <circle cx="180" cy="170" r={pulse - 8} fill="none" stroke={RED} strokeWidth="1" strokeDasharray="3 6" opacity="0.3" />

      {/* you-are-here pin — bounce */}
      <g transform={`translate(180 ${170 + Math.abs(Math.sin(t * 2.5)) * -4})`}>
        <ellipse cx="0" cy="14" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
        <path d="M -10 -16 Q -10 -28 0 -28 Q 10 -28 10 -16 Q 10 -8 0 6 Q -10 -8 -10 -16 Z" fill={RED} stroke={INK} strokeWidth="2.5" />
        <circle cx="0" cy="-16" r="4" fill="white" stroke={INK} strokeWidth="1.5" />
      </g>

      {/* critters - bobbing */}
      {critters.map((c, i) => {
        const dx = Math.sin(t * c.sp + c.ph) * c.sx;
        const dy = Math.cos(t * c.sp * 1.2 + c.ph) * c.sy;
        return (
          <g key={i} transform={`translate(${c.x + dx} ${c.y + dy})`}>
            <c.Comp size={c.sz} />
          </g>
        );
      })}

      {/* hand label */}
      <g transform="translate(20 30)">
        <text fontFamily={handFont} fontSize="14" fill={INK} transform="rotate(-3)">~ creatures spotted near you ~</text>
      </g>
    </svg>
  );
}

// ===========================================================
// 6-SCREEN ONBOARDING FLOW
// ===========================================================
// 1. World is changing (animated earth)
// 2. Where are you?  (location request)
// 3. What lives near you (auto-discovery animation)
// 4. Spot your spirit critter (pick one)
// 5. Choose how often you want to know (signals frequency)
// 6. Ready to dive in (CTA)

function OBShell({ idx, total = 6, children, bg = paperBgStyle, skyTop = false }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...bg, overflow: "hidden" }}>
      {skyTop && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: `linear-gradient(180deg, #c4e5f5 0%, #fdf6e3 100%)` }} />}
      <div style={{ position: "absolute", top: 56, left: 20, fontFamily: labelFont, fontSize: 13, color: "#888" }}>
        skip ↻
      </div>
      <div style={{ position: "absolute", top: 56, right: 20, fontFamily: labelFont, fontSize: 13, color: "#888" }}>
        {idx + 1} / {total}
      </div>
      <div style={{ position: "relative", padding: "100px 28px 40px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%", boxSizing: "border-box" }}>
        {children}
      </div>
      {/* dots */}
      <div style={{ position: "absolute", bottom: 30, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <svg key={i} width="14" height="14">
            <circle cx="7" cy="7" r="5" fill={i === idx ? INK : "transparent"} stroke={INK} strokeWidth="2" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function CTAButton({ label, color = GRASS, w = 260, seed = 5 }) {
  return (
    <div style={{ position: "relative", width: w, height: 60 }}>
      <svg width={w} height="60" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(4, 4, w - 8, 52, 1.8, seed)} fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d={wobble(20, 14, w - 20, 14, 0.8, 8, seed + 4)} stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: handFont, fontSize: 22, color: INK }}>
        {label}
      </div>
    </div>
  );
}

// SCREEN 1
function OB1() {
  return (
    <OBShell idx={0} skyTop>
      {/* clouds + stars in sky */}
      <svg width="100%" height="180" style={{ position: "absolute", top: 80, left: 0 }} viewBox="0 0 390 180">
        <Cloud x={50} y={30} scale={1.3} />
        <Cloud x={260} y={10} scale={1} />
        <Cloud x={300} y={110} scale={0.8} />
        <Sparkle x={60} y={90} size={6} color={SUN_C} />
        <Sparkle x={330} y={60} size={8} color={PINK} />
        <Sparkle x={200} y={20} size={5} color={PURPLE} />
      </svg>
      <div style={{ marginTop: 60 }}><LiveEarth size={220} /></div>
      <div style={{ marginTop: 40, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 38, color: INK, margin: 0, lineHeight: 1, transform: "rotate(-1deg)" }}>Nature around you</h1>
        <h1 style={{ fontFamily: handFont, fontSize: 38, color: INK, margin: "4px 0 0", lineHeight: 1, transform: "rotate(1.5deg)" }}>
          is <span style={{ color: RED, textDecoration: "underline wavy" }}>changing</span>.
        </h1>
        <p style={{ fontFamily: labelFont, fontSize: 20, color: "#4a4a4a", margin: "18px 0 0" }}>Most people never notice it.</p>
      </div>
      <div style={{ marginTop: "auto", marginBottom: 70 }}>
        <CTAButton label="Show me my world →" />
      </div>
    </OBShell>
  );
}

// SCREEN 2 — location
function OB2() {
  const t = useTime();
  const pulse = 60 + Math.sin(t * 1.8) * 10;
  return (
    <OBShell idx={1}>
      <div style={{ marginTop: 30, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 36, color: INK, lineHeight: 1, transform: "rotate(-0.5deg)" }}>Where are you?</h1>
        <CrayonUnderline width={180} color={RED} />
        <p style={{ fontFamily: labelFont, fontSize: 17, color: "#5a5a5a", margin: "14px 30px 0", lineHeight: 1.4 }}>
          We need a rough location to find the wild things sharing your neighborhood.
        </p>
      </div>

      {/* big animated location radar */}
      <svg width="280" height="280" viewBox="0 0 280 280" style={{ marginTop: 30 }}>
        <defs>
          <pattern id="dither25o" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="transparent" />
            <rect x="0" y="0" width="2" height="2" fill="currentColor" />
          </pattern>
        </defs>
        {/* outer pulses */}
        {[0, 0.33, 0.66].map((offset, i) => {
          const r = 30 + (((t + offset * 2) % 2) / 2) * 100;
          const op = 1 - (((t + offset * 2) % 2) / 2);
          return <circle key={i} cx="140" cy="140" r={r} fill="none" stroke={RED} strokeWidth="2" opacity={op * 0.6} />;
        })}
        <circle cx="140" cy="140" r={pulse} fill={RED} opacity="0.12" />
        <circle cx="140" cy="140" r={pulse} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5 4" />
        <g style={{ color: SUN_C }}>
          <circle cx="140" cy="140" r="120" fill="url(#dither25o)" opacity="0.3" />
        </g>
        {/* pin */}
        <g transform={`translate(140 ${140 + Math.abs(Math.sin(t * 2.5)) * -6})`}>
          <ellipse cx="0" cy="20" rx="14" ry="4" fill="rgba(0,0,0,0.25)" />
          <path d="M -14 -22 Q -14 -38 0 -38 Q 14 -38 14 -22 Q 14 -10 0 10 Q -14 -10 -14 -22 Z" fill={RED} stroke={INK} strokeWidth="3" />
          <circle cx="0" cy="-22" r="6" fill="white" stroke={INK} strokeWidth="2" />
        </g>
        {/* compass marks */}
        <text x="140" y="20" textAnchor="middle" fontFamily={handFont} fontSize="16" fill={INK}>N</text>
        <text x="265" y="145" textAnchor="middle" fontFamily={handFont} fontSize="16" fill={INK}>E</text>
        <text x="140" y="270" textAnchor="middle" fontFamily={handFont} fontSize="16" fill={INK}>S</text>
        <text x="15" y="145" textAnchor="middle" fontFamily={handFont} fontSize="16" fill={INK}>W</text>
      </svg>

      <div style={{ marginTop: "auto", marginBottom: 70, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <CTAButton label="📍 Use my location" color={SUN_C} w={260} seed={5} />
        <div style={{ fontFamily: labelFont, fontSize: 14, color: "#888", textDecoration: "underline" }}>or pick a place on the map</div>
      </div>
    </OBShell>
  );
}

// SCREEN 3 — auto-discovering critters
function OB3() {
  const t = useTime();
  const found = Math.min(47, Math.floor(t * 8));
  const critters = [
    { Comp: Bee, ph: 0 },
    { Comp: (p) => <Bird {...p} color={BLUE} />, ph: 0.3 },
    { Comp: Frog, ph: 0.7 },
    { Comp: (p) => <Flower {...p} petal={PINK} />, ph: 1.1 },
    { Comp: Mushroom, ph: 1.5 },
    { Comp: (p) => <Bird {...p} color={ORANGE} />, ph: 1.9 },
    { Comp: (p) => <Flower {...p} petal={PURPLE} />, ph: 2.3 },
    { Comp: Bee, ph: 2.7 },
  ];
  return (
    <OBShell idx={2}>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 34, color: INK, lineHeight: 1.05, transform: "rotate(-0.5deg)" }}>
          Look who's <span style={{ color: GRASS }}>nearby</span>...
        </h1>
        <p style={{ fontFamily: labelFont, fontSize: 16, color: "#5a5a5a", margin: "10px 20px 0" }}>
          Drawn from naturalists' sightings around your spot.
        </p>
      </div>

      {/* swarming critters */}
      <div style={{ position: "relative", width: 320, height: 320, marginTop: 16 }}>
        <svg width="320" height="320" viewBox="0 0 320 320" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="d3" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="transparent" />
              <rect x="0" y="0" width="2" height="2" fill={SUN_C} />
            </pattern>
          </defs>
          <circle cx="160" cy="160" r="140" fill="url(#d3)" opacity="0.3" />
          <path d={wobble(20, 160, 300, 160, 1.2, 30, t)} stroke={INK} strokeWidth="0" fill="none" />
          {critters.map((c, i) => {
            const localT = (t * 0.6 + c.ph) % 4;
            const angle = (i / critters.length) * Math.PI * 2 + t * 0.1;
            const r = 110 + Math.sin(t + i) * 10;
            const x = 160 + Math.cos(angle) * r;
            const y = 160 + Math.sin(angle) * r;
            const visible = localT > 0.3;
            const scale = visible ? Math.min(1, (localT - 0.3) * 2) : 0;
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${scale})`} opacity={scale}>
                <g transform="translate(-22 -22)"><c.Comp size={44} /></g>
              </g>
            );
          })}
          {/* center counter */}
          <g transform="translate(160 160)">
            <path d={wobbleRect(-50, -38, 100, 76, 2, 7)} fill="white" stroke={INK} strokeWidth="3" />
            <text x="0" y="0" textAnchor="middle" fontFamily={handFont} fontSize="44" fill={GRASS}>{found}</text>
            <text x="0" y="22" textAnchor="middle" fontFamily={labelFont} fontSize="13" fill={INK}>species</text>
          </g>
          {/* sparkles */}
          {[0.1, 0.4, 0.7, 1.0].map((p, i) => {
            const a = (p + t * 0.2) * Math.PI * 2;
            const x = 160 + Math.cos(a) * 90;
            const y = 160 + Math.sin(a) * 90;
            return <Sparkle key={i} x={x} y={y} size={5 + Math.sin(t * 3 + i) * 2} color={[PINK, PURPLE, BLUE, SUN_C][i]} />;
          })}
        </svg>
      </div>

      <div style={{ marginTop: "auto", marginBottom: 70 }}>
        <CTAButton label="Meet them all →" color={GRASS} />
      </div>
    </OBShell>
  );
}

// SCREEN 4 — pick spirit critter
function OB4() {
  const t = useTime();
  const opts = [
    { Comp: Bee, l: "Bee", v: "pollinator", c: SUN_C },
    { Comp: (p) => <Bird {...p} color={BLUE} />, l: "Bird", v: "watcher", c: BLUE },
    { Comp: Frog, l: "Frog", v: "listener", c: GRASS },
    { Comp: (p) => <Flower {...p} petal={PINK} />, l: "Flower", v: "grower", c: PINK },
    { Comp: Mushroom, l: "Fungi", v: "decomposer", c: PURPLE },
    { Comp: (p) => <Bird {...p} color={ORANGE} />, l: "Hawk", v: "guardian", c: ORANGE },
  ];
  const selected = 0;
  return (
    <OBShell idx={3}>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 34, color: INK, lineHeight: 1.05, transform: "rotate(-1deg)" }}>
          Who's your <span style={{ color: SUN_C, background: INK, padding: "0 6px" }}>spirit</span> critter?
        </h1>
        <p style={{ fontFamily: labelFont, fontSize: 15, color: "#5a5a5a", margin: "10px 20px 0" }}>
          Pick the role you'd like to play in your local web.
        </p>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%" }}>
        {opts.map((o, i) => {
          const wob = Math.sin(t * 1.5 + i) * 2;
          const isSel = i === selected;
          return (
            <div key={i} style={{ position: "relative", height: 110 }}>
              <svg width="100%" height="110" viewBox="0 0 100 110" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                <path d={wobbleRect(3, 3, 94, 104, 1.5, i + 7)} fill={isSel ? o.c : "white"} fillOpacity={isSel ? 0.4 : 1} stroke={INK} strokeWidth={isSel ? "3" : "2"} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 6 }}>
                <div style={{ transform: `rotate(${wob}deg)` }}>
                  <o.Comp size={50} />
                </div>
                <div style={{ fontFamily: handFont, fontSize: 18, color: INK, marginTop: 4, lineHeight: 1 }}>{o.l}</div>
                <div style={{ fontFamily: labelFont, fontSize: 11, color: "#666" }}>{o.v}</div>
              </div>
              {isSel && (
                <svg width="32" height="32" style={{ position: "absolute", top: -8, right: -6 }}>
                  <circle cx="16" cy="16" r="14" fill={INK} />
                  <text x="16" y="22" textAnchor="middle" fontSize="18" fill={SUN_C}>✓</text>
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", marginBottom: 70 }}>
        <CTAButton label="I'm a Bee 🐝 →" color={SUN_C} />
      </div>
    </OBShell>
  );
}

// SCREEN 5 — frequency
function OB5() {
  const t = useTime();
  const opts = [
    { l: "every morning", sub: "a daily tiny update", c: SUN_C, e: "🌅" },
    { l: "weekly digest", sub: "Sundays only — the highlights", c: GRASS, e: "📬", sel: true },
    { l: "only when it matters", sub: "we'll surprise you", c: PINK, e: "✨" },
    { l: "never, just open it", sub: "no nudges", c: "#bbb", e: "🤫" },
  ];
  return (
    <OBShell idx={4}>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 34, color: INK, lineHeight: 1.05, transform: "rotate(-0.5deg)" }}>
          How often should we whisper?
        </h1>
        <CrayonUnderline width={220} color={PURPLE} />
        <p style={{ fontFamily: labelFont, fontSize: 15, color: "#5a5a5a", margin: "10px 20px 0" }}>
          We'll only nudge you about real changes near you.
        </p>
      </div>

      {/* mascot - frog with envelope, animated */}
      <svg width="160" height="100" viewBox="0 0 160 100" style={{ marginTop: 14 }}>
        <g transform={`translate(0 ${Math.sin(t * 2) * 4})`}>
          <g transform="translate(48 18)"><Frog size={64} /></g>
          <g transform={`translate(${100 + Math.sin(t * 3) * 4} ${30 + Math.cos(t * 2) * 3}) rotate(${Math.sin(t * 2) * 8})`}>
            <path d="M 0 0 L 40 0 L 40 26 L 0 26 Z" fill="white" stroke={INK} strokeWidth="2" />
            <path d="M 0 0 L 20 14 L 40 0" fill="none" stroke={INK} strokeWidth="2" />
            <text x="20" y="20" textAnchor="middle" fontSize="10" fontFamily={handFont}>hi!</text>
          </g>
        </g>
      </svg>

      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {opts.map((o, i) => (
          <div key={i} style={{ position: "relative", height: 64 }}>
            <svg width="100%" height="64" viewBox="0 0 360 64" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
              <path d={wobbleRect(3, 3, 354, 58, 1.5, i + 17)} fill={o.sel ? o.c : "white"} fillOpacity={o.sel ? 0.3 : 1} stroke={INK} strokeWidth={o.sel ? 3 : 2} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 16px", gap: 14 }}>
              <div style={{ fontSize: 28 }}>{o.e}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: handFont, fontSize: 20, color: INK, lineHeight: 1 }}>{o.l}</div>
                <div style={{ fontFamily: labelFont, fontSize: 12, color: "#666", marginTop: 2 }}>{o.sub}</div>
              </div>
              {o.sel && <div style={{ fontFamily: handFont, fontSize: 22, color: INK }}>✓</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", marginBottom: 70 }}>
        <CTAButton label="Sounds good →" />
      </div>
    </OBShell>
  );
}

// SCREEN 6 — ready to dive
function OB6() {
  const t = useTime();
  return (
    <OBShell idx={5}>
      <div style={{ marginTop: 30, textAlign: "center" }}>
        <h1 style={{ fontFamily: handFont, fontSize: 40, color: INK, lineHeight: 1, transform: "rotate(-1deg)" }}>You're in the web</h1>
        <h1 style={{ fontFamily: handFont, fontSize: 40, color: INK, lineHeight: 1, marginTop: 4, transform: "rotate(1deg)" }}>now, <span style={{ color: GRASS }}>Bee</span> 🐝</h1>
        <p style={{ fontFamily: labelFont, fontSize: 16, color: "#5a5a5a", margin: "16px 30px 0", lineHeight: 1.5 }}>
          Welcome to <i>your</i> Life Web — a living portrait of the wild things sharing your neighborhood.
        </p>
      </div>

      {/* big celebration scene */}
      <svg width="320" height="280" viewBox="0 0 320 280" style={{ marginTop: 6 }}>
        {/* confetti sparkles */}
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const r = 110 + Math.sin(t * 2 + i) * 12;
          const x = 160 + Math.cos(a + t * 0.3) * r;
          const y = 140 + Math.sin(a + t * 0.3) * r;
          return <Sparkle key={i} x={x} y={y} size={4 + (i % 3) * 2} color={[SUN_C, PINK, PURPLE, BLUE, ORANGE, GRASS, RED][i % 7]} />;
        })}
        {/* center bee mascot, big */}
        <g transform={`translate(160 140) scale(${1.8 + Math.sin(t * 2) * 0.05}) rotate(${Math.sin(t) * 5})`}>
          <g transform="translate(-32 -32)"><Bee size={64} /></g>
        </g>
        {/* friends bobbing around */}
        <g transform={`translate(${50 + Math.sin(t) * 6} ${60 + Math.cos(t * 1.2) * 6})`}><Flower size={48} petal={PINK} /></g>
        <g transform={`translate(${230 + Math.sin(t * 1.3) * 6} ${50 + Math.cos(t) * 6})`}><Bird size={48} color={BLUE} /></g>
        <g transform={`translate(${50 + Math.sin(t * 1.1) * 6} ${200 + Math.cos(t * 0.8) * 6})`}><Mushroom size={48} /></g>
        <g transform={`translate(${230 + Math.sin(t * 0.9) * 6} ${210 + Math.cos(t * 1.1) * 6})`}><Frog size={48} /></g>
      </svg>

      <div style={{ marginTop: "auto", marginBottom: 70 }}>
        <CTAButton label="Let's explore →" color={SUN_C} w={280} />
      </div>
    </OBShell>
  );
}

// ===========================================================
// USER PROFILE — creative "Field Journal" + "Critter Card" hybrid
// ===========================================================
// Concept: a hand-stitched naturalist passport. Top half is a polaroid
// "trading card" of YOU as your spirit critter, with stats. Bottom is
// a tabbed field-journal page with achievements, recent finds, and
// rep score — drawn as scribbled badges and merit pins.

function Screen_Profile() {
  const t = useTime();
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      {/* tape across top */}
      <div style={{ position: "absolute", top: 50, left: 30, width: 80, height: 22, background: "rgba(255,210,74,0.7)", border: `1.5px solid ${INK}`, transform: "rotate(-6deg)", zIndex: 3 }} />
      <div style={{ position: "absolute", top: 56, right: 28, width: 70, height: 20, background: "rgba(245,163,199,0.7)", border: `1.5px solid ${INK}`, transform: "rotate(7deg)", zIndex: 3 }} />

      {/* header */}
      <div style={{ padding: "60px 20px 4px", position: "relative" }}>
        <div style={{ fontFamily: labelFont, fontSize: 11, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>~ Field Journal ~</div>
        <div style={{ fontFamily: handFont, fontSize: 30, color: INK, lineHeight: 1, transform: "rotate(-0.5deg)" }}>
          Your Naturalist Passport
        </div>
      </div>

      {/* Trading Card */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ position: "relative", padding: 14, background: "white", border: `3px solid ${INK}`, transform: "rotate(-1deg)", boxShadow: "5px 5px 0 rgba(0,0,0,0.15)" }}>
          {/* corner stars */}
          <svg width="20" height="20" style={{ position: "absolute", top: -8, left: -8 }}><Sparkle x={10} y={10} size={8} color={SUN_C} /></svg>
          <svg width="20" height="20" style={{ position: "absolute", top: -8, right: -8 }}><Sparkle x={10} y={10} size={8} color={PINK} /></svg>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: labelFont, fontSize: 11, color: "#999", letterSpacing: 1, textTransform: "uppercase" }}>Naturalist №0247</div>
              <div style={{ fontFamily: handFont, fontSize: 28, color: INK, lineHeight: 1, marginTop: 2 }}>Maya Patel</div>
              <div style={{ fontFamily: labelFont, fontSize: 13, color: "#555", marginTop: 2 }}>📍 Berkeley, CA · 7 mo. afield</div>
            </div>
            <div style={{ position: "relative" }}>
              <svg width="64" height="64">
                <circle cx="32" cy="32" r="28" fill={SUN_C} stroke={INK} strokeWidth="2.5" />
                <text x="32" y="20" textAnchor="middle" fontSize="9" fontFamily={labelFont} fill={INK} fontWeight="700">SPIRIT</text>
                <text x="32" y="48" textAnchor="middle" fontSize="9" fontFamily={labelFont} fill={INK} fontWeight="700">BEE</text>
              </svg>
              <svg width="22" height="22" style={{ position: "absolute", top: -4, right: -4 }}>
                <Sparkle x={11} y={11} size={9} color={ORANGE} />
              </svg>
            </div>
          </div>

          {/* portrait — bee with personalized accents */}
          <div style={{ marginTop: 12, position: "relative", height: 180, background: "#fff8d6", border: `2.5px solid ${INK}`, overflow: "hidden" }}>
            <svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="dprof" width="4" height="4" patternUnits="userSpaceOnUse">
                  <rect width="4" height="4" fill="transparent" />
                  <rect x="0" y="0" width="2" height="2" fill={SUN_C} />
                </pattern>
              </defs>
              <rect width="320" height="180" fill="url(#dprof)" opacity="0.4" />
              <Cloud x={30} y={20} scale={0.8} />
              <Cloud x={240} y={30} scale={0.7} />
              {/* big bee */}
              <g transform={`translate(110 30) scale(1.8) rotate(${Math.sin(t) * 4} 32 36)`}><Bee size={64} /></g>
              {/* little flowers */}
              <g transform={`translate(40 100) scale(0.7) rotate(${Math.sin(t * 1.2) * 3} 32 32)`}><Flower size={64} petal={PINK} /></g>
              <g transform={`translate(220 110) scale(0.6) rotate(${Math.sin(t * 0.9 + 1) * 3} 32 32)`}><Flower size={64} petal={PURPLE} /></g>
              <g transform="translate(170 130)"><Sparkle x={0} y={0} size={6} color={ORANGE} /></g>
              <g transform="translate(280 80)"><Sparkle x={0} y={0} size={5} color={PINK} /></g>
            </svg>
          </div>

          {/* stat strip */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <PStat n="142" l="sightings" c={GRASS} />
            <PStat n="38" l="species" c={BLUE} />
            <PStat n="9" l="reports" c={ORANGE} />
            <PStat n="L4" l="rank" c={RED} />
          </div>

          {/* quote */}
          <div style={{ marginTop: 12, padding: 8, background: "#fff8d6", border: `2px dashed ${INK}`, fontFamily: handFont, fontSize: 16, color: INK, fontStyle: "italic", textAlign: "center" }}>
            "I notice the small things." 🐝
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ padding: "16px 16px 0", display: "flex", gap: 6 }}>
        {["🏅 Badges", "📓 Field Notes", "🌐 Web"].map((l, i) => (
          <div key={i} style={{ position: "relative", flex: 1, height: 36 }}>
            <svg width="100%" height="36" viewBox="0 0 100 36" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
              <path d={wobbleRect(2, 2, 96, 32, 1.2, i + 90)} fill={i === 0 ? INK : "white"} stroke={INK} strokeWidth="2" />
            </svg>
            <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: labelFont, fontSize: 13, color: i === 0 ? "white" : INK, fontWeight: 700 }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* Badges grid — scribbled merit pins */}
      <div style={{ padding: "12px 16px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { l: "First Find", c: SUN_C, sub: "Mar 12", got: true, e: "🥇" },
            { l: "Bee Friend", c: PINK, sub: "x10 bees", got: true, e: "🐝" },
            { l: "Early Bird", c: BLUE, sub: "before 6am", got: true, e: "🌅" },
            { l: "Civic Hero", c: ORANGE, sub: "1st report", got: true, e: "📜" },
            { l: "Rare Seeker", c: PURPLE, sub: "??? / 5", got: false, e: "🔮" },
            { l: "Sky Watcher", c: BLUE, sub: "??? / 20", got: false, e: "🦅" },
            { l: "Forest Guide", c: GRASS, sub: "??? / 50", got: false, e: "🌳" },
            { l: "Web Weaver", c: RED, sub: "??? / 100", got: false, e: "🕸️" },
          ].map((b, i) => (
            <Badge key={i} {...b} t={t} idx={i} />
          ))}
        </div>

        {/* progress to next rank */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: handFont, fontSize: 20, color: INK, transform: "rotate(-0.5deg)" }}>
            Path to Level 5 — <span style={{ color: PURPLE }}>Field Scout</span>
          </div>
          <div style={{ marginTop: 8, position: "relative", height: 28 }}>
            <svg width="100%" height="28" viewBox="0 0 358 28" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
              <path d={wobbleRect(3, 3, 352, 22, 1, 100)} fill="white" stroke={INK} strokeWidth="2" />
              <path d={wobbleRect(5, 5, 230, 18, 0.8, 101)} fill={PURPLE} fillOpacity="0.5" stroke={PURPLE} strokeWidth="1" />
              {/* moving sparkle */}
              <g transform={`translate(${230 + Math.sin(t * 2) * 6} 14)`}>
                <Sparkle x={0} y={0} size={6} color={SUN_C} />
              </g>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: labelFont, fontSize: 12, color: INK, fontWeight: 700 }}>
              68 / 100 sightings
            </div>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <Tabs />
    </div>
  );
}

function PStat({ n, l, c }) {
  return (
    <div style={{ flex: 1, position: "relative", height: 50 }}>
      <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(2, 2, 96, 46, 1, Math.floor(Math.random() * 30) + 100)} fill="white" stroke={INK} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", inset: 0, padding: 4, textAlign: "center" }}>
        <div style={{ fontFamily: handFont, fontSize: 20, color: c, lineHeight: 1 }}>{n}</div>
        <div style={{ fontFamily: labelFont, fontSize: 10, color: "#666" }}>{l}</div>
      </div>
    </div>
  );
}

function Badge({ l, c, sub, got, e, t, idx }) {
  const wob = Math.sin(t * 0.8 + idx) * 1.5;
  return (
    <div style={{ textAlign: "center", opacity: got ? 1 : 0.5 }}>
      <div style={{ position: "relative", width: 64, height: 72, margin: "0 auto", transform: `rotate(${wob}deg)` }}>
        <svg width="64" height="72" viewBox="0 0 64 72">
          {/* ribbon */}
          <path d="M 18 50 L 12 70 L 22 64 L 32 70 L 42 64 L 52 70 L 46 50 Z" fill={got ? c : "#ccc"} stroke={INK} strokeWidth="2" />
          {/* circle */}
          <circle cx="32" cy="32" r="26" fill={got ? c : "#ddd"} stroke={INK} strokeWidth="3" />
          <circle cx="32" cy="32" r="20" fill="white" stroke={INK} strokeWidth="1.5" strokeDasharray="2 2" />
          <text x="32" y="38" textAnchor="middle" fontSize="20">{got ? e : "?"}</text>
        </svg>
      </div>
      <div style={{ fontFamily: handFont, fontSize: 14, color: INK, lineHeight: 1, marginTop: 2 }}>{l}</div>
      <div style={{ fontFamily: labelFont, fontSize: 10, color: "#777" }}>{sub}</div>
    </div>
  );
}

function Tabs() {
  const tabs = [
    { i: "🌍", l: "Home" }, { i: "🌿", l: "Species" },
    { i: "📡", l: "Signals" }, { i: "📜", l: "Reports" },
    { i: "🙂", l: "You" },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 88 }}>
      <svg width="100%" height="88" viewBox="0 0 390 88" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d={wobbleRect(4, 4, 382, 80, 2, 21)} fill="white" stroke={INK} strokeWidth="3" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 14px 26px" }}>
        {tabs.map((t, i) => {
          const active = i === 4;
          return (
            <div key={i} style={{ textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: 24, transform: active ? "scale(1.2) rotate(-5deg)" : "none", filter: active ? "none" : "grayscale(0.4)" }}>{t.i}</div>
              <div style={{ fontFamily: labelFont, fontSize: 11, color: active ? INK : "#888", fontWeight: active ? 700 : 400 }}>{t.l}</div>
              {active && (
                <svg width="36" height="6" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -6 }}>
                  <path d={wobble(2, 3, 34, 3, 1, 6, 7)} stroke={SUN_C} strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================
// HOME WITH LIVE MAP — replaces static map version
// ===========================================================
function Screen_Home_Live() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...paperBgStyle, overflow: "hidden" }}>
      <div style={{ padding: "60px 20px 12px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: handFont, fontSize: 30, color: INK, lineHeight: 1, transform: "rotate(-1deg)" }}>Your Life Web</div>
            <CrayonUnderline width={170} color={SUN_C} />
            <div style={{ fontFamily: labelFont, fontSize: 15, color: "#5a5a5a", marginTop: 6 }}>📍 Berkeley, CA · 10km</div>
          </div>
          <svg width="44" height="44">
            <path d={wobbleRect(2, 2, 40, 40, 1.5, 3)} fill="white" stroke={INK} strokeWidth="2.5" />
            <text x="22" y="29" textAnchor="middle" fontSize="20" fontFamily={handFont}>☀</text>
          </svg>
        </div>
      </div>

      <div style={{ margin: "0 16px", position: "relative" }}>
        <LiveMap />
      </div>

      <div style={{ display: "flex", gap: 10, padding: "16px 16px 0" }}>
        {[{ n: 47, l: "species", c: GRASS, e: "🌱" }, { n: 12, l: "active now", c: SUN_C, e: "✨" }, { n: 3, l: "at risk", c: RED, e: "!" }].map((s, i) => (
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

      <div style={{ padding: "16px 16px 100px" }}>
        <div style={{ fontFamily: handFont, fontSize: 22, color: INK, transform: "rotate(-0.5deg)" }}>What's happening here</div>
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

      <TabBar active={0} />
    </div>
  );
}

Object.assign(window, {
  OB1, OB2, OB3, OB4, OB5, OB6,
  Screen_Profile,
  Screen_Home_Live,
  LiveEarth, LiveMap,
});
