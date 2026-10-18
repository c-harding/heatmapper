import { expect, type Page } from '@playwright/test';

import { DAY, MOCK_NOW, OLDEST_ACTIVITY, SERVER_URL } from '../env';

export interface MockRequest {
  time: string;
  method: string;
  path: string;
  query: Record<string, string>;
}

/** The requests the mock of Strava has had since a time */
export async function mockRequests(since: Date, path?: string): Promise<MockRequest[]> {
  const response = await fetch(`${SERVER_URL}/mock-strava/_log`);
  const log = (await response.json()) as MockRequest[];
  return log.filter(
    (entry) => new Date(entry.time) >= since && (!path || entry.path.startsWith(path)),
  );
}

/** How many activities the mock has, one a day at 07:00 UTC */
export function activityCount(now = MOCK_NOW): number {
  const first = Math.floor(Date.parse(OLDEST_ACTIVITY) / DAY);
  const today = Math.floor(now / DAY);
  const startedToday = today * DAY + 7 * 60 * 60 * 1000 <= now;
  return today - first + (startedToday ? 1 : 0);
}

export const loginPrompt = (page: Page) => page.locator('img[src*="connect-to-strava"]');

export const loadButton = (page: Page) => page.getByRole('button', { name: /^(Load|Reload)$/ });

/** The totals above the list, which count up as pages arrive */
export const totals = (page: Page) => page.getByText(/^[\d,]+ (activities|routes)$/).first();

/** Open the consent form from the login prompt, leaving it to the caller */
export async function openConsent(page: Page, { keepSignedIn = true } = {}) {
  await expect(loginPrompt(page)).toBeVisible();
  if (!keepSignedIn) await page.getByLabel(/Keep me signed in/).uncheck();
  const popup = page.waitForEvent('popup');
  await loginPrompt(page).click();
  const consent = await popup;
  await expect(consent.getByRole('button', { name: 'Authorize' })).toBeVisible();
  return consent;
}

/** Log in through the popup, as most people do */
export async function logIn(page: Page, options?: { keepSignedIn?: boolean }) {
  const consent = await openConsent(page, options);
  // Listened for first, as the popup can close before the click returns
  const closed = consent.waitForEvent('close');
  await consent.getByRole('button', { name: 'Authorize' }).click();
  await closed;
}

export async function expectAllActivities(page: Page) {
  await expect(totals(page)).toHaveText(`${activityCount().toLocaleString('en-GB')} activities`);
  await expect(loadButton(page)).toHaveAccessibleName('Reload');
}

/**
 * Wait until the cache holds what the page shows, as the app writes it in the background. A
 * finished load also covers everything down to the start.
 */
export async function waitForCache(page: Page, count: number, { finished = false } = {}) {
  await page.waitForFunction(
    async ([expected, complete]) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('localforage');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (!db.objectStoreNames.contains('activities')) return false;
      const stored = await new Promise<
        { activities: unknown[]; covered: { start?: number }[] } | undefined
      >((resolve) => {
        const get = db.transaction('activities').objectStore('activities').get('activities');
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => resolve(undefined);
      });
      db.close();
      return (
        stored?.activities.length === expected &&
        (!complete || stored.covered.some(({ start }) => !start))
      );
    },
    [count, finished] as const,
  );
}

/** The number the totals above the list show */
export async function shownCount(page: Page): Promise<number> {
  return Number((await totals(page).textContent())?.replace(/\D/g, ''));
}
