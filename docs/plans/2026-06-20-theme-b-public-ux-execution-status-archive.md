# Theme B — Public "Broken-Windows" UX Execution Status — ARCHIVE

**Reference-only journal of completed PR cycles.** The live status lives in `2026-06-20-theme-b-public-ux-execution-status.md`. Grep this file (`grep -n`) for prior-session detail; don't read it end-to-end.

---

## PR 1 — W1a-cosmetic-a11y — SHIPPED ✅

**GitHub PR #522** → **MERGED 2026-06-20 16:54 UTC → `main` @ `19d99b7`** (2 bot rounds + Codex GATE-4; merge was user-gated).
Branch `feat/theme-b-w1a-cosmetic-a11y` (off `main` @ `88e117e`). Code commits: `90c3f4f` (C57) · `023e8c3` (§3.2) · `9f02d57` (copy/a11y one-liners) · `a59d4ec` (C69) · `90095b8` (C84 suppress) · `07d0f0d` (§4.8) · `239a4f7` (§4.8 review fix-up) · `ea11fb2` (round-1 fix-up).

### Done (PR1 tasks 1.1–1.6)

- **Task 1.1 — C57 mobile filter button CSS reorder** (`90c3f4f`, Session 1). Moved the base `.int-mobile-filter-btn { display:none }` block before the `@media (max-width:767px)` override in `internal.css` (equal-specificity source-order cascade bug hid the only mobile filter trigger at every width). Added e2e guards in `e2e/performance.spec.ts` (visible @375px, hidden @desktop). Verified: RED→GREEN e2e (3/3 viewport tests), `npm run check` clean, no `!important`, siblings preserved.
- **Task 1.2 — §3.2 filter-checkbox keyboard/SR a11y** (`023e8c3`, Session 1). Swapped `.int-check input { display:none }` for an sr-only clip (focusable + in a11y tree) + focus-visible green ring on `.int-check-box`. TDD vehicle = real-browser Playwright a11y assertion in `e2e/accessibility.spec.ts` (jsdom can't load CSS). Verified: RED→GREEN e2e (checkbox 0→1 in role tree, focusable), full `test:run` 1342 green, `npm run check` clean, `:checked`/sibling rules preserved.
- **Task 1.3 — copy/a11y one-liners** (`9f02d57`, Session 1; 5 files). (1) `ScreenReaderAnnouncer.tsx` `.length` guard on `cookingMethods` (empty array was truthy → phantom "cooking method:" + unreachable "All filters cleared"); phrasing now `${n} cooking methods` matching siblings; new `ScreenReaderAnnouncer.test.tsx`. (2) Header `<small>` → `"Lesson Library"` (user-confirmed). (3) `IntLessonDrawer` `DialogTitle sr-only` = `lesson.title`. (4) `SearchPage` inner `<main>` → `<div id=main-content>` (now exactly one `<main>` app-wide at `App.tsx:93`; SkipLink untouched). Verified: RED→GREEN SR test (3/3), full `test:run` 1345 green, `npm run check` clean, grep confirms single `<main>`.
- **Task 1.4 — C69 activityType facet badges** (`a59d4ec`, Session 1; 2 files). Added `ACTIVITY_TYPE_SLUG_BY_NOUN` map in `facetCounts.ts`; `valuesForKey` case `'activityType'` now maps stored bare noun → sidebar slug with verbatim fallback (`?? noun`); NO `'both'` fan-out. Fixed the misleading slug-shaped test fixtures + added a dedicated `'both'`-stays-verbatim guard. **Supervisor PROD probe 2026-06-20:** activityType = cooking 428 / garden 324 / craft 146 / academic 65, ZERO `'both'` → map covers all live values. Verified: RED→GREEN facetCounts (16/16), full `test:run` 1349 green, `npm run check` clean.
- **Task 1.5 — C84 suppress always-blank tags badge** (`90095b8`, Session 1; 2 files). `IntSidebar.tsx`: gated the per-option `.int-check-count` span on `key !== 'tags'` (stopgap; W1b flips it to a real count). New `IntSidebar.test.tsx` (none existed): asserts ABSENCE of `.int-check-count` in the Lesson Type section + a scope-proof that activityType still shows its count. Verified: RED→GREEN (2/2), full `test:run` 1351 green, `npm run check` clean.
- **Task 1.6 — §4.8 toolbar-overflow restack** (`07d0f0d` + fix-up `239a4f7`, Session 1). Inside the `@media (max-width:767px)` block: `.int-toolbar { flex-wrap: wrap }` + `.int-toolbar-right { flex-wrap: wrap }` so the right cluster drops to its own row and its switchers wrap (no `!important`, desktop untouched). e2e overflow guard on `.int-toolbar` @375px (RED 342px → GREEN ≤1). **Fix-up `239a4f7` (pre-push review):** removed the originally-added `margin-left: 0` + `justify-content: flex-start` from the media block — the `margin-left:0` was DEFEATED by the later base `margin-left:auto` rule (dead cascade no-op); the overflow fix is the cascade-correct flex-wrap, unaffected. Verified: 3/3 viewport e2e green, `npm run check` clean.

### Session log (PR1 cycle)

#### Session 2 — 2026-06-20 — PR1 #522 bot-review round 1 (triaged + fix-up `ea11fb2`)

Supervisor session. PR #522 came back `CHANGES_REQUESTED`. Waited for the last pending review (`claude-review`) to land, then collected ALL FOUR surfaces. Functional CI all-green (E2E, Deploy Preview, Lighthouse, perf/component/feature-review); only Security Audit red (expected `npm audit`/lhci noise).

**New process (user-requested mid-session): GATE 4.** User asked that any bot-surfaced *real suggested change* also get a Codex 2nd opinion on top of the supervisor rebuttal. Added to kickoff PER-PR step 5 + gate list. Ran it this round (`codex:codex-rescue`).

**5 findings triaged (bot · rebuttal · Codex GATE-4 · pre-push code-reviewer):**
- **A** (`internal.css:212`, the CHANGES_REQUESTED blocker) — `.int-check` needs `position:relative` to contain the §3.2 sr-only abspos input. **ACCEPTED.** Rebuttal: bot overstated the mechanism (canonical auto-offset sr-only stays at static position; pattern is used pervasively without positioned parents), but the 1-line fix is zero-layout-risk + correct best-practice. Codex agreed + confirmed `.int-check-box` is already `position:relative` so the checkmark `::after` won't re-parent.
- **B** (`facetCounts.ts:29`) — map duplicates `filterDefinitions.ts`; bot suggested deriving from config. **DERIVE DECLINED; added a "canonical source" comment; reconciliation DEFERRED to W1b.** Rebuttal: deriving via `label.toLowerCase()` couples data bucketing to display copy. Codex confirmed labels are exactly `Cooking/Garden/Academic/Craft` (derive works today but carries the coupling risk) — agreed explicit map is safer.
- **C** (`IntSidebar.test.tsx:45`) — `beforeEach` partial reset → `clearFilters()`. **ACCEPTED.** Codex + code-reviewer confirmed `clearFilters` resets tags+activityType to `[]`, IntSidebar never reads viewState.
- **D** (`accessibility.spec.ts:13`) — no exactly-one-`<main>` guard. **ACCEPTED** — strengthened the existing landmark test to `getByRole('main')` `toHaveCount(1)`.
- **E** (`accessibility.spec.ts:113`) — drop `.first()` after `toHaveCount(1)`. **Supervisor DECLINED → Codex OVERTURNED → ACCEPTED the cleanup.** Supervisor feared page-wide `/cooking/i` multi-match flake; Codex (then the code-reviewer) read the actual labels and confirmed nothing else in the expanded role tree matches `/cooking/i`. Kept the `/cooking/i` substring (NOT anchored) — the C69 count badge renders inside the label, so the accessible name is e.g. "Cooking 416".

**Verification:** `npm run check` clean; full unit 1351/1351; `e2e/accessibility.spec.ts` 13/13. Pre-push: code-reviewer agent on the fix-up diff → clean; skipped a redundant Codex GATE 3 (GATE 4 had just adjudicated these exact changes). Committed `ea11fb2` + a docs commit; pushed both bundled.

Learnings carried forward:
- **GATE 4 earned its keep immediately:** Codex (different family) overturned a supervisor decline that would have left a legitimate, safe test-cleanup unaddressed. Keep running it on every bot round.
- **Rebuttal caught two overstatements** (bot's A "scroll-to-top" mechanism + would-be flake on E) — but the right move on both was still to take the cheap, correct change, just for the right reasons.

#### Session 1 — 2026-06-20 — PR1 (W1a-cosmetic-a11y) built, pushed, opened as PR #522

Supervisor session; all 6 impl-plan tasks executed by fresh-context Opus executors, each supervisor-verified (re-ran the task's key test + `npm run check` + diff inspection) before acceptance.

- Branched `feat/theme-b-w1a-cosmetic-a11y` off `main` @ `88e117e`.
- **Task 1.1 C57** (`90c3f4f`) → **1.2 §3.2** (`023e8c3`) → **1.3 copy/a11y** (`9f02d57`) → **1.4 C69** (`a59d4ec`) → **1.5 C84 suppress** (`90095b8`) → **1.6 §4.8** (`07d0f0d`).
- **User verdict (Task 1.3):** Header wordmark = `"Lesson Library"` (drop "· Internal").
- **Supervisor PROD probe (Task 1.4):** activityType = cooking 428 / garden 324 / craft 146 / academic 65, ZERO `'both'` → confirms no-fan-out; the 4-entry slug map covers every live value.
- **Pre-push gate:** code-reviewer agent + Codex GATE 3 in parallel on the 6-commit diff. Codex clean; Claude reviewer flagged the §4.8 `margin-left:0` media override as a dead cascade-defeated no-op (97 conf). Investigated + confirmed; **fix-up `239a4f7`** removed the dead reset.
- Full suite 1351/1351 green; pushed 7 commits; **opened PR #522** (code-only — status doc kept local).

Learnings carried forward:
- **Dual-family review earned its keep:** Codex (GPT-family) returned clean on the §4.8 cascade bug the Claude reviewer caught at high confidence. Keep running both + the supervisor pass.
- **E2E can't cheaply prove the §4.8 margin alignment:** `getComputedStyle().marginLeft` doesn't reliably distinguish a resolved flex `auto` from `0`; a width-based stack check false-greens. The robust overflow guard (`scrollWidth≤clientWidth @375px`) covers the real fix; dead-declaration removal is the honest response, not a fragile alignment test.
- **Status-doc handling:** kept uncommitted during task execution (out of the code-review diff); committed at session-end, pushed **bundled with the first bot-review fix-up** (avoids a docs-only CI cycle).

#### Session 0 — 2026-06-20 — scaffolding

- Merged PR #519 (deferred-work roadmap); pulled `main` @ `4e06e63`.
- 10-agent discovery workflow verified every W1a anchor + mechanism against current `main`; light W1b/W1c recon. Key surprises: C79 is internal-only; C84 tags now populated (badge actively misleading); cooking-methods half already fixed (PR 6e); C69 test fixtures mask the bug; `feat/url-persistence` WIP stale-to-broken.
- User locked the 3 scope/sequencing decisions (checkbox-a11y in, C84 suppress-then-real, 2-PR split).
- Authored the four scaffold docs; **Gate A** = two adversarial reviews (Codex + Claude) on the design doc, folded ~16 findings (no BLOCKERs).
- **Gate B** = Codex adversarial review of the impl plan + kickoff, folded 6 findings (2 were confirmed wrong-as-written code facts: InfiniteScrollTrigger path, barrel export).
- Scaffold pushed + merged via PR #520 (`ef8cc0f`, docs-only). **Responsive fold-in** (§4.8→PR1, §3.4→PR2) merged via PR #521 (`88e117e`).

---

## PR 2 — W1a-behavior — SHIPPED ✅

**GitHub PR #523** → **squash-MERGED 2026-06-20 21:48 UTC → `main` @ `530b2536`** (user-gated; 2 bot rounds + Codex GATE-4 each). Branch `feat/theme-b-w1a-behavior` (off `19d99b7`). Net-new frontend, **no DB**. 7 code commits: `382521a` (2.1 C59) · `d2f968b` (2.2 C14) · `4769866` (2.3 C79) · `234388c` (2.4 §3.4) · `5f2954c` (pre-push fix-ups) · `5edc7e7` (bot round-1) · `2980c3f` (bot round-2). Final suite **1373/1373**.

### Done (PR2 tasks 2.1–2.4 + pre-push)

- **Task 2.1 — C59 loading state** (`382521a`). `useLessonSearch.ts`: `placeholderData: keepPreviousData` (first repo usage; v5.90.20). New `src/components/Internal/IntListSkeleton.tsx` (int-* tokened, mirrors `IntListRow`, `role="status"`, sr-only text, `prefers-reduced-motion` opt-out) + `.int-skeleton` shimmer in `internal.css` + barrel export. `SearchPage.tsx`: `isPending`/`isPlaceholderData`; skeleton branch BEFORE the empty check; neutral "No lessons to show." hint for no-query/no-filter empty; suggestions gated on `!isPending && !isPlaceholderData`; infinite-scroll guarded in both `hasMore` and `handleLoadMore`. Tests: new keepPreviousData-persistence harness + "Loading State (C59)" block.
- **Task 2.2 — C14 IntFormField ARIA** (`d2f968b`). `fieldId = htmlFor ?? childProps?.id ?? generatedId`; stable `descId`; injected `aria-required`/`aria-invalid`/`aria-describedby` (merged, no clobber) onto the single-child `isValidElement` clone path ONLY. Default scope **(b)** — IntPillGroup NOT touched (flagged follow-up). +5 tests.
- **Task 2.3 — C79 LessonSearchPicker keyboard nav** (`4769866`, internal-only): `activeIndex` (reset on results change) + `collapsed` + `useId` listbox. Input → combobox roles + `onKeyDown` (ArrowDown/Up clamped no-wrap; Enter selects active + preventDefault; Escape collapses + keeps input focus). `<ul role=listbox>`, `<li role=option>` is the click target. No `onEscape`/`onClose` prop (neither consumer needs panel-collapse). +4 tests; regression-guard click test unmodified.
- **Task 2.4 — §3.4 split-view dead-end <1100px** (`234388c`). New `src/hooks/useMediaQuery.ts` (SSR/jsdom-safe). `SearchPage.tsx`: `isWide = useMediaQuery('(min-width:1100px)')`; `isSplit = view==='split' && isWide`; `effectiveView` drives `data-view`; `allowSplit={isWide}`. **Store `view` NOT mutated.** `IntToolbar`/`IntViewSwitcher`: optional `allowSplit` HIDES the Split radio when narrow. `eslint.config.js`: +`MediaQueryListEvent`. New `search-page-split-view.test.tsx`.
- **Pre-push fix-ups** (`5f2954c`) — 4 dual-family findings, all RED→GREEN: §3.4 `view={effectiveView}` (Claude — restores the vanished density switcher + List highlight 768–1099px); C79 conditional `aria-controls` (Codex F1); C79 `<li role=option>` click target, no nested `<button>` (Codex F2); C59 hide the whole `InfiniteScrollTrigger` during `isPlaceholderData` (Codex F3, RED-proven).

### Round outcomes

**Round 1:** only `claude[bot]` (3 surfaces). 4 findings, all minor. {bot · rebuttal · Codex GATE-4 — unanimous}: ACCEPT (A) `inputRef` dead code; ACCEPT (D) IntListSkeleton double-ARIA (dropped `aria-label`, kept sr-only span; re-targeted 2 tests by text). WON'T-FIX (B) ArrowUp APG + (C) inline `getMatches`. Fixed `5edc7e7`; 1371/1371.

**Round 2:** `claude[bot]` self-contradicted (review summary CHANGES_REQUESTED vs its own "Approve to merge" issue-comment). 6 findings. {bot · rebuttal · Codex GATE-4}: ACCEPT (R2-1) skeleton `aria-busy` drop; ACCEPT (R2-3) IntFormField cast widened to `AriaAttributes & {id?}`; ACCEPT (R2-6) ScreenReaderAnnouncer announced a STALE count mid-transition — added a `suppressed` prop wired `isPending || isPlaceholderData` (Codex: isPending also kills the cold-load false "0 lessons"), +2 RED→GREEN tests. WON'T-FIX (R2-2) ArrowUp re-raise; (R2-4) picker stale-state-after-clear (REAL but PRE-EXISTING → follow-up); (R2-5) inline `getMatches`. Fixed `2980c3f`; suite **1373/1373**.

**Pre-push gate outcome:** Claude code-reviewer + Codex GATE 3 in parallel on `main...HEAD` (docs excluded). Codex's first dispatch backgrounded its output (flaky); a focused retry returned inline. 4 findings, all ACCEPTED + fixed in `5f2954c` (each RED→GREEN). Claude+Codex DISAGREED on F1 (Claude: "accepted APG pattern"; Codex: violation) — sided with Codex's fix. Codex independently confirmed the C59 state machine, `useMediaQuery`, and IntFormField ARIA clean.

### Decisions made during execution (PR2)

- **C14 scope (b)** (executor-locked): single-form-control ARIA fix only; IntPillGroup/multi-child control-level ARIA deferred (flagged follow-up).
- **C79 Escape semantics** (executor-locked): component-local clear/collapse + keep input focus; NO `onEscape`/`onClose` prop.
- **C79 option structure** (pre-push, GATE-4 accept of Codex F2): the `<li role="option">` is the click target; nested `<button>` removed (canonical listbox).
- **§3.4 toolbar `view` prop** (pre-push, Claude): pass `effectiveView` not raw `view` (keeps non-destructive stored-preference behavior without stranding the density switcher / view highlight below 1100px).
- **Codex GATE-3 async-handoff flake** (process learning): first `codex:codex-rescue` dispatch returned "running in background" without findings; a focused retry with explicit "return findings INLINE" worked. Use that phrasing for all Codex dispatches.

### Session log (PR2 cycle)

#### Session 4 — 2026-06-20 — PR #523 bot-review rounds 1 + 2 triaged + fixed → squash-merged `530b2536`

Supervisor session. Oriented (git matched; baseline clean). PR #523 CI green except expected-red Security Audit + 2 SKIPs; all 4 auto-review bots ran.
- **Four-surface triage** (`/pr-triage 523`): round 1 only `claude[bot]`, 4 minor findings; round 2 bot self-contradicted across surfaces, 6 findings (2 re-raises).
- **GATE 4** (Codex, return-inline, no flake either round): unanimous on all substantive findings; *improved* R2-6 (suppress on `isPending || isPlaceholderData`); noted toolbar visual count intentionally stale.
- ACCEPT R2-1/R2-3/R2-6 (user approved all 3), WON'T-FIX R2-2/R2-4/R2-5. R2-6 TDD'd. Fixed `2980c3f`.
- **Merge:** user chose squash-merge. Round-2 push hit a **transient GH Actions `synchronize` dispatch miss** (0 GH-Actions check-runs on the head; Netlify/semgrep present) — recovered with an **empty re-trigger commit `7575626`** → full pipeline green. Squash-merged `530b2536`. (`reviewDecision` still showed `CHANGES_REQUESTED` — GitHub doesn't auto-clear it when a later review is only COMMENTED; artifact, not a blocker.)
- **Learnings:** GATE-4 "return findings INLINE" worked first-try both rounds (→ promote to memory candidate); bot self-contradiction across surfaces = the four-surface-triage rationale; R2-6 was a genuine miss in C59's own pattern (gated siblings, missed the announcer); CI `synchronize` dispatch-miss → empty-commit re-trigger (→ `reference_ci_flakes.md` candidate); poller gotcha — `gh ... jq 'test("review")'` crashes on null `.name` rollup entries (guard with `select(.name != null …)`).

#### Session 3 — 2026-06-20 — PR2 built + pre-push-gated + opened as PR #523

Supervisor session; all 4 impl-plan tasks executed by fresh-context Opus executors, each supervisor-verified before acceptance.
- Oriented: PR #522 had merged → `main` @ `19d99b7` (git/status divergence resolved in git's favor). Archived Sessions 0/1/2 + PR1 detail. Branched `feat/theme-b-w1a-behavior`.
- Tasks 2.1→2.4 (`382521a`→`d2f968b`→`4769866`→`234388c`); suite climbed 1355→1369.
- **Pre-push gate (dual-family):** Claude caught the §3.4 density-switcher vanishing 768–1099px (bigger than the supervisor's flagged nuance); Codex (after a return-inline retry) caught F1 dangling aria-controls, F2 nested button in option, F3 false "No more results" during placeholder. All 4 ACCEPTED + fixed `5f2954c`. Suite 1371/1371; opened PR #523 (code-only; docs local).
- **Learnings:** GATE-3 dual-family earned its keep (each family found real issues the other missed); supervisor-verify caught nothing wrong in executors this round but the pre-push gate caught 4 real items (gate is load-bearing even when per-task verification is clean).
