export interface Insight {
  id: string;
  icon: string;
  color: string;
  title: string;
  detail: string;
}

export interface InsightPin {
  taxonId?: number;
  name: string;
  group?: string;
  role?: string;
  observedOn?: string;
  conservationStatus?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const GROUP_ICON: Record<string, string> = {
  Birds: "feather",
  Plants: "leaf",
  Insects: "sun",
};
const GROUP_COLOR: Record<string, string> = {
  Birds: "#22D3EE",
  Plants: "#4ADE80",
  Insects: "#FBBF24",
};

export function generateInsights(pins: InsightPin[] = []): Insight[] {
  if (pins.length === 0) return [];
  const insights: Insight[] = [];
  const now = Date.now();

  const last7 = pins.filter((p) => {
    if (!p.observedOn) return false;
    const t = Date.parse(p.observedOn);
    return isFinite(t) && now - t <= 7 * DAY_MS;
  }).length;
  const expected = pins.length * (7 / 30);
  const trend =
    last7 >= expected * 1.25 ? "high" : last7 >= expected * 0.75 ? "steady" : "quiet";
  insights.push({
    id: "activity",
    icon: trend === "high" ? "trending-up" : trend === "quiet" ? "moon" : "activity",
    color: trend === "high" ? "#4ADE80" : trend === "quiet" ? "#94A3B8" : "#22D3EE",
    title:
      (trend === "high" ? "Picking up" : trend === "steady" ? "Steady activity" : "Quiet week") +
      ` — ${last7} sightings in the last 7 days`,
    detail: `Compared to ~${Math.round(expected)} expected for a typical week here.`,
  });

  const groupCounts: Record<string, number> = {};
  pins.forEach((p) => {
    const g = p.group || "Other";
    groupCounts[g] = (groupCounts[g] || 0) + 1;
  });
  const topGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGroup && topGroup[1] >= 2) {
    const [name, count] = topGroup;
    insights.push({
      id: "active-group",
      icon: GROUP_ICON[name] || "globe",
      color: GROUP_COLOR[name] || "#A78BFA",
      title: `${name} dominate recent activity`,
      detail: `${count} of ${pins.length} markers on the map.`,
    });
  }

  const pollinators = pins.filter((p) => /pollinator/i.test(p.role || ""));
  if (pollinators.length > 0) {
    insights.push({
      id: "pollinator",
      icon: "sun",
      color: "#FBBF24",
      title: "Pollinators are active here",
      detail: `${pollinators.length} pollinator ${pollinators.length === 1 ? "marker" : "markers"} on the map.`,
    });
  }

  const atRisk = pins.filter(
    (p) => p.conservationStatus && ["CR", "EN", "VU", "NT"].includes(p.conservationStatus),
  );
  if (atRisk.length > 0) {
    const unique = new Map(atRisk.map((p) => [p.taxonId ?? p.name, p.name]));
    const first = unique.values().next().value;
    insights.push({
      id: "at-risk",
      icon: "alert-triangle",
      color: "#EF4444",
      title: `${unique.size} at-risk ${unique.size === 1 ? "species" : "species"} on the map`,
      detail: `Including ${first}. Their presence makes this area worth protecting.`,
    });
  }

  return insights.slice(0, 4);
}
