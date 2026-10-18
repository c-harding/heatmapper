import polyline from '@mapbox/polyline';
import {
  MOCK_ACTIVITY_TYPES,
  MOCK_NOW,
  MOCK_OLDEST_ACTIVITY,
  STRAVA_BROWSER_BASE_URL,
} from '@strava-heatmapper/shared/config/dotenv';
import { routeTypeMap, type SportType } from '@strava-heatmapper/shared/interfaces';

import {
  type DetailedGear,
  type LatLng,
  type SummaryActivity,
  type SummaryAthlete,
  type SummaryRoute,
} from '../strava/model';

const DAY = 24 * 60 * 60 * 1000;

/** Activities start at this hour, UTC */
const MOCK_START_HOUR = 7;

const CENTRE: LatLng = [48.137, 11.575];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BIKE_TYPES = new Set<string>([
  'Ride',
  'MountainBikeRide',
  'GravelRide',
  'EBikeRide',
  'EMountainBikeRide',
  'VirtualRide',
  'Velomobile',
  'Handcycle',
]);
const FOOT_TYPES = new Set<string>(['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike', 'Snowshoe']);

/** Typical speeds in metres per second, and loop radii in metres */
const SPEEDS: Record<string, number> = {
  Ride: 7,
  MountainBikeRide: 5,
  GravelRide: 6,
  Run: 3,
  TrailRun: 2.5,
  Walk: 1.4,
};
const RADII: Record<string, number> = { Ride: 6000, MountainBikeRide: 3000, GravelRide: 5000, Run: 2000, Walk: 800 };

const DEVICES = ['Garmin Edge 530', 'Garmin Forerunner 255', 'Wahoo ELEMNT BOLT', 'Strava App'];

export const ATHLETE: SummaryAthlete = {
  id: 1,
  resource_state: 2,
  firstname: 'Mock',
  lastname: 'Athlete',
  profile_medium: `${STRAVA_BROWSER_BASE_URL}/avatar.svg`,
  profile: `${STRAVA_BROWSER_BASE_URL}/avatar.svg`,
  city: 'Munich',
  state: 'Bavaria',
  country: 'Germany',
  sex: 'F',
  premium: false,
  summit: false,
  created_at: '2015-01-01T00:00:00Z',
  updated_at: '2015-01-01T00:00:00Z',
};

