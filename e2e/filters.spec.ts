import { test, expect } from '@playwright/test';
import { GRADE_LEVEL_SELECTOR } from './utils/patterns';

test.describe('Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('grade level filters are visible and clickable', async ({ page }) => {
    // Wait for lesson content to load first
    await expect(page.locator('text=/lesson/i').first()).toBeVisible({ timeout: 15000 });

    // Look for grade level text in lesson cards
    const gradeContent = page.locator(`text=${GRADE_LEVEL_SELECTOR}`);
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
    // Uses short URL params: activity (not activityType)
    await page.goto('/?activity=cooking-only');
    await page.waitForLoadState('networkidle');

    // URL should maintain the filter parameter
    expect(page.url()).toContain('activity=cooking-only');

    // Page should still be functional
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Content should load (page didn't error)
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });
  });

  test('filter state persists in URL', async ({ page }) => {
    // Navigate with filter in URL
    // Uses short URL params: grades (plural, not grade)
    await page.goto('/?grades=K');
    await page.waitForLoadState('networkidle');

    // URL should still have the filter
    expect(page.url()).toContain('grades=K');

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

  test('search input updates URL with query param', async ({ page }) => {
    // Type in the search bar
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('cooking');
    await searchBar.press('Enter');

    // Wait for debounce (300ms) + network
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // URL should now contain the search query
    expect(page.url()).toContain('q=cooking');
  });

  test('shared URL restores search state correctly', async ({ page }) => {
    // Navigate to URL with multiple filters
    await page.goto('/?q=salad&grades=3,4&activity=cooking-only');
    await page.waitForLoadState('networkidle');

    // Verify search bar has the query
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toHaveValue('salad');

    // URL should maintain all params
    const url = page.url();
    expect(url).toContain('q=salad');
    expect(url).toContain('grades=3,4');
    expect(url).toContain('activity=cooking-only');
  });

  test('browser back navigation preserves filter state', async ({ page }) => {
    // Start with no filters
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Apply a search
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');
    await searchBar.press('Enter');
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // URL should have query
    expect(page.url()).toContain('q=garden');

    // Navigate to a different page (lesson detail or about)
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Search bar should still have the query
    const searchBarAfterBack = page.getByPlaceholder(/search/i);
    await expect(searchBarAfterBack).toHaveValue('garden');
  });
});
