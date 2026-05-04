# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-03 — Session 1 complete (Gate A done)
**Current PR:** Pre-PR-1 Gates A/B/C (no PR; investigation/decision tasks first)
**Current task:** Gate B — Validator architecture decision + Zod canonical scaffold
**Branch:** main (not yet branched for PR 1)
**Last commit on branch:** (TBD this session)

## Done

- **Gate A — lessonFormat dependency sweep verified.** Per-surface task list produced (see "Gate A output" below). Three reviewer-cited refs confirmed; smart-search audit complete (no refs in smart-search/index.ts); 5th RPC discovered (`resolve_duplicate_group`); `lesson_archive.lesson_format` keep-historical decision documented.

## In flight

(none — Session 1 wrapped Gate A; next session starts Gate B)

## Blocked

(none — Stage 1 worksheet round runs in parallel and gates PR 5+ but is not blocking PRs 1-4 / Gates A-C)

## Decisions made during execution

- **2026-05-03 (pre-execution, post-reviewer-feedback round 1):** Three pre-execution gates added (A: lessonFormat dependency sweep verification; B: validator architecture decision + Zod canonical scaffold; C: per-prompt readiness audit). PR breakdown updated: PR 2 ships only vocab-locked prompts (CRF + activity_type + tags + Gate-C-classified); Stage-1-gated prompts deploy after worksheets; PR 3 split into 3a (now) / 3b (after Stage 2). Archive academicConcepts recovery added to PR 4. Validator architecture confirmed Option B (TS/Zod canonical, Pydantic mirrors enums via enums.json, SQL CHECK + trigger value-validation hand-synced).
- **2026-05-03 (factual correction):** Design doc's "9 JSON-path indexes referencing lessonFormat" was wrong — there is 1 JSON-path index (`idx_lessons_format`) + 1 column-based index (`idx_lessons_lesson_format`). The "9" came from conflating the foundational report's 10-element list of metadata-path indexes (one per field — themes/cultures/seasons/etc.). Corrected.
- **2026-05-03 (post-reviewer-feedback round 2):** Three additional P1 fixes:
  - **search_lessons compatibility bridge.** PostgREST returns hard `PGRST202` 404 on unknown RPC params + Netlify 1-year asset cache + 5-min TanStack Query staleTime → stale browser tabs can emit old `filter_lesson_format` after column drop. Pattern: keep deprecated params with `DEFAULT NULL` for one release; drop in Task 1.3a follow-up migration ≥24-48h after frontend deploys. Applies to `search_lessons.filter_lesson_format` parameter + `lessons_with_metadata` view's `lesson_format` projection.
  - **Two-schema Zod architecture.** `LessonMetadata` (canonical, array values, `thematicCategories`/`seasonTiming`/`locationRequirements` keys) and `ReviewMetadata` (review-form, single-select strings, `themes`/`season`/`location` keys) genuinely diverge. Translation today happens server-side in `complete_review_atomic`. Foundation phase ships TWO Zod schemas + bidirectional mappers (`reviewToLesson` + `lessonToReview`) mirroring the SQL translation. Edge functions need `supabase/functions/deno.json` with `"imports": { "zod": "npm:zod@3" }` (or fallback URL imports). `zod` not currently in package.json; gets installed in Task 1.0.
  - **LLM draft storage contract.** New columns `lesson_submissions.{ai_draft_metadata jsonb, ai_draft_generated_at timestamptz, ai_draft_model text}` (Option A; Option B rejected because `submission_reviews.reviewer_id` FK NOT NULL to `auth.users` blocks sentinel reviewer). Drafts stored in canonical-keys shape; ReviewDetail.tsx reads at form-init via `lessonToReviewMapper`. `complete_review_atomic` unchanged.
