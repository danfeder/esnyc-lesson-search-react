# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-04 — Session 8 complete (PR 1 Task 1.3b — lessonFormat removal frontend + edge sweep shipped: 35 files / -177 / +20)
**Current PR:** PR 1 in flight (multi-task; opens after Task 1.6 lands)
**Current task:** PR 1 Task 1.4 — Filter UI updates (Activity Type 5-value expand + new Lesson Type tag-based filter section starting with `["orientation", "bilingual_handouts"]` + `academic-cooking` slug rename to align with `both` storage)
**Branch:** `feat/metadata-foundation-schema` (local, not pushed)
**Last commit on feature branch:** `57f0e69` — feat(metadata-foundation): lessonFormat removal — frontend + edge sweep. Session 8 will add a status-doc commit at session end.
**Last commit on main:** `3b7ab8d` — docs(metadata-foundation): session 4 — PR 1 Task 1.0 (Zod canonical scaffold) shipped

## Done

- **PR 1 Task 1.3b — lessonFormat removal frontend + edge sweep shipped (commit `57f0e69`, 35 files / -177 / +20).** Coordinated companion to Task 1.3 SQL migration. Surfaces removed: 16 src/ files (types/index.ts × 3 entries, IntCard helper+ref, IntListRow helper+ref, IntSidebar filter section + docstring, filterDefinitions FILTER_CONFIGS.lessonFormat block, filterUtils 2 maps, ScreenReaderAnnouncer, searchStore initialFilters, facetCounts × 4 entries, useLessonSearch projection + asString helper, useLessonSuggestions × 2, ReviewDetail form-field block, ReviewMetadataForm renderField, AdminDuplicateReview attribute table entry, duplicateGroupService LessonForReview entry); 1 edge shared (`_shared/search-helpers.ts` × 4 refs); 5 Zod scaffold cleanups per Session 5 amendment 7 (lessonMetadata.zod field+comment, reviewFormPayload.zod field, reviewToLessonMapper if-block, lessonToReviewMapper if-block, reviewToLessonMapper.test fixtures × 4); 7 test fixture files (searchStore.test deleted full "single-select dropdown filters" `it(...)` block per Session 8 decision below; facetCounts.test 5 fixtures + 1 assertion; duplicateGroupHelpers.test × 2; lesson-search.infinite.test × 5 (resolved by 2 separate replace_all patterns due to indent-depth difference); search-page.test × 1; factories × 2; IntLessonSpecCard.test × 1); 4 scripts (analyze-duplicates × 2 entries, analyze-duplicates-v2 × 2 entries, identify-and-restore-missing-lessons × 1, migrate-metadata-to-columns × 3); 2 docs (types/CLAUDE.md + stores/CLAUDE.md examples). Audit-script `scripts/orphan-recovery/phase-5-b-new-publish.ts` left intact body + new header comment per Gate A decision. Compat bridge: `useLessonSearch.ts:114` keeps `filter_lesson_format: undefined` send for one-release window per round-2 reviewer feedback (PostgREST PGRST202 hard-404 + Netlify 1y asset cache); inline comment defends the line for reviewer agents. Verification: `type-check` + `lint` clean (one fix-up: removed now-unused `setFilters` destructure from IntSidebar after deleting filter section, and now-unused `asString` helper from useLessonSearch); `npm run test --run` 507/507 across 37 files (down from 508 — exactly the deleted searchStore "single-select dropdown filters" test); `npm run test:rls` 5 passed / 2 failed (same pre-existing `archive_duplicate_lesson` scenario failures as Sessions 6+7 baseline; Task 1.3b touches no RLS or RPC definitions, so failures persist as expected). Branch is local (not pushed); PR 1 multi-task opens after Task 1.6 lands.
- **Gate A — lessonFormat dependency sweep verified.** Per-surface task list produced (see "Gate A output" below). Three reviewer-cited refs confirmed; smart-search audit complete (no refs in smart-search/index.ts); 5th RPC discovered (`resolve_duplicate_group`); `lesson_archive.lesson_format` keep-historical decision documented.
- **Gate B — validator architecture decisions captured.** Output doc at `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md` (179 lines). 7 decisions + CI gate summary + 3 open TBDs. Decisions: (1) Option B locked (TS/Zod canonical) — codebase TS-bias rationale; (2) two-schema split locked (LessonMetadata canonical / ReviewMetadata review-form) with bidirectional mapper contract mirroring `complete_review_atomic` SQL translation; (3) file locations recommended (`src/types/lessonMetadata.zod.ts`, `src/types/reviewFormPayload.zod.ts`, `src/types/generated/enums.json`, `scripts/generate-enums-json.ts`, `src/utils/{reviewToLesson,lessonToReview}Mapper.ts`, `supabase/functions/deno.json`); (4) edge function deps via `deno.json` `npm:zod@3.24.0` with esm.sh URL fallback; (5) Vitest enum-equivalence test approach (Zod source ↔ committed enums.json), Python equivalence deferred to Stage 2 host repo (consumes enums.json regardless); (6) SQL CHECK on three text[] columns (activity_type, tags, CRF) + extend trigger to RAISE EXCEPTION on bad enum values, hand-synced from enums.json with `-- SOURCE: enums.json["<key>"]` comment markers + Vitest sync test; (7) initial closed-enum coverage = activity_type/tags/CRF/season_timing only, rest stay open `z.array(z.string())` until Stage 1 worksheets tighten them.
- **Gate C — per-prompt readiness audit complete.** 10 fields classified (8 impl-plan-listed + 2 obvious-gap candidates added during audit). **Net: 5 vocab-locked / 5 Stage-1-gated / 0 dropped.** Full table + worksheet-round assignment + net PR-2 prompt scope below at "Gate C output". Combined with design-doc-locked classifications, **PR 2 vocab-locked prompt scope is now 8 prompts** (CRF + activity_type + tags + thematic_categories + social_emotional_learning + cooking_methods + season_timing + core_competencies); **Stage-1-gated prompt scope is 6 distinct prompts post-bundling** (academicConcepts+academic_integration bundled / cultural_heritage / garden_skills / cooking_skills / main_ingredients / observances_holidays).
- **PR 1 Task 1.0 — Zod canonical scaffold landed on `feat/metadata-foundation-schema` (commit `6b46db4`, 11 files / +761 lines).** Two-schema architecture (canonical lesson + review-form payload) plus bidirectional pure-function mappers mirroring the SQL translation in `complete_review_atomic`. Initial closed-enum coverage = activity_type (5) / tags (2) / season_timing (4) / cultural_responsiveness_features (7); rest stay `z.array(z.string())` until Stage 1 closes them. CRF master-list cross-validated against TEST DB top-7 distribution. Generator script + committed `enums.json` + Vitest equivalence test (replaces a separate "is enums.json fresh" CI step). `supabase/functions/deno.json` resolves zod for edge functions (`npm:zod@3.24.0`). Verification: `type-check` + `lint` clean; full `vitest --run` 508/508 across 37 files (33 new — 28 mapper + 5 enum equivalence); generator idempotent. Branch is local (not pushed); PR 1 opens after Task 1.6 lands.
- **PR 1 Task 1.3 — lessonFormat removal coordinated SQL migration shipped (commit `35cac25`).** New file `supabase/migrations/20260512000000_drop_lesson_format.sql` (~640 lines) + sibling `.sql.rollback` (~135 lines, inert by extension) + 1-line edit to `supabase/seed.sql` (5 sample-lesson tuples + INSERT column list, lesson_format removed). Stages: (1) `lessons_with_metadata` view recreated with `NULL::text AS lesson_format` projection (compat bridge for one release; drops in 1.3a follow-up); (2) 3 RPCs redefined — `search_lessons` CREATE OR REPLACE keeps `filter_lesson_format text DEFAULT NULL` parameter (PostgREST PGRST202 compat bridge) + removes the WHERE clause + removes the lessonFormat key from the per-field COALESCE metadata overlay; `complete_review_atomic` CREATE OR REPLACE drops the v_legacy_meta lessonFormat key + the lesson_format INSERT column ref + the lesson_format UPDATE column ref (otherwise byte-identical to 20260510000000); `get_lesson_details_for_review` DROP+CREATE drops `lesson_format TEXT` from RETURNS TABLE + `l.lesson_format` from SELECT; (3) `lessons_normalize_write` trigger function CREATE OR REPLACE drops section (B) only (sections A + C..K byte-identical to 20260509000000); (4) 2 indexes dropped (`idx_lessons_format` JSON-path + `idx_lessons_lesson_format` column-based); (5) `UPDATE lessons SET metadata = metadata - 'lessonFormat'`; (6) `ALTER TABLE lessons DROP COLUMN IF EXISTS lesson_format`; (7) verify-only no-op for legacy `handle_lessons_metadata_write_trg` (Session 5 + Session 7 confirmed not attached); (8) `lesson_archive.lesson_format` historical-archive decision documented via COMMENT ON COLUMN. Local verification: `supabase db reset` clean apply across all 56 migrations; 7 impl-plan verification queries pass (Q5 false-positive on inline comment refs — confirmed via comment-stripped regex that complete_review_atomic + search_lessons have NO functional refs); search_lessons accepts and ignores `filter_lesson_format='standalone'` (compat bridge proof); `lessons_with_metadata` view returns NULL for lesson_format projection; get_lesson_details_for_review return shape no longer has lesson_format TEXT; `_alias_lesson_format` helper preserved; trigger sections C..K unchanged; Task 1.2 columns intact. RLS smoke: `5 passed, 2 failed — ✅ RLS implementation is working correctly!` — same 2 pre-existing `archive_duplicate_lesson` scenario failures as Session 6 baseline; **Task 1.3 does NOT redefine `archive_duplicate_lesson` (NO-OP per Session 7 amendment 10), so the failures persist as expected** (would have resolved incidentally only if Task 1.3 had touched that RPC). Type-check + lint clean. Branch is local (not pushed); PR 1 multi-task opens after Task 1.6 lands.
- **PR 1 Task 1.2 — Additive schema migration shipped (commit `eaaf702`).** New file `supabase/migrations/20260511000000_metadata_foundation_schema_additive.sql` (55 lines, 1 file). Three columns added: `lessons.series_id text` (nullable, D6) / `lessons.part_number int` (nullable, D6) / `lessons.crf_confirmed boolean NOT NULL DEFAULT false` (D9 backend marker). Two partial indexes: `lessons_series_id_idx` + `lessons_part_number_idx` (`WHERE … IS NOT NULL` — sparse population expected). Idempotent (every statement `IF NOT EXISTS`); rollback block included as comments. Filename `20260511000000_*` chosen to sort after the latest existing migration `20260510000000_approve_update_concepts_carry_forward.sql` (per ASCII-sort gotcha in MEMORY.md). Verified locally: `supabase db reset` succeeded with new migration applied; MCP schema inspection confirmed all 3 columns + both indexes present with correct shapes; 5 seed rows backfilled to `crf_confirmed=false` (default); direct re-run of migration body via MCP succeeded (IF NOT EXISTS clauses idempotent). `supabase db diff` could not run — shadow-DB port collision on 54320 (another local Supabase project running), unrelated to this migration; `db reset` + MCP verification covers what `db diff` would have shown. RLS tests show 2 pre-existing scenario failures in `archive_duplicate_lesson` validation behavior (untouched by Task 1.2 — additive columns only, no RLS / RPC changes). Type-check + lint clean. Branch is local (not pushed); PR 1 multi-task opens after Task 1.6 lands.
- **PR 1 Task 1.1 — Pre-migration corpus verification (TEST DB) complete.** All 7 steps cleared via `mcp__supabase-test__execute_sql` reads. Gate A inventory drift confirmed minimal (86 pre-existing actionable refs vs ~80 baseline; within approximation). Three reviewer-cited refs re-verified exact (`ReviewDetail.tsx:978`, `useLessonSearch.ts:115`, `complete_review_atomic` migration line 128 INSERT branch). Three new findings folded into Gate A output below: (a) Session-4 Zod scaffold introduced 13 new `lessonFormat` line refs across 5 files that need addition to Task 1.3b removal list; (b) snapshot JSON files (5 files / 41 refs) ruled non-actionable per `dump-data.sql` precedent; (c) legacy `handle_lessons_metadata_write_trg` confirmed NOT attached on TEST DB — Task 1.3 step 7 downgraded to verification-only no-op. Corpus shape verified: activity_type single-element text[] with 0 rows using `craft` (D2 fifth value safe to add); tags column 752 null + 20 empty + 0 populated (CHECK passes universally); CRF distribution shows 7 master-list values + 1 drift row ("Communication of high expectations" cnt=1 — singular typo of "Communicates") that Task 1.6 must clean before installing the CHECK constraint, OR accept lenient CHECK design; exactly 2 lessonFormat indexes match Gate A (idx_lessons_format JSON-path + idx_lessons_lesson_format column-based); 749/772 rows have metadata.lessonFormat key, 748/772 have lesson_format column populated (97% population both sides; 1-row mismatch acceptable since Task 1.3 strips both anyway). `series_id`/`part_number`/`crf_confirmed` confirmed not present (additive in Task 1.2).

