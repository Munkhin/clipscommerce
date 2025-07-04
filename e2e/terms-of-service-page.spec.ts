
import { test, expect, Page } from '@playwright/test';

test.describe('Terms of Service Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/terms');
  });

  test('Should have a table of contents', async ({ page }) => {
    const toc = page.locator('.toc');
    await expect(toc).toBeVisible();
    const tocLinks = toc.locator('a');
    await expect(tocLinks).toHaveCount(14);
  });

  test('Contact email should be standardized', async ({ page }) => {
    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toHaveAttribute('href', 'mailto:support@clipscommerce.com');
  });
});
