import {
  type Activity,
  type Gear,
  type Route,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import localforage from 'localforage';

import { type FilterField, type FilterModel } from '@/types/FilterModel';

export interface StoreMeta {
  version: number;
  user: number;
}

export interface ActivityStore {
  covered: TimeRange[];
  activities: Activity[];
}

export interface RouteStore {
  routes: Route[];
}

localforage.config({
  name: 'heatmapper',
});

const gearStore = localforage.createInstance({
  storeName: 'gear',
});

const activityStore = localforage.createInstance({
  storeName: 'activities',
});

const routeStore = localforage.createInstance({
  storeName: 'routes',
});

export async function saveCachedGear(id: string, gear: Gear) {
  await gearStore.setItem(id, gear);
}

export async function getCachedGear(id: string): Promise<Gear | undefined> {
  const gear = await gearStore.getItem<Gear>(id);
  return gear ?? undefined;
}

export function loadFilterModel() {
  const json = localStorage.getItem('filter');
  if (json) return JSON.parse(json) as FilterModel;
}

export function saveFilterModel(filter: FilterModel) {
  localStorage.setItem('filter', JSON.stringify(filter));
}

export function loadFilterFields() {
  const json = localStorage.getItem('filterFields');
  if (json) return new Set(JSON.parse(json) as FilterField[]);
}

export function saveFilterFields(filter: Set<FilterField>) {
  localStorage.setItem('filterFields', JSON.stringify(Array.from(filter)));
}

export function getStoreMeta(): StoreMeta {
  const rawCache = localStorage.getItem('meta');
  const cache = rawCache ? (JSON.parse(rawCache) as Partial<StoreMeta>) : undefined;
  return {
    version: cache?.version ?? 0,
    user: cache?.user ?? -1,
  };
}

export async function getActivityStore(): Promise<ActivityStore> {
  const cache = (await activityStore.getItem<Partial<ActivityStore>>('activities')) ?? undefined;
  return {
    covered: cache?.covered ?? [],
    activities: cache?.activities ?? [],
  };
}

async function setActivityStore(covered: TimeRange[], activities: Activity[]) {
  await activityStore.setItem<ActivityStore>('activities', { covered, activities });
}

export async function getRouteStore(): Promise<RouteStore> {
  const cache = (await routeStore.getItem<Partial<RouteStore>>('routes')) ?? undefined;
  return {
    routes: cache?.routes ?? [],
  };
}

export async function resetStore(version: number, user: number) {
  // Remove legacy localStorage items
  localStorage.removeItem('activities');
  localStorage.removeItem('routes');
  Object.keys(localStorage)
    .filter((key) => key.startsWith('gear:') || key.startsWith('map:'))
    .forEach((key) => localStorage.removeItem(key));
  localStorage.setItem('meta', JSON.stringify({ version, user } satisfies StoreMeta));
  await Promise.all([gearStore.clear(), activityStore.clear(), routeStore.clear()]);
}

export async function getCachedActivities(): Promise<Activity[]> {
  const store = await getActivityStore();
  return store.activities;
}

export async function getCachedRoutes(): Promise<Route[]> {
  const store = await getRouteStore();
  return store.routes;
}

export async function appendCachedActivities(activities: Activity[], end: number, start?: number) {
  const existingStore = await getActivityStore();
  const ids = new Set(activities.map((activity) => activity.id));
  const newStore: ActivityStore = {
    covered: TimeRange.merge(existingStore.covered.concat({ start, end })),
    activities: existingStore.activities
      .filter((existingActivity) => !ids.has(existingActivity.id))
      .concat(activities)
      .sort((a, b) => b.date - a.date),
  };
  await setActivityStore(newStore.covered, newStore.activities);
}

export async function appendCachedRoutes(routes: Route[]) {
  const existingStore = await getRouteStore();
  const ids = new Set(routes.map((route) => route.id));
  const newStore: RouteStore = {
    routes: existingStore.routes
      .filter((existingRoute) => !ids.has(existingRoute.id))
      .concat(routes)
      .sort((a, b) => b.date - a.date),
  };
  await routeStore.setItem('routes', newStore);
}

export async function clearCachedActivities(start?: Date, end?: Date) {
  const store = await getActivityStore();
  if (!start && !end) {
    store.activities = [];
    store.covered = [];
  } else {
    const timeRange: TimeRange = {
      start: start && start.getTime() / 1000,
      end: end && end.getTime() / 1000,
    };
    store.activities = store.activities.filter(
      (activity) => !TimeRange.includes([timeRange], activity.date),
    );
    store.covered = TimeRange.subtract(store.activities, [timeRange]);
  }
  await setActivityStore(store.covered, store.activities);
}

export async function clearCachedRoutes() {
  await routeStore.clear();
}

export async function getCachedGears(ids: string[]) {
  const notCached: string[] = [];

  const cached: Record<string, Gear> = {};
  for (const id of ids) {
    const fromCache = await getCachedGear(id);
    if (fromCache) cached[id] = fromCache;
    else notCached.push(id);
  }
  return { cached, notCached };
}
