import {
  type Activity,
  type Gear,
  type Route,
  TimeRange,
} from '@strava-heatmapper/shared/interfaces';
import localforage from 'localforage';

import { type FilterField, type FilterModel } from '@/types/FilterModel';

/**
 * localStorage, which can throw on any access when blocked, as in some private windows, and hold
 * anything at all. A failure loses only what it stored, rather than stopping the app from starting.
 */
export function readStored(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch (e) {
    console.warn('Cannot read', key, 'from localStorage', e);
    return undefined;
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('Cannot write', key, 'to localStorage', e);
  }
}

/** For a stored value that must be a plain object, as arrays and null pass `typeof` */
function asObject<T>(value: unknown): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Not an object');
  }
  return value as T;
}

/** A stored JSON value, passed through `read` so that one of the wrong shape counts as corrupt */
function readStoredJson<T>(key: string, read: (value: unknown) => T): T | undefined {
  const json = readStored(key);
  if (json === undefined) return undefined;
  try {
    return read(JSON.parse(json));
  } catch (e) {
    console.warn('Ignoring a corrupt', key, 'in localStorage', e);
    return undefined;
  }
}

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

const gearStore = localforage.createInstance({
  storeName: 'gear',
});

const activityStore = localforage.createInstance({
  storeName: 'activities',
});

const routeStore = localforage.createInstance({
  storeName: 'routes',
});

/** Per-store write queues, so read-modify-write ops on the same store can't interleave. */
const writeQueues = new WeakMap<LocalForage, Promise<unknown>>();

/**
 * Serialize a read-modify-write against a single store instance. Concurrent calls for the
 * same store run one at a time, in call order; calls for different stores run independently.
 */
function serializeStoreWrite<T>(store: LocalForage, op: () => Promise<T>): Promise<T> {
  const queue = writeQueues.get(store) ?? Promise.resolve();
  const result = queue.then(op);
  writeQueues.set(
    store,
    result.catch(() => undefined),
  ); // keep the chain alive even if op rejects
  return result;
}

export async function saveCachedGear(id: string, gear: Gear) {
  await gearStore.setItem(id, gear);
}

export async function getCachedGear(id: string): Promise<Gear | undefined> {
  const gear = await gearStore.getItem<Gear>(id);
  return gear ?? undefined;
}

export function loadFilterModel() {
  return readStoredJson('filter', asObject<FilterModel>);
}

export function saveFilterModel(filter: FilterModel) {
  writeStored('filter', JSON.stringify(filter));
}

export function loadFilterFields() {
  return readStoredJson('filterFields', (value) => {
    if (!Array.isArray(value)) throw new TypeError('Not an array');
    return new Set(value as FilterField[]);
  });
}

export function saveFilterFields(filter: Set<FilterField>) {
  writeStored('filterFields', JSON.stringify(Array.from(filter)));
}

// returns a string to be validated by the consumer
export function loadGroupLevel(): string | undefined {
  return readStored('groupLevel');
}

export function saveGroupLevel(level: string) {
  writeStored('groupLevel', level);
}

export interface StoredDisplayOptions {
  showActivities?: boolean;
}

export function loadDisplayOptions(): StoredDisplayOptions | undefined {
  return readStoredJson('displayOptions', asObject<StoredDisplayOptions>);
}

export function saveDisplayOptions(options: StoredDisplayOptions) {
  writeStored('displayOptions', JSON.stringify(options));
}

/**
 * The meta last written, for when storage will not keep it: otherwise every load would look like a
 * new version, and throw away what is loaded
 */
let writtenMeta: StoreMeta | undefined;

export function getStoreMeta(): StoreMeta {
  const cache = readStoredJson('meta', asObject<Partial<StoreMeta>>) ?? writtenMeta;
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
  try {
    // Remove legacy localStorage items
    localStorage.removeItem('activities');
    localStorage.removeItem('routes');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('gear:') || key.startsWith('map:'))
      .forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Cannot remove legacy items from localStorage', e);
  }
  writtenMeta = { version, user };
  writeStored('meta', JSON.stringify(writtenMeta));
  await Promise.all([
    gearStore.clear(),
    serializeStoreWrite(activityStore, () => activityStore.clear()),
    serializeStoreWrite(routeStore, () => routeStore.clear()),
  ]);
}

export async function getCachedActivities(): Promise<Activity[]> {
  const store = await getActivityStore();
  return store.activities;
}

export async function getCachedRoutes(): Promise<Route[]> {
  const store = await getRouteStore();
  return store.routes;
}

export function appendCachedActivities(activities: Activity[], end: number, start?: number) {
  return serializeStoreWrite(activityStore, async () => {
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
  });
}

export function appendCachedRoutes(routes: Route[]) {
  return serializeStoreWrite(routeStore, async () => {
    const existingStore = await getRouteStore();
    const ids = new Set(routes.map((route) => route.id));
    const newStore: RouteStore = {
      routes: existingStore.routes
        .filter((existingRoute) => !ids.has(existingRoute.id))
        .concat(routes)
        .sort((a, b) => b.date - a.date),
    };
    await routeStore.setItem('routes', newStore);
  });
}

export function clearCachedActivities(start?: Date, end?: Date) {
  return serializeStoreWrite(activityStore, async () => {
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
        // activity.date is in milliseconds; TimeRange works in seconds.
        (activity) => !TimeRange.includes([timeRange], activity.date / 1000),
      );
      store.covered = TimeRange.subtract(store.covered, [timeRange]);
    }
    await setActivityStore(store.covered, store.activities);
  });
}

export function clearCachedRoutes() {
  return serializeStoreWrite(routeStore, () => routeStore.clear());
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
