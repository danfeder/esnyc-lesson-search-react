# Filter Metadata Drift Repair — Design Document (v2: column-based)

**Date:** 2026-04-28
**Status:** Draft — awaiting review
**Supersedes:** `2026-04-28-filter-metadata-drift-repair-design-v1-jsonb.md` (v1, JSONB-as-source-of-truth approach — archived)
**Related memory:** `project_lesson_format_conflated.md`, `feedback_workflows_not_sacred.md`, `feedback_data_safety_top_priority.md`

---

## 1. Why this exists

The `search_lessons` RPC and the UI's filter sidebar disagree about what's stored in `lessons`. Production verification (788 lessons, 2026-04-28) showed five distinct mismatches that combine to make most filter clicks return wrong counts — sometimes zero, often undercounting by ~10%, occasionally undercounting by 90%.

The cause is a mix of **shape drift** (different metadata layouts across two submission eras) and **vocabulary drift** (UI values that don't match stored values, plus casing inconsistencies in the corpus). The drift accumulated through multiple migration boundaries and is now distributed across two parallel data surfaces — JSONB metadata and normalized text-array columns.

### The two surfaces

The `lessons` table stores filter-relevant data in two parallel surfaces:

- **JSONB `metadata` column** — the legacy filter source. Contains nested keys like `thematicCategories`, `seasonTiming`, `locationRequirements`, `lessonFormat`, with mixed shapes across rows (object/array/scalar) depending on which submission era wrote them.
- **Normalized columns** — `thematic_categories text[]`, `season_timing text[]`, `location_requirements text[]`, `lesson_format text`, `activity_type text[]`, `cooking_methods text[]`, `academic_integration text[]`, `cultural_heritage text[]`, `social_emotional_learning text[]`, `core_competencies text[]`, plus more for non-filter fields.

The 2025-10-01 baseline header comment claims `search_lessons` was "updated to use normalized TEXT[] columns," but the actual RPC body (lines 1198-1357 of the baseline) still filters on JSONB paths. This is the architectural mismatch at the heart of the bug class.

### Concrete production evidence

| Filter | UI sends | DB has | RPC returns |
|---|---|---|---|
| `lessonFormat=single-period` | `single-period` | `Single period` (483 rows) | **0** hits |
| `lessonFormat=standalone` | `standalone` | `Standalone` (150) + `standalone` (66) | **66** (not 216) |
| `activityType=cooking-only` | `cooking-only` | `cooking` (24 in meta; 299 in column) | **0** hits |
| `cookingMethods=Stovetop` | scalar `'Stovetop'` (RPC param is `text`) | array `["Stovetop", …]` | **0** hits |
| `culturalHeritage=asian` | `asian` | `Asian` (66 + children) | **1** (not 67) |
| `academicIntegration=Math` | `Math` | object-shape only path | 102 (silently drops 87 review-era array-shape rows) |

### Cohort dynamics (corrected)

The deployed `complete_review_atomic` (verified live 2026-04-28 via `pg_get_functiondef`, byte-identical to `20260428000008_phase_4_status_guard.sql`) writes both normalized columns AND a `metadata` JSONB blob — but the metadata blob is NOT canonical:

- **`metadata.lessonFormat` is written as a JSONB ARRAY** (`jsonb_build_array(v_meta->>'lessonFormat')`) — single-element array. The `lesson_format` column on the same row is the scalar. Mismatch between surfaces.
- **`metadata.academicIntegration` is pass-through** — whatever shape the React form supplies, including the flat-array shape new review forms produce.
- **`metadata.locationRequirements`** IS written as array (matches column, OK).
- Long-form keys (`thematicCategories`, `seasonTiming`, etc.) ARE used — that part of Phase 4's intent works.

**The post-Phase-4 cohort is empty as of 2026-04-28** (`inserted_post_phase4: 0` against live PROD). But every approved submission going forward produces:
- Clean normalized columns ✓
- `metadata.lessonFormat` array-shape (drifted)
- `metadata.academicIntegration` whatever-shape (drift-prone)

**The drift cohort is NOT frozen — it grows by 1 with every approval until the writer is fixed.**

The pre-Phase-4 historical residue is still ~95 rows:
- 81 rows with short-form keys (`themes`/`season`/`location`), all created 2025-09-01 in one batch
- 14 rows with long-form keys but flat-array `academicIntegration` — older, mixed-source

This shifts PR-2's scope: the **writer fix** in `complete_review_atomic` is the centerpiece, not an afterthought. The historical residue gets backfilled. The post-Phase-4 cohort (currently 0, ticking up the moment a reviewer approves anything) is the live drift source the writer-fix has to stop.

**Vocabulary drift is independently un-frozen.** Phase 4 doesn't normalize vocabulary on either surface — if a reviewer types `lessonFormat=Single period` (Title Case) or `lessonFormat=single-period` (slug), both are stored as-is in both `lesson_format` column and `metadata.lessonFormat` array. PR-3 owns vocabulary canonicalization across both surfaces.

## 2. Failure modes the fix must close

Each of the five user-visible bugs traces to one of four root causes. The fix must close all four; closing some leaves the corpus diverging.

1. **Shape drift in JSON metadata.** Pre-Phase-4 historical residue: 81 rows with short-form keys + 14 rows with long-form keys but flat-array `academicIntegration`. Plus the live drift source: `complete_review_atomic` writes `metadata.lessonFormat` as an array and `metadata.academicIntegration` pass-through-shape. Both must be addressed.
2. **Vocabulary drift across both surfaces.** `lessonFormat`, `activityType`, `cookingMethods`, `culturalHeritage`, `thematic_categories` have UI values that don't match stored values, with casing chaos in both `metadata` and the normalized columns. Live; grows with each approval until vocabulary normalization lands.
3. **Type/shape RPC bugs.** `cookingMethods` declared `multiple` in `filterDefinitions.ts` but RPC parameter is scalar `text` and comparison is scalar-equals. RPC reads `metadata->'academicIntegration'->'selected'` only.
4. **Write-path leakage** (defense-in-depth gap). `complete_review_atomic` is the only known writer, but it produces the live drift in #1. MCP, manual SQL, scripts, or any future edge function could also bypass shape/vocabulary normalization. No DB-layer enforcement exists.

### Out of scope

- **`lessonFormat` semantic conflation** (`project_lesson_format_conflated.md`) — single-select forces one value when both time-structure and context-independence often apply. Filter redesign, not drift repair.
- **`grades_taught` / `subjects_taught` non-consultation** (`project_grades_subjects_unused.md`) — fields written but never read by search.

## 3. The chosen shape: column-based filter source of truth

```
SEARCH PATH
  RPC filters on normalized columns ──→ result row's metadata is reconstructed
                                        from columns + pass-through of non-column fields
                                        ───────────────────────────────────────────────
                                                  frontend reads canonical metadata,
                                                  facet counts/pills/details all align

WRITE PATH
  complete_review_atomic ──→ rewritten in PR-2 to write canonical-shape metadata
                                ↓
                           lessons normalization trigger (PR-2; force column⇄metadata sync;
                                                          column wins on disagreement)
                                ↓
                           canonical row stored
```

The columns become the **filter source of truth**. JSONB `metadata` is treated as a compatibility/display payload — present on every result row, but reconstructed from the columns for filter-relevant fields so frontend facet counts can't drift from RPC filter behavior.

### Why column-based over JSONB-based (the v1 plan)

| Option | Why rejected |
|---|---|
| **v1 plan: tolerant-RPC over JSONB** | Lots of CASE branches (`jsonb_typeof = 'object' THEN ... ELSE ...`), shape coercion, key-name fallbacks. Fragile. Doesn't capitalize on the fact that columns are *already* normalized for shape. Backfill SQL had latent scalar-vs-array bugs (verified — see archived v1 §5 commentary). |
| **v3 hybrid: column primary + JSON fallback** | Worst of both. The fallback path lets vocabulary drift hide; if a column gets out-of-sync with metadata, results become non-deterministic depending on which path the RPC took. |
| **Column-based + canonical-metadata return** | Columns already normalize shape. RPC SQL is much simpler. Result-row metadata reconstruction means frontend facet counts/pills automatically reflect the canonical-ish view the filter used. The "drift cohort grows with each approval" problem is solved at the writer (PR-2), not at every read. **Chosen.** |

### Partial metadata reconstruction contract

The RPC returns each result row with `metadata` constructed as a per-field COALESCE-overlay. **Per-field COALESCE rather than naive `||` overlay** because `to_jsonb(NULL::text[])` produces JSON `null`, and a naive `original || jsonb_build_object('x', null)` would *erase* a valid `original.x` when the column is NULL — a real risk for the row-level mismatches we know exist (5 AI rows where column is NULL but metadata has data).

```sql
-- Reconstructed metadata. Column overrides original metadata IFF column is non-null/non-empty.
-- Update this list alongside any new filter-relevant column added in future migrations.
original_metadata || jsonb_strip_nulls(jsonb_build_object(
  'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0 THEN to_jsonb(l.thematic_categories)      END,
  'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0       THEN to_jsonb(l.season_timing)            END,
  'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0 THEN to_jsonb(l.location_requirements)  END,
  'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0   THEN to_jsonb(l.core_competencies)        END,
  'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0   THEN to_jsonb(l.cultural_heritage)        END,
  'lessonFormat',            CASE WHEN l.lesson_format IS NOT NULL AND l.lesson_format <> ''   THEN to_jsonb(l.lesson_format)            END,
  'activityType',            CASE WHEN COALESCE(array_length(l.activity_type, 1), 0) > 0       THEN to_jsonb(l.activity_type)            END,
  'cookingMethods',          CASE WHEN COALESCE(array_length(l.cooking_methods, 1), 0) > 0     THEN to_jsonb(l.cooking_methods)          END,
  'academicIntegration',     CASE WHEN COALESCE(array_length(l.academic_integration, 1), 0) > 0 THEN to_jsonb(l.academic_integration)    END,
  'socialEmotionalLearning', CASE WHEN COALESCE(array_length(l.social_emotional_learning, 1), 0) > 0 THEN to_jsonb(l.social_emotional_learning) END
))
```

`jsonb_strip_nulls` removes the keys where the CASE returned `NULL`, so they don't appear in the build_object output and `||` only overwrites keys where the column has real data. For the rare row where column is NULL and metadata has the value, the original metadata's value passes through untouched — the read-time reconstruction never hides existing data, even before PR-2's column-hygiene cleanup lands.

**Caveat on `academicIntegration`:** legacy object-shape `{selected: [...]}` rows mostly have the column populated with the array elements (column reconstruction overlays a flat array, canonicalizing the shape). But ~5 rows in production have NULL column + object-shape metadata. For those rows, PR-1 reconstruction's CASE returns NULL → `jsonb_strip_nulls` drops the key → the original `{selected: [...]}` passes through. **`useLessonSearch.ts:36`'s `normalizeMetadata` mishandles object-shape input**: `asArray = (v) => Array.isArray(v) ? v : v ? [String(v)] : []` produces `["[object Object]"]` for the wrapping object, breaking facet counts and pills for those 5 rows.

**PR-1 must include a small `normalizeMetadata` fix** to handle the object-with-`selected` case the same way `facetCounts.ts` already does (lines 56-61). Five lines of TypeScript:

```typescript
academicIntegration: (() => {
  const ai = m.academicIntegration;
  if (Array.isArray(ai)) return ai as string[];
  if (ai && typeof ai === 'object' && Array.isArray((ai as { selected?: unknown }).selected)) {
    return (ai as { selected: string[] }).selected;
  }
  return [];
})(),
```

PR-2's column hygiene migration cleans up the 5 NULL-column rows so this defensive code never fires after PR-2 ships, but it stays as belt-and-braces.

The reconstruction list is **explicit in the RPC body, not parameterized**. When a future migration adds a new filter-relevant column, the reconstruction list must be updated alongside; an explicit list grep-able from the RPC source surfaces this requirement. A SQL comment block above the reconstruction lists every column included.

## 4. Section 1 — Column-based RPC + alias tolerance (PR-1)

One migration + a small `normalizeMetadata` patch (§3 caveat). No data side effects. Defensive only — widens matches, never narrows.

### Changes

1. **Rewrite `search_lessons` filter clauses to use normalized columns.**

   | Filter param | Old (metadata) | New (column) |
   |---|---|---|
   | `filter_grade_levels text[]` | (already uses column `grade_levels`) | unchanged |
   | `filter_themes text[]` | `metadata->'thematicCategories'` (jsonb_array_elements_text) | `l.thematic_categories && filter_themes` |
   | `filter_seasons text[]` | `metadata->'seasonTiming'` | `l.season_timing && filter_seasons` |
   | `filter_competencies text[]` | `metadata->'coreCompetencies'` | `l.core_competencies && filter_competencies` |
   | `filter_cultures text[]` | `metadata->'culturalHeritage'` (with `expand_cultural_heritage`) | `l.cultural_heritage && expanded_cultures` |
   | `filter_location text[]` | `jsonb_array_elements_text(...locationRequirements)` w/ stringified-array fallback | `l.location_requirements && filter_location` |
   | `filter_activity_type text[]` | `metadata->>'activityType' = ANY(...)` (scalar) | `l.activity_type && filter_activity_type` (array overlap) |
   | `filter_lesson_format text` | `metadata->>'lessonFormat' = filter_lesson_format` | `l.lesson_format = filter_lesson_format` |
   | `filter_academic text[]` | `metadata->'academicIntegration'->'selected'` (object-only) | `l.academic_integration && filter_academic` |
   | `filter_sel text[]` | `metadata->'socialEmotionalLearning'` | `l.social_emotional_learning && filter_sel` |
   | `filter_cooking_method text[]` | `metadata->>'cookingMethods' = filter_cooking_method` (scalar param!) | `l.cooking_methods && filter_cooking_method` (array param) |

2. **`filter_cooking_method` parameter type change: `text` → `text[]`.** This is a signature change. Postgres won't `CREATE OR REPLACE FUNCTION` with changed argument types — the migration must `DROP FUNCTION search_lessons(... old signature ...)` then `CREATE FUNCTION ...` with the new signature. Plus:
   - `GRANT EXECUTE ON FUNCTION search_lessons(...) TO anon, authenticated, service_role;`
   - Regenerate `src/types/database.types.ts` post-merge (`supabase gen types typescript --project-id ...`).
   - `NOTIFY pgrst, 'reload schema';` at end of migration (Supabase auto-reloads but explicit is safer).

3. **Alias tolerance for current UI values (transitional, removed in PR-3).** UI sends drift-era vocabulary; until PR-3 lands, the RPC must accept both:

   - `lessonFormat`: accept either kebab-slug or Title Case. SQL: `l.lesson_format = ANY(_alias_lesson_format(filter_lesson_format))` where `_alias_lesson_format` is a helper returning the input plus its known synonyms (e.g. input `'single-period'` returns `ARRAY['single-period', 'Single period']`).
   - `activityType`: input element `'cooking-only'` matches column values `'cooking-only'` OR `'cooking'`. Helper `_alias_activity_type(text[])` expands the input array.
   - `culturalHeritage`: input slug expands to slug + Title-Case-with-spaces equivalent (e.g. `'east-asian'` → `ARRAY['east-asian', 'East Asian']`). Combined with `expand_cultural_heritage` for hierarchy.
   - `cookingMethods`: case-insensitive match on column values. **Don't use `lower(text[]::text)::text[]` round-trip** — Postgres array literal syntax with element-quoting can break on commas, quotes, or unusual chars. Use:
     ```sql
     EXISTS (
       SELECT 1 FROM unnest(l.cooking_methods) c
       WHERE lower(c) = ANY(SELECT lower(x) FROM unnest(filter_cooking_method) x)
     )
     ```
     Or wrap in a helper `_match_cooking_methods(l.cooking_methods, filter_cooking_method) RETURNS boolean` for readability.

   These helpers live in this same migration as `_alias_*` functions with explicit comments noting "remove in PR-3 once vocabulary is canonical."

4. **Partial metadata reconstruction in the SELECT.** As specified in §3. The RETURN-row's `metadata` becomes column-derived for filter-relevant fields, original-metadata for everything else. Comment block above the `jsonb_build_object` lists every column included.

5. **Mechanics**: `DROP FUNCTION IF EXISTS public.search_lessons(<exact old signature>);` (NO CASCADE — if there are unexpected dependent objects, surfacing them as a migration error is the right outcome) + `CREATE FUNCTION ...` with new signature + `GRANT ...` to `anon`, `authenticated`, `service_role` + `NOTIFY pgrst, 'reload schema';` + ROLLBACK comments at file end. If the DROP fails, pre-flight: run `SELECT pg_get_function_identity_arguments(oid), pg_describe_object('pg_proc'::regclass, oid, 0) FROM pg_proc WHERE proname = 'search_lessons';` and a dependency query against `pg_depend` to inventory what's blocking.

### What's NOT in this PR

- No data changes. No backfill. The pre-Phase-4 historical residue (~95 rows) is matched correctly via the column-based filter for everything that has a populated column; the 5 NULL-column AI rows are handled by the `normalizeMetadata` fix above. Full data hygiene is PR-2's job.
- No `filterDefinitions.ts` or filter-UI vocabulary changes. PR-3 owns the canonicalization. The only frontend change is the defensive `normalizeMetadata` academicIntegration fix described in §3.
- No write-path changes (RPC fix or trigger). PR-2 owns both.
- No heritage taxonomy redesign. PR-1's alias tolerance keeps heritage usable; PR-4 does the deeper work.

### Frontend hook update

`src/hooks/useLessonSearch.ts:113` already sends an array as `filter_cooking_method`. The current scalar-`text` RPC param means JS-array → PostgREST → Postgres-array-of-text-elements coerced to scalar — produces a stringified array literal that never matches. After PR-1 changes the param to `text[]`, the JS array passes through correctly. **No frontend code change required for this bug** — the param-type change fixes both sides simultaneously. (But `database.types.ts` regenerates and TypeScript will type-check the call against the new signature.)

## 5. Section 2 — Writer fix + column hygiene + trigger (PR-2)

Four migrations in one PR. **Sequential, not transactionally atomic** — Supabase's migration applier runs each file in its own transaction, with brief gaps between. The migrations are ordered so the gaps can't produce drift:

1. **Migration 1: writer fix** in `complete_review_atomic`. After this lands, every future approval writes canonical-shape metadata. Drift growth stops at this point.
2. **Migration 2: backfill historical drift rows.** Cleans up the ~95 pre-Phase-4 historical residue. No trigger to bypass — there isn't one yet.
3. **Migration 3: column-data hygiene.** Cleans up the 17 `activity_type` location-leaks and 7 AI mismatches.
4. **Migration 4: install + enable normalization trigger.** Trigger arrives last to a fully-canonical table. From now on, any write (RPC, MCP, manual SQL, scripts) goes through it and produces canonical column⇄metadata pairs.

This ordering eliminates the drift-during-deploy concern: Migration 1 stops new drift before any other migration runs, so the gaps between migrations are safe. No "trigger installed disabled" pattern, no `session_replication_role = 'replica'` needed.

**One residual concern:** if a `complete_review_atomic` call lands in the brief window between Migration 1 starting to apply and Migration 1 committing, that call hits the OLD writer and produces drift. Approval rate is single-digits per week (per memory), so the unmitigated risk is small but not zero. **Decision: coordinate a brief approval pause for PR-2's production apply.** Operationally simple: notify reviewers in advance, the apply window is ~5 minutes including verification, reviewers can resume approvals once the post-deploy drift query is clean. A grant/revoke dance was considered (Path B) and rejected — it adds choreography that could leave the review workflow blocked if a migration fails mid-sequence. **Run the post-deploy drift query regardless** as the little broom in the corner if a writer call was already in flight when the pause started: `SELECT COUNT(*) FROM lessons WHERE created_at >= <migration_start_time> AND (jsonb_typeof(metadata->'lessonFormat') = 'array' OR jsonb_typeof(metadata->'academicIntegration') = 'object');` — expected zero. If non-zero, run the same shape-coercion UPDATE from Migration 2 against just those rows.

After this PR, every future write to `lessons` (RPC, MCP, manual SQL, scripts) goes through the trigger and produces canonical column⇄metadata pairs.

### Migration 1: writer fix in `complete_review_atomic`

Rewrite both the `v_legacy_meta` builder AND the column-derivation arguments in `complete_review_atomic`. The current deployed code has TWO bugs the agent flagged:

**Bug A (metadata):** `v_legacy_meta` writes `metadata.lessonFormat` as a single-element array and `metadata.academicIntegration` as pass-through.

**Bug B (column):** `_phase4_jsonb_text_array(v_meta->'academicIntegration')` falls into the helper's ELSE branch when the input is an object (`{selected: [...]}`), producing `ARRAY['{"selected": ["Math"]}']` — the JSON object stringified into a single text element. That's a broken `academic_integration` column. Then if/when the trigger lands in Migration 4 with column-wins precedence, the BAD column would force the metadata back to the broken value.

Both surfaces need the same canonicalization at write time. Specific changes:

```sql
-- v_legacy_meta builder (BEFORE → AFTER):

-- BEFORE
'lessonFormat',
  CASE WHEN v_meta ? 'lessonFormat' AND COALESCE(v_meta->>'lessonFormat', '') <> ''
       THEN jsonb_build_array(v_meta->>'lessonFormat')           -- ARRAY: drifted
       ELSE '[]'::jsonb END,
'academicIntegration',
  COALESCE(v_meta->'academicIntegration', '[]'::jsonb),          -- pass-through: drift-prone

-- AFTER
'lessonFormat',
  CASE WHEN v_meta ? 'lessonFormat' AND COALESCE(v_meta->>'lessonFormat', '') <> ''
       THEN to_jsonb(v_meta->>'lessonFormat')                    -- SCALAR: canonical
       ELSE 'null'::jsonb END,
'academicIntegration',
  CASE jsonb_typeof(v_meta->'academicIntegration')
    WHEN 'array'  THEN v_meta->'academicIntegration'             -- already flat
    WHEN 'object' THEN COALESCE(v_meta->'academicIntegration'->'selected', '[]'::jsonb)
    ELSE '[]'::jsonb
  END,

-- Column derivation for academic_integration (BEFORE → AFTER):

-- BEFORE
academic_integration = _phase4_jsonb_text_array(v_meta->'academicIntegration'),

-- AFTER (both INSERT and UPDATE branches)
academic_integration = _phase4_jsonb_text_array(
  CASE jsonb_typeof(v_meta->'academicIntegration')
    WHEN 'object' THEN COALESCE(v_meta->'academicIntegration'->'selected', '[]'::jsonb)
    ELSE v_meta->'academicIntegration'
  END
),
```

Plus parallel scrutiny of any other field where the React form might pass an unexpected shape. The metadata builder is built once and reused for both INSERT (approve_new) and UPDATE (approve_update) branches; the column derivation appears in both branches separately and both must be updated.

Use `CREATE OR REPLACE FUNCTION` (signature unchanged, no DROP needed). Granted permissions preserved by REPLACE. The Phase 4 file `20260428000007` and `20260428000008` both contain the same array-shape bug — this PR-2 migration supersedes their `v_legacy_meta` block.

Pre-flight check: confirm no Phase 5+ migration has further mutated `complete_review_atomic` between draft and merge. As of 2026-04-28, deployed source matches `20260428000008`.

**Writer-roundtrip test matrix** (run on TEST DB after Migration 1 applies, BEFORE Migration 2):

For each of these reviewer-payload shapes, call `complete_review_atomic` via service-role MCP, then assert column + metadata are both canonical:

| Test | `v_meta.academicIntegration` input | Expected `metadata.academicIntegration` | Expected `academic_integration` column |
|---|---|---|---|
| 1 | `["Math", "Science"]` (flat array) | `["Math", "Science"]` | `ARRAY['Math', 'Science']` |
| 2 | `{"selected": ["Math"]}` (object) | `["Math"]` | `ARRAY['Math']` |
| 3 | `null` or omitted | `[]` | `ARRAY[]::text[]` |
| 4 | `{"selected": []}` (empty object) | `[]` | `ARRAY[]::text[]` |

Plus: `lessonFormat` input `'Single period'` → metadata `"Single period"` (scalar) and column `'Single period'` (text). NOT array.

These tests are part of PR-2's TEST DB rehearsal block. They prove both bugs are closed before backfill runs.

### Migration 2: backfill historical drift rows

Idempotent SQL. For the 81 short-key rows: promote `themes`/`season`/`location` to long-form keys with scalar-to-array coercion. For pre-Phase-4 rows where `metadata.academicIntegration` is `{selected: [...]}`: unwrap to flat array (canonical going forward). The 14 rows with long-form keys + flat-array AI stay as-is (already canonical). For the 1 array-shape `lessonFormat` outlier: unwrap to scalar.

```sql
-- Long-form key promotion (handles scalar→array coercion for the 16 season-string and all 81 location-string rows)
UPDATE lessons
SET metadata = metadata
  - 'themes' - 'season' - 'location'
  || jsonb_build_object(
       'thematicCategories', COALESCE(
         metadata->'thematicCategories',
         CASE jsonb_typeof(metadata->'themes')
           WHEN 'array'  THEN metadata->'themes'
           WHEN 'string' THEN jsonb_build_array(metadata->>'themes')
           ELSE '[]'::jsonb
         END
       ),
       'seasonTiming', COALESCE(
         metadata->'seasonTiming',
         CASE jsonb_typeof(metadata->'season')
           WHEN 'array'  THEN metadata->'season'
           WHEN 'string' THEN jsonb_build_array(metadata->>'season')
           ELSE '[]'::jsonb
         END
       ),
       'locationRequirements', COALESCE(
         metadata->'locationRequirements',
         CASE jsonb_typeof(metadata->'location')
           WHEN 'array'  THEN metadata->'location'
           WHEN 'string' THEN jsonb_build_array(metadata->>'location')
           ELSE '[]'::jsonb
         END
       )
     )
WHERE metadata ?| ARRAY['themes', 'season', 'location'];

-- AcademicIntegration object-shape unwrap to flat array (canonical)
UPDATE lessons
SET metadata = jsonb_set(
  metadata, '{academicIntegration}',
  COALESCE(metadata->'academicIntegration'->'selected', '[]'::jsonb)
)
WHERE jsonb_typeof(metadata->'academicIntegration') = 'object';

-- lessonFormat: unwrap any single-element array shape to scalar (handles the 1 production outlier `["standalone"]`)
UPDATE lessons
SET metadata = jsonb_set(
  metadata, '{lessonFormat}',
  to_jsonb(metadata->'lessonFormat'->>0)
)
WHERE jsonb_typeof(metadata->'lessonFormat') = 'array' AND jsonb_array_length(metadata->'lessonFormat') = 1;
```

Verification on TEST DB after apply:

```sql
SELECT
  COUNT(*) FILTER (WHERE metadata ?| ARRAY['themes', 'season', 'location'])           AS short_keys_remaining,
  COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'object')    AS object_shape_remaining,
  COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'lessonFormat') = 'array')            AS array_lesson_format_remaining
FROM lessons;
-- Expected: 0, 0, 0
```

### Migration 3: column-data hygiene

Two specific cleanups based on production probe:

1. **`activity_type` location-leak outliers (17 rows).** 14 rows have `activity_type = ARRAY['indoor']`, 3 have `ARRAY['outdoor']`. Suspected pre-Phase-4 import path bug. Remediation: cross-check those rows' `metadata->>'activityType'` and `location_requirements` to determine the correct value or NULL. **Investigation step before this migration drafts: query the 17 rows to confirm which canonical value (if any) they should have. Some may need manual mapping.** Worst-case fallback: set `activity_type = ARRAY[]::text[]` (drop the leaked value entirely; `complete_review_atomic` will populate correctly on next approve_update).
2. **`academic_integration` column-vs-meta mismatches (~7 rows).** 5 rows have meta data but null column; 4 rows have column values not in meta. Re-derive `academic_integration` column from `metadata->'academicIntegration'` (now canonical flat array post-Migration 2) where the column is null but meta has data.

### Migration 4: install + enable normalization trigger

Define `lessons_normalize_write()` and attach as a `BEFORE INSERT OR UPDATE` trigger on `lessons`. Created and enabled in one step (no `DISABLE` dance needed — the table is fully canonical at this point).

The trigger function:

1. **Enforces column⇄metadata sync with explicit precedence: column wins.** For each filter-relevant field, if `NEW.<column>` and `NEW.metadata->'<key>'` disagree (or only one is populated), force them to match using the column value. The column is more constrained (typed `text[]` or `text`), so it's the more reliable surface.
   - Column populated, metadata missing or different shape → derive `NEW.metadata->'<key>'` from `NEW.<column>` (canonical shape).
   - Metadata populated, column NULL/empty → derive `NEW.<column>` from `NEW.metadata->'<key>'` (handles legacy direct-metadata writers).
   - Both populated and disagree → column wins; metadata gets rewritten to match. Raise `NOTICE`.
2. **Coerces drifted shapes proactively** — if `NEW.metadata->'lessonFormat'` arrives as `["x"]`, coerce to scalar `"x"`. If `NEW.metadata->'academicIntegration'` arrives as `{selected: [...]}`, flatten to `[...]`. Short-list of known shape problems baked into the function, not generic JSON manipulation.
3. **Logs `RAISE NOTICE` on every coercion.** Silent coercion makes drift immortal. Each notice carries `(table_id, column_or_key, before_shape, after_shape)`. Captured by Supabase's log streams.

The baseline has `handle_lessons_metadata_write()` (defined in `20251001_production_baseline_snapshot.sql:465`) but unattached. **Define a new `lessons_normalize_write()` rather than reuse the baseline function** — easier to audit and rollback; baseline function stays as historical artifact.

Trigger-fired-on-canonical-input verification (TEST DB): insert a clean row via `complete_review_atomic` post-Migration 4, confirm zero NOTICE entries in the logs. Insert a deliberately-drifted row via direct SQL (`INSERT INTO lessons (... metadata) VALUES (... '{"lessonFormat": ["Single period"]}')`), confirm exactly one NOTICE entry and the stored row has scalar lessonFormat.

### What's NOT in this PR

- No vocabulary changes. PR-3 owns that. The 17 activity_type rows get the leaked value cleared, not canonicalized to a new vocabulary.
- No `process-submission` changes. It doesn't write to `lessons` (writes only to `lesson_submissions` staging).
- No frontend changes.

## 6. Section 3 — Canonical vocabulary (PR-3)

Single PR shipping RPC alias-removal, data canonicalization migration, trigger vocabulary stage, and `filterDefinitions.ts` rewrite together. Atomicity prevents the zero-results window between "RPC stops accepting drift-era values" and "DB only contains canonical values."

### Canonical-form decisions (locked, with caveats)

| Field | Canonical form | Rationale |
|---|---|---|
| `lesson_format` (column + `metadata.lessonFormat`) | Title-Case-with-spaces (`Single period`, `Standalone`, `Multi-session unit`, etc.) | Corpus dominance (483/788 rows already this shape). The values *are* user-friendly labels. **Caveat: accepted for this repair, not a permanent taxonomy endorsement.** The `lessonFormat` semantic conflation issue (`project_lesson_format_conflated.md`) is real and still needs filter redesign — but that's out of scope here. |
| `activity_type` (column + `metadata.activityType`) | Stable bare nouns (`cooking`, `garden`, `academic`, `both`) | Decouples display ("Cooking Only") from storage ("cooking"). UI renders `label` from `filterDefinitions.ts`; storage value is just an identifier. Future label changes don't require migrations. The `-only` suffix was UI semantics, not category distinction. |
| `cooking_methods` (column + `metadata.cookingMethods`) | Lowercase nouns (`stovetop`, `oven`, `basic-prep`, `no-cook`, etc.) | Same display-label decoupling as activity_type. Plus corpus already has casing chaos (`Stovetop`/`stovetop`/`Sautéing`); lowercase normalization is the cleanest collapse. Outliers (`Sautéing`, `Stovetop (sautéing, boiling, simmering)`, `Steam`) get explicit manual maps in the migration (3 rows total). |
| `cultural_heritage` | **DEFERRED to PR-4** | Stakeholder-gated. PR-3 leaves heritage values untouched; PR-1's alias tolerance covers the immediate breakage. |

### Display-label separation

`filterDefinitions.ts` keeps its `{ value, label }` pattern. `value` becomes the canonical stored form; `label` is the user-facing display string. The UI was already rendering `label`; only the wire-protocol value changes:

```typescript
// Before:
{ value: 'cooking-only', label: 'Cooking Only' }
// After:
{ value: 'cooking',      label: 'Cooking Only' }
```

### Data migration (covers BOTH columns AND metadata)

Idempotent UPDATE that maps existing values to canonical, applied to both surfaces:

```sql
-- lesson_format: scalar drift → Title Case
UPDATE lessons SET
  lesson_format = CASE lesson_format
    WHEN 'standalone'        THEN 'Standalone'
    WHEN 'mobile-education'  THEN 'Mobile education format'
    WHEN '["standalone"]'    THEN 'Standalone'
    ELSE lesson_format
  END,
  metadata = jsonb_set(metadata, '{lessonFormat}',
    CASE metadata->>'lessonFormat'
      WHEN 'standalone'        THEN '"Standalone"'
      WHEN 'mobile-education'  THEN '"Mobile education format"'
      WHEN '["standalone"]'    THEN '"Standalone"'
      ELSE metadata->'lessonFormat'
    END
  )
WHERE lesson_format IN ('standalone', 'mobile-education', '["standalone"]')
   OR metadata->>'lessonFormat' IN ('standalone', 'mobile-education', '["standalone"]');

-- activity_type: location-leaks already cleaned in PR-2; here we'd handle any lingering drift values
-- (corpus showed cooking/garden/both/academic dominant; suffix-stripping migrations apply if any '-only' values entered post-PR-2)

-- cooking_methods: array element-wise lowercasing + outlier mapping.
-- ARRAY(SELECT ...) instead of array_agg to avoid the empty-input → NULL gotcha
-- (array_agg returns NULL for zero input rows; ARRAY(SELECT ...) returns {}).
UPDATE lessons SET
  cooking_methods = ARRAY(
    SELECT DISTINCT
      CASE x
        WHEN 'Stovetop'                                  THEN 'stovetop'
        WHEN 'Oven'                                      THEN 'oven'
        WHEN 'Basic prep only'                           THEN 'basic-prep'
        WHEN 'No-cook'                                   THEN 'no-cook'
        WHEN 'Sautéing'                                  THEN 'stovetop'
        WHEN 'Stovetop (sautéing, boiling, simmering)'   THEN 'stovetop'
        WHEN 'Steam'                                     THEN 'stovetop'
        ELSE lower(x)
      END
    FROM unnest(cooking_methods) x
  )
WHERE cooking_methods IS NOT NULL AND array_length(cooking_methods, 1) > 0;

-- Same transform applied to metadata.cookingMethods. Use jsonb_agg over jsonb_array_elements_text → CASE,
-- with COALESCE(jsonb_agg(...), '[]'::jsonb) to avoid the same empty-input → NULL gotcha.
UPDATE lessons SET
  metadata = jsonb_set(metadata, '{cookingMethods}',
    COALESCE(
      (SELECT jsonb_agg(DISTINCT
        CASE x
          WHEN 'Stovetop'                                THEN 'stovetop'
          WHEN 'Oven'                                    THEN 'oven'
          WHEN 'Basic prep only'                         THEN 'basic-prep'
          WHEN 'No-cook'                                 THEN 'no-cook'
          WHEN 'Sautéing'                                THEN 'stovetop'
          WHEN 'Stovetop (sautéing, boiling, simmering)' THEN 'stovetop'
          WHEN 'Steam'                                   THEN 'stovetop'
          ELSE lower(x)
        END
       )
       FROM jsonb_array_elements_text(metadata->'cookingMethods') x),
      '[]'::jsonb
    )
  )
WHERE jsonb_typeof(metadata->'cookingMethods') = 'array' AND jsonb_array_length(metadata->'cookingMethods') > 0;
```

### RPC update

- Remove the `_alias_*` helpers from PR-1 (no longer needed).
- Direct column comparisons: `l.lesson_format = filter_lesson_format`, `l.activity_type && filter_activity_type`, `l.cooking_methods && filter_cooking_method`.
- The metadata-reconstruction block stays (still serves the facet-count-correctness goal).

### Trigger update (PR-2 → PR-3 evolution)

The PR-2 normalization trigger gets a vocabulary-canonicalization stage prepended: input `'cooking-only'` → coerce to `'cooking'`; input `'Stovetop'` → coerce to `'stovetop'`; etc. Same lookup table the data migration uses, kept in a SECURITY DEFINER `_canonicalize_*` helper so updates can be audited.

### `filterDefinitions.ts` rewrite

Mechanical: update `value` fields to canonical form. `label` fields stay user-friendly. The components rendering filters (`IntSidebar`, `IntActivePills`, etc.) already use `label` for display, so no UI changes beyond `filterDefinitions.ts`.

### `facetCounts.ts:55` hardening

The deferred `Array.isArray` check on `lessonFormat` (per `MEMORY.md`). After PR-3, no lesson has array-shape `lessonFormat` (the 1 outlier row is canonicalized in this migration). The defensive check can be removed — but the RPC's metadata reconstruction makes `facetCounts.ts` largely a no-op anyway since results come pre-canonicalized.

## 7. Section 4 — Cultural heritage (PR-4, GATED)

Out of scope for the immediate repair. Captured here for completeness.

### What's broken (recap)

- `cultural_heritage_hierarchy` table uses Title Case parents (`Asian`, `Latin American`).
- `filterDefinitions.ts` uses kebab-case slugs (`asian`, `latin-american`).
- Production data is mostly Title Case (`Americas` 174, `North American` 86, `Asian` 66, `East Asian` 36) with 13 stragglers in slug form.
- Long tail of corpus values has no `filterDefinitions.ts` representation: `Mexican` 41, `Italian` 26, `African American` 25, `Mediterranean` 42, `Indigenous` 24, `Lenape` 7, etc.

### Why deferred

- Canonical-form choice (slug or Title Case) interacts with hierarchy-depth decisions (is `Mexican` a first-class filter or a `Latin American` child?).
- Hierarchy-depth interacts with curriculum priorities — needs explicit team input.
- PR-1's heritage alias tolerance covers the immediate user-visible breakage.

### What PR-4 would contain (placeholder)

- Stakeholder conversation on canonical form + hierarchy depth.
- Migration canonicalizing heritage values across all 731 rows that have the field (both column and metadata).
- `cultural_heritage_hierarchy` table rebuild.
- `filterDefinitions.ts` heritage section rewrite.
- Removal of any heritage-specific alias tolerance from PR-1.

## 8. Section 5 — Migration / shipping strategy

### PR breakdown

| # | PR | Contains | Risk |
|---|---|---|---|
| 1 | **Column-based RPC + alias tolerance** | 1 migration: column-based `search_lessons`, partial metadata reconstruction with per-field COALESCE, alias helpers, `DROP/CREATE/GRANT/NOTIFY pgrst` mechanics, regenerated `database.types.ts` | Defensive only; widens matches, never narrows. RPC change only, no data side effects. Result-row contract changes (metadata reconstructed) but stays jsonb-shaped. |
| 2 | **Writer fix + column hygiene + trigger** | 4 migrations sequenced to prevent drift gaps (writer fix → backfill → column hygiene → install + enable trigger). Plus writer-roundtrip TEST DB verification matrix. | Data-touching but each migration is idempotent. Trigger is soft-coerce-with-NOTICE. Order matters: writer fix lands first so subsequent migrations apply to a no-longer-drifting table. |
| 3 | **Canonical vocabulary** | 1 migration (data canonicalization across columns + metadata) + RPC alias removal + `filterDefinitions.ts` rewrite + trigger vocab stage + `facetCounts.ts` cleanup | Atomic frontend+backend change to avoid zero-results window. Idempotent migration. |
| 4 | **Heritage redesign** | TBD — gated on stakeholder | Deferred. |

### Gap risk between PRs

- **PR-1 → PR-2 gap**: small but real. PR-1's column-based filter works on the existing column data, which is mostly canonical for shape. But every approval through the live `complete_review_atomic` adds a new row with array-shape `metadata.lessonFormat` and pass-through-shape `metadata.academicIntegration`. PR-1's metadata reconstruction handles the read-side correction, but the underlying drift continues to grow. **Mitigation:** ship PR-2 within ~1 week of PR-1, OR pause approvals if the gap stretches longer (low-volume; pre-Phase-4 cohort hasn't grown in 7+ months so this is unlikely to be urgent in practice).
- **PR-2 → PR-3 gap**: zero. After PR-2, all rows are canonical-shape AND the writer produces canonical-shape going forward. Vocabulary is still drifted, but PR-1 aliases handle that.
- **Inside PR-2**: ordering matters. The writer fix (Migration 1) must apply before any other PR-2 migration so there's no window where the trigger is installed but the writer still produces drift. The trigger arrives last (Migration 4) to a fully-canonical table — no `DISABLE`/`session_replication_role` dance needed. The residual concern is a `complete_review_atomic` call landing in the few-second window during Migration 1's apply itself; mitigation is in §5 (low traffic + post-deploy verification query).
- **Inside PR-3**: gap risk concentrates here. Migration must run BEFORE the RPC removes its alias helpers; CI must apply migration before deploy preview gets the new RPC. Standard atomic deploy, but worth explicit pre-flight checking.

### TEST DB rehearsal

Each PR ships a verification query block in the PR description, run via `mcp__supabase-test__execute_sql` after CI applies the migration. **These verification queries hit the real RPC against TEST DB data — that's the only way to validate filter semantics; frontend integration tests can only validate parameter passing, not RPC behavior.**

- **PR-1**: 9-row test matrix mirroring the 2026-04-28 production verification (`lessonFormat=single-period`, `lessonFormat=Single period`, `activityType=cooking-only`, `activityType=cooking`, `cookingMethods=stovetop`, `cookingMethods=Stovetop`, `academicIntegration=Math`, `culturalHeritage=asian`, baseline). After PR-1, all of these should return non-zero hits matching documented true counts (or close — alias helpers widen matches). Plus: spot-check that result-row `metadata.lessonFormat` is scalar (`"Single period"`) rather than array (`["Single period"]`) for at least one returned row, confirming reconstruction is working.
- **PR-2**: shape-residue queries. Expected: 0 short-key rows, 0 object-shape AI rows, 0 array-shape `lessonFormat` rows. Plus: insert a test row through `complete_review_atomic` in TEST DB (via service-role MCP), confirm both column and metadata land canonically. Plus: insert a deliberately-drifted row directly via SQL, confirm the trigger coerces it and emits a NOTICE.
- **PR-3**: same matrix as PR-1 plus distinct-values check on `lesson_format` / `activity_type` / `cooking_methods` columns. Expected: only canonical values.

### Rollback paths

- **PR-1**: forward-rollback migration that restores the prior `search_lessons` body. Idempotent. RPC change only, no data touched. The signature change requires a `DROP FUNCTION search_lessons(... new sig ...)` then `CREATE FUNCTION ... old sig ...` — non-trivial but mechanical.
- **PR-2**: writer fix is one CREATE OR REPLACE — easily reverted by re-applying the prior `complete_review_atomic` definition. Backfill is one-way (the short-keys are gone). If trigger catastrophe: `ALTER TABLE lessons DISABLE TRIGGER lessons_normalize_write;` removes its effect immediately. Backfilled data stays normalized either way.
- **PR-3**: same one-way data-migration concern. If vocabulary canonicalization needs to be undone, recovery is "ship a new migration that restores the prior vocabulary." The PR-1 alias tolerance is gone in PR-3, so a partial rollback would also need to re-add aliases.

### Per-PR ritual

Per `feedback_pr_bot_review_workflow.md`:

1. Pre-push reviewer agent dispatch (catch RPC-syntax bugs, missing GRANT, etc.)
2. Push → open PR
3. CI applies migration to TEST DB; deploy preview builds
4. Wait for external bot reviewers (claude-review, copilot, codex)
5. Four-surface comment triage (`pulls/<PR>/comments`, `pulls/<PR>/reviews`, `issues/<PR>/comments`, the PR description itself)
6. Investigate every finding (rebuttal pass per `feedback_bot_review_investigation.md`)
7. Consolidated fix-up commits per round
8. Per-round TEST DB re-verification (per `feedback_per_round_test_db_verification.md` — re-run verification queries after every DB-affecting fix-up)
9. Round-cap after 2 rounds; stalemate → escalate

### Known issues / pre-existing flakes

- `migrate-production.yml` Apply-step SASL flake: confirmed pattern (PR #468 2026-04-28). Mitigation: rerun the failed Apply job; verify post-apply state via `mcp__supabase-remote__execute_sql` regardless. Migrations are idempotent.
- `migrate-production.yml` Verify-step SASL flake: cosmetic; PROD MCP verification is the real check.
- Edge-function deferred-approval ordering hazard: not directly relevant since PR-1/2/3 don't change edge functions, but worth flagging if PR-2's complete_review_atomic-related verification interacts with any in-flight edge function deploys.

## 9. Section 6 — Testing strategy

**Layered approach with explicit boundaries.** Frontend tests can validate parameter-passing and component rendering; they CANNOT validate RPC filter semantics because the supabase client is mocked. Real semantic validation requires hitting a real Postgres instance — TEST DB via MCP is the practical way to do that in this project's CI.

### TEST-DB SQL verification (the authoritative semantics layer)

Each PR's PR-description includes a verification SQL block run via `mcp__supabase-test__execute_sql` after CI applies the migration (per `feedback_per_round_test_db_verification.md` — re-run after every fix-up commit too):

- **PR-1**: 9-row `search_lessons` test matrix (see §8 TEST DB rehearsal). Confirms RPC behavior end-to-end against TEST data.
- **PR-2**: shape-residue + writer-roundtrip + trigger-coercion checks (see §8). Confirms backfill, writer fix, and trigger all work against TEST data.
- **PR-3**: same as PR-1 plus distinct-values check on canonical surfaces.

This is the layer that catches RPC bugs. Integration and unit tests cannot.

### Unit

- `facetCounts.test.ts` — reduce; after PR-3, the RPC returns canonical-metadata so `facetCounts.ts` becomes simple aggregation. Existing tests should still pass (canonical metadata is a strict subset of what the tests assume).
- `filterDefinitions.test.ts` — update vocabulary assertions in PR-3.

### Integration

- `lesson-search.params.test.tsx` — currently a parameter-passing check (mocked supabase client). Keep as-is for what it does well (catches breaking changes in the hook → RPC param contract). **Don't expand it to claim semantic coverage** — fixture rows with `cooking_methods = ARRAY['stovetop']` proves nothing about filter behavior unless the test actually hits a real RPC. Use the TEST-DB SQL verification layer instead for semantic claims.
- Possible new: SQL-level tests via pgTAP or a small custom harness against the local Docker DB. Worth considering for PR-3 (vocabulary canonicalization is the most regression-prone change). Deferred unless a regression actually slips through MCP-based verification.

### E2E

- Playwright smoke per filter category, asserting non-zero result counts on canonical filter values. Especially valuable for PR-1 verification (most filters go from "0 hits" to "real counts" in one merge). E2E hits the real Netlify deploy preview against TEST DB, so it doubles as a fresh-runtime check on the same RPC the SQL verification block tested.

### RLS

- No RLS changes. `npm run test:rls` must pass unchanged.

### Manual smoke

After each PR, on the deploy preview:
- Click each filter category, confirm result counts match the TEST-DB verification matrix.
- After PR-1: `Single period` lessonFormat → ~483 results. `Cooking Only` activityType → ~299. `Stovetop` cookingMethods → ~177. `Math` academicIntegration → ~189 (102 legacy + 87 review-era).

## 10. Out of scope (captured for future work)

- **`lessonFormat` semantic conflation** (`project_lesson_format_conflated.md`) — single-select forces one value when both time-structure and context-independence often apply. Filter redesign, not drift repair.
- **`grades_taught` / `subjects_taught` non-consultation** (`project_grades_subjects_unused.md`).
- **Cultural heritage vocabulary canonicalization (PR-4)** — gated on stakeholder input.
- **`cultural_heritage_hierarchy` table redesign** — coupled to PR-4.
- **New filter categories** — stakeholder consult is its own decision.
- **Search ranking changes (`rank` calculation)** — unrelated.
- **Embedding-pipeline mismatch** (`project_embedding_pipeline_mismatch.md`) — separate active follow-up.
- **`@lhci/cli` upgrade, Supabase CLI version pinning, etc.** — `MEMORY.md` "Open hygiene follow-ups" — unrelated.
- **Audit-table observability for trigger coercion** — current design uses `RAISE NOTICE` to logs; an audit table is a possible PR-2-round-2 addition if log-only proves insufficient.

## 11. References

### Code
- `supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357` — current `search_lessons` definition.
- `supabase/migrations/20251001_production_baseline_snapshot.sql:465` — `handle_lessons_metadata_write` (defined but unattached).
- `supabase/migrations/20260428000003_phase_4_complete_review_atomic_rpc.sql` — Phase 4 RPC original.
- `supabase/migrations/20260428000007_phase_4_fix_metadata_shape.sql` — Phase 4 RPC shape-canonicalization fix.
- `src/utils/filterDefinitions.ts:22-211` — current UI filter vocabulary.
- `src/hooks/useLessonSearch.ts:81-130` — frontend → RPC param mapping.
- `src/utils/facetCounts.ts` — facet computation.

### Memory
- `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/MEMORY.md` — `project_lesson_format_conflated.md`, `project_grades_subjects_unused.md`, `feedback_data_safety_top_priority.md`, `feedback_workflows_not_sacred.md`.

### Plans
- `2026-04-28-filter-metadata-drift-repair-design-v1-jsonb.md` — archived v1 (JSONB-as-source-of-truth approach), preserved for audit trail.
- `~/.claude/plans/lesson-submission-tier1-implementation.md` — Phase 5/6/8b context for review-era metadata.

### Investigation
- This session's chat (2026-04-28) — concrete production verification numbers cited in §1, including the 9-row RPC test matrix and the cohort-frozen-at-2025-09-01 finding.