/** A pseudo-random generator, so that the same seed always draws the same path */
function random(seed: number) {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function distanceBetween([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/** A wobbly loop near the centre, with its length in metres */
function loop(seed: number, type: string) {
  const next = random(seed);
  const radius = (RADII[type] ?? 1500) * (0.6 + next() * 0.8);
  const metresPerDegree = 111320;
  const centre: LatLng = [
    CENTRE[0] + ((next() - 0.5) * 20000) / metresPerDegree,
    CENTRE[1] + ((next() - 0.5) * 30000) / (metresPerDegree * Math.cos((CENTRE[0] * Math.PI) / 180)),
  ];
  const points: LatLng[] = [];
  const count = 40;
  for (let i = 0; i <= count; i += 1) {
    const angle = (i / count) * 2 * Math.PI;
    const wobble = radius * (0.85 + next() * 0.3);
    points.push([
      centre[0] + (Math.sin(angle) * wobble) / metresPerDegree,
      centre[1] + (Math.cos(angle) * wobble) / (metresPerDegree * Math.cos((centre[0] * Math.PI) / 180)),
    ]);
  }
  points[count] = points[0];
  const distance = points.slice(1).reduce((sum, point, i) => sum + distanceBetween(points[i], point), 0);
  return { map: polyline.encode(points), points, distance };
}

/** The gear an activity of this type, on this weekday (0 is Monday), would use */
function gearFor(type: string, weekday: number): string | undefined {
  if (BIKE_TYPES.has(type)) return `b${weekday + 1}`;
  if (FOOT_TYPES.has(type)) return `g${weekday + 1}`;
  return undefined;
}

/** The mock's present: MOCK_NOW when set, so that a run sees the same days throughout */
const mockNow = () => MOCK_NOW ?? Date.now();

function oldestDay(now: number): number {
  const oldest = MOCK_OLDEST_ACTIVITY ? Date.parse(MOCK_OLDEST_ACTIVITY) : NaN;
  return Math.floor((Number.isNaN(oldest) ? now - 365 * DAY : oldest) / DAY);
}

function activityOn(day: number): SummaryActivity {
  const start = day * DAY + MOCK_START_HOUR * 60 * 60 * 1000;
  const id = start / 1000;
  const type = MOCK_ACTIVITY_TYPES[day % MOCK_ACTIVITY_TYPES.length];
  // The epoch was a Thursday
  const weekday = (day + 3) % 7;
  const { map, points, distance } = loop(id, type);
  const movingTime = Math.round(distance / (SPEEDS[type] ?? 2));
  const next = random(id + 1);
  const elevLow = 500 + Math.round(next() * 50);
  const elevHigh = elevLow + Math.round(next() * 150);
  const isoStart = new Date(start).toISOString().replace(/\.\d+Z$/, 'Z');
  return {
    id,
    external_id: `mock-${id}`,
    upload_id: id,
    upload_id_str: String(id),
    athlete: { id: ATHLETE.id },
    name: `${WEEKDAYS[weekday]} ${type.toLowerCase()}`,
    distance,
    moving_time: movingTime,
    elapsed_time: Math.round(movingTime * 1.1),
    total_elevation_gain: elevHigh - elevLow,
    elev_high: elevHigh,
    elev_low: elevLow,
    sport_type: type as SportType,
    start_date: isoStart,
    start_date_local: isoStart,
    timezone: '(GMT+00:00) Etc/UTC',
    start_latlng: points[0],
    end_latlng: points[points.length - 1],
    achievement_count: 0,
    kudos_count: day % 5,
    comment_count: 0,
    athlete_count: 1,
    photo_count: 0,
    total_photo_count: 0,
    map: { summary_polyline: map },
    device_name: DEVICES[day % DEVICES.length],
    trainer: false,
    commute: weekday < 5 && type === 'Ride',
    manual: false,
    private: day % 10 === 0,
    flagged: false,
    workout_type: 0,
    average_speed: distance / movingTime,
    max_speed: (distance / movingTime) * 1.5,
    has_kudoed: false,
    hide_from_home: false,
    gear_id: gearFor(type, weekday)!,
    kilojoules: 0,
    average_watts: 0,
    device_watts: false,
    max_watts: 0,
    weighted_average_watts: 0,
    has_heartrate: false,
  };
}

/** One activity a day from the oldest day to today, newest first, as Strava sorts by start date */
export function allActivities(now = mockNow()): SummaryActivity[] {
  const activities: SummaryActivity[] = [];
  for (let day = Math.floor(now / DAY); day >= oldestDay(now); day -= 1) {
    const activity = activityOn(day);
    if (activity.id * 1000 <= now) activities.push(activity);
  }
  return activities;
}

const routeTypes = new Map(
  Object.entries(routeTypeMap).map(([routeType, sportType]) => [sportType as string, Number(routeType)]),
);

/** Ten routes for each configured type that can be a route */
export function allRoutes(): SummaryRoute[] {
  const types = [...new Set(MOCK_ACTIVITY_TYPES)].filter((type) => routeTypes.has(type));
  return types.flatMap((type, typeIndex) =>
    Array.from({ length: 10 }, (_, n): SummaryRoute => {
      const id = 1000 + typeIndex * 100 + n;
      const { map, distance } = loop(id * 7919, type);
      return {
        id,
        id_str: String(id),
        name: `${type} route ${n + 1}`,
        distance,
        elevation_gain: Math.round(random(id)() * 300),
        map: { summary_polyline: map },
        private: n % 4 === 1,
        starred: n % 3 === 0,
        type: routeTypes.get(type) as SummaryRoute['type'],
        sub_type: 1,
        athlete: ATHLETE,
        created_at: new Date(Date.UTC(2024, 0, 1 + typeIndex * 10 + n)).toISOString(),
      };
    }),
  );
}

/** A bike and a pair of shoes for each weekday, with their distances from the activities */
export function allGear(now = mockNow()): DetailedGear[] {
  const distances = new Map<string, number>();
  for (const { gear_id: gear, distance } of allActivities(now)) {
    if (gear) distances.set(gear, (distances.get(gear) ?? 0) + distance);
  }
  return WEEKDAYS.flatMap((weekday, i): DetailedGear[] => [
    {
      id: `b${i + 1}`,
      primary: i === 0,
      name: `${weekday} bike`,
      distance: distances.get(`b${i + 1}`) ?? 0,
      brand_name: 'Mock',
      model_name: `Bike ${i + 1}`,
      frame_type: 3,
      description: `Ridden on ${weekday}s`,
    },
    {
      id: `g${i + 1}`,
      primary: false,
      name: `${weekday} shoes`,
      distance: distances.get(`g${i + 1}`) ?? 0,
      brand_name: 'Mock',
      model_name: `Shoes ${i + 1}`,
      description: `Worn on ${weekday}s`,
    },
  ]);
}
