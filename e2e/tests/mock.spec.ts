import { DAY, MOCK_NOW } from '../env';
import { mockApi, type StravaActivity } from './data';
import { expect, test } from './test';

const starts = (activities: StravaActivity[]) =>
  activities.map((activity) => Date.parse(activity.start_date));

const descending = (times: number[]) => times.every((time, i) => i === 0 || times[i - 1] > time);

const ascending = (times: number[]) => times.every((time, i) => i === 0 || times[i - 1] < time);

test('mock-strava: activities come newest first, as Strava sends them', async () => {
  const yearAgo = Math.floor((MOCK_NOW - 365 * DAY) / 1000);
  const now = Math.floor(MOCK_NOW / 1000) + 1;
  const queries: Record<string, number>[] = [{}, { before: now }, { after: yearAgo, before: now }];
  for (const query of queries) {
    const activities = await mockApi<StravaActivity[]>('/athlete/activities', query);
    expect(activities.length, JSON.stringify(query)).toBeGreaterThan(1);
    expect(descending(starts(activities)), JSON.stringify(query)).toBe(true);
  }
});

test('mock-strava: activities come oldest first when only after is given', async () => {
  const yearAgo = Math.floor((MOCK_NOW - 365 * DAY) / 1000);
  const activities = await mockApi<StravaActivity[]>('/athlete/activities', { after: yearAgo });
  expect(activities.length).toBeGreaterThan(1);
  expect(ascending(starts(activities))).toBe(true);
  // The oldest after the cut-off, not the newest of all
  expect(starts(activities)[0]).toBeLessThan(yearAgo * 1000 + 2 * DAY);
});
