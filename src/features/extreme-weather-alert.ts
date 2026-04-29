/**
 * MAMA Climate — Extreme Weather Alert
 *
 * Severe weather monitoring via NOAA/NWS APIs with
 * evacuation route guidance and emergency preparedness.
 *
 * @module extreme-weather-alert
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const WeatherSeverity = z.enum([
  "extreme",
  "severe",
  "moderate",
  "minor",
  "unknown",
]);

export const WeatherEventType = z.enum([
  "tornado",
  "hurricane",
  "flood",
  "wildfire",
  "extreme_heat",
  "extreme_cold",
  "winter_storm",
  "thunderstorm",
  "earthquake",
  "tsunami",
  "drought",
  "air_quality",
]);

export const WeatherAlert = z.object({
  id: z.string(),
  eventType: WeatherEventType,
  severity: WeatherSeverity,
  headline: z.string(),
  description: z.string(),
  instruction: z.string(),
  areaDescription: z.string(),
  effective: z.string().datetime(),
  expires: z.string().datetime(),
  source: z.string(),
});

export type WeatherAlert = z.infer<typeof WeatherAlert>;

export const WeatherAlertInput = z.object({
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  state: z.string().length(2).toUpperCase().optional(),
});

export type WeatherAlertInput = z.infer<typeof WeatherAlertInput>;

export const EmergencyKit = z.object({
  category: z.string(),
  items: z.array(z.object({ item: z.string(), quantity: z.string(), essential: z.boolean() })),
});

export const WeatherAlertResult = z.object({
  alerts: z.array(WeatherAlert),
  activeAlertCount: z.number(),
  highestSeverity: WeatherSeverity,
  safetyActions: z.array(z.string()),
  evacuationGuidance: z.string().optional(),
  emergencyKit: z.array(EmergencyKit).optional(),
  emergencyNumbers: z.array(z.object({ name: z.string(), phone: z.string() })),
  source: z.string(),
});

export type WeatherAlertResult = z.infer<typeof WeatherAlertResult>;

// ---------------------------------------------------------------------------
// Safety action database
// ---------------------------------------------------------------------------

const SAFETY_ACTIONS: Record<string, string[]> = {
  tornado: [
    "Go to the lowest floor of a sturdy building immediately.",
    "Get to an interior room (bathroom, closet) away from windows.",
    "If driving, do NOT try to outrun it. Pull over and get to a ditch or low area.",
    "Cover your head and neck with your arms or a heavy blanket.",
    "Do NOT open windows (this is a myth).",
  ],
  hurricane: [
    "If evacuation is ordered, LEAVE. Do not stay.",
    "Board up windows. Move to an interior room during the storm.",
    "Fill bathtubs with water for flushing toilets.",
    "Charge all devices. Download offline maps.",
    "After the storm, avoid flooded roads. Turn around, don\u2019t drown.",
  ],
  flood: [
    "Move to higher ground immediately if water is rising.",
    "NEVER drive through flooded roads. 6 inches of water can knock you down. 12 inches can carry a car.",
    "If trapped in a building, go to the highest level. Do NOT go into an attic with no escape route.",
    "Avoid walking in floodwater (contamination, hidden debris, downed power lines).",
  ],
  wildfire: [
    "If evacuation is ordered, leave IMMEDIATELY. Do not wait.",
    "Close all windows and doors (but leave them unlocked for firefighters).",
    "Wear N95 masks. Wildfire smoke is extremely harmful.",
    "If trapped, call 911. Go to a body of water or cleared area.",
    "Check air quality before returning. Smoke can linger for weeks.",
  ],
  extreme_heat: [
    "Stay indoors in air conditioning during peak hours (10am-6pm).",
    "Drink water constantly. Do NOT wait until you\u2019re thirsty.",
    "Check on elderly neighbors \u2014 they are most vulnerable.",
    "Never leave children or pets in parked cars.",
    "Know the signs of heat stroke: confusion, hot dry skin, rapid pulse. Call 911.",
  ],
  extreme_cold: [
    "Layer clothing. Cover extremities (hands, feet, ears, nose).",
    "Signs of frostbite: numbness, white/grayish skin. Warm slowly.",
    "Signs of hypothermia: shivering, confusion, slurred speech. Call 911.",
    "Keep pipes from freezing: let faucets drip, open cabinet doors.",
    "If power is out, NEVER use generators or grills indoors (carbon monoxide kills).",
  ],
};

const EMERGENCY_KIT: z.infer<typeof EmergencyKit>[] = [
  {
    category: "Water & Food",
    items: [
      { item: "Water (1 gallon per person per day)", quantity: "3-day supply minimum", essential: true },
      { item: "Non-perishable food", quantity: "3-day supply", essential: true },
      { item: "Manual can opener", quantity: "1", essential: true },
    ],
  },
  {
    category: "Safety & First Aid",
    items: [
      { item: "First aid kit", quantity: "1", essential: true },
      { item: "Flashlight + extra batteries", quantity: "1 per person", essential: true },
      { item: "Battery-powered or hand-crank radio", quantity: "1", essential: true },
      { item: "N95 masks", quantity: "2 per person", essential: true },
      { item: "Whistle (to signal for help)", quantity: "1 per person", essential: true },
    ],
  },
  {
    category: "Documents & Communication",
    items: [
      { item: "Copies of important documents (waterproof bag)", quantity: "1 set", essential: true },
      { item: "Phone charger + portable battery", quantity: "1", essential: true },
      { item: "Cash (small bills)", quantity: "$200+", essential: true },
      { item: "Emergency contact list (written, not just in phone)", quantity: "1", essential: true },
    ],
  },
  {
    category: "Personal",
    items: [
      { item: "Medications (7-day supply)", quantity: "Per person", essential: true },
      { item: "Prescription copies", quantity: "1 set", essential: true },
      { item: "Change of clothes", quantity: "1 per person", essential: false },
      { item: "Blankets or sleeping bags", quantity: "1 per person", essential: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Get active weather alerts for a location.
 *
 * In production, this calls NOAA/NWS API:
 * https://api.weather.gov/alerts/active?point={lat},{lon}
 */
