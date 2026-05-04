# Metadata Rebuild — Foundation Phase — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Ship the foundation-phase substrate of the metadata rebuild — schema + vocabulary canonicalization + LLM submission-time auto-tag pipeline + corpus refresh + import-drop cleanup — that downstream Stage 1 worksheet validation, Stage 2 corpus re-tag, and Phase 2 reviewer UX work all depend on.

**Architecture:** D0's hybrid frame (foundation-now / reviewer-UX-later). Code track ships schema + pipeline + cleanup before D4 vocab canonicalization migrates (which gates on Stage 1 worksheet outputs). Stage 2 corpus re-tag follows D4. Two parallel tracks: code (this plan) and curriculum-team-driven worksheet round.

**Design reference:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md`. Read it before starting any task. Decision journal (authoritative WHY): `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`.

**Tech Stack:** TypeScript / React 19 / Vite (frontend), Supabase / PostgreSQL (database), Deno (edge functions), Vitest + Playwright (testing), Anthropic SDK + Pydantic (LLM tagging pipeline; Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`).

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — every code-bearing task is test-first
- `superpowers:verification-before-completion` — before claiming any task done, run the verification commands in that task's "Verify" step
- `superpowers:requesting-code-review` — between PRs (after PR 1, after PR 2, etc.)
- `database-migrations` — before touching any file in `supabase/migrations/` (mandatory)

**Per-PR ritual (mandatory, every PR):** see kickoff prompt's HARD RULES → PER-PR RITUAL section. Eight steps, four-surface comment triage, per-round TEST DB re-verification, round-cap after 2 rounds.

**How to use this plan:**
- Each task has: ID, file paths, anchor symbols, code snippets, test commands, commit message template.
- Execute in order unless explicitly noted as parallelizable.
- Verify every snippet against the current code before applying — line numbers, imports, types, prop names, and APIs may have drifted since the plan was written. Small repo-conformance adaptations are allowed; product or design changes require stopping to ask.
- **Tasks marked TBD** depend on Stage 1 worksheet outputs or implementation-time decisions; expand them when the dependency lands.

## PR breakdown

**Pre-PR-1 Gates (no PR; investigation/decision tasks before PR 1 starts):**

| Gate | What it produces |
|---|---|
| **A — lessonFormat dependency sweep** | Per-surface task list folded into PR 1's task breakdown. Initial sweep (~95 surfaces, verified by Opus agent) documented; verify in current repo before PR 1. |
| **B — Validator architecture decision** | Confirm Option B (TS/Zod canonical, per design doc §5); scaffold `src/types/lessonMetadata.zod.ts`; decide where `enums.json` mirror lives for Pydantic; decide cross-runtime equivalence-test approach. |
| **C — Per-prompt readiness audit** | Each ~6 candidate field beyond the locked 3 + gated 2 classified as vocab-locked, Stage-1-gated, or dropped from foundation-phase scope. |

| PR | Title | Contains | Notes |
|---|---|---|---|
| 1 | **Structural schema + lessonFormat dependency sweep** | D2 enum + D3 full column drop coordinated across 4 RPCs + view + trigger + helper + ~30 TS surfaces + D6 series_id/part_number + D7 tags enum + D9 crf_confirmed + filter UI sidebar updates + Zod canonical scaffolding (Gate B output) | Largest blast radius. Multi-task PR; per-surface tasks per Gate A output. Idempotent migration. Forward-rollback ready. |
| 2 | **Submission-time LLM auto-tag — vocab-locked prompts** | `process-submission` edge function expansion; eval-gate harness; CRF + activity_type + tags prompts (and any additional vocab-locked fields per Gate C) | Per-prompt eval gates before each goes live. Stage-1-gated prompts deploy after corresponding worksheets land — separate post-foundation deploys, not new PRs unless infrastructure changes. |
| 3a | **Search infra now (D5 — independent of Stage 1)** | `search_vector` rebuild including academicConcepts; embedding generation script update; smart-search drift resolution | Independent of PR 4+. |
| 3b | **Search synonym population (depends on Stage 2 re-tag outputs)** | Populate `search_synonyms` with everyday↔framework vocab pairs from Stage 2 re-tag | Folds into PR 6+ Stage 2 work track. |
| 4 | **Corpus drops + archive-concepts recovery + N1 retitle** | 23 third-party-curriculum imports retired; archive academicConcepts recovery migration; FSA retitle | Pre-Stage-2 sequencing so re-tag operates on clean+complete corpus. |
| 5+ | **D4 vocab canonicalization** | Per-field canonical translation; Zod canonical source extended with worksheet outputs; Pydantic enums refreshed via `enums.json`; SQL CHECK / trigger value-validation tightened | TBD — depends on Stage 1 worksheet outputs (heritage first, then concepts, then ~8 smaller fields). |
| 6+ | **Stage 2 corpus re-tag + reviewer validation flow** | Opus re-tag pipeline; Pydantic-validated all 17 fields (mirroring Zod); corpus run on ~749 lessons; QC floor (50-100 spot-check); broader reviewer-validation flow per the deferred walk | TBD — depends on PR 5 + Stage 1 closure + Stage 2 reviewer-validation UX walk. Flexible timing per Cross-cutting Scope 3. |

