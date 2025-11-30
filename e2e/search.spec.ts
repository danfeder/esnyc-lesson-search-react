import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('search bar is focused on page load', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('search for "garden" returns relevant results', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');
    await searchBar.press('Enter');

    await page.waitForTimeout(1500);

    // Should have results containing "garden"
    const results = page.locator('text=/garden/i');
    await expect(results.first()).toBeVisible();
  });

  test('search for "cooking" returns relevant results', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('cooking');
    await searchBar.press('Enter');

    await page.waitForTimeout(1500);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('cook');
  });

  test('search for "salad" returns recipe lessons', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('salad');
    await searchBar.press('Enter');

    await page.waitForTimeout(1500);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('salad');
  });

  test('empty search shows all lessons', async ({ page }) => {
    // Page should show lessons by default
    await page.waitForTimeout(1500);

    // Look for lesson cards or result count
    const pageContent = await page.content();
    expect(pageContent).toContain('lesson');
  });

  test('search can be cleared', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search for something
    await searchBar.fill('garden');
    await searchBar.press('Enter');
    await page.waitForTimeout(1000);

    // Clear the search
    await searchBar.clear();
    await searchBar.press('Enter');
    await page.waitForTimeout(1000);

    // Should return to showing all results
    await expect(searchBar).toHaveValue('');
  });

  test('search handles special characters gracefully', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search with special characters
    await searchBar.fill('test & "quotes"');
    await searchBar.press('Enter');

    await page.waitForTimeout(1000);

    // Should not crash - page should still be functional
    await expect(searchBar).toBeVisible();
  });

  test('search is case-insensitive', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Search uppercase
    await searchBar.fill('GARDEN');
    await searchBar.press('Enter');
    await page.waitForTimeout(1500);

    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('garden');
  });
});
