import { type BrowserContext, type Page } from '@playwright/test';

import {
  activitiesText,
  CONTEXT_OPTIONS,
  contextWithAllFilters,
  mockRoutes,
  type StravaActivity,
  type StravaRoute,
} from './data';
import { activitiesAsShown, expectAllActivities, loadButton, logIn, totals } from './helpers';
import { expect, newContext, test } from './test';

/** A filter control, found by the name beside it */
const field = (page: Page, name: string) =>
  page
    .locator('label, div')
    .filter({ has: page.locator(`xpath=./span[normalize-space()="${name}"]`) })
    .first();

const range = (page: Page, name: string) => field(page, name).locator('input[type=number]');

const count = (activities: StravaActivity[], predicate: (activity: StravaActivity) => boolean) =>
  activitiesText(activities.filter(predicate).length);

test.describe('activity filters', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;
  let activities: StravaActivity[];

  test.beforeAll(async ({ browser }) => {
    context = await contextWithAllFilters(browser);
    page = await context.newPage();
    await page.goto('/');
    await loadButton(page).click();
    await logIn(page);
    await expectAllActivities(page);
    activities = await activitiesAsShown(page);
    await page.getByTitle('Filter').click();
  });

  // Each test puts the filters back, as the next one starts from what it leaves
  test.afterEach(async () => {
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('sport type: one type', async () => {
    await field(page, 'Sport type').locator('select').selectOption({ label: 'Biking' });
    await expect(totals(page)).toHaveText(count(activities, (a) => a.sport_type === 'Ride'));
    await field(page, 'Sport type').locator('select').selectOption({ label: 'All sports' });
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('sport type: a group of types', async () => {
    await field(page, 'Sport type').locator('select').selectOption({ label: 'All on foot' });
    await expect(totals(page)).toHaveText(
      count(activities, (a) =>
        ['Hike', 'Snowshoe', 'Run', 'TrailRun', 'Walk'].includes(a.sport_type),
      ),
    );
    await field(page, 'Sport type').locator('select').selectOption({ label: 'All sports' });
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('distance: min, max and both', async () => {
    const [min, max] = [range(page, 'Distance').nth(0), range(page, 'Distance').nth(1)];
    await min.fill('20');
    await expect(totals(page)).toHaveText(count(activities, (a) => a.distance >= 20_000));
    await min.fill('');
    await max.fill('10');
    await expect(totals(page)).toHaveText(count(activities, (a) => a.distance <= 10_000));
    await min.fill('5');
    await expect(totals(page)).toHaveText(
      count(activities, (a) => a.distance >= 5_000 && a.distance <= 10_000),
    );
    await min.fill('');
    await max.fill('');
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('elevation: min and max', async () => {
    const [min, max] = [range(page, 'Elevation').nth(0), range(page, 'Elevation').nth(1)];
    const atLeast100 = count(activities, (a) => a.total_elevation_gain >= 100);
    const atMost20 = count(activities, (a) => a.total_elevation_gain <= 20);
    // Otherwise the second check could pass on what the first left behind
    expect(atMost20).not.toBe(atLeast100);
    await min.fill('100');
    await expect(totals(page)).toHaveText(atLeast100);
    await min.fill('');
    await max.fill('20');
    await expect(totals(page)).toHaveText(atMost20);
    await max.fill('');
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('gear', async () => {
    const select = field(page, 'Gear').locator('select');
    await select.selectOption({ label: 'Monday bike' });
    await expect(totals(page)).toHaveText(count(activities, (a) => a.gear_id === 'b1'));
    await select.selectOption({ label: 'Sunday shoes' });
    await expect(totals(page)).toHaveText(count(activities, (a) => a.gear_id === 'g7'));
    await select.selectOption({ label: 'All gear' });
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('device: part of a name, and a whole name in quotes', async () => {
    const input = field(page, 'Device').locator('input');
    await input.fill('garmin');
    await input.blur();
    await expect(totals(page)).toHaveText(
      count(activities, (a) => !!a.device_name?.toLowerCase().includes('garmin')),
    );
    await input.fill('"Garmin Edge 530"');
    await input.blur();
    await expect(totals(page)).toHaveText(
      count(activities, (a) => a.device_name === 'Garmin Edge 530'),
    );
    // In quotes only the whole name matches, so part of one matches nothing and the totals go
    await input.fill('"Garmin Edge"');
    await input.blur();
    await expect(totals(page)).toBeHidden();
    await input.fill('');
    await input.blur();
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('visibility: private and public', async () => {
    await page.getByTitle('Only private activities').click();
    await expect(totals(page)).toHaveText(count(activities, (a) => a.private));
    await page.getByTitle('Only public activities').click();
    await expect(totals(page)).toHaveText(count(activities, (a) => !a.private));
    // Choosing the chosen option again turns the filter off
    await page.getByTitle('Only public activities').click();
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('commute: only commutes, and none', async () => {
    await page.getByTitle('Only commutes').click();
    await expect(totals(page)).toHaveText(count(activities, (a) => a.commute));
    await page.getByTitle('Exclude commutes').click();
    await expect(totals(page)).toHaveText(count(activities, (a) => !a.commute));
    await page.getByTitle('Exclude commutes').click();
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });

  test('two filters together, then Clear and Undo', async () => {
    await field(page, 'Sport type').locator('select').selectOption({ label: 'Biking' });
    await page.getByTitle('Exclude commutes').click();
    const both = count(activities, (a) => a.sport_type === 'Ride' && !a.commute);
    await expect(totals(page)).toHaveText(both);

    // The Filter tab's own Clear, beside its heading, not the one at the top that discards the cache
    const clearOrUndo = page
      .getByRole('region', { name: 'Filter', exact: true })
      .getByRole('button', { name: /^(Clear|Undo)$/ });
    await clearOrUndo.click();
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
    await clearOrUndo.click();
    await expect(totals(page)).toHaveText(both);
    await clearOrUndo.click();
    await expect(totals(page)).toHaveText(activitiesText(activities.length));
  });
});

test.describe('route filters', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;
  let routes: StravaRoute[];
  const routesText = (n: number) => `${n} ${n === 1 ? 'route' : 'routes'}`;

  test.beforeAll(async ({ browser }) => {
    context = await contextWithAllFilters(browser);
    page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Routes' }).click();
    await loadButton(page).click();
    await logIn(page);
    routes = await mockRoutes();
    await expect(totals(page)).toHaveText(routesText(routes.length));
    await page.getByTitle('Filter').click();
  });

  // Each test puts the filters back, as the next one starts from what it leaves
  test.afterEach(async () => {
    await expect(totals(page)).toHaveText(routesText(routes.length));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('starred and unstarred', async () => {
    await page.getByTitle('Only starred activities').click();
    await expect(totals(page)).toHaveText(routesText(routes.filter((r) => r.starred).length));
    await page.getByTitle('Only unstarred activities').click();
    await expect(totals(page)).toHaveText(routesText(routes.filter((r) => !r.starred).length));
    await page.getByTitle('Only unstarred activities').click();
    await expect(totals(page)).toHaveText(routesText(routes.length));
  });

  test('sport type', async () => {
    await field(page, 'Sport type').locator('select').selectOption({ label: 'Biking' });
    // Route type 1 is a ride
    await expect(totals(page)).toHaveText(routesText(routes.filter((r) => r.type === 1).length));
    await field(page, 'Sport type').locator('select').selectOption({ label: 'All sports' });
    await expect(totals(page)).toHaveText(routesText(routes.length));
  });
});

test('a filter switched on in the filter help appears in the panel', async ({ browser }) => {
  const context = await newContext(browser, CONTEXT_OPTIONS);
  const page = await context.newPage();
  await page.goto('/');
  await page.getByTitle('Filter').click();
  await expect(field(page, 'Distance')).toBeHidden();

  await page.getByRole('button', { name: 'Fields' }).click();
  await page.getByRole('checkbox', { name: 'Distance' }).check();
  await page.keyboard.press('Escape');
  await expect(field(page, 'Distance')).toBeVisible();
  await context.close();
});
