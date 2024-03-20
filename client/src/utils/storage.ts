import {
  type Activity,
  type Gear,
  type Route,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';

export interface ActivityStore {
  version: number;
  covered: TimeRange[];
  activities: Activity[];
}

export interface RouteStore {
  routes: Route[];
}

export function saveCachedGear(id: string, gear: Gear) {
  localStorage.setItem(`gear:${id}`, JSON.stringify(gear));
}

export function getCachedGear(id: string): Gear | undefined {
  const json = localStorage.getItem(`gear:${id}`);
  if (json) return JSON.parse(json) as Gear;
}

export function getActivityStore(): ActivityStore {
  const rawCache = localStorage.getItem('activities');
  const cache = rawCache ? (JSON.parse(rawCache) as Partial<ActivityStore>) : undefined;
  return {
    version: cache?.version ?? 0,
    covered: cache?.covered ?? [],
    activities: cache?.activities ?? [],
  };
}

export function getRouteStore(): RouteStore {
  const rawCache = localStorage.getItem('routes');
  const cache = rawCache ? (JSON.parse(rawCache) as Partial<RouteStore>) : undefined;
  return {
    routes: cache?.routes ?? [],
  };
}

export function resetStore(version: number) {
  localStorage.setItem(
    'activities',
    JSON.stringify({ activities: [], covered: [], version } satisfies ActivityStore),
  );
  localStorage.setItem('routes', JSON.stringify({ routes: [] } satisfies RouteStore));
}

export function getCachedActivities(): Activity[] {
  return getActivityStore().activities;
}

export function getCachedRoutes(): Route[] {
  return getRouteStore().routes;
}

export function appendCachedActivities(activities: Activity[], end: number, start?: number) {
  const existingStore = getActivityStore();
  const ids = new Set(activities.map((activity) => activity.id));
  const newStore: ActivityStore = {
    version: existingStore.version,
    covered: TimeRange.merge(existingStore.covered.concat({ start, end })),
    activities: existingStore.activities
      .filter((existingActivity) => !ids.has(existingActivity.id))
      .concat(activities)
      .sort((a, b) => b.date - a.date),
  };
  localStorage.setItem('activities', JSON.stringify(newStore));
}

export function appendCachedRoutes(routes: Route[]) {
  const existingStore = getRouteStore();
  const ids = new Set(routes.map((route) => route.id));
  const newStore: RouteStore = {
    routes: existingStore.routes
      .filter((existingRoute) => !ids.has(existingRoute.id))
      .concat(routes)
      .sort((a, b) => b.date - a.date),
  };
  localStorage.setItem('routes', JSON.stringify(newStore));
}

export function getCachedGears(ids: string[]) {
  const notCached: string[] = [];

  const cached: Record<string, Gear> = {};
  for (const id of ids) {
    const fromCache = getCachedGear(id);
    if (fromCache) cached[id] = fromCache;
    else notCached.push(id);
  }
  return { cached, notCached };
}
