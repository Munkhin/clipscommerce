import { test, expect } from '@playwright/test';

test('landing page should not have an embedded scrollbar', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Check the computed style of the body element for overflow properties
  const overflowStyle = await page.evaluate(() => {
    const body = document.querySelector('body');
    if (body) {
      const style = window.getComputedStyle(body);
      return style.overflow;
    }
    return '';
  });

  expect(overflowStyle).toBe('hidden');
}); 