# Theme B — Public "Broken-Windows" UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix the public search page's broken behaviors (Wave 1 of the deferred-work campaign), shipping W1a first as two low-risk frontend PRs, then W1b (one search-RPC migration) and W1c (URL state).

**Architecture:** Three risk-tiered sub-waves — W1a pure-frontend (2 PRs), W1b one TEST-DB-gated `search_lessons` migration, W1c URL/shareable state. See `docs/plans/2026-06-20-theme-b-public-ux-design.md` (the canonical WHY; **Gate-A-reviewed 2026-06-20**) for every locked decision.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind, Zustand, Supabase (PG + RPC), TanStack Query v5, Vitest + RTL, Playwright.

**Design reference:** `docs/plans/2026-06-20-theme-b-public-ux-design.md`. Read it before starting any task. Settled decisions there are NOT debatable mid-build.

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — every code-bearing task is test-first (write the failing test, watch it fail, implement, green).
- `superpowers:verification-before-completion` — run the task's Verify commands and SEE green before claiming done.
- `superpowers:requesting-code-review` — between PRs.
- `database-migrations` — before touching any file in `supabase/migrations/` (W1b only).

**Per-PR ritual (mandatory, every PR):** canonical spec in the kickoff's PER-PR RITUAL section + the feedback memories it cites. One-line shape: pre-push reviewer-agent dispatch + Codex GATE 3 → `npm run check` + `npm run test:run` → push + `gh pr create` → wait for external bots → collect from all four PR surfaces → rebuttal-pass every finding → consolidated fix-ups → per-round TEST-DB re-verify (W1b only) → round-cap after 2. Don't restate per-task; cite it.

**How to use this plan:**
- Each task: ID, files, anchor symbols, code snippets (adapt to current code), test commands, commit message.
- Execute in order within a PR. **Re-verify every snippet/line-number against current code before applying** — anchors drift; corpus counts drift (re-confirming and finding different numbers is expected, not a discrepancy). Repo-conformance adaptations OK; product/design changes require stopping to ask.
- The pre-PR gate is `npm run check` (= `type-check` + `lint`) then `npm run test:run` (= `vitest run` — NOT watch).

## PR breakdown

| PR | Title | Branch | Contains | Notes |
|---|---|---|---|---|
| 1 | W1a-cosmetic-a11y | `feat/theme-b-w1a-cosmetic-a11y` | C57, §3.2 checkbox-a11y, copy/a11y one-liners, C69, C84-suppress | Near-zero risk. CSS + small TS + facet map. No DB. |
| 2 | W1a-behavior | `feat/theme-b-w1a-behavior` | C59 (+ new `IntListSkeleton`), C14, C79 | Low risk. Net-new component + first `keepPreviousData`. No DB. |
| 3 | W1b-search-rpc | `feat/theme-b-w1b-search-rpc` | C136, C58, C11, location-Both, C84 path-a | **SKELETON — lock §4 Q1–Q5 at PR-cycle start.** Migration, TEST-DB-gated. |
| 4 | W1c-url-state | `feat/theme-b-w1c-url-state` | C114/C157 | **SKELETON — lock §4 Q6–Q8 at PR-cycle start.** Pure-frontend. |

---

## PR 1 — W1a-cosmetic-a11y

**Branch:** `feat/theme-b-w1a-cosmetic-a11y`

**What ships:** The near-zero-risk public broken-windows batch — mobile filters reachable, all filter checkboxes keyboard/SR-operable, the four copy/a11y one-liners, activityType count badges fixed, and the always-blank tags badge suppressed. CSS + small TS only; no DB, no net-new components.

**Why its own PR:** all low-blast-radius edits that should land fast and safe, separate from PR2's net-new skeleton + keyboard code.

