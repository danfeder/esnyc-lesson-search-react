import { test, expect } from '@playwright/test';

test.describe('Lesson Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('lessons are displayed on the page', async ({ page }) => {
    // Look for lesson-related content
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Should have multiple headings (lesson titles)
    const headings = page.locator('h2, h3, h4').filter({ hasText: /.{5,}/ });
    await expect(headings.first()).toBeVisible({ timeout: 10000 });

    // Should have multiple lessons
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(1);
  });

  test('lesson cards show title', async ({ page }) => {
    // Lesson titles should be visible - look for heading elements
    const headings = page.locator('h2, h3, h4').filter({ hasText: /.{5,}/ });
    await expect(headings.first()).toBeVisible({ timeout: 10000 });

    // Title should have meaningful content (not empty)
    const titleText = await headings.first().textContent();
    expect(titleText?.trim().length).toBeGreaterThan(3);
  });

  test('lesson cards show grade levels', async ({ page }) => {
    // Grade levels should be displayed on cards
    // Note: Pattern includes common grade level formats
    // "K" alone could match other words but is needed for Kindergarten display
    const gradeIndicators = page.locator('text=/3K|PK|K|1st|2nd|3rd|4th|5th|6th|7th|8th|Grade/i');
    await expect(gradeIndicators.first()).toBeVisible({ timeout: 10000 });

    // Should have multiple grade indicators across different lessons
    const gradeCount = await gradeIndicators.count();
    expect(gradeCount).toBeGreaterThan(1);
  });

  test('lesson content includes activity types', async ({ page }) => {
    // Look for activity type indicators (cooking, garden, etc.)
    const activityIndicators = page.locator('text=/cooking|garden|nutrition/i');
    await expect(activityIndicators.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Lesson Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('lesson elements are clickable', async ({ page }) => {
    // Wait for lessons to load
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Find clickable elements with lesson-related text
    const clickableElements = page
      .locator('a, button, [role="button"], [role="link"]')
      .filter({ hasText: /.{5,}/ });

    await expect(clickableElements.first()).toBeVisible({ timeout: 10000 });

    const elementCount = await clickableElements.count();
    expect(elementCount).toBeGreaterThan(3);

    // Verify elements are actually clickable (enabled)
    await expect(clickableElements.first()).toBeEnabled();
  });

  test('search results show relevant lessons', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('salad');
    await searchBar.press('Enter');
    await page.waitForLoadState('networkidle');

    // Results should contain the search term
    await expect(page.locator('text=/salad/i').first()).toBeVisible({
      timeout: 10000,
    });

    // Results should be lessons (not just any text)
    const headings = page.locator('h2, h3, h4').filter({ hasText: /.{5,}/ });
    await expect(headings.first()).toBeVisible();
  });
});

test.describe('Pagination/Infinite Scroll', () => {
  test('page loads with content and is scrollable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');

    // Page should still be functional after scroll
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
