import {
  buildImpactChain,
  getEcosystemRoles,
  getRoleLabel,
} from "@/services/ecologyModel";
import {
  getConservationLabel,
  getIconicGroup,
  type SpeciesCount,
} from "@/services/iNaturalist";

export type ReportType =
  | "species_concern"
  | "biodiversity_change"
  | "pollinator_decline"
  | "invasive_watch"
  | "area_summary";

export type GroupFilter =
  | "all"
  | "Birds"
  | "Plants"
  | "Insects"
  | "Pollinators"
  | "Amphibians"
  | "Fungi"
  | "Mammals"
  | "Reptiles";

export interface ReportTypeMeta {
  id: ReportType;
  title: string;
  blurb: string;
  emoji: string;
  needsSpecies: boolean;
  defaultGroup?: GroupFilter;
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  {
    id: "species_concern",
    title: "Species Concern Report",
    blurb: "Flag a single species that may need a closer look.",
    emoji: "🦋",
    needsSpecies: true,
  },
  {
    id: "biodiversity_change",
    title: "Local Biodiversity Change",
    blurb: "Compare what's around now versus the past few years.",
    emoji: "🌿",
    needsSpecies: false,
    defaultGroup: "all",
  },
  {
    id: "pollinator_decline",
    title: "Pollinator Decline Signal",
    blurb: "Highlight bee, butterfly, and pollinator activity.",
    emoji: "🐝",
    needsSpecies: false,
    defaultGroup: "Pollinators",
  },
  {
    id: "invasive_watch",
    title: "Invasive Species Watch",
    blurb: "Note non-native species showing up nearby.",
    emoji: "🚩",
    needsSpecies: true,
  },
  {
    id: "area_summary",
    title: "Park / Area Biodiversity Summary",
    blurb: "A general picture of what lives in this place.",
    emoji: "🗺️",
    needsSpecies: false,
    defaultGroup: "all",
  },
];

export const RECIPIENT_CATEGORIES = [
  "City Council",
  "Parks Department",
  "Environmental Agency",
  "Local Newspaper",
  "Conservation Nonprofit",
  "School / University",
] as const;

export type RecipientCategory = (typeof RECIPIENT_CATEGORIES)[number];

export interface Recipient {
  id: string;
  name: string;
  role: string;
  organization: string;
  category: RecipientCategory;
  city: string;
  state: string;
  email: string;
  website: string;
}

export const MOCK_RECIPIENTS: Recipient[] = [
  {
    id: "council-clerk",
    name: "City Council Clerk",
    role: "Council Clerk",
    organization: "City Council",
    category: "City Council",
    city: "Your City",
    state: "—",
    email: "council@yourcity.gov",
    website: "https://yourcity.gov",
  },
  {
    id: "parks-director",
    name: "Parks Department",
    role: "Director",
    organization: "Parks & Recreation",
    category: "Parks Department",
    city: "Your City",
    state: "—",
    email: "parks@yourcity.gov",
    website: "https://yourcity.gov/parks",
  },
  {
    id: "env-agency",
    name: "Environmental Agency",
    role: "Public Inquiries",
    organization: "State Environmental Agency",
    category: "Environmental Agency",
    city: "Your State",
    state: "—",
    email: "info@state-env.gov",
    website: "https://state-env.gov",
  },
  {
    id: "newspaper",
    name: "Local Newspaper",
    role: "Environment Reporter",
    organization: "Local News",
    category: "Local Newspaper",
    city: "Your City",
    state: "—",
    email: "environment@localnews.com",
    website: "https://localnews.com",
  },
  {
    id: "nonprofit",
    name: "Conservation Nonprofit",
    role: "Conservation Director",
    organization: "Local Conservation Group",
    category: "Conservation Nonprofit",
    city: "Your City",
    state: "—",
    email: "info@localconservation.org",
    website: "https://localconservation.org",
  },
  {
    id: "university",
    name: "University Biology Dept",
    role: "Department Inquiries",
    organization: "Local University",
    category: "School / University",
    city: "Your City",
    state: "—",
    email: "biology@localuniversity.edu",
    website: "https://localuniversity.edu/biology",
  },
];

export const DISCLAIMER =
  "This report is generated from publicly available community science observations, including iNaturalist data. It is intended to raise awareness and support further review. It should not be interpreted as a formal scientific, legal, or regulatory determination.";

