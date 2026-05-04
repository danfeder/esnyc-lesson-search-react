# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-03 by /kickoff-feature scaffolding + reviewer-feedback round (pre-Session-1)
**Current PR:** Pre-PR-1 Gates A/B/C (no PR; investigation/decision tasks first)
**Current task:** Gate A — lessonFormat dependency sweep (verify in current repo)
**Branch:** main (not yet branched for PR 1)
**Last commit on branch:** (none)

## Done

(empty — fill as work completes)

## In flight

(none yet — next session starts Gate A)

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
