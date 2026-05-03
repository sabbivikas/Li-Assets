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

async function get<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    )
  ).toString();
  const url = `${BASE_URL}${path}${query ? "?" + query : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`iNat API error: ${resp.status}`);
  return resp.json();
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
