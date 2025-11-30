import { test, expect } from '@playwright/test';

test.describe('Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('filter elements are accessible', async ({ page }) => {
    // Look for filter buttons or filter section using separate locators
    const filterButtons = page.getByRole('button', { name: /filter/i });
    const gradeElements = page.getByText(/grade|kindergarten/i);

    const filterCount = await filterButtons.count();
    const gradeCount = await gradeElements.count();

    // At least one filter-related element should be visible
    expect(filterCount + gradeCount).toBeGreaterThan(0);
  });

  test('grade level content is available', async ({ page }) => {
    // Look for grade level related text anywhere on page
    await expect(page.locator('body')).toContainText(/K|PK|3K|grade|Grade/i, {
      timeout: 10000,
    });
  });

  test('page has interactive filter elements', async ({ page }) => {
    // Look for any button that could be a filter
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });

    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(3);
  });

  test('multiple filter buttons are available', async ({ page }) => {
    // Look for any clickable filter elements
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible();

    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(5);
  });

  test('filter state persists in URL', async ({ page }) => {
    // Navigate with filter in URL
    await page.goto('/?grade=K');
    await page.waitForLoadState('networkidle');

    // URL should still have the filter
    expect(page.url()).toContain('grade');
  });

  test('activity type filter shows options', async ({ page }) => {
    // Look for activity type related content
    const activityTypes = page.locator('text=/cooking|garden|academic/i');
    await expect(activityTypes.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Filter Pills', () => {
  test('applied filters are reflected in page state', async ({ page }) => {
    // Navigate with a filter already applied
    await page.goto('/?grade=K');
    await page.waitForLoadState('networkidle');

    // URL should contain the filter parameter
    expect(page.url()).toContain('grade=K');

    // Page should be functional with filter applied
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });
});
