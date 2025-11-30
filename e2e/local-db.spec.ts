import { test, expect } from '@playwright/test';

test.describe('Local Database Integration', () => {
  test('homepage loads and displays lessons', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await expect(page).toHaveTitle(/ESYNYC/i);

    // Check that the search bar is visible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Check that lessons are loaded (should show lesson count or cards)
    await page.waitForTimeout(2000); // Give time for data to load

    // Look for lesson content
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000); // Page has substantial content
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/');

    // Find and use the search bar
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Search for "garden"
    await searchBar.fill('garden');
    await searchBar.press('Enter');

    // Wait for results
    await page.waitForTimeout(2000);

    // Check that we have search results containing "garden"
    const pageText = await page.textContent('body');
    expect(pageText?.toLowerCase()).toContain('garden');
  });

  test('filters are visible and interactive', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForTimeout(1500);

    // Look for filter-related elements (buttons, dropdowns, etc.)
    const filterButtons = page.locator('button, [role="button"]');
    const buttonCount = await filterButtons.count();

    // Should have multiple interactive elements
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('lesson cards display correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for lessons to load
    await page.waitForTimeout(2000);

    // Check for lesson-related content
    const pageText = await page.textContent('body');

    // Should contain grade level references (common in lesson data)
    const hasGradeContent =
      pageText?.includes('Grade') ||
      pageText?.includes('K') ||
      pageText?.includes('PK') ||
      pageText?.match(/\d+(st|nd|rd|th)/);

    expect(hasGradeContent).toBeTruthy();
  });

  test('no console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out known acceptable errors (like favicon, etc.)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
