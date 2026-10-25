import { type Page } from '@playwright/test';

import { loadButton, logIn, totals } from './helpers';
import { expect, test } from './test';

/** A filter control, found by the name beside it */
const field = (page: Page, name: string) =>
  page
    .locator('label, div')
    .filter({ has: page.locator(`xpath=./span[normalize-space()="${name}"]`) })
    .first();

test('a stored filter keeps the fields that have the right type', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('filterFields', JSON.stringify(['sportType', 'distance', 'isPrivate']));
    localStorage.setItem(
      'filter',
      JSON.stringify({ sportType: 123, distance: { min: 'x' }, isPrivate: true }),
    );
  });
  await page.goto('/');
  const filter = page.locator('section[aria-label="Filter"]');
  await expect(filter).toContainText('only private');
  await expect(filter).not.toContainText('distance');

  // Filtering what loads, which a sport type of the wrong type broke
  await loadButton(page).click();
  await logIn(page);
  await expect(totals(page)).toHaveText(/^[\d,]+ activit(y|ies)$/);
  await page.getByTitle('Filter').click();
  await expect(field(page, 'Sport type').locator('option:checked')).toHaveText('All sports');
});
