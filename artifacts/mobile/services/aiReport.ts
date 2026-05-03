import {
  getEcosystemRoles,
  getRoleLabel,
} from "@/services/ecologyModel";
import {
  getConservationLabel,
  getIconicGroup,
  type SpeciesCount,
} from "@/services/iNaturalist";
import type { GroupFilter, ReportType } from "@/services/reportTemplate";

export interface AIReportSections {
  title: string;
  executiveSummary: string;
  keyFinding: string;
  whyItMatters: string;
  bullets: string[];
  recommendations: string[];
}

interface BuildArgs {
  type: ReportType;
  city: string;
  radiusKm: number;
  group: GroupFilter;
  current: SpeciesCount[];
  historical: SpeciesCount[];
  focusSpecies?: SpeciesCount;
}

function speciesPayload(s: SpeciesCount) {
  const t = s.taxon;
  const role = getRoleLabel(
    getEcosystemRoles(t.iconic_taxon_name, t.preferred_common_name)[0]
  );
  return {
    commonName: t.preferred_common_name || t.name,
    scientificName: t.name,
    group: getIconicGroup(t.iconic_taxon_name),
    role,
    recentCount: s.count,
    conservation: getConservationLabel(t.conservation_status?.status).label,
  };
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) {
    throw new Error(
      "EXPO_PUBLIC_DOMAIN is not set; cannot reach the Life Web API server."
    );
  }
  const stripped = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${stripped}/api`;
}

export async function generateReportWithAI(
  args: BuildArgs,
  options?: { token?: string | null; signal?: AbortSignal }
): Promise<AIReportSections> {
  const totalObs = args.current.reduce((a, b) => a + b.count, 0);
  const histObs = args.historical.reduce((a, b) => a + b.count, 0);

  const body = {
    type: args.type,
    city: args.city,
    radiusKm: args.radiusKm,
    group: args.group,
    recentObservations: totalObs,
    historicalObservations: histObs,
    uniqueSpecies: args.current.length,
    focusSpecies: args.focusSpecies ? speciesPayload(args.focusSpecies) : undefined,
    topSpecies: args.current.slice(0, 5).map(speciesPayload),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`${getApiBase()}/openai/generate-report`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    throw new Error(`AI report failed: ${res.status}`);
  }

  const data = (await res.json()) as AIReportSections;
  if (
    !data ||
    typeof data.title !== "string" ||
    typeof data.executiveSummary !== "string" ||
    typeof data.keyFinding !== "string" ||
    typeof data.whyItMatters !== "string" ||
    !Array.isArray(data.bullets) ||
    !Array.isArray(data.recommendations)
  ) {
    throw new Error("AI report returned invalid shape");
  }
  return data;
}
