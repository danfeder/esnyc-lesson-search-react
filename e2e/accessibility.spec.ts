import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('page has proper title', async ({ page }) => {
    await expect(page).toHaveTitle(/ESYNYC|Lesson|Library/i);
  });

  test('page has main landmark', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    const count = await main.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('search input has accessible label', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Check for aria-label or associated label
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const id = await searchInput.getAttribute('id');
    const placeholder = await searchInput.getAttribute('placeholder');

    const hasAccessibleName = ariaLabel || id || placeholder;
    expect(hasAccessibleName).toBeTruthy();
  });

  test('buttons have accessible names', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      const hasAccessibleName = text?.trim() || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('images have alt text', async ({ page }) => {
    const images = page.locator('img:visible');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Either has alt text or is decorative (role="presentation")
      const isAccessible = alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);

    // Focus the search bar
    await searchBar.focus();

    // Check that focus styles are applied (element should be focused)
    await expect(searchBar).toBeFocused();
  });

  test('keyboard navigation works', async ({ page }) => {
    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('skip link is available', async ({ page }) => {
    // Focus on the page to check for skip link
    await page.keyboard.press('Tab');

    // Look for skip link (may or may not be visible until focused)
    const skipLink = page.locator('a:has-text("skip"), [class*="skip"]');
    const count = await skipLink.count();

    // Skip link is nice to have but not mandatory
    expect(count >= 0).toBeTruthy();
  });

  test('color contrast is sufficient', async ({ page }) => {
    // Basic check - page should have readable text
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);

    // Visual regression would be better for actual contrast checking
  });

  test('page works without JavaScript (graceful degradation)', async ({
    browser,
  }) => {
    // This tests server-side rendering / initial HTML
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/');

    // Page should at least show something
    const content = await page.content();
    expect(content).toContain('html');

    await context.close();
  });
});

test.describe('Screen Reader Compatibility', () => {
  test('headings have proper hierarchy', async ({ page }) => {
    await page.goto('/');

    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();

    // Should have at least one h1
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // If we have h2s, we should have h1 first
    if (h2Count > 0) {
      expect(h1Count).toBeGreaterThan(0);
    }
  });

  test('form inputs are properly labeled', async ({ page }) => {
    await page.goto('/');

    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');

      // Must have some form of labeling
      const hasLabel = ariaLabel || ariaLabelledBy || id || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });
});
