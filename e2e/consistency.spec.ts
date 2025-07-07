
import { test, expect, Page } from '@playwright/test';

test.describe('Consistency / Design-System', () => {
  const pagesToTest = ['/', '/landing/pricing'];

  test('Primary CTA text should be consistent', async ({ page }) => {
    for (const path of pagesToTest) {
      await page.goto(path);
      const cta = page.locator('.cta-primary');
      await expect(cta.first()).toHaveText('Get Started');
    }
  });

  test('Border-radius should be consistent', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.card');
    await expect(card.first()).toHaveCSS('border-radius', '8px');
    const modal = page.locator('.modal');
    await expect(modal.first()).toHaveCSS('border-radius', '8px');
  });

  test('Button hover color should be consistent', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('button.primary');
    await button.first().hover();
    await expect(button.first()).toHaveCSS('background-color', 'rgb(59, 130, 246)'); // This should be the correct hover color from your design system
  });
});
