import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const geometry = customType<{ data: string }>({
  dataType() {
    return "geometry";
  },
});

export const budgetTierEnum = pgEnum("budget_tier", ["budget", "moderate", "luxury"]);
export const vibeTypeEnum = pgEnum("vibe_type", ["classic", "hidden_gem"]);
export const categoryEnum = pgEnum("category", ["landmark", "food", "shopping", "nature"]);
export const tripStatusEnum = pgEnum("trip_status", ["draft", "generating", "active", "completed"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "apple"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    pushToken: text("push_token"),
    budgetPreference: budgetTierEnum("budget_preference").default("moderate"),
    vibePreference: vibeTypeEnum("vibe_preference").default("classic"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: oauthProviderEnum("provider").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenHash: text("refresh_token_hash"),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  deviceId: text("device_id"),
  consumed: boolean("consumed").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cities = pgTable("cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  location: geometry("location").notNull(),
  currencyCode: text("currency_code").notNull().default("USD"),
  avgDailyMealCostBudget: numeric("avg_daily_meal_cost_budget", { precision: 10, scale: 2 }).default("30"),
  avgDailyMealCostModerate: numeric("avg_daily_meal_cost_moderate", { precision: 10, scale: 2 }).default("60"),
  avgDailyMealCostLuxury: numeric("avg_daily_meal_cost_luxury", { precision: 10, scale: 2 }).default("120"),
  transitProviders: jsonb("transit_providers").$type<string[]>().default([]),
});

export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: categoryEnum("category").notNull(),
    vibeType: vibeTypeEnum("vibe_type").notNull(),
    location: geometry("location").notNull(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    avgDwellMinutes: integer("avg_dwell_minutes").notNull().default(60),
    avgTicketCost: numeric("avg_ticket_cost", { precision: 10, scale: 2 }).default("0"),
    budgetTier: budgetTierEnum("budget_tier").notNull(),
    openingHours: jsonb("opening_hours").$type<Record<string, string>>(),
    externalId: text("external_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("idx_places_city_vibe_tier").on(t.cityId, t.vibeType, t.budgetTier),
  ]
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id),
    title: text("title"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    vibe: vibeTypeEnum("vibe").notNull().default("classic"),
    budgetTier: budgetTierEnum("budget_tier").notNull().default("moderate"),
    status: tripStatusEnum("status").notNull().default("draft"),
    offlineBundleUrl: text("offline_bundle_url"),
    totalEstimatedCost: numeric("total_estimated_cost", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_trips_user_status").on(t.userId, t.status, t.startDate),
  ]
);

export const itineraryDays = pgTable("itinerary_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  date: text("date").notNull(),
  routePolyline: text("route_polyline"),
});

export const itineraryStops = pgTable(
  "itinerary_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: uuid("day_id")
      .notNull()
      .references(() => itineraryDays.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id),
    position: integer("position").notNull(),
    scheduledArrival: timestamp("scheduled_arrival", { withTimezone: true }),
    scheduledDeparture: timestamp("scheduled_departure", { withTimezone: true }),
    dwellMinutes: integer("dwell_minutes").notNull().default(60),
    transitToNext: jsonb("transit_to_next").$type<{
      mode: string;
      durationMin: number;
      costUsd: number;
    }>(),
    actualArrival: timestamp("actual_arrival", { withTimezone: true }),
    actualDeparture: timestamp("actual_departure", { withTimezone: true }),
    wasVisited: boolean("was_visited").notNull().default(false),
  },
  (t) => [
    index("idx_stops_day_position").on(t.dayId, t.position),
  ]
);

export const scrapbooks = pgTable("scrapbooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" })
    .unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  publicSlug: text("public_slug").unique(),
  isPublic: boolean("is_public").notNull().default(false),
  photos: jsonb("photos")
    .$type<Array<{ r2Url: string; placeId: string; timestamp: string; caption: string }>>()
    .default([]),
  locationTrack: text("location_track"),
  webExportUrl: text("web_export_url"),
  pdfExportUrl: text("pdf_export_url"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type Place = typeof places.$inferSelect;
export type ItineraryStop = typeof itineraryStops.$inferSelect;
export type ItineraryDay = typeof itineraryDays.$inferSelect;
export type Scrapbook = typeof scrapbooks.$inferSelect;
