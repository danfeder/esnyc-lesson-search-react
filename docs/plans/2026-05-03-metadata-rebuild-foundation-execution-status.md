# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-03 — Session 3 complete (Gate C done; all 3 pre-PR-1 gates closed)
**Current PR:** PR 1 next (Pre-PR-1 Gates A/B/C all closed)
**Current task:** PR 1 Task 1.0 — land the Zod canonical scaffold (Gate B output) on a feature branch
**Branch:** main (not yet branched for PR 1)
**Last commit on branch:** `d9bacd0` — docs(metadata-foundation): session 3 — Gate C per-prompt readiness audit complete

## Done

- **Gate A — lessonFormat dependency sweep verified.** Per-surface task list produced (see "Gate A output" below). Three reviewer-cited refs confirmed; smart-search audit complete (no refs in smart-search/index.ts); 5th RPC discovered (`resolve_duplicate_group`); `lesson_archive.lesson_format` keep-historical decision documented.
- **Gate B — validator architecture decisions captured.** Output doc at `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (179 lines). 7 decisions + CI gate summary + 3 open TBDs. Decisions: (1) Option B locked (TS/Zod canonical) — codebase TS-bias rationale; (2) two-schema split locked (LessonMetadata canonical / ReviewMetadata review-form) with bidirectional mapper contract mirroring `complete_review_atomic` SQL translation; (3) file locations recommended (`src/types/lessonMetadata.zod.ts`, `src/types/reviewFormPayload.zod.ts`, `src/types/generated/enums.json`, `scripts/generate-enums-json.ts`, `src/utils/{reviewToLesson,lessonToReview}Mapper.ts`, `supabase/functions/deno.json`); (4) edge function deps via `deno.json` `npm:zod@3.24.0` with esm.sh URL fallback; (5) Vitest enum-equivalence test approach (Zod source ↔ committed enums.json), Python equivalence deferred to Stage 2 host repo (consumes enums.json regardless); (6) SQL CHECK on three text[] columns (activity_type, tags, CRF) + extend trigger to RAISE EXCEPTION on bad enum values, hand-synced from enums.json with `-- SOURCE: enums.json["<key>"]` comment markers + Vitest sync test; (7) initial closed-enum coverage = activity_type/tags/CRF/season_timing only, rest stay open `z.array(z.string())` until Stage 1 worksheets tighten them.
- **Gate C — per-prompt readiness audit complete.** 10 fields classified (8 impl-plan-listed + 2 obvious-gap candidates added during audit). **Net: 5 vocab-locked / 5 Stage-1-gated / 0 dropped.** Full table + worksheet-round assignment + net PR-2 prompt scope below at "Gate C output". Combined with design-doc-locked classifications, **PR 2 vocab-locked prompt scope is now 8 prompts** (CRF + activity_type + tags + thematic_categories + social_emotional_learning + cooking_methods + season_timing + core_competencies); **Stage-1-gated prompt scope is 6 distinct prompts post-bundling** (academicConcepts+academic_integration bundled / cultural_heritage / garden_skills / cooking_skills / main_ingredients / observances_holidays).

## In flight

(none — Session 3 wrapped Gate C; all three pre-PR-1 gates are closed; next session starts PR 1 Task 1.0)

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

## Gate C output — Per-prompt readiness audit (Session 3, 2026-05-03)

### Verdict

10 candidate fields evaluated. **5 vocab-locked / 5 Stage-1-gated / 0 dropped.** Combined with design-doc-locked classifications (CRF / activity_type / tags vocab-locked + academicConcepts / cultural_heritage Stage-1-gated), the **PR 2 vocab-locked prompt scope is 8 prompts**; **Stage-1-gated prompt scope is 6 distinct prompts** (post-bundling of academicConcepts+academic_integration into one consolidated subject+concepts prompt per user decision Q2).

Two obvious-gap candidates surfaced during audit and added to the list per user direction:
- **`core_competencies`** — same structural shape as `social_emotional_learning` / `thematic_categories` (closed Title-Case enum + kebab dupes); was missed from impl plan §Gate C list. User confirmed addition (vocab-locked).
- **`academic_integration` (top-level subjects)** — clean 6-value v3 enum + kebab dupes. Mechanically vocab-locked, BUT operationally tied to `academicConcepts` (D5 locked Stage-1-gated). User confirmed bundling: one consolidated submission-time prompt does a single body-read and outputs both top-level subjects AND nested concepts; the bundled prompt waits for the concepts worksheet.

### Method

- TEST DB queried via `mcp__supabase-test__execute_sql` (corpus = 772 lessons; matches PROD shape per `project_metadata_three_regimes.md`).
- Each field's distinct-value count, total appearances, top-N values, and case-mix indicators read out.
- Compared against v3 baseline at `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md` and drift signals at `project_vocabulary_drift_scope.md`.
- Classification framework: **vocab-locked** = vocabulary is unambiguous today (matches v3, no novel concepts the corpus surfaces beyond minor case-drift dupes); **Stage-1-gated** = vocabulary needs ontology decisions (novel concepts beyond v3 / category-headers tagged as values / group-vs-specific granularity ambiguity) requiring curriculum-team validation in a worksheet round; **dropped** = out of foundation-phase scope.

### Classification table

| # | Field | Distinct | Total | Verdict | Worksheet round | Notes |
|---|---|---:|---:|---|---|---|
| **Pre-locked from design doc §6:** ||||||
| — | `cultural_responsiveness_features` | (7-locked) | — | **vocab-locked** | n/a (D9 master list) | Ships PR 2 |
| — | `activity_type` | (5-locked) | — | **vocab-locked** | n/a (D2) | Ships PR 2 |
| — | `tags` | (2-locked) | — | **vocab-locked** | n/a (D2+D7) | Ships PR 2 |
| — | `academicConcepts` | (~211 v3 baseline) | — | **Stage-1-gated** | concepts | D5 — bundled w/ academic_integration top-level per Q2 |
| — | `cultural_heritage` | 78 | 939 | **Stage-1-gated** | heritage | Stage-1 round 1 |
| **Gate C audit:** ||||||
| 1 | `thematic_categories` | 14 | 1602 | **vocab-locked** | n/a | 7 v3 + 7 kebab dupes; no novel concepts |
| 2 | `social_emotional_learning` | 10 | 1824 | **vocab-locked** | n/a | 5 CASEL + 5 kebab dupes |
| 3 | `cooking_methods` | 5 | 475 | **vocab-locked** | n/a | All-kebab today; 4 v3 concepts + basic-prep / basic-prep-only collapse |
| 4 | `season_timing` | 4 | 1433 | **vocab-locked** | n/a | Pure Title-Case zero drift; only Fall / Winter / Spring / Summer used (v3's other 3 unused) |
| 5 | `core_competencies` | 13 | 1777 | **vocab-locked** | n/a | 6 ESYNYC + 6 kebab dupes + 1 rogue "Food Justice" cnt=2; **added per Q1** |
| 6 | `garden_skills` | 46 | 887 | **Stage-1-gated** | smaller-fields | 16 v3 + ~30 novel corpus concepts (sensory-exploration / seed-starting / transplanting / pollinator-observation / "Feeding worms" / "Digging") + kebab dupes |
| 7 | `cooking_skills` | 123 | 1748 | **Stage-1-gated** | smaller-fields | Biggest cleanup. v3 **category headers** ("Cutting Skills" 127 / "Basic Skills" 24 / "Cooking Techniques" 28 / "Presentation" 6) tagged as if skills; ontology overlaps (Mixing 181 vs Mixing/stirring 4 vs Stirring 14; Sautéing 35 vs Sauteing 10) |
| 8 | `main_ingredients` | 227 | 1819 | **Stage-1-gated** | smaller-fields | Biggest expansion. Group headers (Alliums 190 / Leafy greens 93 / "Herbs & Aromatics" 52) mixed with specifics (Cilantro 49 / Mint 11 / Bell peppers 14) + non-v3 additions (Eggs 26 / Dairy 21 / Honey 16 / Oats 19 / Yogurt 17 / Butter 10) |
| 9 | `observances_holidays` | 17 | 129 (sparse — 17% of corpus) | **Stage-1-gated** | smaller-fields (small) | 10 v3 + 5 sensible corpus additions (Juneteenth 4 / Eid 3 / Earth month 2 / Pride 1 / New Year 1); **chose Stage-1-gated for discipline per Q3** (downgrade to vocab-locked acceptable if curriculum team waves it through quickly) |
| 10 | `academic_integration` (top-level subjects) | 12 | 1369 | **Stage-1-gated** (BUNDLED) | concepts | 6 v3 subjects + 6 kebab dupes; **bundled with `academicConcepts` per Q2** — single consolidated submission-time prompt, one body-read, two outputs (subjects array + concepts object). Top-level technically vocab-locked today, but operational efficiency wins. |

### Net PR 2 prompt scope (post-Gate-C)

**Vocab-locked (8 prompts, ship in PR 2 once eval gate passes for each):**
1. `cultural_responsiveness_features` (D9; 7 master-list features)
2. `activity_type` (D2; 5 values)
3. `tags` (D2+D7; 2 values)
4. `thematic_categories` (Gate C; 7 values)
5. `social_emotional_learning` (Gate C; 5 CASEL values)
6. `cooking_methods` (Gate C; 4 values)
7. `season_timing` (Gate C; 4 values)
8. `core_competencies` (Gate C; 6 ESYNYC values)

**Stage-1-gated (6 distinct prompts, deploy after corresponding worksheet lands):**

| Worksheet round | Prompts gated by it |
|---|---|
| **heritage** | `cultural_heritage` (1 prompt) |
| **concepts** | `academicConcepts` + `academic_integration` BUNDLED (1 consolidated prompt) |
| **smaller-fields** | `garden_skills`, `cooking_skills`, `main_ingredients`, `observances_holidays` (4 prompts) |

Total post-bundling: **6 distinct Stage-1-gated prompts** rather than the 7 a fully-split design would have implied.

### Decisions captured (Gate C)

- **Q1 — `core_competencies` added.** Pattern matches `social_emotional_learning` exactly: 6 ESYNYC official Title-Case values + 6 kebab dupes + 1 rogue value; mechanical canonicalization. Was missed from impl plan §Gate C list.
- **Q2 — academic_integration top-level + academicConcepts bundled.** Single consolidated submission-time prompt: one LLM body-read, two outputs (subjects array + nested concepts object). Avoids the 2× LLM call cost of splitting them. Bundle waits for the concepts worksheet (Stage-1-gated category dominates).
- **Q3 — `observances_holidays` Stage-1-gated, not vocab-locked.** Mostly canonical today + 5 sensible corpus additions; could have shipped vocab-locked with the corpus list. Chose Stage-1-gated for "every vocab gets curriculum-validated" discipline. Downgrade to vocab-locked is acceptable if curriculum team rubber-stamps the additions quickly.

### TEST DB verification at PR 2 task time (forward-looking)

Before each Stage-1-gated prompt deploys post-worksheet, re-query the corpus to confirm:
1. Worksheet output (canonical vocab + alias list) covers every distinct value currently in the field.
2. Any drift introduced between PR 2 ship and worksheet land is captured in alias map for Stage 2 re-tag mapping.
3. For `academic_integration` BUNDLED prompt: subjects + concepts arrive consistently in canonical-keys shape; mapper tests cover the bundle.

### Notes for PR 2 implementation planner

- Per the operational gating choice (kickoff §LOCKED): vocab-locked prompts ship in PR 2 only after their per-prompt eval gate passes. Plan 8 eval-gate runs in PR 2 task list, not 3.
- Per `academicConcepts` bundling: PR 2's prompt-design doc should include one consolidated `academic_integration` prompt spec (subjects + concepts), not two; the bundled prompt's vocabulary scope is gated by the concepts worksheet outputs.
- The 6 `cooking_skills` v3 category headers ("Cutting Skills", "Basic Skills", "Cooking Techniques", "Presentation", "Cutting Skills" sub-categories) being tagged as if they're skill values is itself a worksheet input — surfaces the question "do we expose v3 categories as skills, collapse them, or split into a 2-level taxonomy?"
- The 5 corpus observances additions (Juneteenth / Eid / Earth month / Pride / New Year) are pre-staged inputs for the smaller-fields worksheet — they're already in PROD-ish data, the worksheet just blesses-or-trims.

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

### Session 2 — 2026-05-03 — Gate B (validator architecture decision)

Major events:
- **Gate B output committed at `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md`** (179 lines, under the ≤200 cap). Captures 7 decisions + CI gate summary + 3 open TBDs.
- **Verified current-state baseline before drafting:**
  - `package.json`: zod NOT installed (confirmed; PR 1 Task 1.0 adds `zod@^3.24.0` to dependencies).
  - `supabase/functions/`: 12 functions, NO existing `deno.json` or `import_map.json` at function-dir level (PR 1 Task 1.0 creates `deno.json`).
  - `src/types/index.ts:28-49` (LessonMetadata) and `:103-121` (ReviewMetadata): two-schema divergence confirmed — `activityType` (array vs string), key renames `themes ↔ thematicCategories` / `season ↔ seasonTiming` / `location string ↔ locationRequirements array`.
  - `/Users/danfeder/cCode/taggingv3/gpt_tagger/models.py`: 5 strict-enum fields in `Metadata` class (gradeLevel, thematicCategories, locationRequirements, socialEmotionalLearning, lessonFormat) + 2 lenient in `MetadataO4Mini` subclass (observancesHolidays, culturalResponsivenessFeatures with auto-correct/silent-drop). Matches design doc's "5 of 17" framing.
  - `valid_seasons` CHECK exists in baseline (text[] `<@` set-containment idiom — precedent for new CHECK constraints).
  - `lessons_normalize_write_trg` (baseline `20260509000000`): shape-only column⇄metadata sync covering 10 fields (concepts rescue + B–K). Pattern is `RAISE NOTICE` on coercion. Foundation phase extends to value-validation with `RAISE EXCEPTION` (hard-fail).
- **7 decisions captured:**
  1. Option B (TS/Zod canonical) confirmed — codebase TS-bias rationale.
  2. Two-schema architecture (LessonMetadata + ReviewMetadata) with bidirectional pure-function mappers mirroring `complete_review_atomic` SQL translation; round-trip property tests.
  3. File locations: `src/types/lessonMetadata.zod.ts`, `src/types/reviewFormPayload.zod.ts`, `src/types/generated/enums.json`, `scripts/generate-enums-json.ts`, `src/utils/{reviewToLesson,lessonToReview}Mapper.ts`, `supabase/functions/deno.json`.
  4. Edge function deps via `deno.json` `npm:zod@3.24.0` with `esm.sh` URL fallback documented.
  5. Vitest enum-equivalence test (Zod source ↔ committed enums.json) replaces a separate "is enums.json fresh" CI step. Python equivalence deferred to Stage 2 batch host repo (TBD); enums.json is the contract regardless.
  6. SQL CHECK on three text[] columns (activity_type 5-value, tags 2-value, cultural_responsiveness_features 7-value) following `valid_seasons` precedent + extend trigger to RAISE EXCEPTION on bad JSONB-embedded enum values. Hand-synced from enums.json with `-- SOURCE: enums.json["<key>"]` comment markers + Vitest string-match sync test.
  7. Initial closed-enum coverage in PR 1 scaffold = activity_type / tags / CRF / season_timing; remaining 12 fields stay `z.array(z.string())` placeholders until Stage 1 worksheets land in PR 5+.
- **3 TBDs documented as deferred (not blocking PR 1):**
  - Stage 2 batch host repo location (in-repo vs sibling-repo) — affects Pydantic equivalence test location, decided at PR 6+ scope.
  - Whether to migrate `complete_review_atomic` SQL translation to TS-side mappers as the source of truth — Phase 2 reviewer-UX decision; foundation phase keeps both with mapper round-trip tests as drift protection.
  - Pydantic auto-generation from enums.json (`Literal[*VALUES]` with json-load at module import) — recommended at PR 6+ time to eliminate hand-mirror step.
- **No code changes this session.** Gate B is investigation/decision only; the scaffold code lands as PR 1 Task 1.0 per impl plan §1.0 (two Zod schemas + two mappers + mapper tests + enums.json + generator + package.json zod install + deno.json + Vitest equivalence tests).
- Baseline checks clean throughout: `npm run type-check && npm run lint` both green.

Next session: Gate C (per-prompt readiness audit). Per impl plan §Gate C, audits ~6 candidate fields beyond the locked-3 (CRF / activity_type / tags) + Stage-1-gated-2 (academicConcepts / cultural_heritage). Possible candidates listed: `thematicCategories`, `socialEmotionalLearning`, `cookingMethods`, `cookingSkills`, `gardenSkills`, `seasonTiming`, `observancesHolidays`, `mainIngredients`. Each gets classified vocab-locked (ships in PR 2) / Stage-1-gated (deploys after worksheet) / dropped (out of foundation scope). Output is a per-prompt classification table folded into PR 2 task list. No commit; investigation only.

### Session 3 — 2026-05-03 — Gate C (per-prompt readiness audit)

Major events:
- **Gate C complete.** Full classification table at "Gate C output" above. **5 vocab-locked / 5 Stage-1-gated / 0 dropped** across the 8 impl-plan-listed candidates + 2 obvious-gap candidates added during audit.
- **Confirmed via TEST DB queries that all 8 impl-plan-listed candidates are typed ARRAY columns** (Phase B migration moved them out of `metadata` JSONB; Gate C audit re-uses the column shape). Distinct-value counts: thematic_categories=14, social_emotional_learning=10, cooking_methods=5, season_timing=4, garden_skills=46, cooking_skills=123, main_ingredients=227, observances_holidays=17. Lesson count 772.
- **Two obvious-gap candidates surfaced and added per user direction:**
  - **`core_competencies`** — 13 distinct (6 ESYNYC + 6 kebab dupes + 1 rogue "Food Justice" cnt=2); same shape as social_emotional_learning. Was missed from impl plan §Gate C list. Added as **vocab-locked** per Q1.
  - **`academic_integration` (top-level subjects)** — 12 distinct (6 v3 subjects + 6 kebab dupes); mechanically vocab-locked but operationally tied to `academicConcepts` (locked Stage-1-gated). Added per Q2 as **Stage-1-gated, BUNDLED** with academicConcepts under one consolidated submission-time prompt (single body-read, two outputs).
- **`observances_holidays` decision:** chose Stage-1-gated per Q3 for "every vocab gets curriculum-validated" discipline; downgrade to vocab-locked acceptable if curriculum team rubber-stamps the 5 corpus additions (Juneteenth / Eid / Earth month / Pride / New Year) quickly.
- **Worksheet-round assignment for the 5 Stage-1-gated fields:** heritage (cultural_heritage) / concepts (academicConcepts+academic_integration BUNDLED) / smaller-fields (garden_skills, cooking_skills, main_ingredients, observances_holidays).
- **Net PR 2 vocab-locked prompt scope is now 8 prompts** (CRF + activity_type + tags + thematic_categories + social_emotional_learning + cooking_methods + season_timing + core_competencies). PR 2 task list (impl plan §2.1) needs to plan 8 eval-gate runs, not 3.
- **Net Stage-1-gated prompt scope is 6 distinct prompts** post-bundling (heritage / academicConcepts+academic_integration / garden_skills / cooking_skills / main_ingredients / observances_holidays).
- **Three notes captured for PR 2 implementation planner:** (1) eval-gate count = 8 not 3; (2) academicConcepts prompt spec must include subjects bundling, not two prompts; (3) cooking_skills v3 category headers being tagged as if they're skills is itself a worksheet-input question (expose categories / collapse / split 2-level).
- Baseline checks clean throughout: `npm run type-check && npm run lint` both green.
- No code changes this session; status doc updated; investigation-only.

Next session: PR 1 Task 1.0 — land the Zod canonical scaffold (Gate B output) on a new feature branch `feat/metadata-foundation-schema`. Per impl plan §1.0: create two Zod schemas + bidirectional mappers + mapper tests + enums.json + generator script + `npm install zod@^3.24.0` + `supabase/functions/deno.json`. Initial closed-enum coverage = activity_type (5) / tags (2) / cultural_responsiveness_features (7) / season_timing (4); rest stay `z.array(z.string())` placeholders. Verify edge function imports zod via deno.json `npm:zod@3` (esm.sh fallback in reserve). Commit message template in impl plan §1.0.
