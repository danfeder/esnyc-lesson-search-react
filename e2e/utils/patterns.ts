/**
 * Shared patterns for E2E tests
 */

/**
 * Matches grade level indicators as displayed in the UI.
 * Database stores grades as: 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
 * UI may display as ordinals (1st, 2nd) or with "Grade" label.
 */
export const GRADE_LEVEL_PATTERN = /3K|PK|K|1st|2nd|3rd|4th|5th|6th|7th|8th|Grade/i;
