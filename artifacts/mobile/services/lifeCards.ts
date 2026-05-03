import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getEcosystemRoles,
  getRoleLabel,
  type EcosystemRole,
} from "./ecologyModel";
import {
  getConservationLabel,
  getIconicGroup,
  type INatTaxon,
  type SpeciesCount,
} from "./iNaturalist";

const KEY = "lifeweb.lifecards.v1";
const MAX_CARDS = 200;

export type UnlockMethod =
  | "discovery"
  | "new_activity"
  | "missing"
  | "impact"
  | "contribution";

export type CardBadge =
  | "common"
  | "rare"
  | "seasonal"
  | "missing"
  | "keystone"
  | "sensitive";

export type CardLevel = 1 | 2 | 3 | 4 | 5;

const KEYSTONE_ROLES: EcosystemRole[] = [
  "pollinator",
  "decomposer",
  "predator",
  "seed_disperser",
  "indicator",
];

export interface StoredCard {
  taxonId: number;
  taxonName: string;
  commonName?: string;
  iconicTaxonName?: string;
  photoUrl?: string;
  conservationStatus?: string;
  unlockedAt: string;
  lastUpdatedAt: string;
  unlockMethods: UnlockMethod[];
  nearbyCount: number;
  lastSeenDate?: string;
  notes?: string;
  signalFlags: {
    isMissing: boolean;
    isNewActivity: boolean;
    isSeasonal: boolean;
  };
}

export interface LifeCard extends StoredCard {
  level: CardLevel;
  badges: CardBadge[];
  role: string;
  group: string;
  confidence: number;
  isSensitive: boolean;
}

/* ---------- storage ---------- */

export async function loadCards(): Promise<StoredCard[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredCard[]) : [];
  } catch {
    return [];
  }
}

async function persist(cards: StoredCard[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(cards.slice(0, MAX_CARDS)));
}

export async function clearCards(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function deleteCard(taxonId: number): Promise<StoredCard[]> {
  return enqueue(async () => {
    const list = await loadCards();
    const next = list.filter((c) => c.taxonId !== taxonId);
    await persist(next);
    return next;
  });
}

/* ---------- unlock ---------- */

export interface UnlockContext {
  method: UnlockMethod;
  taxon: Pick<
    INatTaxon,
    | "id"
    | "name"
    | "preferred_common_name"
    | "iconic_taxon_name"
    | "default_photo"
    | "conservation_status"
  >;
  nearbyCount?: number;
  lastSeenDate?: string;
  signalFlags?: Partial<StoredCard["signalFlags"]>;
}

// Serialize all storage mutations through a single chained promise so concurrent
// unlock calls (e.g. Discovery + Impact firing on the same taxon, or two species
// pages opened in quick succession) cannot clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => undefined);
  return next;
}

export function unlockCard(ctx: UnlockContext): Promise<{
  card: StoredCard;
  isNew: boolean;
  cards: StoredCard[];
}> {
  return enqueue(() => unlockCardInternal(ctx));
}

async function unlockCardInternal(ctx: UnlockContext): Promise<{
  card: StoredCard;
  isNew: boolean;
  cards: StoredCard[];
}> {
  const list = await loadCards();
  const idx = list.findIndex((c) => c.taxonId === ctx.taxon.id);
  const now = new Date().toISOString();
  const photo =
    ctx.taxon.default_photo?.medium_url || ctx.taxon.default_photo?.square_url;

  if (idx === -1) {
    const card: StoredCard = {
      taxonId: ctx.taxon.id,
      taxonName: ctx.taxon.name,
      commonName: ctx.taxon.preferred_common_name,
      iconicTaxonName: ctx.taxon.iconic_taxon_name,
      photoUrl: photo,
      conservationStatus: ctx.taxon.conservation_status?.status,
      unlockedAt: now,
      lastUpdatedAt: now,
      unlockMethods: [ctx.method],
      nearbyCount: ctx.nearbyCount ?? 0,
      lastSeenDate: ctx.lastSeenDate,
      signalFlags: {
        isMissing: false,
        isNewActivity: false,
        isSeasonal: false,
        ...ctx.signalFlags,
      },
    };
    const next = [card, ...list];
    await persist(next);
    return { card, isNew: true, cards: next };
  }

  const existing = list[idx];
  const merged: StoredCard = {
    ...existing,
    photoUrl: existing.photoUrl || photo,
    commonName: existing.commonName || ctx.taxon.preferred_common_name,
    iconicTaxonName:
      existing.iconicTaxonName || ctx.taxon.iconic_taxon_name,
    conservationStatus:
      existing.conservationStatus || ctx.taxon.conservation_status?.status,
    nearbyCount: ctx.nearbyCount ?? existing.nearbyCount,
    lastSeenDate: ctx.lastSeenDate ?? existing.lastSeenDate,
    lastUpdatedAt: now,
    unlockMethods: existing.unlockMethods.includes(ctx.method)
      ? existing.unlockMethods
      : [...existing.unlockMethods, ctx.method],
    signalFlags: {
      ...existing.signalFlags,
      ...ctx.signalFlags,
    },
  };
  const next = [...list];
  next[idx] = merged;
  await persist(next);
  return { card: merged, isNew: false, cards: next };
}

