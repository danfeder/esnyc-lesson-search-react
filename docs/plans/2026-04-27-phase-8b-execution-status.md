# Phase 8b Execution Status

**Last updated:** 2026-04-28 16:10 UTC by Session 8
**Current PR:** PR 3 — Reviewer flow redesign. **In progress** — Task 3.1 shipped on local feature branch `feat/phase-8b-reviewer-flow`; not yet pushed (10 more tasks before PR open).
**Current task:** Task 3.1 ✅ done. Next session resumes at **Task 3.2** — replace PR 2's throwaway minimal banner block in `ReviewDetail.tsx` with the full three-state color-coded version (per implementation plan §3.2, line ~1654). The PR 2 banner block to delete is the `submission?.submission_type === 'update' && (...)` JSX inserted by commit `41c9c2e` (Task 2.7.5).
**Branch:** `feat/phase-8b-reviewer-flow` (4 local commits ahead of `origin/main`: 3 doc commits from Session 7 carrying along + Task 3.1's `6e5c11c`). Not yet pushed.
**Last commit on branch:** `6e5c11c` (Task 3.1).

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
- ✅ **Task 2.7.5 (Session 6)** — added minimal reviewer safety banner in `src/pages/ReviewDetail.tsx`. Two edits: (1) added `AlertTriangle` to existing `lucide-react` import on line 4 (was: `import { ExternalLink } from 'lucide-react';` → now: `import { AlertTriangle, ExternalLink } from 'lucide-react';`); (2) inserted a 33-line block of JSX above the decision-panel `<div className="adm-card">` at line 913, gated on `submission?.submission_type === 'update'`, with two copy variants (`original_lesson_id` non-null → shows raw ID; null → "Submitter could not find the target lesson in the picker"). Yellow chrome via inline styles per plan (`borderColor: '#fbbf24'`, `background: '#fffbeb'`, `color: '#92400e'`/`#b45309`). Type-check + lint clean. No unit test (rendered banner verified manually via deploy preview at PR-open per plan §6.1 PR 2 minimal vs PR 3 enriched). Commit `a2287b2`.
- ✅ **Task 2.8 (Session 6)** — created `e2e/submission-flow.spec.ts` with 3 structural smoke tests covering `/submit`, `/submit/new`, `/submit/revising`. All three test the unauthenticated render shape (none of these routes are wrapped in `ProtectedRoute` — auth is handled in-page via `AuthModal`, so structural tests don't need credentials). Verified plan's text expectations against actual rendered text first: `IntPageHeader title="Submit a lesson"` ✓, "Add a new lesson to the library" ✓, "Update a lesson that's already in the library" ✓, `IntPageHeader title="Add a new lesson"` on `/submit/new` ✓, placeholder `https://docs.google.com/document/d/...` matches `/docs\.google\.com\/document/i` ✓, "Adding a new lesson · Change" breadcrumb ✓, "Step 1 · Find the lesson you're revising" matches `/Find the lesson you're revising/i` ✓, URL field disabled on initial render via `targetReady = Boolean(selectedLesson) || cantFind` (both start false) ✓. 3/3 pass against local dev server (4.1s). Type-check + lint clean. Commit `f10be9d`.
- ✅ **Task 3.1 (Session 8)** — extended `loadSubmission` in `src/pages/ReviewDetail.tsx` to fetch off-list submitter-target lessons. Three edits: (1) added `SubmitterTargetLesson` interface (lines 46-66) with the documented nullability commentary; (2) added `submitterTargetLesson?: SubmitterTargetLesson | null` field to `SubmissionDetail` (line 79); (3) inserted ~35-line fetch block between similarities-with-lessons assembly and the reviews query — gated on `submitterTargetId && !targetInRenderedTopFive` against the SLICED top-5 (per impl plan's CRITICAL note about `topDuplicates.slice(0, 5)` mismatch); (4) attached `submitterTargetLesson` to the `setSubmission(...)` payload. Verified `lessons_with_metadata` has both `summary` and `file_link` columns in `database.types.ts` before adding them to the select. `npm run type-check && npm run lint` clean. Commit `6e5c11c`.
- ✅ **Task 2.9 (Session 7)** — PR 2 shipped end-to-end. Pre-push code-reviewer agent flagged 1 high (LessonSearchPicker stale-async race via debounce-not-cancelling-in-flight) + 1 high (rejected: ilike wildcard hardening) → applied request-id counter fix + regression test (commit `168f52f`). Pushed branch, opened PR #469. **Round 1 bots** (claude-review broad + claude-component-review CHANGES_REQUESTED + claude-database-review pass + performance-review pass) — 4 of ~15 findings accepted as one bundled fix-up `c7b4417`: ARIA combobox attrs on picker, `!!` 0-render guard at L131, `role="alert"` on error divs, auth re-trigger via `pendingSubmitRef + requestSubmit()` in both forms; 11 rejected (DRY, hardening, intentional UX, type-clarity-only). Eslint config got `HTMLFormElement` added to globals list to lint clean. **Round 2 bots** caught two regressions I introduced in round 1: missing URL regex check in `RevisingSubmissionForm.handleSubmit` (round 1 `requestSubmit()` bypassed the canSubmit gate) + ARIA combobox role without keyboard-nav = WCAG 2.1 fail. Both fixed in `3a18277`: added URL check + reverted combobox/listbox/option roles, kept just `aria-label`. **Round 3 bots** ran on `3a18277` — 0 critical findings (re-flags + DRY + UX polish + already-acknowledged-PR-3 items); per round-cap rule no fix-up. **TEST DB MCP smoke** — confirmed deploy preview wired to TEST (`rxgajgmphciuaqzvwmox`), signed in as `admin@test.com`, exercised all 3 paths via chrome-devtools-mcp against the deploy preview UI: `/submit/new` → row `submission_type='new', original_lesson_id=NULL` ✓; `/submit/revising` + Apple Pie picked → row `submission_type='update', original_lesson_id=1r325MQ...` resolves to "Apple Pie" via FK ✓; `/submit/revising` + "can't find it" → row `submission_type='update', original_lesson_id=NULL` ✓. Edge function 400s on fake URLs (extraction fails) but INSERT happens BEFORE extraction so row shape is correct. Live `role="alert"` confirmed in DOM. Three TEST rows left in `lesson_submissions` (clutter only). **Merged via rebase** as `898545e`; local main reset to origin/main; feat branch deleted locally.

## In flight

- **PR 3** — Reviewer flow redesign. Branch `feat/phase-8b-reviewer-flow` (4 commits ahead of origin/main, not yet pushed). Task 3.1 ✅ done. Tasks 3.2 → 3.11 remain (banner replacement, pre-selection + fixed-disable, unified card list, search escape hatch, mismatch helper, queue badges, unit tests, E2E scaffolding, pre-PR + open).

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
- **Round 1 fix-up introduced 2 regressions, caught by round 2 bots** (Session 7). My round 1 a11y improvement added `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-autocomplete` + `aria-haspopup` on the picker input, plus `role="listbox"` on `<ul>` and `role="option"` on `<li>`. Bot 2 round 2 correctly flagged this as WCAG 2.1 failure: declaring combobox role tells AT users to expect ArrowUp/ArrowDown/Enter/Escape, but those weren't implemented (deliberately scoped out as ~50 LOC + tests). Reverted in round 2; kept only `aria-label`. Lesson: when adding ARIA roles, complete the contract or skip the role entirely. Plain `<input>` + `<button>` Tab nav was already accessible. Separately, my round 1 auth-re-trigger fix (`pendingSubmitRef` + `formRef.requestSubmit()`) bypassed `canSubmit`'s URL-regex check, so a user who cleared the URL during the auth modal could fire submit with empty URL. Round 2 added the missing client-side URL check to `RevisingSubmissionForm.handleSubmit` (was already in `NewSubmissionForm.handleSubmit`).
- **PR 2 merge strategy = rebase, not squash** (Session 7, same as PR 1). 14 commits including 5 doc commits + 6 task commits + 3 fix-up commits. Rebase preserved each commit's individual message rather than collapsing the iteration history into a single squash. User confirmed before merging.
- **`lessons_with_metadata` column verification before applying plan select-list** (Task 3.1, Session 8). Plan added `summary` and `file_link` to the off-list lookup's `.select(...)`. Before applying, verified both columns exist in `src/types/database.types.ts:1051,1080` (file_link `string | null`, summary `string | null`) — they do. Pattern: when impl plan adds new columns to a Supabase `.select()`, check `database.types.ts` first; cheaper than a runtime test failure.
- **`SubmitterTargetLesson` typed with `lesson_id` not `lessonId`** (Task 3.1, Session 8). Convention per `src/types/CLAUDE.md` is camelCase frontend / snake_case DB. The interface is a passthrough of DB row shape (parallel to `SimilarityWithLesson` which also uses snake_case `lesson_id`), so snake_case is the right call. Confirms the impl plan's spelling.
- **TEST DB smoke via chrome-devtools-mcp + mcp__supabase-test__execute_sql** (Session 7). Deploy preview UI submitted via 3 paths against TEST (verified hitting `rxgajgmphciuaqzvwmox` before any writes). Even though edge function 400s on fake Google Doc URLs, the INSERT happens BEFORE extraction (per `process-submission/index.ts` source) so the row's `submission_type` + `original_lesson_id` shape can still be verified. Signed in as `admin@test.com` per `reference_test_credentials.md`. Pattern worth re-using for any future submission-pipeline PR.

## Out-of-scope follow-ups captured here

These came up during PR 2 bot triage but were rejected as not-PR-2-scope. Many will be naturally addressed in PR 3 since it touches the same file tree.

- **DRY auth setup** — `useEffect` for `getUser + onAuthStateChange + subscription cleanup` is now copied verbatim in `SubmissionPage`, `NewSubmissionForm`, and `RevisingSubmissionForm`. A `useCurrentUser()` hook would eliminate it. Three different bots flagged across all three rounds. PR 3 will touch all three files; refactor candidate.
- **DRY `SUBMISSION_STATUS_TO_BADGE`** — duplicated in `NewSubmissionForm.tsx` + `RevisingSubmissionForm.tsx`. Move to `src/utils/` shared constant.
- **DRY Google Doc URL regex** — `/\/document\/d\/([a-zA-Z0-9-_]+)/` appears in `NewSubmissionForm.tsx`, `RevisingSubmissionForm.tsx`, and `supabase/functions/process-submission/index.ts`. Extract to a shared constant + helper. Note: the bot's "ambiguous `-` position" claim is technically wrong for ECMAScript (the dash after a completed range is treated as literal), but the rewrite to `[a-zA-Z0-9_-]` is more universally readable.
- **Keyboard navigation in `LessonSearchPicker`** — Tab works through results; arrow-key + Enter + Escape keyboard nav not implemented. Bot 2 wanted full ARIA combobox pattern with `aria-activedescendant`. ~50 LOC + tests. Defer to PR 3 reviewer flow which also consumes the picker, OR a dedicated a11y follow-up.
- **`fieldset disabled` for Step 2 in `RevisingSubmissionForm`** — current `opacity-50 pointer-events-none` wrapper hides the section visually but doesn't propagate disabled state to AT (only the `<input>` itself is `disabled`). Replace with `<fieldset disabled>` to announce the whole step as disabled.
- **`cantFindOption` discriminated-union prop typing** — currently `cantFindOption?: boolean` + `onCantFind?: () => void` allows the caller to pass `cantFindOption=true` without `onCantFind` and the affordance silently disappears. Discriminated union would prevent this at compile time. Hardening, not a real bug.
- **"Can't find it" disappears when query is cleared** — `runSearch("")` resets `hasQueried=false`, so user loses the affordance after clearing input. Bot 2 round 3 suggested an `everQueried` ref that doesn't reset. UX papercut, not data-correctness.
- **Reset `results` + `hasQueried` on chip clear** — when user picks a lesson then clicks ×, the picker re-renders with previous query/results/`hasQueried=true`, so "can't find it" appears instantly. Could be feature OR bug depending on UX intent. Not critical.
- **Banner enrichment in `ReviewDetail`** — already acknowledged in PR description as PR-3 work: convert inline `style={{}}` to `adm-card border-amber-400 bg-amber-50` Tailwind/admin classes; replace raw UUID with title lookup; full Section 6.1 banner.
- **Edge function 400 error UX** — when extraction fails, frontend shows "Edge Function returned a non-2xx status code" instead of the helpful error message from the response body. Pre-existing in `parseDbError`. Not introduced by this PR. Worth a follow-up.
- **Test rows in TEST DB** — Session 7 left 3 rows in `lesson_submissions` (`phase8b_smoke_p1_new_469`, `phase8b_smoke_p2_revising_target`, `phase8b_smoke_p3_cantfind`). Clutter only; safe to clean up via `DELETE FROM lesson_submissions WHERE google_doc_url LIKE '%phase8b_smoke%'` if desired.
- **Fragile test `cantFindOption={false}` in `LessonSearchPicker.test.tsx`** — empty `waitFor(() => {}, { timeout: 500 })` pattern doesn't actually wait. Bot 2 round 3 noted. Test passes trivially but the assertion is technically before the query completes. Low priority test-reliability nit.

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

### Session 6 — 2026-04-28 14:30 UTC start, 14:46 UTC end — Tasks 2.7.5 + 2.8 shipped (grouped)

Major events:
- Read kickoff, design doc, status file, implementation plan from Task 2.7.5 through Task 2.9 (and start of PR 3 Task 3.1).
- Confirmed baseline clean (`type-check` + `lint`); worktree noise (`M .beads/.gitignore`, `?? .claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone (5th session running).
- User confirmed grouped Tasks 2.7.5 + 2.8 in one session.
- **Task 2.7.5:** verified `AlertTriangle` was NOT in the existing `lucide-react` import (only `ExternalLink` per line 4); verified `submission_type` ('new'|'update') and `original_lesson_id` (string|undefined) on `SubmissionDetail` interface (lines 51–52); verified target line 913 (`<div className="adm-card">` wrapping decision panel — first of three `adm-card` instances at 527, 879, 913, 964; the one at 913 is the decision-panel wrapper per plan). Two edits: added `AlertTriangle` to import, inserted 33-line banner block. Type-check + lint clean. Committed as `a2287b2`.
- **Task 2.8 prep:** verified the three target text strings against actual rendered output before writing the spec (per kickoff "verify every snippet against current code" rule). All matched. Verified routes are NOT wrapped in `ProtectedRoute` (App.tsx lines 98–100 — bare `<Route>` declarations; auth handled via in-page `AuthModal`), so unauthenticated structural tests work without credentials. Verified `targetReady = Boolean(selectedLesson) || cantFind` (RevisingSubmissionForm line 49) starts false → URL field disabled on first render → `toBeDisabled()` assertion will pass.
- **Task 2.8 implement:** created `e2e/submission-flow.spec.ts` with 3 tests per plan. Adapted test 2's "Add a new lesson" assertion from plan's `getByText` to `getByRole('heading', ...)` for specificity (the text "Add a new lesson" also appears as card text on `/submit`, but only the H1 renders on `/submit/new` so either would work — `getByRole` is more precise and matches the test 1 pattern). Ran `npm run test:e2e -- submission-flow`: 3/3 pass in 4.1s.
- Type-check + lint clean post-Task-2.8. Committed as `f10be9d`.
- Both commits ride on the (still-local-only) feature branch ahead of Task 2.9 push.

### Session 7 — 2026-04-28 14:55 UTC start, 15:30 UTC end — PR 2 shipped end-to-end (Task 2.9)

Major events:

- Read kickoff, status file, implementation plan §Task 2.9 (lines 1466–1520).
- Confirmed baseline clean (`type-check` + `lint`); worktree noise (`M .beads/.gitignore`, `?? .claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone.
- **Pre-push code-reviewer agent dispatch.** Returned 0 critical, 2 high (LessonSearchPicker stale-async race + ilike wildcard escape), 2 medium. Triaged: ACCEPT stale-async (real race, small fix, likely re-flag from external bots) → applied request-id counter pattern + regression test as commit `168f52f`. REJECT ilike escape (zero real-world probability for corpus, hardening below the bar).
- Ran `type-check + lint`, pushed branch, opened **PR #469** with the test-plan body from impl plan lines 1482–1507.
- **Round 1 bots** (~3 min after push): claude-review broad report (8 findings) + claude-component-review CHANGES_REQUESTED with 7 line-comments + claude-database-review pass (no findings) + performance-review pass (no findings). All 4 surfaces queried per `feedback_pr_comment_surfaces.md`.
- Round 1 triage: 4 ACCEPT bundled into commit `c7b4417` — (1) ARIA combobox attrs on picker input + listbox/option roles on ul/li; (2) `!!` prefix on the `||`-of-two-`.length` 0-render condition; (3) `role="alert"` on dynamic error divs in both forms; (4) auth re-trigger via `pendingSubmitRef + useEffect-on-user-change + formRef.requestSubmit()` in both forms. Plus added `HTMLFormElement: 'readonly'` to `eslint.config.js` globals (alongside existing HTMLInputElement/HTMLDivElement/HTMLButtonElement). Round 1 REJECTS (11): DRY (auth, badge, URL regex, status-to-badge), hardening (ilike escape, URL host check), intentional UX (stale-on-clear, ARIA self-rate fail), type-clarity-only (`'new'|'update'|string` widening), already-acknowledged (banner inline styles, raw UUID).
- **Round 2 bots** caught 2 regressions I introduced in round 1: (a) `RevisingSubmissionForm.handleSubmit` lacks the URL-regex client-side check that `NewSubmissionForm.handleSubmit` has — round 1's `requestSubmit()` post-auth bypasses `canSubmit`'s URL gate; (b) ARIA `role="combobox"` without keyboard nav (ArrowUp/ArrowDown/Enter/Escape) is a WCAG 2.1 failure — declaring combobox role tells AT users to expect operable combobox. Both fixed in commit `3a18277`: added URL check to RevisingSubmissionForm + reverted the combobox/listbox/option roles entirely (kept just `aria-label`). All other round 2 findings were re-flags (rejected) or pre-existing minor items (out of round-2 scope per round-cap).
- **Round 3 bots** (after `3a18277` push): 0 critical findings. All flagged items were re-flags from rounds 1-2 (DRY refactors, hardening, UX polish, already-acknowledged PR-3 items) or new minor UX observations. Per round-cap rule (`feedback_pr_bot_review_workflow.md`) no fix-up commit in round 3; documented all in "Out-of-scope follow-ups" section above.
- **TEST DB MCP smoke via chrome-devtools-mcp + mcp__supabase-test__execute_sql.**
  - Confirmed deploy preview hits TEST (`rxgajgmphciuaqzvwmox.supabase.co`) before any writes.
  - Verified `process-submission` v7 deployed with new normalize-aware source (line-by-line via `mcp__supabase-test__get_edge_function`); `normalizeSubmissionInputs.ts` deployed alongside.
  - Verified FK constraint on TEST (`confdeltype = 'n'`, `ON DELETE SET NULL`).
  - Signed in as `admin@test.com` per `reference_test_credentials.md`. Exercised all 3 paths via chrome-devtools-mcp UI submission against deploy preview:
    - **Path 1 — `/submit/new`** → row `submission_type='new', original_lesson_id=NULL` ✓
    - **Path 2 — `/submit/revising` + Apple Pie picked** → row `submission_type='update', original_lesson_id='1r325MQlxLcN1l9TUzIx2qHNH7IXrecHeU6AZL0O0IP0'` resolves to "Apple Pie" via FK ✓
    - **Path 3 — `/submit/revising` + "can't find it"** → row `submission_type='update', original_lesson_id=NULL` ✓
  - Edge function 400s on fake URLs (extraction fails, expected) but INSERT happens BEFORE extraction so row shape is verifiable. Live DOM `role="alert"` attribute confirmed on error div from snapshot (round 1 fix working in production).
- **Merge** — user confirmed rebase strategy (PR 2 has 14 commits including 5 docs that benefit from preservation). Merged via `gh pr merge 469 --rebase` as `898545e`. Local main reset to `origin/main` (after verifying `git diff` showed only the pre-PR-2 baseline) so the 2 local-only session-1 doc commits (whose rebased equivalents now live on origin) get discarded as duplicates. Feat branch deleted locally.
- **PROD edge function deploy** — initially overlooked the manual approval gate (deploy-edge-functions workflow on `main` push `898545e` waited for ~10 min before user noticed). User approved run `25061950611`; deploy completed success in ~30s. Verified live via `mcp__supabase-remote__get_edge_function process-submission`: v29 deployed, ezbr_sha256 `9e6968bcfdab044dfd89d9f203ccb7178b60dde3508789854a5d6a303e2531b3` MATCHES TEST exactly (Phase 7c silent-no-op pattern would have produced different shas; identical shas mean both environments running same compiled artifact). Source includes `normalizeSubmissionInputs` import on line 5, the Phase 8b normalize call, the pre-INSERT FK existence check returning 400 with "Original lesson not found", and INSERT using `normalizedSubmissionType`/`normalizedOriginalLessonId`. Sibling helper `normalizeSubmissionInputs.ts` also deployed.

### Session 8 — 2026-04-28 16:00 UTC start, 16:15 UTC end — PR 3 Task 3.1 shipped (branch + first commit)

Major events:

- Read kickoff, status file, design doc end-to-end, implementation plan §PR 3 (lines 1522–2501).
- Confirmed baseline `npm run type-check && npm run lint` clean; worktree noise (`.beads/dolt*`, `.claude/scheduled_tasks.lock`) confirmed unrelated to Phase 8b — left alone.
- Branched `feat/phase-8b-reviewer-flow` off local `main` (3 unpushed Session-7 doc commits ride along — same precedent as PRs 1 + 2 carried prior-session docs).
- **Task 3.1 verification before edit:** grepped `ReviewDetail.tsx` for the impl plan's anchor symbols — `interface SimilarityWithLesson` at line 33, `interface SubmissionDetail` at line 46, `loadSubmission` at line 219, `similaritiesWithLessons` initialization at line 240, `setSubmission(fullSubmission)` at line 300. All matched the plan's expectations. Verified `lessons_with_metadata` view exposes `summary` (line 1080) + `file_link` (line 1051) in `database.types.ts` before adopting plan's `.select(...)` extension.
- Applied 3 edits to `src/pages/ReviewDetail.tsx`: (1) `SubmitterTargetLesson` interface added between `SimilarityWithLesson` and `SubmissionDetail` with the documented nullability rationale; (2) `submitterTargetLesson?: SubmitterTargetLesson | null` added to `SubmissionDetail`; (3) ~35-line fetch block inserted between similarities-with-lessons assembly (line ~261) and the `submission_reviews` query (line ~263), gated on `submitterTargetId && !targetInRenderedTopFive` against the SLICED top-5 (per impl plan's CRITICAL note); (4) `submitterTargetLesson` attached to `fullSubmission` payload at line ~342.
- `npm run type-check && npm run lint` clean. Reviewed diff (~56 inserted lines, no deletions). Committed as `6e5c11c`.
- Single-task session per kickoff session-scope rules — Task 3.2 (banner replacement, ~50 LOC of new JSX with three intent states + a degraded fallback) is substantively different from Task 3.1 (data fetch) and warrants its own session. Stopped at natural commit boundary.

### Next session picks up at

**PR 3 Task 3.2** — replace PR 2's throwaway minimal banner block in `ReviewDetail.tsx` with the full three-state color-coded version (per implementation plan §3.2, lines 1654-1741).

The block to delete is the `submission?.submission_type === 'update' && (...)` JSX from commit `41c9c2e` (Task 2.7.5) — locate via `grep -n "submission?.submission_type === 'update'" src/pages/ReviewDetail.tsx`. Replace with the IIFE that renders four states (green new, blue update-with-target-and-title, yellow update-with-target-but-title-failed-to-load, yellow update-no-target). Reads `submission?.submitterTargetLesson?.title` (added in Task 3.1) AND falls back to `topDuplicates.find((d) => d.lesson_id === targetId)?.lesson?.title` for the "X is already in the top-5 dups" case. `AlertTriangle` already imported (line 4).

**Watch-outs for Task 3.2 verification:**
- Read the existing `41c9c2e` banner block first to know exactly what's being replaced — same anchor pattern from impl plan (`type === 'update'` IIFE) but only one yellow state.
- The plan's color classes are Tailwind (`bg-emerald-50`, `bg-blue-50`, `bg-amber-50`) — different from the PR 2 banner which used inline `style={{}}` per the plan's "PR 2 minimal vs PR 3 enriched" note. Confirm Tailwind amber/emerald palette tokens render in dev before commit.
- This task does NOT introduce new state or hooks — purely render replacement. No `useEffect` dependencies to manage.

**Beyond Task 3.2:** Tasks 3.3 + 3.4 are coupled (pre-selection + fixed enable/disable on the SAME render); plan to do them together. Task 3.5 (unified candidate-matches list) needs verification of `IntDuplicateCard`'s `matchLabel`/badge prop name first via `grep`.
