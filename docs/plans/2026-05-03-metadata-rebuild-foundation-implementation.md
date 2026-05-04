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

**What ships:** Schema migration adding `series_id` + `part_number` + `crf_confirmed` columns; dropping `lesson_format` column + 1 JSON-path index (`idx_lessons_format`) + 1 column-based index (`idx_lessons_lesson_format`); rewriting `metadata` JSONB to remove `lessonFormat` key; **keeping `filter_lesson_format text DEFAULT NULL` parameter on `search_lessons` RPC for one-release compatibility bridge** (drops in a follow-up migration after stale-tab window closes); expanding `activity_type` enum (in code) to 5 values including `craft`; expanding `tags` closed enum (in code) to `["orientation", "bilingual_handouts"]`; locking `cultural_responsiveness_features` enum to the 7 master-list features. Filter UI sidebar updated: lessonFormat section removed; "Lesson Type" tag-based filter added; Activity Type 5-value list.

**Why this is its own PR:** Schema-only change. Largest blast radius (touches the JSONB rewrite + 4 RPCs + view + trigger + ~30 TS surfaces). Pipeline (PR 2) and search infra (PR 3) depend on these columns existing. Forward-rollback migration ready before merge.

**Pre-flight: read these files first to verify current shape (line numbers may have drifted):**
- `supabase/migrations/CLAUDE.md` (entire — migration discipline)
- `src/utils/filterDefinitions.ts` (entire — filter declarations)
- Recent migrations affecting `lessons` / `metadata`: `ls supabase/migrations | tail -20`
- v3 taxonomy reference: `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md`
- Decision journal D2 / D3 / D6 / D7 / D9 sections

### Task 1.0: Land the Zod canonical scaffold (Gate B output)

**Sub-skill:** none (scaffolding)

**Two schemas, not one** — `LessonMetadata` (canonical, array shapes) and `ReviewMetadata` (review-form, single-select strings + key renames `themes`/`season`/`location`) genuinely diverge. The translation today happens server-side inside `complete_review_atomic`. Foundation phase ships explicit TS-side artifacts to mirror the contract: two Zod schemas + one bidirectional mapper. (Per Gate B; reviewer feedback round 2.)

**Files:**
- Create: `src/types/lessonMetadata.zod.ts` — canonical lesson shape (matches `LessonMetadata` interface). Imported by `process-submission` (LLM-draft writer; canonical keys), data-import scripts, Stage 2 batch.
- Create: `src/types/reviewFormPayload.zod.ts` — review-form shape (matches `ReviewMetadata` interface; `themes`/`season`/`location:string`). Imported by `complete-review` edge function and `ReviewDetail.tsx`.
- Create: `src/utils/reviewToLessonMapper.ts` — pure function `reviewToLesson(input: ReviewMetadata): LessonMetadata` mirroring the SQL translation in `complete_review_atomic` (themes→thematicCategories, season→seasonTiming, location string→locationRequirements array, activityType string→activity_type array). Tested with property-based round-trips.
- Create: `src/utils/lessonToReviewMapper.ts` — inverse mapper for the read site (used by ReviewDetail.tsx to display LLM drafts that arrive in canonical keys).
- Create: `src/types/generated/enums.json` (initial placeholder; populated by the generation script)
- Create: `scripts/generate-enums-json.ts` (reads canonical Zod schema → emits enums.json)
- Edit: `package.json` — `npm install zod@^3.24.0` (frontend + scripts); add `npm run generate:enums` script; add CI step asserting enums.json is up-to-date.
- Create: `supabase/functions/deno.json` with `"imports": { "zod": "npm:zod@3.24.0" }` so edge functions resolve `zod` to the same npm package. (Verify Supabase Edge Runtime supports `npm:` specifier at task time; fallback option is `https://esm.sh/zod@3.24.0` URL imports inside edge function code, kept private to those files.)
- Create: `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (Gate B output — captures the two-schema split, mapper contract, edge-function dependency strategy, equivalence-test approach).

**Initial Zod content:** start with the closed enums that PR 1 expands or locks (activity_type 5 values, tags 2 values, CRF 7 master-list features, season_timing existing 4 values). Mark all other 13 fields as `z.array(z.string())` placeholders for now — they get tightened to closed enums as Stage 1 worksheets land (per PR 5+).

**Mapper smoke tests** (in `src/utils/reviewToLessonMapper.test.ts`):
- Empty payload → empty canonical
- All-fields-populated review payload → matching canonical (assert key renames + array wraps)
- Round-trip: `lessonToReview(reviewToLesson(x)) === x` for representative fixtures
- Mirror the SQL test at `complete_review_atomic` line 142-167 to ensure the TS mapper stays honest.

**Verify:**
- `npm run generate:enums` produces `enums.json` matching the canonical Zod schema.
- `npm run type-check && npm run lint && npm run test -- reviewToLessonMapper` clean.
- Edge function loads zod: `supabase functions serve process-submission` boots without import errors (smoke locally).

**Commit:**
```bash
git add src/types/lessonMetadata.zod.ts src/types/reviewFormPayload.zod.ts src/utils/reviewToLessonMapper.ts src/utils/lessonToReviewMapper.ts src/utils/reviewToLessonMapper.test.ts src/types/generated/enums.json scripts/generate-enums-json.ts package.json package-lock.json supabase/functions/deno.json docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md
git commit -m "feat(metadata-foundation): Zod canonical scaffold + review/lesson mappers (Gate B)

