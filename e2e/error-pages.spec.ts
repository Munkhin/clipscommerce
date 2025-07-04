
import { test, expect, Page } from '@playwright/test';

test.describe('Error Pages', () => {
  test('Coming-Soon page should have a link to home', async ({ page }) => {
    await page.goto('/coming-soon');
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('404 page should have a link to home', async ({ page }) => {
    await page.goto('/non-existent-page');
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('Error page should have a link to home and an errorId', async ({ page }) => {
    // You'll need to trigger an error to test this page.
    // This is a placeholder for the actual implementation.
    await page.goto('/?error=true'); // Assuming a query param can trigger an error
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
    const errorId = page.locator('.error-id');
    await expect(errorId).toBeVisible();
  });
});
