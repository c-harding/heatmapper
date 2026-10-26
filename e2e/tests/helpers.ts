import { type BrowserContext, expect, type Locator, type Page } from '@playwright/test';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { DAY, MOCK_NOW, OLDEST_ACTIVITY, SERVER_URL, SESSIONS_DIR } from '../env';
import { mockActivities } from './data';

export interface MockRequest {
  time: string;
  method: string;
  path: string;
  query: Record<string, string>;
}

/**
 * Make the mock fail the next requests sent with a token, optionally only on some paths, as a
 * status or by dropping the connection. Scoped to one session's token, so that other tests are
 * unaffected; several for one token play out in the order asked for.
 */
export async function failMock(
  token: string,
  status: number | 'drop',
  { times = 1, path }: { times?: number; path?: string | string[] } = {},
) {
  const response = await fetch(`${SERVER_URL}/mock-strava/_fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, path, status, times }),
  });
  expect(response.status).toBe(204);
}

/** Withdraw the mock's failures for a token and the paths given, or all of them */
export async function clearMockFailures(only: { token?: string; path?: string | string[] } = {}) {
  const response = await fetch(`${SERVER_URL}/mock-strava/_fail`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(only),
  });
  expect(response.status).toBe(204);
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

/** The sidebar's, as the calendar's reconnect dialog shows the same image */
export const loginPrompt = (page: Page) => page.locator('aside img[src*="connect-to-strava"]');

export interface Session {
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaExpiry?: number;
  stravaScope?: string[];
}

/** The server's saved session for this browser, found by its login cookie */
export async function sessionFile(context: BrowserContext) {
  const token = (await context.cookies()).find(({ name }) => name === 'token')?.value;
  expect(token).toBeTruthy();
  return join(SESSIONS_DIR, `${token}.json`);
}

export async function readSession(context: BrowserContext): Promise<Session> {
  return JSON.parse(await readFile(await sessionFile(context), 'utf-8')) as Session;
}

export async function editSession(context: BrowserContext, edit: (session: Session) => void) {
  const session = await readSession(context);
  edit(session);
  await writeFile(await sessionFile(context), JSON.stringify(session));
}

export const loadButton = (page: Page) => page.getByRole('button', { name: /^(Load|Reload)$/ });

/** The totals above the list, which count up as pages arrive */
export const totals = (page: Page) => page.getByText(/^[\d,]+ (activit(y|ies)|routes?)$/).first();

/** Open the consent form from a login prompt, the sidebar's unless given, leaving it to the caller */
export async function openConsent(
  page: Page,
  {
    keepSignedIn = true,
    prompt = loginPrompt(page),
  }: { keepSignedIn?: boolean; prompt?: Locator } = {},
) {
  await expect(prompt).toBeVisible();
  if (!keepSignedIn) await page.getByLabel(/Keep me signed in/).uncheck();
  const popup = page.waitForEvent('popup');
  await prompt.click();
  const consent = await popup;
  await expect(consent.getByRole('button', { name: 'Authorize' })).toBeVisible();
  return consent;
}

/** Log in through the popup, as most people do, leaving out any scopes in `untick` */
export async function logIn(
  page: Page,
  { untick = [], ...options }: { keepSignedIn?: boolean; prompt?: Locator; untick?: string[] } = {},
) {
  const consent = await openConsent(page, options);
  for (const scope of untick) {
    await consent.locator(`input[type=checkbox][value="${scope}"]`).uncheck();
  }
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

/**
 * The mock's activities as the page has them. A new one appears every day at 07:00 UTC, so a fetch
 * made after the page loaded may have one more, newest first, which is left out.
 */
export async function activitiesAsShown(page: Page) {
  const fetched = await mockActivities();
  const shown = await shownCount(page);
  expect(fetched.length - shown).toBeGreaterThanOrEqual(0);
  expect(fetched.length - shown).toBeLessThanOrEqual(1);
  return fetched.slice(fetched.length - shown);
}