- **2026-05-03 (factual fix):** PR 4 Task 4.5 (FSA retitle) used `WHERE id = '<lesson_id>'` — wrong because `lessons` has both `id uuid` PK and separate `lesson_id text` UNIQUE column; FSA's identifier is the Google Doc ID (text). Frontend keys lessons by `lesson_id` everywhere. Corrected to `WHERE lesson_id = '<FSA lesson_id_text>'`.
- **2026-05-03 (test plan corrections):** Synonym-expansion verification moved from PR 3a manual smoke (where `search_synonyms` is not populated) to PR 3b / PR 6+. Series-aware dedup E2E test removed entirely — design doc §11 explicitly puts dedup-pipeline third-state redesign in a separate work track; series_id columns are scaffolding for that future track, not exercised in foundation phase.

## Out-of-scope follow-ups captured here

(none yet — capture things noticed during execution that are out of scope for foundation phase; move to project memory after initiative ships)

## Gate A output — lessonFormat dependency sweep (Session 1, 2026-05-03)

### Verdict

Design doc inventory verified against current repo. Three reviewer-cited refs confirmed. **One new finding:** `resolve_duplicate_group` is a 5th RPC referencing `lesson_format` (impl plan §1.3 listed only 4); add to PR 1 migration. **Audit-complete (no work needed):** smart-search edge function has zero `lesson_format`/`lessonFormat` references — view + `_shared/search-helpers.ts` are the only edge-side surfaces.

Total active code surfaces touching `lesson_format`/`lessonFormat`: ~30 files (~80 line refs), plus migration writes (5 RPCs + 1 view + 1 trigger + 2 indexes + JSONB key strip + column drop). The "~95 surfaces" figure in design doc was an approximate line-ref count and matches.

Non-actionable hits (not edited):
- `supabase/dump-data.sql` (993 hits) — pg_dump output, data values not code
- `supabase/migrations/**` historical migrations (45 files) — frozen by migration discipline; new PR 1 migration files supersede
- `src/types/database.types.ts` (11 hits) — auto-regen via `supabase gen types`
- `src/types/CLAUDE.md` + `src/stores/CLAUDE.md` — docs pages; refresh content to drop lessonFormat as a discussed pattern (small)
- `scripts/archive/{backfill-publish-approved,recover-failed-lessons}.ts` — archived scripts; no edits

### Reviewer-cited refs verified

| Cited ref | Actual location | Status |
|---|---|---|
| `ReviewDetail.tsx:978` | Lines 977-986 cluster (form-field block: `<IntFormField label="Lesson format">` opens at 977; `metadata.lessonFormat` reads at 980-982) | ✅ Confirmed |
| `useLessonSearch.ts:115` | Line 115: `filter_lesson_format: filters.lessonFormat \|\| undefined` | ✅ Exact match |
| `complete_review_atomic` migration line 128 | `20260428000003_phase_4_complete_review_atomic_rpc.sql` line 128 opens the `IF p_decision = 'approve_new'` branch; the `lesson_format` column appears in the INSERT column list at line ~131 within that branch | ✅ Confirmed (line approximate; surface confirmed) |

### Per-surface PR 1 task list (folded into impl plan §1.3b)

**SQL — migration writes (PR 1 Tasks 1.2 / 1.3 / 1.6):**