**Pre-flight: read these files first (verify line numbers haven't drifted):**
- `src/styles/internal.css` (the `.int-mobile-filter-btn` rules ~514/~720; `.int-check input` ~208; `.int-main` ~261)
- `src/components/Internal/IntSidebar.tsx` (CHECKBOX_KEYS map + per-option badge ~90-105)
- `src/utils/facetCounts.ts` (`valuesForKey` ~43-53; tally ~137-150; `tallyHeritage` ~108-125 as the map precedent)
- `src/utils/facetCounts.test.ts` (the activityType fixtures ~51/~71 to correct)
- `src/components/Layout/Header.tsx` (~69), `src/components/Common/ScreenReaderAnnouncer.tsx` (~30), `src/components/Internal/IntLessonDrawer.tsx` (~15/~39), `src/App.tsx` (~93), `src/pages/SearchPage.tsx` (~79), `src/components/Common/SkipLink.tsx`
- `e2e/performance.spec.ts` (~10 VIEWPORT.MOBILE; ~90 mobile test; ~113 desktop test)

### Task 1.1: C57 — mobile filter button CSS reorder

**Files:** Edit `src/styles/internal.css`; Edit `e2e/performance.spec.ts`

**Step 1 (TDD-ish, E2E-first):** In `e2e/performance.spec.ts`, in the existing "mobile viewport renders correctly" test (~90, VIEWPORT.MOBILE 375×667), add an assertion that the Filters trigger is visible:
```ts
await expect(page.getByRole('button', { name: /open filters/i })).toBeVisible();
```
Run it and watch it FAIL (button is `display:none` today). In the "desktop viewport renders correctly" test (~113), add the inverse guard: `await expect(page.getByRole('button', { name: /open filters/i })).toBeHidden();`

**Step 2 (fix):** In `src/styles/internal.css`, move the base `.int-mobile-filter-btn { display: none; … }` block (~720-734) so its **source position is before** the `@media (max-width: 767px)` block opener (~492). Equal specificity + later-rule-wins is the bug; putting the base rule earlier lets the media override win at <768px. Do NOT add `!important` or specificity hacks.

**Step 3: Verify** — `npm run check` clean; run the C57 e2e (`npx playwright test e2e/performance.spec.ts -g "viewport renders correctly"`) and see both mobile-visible + desktop-hidden GREEN.

**Step 4: Commit**
```bash
git add src/styles/internal.css e2e/performance.spec.ts
git commit -m "fix(search): C57 — mobile filter button reachable (CSS source order)

The base .int-mobile-filter-btn display:none rule sat after the <768px
media override at equal specificity, so it won the cascade and hid the
only mobile filter trigger. Move the base rule before the media block.
Design: 2026-06-20-theme-b-public-ux-design.md §5 C57."
```

### Task 1.2: §3.2 — filter checkboxes keyboard/SR-accessible

**Files:** Edit `src/styles/internal.css`

**Step 1:** Replace `src/styles/internal.css:208` `.int-check input { display: none; }` with an sr-only clip pattern that keeps the input focusable + in the a11y tree:
```css
.int-check input {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.int-check input:focus-visible + .int-check-box {
  outline: 2px solid var(--color-esy-green);
  outline-offset: 2px;
}
```
The visible box is the separate `.int-check-box` span; the existing `.int-check input:checked + .int-check-box` rule (~217-228) keeps working (adjacent-sibling unaffected by `position:absolute`).

**Step 2: Verify** — `npm run check` clean. Manual keyboard smoke (Tab into an expanded filter section → each checkbox focusable with green ring → Space toggles it). Optionally add a Playwright assertion that `page.getByRole('checkbox', { name: … })` is focusable. Run any existing `IntCulturalHeritageSection.test.tsx` to confirm no render regression.

**Step 3: Commit**
```bash
git add src/styles/internal.css
git commit -m "fix(a11y): §3.2 — filter checkboxes keyboard/SR-operable

.int-check input { display:none } removed all filter checkboxes from the
focus order + a11y tree (10 of 11 categories unreachable). Swap for an
sr-only clip so inputs stay focusable; add a focus-visible ring on the
visible box. Design: 2026-06-20-theme-b-public-ux-design.md §5 §3.2."
```

### Task 1.3: copy/a11y one-liners (Header · Internal, SR announcer, dialog name, nested main)

**Files:** Edit `src/components/Layout/Header.tsx`, `src/components/Common/ScreenReaderAnnouncer.tsx`, `src/components/Internal/IntLessonDrawer.tsx`, `src/pages/SearchPage.tsx`; Create `src/components/Common/ScreenReaderAnnouncer.test.tsx`

**Step 1 — SR announcer (TDD):** create `ScreenReaderAnnouncer.test.tsx` asserting that with all-empty filters the announcement is the "All filters cleared…" branch (currently unreachable) and contains no phantom "cooking method:". Watch it FAIL. Then fix `ScreenReaderAnnouncer.tsx:30`: `if (filters.cookingMethods.length)` (+ phrasing matching the sibling array branches, e.g. `${filters.cookingMethods.length} cooking methods`). Green.

**Step 2 — Header copy:** `Header.tsx:69` `<small>` source string `"Lesson Library · Internal"` → `"Lesson Library"` (drop "Internal"; CSS upper-cases it). **STOP and confirm the exact replacement string with the user/curriculum team before committing** (design §4 W1a detail (b), `[user-verdict]`, default `"Lesson Library"`).

**Step 3 — dialog name:** `IntLessonDrawer.tsx` — add `DialogTitle` to the `@headlessui/react` import; inside the `{lesson && (…)}` gated body render `<DialogTitle className="sr-only">{lesson.title}</DialogTitle>`.

**Step 4 — nested main:** `SearchPage.tsx:79` — downgrade the inner `<main id="main-content" className="int-main" tabIndex={-1}>` to a `<div id="main-content" className="int-main" tabIndex={-1}>` (keep all three attributes). Leave `App.tsx:93` `<main>` as the sole `<main>`. Do NOT touch `SkipLink` (it stays search-route-only — making it app-wide is out of scope).

**Step 5: Verify** — `npm run check` clean; `npm run test:run` (new SR test green); manual: masthead no longer reads "Internal"; only one `<main>` on `/` (devtools); lesson dialog has an accessible name (a11y tree / axe).

**Step 6: Commit** (one commit; mention each sub-fix)
```bash
git add src/components/Layout/Header.tsx src/components/Common/ScreenReaderAnnouncer.tsx src/components/Common/ScreenReaderAnnouncer.test.tsx src/components/Internal/IntLessonDrawer.tsx src/pages/SearchPage.tsx
git commit -m "fix(a11y,copy): public one-liners — SR announcer, ·Internal wordmark, dialog name, nested <main>

- ScreenReaderAnnouncer: .length guard (empty array was truthy → phantom
  'cooking method:' every update + unreachable 'All filters cleared')
- Header: drop 'Internal' from the public wordmark
- IntLessonDrawer: DialogTitle sr-only for an accessible dialog name
- SearchPage: inner <main> → <div id=main-content> (single <main> app-wide)
Design: 2026-06-20-theme-b-public-ux-design.md §5 (copy/a11y one-liners)."
```

### Task 1.4: C69 — activityType facet count badges (slug↔noun map)

**Files:** Edit `src/utils/facetCounts.ts`; Edit `src/utils/facetCounts.test.ts`

**Step 1 (TDD):** In `facetCounts.test.ts`, **replace the misleading fixtures** (~line 51/64 `activityType: ['cooking-only']`, ~71 `['both']` — slug-shaped input no real row contains) with real bare-noun input, and assert the bucket is keyed by the slug IntSidebar looks up:
```ts
// input metadata.activityType: ['cooking'] → bucket keyed by the option slug
expect(counts.activityType['cooking-only']).toBe(1);
```
**Keep a dedicated `'both'` NO-FAN-OUT guard (Gate-B catch):** don't let the fixture swap silently delete the only `'both'` test. Add an explicit assertion that a stray `['both']` stays **verbatim** (`counts.activityType.both === 1`) and is NOT fanned out into `cooking-only` + `garden-only` — this locks the Gate-A "no fan-out" decision against a future regression. Watch the new assertions FAIL against current code.

**Step 2 (fix):** In `facetCounts.ts`, add `const ACTIVITY_TYPE_SLUG_BY_NOUN = { cooking:'cooking-only', garden:'garden-only', academic:'academic-only', craft:'craft-only' };` and in `valuesForKey` case `'activityType'` map each stored noun → slug with a **verbatim fallback** for unknowns. Do NOT add a `'both'` fan-out (retired 2026-05-06; zero rows — verbatim fallback handles a stray `'both'` harmlessly). Do NOT change `filterDefinitions.ts` option values.

**Step 3 (PROD probe):** before committing, confirm via `mcp__supabase-remote__execute_sql` (read-only) that PROD `metadata->'activityType'` carries no `'both'`; if it unexpectedly does, STOP and surface it (the verbatim fallback buckets it blank — acceptable — but flag for the user).

**Step 4: Verify** — `npm run check` clean; `npm run test:run` (facetCounts green).

**Step 5: Commit**
```bash
git add src/utils/facetCounts.ts src/utils/facetCounts.test.ts
git commit -m "fix(search): C69 — activityType count badges (slug↔noun key alignment)

Stored values are bare nouns (cooking/garden/academic/craft); the sidebar
badge looks up the option slug (cooking-only/…), so counts never matched
and badges rendered blank. Map nouns→slugs on the counting side (mirrors
tallyHeritage). Fix the test fixtures that fed fictional slug input and
masked the bug. Design: 2026-06-20-theme-b-public-ux-design.md §5 C69."
```

### Task 1.5: C84 — suppress always-blank tags ("Lesson Type") count badge

**Files:** Edit `src/components/Internal/IntSidebar.tsx`; Create/extend an `IntSidebar` render test

**Step 1 (TDD):** add an `IntSidebar` render test asserting the `tags` (Lesson Type) section renders **no `.int-check-count` element** (assert the count element is absent — NOT that "(0)" is absent, which never appears). Watch it FAIL.

**Step 2 (fix):** in `IntSidebar.tsx`, gate the per-option count span on `key !== 'tags'` (e.g. `const showCount = key !== 'tags'`), so the always-blank tags badge is omitted while every other section's badge is untouched.

**Step 3: Verify** — `npm run check` clean; `npm run test:run` green.

**Step 4: Commit**
```bash
git add src/components/Internal/IntSidebar.tsx <test file>
git commit -m "fix(search): C84 — suppress always-blank tags count badge (stopgap)

search_lessons doesn't return tags, so the Lesson Type per-option count is
always blank on a working filter. Suppress the badge for the tags section
only; W1b exposes tags in the RPC and makes it a real count.
Design: 2026-06-20-theme-b-public-ux-design.md §5 C84."
```

**End of PR 1:** run the PER-PR RITUAL (kickoff). `npm run check` + `npm run test:run` + the C57 e2e green.

---

## PR 2 — W1a-behavior

**Branch:** `feat/theme-b-w1a-behavior`

**What ships:** The two W1a items with real new code — the search loading-state fix (no more false "No matches", with a net-new `IntListSkeleton`), IntFormField ARIA wiring, and full keyboard navigation for `LessonSearchPicker`.

**Pre-flight: read these files first:**
- `src/hooks/useLessonSearch.ts` (the `useInfiniteQuery` options ~101-150), `src/hooks/useLessonSearch.wiring.test.tsx`
- `src/pages/SearchPage.tsx` (destructure ~43; `lessons`/`totalCount`/`counts` ~48-50; empty branch ~111-119; suggestions ~135-163; `InfiniteScrollTrigger` ~166), **`src/components/Common/InfiniteScrollTrigger.tsx`** (it lives in `Common/`, NOT `Internal/`; SearchPage imports it from `@/components/Common/InfiniteScrollTrigger`)
- `src/components/Internal/IntEmptyState.tsx`, `src/components/Internal/IntListRow.tsx` (skeleton should match it), `src/components/Internal/index.ts` (the barrel — SearchPage imports `IntEmptyState` etc. through it, so a new `IntListSkeleton` must be exported here), `src/__tests__/integration/search-page.test.tsx` (~486 Empty State block + `rpcMock` harness)
- `src/components/Internal/IntFormField.tsx` + `IntFormField.test.tsx`; `src/components/Internal/IntPillGroup.tsx`
- `src/components/LessonSearchPicker.tsx` + `LessonSearchPicker.test.tsx`
- `src/pages/CLAUDE.md` (loading-state mandate), `src/components/CLAUDE.md` (~40-49 animate-pulse convention)

### Task 2.1: C59 — loading state (placeholderData + isPending skeleton)

**Sub-skill:** `superpowers:test-driven-development`

**Files:** Edit `src/hooks/useLessonSearch.ts`, `src/pages/SearchPage.tsx`; Create `src/components/Internal/IntListSkeleton.tsx` (+ `.int-skeleton` in `internal.css`); Edit `src/components/Internal/index.ts` (export the new component from the barrel); Edit tests. *(Splittable into 2.1a hook+skeleton / 2.1b SearchPage wiring if context gets heavy.)*

**Step 1 (hook + test):** add `keepPreviousData` to the `@tanstack/react-query` import in `useLessonSearch.ts`; set `placeholderData: keepPreviousData` in the `useInfiniteQuery` options. Add a wiring test (NEW harness — assert the hook's returned `data.pages` persist across a filter-change rerender, not just the rpc call args).

**Step 2 (skeleton):** create `IntListSkeleton.tsx` matching `IntListRow` shape, tokened with `int-*`/CSS vars; add a `.int-skeleton` shimmer to `internal.css` (follow `src/components/CLAUDE.md` animate-pulse convention but in the int-* system per `feedback_design_cohesion.md`). **Export it from the `src/components/Internal/index.ts` barrel** (SearchPage imports Internal components through the barrel, per `components/CLAUDE.md`).

**Step 3 (SearchPage):** destructure `isPending` (and `isPlaceholderData`) from the hook. Add a branch BEFORE the `lessons.length === 0` empty check: when `isPending`, render `IntListSkeleton` instead of `IntEmptyState`. Fix the empty-state hint: the no-query/no-filter empty case must NOT show "Try removing a filter" — pass an explicit neutral hint (e.g. empty/"no lessons") for that branch; keep "Try removing a filter" only when a query/filters are active. Suppress `InfiniteScrollTrigger` while `isPlaceholderData`/the new query is fetching.

**Step 4 (tests):** extend `search-page.test.tsx:486` with a deferred/never-resolving `rpcMock` asserting the **skeleton** renders (not "No matches"); add a suggestions-transition test (with `keepPreviousData`, `totalCount` lags one fetch — assert the suggestions panel doesn't mis-fire mid-transition); assert the infinite-scroll trigger doesn't fire during placeholder state.

**Step 5: Verify** — `npm run check` clean; `npm run test:run` green; manual smoke: type a query and confirm NO "No matches" flash on each keystroke; cold load shows skeleton not "No results / Loading lessons…".

**Step 6: Commit**
```bash
git add src/hooks/useLessonSearch.ts src/pages/SearchPage.tsx src/components/Internal/IntListSkeleton.tsx src/components/Internal/index.ts src/styles/internal.css src/hooks/useLessonSearch.wiring.test.tsx src/__tests__/integration/search-page.test.tsx
git commit -m "fix(search): C59 — loading state, no more false 'No matches'

Add placeholderData: keepPreviousData so results persist across keystrokes/
filter toggles, and an isPending skeleton (new IntListSkeleton) for cold
load. Fix the no-filter empty hint and guard the infinite-scroll trigger
during placeholder transitions. Design: 2026-06-20-theme-b-public-ux-design.md §5 C59."
```

### Task 2.2: C14 — IntFormField ARIA wiring

**Sub-skill:** `superpowers:test-driven-development`

**Files:** Edit `src/components/Internal/IntFormField.tsx`, `IntFormField.test.tsx`

**Step 1 (TDD):** extend `IntFormField.test.tsx` — for a single `<input>` child with `required` + `error`, assert the input gets `aria-required`, `aria-invalid`, and `aria-describedby` pointing at the hint/error `<p>`'s `id`. Watch FAIL.

**Step 2 (fix):** give the hint/error `<p>` a stable `id` (from `fieldId`). In the existing `isValidElement` single-child clone path, inject `aria-required={required||undefined}`, `aria-invalid={error?true:undefined}`, `aria-describedby` (merged with any existing). Derive `fieldId = htmlFor ?? child.props.id ?? generatedId`. **Scope honestly:** non-input single children (e.g. a `<div>` wrapper) and pill-group/multi-child/string-child cases are not fully wired — default to shipping the single-form-control fix and filing `IntPillGroup` ARIA-forwarding as a follow-up (do NOT over-claim coverage in the test).

**Step 3: Verify** — `npm run check` clean; `npm run test:run` green.

**Step 4: Commit**
```bash
git add src/components/Internal/IntFormField.tsx src/components/Internal/IntFormField.test.tsx
git commit -m "fix(a11y): C14 — IntFormField aria-required/invalid/describedby (issue #39 slice)

Wire the hint/error text to the control via aria-describedby and surface
required/invalid state for AT, for the single-form-control case.
Design: 2026-06-20-theme-b-public-ux-design.md §5 C14."
```

### Task 2.3: C79 — LessonSearchPicker keyboard navigation

**Sub-skill:** `superpowers:test-driven-development`

**Files:** Edit `src/components/LessonSearchPicker.tsx`, `LessonSearchPicker.test.tsx`

**Step 1 (TDD):** extend `LessonSearchPicker.test.tsx` — type a query → ArrowDown sets `aria-activedescendant`/`aria-selected` on the first option; Enter calls `onSelect` with the active result (not a click); Escape collapses + keeps input focus; assert combobox/listbox/option roles. Watch FAIL.

**Step 2 (fix):** add `activeIndex` state (reset to -1 when results change). Input: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`, `onKeyDown` (ArrowDown/Up clamp, Enter selects active + `preventDefault`, Escape clears/collapses + keeps input focus). `<ul role="listbox" id>`; each `<li role="option" id aria-selected>` + highlight class + `onMouseEnter`. **Keep each option click-activatable via the same accessible query the existing click test uses** — don't break it incidentally. No focus trap. Lock Escape semantics per design §4 W1a detail (a) (default: local clear/collapse).

**Step 3: Verify** — `npm run check` clean; `npm run test:run` (all ~11 existing + new keyboard tests green; `excludeRetired`/stale-discard/can't-find untouched).

**Step 4: Commit**
```bash
git add src/components/LessonSearchPicker.tsx src/components/LessonSearchPicker.test.tsx
git commit -m "fix(a11y): C79 — LessonSearchPicker keyboard navigation (combobox/listbox)

Arrow/Enter/Escape + aria-activedescendant for the submitter + reviewer
dup-search picker (internal surfaces). Design: 2026-06-20-theme-b-public-ux-design.md §5 C79."
```

**End of PR 2:** PER-PR RITUAL. Full `npm run check` + `npm run test:run` + a manual pass through one submission-revise search and one reviewer dup-search with the keyboard.

---

## PR 3 — W1b-search-rpc  *(SKELETON — author tasks after locking §4 Q1–Q5)*

**Branch:** `feat/theme-b-w1b-search-rpc`

**What ships (scope):** one `search_lessons` migration — C136 (`&`/operator crash), C58 (real server-side sort), C11 (ghost-ID exclusion + deterministic order), location-Both expansion, C84 path-a (expose `tags` → real badge, remove PR1 suppression) — plus the C58 client wiring and the `LessonMetadata.tags` type + `normalizeMetadata` change.

> **This is design-lock work.** Before authoring concrete tasks here, lock design §4 Q1–Q5 (Q1 C58 stopgap-vs-real + the migration DROP/CREATE shape; Q2 C136 tsquery-operator sanitize site; Q3 C11 exact ghost IDs from `20260508000000:109`; Q4 location-Both casing; Q5 C84 path-a task list). Then GATE 1B (Codex/Claude review of the authored tasks) + GATE 2 (Codex on the migration SQL) before TEST. The single hottest public RPC — full `mcp__supabase-test__` verification before merge, PROD-verify after, `npm run test:rls` green.

**Pre-flight reads (when this PR begins):**
- `supabase/migrations/20260520020000_search_lessons_filter_retired.sql` (current `search_lessons` body)
- `supabase/migrations/20260514000000_search_lessons_filter_tags.sql` (the DROP+CREATE+GRANT precedent, ~47/54/245)
- `supabase/migrations/20260505000000_filter_drift_pr1_column_based_search_lessons.sql` (`_match_cooking_methods` ~159-183 — the helper to mirror for `_match_location`)
- `supabase/migrations/20251001_production_baseline_snapshot.sql` (`expand_search_with_synonyms` ~161 — the C136 fix site)
- `supabase/migrations/20260508000000_filter_drift_pr2_m3_column_hygiene.sql` (~109 — the 3 ghost `lesson_id`s)
- `src/hooks/useLessonSearch.ts` (searchParams ~111-137 — C58 client wiring), `src/types/index.ts` (`LessonMetadata` ~28, `ViewState.sortBy` ~94), `src/utils/facetCounts.ts` (case `'tags'`)
- Invoke `database-migrations` skill + `/new-migration`.

### Task 3.x: <!-- TBD — authored after §4 Q1–Q5 lock -->

---

## PR 4 — W1c-url-state  *(SKELETON — author tasks after locking §4 Q6–Q8)*

**Branch:** `feat/theme-b-w1c-url-state`

**What ships (scope):** URL persistence for query + filters (shareable/bookmarkable/refresh-surviving), serializing multi-select + hierarchical-heritage filters.

> **Design-lock work.** Lock §4 Q6–Q8 first (resume-vs-restart the WIP; scope incl. sort/deep-linking; replace-vs-push). The `feat/url-persistence` WIP (`e6610678`) is a review-hardened **reference** (sync-loop prevention, hierarchical-heritage validation, debounce already solved correctly) but is NOT mergeable (drops `lessonFormat`, omits `tags`, 340 commits behind). Default: cherry-pick `urlParams.ts` + `useUrlSync.ts` as reference, rewrite the field mapping against current `SearchFilters`.

**Pre-flight reads (when this PR begins):**
- `src/stores/searchStore.ts` (partialize ~178-185 — only view/density persist today)
- `src/App.tsx` (routes ~96-97 — no `/lesson/:id`), `src/types/index.ts` (`SearchFilters` ~51-64), `src/utils/filterDefinitions.ts` (hierarchical heritage ~130-137)
- WIP branch: `git show origin/feat/url-persistence:src/utils/urlParams.ts` + `:src/hooks/useUrlSync.ts` + `:src/utils/urlParams.test.ts` + `:src/hooks/useUrlSync.test.tsx` + the design doc `:docs/plans/2025-12-21-url-persistence-design.md` (all branch-only).

### Task 4.x: <!-- TBD — authored after §4 Q6–Q8 lock -->

---

## Test plan

### Unit / integration (vitest + RTL)
- `facetCounts.test.ts` — C69: replace fictional slug fixtures with real nouns; assert slug-keyed buckets.
- new `IntSidebar` render test — C84: tags section renders no count element.
- new `ScreenReaderAnnouncer.test.tsx` — §4.4a: "All filters cleared" reachable; no phantom "cooking method:".
- `useLessonSearch.wiring.test.tsx` — C59: returned `data.pages` persist across a filter change (new harness).
- `search-page.test.tsx` (~486) — C59: skeleton-not-"No matches" on pending; suggestions don't mis-fire mid-transition; infinite-scroll trigger inert during placeholder.
- `IntFormField.test.tsx` — C14: aria-required/invalid/describedby on the single-input path.
- `LessonSearchPicker.test.tsx` — C79: arrow/Enter/Escape + roles; existing click/excludeRetired/stale-discard untouched.

### E2E (Playwright)
- `e2e/performance.spec.ts` — C57: Filters button visible @375px, hidden @desktop.
- §3.2 / dialog-name / nested-main — a keyboard/a11y assertion (extend or add an a11y spec).

### RLS
- W1a/W1c: no change. W1b: `npm run test:rls` must pass after the migration.

### Manual smoke (per `superpowers:verification-before-completion`)
- `/` at 375px → open + use filters.
- Tab through a filter section (focus ring) + verify a checkbox toggles via keyboard.
- Type a query → no "No matches" flash; cold load shows skeleton.
- activityType badges show real counts; masthead no longer says "Internal"; lesson dialog has an accessible name.
- (W1b) `search_lessons('herbs & spices')` returns rows; sort changes order; ghosts excluded; Indoor returns Both-tagged; tags badge real.
