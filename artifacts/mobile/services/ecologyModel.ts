export interface ImpactNode {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  severity: "high" | "medium" | "low";
}

export interface ImpactEdge {
  from: string;
  to: string;
  label: string;
}

export interface ImpactChain {
  species: string;
  role: string;
  nodes: ImpactNode[];
  edges: ImpactEdge[];
  summary: string;
  credibilityNote: string;
}

export type EcosystemRole =
  | "pollinator"
  | "predator"
  | "prey"
  | "seed_disperser"
  | "decomposer"
  | "indicator"
  | "primary_producer"
  | "insect_control"
  | "habitat_provider"
  | "generalist";

export function getEcosystemRoles(iconicTaxonName?: string, commonName?: string): EcosystemRole[] {
  const name = (commonName || "").toLowerCase();
  const iconic = iconicTaxonName || "";

  const roles: EcosystemRole[] = [];

  if (iconic === "Insecta") {
    if (
      name.includes("bee") ||
      name.includes("butterfly") ||
      name.includes("moth") ||
      name.includes("wasp") ||
      name.includes("hover")
    ) {
      roles.push("pollinator");
    }
    if (
      name.includes("beetle") ||
      name.includes("fly") ||
      name.includes("ant")
    ) {
      roles.push("decomposer");
    }
    roles.push("prey");
  }

  if (iconic === "Aves") {
    roles.push("seed_disperser");
    if (
      name.includes("hawk") ||
      name.includes("owl") ||
      name.includes("eagle") ||
      name.includes("falcon") ||
      name.includes("kite")
    ) {
      roles.push("predator");
    } else {
      roles.push("insect_control");
    }
  }

  if (iconic === "Amphibia") {
    roles.push("indicator", "insect_control", "prey");
  }

  if (iconic === "Mammalia") {
    if (
      name.includes("wolf") ||
      name.includes("fox") ||
      name.includes("coyote") ||
      name.includes("lion") ||
      name.includes("bear") ||
      name.includes("bobcat")
    ) {
      roles.push("predator");
    } else if (
      name.includes("squirrel") ||
      name.includes("rabbit") ||
      name.includes("deer")
    ) {
      roles.push("prey", "seed_disperser");
    } else {
      roles.push("generalist");
    }
  }

  if (iconic === "Plantae") {
    roles.push("primary_producer", "habitat_provider");
  }

  if (iconic === "Fungi") {
    roles.push("decomposer");
  }

  if (iconic === "Reptilia") {
    roles.push("predator", "prey");
  }

  return roles.length > 0 ? roles : ["generalist"];
}

export function getRoleLabel(role: EcosystemRole): string {
  const map: Record<EcosystemRole, string> = {
    pollinator: "Pollinator",
    predator: "Predator",
    prey: "Prey",
    seed_disperser: "Seed Disperser",
    decomposer: "Decomposer",
    indicator: "Indicator Species",
    primary_producer: "Primary Producer",
    insect_control: "Insect Control",
    habitat_provider: "Habitat Provider",
    generalist: "Ecosystem Member",
  };
  return map[role];
}

export function getRoleColor(role: EcosystemRole): string {
  const map: Record<EcosystemRole, string> = {
    pollinator: "#FBBF24",
    predator: "#EF4444",
    prey: "#F97316",
    seed_disperser: "#22C55E",
    decomposer: "#A78BFA",
    indicator: "#22D3EE",
    primary_producer: "#4ADE80",
    insect_control: "#60A5FA",
    habitat_provider: "#34D399",
    generalist: "#94A3B8",
  };
  return map[role];
}

