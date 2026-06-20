# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 0 (scaffolding only — no code yet)

## Current State

**Active PR:** PR 1 — W1a-cosmetic-a11y (not yet branched).

**Current task:** Task 1.1 (C57 mobile filter CSS reorder) — not yet started.

**Branch:** `main` (not yet branched for PR 1). Branch for PR 1 will be `feat/theme-b-w1a-cosmetic-a11y`.

**Last commit on branch:** (none — nothing branched).

**Last commit on main:** `4e06e63` (docs: deferred-work roadmap, PR #519) — **plus** the Theme B scaffolding commit (design + impl + kickoff + status), landing this session.

**Pre-next-PR verification (if any):** none yet.

**Status of the work:** Scaffolding complete and **Gate-A-reviewed** (two independent adversarial reviews — Codex + Claude — folded into the design doc 2026-06-20). **W1a is Locked and ready to execute.** PR3 (W1b) and PR4 (W1c) are design-lock skeletons — their tasks get authored after the design doc's §4 open questions are locked at each PR-cycle start. Recommended next step: `/clear`, paste the kickoff, start PR1 Task 1.1.

## Recent decisions worth carrying forward

- **User decisions (2026-06-20, before scaffolding):** (1) include checkbox a11y §3.2 in W1a PR1; (2) C84 = suppress tags badge now (PR1) + make-real in W1b; (3) W1a = two PRs split by risk.
- **Gate A folded (2026-06-20):** C58 migration is DROP+CREATE not body-only (signature change); nested-`<main>` fix is downgrade-SearchPage-inner-to-div (not move-id-to-App), SkipLink stays search-only; C59 needs neutral empty hint + infinite-scroll guard + intended-stale-during-refetch; C14 honestly scoped (IntPillGroup not covered); C69 drop the speculative `'both'` fan-out; C84 renders blank not "(0)"; C11 exclude by exact ghost IDs (`20260508000000:109`).
- **Gate B folded (2026-06-20, Codex on impl + kickoff):** `InfiniteScrollTrigger` is in `src/components/Common/` (NOT `Internal/`); new `IntListSkeleton` must be exported from the `src/components/Internal/index.ts` barrel (+ in the commit); Task 1.4 keeps a dedicated `['both']`-stays-verbatim no-fan-out test; kickoff orientation reads the status file before the impl-plan task; PR3 lock label de-conflated (C136 sanitize ≠ location-Both).
- **Header copy** is the one `[user-verdict]` inside W1a — confirm the exact public wordmark string with the user before committing Task 1.3 (default `"Lesson Library"`).

## Done

(none — scaffolding only)

## In flight

(none)

## Blocked

(none)

## Decisions made during execution

(none yet)

## Out-of-scope follow-ups captured here

- **Split-view dead-end <1100px** (review §3.4, a real P1) and **toolbar overflow <768px** (§4.8) are public bugs the roadmap's Wave 1 did NOT list. Flagged for a future wave — surface to the user when Theme B closes.
- W1b `LessonMetadata.tags` type gap: `database.types.ts:256` has `tags` but `src/types/index.ts` `LessonMetadata` does not — part of C84 path-a.

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (locked W1a decisions; §4 open questions for W1b/W1c)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2 concrete; PR3/PR4 skeletons)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Source review: `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md`
- Archive: `2026-06-20-theme-b-public-ux-execution-status-archive.md` (created at the first PR-ship boundary)

## Session log

### Session 0 — 2026-06-20 — scaffolding

Major events:
- Merged PR #519 (deferred-work roadmap); pulled `main` @ `4e06e63`.
- 10-agent discovery workflow verified every W1a anchor + mechanism against current `main`; light W1b/W1c recon. Key surprises: C79 is internal-only; C84 tags now populated (badge actively misleading); cooking-methods half already fixed (PR 6e); C69 test fixtures mask the bug; `feat/url-persistence` WIP stale-to-broken.
- User locked the 3 scope/sequencing decisions (checkbox-a11y in, C84 suppress-then-real, 2-PR split).
- Authored the four scaffold docs; **Gate A** = two adversarial reviews (Codex + Claude) on the design doc, folded ~16 findings (no BLOCKERs to the W1a foundation; the C58/C14/nested-main/C59 precision fixes are in the design doc).
- **Gate B** = Codex adversarial review of the impl plan + kickoff (user-requested), folded 6 findings (no BLOCKERs) — 2 were confirmed wrong-as-written code facts (InfiniteScrollTrigger path, barrel export).
- Next: `/clear` → paste kickoff → PR1 Task 1.1.
