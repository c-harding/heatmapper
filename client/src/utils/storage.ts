import type { Activity, Gear } from '@strava-heatmapper/shared/interfaces';
import { TimeRange } from '@strava-heatmapper/shared/interfaces';

export interface ActivityStore {
  covered: TimeRange[];
  activities: Activity[];
}

export function saveCachedMap(id: number | string, map: string) {
  localStorage.setItem(`map:summary:${id}`, map);
}

export function saveCachedMaps(mappings: Record<string, string>) {
  Object.entries(mappings).map(([id, map]) => saveCachedMap(id, map));
}

export function getCachedMap(id: number | string) {
  return localStorage.getItem(`map:summary:${id}`);
}

export function saveCachedGear(id: string, gear: Gear) {
  localStorage.setItem(`gear:${id}`, JSON.stringify(gear));
}

export function getCachedGear(id: string): Gear | undefined {
  const json = localStorage.getItem(`gear:${id}`);
  if (json) return JSON.parse(json);
}

export function getActivityStore(): ActivityStore {
  const cache = localStorage.getItem('activities');
  return cache ? JSON.parse(cache) : { covered: [], activities: [] };
}

export function getCachedActivities(): Activity[] {
  return getActivityStore().activities;
}

export function appendCachedActivities(activities: Activity[], end: number, start?: number) {
  const existingStore = getActivityStore();
  const ids = new Set(activities.map((activity) => activity.id));
  const newStore: ActivityStore = {
    covered: TimeRange.merge((existingStore.covered || []).concat({ start, end })),
    activities: (existingStore.activities || [])
      .filter((existingActivity) => !ids.has(existingActivity.id))
      .concat(activities)
      .sort((a, b) => b.date - a.date),
  };
  localStorage.setItem('activities', JSON.stringify(newStore));
}

export function getCachedMaps(ids: (string | number)[]) {
  const notCached: string[] = [];

  const cached: Record<string, string> = {};
  for (const id of ids) {
    const fromCache = getCachedMap(id);
    if (fromCache) cached[id] = fromCache;
    else notCached.push(id.toString());
  }
  return { cached, notCached };
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
