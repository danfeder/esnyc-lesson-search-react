# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-26 by Scaffold session (Session 0)

## Current State

**Phase:** Scaffolded; **design-lock (Session 1) NOT yet started.**

**Active PR:** none (not yet branched for any PR).

**Current task:** Session 1 = design lock. Work the design doc §4 "Open design questions" (Q1–Q9):
discovery against real code/data → lock answers (respect `[evidence-lockable]` vs `[user-verdict]`
tags) → flip design Status Draft→Locked → author the impl plan's concrete tasks → run **GATE 1B** on
the plan. **No implementation code until the design is locked.**

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