---

## Pre-PR-1 Gates

These three gates run before PR 1 branches. They are investigations / decisions, not code-bearing PRs. Output of each gate gets folded into the PR 1 task breakdown.

### Gate A — lessonFormat dependency sweep (verify in current repo)

The Opus agent investigation produced a comprehensive surface inventory (~95 references across 50+ files). Before PR 1, re-verify in current repo (line numbers may have drifted; new references may have been added since the sweep):

**Steps:**
1. `grep -rn "lessonFormat\|lesson_format" src/ supabase/ scripts/` and categorize every hit by surface type.
2. Cross-check against the agent inventory categories:
   - Frontend reads (IntCard, IntListRow, AdminDuplicateReview)
   - Frontend writes (ReviewDetail, ReviewMetadataForm)
   - Frontend filters (IntSidebar, filterDefinitions, filterUtils, ScreenReaderAnnouncer)
   - State management (searchStore, useLessonSearch, useLessonSuggestions, facetCounts)
   - Edge function shared (`_shared/search-helpers.ts`)
   - SQL writes/RPC (4 RPC functions, normalize trigger, legacy `handle_lessons_metadata_write` trigger, `archive_duplicate_lesson`, multiple migration write paths in 20260428/20260429/20260430/20260501/20260502/20260505/20260506/20260507/20260509/20260510)
   - View (`lessons_with_metadata`)
   - TypeScript types (`src/types/index.ts:35,61,116`, `database.types.ts`)
   - Tests (~6 fixture files)
   - Scripts + seed
3. Output a categorized per-surface task list. Each item gets its own task in PR 1 (or a small batch for trivially-related items).
4. Verify reviewer's specific cited references still match: `ReviewDetail.tsx:978`, `useLessonSearch.ts:115`, `complete_review_atomic` migration line 128.

**Decision points raised by sweep:**
- `lesson_archive.lesson_format` column — keep historical archive vs drop alongside live column? (Default: keep archive — historical preservation; document in PR 1 commit.)
- Duplicate-detection RPC returns `lesson_format` — need to update return shape and AdminDuplicateReview consumer.

**Output:** per-surface task list appended to PR 1 below.

**No commit** — investigation only. Findings logged in execution status.

### Gate B — Validator architecture decision (Option B confirmation + scaffold)

Per design doc §5: TS/Zod canonical source; Pydantic mirrors enums via generated `enums.json`; SQL CHECK + trigger value-validation hand-synced.

