
import { test, expect, Page } from '@playwright/test';

test.describe('Team Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing/team');
  });

  test('Metrics should be displayed in a grid', async ({ page }) => {
    const metricsGrid = page.locator('.metrics-grid');
    await expect(metricsGrid).toBeVisible();
    const statCards = metricsGrid.locator('.stat-card');
    await expect(statCards).toHaveCount(2);
  });

  test('Watch Demo link should be valid', async ({ page }) => {
    const watchDemoLink = page.locator('a:has-text("Watch Demo")');
    const response = await page.request.head(await watchDemoLink.getAttribute('href') || '');
    expect(response.status()).toBe(200);
  });

  test('Buttons should use color tokens', async ({ page }) => {
    const button = page.locator('button.primary');
    await expect(button.first()).toHaveCSS('background-color', 'rgb(59, 130, 246)'); // This should be the correct primary color from your design system
  });

  test('Client logos should be present', async ({ page }) => {
    const clientLogos = page.locator('.client-logos img');
    await expect(clientLogos.first()).toBeVisible();
  });
});
