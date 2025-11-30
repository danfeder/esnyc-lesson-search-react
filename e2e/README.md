# E2E Tests

End-to-end tests using Playwright to verify the application works correctly from the user's perspective.

## Prerequisites

1. **Start local Supabase:**

   ```bash
   supabase start
   ```

2. **Import test data:**

   ```bash
   npm run import-data
   ```

3. The dev server will be started automatically by Playwright's `webServer` config.

## Test Data Requirements

Tests assume the database contains lesson data from `npm run import-data`. Specifically:

- **Search tests** expect lessons containing "garden", "cooking", and "salad"
- **Filter tests** expect lessons with various grade levels (3K, PK, K, 1st-5th)
- **Lesson display tests** expect multiple lessons with titles, grades, and activity types

If tests fail unexpectedly, verify the database has been seeded:

```bash
# Reset and reimport data
supabase db reset
npm run import-data
```

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Run tests with Playwright UI (interactive debugging)
npm run test:e2e:ui
```

## Test Files

| File                    | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `smoke.spec.ts`         | Smoke tests - verifies app loads and basic functionality works    |
| `search.spec.ts`        | Search functionality - queries, case-insensitivity, special chars |
| `filters.spec.ts`       | Filter interactions - grade levels, URL state persistence         |
| `lessons.spec.ts`       | Lesson display - cards, titles, grades, interactions              |
| `accessibility.spec.ts` | A11y compliance - keyboard nav, ARIA, color contrast              |
| `performance.spec.ts`   | Performance - load times, responsive design, touch targets        |

## Writing New Tests

### Best Practices

1. **Use semantic selectors** - prefer `getByRole`, `getByPlaceholder`, `getByText` over CSS selectors
2. **Avoid arbitrary waits** - use `waitForLoadState` or `expect().toBeVisible()` instead of `waitForTimeout`
3. **Test actual behavior** - verify that actions produce expected results, not just that elements exist
4. **Keep tests independent** - each test should work in isolation

### Example Test

```typescript
import { test, expect } from '@playwright/test';

test('search returns relevant results', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const searchBar = page.getByPlaceholder(/search/i);
  await searchBar.fill('garden');
  await searchBar.press('Enter');

  // Verify results contain search term
  await expect(page.locator('text=/garden/i').first()).toBeVisible({
    timeout: 10000,
  });
});
```

## Configuration

Configuration is in `playwright.config.ts`:

- **CI Mode:** Single worker, 2 retries, trace/video on failure
- **Local Mode:** Multiple workers, no retries, reuses existing dev server
- **Browser:** Chromium only (add more in `projects` array if needed)

## Debugging Failed Tests

1. **View trace:** When tests fail in CI, download the `playwright-report` artifact
2. **Run with UI:** Use `npm run test:e2e:ui` for interactive debugging
3. **Screenshots:** Failed tests automatically capture screenshots in `test-results/`
