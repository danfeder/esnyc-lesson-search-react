# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 3 (PR2 #523 OPENED — 4 tasks + pre-push gate done; awaiting bot round 1)

## Current State

**Prior PR shipped:** PR 1 (W1a-cosmetic-a11y) = **GitHub PR #522 MERGED 2026-06-20 16:54 UTC → `main` @ `19d99b7`** (2 bot rounds + Codex GATE-4; merge user-gated). Full PR1 detail (Tasks 1.1–1.6 Done + Sessions 0/1/2 logs) moved to `…-execution-status-archive.md` — grep there, don't read it whole.

**Active PR:** PR 2 — **W1a-behavior = GitHub PR #523 OPEN** (https://github.com/danfeder/esnyc-lesson-search-react/pull/523). Branch `feat/theme-b-w1a-behavior` off `main` @ `19d99b7`. The last W1a PR; W1a is **Locked**. Net-new frontend code, **no DB**. All 4 tasks shipped + supervisor-verified; pre-push dual-family gate done; pushed + opened.

**Current task (NEXT SESSION):** **PR #523 bot-review round 1.** Wait for CI/deploy-preview/E2E + external bots, then `/pr-triage 523` across ALL FOUR surfaces (issue-comments, review summaries, line-comments, checks/failed-run logs). Rebuttal-pass every finding; **GATE 4** (Codex 2nd opinion via `codex:codex-rescue`) on any real suggested change. Consolidated fix-ups. **Bundle the local docs commit (`5cf…`? — see below) into that first fix-up push** (status + archive are committed locally but NOT pushed, per the no-docs-only-push rule). Round-cap after 2. If clean → surface the merge decision to the user (merge is user-gated).

**Branch:** `feat/theme-b-w1a-behavior` (off `19d99b7`). 5 code commits: `382521a` (2.1 C59), `d2f968b` (2.2 C14), `4769866` (2.3 C79), `234388c` (2.4 §3.4), `5f2954c` (pre-push fix-ups). All pushed.

**Last commit on branch:** `5f2954c` (code), then a LOCAL-ONLY docs commit (status + archive) to be pushed bundled with the first bot-review fix-up.

**Pre-push gate outcome (2026-06-20):** Claude code-reviewer + Codex GATE 3 (`codex:codex-rescue`, different family) in parallel on `main...HEAD` (docs excluded). Codex's first dispatch backgrounded its output (flaky async handoff); a focused retry returned inline. **4 findings, all ACCEPTED + fixed in `5f2954c`** (each RED→GREEN): (1) **§3.4 density-switcher vanish** [Claude] — passing raw `view='split'` to IntToolbar in the 768–1099px band hid the list-only `IntDensitySwitcher` (`if view!=='list' return null`) AND left no view radio highlighted; fix = pass `effectiveView`. Bigger than the supervisor's flagged "highlight nuance." (2) **C79 dangling `aria-controls`** [Codex F1] — `aria-controls={isOpen ? listboxId : undefined}`. (3) **C79 nested `<button>` in `role="option"`** [Codex F2] — made the `<li>` the click target (canonical listbox; lint clean, click test unbroken). (4) **C59 false "No more results to load"** [Codex F3] — `InfiniteScrollTrigger` forced `hasMore=false` during `isPlaceholderData` while stale rows showed → terminal copy flashed; fix = hide the whole trigger during placeholder. Claude+Codex DISAGREED on F1 (Claude: "accepted APG pattern"; Codex: violation) — sided with Codex's fix (unambiguously correct, zero downside). Codex independently confirmed the C59 state machine, `useMediaQuery`, and IntFormField ARIA are clean.

**Pre-next-PR verification (if any):** none (PR2 has no DB).

**No `[user-verdict]` gates inside PR2.** Two executor-lockable details, both with stated defaults: C14's IntPillGroup scope (default **(b)**: ship the single-form-control fix, file IntPillGroup ARIA-forwarding as a follow-up — keep PR2 tight) and C79's Escape semantics (default: component-local clear/collapse + keep input focus; add `onEscape`/`onClose` callback only if the reviewer panel needs panel-collapse).

**Branch:** `feat/theme-b-w1a-behavior` (off `19d99b7`). 3 code commits: `382521a` (2.1 C59), `d2f968b` (2.2 C14), `4769866` (2.3 C79).

**Status-doc handling (carry the PR1 pattern):** the active status doc + this archive stay **uncommitted/local** during PR2 build + push + PR-open (keeps docs out of the code-review diff), then get committed and pushed **bundled with the first bot-review fix-up** (avoids a docs-only CI cycle, per `feedback_no_docs_push_during_pr.md`). Executors use explicit `git add <code files>` so they never sweep the docs.