export const APPROVAL_TEXT =
  "I have reviewed this message and understand that it is based on community observation data and is intended to request awareness or review, not make legal claims.";

export interface ReportInputs {
  type: ReportType;
  city: string;
  radiusKm: number;
  group: GroupFilter;
  current: SpeciesCount[];
  historical: SpeciesCount[];
  focusSpecies?: SpeciesCount;
  aiOverride?: {
    title?: string;
    executiveSummary?: string;
    keyFinding?: string;
    whyItMatters?: string;
    bullets?: string[];
    recommendations?: string[];
  };
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  city: string;
  radiusKm: number;
  group: GroupFilter;
  focusSpeciesId?: number;
  focusSpeciesName?: string;
  observationsCount: number;
  uniqueSpeciesCount: number;
  bullets: string[];
  whyItMatters: string;
  body: string;
}

const POLLINATOR_GROUPS = new Set(["Insects", "Birds"]);

function filterByGroup(list: SpeciesCount[], group: GroupFilter): SpeciesCount[] {
  if (group === "all") return list;
  if (group === "Pollinators") {
    return list.filter((s) => {
      const g = getIconicGroup(s.taxon.iconic_taxon_name);
      const name = (s.taxon.preferred_common_name || s.taxon.name).toLowerCase();
      if (!POLLINATOR_GROUPS.has(g)) return false;
      return (
        g === "Insects" ||
        name.includes("bee") ||
        name.includes("butterfly") ||
        name.includes("hummingbird") ||
        name.includes("moth")
      );
    });
  }
  return list.filter((s) => getIconicGroup(s.taxon.iconic_taxon_name) === group);
}

function fmtDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function pluralize(n: number, w: string): string {
  return `${n} ${w}${n === 1 ? "" : "s"}`;
}

