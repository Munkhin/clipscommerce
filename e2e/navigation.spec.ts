
import { test, expect, Page } from '@playwright/test';

test.describe('Navigation & Routing', () => {
  const pagesToTest = ['/', '/landing/pricing', '/sign-in', '/sign-up'];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Top navigation links should be anchor tags with valid routes', async ({ page }) => {
    const navLinks = page.locator('nav >> role=link');
    await expect(navLinks.getByText('Features')).toHaveAttribute('href', '/#features');
    await expect(navLinks.getByText('Solutions')).toHaveAttribute('href', '/solutions');
    await expect(navLinks.getByText('Resources')).toHaveAttribute('href', '/resources');
  });

  test('Anchor links should only exist on the home page', async ({ page }) => {
    for (const path of pagesToTest) {
      await page.goto(path);
      const anchorLinks = page.locator('a[href^="#"]');
      if (path === '/') {
        await expect(anchorLinks.first()).toBeVisible();
      } else {
        await expect(anchorLinks).toHaveCount(0);
      }
    }
  });

  test('Route patterns should be unified', async ({ page }) => {
    // This test will need to be updated with the correct canonical paths
    const signInLink = page.locator('a[href*="sign-in"], a[href*="login"]');
    await expect(signInLink.first()).toHaveAttribute('href', '/sign-in');
  });

  test('Sticky promo banner should be dismissible and stay dismissed', async ({ page }) => {
    const banner = page.locator('.promo-banner');
    if (await banner.isVisible()) {
      await banner.locator('button.dismiss').click();
      await expect(banner).not.toBeVisible();
      const isDismissed = await page.evaluate(() => localStorage.getItem('promoBannerDismissed'));
      expect(isDismissed).toBe('true');
      await page.reload();
      await expect(banner).not.toBeVisible();
    }
  });

  test('Footer should be consistent across pages', async ({ page }) => {
    for (const path of pagesToTest) {
      await page.goto(path);
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer.locator('.copyright')).toHaveText(/© 2025 Clips AI/);
      await expect(footer.locator('.social-links a')).toHaveCount(3);
      await expect(footer.locator('a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:support@clipscommerce.com');
    }
  });
});