| Surface | File / object | Action |
|---|---|---|
| Column add | `lessons.series_id text` (Task 1.2) | ADD |
| Column add | `lessons.part_number int` (Task 1.2) | ADD |
| Column add | `lessons.crf_confirmed boolean DEFAULT false NOT NULL` (Task 1.2) | ADD |
| Column drop | `lessons.lesson_format` (Task 1.3) | DROP |
| JSONB key strip | `lessons.metadata - 'lessonFormat'` (Task 1.3) | UPDATE all rows |
| Index drop | `idx_lessons_format` (JSON-path, baseline:2558) | DROP |
| Index drop | `idx_lessons_lesson_format` (column-based, baseline:2582) | DROP |
| RPC redefine | `search_lessons` — KEEP `filter_lesson_format text DEFAULT NULL` parameter for one-release compat bridge; remove the WHERE clause that uses `_alias_lesson_format(...)` | KEEP param, REMOVE WHERE |
| RPC redefine | `complete_review_atomic` (line 128 area) — drop `lesson_format` from INSERT column list + remove `v_meta->>'lessonFormat'` references | DROP refs |
| RPC redefine | `get_lesson_details_for_review` (20260424 + 20260425) — drop `lesson_format TEXT` from RETURNS TABLE + `l.lesson_format` from SELECT | DROP refs |
| RPC redefine | `archive_duplicate_lesson` (20251205+20251206) — keep `lesson_format` in INSERT INTO lesson_archive (column kept), source from NULL or metadata extract since lessons.lesson_format is gone | REWRITE source side |
| RPC redefine **(NEW finding)** | `resolve_duplicate_group` (20251203+20251204) — same pattern as archive_duplicate_lesson; INSERT INTO lesson_archive references `v_lesson_record.lesson_format` from a lessons-row SELECT | REWRITE source side |
| Helper keep | `_alias_lesson_format(text)` (20260505000000:47) — keep for one release; drops with the parameter in Task 1.3a follow-up migration | KEEP one release |
| View redefine | `lessons_with_metadata` view (baseline only; no later redefinitions) — `CREATE OR REPLACE VIEW … NULL::text AS lesson_format …` for compat bridge (drops with parameter in Task 1.3a) | REPLACE with NULL projection |
| Trigger rewrite | `lessons_normalize_write` (20260509000000) — drop column⇄metadata sync logic for `lessonFormat`; trigger keeps the other 9 fields it covers | EDIT |
| Trigger detach (verify on TEST DB) | `handle_lessons_metadata_write` (legacy, baseline:465 + grants 3356-3358) — verify via `pg_trigger` whether still attached; if so, DROP TRIGGER | VERIFY + drop if attached |
| CHECK constraints (Task 1.6) | `lessons.activity_type` text[] CHECK against 5-value enum; `lessons.tags` text[] CHECK against 2-value enum; `lessons.cultural_responsiveness_features` text[] CHECK against 7 master-list features | ADD |

**Decision: `lesson_archive.lesson_format` column** — KEEP historical archive (Gate A default, per design doc §4). The `lesson_archive` table already has the column populated; the archive_duplicate_lesson + resolve_duplicate_group RPCs need rewriting because their *source* side reads from `lessons.lesson_format` which is dropping. Target side stays.

