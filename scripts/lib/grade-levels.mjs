/**
 * Resolve a lesson's grade levels from metadata, preferring the current plural
 * key and falling back to the legacy singular key. (Wave 4 C88 reconciliation.)
 *
 * The post-rebuild corpus stores grade levels under `gradeLevels` (plural),
 * but older/legacy rows and the legacy importer used `gradeLevel` (singular).
 * This helper is the single source of truth shared by the importer
 * (scripts/import-data.js) and its unit test, so the reconciliation logic
 * lives in exactly one place.
 *
 * Prefer the plural key only when it carries data: a present-but-EMPTY
 * `gradeLevels: []` falls through to the legacy singular key rather than
 * silently discarding it (plain `??` would not, since it only short-circuits
 * on null/undefined — not on []). This makes the resolver robust to a row that
 * was partially migrated (empty plural mirror alongside a populated singular).
 *
 * @param {{ gradeLevels?: string[], gradeLevel?: string[] } | null | undefined} metadata
 * @returns {string[]} the resolved grade levels, or [] when neither key has data
 */
export function resolveGradeLevels(metadata) {
  const plural = metadata?.gradeLevels;
  if (Array.isArray(plural) && plural.length > 0) return plural;
  const singular = metadata?.gradeLevel;
  if (Array.isArray(singular) && singular.length > 0) return singular;
  return [];
}
