/**
 * MAMA Climate — Policy Tracker
 *
 * Track climate legislation, environmental initiatives, and
 * local policy actions. Help citizens engage with climate policy.
 *
 * @module policy-tracker
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const PolicyLevel = z.enum(["federal", "state", "local"]);

export const PolicyCategory = z.enum([
  "emissions_reduction",
  "renewable_energy",
  "environmental_justice",
  "water_protection",
  "air_quality",
  "land_conservation",
  "climate_adaptation",
  "transportation",
  "building_codes",
  "waste_reduction",
]);

export const PolicyStatus = z.enum([
  "proposed",
  "in_committee",
  "passed_one_chamber",
  "passed_both",
  "signed_into_law",
  "vetoed",
  "expired",
  "in_effect",
]);

export const ClimatePolicy = z.object({
  id: z.string(),
  title: z.string(),
  level: PolicyLevel,
  state: z.string().optional(),
  category: PolicyCategory,
  status: PolicyStatus,
  summary: z.string(),
  impact: z.string(),
  sponsors: z.array(z.string()),
  url: z.string().url().optional(),
  lastUpdated: z.string(),
});

export type ClimatePolicy = z.infer<typeof ClimatePolicy>;

export const PolicySearchInput = z.object({
  state: z.string().length(2).toUpperCase().optional(),
  level: PolicyLevel.optional(),
  category: PolicyCategory.optional(),
  status: PolicyStatus.optional(),
});

export type PolicySearchInput = z.infer<typeof PolicySearchInput>;

export const PolicySearchResult = z.object({
  policies: z.array(ClimatePolicy),
  totalFound: z.number(),
  actionOpportunities: z.array(
    z.object({
      action: z.string(),
      description: z.string(),
      url: z.string().url().optional(),
    })
  ),
  localRepresentatives: z.string(),
  source: z.string(),
});

export type PolicySearchResult = z.infer<typeof PolicySearchResult>;

// ---------------------------------------------------------------------------
// Sample policies database
// ---------------------------------------------------------------------------

const SAMPLE_POLICIES: ClimatePolicy[] = [
  {
    id: "ira-2022",
    title: "Inflation Reduction Act (IRA) \u2014 Climate Provisions",
    level: "federal",
    category: "emissions_reduction",
    status: "in_effect",
    summary:
      "The largest climate investment in US history: $369 billion for clean energy, EVs, heat pumps, " +
      "solar panels, and environmental justice communities.",
    impact:
      "Projected to reduce US emissions 40% below 2005 levels by 2030. " +
      "Includes consumer tax credits: $7,500 for EVs, 30% for solar panels, $2,000 for heat pumps.",
    sponsors: ["117th Congress"],
    url: "https://www.whitehouse.gov/cleanenergy/inflation-reduction-act-guidebook/",
    lastUpdated: "2024-01-01",
  },
  {
    id: "ca-sb100",
    title: "California SB 100 \u2014 100% Clean Energy by 2045",
    level: "state",
    state: "CA",
    category: "renewable_energy",
    status: "in_effect",
    summary: "Requires California to achieve 100% clean electricity by 2045.",
    impact: "CA is the world\u2019s 5th largest economy. This policy drives global clean energy markets.",
    sponsors: ["Sen. Kevin de Le\u00F3n"],
    lastUpdated: "2024-01-01",
  },
  {
    id: "ny-clcpa",
    title: "New York Climate Leadership and Community Protection Act (CLCPA)",
    level: "state",
    state: "NY",
    category: "emissions_reduction",
    status: "in_effect",
    summary:
      "Mandates 70% renewable electricity by 2030 and economy-wide carbon neutrality by 2050. " +
      "Requires 35-40% of clean energy benefits go to disadvantaged communities.",
    impact: "One of the most ambitious state climate laws in the US.",
    sponsors: ["NY State Legislature"],
    lastUpdated: "2024-01-01",
  },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Search climate policies by state, level, category, or status.
 */
export async function searchPolicies(input: PolicySearchInput): Promise<PolicySearchResult> {
  const parsed = PolicySearchInput.parse(input);

  let filtered = [...SAMPLE_POLICIES];

  if (parsed.state) {
    filtered = filtered.filter((p) => !p.state || p.state === parsed.state || p.level === "federal");
  }
  if (parsed.level) {
    filtered = filtered.filter((p) => p.level === parsed.level);
  }
  if (parsed.category) {
    filtered = filtered.filter((p) => p.category === parsed.category);
  }
  if (parsed.status) {
    filtered = filtered.filter((p) => p.status === parsed.status);
  }

  return {
    policies: filtered,
    totalFound: filtered.length,
    actionOpportunities: buildActionOpportunities(parsed.state),
    localRepresentatives:
      "Find your representatives at house.gov and senate.gov. " +
      "For state legislators, visit your state legislature\u2019s website. " +
      "Calling is more effective than emailing. Be polite, be specific, be brief.",
    source: "Congressional records, state legislature databases, Climate XChange",
  };
}

function buildActionOpportunities(state?: string): PolicySearchResult["actionOpportunities"] {
  const actions = [
    {
      action: "Check your IRA tax credits",
      description:
        "The Inflation Reduction Act offers significant tax credits for solar panels ($7,500), EVs ($7,500), " +
        "heat pumps ($2,000), and home energy efficiency improvements. Many people are leaving money on the table.",
      url: "https://www.whitehouse.gov/cleanenergy/inflation-reduction-act-guidebook/",
    },
    {
      action: "Comment on proposed EPA regulations",
      description:
        "EPA rulemaking includes public comment periods. Your voice matters \u2014 agencies are legally required to consider public comments.",
      url: "https://www.regulations.gov",
    },
    {
      action: "Attend your local city council meeting",
      description:
        "Local zoning, building codes, and transportation decisions have enormous climate impact. " +
        "Show up. Speak during public comment. It takes 3 minutes.",
    },
    {
      action: "Contact your representatives about climate",
      description:
        "Call your House rep and Senators. Say: \u201CI\u2019m a constituent from [ZIP]. I support [specific policy]. Thank you.\u201D " +
        "That\u2019s it. 30 seconds. It matters more than you think.",
      url: "https://www.house.gov/representatives/find-your-representative",
    },
  ];

  return actions;
}

/**
 * Get IRA benefits/credits available to an individual.
 */
export function getIRABenefits(): {
  category: string;
  credit: string;
  details: string;
}[] {
  return [
    {
      category: "Electric Vehicle",
      credit: "Up to $7,500 new / $4,000 used",
      details: "New EVs with final assembly in North America. Used EVs under $25k. Income limits apply.",
    },
    {
      category: "Solar Panels",
      credit: "30% of cost (no cap)",
      details: "Residential solar installation. Includes battery storage. Through 2032.",
    },
    {
      category: "Heat Pump",
      credit: "Up to $2,000",
      details: "Heat pump for heating/cooling. Replaces furnace/AC. Most efficient option.",
    },
    {
      category: "Home Insulation & Weatherization",
      credit: "Up to $1,200/year",
      details: "Insulation, windows, doors, electrical panel upgrades.",
    },
    {
      category: "Induction Stove",
      credit: "Up to $840 rebate",
      details: "Replace gas stove with induction. Better for health (no indoor air pollution) and climate.",
    },
    {
      category: "Heat Pump Water Heater",
      credit: "Up to $2,000",
      details: "3-4x more efficient than conventional water heaters.",
    },
  ];
}
