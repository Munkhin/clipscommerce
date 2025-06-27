import { test, expect } from '@playwright/test';

// Simple smoke test to verify Playwright is working
test('basic navigation test', async ({ page }) => {
  // Navigate to the home page
  await page.goto('http://localhost:3000');
  
  // Check page title
  const title = await page.title();
  console.log('Page title:', title);
  expect(title).toBeTruthy();
  
  // Take a screenshot
  await page.screenshot({ path: 'homepage.png' });
  console.log('Screenshot saved as homepage.png');
});

// Test navigation to sign-in page
test('navigate to sign-in page', async ({ page }) => {
  // Navigate to sign-in page
  await page.goto('http://localhost:3000/sign-in');
  
  // Check if we're on the sign-in page
  await expect(page).toHaveURL(/\/sign-in/);
  
  // Check for sign-in form
  const form = page.locator('form');
  await expect(form).toBeVisible();
  
  // Check for email and password fields
  const emailField = page.locator('input[name="email"]');
  const passwordField = page.locator('input[name="password"]');
  
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  
  console.log('Sign-in page elements verified');
});
