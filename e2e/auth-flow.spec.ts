
import { test, expect, Page } from '@playwright/test';

test.describe('Sign-In / Sign-Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
  });

  test('Input fields should have labels', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label[for="' + await emailInput.getAttribute('id') + '"]');
    await expect(emailLabel).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    const passwordLabel = page.locator('label[for="' + await passwordInput.getAttribute('id') + '"]');
    await expect(passwordLabel).toBeVisible();
  });

  test('Password visibility toggle should work', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button.password-toggle');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('Should display inline error on failed login', async ({ page }) => {
    await page.locator('input[type="email"]').fill('wrong@email.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Invalid credentials');
  });

  test('Social auth providers should be hidden if not configured', async ({ page }) => {
    const socialAuthProviders = page.locator('.social-auth-providers');
    // This assumes that the providers are hidden by default and only shown when configured.
    // The test will need to be updated based on the actual implementation.
    await expect(socialAuthProviders).not.toBeVisible();
  });

  test('Should be rate-limited', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto('/sign-in');
    }
    await expect(page.locator('body')).toHaveText(/Too many requests/);
  });
});
