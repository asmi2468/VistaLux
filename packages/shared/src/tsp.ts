export interface POINode {
  id: string;
  latitude: number;
  longitude: number;
  avgDwellMinutes: number;
  category: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function transitMinutes(distKm: number): number {
  return Math.round((distKm / 3.5) * 60);
}

export interface ScheduledStop {
  poi: POINode;
  arrivalMinutesFromMidnight: number;
  departureMinutesFromMidnight: number;
  transitToNextMinutes: number;
  transitToNextKm: number;
}

export interface DaySchedule {
  stops: ScheduledStop[];
  totalDurationMinutes: number;
}

export function scheduleDay(
  pois: POINode[],
  startMinutesFromMidnight = 9 * 60,
  endMinutesFromMidnight = 20 * 60
): DaySchedule {
  if (pois.length === 0) return { stops: [], totalDurationMinutes: 0 };

  const ordered = greedyNearestNeighbour(pois);
  const stops: ScheduledStop[] = [];
  let currentMinute = startMinutesFromMidnight;

  for (let i = 0; i < ordered.length; i++) {
    const poi = ordered[i];
    if (!poi) continue;
    const arrival = currentMinute;
    const departure = arrival + poi.avgDwellMinutes;

    const nextPoi = ordered[i + 1];
    const transitKm = nextPoi ? haversineKm(poi.latitude, poi.longitude, nextPoi.latitude, nextPoi.longitude) : 0;
    const transitMin = nextPoi ? transitMinutes(transitKm) : 0;

    if (departure + transitMin > endMinutesFromMidnight && stops.length > 0) break;

    stops.push({
      poi,
      arrivalMinutesFromMidnight: arrival,
      departureMinutesFromMidnight: departure,
      transitToNextMinutes: transitMin,
      transitToNextKm: transitKm,
    });

    currentMinute = departure + transitMin;
  }

  return {
    stops,
    totalDurationMinutes: currentMinute - startMinutesFromMidnight,
  };
}

function greedyNearestNeighbour(pois: POINode[]): POINode[] {
  if (pois.length <= 1) return [...pois];

  const unvisited = new Set(pois.map((_, i) => i));
  const result: POINode[] = [];

  let currentIdx = 0;
  unvisited.delete(currentIdx);
  const first = pois[currentIdx];
  if (first) result.push(first);

  while (unvisited.size > 0) {
    const current = result[result.length - 1];
    if (!current) break;

    let bestIdx = -1;
    let bestDist = Infinity;

    for (const idx of unvisited) {
      const candidate = pois[idx];
      if (!candidate) continue;
      const dist = haversineKm(current.latitude, current.longitude, candidate.latitude, candidate.longitude);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }

    if (bestIdx === -1) break;
    unvisited.delete(bestIdx);
    const next = pois[bestIdx];
    if (next) result.push(next);
  }

  return result;
}

export function balanceCategories(pois: POINode[], maxPerCategory = 2): POINode[] {
  const byCategory = new Map<string, POINode[]>();

  for (const poi of pois) {
    const bucket = byCategory.get(poi.category) ?? [];
    bucket.push(poi);
    byCategory.set(poi.category, bucket);
  }

  const result: POINode[] = [];
  const roundRobin = [...byCategory.values()];
  let i = 0;

  while (result.length < pois.length) {
    let added = false;
    for (const bucket of roundRobin) {
      if (bucket[i]) {
        result.push(bucket[i]);
        added = true;
      }
    }
    if (!added) break;
    i++;
    if (i >= maxPerCategory) break;
  }

  return result;
}
