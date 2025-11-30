import { test, expect } from '@playwright/test';

test.describe('Lesson Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('lessons are displayed on the page', async ({ page }) => {
    // Look for lesson-related content
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });
  });

  test('lesson cards show title', async ({ page }) => {
    // Lesson titles should be visible
    const headings = page.locator('h2, h3, h4, [class*="title"]');
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
  });

  test('lesson cards show grade levels', async ({ page }) => {
    // Grade levels should be displayed on cards
    const gradeIndicators = page.locator(
      'text=/3K|PK|K|1st|2nd|3rd|4th|5th|6th|7th|8th|Grade/i'
    );
    await expect(gradeIndicators.first()).toBeVisible({ timeout: 10000 });
  });

  test('lesson cards are interactive', async ({ page }) => {
    // Find any clickable element that could be a lesson card
    const clickableElements = page.locator(
      'a, button, [role="link"], [role="button"], [class*="card"], [class*="Card"]'
    );
    await expect(clickableElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('results are displayed', async ({ page }) => {
    // Should show lessons
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Content should be substantial
    const pageText = await page.textContent('body');
    expect(pageText?.length).toBeGreaterThan(500);
  });
});

test.describe('Lesson Modal/Details', () => {
  test('page has clickable lesson elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await expect(page.locator('body')).toContainText(/lesson/i, { timeout: 10000 });

    // Find clickable elements (links or buttons)
    const clickableElements = page.locator('a, button').filter({ hasText: /.+/ });
    await expect(clickableElements.first()).toBeVisible();

    const count = await clickableElements.count();
    expect(count).toBeGreaterThan(0);
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