export function setCardNote(taxonId: number, note: string): Promise<void> {
  return enqueue(async () => {
    const list = await loadCards();
    const idx = list.findIndex((c) => c.taxonId === taxonId);
    if (idx === -1) return;
    list[idx] = {
      ...list[idx],
      notes: note,
      lastUpdatedAt: new Date().toISOString(),
    };
    await persist(list);
  });
}

/* ---------- enrichment ---------- */

export function enrichCard(card: StoredCard): LifeCard {
  const roles = getEcosystemRoles(card.iconicTaxonName, card.commonName);
  const primary = roles[0];
  const role = getRoleLabel(primary);
  const group = getIconicGroup(card.iconicTaxonName);
  const isSensitive =
    !!card.conservationStatus &&
    getConservationLabel(card.conservationStatus).label !== "Least Concern";

  // Badges
  const badges: CardBadge[] = [];
  if (card.nearbyCount >= 20) badges.push("common");
  if (card.nearbyCount > 0 && card.nearbyCount < 5) badges.push("rare");
  if (KEYSTONE_ROLES.includes(primary)) badges.push("keystone");
  if (card.signalFlags.isMissing) badges.push("missing");
  if (card.signalFlags.isSeasonal) badges.push("seasonal");
  if (isSensitive) badges.push("sensitive");

  // Level: number of progression milestones met
  let level = 1; // Seen
  if (card.nearbyCount > 0) level = 2; // Observed Nearby
  if (card.unlockMethods.includes("impact")) level = Math.max(level, 3);
  if (
    card.signalFlags.isMissing ||
    card.signalFlags.isNewActivity ||
    badges.includes("rare") ||
    badges.includes("keystone")
  )
    level = Math.max(level, 4);
  if (level >= 4 && card.unlockMethods.includes("impact")) level = 5;

  // Confidence: simple heuristic
  // count contribution + research metadata bonus
  const countScore = Math.min(60, card.nearbyCount * 2);
  const metaBonus =
    (card.lastSeenDate ? 15 : 0) +
    (card.unlockMethods.length > 1 ? 10 : 0) +
    (card.conservationStatus ? 15 : 0);
  const confidence = Math.min(100, countScore + metaBonus);

  return {
    ...card,
    level: Math.min(5, Math.max(1, level)) as CardLevel,
    badges,
    role,
    group,
    confidence,
    isSensitive,
  };
}

export const BADGE_META: Record<
  CardBadge,
  { label: string; color: string; description: string }
> = {
  common: {
    label: "Common",
    color: "#7fc77f",
    description: "Frequently observed nearby.",
  },
  rare: {
    label: "Rare",
    color: "#a78bd9",
    description: "Few nearby observations.",
  },
  seasonal: {
    label: "Seasonal",
    color: "#f08a3a",
    description: "Strongest in certain months.",
  },
  missing: {
    label: "Missing",
    color: "#e25555",
    description: "Historically observed; not recently seen.",
  },
  keystone: {
    label: "Keystone",
    color: "#ffd24a",
    description: "Important ecosystem role.",
  },
  sensitive: {
    label: "Sensitive",
    color: "#5b8def",
    description: "Conservation-sensitive — locations are generalised.",
  },
};

export const LEVEL_NAMES: Record<CardLevel, string> = {
  1: "Seen",
  2: "Observed Nearby",
  3: "Understood",
  4: "Signal Detected",
  5: "Action Ready",
};

/* ---------- helpers for collection screens ---------- */

export function detectMissingFromCounts(
  recent: SpeciesCount[],
  historical: SpeciesCount[]
): number[] {
  const recentIds = new Set(recent.map((s) => s.taxon.id));
  return historical
    .filter((s) => !recentIds.has(s.taxon.id) && s.count >= 3)
    .map((s) => s.taxon.id);
}
