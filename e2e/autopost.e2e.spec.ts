import { test, expect } from '@playwright/test';

test.describe('Autopost E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate login
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to autopost dashboard', async ({ page }) => {
    await page.goto('/dashboard/autopost');
    await expect(page.getByText(/Autopost Dashboard/i)).toBeVisible();
  });

  test('should create a new autopost', async ({ page }) => {
    await page.goto('/dashboard/autopost');

    // Click the "New Post" button
    await page.click('button:has-text("New Post")');

    // Fill out the form
    await page.fill('input#platform', 'twitter');
    await page.fill('textarea#content', 'This is a test post from Playwright!');
    await page.fill('input#post-time', '2025-12-31T23:59');

    // Click the "Schedule Post" button
    await page.click('button:has-text("Schedule Post")');

    // Verify that the new post appears in the list
    await expect(page.getByText(/This is a test post from Playwright!/i)).toBeVisible();
  });

  test('should display social connection buttons', async ({ page }) => {
    await page.goto('/dashboard/autopost');
    await expect(page.getByText(/Connect TikTok/i)).toBeVisible();
    await expect(page.getByText(/Connect Instagram/i)).toBeVisible();
    await expect(page.getByText(/Connect YouTube/i)).toBeVisible();
  });
});
