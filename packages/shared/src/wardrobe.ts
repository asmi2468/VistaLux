import type { WeatherForecast, WardrobeItem } from "./types.js";

interface WardrobeRule {
  condition: (forecast: WeatherForecast) => boolean;
  item: string;
  reason: string;
  priority: WardrobeItem["priority"];
}

const RULES: WardrobeRule[] = [
  {
    condition: (f) => f.tempMinC < 5,
    item: "Heavy winter coat",
    reason: "Temperatures below 5°C expected",
    priority: "essential",
  },
  {
    condition: (f) => f.tempMinC >= 5 && f.tempMinC < 10,
    item: "Warm jacket",
    reason: "Temperatures below 10°C expected",
    priority: "essential",
  },
  {
    condition: (f) => f.tempMinC >= 10 && f.tempMinC < 16,
    item: "Light jacket or cardigan",
    reason: "Cool temperatures expected",
    priority: "recommended",
  },
  {
    condition: (f) => f.precipProbability > 0.6,
    item: "Umbrella or rain jacket",
    reason: "Over 60% chance of rain",
    priority: "essential",
  },
  {
    condition: (f) => f.precipProbability > 0.3 && f.precipProbability <= 0.6,
    item: "Compact umbrella",
    reason: "Some chance of rain",
    priority: "recommended",
  },
  {
    condition: (f) => f.precipProbability > 0.6,
    item: "Waterproof shoes",
    reason: "High rain probability",
    priority: "recommended",
  },
  {
    condition: (f) => f.uvIndex > 7,
    item: "Sunscreen (SPF 50+)",
    reason: `UV index ${f.uvIndex.toString()} — very high`,
    priority: "essential",
  },
  {
    condition: (f) => f.uvIndex > 5,
    item: "Sunglasses",
    reason: "High UV levels",
    priority: "recommended",
  },
  {
    condition: (f) => f.uvIndex > 7,
    item: "Wide-brim hat",
    reason: "Very high UV index",
    priority: "recommended",
  },
  {
    condition: (f) => f.tempMaxC > 28,
    item: "Light breathable clothing",
    reason: `High of ${f.tempMaxC.toString()}°C expected`,
    priority: "recommended",
  },
  {
    condition: (f) => f.windKph > 40,
    item: "Windproof layer",
    reason: `Strong winds of ${f.windKph.toString()} km/h expected`,
    priority: "recommended",
  },
  {
    condition: () => true,
    item: "Comfortable walking shoes",
    reason: "You'll be doing a lot of walking",
    priority: "essential",
  },
  {
    condition: () => true,
    item: "Portable phone charger / power bank",
    reason: "Keep your phone charged for maps and photos",
    priority: "recommended",
  },
];

export function getWardrobeRecommendations(forecast: WeatherForecast): WardrobeItem[] {
  const seen = new Set<string>();
  const items: WardrobeItem[] = [];

  for (const rule of RULES) {
    if (rule.condition(forecast) && !seen.has(rule.item)) {
      seen.add(rule.item);
      items.push({
        item: rule.item,
        reason: rule.reason,
        priority: rule.priority,
      });
    }
  }

  const priorityOrder: Record<WardrobeItem["priority"], number> = {
    essential: 0,
    recommended: 1,
    optional: 2,
  };

  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