Two-schema architecture per design doc §5 (revised after reviewer round 2):
- src/types/lessonMetadata.zod.ts — canonical lesson shape (array values,
  thematicCategories/seasonTiming/locationRequirements keys)
- src/types/reviewFormPayload.zod.ts — review-form shape (single-select
  strings, themes/season/location keys)
- src/utils/{reviewToLesson,lessonToReview}Mapper.ts — bidirectional TS
  mirrors of the SQL translation in complete_review_atomic.

Initial closed-enum scope: activity_type (5), tags (2),
cultural_responsiveness_features (7), season_timing (4); rest stay open
text[] until Stage 1 worksheets land. supabase/functions/deno.json adds
zod resolution for edge-function imports."
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

1. **Recreate `lessons_with_metadata` view** — `CREATE OR REPLACE VIEW lessons_with_metadata AS SELECT ..., NULL::text AS lesson_format, ...` for one release. **Keeping `lesson_format` as a NULL projection** so any stale edge-function bundles or other consumers reading the view don't break. Drops in the same follow-up migration that drops the deprecated RPC parameters (after stale-tab window closes).
2. **Redefine 4 RPCs** — order matters per parameter-bridge concern (PostgREST returns hard `PGRST202` 404 for unknown params; old browser-cached clients can still send `filter_lesson_format`):
   - `search_lessons` — **KEEP `filter_lesson_format text DEFAULT NULL` parameter** for one-release compatibility bridge. Remove only the `l.lesson_format = ANY(_alias_lesson_format(filter_lesson_format))` WHERE clause; old clients send the param → it's accepted → ignored. New clients omit it → DEFAULT NULL kicks in → also ignored. (Also keep `_alias_lesson_format` helper for one release; drops with the parameter.)
   - `complete_review_atomic` (drop INSERT/UPDATE references to `lesson_format` column + `v_meta->>'lessonFormat'`)
   - `get_lesson_details_for_review` (drop `lesson_format TEXT` from RETURNS TABLE + the SELECT projection)
   - `archive_duplicate_lesson` (drop `lesson_format` from copy targets)
