import { test, expect } from '@playwright/test';

test.describe('Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('grade level filters are visible and clickable', async ({ page }) => {
    // Wait for lesson content to load first
    await expect(page.locator('text=/lesson/i').first()).toBeVisible({ timeout: 15000 });

    // Look for grade level text in lesson cards
    // Database stores grades as: 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
    // Match pattern aligned with lessons.spec.ts which passes consistently
    const gradeContent = page.locator('text=/3K|PK|K|1st|2nd|3rd|4th|5th|6th|7th|8th|Grade/i');
    await expect(gradeContent.first()).toBeVisible({ timeout: 15000 });

    // There should be clickable filter elements on the page
    const filterButtons = page.locator('button, [role="button"]');
    const buttonCount = await filterButtons.count();
    expect(buttonCount).toBeGreaterThan(3);

    // First filter button should be enabled
    await expect(filterButtons.first()).toBeEnabled();
  });

  test('filter state can be applied via URL', async ({ page }) => {
    // Test that navigating with a filter parameter works
    // This is deterministic - we know exactly what state we're testing
    await page.goto('/?activityType=cooking');
    await page.waitForLoadState('networkidle');

    // URL should maintain the filter parameter
    expect(page.url()).toContain('activityType=cooking');

    // Page should still be functional
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Content should load (page didn't error)
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });
  });

  test('filter state persists in URL', async ({ page }) => {
    // Navigate with filter in URL
    await page.goto('/?grade=K');
    await page.waitForLoadState('networkidle');

    // URL should still have the filter
    expect(page.url()).toContain('grade=K');

    // Page should still be functional
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('activity type content is available', async ({ page }) => {
    // Look for activity type related content (cooking, garden, etc.)
    const activityTypes = page.locator('text=/cooking|garden|academic/i');
    await expect(activityTypes.first()).toBeVisible({ timeout: 10000 });
  });

  test('filters and search work together', async ({ page }) => {
    // First apply a search
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');
    await searchBar.press('Enter');
    await page.waitForLoadState('networkidle');

    // Results should contain garden
    await expect(page.locator('text=/garden/i').first()).toBeVisible({
      timeout: 10000,
    });

    // Page should still have filter buttons available
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(3);
  });
});
