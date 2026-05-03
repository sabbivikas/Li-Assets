export function wobble(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  intensity = 2,
  segments = 8,
  seed = 0,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const r =
      Math.sin((seed + i) * 1.7) * intensity +
      Math.cos((seed + i) * 2.3) * intensity * 0.6;
    const nx = -dy / len;
    const ny = dx / len;
    d += ` L ${(px + nx * r).toFixed(1)} ${(py + ny * r).toFixed(1)}`;
  }
  return d;
}

export function wobbleRect(
  x: number,
  y: number,
  w: number,
  h: number,
  intensity = 1.8,
  seed = 1,
): string {
  const seg = 6;
  let d = `M ${x} ${y}`;
  const sides: Array<[number, number, number, number]> = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
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