3. **Rewrite `lessons_normalize_write_trg`** — drop the column⇄metadata sync logic for `lessonFormat` (kept for the other 9 fields it covers).
4. **Drop indexes** — `DROP INDEX IF EXISTS idx_lessons_format` (JSON-path) + `DROP INDEX IF EXISTS idx_lessons_lesson_format` (column-based). Expect 2 indexes per Task 1.1 snapshot.
5. **Strip JSONB key** — `UPDATE lessons SET metadata = metadata - 'lessonFormat'`.
6. **Drop column** — `ALTER TABLE lessons DROP COLUMN IF EXISTS lesson_format`.
7. **Drop legacy `handle_lessons_metadata_write` trigger** if still attached (verify via `pg_trigger`); the M4 normalize trigger replaced it but legacy paths may still bind.
8. **`lesson_archive.lesson_format` decision per Gate A** — keep historical archive (default); add migration comment documenting the decision.

**Audit smart-search edge function** before committing the migration. The `lessons_with_metadata` view + `search-helpers.ts` cover the main path, but `supabase/functions/smart-search/index.ts` may also reference `lesson_format` directly. Grep `supabase/functions/smart-search/` for `lesson_format`/`lessonFormat`. If references exist, fold them into Task 1.3b's frontend+edge sweep — same pattern as `useLessonSearch.ts`.

**Forward-rollback migration** prepared as a sibling `.sql.rollback` file: re-add column nullable; re-create indexes; restore RPC/view/trigger definitions. Metadata key restoration not feasible without snapshot — accepted.

**Verify locally (psql/local SQL after `supabase db reset`):**
```bash
supabase db reset  # applies all migrations including this one to local DB
# Confirm column dropped:
psql "$LOCAL_DB" -c "SELECT count(*) FROM information_schema.columns WHERE table_name='lessons' AND column_name='lesson_format';"  # expect 0
# Confirm JSONB key stripped:
psql "$LOCAL_DB" -c "SELECT count(*) FROM lessons WHERE metadata ? 'lessonFormat';"  # expect 0
# Confirm view recreated WITH lesson_format as NULL (compat bridge):
psql "$LOCAL_DB" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='lessons_with_metadata' AND column_name='lesson_format';"  # expect 1 row, data_type=text (NULL projection)
# Confirm search_lessons KEEPS filter_lesson_format param (compat bridge):
psql "$LOCAL_DB" -c "SELECT pg_get_function_identity_arguments('public.search_lessons'::regproc) ~ 'filter_lesson_format';"  # expect true
# Confirm complete_review_atomic dropped its reference:
psql "$LOCAL_DB" -c "SELECT pg_get_functiondef('public.complete_review_atomic'::regproc) ~ 'lesson_format';"  # expect false
# Confirm legacy trigger detached:
psql "$LOCAL_DB" -c "SELECT count(*) FROM pg_trigger WHERE tgname ~ 'lesson_format' OR tgname = 'handle_lessons_metadata_write_trg';"
# Confirm indexes dropped:
psql "$LOCAL_DB" -c "SELECT count(*) FROM pg_indexes WHERE indexname IN ('idx_lessons_format','idx_lessons_lesson_format');"  # expect 0
```

**Verify via TEST DB MCP (after CI applies the migration to TEST):**
```
mcp__supabase-test__execute_sql: SELECT count(*) FROM information_schema.columns WHERE table_name='lessons' AND column_name='lesson_format';  -- expect 0
mcp__supabase-test__execute_sql: SELECT count(*) FROM lessons WHERE metadata ? 'lessonFormat';  -- expect 0
mcp__supabase-test__execute_sql: SELECT column_name FROM information_schema.columns WHERE table_name='lessons_with_metadata' AND column_name='lesson_format';  -- expect 1 row (compat bridge)
mcp__supabase-test__execute_sql: SELECT pg_get_function_identity_arguments('public.search_lessons'::regproc) ~ 'filter_lesson_format';  -- expect true (compat bridge)
mcp__supabase-test__execute_sql: SELECT pg_get_functiondef('public.complete_review_atomic'::regproc) ~ 'lesson_format';  -- expect false
mcp__supabase-test__execute_sql: SELECT count(*) FROM pg_indexes WHERE indexname IN ('idx_lessons_format','idx_lessons_lesson_format');  -- expect 0
```

