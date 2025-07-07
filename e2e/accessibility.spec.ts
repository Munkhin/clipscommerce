
import { test, expect, Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility', () => {
  const pagesToTest = ['/', '/landing/pricing', '/landing/team', '/sign-in', '/sign-up'];

  async function checkAccessibility(page: Page) {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  }

  for (const path of pagesToTest) {
    test(`Page ${path} should be accessible`, async ({ page }) => {
      await page.goto(path);
      await checkAccessibility(page);
    });
  }

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img:not([alt])');
    await expect(images).toHaveCount(0);
  });

  test('Buttons with images should have aria-label', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button:has(img):not([aria-label])');
    await expect(buttons).toHaveCount(0);
  });

  test('Heading hierarchy should be valid', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    const h2 = page.locator('h2');
    await expect(h2.first()).toBeVisible();
    const h3 = page.locator('h3');
    await expect(h3.first()).toBeVisible();
  });

  test('Color contrast should meet AA standard', async ({ page }) => {
    // This test is a placeholder and would need a more sophisticated tool to check color contrast effectively.
    // For now, it serves as a reminder to manually check the color contrast.
    test.fixme();
  });
});
