import { DAY, MOCK_NOW, SERVER_URL } from '../env';
import { mockApi, mockTokens, type StravaActivity } from './data';
import { clearMockFailures, failMock } from './helpers';
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

const athlete = (token: string) =>
  fetch(`${SERVER_URL}/mock-strava/api/v3/athlete`, {
    headers: { Authorization: `Bearer ${token}` },
  });

test('mock-strava: a failure asked for answers only its own token, as often as asked', async () => {
  const [mine, others] = [await mockTokens(), await mockTokens()];
  await failMock(mine.access, 429, { times: 2 });

  expect((await athlete(mine.access)).status).toBe(429);
  expect((await athlete(others.access)).status).toBe(200);
  expect((await athlete(mine.access)).status).toBe(429);
  expect((await athlete(mine.access)).status).toBe(200);
});

test('mock-strava: a refresh fails by its refresh token', async () => {
  const { refresh } = await mockTokens();
  await failMock(refresh, 503);

  const response = await fetch(`${SERVER_URL}/mock-strava/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  expect(response.status).toBe(503);
});

test('mock-strava: a dropped request gets no answer at all', async () => {
  const { access } = await mockTokens();
  await failMock(access, 'drop');

  await expect(athlete(access)).rejects.toThrow();
  expect((await athlete(access)).status).toBe(200);
});

const activities = (token: string) =>
  fetch(`${SERVER_URL}/mock-strava/api/v3/athlete/activities?per_page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

test('mock-strava: a failure for a path leaves its token working elsewhere', async () => {
  const { access } = await mockTokens();
  await failMock(access, 503, { path: '/api/v3/athlete/activities' });

  expect((await athlete(access)).status).toBe(200);
  expect((await activities(access)).status).toBe(503);
});

test('mock-strava: failures for one token play out in the order asked for', async () => {
  const { access } = await mockTokens();
  await failMock(access, 429);
  await failMock(access, 503);

  expect((await athlete(access)).status).toBe(429);
  expect((await athlete(access)).status).toBe(503);
  expect((await athlete(access)).status).toBe(200);
});

test('mock-strava: withdrawing failures takes only those for the token and paths given', async () => {
  const [mine, others] = [await mockTokens(), await mockTokens()];
  await failMock(mine.access, 503, { path: '/api/v3/athlete' });
  await failMock(mine.access, 503, { path: '/api/v3/athlete/activities' });
  await failMock(others.access, 503);

  await clearMockFailures({ token: mine.access, path: ['/api/v3/athlete'] });
  expect((await athlete(mine.access)).status).toBe(200);
  expect((await activities(mine.access)).status).toBe(503);
  expect((await athlete(others.access)).status).toBe(503);
});
