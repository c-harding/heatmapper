import { expectAllActivities, loadButton, logIn } from './helpers';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);
  await expectAllActivities(page);
});

test('a failed action is announced as an alert', async ({ page }) => {
  // Opening the settings fetches the user, which then fails
  await page.route('/api/user', (route) => route.abort());
  await page.getByRole('button', { name: 'Settings' }).click();

  // As a screen reader hears it, without the icon's name
  await expect(page.getByRole('alert')).toMatchAriaSnapshot('- alert: Cannot load user options');
});

test('escape dismisses an error tooltip', async ({ page }) => {
  await page.route('/api/user', (route) => route.abort());
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('alert')).toBeHidden();
});

test('escape dismisses a tooltip in a dialog before the dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
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
