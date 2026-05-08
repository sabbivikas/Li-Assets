const BASE_URL = "https://api.inaturalist.org/v1";
const API_TOKEN = process.env.EXPO_PUBLIC_INATURALIST_API_TOKEN;

export interface INatTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  iconic_taxon_name?: string;
  default_photo?: { medium_url?: string; square_url?: string };
  wikipedia_url?: string;
  observations_count?: number;
  conservation_status?: {
    status: string;
    status_name?: string;
    iucn?: number;
  };
  taxon_photos?: Array<{ photo: { medium_url?: string; large_url?: string } }>;
  rank?: string;
  ancestry?: string;
}

export interface SpeciesCount {
  count: number;
  taxon: INatTaxon;
}

export interface ObservationResult {
  id: number;
  observed_on?: string;
  taxon?: INatTaxon;
  place_guess?: string;
  quality_grade?: string;
  location?: string;
}

export interface HistogramResult {
  results: { [date: string]: number };
}

export class INatNetworkError extends Error {
  status?: number;
  attempts: number;
  cause?: unknown;
  constructor(message: string, opts: { status?: number; attempts: number; cause?: unknown }) {
    super(message);
    this.name = "INatNetworkError";
    this.status = opts.status;
    this.attempts = opts.attempts;
    this.cause = opts.cause;
  }
}

const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

