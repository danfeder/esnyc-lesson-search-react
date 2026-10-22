/**
 * T4 dedup sweep — shared numeric thresholds (single source of truth so the
 * candidate generator and the deck runner can never drift out of agreement).
 */

/** Tier A floor on a group's max pairwise content trigram similarity. */
export const TIER_A_MIN = 0.92;
/** Tier B floor; below this a group is tier C (the retire-floor for the deck). */
export const TIER_B_MIN = 0.75;
/** Blocking-rule (b) title-similarity threshold. */
export const TITLE_SIM_THRESHOLD = 0.55;
