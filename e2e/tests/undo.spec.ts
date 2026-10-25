import { type Locator, type Page } from '@playwright/test';

import { contextWithAllFilters } from './data';
import { expect, test } from './test';

/** A tab of the sidebar, opened if it is closed */
async function openTab(page: Page, name: string) {
  const tab = page.locator(`section[aria-label="${name}"]`);
  const header = tab.locator('button[aria-expanded]');
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  return tab;
}

const button = (tab: Locator, label: string) =>
  tab.getByRole('button', { name: label, exact: true });

test('dates: a clear can be undone, until a date is chosen', async ({ page }) => {
  await page.goto('/');
  const dates = await openTab(page, 'Dates');
  const start = dates.locator('input[type=date]').first();

  await start.fill('2024-03-01');
  await button(dates, 'Clear').click();
  await expect(start).toHaveValue('');
  await button(dates, 'Undo').click();
  await expect(start).toHaveValue('2024-03-01');

  await button(dates, 'Clear').click();
  await start.fill('2024-04-01');
  await start.fill('');
  await expect(button(dates, 'Clear')).toBeDisabled();
});

test('filter: a clear can be undone, until a filter is set', async ({ browser }) => {
  const context = await contextWithAllFilters(browser);
  const page = await context.newPage();
  await page.goto('/');
  const filter = await openTab(page, 'Filter');
  const sportType = filter.locator('select').first();
  const minDistance = filter.locator('input[type=number]').first();

  await sportType.selectOption({ label: 'Biking' });
  await button(filter, 'Clear').click();
  await expect(sportType.locator('option:checked')).toHaveText('All sports');
  await button(filter, 'Undo').click();
  await expect(sportType.locator('option:checked')).toHaveText('Biking');

  // A minimum of 0 filters nothing, so the filters are still clear
  await button(filter, 'Clear').click();
  await minDistance.fill('0');
  await expect(button(filter, 'Undo')).toBeEnabled();

  await sportType.selectOption({ label: 'Running' });
  await sportType.selectOption({ label: 'All sports' });
  await minDistance.fill('');
  await expect(button(filter, 'Clear')).toBeDisabled();
  await context.close();
});

test('selection: a reset can be undone across a switch of item type, until the mode changes', async ({
  page,
}) => {
  await page.goto('/');
  let selection = await openTab(page, 'Selection');
  const mode = () => selection.getByRole('checkbox', { name: 'Multiple selection mode' });

  await mode().check();
  await button(selection, 'Reset').click();
  await expect(mode()).not.toBeChecked();

  await page.getByRole('button', { name: 'Routes' }).click();
  await page.getByRole('button', { name: 'Activities' }).click();
  selection = await openTab(page, 'Selection');
  await button(selection, 'Undo').click();
  await expect(mode()).toBeChecked();

  await button(selection, 'Reset').click();
  await mode().check();
  await mode().uncheck();
  await expect(button(selection, 'Reset')).toBeDisabled();
});

test('filter: restoring the default can be undone, and does not mix with a clear', async ({
  page,
}) => {
  await page.goto('/');
  const filter = await openTab(page, 'Filter');
  const sportType = filter.locator('select').first();
  const chosen = sportType.locator('option:checked');

  await sportType.selectOption({ label: 'Biking' });
  await button(filter, 'Save').click();
  await sportType.selectOption({ label: 'Running' });

  await button(filter, 'Restore').click();
  await expect(chosen).toHaveText('Biking');
  await button(filter, 'Undo').click();
  await expect(chosen).toHaveText('Running');

  // A change after restoring drops its undo, so going back to the default by hand offers none
  await button(filter, 'Restore').click();
  await sportType.selectOption({ label: 'Walking' });
  await sportType.selectOption({ label: 'Biking' });
  await expect(button(filter, 'Restore')).toBeDisabled();

  // Restoring drops the clear's undo
  await button(filter, 'Clear').click();
  await button(filter, 'Restore').click();
  await sportType.selectOption({ label: 'All sports' });
  await expect(button(filter, 'Clear')).toBeDisabled();

  // And clearing drops the restore's
  await button(filter, 'Restore').click();
  await button(filter, 'Clear').click();
  await sportType.selectOption({ label: 'Biking' });
  await expect(button(filter, 'Restore')).toBeDisabled();
});
