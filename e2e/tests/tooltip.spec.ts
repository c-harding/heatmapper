import { expectAllActivities, loadButton, logIn } from './helpers';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
});

test('escape dismisses an error tooltip', async ({ page }) => {
  await page.route('/api/user', (route) => route.abort());
  await page.getByRole('button', { name: 'User' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toBeHidden();
});

test('escape dismisses a tooltip in a dialog before the dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'User' }).click();
  const dialog = page.getByRole('dialog');
  await page.route('/api/user', (route) =>
    route.request().method() === 'DELETE' ? route.abort() : route.fallback(),
  );
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