**Commit:**
```bash
git add supabase/migrations/*_drop_lesson_format.sql
git commit -m "feat(metadata-foundation): drop lesson_format coordinated removal

D3 — drop the lessonFormat field entirely. Coordinated removal:
view recreate (lessons_with_metadata, lesson_format kept as NULL projection
for one-release compatibility bridge), 4 RPCs redefined (search_lessons
keeps filter_lesson_format text DEFAULT NULL parameter for one-release
bridge per PostgREST PGRST202 risk; complete_review_atomic /
get_lesson_details_for_review / archive_duplicate_lesson drop column refs),
normalize trigger rewritten, _alias_lesson_format helper kept (drops with
the parameter in follow-up migration), 2 indexes dropped (idx_lessons_format
JSON-path + idx_lessons_lesson_format column-based), JSONB key stripped,
column dropped. lesson_archive.lesson_format kept for historical archive
per Gate A decision. See design doc §4."
```

### Task 1.3a (deferred to next release): drop deprecated parameters

A follow-up migration ships in the next foundation-phase PR (or any PR ≥1 release after this one merges). Specifically:
- Drop `filter_lesson_format` parameter from `search_lessons` (full DROP+CREATE; mirror the PR-1 pattern at `20260505000000:193-208`).
- Drop `_alias_lesson_format` SQL helper.
- Drop `lesson_format` projection from `lessons_with_metadata` view.

**Why deferred:** Stale browser tabs (Netlify 1-year asset cache + 5-min TanStack Query staleTime) can keep emitting `filter_lesson_format` after the column drop. PostgREST returns hard `PGRST202` 404 on unknown RPC params. Bridge for one release; drop after a short cooldown (24-48h after frontend deploy ships).

**Verify (TEST DB):** parameter is gone; smoke search-page navigation; smoke smart-search.

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

### Task 1.4 — Filter UI updates (split into 1.4a + 1.4b after Session 9 investigation)

Session 9's code-explorer agent verified that the Activity Type filter pipeline has a server-side translator (`_alias_activity_type`) bridging the slug-vs-corpus mismatch, AND that `search_lessons` does not currently accept any tags-related filter parameter. Both findings expand Task 1.4's scope beyond the original "frontend-only" framing — both UI changes need coordinated SQL migrations to function end-to-end. Split into two tasks accordingly. Two impl-plan items dropped: the `academic-cooking` slug doesn't exist in current code (verified Session 9), and `src/components/CLAUDE.md` needs no change.

(lessonFormat removal already done in Task 1.3b.)

#### Task 1.4a: Activity Type filter — expand to 5 values (add `craft-only`)

**Sub-skill:** `database-migrations` (mandatory for the new SQL migration file)

