# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 1 (PR1 pushed + opened — awaiting bots)

## Current State

**Active PR:** PR 1 — W1a-cosmetic-a11y = **GitHub PR #522** (https://github.com/danfeder/esnyc-lesson-search-react/pull/522). All 6 tasks DONE + verified; pre-push gate (code-reviewer + Codex GATE 3) done + 1 finding fixed; **pushed + PR opened** — awaiting CI + external bot reviews.

**Current task:** Bot-review round 1 — wait for CI/deploy-preview/E2E + external bots, then collect findings from all four PR surfaces (`/pr-triage 522`), rebuttal-pass, consolidated fix-ups. Round-cap after 2.

**Branch:** `feat/theme-b-w1a-cosmetic-a11y` (off `main` @ `88e117e`). 7 commits: `90c3f4f` (C57) · `023e8c3` (§3.2) · `9f02d57` (copy/a11y one-liners) · `a59d4ec` (C69) · `90095b8` (C84 suppress) · `07d0f0d` (§4.8) · `239a4f7` (§4.8 review fix-up).

**Last commit on branch:** `239a4f7` — `fix(search): §4.8 — drop defeated margin-left reset (pre-push review)`.

**Pre-push gate outcome (2026-06-20):** code-reviewer agent + Codex GATE 3 (codex:codex-rescue, different family) on the 6-commit diff. Codex = clean. Claude reviewer = 1 finding (97 conf): the §4.8 `.int-toolbar-right { margin-left:0 }` media override was DEFEATED by the later base `margin-left:auto` rule (the same cascade-order bug class the PR fixes) — a dead no-op. Investigated (confirmed source order; the overflow fix is the cascade-correct `flex-wrap`, genuinely working; the dead reset only mattered cosmetically in a ~700–767px sliver). Resolved in `239a4f7` by removing the dead reset + redundant `justify-content` (honest minimal fix; overflow guard already covers the real fix). Two e2e-margin-assertion experiments were attempted + reverted (computed `margin-left`/width can't reliably distinguish the states across widths).

**Note on this status doc:** still UNCOMMITTED on disk (kept out of the opening PR diff). Bundle with the first bot-review fix-up push per the kickoff, or handle at session-end.

**Last commit on main:** scaffold merged via **PR #520 → `ef8cc0f`**; §4.8 + §3.4 responsive fold-in merged via **PR #521 → `88e117e`** (both docs-only, on `main`).

**Pre-next-PR verification (if any):** none yet.

**Status of the work:** PR1 underway on `feat/theme-b-w1a-cosmetic-a11y`. Task 1.1 (C57 mobile-filter CSS source-order fix) committed + verified (CSS move correct, no `!important`, 3/3 viewport e2e green, `npm run check` clean). Remaining PR1 tasks: 1.2 (§3.2 checkbox a11y), 1.3 (copy/a11y one-liners — Task 1.3 has the one W1a `[user-verdict]`: Header wordmark string, default `"Lesson Library"` — STOP for user before that commit), 1.4 (C69 activityType badges + read-only PROD `'both'` probe), 1.5 (C84 suppress tags badge), 1.6 (§4.8 toolbar overflow). Then PER-PR RITUAL → push → `gh pr create`. PR2 = Tasks 2.1–2.4. PR3 (W1b) + PR4 (W1c) are design-lock skeletons — tasks authored after design §4 questions lock at each PR-cycle start.

## Recent decisions worth carrying forward

- **User decisions (2026-06-20, before scaffolding):** (1) include checkbox a11y §3.2 in W1a PR1; (2) C84 = suppress tags badge now (PR1) + make-real in W1b; (3) W1a = two PRs split by risk.
- **Gate A folded (2026-06-20):** C58 migration is DROP+CREATE not body-only (signature change); nested-`<main>` fix is downgrade-SearchPage-inner-to-div (not move-id-to-App), SkipLink stays search-only; C59 needs neutral empty hint + infinite-scroll guard + intended-stale-during-refetch; C14 honestly scoped (IntPillGroup not covered); C69 drop the speculative `'both'` fan-out; C84 renders blank not "(0)"; C11 exclude by exact ghost IDs (`20260508000000:109`).
- **Gate B folded (2026-06-20, Codex on impl + kickoff):** `InfiniteScrollTrigger` is in `src/components/Common/` (NOT `Internal/`); new `IntListSkeleton` must be exported from the `src/components/Internal/index.ts` barrel (+ in the commit); Task 1.4 keeps a dedicated `['both']`-stays-verbatim no-fan-out test; kickoff orientation reads the status file before the impl-plan task; PR3 lock label de-conflated (C136 sanitize ≠ location-Both).
- **Responsive fold-in (2026-06-20, user-approved):** §4.8 toolbar-overflow (→ PR1, Task 1.6, CSS) and §3.4 split-view dead-end (→ PR2, Task 2.4, approach (b): new `useMediaQuery` hook + non-destructive effective-view coercion + hide SPLIT control below 1100px). Both review-only (no roadmap C-id), both verified live vs `main`. Moved out of out-of-scope.
- **Header copy** is the one `[user-verdict]` inside W1a — confirm the exact public wordmark string with the user before committing Task 1.3 (default `"Lesson Library"`).

## Done

- **Task 1.1 — C57 mobile filter button CSS reorder** (`90c3f4f`, Session 1). Moved the base `.int-mobile-filter-btn { display:none }` block before the `@media (max-width:767px)` override in `internal.css` (equal-specificity source-order cascade bug hid the only mobile filter trigger at every width). Added e2e guards in `e2e/performance.spec.ts` (visible @375px, hidden @desktop). Verified: RED→GREEN e2e (3/3 viewport tests), `npm run check` clean, no `!important`, siblings preserved.
- **Task 1.2 — §3.2 filter-checkbox keyboard/SR a11y** (`023e8c3`, Session 1). Swapped `.int-check input { display:none }` for an sr-only clip (focusable + in a11y tree) + focus-visible green ring on `.int-check-box`. TDD vehicle = real-browser Playwright a11y assertion in `e2e/accessibility.spec.ts` (jsdom can't load CSS). Verified: RED→GREEN e2e (checkbox 0→1 in role tree, focusable), full `test:run` 1342 green, `npm run check` clean, `:checked`/sibling rules preserved.
- **Task 1.3 — copy/a11y one-liners** (`9f02d57`, Session 1; 5 files). (1) `ScreenReaderAnnouncer.tsx` `.length` guard on `cookingMethods` (empty array was truthy → phantom "cooking method:" + unreachable "All filters cleared"); phrasing now `${n} cooking methods` matching siblings; new `ScreenReaderAnnouncer.test.tsx`. (2) Header `<small>` → `"Lesson Library"` (user-confirmed). (3) `IntLessonDrawer` `DialogTitle sr-only` = `lesson.title`. (4) `SearchPage` inner `<main>` → `<div id=main-content>` (now exactly one `<main>` app-wide at `App.tsx:93`; SkipLink untouched). Verified: RED→GREEN SR test (3/3), full `test:run` 1345 green, `npm run check` clean, grep confirms single `<main>`.
- **Task 1.4 — C69 activityType facet badges** (`a59d4ec`, Session 1; 2 files). Added `ACTIVITY_TYPE_SLUG_BY_NOUN` map in `facetCounts.ts`; `valuesForKey` case `'activityType'` now maps stored bare noun → sidebar slug with verbatim fallback (`?? noun`); NO `'both'` fan-out. Fixed the misleading slug-shaped test fixtures + added a dedicated `'both'`-stays-verbatim guard. **Supervisor PROD probe 2026-06-20:** activityType = cooking 428 / garden 324 / craft 146 / academic 65, ZERO `'both'` → map covers all live values. Verified: RED→GREEN facetCounts (16/16), full `test:run` 1349 green, `npm run check` clean.
- **Task 1.5 — C84 suppress always-blank tags badge** (`90095b8`, Session 1; 2 files). `IntSidebar.tsx`: gated the per-option `.int-check-count` span on `key !== 'tags'` (stopgap; W1b flips it to a real count). New `IntSidebar.test.tsx` (none existed): asserts ABSENCE of `.int-check-count` in the Lesson Type section (tags options are static config — Orientation/Bilingual Handouts — so non-vacuous) + a scope-proof that activityType still shows its count. Verified: RED→GREEN (2/2), full `test:run` 1351 green, `npm run check` clean.
- **Task 1.6 — §4.8 toolbar-overflow restack** (`07d0f0d` + fix-up `239a4f7`, Session 1). Inside the `@media (max-width:767px)` block: `.int-toolbar { flex-wrap: wrap }` + `.int-toolbar-right { flex-wrap: wrap }` so the right cluster drops to its own row and its switchers wrap (no `!important`, desktop untouched). e2e overflow guard on `.int-toolbar` @375px (RED 342px → GREEN ≤1). **Fix-up `239a4f7` (pre-push review):** removed the originally-added `margin-left: 0` + `justify-content: flex-start` from the media block — the `margin-left:0` was DEFEATED by the later base `margin-left:auto` rule (dead cascade no-op); the overflow fix is the cascade-correct flex-wrap, unaffected. Verified: 3/3 viewport e2e green, `npm run check` clean.

## In flight

(none)

## Blocked

(none)

## Decisions made during execution

(none yet)

## Out-of-scope follow-ups captured here

- ~~Split-view dead-end §3.4 + toolbar overflow §4.8~~ — folded INTO W1a 2026-06-20 (§4.8→PR1 Task 1.6, §3.4→PR2 Task 2.4); no longer out of scope.
- W1b `LessonMetadata.tags` type gap: `database.types.ts:256` has `tags` but `src/types/index.ts` `LessonMetadata` does not — part of C84 path-a.

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (locked W1a decisions; §4 open questions for W1b/W1c)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2 concrete; PR3/PR4 skeletons)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Source review: `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md`
- Archive: `2026-06-20-theme-b-public-ux-execution-status-archive.md` (created at the first PR-ship boundary)

## Session log

### Session 1 — 2026-06-20 — PR1 (W1a-cosmetic-a11y) built, pushed, opened as PR #522

Supervisor session; all 6 impl-plan tasks executed by fresh-context Opus executors, each supervisor-verified (re-ran the task's key test + `npm run check` + diff inspection) before acceptance.

Major events:
- Branched `feat/theme-b-w1a-cosmetic-a11y` off `main` @ `88e117e`.
- **Task 1.1 C57** (`90c3f4f`) → **1.2 §3.2** (`023e8c3`) → **1.3 copy/a11y one-liners** (`9f02d57`) → **1.4 C69** (`a59d4ec`) → **1.5 C84 suppress** (`90095b8`) → **1.6 §4.8** (`07d0f0d`). Details in the Done section above.
- **User verdict (Task 1.3):** Header wordmark = `"Lesson Library"` (drop "· Internal").
- **Supervisor PROD probe (Task 1.4):** `metadata->'activityType'` = cooking 428 / garden 324 / craft 146 / academic 65, ZERO `'both'` → confirms the locked no-fan-out decision; the 4-entry slug map covers every live value.
- **Pre-push gate:** code-reviewer agent + Codex GATE 3 (`codex:codex-rescue`, different family) in parallel on the 6-commit diff. Codex clean; Claude reviewer flagged the §4.8 `margin-left:0` media override as a dead cascade-defeated no-op (97 conf). Investigated + confirmed; **fix-up `239a4f7`** removed the dead reset (overflow fix is the cascade-correct flex-wrap, unaffected).
- Full suite 1351/1351 green; `npm run check` clean throughout. Pushed 7 commits; **opened PR #522** (code-only — status doc kept local).

Decisions / learnings worth carrying:
- **Dual-family review earned its keep:** Codex (GPT-family) returned clean on the §4.8 cascade bug that the Claude reviewer caught at high confidence. Keep running both + the supervisor pass.
- **E2E can't cheaply prove the §4.8 margin alignment:** `getComputedStyle().marginLeft` doesn't reliably distinguish a resolved flex `auto` from `0`; and a width-based stack check false-greens because the right cluster fills the row at most mobile widths (the defeated reset only shows in a ~700–767px sliver). Two test experiments were attempted + reverted. The robust overflow guard (`.int-toolbar` scrollWidth≤clientWidth @375px) covers the real fix; the dead-declaration removal is the honest response, not a fragile alignment test.
- **Status-doc handling:** kept uncommitted during task execution to keep it out of the code-review diff; committed at session-end, to be **pushed bundled with the first bot-review fix-up** (avoids a docs-only CI cycle).

Next session picks up at: **PR #522 bot-review round 1** — wait for CI/deploy-preview/E2E + external bots, then `/pr-triage 522` across all four surfaces, rebuttal-pass, consolidated fix-ups (bundle the status-doc commit into that push). Round-cap after 2. Then PR2 (Tasks 2.1–2.4, branch `feat/theme-b-w1a-behavior`).

### Session 0 — 2026-06-20 — scaffolding

Major events:
- Merged PR #519 (deferred-work roadmap); pulled `main` @ `4e06e63`.
- 10-agent discovery workflow verified every W1a anchor + mechanism against current `main`; light W1b/W1c recon. Key surprises: C79 is internal-only; C84 tags now populated (badge actively misleading); cooking-methods half already fixed (PR 6e); C69 test fixtures mask the bug; `feat/url-persistence` WIP stale-to-broken.
- User locked the 3 scope/sequencing decisions (checkbox-a11y in, C84 suppress-then-real, 2-PR split).
- Authored the four scaffold docs; **Gate A** = two adversarial reviews (Codex + Claude) on the design doc, folded ~16 findings (no BLOCKERs to the W1a foundation; the C58/C14/nested-main/C59 precision fixes are in the design doc).
- **Gate B** = Codex adversarial review of the impl plan + kickoff (user-requested), folded 6 findings (no BLOCKERs) — 2 were confirmed wrong-as-written code facts (InfiniteScrollTrigger path, barrel export).
- Scaffold pushed + merged via PR #520 (`ef8cc0f`, `--admin` docs-only).
- **Responsive fold-in** (user-approved): §4.8 toolbar overflow → PR1 (Task 1.6); §3.4 split-view dead-end → PR2 (Task 2.4, approach b). Both verified live vs `main`; updated across all four scaffold docs; shipping as a follow-up docs PR.
- Next: `/clear` → paste kickoff → PR1 Task 1.1.
