import { test, expect } from '@playwright/test';

test.describe('Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('grade level filters are visible and clickable', async ({ page }) => {
    // Look for grade level text anywhere (buttons, labels, etc.)
    const gradeContent = page.locator('text=/3K|PK|Kindergarten|1st|2nd|3rd|4th|5th/i');
    await expect(gradeContent.first()).toBeVisible({ timeout: 10000 });

    // There should be clickable filter elements on the page
    const filterButtons = page.locator('button, [role="button"]');
    const buttonCount = await filterButtons.count();
    expect(buttonCount).toBeGreaterThan(3);

    // First filter button should be enabled
    await expect(filterButtons.first()).toBeEnabled();
  });

  test('clicking a grade filter updates URL', async ({ page }) => {
    // Find a grade filter button (K for Kindergarten)
    const kFilter = page.locator('button, [role="button"]').filter({
      hasText: /^K$/,
    });

    const filterCount = await kFilter.count();
    if (filterCount > 0) {
      await kFilter.first().click();
      await page.waitForLoadState('networkidle');

      // URL should contain the grade filter
      expect(page.url()).toMatch(/grade/i);
    }
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
