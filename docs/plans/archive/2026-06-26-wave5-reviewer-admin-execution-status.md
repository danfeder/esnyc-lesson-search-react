# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-29 by Session 8 (**🏁 WAVE 5 FULLY CLOSED — PR-2 (C107) MERGED — squash `1cd2693` (#555), 2026-06-29T02:40:37Z. WAVE 5 COMPLETE.** Bot triage rounds 1 & 2 done (round-cap reached): #2 (PR-2-introduced double-fault log drop) FIXED `3d0fef1`; #3 (`teacher.email` stub) REJECTED (unreachable); #1 (pre-existing `lessonsError` hides dup cards, HIGH) + round-2 nits (`submissionData?.` chains, doc-comment) DEFERRED to a **prioritized dedicated follow-up PR** (user verdict). All GATE-4-Codex-cross-examined. Initiative-close retrospective DONE — memory ([[project_deferred_work_campaign]] Wave-5 block + MEMORY.md index compressed) updated; no new feedback memory / template amendment needed (Sessions 6–7 reinforced existing ones). The prioritized W5 follow-up PR **SHIPPED as #556** (`b9514de`, merged 2026-06-29T16:09:22Z) — `lessonsError` duplicate-load retry banner + F2 primary-fetch Retry + `key={id}` remount + a11y/cleanup; tracked in its own doc set `docs/plans/2026-06-28-reviewdetail-followup-*`. **NEXT (new initiative): roadmap W6 search-depth / W7 tech-debt** — its own `/kickoff-feature` scaffold, not this Wave-5 kickoff. The kickoff "RIGHT NOW" footer is STALE; trust THIS doc + git.)

## Current State

**🏁 WAVE 5 FULLY CLOSED (Session 8, 2026-06-29).** Re-scoped PR 0–2 all shipped + merged, **plus** the prioritized `lessonsError` follow-up shipped as **PR #556** (`b9514de`). Local branch back to `main`; nothing local-only outstanding; memory ([[project_deferred_work_campaign]]) + initiative-close retrospective done. **Everything below is the final-state record** — present-tense "what ships / Active PR / NEXT = merge" phrasing is historical. Next real work = roadmap W6/W7 (new initiative, own kickoff).

