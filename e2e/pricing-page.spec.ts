
import { test, expect, Page } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing/pricing');
  });

  test('Monthly/Yearly toggle should update prices', async ({ page }) => {
    const monthlyButton = page.locator('button:has-text("Monthly")');
    const yearlyButton = page.locator('button:has-text("Yearly")');
    const price = page.locator('.price');
    const initialPrice = await price.first().innerText();

    await yearlyButton.click();
    const yearlyPrice = await price.first().innerText();
    expect(yearlyPrice).not.toBe(initialPrice);

    await monthlyButton.click();
    const monthlyPrice = await price.first().innerText();
    expect(monthlyPrice).toBe(initialPrice);
  });

  test('ROI calculator should validate input and handle duplicates', async ({ page }) => {
    const spinnerInput = page.locator('input[type="number"]');
    await spinnerInput.fill('-1');
    await expect(spinnerInput).toHaveValue('0');

    const platformButton = page.locator('button:has-text("Add Platform")');
    await platformButton.click();
    await platformButton.click();
    const selectedPlatforms = page.locator('.selected-platforms li');
    await expect(selectedPlatforms).toHaveCount(1);
  });

  test('FAQ accordions should have aria-expanded attribute', async ({ page }) => {
    const accordionButton = page.locator('.faq-accordion-button');
    await accordionButton.first().click();
    await expect(accordionButton.first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Select Plan button should lead to checkout', async ({ page }) => {
    const selectPlanButton = page.locator('button:has-text("Select Plan")').first();
    await selectPlanButton.click();
    await expect(page).toHaveURL(/\/payment-success/);
  });
});
