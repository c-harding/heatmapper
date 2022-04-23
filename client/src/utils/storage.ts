import type { Activity } from '@strava-heatmapper/shared/interfaces';
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
      .sort((a, b) => b.id - a.id),
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