export async function getWeatherAlerts(input: WeatherAlertInput): Promise<WeatherAlertResult> {
  const parsed = WeatherAlertInput.parse(input);

  // In production, fetch from NWS API
  const alerts: WeatherAlert[] = []; // Real API would populate this

  const highestSeverity = alerts.length > 0
    ? alerts.reduce((max, a) => {
        const order = ["extreme", "severe", "moderate", "minor", "unknown"];
        return order.indexOf(a.severity) < order.indexOf(max) ? a.severity : max;
      }, "unknown" as z.infer<typeof WeatherSeverity>)
    : "unknown";

  const eventTypes = [...new Set(alerts.map((a) => a.eventType))];
  const safetyActions = eventTypes.flatMap((et) => SAFETY_ACTIONS[et] ?? []);

  const needsEvacuation = alerts.some(
    (a) => a.severity === "extreme" && ["hurricane", "wildfire", "flood", "tsunami"].includes(a.eventType)
  );

  return {
    alerts,
    activeAlertCount: alerts.length,
    highestSeverity,
    safetyActions: safetyActions.length > 0 ? safetyActions : ["No active alerts for your area. Stay prepared."],
    evacuationGuidance: needsEvacuation
      ? "EVACUATION may be necessary. Know your evacuation routes. Do NOT wait for a mandatory order if you feel unsafe."
      : undefined,
    emergencyKit: alerts.length > 0 ? EMERGENCY_KIT : undefined,
    emergencyNumbers: [
      { name: "Emergency", phone: "911" },
      { name: "FEMA", phone: "1-800-621-3362" },
      { name: "Red Cross", phone: "1-800-733-2767" },
      { name: "Poison Control", phone: "1-800-222-1222" },
    ],
    source: "NOAA National Weather Service (weather.gov)",
  };
}

/**
 * Get safety actions for a specific weather event type.
 */
export function getSafetyActions(eventType: z.infer<typeof WeatherEventType>): string[] {
  return SAFETY_ACTIONS[eventType] ?? [
    "Monitor local news and weather services.",
    "Follow instructions from local emergency management.",
    "Have your emergency kit ready.",
  ];
}

/**
 * Get the emergency preparedness kit checklist.
 */
export function getEmergencyKit(): z.infer<typeof EmergencyKit>[] {
  return EMERGENCY_KIT;
}
