

import { test, expect, Page } from '@playwright/test';

test.describe('Welcome Page', () => {
  test('Should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page).toHaveURL('/sign-in');
  });

  test.describe('Authenticated user', () => {
    test.beforeEach(async ({ page }) => {
      // You'll need to mock the authentication state for this test.
      // This is a placeholder for the actual implementation.
      await page.goto('/'); // Go to a page to set the cookie
      await page.context().addCookies([{
        name: 'session',
        value: 'your-session-token',
        domain: 'localhost',
        path: '/',
      }]);
      await page.goto('/welcome');
    });

    test('Should display the user\'s email', async ({ page }) => {
      const userEmail = page.locator('.user-email');
      await expect(userEmail).toHaveText('test@example.com'); // This should be the email from the session
    });

    test('Go to Dashboard button should lead to the dashboard', async ({ page }) => {
      const dashboardButton = page.locator('a:has-text("Go to Dashboard")');
      await dashboardButton.click();
      await expect(page).toHaveURL('/dashboard');
    });
  });
});

