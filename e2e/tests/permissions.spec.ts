import { activitiesText, mockActivities, mockRoutes } from './data';
import { loadButton, logIn, totals } from './helpers';
import { expect, test } from './test';

test('without activity:read_all, private activities are left out', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page, { untick: ['activity:read_all'] });

  const all = await mockActivities();
  const shown = all.filter((activity) => !activity.private);
  expect(shown.length).toBeLessThan(all.length);
  await expect(totals(page)).toHaveText(activitiesText(shown.length));
  await expect(loadButton(page)).toHaveAccessibleName('Reload');
});

test('without read_all, private routes are left out', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Routes' }).click();
  await loadButton(page).click();
  await logIn(page, { untick: ['read_all'] });

  const all = await mockRoutes();
  const shown = all.filter((route) => !route.private);
  expect(shown.length).toBeLessThan(all.length);
  await expect(totals(page)).toHaveText(`${shown.length} routes`);
});
