import { type Page } from '@playwright/test';

import { CLIENT_URL } from '../env';
import {
  editSession,
  expectAllActivities,
  failMock,
  loadButton,
  logIn,
  loginPrompt,
  readSession,
} from './helpers';
import { expect, test } from './test';

const settingsButton = (page: Page) => page.getByRole('button', { name: 'Settings' });
/** A dialog by its heading, which doesn't name it */
const dialog = (page: Page, heading: string) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
const settings = (page: Page) => dialog(page, 'Settings');
const reconnect = (page: Page) => dialog(page, 'Reconnect to Strava');
const createButton = (page: Page) =>
  settings(page).getByRole('button', { name: 'Create calendar link' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
  // Every test signs in as the mock's one athlete, so a calendar can be left from another
  const deleted = await page.request.delete('/api/calendar', { headers: { origin: CLIENT_URL } });
  expect(deleted.status()).toBe(204);
  await settingsButton(page).click();
});

test('creating the link shows its addresses', async ({ page }) => {
  await createButton(page).click();

  await expect(
    settings(page).getByRole('button', { name: 'Subscribe in a calendar app' }),
  ).toBeVisible();
  await expect(settings(page).getByLabel('Or add it by address:')).toHaveValue(
    /^http:\/\/localhost:\d+\/calendar\/[0-9a-f-]{36}\.ics$/,
  );
  await expect(settings(page)).toContainText('signed in anywhere else');
});

const failures: [string, number | 'drop', string][] = [
  ['busy', 429, 'Strava is busy, please try again in a few minutes'],
  ['failing', 503, 'Cannot reach Strava, please try again later'],
  ['unreachable', 'drop', 'Cannot reach Strava, please try again later'],
];

for (const [name, status, message] of failures) {
  test(`a create with Strava ${name} says so on the button, and can be retried`, async ({
    page,
    context,
  }) => {
    // Creating refreshes the session's tokens first
    const { stravaRefreshToken } = await readSession(context);
    await failMock(stravaRefreshToken!, status);

    await createButton(page).click();
    await expect(page.getByRole('alert')).toMatchAriaSnapshot(`- alert: ${message}`);

    await createButton(page).click();
    await expect(
      settings(page).getByRole('button', { name: 'Subscribe in a calendar app' }),
    ).toBeVisible();
  });
}

test('a session Strava refuses is reconnected, then the link is created', async ({
  page,
  context,
}) => {
  await editSession(context, (session) => {
    session.stravaRefreshToken = 'refused';
  });

  await createButton(page).click();
  await expect(settings(page)).toBeHidden();
  await expect(reconnect(page)).toContainText(
    'Your connection to Strava has expired, please reconnect.',
  );
  // Asked once, by the dialog, not by the sidebar as well
  await expect(loginPrompt(page)).toBeHidden();

  await logIn(page, {
    prompt: reconnect(page).getByRole('button', { name: 'Connect with Strava' }),
  });
  await expect(reconnect(page)).toBeHidden();
  await expect(
    settings(page).getByRole('button', { name: 'Subscribe in a calendar app' }),
  ).toBeVisible();
});

test('dismissing the reconnection gives it up, and creates nothing', async ({ page, context }) => {
  await editSession(context, (session) => {
    session.stravaRefreshToken = 'refused';
  });

  await createButton(page).click();
  await reconnect(page).getByRole('button', { name: 'Close' }).click();
  await expect(reconnect(page)).toBeHidden();
  // Cancelled, so not asked for in the sidebar instead
  await expect(loginPrompt(page)).toBeHidden();

  await settingsButton(page).click();
  await expect(createButton(page)).toBeVisible();
});
