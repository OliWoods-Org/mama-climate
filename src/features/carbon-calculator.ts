/**
 * MAMA Climate — Carbon Calculator
 *
 * Personal and household carbon footprint estimation with
 * actionable reduction strategies ranked by impact.
 *
 * @module carbon-calculator
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TransportMode = z.enum([
  "car_gas", "car_hybrid", "car_ev", "bus", "train",
  "subway", "bike", "walk", "motorcycle", "rideshare", "airplane",
]);

export const DietType = z.enum([
  "heavy_meat", "average", "low_meat", "pescatarian", "vegetarian", "vegan",
]);

export const HomeType = z.enum([
  "house_large", "house_medium", "house_small",
  "apartment_large", "apartment_small", "studio",
]);

export const CarbonInput = z.object({
  // Transportation
  commuteMode: TransportMode.default("car_gas"),
  commuteDistanceMiles: z.number().nonnegative().default(0),
  flightsPerYear: z.number().int().nonnegative().default(0),
  // Home
  homeType: HomeType.default("apartment_small"),
  electricityKwh: z.number().nonnegative().optional(),
  naturalGasTherms: z.number().nonnegative().optional(),
  renewableEnergyPercent: z.number().min(0).max(100).default(0),
  // Diet
  diet: DietType.default("average"),
  // Lifestyle
  householdSize: z.number().int().positive().default(1),
  shoppingHabit: z.enum(["minimal", "average", "frequent"]).default("average"),
  state: z.string().length(2).toUpperCase().optional(),
});

export type CarbonInput = z.infer<typeof CarbonInput>;

export const ReductionStrategy = z.object({
  action: z.string(),
  category: z.enum(["transport", "home", "diet", "lifestyle"]),
  annualSavingTons: z.number(),
  annualMoneySaved: z.number().optional(),
  difficulty: z.enum(["easy", "moderate", "significant_change"]),
  description: z.string(),
});

export type ReductionStrategy = z.infer<typeof ReductionStrategy>;

export const CarbonResult = z.object({
  totalAnnualTons: z.number(),
  breakdown: z.object({
    transport: z.number(),
    home: z.number(),
    diet: z.number(),
    shopping: z.number(),
    services: z.number(),
  }),
  comparedToAverage: z.object({
    usAverage: z.number(),
    globalAverage: z.number(),
    percentOfUS: z.number(),
    percentOfGlobal: z.number(),
  }),
  reductionStrategies: z.array(ReductionStrategy),
  trees: z.number().describe("Equivalent trees needed to offset"),
  disclaimer: z.string(),
});

export type CarbonResult = z.infer<typeof CarbonResult>;

// ---------------------------------------------------------------------------
// Emission factors (tons CO2e per unit per year)
// ---------------------------------------------------------------------------

const TRANSPORT_FACTORS: Record<string, number> = {
  car_gas: 0.000404,      // tons CO2 per mile
  car_hybrid: 0.000250,
  car_ev: 0.000120,       // varies by grid
  bus: 0.000089,
  train: 0.000041,
  subway: 0.000035,
  motorcycle: 0.000200,
  rideshare: 0.000350,
  bike: 0,
  walk: 0,
  airplane: 0.000530,     // per passenger mile
};

const DIET_ANNUAL_TONS: Record<string, number> = {
  heavy_meat: 3.3,
  average: 2.5,
  low_meat: 1.9,
  pescatarian: 1.7,
  vegetarian: 1.5,
  vegan: 1.0,
};

const HOME_BASE_TONS: Record<string, number> = {
  house_large: 8.0,
  house_medium: 5.5,
  house_small: 3.5,
  apartment_large: 3.0,
  apartment_small: 2.0,
  studio: 1.5,
};

const SHOPPING_TONS: Record<string, number> = {
  minimal: 1.0,
  average: 2.5,
  frequent: 4.5,
};

const US_AVERAGE_TONS = 16.0;
const GLOBAL_AVERAGE_TONS = 4.5;
const TONS_PER_TREE_PER_YEAR = 0.06;

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Calculate personal carbon footprint with breakdown and reduction strategies.
 */
