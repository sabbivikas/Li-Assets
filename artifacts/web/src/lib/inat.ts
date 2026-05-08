const BASE = "https://api.inaturalist.org/v1";

async function get<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]))
  ).toString();
  const url = BASE + path + (q ? "?" + q : "");
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error("iNat " + resp.status);
  return resp.json() as T;
}

export interface INatTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  iconic_taxon_name?: string;
  default_photo?: { medium_url?: string; square_url?: string };
  wikipedia_url?: string;
  observations_count?: number;
  conservation_status?: { status: string; status_name?: string };
  taxon_photos?: Array<{ photo: { medium_url?: string; large_url?: string } }>;
  rank?: string;
}

export interface SpeciesCount { count: number; taxon: INatTaxon; }
export interface HistogramResult { results: Record<string, number>; }

export const fetchNearbySpecies = (lat: number, lng: number, radius = 10, perPage = 100) =>
  get<{ results: SpeciesCount[] }>("/observations/species_counts", { lat, lng, radius, quality_grade: "research", per_page: perPage, order: "desc", order_by: "count" }).then(r => r.results || []);

export const fetchSpeciesById = (id: number) =>
  get<{ results: INatTaxon[] }>("/taxa/" + id).then(r => r.results?.[0] || null);

export const fetchHistogram = (taxonId: number, lat: number, lng: number, radius = 10) =>
  get<HistogramResult>("/observations/histogram", { taxon_id: taxonId, lat, lng, radius, date_field: "observed", interval: "month" });

export const fetchCurrentYearSpecies = (lat: number, lng: number, radius = 10) => {
  const y = new Date().getFullYear();
  return get<{ results: SpeciesCount[] }>("/observations/species_counts", { lat, lng, radius, quality_grade: "research", per_page: 100, d1: y + "-01-01", d2: y + "-12-31" }).then(r => r.results || []);
};

export const fetchPriorYearSpecies = (lat: number, lng: number, radius = 10) => {
  const y = new Date().getFullYear() - 1;
  return get<{ results: SpeciesCount[] }>("/observations/species_counts", { lat, lng, radius, quality_grade: "research", per_page: 100, d1: y + "-01-01", d2: y + "-12-31" }).then(r => r.results || []);
};

export function getIconicGroup(name?: string): string {
  const m: Record<string,string> = { Aves:"Birds", Plantae:"Plants", Insecta:"Insects", Mammalia:"Mammals", Amphibia:"Amphibians", Reptilia:"Reptiles", Fungi:"Fungi", Arachnida:"Arachnids", Actinopterygii:"Fish" };
  return m[name || ""] || "Other";
}

export function getConservationLabel(status?: string): { label: string; color: string } {
  const m: Record<string,{label:string;color:string}> = {
    EX:{label:"Extinct",color:"#374151"}, EW:{label:"Extinct in Wild",color:"#374151"},
    CR:{label:"Critically Endangered",color:"#DC2626"}, EN:{label:"Endangered",color:"#EA580C"},
    VU:{label:"Vulnerable",color:"#D97706"}, NT:{label:"Near Threatened",color:"#CA8A04"},
    LC:{label:"Least Concern",color:"#16A34A"}, DD:{label:"Data Deficient",color:"#6B7280"}
  };
  if (!status) return { label: "Not Evaluated", color: "#6B7280" };
  return m[status.toUpperCase()] || { label: status, color: "#6B7280" };
}