export function buildImpactChain(
  speciesName: string,
  iconicTaxonName?: string,
  commonName?: string
): ImpactChain {
  const roles = getEcosystemRoles(iconicTaxonName, commonName);
  const primaryRole = roles[0];

  const chainsByRole: Record<EcosystemRole, ImpactChain> = {
    pollinator: {
      species: speciesName,
      role: "Pollinator",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This species pollinates local plants.",
          icon: "bug",
          color: "#FBBF24",
          severity: "high",
        },
        {
          id: "plants",
          label: "Plant Reproduction",
          description: "Plants lose their pollinator — seeds and fruits decline.",
          icon: "leaf",
          color: "#4ADE80",
          severity: "high",
        },
        {
          id: "fruit",
          label: "Food for Wildlife",
          description: "Less fruit and seeds means less food for birds and mammals.",
          icon: "feather",
          color: "#60A5FA",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Local Ecosystem",
          description: "Reduced plant diversity weakens habitat for all species.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "plants", label: "Loss reduces" },
        { from: "plants", to: "fruit", label: "Which limits" },
        { from: "fruit", to: "ecosystem", label: "Weakening" },
      ],
      summary:
        "This species helps keep local plants reproducing. If it disappears, other species may lose food or habitat.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    predator: {
      species: speciesName,
      role: "Predator",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This predator regulates prey populations.",
          icon: "alert-triangle",
          color: "#EF4444",
          severity: "high",
        },
        {
          id: "prey",
          label: "Prey Populations",
          description: "Without this predator, prey species may multiply unchecked.",
          icon: "users",
          color: "#F97316",
          severity: "high",
        },
        {
          id: "vegetation",
          label: "Vegetation Pressure",
          description: "Overgrazing or overbrowsing by prey may damage local plants.",
          icon: "leaf",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Ecosystem Balance",
          description: "Trophic cascade effects ripple through the food web.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "prey", label: "Loss releases" },
        { from: "prey", to: "vegetation", label: "Which pressures" },
        { from: "vegetation", to: "ecosystem", label: "Disrupting" },
      ],
      summary:
        "This predator helps keep prey populations in balance. If it disappears, prey species could increase, putting pressure on local vegetation.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    indicator: {
      species: speciesName,
      role: "Indicator Species",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "Amphibians are sensitive to environmental change.",
          icon: "droplets",
          color: "#22D3EE",
          severity: "high",
        },
        {
          id: "insects",
          label: "Insect Balance",
          description: "Without amphibian predation, some insect species may increase.",
          icon: "bug",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "water",
          label: "Water Quality Signal",
          description: "Amphibian decline often signals changes in water or soil health.",
          icon: "droplets",
          color: "#60A5FA",
          severity: "high",
        },
        {
          id: "ecosystem",
          label: "Ecosystem Health",
          description: "Loss may indicate broader environmental concerns in this area.",
          icon: "globe",
          color: "#94A3B8",
          severity: "medium",
        },
      ],
      edges: [
        { from: "species", to: "insects", label: "Loss affects" },
        { from: "species", to: "water", label: "Also signals" },
        { from: "water", to: "ecosystem", label: "Affecting" },
      ],
      summary:
        "Amphibians are sensitive environmental indicators. Their decline may signal water quality concerns or habitat stress beyond what's visible.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    primary_producer: {
      species: speciesName,
      role: "Primary Producer",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "Plants form the foundation of the local food web.",
          icon: "leaf",
          color: "#4ADE80",
          severity: "high",
        },
        {
          id: "insects",
          label: "Insect Habitat",
          description: "Many insects depend on this plant for food or nesting.",
          icon: "bug",
          color: "#FBBF24",
          severity: "high",
        },
        {
          id: "birds",
          label: "Bird Food Chain",
          description: "Birds lose both plant food sources and insect prey.",
          icon: "feather",
          color: "#60A5FA",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Habitat Loss",
          description: "Structural habitat loss affects species that depend on this plant.",
          icon: "globe",
          color: "#94A3B8",
          severity: "medium",
        },
      ],
      edges: [
        { from: "species", to: "insects", label: "Loss reduces" },
        { from: "insects", to: "birds", label: "Which limits" },
        { from: "species", to: "ecosystem", label: "Also removes" },
      ],
      summary:
        "This plant supports insects, birds, and habitat. Its loss could cascade through multiple layers of the local food web.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    decomposer: {
      species: speciesName,
      role: "Decomposer",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "Decomposers recycle nutrients back into the soil.",
          icon: "circle",
          color: "#A78BFA",
          severity: "high",
        },
        {
          id: "nutrients",
          label: "Nutrient Cycling",
          description: "Slower decomposition means nutrients get locked in dead matter.",
          icon: "refresh-cw",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "soil",
          label: "Soil Health",
          description: "Plants may receive fewer nutrients, reducing local plant productivity.",
          icon: "leaf",
          color: "#4ADE80",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Ecosystem Productivity",
          description: "Less productive soil means less food for the whole food web.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "nutrients", label: "Loss slows" },
        { from: "nutrients", to: "soil", label: "Depleting" },
        { from: "soil", to: "ecosystem", label: "Reducing" },
      ],
      summary:
        "Decomposers keep nutrients cycling through the ecosystem. Their loss slows soil health and can reduce plant productivity over time.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    seed_disperser: {
      species: speciesName,
      role: "Seed Disperser",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This species spreads plant seeds across the landscape.",
          icon: "wind",
          color: "#22C55E",
          severity: "high",
        },
        {
          id: "plants",
          label: "Plant Diversity",
          description: "Fewer seeds spread means less plant diversity and regeneration.",
          icon: "leaf",
          color: "#4ADE80",
          severity: "medium",
        },
        {
          id: "habitat",
          label: "Forest Regeneration",
          description: "Forest recovery from disturbance becomes slower.",
          icon: "tree-pine",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Long-term Habitat",
          description: "Reduced regeneration affects all species that depend on the forest.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "plants", label: "Loss reduces" },
        { from: "plants", to: "habitat", label: "Slowing" },
        { from: "habitat", to: "ecosystem", label: "Weakening" },
      ],
      summary:
        "This species helps plants spread and forests recover. Its loss may slow local plant diversity and habitat regeneration over time.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    prey: {
      species: speciesName,
      role: "Prey Species",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This species is an important food source for local predators.",
          icon: "circle",
          color: "#F97316",
          severity: "high",
        },
        {
          id: "predators",
          label: "Predator Populations",
          description: "Predators that depend on this species may decline.",
          icon: "alert-triangle",
          color: "#EF4444",
          severity: "high",
        },
        {
          id: "cascade",
          label: "Trophic Cascade",
          description: "Loss of top predators can create imbalances further down the chain.",
          icon: "layers",
          color: "#F97316",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Food Web",
          description: "Food web instability can affect many species simultaneously.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "predators", label: "Loss starves" },
        { from: "predators", to: "cascade", label: "Triggering" },
        { from: "cascade", to: "ecosystem", label: "Destabilizing" },
      ],
      summary:
        "This species is food for local predators. Its decline could ripple through the food web, affecting species that rely on those predators.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    insect_control: {
      species: speciesName,
      role: "Insect Control",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This species helps control insect populations.",
          icon: "feather",
          color: "#60A5FA",
          severity: "high",
        },
        {
          id: "insects",
          label: "Insect Populations",
          description: "Without natural control, some insect species may increase.",
          icon: "bug",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "plants",
          label: "Plant Health",
          description: "Increased herbivorous insects may stress local plants.",
          icon: "leaf",
          color: "#4ADE80",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Ecosystem Balance",
          description: "Plant stress can cascade through the broader food web.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "insects", label: "Loss releases" },
        { from: "insects", to: "plants", label: "Stressing" },
        { from: "plants", to: "ecosystem", label: "Weakening" },
      ],
      summary:
        "This species helps keep insect populations in check. Its absence could allow some insects to increase, putting stress on local plants.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    habitat_provider: {
      species: speciesName,
      role: "Habitat Provider",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This plant provides shelter and structure for other species.",
          icon: "tree-pine",
          color: "#34D399",
          severity: "high",
        },
        {
          id: "wildlife",
          label: "Dependent Wildlife",
          description: "Birds, insects, and small mammals that nest or feed here lose habitat.",
          icon: "feather",
          color: "#60A5FA",
          severity: "high",
        },
        {
          id: "food",
          label: "Food Sources",
          description: "Species that ate this plant's fruit, seeds, or leaves lose food.",
          icon: "apple",
          color: "#FBBF24",
          severity: "medium",
        },
        {
          id: "ecosystem",
          label: "Local Habitat",
          description: "Structural loss affects the landscape's capacity to support life.",
          icon: "globe",
          color: "#94A3B8",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "wildlife", label: "Loss displaces" },
        { from: "species", to: "food", label: "Also removes" },
        { from: "wildlife", to: "ecosystem", label: "Reducing" },
      ],
      summary:
        "This species provides critical shelter and food for other wildlife. Its loss could displace multiple species that depend on it for survival.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
    generalist: {
      species: speciesName,
      role: "Ecosystem Member",
      nodes: [
        {
          id: "species",
          label: commonName || speciesName,
          description: "This species plays a role in the local ecosystem.",
          icon: "circle",
          color: "#94A3B8",
          severity: "medium",
        },
        {
          id: "foodweb",
          label: "Local Food Web",
          description: "Its interactions with other species form part of the web of life.",
          icon: "globe",
          color: "#60A5FA",
          severity: "medium",
        },
        {
          id: "biodiversity",
          label: "Biodiversity",
          description: "Each species lost reduces the richness of local life.",
          icon: "layers",
          color: "#4ADE80",
          severity: "low",
        },
      ],
      edges: [
        { from: "species", to: "foodweb", label: "Connected to" },
        { from: "foodweb", to: "biodiversity", label: "Supporting" },
      ],
      summary:
        "This species is part of your local life web. Every species plays a role, and each loss reduces the richness of the ecosystem around you.",
      credibilityNote:
        "This is a simplified ecological model based on species roles and local observation data, not a prediction.",
    },
  };

  return chainsByRole[primaryRole] || chainsByRole.generalist;
}
