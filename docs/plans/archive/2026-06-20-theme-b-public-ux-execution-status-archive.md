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

---

## PR 3 — W1b-search-rpc (PR3a migration + PR3b sort wiring) — SHIPPED ✅

**Both PRs squash-merged + PROD-verified 2026-06-20.** PR3a #524 (migration) → `3c592b1`; PR3b #525 (frontend sort wiring) → `5197069`. Split for safe rollout (deploy-ordering hazard — see Session 6). All four W1b search bugs (C136 `&`/apostrophe crash, location-Both drop, no real sort, C11 ghost leak) + the live Sort dropdown are in production.

### Done (PR3 — Task 3.1 migration + Task 3.2 frontend)

- **Task 3.1 — `search_lessons` W1b migration** (`136ba4a`, Session 6). `20260620000000_search_lessons_w1b.sql`: C136 sanitizer (strip tsquery operators/quotes → spaces BEFORE split + split on `\s+`, inside `expand_search_with_synonyms`) · new IMMUTABLE `_match_location` helper (+GRANT) mirroring `_match_cooking_methods` (Indoor→{Indoor,Both}, Outdoor→{Outdoor,Both}, Both→{Both}) · DROP+CREATE 16-arg `search_lessons` with `order_by text DEFAULT 'relevance'` + `sort_key` normalization + `sub`-subquery ORDER BY (CASE can't reference the `rank` alias) · C11 exclude 3 exact ghost `lesson_id`s in BOTH count+result WHERE + `lesson_id ASC` tiebreaker · `_match_location` swap for the bare `&&` in both WHEREs. RETURNS unchanged; 1-line `order_by?: string` types delta. Rollback companion written.
- **Task 3.2 — C58 client sort wiring** (`9988bd0` → cherry-picked to `6f2228e`, Sessions 6/7). `useLessonSearch` sends `order_by` + adds `sortBy` to queryKey; `SearchPage` threads `viewState.sortBy` + resets page on sort; `IntToolbar` drops the no-op `grade` option; end-to-end SearchPage→RPC test added pre-push.

### §4 Q1–Q5 LOCKED 2026-06-20 (rationale inline in design §4)

- **Q1 C58 sort** [user] = "Sort minus grade": real server-side `order_by` for relevance/title/modified; remove the no-op grade option. `ELSE`→relevance (safe fallback for stale `grade`/`confidence`).
- **Q2 C136** [evidence] = sanitize inside `expand_search_with_synonyms`. Shipped mechanism corrected during build (strip-before-split — the locked per-word-strip sketch crashed on `mother's`).
- **Q3 C11** [evidence TEST+PROD] = exclude 3 exact ghost IDs (`1l9KH63QBe2…`, `1lDjv2GUFz…`, `1nFbpkwluj…`; all title="Unknown", all [Indoor]; identical TEST/PROD).
- **Q4 location-Both** [evidence TEST] = new IMMUTABLE `_match_location`; data `text[]`, single-element title-case, 766/766.
- **Q5 C84 tags** [user] = DEFERRED out of W1b → its own data-quality audit session (`project_tags_field_audit_pending`). PR1 badge suppression stays; filter still works.

### TEST + PROD verification (Sessions 6/7)

- **TEST (PR3a):** no 500 on `herbs & spices`(20)/`mother's`(8)/`plant (food)`(20); total 745→742 (3 non-retired ghosts excluded, 0 in browse/Indoor); location-Both exact (search Indoor 635=440+198−3 / Outdoor 305=107+198 / Both 198); sort title-A–Z, modified≠relevance, NULL+grade→relevance, deterministic.
- **PROD (PR3a, 3-signal, live corpus 767):** 16-arg sig + `_match_location` live; no 500 on punctuation; 767→764 (3 ghosts excluded); location-Both exact 654/315/205; sort works. `migrate-production.yml` Apply succeeded first try (no SASL flake).
- **PROD (PR3b, chrome-devtools browser smoke):** Sort dropdown = Relevance / Title A–Z / Updated (no Grade); selecting Title fired a fresh `search_lessons` POST (`{"order_by":"title",…}`) → 200, genuinely title-A–Z, `total_count:764`. End-to-end sort live.

### Bot rounds

- **PR3a round 1 CLEAN:** `claude[bot]` 1 review + 1 code-review + 5 line comments, all confirmations/nits; zero required changes; no GATE 4 (no real suggested change). Nits (document all-operators→0 edge; CTE-refactor duplicate WHERE; title-path ORDER-BY redundancy) rejected (bot-marked "no change"/out-of-scope; editing a pushed migration forbidden).
- **PR3b round 1 CLEAN:** both `claude[bot]` reviews APPROVED; 3 nits (strip `C58:` comment prefixes / tighten `onSortChange` cast / `'confidence'` blank-select) all REJECTED with verified rebuttals; GATE 4 confirmed all 3 rejects sound. Zero code changes.

### Session log (PR3 / W1b cycle)

#### Session 7 — 2026-06-20 — PR3b (frontend sort wiring) shipped + PROD-verified; W1b COMPLETE

Supervisor session. Shipped the PR3b frontend half of C58 (the already-built Task-3.2 commit) now that PR3a's migration is PROD-live. Clean run end-to-end: cherry-pick → gates → PR → bot triage → user-gated merge → PROD smoke. W1b is now fully complete.

- Oriented; git matched the status file (PR3a merged `3c592b1` on `origin/main`; local `main` stale; `9988bd0` preserved on `feat/theme-b-w1b-frontend`). Baseline `npm run check` clean. Untracked `docs/plans/*` are unrelated other-initiative kickoffs (left alone).
- **Cherry-pick (PR3b):** synced local `main` → `3c592b1`; cut fresh `feat/theme-b-w1b-sort-frontend` off `main`; cherry-picked `9988bd0` → **`6f2228e`** (clean, exactly the 6 frontend files). `npm run check` clean; `npm run test:run` = 1380/1380. Read the diff myself (supervisor-verify) — matches the Task-3.2 spec exactly.
- **Pre-push GATE 3** (code-reviewer + Codex `codex:codex-rescue`, parallel, both inline) = **NO MATERIAL FINDINGS** from either. Pushed + opened **PR #525** (frontend-only diff + the carried-forward status doc as a 2nd commit `5fa8c6c`).
- **Status-doc commit gotcha (caught + noted):** the `git checkout <rpc-branch> -- statusfile` had STAGED the f3cebc1 version; my two subsequent Edit-tool edits modified only the working tree and were never re-`git add`-ed, so `git commit` captured the pre-edit version. Harmless. Lesson: after `git checkout -- <file>` + Edit, `git add` again before commit.
- **Bot round 1 CLEAN (four-surface triage via `/pr-triage`):** all CI green except expected-red Security-Audit (24 pre-existing dev/transitive vulns; PR3b touches no `package.json`). Both `claude[bot]` reviews APPROVED. 3 nits (A strip `C58:` prefixes / B tighten `onSortChange` cast / C `'confidence'` blank-select) — all rejected against the actual code: (A) the cited CLAUDE.md rule doesn't exist + 6 committed `// C59:` comments in the same files; (B) `onSortChange` already `(sort: SortBy) => void`, cast redundant; (C) `searchStore` `partialize` never persists `sortBy` → blank-select unreachable + locked design.
- **GATE 4 (Codex 2nd opinion on the 3 rejected suggested-changes, inline):** independently verified all three premises and confirmed **all rejects sound**. Zero code changes. (Codex "return findings INLINE" worked first-try a 5th + 6th consecutive time.)
- **User approved merge** → squash **`5197069`** (#525). `ci.yml` auto-deployed the frontend to PROD: Deploy-to-Production ✓ (43s), Test & Build green.
- **PROD verification (chrome-devtools, live site `esynyc-lessonlibrary-v2.netlify.app`):** Sort dropdown = Relevance / Title A–Z / Updated, **no Grade**; selecting Title fired a 2nd `search_lessons` POST (queryKey refetch) with body `{"order_by":"title","page_size":20,"page_offset":0}` → 200; response genuinely title-A–Z ordered; `total_count:764` (PR3a ghost exclusion holding). End-to-end sort live in production. (`app.esynyc.org` is not resolving — used the Netlify default URL.)

Learnings:
- **Shipping an already-built+verified commit is still a full supervisor cycle** — cherry-pick clean ≠ done. The value this session was the gate discipline (re-review the final diff, four-surface triage, GATE 4) + the PROD browser smoke that *saw* the feature working, not just green CI.
- **A passing bot CHECK ≠ zero findings.** All 4 `claude-*` checks were green, yet the bots still posted 3 suggested changes across the comment/review surfaces. The four-surface triage is what surfaced them; rebutting each against real code (not the bot's stated premise) mattered — 2 of the 3 rested on factually wrong premises.
- **PROD string-grep of hashed bundles is unreliable** for route-split apps (the route chunk isn't linked from `index.html`). The browser smoke (read the actual `<select>` options + the real RPC request body) is the right PROD verification for a frontend change.

#### Session 6 — 2026-06-20 — Task 3.1 migration + Task 3.2 frontend built + verified + pre-push-gated; PR3 split for safe rollout

Supervisor session. Built + verified both W1b tasks, ran the pre-push gate, and split PR3 into a migration-first PR3a + a follow-up frontend PR3b per a Codex-caught deploy-ordering hazard (user verdict). Stopped before pushing PR3a.

- Oriented; git matched the status file; baseline `npm run check` clean. Untracked `docs/plans/*` are unrelated other-initiative kickoffs (left alone).
- **Dispatched Task 3.1 executor** (Opus, fresh context, `database-migrations` + `/new-migration` + TDD skills, local-first, no push). It built `20260620000000_search_lessons_w1b.sql` faithfully per spec (all four fixes; `sub`-subquery ORDER BY; both-WHERE deltas; GRANTs incl. `_match_location` + `service_role`; RETURNS unchanged) + the 1-line types delta; committed locally.
- **Types regen note (from executor):** local Supabase CLI is **v2.95.4**, older than whatever generated the committed `database.types.ts` (which carries a `PostgrestVersion: '13.0.5'` pin a full regen would strip). Executor applied ONLY the true schema delta (`order_by?: string`) to preserve format. **Follow-up:** consider regenerating with a newer CLI before merge (optional — current delta is correct).
- **Supervisor-verify (load-bearing):** read the full SQL; diffed the body against `20260520020000`; re-ran the local MCP smoke myself. **Caught a real crash:** `search_lessons('mother''s')` → `syntax error in tsquery: "mother s"`. Root cause: the spec's per-word strip leaves a mid-word operator/quote as an internal space. **Fixed** (strip-before-split), re-applied, re-verified, amended the commit.
- **GATE 2 (Codex on the SQL, inline — no async flake):** 8/9 areas CLEAN. **1 MEDIUM:** space-only split lets a pasted tab/newline survive → `to_tsquery` error. Accepted + fixed (`regexp_split_to_array(…, '\s+')`); confirmed `E'herbs\tspices'` crashed pre-fix, clean post-fix. Amended → **`136ba4a`**.
- **Final smoke (all green, no crash):** operators `& | ( ) : *`, mid-word quotes (`mother's`, `herbs&spices`), `a:b`, tab/newline/CR, empty/NULL; title≠modified order; deterministic empty-query order; NULL/grade→relevance; `_match_location` truth table; ghost clause; 16-arg signature; grants. `npm run check` green.
- **Dispatched Task 3.2 executor** (Opus, fresh context, TDD): client wiring committed `659facc` → 1380 tests green.
- **Supervisor-verify Task 3.2:** read the diff, re-ran `npm run check` + the 3 touched test files. Confirmed the stale-`grade`-in-select edge is UNREACHABLE — `searchStore` `partialize` persists only `view`/`density`, never `sortBy`.
- **Pre-push gate (code-reviewer + Codex GATE 3, parallel):** code-reviewer no BLOCKER/HIGH (MEDIUM = inert `currentPage:1` write; LOW = title collation). Codex GATE 3 (inline): SQL/caching/page-reset CLEAN; **BLOCKER = deploy-ordering** (combined frontend+migration unsafe); LOW = no end-to-end test.
- **Triage:** title-collation resolved by TEST data (`en_US.UTF-8`, 1/745 lowercase-start). Test-gap (both models) → added end-to-end SearchPage→RPC assertion + softened the `currentPage` comment. Amended frontend → `9988bd0`. Deploy-ordering BLOCKER → **user verdict: SPLIT**.
- **Split executed:** preserved the frontend commit on `feat/theme-b-w1b-frontend` (`9988bd0`); `git reset --hard cafd701` on the migration branch. Migration branch (PR3a) re-verified green (1373 suite).
- **Pushed PR3a (#524)** + opened the migration PR. CI auto-applied to TEST. **Ran the mandatory TEST-DB verification on the real corpus — ALL GREEN** (numbers above). The 3 ghosts being NON-retired confirms C11 fixes a real live leak.
- **Bot round 1 (PR3a) CLEAN:** four-surface triage, all confirmations/nits, no GATE 4.
- **PR3a MERGED + PROD-VERIFIED** (user approved merge + PROD gate): squash `3c592b1`; Apply succeeded first try. 3-signal PROD verify (live corpus 767) all green.
- **Captured a durable memory:** the additive-RPC-param deploy-ordering rule → `reference_ci_flakes.md` + MEMORY.md index.

Learnings:
- **Catch deploy-ordering hazards before merge, not after.** An additive RPC param + a frontend that sends it, in one PR, is unsafe here: the frontend auto-deploys to PROD on merge while the migration waits for manual approval → outage window. Expand/contract (migration-first) is the fix.
- **Re-run the migration's behavioral smoke in the MAIN LOOP, not just read the diff** — the executor's spec-driven smoke tested the sanitizer in isolation (returns a string) and missed that the string is invalid only once `to_tsquery` consumes it. The end-to-end `search_lessons('mother''s')` probe caught it.
- **A LOCKED mechanism can still be wrong.** Q2's locked decision was right; its literal code sketch (per-word strip) was buggy. Correctness fixes inside a locked decision don't need a user gate; product/design changes do.
- **Codex "return findings INLINE" worked first-try a 4th time** (GATE 2). Reliable.

#### Session 5 — 2026-06-20 — PR3/W1b cycle opened: §4 locked, Task 3.1/3.2 authored + GATE-1B-hardened

Supervisor session. No code on the branch yet — this session was the full W1b design-lock + task-authoring + plan-review phase. Clean handoff at the end.

- Oriented; git matched the status file; baseline `npm run check` clean. Worktree had pre-existing untracked `docs/plans/*` (unrelated — left alone).
- **User decisions:** Q1 = "Sort minus grade"; Q5 = **defer tags** to its own audit session.
- Captured the **tags-audit-pending** concern as a durable project memory (`project_tags_field_audit_pending`) + MEMORY.md index line.
- **§4 evidence gathering:** background Explore agent code digest + TEST/PROD MCP probes (ghosts identical TEST/PROD; location 766/766 single-element title-case; tags 74/766; `updated_at` exists; current 15-arg sig; grantees incl. service_role).
- **Locked §4 Q1–Q5** inline in design doc; **authored Task 3.1 + Task 3.2** (skeleton → concrete).
- **PR-cycle archival:** moved PR2 (Sessions 3/4) into the archive.
- **GATE 1B** (Codex, inline): **1 BLOCKER** (missing `_match_location` GRANT), **1 HIGH** (`service_role` grant gap), **3 MEDIUM** (NULL `order_by`→`sort_key`; quote-strip; DROP+CREATE atomicity), **9 LOW**. Rebuttal-passed all → folded BLOCKER/HIGH/2-MEDIUM into Task 3.1.
- **Handoff:** stopped at this clean boundary rather than start the migration build on a heavy context.

Learnings:
- **GATE 1B (reviewing the authored PLAN before any code) is load-bearing for migrations** — it caught a runtime BLOCKER (helper GRANT) + a HIGH grant gap + a real NULL-fallback hole before any code.
- **Codex "return findings INLINE, do not background" worked first-try a 3rd consecutive time** — promoted to a feedback memory.
