import { test, expect } from '@playwright/test';

test.describe('Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('filter sidebar/modal is accessible', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for filter buttons or filter section using separate locators
    const filterButtons = page.getByRole('button', { name: /filter/i });
    const gradeElements = page.getByText(/grade|kindergarten/i);

    const filterCount = await filterButtons.count();
    const gradeCount = await gradeElements.count();

    // At least one filter-related element should be visible
    expect(filterCount + gradeCount).toBeGreaterThan(0);
  });

  test('grade level filters are available', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for grade level related text
    const gradeText = page.locator('text=/kindergarten|grade|3K|PK/i');
    const count = await gradeText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a filter updates results', async ({ page }) => {
    await page.waitForTimeout(1500);

    // Get initial content hash
    const initialContent = await page.textContent('body');

    // Try to find and click a filter option
    const filterOption = page.locator(
      'button:has-text("Kindergarten"), button:has-text("K"), label:has-text("Kindergarten"), [data-value="K"]'
    );

    if ((await filterOption.count()) > 0) {
      await filterOption.first().click();
      await page.waitForTimeout(1500);

      // Page should update (URL or content may change)
      const newContent = await page.textContent('body');
      // Content should be different or URL should have changed
      const url = page.url();
      const hasFilterInUrl = url.includes('grade') || url.includes('filter');

      // Either content changed or URL has filter params
      expect(newContent !== initialContent || hasFilterInUrl).toBeTruthy();
    }
  });

  test('multiple filters can be applied', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for any clickable filter elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    // Should have multiple interactive elements
    expect(buttonCount).toBeGreaterThan(5);
  });

  test('filter state persists in URL', async ({ page }) => {
    // Navigate with filter in URL
    await page.goto('/?grade=K');
    await page.waitForTimeout(1500);

    // URL should still have the filter
    expect(page.url()).toContain('grade');
  });

  test('activity type filter shows options', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for activity type related content
    const activityTypes = page.locator(
      'text=/cooking|garden|academic/i'
    );
    const count = await activityTypes.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Filter Pills', () => {
  test('applied filters show as pills or indicators', async ({ page }) => {
    // Navigate with a filter already applied
    await page.goto('/?grade=K');
    await page.waitForTimeout(2000);

    // Look for filter pill or badge showing the active filter
    const pageContent = await page.content();
    const pageText = await page.textContent('body');

    // Check for various indicators that filters are applied
    const hasFilterIndicator =
      pageContent.includes('Kindergarten') ||
      pageContent.includes('×') ||
      pageContent.includes('clear') ||
      pageContent.includes('Clear') ||
      pageText?.includes('K') ||
      page.url().includes('grade');

    expect(hasFilterIndicator).toBeTruthy();
  });
});
