import { test, expect } from '@playwright/test';

test.describe('AI Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate login
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to AI dashboard', async ({ page }) => {
    await page.goto('/dashboard/ai');
    await expect(page.getByText(/AI Dashboard/i)).toBeVisible();
  });

  test('should create a new A/B experiment', async ({ page }) => {
    await page.goto('/dashboard/ai');

    // Click the "New Experiment" button
    await page.click('button:has-text("New Experiment")');

    // Fill out the form
    await page.fill('input#name', 'Thumbnail Test');
    await page.fill('textarea#description', 'Testing a new thumbnail design');
    await page.fill('input#platform', 'youtube');

    // Click the "Create Experiment" button
    await page.click('button:has-text("Create Experiment")');

    // Verify that the new experiment appears in the list
    await expect(page.getByText(/Thumbnail Test/i)).toBeVisible();
  });
});
