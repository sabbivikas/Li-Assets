import { enrichCard, type StoredCard } from "./lifeCards";
import type { SavedReport } from "./savedReports";
import { PAINT } from "@/components/paint/theme";

export type BadgeCategory =
  | "explorer"
  | "lifeweb"
  | "signal"
  | "civic"
  | "collection";

export type BadgeRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "keystone"
  | "legacy";

export interface BadgeDefinition {
  id: string;
  name: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  unlockCondition: string;
  meaning: string;
  target: number;
  icon: string;
  ctaKind: "explore" | "species" | "report";
}

export interface BadgeState {
  def: BadgeDefinition;
  progress: number;
  unlocked: boolean;
  earnedDate?: string;
  relatedTaxonIds: number[];
}

export const CATEGORY_META: Record<
  BadgeCategory,
  { label: string; tagline: string; color: string; icon: string }
> = {
  explorer: {
    label: "Explorer",
    tagline: "Discover species near you",
    color: PAINT.grass,
    icon: "compass",
  },
  lifeweb: {
    label: "Web of life",
    tagline: "Understand ecosystem roles",
    color: PAINT.pink,
    icon: "share-2",
  },
  signal: {
    label: "Signals",
    tagline: "Notice biodiversity change",
    color: PAINT.orange,
    icon: "activity",
  },
  civic: {
    label: "Civic",
    tagline: "Speak up for local life",
    color: PAINT.blue,
    icon: "send",
  },
  collection: {
    label: "Collection",
    tagline: "Complete species sets",
    color: PAINT.sun,
    icon: "layers",
  },
};

export const RARITY_META: Record<
  BadgeRarity,
  { label: string; color: string; ring: string }
> = {
  common: { label: "Common", color: PAINT.inkSoft, ring: PAINT.paperDeep },
  uncommon: { label: "Uncommon", color: PAINT.grassDeep, ring: PAINT.grass },
  rare: { label: "Rare", color: PAINT.purple, ring: PAINT.purple },
  keystone: { label: "Keystone", color: "#c98c1a", ring: PAINT.sun },
  legacy: { label: "Legacy", color: PAINT.red, ring: PAINT.pink },
};

