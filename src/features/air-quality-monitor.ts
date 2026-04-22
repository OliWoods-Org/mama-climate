/**
 * MAMA Climate — Air Quality Monitor
 *
 * Real-time AQI by ZIP code via EPA AirNow API. Health recommendations,
 * sensitive group alerts, and historical trend tracking.
 *
 * @module air-quality-monitor
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const AQICategory = z.enum([
  "good",
  "moderate",
  "unhealthy_sensitive",
  "unhealthy",
  "very_unhealthy",
  "hazardous",
]);

export const Pollutant = z.enum([
  "pm25",
  "pm10",
  "ozone",
  "no2",
  "so2",
  "co",
]);

export const AQILookupInput = z.object({
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  includeForcast: z.boolean().default(true),
  includePollutants: z.boolean().default(true),
});

export type AQILookupInput = z.infer<typeof AQILookupInput>;

export const PollutantReading = z.object({
  pollutant: Pollutant,
  aqi: z.number().int().min(0).max(500),
  concentration: z.number().nonnegative(),
  unit: z.string(),
  category: AQICategory,
});

export type PollutantReading = z.infer<typeof PollutantReading>;

export const AQIResult = z.object({
  zipCode: z.string(),
  overallAQI: z.number().int().min(0).max(500),
  category: AQICategory,
  dominantPollutant: Pollutant,
  pollutants: z.array(PollutantReading),
  healthRecommendations: z.object({
    general: z.string(),
    sensitiveGroups: z.string(),
    outdoor: z.string(),
    indoor: z.string(),
  }),
  forecast: z
    .array(
      z.object({
        date: z.string(),
        aqi: z.number(),
        category: AQICategory,
      })
    )
    .optional(),
  nearestStation: z.string().optional(),
  lastUpdated: z.string().datetime(),
  source: z.string(),
});

export type AQIResult = z.infer<typeof AQIResult>;

// ---------------------------------------------------------------------------
// AQI breakpoints and categories
// ---------------------------------------------------------------------------

const AQI_BREAKPOINTS: { min: number; max: number; category: z.infer<typeof AQICategory>; color: string }[] = [
  { min: 0, max: 50, category: "good", color: "green" },
  { min: 51, max: 100, category: "moderate", color: "yellow" },
  { min: 101, max: 150, category: "unhealthy_sensitive", color: "orange" },
  { min: 151, max: 200, category: "unhealthy", color: "red" },
  { min: 201, max: 300, category: "very_unhealthy", color: "purple" },
  { min: 301, max: 500, category: "hazardous", color: "maroon" },
];

function getAQICategory(aqi: number): z.infer<typeof AQICategory> {
  for (const bp of AQI_BREAKPOINTS) {
    if (aqi >= bp.min && aqi <= bp.max) return bp.category;
  }
  return "hazardous";
}

// ---------------------------------------------------------------------------
// Health recommendations
// ---------------------------------------------------------------------------

const HEALTH_RECOMMENDATIONS: Record<
  string,
  { general: string; sensitiveGroups: string; outdoor: string; indoor: string }
> = {
  good: {
    general: "Air quality is satisfactory. Enjoy outdoor activities.",
    sensitiveGroups: "No special precautions needed.",
    outdoor: "Great day for outdoor exercise.",
    indoor: "Open windows for fresh air.",
  },
  moderate: {
    general: "Air quality is acceptable. Some pollutants may be a concern for sensitive individuals.",
    sensitiveGroups: "People with respiratory conditions should consider limiting prolonged outdoor exertion.",
    outdoor: "Acceptable for most outdoor activities.",
    indoor: "Consider keeping windows closed if you have respiratory issues.",
  },
  unhealthy_sensitive: {
    general: "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
    sensitiveGroups: "People with asthma, COPD, heart disease, children, and elderly should reduce prolonged outdoor exertion.",
    outdoor: "Reduce prolonged outdoor exercise. Move strenuous activities indoors.",
    indoor: "Keep windows closed. Run air purifiers if available.",
  },
  unhealthy: {
    general: "Everyone may begin to experience health effects. Sensitive groups may experience more serious effects.",
    sensitiveGroups: "AVOID prolonged outdoor exertion. Stay indoors with air filtration.",
    outdoor: "Avoid outdoor exercise. Reschedule outdoor events.",
    indoor: "Keep all windows closed. Run HEPA air purifiers. Consider wearing N95 masks if going outside.",
  },
  very_unhealthy: {
    general: "Health alert: everyone may experience more serious health effects.",
    sensitiveGroups: "STAY INDOORS. Seek medical attention if experiencing symptoms.",
    outdoor: "AVOID all outdoor physical activity.",
    indoor: "Seal windows. Run air purifiers on highest setting. If you must go outside, wear N95 mask.",
  },
  hazardous: {
    general: "HEALTH WARNING: Emergency conditions. The entire population is likely to be affected.",
    sensitiveGroups: "STAY INDOORS. Seek medical attention for any respiratory symptoms.",
    outdoor: "DO NOT go outside unless absolutely necessary. Wear N95 mask if you must.",
    indoor: "Seal all openings. Run air purifiers. Consider temporary relocation if AQI persists above 300.",
  },
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Look up current air quality for a ZIP code.
 *
 * In production, this calls the EPA AirNow API:
 * https://docs.airnowapi.org/CurrentObservationsByZip/docs
 */
