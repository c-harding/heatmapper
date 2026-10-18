import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  test as base,
} from '@playwright/test';

/** Every Mapbox host: the API, styles, tiles, fonts and the count of map loads */
const MAPBOX = /^https:\/\/([\w-]+\.)*mapbox\.com\//;

/** Stop a context reaching Mapbox, so that it creates no map load to be billed for */
export async function blockMapbox(context: BrowserContext) {
  await context.route(MAPBOX, (route) => route.abort());
}

/**
 * A context made by hand, as the shared pages need, which `test` cannot block for them. Mapbox is
 * blocked unless `map` is set.
 */
export async function newContext(
  browser: Browser,
  options?: BrowserContextOptions,
  { map = false } = {},
) {
  const context = await browser.newContext(options);
  if (!map) await blockMapbox(context);
  return context;
}

/** Playwright's test, with Mapbox blocked unless a test asks for the map with test.use({ map: true }) */
export const test = base.extend<{ map: boolean }>({
  map: [false, { option: true }],
  context: async ({ context, map }, use) => {
    if (!map) await blockMapbox(context);
    await use(context);
  },
});

export { expect } from '@playwright/test';