**Pre-next-PR verification (if any):** none (PR2 has no DB).

**Status of the work:** PR #523 OPEN, all 4 tasks + pre-push fix-ups pushed, `npm run check` clean + full suite **1371** green. Next action: bot-review round 1 (above). PR3 (W1b) + PR4 (W1c) remain design-lock skeletons — author tasks after locking design §4 questions at each PR-cycle start.

## Recent decisions worth carrying forward

- **User decisions (2026-06-20, before scaffolding):** (1) include checkbox a11y §3.2 in W1a PR1 *(done)*; (2) C84 = suppress tags badge now (PR1 *done*) + make-real in W1b; (3) W1a = two PRs split by risk.
- **Gate A folded (2026-06-20):** C58 migration is DROP+CREATE not body-only (signature change); C59 needs neutral empty hint + infinite-scroll guard + intended-stale-during-refetch; C14 honestly scoped (IntPillGroup not covered); C69 drop the speculative `'both'` fan-out; C11 exclude by exact ghost IDs (`20260508000000:109`).
- **Gate B folded (2026-06-20, Codex on impl + kickoff):** `InfiniteScrollTrigger` is in `src/components/Common/` (NOT `Internal/`); new `IntListSkeleton` must be exported from the `src/components/Internal/index.ts` barrel (+ in the commit).
- **Responsive fold-in (2026-06-20, user-approved):** §4.8 toolbar-overflow (→ PR1, *done*) and §3.4 split-view dead-end (→ PR2, Task 2.4, approach (b): new `useMediaQuery` hook + non-destructive effective-view coercion + hide SPLIT control below 1100px).
- **GATE 4 (2026-06-20, user-requested):** whenever a review bot surfaces a *real suggested change*, run a Codex 2nd opinion (`codex:codex-rescue`, different family) on the finding + the supervisor rebuttal BEFORE finalizing accept/reject. Earned its keep in PR1 round 1 (Codex overturned a supervisor decline).

## Done (PR2 cycle)

