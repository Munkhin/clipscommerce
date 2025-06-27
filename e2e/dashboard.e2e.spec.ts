import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test('should login and access dashboard', async ({ page }) => {
    // Simulate login (update selectors as needed for your login form)
    await page.goto('/auth/sign-in');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Choose your workflow/i)).toBeVisible();
  });

  test('should navigate to Scan and perform scan', async ({ page }) => {
    // Assume already logged in from previous test or use a beforeEach
    await page.goto('/dashboard/scan');
    await page.fill('input#niche', 'fitness');
    await page.click('button:has-text("Start Scan")');
    await expect(page.getByText(/Scan Completed/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/High-Performing Hooks/i)).toBeVisible();
  });

  test('should navigate to Accelerate and see video columns', async ({ page }) => {
    await page.goto('/dashboard/accelerate');
    await expect(page.getByText(/To Do \/ Uploaded/i)).toBeVisible();
    await expect(page.getByText(/Processing/i)).toBeVisible();
    await expect(page.getByText(/Review & Edit/i)).toBeVisible();
    await expect(page.getByText(/Ready to Post/i)).toBeVisible();
  });

  test('should navigate to Blitz, Cycle, Profile, Settings, Subscription', async ({ page }) => {
    const routes = [
      '/dashboard/blitz',
      '/dashboard/cycle',
      '/dashboard/profile',
      '/dashboard/settings',
      '/dashboard/subscription',
    ];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });

  test('should handle scan error for missing input', async ({ page }) => {
    await page.goto('/dashboard/scan');
    await page.fill('input#niche', '');
    await page.click('button:has-text("Start Scan")');
    await expect(page.getByText(/Please enter a niche to scan/i)).toBeVisible();
  });

  // Add more tests for connect/disconnect, onboarding, etc. as needed
}); 