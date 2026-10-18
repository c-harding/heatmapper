import { expectAllActivities, loadButton, logIn, loginPrompt, openConsent } from './helpers';
import { expect, newContext, test } from './test';

test('logging in through the popup loads every activity', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page);

  await expectAllActivities(page);
  await expect(loginPrompt(page)).toBeHidden();
});

test('cancelling on the consent form leaves the prompt', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  const consent = await openConsent(page);
  await consent.getByRole('button', { name: 'Cancel' }).click();

  await expect(consent).toHaveURL(/error=access_denied/);
  await expect(loginPrompt(page)).toBeVisible();
});

test('a login in another browser clears the prompt and finishes the load', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await loadButton(page).click();
  // Clicking the prompt sets the cookie; the login itself happens elsewhere
  const consent = await openConsent(page);
  const url = consent.url();
  await consent.close();

  const elsewhere = await newContext(browser);
  const other = await elsewhere.newPage();
  await other.goto(url);
  await other.getByRole('button', { name: 'Authorize' }).click();
  await expect(other.getByText(/successful/)).toBeVisible();
  await elsewhere.close();

  await expect(loginPrompt(page)).toBeHidden();
  await expectAllActivities(page);
});

test('pressing User during a load shares its login', async ({ page }) => {
  await page.goto('/');
  await loadButton(page).click();
  const consent = await openConsent(page);
  await page.getByRole('button', { name: 'User' }).click();
  await consent.getByRole('button', { name: 'Authorize' }).click();

  await expect(page.getByRole('link', { name: 'Mock Athlete' })).toBeVisible();
  await expectAllActivities(page);
  await expect(loginPrompt(page)).toBeHidden();
});

test('unticking "Keep me signed in" keeps the login until the browser closes', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await loadButton(page).click();
  await logIn(page, { keepSignedIn: false });
  await expectAllActivities(page);

  const [cookie] = (await context.cookies()).filter(({ name }) => name === 'token');
  expect(cookie.expires).toBe(-1);

  // The same browser session stays signed in, for the User button as for loads
  await page.getByRole('button', { name: 'User' }).click();
  await expect(page.getByRole('link', { name: 'Mock Athlete' })).toBeVisible();
  await expect(loginPrompt(page)).toBeHidden();
});
