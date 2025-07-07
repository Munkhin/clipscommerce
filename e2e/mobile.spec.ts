
import { test, expect, Page, devices } from '@playwright/test';

// Use devices configuration at the top level
test.use({ ...devices['iPhone 13'] });

test.describe('PWA / Mobile', () => {

  test('Off-canvas nav should have safe-area-inset', async ({ page }) => {
    await page.goto('/');
    const offCanvasNav = page.locator('.off-canvas-nav');
    await expect(offCanvasNav).toHaveCSS('padding-top', 'env(safe-area-inset-top)');
  });

  test('ROI calculator should use numeric stepper on mobile', async ({ page }) => {
    await page.goto('/landing/pricing');
    const roiSlider = page.locator('.roi-slider');
    await expect(roiSlider).not.toBeVisible();
    const numericStepper = page.locator('.numeric-stepper');
    await expect(numericStepper).toBeVisible();
  });
});
