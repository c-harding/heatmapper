import { expect, test } from './test';

test("a tab's toggle is named by its heading alone", async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Filter').click();
  const toggle = page.locator('section[aria-label="Filter"] button[aria-expanded]');
  // Its buttons sit beside it, as inside it a screen reader would read them into its name
  await expect(toggle).toHaveAccessibleName('Filter');
});
