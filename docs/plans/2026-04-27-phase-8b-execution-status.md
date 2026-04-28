# Phase 8b Execution Status

**Last updated:** 2026-04-28 10:40 UTC by Session 5
**Current PR:** PR 2 — Submitter flow + LessonSearchPicker + reviewer-side safety banner — IN PROGRESS (7 of ~9 tasks done; branch local-only, not yet pushed)
**Current task:** Task 2.7 done — pure normalizer + pre-INSERT validation in `process-submission`. Next session picks up at **Task 2.7.5** — minimal reviewer safety banner in `ReviewDetail.tsx` (gap-window mitigation; ~12 LOC of JSX above the decision panel). Plan lines 1349–1405.
**Branch:** `feat/phase-8b-intent-first-submitter-flow` (off local `main`; now carries 2 session-1 doc commits + Tasks 2.1, 2.2, 2.3–2.6, 2.7 commits; not yet pushed)
**Last commit on branch:** `1232d1a` (Task 2.7 — normalize + pre-INSERT validation)

## Done

- ✅ **Task 1.1** — created `supabase/migrations/20260504000000_phase_8b_fk_on_delete_set_null.sql`
  - Local apply via `supabase db reset`
  - Local FK confirmed via MCP: `confdeltype = 'n'`, def shows `ON DELETE SET NULL`
  - `npm run test:rls` baseline-clean (2 pre-existing `archive_duplicate_lesson` failures confirmed pre-existing on `main`)
- ✅ **Task 1.2** — pushed branch + opened PR #468
  - Pre-push code-reviewer agent dispatch: 0 critical, 1 doc nit rejected
  - `npm run type-check && npm run lint` clean