/* ---------- definitions ---------- */

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Explorer
  {
    id: "first_discovery",
    name: "First Discovery",
    category: "explorer",
    rarity: "common",
    unlockCondition: "Unlock your first Life Card.",
    meaning: "Every life web starts with a single sighting.",
    target: 1,
    icon: "eye",
    ctaKind: "explore",
  },
  {
    id: "local_explorer",
    name: "Local Explorer",
    category: "explorer",
    rarity: "common",
    unlockCondition: "Unlock 10 Life Cards.",
    meaning: "Building a sense of who lives around you.",
    target: 10,
    icon: "map",
    ctaKind: "explore",
  },
  {
    id: "field_naturalist",
    name: "Field Naturalist",
    category: "explorer",
    rarity: "uncommon",
    unlockCondition: "Unlock 25 Life Cards.",
    meaning: "A real working knowledge of your local life.",
    target: 25,
    icon: "compass",
    ctaKind: "explore",
  },
  {
    id: "century_naturalist",
    name: "Century Naturalist",
    category: "explorer",
    rarity: "rare",
    unlockCondition: "Unlock 100 Life Cards.",
    meaning: "A standing record of biodiversity in your area.",
    target: 100,
    icon: "award",
    ctaKind: "explore",
  },

  // Life Web
  {
    id: "pollinator_protector",
    name: "Pollinator Protector",
    category: "lifeweb",
    rarity: "uncommon",
    unlockCondition: "Unlock 5 pollinator Life Cards.",
    meaning: "Pollinators carry one in three bites of food.",
    target: 5,
    icon: "feather",
    ctaKind: "species",
  },
  {
    id: "decomposer_defender",
    name: "Decomposer Defender",
    category: "lifeweb",
    rarity: "uncommon",
    unlockCondition: "Unlock 3 decomposer Life Cards.",
    meaning: "Decomposers turn yesterday into next year's soil.",
    target: 3,
    icon: "refresh-cw",
    ctaKind: "species",
  },
  {
    id: "bird_guardian",
    name: "Bird Guardian",
    category: "lifeweb",
    rarity: "uncommon",
    unlockCondition: "Unlock 10 bird Life Cards.",
    meaning: "Birds are the most visible signal of habitat health.",
    target: 10,
    icon: "wind",
    ctaKind: "species",
  },
  {
    id: "amphibian_watcher",
    name: "Amphibian Watcher",
    category: "lifeweb",
    rarity: "rare",
    unlockCondition: "Unlock 3 amphibian or reptile Life Cards.",
    meaning: "Cold-blooded indicators of clean water and edge habitat.",
    target: 3,
    icon: "droplet",
    ctaKind: "species",
  },
  {
    id: "plant_steward",
    name: "Plant Steward",
    category: "lifeweb",
    rarity: "common",
    unlockCondition: "Unlock 10 plant Life Cards.",
    meaning: "Plants are the foundation every other species rests on.",
    target: 10,
    icon: "git-branch",
    ctaKind: "species",
  },

  // Signal
  {
    id: "decline_signal_spotted",
    name: "Decline Signal Spotted",
    category: "signal",
    rarity: "uncommon",
    unlockCondition: "Notice your first missing-species signal.",
    meaning: "Noticing absences is how restoration begins.",
    target: 1,
    icon: "alert-circle",
    ctaKind: "explore",
  },
  {
    id: "missing_species_watch",
    name: "Missing Species Watch",
    category: "signal",
    rarity: "rare",
    unlockCondition: "Track 3 missing-species signals.",
    meaning: "A standing watch over what your area is losing.",
    target: 3,
    icon: "search",
    ctaKind: "explore",
  },
  {
    id: "data_gap_hunter",
    name: "Data Gap Hunter",
    category: "signal",
    rarity: "rare",
    unlockCondition: "Track 5 missing-species signals.",
    meaning: "Where the data is thin, attention matters most.",
    target: 5,
    icon: "target",
    ctaKind: "explore",
  },
  {
    id: "seasonal_shift_finder",
    name: "Seasonal Shift Finder",
    category: "signal",
    rarity: "uncommon",
    unlockCondition: "Notice a seasonal-signal Life Card.",
    meaning: "Phenology shifts are early signs of a changing climate.",
    target: 1,
    icon: "sunrise",
    ctaKind: "explore",
  },

  // Civic
  {
    id: "first_report",
    name: "First Report",
    category: "civic",
    rarity: "common",
    unlockCondition: "Generate your first civic report.",
    meaning: "Observation becomes voice the moment it is shared.",
    target: 1,
    icon: "file-text",
    ctaKind: "report",
  },
  {
    id: "community_voice",
    name: "Community Voice",
    category: "civic",
    rarity: "uncommon",
    unlockCondition: "Generate 3 civic reports.",
    meaning: "Repeated, careful messages get heard.",
    target: 3,
    icon: "message-square",
    ctaKind: "report",
  },
  {
    id: "policy_messenger",
    name: "Policy Messenger",
    category: "civic",
    rarity: "rare",
    unlockCondition: "Approve and send 1 civic report.",
    meaning: "A reviewed message is a careful one.",
    target: 1,
    icon: "send",
    ctaKind: "report",
  },
  {
    id: "local_advocate",
    name: "Local Advocate",
    category: "civic",
    rarity: "rare",
    unlockCondition: "Generate 5 civic reports.",
    meaning: "Steady civic attention, on the public record.",
    target: 5,
    icon: "flag",
    ctaKind: "report",
  },

  // Collection
  {
    id: "insect_set",
    name: "Insect Set",
    category: "collection",
    rarity: "uncommon",
    unlockCondition: "Unlock 10 insect Life Cards.",
    meaning: "Insects move energy through every food web.",
    target: 10,
    icon: "hexagon",
    ctaKind: "species",
  },
  {
    id: "bird_set",
    name: "Bird Set",
    category: "collection",
    rarity: "rare",
    unlockCondition: "Unlock 15 bird Life Cards.",
    meaning: "A dawn chorus you can recognise by name.",
    target: 15,
    icon: "wind",
    ctaKind: "species",
  },
  {
    id: "fungi_set",
    name: "Fungi Set",
    category: "collection",
    rarity: "rare",
    unlockCondition: "Unlock 5 fungi Life Cards.",
    meaning: "The hidden network beneath the forest floor.",
    target: 5,
    icon: "circle",
    ctaKind: "species",
  },
  {
    id: "keystone_collection",
    name: "Keystone Collection",
    category: "collection",
    rarity: "keystone",
    unlockCondition: "Unlock 5 keystone-role Life Cards.",
    meaning: "Keystone species hold whole ecosystems together.",
    target: 5,
    icon: "star",
    ctaKind: "species",
  },
];

/* ---------- compute ---------- */

function isAmphibianOrReptile(iconic?: string): boolean {
  return iconic === "Amphibia" || iconic === "Reptilia";
}

function isInsect(iconic?: string): boolean {
  return iconic === "Insecta";
}

function isBird(iconic?: string): boolean {
  return iconic === "Aves";
}

function isPlant(iconic?: string): boolean {
  return iconic === "Plantae";
}

function isFungi(iconic?: string): boolean {
  return iconic === "Fungi";
}

interface Inputs {
  cards: StoredCard[];
  reports: SavedReport[];
}

