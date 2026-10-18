import { type Browser, type BrowserContext, type Page } from '@playwright/test';

import {
  CONTEXT_OPTIONS,
  expectedGroups,
  type Grouping,
  normaliseSpaces,
  type StravaActivity,
} from './data';
import { activitiesAsShown, expectAllActivities, loadButton, logIn } from './helpers';
import { expect, newContext, test } from './test';

const LEVELS: [Grouping, string][] = [
  ['week-mon', 'Week (Mon–Sun)'],
  ['week-sat', 'Week (Sat–Fri)'],
  ['week-sun', 'Week (Sun–Sat)'],
  ['month', 'Month'],
  ['year', 'Year'],
];

const groupBy = (page: Page) =>
  page
    .locator('label')
    .filter({ has: page.locator('xpath=./span[normalize-space()="Group by"]') })
    .locator('select');

/** The group headers; their label and count have no classes of their own to find them by */
const headers = (page: Page) => page.locator('[class*="_sidebarGroupHeader_"]');

/** Each group's label and count, as the sidebar shows them */
async function shownGroups(page: Page) {
  return Promise.all(
    (await headers(page).all()).map(async (header) => ({
      label: normaliseSpaces((await header.locator('xpath=./div/div[1]').textContent()) ?? ''),
      count: (await header.getByText(/^[\d,]+ activit(y|ies)$/).textContent())?.trim(),
    })),
  );
}

async function loadedPage(browser: Browser, timezoneId = 'UTC') {
  const context = await newContext(browser, { ...CONTEXT_OPTIONS, timezoneId });
  const page = await context.newPage();
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
  await page.getByTitle('Grouping').click();
  return { context, page };
}

test.describe('grouping', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;
  let activities: StravaActivity[];

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await loadedPage(browser));
    activities = await activitiesAsShown(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  for (const [grouping, label] of LEVELS) {
    test(`by ${label}`, async () => {
      await groupBy(page).selectOption({ label });
      const expected = expectedGroups(activities, grouping);
      await expect(headers(page)).toHaveCount(expected.length);
      expect(await shownGroups(page)).toEqual(expected);
      await groupBy(page).selectOption({ label: 'None' });
      await expect(headers(page)).toHaveCount(0);
    });
  }

  test('groups count only what the filter lets through', async () => {
    await page.getByTitle('Filter').click();
    await page
      .locator('label')
      .filter({ has: page.locator('xpath=./span[normalize-space()="Sport type"]') })
      .locator('select')
      .selectOption({ label: 'Biking' });
    await page.getByTitle('Grouping').click();
    await groupBy(page).selectOption({ label: 'Month' });

    const rides = activities.filter((activity) => activity.sport_type === 'Ride');
    const expected = expectedGroups(rides, 'month');
    await expect(headers(page)).toHaveCount(expected.length);
    expect(await shownGroups(page)).toEqual(expected);
  });
});

// In Honolulu, UTC-10 all year, each activity's 07:00 UTC start is the previous local day
test('weeks are UTC weeks of seven days, in a timezone well behind UTC', async ({ browser }) => {
  const { context, page } = await loadedPage(browser, 'Pacific/Honolulu');
  const activities = await activitiesAsShown(page);
  await groupBy(page).selectOption({ label: 'Week (Mon–Sun)' });

  const expected = expectedGroups(activities, 'week-mon');
  await expect(headers(page)).toHaveCount(expected.length);
  expect(await shownGroups(page)).toEqual(expected);
  await context.close();
});