- **Task 2.1 — C59 loading state** (`382521a`, Session 3). `useLessonSearch.ts`: `placeholderData: keepPreviousData` (first repo usage; v5.90.20 confirmed exported). New `src/components/Internal/IntListSkeleton.tsx` (int-* tokened, mirrors `IntListRow` grid, `role="status"`/`aria-label`, sr-only text, `prefers-reduced-motion` opt-out) + `.int-skeleton` shimmer (`@keyframes int-skeleton-pulse`, `--color-esy-ink-10`) in `internal.css` + barrel export in `index.ts` (same commit). `SearchPage.tsx`: destructure `isPending`/`isPlaceholderData`; skeleton branch BEFORE the empty check; neutral "No lessons to show." hint for the no-query/no-filter empty (was the contradictory "Loading lessons…"); suggestions panel gated on `!isPending && !isPlaceholderData` (totalCount lags one fetch); infinite-scroll guarded in both `hasMore={…&&!isPlaceholderData}` and `handleLoadMore`. Tests: new `keepPreviousData`-persistence harness in `useLessonSearch.wiring.test.tsx` (asserts `data.pages` persist + `isPlaceholderData` across a filter-change rerender) + a "Loading State (C59)" block in `search-page.test.tsx` (skeleton-not-"No matches" cold load; no suggestions flash mid-pending; load-more affordance suppressed during placeholder). **Supervisor-verified:** `npm run check` clean (re-run); the two C59 test files 30/30 green (re-run); executor's full suite 1355/1355; diff spec-matched; branch/commit/no-push confirmed; docs left unstaged. Executor note: test #4 made non-vacuous by asserting the keyboard "Load more results" affordance disappears during placeholder (the IntersectionObserver mock is a no-op).
- **Task 2.2 — C14 IntFormField ARIA** (`d2f968b`, Session 3). `IntFormField.tsx`: `fieldId = htmlFor ?? childProps?.id ?? generatedId`; stable `descId = ${fieldId}-desc` set on the hint/error `<p>`; injected `aria-required={required||undefined}`, `aria-invalid={error?true:undefined}`, `aria-describedby` (merged with the child's existing value via filter+join, no clobber) onto the single-child `isValidElement` clone path ONLY; preserves the original id-only-when-missing behavior. Default scope **(b)** — IntPillGroup NOT touched (control-level ARIA for pill-group/multi-child/non-control children remains a flagged follow-up). Tests: +5 in `IntFormField.test.tsx` (single-input required+error wiring; describedby→hint-only; negative-guard no-attrs; merge-preserves-existing-describedby) + 7 existing unchanged. **Supervisor-verified:** `npm run check` clean (re-run); `IntFormField.test.tsx` 12/12 green (re-run); executor's full suite 1359/1359; diff spec-matched; branch/commit/no-push confirmed; docs left unstaged.
- **Task 2.3 — C79 LessonSearchPicker keyboard nav** (`4769866`, Session 3). `LessonSearchPicker.tsx` (internal-only): `activeIndex` (reset to -1 on `results` change via `useEffect`) + `collapsed` flag + `inputRef` + `useId` `listboxId`. Input → `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded={isOpen}`, `aria-controls`, `aria-activedescendant`, `onKeyDown` (ArrowDown `min(i+1,len-1)`; ArrowUp `max(i-1,0)` no-wrap; Enter selects active + `preventDefault`; Escape collapses + keeps input focus). `<ul>` → `role="listbox"`+id; each `<li role="option" aria-selected onMouseEnter>` + active highlight, option `onClick→onSelect` kept with `tabIndex={-1}`. `isOpen = !collapsed && results.length>0`; a fresh keystroke (`onChange`) resets `collapsed`. **No `onEscape`/`onClose` prop** (verified neither consumer — ReviewDetail/RevisingSubmissionForm — needs picker-driven panel-collapse; public prop shape unchanged). Tests: +4 (ArrowDown→activedescendant/selected; Enter→onSelect active not click; Escape collapse+focus; roles present); the regression-guard click test (`getByText('Apple Crisp Lesson')`+click) passed unmodified. **Supervisor-verified:** `npm run check` clean (re-run); `LessonSearchPicker.test.tsx` 15/15 green (re-run, RED 4-failed→GREEN); executor's full suite 1363/1363; diff spec-matched; branch/commit/no-push confirmed; docs unstaged. One honest behavior delta: list now renders only when `isOpen` (Escape-collapse); can't-find/stale-discard affordances key off `hasQueried`/`results.length` independently → unaffected.
- **Task 2.4 — §3.4 split-view dead-end <1100px** (`234388c`, Session 3). New `src/hooks/useMediaQuery.ts` (SSR/jsdom-safe: guards `window`/`matchMedia`, reads `.matches`, subscribes to `change`). `SearchPage.tsx`: `isWide = useMediaQuery('(min-width: 1100px)')`; `isSplit = view === 'split' && isWide` (routes the `!isSplit` drawer path when narrow); `effectiveView = view==='split' && !isWide ? 'list' : view` → `data-view` (so the grid never reserves a phantom 3rd column); `allowSplit={isWide}` to IntToolbar. **Store `view` NOT mutated** (non-destructive; verified by empty searchStore diff + an explicit persisted-preference test). `IntToolbar.tsx` + `IntViewSwitcher.tsx`: optional `allowSplit?: boolean` (default true) — HIDE the Split radio when narrow (executor chose hide over disable: cleaner `.filter`, avoids a confusing disabled radio). `eslint.config.js`: +`MediaQueryListEvent: 'readonly'` (DOM-globals allowlist, first ref). Tests: new `search-page-split-view.test.tsx` (mocks `matchMedia`: narrow→drawer+no-split-radio+stored-view-stays-split; wide→split rail+split enabled) + optional `useMediaQuery.test.ts`. **Supervisor-verified:** `npm run check` clean (re-run); split+hook tests 6/6 green (re-run, RED→GREEN); FULL SUITE re-run by supervisor 1369/1369 (67 files); diff spec-matched; store untouched; branch/commit/no-push confirmed; docs unstaged. Open highlight nuance (toolbar shows no active radio when narrow+stored-split) routed to the pre-push gate → resolved in `5f2954c` (see below).
- **Pre-push review fix-ups** (`5f2954c`, Session 3) — 4 dual-family findings, all ACCEPTED + RED→GREEN (detail in the Current State "Pre-push gate outcome" + the Session 3 log). §3.4 `view={effectiveView}` (Claude — restores the vanished density switcher + List highlight 768–1099px); C79 conditional `aria-controls` (Codex F1); C79 `<li role=option>` is the click target, no nested `<button>` (Codex F2); C59 hide the whole `InfiniteScrollTrigger` during `isPlaceholderData` so no false "No more results to load" over stale rows (Codex F3). **Supervisor-verified:** `npm run check` clean; full suite **1371/1371**; F3 RED-proven (reverted gate → test failed) then restored; picker 16/16; split-view 3/3.

## In flight

(none)

## Blocked

(none)

## Decisions made during execution

- **C14 scope (b)** (executor-locked, design-default): shipped the single-form-control ARIA fix only; IntPillGroup/multi-child control-level ARIA deferred as a flagged follow-up (out-of-scope list).
- **C79 Escape semantics** (executor-locked, design-default): component-local clear/collapse + keep input focus; NO `onEscape`/`onClose` prop (neither consumer needs panel-collapse — verified).
- **C79 option structure** (pre-push, GATE-4 accept of Codex F2): the `<li role="option">` is the selection/click target; the nested interactive `<button>` was removed (canonical listbox). Compatible with the locked design (preserves click-activation via the same `getByText`+click test); lint clean.
- **§3.4 toolbar `view` prop** (pre-push, Claude): pass `effectiveView` not raw `view` — the only safe value that keeps the (correct) non-destructive stored-preference behavior while not stranding the density switcher / view highlight below 1100px.
- **Codex GATE 3 async-handoff flake** (process learning): the first `codex:codex-rescue` dispatch returned "running in background" without findings (~6 min, lost output); a focused retry with an explicit "return findings INLINE, do not background" instruction worked. Use that phrasing for Codex review dispatches.

## Out-of-scope follow-ups captured here

- W1b `LessonMetadata.tags` type gap: `database.types.ts:256` has `tags` but `src/types/index.ts` `LessonMetadata` does not — part of C84 path-a (W1b Q5).
- C14 IntPillGroup ARIA-forwarding: if PR2 ships default (b), file this as a flagged follow-up (pill-group controls only get wrapper-level `id`/`aria-label`, not control-level ARIA).

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (locked W1a decisions; §4 open questions for W1b/W1c)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2 concrete; PR3/PR4 skeletons)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Source review: `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md`
- **Archive (PR1 cycle):** `2026-06-20-theme-b-public-ux-execution-status-archive.md` — Sessions 0/1/2 + PR1 Done detail; grep, don't read whole.