async function get<T>(
  path: string,
  params: Record<string, string | number | boolean> = {},
): Promise<T> {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
  const url = `${BASE_URL}${path}${query ? "?" + query : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

  let lastErr: unknown;
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(url, { headers, signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok) return (await resp.json()) as T;
      lastStatus = resp.status;
      // 4xx (except 408/429) are not transient — fail immediately.
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) {
        throw new INatNetworkError(`iNat API error: ${resp.status}`, {
          status: resp.status,
          attempts: attempt + 1,
        });
      }
      lastErr = new Error(`iNat API error: ${resp.status}`);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof INatNetworkError) throw err;
      lastErr = err;
    }
    if (attempt < MAX_RETRIES) {
      const delay =
        BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new INatNetworkError(
    lastStatus ? `iNat API error: ${lastStatus}` : "iNat API unreachable",
    { status: lastStatus, attempts: MAX_RETRIES + 1, cause: lastErr },
  );
}

export async function fetchNearbySpecies(
  lat: number,
  lng: number,
  radiusKm: number,
  perPage = 50
): Promise<SpeciesCount[]> {
  const data = await get<{ results: SpeciesCount[] }>(
    "/observations/species_counts",
    {
      lat,
      lng,
      radius: radiusKm,
      quality_grade: "research",
      per_page: perPage,
      order: "desc",
      order_by: "count",
    }
  );
  return data.results || [];
}

export async function fetchSpeciesById(id: number): Promise<INatTaxon | null> {
  try {
    const data = await get<{ results: INatTaxon[] }>(`/taxa/${id}`);
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

export async function fetchSpeciesObservations(
  taxonId: number,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<ObservationResult[]> {
  const data = await get<{ results: ObservationResult[] }>("/observations", {
    taxon_id: taxonId,
    lat,
    lng,
    radius: radiusKm,
    quality_grade: "research",
    per_page: 50,
    order: "desc",
    order_by: "observed_on",
  });
  return data.results || [];
}

export async function fetchObservationHistogram(
  taxonId: number,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<HistogramResult> {
  return get<HistogramResult>("/observations/histogram", {
    taxon_id: taxonId,
    lat,
    lng,
    radius: radiusKm,
    date_field: "observed",
    interval: "month",
  });
}

export async function fetchLocationSignals(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SpeciesCount[]> {
  const currentYear = new Date().getFullYear();
  const data = await get<{ results: SpeciesCount[] }>(
    "/observations/species_counts",
    {
      lat,
      lng,
      radius: radiusKm,
      quality_grade: "research",
      per_page: 100,
      d1: `${currentYear - 1}-01-01`,
      d2: `${currentYear}-12-31`,
    }
  );
  return data.results || [];
}

export async function fetchRecentObservations(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<ObservationResult[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const data = await get<{ results: ObservationResult[] }>("/observations", {
    lat,
    lng,
    radius: radiusKm,
    quality_grade: "research",
    per_page: 100,
    order: "desc",
    order_by: "observed_on",
    d1: thirtyDaysAgo.toISOString().split("T")[0],
  });
  return data.results || [];
}

export async function fetchSeasonalityData(
  taxonId: number
): Promise<Array<{ month: number; count: number }>> {
  const data = await get<HistogramResult>("/observations/histogram", {
    taxon_id: taxonId,
    date_field: "observed",
    interval: "month",
  });
  const monthly: Record<number, number> = {};
  Object.entries(data.results || {}).forEach(([date, value]) => {
    const m = parseInt(date.slice(5, 7), 10);
    if (m >= 1 && m <= 12) {
      const n = typeof value === "number" ? value : Number(value);
      monthly[m] = (monthly[m] || 0) + (Number.isFinite(n) ? n : 0);
    }
  });
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: monthly[i + 1] || 0,
  }));
}

export async function fetchYearlyHistogram(
  taxonId: number
): Promise<Array<{ year: number; count: number }>> {
  const data = await get<HistogramResult>("/observations/histogram", {
    taxon_id: taxonId,
    date_field: "observed",
    interval: "year",
  });
  return Object.entries(data.results || {})
    .map(([date, value]) => {
      const n = typeof value === "number" ? value : Number(value);
      return { year: parseInt(date.slice(0, 4), 10), count: Number.isFinite(n) ? n : 0 };
    })
    .filter((e) => e.year >= 2000)
    .sort((a, b) => a.year - b.year);
}

const LIFE_STAGE_VALUES = [
  { id: 2, label: "Adult" },
  { id: 7, label: "Juvenile" },
  { id: 5, label: "Larva" },
  { id: 4, label: "Pupa" },
  { id: 6, label: "Egg" },
  { id: 3, label: "Teneral" },
  { id: 9, label: "Nymph" },
];

const SEX_VALUES = [
  { id: 10, label: "Female" },
  { id: 11, label: "Male" },
  { id: 21, label: "Unknown" },
];

export async function fetchLifeStageCounts(
  taxonId: number
): Promise<Array<{ label: string; count: number }>> {
  const results = await Promise.all(
    LIFE_STAGE_VALUES.map(async ({ id, label }) => {
      try {
        const data = await get<{ total_results: number }>("/observations", {
          taxon_id: taxonId,
          term_id: 1,
          term_value_id: id,
          per_page: 0,
        });
        return { label, count: data.total_results || 0 };
      } catch {
        return { label, count: 0 };
      }
    })
  );
  return results.filter((r) => r.count > 0);
}

export async function fetchSexCounts(
  taxonId: number
): Promise<Array<{ label: string; count: number }>> {
  const results = await Promise.all(
    SEX_VALUES.map(async ({ id, label }) => {
      try {
        const data = await get<{ total_results: number }>("/observations", {
          taxon_id: taxonId,
          term_id: 9,
          term_value_id: id,
          per_page: 0,
        });
        return { label, count: data.total_results || 0 };
      } catch {
        return { label, count: 0 };
      }
    })
  );
  return results.filter((r) => r.count > 0);
}

export async function fetchHistoricalSpecies(
  lat: number,
  lng: number,
  radiusKm: number,
  yearsAgo: number
): Promise<SpeciesCount[]> {
  const year = new Date().getFullYear() - yearsAgo;
  const data = await get<{ results: SpeciesCount[] }>(
    "/observations/species_counts",
    {
      lat,
      lng,
      radius: radiusKm,
      quality_grade: "research",
      per_page: 100,
      d1: `${year}-01-01`,
      d2: `${year}-12-31`,
    }
  );
  return data.results || [];
}

export function getConservationLabel(status?: string): {
  label: string;
  color: string;
  severity: number;
} {
  const map: Record<string, { label: string; color: string; severity: number }> = {
    EX: { label: "Extinct", color: "#374151", severity: 0 },
    EW: { label: "Extinct in Wild", color: "#374151", severity: 1 },
    CR: { label: "Critically Endangered", color: "#DC2626", severity: 2 },
    EN: { label: "Endangered", color: "#EA580C", severity: 3 },
    VU: { label: "Vulnerable", color: "#D97706", severity: 4 },
    NT: { label: "Near Threatened", color: "#CA8A04", severity: 5 },
    LC: { label: "Least Concern", color: "#16A34A", severity: 6 },
    DD: { label: "Data Deficient", color: "#6B7280", severity: 7 },
  };
  if (!status) return { label: "Not Evaluated", color: "#6B7280", severity: 8 };
  return map[status.toUpperCase()] || { label: status, color: "#6B7280", severity: 8 };
}

export function getIconicGroup(iconicTaxonName?: string): string {
  const map: Record<string, string> = {
    Aves: "Birds",
    Plantae: "Plants",
    Insecta: "Insects",
    Mammalia: "Mammals",
    Amphibia: "Amphibians",
    Reptilia: "Reptiles",
    Fungi: "Fungi",
    Arachnida: "Arachnids",
    Actinopterygii: "Fish",
    Mollusca: "Mollusks",
    Animalia: "Animals",
  };
  return map[iconicTaxonName || ""] || "Other";
}

export function getGroupIcon(group: string): string {
  const map: Record<string, string> = {
    Birds: "feather",
    Plants: "leaf",
    Insects: "bug",
    Mammals: "paw-print",
    Amphibians: "droplets",
    Reptiles: "zap",
    Fungi: "circle",
    Fish: "fish",
    Other: "globe",
  };
  return map[group] || "circle";
}
