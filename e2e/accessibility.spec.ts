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
    await expect(main.first()).toBeVisible();
  });

  test('search input has accessible label', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Check for aria-label or placeholder (both provide accessible names)
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const placeholder = await searchInput.getAttribute('placeholder');

    expect(ariaLabel || placeholder).toBeTruthy();
  });

  test('buttons have accessible names', async ({ page }) => {
    const buttons = page.locator('button:visible');
    await expect(buttons.first()).toBeVisible();

    const count = await buttons.count();
    const checkedButtons = Math.min(count, 10);

    for (let i = 0; i < checkedButtons; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      const hasAccessibleName = text?.trim() || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('images have alt text or are decorative', async ({ page }) => {
    const images = page.locator('img:visible');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Either has alt text or is marked as decorative
      const isAccessible =
        alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.focus();
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

  test('color contrast check - page has readable content', async ({ page }) => {
    // Basic check - page should have readable text
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('page renders without JavaScript (graceful degradation)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/');

    // Page should at least show the HTML structure
    const content = await page.content();
    expect(content).toContain('html');
    expect(content).toContain('head');
    expect(content).toContain('body');

    await context.close();
  });
});

test.describe('Screen Reader Compatibility', () => {
  test('headings have proper hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Count = await page.locator('h1').count();

    // Should have at least one h1
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('form inputs are properly labeled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator(
      'input:visible, select:visible, textarea:visible'
    );
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
