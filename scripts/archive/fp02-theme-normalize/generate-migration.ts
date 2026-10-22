/**
 * FP-02 theme-normalize migration generator.
 *
 * Reads the CANONICAL Thematic Categories vocabulary from
 * `src/utils/filterDefinitions.ts` (`FILTER_CONFIGS.thematicCategories.options`
 * — the single authoritative source; stakeholder-owned) and emits, byte-for-byte
 * deterministically:
 *
 *   - supabase/migrations/<VERSION>_normalize_kebab_theme_values.sql
 *       (guarded set-based normalize of kebab theme values + rollback snapshot
 *        + valid_thematic_categories CHECK)
 *   - supabase/migrations/<VERSION>_normalize_kebab_theme_values.sql.rollback
 *       (drop CHECK first, then restore both stores from the snapshot)
 *   - scripts/fp02-theme-normalize/artifacts/mapping.json
 *       (the derived kebab→canonical pairs, committed as a review artifact)
 *
 * NOTHING row-identifying is ever hand-typed: the migration contains NO lesson
 * ids at all (its target set is defined by a value predicate and the snapshot
 * table captures the actual ids at apply time), and the only value literals are
 * the 7 canonical/kebab pairs, themselves derived here as
 * `kebab = lower(canonical.replace(/\s+/g, '-'))`. Re-running this script
 * reproduces the exact files (no Date.now / randomness — the only runtime
 * timestamp is the SQL now() that executes at apply time, not generation time).
 *
 * Usage:  npx tsx scripts/fp02-theme-normalize/generate-migration.ts
 *         (writes the three files; pass --stdout to print the .sql instead)
 *
 * This script is READ-ONLY w.r.t. the database (it never connects to Supabase),
 * so it carries no prod-guard — it only reads a repo TS module and writes SQL.
 *
 * Modeled on scripts/dedup-sweep/generate-retire-migration.mjs (t4c) — same
 * header contract, same determinism rules, same --stdout flag.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILTER_CONFIGS } from '../../src/utils/filterDefinitions';

// Full-timestamp version that sorts AFTER 20260703010000_t4b_rpc_content_casefold.sql
// (bare-date YYYYMMDD_ names sort AFTER same-day full timestamps — ASCII gotcha — so
// never use one). Bump if another overnight migration claims this slot.
const VERSION = '20260703030000';
const MIGRATION_BASENAME = `${VERSION}_normalize_kebab_theme_values`;
const SNAPSHOT_TABLE = 'fp02_theme_normalize_rollback';
const CONSTRAINT_NAME = 'valid_thematic_categories';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sqlPath = resolve(root, `supabase/migrations/${MIGRATION_BASENAME}.sql`);
const rollbackPath = resolve(root, `supabase/migrations/${MIGRATION_BASENAME}.sql.rollback`);
const mappingPath = resolve(root, 'scripts/fp02-theme-normalize/artifacts/mapping.json');

// --- Derive the mechanical mapping from the canonical list ---
const toKebab = (v: string): string => v.toLowerCase().replace(/\s+/g, '-');

const options = FILTER_CONFIGS.thematicCategories.options;
const pairs = options.map((o) => ({ kebab: toKebab(o.value), canon: o.value }));

// --- Integrity gates (abort emit on any failure) ---
const fail = (msg: string): never => {
  console.error(`generate-migration (fp02): ABORT — ${msg}`);
  process.exit(1);
};

// Quote-safe charset for embedding as SQL literals (q() below doubles any
// single quote as belt-and-suspenders, but the canonical labels are expected
// to stay in this conservative charset — widen deliberately if the vocab ever
// legitimately changes shape).
const CANON_RE = /^[A-Za-z0-9 '&/-]+$/;

if (pairs.length !== 7) fail(`expected exactly 7 thematic options, got ${pairs.length}`);
for (const o of options) {
  if (o.value !== o.label) fail(`option value !== label: ${JSON.stringify(o)}`);
}
const canonSet = new Set(pairs.map((p) => p.canon));
const kebabSet = new Set(pairs.map((p) => p.kebab));
if (canonSet.size !== pairs.length) fail('canonical values not distinct');
if (kebabSet.size !== pairs.length) fail('kebab twins not distinct');
for (const p of pairs) {
  if (canonSet.has(p.kebab)) {
    fail(`kebab twin collides with a canonical value: ${JSON.stringify(p.kebab)}`);
  }
  if (!CANON_RE.test(p.canon)) fail(`unsafe canonical label: ${JSON.stringify(p.canon)}`);
  if (p.kebab !== toKebab(p.canon)) fail(`non-mechanical pair: ${JSON.stringify(p)}`);
}

// --- SQL literal builders (charset-validated above; quotes doubled anyway) ---
const q = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const mapValuesRows = pairs.map((p) => `  (${q(p.kebab)}, ${q(p.canon)})`).join(',\n');
const canonArray = (indent: string): string =>
  `ARRAY[\n${pairs.map((p) => `${indent}  ${q(p.canon)}`).join(',\n')}\n${indent}]::text[]`;
const kebabArray = (indent: string): string =>
  `ARRAY[\n${pairs.map((p) => `${indent}  ${q(p.kebab)}`).join(',\n')}\n${indent}]::text[]`;

// --- Emit .sql ---
const sql = `-- =====================================================
-- Migration: ${MIGRATION_BASENAME}.sql
-- =====================================================
-- FP-02 — normalize machine-style kebab theme values (e.g. 'seed-to-table')
-- to the canonical Title-Case vocabulary (e.g. 'Seed to Table') in BOTH
-- lessons.thematic_categories (text[], the authoritative filter/search store)
-- AND the legacy metadata->'thematicCategories' JSONB mirror, then install a
-- table-wide CHECK so the drift is structurally impossible to reintroduce.
--
-- WHY (FP1 audit NEW-A, docs/plans/fp1-audit/shelf-frontend-ux.md; tracker
-- docs/plans/2026-07-03-frontend-polish-tracker.md FP-02): the search_lessons
-- RPC filters themes by exact case-sensitive array overlap against the
-- Title-Case values the UI sends, so kebab-valued lessons (~74 active on PROD,
-- ~10% of the library; 86 total rows on TEST = 66 active + 20 retired) are
-- INVISIBLE to the Thematic Categories filter, split the facet buckets, and
-- leak raw kebab strings onto the public lesson drawer.
--
-- This file is GENERATED by scripts/fp02-theme-normalize/generate-migration.ts
-- from the canonical vocabulary in src/utils/filterDefinitions.ts; DO NOT
-- hand-edit — re-run the generator to regenerate. No lesson_id appears
-- anywhere in this file (the target set is a value predicate; the snapshot
-- table captures the actual ids at apply time), and the 7 value pairs are
-- generator-derived, never hand-typed.
--
-- MECHANISM: 100%-mechanical mapping — every kebab variant measured on TEST
-- and in the PROD audit probe is exactly lower(replace(canonical, ' ', '-'))
-- of one canonical label. Guard (2) re-asserts that relation INSIDE the
-- migration, and guard (3a) ABORTS on any theme value outside canonical ∪
-- kebab, so a surprise variant on PROD fails loudly instead of being guessed
-- at. The element-wise UPDATE preserves array order and cannot create
-- duplicate entries (guard (3b): zero rows carry a kebab value AND its
-- canonical twin).
--
-- TRIGGER INTERACTIONS (verified on TEST 2026-07-03):
--   * lessons_normalize_write (BEFORE UPDATE): section (F) no-ops because we
--     set column and JSONB mirror together; its hard-failing
--     _validate_meta_enum_values checks metadata activityType/tags/CRF keys —
--     probed zero off-enum values on all target rows (re-probe on PROD before
--     the morning apply; a violation aborts the whole transaction cleanly).
--   * update_lesson_search_vector_trigger recomputes search_vector for the
--     updated rows (theme lexemes go from compound-kebab to spaced tokens) —
--     expected and desired.
--
-- ATOMICITY (t4c pattern, 20260702160000_t4_dedup_retire.sql): this repo's
-- supabase CLI applies migration statements in AUTOCOMMIT (extended protocol),
-- so without an explicit BEGIN/COMMIT the section-(5) UPDATE would commit
-- before the section-(6) post-asserts run, and a failing assert could NOT roll
-- the write back (c02_retag_apply:59-64 documents this first-hand). The whole
-- body therefore runs in ONE explicit transaction, with a SHARE ROW EXCLUSIVE
-- lock on lessons serializing the apply against concurrent reviewer edits.
--
-- CHECK CONSTRAINT: unlike c02's NOT-VALID-only precedent (18 grandfathered
-- rows), post-assert (6e) proves ZERO off-vocab rows table-wide (incl.
-- retired), so ${CONSTRAINT_NAME} is VALIDATEd in the same transaction and
-- leaves no residue. Operational caveat (carried from c02): any future write
-- touching a lesson row must keep themes canonical — vacuous while the vocab
-- is closed, but a vocab change needs a new migration + regenerated CHECK.
-- NOTE: supabase/seed.sql theme values were canonicalized in the same PR —
-- seed runs AFTER migrations, so off-vocab seed rows would violate the CHECK.
--
-- Rollback: sibling ${MIGRATION_BASENAME}.sql.rollback drops the CHECK FIRST
-- (ordering is load-bearing — restoring kebab values with the CHECK in place
-- would be rejected), then restores both stores from the snapshot. The
-- snapshot table public.${SNAPSHOT_TABLE} is LEFT IN PLACE as the
-- recovery artifact (a post-launch cleanup migration drops it together with
-- t4_dedup_retire_rollback once PROD-stable).
--
-- Pre-registered environment state (measured, spec fp02 §2):
--   TEST  (2026-07-03): 86 rows carry ≥1 kebab value (66 active / 20 retired);
--         exactly 14 distinct active theme values = 7 canonical + 7 kebab twins;
--         zero strays, zero rows with both twins, JSONB mirror == column on all 86.
--   PROD  (audit probe 2026-07-03): same 7 kebab variants, ~74 active rows
--         (29/24/16/12/5/4/4); retired-row count unknown — the set-based
--         predicate handles whatever is present and the guards abort on surprises.
--   LOCAL (seed): zero kebab rows → snapshot 0 rows, UPDATE 0, asserts pass
--         vacuously, CHECK installed + validated.

-- The whole apply runs in ONE explicit transaction (see ATOMICITY above).
BEGIN;

-- Serialize against concurrent writes to public.lessons for the (sub-second)
-- apply, so the pre-guards (3), snapshot (4), UPDATE (5) and post-asserts (6)
-- all see ONE consistent snapshot. SHARE ROW EXCLUSIVE blocks concurrent
-- INSERT/UPDATE/DELETE but still allows SELECT; released at COMMIT. (Requires
-- the surrounding transaction — a bare LOCK errors in autocommit.)
LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- =====================================================
-- (1) Rollback snapshot table (service-role only: RLS on, NO policies —
--     mirrors the t4_dedup_retire_rollback / c02_retag_rollback precedent).
--     prior_metadata_themes is the row's metadata->'thematicCategories' value
--     (NULL when the key was absent).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.${SNAPSHOT_TABLE} (
  lesson_id                  text PRIMARY KEY,
  prior_thematic_categories  text[] NOT NULL,
  prior_metadata_themes      jsonb,
  snapshotted_at             timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.${SNAPSHOT_TABLE} ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- (2) Mapping table (TEMP, dropped at COMMIT) + compile-time guard: exactly
--     ${pairs.length} rows, kebab/canon distinct (PK + UNIQUE), and every pair satisfies
--     the mechanical relation kebab = lower(replace(canon, ' ', '-')).
--     (A property of THIS file, independent of DB contents.)
-- =====================================================
CREATE TEMP TABLE fp02_map (
  kebab text PRIMARY KEY,
  canon text UNIQUE NOT NULL
) ON COMMIT DROP;

-- GENERATED from src/utils/filterDefinitions.ts — never hand-typed.
INSERT INTO fp02_map (kebab, canon) VALUES
${mapValuesRows};

DO $$
DECLARE
  n_rows int;
  n_bad  int;
BEGIN
  SELECT count(*) INTO n_rows FROM fp02_map;
  SELECT count(*) INTO n_bad
  FROM fp02_map
  WHERE kebab <> lower(replace(canon, ' ', '-'));
  IF n_rows <> ${pairs.length} OR n_bad <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: mapping integrity — % rows (expected ${pairs.length}), % non-mechanical pair(s)',
      n_rows, n_bad;
  END IF;
END $$;

-- =====================================================
-- (3) Environment pre-guards (whole table, INCLUDING retired rows). Any
--     failure aborts the whole transaction — nothing is written.
-- =====================================================
DO $$
DECLARE
  kebab_arr    text[];
  n_stray      int;
  n_both       int;
  n_jsonb_only int;
BEGIN
  SELECT array_agg(kebab) INTO kebab_arr FROM fp02_map;

  -- (3a) ZERO theme values outside canonical ∪ kebab. A surprise variant
  --      means the mechanical mapping is incomplete → fail loudly instead of
  --      silently skipping it (it would violate the CHECK at (7) anyway).
  SELECT count(DISTINCT v.val) INTO n_stray
  FROM public.lessons l
  CROSS JOIN LATERAL unnest(l.thematic_categories) AS v(val)
  WHERE v.val NOT IN (SELECT canon FROM fp02_map)
    AND v.val NOT IN (SELECT kebab FROM fp02_map);
  IF n_stray <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % distinct theme value(s) outside canonical+kebab vocabulary — mapping incomplete, refusing to guess',
      n_stray;
  END IF;

  -- (3b) ZERO rows carrying a kebab value AND its canonical twin (replacement
  --      would need dedupe; measured 0 on TEST and 0 in the PROD audit probe).
  SELECT count(*) INTO n_both
  FROM public.lessons l
  WHERE EXISTS (
    SELECT 1 FROM fp02_map m
    WHERE l.thematic_categories @> ARRAY[m.kebab]
      AND l.thematic_categories @> ARRAY[m.canon]
  );
  IF n_both <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % row(s) carry a kebab value AND its canonical twin — element-wise replacement would duplicate entries',
      n_both;
  END IF;

  -- (3c) Every row with kebab in the JSONB mirror also has kebab in the
  --      column (the UPDATE below keys off the column; a JSONB-only kebab row
  --      would be missed and post-assert (6b) would abort AFTER the work —
  --      catch it up front with a clearer message). Measured 0 on TEST
  --      (mirror == column on all 86 target rows).
  SELECT count(*) INTO n_jsonb_only
  FROM public.lessons l
  WHERE jsonb_typeof(l.metadata->'thematicCategories') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(l.metadata->'thematicCategories') AS e(val)
      JOIN fp02_map m ON m.kebab = e.val
    )
    AND NOT (l.thematic_categories && kebab_arr);
  IF n_jsonb_only <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % row(s) have kebab themes in metadata JSONB but not in the column — column-keyed UPDATE would miss them',
      n_jsonb_only;
  END IF;
END $$;

-- =====================================================
-- (4) Snapshot every row that will change (set-based — NO id list anywhere;
--     the predicate IS the target set). ON CONFLICT DO NOTHING makes a
--     re-apply after the rollback idempotent w.r.t. the snapshot.
-- =====================================================
INSERT INTO public.${SNAPSHOT_TABLE}
  (lesson_id, prior_thematic_categories, prior_metadata_themes)
SELECT l.lesson_id, l.thematic_categories, l.metadata->'thematicCategories'
FROM public.lessons l
WHERE l.thematic_categories && (SELECT array_agg(kebab) FROM fp02_map)
ON CONFLICT (lesson_id) DO NOTHING;

-- =====================================================
-- (5) Element-wise, order-preserving normalize of BOTH stores, with the
--     updated-row count asserted against the snapshot in the same block.
-- =====================================================
DO $$
DECLARE
  n_updated  int;
  n_snapshot int;
BEGIN
  UPDATE public.lessons l
  SET thematic_categories = sub.new_arr,
      metadata = jsonb_set(COALESCE(l.metadata, '{}'::jsonb),
                           '{thematicCategories}', to_jsonb(sub.new_arr))
  FROM (
    SELECT l2.lesson_id,
           array_agg(COALESCE(m.canon, v.val) ORDER BY v.ord) AS new_arr
    FROM public.lessons l2
    CROSS JOIN LATERAL unnest(l2.thematic_categories) WITH ORDINALITY AS v(val, ord)
    LEFT JOIN fp02_map m ON m.kebab = v.val
    WHERE l2.thematic_categories && (SELECT array_agg(kebab) FROM fp02_map)
    GROUP BY l2.lesson_id
  ) sub
  WHERE l.lesson_id = sub.lesson_id;

  GET DIAGNOSTICS n_updated = ROW_COUNT;
  SELECT count(*) INTO n_snapshot FROM public.${SNAPSHOT_TABLE};
  IF n_updated <> n_snapshot THEN
    RAISE EXCEPTION 'fp02 ABORT: updated % row(s) but snapshot holds % — predicate drift (or a partial double-apply); rolling back',
      n_updated, n_snapshot;
  END IF;
END $$;

-- =====================================================
-- (6) Post-asserts (hard failures — any raise rolls back EVERYTHING above,
--     snapshot INSERT and UPDATE included).
-- =====================================================
DO $$
DECLARE
  kebab_arr  text[];
  n_col      int;
  n_meta     int;
  n_len      int;
  n_offvocab int;
BEGIN
  SELECT array_agg(kebab) INTO kebab_arr FROM fp02_map;

  -- (6a) zero kebab values remain in ANY row's column.
  SELECT count(*) INTO n_col
  FROM public.lessons
  WHERE thematic_categories && kebab_arr;
  IF n_col <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % row(s) still carry kebab theme values in thematic_categories', n_col;
  END IF;

  -- (6b) zero kebab values remain in ANY row's metadata->'thematicCategories'.
  SELECT count(*) INTO n_meta
  FROM public.lessons l
  WHERE jsonb_typeof(l.metadata->'thematicCategories') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(l.metadata->'thematicCategories') AS e(val)
      JOIN fp02_map m ON m.kebab = e.val
    );
  IF n_meta <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % row(s) still carry kebab theme values in the metadata JSONB mirror', n_meta;
  END IF;

  -- (6d) for every snapshot row: new array length == prior array length
  --      (element-wise replacement — no loss, no duplication).
  SELECT count(*) INTO n_len
  FROM public.${SNAPSHOT_TABLE} r
  JOIN public.lessons l ON l.lesson_id = r.lesson_id
  WHERE COALESCE(array_length(l.thematic_categories, 1), 0)
     <> COALESCE(array_length(r.prior_thematic_categories, 1), 0);
  IF n_len <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % snapshot row(s) changed array length — replacement must be element-wise', n_len;
  END IF;

  -- (6e) zero theme values outside the 7 canonical remain, whole table
  --      (the pre-VALIDATE census that makes (7)'s VALIDATE safe).
  SELECT count(*) INTO n_offvocab
  FROM public.lessons l
  CROSS JOIN LATERAL unnest(l.thematic_categories) AS v(val)
  WHERE v.val NOT IN (SELECT canon FROM fp02_map);
  IF n_offvocab <> 0 THEN
    RAISE EXCEPTION 'fp02 ABORT: % theme value occurrence(s) outside the canonical vocabulary remain — VALIDATE would fail', n_offvocab;
  END IF;

  RAISE NOTICE 'fp02 normalize OK: % row(s) normalized (snapshot=%), 0 kebab remaining in column+mirror, table 100%% canonical',
    (SELECT count(*) FROM public.${SNAPSHOT_TABLE}),
    (SELECT count(*) FROM public.${SNAPSHOT_TABLE});
END $$;

-- =====================================================
-- (7) Belt: table-wide CHECK, idempotent ADD (pg_constraint existence guard,
--     c02 P4b precedent), then VALIDATE — safe here, unlike c02, because (6e)
--     proved zero violators table-wide, we already hold the table lock, and
--     the ~763-row scan is instant. Empty '{}' satisfies <@; NULL is allowed
--     explicitly.
-- =====================================================
DO $$
BEGIN
  -- SOURCE: src/utils/filterDefinitions.ts FILTER_CONFIGS.thematicCategories
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = '${CONSTRAINT_NAME}'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT ${CONSTRAINT_NAME}
      CHECK (
        thematic_categories IS NULL
        OR thematic_categories <@ ${canonArray('        ')}
      )
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.lessons VALIDATE CONSTRAINT ${CONSTRAINT_NAME};

-- Commit the whole apply atomically (releases the lessons lock; drops the
-- TEMP mapping table). If any statement above raised, this transaction rolls
-- back every write — snapshot INSERT, UPDATE and CHECK included.
COMMIT;

-- =====================================================
-- ROLLBACK — see sibling ${MIGRATION_BASENAME}.sql.rollback
-- (drops ${CONSTRAINT_NAME} FIRST, then restores both stores from
--  public.${SNAPSHOT_TABLE}; the snapshot table is left in place.)
-- =====================================================
`;

// --- Emit .rollback ---
const rollback = `-- =====================================================
-- ROLLBACK: ${MIGRATION_BASENAME}.sql.rollback
-- =====================================================
-- Restores the pre-FP-02 kebab theme values for exactly the rows captured in
-- public.${SNAPSHOT_TABLE} — both lessons.thematic_categories AND
-- the metadata->'thematicCategories' JSONB mirror. Generated by
-- scripts/fp02-theme-normalize/generate-migration.ts — do not hand-edit.
--
-- ORDERING IS LOAD-BEARING: the ${CONSTRAINT_NAME} CHECK is dropped
-- BEFORE the restore — restoring kebab values with the CHECK in place would be
-- rejected. Both statements run in ONE explicit transaction so a failed
-- restore cannot strand the table without its CHECK (autocommit gotcha).
--
-- The prior_thematic_categories && ARRAY[<kebab>] clause restricts the restore
-- to rows whose snapshot actually held kebab values, even if the snapshot
-- table were ever polluted with non-target rows (defense-in-depth, t4c's
-- pollution guard in value-predicate form; on the real apply the table holds
-- only target rows by construction).
--
-- NOTE: the lessons_normalize_write trigger fires on the restore UPDATE. For
-- every measured target row the snapshot mirror equals the snapshot column, so
-- its sync section (F) no-ops. For a (never-measured) row whose prior mirror
-- was NULL, the key is removed here and the trigger immediately re-derives it
-- from the restored column — an acceptable convergence, not data loss.
--
-- The snapshot table is LEFT IN PLACE (recovery artifact); a future cleanup
-- migration drops it together with t4_dedup_retire_rollback once PROD-stable.

BEGIN;

LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- (1) Drop the CHECK first — see ORDERING note above.
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS ${CONSTRAINT_NAME};

-- (2) Restore both stores from the snapshot.
UPDATE public.lessons l
SET thematic_categories = r.prior_thematic_categories,
    metadata = CASE
                 WHEN r.prior_metadata_themes IS NULL
                   THEN l.metadata - 'thematicCategories'
                 ELSE jsonb_set(COALESCE(l.metadata, '{}'::jsonb),
                                '{thematicCategories}', r.prior_metadata_themes)
               END
FROM public.${SNAPSHOT_TABLE} r
WHERE l.lesson_id = r.lesson_id
  AND r.prior_thematic_categories && ${kebabArray('      ')};

COMMIT;
`;

// --- Emit mapping.json (committed review artifact) ---
const mapping =
  JSON.stringify(
    {
      source: 'src/utils/filterDefinitions.ts FILTER_CONFIGS.thematicCategories.options',
      rule: "kebab = canonical.toLowerCase().replace(/\\s+/g, '-')",
      migration: `supabase/migrations/${MIGRATION_BASENAME}.sql`,
      pairs,
    },
    null,
    2
  ) + '\n';

if (process.argv.includes('--stdout')) {
  process.stdout.write(sql);
} else {
  mkdirSync(dirname(mappingPath), { recursive: true });
  writeFileSync(sqlPath, sql);
  writeFileSync(rollbackPath, rollback);
  writeFileSync(mappingPath, mapping);
  console.log(
    `Wrote:\n  ${sqlPath}\n  ${rollbackPath}\n  ${mappingPath}\n` +
      `${pairs.length} kebab→canonical pairs derived from filterDefinitions.ts. Integrity gate: PASS.`
  );
}