## In flight

(none — Session 8 wrapped Task 1.3b frontend + edge sweep; next session opens Task 1.4 — Filter UI updates per impl plan §1.4)

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
- **2026-05-03 (Session 4 / Task 1.0):** LessonMetadata Zod schema is fully optional (matches runtime usage of partial drafts / legacy rows). Existing `src/types/index.ts` interfaces (some required fields) NOT touched — consumers using the schema get the Zod-inferred type (`LessonMetadataValidated`), consumers using existing interfaces are unaffected. The eventual canonical-source migration (Zod replaces interfaces) is a Phase-2 / out-of-scope decision per validator-architecture doc TBD #2.
- **2026-05-03 (Session 4 / Task 1.0):** Zod resolved at `^3.25.76` from `npm install zod@^3.24.0` (newest 3.x; specifier in deno.json keeps `npm:zod@3.24.0` as the documented baseline since edge runtime resolves loosely). Edge-function smoke verification (`supabase functions serve` boots without zod import errors) deferred to Task 1.5 — no edge function imports zod yet, so deno.json zod resolution isn't exercised until Task 1.5 wires `complete-review` and `process-submission` to the schemas.
- **2026-05-04 (Session 7 / Task 1.3):** `seed.sql` edit folded into Task 1.3 commit even though Gate A bins it under Task 1.3b. Rationale: `supabase db reset` runs seed.sql after migrations; without the edit, db reset fails after the column drop (the seed's INSERT references the dropped lesson_format column). It's a verification dependency for Task 1.3, not a clean separation. Captured as a Session 7 amendment in this doc; no impact on Task 1.3b's remaining work.
- **2026-05-04 (Session 7 / Task 1.3):** Q5 verification query in impl plan §1.3 — `pg_get_functiondef(...) ~ 'lesson_format'` for complete_review_atomic — produces a false positive because `pg_get_functiondef` includes inline `--`-style comments verbatim, and the new function body has comment markers like `-- lesson_format = COALESCE(...) removed — D3` that legitimately match. Replaced for actual verification with a comment-stripped regex (`regexp_replace(body, '--[^\n]*', '', 'g')` then check). Both complete_review_atomic and search_lessons confirmed clean of functional `lesson_format` refs after stripping comments. Future task-level verifications should use the comment-stripped pattern when checking removed refs in plpgsql function bodies.
- **2026-05-04 (Session 8 / Task 1.3b):** Three Task-1.3b implementation refinements landed during the sweep, two of them divergences from Gate A's literal text that the user blessed at session start:
  - **`searchStore.test.ts` "should handle single-select dropdown filters" test deleted whole rather than per-Gate-A's "delete 4 fixture lines."** Reasoning: the entire `it(...)` block was constructed AROUND lessonFormat single-select behavior (test name + payload + assertions). Surgical 4-line removal would have left an empty `setFilters({})` followup with zero assertions. The cookingMethods value tested in the same payload is multi-select (string[]) not single-select; coverage redundant with other `setFilters` tests in the file. Net test count delta: 508 → 507. Captured as a session decision because the impl plan / Gate A both expected mechanical line removal.
  - **`useLessonSearch.ts:115` compat-bridge handling.** Gate A wording was "DELETE projection; KEEP RPC param send for one release (compat bridge: send `undefined` always — RPC param has DEFAULT NULL)." Resolved as: deleted the projection (line 49), kept the RPC param entry but changed value to literal `undefined` (line 114 post-edit) with a one-line `// PR 1 compat bridge: keep until Task 1.3a follow-up drops the RPC param.` comment. The comment is justified per `feedback_bot_review_investigation.md` since the line otherwise looks like dead code that reviewer agents would suggest removing. Note: dropping the line entirely would have been functionally equivalent (PostgREST treats omitted-key the same as `undefined`-value), but Gate A specifically asked to KEEP the send for one release as defensive habit.
  - **`scripts/orphan-recovery/phase-5-b-new-publish.ts` decision point resolved.** Gate A flagged this as "User confirmation requested at PR 1 task time." User direction at session start was to follow Gate A recommendation (leave-with-comment). Implemented: 7-line audit notice appended to the existing docstring (lines 3-8) noting `lessons.lesson_format` + `metadata.lessonFormat` were dropped in foundation-phase PR 1, that the script ran once during Phase 5b orphan recovery, and that references are intentionally preserved so the audit record matches PROD-applied SQL. Body untouched.
  - **lesson-search.infinite.test.tsx replace_all gotcha (process learning).** First `replace_all` Edit caught only 2 of 5 lessonFormat fixture refs because the file has TWO indentation depths — the simpler test (lines 51-56) uses 12-space indent for inner metadata fields, the nested mockResolvedValueOnce.mockResolvedValueOnce calls (lines 103+, 118+, 138+) use 14-space indent. Required a second `replace_all` with the deeper-indent pattern. Lesson: when files have multiply-nested fixtures, verify with grep after each replace_all that all expected refs are gone before moving on.
  - **Two now-unused declarations removed during type-check fix-up:** `setFilters` destructure in IntSidebar (line 31; only the deleted lessonFormat radio used it) + `asString` helper in useLessonSearch's normalizeMetadata (line 41; only the deleted lessonFormat field used it). Both flagged by tsc; removed without ceremony since they were genuine dead references.

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

1. **`lesson_archive.lesson_format` column** — KEEP per Gate A default. The archive table preserves historical metadata; only the source side (`lessons.lesson_format` SELECT in `archive_duplicate_lesson` + `resolve_duplicate_group`) needs rewriting. Document in PR 1 commit. **Session 5 confirmation:** TEST DB columns query confirmed both `lessons.lesson_format` and `lesson_archive.lesson_format` exist as separate text-nullable columns.
2. **`resolve_duplicate_group` is a 5th RPC** — fold into PR 1 Task 1.3 step 2. Same INSERT-into-lesson_archive pattern as archive_duplicate_lesson; same fix (rewrite source side).
3. **`scripts/orphan-recovery/phase-5-b-new-publish.ts`** — historical recovery script that ran during Phase 5b. Recommend leaving with a header comment rather than removing references (script won't re-run; audit value preserved). User confirmation requested at PR 1 task time.
4. **`supabase/dump-data.sql`** — pg_dump output sitting in source control; not referenced by `seed.sql` or supabase config. The 993 lessonFormat hits are data values, not code. NO ACTION.
5. **`scripts/migrate-metadata-to-columns.mjs`** — appears to be a historical column-migration helper script (writes lesson_format alongside other columns). DELETE entries since the script may need reuse for future column migrations; cleaner to keep it consistent with current schema.

### Session 5 amendments — additional findings (2026-05-04)

6. **Snapshot JSON data files (5 files / 41 line refs) — NO ACTION** (per `dump-data.sql` precedent). Files: `scripts/orphan-recovery/snapshots/multi-review-pre-20260427.json` (33 refs) + `category-b-update-*-pre.json` × 4 (2 refs each = 8 refs). These are pre-recovery JSON snapshots taken 2026-04-27 archiving live row state for forensics; the `lessonFormat` keys/values are data, not code. Same disposition as `supabase/dump-data.sql`'s 993 hits.

7. **Session-4 Zod scaffold added 13 new lessonFormat refs across 5 files — fold into Task 1.3b removal list:**

   | File | Lines | Action |
   |---|---|---|
   | `src/types/lessonMetadata.zod.ts` | 110-112 (comment block "Single-string fields. lessonFormat drops in PR 1 Task 1.3 (D3); included…"), 113 (`lessonFormat: z.string().optional()`) | DELETE comment + field declaration |
   | `src/types/reviewFormPayload.zod.ts` | 37 (`lessonFormat: z.string().optional()`) | DELETE |
   | `src/utils/reviewToLessonMapper.ts` | 81-82 (translation block: `if (input.lessonFormat) { out.lessonFormat = input.lessonFormat; }`) | DELETE |
   | `src/utils/lessonToReviewMapper.ts` | 93-94 (translation block: `if (input.lessonFormat) { out.lessonFormat = input.lessonFormat; }`) | DELETE |
   | `src/utils/reviewToLessonMapper.test.ts` | 72, 77, 98, 119, 215, 239 (6 fixture lines, mostly `'Standalone'` + 1 `'Single period'`) | DELETE field from each fixture (not the test cases themselves; the round-trip tests still cover other fields after lessonFormat removal) |

   These were intentionally included in the Task 1.0 scaffold per Session 4 decision ("Scaffold matches CURRENT TS interfaces; field disappears with the column drop"); Task 1.3b is where the disappearance happens.

8. **Legacy `handle_lessons_metadata_write_trg` confirmed NOT attached on TEST DB.** Triggers query showed only `lessons_normalize_write_trg` (the M4 trigger Task 1.3 step 3 rewrites) and `update_lesson_search_vector_trigger` (search vector — not lessonFormat-related). **Task 1.3 step 7 ("Drop legacy `handle_lessons_metadata_write` trigger if still attached") downgraded to verification-only no-op** — re-run the same query during Task 1.3 implementation to reconfirm before omitting the DROP TRIGGER statement.

9. **`cultural_responsiveness_features` 1-row drift requires Task 1.6 attention.** TEST DB distribution shows 7 master-list values (cnt 68→417) + 1 drift row "Communication of high expectations" (cnt=1 — singular typo of "Communicates"). The Task 1.6 CHECK constraint as currently spec'd (`<@ ARRAY[...7 master-list features...]`) would FAIL on this row. **Recommendation:** fold a 1-row UPDATE into the Task 1.6 migration BEFORE the CHECK installs (within the same transaction): `UPDATE lessons SET cultural_responsiveness_features = array_replace(cultural_responsiveness_features, 'Communication of high expectations', 'Communicates high expectations') WHERE 'Communication of high expectations' = ANY(cultural_responsiveness_features);` — idempotent; running twice is a no-op once cleaned. Alternative: lenient CHECK that accepts the drift value (worse — it preserves Stage-2 cleanup cost). Verify on PROD via `mcp__supabase-remote__execute_sql` at PR 1 PROD-apply time; cleanup count will likely be ≤1 row in PROD too.

### Session 5 — TEST DB verification results (queries from "TEST DB verification needed at PR 1 task time" above, all run 2026-05-04)

| # | Query intent | Result |
|---|---|---|
| 1 | Triggers attached to `lessons` | `lessons_normalize_write_trg` (active) + `update_lesson_search_vector_trigger` (active, unrelated). **`handle_lessons_metadata_write_trg` NOT attached** — Task 1.3 step 7 downgraded to no-op (per amendment 8 above). |
| 2 | lessonFormat indexes | 2 indexes: `idx_lessons_format` (JSON-path on `metadata->>'lessonFormat'`) + `idx_lessons_lesson_format` (column-based on `lesson_format`). **Matches Gate A inventory exactly.** |
| 3 | lessonFormat data populations | Total 772 rows; 749 have `metadata.lessonFormat` key; 748 have `lessons.lesson_format` column populated; 748 have BOTH. ~97% population both sides; 1-row mismatch (metadata key but null column) negligible since Task 1.3 strips both. |
| 4 | activity_type distribution | 5 distinct values: `{cooking}` 298 / `{garden}` 278 / `{both}` 135 / `{academic}` 58 / `{}` 3 (empty). Total 772 ✓. **All populated rows are single-element text[]; ZERO rows currently use `craft`** — D2 fifth value safe to add to CHECK constraint. |
| 5 | tags column usage | 752 NULL + 20 empty array + 0 populated = 772 ✓. Column unused in production data. **CHECK `tags <@ ARRAY['orientation','bilingual_handouts']` passes universally** (empty subset is always true). |
| 6 | CRF distribution + drift | 7 master-list values present (cnt 68→417) + **1 drift row "Communication of high expectations" cnt=1** — singular typo of "Communicates". See amendment 9 above for Task 1.6 cleanup recommendation. |

### Session 7 amendments — TEST DB + migration-history reality check (2026-05-04)

10. **`archive_duplicate_lesson` is NO-OP for Task 1.3.** Gate A predicted this RPC needs source-side rewriting (because 20251205/06/07/08 versions had `lesson_format` in INSERT INTO lesson_archive). Session 7 verified on TEST DB via `pg_get_functiondef('public.archive_duplicate_lesson'::regproc) ~ 'lesson_format'` → returns `false`. The active definition is `20260209140001_cleanup_archive_function.sql` lines 13-114 — the cleanup migration removed both `duplicate_pairs` (its stated purpose) and `lesson_format` (incidentally, by writing a leaner INSERT that omits both). Net: no redefinition needed in Task 1.3. The function continues to populate `lesson_archive.metadata` (jsonb) but does NOT populate `lesson_archive.lesson_format` text column — consistent with the Gate A keep-historical decision (existing archive rows keep their values; new archives get NULL).

11. **`resolve_duplicate_group` is NO-OP for Task 1.3 — function was DROPped pre-foundation-phase.** Gate A predicted this RPC needs the same source-side rewrite as `archive_duplicate_lesson`. Session 7 verified absent from `pg_proc` on both TEST DB AND PROD DB (queried 2026-05-04). The drop happened in `20251205_add_archive_duplicate_lesson_function.sql` line 190: `DROP FUNCTION IF EXISTS resolve_duplicate_group(...)`. The 20251205 migration replaced the complex group-resolution flow with the simpler per-lesson `archive_duplicate_lesson`. Gate A's prediction was based on the existence of the 20251203 + 20251204 migration files (which CREATE OR REPLACE the function), not on the active DB state — the deletion in the immediately-following 20251205 migration was missed during the file-based sweep. Net: no redefinition needed; function does not exist to redefine.

**Net effect on Task 1.3 RPC scope:** 3 active redefinitions instead of Gate A's predicted 5. Task 1.3 file is correspondingly leaner. Future surface sweeps that enumerate RPCs from migration files should also probe `pg_proc` to catch dropped definitions.

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

### Session 4 — 2026-05-03 — PR 1 Task 1.0 (Zod canonical scaffold landed)

Major events:
- **Branch `feat/metadata-foundation-schema` created off main; commit `6b46db4` — 11 files / +761 lines / -3 lines.** Local only (not pushed; PR opens after Task 1.6 lands per multi-task PR plan).
- **Two-schema architecture scaffolded** per Gate B output:
  - `src/types/lessonMetadata.zod.ts` — canonical lesson schema. Closed enums on activity_type (5) / tags (2) / season_timing (4) / cultural_responsiveness_features (7); rest stay `z.array(z.string())` placeholders for PR 5+. All fields optional (matches runtime usage of partial drafts / legacy rows).
  - `src/types/reviewFormPayload.zod.ts` — review-form schema (themes/season/location keys, single-select activityType/location strings). Imports closed-enum types from canonical.
  - `src/utils/reviewToLessonMapper.ts` + `src/utils/lessonToReviewMapper.ts` — bidirectional pure-function TS mirrors of the SQL translation in `complete_review_atomic` (migration `20260428000003` lines 142-167). Translation rules: activityType string→[string], location string→locationRequirements [string], themes→thematicCategories rename, season→seasonTiming rename, all other arrays passed through.
  - `src/utils/reviewToLessonMapper.test.ts` — 28 tests covering empty payload, every translation rule, mixed payload acceptance fixture, 5 round-trip review→canonical→review fixtures (all lossless), 5 round-trip canonical→review→canonical fixtures (lossless when activityType/locationRequirements ≤1 element), and one explicit asymmetry test (multi-element activityType is lossy on canonical→review→canonical, documented as design intent).
  - `src/types/generated/enums.json` — committed JSON mirror of closed-enum lists (`{ activity_type, tags, season_timing, cultural_responsiveness_features }`). Pydantic + SQL CHECK constraints will hand-sync from this file with `-- SOURCE: enums.json["<key>"]` comment markers.
  - `src/types/generated/enums.json.test.ts` — 5-test Vitest equivalence test asserting committed JSON matches the canonical Zod source per closed-enum key. Replaces a separate "is enums.json fresh" CI step (validator-arch §5).
  - `scripts/generate-enums-json.ts` — single writer of `enums.json`. Wired up via `npm run generate:enums`. Verified idempotent (md5 unchanged after re-running).
  - `supabase/functions/deno.json` — `{"imports":{"zod":"npm:zod@3.24.0"}}` for edge-function zod resolution. Deferred edge-function smoke verification (`supabase functions serve` import smoke) to Task 1.5 since no edge function imports zod yet.
  - `package.json` + `package-lock.json` — `zod@^3.25.76` resolved (latest 3.x). Specifier in deno.json keeps `npm:zod@3.24.0` as documented baseline since edge runtime resolves loosely.
- **Cultural-responsiveness-features 7 master-list values verified** by querying TEST DB (`mcp__supabase-test__execute_sql`). Top 7 PROD distribution exactly matches v3 taxonomy `esynyc-taxonomy-schema-v2.md` §12 ordering. One stray "Communication of high expectations" (cnt=1) is drift to ignore. Locked order in `lessonMetadata.zod.ts` mirrors v3 taxonomy order for predictability.
- **Verification clean (per `superpowers:verification-before-completion`):**
  - `npm run type-check` → green.
  - `npm run lint` → green after one round of `lint:fix` (8 prettier formatting issues across 5 files; auto-corrected).
  - `npm run test --run` → 508/508 across 37 files. Of those, 33 are new (28 mapper + 5 enum equivalence). No regressions in other suites.
  - `npm run generate:enums` → idempotent (md5 unchanged after re-run).
  - `git diff --stat` confirmed only the 11 expected files changed; tooling state files (.beads/, .claude/scheduled_tasks.lock) NOT staged.
- **Decisions captured during execution:**
  - Zod schema kept fully optional rather than mirroring the strict `LessonMetadata`/`ReviewMetadata` interface required-fields. Reasoning: foundation-phase schema validates partial LLM drafts (PR 2) and legacy rows; runtime strictness lives in the closed-enum CONTENTS, not field PRESENCE. Existing TS interfaces NOT touched — consumers using either can co-exist. Migration to Zod-as-canonical-type-source deferred per validator-arch TBD #2.
  - `lessonFormat` retained in canonical schema as `z.string().optional()` even though Task 1.3 will drop it. Scaffold matches CURRENT TS interfaces; field disappears with the column drop.
  - `tags` deliberately NOT added to `reviewFormPayload.zod.ts` — review form doesn't expose a tags picker today; tags arrive via canonical-keys path (PR 2 LLM draft) only. If reviewer surface ever exposes tags, add to review-form schema at that time.
  - `academicConcepts` (D5 new key) added as `z.record(z.string(), z.array(z.string()))` placeholder in canonical schema; closed-enum vocab waits for concepts worksheet (Stage-1-gated).
  - Mapper output excludes empty arrays / undefined fields (matches SQL `''` → `[]` collapse); `lessonToReview` empty-array suppression keeps the round-trip `lessonToReview(reviewToLesson({}))` === `{}`.
- **No PR opened.** PR 1 is multi-task per impl plan; opens after Task 1.6 (SQL CHECK + trigger value-validation) lands.

Next session: PR 1 Task 1.1 — Pre-migration corpus verification (TEST DB). Per impl plan §1.1: read-only `mcp__supabase-test__execute_sql` queries to baseline corpus shape before writing the structural-schema migration. Six queries in the Gate A output ("TEST DB verification queue logged" section above): (1) legacy `handle_lessons_metadata_write_trg` attachment status via pg_trigger; (2) lessonFormat-referencing index inventory (expect 2: `idx_lessons_format` JSON-path + `idx_lessons_lesson_format` column-based); (3) lessonFormat key population count on `lessons.metadata`; (4) activity_type distribution to confirm no rows currently use 'craft'; (5) tags column unused/null; (6) cultural_responsiveness_features distribution + drift evidence. Also re-verify Gate A surface inventory still matches current code (no drift since Session 1 sweep). Investigation only — no commit.

### Session 5 — 2026-05-04 — PR 1 Task 1.1 (pre-migration corpus verification)

Major events:
- **Task 1.1 complete — investigation only, no migration writes.** All 7 impl-plan steps cleared via TEST DB reads + repo greps. Three reviewer-cited refs re-verified exact in current code (`ReviewDetail.tsx:978` form-field block, `useLessonSearch.ts:115` RPC param, `complete_review_atomic` migration line 128 INSERT branch with `lesson_format` column at line 131).
- **Gate A inventory drift check.** Total 142 raw lessonFormat/lesson_format refs in active code (excluding pg_dump / migrations / generated types). Subtract 41 snapshot JSON refs (5 files; data not code, same precedent as `dump-data.sql`) + 2 archive script refs (Gate A non-actionable) + 13 Session-4 Zod scaffold refs (intentional, will need Task 1.3b removal addition) → **86 pre-existing actionable refs** vs Gate A's "~80" approximation. Within tolerance — no surprise drift since Session 1 sweep.
- **Three new findings folded into Gate A output as "Session 5 amendments":**
  - **Amendment 6** — Snapshot JSONs (5 files / 41 refs) ruled NO ACTION per `dump-data.sql` precedent.
  - **Amendment 7** — 13 new lessonFormat refs from Session-4 Zod scaffold added to Task 1.3b removal list as a 5-row sub-table: `lessonMetadata.zod.ts` (line 113 + comment 110-112) / `reviewFormPayload.zod.ts` (line 37) / `reviewToLessonMapper.ts` (lines 81-82 translation block) / `lessonToReviewMapper.ts` (lines 93-94 translation block) / `reviewToLessonMapper.test.ts` (6 fixture lines at 72/77/98/119/215/239).
  - **Amendment 8** — Legacy `handle_lessons_metadata_write_trg` confirmed NOT attached on TEST DB. Task 1.3 step 7 downgraded from "DROP TRIGGER if attached" to verification-only no-op.
- **Six TEST DB verification queries run via `mcp__supabase-test__execute_sql` — all results captured in new Gate A "Session 5 — TEST DB verification results" table.** Highlights: activity_type 5 distinct values (cooking 298 / garden 278 / both 135 / academic 58 / empty 3), zero rows use `craft` (D2 fifth value safe); tags column unused universally (752 null + 20 empty + 0 populated, CHECK passes); CRF 7 master-list values + 1 drift row ("Communication of high expectations" cnt=1, singular typo) — see decision below; 2 lessonFormat indexes (idx_lessons_format JSON-path + idx_lessons_lesson_format column-based), matches Gate A; lessons + lesson_archive lesson_format columns confirmed separate (text-nullable both); ~97% population both sides of lessonFormat key/column.
- **Decision captured (Task 1.6 prep):** the 1 CRF drift row needs cleanup BEFORE the `<@ ARRAY[...7...]` CHECK installs, otherwise the constraint creation fails on the existing data. Recommended approach: fold a 1-row UPDATE into the Task 1.6 migration within the same transaction as the CHECK (idempotent; running twice is no-op). Alternative (lenient CHECK) rejected because it preserves Stage-2 cleanup cost. Verify on PROD via `mcp__supabase-remote__execute_sql` at PR 1 PROD-apply time — likely ≤1 row to clean in PROD too. Captured in Gate A amendment 9.
- **Decision deferred (Task 1.3b implementation detail):** `reviewToLessonMapper.test.ts` six fixture lines — DELETE the `lessonFormat: '...'` field from each fixture rather than removing the test cases entirely. The round-trip / asymmetry tests still cover other fields (themes/season/location/activityType) after lessonFormat removal; only the lessonFormat field reference disappears.
- Baseline checks clean: `npm run type-check && npm run lint` both green at session start; will re-verify before status-doc commit.
- No code changes this session; status doc updated with all amendments.

Next session: PR 1 Task 1.2 — Migration file (additive: series_id + part_number + crf_confirmed). Per impl plan §1.2: invoke the `database-migrations` skill, create `supabase/migrations/<YYYYMMDDHHMMSS>_metadata_foundation_schema_additive.sql` with three `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements + two partial indexes (series_id WHERE NOT NULL, part_number WHERE NOT NULL), all idempotent. Pre-migration verification (Session 5 above) confirmed none of these columns exist yet on TEST DB. Verify locally via `supabase db reset && supabase db diff`; commit with the impl-plan-spec'd message; do NOT push (PR 1 multi-task; opens after Task 1.6).

### Session 6 — 2026-05-04 — PR 1 Task 1.2 (additive schema migration shipped)

Major events:
- **Migration committed as `eaaf702` on `feat/metadata-foundation-schema`** (1 file, +55 lines). File: `supabase/migrations/20260511000000_metadata_foundation_schema_additive.sql`.
- **Filename selection.** Latest existing migration was `20260510000000_approve_update_concepts_carry_forward.sql`; chose `20260511000000_*` to sort cleanly after it (per MEMORY.md ASCII-sort gotcha — `YYYYMMDD_*` sorts AFTER `YYYYMMDDHHMMSS_*` in ASCII because `_` > digits, so any same-day timestamped variant alongside an existing `YYYYMMDD_` file requires next-day to ensure correct sort order; not directly applicable here since all baseline-era migrations use `YYYYMMDDHHMMSS` already, but the next-day choice keeps things unambiguous).
- **Migration shape (per impl plan §1.2):**
  - `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS series_id text` (nullable, default NULL — D6).
  - `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS part_number int` (nullable, default NULL — D6).
  - `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS crf_confirmed boolean NOT NULL DEFAULT false` (D9; PG ≥11 handles default-backfill via constant-default optimization without full-table rewrite).
  - Two partial indexes: `lessons_series_id_idx WHERE series_id IS NOT NULL` + `lessons_part_number_idx WHERE part_number IS NOT NULL` (sparse columns; only index populated rows).
  - Rollback block included as comments (drop indexes → drop columns, reverse-order).
  - Every statement `IF NOT EXISTS` — safe to re-run.
- **Local verification (per `supabase db reset` + MCP):**
  - `supabase db reset` succeeded; all migrations including the new one applied cleanly. Final NOTICE messages were the expected `lessons_normalize_write` coercions on the 5 seed lessons (unrelated to Task 1.2).
  - `mcp__supabase__execute_sql` schema inspection — `information_schema.columns` confirmed: `crf_confirmed boolean NOT NULL DEFAULT false`, `part_number integer NULLABLE`, `series_id text NULLABLE`. Exactly as spec'd.
  - `pg_indexes` confirmed: both partial indexes present with correct WHERE clauses.
  - Data check — 5 seed rows; 0 populated for series_id and part_number (expected); all 5 rows have `crf_confirmed=false` (DEFAULT applied correctly; 0 NULLs, 0 TRUE).
  - Idempotency verified — re-ran the entire migration body (3 ALTER + 2 CREATE INDEX) directly via MCP; all `IF NOT EXISTS` clauses no-op'd cleanly. Confirms PR 1 PROD-apply rerun safety (per the SASL-flake mitigation pattern in MEMORY.md — apply-step variant).
- **`supabase db diff` could not run** — shadow-DB port-conflict (port 54320 already bound by another local Supabase project on the user's machine). Unrelated to Task 1.2; the `db reset` + MCP schema-inspection path already covers the same verification surface (compares actual DB state against the migration set). No remediation needed for this migration.
- **RLS verification.** `npm run test:rls` final verdict "✅ RLS implementation is working correctly!" — 16/16 tables RLS-enabled, 16/16 with policies. Two pre-existing scenario failures in `archive_duplicate_lesson` validation (`validates lesson existence`, `prevents self-archiving`) — unrelated to Task 1.2 (additive columns only, no RLS / RPC changes). Captured here for visibility but not regression-introduced; verify against baseline if they resurface in a later RPC-touching task (Task 1.3 redefines `archive_duplicate_lesson` as part of the lessonFormat sweep, so these failures may resolve incidentally).
- **Baseline checks clean throughout:** `npm run type-check && npm run lint` both green pre-commit and post-commit.
- **No push.** Per multi-task PR pattern — PR 1 opens after Task 1.6 lands.
- **No status doc surprises.** `bd doctor` warnings (`Warning: could not check for changes... branch not found`) emitted by the broken beads tooling during commit; ignorable per `project_beads_broken.md`.

Next session: PR 1 Task 1.3 — lessonFormat removal (coordinated SQL migration). Per impl plan §1.3: this is the largest-blast-radius task in PR 1. Multi-stage transactional migration covering (1) `CREATE OR REPLACE VIEW lessons_with_metadata` with `NULL::text AS lesson_format` projection (compat bridge for one release per the post-reviewer-feedback round-2 P1 fix); (2) redefine 5 RPCs — `search_lessons` (KEEP `filter_lesson_format text DEFAULT NULL` parameter for compat bridge, REMOVE the WHERE clause that uses `_alias_lesson_format(...)`), `complete_review_atomic` (drop `lesson_format` column refs + `v_meta->>'lessonFormat'`), `get_lesson_details_for_review` (drop column from RETURNS TABLE + SELECT), `archive_duplicate_lesson` + `resolve_duplicate_group` (rewrite source side — Gate A keep-historical default for `lesson_archive.lesson_format`); (3) rewrite `lessons_normalize_write_trg` to drop column⇄metadata sync logic for lessonFormat; (4) drop 2 indexes (`idx_lessons_format` JSON-path + `idx_lessons_lesson_format` column-based); (5) `UPDATE lessons SET metadata = metadata - 'lessonFormat'`; (6) drop column; (7) verify-only no-op for legacy `handle_lessons_metadata_write` trigger (Session 5 confirmed not attached on TEST DB). Forward-rollback `.sql.rollback` sibling required. Task 1.3b (frontend + edge function sweep) follows immediately — coordinated to avoid stale-tab breakage. Suggest scoping the next session for Task 1.3 SQL only (commit + verify); Task 1.3b is a separate session given ~30 file surfaces per Gate A output.

### Session 7 — 2026-05-04 — PR 1 Task 1.3 (lessonFormat removal SQL migration shipped)

Major events:
- **Migration committed as `35cac25` on `feat/metadata-foundation-schema`** (3 files / +1229 / -6). Files:
  - `supabase/migrations/20260512000000_drop_lesson_format.sql` (~640 lines, NEW)
  - `supabase/migrations/20260512000000_drop_lesson_format.sql.rollback` (~135 lines, NEW; `.sql.rollback` extension keeps it inert as a forward-rollback artifact)
  - `supabase/seed.sql` (5 sample-lesson tuples + INSERT column list edited to drop `lesson_format`)
- **Filename selection.** Latest existing migration was `20260511000000_metadata_foundation_schema_additive.sql`; chose `20260512000000_*` to sort cleanly after it (one-day-forward convention used in this initiative).
- **Two Gate A predictions falsified, simplifying the migration.** Session 7 verified on TEST DB + via `pg_proc` queries:
  - `archive_duplicate_lesson` already has no `lesson_format` ref — the `20260209140001_cleanup_archive_function.sql` cleanup migration removed it incidentally while removing `duplicate_pairs`. NO-OP for Task 1.3.
  - `resolve_duplicate_group` does not exist on TEST or PROD — `20251205_add_archive_duplicate_lesson_function.sql` line 190 dropped it. NO-OP for Task 1.3.
  - Gate A output amended (#10, #11) above; Decision section above documents the methodology improvement (probe `pg_proc` not just migration files).
  - Net active RPC redefinitions in Task 1.3: **3, not 5** as predicted.
- **Migration shape (per impl plan §1.3, with Session 7 simplifications):**
  - Stage 1: `CREATE OR REPLACE VIEW public.lessons_with_metadata` keeping `NULL::text AS lesson_format` projection at column 33 (compat bridge; drops in Task 1.3a follow-up). Same column names + same order + same data types as the live view shape captured via `pg_get_viewdef` — CREATE OR REPLACE VIEW restriction satisfied. Updated COMMENT ON VIEW reflects bridge-and-end-state.
  - Stage 2a: `search_lessons` CREATE OR REPLACE — signature unchanged from `20260505000000`. KEEPS `filter_lesson_format text DEFAULT NULL` param + `_alias_lesson_format` helper. REMOVES the WHERE clause `l.lesson_format = ANY(_alias_lesson_format(filter_lesson_format))` from both query branches (count + RETURN QUERY). REMOVES the `'lessonFormat'` overlay key from the per-field COALESCE metadata reconstruction. `academicConcepts` sibling-key rescue retained.
  - Stage 2b: `complete_review_atomic` CREATE OR REPLACE — signature unchanged from `20260510000000`. DROPS the `'lessonFormat'` v_legacy_meta key + the `lesson_format` column from approve_new INSERT column list + the corresponding `NULLIF(v_meta->>'lessonFormat', '')` value + the `lesson_format = COALESCE(...)` row from approve_update UPDATE. `academicConcepts` carry-forward block (introduced 20260510) preserved byte-identical.
  - Stage 2c: `get_lesson_details_for_review` DROP+CREATE — RETURNS TABLE shape changes (drops `lesson_format TEXT`), so DROP+CREATE required (CREATE OR REPLACE forbids TABLE-shape changes). Body: drops `l.lesson_format` from SELECT projection. GRANT EXECUTE re-issued.
  - Stage 3: `lessons_normalize_write` trigger function CREATE OR REPLACE — drops section (B) only. Sections (A) concepts rescue + (C)..(K) sync blocks preserved byte-identical to `20260509000000`. Section labels (C)..(K) retained from the original numbering for cross-reference stability. Trigger attachment unchanged (function name unchanged → trigger picks up new body automatically).
  - Stage 4: `DROP INDEX IF EXISTS public.idx_lessons_format` (JSON-path) + `DROP INDEX IF EXISTS public.idx_lessons_lesson_format` (column-based).
  - Stage 5: `UPDATE public.lessons SET metadata = metadata - 'lessonFormat' WHERE metadata ? 'lessonFormat'` — strips the JSONB key. Trigger fires per row; without section (B) the trigger doesn't rewrite back from the column.
  - Stage 6: `ALTER TABLE public.lessons DROP COLUMN IF EXISTS lesson_format` — succeeds because Stages 1-3 removed all dependent surfaces.
  - Stage 7: DO-block guard for legacy `handle_lessons_metadata_write_trg` — verify-only no-op as Session 5 confirmed it is not attached; Session 7 reconfirmed locally; defensive DROP TRIGGER inside the IF if PROD turns out to have it attached. The guard fires no NOTICE on the local DB.
  - Stage 8: `COMMENT ON COLUMN public.lesson_archive.lesson_format` documents the historical-archive decision per Gate A.
  - Final `NOTIFY pgrst, 'reload schema'` to pick up the `get_lesson_details_for_review` shape change.
  - Idempotency: every step uses `CREATE OR REPLACE` / `DROP ... IF EXISTS` / `IF EXISTS` checks — re-running the migration body is a clean no-op on a database where it has already been applied.
- **Coordinated `seed.sql` edit (folded into the Task 1.3 commit).** Sample-lesson INSERT column list dropped `lesson_format`; 5 corresponding `ARRAY['Full Lesson']` / `ARRAY['Activity']` value tuples dropped. Required for `supabase db reset` to continue working locally. Gate A bins this under Task 1.3b but it is a verification dependency for Task 1.3 — captured as a Session 7 decision (above).
- **Local verification (per impl plan §1.3 + Session 7 smokes via `mcp__supabase__execute_sql`):**
  - `supabase db reset` clean apply across all 56 migrations; all NOTICE messages from `lessons_normalize_write_trg` were the expected coercions on the 5 seed rows (no metadata supplied; trigger derives metadata-key shapes from columns). No `lessons_normalize_write coerced field=lessonFormat` notices since section (B) is gone. ✓
  - 7 impl-plan verification queries: Q1 (column dropped, count=0), Q2 (JSONB key stripped, count=0), Q3 (view projection text NULL bridge), Q4 (search_lessons keeps param), Q6 (legacy trigger not attached), Q7 (indexes dropped) all pass directly. Q5 was a false-positive (`pg_get_functiondef` includes inline `--` comments verbatim; the new function body has comment markers like `-- lesson_format = COALESCE(...) removed — D3` that match the regex). Re-verified with a comment-stripped regex (`regexp_replace(body, '--[^\n]*', '', 'g')`) — complete_review_atomic + search_lessons confirmed clean of functional `lesson_format` refs.
  - Smokes: `search_lessons(...)` returns 5 rows with jsonb metadata + total_count=5; `search_lessons(..., filter_lesson_format='standalone', ...)` accepts and ignores the param (compat bridge proof — returns 5 rows unfiltered); `lessons_with_metadata` view returns NULL for `lesson_format` projection across LESSON-001/002/003; `pg_get_function_result('public.get_lesson_details_for_review')` returns the post-Task-1.3 shape (no `lesson_format text`); `_alias_lesson_format` helper present in `pg_proc` (compat bridge); trigger sections C..K present, NEW.lesson_format never written; Task 1.2 columns (series_id, part_number, crf_confirmed, tags) all intact.
- **`npm run test:rls`** — `5 passed, 2 failed — ✅ RLS implementation is working correctly!` Same 2 pre-existing `archive_duplicate_lesson` scenario failures (`validates lesson existence`, `prevents self-archiving`) as Session 6 baseline. Task 1.3 does NOT redefine `archive_duplicate_lesson` (NO-OP per amendment #10), so the failures persist as expected. No new regressions introduced.
- **Baseline checks clean throughout:** `npm run type-check && npm run lint` both green pre-commit.
- **No push.** Per multi-task PR pattern — PR 1 opens after Task 1.6 lands.
- **`bd doctor` warnings emitted by broken beads tooling during commit** — ignorable per `project_beads_broken.md`.

### Session 8 — 2026-05-04 — PR 1 Task 1.3b (lessonFormat removal frontend + edge sweep shipped)

Major events:
- **Sweep committed as `57f0e69` on `feat/metadata-foundation-schema`** (35 files / +20 / -177). All categories from Gate A's per-surface task list (status doc lines 96-198) plus Session 5 amendment 7 (Zod scaffold) executed.
- **Pre-edit fresh grep verification:** `grep -rn "lessonFormat\|lesson_format" src supabase/functions/_shared scripts | grep -v "snapshots\|node_modules\|database.types.ts" | grep -v "scripts/archive/"` returned 35 unique files / 98 line refs — exactly matching Gate A's inventory (no drift since Session 1's sweep + Session 5's amendment 7 addition). Files broken into 6 batched edits:
  - **Batch A — pure data files (5 files).** types/index.ts × 3 interface entries / filterDefinitions FILTER_CONFIGS.lessonFormat block (12-line deletion) / filterUtils × 2 maps / searchStore initialFilters entry / facetCounts × 4 entries (FacetFilterKey union, EMPTY_COUNTS, valuesForKey case, KEYS array).
  - **Batch B — components (8 files).** ScreenReaderAnnouncer line / IntCard helper+const+render condition / IntListRow helper+const+5-line render block / IntSidebar 28-line filter section + docstring / ReviewMetadataForm renderField line / ReviewDetail 9-line form-field block / AdminDuplicateReview attribute-table entry / duplicateGroupService LessonForReview type entry.
  - **Batch C — hooks + edge (3 files).** useLessonSearch transformRow projection + RPC param compat bridge / useLessonSuggestions × 2 (queryKey + smart-search body) / `_shared/search-helpers.ts` × 4 (SearchFilters interface, applyFilters clause, transformRow projection).
  - **Batch D — Zod scaffold (4 files, per Session 5 amendment 7).** lessonMetadata.zod comment block + field decl / reviewFormPayload.zod field decl / reviewToLessonMapper same-key-strings if-block / lessonToReviewMapper same-key-strings if-block.
  - **Batch E — tests (8 files).** reviewToLessonMapper.test 4 fixture sites (preserves-strings input/output, fully-populated input/output, round-trip review fixture, round-trip canonical fixture); searchStore.test "should handle single-select dropdown filters" `it(...)` block deleted entirely (decision per Decisions section above); facetCounts.test 5 fixtures + 1 assertion; duplicateGroupHelpers.test × 2; lesson-search.infinite.test × 5 (handled via 2 replace_all calls per process-learning note in Decisions section above); search-page.test × 1; factories × 2 (makeRpcRow + makeLesson); IntLessonSpecCard.test × 1.
  - **Batch F — scripts + docs (7 files).** analyze-duplicates.mjs × 2 metadata-field-name array entries; analyze-duplicates-v2.ts × 2 same; identify-and-restore-missing-lessons.ts × 1 INSERT field; migrate-metadata-to-columns.mjs × 3 (INSERT field + SELECT projection + console.log line); orphan-recovery script — 7-line audit-notice header comment ONLY (body untouched per Gate A); types/CLAUDE.md example block (drop `lessonFormat: string;` line); stores/CLAUDE.md example block (drop `lessonFormat,` from single-select tag list, keep `cookingMethods`).
- **Two now-unused declarations removed during type-check fix-up** (per Decisions section): IntSidebar `setFilters` destructure + useLessonSearch `asString` helper. Both flagged by tsc as TS6133 unused-locals.
- **Final residual `lessonFormat`/`lesson_format` refs in src/ confined to:** (1) `useLessonSearch.ts:114` (compat bridge + comment) and (2) `scripts/orphan-recovery/phase-5-b-new-publish.ts` (audit script, intentional). Verified via second grep post-commit.
- **Verification (per `superpowers:verification-before-completion`):**
  - `npm run type-check` → green (after the 2 unused-locals fix-up).
  - `npm run lint` → green.
  - `npm run test --run` → 507/507 across 37 files. Net delta from Session 7 baseline (508/508): exactly -1, the deleted "single-select dropdown filters" test in searchStore.test.ts. All 28 mapper tests still run (fixtures got slightly thinner but no test cases removed). All 21 search-page tests still pass; 5 lesson-search-infinite tests still pass.
  - `npm run test:rls` → 5 passed / 2 failed — same `archive_duplicate_lesson` scenario failures as Sessions 6 + 7 baseline (`validates lesson existence`, `prevents self-archiving`); Task 1.3b touches no RLS or RPC definitions so failures persist as expected. Final verdict line still "✅ RLS implementation is working correctly!"
  - Final `git diff --stat`: 35 files changed, 177 deletions, 20 insertions (additions = orphan-script header comment + useLessonSearch compat-bridge comment + 1-line absences in CLAUDE.md / mapper-test fixtures that re-balance after deletions).
- **No push.** Per multi-task PR pattern — PR 1 opens after Task 1.6 (CHECK constraints) lands.
- **`bd doctor` warnings emitted by broken beads tooling during commit** — ignorable per `project_beads_broken.md`.

Next session: PR 1 Task 1.4 — Filter UI updates (per impl plan §1.4). Three sub-tasks:
1. Expand Activity Type filter to 5 values per D2 (currently 4 in `filterDefinitions.ts:23-32` with values `cooking-only / garden-only / both / academic-only`; D2 enum is `cooking / garden / both / academic / craft` — note the slug-vs-canonical mismatch, see decision point below).
2. Add new "Lesson Type" tag-based filter section starting with `["orientation", "bilingual_handouts"]` (D2 + D7) to the sidebar — needs FILTER_CONFIGS.tags entry + IntSidebar wiring.
3. Rename `academic-cooking` slug to align with `both` storage per impl plan §1.4 (need to verify whether this slug exists in current code — possibly stale from an earlier draft of D2 since the current `both` value already covers cooking + garden combined).

**Decision points to surface at start of Session 9:**
- **Filter slug-vs-storage alignment.** TEST DB Session 5 audit showed activity_type column stores values matching D2 enum directly (`cooking / garden / both / academic`, no `craft` rows yet). But filterDefinitions.ts uses different slugs (`cooking-only / garden-only / both / academic-only`). The `useLessonSearch` filter passes `activityType` strings directly to `filter_activity_type` RPC param — which then matches against `activity_type` column values. So today's filter slugs don't match storage; either there's a translation layer somewhere (need to find and adjust), or the filter is silently broken. Verify before Task 1.4 ships.
- **`tags` filter UI shape.** `tags` column is text[] (multi-select per Gate C audit row). Sidebar's CHECKBOX_KEYS pattern handles multi-select naturally; just add `tags` to the array + add FILTER_CONFIGS.tags entry. But what's the user-facing label? "Lesson Type" per impl plan §1.4. What's the wiring on `useLessonSearch` for the new param (does `search_lessons` RPC accept a `filter_tags text[]` param yet, or does this need a follow-up RPC change)? Investigation needed at Task 1.4 start; may need to defer the search-end of the tags filter to a separate task if the RPC doesn't support it yet.
- **Whether to fold this into Task 1.4 or split.** Task 1.4 is mostly UI + filter-config changes per impl plan; if RPC support for tags filter is needed, that's a separate SQL migration. Suggest opening Task 1.4 with the UI scope first, then tagging on a Task 1.4a if the RPC needs changes.

Next session: PR 1 Task 1.3b — lessonFormat removal frontend + edge function sweep. Per impl plan §1.3b + Gate A "Per-surface PR 1 task list" + Session 5 amendment 7 (Zod-scaffold refs): edit ~30 files across frontend (types/index.ts at 3 lines + database.types.ts via `supabase gen types`, IntCard / IntListRow / IntSidebar / ReviewDetail / ReviewMetadataForm / AdminDuplicateReview), state (searchStore / facetCounts / filterDefinitions / filterUtils / ScreenReaderAnnouncer / useLessonSearch / useLessonSuggestions), edge shared (`_shared/search-helpers.ts` SearchFilters + applyFilters + transformRow), services (duplicateGroupService.LessonForReview), 6 test fixture files, 4 scripts (analyze-duplicates × 2 + identify-and-restore-missing-lessons + migrate-metadata-to-columns), 2 docs (src/types/CLAUDE.md + src/stores/CLAUDE.md). Plus the Session-4 Zod-scaffold 13 refs (lessonMetadata.zod / reviewFormPayload.zod / reviewToLessonMapper / lessonToReviewMapper + 6 test fixture lines in reviewToLessonMapper.test). `useLessonSearch.ts:115` keeps RPC param send (always `undefined`) for compat bridge. `scripts/orphan-recovery/phase-5-b-new-publish.ts` left as-is with a header comment per Gate A. Verify: type-check + lint + full vitest run + manual smoke (filter sidebar without lessonFormat, lesson detail / review pages render). Coordinate with Task 1.3 SQL migration in same PR — both ship together in PR 1's multi-task commit set. Session 6's note suggests scoping the next session for Task 1.3b alone; ~30 files is meaningful work but tractable.
