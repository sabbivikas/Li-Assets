export type EcosystemRole = "pollinator"|"predator"|"prey"|"seed_disperser"|"decomposer"|"indicator"|"primary_producer"|"habitat_provider"|"generalist";

export function getEcosystemRoles(iconicTaxonName?: string, commonName?: string): EcosystemRole[] {
  const name = (commonName || "").toLowerCase();
  const iconic = iconicTaxonName || "";
  const roles: EcosystemRole[] = [];
  if (iconic === "Insecta") {
    if (name.includes("bee")||name.includes("butterfly")||name.includes("moth")||name.includes("wasp")) roles.push("pollinator");
    if (name.includes("beetle")||name.includes("fly")||name.includes("ant")) roles.push("decomposer");
    roles.push("prey");
  }
  if (iconic === "Aves") { roles.push("predator"); roles.push("seed_disperser"); }
  if (iconic === "Plantae") { roles.push("primary_producer"); roles.push("habitat_provider"); }
  if (iconic === "Fungi") { roles.push("decomposer"); }
  if (iconic === "Mammalia") { roles.push("predator"); roles.push("seed_disperser"); }
  if (iconic === "Amphibia") { roles.push("indicator"); roles.push("prey"); }
  if (iconic === "Reptilia") { roles.push("predator"); roles.push("prey"); }
  if (roles.length === 0) roles.push("generalist");
  return roles;
}

export const ROLE_LABELS: Record<EcosystemRole,{label:string;color:string;desc:string}> = {
  pollinator: { label:"Pollinator", color:"var(--sun)", desc:"Transfers pollen between flowers" },
  predator: { label:"Predator", color:"var(--orange)", desc:"Controls prey populations" },
  prey: { label:"Prey", color:"var(--pink)", desc:"Food source for predators" },
  seed_disperser: { label:"Seed Disperser", color:"var(--grass)", desc:"Spreads plant seeds" },
  decomposer: { label:"Decomposer", color:"var(--brown,#8b6f47)", desc:"Breaks down organic matter" },
  indicator: { label:"Indicator Species", color:"var(--sky)", desc:"Sensitive to environmental change" },
  primary_producer: { label:"Primary Producer", color:"var(--grass)", desc:"Converts sunlight to energy" },
  habitat_provider: { label:"Habitat Provider", color:"var(--purple)", desc:"Creates shelter for other species" },
  generalist: { label:"Generalist", color:"var(--ink-mute,#888)", desc:"Adaptable to many conditions" }
};