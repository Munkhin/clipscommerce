
import { test, expect } from '@playwright/test';

test.describe('User Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page and log in before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    await page.goto('/dashboard/settings');
  });

  test('should display the settings page', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Settings');
  });

  test('should allow users to update their profile information', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User Updated');
    await page.fill('input[name="email"]', 'testuser.updated@example.com');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Profile updated successfully')).toBeVisible();
  });

  test('should allow users to change their password', async ({ page }) => {
    await page.fill('input[name="currentPassword"]', 'password');
    await page.fill('input[name="newPassword"]', 'new-password');
    await page.fill('input[name="confirmPassword"]', 'new-password');
    await page.click('button:has-text("Change Password")');

    await expect(page.locator('text=Password updated successfully')).toBeVisible();
  });
});