## Session log

### Session 3 — 2026-06-20 — PR2 built + pre-push-gated + opened as PR #523

Supervisor session; all 4 impl-plan tasks executed by fresh-context Opus executors, each supervisor-verified (re-ran the task's key test + `npm run check` + diff inspection) before acceptance.

Major events:
- Oriented: git/status-file divergence resolved in git's favor — **PR #522 merged → `main` @ `19d99b7`** (status was written mid-Session-2 with the PR still open). Baseline `npm run check` clean.
- **PR-cycle archival:** moved Sessions 0/1/2 + PR1 Done detail into the new `…-execution-status-archive.md`; slimmed this file to the PR2 cycle. Created branch `feat/theme-b-w1a-behavior` off `19d99b7`.
- **Task 2.1 C59** (`382521a`) → **2.2 C14** (`d2f968b`) → **2.3 C79** (`4769866`) → **2.4 §3.4** (`234388c`). Details in Done. Each executor verified; full suite climbed 1355→1359→1363→1369.
- **Pre-push gate (dual-family):** Claude code-reviewer + Codex GATE 3 in parallel. Claude caught a real bug bigger than the supervisor's flagged nuance (§3.4 density switcher vanishing 768–1099px). Codex's first dispatch backgrounded its output (flaky); a focused "return inline" retry surfaced 3 more (F1 dangling aria-controls, F2 nested button in option, F3 false "No more results" during placeholder). All 4 ACCEPTED + fixed in **`5f2954c`** (each RED→GREEN; F3 RED-proven by reverting the gate). Codex confirmed C59/`useMediaQuery`/IntFormField clean. Claude+Codex disagreed on F1 → sided with Codex's fix (unambiguously correct).
- `npm run check` clean; **full suite 1371/1371**. Pushed 5 commits; **opened PR #523** (code-only — status + archive committed LOCALLY, to be pushed bundled with the first bot fix-up).

Decisions / learnings worth carrying:
- **GATE 3 dual-family earned its keep (again):** Claude AND Codex each found real issues the other missed (Claude: density-switcher; Codex: the C59 false-terminal-copy + the listbox structure). Run both + the supervisor pass every PR.
- **Codex async-handoff flake:** the `codex:codex-rescue` agent can return "running in background" and lose its output. Mitigation: dispatch with an explicit "return findings INLINE, do not background, summarize Codex output verbatim" instruction. (Captured in Decisions; candidate for a feedback memory.)
- **Supervisor-verify caught nothing wrong in the executors this round** but the pre-push gate caught 4 real items — confirms the gate is load-bearing even when per-task verification is clean.

Next session picks up at: **PR #523 bot-review round 1** — wait for CI/deploy-preview/E2E + external bots, `/pr-triage 523` across all four surfaces, rebuttal-pass + GATE 4 on real findings, consolidated fix-ups (bundle the local docs commit into that first push). Round-cap after 2. If clean → surface the merge decision to the user (user-gated). Then PR3 (W1b) — design-lock §4 Q1–Q5 first.
