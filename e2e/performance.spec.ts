
import { test, expect, Page } from '@playwright/test';

test.describe('Performance / Core Web Vitals', () => {
  test('Hero images should use Next.js Image component', async ({ page }) => {
    await page.goto('/');
    const heroImage = page.locator('.hero-image img');
    await expect(heroImage).toHaveAttribute('srcset');
    const src = await heroImage.getAttribute('src');
    expect(src).toContain('_next/image');
  });

  test('Unused CSS should not be loaded', async ({ page }) => {
    await page.goto('/terms');
    const roiCalculatorCss = page.locator('link[href*="roi-calculator"]');
    await expect(roiCalculatorCss).toHaveCount(0);
  });

  test('Third-party fonts should be preloaded', async ({ page }) => {
    await page.goto('/');
    const preconnectLink = page.locator('link[rel="preconnect"][href*="font"]');
    await expect(preconnectLink).toBeVisible();
  });
});
