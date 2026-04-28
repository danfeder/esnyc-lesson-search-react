import { test, expect } from '@playwright/test';

test.describe('Phase 8b — submission flow (intent-first)', () => {
  test('intent picker renders and shows both branch options', async ({ page }) => {
    await page.goto('/submit');
    await expect(page.getByRole('heading', { name: /Submit a lesson/i })).toBeVisible();
    await expect(page.getByText(/Add a new lesson to the library/i)).toBeVisible();
    await expect(page.getByText(/Update a lesson that's already in the library/i)).toBeVisible();
  });

  test('Add new branch shows URL paste form and a back-to-intent link', async ({ page }) => {
    await page.goto('/submit/new');
    await expect(page.getByRole('heading', { name: /Add a new lesson/i })).toBeVisible();
    await expect(page.getByPlaceholder(/docs\.google\.com\/document/i)).toBeVisible();
    await expect(page.getByText(/Adding a new lesson · Change/i)).toBeVisible();
  });

  test("Update branch shows search picker; URL field disabled until target picked or can't-find", async ({
    page,
  }) => {
    await page.goto('/submit/revising');
    await expect(page.getByText(/Find the lesson you're revising/i)).toBeVisible();
    const urlInput = page.getByPlaceholder(/docs\.google\.com\/document/i);
    await expect(urlInput).toBeDisabled();
  });

  // The login/submit happy paths require seeded credentials and TEST DB —
  // run those in a dedicated authenticated suite separately. The structural
  // tests above cover the route + initial state regression risk.
});
