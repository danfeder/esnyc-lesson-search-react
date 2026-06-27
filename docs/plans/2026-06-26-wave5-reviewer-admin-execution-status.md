# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-27 by Session 2 (PR-0 COMPLETE + GATE-3 folded; awaiting user go-ahead to push)

## Current State

**Phase:** **PR-0 OPEN (#552), round-1 bot review TRIAGED + fix-up pushed → round-2 CI/bots in progress.** Design **LOCKED** (Session 1, `61ae519`); impl plan PR 0–2 authored + GATE 1B folded. The ReviewDetail safety net is built + twice-hardened: **0.1 mock + 3 fixtures** (`9d237ae`); **0.2 page-level RTL test — THE GATE** (`3b530ef`, `92213d5`); **0.3 helper unit suites + 6 export-only additions to ReviewDetail.tsx** (`cc1c96d`); **GATE-3 fix-ups** (`ba97c1b`); **round-1 bot fix-up** (`9304e34`: F3 reviews-error→silent-preselect pin + F4/F5/F6 test hygiene). **Net = 16 page-level RTL behaviors + 4-state banner + 23 helper units; targeted 39 green; full suite was 2002 green pre-fix-up; `npm run check` clean; zero production-logic change** (only 6 `export` additions). All dispatches + both fix-ups supervisor-verified. Round-1 external review = `claude[bot]` 6 findings, all rebuttal-passed (GATE-4 2nd opinion ran — note: real Codex was rate-limited until 2026-06-29, so the 2nd opinion fell back to a Claude-family read, a weaker independent signal; acceptable for a test-only PR): **accepted F3/F4/F5/F6**, **deferred F1** (parseExtractedContent name-collision → PR-1a), **rejected F2** (self-resolves in PR-1a). `claude-database-review` posted nothing (no DB). All other CI checks green round 1.

**After PR-0 merges → PR-1a (easy seams) reminders:** (1) **enforce PR-1a Task 1a.2's mandatory test-first 4-case `buildCandidateCards` unit test** (the GATE-3 mitigation for candidate-card branch coverage); (2) **Task 1a.1 naming (bot F1):** when relocating `parseExtractedContent` into `reviewDetailHelpers.ts`, do NOT consolidate it with `ReviewDashboard.tsx`'s PRIVATE same-named `parseExtractedContent` — they have incompatible signatures (`string` vs `{title,summary}`); keep them separate (rename one if you ever try to share). Both confirmed module-private in different files today, so no collision until someone DRYs them.

**Active PR:** **PR-0 = [#552](https://github.com/danfeder/esnyc-lesson-search-react/pull/552)** — OPEN. Round-1 CI all green + round-1 bot review triaged; round-1 fix-up (`9304e34`) + the docs/status commits pushed → **round-2 CI + bots in progress.** Branch **`test/wave5-reviewdetail-safety-net`** ("carry docs forward" — 2 scaffold doc commits ride inside this PR). **Per-PR ritual: round-cap after round 2** (a 3rd round is critical-bugs-only). No DB in this PR → no TEST-DB verification needed. Pre-push GATE-3 re-dispatch was calibrated-skipped for the round-1 fix-up (test-only +139 lines, GATE-4-vetted + supervisor-verified; round-2 external bots are the second pass; Codex unavailable anyway).

**Current task / NEXT:** Watch round-2 checks settle → re-triage all four surfaces (by timestamp, post-fix-up) → if clean, present **merge recommendation** to the user (merge is user-gated). **After PR-0 MERGES:** PR-1a (easy seams). Two forward-notes to honor then — see "Out-of-scope follow-ups."

**🔭 RE-SCOPED 2026-06-26 (Session 1, user-confirmed): Wave 5 = PR 0–2 ONLY** (ReviewDetail test net →
decompose → C107 speedup; frontend-only, no DB, no product decisions). The personalization cluster
(PR 3–5: Bookmarks/Saved-Searches/Collections) + the admin tail (PR 6+: C28/C22/C74/C78) are **DEFERRED
to a future wave** — only ~3 internal reviewers/admins have accounts (general-user login is a later
rollout → personalization audience ≈0) and reviewers never collide on submissions (→ C22/C78 solve a
non-problem). See memory `project_user_base_accounts`. Re-scope banners folded into the design + impl
docs; §§6/7 + the Q3/Q4/Q5/Q9/Q6/Q7 material retained as future-wave reference.

**Current task:** **Task 0.3 — pure-helper unit suites (export-in-place, NO relocation).** Add `export` to
the module-scope helpers in `ReviewDetail.tsx` (`reAddActivityTypeSuffix`, `parseExtractedContent`,
`normalizeMatchType`, `selectOptionsFromConfig`, `flattenHeritageOptions`, `ZOD_FIELD_TO_LABEL`) and add
`src/pages/reviewDetailHelpers.test.ts` importing them from `@/pages/ReviewDetail`. Priority: the
`reAddActivityTypeSuffix` scalar/`'both'`/array/empty/null branches (the crash landmine) first, then
`parseExtractedContent`, then the rest. `buildCandidateCards` is NOT here (its extraction + 4-case test is
PR-1a). Adding `export` is the ONLY production-code touch in PR-0 (truly additive). After 0.3, PR-0 is
push-ready → run GATE 3 (reviewer agent + Codex on the diff) before push. All Q resolved (Q1 = split PR-1
into 1a/1b; Q2/Q3/Q4/Q8 evidence-locked). **PR 3–6+ remain DEFERRED.**

**Pre-PR-0 housekeeping — RESOLVED:** "carry docs forward" (user). Branch `test/wave5-reviewdetail-safety-net`
cut from `chore/wave5-scaffold`; kickoff RIGHT-NOW banner repointed at PR-0 (`43ac2f6`). No separate docs PR.

**Locked-answer headlines (durable):** PR-0 = page-level RTL test (build a NEW table-dispatch
`makeReviewSupabaseMock`; render ReviewDetail directly, no ProtectedRoute/auth-mock/QueryClientProvider;
5 behaviors incl. a legacy scalar-`activityType`/`reject` fixture) + `export`-in-place pure-helper unit
suites (`buildCandidateCards` extraction deferred to PR-1). C107 = `Promise.all` 3-wave shape
(A:[#1,#2,#5] re-apply #1 guards → B:[#3,#6] → C:cond #4); query errors degrade, never hit
ReviewErrorBoundary. C112 stores `SearchFilters` directly as jsonb. Bookmark surface = 3 leaves
(IntCard/IntListRow/IntLessonDetail), `stopPropagation` on the role=button wrappers, gate on `!!user`,
anon = hide/disable (no AuthModal-lift this wave). My-Bookmarks = `/bookmarks` ProtectedRoute (no perms).

**Branch:** `test/wave5-reviewdetail-safety-net` (PR-0; cut from `chore/wave5-scaffold` @ `61ae519`).
Commits: scaffold docs (`03b8c10`,`61ae519`) + kickoff banner (`43ac2f6`) + 0.1 (`9d237ae`) + 0.2
(`3b530ef`,`92213d5`) + 0.3 (`cc1c96d`) + GATE-3 fix-ups (`ba97c1b`) + status (`2579e8a`,`<this push>`) +
round-1 bot fix-up (`9304e34`). **Pushed through round-1 + round-1 fix-up.**
**Last code commit:** `9304e34` (round-1 bot fix-up F3–F6).
**Last commit on main:** `5d44bbe` (feat(c02): P4b enforcement — DB CHECKs #549).

**Design status:** **LOCKED** (Session 1, `61ae519`). GATE 1A + 1B complete (folded).

**Pre-next-PR verification:** none yet (no DB/code work shipped).

**Open `[user-verdict]` questions Session 1 must bring to the user (never lock unilaterally):**
Q1 (decomposition grouping / PR-1 split), Q5 (collections sharing rung), Q6 (admin-tail scope),
Q7 (C22 assignee product decision), Q9 (collections array-mutation ↔ migration tradeoff).
`[evidence-lockable]`: Q2 (test strategy), Q3 (no-migration confirmation), Q4 (C112↔C114 serializer),
Q8 (C107 error semantics + parallel shape).

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

- **PR-2 mock seam (GATE-4 7th issue):** `makeReviewSupabaseMock` cannot serve `lessons_with_metadata` as BOTH a `.in()` array AND a `.eq().single()` object in the SAME render (it keys only on table name; the dual-shape unwrap picks one). Today fine (no fixture fires both paths at once — `degradedUpdateFixture` keeps similarities empty). But PR-2's parallel reorder could plausibly trigger both `lessons_with_metadata` paths in one render → if a PR-2 fixture needs that, key the mock handler on `{table, terminal}` (the mock header already flags this). Validate during PR-2's manual smoke; not a PR-0 defect.
- F4/F5 process tooling was roadmap-sequenced "after W1, before W5"; proceeding with Wave 5 now per user
  direction. F4/F5 remain queued (`reference_working_efficiency_deferred`).
- C27 (search-query logging) blocks C28's "Library searches" KPI → C28 ships without it.
- Anonymous public collections route + broader C157 shareable-URL encoding → deferred (Q5 / Wave 6).

## Pointers to durable context

- Kickoff prompt: `2026-06-26-wave5-reviewer-admin-kickoff.md`
- Design doc: `2026-06-26-wave5-reviewer-admin-design.md` (locked strategy + Q1–Q9)
- Implementation plan: `2026-06-26-wave5-reviewer-admin-implementation.md` (SKELETON)
- Campaign master status: `2026-06-21-deferred-campaign-status.md` (Wave 5 row)
- Roadmap: `2026-06-20-deferred-work-roadmap.md` (§Wave 5, scope source of truth)
- Memory: `project_deferred_work_campaign`, `project_teacher_zero_metadata_model`, `reference_ci_flakes`

## Session log

### Session 0 — 2026-06-26 — scaffold + GATE 1A

Major events:
- Oriented via a parallel-read workflow (roadmap Wave 5 detail · campaign status · ReviewDetail anatomy/seams ·
  personalization-table backend reality) + independent baseline-snapshot cross-check + table shapes.
- Confirmed PR breakdown shape with the user (reversible-first; PR 0 tests → decompose → C107 → C111/112/113 →
  admin tail).
- Scaffolded the four-file pattern (design Draft + impl SKELETON + kickoff + status) on `chore/wave5-scaffold`.
- Ran GATE 1A (Codex gpt-5.5 inline + Claude reviewer); folded 19 findings into the design doc.
- STOP before design-lock and before any implementation code (per session scope). Next: Session 1 = design lock.

### Session 1 — 2026-06-26 — design lock + impl authoring + GATE 1B + RE-SCOPE

Major events:
- **Discovery:** 5-agent read-only workflow (`wf_a536efc9-c53`) re-verified all 11 §5 seam anchors + the
  §5.bis C107 graph + test infra + personalization shapes + render surfaces. Supervisor-verified the 4
  load-bearing corrections against the real files (search-page mock is rpc+functions not `.from()`;
  loadSubmission catch only logs / never hits ErrorBoundary; `useEnhancedAuth` has no `isAuthenticated`;
  bookmark surface = 3 leaves w/ role=button stopPropagation).
- **Locked Q2/Q3/Q4/Q8** from evidence + corrections C-a…C-f into design §4.
- **RE-SCOPE (user-confirmed):** Wave 5 narrowed to **PR 0–2 only** (ReviewDetail test net → decompose →
  C107). Personalization (PR 3–5) + admin tail (PR 6+) **deferred to a future wave** — only ~3 internal
  accounts (general-user login is a later rollout → personalization audience ≈0) + reviewers never collide
  (→ C22/C78 moot). Saved memory `project_user_base_accounts`; updated MEMORY.md + re-scope banners in
  design + impl + this status doc; §§6/7 + Q3/Q4/Q5/Q9/Q6/Q7 retained as future-wave reference.
- **Q1 user-verdict = split** PR-1 into PR-1a (easy seams) + PR-1b (risky core); data hook returns an
  initial-form-state object. Design **Status → Locked**.
- **Authored impl plan PR 0–2 concrete tasks** (0.1–0.3, 1a.1–1a.5, 1b.1–1b.4, 2.1) with file paths,
  anchors, verify cmds, commit msgs.
- **GATE 1B:** Codex (`gpt-5.5`, inline) + Claude reviewer, parallel — both **GO-WITH-CHANGES**, both
  confirmed every PR 0–2 anchor EXACT. Folded all findings into PR-0 (dual-shape mock; `tagged_metadata`
  fixture columns; 3rd `noReviewUpdateFixture` + behaviors 6–9 + 4-state banner coverage to pin
  preselect/auto-expand/view-toggle/closed-enum before their seams move; 1a.2 type co-location; PR-2
  fetch-dependency caveat). No BLOCKER.

Process learnings:
- The re-scope collapsed 5 of the 9 design questions (Q5/Q9/Q6/Q7 → deferred) — surfacing the *audience*
  reality before grinding through mechanism questions saved a lot of motion. Worth asking "who uses this"
  early on any feature wave.
- GATE 1B caught a real coverage gap (PR-0 pinned only the restore branch, not preselect/effect-ordering)
  that would have let PR-1b silently regress — the gate earned its keep on a plan-only review.

Decisions roll-up: see "Recent decisions worth carrying forward" + the design §4 locked answers. Commits:
docs-only on `chore/wave5-scaffold` (see `git log`). Branch not pushed.

### Session 2 — 2026-06-26/27 — PR-0 built end-to-end + GATE 3 (ready to push)

Major events:
- Reconciled a **stale kickoff RIGHT-NOW banner** (still said "design-lock / Draft") against git — design-lock was already done (`61ae519`). Trusted git, repointed the banner at PR-0 (`43ac2f6`).
- **Housekeeping verdict (user): "carry docs forward"** → cut `test/wave5-reviewdetail-safety-net` from `chore/wave5-scaffold`; the 2 scaffold doc commits ride inside PR-0's PR (no separate docs PR).
- **Built PR-0 via 3 fresh-context executor dispatches, each supervisor-verified:** 0.1 table-aware supabase mock (dual-shape terminals) + 3 fixtures (`9d237ae`); 0.2 page-level RTL gate test, 13 behaviors + a 4th `degradedUpdateFixture` for the yellow banner (`3b530ef`, `92213d5`); 0.3 export-in-place helper unit suites + 6 export-only ReviewDetail additions, diff confirmed export-only (`cc1c96d`). Verified `tagged_metadata` (not `metadata`) + the decision enum against real code before accepting fixtures.
- **GATE 3 (pre-push):** code-reviewer agent + Codex (`gpt-5.5`, inline) in parallel on `git diff main...HEAD -- src/`. Rebuttal-passed all 7 findings. **Accepted** C-2 (non-null preselect-target seed unpinned), C-3 (save `submissionId`/`selectedLessonId` + merge-save unpinned), F1 (mock missing `ilike`/`is`/etc.); **accept-lite** F3 (pin doc-embed flag), F2/H-2 (kept honest comment — investigated, **no value≠label case exists** in the frozen closed-enum vocab). **Rejected** C-1 (mock arg-blindness = the locked dispatch-by-table tradeoff; PR-2 manual smoke is the mitigation) + H-1 (candidate-card coverage = PR-1a Task 1a.2's mandatory TDD 4-case unit test). Fix-ups in `ba97c1b`. Grounded the C-2/C-3 accepts by reading the real seed block (L472–486) + save body (L571–579) myself first.
- **Final net:** 15 page-level behaviors + 23 helper units; **full suite 2002 green**, `npm run check` clean, zero production-logic change.

Process learnings:
- **GATE 3 earned its keep on a test-only PR:** Codex C-2/C-3 found real holes (the non-null-preselect-target seed + the merge-save `selectedLessonId` path were unpinned) that PR-1b's extraction could have silently regressed — the spec'd 9 behaviors missed them. Closing holes for the exact seams the next PR moves is faithful to "covered before any move," not scope creep.
- **Reject discipline mattered too:** two "Critical/High" findings (C-1, H-1) were already mitigated by locked design decisions — accepting them would have re-introduced order-sensitivity (C-1) or duplicated PR-1a's planned coverage (H-1). The rebuttal pass paid off both directions.
- Supervisor-grounding (reading L472–486 / L571–579 myself before triaging the Criticals) made the accept/reject calls evidence-based rather than trusting the reviewers' assumptions.

- **Opened PR-0 = #552** (user go-ahead). Round-1 CI all green (E2E/Test&Build/CodeQL/semgrep/Lighthouse/coverage + Security Audit + deploy preview). Four-surface triage: only `claude[bot]` posted (6 findings); no line comments, no review-state reviews, `claude-database-review` silent (no DB). Rebuttal-passed all 6 + GATE-4 2nd opinion: accepted F3 (reviews-error→silent-preselect pin) + F4/F5/F6 (test hygiene), deferred F1 (name collision → PR-1a note), rejected F2 (self-resolves PR-1a). Fix-up `9304e34`; pushed with the docs/status bundle → round 2.

Process learnings:
- **Codex was rate-limited (until 2026-06-29)** — the `codex:codex-rescue` agent auto-fell-back to a direct Claude-family file read for the GATE-4 2nd opinion (`feedback_make_failing_tools_work`). Usable for a low-stakes test-only PR, but NOT a true independent-model-family signal; for a higher-stakes (DB/behavior) round, wait for Codex or escalate. Recorded the weaker-signal caveat in the triage.
- **Calibrated-skipped the pre-push GATE-3 re-dispatch** on the round-1 fix-up (test-only +139, GATE-4-vetted + supervisor-verified, round-2 external bots are the second pass, Codex unavailable). Proportionality over rote ritual — noted explicitly.

Decisions roll-up: see "Recent decisions worth carrying forward". **Pushed through round-1 + round-1 fix-up (`9304e34`); round-2 CI/bots in progress.**