**Phase:** **🏁 WAVE 5 COMPLETE (re-scoped PR 0–2 ALL SHIPPED + MERGED).** PR-0 (`3258365`/#552) · PR-1a (`e4c248d`/#553) · PR-1b (`262eeaa`/#554) · **PR-2/C107 (`1cd2693`/#555, MERGED 2026-06-29)**. `ReviewDetail.tsx` 1,483→**425 lines**; `loadSubmission` now a 3-wave `Promise.all` in `useReviewSubmission.ts`. Design **LOCKED** (`61ae519`); impl plan PR 0–2 authored + GATE 1B folded. R2-1 data-integrity bug RESOLVED in PR-1b. Personalization (PR 3–5) + admin tail (PR 6+) DEFERRED to a future wave. **This doc is now the closed-wave record** — forensic detail in the archive (Sessions 3–7). **All commits are merged into `main`** (#555 squash `1cd2693`; #556 follow-up `b9514de`) — nothing local-only remains. (PR-1a/1b forensic detail → archive Sessions 3–5; PR-2 / Sessions 6–7 → archive too.)

**▶ PR-2 — what ships (impl §"PR 2", design §5.bis, Q8 LOCKED):** serial→parallel rewrite of the 6-fetch graph **inside `useReviewSubmission.ts`** (`loadSubmission`, re-anchor by symbol — impl-plan line numbers are pre-decomposition). Locked 3-wave `Promise.all` shape: **Wave A** `[#1 lesson_submissions, #2 submission_similarities, #5 submission_reviews]` (all id-only) → re-apply #1's post-destructure guards (`throw submissionError` / `!submissionData → setLoading(false);return`) → **thread the R2-1 reviews-error block here** (added in PR-1b *after* the impl task was authored; a reviews error must still BLOCK with the load-error screen) → **Wave B** `[#3 lessons_with_metadata-for-similar-ids (kept inside its `similarities.length>0` guard), #6 user_profiles-teacher]` → **Wave C** conditional `await #4` (off-list submitter target) unchanged. `Promise.all` (NOT `allSettled`) — **no behavior change, only latency** (6 round-trips → 3 worst-case, 2 if #4 doesn't fire). Per-await error discipline preserved verbatim (#1 throws; #3/#4 warn+guard; #2/#5/#6 degrade; #5 R2-1 blocks).

**PR-2 SCOPE — Option A "Tight + trivia" (user verdict, Session 6):** the C107 rewrite (commit 1) **+** 2 behavior-neutral same-file folds as separate labeled commits — drop the dead `SubmissionDetail.review` field (verified read nowhere in `ReviewDetail`/`Review/*`; `UserProfile.tsx` `.review*` hits are unrelated `lesson_submissions` columns) and remove the redundant `setLoading(false)` on the `!submissionData` path (R2-NEW-2). **DEFER** the 2 behavior-CHANGING cluster items to a tiny follow-up PR: **F2** (primary-fetch `loadError`/Retry) and **R2-NEW-1** (`key={id}` nav-staleness root fix + test). **N4** (helpers→`@/utils`, lives in `ReviewMetadataForm` — not touched by PR-2) and **N5/N6** (a11y backlog) also stay deferred. Full deferred cluster detail in Out-of-scope below.

**Final PR (PR-2):** **#555** (https://github.com/danfeder/esnyc-lesson-search-react/pull/555) — opened 2026-06-28, merged 2026-06-29; GATE 3 clean (both families); **manual smoke PASSED** (both fetch-dependency paths, zero console errors); **all CI green incl. both advisory bots** (`claude-review` + `performance-review` ran POST-session-6 — both `pass`). **Bot triage COMPLETE (Session 7, rounds 1 & 2; ROUND-CAP reached).** Round 1: `claude[bot]` 1 review, 3 findings → all GATE-4-Codex(gpt-5.5)-cross-examined; #2 FIXED (`3d0fef1`, log reorder restoring serial parity), #3 REJECTED (unreachable `teacher.email`), #1 DEFERRED (prioritized follow-up PR, user verdict). Bundle pushed `f8ba25d..eccf554` (fix-up `3d0fef1` + 3 held docs `8761eaa`/`2b718df`/`1c960ed` + the round-1 status commit `eccf554`). Round 2 (on `eccf554`): both advisory bots `SUCCESS`; `claude[bot]` re-review AGREED with the deferred-#1 plan, raised 1 NEW LOW (`submissionData?.` post-guard chains — pre-existing per `git show main`, behavior-neutral) + a MEDIUM doc-comment suggestion → both DEFERRED to the same prioritized follow-up PR (GATE-4 skipped: pure nits, no PR-2 code change). **ALL CI green** (incl. both advisory bots, twice). **✅ MERGED — squash `1cd2693` (#555), 2026-06-29T02:40:37Z.** Code in the squash: `d8e9de2` (C107 3-wave `Promise.all` — R2-1 in Wave A) · `4c4590e` (drop dead `SubmissionDetail.review`) · `308736c` (drop redundant `setLoading`) · `3d0fef1` (bot-#2 log reorder). No DB → no TEST-DB verify needed.

**⚠️ Verification posture for PR-2:** the PR-0 page-test net (`review-detail-page`, 16 tests) asserts **final state, not call order**, so it must pass **unchanged** after the rewrite — but the table-dispatch mock **ignores query args**, so it CANNOT catch a dependency-violating reorder (e.g. #3 firing before #2's ids resolve). → **the manual smoke is load-bearing for PR-2**: open a submission with similarities → candidate cards + teacher name render; reopen a legacy approved submission → no clobber/crash; confirm the off-list submitter-target (#4) still renders when it fires. (Mock-seam caveat: the mock can't serve `lessons_with_metadata` as BOTH `.in()` array AND `.eq().single()` in one render — if a #4 fixture is ever added, key the handler on `{table, terminal}`. Detail in Out-of-scope.)

**🔭 RE-SCOPED 2026-06-26 (Session 1, user-confirmed): Wave 5 = PR 0–2 ONLY** (ReviewDetail test net →
decompose → C107 speedup; frontend-only, no DB, no product decisions). The personalization cluster
(PR 3–5: Bookmarks/Saved-Searches/Collections) + the admin tail (PR 6+: C28/C22/C74/C78) are **DEFERRED
to a future wave** — only ~3 internal reviewers/admins have accounts (general-user login is a later
rollout → personalization audience ≈0) and reviewers never collide on submissions (→ C22/C78 solve a
non-problem). See memory `project_user_base_accounts`. **PR-2 is the last PR in this wave; after it merges, Wave 5 is COMPLETE** (run the initiative-close retrospective). §§6/7 + the Q3/Q4/Q5/Q9/Q6/Q7 material retained as future-wave reference.

**Branch:** `main` (PR-2 branch `perf/wave5-c107-parallel-load` squash-merged as `1cd2693`; now historical). Working tree clean.
**Last commit on main:** `b9514de` (follow-up #556 MERGED). `ReviewDetail.tsx` = **428 lines** (PR-2 left it at 425; #556's retry banner +3); PR-1b's 4 modules + #556's changes present.

**Design status:** **LOCKED** (Session 1, `61ae519`). GATE 1A + 1B complete (folded).

**Pre-PR verification for PR-2:** GATE 3 (pre-push reviewer-agent + Codex on `git diff main...HEAD`). No DB → no TEST-DB verify. Automated gate = `npm run test:run -- review-detail-page` staying green (unchanged) + `npm run check` clean. **Plus the load-bearing manual smoke** (above) — the automated net can't catch a fetch-ordering regression.

**Open `[user-verdict]` questions:** **all resolved or deferred.** Q8 (C107 error semantics) LOCKED = `Promise.all`. PR-2 scope = Option A (Session 6). Bot-#1 disposition = "dedicated PR next, prioritized" (Session 7) → SHIPPED as #556. **Nothing pending — Wave 5 fully CLOSED.**

## Recent decisions worth carrying forward

- **Backend reality confirmed (GATE 1A + independent check):** `bookmarks` / `saved_searches` /
  `lesson_collections` exist in the APPLIED baseline (`20251001_…` L1534/1710/1967), RLS-enabled,
  PROD-verified, zero frontend wiring. **Read shapes from the baseline / `database.types.ts`, NEVER
  from `10_future_user_features.sql.skip` (skipped + stale shapes).**
- **No `LessonCard` component exists** — results render via `IntCardGrid`/`IntListRow`/`IntLessonDrawer`/
  `IntSplitDetail`; the bookmark action is a multi-view, **auth-gated** surface (bookmarks RLS is
  authenticated-only; public search serves anonymous users). Exact insertion points = Session-1 discovery.
- **`lesson_collections.is_public` is `TO authenticated`-only** — authenticated cross-user sharing works
  with no migration; an anonymous public route needs a new policy/migration + security review.
- **Collections array mutation has a hidden migration dependency** (atomic RPC needs a migration vs
  race-prone client read-modify-write) → captured as Q9.
- **Auth hook = `useEnhancedAuth`; filter type = `SearchFilters`; C114 serializer** (`urlParams.ts` +
  `useUrlSync`) already shipped → C112 likely stores the `SearchFilters` object directly as jsonb.
- `ReviewDetail.tsx` = **1,483 lines** (roadmap's 1361/1475 were stale); `loadSubmission` (L308–492) is
  fully serial (the C107 target); **zero page-level tests today** (the gate is currently unmet).

## Done

- ✅ **Scaffold (Session 0)** — four docs created on `chore/wave5-scaffold`: design (Draft, Q1–Q9),
  implementation (SKELETON), kickoff, this status doc. Orientation via a 4-agent parallel read +
  independent baseline-snapshot cross-check.
- ✅ **GATE 1A (design doc)** — Codex (`gpt-5.5`, inline) + a Claude reviewer in parallel; both verdicts
  GO-WITH-CHANGES (no BLOCKER/rework; core anchors verified accurate to the line). 19 accuracy findings
  folded (fictional LessonCard, `is_public` authenticated-only, +Q9 array-mutation, "no schema migration"
  wording, C22 split-deploy, `useEnhancedAuth`/`SearchFilters`/named-export/C114 precision fixes, etc.).

## In flight

(none — scaffold session ends before design-lock)

## Blocked

(none — Session 1 is gated on a user checkpoint for the `[user-verdict]` questions, which is expected, not a blocker)

## Decisions made during execution

- Cut the scaffold branch from `origin/main` (not the in-flight `chore/migration-check-constraint-pattern`
  tip) for a clean base. Pre-existing untracked `docs/plans/*.md` files in the worktree are unrelated and
  were NOT staged.
- GATE 1A run THIS session (per user instruction) rather than deferred to Session 1 — the Draft design had
  real reviewable content (reality findings + locked strategy + tagged questions).

## Out-of-scope follow-ups captured here

- **▶ NEXT PR (PRIORITIZED, user verdict Session 7) — finding #1: `lessonsError` total-error hides ALL dup cards.** `claude[bot]` round-1 HIGH, **pre-existing** (live on `main`; PR-2 only relocated the fetch into Wave B — the outcome is byte-equivalent, confirmed by GATE-4 Codex). When the WHOLE `lessons_with_metadata` Wave-B query errors transiently (vs a single missing id), supabase-js resolves `{data:null,error}` → `lessons` null → the `if (lessons)` guard (`useReviewSubmission.ts` ~L193) skips `similarities.map(...)` → `similaritiesWithLessons=[]` → reviewer sees **zero duplicate cards with no UI signal** (the inline comment's "render as Unknown" is true only for the PARTIAL/missing-id case). Risk: reviewer misclassifies a true duplicate as new. **Deferred out of PR-2** (fixing it is a behavior change + a design choice, against PR-2's locked "no behavior change except latency"), but **open a DEDICATED fix PR immediately after PR-2 merges, ahead of the F2/R2-NEW-1 cluster.** **Design decision to make in that PR** (don't just mechanically map-always): render N "Unknown" cards (bot's suggested fix) vs block-and-retry like R2-1 vs a visible "couldn't load duplicate details — retry" banner. Lean: a visible signal beats silent zero-cards OR silent Unknown-cards for the mis-review risk (round-2 `claude[bot]` independently endorsed the banner option). Ties to `feedback_data_safety_top_priority`. **Fold these round-2 nits into this same PR (it touches the exact file/load-path):** (a) **`submissionData?.` post-guard optional chains** (`useReviewSubmission.ts` — `submitterTargetId = submissionData?.original_lesson_id ?? null`; preselect block `submissionData?.submission_type`/`?.original_lesson_id`) are misleading after the `if(!submissionData) return` guard; drop the `?.` so a future refactor that moves the guard would type-error instead of silently producing `undefined` + skipping Wave C. Pre-existing (on `main`), behavior-neutral. (b) optional: a one-line comment marking the Wave A `await` as the dependency boundary Wave B requires (the mock can't catch a reorder — manual-smoke-only).
- **Bot-triage round 1 record (PR #555, Session 7) — `claude[bot]` 1 review, 3 findings, all GATE-4-Codex(gpt-5.5)-cross-examined (both families agreed on all 3):**
  - **#2 (LOW, PR-2-introduced) — ACCEPTED + FIXED (`3d0fef1`).** Wave A batches #2 (similarities) + #5 (reviews); the reviews-error `return` preceded the similarities warn, so a double-fault dropped the similarities log line. Moved the `if(similaritiesError) logger.warn` above the reviews-error block → restores exact serial log parity (serial logged #2 at its own await before #5 was fetched). Pure logging, no behavior change; repairs a deviation against PR-2's "preserve error discipline verbatim" contract.
  - **#3 (LOW, pre-existing) — REJECTED.** Bot claimed `teacher.email` (`'teacher@example.com'`) renders for teachers with null/empty `full_name`. UNREACHABLE: the hook sets `full_name: profile?.full_name || 'Unknown Teacher'` (always truthy), so `ReviewDetail.tsx:328`'s `full_name || email` never reaches the email branch. Inert dead data; `ReviewDecisionPanel.tsx:191` also uses `full_name || 'teacher'`, never email. Optional trivial future cleanup (drop the stub email field / fetch real email) — no user-visible bug, out of PR-2 scope.
  - **#1 (HIGH, pre-existing) — DEFERRED to the prioritized dedicated PR above.**

- **✅ R2-1 — RESOLVED in PR-1b Task 1b.1 (`6a55297`).** Fix landed: `useReviewSubmission` now captures the `submission_reviews` fetch `error` and BLOCKS with a load-error screen (user-chosen shape — form never renders → no overwrite possible); `submission_similarities`/`user_profiles` errors are `logger.warn`'d but still degrade gracefully (surgical scope — only the reviews error blocks). Page test 12 flipped to pin the safe behavior (load-error copy present, 0 radios, target card absent). Original analysis retained below for forensics. — **⚠️ R2-1 — latent reviewer-flow DATA-INTEGRITY bug (round-2 bot, HIGH).** `ReviewDetail.loadSubmission` destructures three fetches WITHOUT capturing `error` — `submission_reviews` (L390), `submission_similarities` (L323), `user_profiles` (L397). supabase-js resolves a DB error as `{data:null,error}` (no throw), so on a transient error `reviews=null` → the restore block (L430) is SKIPPED → the preselect block (L472) runs → the reviewer sees a blank/preselected form with NO prior work loaded, unaware the restore failed. Blast radius: `complete_review_atomic` (migration `20260428000003`) uses `ON CONFLICT … DO UPDATE`, so saving the "fresh" form **silently overwrites the prior review row** — a transient DB blip can turn an `approve_update`→Lesson A into a clean `approve_new`. **PR-0 only PINS this (test 12); the FIX is OUT of PR-0's pure-additive scope.** Right home = **PR-1b**, when `loadSubmission` moves into `useReviewSubmission` (capture each `error`, at minimum `logger.warn`, and ideally surface a load-error state so the reviewer doesn't blind-overwrite). When fixed, **test 12 must be updated** (it currently pins the silent-preselect behavior). Ties to `feedback_data_safety_top_priority`.
- **PR-2 mock seam (GATE-4 7th issue):** `makeReviewSupabaseMock` cannot serve `lessons_with_metadata` as BOTH a `.in()` array AND a `.eq().single()` object in the SAME render (it keys only on table name; the dual-shape unwrap picks one). Today fine (no fixture fires both paths at once — `degradedUpdateFixture` keeps similarities empty). But PR-2's parallel reorder could plausibly trigger both `lessons_with_metadata` paths in one render → if a PR-2 fixture needs that, key the mock handler on `{table, terminal}` (the mock header already flags this). Validate during PR-2's manual smoke; not a PR-0 defect.
- **Type-layering nit (PR-1a GATE-3, cosmetic, settle in PR-1b):** the two extracted `Review/` components (`SubmitterIntentBanner.tsx`, `TitleMismatchWarning.tsx`) type-import `SimilarityWithLesson`/`SubmitterTargetLesson`/`CandidateCard` from `@/pages/buildCandidateCards` — a components→pages import direction. Type-only (zero runtime coupling, no circular risk; lint-clean). PR-1b builds the `Review/` cluster core (`<ReviewMetadataForm>`/`<ReviewDecisionPanel>`) and is the natural place to decide the shared-type home (move to `src/types/` or a `Review/`-local types file). Not a PR-1a defect.
- **NOTE — R2-1 line anchors above (L390/L323/L397/L430/L472) are PRE-PR-1a** (file was 1,483 lines; now 1,120). PR-1b's `useReviewSubmission` executor must re-locate `loadSubmission` by symbol, not those numbers.
- **⚠️ F1 (PR-1a round-1+2 bot, Medium) — `ReviewDocPanel` Google-Doc-embed `onError` uses `logger.error` (→ Sentry, ERROR severity) on embed failure.** **CORRECTED understanding (round-2 bot, verified against `GoogleDocEmbed.tsx`):** recovery is NOT automatic — `handleError` (L51–58) sets error state + calls `onError`; the embed then renders an **"Unable to Load Document" error screen with a MANUAL "Show Text View" button** (L124–149, the button only appears if `fallbackToText` is passed). So the reviewer sees an error UI and must click to get the text — it does NOT silently fall back. Sentry gets an ERROR-severity `captureMessage` (no stack trace) on every CSP-block / iframe-auth failure. **Should be `logger.warn`** (embed failure is a recoverable degraded state, not an exception). PRE-EXISTING (carried verbatim from the original `ReviewDetail.tsx`); DEFERRED out of PR-1a to keep it byte-identical (GATE-4 Codex = AGREE-DEFER; user-confirmed). **Explicit follow-up (do NOT rely on proximity — Codex caveat):** one-line change at `src/components/Review/ReviewDocPanel.tsx` `onError` handler — a tiny dedicated cleanup commit (PR-1b does NOT touch this file, so do not assume proximity).
- **PR-1b cosmetic-cleanup bucket (PR-1a round-1+2 bot, Low, all behavior-neutral, all DEFERRED to PR-1b):**
  - **F5 — alias-then-rebind naming in `ReviewDetail.tsx`:** `validateRequiredFields as computeRequiredFieldErrors` import + a local `const validateRequiredFields = useCallback(...)` wrapper reusing the original name. Cleaner scheme = import as `validateRequiredFields`, name the memoized wrapper distinctly (e.g. `getValidationErrors`); same for the `computeFieldProgress`/`fieldProgress` pair.
  - **R2-D — redundant `const type = submissionType` alias** in `SubmitterIntentBanner.tsx` (leftover from the original nullable-`submission` IIFE; the prop is already the typed value). Drop the alias, use `submissionType` directly at the 3 `type ===` sites.
  - **R2-E / F6 — `formatGrades` DRY** in `buildCandidateCards.ts`: the `arr?.length ? 'Grades '+join : 'Grades —'` ternary repeats verbatim 3× (dup-map, off-list, reviewer-search sites). Extract a one-line `formatGrades(arr)` helper. Behavior-identical (now unit-pinned by the round-2 null-grades test).
  - **Round-3 additions (all low/cosmetic, behavior-neutral, deferred):**
    - **R3 localStorage validation** — `ReviewDocPanel.tsx:31` `viewMode` init casts `localStorage.getItem('reviewViewMode') as 'embed'|'text'` + `|| 'embed'` (only catches falsy). A truthy non-matching string would pass through → wrong layout. Pre-existing/byte-identical; GATE-4 Codex AGREE-DEFER (component is sole writer, no reachable invalid-value path today). Fix = validated read (`stored === 'embed' || stored === 'text' ? stored : 'embed'`).
    - **R3 `submissionType` prop too wide** — `SubmitterIntentBanner.tsx:6` types it `'new'|'update'|undefined`, but the call site can never pass `undefined` (`SubmissionDetail.submission_type` is `'new'|'update'`, and the `!submission` early-return precedes render). Narrow to `'new'|'update'` so the green-fallthrough means exactly `'new'`, not "anything non-update". (When narrowed, drop the JSDoc's "or unknown type" wording.)
    - **R3 redundant `as` casts** — `buildCandidateCards.ts:88,117–118,141–142` cast already-inferred literals (`null as IntDuplicateMatchType | null`, `"…" as string | undefined`, `undefined as string | undefined`). Drop them — TS infers from the `CandidateCard` return context.
    - **R3 pages→components type imports (mirror of F3)** — `buildCandidateCards.ts` imports `IntDuplicateMatchType` (`@/components/Internal`) + `LessonSearchResult` (`@/components/LessonSearchPicker`); this is the OTHER direction of the F3 violation. **Both collapse if the 5 domain shapes (`SimilarityWithLesson`, `SubmitterTargetLesson`, `CandidateCard`, `IntDuplicateMatchType`, `LessonSearchResult`) move to `@/types`** (e.g. `src/types/review.ts`) — also removes the defensive `SubmissionForCards` structural alias. This is the canonical fix for F3 + this item together.
    - **R3 narrow memo deps (optional)** — `ReviewDetail.tsx` `parsedContent`/`candidateCards` memos depend on the whole `submission`; could narrow to the fields read. NOTE: these are the ORIGINAL byte-identical dep arrays — narrowing is a (behavior-neutral) deviation, lower priority than the others.
    - **(aside)** Codex flagged an **unused `ReviewContent.tsx`** that also references `reviewViewMode` (not imported anywhere in `src/`, typed writer) — candidate for dead-file deletion, unrelated to PR-1b but worth noting.
  - All carried-forward/extraction-artifact style; kept byte-identical in PR-1a to preserve the pure-refactor contract. None block.
- **PR-1b bot round-1 deferrals (Session 5, all GATE-4-Codex-concurred non-blockers):**
  - **C1 — stale `loadError` nav flash (`useReviewSubmission.ts`):** theoretical only. The sole entry to `/review/:id` is `ReviewDashboard:293`; the load-error screen's only nav is "Review queue"→`/review` (unmounts ReviewDetail → `loadError` resets on remount). The only trigger is a manual URL-bar param edit between two review IDs where the first errored on its reviews fetch; zero data risk (error screen renders no form → no save). The bot's suggested `setLoadError(null)`-in-`useEffect` fix is INEFFECTIVE (effect runs post-commit; stale frame still paints). If ever made reachable (e.g. a future "next submission" link without unmount), fix with a render-phase reset / `useLayoutEffect([id])` / `key={id}` — NOT the bot's version.
  - **F1 — `ReviewActions.tsx` dead-code type drift:** local `ReviewDecision` includes `'reject'`; canonical (now `useReviewSubmission.ts:17`) is the 3-member union. `ReviewActions` is barrel-export-only (rendered nowhere), not in diff. Cleanup follow-up: delete the dead file (cf. the also-dead `ReviewContent.tsx` noted in PR-1a) OR align its type to the canonical import.
  - **F2 — primary-fetch error → "not found" (no Retry):** `useReviewSubmission` final catch only logs; the primary `lesson_submissions` fetch error shows "Submission not found" with no Retry. No overwrite risk (submission null → no form → no save) so out of R2-1's data-integrity scope. Reasonable UX polish: extend the `loadError`/Retry mechanism to the primary fetch — natural fit for **PR-2** (which re-touches the load path).
  - **N5/N6 — pre-existing a11y (carried byte-identical):** `ReviewDecisionPanel.tsx` "Note to teacher" `<textarea>` has no programmatic label (WCAG 4.1.2); `ReviewMetadataForm.tsx` `legacyDecisionWarning` uses `role="status"` (should be `role="alert"` to match the sibling validation banner). Fold into a dedicated a11y follow-up (joins the design-system-migration a11y backlog, e.g. `aria-describedby`).
  - F3 (5× byte-identical comments; cited rule doesn't exist) + N4 (no actual cycle today) — see the cosmetic-cleanup bucket above; not re-listed.
- F4/F5 process tooling was roadmap-sequenced "after W1, before W5"; proceeding with Wave 5 now per user
  direction. F4/F5 remain queued (`reference_working_efficiency_deferred`).
- C27 (search-query logging) blocks C28's "Library searches" KPI → C28 ships without it.
- Anonymous public collections route + broader C157 shareable-URL encoding → deferred (Q5 / Wave 6).

## Pointers to durable context

- Kickoff prompt: `2026-06-26-wave5-reviewer-admin-kickoff.md`
- Design doc: `2026-06-26-wave5-reviewer-admin-design.md` (locked strategy + Q1–Q9)
- Implementation plan: `2026-06-26-wave5-reviewer-admin-implementation.md` (PR 0–2 tasks authored; PR 3–6+ deferred-reference)
- **PR-cycle archive:** `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` (Sessions 0–2 forensic trail; grep, don't read end-to-end)
- Campaign master status: `2026-06-21-deferred-campaign-status.md` (Wave 5 row)
- Roadmap: `2026-06-20-deferred-work-roadmap.md` (§Wave 5, scope source of truth)
- Memory: `project_deferred_work_campaign`, `project_teacher_zero_metadata_model`, `reference_ci_flakes`

## Session log

> Sessions 0–3 (scaffold → design-lock → PR-0 safety net merged `3258365`/#552 → PR-1a built + merged
> `e4c248d`/#553) moved to `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` at PR-1b-cycle
> start (2026-06-28). Grep the archive for forensic detail; the durable carry-forward lives above.

> Session 3 (PR-1a built end-to-end + GATE 3 + 3 bot rounds + MERGED #553 `e4c248d`) moved to the archive
> at PR-1b-cycle start. Grep the archive for its forensic detail.

> Sessions 4–5 (PR-1b: core seams + R2-1 fix → built end-to-end + GATE 3 → 2 bot rounds → MERGED
> #554 `262eeaa`) moved to `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` at PR-2-cycle
> start (2026-06-28). Grep the archive for forensic detail; the durable carry-forward (deferred
> cleanup cluster, R2-1 resolution) lives in the Out-of-scope section above.

> Sessions 6–7 (PR-2: C107 3-wave parallel data-load → built + GATE 3 → load-bearing manual
> smoke → 2 bot rounds → MERGED #555 `1cd2693`, 2026-06-29T02:40:37Z) moved to
> `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` at Wave-5 close (Session 8,
> 2026-06-29). Grep the archive for forensic detail. The prioritized `lessonsError` HIGH +
> F2/R2-NEW-1 cleanup cluster shipped as the follow-up PR #556 (`b9514de`, 2026-06-29T16:09:22Z)
> — tracked in its own doc set `docs/plans/2026-06-28-reviewdetail-followup-*`.
