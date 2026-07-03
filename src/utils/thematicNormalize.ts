/**
 * FP-02 Tier-1 write-site guard: normalize legacy machine-style kebab theme
 * values (e.g. 'seed-to-table') to the canonical Title-Case vocabulary
 * (e.g. 'Seed to Table').
 *
 * Why this exists: the reviewer round-trip was the one live kebab ingress —
 * ReviewDetail initializes its form from a lesson's stored metadata via
 * `lessonToReview`, the pill UI preserves (but cannot display) unknown
 * selected values, and `complete_review_atomic` writes the payload back
 * verbatim. Normalizing at form-init heals the round-trip at its origin,
 * makes legacy values visible/toggleable in the pill UI, lets any reviewer
 * save self-repair a drifted row, and keeps the deploy-order window safe
 * (frontend auto-deploys on merge BEFORE the user approves the PROD data
 * migration, so for some hours the new frontend meets old kebab PROD data).
 *
 * The DB belt is the `valid_thematic_categories` CHECK installed by migration
 * 20260703030000_normalize_kebab_theme_values.sql (generated from the same
 * canonical list). Keep the two in sync by construction: both derive the
 * kebab twins mechanically from `FILTER_CONFIGS.thematicCategories.options`.
 *
 * Semantics (mirrors the migration's element-wise UPDATE):
 *   - each kebab twin maps to its canonical label;
 *   - already-canonical values pass through unchanged (idempotent);
 *   - unknown values pass through verbatim (never guess — the DB CHECK is the
 *     enforcement layer, this is a repair layer);
 *   - duplicates after mapping are dropped, preserving first-seen order.
 */
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

const toKebab = (value: string): string => value.toLowerCase().replace(/\s+/g, '-');

/** kebab twin → canonical label, derived (never hand-typed) from the canonical list. */
const KEBAB_TO_CANONICAL: ReadonlyMap<string, string> = new Map(
  FILTER_CONFIGS.thematicCategories.options.map((o) => [toKebab(o.value), o.value])
);

export function normalizeThematicCategories(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const canonical = KEBAB_TO_CANONICAL.get(value) ?? value;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      out.push(canonical);
    }
  }
  return out;
}