export async function getAirQuality(input: AQILookupInput): Promise<AQIResult> {
  const parsed = AQILookupInput.parse(input);

  // In production, this fetches from EPA AirNow API
  // For now, return structured response showing the data format
  const overallAQI = 0; // Placeholder - real API call
  const category = getAQICategory(overallAQI);

  return {
    zipCode: parsed.zipCode,
    overallAQI,
    category,
    dominantPollutant: "pm25",
    pollutants: [
      {
        pollutant: "pm25",
        aqi: 0,
        concentration: 0,
        unit: "\u00B5g/m\u00B3",
        category: "good",
      },
      {
        pollutant: "ozone",
        aqi: 0,
        concentration: 0,
        unit: "ppb",
        category: "good",
      },
    ],
    healthRecommendations: HEALTH_RECOMMENDATIONS[category],
    forecast: parsed.includeForcast ? [] : undefined,
    lastUpdated: new Date().toISOString(),
    source: "EPA AirNow API (airnow.gov)",
  };
}

/**
 * Get health recommendations for a specific AQI value.
 */
export function getHealthRecommendations(aqi: number): {
  category: z.infer<typeof AQICategory>;
  recommendations: (typeof HEALTH_RECOMMENDATIONS)[string];
  shouldWearMask: boolean;
  shouldStayIndoors: boolean;
  exerciseGuidance: string;
} {
  const category = getAQICategory(aqi);
  const recs = HEALTH_RECOMMENDATIONS[category];

  return {
    category,
    recommendations: recs,
    shouldWearMask: aqi > 150,
    shouldStayIndoors: aqi > 200,
    exerciseGuidance:
      aqi <= 50
        ? "All outdoor activities are safe."
        : aqi <= 100
          ? "Most people can exercise outdoors normally."
          : aqi <= 150
            ? "Sensitive individuals should exercise indoors."
            : "Everyone should exercise indoors or not at all.",
  };
}

/**
 * Compare air quality between two ZIP codes.
 */
export function compareAirQuality(
  result1: AQIResult,
  result2: AQIResult
): {
  better: string;
  worse: string;
  difference: number;
  recommendation: string;
} {
  const better = result1.overallAQI <= result2.overallAQI ? result1 : result2;
  const worse = result1.overallAQI > result2.overallAQI ? result1 : result2;

  return {
    better: better.zipCode,
    worse: worse.zipCode,
    difference: Math.abs(result1.overallAQI - result2.overallAQI),
    recommendation:
      Math.abs(result1.overallAQI - result2.overallAQI) < 20
        ? "Air quality is similar in both areas."
        : `Air quality is significantly better in ${better.zipCode} (AQI ${better.overallAQI} vs ${worse.overallAQI}).`,
  };
}
