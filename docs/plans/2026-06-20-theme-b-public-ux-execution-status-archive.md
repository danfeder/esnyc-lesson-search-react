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
