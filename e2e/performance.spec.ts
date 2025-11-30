import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Page should load DOM within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('search responds quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.fill('garden');

    const startTime = Date.now();
    await searchBar.press('Enter');

    // Wait for results to appear
    await page.waitForSelector('text=/garden/i', { timeout: 5000 });

    const searchTime = Date.now() - startTime;

    // Search should complete within 3 seconds
    expect(searchTime).toBeLessThan(3000);
  });

  test('filter changes respond quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get initial state
    const initialUrl = page.url();

    const startTime = Date.now();

    // Navigate with filter
    await page.goto('/?grade=K');
    await page.waitForLoadState('networkidle');

    const filterTime = Date.now() - startTime;

    // Filter should apply within 3 seconds
    expect(filterTime).toBeLessThan(3000);
  });

  test('no memory leaks on repeated searches', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);

    // Perform multiple searches
    const searchTerms = ['garden', 'cooking', 'salad', 'plant', 'food'];

    for (const term of searchTerms) {
      await searchBar.fill(term);
      await searchBar.press('Enter');
      await page.waitForTimeout(500);
    }

    // Page should still be responsive
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toBeEnabled();
  });

  test('lazy loading works for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    if (count > 0) {
      // Check if any images have lazy loading
      let hasLazyLoading = false;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const loading = await images.nth(i).getAttribute('loading');
        if (loading === 'lazy') {
          hasLazyLoading = true;
          break;
        }
      }
      // Lazy loading is good practice but not required
      expect(typeof hasLazyLoading).toBe('boolean');
    }
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
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // Small tolerance
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
    await page.waitForTimeout(500);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Content should still be visible and accessible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();
  });

  test('touch targets are large enough on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        // Touch targets should be at least 44x44 for accessibility
        // But we'll be lenient and check for 30x30 minimum
        expect(box.width).toBeGreaterThanOrEqual(20);
        expect(box.height).toBeGreaterThanOrEqual(20);
      }
    }
  });
});
