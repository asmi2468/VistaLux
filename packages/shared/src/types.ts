export type BudgetTier = "budget" | "moderate" | "luxury";
export type VibeType = "classic" | "hidden_gems";
export type PlaceCategory = "landmark" | "food" | "shopping" | "nature";
export type TripStatus = "draft" | "generating" | "active" | "completed";

export interface City {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  currencyCode: string;
  avgDailyMealCost: Record<BudgetTier, number>;
  transitProviders: string[];
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  vibeType: VibeType;
  latitude: number;
  longitude: number;
  cityId: string;
  avgDwellMinutes: number;
  avgTicketCost: number;
  budgetTier: BudgetTier;
  openingHours: Record<string, string> | null;
  externalId: string | null;
}

export interface ItineraryStop {
  id: string;
  dayId: string;
  placeId: string;
  place: Place;
  position: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  dwellMinutes: number;
  transitToNext: { mode: string; durationMin: number; costUsd: number } | null;
  actualArrival: string | null;
  actualDeparture: string | null;
  wasVisited: boolean;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  routePolyline: string | null;
  stops: ItineraryStop[];
}

export interface Trip {
  id: string;
  userId: string;
  cityId: string;
  city: City;
  title: string;
  startDate: string;
  endDate: string;
  vibe: VibeType;
  budgetTier: BudgetTier;
  status: TripStatus;
  offlineBundleUrl: string | null;
  totalEstimatedCost: number;
  days: ItineraryDay[];
}

export interface WeatherForecast {
  cityId: string;
  date: string;
  tempMinC: number;
  tempMaxC: number;
  precipProbability: number;
  uvIndex: number;
  windKph: number;
  description: string;
}

export interface WardrobeItem {
  item: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
}
