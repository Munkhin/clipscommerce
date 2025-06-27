import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';

test('basic navigation test', async ({ page }) => {
  console.log('Starting basic navigation test...');
  
  // Navigate to the home page
  await page.goto(BASE_URL);
  
  // Check page title
  const title = await page.title();
  console.log('Page title:', title);
  expect(title).toBeTruthy();
  
  // Take a screenshot
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('Screenshot saved as test-screenshot.png');
});