- ✅ **Bot triage on PR #468** — 3 findings from `claude-review`, all 3 rejected with documented rationale (BEGIN/COMMIT wrapper rejected as post-push edit hazard + Supabase auto-wraps; NOT VALID lock pattern rejected as low-traffic non-issue and bot itself flagged non-blocking; docs-drift advice rejected as already covered by ritual)
- ✅ **TEST DB verification** via `mcp__supabase-test__execute_sql`: `confdeltype = 'n'`, `ON DELETE SET NULL` confirmed on TEST
- ✅ **PR #468 merged** via rebase as `9a6b09e` (preserves the 9 doc-commit history alongside the migration)
- ✅ **PROD apply** — first attempt failed with documented SASL Apply-step flake (run `25032406625`); rerun via `gh run rerun --failed` succeeded after second approval. PROD verified via `mcp__supabase-remote__execute_sql`: `confdeltype = 'n'`, def shows `ON DELETE SET NULL`.
- ✅ **Task 2.1 (Session 2)** — created `src/utils/titleSimilarity.ts` + co-located test (`src/utils/titleSimilarity.test.ts`). TDD cycle followed: 10/10 failing → implement → 10/10 passing. Commit `edbc48a`.
- ✅ **Task 2.2 (Session 3)** — created `src/components/LessonSearchPicker.tsx` + co-located test (`src/components/LessonSearchPicker.test.tsx`). TDD cycle: RED (module not found) → implement → first run 7/8 (test pollution: test 5's `mockImplementation` leaked into test 6 because `vi.clearAllMocks()` only clears call history, not implementations) → fixed `beforeEach` to restore default mock → 8/8 passing. Type-check + lint clean (lint:fix removed an unused eslint-disable directive on the `onSelect` prop — see decisions). Commit `887449b`.
- ✅ **Tasks 2.3–2.6 (Session 4)** — landed as one commit `06ce2de`. Task 2.3: added two lazy imports + two `<Route>` lines to `src/App.tsx` (used `@/pages/...` aliases to match existing pattern, not the plan's `./pages/...`). Task 2.4: rewrote `src/pages/SubmissionPage.tsx` (413 → 91 lines) as a two-button intent picker per the plan's Tailwind layout. Task 2.5: created `src/pages/NewSubmissionForm.tsx`. Task 2.6: created `src/pages/RevisingSubmissionForm.tsx` consuming `LessonSearchPicker`. Type-check clean throughout; lint flagged 3 prettier formatting errors (`IntStatusBadge` prop wrapping + `<p>` text wrapping), all auto-fixed by `lint:fix`. 18/18 unit tests still pass (titleSimilarity 10 + LessonSearchPicker 8). Single grouped commit per plan (avoid broken intermediate states from the deferred-references chain).
- ✅ **Task 2.7 (Session 5)** — created `supabase/functions/process-submission/normalizeSubmissionInputs.ts` + co-located test (`normalizeSubmissionInputs.test.ts`). TDD cycle: RED (module-not-found) → implement → GREEN (9/9). Then wired into `index.ts`: added `import { normalizeSubmissionInputs } from './normalizeSubmissionInputs.ts';` (line 5), inserted normalization + FK-target existence check between line 171 and the INSERT block (line 173), and replaced both INSERT fields (`submission_type` and `original_lesson_id`) with the normalized values. Type-check clean, lint clean (no prettier flags), full test suite 457/457 pass. Commit `1232d1a`.

## In flight

- **PR 2 — Submitter flow + LessonSearchPicker** — branch `feat/phase-8b-intent-first-submitter-flow` carries 2 session-1 doc commits + Task 2.1 + Task 2.2 + Tasks 2.3–2.6 + Task 2.7 commits. Branch not yet pushed. Next: Task 2.7.5 (minimal reviewer safety banner in `ReviewDetail.tsx`), then Task 2.8 (E2E tests), then Task 2.9 (push + own reviewer agent + bot triage + PR open).

## Blocked

(none — user approval gate is expected, not a blocker)

## Decisions made during execution

- **Test-file path = co-located, not `__tests__/` subdir** (Task 2.1, Session 2). Implementation plan specified `src/utils/__tests__/titleSimilarity.test.ts` but the repo convention is `src/utils/titleSimilarity.test.ts` (alongside source — see `duplicateDetection.test.ts`, `facetCounts.test.ts`, `logger.test.ts`). Adapted as a small repo-conformance change. Same will apply to Task 2.2 (`src/components/LessonSearchPicker.test.tsx`, not under a `__tests__/` subdir).
- **Per-PR ritual corrected mid-session.** Original kickoff phrased step 1 as "Pre-push self-review: read every line of `git diff main...HEAD`" — implying I do the read myself. User clarified: pre-push review = agent dispatch (the agent does the line-by-line read; you cannot impartially review your own work). User further clarified: the second `feature-dev:code-reviewer` dispatch I'd added between push and external bots is redundant — external bots ARE the second pass; my role post-bot is investigation/triage with accept/reject recommendations, optionally spawning a subagent for deeper verification. Updated kickoff prompt + implementation plan accordingly.
- **PR comment surfaces — must check ALL of them.** I missed the `claude-review` substantive review on PR #468 by querying only `gh api .../pulls/468/comments` (line-attached comments, returned `[]`). User pushed back: "did you read the bot's comment?" The bot's full report was an issue-comment surfaced via `gh pr view --comments`. New feedback memory created: `feedback_pr_comment_surfaces.md`. Kickoff + impl plan updated with the four-surface checklist (issue-comments, review summaries, line-comments, CI/check failures).
- **TEST DB re-verification is per-round, not one-time.** User FYI: any post-PR round that produces DB-affecting fix-up commits requires re-running the TEST DB MCP verification after CI re-applies the migration. New feedback memory: `feedback_per_round_test_db_verification.md`. Kickoff + impl plan rituals extended with this step.
- **Pre-push agent finding rejected** (rollback-block sub-comment) — chrome below the user-visible-bug-or-DB-safety bar.
- **Wasted second-agent dispatch on PR #468** before bots: cost ~90s. Wrong finding (date-prefix "further than necessary") rejected. No code changes from it. Future PRs follow corrected ritual.
- **PR #468 merge strategy = rebase, not squash.** Repo convention is squash-merge, but PR carried 9 valuable doc commits from prior sessions plus the migration; rebase preserved each commit's individual message rather than collapsing the doc-iteration history into a single squash.
- **PROD apply hit the SASL Apply-step flake on first attempt.** Run `25032406625` failed with `failed SASL auth (invalid SCRAM server-final-message)` at the "Connecting to remote database..." step (the Apply step's second pooler handshake within ~2s of "Initialising login role..."). Verified PROD was unchanged via MCP (`confdeltype = 'a'` pre-rerun); confirmed clean failure with no partial state. `gh run rerun --failed` succeeded on second approval. Memory entry updated to capture the Apply-step variant of the flake (was previously documented only for Verify-step) and the rerun mitigation pattern.
- **Test pollution on first GREEN run (Task 2.2, Session 3).** First test pass returned 7/8 — the test that overrides `supabase.from.mockImplementation` to return empty data (zero-results case) leaked into the next test (irrelevant-non-zero case), which expects the default Apple Crisp + Pumpkin Pie data. Root cause: `vi.clearAllMocks()` in `beforeEach` clears call history but NOT implementations. Fix: explicitly re-set the default `from` implementation in `beforeEach` (re-import the mocked module + `mockImplementation(...)`). Pattern worth remembering for future component tests that mutate the supabase mock per-test.
- **`eslint-disable-next-line no-unused-vars` on prop callbacks not needed in this repo.** CLAUDE.md and `src/components/CLAUDE.md` show the disable directive on callback props (e.g., `onChange`). On Task 2.2's `onSelect` prop, `npm run lint:fix` flagged the directive as unused (`no-unused-vars` doesn't actually fire on the param) and removed it. Lint+type-check stay clean without it. Not changing the documented pattern (consistent style across legacy code), but new components don't need the directive.
- **Lazy-import alias preserved in App.tsx** (Task 2.3, Session 4). Plan's snippet uses `import('./pages/NewSubmissionForm')` (relative path); the existing `SubmissionPage` lazy import in App.tsx uses `'@/pages/SubmissionPage'`. Followed the existing convention — consistency win, no semantic change.
- **Plan-conformance accept on raw Tailwind layout** (Tasks 2.4–2.6, Session 4). The plan specifies raw Tailwind layout (`max-w-3xl mx-auto px-4 py-8`, hand-styled card buttons with hover/focus rings) instead of the existing `int-shell-root` / `adm-page--narrow` / `adm-card` chrome. The internal-design-system components (`IntPageHeader`, `IntButton`, `IntFormField`, `IntStatusBadge`) are still used for all interactive primitives. Followed the plan as-written — this is a deliberate design choice (simpler, customer-facing flow distinct from the admin/reviewer chrome), not a repo-conformance gap. Worth flagging to the user only if the visual mismatch becomes a complaint after deploy preview.
- **`React` default import not needed in `SubmissionPage.tsx`.** Original file imported `React` for unused symbol; rewrite drops the default import and only pulls in `useState`, `useEffect` named imports. Matches modern React-17+ JSX transform; tsc + eslint both clean.
- **Test path adapted again to repo convention** (Task 2.7, Session 5). Plan said `supabase/functions/process-submission/__tests__/normalizeSubmissionInputs.test.ts`; existing edge function tests are co-located (`supabase/functions/detect-duplicates/similarity.test.ts`, `supabase/functions/_shared/google-docs-parser.test.ts` — no `__tests__/` subdirs). Same pattern as Sessions 2 + 3. Final path: `supabase/functions/process-submission/normalizeSubmissionInputs.test.ts`.
- **Vitest import vs Deno import drift handled cleanly** (Task 2.7). Plan's snippet imports the helper without `.ts` extension in the test (`import ... from '../normalizeSubmissionInputs'`) and WITH `.ts` extension in `index.ts` (`import ... from './normalizeSubmissionInputs.ts'`). Both correct: Vitest's bundler resolves the same TS file without the extension, while Deno requires it. Confirmed against `_shared/google-docs-parser.test.ts` which imports `from './google-docs-parser'` (no `.ts`) and `_shared/google-docs-parser.ts` is a sibling Deno file. No issue.

## Out-of-scope follow-ups captured here

(none yet)

## Session log

### Session 1 — 2026-04-28 03:09 UTC start, 03:50 UTC end — PR 1 shipped end-to-end

Major events:
- Read kickoff prompt, design doc end-to-end, implementation plan through Task 2.2.
- Branched `feat/phase-8b-fk-on-delete-set-null` off local `main` (which had 9 unpushed Phase 8b doc commits from prior sessions).
- Wrote single FK migration; verified locally via MCP; ran `npm run test:rls` (2 pre-existing failures, no new ones); committed as `13565e0`.
- Pre-push code-reviewer agent dispatch returned 0 critical, 1 doc nit (rejected).
- Pushed branch; opened PR #468 with PR body disclosing the 9 doc commits riding along.
- User correction: pre-push review should be agent dispatch (not me); fixed kickoff + impl plan.
- User correction: second post-PR-open agent dispatch is redundant — external bots ARE the second pass; investigation/triage is my job. Re-fixed kickoff + impl plan.
- User correction: missed `claude-review` issue-comment by querying wrong API endpoint. Created `feedback_pr_comment_surfaces.md`; updated kickoff + impl plan with four-surface checklist.
- Triaged 3 `claude-review` findings (BEGIN/COMMIT wrapper, NOT VALID pattern, docs-drift advice); rejected all with documented rationale.
- Verified TEST DB: `confdeltype = 'n'`, `ON DELETE SET NULL` correct.
- User instruction: merge PR + idle while user approves PROD. Merged via rebase (preserves doc-commit history) as `9a6b09e`.
- User FYI: re-verify TEST DB each round that produces DB-affecting fix-ups, not just once. Created `feedback_per_round_test_db_verification.md`; updated kickoff + impl plan rituals.
- PROD apply attempt 1 failed with SASL flake (run `25032406625`); diagnosed as the Apply-step variant of the documented pattern; recommended + queued `gh run rerun --failed`; updated MEMORY.md SASL entry to cover Apply-step variant.
- PROD apply attempt 2 succeeded after re-approval. Verified via `mcp__supabase-remote__execute_sql`: `confdeltype = 'n'`, def `ON DELETE SET NULL`. PR 1 fully shipped.

### Session 2 — 2026-04-28 09:35 UTC start, 09:50 UTC end — Task 2.1 shipped

Major events:
- Read kickoff, design doc, status file, implementation plan from Task 2.1 through Task 2.2.
- Confirmed baseline clean (`type-check` + `lint`).
- Branched `feat/phase-8b-intent-first-submitter-flow` off local `main` (which had 2 unpushed session-1 doc commits — they ride along in PR 2 per user OK).
- Invoked `superpowers:test-driven-development` skill.
- TDD cycle for `titlesAreSimilar`: wrote test (10 cases via `it.each`), confirmed RED (module-not-found), implemented in `src/utils/titleSimilarity.ts` (~20 LOC), confirmed GREEN (10/10 pass).
- Adapted test path to repo convention: co-located alongside source rather than under `__tests__/` (see decisions above).
- Type-check + lint both clean. Committed as `edbc48a`.
- User had pre-authorized one task; ended here rather than continue into Task 2.2 (substantive ~150 LOC component) per kickoff session-scope rules.

### Session 3 — 2026-04-28 09:55 UTC start, 10:05 UTC end — Task 2.2 shipped

Major events:
- Read kickoff, design doc, status file, implementation plan from Task 2.2 through Task 2.3.
- Confirmed baseline clean (`type-check` + `lint`); worktree noise (`M .beads/.gitignore`, `?? .claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone.
- Verified vitest config + supabase export shape + lack of existing `src/components/*.test.tsx` precedent (decision held: co-located per Session 2 precedent rather than under a new `__tests__/` subdir).
- Invoked `superpowers:test-driven-development` skill.
- Wrote test (8 `it` blocks; plan said "6/6" but had 8 — plan typo). Confirmed RED: "Failed to resolve import" — module not found, exactly as expected.
- Implemented `LessonSearchPicker.tsx` (~150 LOC) following plan: debounced 300ms `ilike` query, results list, chip+clear when bound, `cantFindOption` affordance gated on `hasQueried`.
- First GREEN run: 7/8 (test pollution issue — see decisions).
- Fixed `beforeEach` to re-set default `supabase.from` implementation. Re-ran: 8/8 passing.
- `npm run lint` flagged 7 prettier formatting errors + 1 unused-eslint-disable warning. `lint:fix` cleaned all. Re-verify: lint clean, type-check clean, 8/8 still passing.
- Committed as `887449b`. Single-task session per kickoff scope rules — Task 2.3 (App.tsx routes) deferred to next session.

### Session 4 — 2026-04-28 10:08 UTC start, 10:18 UTC end — Tasks 2.3–2.6 shipped (grouped)

Major events:
- Read kickoff, design doc, status file, implementation plan from Task 2.3 through Task 2.6 (and quickly the start of Task 2.7).
- Confirmed baseline clean (`type-check` + `lint`); worktree noise (`M .beads/.gitignore`, `?? .claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone.
- User confirmed Option A: do Tasks 2.3–2.6 as a grouped session (single commit; required to avoid broken intermediate state from cross-references between App.tsx → not-yet-existing form modules).
- Verified `LessonSearchResult` is exported from LessonSearchPicker and that no `pages/__tests__/` convention exists.
- Task 2.3: added two lazy imports (using `@/pages/...` to match existing pattern) + two `<Route>` lines to `src/App.tsx`.
- Task 2.4: full rewrite of `src/pages/SubmissionPage.tsx` (413 lines → 91 lines) as the two-button intent picker. Removed `React` default import (modern JSX transform), `submissionType` / `originalLessonId` / `success` state, the radio fieldset, the conditional original-lesson-ID input, the post-submit duplicates panel, and the AuthModal `handleSubmit` re-call pattern. Replaced with `pendingIntent` state + navigate-on-modal-success.
- Task 2.5: created `src/pages/NewSubmissionForm.tsx` (~150 LOC). Hardcodes `submissionType='new'` + `originalLessonId=null`; uses raw Tailwind layout per plan; `IntPageHeader` + `IntButton` + `IntFormField` + `IntStatusBadge` for primitives.
- Task 2.6: created `src/pages/RevisingSubmissionForm.tsx` (~210 LOC). Step-1 search picker (consuming `LessonSearchPicker` with `cantFindOption=true`) + step-2 URL input gated on `targetReady`; `(update, X)` and `(update, null)` paths both shipped; success copy branches by target presence.
- Type-check clean throughout. First lint run flagged 3 prettier wrapping errors in NewSubmissionForm + RevisingSubmissionForm — all auto-fixable. `lint:fix` cleared all; second lint run clean. 18/18 unit tests still pass.
- Single grouped commit `06ce2de` per plan's "first compilable state" rule.

### Session 5 — 2026-04-28 10:35 UTC start, 10:42 UTC end — Task 2.7 shipped

Major events:
- Read kickoff, design doc, status file, implementation plan from Task 2.7 through start of Task 2.7.5.
- Confirmed baseline clean (`type-check` + `lint`); worktree noise (`M .beads/.gitignore`, `?? .claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone.
- Confirmed edge function test convention by listing files: `detect-duplicates/similarity.test.ts` and `_shared/google-docs-parser.test.ts` are co-located alongside source; no `__tests__/` subdirs in `supabase/functions/`. Adapted plan's `__tests__/` path to co-located (Sessions 2 + 3 precedent).
- Verified `_shared/google-docs-parser.test.ts` imports `from './google-docs-parser'` (no `.ts`) — confirms Vitest bundler resolves Deno-suffixed siblings without the extension, so test imports without `.ts` and `index.ts` imports with `.ts` is the correct split.
- Invoked `superpowers:test-driven-development` skill.
- TDD cycle for `normalizeSubmissionInputs`:
  - Wrote test (9 `it.each` cases per plan).
  - Confirmed RED: "Failed to resolve import './normalizeSubmissionInputs'" — module-not-found, exactly as expected.
  - Implemented helper (~22 LOC of pure TS).
  - Confirmed GREEN: 9/9 pass on first try.
- Wired into `index.ts`: added import on line 5 (`./normalizeSubmissionInputs.ts` with Deno extension), inserted ~25 LOC of coupled-normalization + pre-INSERT FK-target existence check between line 171 (after `googleDocId = docIdMatch[1]`) and line 173 (`// Step 1: Create submission record`), replaced both INSERT fields (`submission_type` and `original_lesson_id`) with normalized values.
- Verified: `type-check` ✓, `lint` ✓ (no prettier flags this round), full test suite 457/457 pass.
- Committed as `1232d1a`. Beads `bd doctor` warning printed during commit (`branch not found: bed61a46…`) — expected per `project_beads_broken.md`; left alone per kickoff "do NOT use bd".

### Next session picks up at

**Task 2.7.5 — minimal reviewer safety banner in `ReviewDetail.tsx`** (implementation plan lines 1349–1405). Add a yellow banner above the existing decision panel (around line 913–920 — the `<div className="adm-card">` wrapper) that fires when `submission?.submission_type === 'update'`. Banner shows `<AlertTriangle>` + "Submitter says: Update of an existing lesson" + either the raw `original_lesson_id` (when bound) or "Submitter could not find the target lesson in the picker" (when null) + "Please verify before approving — do not approve as new without checking." This is the gap-window mitigation: PR 3 will replace this minimal version with the full Section 6.1 banner (target-title lookup, color coding, pre-selection). ~12 LOC of JSX in a single file edit. No test needed (rendered banner is verified manually via the deploy preview at PR-open). Single-task session — small, but it's the bridge between PR 2's submitter flow and PR 3's reviewer flow, so it's worth the focused commit. After 2.7.5: Task 2.8 (E2E tests) → Task 2.9 (push + own reviewer agent + bot triage + PR open). Branch is `feat/phase-8b-intent-first-submitter-flow`, still local-only — push happens at Task 2.9.
