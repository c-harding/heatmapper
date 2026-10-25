import { type Page } from '@playwright/test';

import { CLIENT_URL, SERVER_URL } from '../env';
import { expectAllActivities, loadButton, logIn } from './helpers';
import { expect, test } from './test';

/** Opens the app's socket from whatever page is shown, and asks it who is signed in */
function handshake(page: Page) {
  return page.evaluate(
    (url) =>
      new Promise<string>((resolve) => {
        const socket = new WebSocket(url);
        socket.onopen = () => socket.send(JSON.stringify({ handshake: true }));
        socket.onmessage = ({ data }) => {
          resolve(JSON.parse(String(data)).type);
          socket.close();
        };
        socket.onerror = () => resolve('refused');
        socket.onclose = () => resolve('closed');
      }),
    `${CLIENT_URL.replace(/^http/, 'ws')}/api/activities`,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
});

test('the app opens its socket', async ({ page }) => {
  expect(await handshake(page)).toBe('handshake');
});

test("a page from another origin cannot open the socket with the user's cookie", async ({
  page,
}) => {
  // The same site, as another deployment on a sibling subdomain would be, so the cookie goes too
  await page.goto(`${SERVER_URL}/mock-strava/avatar.svg`);
  expect(await handshake(page)).toBe('refused');
});
