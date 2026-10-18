import { DAY, MOCK_NOW } from '../env';
import {
  activityCount,
  expectAllActivities,
  loadButton,
  logIn,
  mockRequests,
  shownCount,
  totals,
  waitForCache,
} from './helpers';
import { expect, test } from './test';

test('every gear is fetched once', async ({ page }) => {
  const since = new Date();
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);

  const gear = (await mockRequests(since, '/api/v3/gear/')).map(({ path }) => path);
  expect(gear.sort()).toEqual(
    ['b', 'g']
      .flatMap((kind) => [1, 2, 3, 4, 5, 6, 7].map((n) => `/api/v3/gear/${kind}${n}`))
      .sort(),
  );
});

test('a second load only asks for activities since the newest', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);

  await waitForCache(page, activityCount(), { finished: true });

  // After a page reload the button offers a partial load again
  await page.reload();
  const since = new Date();
  await loadButton(page).click();
  await expect(loadButton(page)).toHaveAccessibleName('Reload');

  const requests = await mockRequests(since, '/api/v3/athlete/activities');
  expect(requests.length).toBeGreaterThan(0);
  for (const { query } of requests) {
    expect(Number(query.after) * 1000).toBeGreaterThan(MOCK_NOW - 2 * DAY);
  }
});

test('an interrupted load carries on below what it covered', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  // One or two pages in, of four
  await expect(totals(page)).toHaveText(/^[2-5]\d\d activities$/);
  await page.getByRole('button', { name: 'Cancel' }).click();
  const loaded = await shownCount(page);
  expect(loaded).toBeLessThan(activityCount());
  await waitForCache(page, loaded);

  await page.reload();
  const since = new Date();
  await loadButton(page).click();
  await expectAllActivities(page);

  // Only what is newer than the cache, and what is older than its first page
  const requests = await mockRequests(since, '/api/v3/athlete/activities');
  const recent = ({ query }: { query: Record<string, string> }) =>
    Number(query.after) * 1000 > MOCK_NOW - 2 * DAY;
  const older = ({ query }: { query: Record<string, string> }) =>
    Number(query.before) * 1000 < MOCK_NOW - 150 * DAY;
  expect(requests.some(older)).toBe(true);
  for (const request of requests) expect(recent(request) || older(request)).toBe(true);
});

test('mock-strava: routes load ten for each type', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Routes' }).click();
  await loadButton(page).click();
  await logIn(page);

  await expect(totals(page)).toHaveText('30 routes');
});