export async function calculateCarbonFootprint(input: CarbonInput): Promise<CarbonResult> {
  const parsed = CarbonInput.parse(input);

  // Transport
  const commuteAnnualMiles = parsed.commuteDistanceMiles * 2 * 250; // round trip, ~250 work days
  const transportFactor = TRANSPORT_FACTORS[parsed.commuteMode] ?? 0;
  const commuteTons = commuteAnnualMiles * transportFactor;
  const flightTons = parsed.flightsPerYear * 2500 * TRANSPORT_FACTORS.airplane; // avg 2500 miles per flight
  const transportTotal = commuteTons + flightTons;

  // Home
  let homeTons = HOME_BASE_TONS[parsed.homeType] ?? 3.0;
  if (parsed.electricityKwh) {
    homeTons = parsed.electricityKwh * 12 * 0.000417; // EPA avg grid factor
  }
  if (parsed.naturalGasTherms) {
    homeTons += parsed.naturalGasTherms * 12 * 0.00531;
  }
  homeTons *= (100 - parsed.renewableEnergyPercent) / 100;
  homeTons /= parsed.householdSize; // per-person share

  // Diet
  const dietTons = DIET_ANNUAL_TONS[parsed.diet] ?? 2.5;

  // Shopping
  const shoppingTons = SHOPPING_TONS[parsed.shoppingHabit] ?? 2.5;

  // Services (healthcare, government, etc. — unavoidable baseline)
  const servicesTons = 2.0;

  const total = transportTotal + homeTons + dietTons + shoppingTons + servicesTons;

  return {
    totalAnnualTons: Math.round(total * 10) / 10,
    breakdown: {
      transport: Math.round(transportTotal * 10) / 10,
      home: Math.round(homeTons * 10) / 10,
      diet: Math.round(dietTons * 10) / 10,
      shopping: Math.round(shoppingTons * 10) / 10,
      services: servicesTons,
    },
    comparedToAverage: {
      usAverage: US_AVERAGE_TONS,
      globalAverage: GLOBAL_AVERAGE_TONS,
      percentOfUS: Math.round((total / US_AVERAGE_TONS) * 100),
      percentOfGlobal: Math.round((total / GLOBAL_AVERAGE_TONS) * 100),
    },
    reductionStrategies: buildReductionStrategies(parsed, {
      transport: transportTotal,
      home: homeTons,
      diet: dietTons,
      shopping: shoppingTons,
    }),
    trees: Math.ceil(total / TONS_PER_TREE_PER_YEAR),
    disclaimer:
      "Carbon calculations are estimates based on national averages. " +
      "Individual results vary by location, specific products, and behavior patterns. " +
      "Data sources: EPA, EIA, Our World in Data.",
  };
}

function buildReductionStrategies(
  input: CarbonInput,
  breakdown: Record<string, number>
): ReductionStrategy[] {
  const strategies: ReductionStrategy[] = [];

  // Transport strategies
  if (input.commuteMode === "car_gas") {
    strategies.push({
      action: "Switch to public transit for commute",
      category: "transport",
      annualSavingTons: breakdown.transport * 0.7,
      annualMoneySaved: input.commuteDistanceMiles * 500 * 0.30, // rough savings
      difficulty: "moderate",
      description: "Public transit produces 85% less emissions per passenger mile than a single-occupancy car.",
    });
    strategies.push({
      action: "Switch to an electric vehicle",
      category: "transport",
      annualSavingTons: breakdown.transport * 0.6,
      difficulty: "significant_change",
      description: "EVs produce 50-70% less lifetime emissions than gas cars, even accounting for manufacturing and grid mix.",
    });
  }

  if (input.flightsPerYear > 2) {
    strategies.push({
      action: "Reduce flights by half",
      category: "transport",
      annualSavingTons: (input.flightsPerYear / 2) * 2500 * TRANSPORT_FACTORS.airplane,
      difficulty: "moderate",
      description: "Flying is the most carbon-intensive thing most people do. One round-trip transatlantic flight = ~1.6 tons CO2.",
    });
  }

  // Diet strategies
  if (input.diet === "heavy_meat" || input.diet === "average") {
    strategies.push({
      action: "Reduce meat to 2-3 meals per week",
      category: "diet",
      annualSavingTons: DIET_ANNUAL_TONS[input.diet] - DIET_ANNUAL_TONS.low_meat,
      annualMoneySaved: 800,
      difficulty: "easy",
      description: "Beef produces 100x more emissions than beans per gram of protein. Even small reductions matter.",
    });
  }

  // Home strategies
  if (input.renewableEnergyPercent < 100) {
    strategies.push({
      action: "Switch to renewable energy provider",
      category: "home",
      annualSavingTons: breakdown.home * 0.5,
      difficulty: "easy",
      description: "Many utilities offer renewable energy plans at little or no extra cost. Check energysage.com.",
    });
  }

  strategies.push({
    action: "Reduce, repair, reuse before buying new",
    category: "lifestyle",
    annualSavingTons: breakdown.shopping * 0.3,
    annualMoneySaved: 1200,
    difficulty: "easy",
    description: "The most sustainable product is the one you don\u2019t buy. Extending product life by 9 months reduces its footprint by 30%.",
  });

  // Sort by impact
  strategies.sort((a, b) => b.annualSavingTons - a.annualSavingTons);

  return strategies.map((s) => ({
    ...s,
    annualSavingTons: Math.round(s.annualSavingTons * 10) / 10,
    annualMoneySaved: s.annualMoneySaved ? Math.round(s.annualMoneySaved) : undefined,
  }));
}