interface QualifyingEvents {
  // Each entry: the timestamp the event was recorded, plus optional related taxon.
  events: { timestamp: string; taxonId?: number }[];
}

function cardEvents(list: StoredCard[]): QualifyingEvents {
  return {
    events: list.map((c) => ({ timestamp: c.unlockedAt, taxonId: c.taxonId })),
  };
}

function reportEvents(list: SavedReport[]): QualifyingEvents {
  return {
    events: list.map((r) => ({ timestamp: r.generatedAt })),
  };
}

function qualifyingFor(def: BadgeDefinition, inputs: Inputs): QualifyingEvents {
  const { cards, reports } = inputs;
  const enriched = cards.map(enrichCard);

  switch (def.id) {
    case "first_discovery":
    case "local_explorer":
    case "field_naturalist":
    case "century_naturalist":
      return cardEvents(cards);

    case "pollinator_protector":
      return cardEvents(
        enriched.filter((c) => c.role.toLowerCase().includes("pollinator"))
      );
    case "decomposer_defender":
      return cardEvents(
        enriched.filter((c) => c.role.toLowerCase().includes("decomposer"))
      );
    case "bird_guardian":
    case "bird_set":
      return cardEvents(cards.filter((c) => isBird(c.iconicTaxonName)));
    case "amphibian_watcher":
      return cardEvents(
        cards.filter((c) => isAmphibianOrReptile(c.iconicTaxonName))
      );
    case "plant_steward":
      return cardEvents(cards.filter((c) => isPlant(c.iconicTaxonName)));
    case "insect_set":
      return cardEvents(cards.filter((c) => isInsect(c.iconicTaxonName)));
    case "fungi_set":
      return cardEvents(cards.filter((c) => isFungi(c.iconicTaxonName)));
    case "keystone_collection":
      return cardEvents(enriched.filter((c) => c.badges.includes("keystone")));

    case "decline_signal_spotted":
    case "missing_species_watch":
    case "data_gap_hunter":
      return cardEvents(cards.filter((c) => c.signalFlags.isMissing));
    case "seasonal_shift_finder":
      return cardEvents(cards.filter((c) => c.signalFlags.isSeasonal));

    case "first_report":
    case "community_voice":
    case "local_advocate":
      return reportEvents(reports);
    case "policy_messenger":
      return reportEvents(
        reports.filter((r) => r.approvalStatus === "approved")
      );

    default:
      return { events: [] };
  }
}

function buildState(def: BadgeDefinition, inputs: Inputs): BadgeState {
  const { events } = qualifyingFor(def, inputs);
  const sorted = [...events].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  const progress = sorted.length;
  const unlocked = progress >= def.target;
  const earnedDate = unlocked ? sorted[def.target - 1]?.timestamp : undefined;
  // Show the most recent qualifying species first for "Related species".
  const relatedTaxonIds = [...sorted]
    .reverse()
    .map((e) => e.taxonId)
    .filter((id): id is number => typeof id === "number")
    .slice(0, 6);
  return {
    def,
    progress: Math.min(progress, def.target),
    unlocked,
    earnedDate,
    relatedTaxonIds,
  };
}

export function computeBadgeStates(inputs: Inputs): BadgeState[] {
  return BADGE_DEFINITIONS.map((def) => buildState(def, inputs));
}

export function getBadgeState(
  id: string,
  inputs: Inputs
): BadgeState | undefined {
  const def = BADGE_DEFINITIONS.find((d) => d.id === id);
  if (!def) return undefined;
  return buildState(def, inputs);
}

export function getFeaturedBadges(states: BadgeState[]): BadgeState[] {
  // Show a balanced mix: prefer ones close to unlocking or recently unlocked,
  // covering all 5 categories.
  const byCat = new Map<BadgeCategory, BadgeState[]>();
  for (const s of states) {
    const arr = byCat.get(s.def.category) ?? [];
    arr.push(s);
    byCat.set(s.def.category, arr);
  }

  const featured: BadgeState[] = [];
  const order: BadgeCategory[] = [
    "explorer",
    "lifeweb",
    "signal",
    "civic",
    "collection",
  ];
  for (const cat of order) {
    const arr = byCat.get(cat) ?? [];
    // Prefer unlocked, then highest progress fraction.
    const sorted = [...arr].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progress / b.def.target - a.progress / a.def.target;
    });
    if (sorted[0]) featured.push(sorted[0]);
  }
  // Fill up to 6 with the next-best from any category.
  const used = new Set(featured.map((s) => s.def.id));
  const remaining = states
    .filter((s) => !used.has(s.def.id))
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progress / b.def.target - a.progress / a.def.target;
    });
  while (featured.length < 6 && remaining.length > 0) {
    featured.push(remaining.shift()!);
  }
  return featured;
}
