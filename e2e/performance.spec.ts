import { test, expect } from '@playwright/test';

// Viewport sizes for responsive testing
const VIEWPORT = {
  MOBILE: { width: 375, height: 667 }, // iPhone SE
  DESKTOP: { width: 1920, height: 1080 },
} as const;

// Tolerance for viewport width checks (accounts for scrollbars, etc.)
const VIEWPORT_TOLERANCE = 20;

// Minimum touch target size for accessibility (WCAG 2.1 AA recommends 44px, but 24px is minimum)
const MIN_TOUCH_TARGET_SIZE = 24;

test.describe('Responsive Design', () => {
  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORT.MOBILE);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Search should still be visible
    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // C57: the mobile filter trigger must be reachable at 375px (it is the
    // ONLY way to open filters on a phone). Regression guard for the CSS
    // source-order bug that hid it at every width.
    await expect(page.getByRole('button', { name: /open filters/i })).toBeVisible();

    // §4.8: the toolbar must not overflow horizontally on narrow viewports.
    // Pre-fix, .int-toolbar-right was never restacked under 768px, so the
    // toolbar's content was wider than its box (density switcher clipped,
    // count text wrapping to ~4 lines). Element-scoped overflow check.
    const toolbar = page.locator('.int-toolbar');
    await expect(toolbar).toBeVisible();
    const toolbarOverflow = await toolbar.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(toolbarOverflow).toBeLessThanOrEqual(1); // allow sub-pixel rounding

    // Content should fit within viewport (no horizontal scroll needed)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(VIEWPORT.MOBILE.width + VIEWPORT_TOLERANCE);
  });

  test('desktop viewport renders correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORT.DESKTOP);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchBar = page.getByPlaceholder(/search/i);
    await expect(searchBar).toBeVisible();

    // C57: the mobile filter trigger is mobile-only — guard the inverse so a
    // future change can't make it leak onto desktop where the sidebar is shown.
    await expect(page.getByRole('button', { name: /open filters/i })).toBeHidden();
  });

  test('toolbar view and density toggles meet touch target minimum on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORT.MOBILE);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const toggles = page.locator('[role="radiogroup"] button[role="radio"]:visible');
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await toggles.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    }
  });
});
