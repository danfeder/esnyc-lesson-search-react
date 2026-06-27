# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-26 by Session 1 (design-lock, COMPLETE)

## Current State

**Phase:** **Design-lock (Session 1) COMPLETE.** Design **LOCKED**; impl plan PR 0–2 authored + **GATE 1B folded**. Ready for **PR-0 execution** next session.

**Active PR:** none (not yet branched for any PR).

**🔭 RE-SCOPED 2026-06-26 (Session 1, user-confirmed): Wave 5 = PR 0–2 ONLY** (ReviewDetail test net →
decompose → C107 speedup; frontend-only, no DB, no product decisions). The personalization cluster
(PR 3–5: Bookmarks/Saved-Searches/Collections) + the admin tail (PR 6+: C28/C22/C74/C78) are **DEFERRED
to a future wave** — only ~3 internal reviewers/admins have accounts (general-user login is a later
rollout → personalization audience ≈0) and reviewers never collide on submissions (→ C22/C78 solve a
non-problem). See memory `project_user_base_accounts`. Re-scope banners folded into the design + impl
docs; §§6/7 + the Q3/Q4/Q5/Q9/Q6/Q7 material retained as future-wave reference.

**Current task / NEXT SESSION:** **Execute PR 0** (the safety-net gate) per impl plan PR-0 Tasks 0.1→0.2→0.3.
Start: cut branch `test/wave5-reviewdetail-safety-net` from `chore/wave5-scaffold` (or rebase onto `main`
first — see below), then dispatch executors task-by-task (TDD/characterization; supervisor-verify each;
checkpoint after each). All Q resolved: Q1 = **split PR-1 into PR-1a (easy seams) + PR-1b (risky pieces)**,
data hook returns an **initial-form-state object**; Q2/Q3/Q4/Q8 locked from evidence (design §4). PR-0
scope was tightened by GATE 1B — read the impl plan's PR-0 tasks (esp. the dual-shape mock, the
`tagged_metadata` fixture columns, and the **9 page behaviors + 4-state banner coverage**) before
dispatching. **PR 3–6+ remain DEFERRED** (re-scope).

**Pre-PR-0 housekeeping (decide next session):** the `chore/wave5-scaffold` branch holds 4 doc commits and
is **not pushed**. Options: (a) push it + open a docs-only PR to land the scaffold+design-lock on `main`
first, then branch PR-0 off `main`; or (b) carry the docs forward on the PR-0 branch. Leaning (a) for a
clean base. Ask the user.

**Locked-answer headlines (durable):** PR-0 = page-level RTL test (build a NEW table-dispatch
`makeReviewSupabaseMock`; render ReviewDetail directly, no ProtectedRoute/auth-mock/QueryClientProvider;
5 behaviors incl. a legacy scalar-`activityType`/`reject` fixture) + `export`-in-place pure-helper unit
suites (`buildCandidateCards` extraction deferred to PR-1). C107 = `Promise.all` 3-wave shape
(A:[#1,#2,#5] re-apply #1 guards → B:[#3,#6] → C:cond #4); query errors degrade, never hit
ReviewErrorBoundary. C112 stores `SearchFilters` directly as jsonb. Bookmark surface = 3 leaves
(IntCard/IntListRow/IntLessonDetail), `stopPropagation` on the role=button wrappers, gate on `!!user`,
anon = hide/disable (no AuthModal-lift this wave). My-Bookmarks = `/bookmarks` ProtectedRoute (no perms).

**Branch:** `chore/wave5-scaffold` (cut from `origin/main` @ `5d44bbe`). Holds the four scaffold docs.
**Not pushed** — awaiting user direction on whether to PR the scaffold or carry it into Session 1.

**Last commit on branch:** (the scaffold commit — see `git log -1`).
**Last commit on main:** `5d44bbe` (feat(c02): P4b enforcement — DB CHECKs #549).

**Design status:** **Draft** — strategy locked, 9 mechanism questions open. GATE 1A complete (folded).

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
