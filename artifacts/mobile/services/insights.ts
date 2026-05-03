import { getEcosystemRoles } from "./ecologyModel";
import {
  getIconicGroup,
  type ObservationResult,
  type SpeciesCount,
} from "./iNaturalist";

export interface Insight {
  id: string;
  icon: string;
  color: string;
  title: string;
  detail: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(dateStr?: string): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (!isFinite(t)) return null;
  return Math.floor((Date.now() - t) / DAY_MS);
}

/**
 * Generate up to 4 plain-language insights derived from the same
 * observations dataset that powers the map and the stats row.
 */
export function generateInsights(
  observations: ObservationResult[] = [],
  species: SpeciesCount[] = [],
): Insight[] {
  const insights: Insight[] = [];

  if (observations.length === 0 && species.length === 0) return insights;

  // 1. Activity in the last 7 days vs the full 30-day window
  const last7 = observations.filter((o) => {
    const d = daysAgo(o.observed_on);
    return d !== null && d <= 7;
  }).length;
  if (observations.length > 0) {
    const expected = observations.length * (7 / 30);
    let trend: "high" | "steady" | "quiet";
    if (last7 >= expected * 1.25) trend = "high";
    else if (last7 >= expected * 0.75) trend = "steady";
    else trend = "quiet";
    const trendLabel =
      trend === "high"
        ? "Picking up"
        : trend === "steady"
          ? "Steady activity"
          : "Quiet week";
    insights.push({
      id: "activity",
      icon: trend === "high" ? "trending-up" : trend === "quiet" ? "moon" : "activity",
      color: trend === "high" ? "#4ADE80" : trend === "quiet" ? "#94A3B8" : "#22D3EE",
      title: `${trendLabel} — ${last7} sightings in the last 7 days`,
      detail: `Compared to ~${Math.round(expected)} expected for a typical week here.`,
    });
  }

  // 2. Most active group right now
  const groupCounts: Record<string, number> = {};
  observations.forEach((o) => {
    const g = getIconicGroup(o.taxon?.iconic_taxon_name);
    groupCounts[g] = (groupCounts[g] || 0) + 1;
  });
  const topGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGroup && topGroup[1] >= 2) {
    const [name, count] = topGroup;
    insights.push({
      id: "active-group",
      icon:
        name === "Birds"
          ? "feather"
          : name === "Plants"
            ? "leaf"
            : name === "Insects"
              ? "sun"
              : "globe",
      color:
        name === "Birds"
          ? "#22D3EE"
          : name === "Plants"
            ? "#4ADE80"
            : name === "Insects"
              ? "#FBBF24"
              : "#A78BFA",
      title: `${name} dominate recent activity`,
      detail: `${count} of ${observations.length} recent sightings nearby.`,
    });
  }

  // 3. Pollinator presence
  const pollinatorObs = observations.filter((o) => {
    const roles = getEcosystemRoles(
      o.taxon?.iconic_taxon_name,
      o.taxon?.preferred_common_name,
    );
    return roles.includes("pollinator");
  });
  if (pollinatorObs.length > 0) {
    insights.push({
      id: "pollinator",
      icon: "sun",
      color: "#FBBF24",
      title: `Pollinators are active here`,
      detail: `${pollinatorObs.length} pollinator ${pollinatorObs.length === 1 ? "sighting" : "sightings"} in the last 30 days.`,
    });
  }

  // 4. At-risk species nearby — derived from observation taxa first so the
  // map and the cards tell the same story; fall back to the species list if
  // observations don't carry conservation_status.
  const atRiskFromObs = new Map<number, string>();
  observations.forEach((o) => {
    const t = o.taxon;
    const cs = t?.conservation_status?.status?.toUpperCase();
    if (t?.id && cs && ["CR", "EN", "VU", "NT"].includes(cs)) {
      atRiskFromObs.set(t.id, t.preferred_common_name || t.name);
    }
  });
  let atRiskCount = atRiskFromObs.size;
  let firstAtRisk = atRiskFromObs.values().next().value;
  if (atRiskCount === 0) {
    const fallback = species.filter((s) => {
      const cs = s.taxon.conservation_status?.status?.toUpperCase();
      return cs && ["CR", "EN", "VU", "NT"].includes(cs);
    });
    atRiskCount = fallback.length;
    if (fallback[0]) {
      firstAtRisk =
        fallback[0].taxon.preferred_common_name || fallback[0].taxon.name;
    }
  }
  if (atRiskCount > 0 && firstAtRisk) {
    insights.push({
      id: "at-risk",
      icon: "alert-triangle",
      color: "#EF4444",
      title: `${atRiskCount} at-risk ${atRiskCount === 1 ? "species" : "species"} nearby`,
      detail: `Including ${firstAtRisk}. Their presence makes this area worth protecting.`,
    });
  }

  return insights.slice(0, 4);
}
