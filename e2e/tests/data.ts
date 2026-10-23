import { type Browser, type BrowserContextOptions } from '@playwright/test';

import { CLIENT_URL, DAY, SERVER_URL } from '../env';
import { newContext } from './test';

/** The fields of the mock's Strava activities that the tests check against */
export interface StravaActivity {
  id: number;
  sport_type: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  device_name?: string;
  gear_id?: string;
  private: boolean;
  commute: boolean;
}

export interface StravaRoute {
  id_str: string;
  type: number;
  starred: boolean;
  private?: boolean;
}

/** As the config's own `use`, which a context made by hand does not inherit */
export const CONTEXT_OPTIONS: BrowserContextOptions = {
  baseURL: CLIENT_URL,
  locale: 'en-GB',
  timezoneId: 'UTC',
};

export const ALL_FILTER_FIELDS = [
  'sportType',
  'starred',
  'distance',
  'elevation',
  'gear',
  'isPrivate',
  'isCommute',
  'device',
];

/** A browser context with every filter shown, as if switched on in the filter help */
export async function contextWithAllFilters(browser: Browser, options?: BrowserContextOptions) {
  const context = await newContext(browser, { ...CONTEXT_OPTIONS, ...options });
  await context.addInitScript((fields) => {
    localStorage.setItem('filterFields', JSON.stringify(fields));
  }, ALL_FILTER_FIELDS);
  return context;
}

/** A token for the mock's API with every scope, got the way the app gets one, minus the browser */
async function token(): Promise<string> {
  const form = new URLSearchParams({
    redirect_uri: `${CLIENT_URL}/api/token`,
    state: 'e2e',
    decision: 'authorize',
  });
  for (const scope of ['read_all', 'activity:read', 'activity:read_all'])
    form.append('scope', scope);
  const authorized = await fetch(`${SERVER_URL}/mock-strava/oauth/authorize`, {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });
  const code = new URL(authorized.headers.get('location') ?? '').searchParams.get('code');
  const response = await fetch(`${SERVER_URL}/mock-strava/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  });
  return ((await response.json()) as { access_token: string }).access_token;
}

/** One request to the mock's API, as the backend would make it */
export async function mockApi<T>(path: string, query: Record<string, string | number>): Promise<T> {
  const params = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  const response = await fetch(`${SERVER_URL}/mock-strava/api/v3${path}?${params}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  return (await response.json()) as T;
}

async function allPages<T>(path: string): Promise<T[]> {
  const headers = { Authorization: `Bearer ${await token()}` };
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `${SERVER_URL}/mock-strava/api/v3${path}?per_page=200&page=${page}`,
      {
        headers,
      },
    );
    const pageItems = (await response.json()) as T[];
    items.push(...pageItems);
    if (pageItems.length < 200) return items;
  }
}

/** Every activity the mock serves, straight from its API */
export const mockActivities = () => allPages<StravaActivity>('/athlete/activities');

/** Every route the mock serves, straight from its API */
export const mockRoutes = () => allPages<StravaRoute>('/athletes/1/routes');

/** The start of the UTC week, month or year an activity falls in, as the app groups them */
export type Grouping = 'week-mon' | 'week-sat' | 'week-sun' | 'month' | 'year';

const firstWeekday: Record<string, number> = { 'week-mon': 1, 'week-sat': 6, 'week-sun': 0 };

function groupStart(grouping: Grouping, time: number): number {
  const date = new Date(time);
  if (grouping === 'month') return Date.UTC(date.getUTCFullYear(), date.getUTCMonth());
  if (grouping === 'year') return Date.UTC(date.getUTCFullYear(), 0);
  const day = Math.floor(time / DAY) * DAY;
  return day - ((date.getUTCDay() + 7 - firstWeekday[grouping]) % 7) * DAY;
}

const formats = {
  month: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short' }),
  year: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric' }),
  day: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
};

/** Browsers and Node space dates differently, e.g. with thin spaces around a dash */
export const normaliseSpaces = (text: string) => text.replace(/\s+/g, ' ').trim();

function groupLabel(grouping: Grouping, start: number): string {
  if (grouping === 'month') return formats.month.format(start);
  if (grouping === 'year') return formats.year.format(start);
  // Seven days, from the first day to the last
  return formats.day.formatRange(start, start + 7 * DAY - 1);
}

/** The groups the sidebar should show, newest first, with how many activities each holds */
export function expectedGroups(activities: StravaActivity[], grouping: Grouping) {
  const counts = new Map<number, number>();
  for (const activity of activities) {
    const start = groupStart(grouping, Date.parse(activity.start_date));
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  return Array.from(counts)
    .sort(([a], [b]) => b - a)
    .map(([start, count]) => ({
      label: normaliseSpaces(groupLabel(grouping, start)),
      count: `${count.toLocaleString('en-GB')} ${count === 1 ? 'activity' : 'activities'}`,
    }));
}

/** How the totals line words a count of activities */
export const activitiesText = (count: number) =>
  count === 0
    ? 'no activities'
    : `${count.toLocaleString('en-GB')} ${count === 1 ? 'activity' : 'activities'}`;
