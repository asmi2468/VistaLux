-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE budget_tier AS ENUM ('budget', 'moderate', 'luxury');
CREATE TYPE vibe_type AS ENUM ('classic', 'hidden_gem');
CREATE TYPE category AS ENUM ('landmark', 'food', 'shopping', 'nature');
CREATE TYPE trip_status AS ENUM ('draft', 'generating', 'active', 'completed');
CREATE TYPE oauth_provider AS ENUM ('google', 'apple');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  push_token TEXT,
  budget_preference budget_tier DEFAULT 'moderate',
  vibe_preference vibe_type DEFAULT 'classic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth accounts
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token_enc TEXT,
  refresh_token_hash TEXT,
  UNIQUE (provider, provider_user_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_id TEXT,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cities
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  avg_daily_meal_cost_budget NUMERIC(10,2) DEFAULT 30,
  avg_daily_meal_cost_moderate NUMERIC(10,2) DEFAULT 60,
  avg_daily_meal_cost_luxury NUMERIC(10,2) DEFAULT 120,
  transit_providers JSONB DEFAULT '[]'
);

-- Places (POIs)
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category category NOT NULL,
  vibe_type vibe_type NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  city_id UUID NOT NULL REFERENCES cities(id),
  avg_dwell_minutes INT NOT NULL DEFAULT 60,
  avg_ticket_cost NUMERIC(10,2) DEFAULT 0,
  budget_tier budget_tier NOT NULL,
  opening_hours JSONB,
  external_id TEXT,
  metadata JSONB
);

-- Trips
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id),
  title TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vibe vibe_type NOT NULL DEFAULT 'classic',
  budget_tier budget_tier NOT NULL DEFAULT 'moderate',
  status trip_status NOT NULL DEFAULT 'draft',
  offline_bundle_url TEXT,
  total_estimated_cost NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Itinerary days
CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  date DATE NOT NULL,
  route_polyline TEXT
);

-- Itinerary stops
CREATE TABLE itinerary_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES places(id),
  position INT NOT NULL,
  scheduled_arrival TIMESTAMPTZ,
  scheduled_departure TIMESTAMPTZ,
  dwell_minutes INT NOT NULL DEFAULT 60,
  transit_to_next JSONB,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  was_visited BOOLEAN NOT NULL DEFAULT FALSE
);

-- Scrapbooks
CREATE TABLE scrapbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  public_slug TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  photos JSONB DEFAULT '[]',
  location_track GEOMETRY(LineString, 4326),
  web_export_url TEXT,
  pdf_export_url TEXT,
  generated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_places_location ON places USING GIST (location);
CREATE INDEX idx_cities_location ON cities USING GIST (location);
CREATE INDEX idx_trips_user_status ON trips (user_id, status, start_date DESC);
CREATE INDEX idx_stops_day_position ON itinerary_stops (day_id, position);
CREATE INDEX idx_places_city_vibe_tier ON places (city_id, vibe_type, budget_tier);
CREATE INDEX idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);

-- Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrapbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY trips_isolation ON trips
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY scrapbooks_isolation ON scrapbooks
  USING (user_id = current_setting('app.user_id', true)::uuid OR is_public = TRUE);