**Steps:**
1. Confirm Option B is the choice. Re-evaluate if any Stage-2-only constraint (e.g., "Pydantic must be canonical because v3 reuses it") changes the calculus.
2. Decide canonical Zod schema location: `src/types/lessonMetadata.zod.ts` or `src/types/metadata/index.ts`. (Recommend `src/types/lessonMetadata.zod.ts` for discoverability.)
3. Decide `enums.json` location: `scripts/generated/enums.json` or `src/types/generated/enums.json`. (Recommend `src/types/generated/` so it's discoverable from the canonical Zod source.)
4. Decide the generation script: `scripts/generate-enums-json.ts` reads the Zod schema and emits `enums.json`. CI step asserts the file is up-to-date.
5. Decide cross-runtime equivalence test: a Vitest test that imports the Zod schema and a JSON file mirroring the Pydantic enum lists; assert they match. (Or a Python script that loads `enums.json` and asserts Pydantic models use the same enum values, run in CI.)
6. Sketch the SQL CHECK / trigger extension shape: which columns get CHECK constraints (text[] columns where the enum is short and stable), which JSONB-embedded enum keys get value-validation in `lessons_normalize_write_trg`. Hand-synced from Zod source; document the sync discipline.

**Output:** a brief `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (≤200 lines) capturing the decisions above. Folded into PR 1 task list as a scaffolding task.

**No commit yet** — the scaffold lands in PR 1 as Task 1.0.

### Gate C — Per-prompt readiness audit

Per design doc §6: ~6 candidate fields beyond the locked 3 + gated 2 need per-field readiness audit. Don't pre-commit field list in design doc — Gate C decides.

**Steps:**
1. Enumerate the ~6 candidate fields. Possible candidates (verify against current schema): `thematic_categories`, `social_emotional_learning`, `cooking_methods`, `cooking_skills`, `garden_skills`, `season_timing`, `observances_holidays`, `main_ingredients`. Exclude: `grade_levels`, `location` (per design doc — defer to Phase 2 per session 9).
2. For each candidate, audit:
   - Is the canonical vocabulary settled today (no Stage 1 worksheet dependency)?
   - Is the body signal strong (LLM can extract reliably from lesson text)?
   - What is the current PROD distribution + drift level (per `project_vocabulary_drift_scope.md`)?
3. Classify each as: **vocab-locked** (ships in PR 2), **Stage-1-gated** (deploys after worksheet), or **dropped** (not foundation-phase scope).
4. For Stage-1-gated, identify which worksheet round gates each.

**Output:** per-prompt classification table folded into PR 2 task list.

**No commit** — investigation only. Classification logged in execution status.

---

## PR 1 — Structural schema

**Branch:** `feat/metadata-foundation-schema`

**What ships:** Schema migration adding `series_id` + `part_number` + `crf_confirmed` columns; dropping `lesson_format` column + 9 JSON-path indexes; rewriting `metadata` JSONB to remove `lessonFormat` key; expanding `activity_type` enum (in code) to 5 values including `craft`; expanding `tags` closed enum (in code) to `["orientation", "bilingual_handouts"]`; locking `cultural_responsiveness_features` enum to the 7 master-list features. Filter UI sidebar updated: lessonFormat section removed; "Lesson Type" tag-based filter added; Activity Type 5-value list.

**Why this is its own PR:** Schema-only change. Largest blast radius (touches 9 JSON-path indexes + JSONB rewrite). Pipeline (PR 2) and search infra (PR 3) depend on these columns existing. Forward-rollback migration ready before merge.

**Pre-flight: read these files first to verify current shape (line numbers may have drifted):**
- `supabase/migrations/CLAUDE.md` (entire — migration discipline)
- `src/utils/filterDefinitions.ts` (entire — filter declarations)
- Recent migrations affecting `lessons` / `metadata`: `ls supabase/migrations | tail -20`
- v3 taxonomy reference: `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md`
- Decision journal D2 / D3 / D6 / D7 / D9 sections

### Task 1.0: Land the Zod canonical scaffold (Gate B output)

**Sub-skill:** none (scaffolding)

**Files:**
- Create: `src/types/lessonMetadata.zod.ts` (or location chosen by Gate B)
- Create: `src/types/generated/enums.json` (initial placeholder; populated by the generation script)
- Create: `scripts/generate-enums-json.ts` (reads Zod schema → emits enums.json)
- Edit: `package.json` to add the npm script + a CI check
- Create: `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (Gate B output)

**Initial Zod content:** start with the closed enums that PR 1 expands or locks (activity_type 5 values, tags 2 values, CRF 7 master-list features, season_timing existing 4 values). Mark all other 13 fields as `z.array(z.string())` placeholders for now — they get tightened to closed enums as Stage 1 worksheets land (per PR 5+).

**Verify:** `npm run generate:enums` produces `enums.json` matching the Zod schema; `npm run type-check && npm run lint` clean.

**Commit:**
```bash
git add src/types/lessonMetadata.zod.ts src/types/generated/enums.json scripts/generate-enums-json.ts package.json docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md
git commit -m "feat(metadata-foundation): Zod canonical scaffold (Gate B)

Three-artifact validator architecture per design doc §5: TS/Zod canonical
+ enums.json mirror for Pydantic + SQL CHECK/trigger value-validation
hand-synced. Initial closed-enum scope: activity_type (5), tags (2),
cultural_responsiveness_features (7), season_timing (4); rest stay open
text[] until Stage 1 worksheets land."
```

### Task 1.1: Pre-migration corpus verification (TEST DB) — Gate A integration

**Sub-skill:** none (read-only)

**Goal:** Confirm corpus shape matches what the design assumes; verify the Gate A surface inventory against current repo before committing the per-surface task list to PR 1.

**Steps:**
1. Re-run `grep -rn "lessonFormat\|lesson_format" src/ supabase/ scripts/` and categorize every hit. Compare against Gate A's documented inventory (~95 surfaces); flag new/removed references.
2. Verify reviewer's three specific cited references match in current code: `ReviewDetail.tsx:978` (form field), `useLessonSearch.ts:115` (RPC param), `supabase/migrations/20260428000003_phase_4_complete_review_atomic_rpc.sql:128` (INSERT branch).
3. Verify activity_type column shape and current value distribution via `mcp__supabase-test__execute_sql` — confirm text[] storage; single-element on populated rows; no rows currently use `craft`.
4. Verify `tags` column is unused in production data via `mcp__supabase-test__execute_sql` — confirm null/empty on (almost) every row.
5. Verify `cultural_responsiveness_features` current shape and distribution.
6. Snapshot the lessonFormat-referencing indexes: `SELECT indexname, indexdef FROM pg_indexes WHERE indexname ~ 'lesson_format' OR indexdef ~ 'lessonFormat';`. Expect 2 results: `idx_lessons_format` (JSON-path) + `idx_lessons_lesson_format` (column-based). If more or fewer, investigate before proceeding.
7. Confirm `lesson_archive.lesson_format` column exists separately from `lessons.lesson_format` (it does, per Gate A) and document the keep-archive decision.

**Verify:** all hits have a documented disposition (drop / migrate / leave). Status doc updated with corpus shape evidence + per-surface PR 1 task list.

**No commit** — investigation only.

### Task 1.2: Migration file (additive: series_id + part_number + crf_confirmed)

**Sub-skill:** `database-migrations` (mandatory)

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_metadata_foundation_schema_additive.sql`

**Approach:**
1. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS series_id text` (default NULL).
2. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS part_number int` (default NULL).
3. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS crf_confirmed boolean DEFAULT false NOT NULL`.
4. `CREATE INDEX IF NOT EXISTS lessons_series_id_idx ON lessons(series_id) WHERE series_id IS NOT NULL`.
5. `CREATE INDEX IF NOT EXISTS lessons_part_number_idx ON lessons(part_number) WHERE part_number IS NOT NULL`.
6. Idempotent (every statement IF NOT EXISTS).

**Verify locally:**
```bash
supabase db reset
supabase db diff
```

**Commit:**
```bash
git add supabase/migrations/*_metadata_foundation_schema_additive.sql
git commit -m "feat(metadata-foundation): add series_id, part_number, crf_confirmed columns

D6 series modeling + D9 CRF backend marker. Additive only; no data migration.
See docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4."
```

### Task 1.3: lessonFormat removal — coordinated SQL migration

**Sub-skill:** `database-migrations` (mandatory)

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_drop_lesson_format.sql`

**Approach:** the migration is multi-stage and order-sensitive. Each step must succeed before the next runs (use a transaction).

1. **Recreate `lessons_with_metadata` view** — `CREATE OR REPLACE VIEW lessons_with_metadata AS SELECT ...` excluding `lesson_format`. The view is consumed by smart-search and search-lessons edge functions.
2. **Redefine 4 RPCs** — `search_lessons` (drop `filter_lesson_format text` parameter + the `l.lesson_format = ANY(...)` filter clause); `complete_review_atomic` (drop INSERT/UPDATE references to `lesson_format` column + `v_meta->>'lessonFormat'`); `get_lesson_details_for_review` (drop `lesson_format TEXT` from RETURNS TABLE + the SELECT projection); `archive_duplicate_lesson` (drop `lesson_format` from copy targets).
3. **Rewrite `lessons_normalize_write_trg`** — drop the column⇄metadata sync logic for `lessonFormat` (kept for the other 9 fields it covers).
4. **Drop `_alias_lesson_format`** SQL helper function.
5. **Drop indexes** — `DROP INDEX IF EXISTS idx_lessons_format` (JSON-path) + `DROP INDEX IF EXISTS idx_lessons_lesson_format` (column-based). Expect 2 indexes per Task 1.1 snapshot.
6. **Strip JSONB key** — `UPDATE lessons SET metadata = metadata - 'lessonFormat'`.
7. **Drop column** — `ALTER TABLE lessons DROP COLUMN IF EXISTS lesson_format`.
8. **Drop legacy `handle_lessons_metadata_write` trigger** if still attached (verify via `pg_trigger`); the M4 normalize trigger replaced it but legacy paths may still bind.
9. **`lesson_archive.lesson_format` decision per Gate A** — keep historical archive (default); add migration comment documenting the decision.

**Forward-rollback migration** prepared as a sibling `.sql.rollback` file: re-add column nullable; re-create indexes; restore RPC/view/trigger definitions. Metadata key restoration not feasible without snapshot — accepted.

**Verify locally:**
```bash
supabase db reset
# Confirm column dropped:
mcp__supabase-test__execute_sql: SELECT count(*) FROM information_schema.columns WHERE table_name='lessons' AND column_name='lesson_format';  -- expect 0
# Confirm JSONB key stripped:
mcp__supabase-test__execute_sql: SELECT count(*) FROM lessons WHERE metadata ? 'lessonFormat';  -- expect 0
# Confirm view recreated without column:
mcp__supabase-test__execute_sql: SELECT column_name FROM information_schema.columns WHERE table_name='lessons_with_metadata' AND column_name='lesson_format';  -- expect 0 rows
# Confirm RPCs recreated:
mcp__supabase-test__execute_sql: SELECT pg_get_function_identity_arguments('public.search_lessons'::regproc);  -- expect no filter_lesson_format
mcp__supabase-test__execute_sql: SELECT pg_get_functiondef('public.complete_review_atomic'::regproc) ~ 'lesson_format';  -- expect false
# Confirm legacy trigger detached:
mcp__supabase-test__execute_sql: SELECT count(*) FROM pg_trigger WHERE tgname ~ 'lesson_format' OR tgname = 'handle_lessons_metadata_write_trg';
# Confirm indexes dropped:
mcp__supabase-test__execute_sql: SELECT count(*) FROM pg_indexes WHERE indexname IN ('idx_lessons_format','idx_lessons_lesson_format');  -- expect 0
```

**Commit:**
```bash
git add supabase/migrations/*_drop_lesson_format.sql
git commit -m "feat(metadata-foundation): drop lesson_format coordinated removal

D3 — drop the lessonFormat field entirely. Coordinated removal:
view recreate (lessons_with_metadata), 4 RPCs redefined (search_lessons,
complete_review_atomic, get_lesson_details_for_review, archive_duplicate_lesson),
normalize trigger rewritten, _alias_lesson_format helper dropped, 2 indexes
dropped (idx_lessons_format JSON-path + idx_lessons_lesson_format column-based),
JSONB key stripped, column dropped. lesson_archive.lesson_format kept for
historical archive per Gate A decision. See design doc §4."
```

### Task 1.3b: lessonFormat removal — frontend + edge function sweep

**Files (all edits — verify against Gate A inventory):**
- Edit: `src/types/index.ts:35,61,116` — remove `lessonFormat` from `LessonMetadata`, `SearchFilters`, `ReviewMetadata` (or mark optional in archive type if `lesson_archive.lesson_format` kept; coordinate)
- Edit: `src/types/database.types.ts` — regen via `supabase gen types`
- Edit: `src/components/Internal/IntCard.tsx` — remove `lessonFormatLabel()` helper + `meta.lessonFormat` read + render
- Edit: `src/components/Internal/IntListRow.tsx` — same
- Edit: `src/components/Internal/IntSidebar.tsx:114-142` — remove `lessonFormat` filter section
- Edit: `src/utils/filterDefinitions.ts` — remove `FILTER_CONFIGS.lessonFormat`; remove `lessonFormat` from `ALL_FIELD_CONFIGS`
- Edit: `src/utils/filterUtils.ts:16,36` — remove from display name + icon maps
- Edit: `src/components/Common/ScreenReaderAnnouncer.tsx:29` — remove a11y announcement entry
- Edit: `src/stores/searchStore.ts:62` — remove from `initialFilters`
- Edit: `src/hooks/useLessonSearch.ts:49,115` — remove `lessonFormat` from `transformRow` projection + remove `filter_lesson_format` RPC param
- Edit: `src/hooks/useLessonSuggestions.ts:31,57` — remove from queryKey + smart-search edge body
- Edit: `src/utils/facetCounts.ts:16,31,54-55,77` — remove from `FacetFilterKey`, `EMPTY_COUNTS`, `valuesForKey`, `KEYS`
- Edit: `src/pages/ReviewDetail.tsx:978-982` — remove form field block (lines 978-982 cluster)
- Edit: `src/components/Review/ReviewMetadataForm.tsx:216` — remove `renderField('lessonFormat', ...)` line
- Edit: `src/pages/AdminDuplicateReview.tsx:41` — remove from attribute table; coordinate with duplicate-detection RPC return shape (separate change)
- Edit: `src/services/duplicateGroupService.ts:39` — drop `lesson_format` from `LessonForReview` type
- Edit: `supabase/functions/_shared/search-helpers.ts:21,73-75,130` — remove from `SearchFilters` interface + `applyFilters` clause + `transformRow`
- Edit: `supabase/seed.sql:71` — remove from sample-lesson INSERT
- Edit: 6 test fixture files — `searchStore.test.ts:347,352,358,362`; `facetCounts.test.ts:16,29,49,63,72,88,98`; `duplicateGroupHelpers.test.ts:66,85`; `lesson-search.infinite.test.tsx:55,70,109,124,145`; `search-page.test.tsx:50`; `factories.ts:30,74`; `IntLessonSpecCard.test.tsx:21`

**Verify:** `npm run type-check && npm run lint && npm run test` clean. Manual smoke: filter sidebar renders without lessonFormat; lesson cards render; lesson detail renders; review page loads.

**Commit:**
```bash
git add -p  # consolidate
git commit -m "feat(metadata-foundation): lessonFormat removal — frontend + edge sweep

Coordinated with the SQL migration: removes ~30 frontend/edge surfaces
referencing lessonFormat. See Gate A inventory."
```

### Task 1.4: Filter UI updates (Activity Type expand + Lesson Type tag filter)

**Files:**
- Edit: `src/utils/filterDefinitions.ts` — expand Activity Type to 5 values; add new "Lesson Type" tag-based filter section starting with `["orientation", "bilingual_handouts"]`; rename/migrate `academic-cooking` slug.
- Edit: any sidebar component impacted by the new tag filter section.
- Edit: `src/components/CLAUDE.md` if filter category guidance needs updating.

(lessonFormat removal already done in Task 1.3b.)

**Verify:** `npm run type-check && npm run lint`; manual smoke: Activity Type shows 5 values; Lesson Type filter visible with 2 tags.

**Commit:** consolidated frontend filter updates.

### Task 1.5: Closed-enum constants — extend Zod canonical (Task 1.0 scaffold)

**Files:**
- Edit: `src/types/lessonMetadata.zod.ts` — confirm activity_type 5 values, tags 2 values, CRF 7 master-list features are present (should already be in Task 1.0 initial Zod content).
- Run: `npm run generate:enums` to regenerate `enums.json`.
- Verify: Zod schema imported by every TS write path (initial: `process-submission`, `complete-review`, `ReviewDetail.tsx`, scripts that write metadata). Each write callsite gets `schema.parse(input)` added.

**Verify:** type errors surface for any value not in the enum at every write surface; runtime errors surface from `schema.parse()` for invalid runtime values.

**Commit:** consolidated.

### Task 1.6: SQL CHECK + trigger value-validation (per Gate B sketch)

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_metadata_value_validation.sql`

**Approach:**
1. Add `CHECK (activity_type <@ ARRAY['cooking','garden','both','academic','craft'])` on `lessons.activity_type` (text[]).
2. Add `CHECK (tags <@ ARRAY['orientation','bilingual_handouts'])` on `lessons.tags` (text[]).
3. Add `CHECK (cultural_responsiveness_features <@ ARRAY[...7 master-list features...])` on `lessons.cultural_responsiveness_features` (text[]).
4. Extend `lessons_normalize_write_trg` trigger to validate JSONB-embedded enum keys for the same fields (where they live in `metadata` rather than column).
5. Idempotent (`IF NOT EXISTS` on every constraint via DO block).

**Verify:** `mcp__supabase-test__execute_sql` insert with invalid value → CONSTRAINT violation. Insert with valid value → success.

**Commit:** consolidated.

### Task 1.6: PR ritual

Per the kickoff prompt's PER-PR RITUAL. After bot-review rounds settle, merge → wait for production migration approval → verify PROD via `mcp__supabase-remote__execute_sql` (column shapes, index drop, JSONB key absence).

---

## PR 2 — Submission-time LLM auto-tag — vocab-locked prompts

**Branch:** `feat/metadata-foundation-llm-tagging`

**What ships:** `process-submission` edge function expanded with an Opus-based async tagging step. **Vocab-locked prompts only:** CRF (D9), activity_type (D2), tags (D2 + D7), plus any additional fields classified vocab-locked by Gate C. **Stage-1-gated prompts (academicConcepts, cultural_heritage, etc.) do NOT ship in PR 2** — they deploy after their corresponding worksheets land. Per-prompt eval-gate harness with labeled hold-out evaluation. Drafts populate canonical fields on the submission row; reviewer surfaces them in existing ReviewDetail.tsx (Phase 2 redesigns the picker UI).

**Pre-flight:**
- Read `supabase/functions/process-submission/index.ts` (entire) — current async submission processing.
- Read `supabase/functions/CLAUDE.md` — edge function patterns.
- Read v3 prompt patterns: `/Users/danfeder/cCode/taggingv3/gpt_tagger/` — adapt to Anthropic SDK.
- Read decision journal D5 (lines 244-285), D9 (lines 423-491), D8 phase-2 → "extend to ~10 fields" note (lines 416).

### Task 2.1: Per-prompt readiness audit (Gate C output integrated)

Gate C produces the per-field classification table. Task 2.1 integrates that output:

- **Locked-in PR 2:** CRF, activity_type, tags + any additional vocab-locked fields per Gate C
- **Out of PR 2 (deploys after worksheets):** academicConcepts, cultural_heritage + any additional Stage-1-gated per Gate C
- **Dropped from foundation phase:** anything classified as such by Gate C (likely overlap with Phase 2 marginal fields)

**Output:** field-by-field list with vocabulary source, expected body-signal, sample-size estimate for the eval gate, and the Zod schema version that locks the canonical vocab. Folded into Tasks 2.3+ task list.

### Task 2.2: Eval-gate harness

**Goal:** Build a labeled hold-out evaluation harness that runs per prompt before the prompt ships. Drop or rewrite any prompt that doesn't clear the gate.

**Files:**
- Create: `scripts/eval-llm-tagging-prompt.ts` (or similar). Inputs: prompt text + labeled sample. Outputs: precision/recall metrics per closed-enum value.

**Verify:** dry-run on a known v3 batch with v3 vocab; confirm metrics match v3's known accuracy.

### Task 2.3: First prompt (CRF — D9) — canonical reference

**Goal:** Ship the CRF prompt as the canonical reference implementation; remaining vocab-locked prompts mirror its shape. CRF chosen as first because vocab is fully locked (7 master-list features + 35 example practices) and the body-signal source (body CR section) is well-defined.

**Files:**
- Edit: `supabase/functions/process-submission/index.ts` — add Opus call, prompt, Zod validation against `lessonMetadata.zod.ts`, write to submission row. Set `crf_confirmed = false` on draft (reviewer flips to true at validate time).
- Create: prompt file (location: `supabase/functions/process-submission/prompts/cultural-responsiveness-features.md` or similar).

**Eval gate:** run on labeled hold-out. If metrics clear threshold, deploy. Otherwise iterate on prompt and re-run.

**Verify (TEST DB):** submit test lesson with body CR section; confirm draft tags populate against the 7-feature enum; reviewer queue surfaces them. Submit lesson without body CR section; confirm prompt skipped (no draft).

**Commit:**
```bash
git commit -m "feat(metadata-foundation): submission-time CRF auto-tag (D9)

Opus extracts CRF tags from body CR section; matches against 35 master-list
example practices to draft 7-feature enum. Older lessons (no body CR section)
skipped. Eval-gate metrics: <gate output>. See design doc §6."
```

### Task 2.4: Second prompt (activity_type — D2)

Same shape as 2.3. Vocab is the 5-value enum locked in PR 1 (`cooking / garden / both / academic / craft`). Body-signal source: lesson summary + skills lists + agenda. Pick the single best fit; reviewer can override.

### Task 2.5: Third prompt (tags — D2 + D7)

Same shape as 2.3. Vocab is the 2-value enum (`orientation`, `bilingual_handouts`). Body-signal source for orientation: opening-ritual / norms-intro / community-building patterns. Body-signal source for bilingual_handouts: presence of Canva handout/recipe-card links flagged as bilingual in the body. Tags are additive (lesson can have both); reviewer validates.

### Tasks 2.6 - 2.N: Additional vocab-locked prompts (per Gate C)

One task per Gate-C-classified vocab-locked field beyond the initial 3.

### Task 2.N+1: PR ritual

Standard. **Stage-1-gated prompts do NOT ship here** — they deploy as separate post-foundation deploys after their corresponding worksheets land. Each post-foundation deploy is its own PR if it changes infrastructure (e.g., a new prompt file + edge function call site addition); otherwise a small file edit + redeploy.

---

## PR 3a — Search infra now (D5 — independent of Stage 1)

**Branch:** `feat/metadata-foundation-search-infra-3a`

**What ships:** `search_vector` rebuild including `academicConcepts`; `scripts/generate-embeddings.mjs` updated to include concepts; smart-search-vs-DB-synonyms drift resolution. **Does NOT populate `search_synonyms`** — that depends on Stage 2 re-tag outputs (PR 3b / PR 6+).

**Pre-flight:**
- Read `supabase/functions/smart-search/index.ts` — note the TS hardcoded synonym list at lines 18-75.
- Read `scripts/generate-embeddings.mjs` — currently includes themes / heritage / skills / ingredients but not concepts.
- Read decision journal D5 deferred sub-questions (lines 264-274) — drift resolution options.

### Task 3a.1: Decide smart-search drift resolution

Three options (decide here, not at task execution):
- **Option A:** populate both layers (TS hardcoded mirrors DB)
- **Option B:** refactor smart-search to read from `search_synonyms` table at request time
- **Option C:** hybrid (DB-driven with cache layer)

Recommend Option B for cleanliness if the TS hardcoded list is no longer load-bearing for any other use case; otherwise Option A.

### Task 3a.2: search_vector regeneration migration

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_search_vector_with_concepts.sql`

**Verify (TEST DB):** FTS query for a known academic concept hits matching lesson rows.

### Task 3a.3: Embedding generation script update

**Files:**
- Edit: `scripts/generate-embeddings.mjs` — add `academicConcepts` to the embedded text.
- Re-run on TEST corpus; confirm vectors regenerate.

### Task 3a.4: Smart-search drift fix

Per Task 3a.1's decision.

### Task 3a.5: PR ritual

Standard.

---

## PR 3b — Search synonym population (depends on Stage 2 re-tag outputs)

**Status:** TBD — folds into PR 6+ Stage 2 work track since it consumes Stage 2 output (everyday ↔ framework vocab pairs from re-tag prompts).

**What will ship:** `search_synonyms` table populated with concept synonym pairs produced by Stage 2 re-tag.

**Pre-flight when picking up:** Stage 2 re-tag complete; concept tags produced in both framework and everyday vocab. Worksheet round closure for concepts also required.

<!-- TBD: full plan when Stage 2 lands. -->



---

## PR 4 — Corpus drops + archive-concepts recovery + N1 retitle

**Branch:** `feat/metadata-foundation-corpus-cleanup`

**What ships:** 23 third-party-curriculum imports retired (per `project_imported_non_esynyc_drops.md` — soft-delete approach TBD); archive-only `academicConcepts` recovery migration (per design doc §8); FSA retitle (drop "& 2"; ~10 minutes).

**Pre-flight:**
- Read `project_imported_non_esynyc_drops.md` for full lesson_id list and per-row evidence.
- Read decision journal "Cross-cutting: imported non-ESYNYC-format curriculum drops" (lines 530-571) and "Cross-cutting: N1 multi-lesson-per-doc packing" (lines 495-528) and D5 deferred sub-question (line 269) for archive-concepts recovery.
- Confirm Phase 6.2 §4D pre-delete checklist (per memory's hygiene-follow-ups note): for any DELETE FROM lessons, check FK refs INTO the row + `lessons.original_submission_id` ON the row.

### Task 4.1: Soft-delete approach decision

<!-- TBD: status flag (`retired_at timestamp`?) vs archive table vs hard-delete with content-preserving Drive folder backup. Decision: pre-Stage-2 hide-from-search before delete; preserve linked user state. -->

### Task 4.2: Apply pre-delete checklist for each of 23 lessons

For every lesson_id in the drop list:
1. FK refs INTO the row from bookmarks / canonical_lessons / duplicate_resolutions / lesson_archive / lesson_submissions / lesson_versions / collections+dismissals arrays / submission_reviews+_archive / submission_similarities.
2. FK ref OUT FROM the row via `lessons.original_submission_id`.
3. Document mitigation per row.

### Task 4.3: Migration applying the corpus cleanup

<!-- TBD: shape depends on 4.1 -->

### Task 4.4: Archive-only academicConcepts recovery migration

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_recover_archive_only_concepts.sql`

**Pre-task verification:**
1. `mcp__supabase-test__execute_sql`: identify rows where `lessons.metadata->'academicConcepts'` is NULL/empty but `lesson_versions.metadata->'academicIntegration'->'concepts'` is non-empty for the same `lesson_id`. Report count.
2. Reconcile against decision journal ("7 archive rows") + project memory `project_metadata_cleanup_candidates.md` ("16 concepts surviving only in lesson_versions archive"). Document the actual count + which set of rows is targeted.

**Approach:**
1. For the identified rows, copy `lesson_versions.metadata->'academicIntegration'->'concepts'` into `lessons.metadata->'academicConcepts'` preserving the object shape (`{Subject: [concept, ...]}`).
2. Idempotent (skip rows where target is already populated).
3. Forward-rollback migration prepared as sibling `.sql.rollback` file (clear the recovered key).

**Verify (TEST DB):** target row count drops to 0 after migration applies; spot-check 2-3 rows for shape correctness.

**Commit:**
```bash
git add supabase/migrations/*_recover_archive_only_concepts.sql
git commit -m "feat(metadata-foundation): archive-only academicConcepts recovery (pre-Stage-2)

Copies lesson_versions.metadata.academicIntegration.concepts into live
lessons.metadata.academicConcepts for rows where the live row lost concepts
but archive preserves them. Per D5 deferred sub-question; Stage 2 then
operates on complete data."
```

### Task 4.5: FSA retitle

**Files:**
- Migration: `UPDATE lessons SET title = '<new title>' WHERE id = '<FSA lesson_id>'`. Read decision journal N1 lines 495-528 for current vs target title.

### Task 4.6: PR ritual

Standard. PROD MCP verification mandatory after every applied migration.

---

## PR 5+ — D4 vocab canonicalization

**Status:** TBD — depends on Stage 1 worksheet outputs (heritage first, concepts second, ~8 smaller fields).

**Pre-flight when picking up:** confirm worksheet outputs in hand for the field(s) being canonicalized; verify alias map covers every variant in the corpus (worksheet round produces exhaustive variant capture).

<!-- TBD: per-field migration template (canonical translation) + Pydantic validator tightening + per-field commit. Split per-field or all-at-once based on worksheet timing. -->

---

## PR 6+ — Stage 2 corpus re-tag

**Status:** TBD — depends on PR 5 + Stage 1 closure. Timing intentionally flexible per Cross-cutting Scope 3.

**Approach:**
1. Adapt `/Users/danfeder/cCode/taggingv3/gpt_tagger/` Python infrastructure: swap OpenAI for Anthropic; extend Pydantic validators to all 17 fields.
2. Run on post-drop ~749-lesson corpus.
3. Spot-check ~50-100 sampled lessons (sampling protocol TBD: random / stratified-by-activity-type / targeted-at-audit-found).
4. Re-tag DIFF view vs. fresh-tag review (TBD).
5. Cost ~$200-300; 1-2 sessions of pipeline engineering.

<!-- TBD: full plan when prerequisites land. -->

---

## Test plan

### Unit
- Pydantic validators on all 17 fields — happy path + every closed-enum value + every drift variant from corpus audit.
- TypeScript closed-enum constants (`activity_type`, `tags`, `cultural_responsiveness_features`) — type errors surface for invalid values at every write surface.
- Filter definition updates — sidebar renders 5-value Activity Type, tag-based Lesson Type filter, no lessonFormat section.

### Integration
- `process-submission` edge function — submit lesson with full body content → LLM auto-tag drafts populate ~10 fields; reviewer queue surfaces them.
- Eval-gate harness — labeled hold-out runs per prompt; pass/fail logged.
- `search_vector` regeneration — FTS query for known concept hits matching rows.
- `search_synonyms` query expansion — `smart-search` returns expanded synonym matches.

### E2E
- Submit lesson → reviewer queue → reviewer sees LLM-drafted tags → reviewer validates → publish.
- Filter sidebar: Activity Type 5-value selection; Lesson Type tag filter (orientation, bilingual_handouts); lessonFormat filter absent.
- Series-aware dedup (post-PR 1, dedup pipeline reads `series_id`): submit a Pt 2 lesson with metadata identical to existing Pt 1; confirm dedup does NOT flag (skip-comparison logic).

### RLS
- No RLS changes in foundation phase; `npm run test:rls` must pass unchanged.

### Manual smoke checklist (per `superpowers:verification-before-completion`)
- After PR 1: TEST DB column shapes verified via MCP; deploy preview filter UI verified; lesson detail renders without lessonFormat. PROD verification after migration approval.
- After PR 2: TEST submission writes drafted tags; reviewer queue surfaces them; eval-gate logs persist. PROD verification of edge function deploy via `mcp__supabase-remote__get_edge_function`.
- After PR 3: smart-search query in TEST returns expanded synonym results; embedding regeneration confirmed.
- After PR 4: 23 imports + FSA retitle verified in TEST; FK references handled; PROD verification after merge.
- After PR 5+ / 6+: spec'd at implementation time per dependent worksheet round.
