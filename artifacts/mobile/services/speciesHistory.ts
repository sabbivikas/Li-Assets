import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SpeciesCount } from "./iNaturalist";

const HISTORY_KEY = "natura.speciesHistory.v2";
const DISMISSED_KEY = "natura.dismissedAlerts.v1";
const MAX_RECORDS = 300;
const MISSING_THRESHOLD_MS = 48 * 60 * 60 * 1000;
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const AT_RISK_STATUSES = new Set(["CR", "EN", "VU"]);
const RESIDENT_MIN_COUNT = 3;

export interface SpeciesRecord {
  taxonId: number;
  name: string;
  lastSeen: number;
  seenCount: number;
  firstSeen: number;
  threatened: boolean;
  iucnStatus?: string;
}

export type AlertKind = "at_risk_missing" | "new_arrival" | "resident_missing";

export interface SpeciesAlert {
  kind: AlertKind;
  taxonId: number;
  name: string;
  lastSeenMs: number;
  priority: number;
}

type LocationHistory = Record<number, SpeciesRecord>;
type AllHistory = Record<string, LocationHistory>;
type DismissedMap = Record<number, number>;

async function loadAllHistory(): Promise<AllHistory> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AllHistory;
  } catch {
    return {};
  }
}

async function saveAllHistory(all: AllHistory): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  } catch {
    // non-fatal
  }
}

export async function loadDismissed(): Promise<DismissedMap> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DismissedMap;
  } catch {
    return {};
  }
}

async function saveDismissed(map: DismissedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  } catch {
    // non-fatal
  }
}

export async function dismissAlert(taxonId: number): Promise<void> {
  const map = await loadDismissed();
  map[taxonId] = Date.now();
  await saveDismissed(map);
}

function isDismissed(taxonId: number, dismissed: DismissedMap): boolean {
  const ts = dismissed[taxonId];
  if (!ts) return false;
  return Date.now() - ts < DISMISS_TTL_MS;
}

export interface UpsertResult {
  newArrivals: Set<number>;
  history: LocationHistory;
}

/**
 * Upsert history for a location key.
 * Returns the updated history AND the set of taxon IDs that were brand-new
 * (detected before the upsert). Both values come from the same operation so
 * callers never need a separate loadLocationHistory call afterwards.
 */
export async function upsertSpeciesHistory(
  locationKey: string,
  speciesCounts: SpeciesCount[],
): Promise<UpsertResult> {
  const all = await loadAllHistory();
  const existing: LocationHistory = all[locationKey] ?? {};
  const now = Date.now();

  const newArrivals = new Set<number>();

  for (const sc of speciesCounts) {
    const taxon = sc.taxon;
    if (!taxon?.id) continue;
    const id = taxon.id;
    const name = taxon.preferred_common_name || taxon.name || String(id);
    const threatened = taxon.threatened === true;
    const iucnStatus = taxon.conservation_status?.status?.toUpperCase();

    if (!existing[id]) {
      newArrivals.add(id);
      existing[id] = {
        taxonId: id,
        name,
        lastSeen: now,
        seenCount: 1,
        firstSeen: now,
        threatened,
        iucnStatus,
      };
    } else {
      existing[id] = {
        ...existing[id],
        name,
        lastSeen: now,
        seenCount: existing[id].seenCount + 1,
        threatened,
        iucnStatus,
      };
    }
  }

  // Evict least-recently-seen if over cap
  const records = Object.values(existing);
  let updatedHistory: LocationHistory;
  if (records.length > MAX_RECORDS) {
    records.sort((a, b) => b.lastSeen - a.lastSeen);
    const keep = records.slice(0, MAX_RECORDS);
    updatedHistory = {};
    for (const r of keep) updatedHistory[r.taxonId] = r;
  } else {
    updatedHistory = existing;
  }

  all[locationKey] = updatedHistory;
  await saveAllHistory(all);
  return { newArrivals, history: updatedHistory };
}

export async function loadLocationHistory(
  locationKey: string,
): Promise<LocationHistory> {
  const all = await loadAllHistory();
  return all[locationKey] ?? {};
}

/**
 * Pure function: pick the single highest-priority alert to show.
 *
 * Priority order:
 *   1. at_risk_missing  (threatened + not seen for 48h)
 *   2. new_arrival      (first time appearing in this location's history)
 *   3. resident_missing (seen ≥ 3 times, not seen for 48h, not threatened)
 */
export function selectTopAlert(
  history: LocationHistory,
  currentTaxonIds: Set<number>,
  newArrivalIds: Set<number>,
  dismissed: DismissedMap,
): SpeciesAlert | null {
  const now = Date.now();
  let best: SpeciesAlert | null = null;

  function pick(candidate: SpeciesAlert) {
    if (!best || candidate.priority < best.priority) best = candidate;
  }

  // 1. New arrivals (priority 2) — use currentTaxonIds to get the name
  for (const taxonId of newArrivalIds) {
    if (isDismissed(taxonId, dismissed)) continue;
    const rec = history[taxonId];
    if (!rec) continue;
    pick({
      kind: "new_arrival",
      taxonId,
      name: rec.name,
      lastSeenMs: rec.lastSeen,
      priority: 2,
    });
  }

  // 2. Scan history for missing species
  for (const rec of Object.values(history)) {
    if (isDismissed(rec.taxonId, dismissed)) continue;
    if (currentTaxonIds.has(rec.taxonId)) continue; // still active — not missing
    if (now - rec.lastSeen <= MISSING_THRESHOLD_MS) continue; // seen recently

    const isAtRisk =
      rec.threatened ||
      (rec.iucnStatus !== undefined && AT_RISK_STATUSES.has(rec.iucnStatus));

    if (isAtRisk) {
      pick({
        kind: "at_risk_missing",
        taxonId: rec.taxonId,
        name: rec.name,
        lastSeenMs: rec.lastSeen,
        priority: 1,
      });
    } else if (rec.seenCount >= RESIDENT_MIN_COUNT) {
      pick({
        kind: "resident_missing",
        taxonId: rec.taxonId,
        name: rec.name,
        lastSeenMs: rec.lastSeen,
        priority: 3,
      });
    }
  }

  return best;
}

export function formatDaysAgo(ms: number): string {
  const days = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