**Why a SQL migration is needed.** The sidebar slug `'cooking-only'` doesn't match the corpus value `'cooking'`. The server-side translator function `_alias_activity_type` (defined at `supabase/migrations/20260505000000_filter_drift_pr1_column_based_search_lessons.sql:72-91`) bridges the difference: `'cooking-only'` expands to match either `'cooking-only'` or `'cooking'`. Adding `craft` as a fifth corpus value requires both a new filter slug AND a new translator branch — they have to ship together or the filter is silently broken for craft lessons.

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_alias_activity_type_add_craft.sql` — `CREATE OR REPLACE FUNCTION _alias_activity_type(text[])` with new CASE branch `WHEN 'craft-only' THEN ARRAY['craft-only', 'craft']`. Signature unchanged → no DROP needed; CREATE OR REPLACE is idempotent. Filename follows the one-day-forward convention used in this initiative (latest: `20260512000000_drop_lesson_format.sql` → next: `20260513000000_*`).
- Edit: `src/utils/filterDefinitions.ts:26-31` — add `{ value: 'craft-only', label: 'Craft Only' }` as the 5th entry in `FILTER_CONFIGS.activityType.options`.

**Out of scope for 1.4a (captured as tracked follow-ups):**
- Activity Type **facet count badge bug** (the "(43)" number next to each filter checkbox is always 0). Pre-existing: `facetCounts.ts` groups by corpus value (`cooking`) while the lookup at `IntSidebar.tsx:91` keys by filter slug (`cooking-only`); the bucket key never matches. Captured in execution status doc's "Out-of-scope follow-ups" section as per Session 9 user direction.
- **Card-side Activity Type label** (`intActivityLabel` in `IntListRow.tsx:13-20`) is computed from cookingSkills/gardenSkills, not the `activity_type` column. Adding `craft` to the filter will not produce a "Craft" badge on cards. Outside the impl plan's stated scope; not handled here.
- **`academic-cooking` slug rename** — verified absent from current code in Session 9. No work needed.

**Verify locally:**
```bash
supabase db reset
# Verify the helper accepts craft-only:
psql "$LOCAL_DB" -c "SELECT _alias_activity_type(ARRAY['craft-only']::text[]);"  # expect {craft-only,craft}
# Confirm existing branches still work:
psql "$LOCAL_DB" -c "SELECT _alias_activity_type(ARRAY['cooking-only']::text[]);"  # expect {cooking-only,cooking}
```

**Verify via TEST DB MCP (after CI applies the migration):**
```
mcp__supabase-test__execute_sql: SELECT _alias_activity_type(ARRAY['craft-only']::text[]);  -- expect {craft-only,craft}
```

**Commit:** single commit covering migration + filterDefinitions edit.

#### Task 1.4b: Lesson Type filter — new tag-based sidebar section

**Sub-skill:** `database-migrations`

**Why a SQL migration is needed.** The `search_lessons` RPC has 14 filter parameters today; none cover `lessons.tags`. To make the new sidebar section actually filter, we add a new `filter_tags text[] DEFAULT NULL` parameter. Adding a parameter to a Postgres function requires DROP+CREATE (CREATE OR REPLACE forbids signature changes). Same pattern as the `filter_cooking_method text → text[]` change at `20260505000000_filter_drift_pr1_column_based_search_lessons.sql:193-208`.

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_search_lessons_filter_tags.sql` — `DROP FUNCTION IF EXISTS public.search_lessons(...)` (current 14-param signature) + `CREATE FUNCTION public.search_lessons(...)` with `filter_tags text[] DEFAULT NULL` appended. Body adds WHERE-clause `AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR l.tags && filter_tags)` to both the count query and the RETURN QUERY. Re-issue `GRANT EXECUTE ON FUNCTION public.search_lessons(...) TO anon, authenticated, service_role`. Final `NOTIFY pgrst, 'reload schema'` to pick up signature change.
- Edit: `src/types/index.ts` — add `tags?: string[]` to `SearchFilters` interface.
- Edit: `src/stores/searchStore.ts` — add `tags: []` to `initialFilters` (preserves "filters reset to clean state" pattern).
- Edit: `src/utils/filterDefinitions.ts` — add new `tags` entry to `FILTER_CONFIGS` (between `activityType` and `location` keeps sidebar order coherent): `{ label: 'Lesson Type', type: 'multiple', options: [{ value: 'orientation', label: 'Orientation' }, { value: 'bilingual_handouts', label: 'Bilingual Handouts' }] }`.
- Edit: `src/utils/facetCounts.ts` — extend `FacetFilterKey` union, `EMPTY_COUNTS`, `valuesForKey` switch, `KEYS` array to include `tags`. (Note: avoids the slug-vs-corpus axis mismatch from 1.4a's facet bug because the new section's slugs ARE the corpus values — `orientation` / `bilingual_handouts` directly.)
- Edit: `src/utils/filterUtils.ts` — extend display name + icon maps for `tags`.
- Edit: `src/hooks/useLessonSearch.ts` — add `filter_tags: filters.tags?.length ? filters.tags : undefined` to the `searchParams` block.
- Edit: `src/components/Common/ScreenReaderAnnouncer.tsx` if per-filter a11y announcement entries are required (mirror the existing pattern).
- Edit: `src/components/Internal/IntSidebar.tsx` only if the multi-select pattern doesn't pick up the new filter automatically; the type-`multiple` path should "just work."

