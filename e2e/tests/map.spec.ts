import { type BrowserContext, type Page } from '@playwright/test';

import { CONTEXT_OPTIONS } from './data';
import { expect, newContext, test } from './test';

/** The corner holding the map's own controls, at the end of a left-to-right page */
const controls = (page: Page) => page.locator('.mapboxgl-ctrl-top-right');

// One page, so that every test here shares a single load of the map
test.describe('map', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await newContext(browser, CONTEXT_OPTIONS, { map: true });
    page = await context.newPage();
    await page.goto('/');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('the top-right controls are the expected ones', async () => {
    await page.setViewportSize({ width: 1280, height: 720 });
    // Exactly these, in this order: by default a snapshot would also allow others
    await expect(controls(page)).toMatchAriaSnapshot(`
      - /children: equal
      - button "Enter fullscreen"
      - button "Reset bearing to north"
      - button "Find my location"
      - button "3D"
      - button "Map style"
    `);
    // Beside the sidebar on a wide screen, so shown with it open
    await expect(controls(page)).toHaveCSS('opacity', '1');
  });

  test('on a narrow screen the open sidebar hides the controls', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The sidebar starts open, over the map, so the controls fade out rather than leave the page
    await expect(controls(page)).toHaveCSS('opacity', '0');

    // The sidebar's overlay lies over its tab, so a tap there lands on the overlay, which toggles
    // the sidebar just the same. Forced, to tap where the tab is rather than wait for it to be clear.
    await page.getByRole('button', { name: 'Map', exact: true }).click({ force: true });
    await expect(controls(page)).toHaveCSS('opacity', '1');

    await page.getByRole('button', { name: 'Menu', exact: true }).click({ force: true });
    await expect(controls(page)).toHaveCSS('opacity', '0');
  });
});
