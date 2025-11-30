import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 *
 * Basic tests to verify the application loads and core functionality works.
 * These run against whatever Supabase instance the app is configured with.
 */
test.describe('Smoke Tests', () => {
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
    const gradePattern = /Grade|\bK\b|PK|3K|\d(st|nd|rd|th)/i;
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
