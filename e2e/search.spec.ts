import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('search bar is visible on page load', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('search for "garden" returns relevant results', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');
    await searchBar.press('Enter');

    // Wait for results containing "garden"
    await expect(page.locator('text=/garden/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('search for "cooking" returns relevant results', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('cooking');
    await searchBar.press('Enter');

    // Wait for results containing "cook"
    await expect(page.locator('text=/cook/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('search for "salad" returns recipe lessons', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('salad');
    await searchBar.press('Enter');

    // Wait for results containing "salad"
    await expect(page.locator('text=/salad/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('empty search shows lessons', async ({ page }) => {
    // Page should show lessons by default
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });
  });

  test('search can be cleared', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search for something
    await searchBar.fill('garden');
    await searchBar.press('Enter');
    await expect(page.locator('text=/garden/i').first()).toBeVisible({ timeout: 10000 });

    // Clear the search
    await searchBar.clear();
    await searchBar.press('Enter');

    // Should return to showing all results
    await expect(searchBar).toHaveValue('');
  });

  test('search handles special characters gracefully', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search with special characters
    await searchBar.fill('test & "quotes"');
    await searchBar.press('Enter');

    // Should not crash - page should still be functional
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toBeEnabled();
  });

  test('search is case-insensitive', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search uppercase
    await searchBar.fill('GARDEN');
    await searchBar.press('Enter');

    // Should find garden results regardless of case
    await expect(page.locator('text=/garden/i').first()).toBeVisible({ timeout: 10000 });
  });
});
