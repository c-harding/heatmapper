import { type BrowserContext } from '@playwright/test';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { SESSIONS_DIR } from '../env';
import { expectAllActivities, loadButton, logIn, loginPrompt, mockRequests } from './helpers';
import { expect, test } from './test';

interface Session {
  stravaAccessToken?: string;
  stravaExpiry?: number;
  stravaScope?: string[];
}

/** The server's saved session for this browser, found by its login cookie */
async function sessionFile(context: BrowserContext) {
  const token = (await context.cookies()).find(({ name }) => name === 'token')?.value;
  expect(token).toBeTruthy();
  return join(SESSIONS_DIR, `${token}.json`);
}

async function editSession(context: BrowserContext, edit: (session: Session) => void) {
  const file = await sessionFile(context);
  const session = JSON.parse(await readFile(file, 'utf-8')) as Session;
  edit(session);
  await writeFile(file, JSON.stringify(session));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
});

test('an access token past its expiry is refreshed without logging in again', async ({
  page,
  context,
}) => {
  let expired: string | undefined;
  // As if its six hours had passed
  await editSession(context, (session) => {
    expired = session.stravaAccessToken;
    session.stravaExpiry = 1;
  });

  await page.reload();
  const since = new Date();
  await loadButton(page).click();
  await expect(loadButton(page)).toHaveAccessibleName('Reload');
  await expect(loginPrompt(page)).toBeHidden();

  expect(await mockRequests(since, '/oauth/token')).toHaveLength(1);
  const session = JSON.parse(await readFile(await sessionFile(context), 'utf-8')) as Session;
  expect(session.stravaAccessToken).not.toBe(expired);
  expect(session.stravaExpiry).toBeGreaterThan(Date.now() / 1000);
});

test('loads that find the access token expired together refresh it once', async ({
  page,
  context,
}) => {
  await editSession(context, (session) => {
    session.stravaExpiry = 1;
  });

  const other = await context.newPage();
  await Promise.all([page.reload(), other.goto('/')]);
  const since = new Date();
  await Promise.all([loadButton(page).click(), loadButton(other).click()]);
  await expectAllActivities(page);
  await expectAllActivities(other);

  expect(await mockRequests(since, '/oauth/token')).toHaveLength(1);
});

test('an access token Strava has expired means logging in again', async ({ page, context }) => {
  // Expired as far as Strava knows, though the session still expects it to last
  await editSession(context, (session) => {
    const token = session.stravaAccessToken ?? '';
    // The real token with only its expiry moved back, so that the mock still recognises it
    session.stravaAccessToken = token.replace(/-\d+-([0-9a-f]+)$/, '-1-$1');
    expect(session.stravaAccessToken).not.toBe(token);
    session.stravaExpiry = Math.floor(Date.now() / 1000) + 60 * 60;
  });

  await page.reload();
  await loadButton(page).click();
  await expect(loginPrompt(page)).toBeVisible();
});
