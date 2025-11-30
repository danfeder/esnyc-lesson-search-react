import { test, expect } from '@playwright/test';

/**
 * Local Database Integration Tests
 *
 * Prerequisites:
 * 1. Run `supabase start` for local database
 * 2. Run `npm run import-data` to seed lessons
 * 3. Dev server will be started automatically by webServer config
 */
test.describe('Local Database Integration', () => {
  test('homepage loads and displays lessons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(page).toHaveTitle(/ESYNYC/i);

    // Check that the search bar is visible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Wait for lesson content to appear
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and use the search bar
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Search for "garden"
    await searchBar.fill('garden');
    await searchBar.press('Enter');

    // Wait for results containing "garden"
    await expect(page.locator('text=/garden/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('filters are visible and interactive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for filter-related elements (buttons, dropdowns, etc.)
    const filterButtons = page.locator('button, [role="button"]');
    await expect(filterButtons.first()).toBeVisible();

    const buttonCount = await filterButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('lesson cards display correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for lesson content to load
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Check for grade level references (common in lesson data)
    const gradePattern = /Grade|K|PK|3K|\d(st|nd|rd|th)/i;
    await expect(page.locator('body')).toContainText(gradePattern);
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like favicon, etc.)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
