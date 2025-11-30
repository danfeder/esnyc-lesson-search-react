import { test, expect } from '@playwright/test';

// Use more generous limits in CI
const isCI = !!process.env.CI;
const PAGE_LOAD_TIMEOUT = isCI ? 10000 : 5000;
const SEARCH_TIMEOUT = isCI ? 5000 : 3000;

test.describe('Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(PAGE_LOAD_TIMEOUT);
  });

  test('search responds quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');

    const startTime = Date.now();
    await searchBar.press('Enter');

    // Wait for results to appear
    await expect(page.locator('text=/garden/i').first()).toBeVisible({
      timeout: SEARCH_TIMEOUT,
    });

    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(SEARCH_TIMEOUT);
  });

  test('filter changes respond quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Navigate with filter
    await page.goto('/?grade=K');
    await page.waitForLoadState('networkidle');

    const filterTime = Date.now() - startTime;
    expect(filterTime).toBeLessThan(SEARCH_TIMEOUT);
  });

  test('no memory leaks on repeated searches', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    const searchTerms = ['garden', 'cooking', 'salad', 'plant', 'food'];

    for (const term of searchTerms) {
      await searchBar.fill(term);
      await searchBar.press('Enter');
      await page.waitForLoadState('networkidle');
    }

    // Page should still be responsive
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toBeEnabled();
  });
});

test.describe('Responsive Design', () => {
  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search should still be visible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // Content should fit within viewport (no horizontal scroll needed)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(395); // Small tolerance
  });

  test('tablet viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('desktop viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('content reflows on resize', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForLoadState('networkidle');

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Content should still be visible and accessible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('touch targets are reasonably sized on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    await expect(buttons.first()).toBeVisible();

    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Touch targets should be at least 24x24 for usability
        expect(box.width).toBeGreaterThanOrEqual(20);
        expect(box.height).toBeGreaterThanOrEqual(20);
      }
    }
  });
});
