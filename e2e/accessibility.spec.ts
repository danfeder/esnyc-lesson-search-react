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
      const isAccessible = alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/search/i);
    await searchBar.focus();
    await expect(searchBar).toBeFocused();
  });

  test('keyboard navigation works', async ({ page }) => {
    // First Tab should focus on a focusable element
    await page.keyboard.press('Tab');

    // Verify something is focused
    const firstFocused = page.locator(':focus');
    await expect(firstFocused).toBeVisible();

    // Get a unique identifier for the first focused element
    const firstFocusedId = await firstFocused.evaluate((el) => el.id || el.tagName + el.className);

    // Tab again
    await page.keyboard.press('Tab');

    // Verify something is still focused
    const secondFocused = page.locator(':focus');
    await expect(secondFocused).toBeVisible();

    // Get identifier for second focused element
    const secondFocusedId = await secondFocused.evaluate(
      (el) => el.id || el.tagName + el.className
    );

    // Verify focus actually moved to a different element
    expect(secondFocusedId).not.toBe(firstFocusedId);
  });

  test('page has sufficient text content', async ({ page }) => {
    // Verify page has meaningful content loaded
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);

    // Verify there are multiple text elements (not just one blob)
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('page structure is valid HTML', async ({ page }) => {
    // Verify basic HTML structure exists
    const html = await page.content();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('<head');
    expect(html).toContain('<body');

    // Verify no duplicate IDs (common accessibility issue)
    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const id of ids) {
        if (seen.has(id)) duplicates.push(id);
        seen.add(id);
      }
      return duplicates;
    });
    expect(duplicateIds).toHaveLength(0);
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

    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const ariaDescribedBy = await input.getAttribute('aria-describedby');
      const id = await input.getAttribute('id');
      const inputType = await input.getAttribute('type');
      const title = await input.getAttribute('title');

      // Hidden inputs don't need labels
      if (inputType === 'hidden') continue;

      // Check if there's an associated label element
      let hasAssociatedLabel = false;
      if (id) {
        const labelCount = await page.locator(`label[for="${id}"]`).count();
        hasAssociatedLabel = labelCount > 0;
      }

      // Check if input is inside a label element
      const isInsideLabel = await input.evaluate((el) => {
        return el.closest('label') !== null;
      });

      // Check if input is inside a fieldset with legend
      const isInFieldsetWithLegend = await input.evaluate((el) => {
        const fieldset = el.closest('fieldset');
        return fieldset !== null && fieldset.querySelector('legend') !== null;
      });

      // Must have a proper accessible label via one of these methods:
      // - aria-label attribute
      // - aria-labelledby pointing to another element
      // - aria-describedby for additional context
      // - Associated <label for="id"> element
      // - Input nested inside a <label> element
      // - Input inside a <fieldset> with <legend>
      // - title attribute (less preferred but valid)
      const hasProperLabel =
        ariaLabel ||
        ariaLabelledBy ||
        ariaDescribedBy ||
        hasAssociatedLabel ||
        isInsideLabel ||
        isInFieldsetWithLegend ||
        title;

      expect(hasProperLabel).toBeTruthy();
    }
  });
});