export function generateReport(inputs: ReportInputs): GeneratedReport {
  const meta = REPORT_TYPES.find((t) => t.id === inputs.type)!;
  const filteredCurrent = filterByGroup(inputs.current, inputs.group);
  const filteredHistorical = filterByGroup(inputs.historical, inputs.group);
  const focus = inputs.focusSpecies;
  const totalObs = filteredCurrent.reduce((a, b) => a + b.count, 0);
  const histObs = filteredHistorical.reduce((a, b) => a + b.count, 0);
  const uniqueSpecies = filteredCurrent.length;

  const focusTaxon = focus?.taxon;
  const focusCommon = focusTaxon?.preferred_common_name || focusTaxon?.name;
  const roles = focusTaxon
    ? getEcosystemRoles(focusTaxon.iconic_taxon_name, focusTaxon.preferred_common_name)
    : [];
  const primaryRole = focusTaxon ? getRoleLabel(roles[0]) : "";
  const conservation = getConservationLabel(focusTaxon?.conservation_status?.status);
  const chain = focusTaxon
    ? buildImpactChain(
        focusTaxon.name,
        focusTaxon.iconic_taxon_name,
        focusTaxon.preferred_common_name
      )
    : null;

  const ai = inputs.aiOverride;

  // Title per type
  let title = "";
  switch (inputs.type) {
    case "species_concern":
      title = focusCommon
        ? `Species Concern Report: ${focusCommon} in ${inputs.city}`
        : `Species Concern Report: ${inputs.city}`;
      break;
    case "biodiversity_change":
      title = `Local Biodiversity Change Report: ${inputs.city}`;
      break;
    case "pollinator_decline":
      title = `Pollinator Activity Signal: ${inputs.city}`;
      break;
    case "invasive_watch":
      title = focusCommon
        ? `Invasive Species Watch: ${focusCommon} near ${inputs.city}`
        : `Invasive Species Watch: ${inputs.city}`;
      break;
    case "area_summary":
      title = `Biodiversity Summary: ${inputs.city}`;
      break;
  }
  if (ai?.title) title = ai.title;

  // Executive summary
  let summary = "";
  if (inputs.type === "species_concern" && focusCommon) {
    summary = `Community scientists have logged ${pluralize(focus!.count, "research-grade observation")} of ${focusCommon} within ${inputs.radiusKm}km of ${inputs.city}. This species plays the role of ${primaryRole.toLowerCase()} in local food webs. The data may suggest a signal worth a closer look from local stewards.`;
  } else if (inputs.type === "biodiversity_change") {
    const direction = totalObs >= histObs ? "broadly comparable to" : "lower than";
    summary = `Recent observations near ${inputs.city} (${pluralize(totalObs, "sighting")} across ${pluralize(uniqueSpecies, "species")}) appear ${direction} the same window in past years (${histObs} historical sightings). This may indicate a possible community-observed shift worth further review.`;
  } else if (inputs.type === "pollinator_decline") {
    const direction = totalObs < histObs ? "appear lower compared with" : "appear comparable to";
    summary = `Recent pollinator observations near ${inputs.city} ${direction} historical observations during similar months. Volunteer-reported sightings suggest a signal that could benefit from review by local pollinator-monitoring efforts.`;
  } else if (inputs.type === "invasive_watch" && focusCommon) {
    summary = `${focusCommon} has been recorded ${pluralize(focus!.count, "time")} within ${inputs.radiusKm}km of ${inputs.city}. Where this is a non-native species, monitoring its spread and consulting local ecology experts could be valuable.`;
  } else {
    summary = `This summary reflects ${pluralize(totalObs, "research-grade community observation")} across ${pluralize(uniqueSpecies, "species")} within ${inputs.radiusKm}km of ${inputs.city}. It offers a snapshot of local biodiversity drawn from public observation data.`;
  }
  if (ai?.executiveSummary) summary = ai.executiveSummary;

  // Key finding
  let keyFinding = "";
  if (inputs.type === "species_concern" && focusCommon) {
    keyFinding = `${focusCommon} has been observed ${pluralize(focus!.count, "time")} recently. The species' ecological role and any change in observation frequency may benefit from review.`;
  } else if (inputs.type === "biodiversity_change") {
    keyFinding =
      totalObs < histObs
        ? "Observation volume in the analyzed window appears lower than the historical comparison window. Lower observations do not necessarily mean fewer animals."
        : "Observation volume in the analyzed window appears comparable to or higher than the historical window.";
  } else if (inputs.type === "pollinator_decline") {
    keyFinding =
      totalObs < histObs
        ? "Recent pollinator observations appear lower compared with historical observations during similar months."
        : "Recent pollinator observations appear comparable to historical observations.";
  } else if (inputs.type === "invasive_watch" && focusCommon) {
    keyFinding = `${focusCommon} appears in the area's recent observations. Where this is a non-native species, watching for spread is recommended.`;
  } else {
    keyFinding = `${pluralize(uniqueSpecies, "species")} have been observed in this area in the analyzed window.`;
  }
  if (ai?.keyFinding) keyFinding = ai.keyFinding;

  // Why it matters
  let whyItMatters = "";
  if (chain) {
    whyItMatters = chain.summary;
  } else if (inputs.type === "pollinator_decline") {
    whyItMatters =
      "Pollinators support flowering plants. If pollinator activity declines, plant reproduction may be affected, which can reduce food and habitat for other species in the local food web.";
  } else if (inputs.type === "biodiversity_change") {
    whyItMatters =
      "Local biodiversity supports pollination, pest control, soil health, and habitat for many species. Changes in observation patterns may reflect habitat conditions worth reviewing.";
  } else if (inputs.type === "invasive_watch") {
    whyItMatters =
      "Non-native species can sometimes outcompete local plants and animals, affecting food webs and habitat structure. Early monitoring is often the most cost-effective response.";
  } else {
    whyItMatters =
      "Healthy local biodiversity supports pollination, water quality, soil health, and the wellbeing of human communities. A clear baseline helps inform stewardship decisions.";
  }
  if (ai?.whyItMatters) whyItMatters = ai.whyItMatters;

  // Top species details
  const topSpecies = filteredCurrent.slice(0, 5);

  const speciesBlocks = topSpecies
    .map((s) => {
      const r = getEcosystemRoles(
        s.taxon.iconic_taxon_name,
        s.taxon.preferred_common_name
      );
      const status = getConservationLabel(s.taxon.conservation_status?.status);
      return [
        `• ${s.taxon.preferred_common_name || s.taxon.name} (${s.taxon.name})`,
        `    Role: ${getRoleLabel(r[0])}`,
        `    Recent observations: ${s.count}`,
        status.label !== "Least Concern"
          ? `    Conservation: ${status.label}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  // Recommendations per type
  const recommendations: Record<ReportType, string[]> = {
    species_concern: [
      "Review habitat conditions in nearby parks or open space",
      "Consult a local wildlife biologist or extension office",
      "Encourage continued community monitoring",
      "Consider native planting programs that support this species' food and shelter needs",
    ],
    biodiversity_change: [
      "Review habitat conditions in the area",
      "Support native planting where appropriate",
      "Reduce pesticide exposure where possible",
      "Encourage continued community science participation",
      "Consult local ecology experts for context",
    ],
    pollinator_decline: [
      "Support native flowering plant programs",
      "Reduce pesticide exposure where possible",
      "Encourage pollinator-friendly mowing schedules in parks",
      "Promote community pollinator monitoring",
    ],
    invasive_watch: [
      "Confirm species identification with a local extension office",
      "Avoid spreading plant or animal material between sites",
      "Support local invasive-species removal volunteer programs",
      "Monitor neighboring areas for further spread",
    ],
    area_summary: [
      "Use this as a baseline for ongoing monitoring",
      "Encourage community members to add observations",
      "Share with local stewards to inform habitat decisions",
    ],
  };

  const limitations = [
    "iNaturalist data depends on public observations, which vary by season, weather, and observer activity.",
    "Lack of observations does not always mean species are absent.",
    "Sensitive or protected species locations may be obscured in the underlying data.",
    "Findings should be verified by local experts before being used for decisions.",
  ];

  // Build the long-form body
  const sections: string[] = [];

  sections.push(title);
  sections.push("=".repeat(Math.min(60, title.length)));
  sections.push("");

  sections.push("EXECUTIVE SUMMARY");
  sections.push(summary);
  sections.push("");

  sections.push("LOCATION & TIMEFRAME");
  sections.push(`Area:       ${inputs.city}`);
  sections.push(`Radius:     ${inputs.radiusKm} km`);
  sections.push(`Generated:  ${fmtDate()}`);
  sections.push(`Comparison: most recent observations vs. prior 3 years`);
  sections.push("");

  sections.push("KEY FINDING");
  sections.push(keyFinding);
  sections.push("");

  sections.push("WHY THIS MATTERS");
  sections.push(whyItMatters);
  sections.push("");

  sections.push("EVIDENCE SUMMARY");
  sections.push(`Observations analyzed (recent):   ${totalObs}`);
  sections.push(`Observations analyzed (history):  ${histObs}`);
  sections.push(`Unique species observed:          ${uniqueSpecies}`);
  sections.push(`Group filter:                     ${inputs.group}`);
  sections.push(`Quality filter:                   research-grade`);
  sections.push(`Data source:                      iNaturalist (inaturalist.org)`);
  sections.push("");

  if (focusTaxon && focusCommon) {
    sections.push("SPECIES DETAILS");
    sections.push(`Common name:       ${focusCommon}`);
    sections.push(`Scientific name:   ${focusTaxon.name}`);
    sections.push(`Group:             ${getIconicGroup(focusTaxon.iconic_taxon_name)}`);
    sections.push(`Ecosystem role:    ${primaryRole}`);
    if (conservation.label !== "Least Concern") {
      sections.push(`Conservation:      ${conservation.label}`);
    }
    sections.push(`Recent sightings:  ${focus!.count}`);
    sections.push("");
  } else if (topSpecies.length > 0) {
    sections.push("TOP OBSERVED SPECIES");
    sections.push(speciesBlocks);
    sections.push("");
  }

  if (chain) {
    sections.push("POTENTIAL LOCAL IMPACT");
    chain.nodes.forEach((n, i) => {
      sections.push(`${i + 1}. ${n.label}: ${n.description}`);
    });
    sections.push("");
  }

  const recs =
    ai?.recommendations && ai.recommendations.length > 0
      ? ai.recommendations
      : recommendations[inputs.type];
  sections.push("RECOMMENDED ACTIONS");
  recs.forEach((r) => sections.push(`• ${r}`));
  sections.push("");

  sections.push("DATA LIMITATIONS");
  limitations.forEach((l) => sections.push(`• ${l}`));
  sections.push("");

  sections.push("SOURCES");
  sections.push("• iNaturalist research-grade community observations");
  sections.push("• iNaturalist taxa metadata");
  sections.push(`• Natura app analysis (${fmtDate()})`);
  sections.push("");

  sections.push("DISCLAIMER");
  sections.push(DISCLAIMER);

  const body = sections.join("\n");

  // 3-bullet summary for email
  const bullets: string[] = [];
  if (inputs.type === "species_concern" && focusCommon) {
    bullets.push(`${focusCommon} observed ${focus!.count} times within ${inputs.radiusKm}km`);
    bullets.push(`Ecosystem role: ${primaryRole}`);
    bullets.push("Suggests a signal worth review by local stewards");
  } else if (inputs.type === "pollinator_decline") {
    bullets.push(`${pluralize(totalObs, "recent pollinator sighting")} vs. ${histObs} in the historical window`);
    bullets.push(`${pluralize(uniqueSpecies, "pollinator species")} observed in the area`);
    bullets.push("May indicate a possible signal worth a closer look");
  } else if (inputs.type === "biodiversity_change") {
    bullets.push(`${pluralize(totalObs, "recent observation")} across ${pluralize(uniqueSpecies, "species")}`);
    bullets.push(`Compared with ${histObs} historical observations`);
    bullets.push("May suggest a possible biodiversity shift");
  } else if (inputs.type === "invasive_watch" && focusCommon) {
    bullets.push(`${focusCommon} observed near ${inputs.city}`);
    bullets.push("Could benefit from confirmation by local experts");
    bullets.push("Monitoring spread is a low-cost first step");
  } else {
    bullets.push(`${pluralize(totalObs, "recent research-grade observation")}`);
    bullets.push(`${pluralize(uniqueSpecies, "species")} represented`);
    bullets.push(`Within ${inputs.radiusKm}km of ${inputs.city}`);
  }
  const finalBullets =
    ai?.bullets && ai.bullets.length > 0 ? ai.bullets.slice(0, 3) : bullets;

  return {
    id: `r-${Date.now()}`,
    type: inputs.type,
    title,
    generatedAt: new Date().toISOString(),
    city: inputs.city,
    radiusKm: inputs.radiusKm,
    group: inputs.group,
    focusSpeciesId: focusTaxon?.id,
    focusSpeciesName: focusCommon,
    observationsCount: totalObs,
    uniqueSpeciesCount: uniqueSpecies,
    bullets: finalBullets,
    whyItMatters,
    body,
  };
}

export function buildEmailSubject(report: GeneratedReport): string {
  switch (report.type) {
    case "species_concern":
      return `Community Observation Report: ${report.focusSpeciesName ?? "Local Species"} in ${report.city}`;
    case "invasive_watch":
      return `Request for Review: Possible Invasive Species near ${report.city}`;
    case "pollinator_decline":
      return `Local Biodiversity Signal Report: Pollinator Activity in ${report.city}`;
    case "biodiversity_change":
      return `Local Biodiversity Signal Report for ${report.city}`;
    case "area_summary":
      return `Biodiversity Summary for ${report.city}`;
  }
}

export function buildEmailBody(
  report: GeneratedReport,
  recipient: Recipient,
  userName: string
): string {
  const lines: string[] = [];
  lines.push(`Hi ${recipient.name},`);
  lines.push("");
  lines.push(
    "I'm sharing a local biodiversity report generated from publicly available community science observations."
  );
  lines.push("");
  lines.push(
    `The report highlights a possible biodiversity signal in ${report.city}, related to ${
      report.focusSpeciesName || (report.group === "all" ? "overall biodiversity" : report.group)
    }. The findings are not a formal scientific or legal determination, but they may be useful for awareness, monitoring, or further review.`
  );
  lines.push("");
  lines.push("Key summary:");
  report.bullets.forEach((b) => lines.push(`• ${b}`));
  lines.push("");
  lines.push("Why this matters:");
  lines.push(report.whyItMatters);
  lines.push("");
  lines.push("Suggested next step:");
  lines.push(
    "I would appreciate if your office or team could review whether this aligns with any existing local conservation, habitat, or monitoring efforts."
  );
  lines.push("");
  lines.push("Thank you for your time,");
  lines.push(userName || "A concerned community member");
  lines.push("");
  lines.push("---");
  lines.push(DISCLAIMER);
  return lines.join("\n");
}
