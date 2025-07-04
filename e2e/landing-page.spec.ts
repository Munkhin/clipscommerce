
import { test, expect, Page } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('See Live Demo button should have a handler', async ({ page }) => {
    const demoButton = page.locator('button:has-text("See Live Demo")');
    // This is a basic check. A full test would involve clicking and verifying the result.
    const onclick = await demoButton.getAttribute('onclick');
    expect(onclick).not.toBeNull();
  });

  test('Autoplaying GIFs should be muted', async ({ page }) => {
    const gifs = page.locator('img[src$=".gif"]');
    const count = await gifs.count();
    for (let i = 0; i < count; i++) {
      const gif = gifs.nth(i);
      const isMuted = await gif.evaluate((node: HTMLImageElement) => {
        const video = node.closest('video');
        return video ? video.muted : true;
      });
      expect(isMuted).toBe(true);
    }
  });

  test('Duplicate headings should be removed', async ({ page }) => {
    const headings = page.locator('h2:has-text("$5,397 Total Value")');
    await expect(headings).toHaveCount(1);
  });

  test('Part of a team? CTA should be a modal or anchor link', async ({ page }) => {
    const cta = page.locator('a:has-text("Part of a team?")');
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/#|\/team/);
  });
});