**Frontend — reads / display (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `src/components/Internal/IntCard.tsx` | 7-8 (`lessonFormatLabel` helper), 22 (`meta.lessonFormat` read), 51 (render) | DELETE helper + read + render |
| `src/components/Internal/IntListRow.tsx` | 38-39, 55, 99 | Same pattern as IntCard |

**Frontend — writes (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `src/pages/ReviewDetail.tsx` | 977-986 cluster (`<IntFormField label="Lesson format">` block) | DELETE block |
| `src/components/Review/ReviewMetadataForm.tsx` | 216 (`renderField('lessonFormat', ...)`) | DELETE line |

**Frontend — filters / sidebar (PR 1 Task 1.3b + 1.4):**

| File | Lines | Action |
|---|---|---|
| `src/components/Internal/IntSidebar.tsx` | 11 (docstring), 114-142 (lessonFormat filter section) | DELETE filter section + remove docstring mention |
| `src/utils/filterDefinitions.ts` | 163 (`FILTER_CONFIGS.lessonFormat: {...}`) + ALL_FIELD_CONFIGS membership | DELETE config |
| `src/utils/filterUtils.ts` | 16 (display name map), 36 (icon map) | DELETE both entries |
| `src/components/Common/ScreenReaderAnnouncer.tsx` | 29 (a11y announcement) | DELETE line |

**State management (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `src/stores/searchStore.ts` | 62 (`lessonFormat: ''` in initialFilters) | DELETE entry |
| `src/utils/facetCounts.ts` | 16 (FacetFilterKey union), 31 (EMPTY_COUNTS), 54-55 (valuesForKey case), 77 (KEYS array) | DELETE all four entries |
| `src/hooks/useLessonSearch.ts` | 49 (transformRow projection), 115 (filter_lesson_format RPC param) | DELETE projection; KEEP RPC param send for one release (compat bridge: send `undefined` always — RPC param has DEFAULT NULL) |
| `src/hooks/useLessonSuggestions.ts` | 31 (queryKey), 57 (smart-search edge body) | DELETE both |

**Type definitions (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `src/types/index.ts` | 35 (`LessonMetadata.lessonFormat`), 61 (`SearchFilters.lessonFormat`), 116 (`ReviewMetadata.lessonFormat`) | DELETE all three |
| `src/types/database.types.ts` | 11 hits across `lessons`, `lessons_with_metadata` view, `_alias_lesson_format`, `search_lessons` param | REGENERATE via `supabase gen types` after migration applies — keeps one-release `filter_lesson_format` param + `lesson_format` view projection |
| `src/services/duplicateGroupService.ts` | 39 (`LessonForReview.lesson_format: string \| null`) | DELETE entry (coordinated with admin-dup-review consumer) |
| `src/pages/AdminDuplicateReview.tsx` | 41 (`{ key: 'lesson_format', label: 'Lesson format', kind: 'text' }` in attribute table) | DELETE entry; coordinated with duplicate-detection RPC return shape rewrite (resolve_duplicate_group / archive_duplicate_lesson don't directly drive this page; the column came from `lessons` SELECT — disappears with column drop) |

**Edge function shared (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `supabase/functions/_shared/search-helpers.ts` | 21 (SearchFilters interface), 73-74 (applyFilters clause `q.eq('metadata->>lessonFormat', ...)`), 130 (transformRow `lessonFormat: row.lesson_format \|\| row.metadata?.lessonFormat \|\| ''`) | DELETE all four |
| `supabase/functions/smart-search/index.ts` | (none — audit complete; no lessonFormat refs) | NO ACTION |

**Tests + fixtures (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `src/stores/searchStore.test.ts` | 347, 352, 358, 362 | DELETE 4 fixture lines |
| `src/utils/facetCounts.test.ts` | 16, 29, 49, 63, 72, 88, 98 | DELETE 7 fixture lines |
| `src/utils/duplicateGroupHelpers.test.ts` | 66, 85 | DELETE 2 fixture lines |
| `src/__tests__/integration/lesson-search.infinite.test.tsx` | 55, 70, 109, 124, 145 | DELETE 5 fixture lines |
| `src/__tests__/integration/search-page.test.tsx` | 50 | DELETE fixture line |
| `src/__tests__/helpers/factories.ts` | 30 (`lessonFormat: []`), 74 (`lessonFormat: ''`) | DELETE 2 entries |
| `src/components/Internal/IntLessonSpecCard.test.tsx` | 21 (`lesson_format: 'lesson'`) | DELETE 1 fixture line |

**Scripts + seed (PR 1 Task 1.3b):**

| File | Lines | Action |
|---|---|---|
| `supabase/seed.sql` | 71 (`core_competencies, cultural_heritage, lesson_format, …` in INSERT column list) | DELETE column from INSERT |
| `scripts/analyze-duplicates.mjs` | 210, 279 | DELETE entries |
| `scripts/analyze-duplicates-v2.ts` | 375, 418 | DELETE entries |
| `scripts/identify-and-restore-missing-lessons.ts` | 79 (`lesson_format: lesson.metadata?.lessonFormat \|\| null`) | DELETE entry |
| `scripts/migrate-metadata-to-columns.mjs` | 76, 111, 120 | DELETE entries (script is historical migration helper; OK to leave with TODO comment if active script needs preservation) |
| `scripts/orphan-recovery/phase-5-b-new-publish.ts` | 216-217 (docstring), 253-256 (jsonb_build_array logic), 277 (INSERT col list), 300 (NULLIF on metadata->>'lessonFormat') | **DECISION POINT** — historical orphan-recovery script; will not run again post-PR-1. Recommend: leave as-is with a header comment noting `lessonFormat` was dropped in foundation-phase PR 1 and the script is preserved for audit only. Removing references would require re-running which is undesirable. |

**Docs (PR 1 Task 1.3b — small):**

| File | Lines | Action |
|---|---|---|
| `src/types/CLAUDE.md` | 25 (`lessonFormat: string;` in example block) | UPDATE example to drop the line |
| `src/stores/CLAUDE.md` | 38 (`lessonFormat`, `cookingMethods` in single-select examples) | REPLACE example field; cookingMethods alone is fine |

### Decision points raised by sweep

1. **`lesson_archive.lesson_format` column** — KEEP per Gate A default. The archive table preserves historical metadata; only the source side (`lessons.lesson_format` SELECT in `archive_duplicate_lesson` + `resolve_duplicate_group`) needs rewriting. Document in PR 1 commit.
2. **`resolve_duplicate_group` is a 5th RPC** — fold into PR 1 Task 1.3 step 2. Same INSERT-into-lesson_archive pattern as archive_duplicate_lesson; same fix (rewrite source side).
3. **`scripts/orphan-recovery/phase-5-b-new-publish.ts`** — historical recovery script that ran during Phase 5b. Recommend leaving with a header comment rather than removing references (script won't re-run; audit value preserved). User confirmation requested at PR 1 task time.
4. **`supabase/dump-data.sql`** — pg_dump output sitting in source control; not referenced by `seed.sql` or supabase config. The 993 lessonFormat hits are data values, not code. NO ACTION.
5. **`scripts/migrate-metadata-to-columns.mjs`** — appears to be a historical column-migration helper script (writes lesson_format alongside other columns). DELETE entries since the script may need reuse for future column migrations; cleaner to keep it consistent with current schema.

### TEST DB verification needed at PR 1 task time (per impl plan §1.1)

Before writing the migration:
1. `mcp__supabase-test__execute_sql`: `SELECT pg_get_triggerdef(t.oid), tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='lessons' AND tgname IN ('handle_lessons_metadata_write_trg','lessons_normalize_write_trg');` — confirm whether legacy `handle_lessons_metadata_write_trg` is still attached + verify exact attached trigger names.
2. `mcp__supabase-test__execute_sql`: `SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN ('idx_lessons_format','idx_lessons_lesson_format');` — confirm 2 indexes (matches baseline grep). If TEST DB shows different count, investigate before proceeding.
3. `mcp__supabase-test__execute_sql`: `SELECT count(*) FROM lessons WHERE metadata ? 'lessonFormat';` — corpus shape baseline (expect populated, this is the field being stripped).
4. `mcp__supabase-test__execute_sql`: `SELECT activity_type, count(*) FROM lessons GROUP BY activity_type ORDER BY count(*) DESC;` — confirm no rows currently use 'craft' (it's the new D2 enum value).
5. `mcp__supabase-test__execute_sql`: `SELECT count(*) FROM lessons WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;` — confirm tags column is empty/null on (almost) every row.
6. `mcp__supabase-test__execute_sql`: `SELECT cultural_responsiveness_features, count(*) FROM lessons WHERE cultural_responsiveness_features IS NOT NULL AND array_length(cultural_responsiveness_features, 1) > 0 GROUP BY cultural_responsiveness_features ORDER BY count(*) DESC LIMIT 20;` — distribution + drift evidence for D9 prep.

## Session log

### Session 0 — 2026-05-03 — kickoff scaffolding + reviewer-feedback round (pre-execution)

Major events:
- /kickoff-feature ran post-walkthrough closure (13 calls + 1 cleanup track wrapped at session 9, 2026-05-03).
- Four-file scaffold committed: design doc + implementation plan + kickoff prompt + this status doc (commit `390523e`).
- Decision journal at `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` remains the authoritative WHY for every locked decision; design doc compresses for execution reference.
- Locked decisions per user message at scaffolding time: D0 / D1 meta / D2 / D3 / D4 / D5 / D6 / D7 / D8 substance / D9 / N1 / Stage 1 worksheet methodology / Cross-cutting Scope 3 / 23-lesson import-drop list / extension to ~10 high-fit field LLM prompts.
- Out of scope (Phase 2): marginal-field LLM prompts (`grade_levels`, `location`); reviewer-validate UI redesign; general reviewer UX redesign; dedup-pipeline third-state redesign; CRF UI surfacing.
- Deferred to foundation-phase implementation planning (NOT Phase 2): Stage 2 reviewer-validation UX walk.
- NOT out of scope (parallel foundation-phase track): Stage 1 worksheet rounds (heritage first, concepts second, ~8 smaller fields).
- **Reviewer feedback round (post-scaffold):** Three Opus agents investigated 6 findings. Verdicts: accept lessonFormat dependency-sweep finding (with one factual correction: 1 index, not 9); accept PR-2 vocab gating; accept cross-runtime validator architecture concern; accept archive concepts recovery missing; reject Stage 2 reviewer-model "contradiction" as documentation gap (two layers, both planned, broader walk explicitly deferred); accept search PR-3 split. Edits applied: design doc + impl plan + kickoff prompt updated; three pre-execution gates added.
- Execution begins at Gate A (lessonFormat dependency sweep verification) in next session.

### Session 1 — 2026-05-03 — Gate A (lessonFormat dependency sweep)

Major events:
- Gate A executed: full grep + categorization sweep across `src/`, `supabase/`, `scripts/`. ~30 active code surfaces inventoried (matching design doc's "~95 line refs" approximation). Per-surface task list folded into status doc above (see "Gate A output" section).
- **Three reviewer-cited refs verified.** `ReviewDetail.tsx:978` confirmed (form-field block 977-986 cluster); `useLessonSearch.ts:115` exact match; `complete_review_atomic` migration line 128 area confirmed (INSERT branch).
- **One new finding:** `resolve_duplicate_group` (20251203 + 20251204) is a 5th RPC referencing `lesson_format` — impl plan §1.3 only listed 4. Pattern is INSERT into `lesson_archive` from a `lessons` row SELECT, same as `archive_duplicate_lesson`. Fix is rewrite-source-side (target side keeps `lesson_archive.lesson_format` column per Gate A keep-historical default). Will fold into PR 1 Task 1.3 step 2.
- **Audit complete (no work needed):** `supabase/functions/smart-search/index.ts` has zero `lesson_format`/`lessonFormat` refs. Edge-side surface is only `_shared/search-helpers.ts` + the `lessons_with_metadata` view.
- **Decision points logged for PR 1 task time:**
  - `lesson_archive.lesson_format` column kept (Gate A default).
  - `scripts/orphan-recovery/phase-5-b-new-publish.ts` — historical script; recommend leave-with-comment rather than rewrite (won't re-run; audit value preserved).
  - `supabase/dump-data.sql` — pg_dump output, 993 hits are data values not code; no action.
  - `handle_lessons_metadata_write` legacy trigger attachment status to verify on TEST DB before PR 1 migration writes.
- **TEST DB verification queue logged** (6 queries) for PR 1 Task 1.1 — pre-migration corpus-shape verification. Includes legacy trigger pg_trigger check, index inventory confirmation, lessonFormat key population count, activity_type / tags / CRF distribution queries.
- Baseline checks clean throughout: `npm run type-check && npm run lint` both green.
- No code changes this session; status doc updated.

Next session: Gate B (validator architecture decision + Zod canonical scaffold). Per impl plan, Gate B produces `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (≤200 lines) capturing the two-schema split, mapper contract, edge-function dependency strategy, and equivalence-test approach. The actual scaffold code lands in PR 1 as Task 1.0.