**Verify locally:**
```bash
supabase db reset
# Confirm new param accepted:
psql "$LOCAL_DB" -c "SELECT * FROM search_lessons(filter_tags := ARRAY['orientation']::text[]) LIMIT 1;"
# Confirm signature includes filter_tags:
psql "$LOCAL_DB" -c "SELECT pg_get_function_identity_arguments('public.search_lessons'::regproc);"  # expect ... filter_tags text[]
```

**Verify via TEST DB MCP (after CI applies):**
```
mcp__supabase-test__execute_sql: SELECT pg_get_function_identity_arguments('public.search_lessons'::regproc) ~ 'filter_tags';  -- expect true
mcp__supabase-test__execute_sql: SELECT count(*) FROM search_lessons(filter_tags := ARRAY['orientation']::text[]);  -- expect 0 today (tags empty in PROD); >0 after PR 2 LLM auto-tag ships
```

**Manual smoke (deploy preview):** sidebar shows new "Lesson Type" section with two checkboxes between Activity Type and Location; selecting a tag filters results (no matches today since tags column is empty in TEST/PROD; will activate when PR 2's LLM auto-tag pipeline lands).

**Commit:** single commit covering the migration + ~7 frontend file edits.

### Task 1.5: Wire Zod schemas to write surfaces

Each surface gets the *correct* schema based on which keys it operates in (per Task 1.0's two-schema split):

**Files (review-form-keys side, `reviewFormPayload.zod.ts`):**
- Edit: `supabase/functions/complete-review/index.ts` — at the top, parse incoming body with `reviewFormPayloadSchema.parse(body)` before passing `metadata` to `complete_review_atomic`. Catch ZodError → return 400 with field-level errors. Mirrors the existing `decision`/`submissionId` validation pattern.
- Edit: `src/pages/ReviewDetail.tsx` — at save time, validate the form state against `reviewFormPayloadSchema` before calling the edge function. Surface validation errors inline.

**Files (canonical-keys side, `lessonMetadata.zod.ts`):**
- Edit: `supabase/functions/process-submission/index.ts` — when PR 2 lands LLM-draft writes (Task 2.3+), each draft is `lessonMetadataSchema.parse()`d before write. Foundation-phase Task 1.5 only ships the import wiring; the actual `parse()` calls land per-prompt in PR 2.
- Edit: any TS scripts that directly insert/update `lessons` rows (`scripts/identify-and-restore-missing-lessons.ts:184`, `scripts/migrate-metadata-to-columns.mjs`, etc.) — wrap inserts with `lessonMetadataSchema.parse(metadata)`.

**Verify:**
- `npm run type-check && npm run lint` clean.
- Manual smoke: submit a malformed review payload to `complete-review` (e.g., `themes: "string-not-array"`) → expect 400 with Zod field-level error.
- Edge function deploy works: `supabase functions deploy complete-review` boots without import errors. Confirm `deno.json` resolves `zod` correctly.

**Commit:** consolidated. Includes both edge functions + ReviewDetail + scripts.

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

**What ships:** `process-submission` edge function expanded with an Opus-based async tagging step. **Vocab-locked prompts only:** CRF (D9), activity_type (D2), tags (D2 + D7), plus any additional fields classified vocab-locked by Gate C. **Stage-1-gated prompts (academicConcepts, cultural_heritage, etc.) do NOT ship in PR 2** — they deploy after their corresponding worksheets land. Per-prompt eval-gate harness with labeled hold-out evaluation.

**Storage contract for LLM drafts** (resolved per reviewer feedback round 2): drafts written to a new column `lesson_submissions.ai_draft_metadata jsonb` (with companion `ai_draft_generated_at timestamp` and `ai_draft_model text` for provenance). Drafts stored in **canonical-keys shape** (matches `lessons.metadata`); `ReviewDetail.tsx` reads them at form-init time and applies `lessonToReviewMapper` (from Task 1.0) for display. `complete_review_atomic` does NOT change — reviewer's saved metadata is the final answer; the draft is read only at form-init time. Audit trail (LLM-draft vs final-review diff) preserved for free.

**Why not pre-create a draft `submission_reviews` row:** `submission_reviews` has UNIQUE(submission_id) + NOT NULL `reviewer_id` FK to `auth.users`. Adding a sentinel "AI tagger" auth user pollutes audit logs; relaxing the FK is an architectural regression. Rejected.

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

### Task 2.2a: Migration adding `lesson_submissions.ai_draft_metadata` columns

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_lesson_submissions_ai_draft_metadata.sql`

**Approach:**
1. `ALTER TABLE lesson_submissions ADD COLUMN IF NOT EXISTS ai_draft_metadata jsonb DEFAULT NULL`.
2. `ALTER TABLE lesson_submissions ADD COLUMN IF NOT EXISTS ai_draft_generated_at timestamptz DEFAULT NULL`.
3. `ALTER TABLE lesson_submissions ADD COLUMN IF NOT EXISTS ai_draft_model text DEFAULT NULL`.
4. Comment columns with intent + the "canonical-keys shape" invariant.
5. Idempotent.

**RLS:** the columns inherit `lesson_submissions` table RLS — no new policies. Service-role write from `process-submission` is unchanged from the existing pattern.

**Verify (TEST DB, after CI applies):**
```
mcp__supabase-test__execute_sql: SELECT column_name FROM information_schema.columns WHERE table_name='lesson_submissions' AND column_name LIKE 'ai_draft_%';  -- expect 3 rows
```

**Commit:** consolidated.

### Task 2.2b: ReviewDetail.tsx — read AI drafts at form init

**Files:**
- Edit: `src/pages/ReviewDetail.tsx` — at the existing `if (!reviews || reviews.length === 0)` branch (around lines 402-411), add: when no reviews row exists yet AND `submissionData.ai_draft_metadata` is non-null, populate initial `metadata` state via `lessonToReviewMapper(submissionData.ai_draft_metadata)`. When a `reviews` row already exists (reviewer has touched the submission), use `tagged_metadata` as today (drafts ignored — reviewer's authority).

**Verify:** unit test for the read-site logic (existing test setup if available; otherwise add `ReviewDetail.aiDraft.test.tsx`). Manual smoke: load a submission with `ai_draft_metadata` set + no review row → form pre-populates with mapped values; load one with a review row → drafts ignored.

**Commit:** consolidated.

### Task 2.2: Eval-gate harness

**Goal:** Build a labeled hold-out evaluation harness that runs per prompt before the prompt ships. Drop or rewrite any prompt that doesn't clear the gate.

**Files:**
- Create: `scripts/eval-llm-tagging-prompt.ts` (or similar). Inputs: prompt text + labeled sample. Outputs: precision/recall metrics per closed-enum value.

**Verify:** dry-run on a known v3 batch with v3 vocab; confirm metrics match v3's known accuracy.

### Task 2.3: First prompt (CRF — D9) — canonical reference

**Goal:** Ship the CRF prompt as the canonical reference implementation; remaining vocab-locked prompts mirror its shape. CRF chosen as first because vocab is fully locked (7 master-list features + 35 example practices) and the body-signal source (body CR section) is well-defined.

**Files:**
- Edit: `supabase/functions/process-submission/index.ts` — add Opus call, prompt, Zod validation against `lessonMetadata.zod.ts` (canonical-keys shape — `cultural_responsiveness_features` is `text[]` of the 7 features). Write the validated draft into `lesson_submissions.ai_draft_metadata` (merge with whatever other prompt outputs land in the same submission flow); set `ai_draft_generated_at = now()`; set `ai_draft_model = 'opus-4-7'` (or current model). The `crf_confirmed` boolean stays `false` until the reviewer validates (reviewer flips it via the existing review save flow; foundation-phase ReviewDetail does not yet expose a CRF picker — Phase 2).
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

Same shape as 2.3. Vocab is the 5-value enum locked in PR 1 (`cooking / garden / both / academic / craft`). Body-signal source: lesson summary + skills lists + agenda. Pick the single best fit; **draft emits canonical-keys shape `["cooking"]`** (single-element array), NOT review-form shape `"cooking"` (string) — because `ai_draft_metadata` lives in canonical keys; the read-site mapper handles the array→string translation for display.

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
- Migration: `UPDATE lessons SET title = '<new title>' WHERE lesson_id = '<FSA lesson_id_text>'`. The `lessons` table has both an `id uuid` PK and a separate `lesson_id text` UNIQUE column; FSA's identifier is the Google Doc ID (text), keyed via `lesson_id` (consistent with how every other surface in the codebase keys lessons — `process-submission/index.ts:185-188`, `complete_review_atomic` line 177, `ReviewDashboard.tsx:143`). Read decision journal N1 lines 495-528 for current vs target title; FSA's `lesson_id` per `1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk`.

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
- `process-submission` edge function — submit lesson with full body content → LLM auto-tag drafts populate vocab-locked fields in `lesson_submissions.ai_draft_metadata`; reviewer queue surfaces them via `lessonToReviewMapper`.
- Eval-gate harness — labeled hold-out runs per prompt; pass/fail logged.
- `search_vector` regeneration (PR 3a) — FTS query for known concept hits matching rows.
- `search_synonyms` query expansion (PR 3b / PR 6+, NOT PR 3a) — `smart-search` returns expanded synonym matches. **Do not verify in PR 3a** — `search_synonyms` is not populated until Stage 2 re-tag outputs land.

### E2E
- Submit lesson → reviewer queue → reviewer sees LLM-drafted tags (mapped from canonical to review-form keys) → reviewer validates → publish.
- Filter sidebar: Activity Type 5-value selection; Lesson Type tag filter (orientation, bilingual_handouts); lessonFormat filter absent.
- (Series-aware dedup E2E removed: PR 1 adds `series_id` and `part_number` columns, but teaching the dedup pipeline to skip comparison within a series belongs to the **dedup-pipeline third-state work track** which is explicitly out of scope per design doc §11. The series_id columns are scaffolding for that future work track; functional dedup behavior is verified there, not here.)

### RLS
- No RLS changes in foundation phase; `npm run test:rls` must pass unchanged.

### Manual smoke checklist (per `superpowers:verification-before-completion`)
- After PR 1: TEST DB column shapes verified via MCP; deploy preview filter UI verified; lesson detail renders without lessonFormat; `search_lessons` RPC still accepts `filter_lesson_format` param (compat bridge); `lessons_with_metadata` view still projects `lesson_format` as NULL (compat bridge). PROD verification after migration approval.
- After PR 1's follow-up (Task 1.3a, ≥1 release later): deprecated parameters removed from `search_lessons` and `lessons_with_metadata` view; smoke search-page navigation; smoke smart-search.
- After PR 2: TEST submission writes drafted tags into `lesson_submissions.ai_draft_metadata`; ReviewDetail.tsx surfaces them via `lessonToReviewMapper` for an unclaimed submission; eval-gate logs persist. PROD verification of edge function deploy via `mcp__supabase-remote__get_edge_function`.
- After PR 3a: `search_vector` includes academicConcepts (FTS query verifies); embedding regeneration confirmed; smart-search drift fix verified per Task 3a.1's chosen option. **Do NOT verify synonym expansion** — that's PR 3b / PR 6+.
- After PR 3b / PR 6+: smart-search query in TEST returns expanded synonym results.
- After PR 4: 23 imports + archive concepts recovery + FSA retitle verified in TEST; FK references handled; PROD verification after merge.
- After PR 5+ / 6+: spec'd at implementation time per dependent worksheet round.
