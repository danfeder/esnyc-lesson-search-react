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
    // Regression guard for the nested-<main> fix (SearchPage's inner <main> was
    // downgraded to <div id="main-content">): the app shell must expose exactly
    // one <main> landmark on the search route — a second would re-nest landmarks.
    await expect(page.getByRole('main')).toHaveCount(1);
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

  test('filter checkboxes are keyboard-focusable and in the a11y tree', async ({ page }) => {
    // §3.2 regression guard: `.int-check input { display:none }` removed every
    // filter checkbox from the focus order AND the accessibility tree, so 10 of
    // 11 filter categories were unreachable by keyboard / screen reader. The fix
    // is an sr-only clip (visually hidden, still focusable + role-exposed).
    //
    // The Activity Type section is a real `.int-check` section (NOT the Grade
    // pills). It now starts COLLAPSED (only Grade Level is open by default —
    // FP4 Brief 4 item 7a), so expand it first to bring its option checkboxes
    // into the (visible) accessibility tree. (This guard already handled the
    // collapse defensively.)
    const sectionHeader = page.getByRole('button', { name: /^Activity Type(\s+\d+)?$/ });
    await expect(sectionHeader).toBeVisible({ timeout: 15000 });
    if ((await sectionHeader.getAttribute('aria-expanded')) === 'false') {
      await sectionHeader.click();
      await expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');
    }

    // With display:none on the input, getByRole('checkbox') cannot find it (not
    // in the role tree) and .focus() cannot land on it -> this FAILS today.
    // No `.first()`: the Activity Type "Cooking" option is the only checkbox whose
    // accessible name matches /cooking/i in the expanded role tree, so toHaveCount(1)
    // is a genuine assertion (a future 2nd match should fail loudly, not be masked).
    const cookingCheckbox = page.getByRole('checkbox', { name: /cooking/i });
    await expect(cookingCheckbox).toHaveCount(1);
    await cookingCheckbox.focus();
    await expect(cookingCheckbox).toBeFocused();
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
  test('search page h1 has an accessible name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = (await page.locator('h1').first().textContent()) ?? '';
    expect(h1Text.trim().length).toBeGreaterThan(0);
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
