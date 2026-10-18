import { CLIENT_URL, SERVER_URL } from '../env';
import { expect, test } from './test';

test('other tests reach nothing beyond the app itself', async ({ page }) => {
  // Any other host is worth knowing about, including a Mapbox one the block does not name
  const own = [new URL(CLIENT_URL).origin, new URL(SERVER_URL).origin];
  const answered: string[] = [];
  const stopped: string[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.protocol.startsWith('http') && !own.includes(url.origin)) answered.push(url.href);
  });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).hostname.endsWith('mapbox.com')) stopped.push(request.url());
  });

  await page.goto('/');
  // The map asks Mapbox for its style as it starts, so the block has been put to use
  await expect.poll(() => stopped.length).toBeGreaterThan(0);
  // Then everything else the start-up asks for, so that a later answer is not missed
  await page.waitForLoadState('networkidle');
  expect(answered).toEqual([]);
});
