/**
 * Shared patterns for E2E tests
 */

/**
 * Matches grade level indicators as displayed in the UI.
 * Database stores grades as: 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
 * UI may display as:
 *   - Raw values: 3K, PK, K
 *   - Expanded: Pre-K, Kindergarten
 *   - Ordinals with label: 1st Grade, 2nd Grade, etc.
 *
 * Format: String containing regex pattern with delimiters for Playwright's text locator.
 * Use with Playwright text locator: page.locator(`text=${GRADE_LEVEL_SELECTOR}`)
 */
export const GRADE_LEVEL_SELECTOR: string =
  '/3K|PK|Pre-K|K|Kindergarten|1st|2nd|3rd|4th|5th|6th|7th|8th|Grade/i';
