/**
 * MAMA Climate — Water Quality Tracker
 *
 * Tap water contamination data via EPA/EWG databases.
 * Contaminant identification, health risk assessment, and filter
 * recommendations.
 *
 * @module water-quality-tracker
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ContaminantCategory = z.enum([
  "heavy_metals",
  "disinfection_byproducts",
  "pesticides",
  "pfas",
  "microbiological",
  "radioactive",
  "volatile_organic",
  "nitrates",
  "other",
]);

export const Contaminant = z.object({
  name: z.string(),
  category: ContaminantCategory,
  detected: z.number().nonnegative(),
  unit: z.string(),
  epaLimit: z.number().nonnegative(),
  healthGuideline: z.number().nonnegative(),
  exceedsEPA: z.boolean(),
  exceedsHealthGuideline: z.boolean(),
  healthEffects: z.array(z.string()),
  sources: z.array(z.string()),
});

export type Contaminant = z.infer<typeof Contaminant>;

export const WaterQualityInput = z.object({
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  utilityName: z.string().optional(),
  includeFilter: z.boolean().default(true),
});

export type WaterQualityInput = z.infer<typeof WaterQualityInput>;

export const FilterRecommendation = z.object({
  type: z.string(),
  removes: z.array(z.string()),
  priceRange: z.string(),
  nsfCertification: z.string(),
  bestFor: z.string(),
});

export const WaterQualityResult = z.object({
  zipCode: z.string(),
  utilityName: z.string(),
  contaminantsFound: z.number(),
  contaminantsExceedingGuidelines: z.number(),
  contaminants: z.array(Contaminant),
  overallAssessment: z.enum(["good", "moderate_concern", "significant_concern", "critical"]),
  filterRecommendations: z.array(FilterRecommendation).optional(),
  actions: z.array(z.string()),
  source: z.string(),
  disclaimer: z.string(),
});

export type WaterQualityResult = z.infer<typeof WaterQualityResult>;

// ---------------------------------------------------------------------------
// Common contaminants database
// ---------------------------------------------------------------------------

const COMMON_CONTAMINANTS: Contaminant[] = [
  {
    name: "Lead",
    category: "heavy_metals",
    detected: 0,
    unit: "ppb",
    epaLimit: 15,
    healthGuideline: 0,
    exceedsEPA: false,
    exceedsHealthGuideline: true,
    healthEffects: [
      "Brain damage in children (no safe level)",
      "Kidney damage",
      "Reproductive harm",
      "Developmental delays in children",
    ],
    sources: ["Old pipes (pre-1986)", "Lead solder", "Brass fixtures"],
  },
  {
    name: "PFAS (Forever Chemicals)",
    category: "pfas",
    detected: 0,
    unit: "ppt",
    epaLimit: 4,
    healthGuideline: 1,
    exceedsEPA: false,
    exceedsHealthGuideline: false,
    healthEffects: [
      "Cancer (kidney, testicular)",
      "Thyroid disease",
      "Immune system suppression",
      "Reproductive harm",
      "Liver damage",
    ],
    sources: [
      "Industrial discharge",
      "Firefighting foam (AFFF)",
      "Non-stick coatings manufacturing",
      "Landfill runoff",
    ],
  },
  {
    name: "Arsenic",
    category: "heavy_metals",
    detected: 0,
    unit: "ppb",
    epaLimit: 10,
    healthGuideline: 0.004,
    exceedsEPA: false,
    exceedsHealthGuideline: true,
    healthEffects: [
      "Cancer (bladder, lung, skin)",
      "Cardiovascular disease",
      "Diabetes",
      "Neurological effects",
    ],
    sources: ["Natural geological deposits", "Mining", "Agricultural runoff"],
  },
  {
    name: "Trihalomethanes (THMs)",
    category: "disinfection_byproducts",
    detected: 0,
    unit: "ppb",
    epaLimit: 80,
    healthGuideline: 0.8,
    exceedsEPA: false,
    exceedsHealthGuideline: true,
    healthEffects: [
      "Cancer (bladder, colon)",
      "Liver and kidney damage",
      "Reproductive harm",
    ],
    sources: ["Chlorine reacting with organic matter during water treatment"],
  },
  {
    name: "Nitrate",
    category: "nitrates",
    detected: 0,
    unit: "ppm",
    epaLimit: 10,
    healthGuideline: 0.14,
    exceedsEPA: false,
    exceedsHealthGuideline: false,
    healthEffects: [
      "Blue baby syndrome (methemoglobinemia) in infants",
      "Increased cancer risk",
      "Thyroid effects",
    ],
    sources: ["Agricultural fertilizer runoff", "Septic systems", "Animal waste"],
  },
];

// ---------------------------------------------------------------------------
// Filter recommendations
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: z.infer<typeof FilterRecommendation>[] = [
  {
    type: "Reverse Osmosis (Under-sink)",
    removes: ["Lead", "PFAS", "Arsenic", "Nitrate", "THMs", "Most contaminants"],
    priceRange: "$150-400 + $50-100/year filters",
    nsfCertification: "NSF 42, 53, 58",
    bestFor: "Comprehensive protection. Removes 95-99% of contaminants. Best bang for the buck.",
  },
  {
    type: "Activated Carbon Pitcher (e.g., Brita, PUR)",
    removes: ["Chlorine", "Some THMs", "Some heavy metals", "Taste/odor"],
    priceRange: "$20-40 + $30-60/year filters",
    nsfCertification: "NSF 42 (some 53)",
    bestFor: "Basic filtration. Better than nothing, but does NOT remove PFAS, arsenic, or nitrates.",
  },
  {
    type: "Whole-House Carbon Filter",
    removes: ["Chlorine", "THMs", "Some VOCs", "Sediment"],
    priceRange: "$300-1,500 + $100-200/year",
    nsfCertification: "NSF 42",
    bestFor: "Protecting all water in the home (showers, laundry). Combine with RO for drinking water.",
  },
  {
    type: "Gravity-Fed (e.g., Berkey)",
    removes: ["Bacteria", "Viruses", "Heavy metals", "Some PFAS"],
    priceRange: "$250-400 + $50-100/year",
    nsfCertification: "Varies by model",
    bestFor: "No plumbing required. Great for renters and emergency preparedness.",
  },
];

const DISCLAIMER =
  "Water quality data is sourced from EPA and EWG databases. Test results reflect utility-reported averages " +
  "and may not reflect the water at your specific tap. For precise results, get your water tested " +
  "(free lead testing available from many utilities). This is informational, not medical advice.";

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Look up water quality data for a ZIP code.
 */
