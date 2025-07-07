
import { test, expect, Page } from '@playwright/test';

test.describe('SEO', () => {
  const pagesToTest = ['/', '/landing/pricing'];

  test('Titles should be dynamic', async ({ page }) => {
    const titles = new Set<string>();
    for (const path of pagesToTest) {
      await page.goto(path);
      const title = await page.title();
      expect(titles.has(title)).toBe(false);
      titles.add(title);
    }
  });

  test('Meta descriptions should be unique', async ({ page }) => {
    const descriptions = new Set<string>();
    for (const path of pagesToTest) {
      await page.goto(path);
      const description = page.locator('meta[name="description"]');
      const content = await description.getAttribute('content');
      if (content) {
        expect(descriptions.has(content)).toBe(false);
        descriptions.add(content);
      }
    }
  });

  test('Each page should have exactly one h1 tag', async ({ page }) => {
    for (const path of pagesToTest) {
      await page.goto(path);
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    }
  });
});