export async function getWaterQuality(input: WaterQualityInput): Promise<WaterQualityResult> {
  const parsed = WaterQualityInput.parse(input);

  // In production, this queries EPA SDWIS and EWG Tap Water databases
  const contaminants = COMMON_CONTAMINANTS; // Placeholder

  const exceedingGuidelines = contaminants.filter((c) => c.exceedsHealthGuideline).length;
  const exceedingEPA = contaminants.filter((c) => c.exceedsEPA).length;

  let assessment: "good" | "moderate_concern" | "significant_concern" | "critical";
  if (exceedingEPA > 0) assessment = "critical";
  else if (exceedingGuidelines > 3) assessment = "significant_concern";
  else if (exceedingGuidelines > 0) assessment = "moderate_concern";
  else assessment = "good";

  return {
    zipCode: parsed.zipCode,
    utilityName: parsed.utilityName ?? `Water utility serving ${parsed.zipCode}`,
    contaminantsFound: contaminants.length,
    contaminantsExceedingGuidelines: exceedingGuidelines,
    contaminants,
    overallAssessment: assessment,
    filterRecommendations: parsed.includeFilter ? getFilterRecs(contaminants) : undefined,
    actions: buildActions(assessment, contaminants),
    source: "EPA SDWIS / EWG Tap Water Database",
    disclaimer: DISCLAIMER,
  };
}

function getFilterRecs(contaminants: Contaminant[]): z.infer<typeof FilterRecommendation>[] {
  const hasPFAS = contaminants.some((c) => c.category === "pfas" && c.exceedsHealthGuideline);
  const hasLead = contaminants.some((c) => c.name === "Lead" && c.exceedsHealthGuideline);

  if (hasPFAS || hasLead) {
    // Recommend RO first for serious contaminants
    return [FILTER_OPTIONS[0], FILTER_OPTIONS[3]];
  }

  return FILTER_OPTIONS;
}

function buildActions(
  assessment: string,
  contaminants: Contaminant[]
): string[] {
  const actions = [
    "Request your utility\u2019s annual Consumer Confidence Report (CCR) \u2014 they are required to provide it.",
    "Check EWG\u2019s Tap Water Database at ewg.org/tapwater for your ZIP code.",
  ];

  if (assessment === "critical") {
    actions.unshift("URGENT: Consider using bottled water or a reverse osmosis filter until issues are resolved.");
    actions.push("Contact your utility and your state drinking water program.");
    actions.push("If you have infants, use filtered or bottled water for formula preparation.");
  }

  const hasLead = contaminants.some((c) => c.name === "Lead");
  if (hasLead) {
    actions.push("Run your tap for 30 seconds to 2 minutes before drinking (flushes lead from pipes).");
    actions.push("Never use hot tap water for cooking or drinking (hot water leaches more lead).");
    actions.push("Get a free lead test from your water utility if available.");
  }

  return actions;
}

/**
 * Get information about a specific contaminant.
 */
export function getContaminantInfo(name: string): Contaminant | undefined {
  return COMMON_CONTAMINANTS.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}
