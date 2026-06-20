# Theme B — Public "Broken-Windows" UX (Deferred-Work Campaign Wave 1) — Design Document

**Date:** 2026-06-20
**Status:** **W1a Locked — ready for implementation.** W1b + W1c scoped, with open design questions enumerated (§4.x) — those lock at the start of each PR's cycle, not now.
**Related:** `docs/plans/2026-06-20-deferred-work-roadmap.md` (the campaign roadmap; Theme B = Wave 1), `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md` (the source review; section refs below cite it as "review §X")

---

## 1. Why this exists

The public search page is **the only surface a teacher actually sees** — and it has a cluster of outright-broken behaviors, every one confirmed in current `main` (`4e06e63`) by a 10-agent discovery pass on 2026-06-20. A phone user literally **cannot open filters at all** (a CSS source-order bug hides the only trigger). **10 of 11 filter categories are invisible to keyboard and screen-reader users** (`display:none` on the checkbox inputs removes them from the focus order and the accessibility tree). **Every keystroke flashes a false "No matches"** because the search has no loading state. The activityType filter shows blank count badges because the badge lookup and the data are keyed differently, and the "Lesson Type" (tags) badges are always blank. The public masthead reads "Lesson Library · Internal" to anonymous visitors. A screen reader hears a phantom "cooking method:" announcement on every interaction.

None of this is deep work. The roadmap scores the whole cluster S-effort, pure-frontend or one small migration, and ranks it **top of the queue** precisely because it is high user-impact × low effort × public-facing. This is the campaign's flagship and the only theme with a full `/kickoff-feature` scaffold.

Theme B is the entirety of **Wave 1**, executed in three sub-waves of increasing substrate cost:
- **W1a — pure-frontend** (no migration): the broken windows above. Ships first, as **2 PRs**.
- **W1b — one migration** (search RPC, TEST-DB-gated): `&`-in-query crash, real server-side sort, ghost-row exclusion + deterministic order, location "Both"-expansion, and the make-tags-real backend half of the C84 facet fix.
- **W1c — URL state** (M): shareable/bookmarkable search + filter state.

This design doc covers all three so the sequencing and the cross-wave couplings (C84 frontend↔RPC; C58 client wiring↔RPC param) are written down once. **W1a is locked and ready. W1b/W1c are scoped with their mechanism questions enumerated** — they lock when their PR cycle begins (design-lock-mode for those two sub-waves only).

## 2. Goals / failure modes this closes

1. **A phone user can open and use filters.** (review §3.1 / C57) Today the only mobile filter trigger is `display:none` at every width due to CSS source order. This is the single most user-visible breakage.
2. **Keyboard and screen-reader users can operate the filters.** (review §3.2; bundled into W1a per user decision 2026-06-20) Today only Grade pills work; the other 10 categories are out of the focus order and a11y tree.
3. **Search never shows a false negative.** (review §3.5 / C59) Every queryKey change blanks the result list and renders "No matches" until the RPC returns; cold load shows the contradictory "No results" + "Loading lessons…".
4. **Filter count badges tell the truth.** (review §4.3 / C69, C84) activityType badges are always blank (slug-vs-noun key mismatch); tags badges are always blank (RPC doesn't return tags). Note: the badge renders `{count || ''}` — a count of 0 shows as an *empty/blank* span, not literally "(0)". A blank badge on a working filter is worse than no badge — it reads as "0 matches" and discourages filter use.
5. **No accessibility/copy papercuts on the public surface.** (review §4.4, §4.7 / part of C14 scope) Phantom SR announcement, unnamed lesson dialog, nested `<main>` landmarks, and an "Internal" wordmark shown to anonymous visitors.
6. **Submitter/reviewer forms meet keyboard-operability obligations.** (C14 IntFormField ARIA; C79 LessonSearchPicker keyboard nav) Internal surfaces, but real WCAG 2.1.1 / 4.1.2 gaps.
7. **(W1b) Search doesn't 500 on punctuation, sort works, ghosts don't surface, "Indoor" doesn't silently drop "Both".** (C136, C58, C11, location-Both)
8. **(W1c) A filtered search is shareable and survives refresh.** (C114/C157)

Success is checkable: each item below names the exact file:line and the test that proves it.

## 3. The chosen shape: three risk-tiered sub-waves, W1a as two PRs

```
Theme B (Wave 1)
├─ W1a  pure-frontend, no migration ........... 2 PRs, ship FIRST
│   ├─ PR1  "broken windows" CSS + copy + a11y + facet badges   (near-zero risk)
│   │       C57 · §3.2 checkbox-a11y · copy/a11y one-liners · C69 · C84(suppress)
│   └─ PR2  search reliability + form/picker a11y               (net-new code)
│           C59 (placeholderData + skeleton) · C14 (IntFormField ARIA) · C79 (picker keyboard)
│
├─ W1b  ONE search_lessons migration, TEST-DB-gated ........... 1 PR  (after W1a)
│       C136 (& crash) · C58 (real sort) · C11 (ghost exclusion + deterministic order)
│       · location-Both expansion · C84 path-a (expose tags in RPC → real badge)
│
└─ W1c  URL/shareable state, pure-frontend .................... 1 PR  (after W1b)
        C114/C157 (query+filters in URL; WIP branch is a stale reference, not mergeable)
```

**Why split W1a into two PRs (user decision, 2026-06-20):** PR1 is all near-zero-risk CSS / copy / a11y-CSS / facet-badge edits with no net-new components — it ships fast and safe. PR2 adds the only two pieces with real new code surface: C59's net-new skeleton + TanStack `placeholderData` (first usage in the repo), and C79's combobox/listbox keyboard machinery. Keeping them apart lets the safe wins land immediately and gives PR2 its own focused review.

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **One big "broken windows" PR** | Mixes trivial CSS one-liners with net-new skeleton + keyboard code in one diff; slower review, larger blast radius, no fast safe-win landing. |
| **Frontend + migration interleaved** | W1b touches the single hottest public RPC (`search_lessons`); it must be its own TEST-DB-gated migration PR, never bundled with cosmetic frontend churn. |
| **Resume the `feat/url-persistence` WIP as-is for W1c** | The branch is stale-to-broken: references the dropped `lessonFormat` field (type error on current `main`) and omits the `tags` filter added after it forked (340 commits behind). It's a high-quality *reference*, not a mergeable branch. |
| **Wholesale "remove all per-option facet badges"** for C84/C69 | Would discard the badges that are *correct* today (cookingMethods, location, season, heritage). Targeted fixes preserve the truthful ones. |

## 4. Open design questions — TO LOCK AT THE START OF EACH SUB-WAVE'S PR CYCLE

> **W1a is locked (§5).** Two low-stakes details inside locked W1a items are executor-lockable at execution (both have a stated default, neither blocks task authoring): **(a)** C79 Escape semantics `[evidence-lockable]` (default: component-local clear/collapse + keep input focus; add an `onEscape`/`onClose` callback only if the reviewer panel needs panel-collapse) and **(b)** the Header replacement wordmark `[user-verdict]` (default `"Lesson Library"`; confirm with the user/curriculum team per `feedback_curriculum_facing_copy_plain.md` — it's the only public-copy string in W1a). The questions below govern **W1b and W1c**. Each is tagged `[evidence-lockable]` (the executor may lock it from discovery/TEST-DB evidence with a one-line rationale) or `[user-verdict]` (executor gathers evidence + recommends; the user decides — never lock unilaterally). Lock them when that sub-wave's PR cycle starts, writing the answer + rationale inline here and flipping that sub-wave to Locked.

### W1b (search_lessons migration)
1. **C58 — remove broken sort options (frontend stopgap) vs. implement real server-side `order_by`?** `[user-verdict]` Default lean: implement properly (it's why C58 is in the migration wave). Sort-expression facts confirmed 2026-06-20: `'modified'` maps to **`lessons.updated_at`** (there is **no** `modified_at` column); `'confidence'` is in the `ViewState.sortBy` TS union (`types/index.ts:94`) but **not** in `IntToolbar`'s `SORT_OPTIONS` (user can only pick relevance/title/grade/modified), so it needs no expression unless added to the UI; `'grade'` needs a defined ordering over `grade_levels`. **The `order_by` param is a SIGNATURE change** — see §6 for the DROP+CREATE requirement. <!-- TBD W1b -->
2. **C136 — sanitize inside `expand_search_with_synonyms` (regex-strip tsquery operators per word) vs. wrap with `websearch_to_tsquery` at the RPC call site?** `[evidence-lockable]` Default: sanitize inside `expand_search_with_synonyms` (preserves synonym-OR semantics; smallest match-behavior change). Verify match parity on a smoke-query set before/after. Note: the function lives only in the baseline snapshot `20251001_production_baseline_snapshot.sql:161` — never re-created since. <!-- TBD W1b -->
3. **C11 — exact deterministic signature of the 3 "Unknown" ghost rows to exclude.** `[evidence-lockable]` (needs a TEST/PROD probe) **Exclude by exact `lesson_id`, NOT a title predicate** (a `WHERE title='Unknown'` is unsafe). The 3 ghost IDs are named in `supabase/migrations/20260508000000_filter_drift_pr2_m3_column_hygiene.sql:109` (e.g. `'1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd'`) — re-confirm the live IDs on TEST **and** PROD before writing the exclusion, and apply it to **both** the count and result `WHERE` clauses. Also append `lesson_id ASC` as a tiebreaker so the empty-query order (where `ts_rank=0` for all rows) is stable across runs. <!-- TBD W1b -->
4. **location-Both — exact casing/vocabulary of `Indoor`/`Outdoor`/`Both` in `location_requirements`.** `[evidence-lockable]` Confirm on TEST DB before writing a `_match_location(text[],text[])` helper that mirrors `_match_cooking_methods` (`20260505000000_filter_drift_pr1_column_based_search_lessons.sql:159-183`), expanding `Indoor→[Indoor,Both]`, `Outdoor→[Outdoor,Both]`. <!-- TBD W1b -->
5. **C84 path-a — confirm exposing `tags` in the RPC is in W1b scope.** `[user-verdict]` Default: yes. Tags are now populated (~74 of ~745 in TEST) and the filter already returns results, so the honest end-state is a real badge. Lower-churn mechanism: inject a `'tags'` key into the jsonb `metadata` reconstruction in `search_lessons` (mirror the cookingMethods overlay). **Full task list (do not omit):** (1) RPC change; (2) **add `tags: string[]` to `LessonMetadata` in `src/types/index.ts`** (the DB row type `database.types.ts:256` already has `tags: string[] | null`, but `LessonMetadata` does not); (3) read it in `normalizeMetadata` (`useLessonSearch.ts`); (4) change `facetCounts.ts valuesForKey` case `'tags'` to return it; (5) **remove the W1a PR1 suppression** in `IntSidebar.tsx`. <!-- TBD W1b -->

### W1c (URL state)
6. **Resume the `feat/url-persistence` WIP (rebase + de-stale) vs. restart fresh from its design doc?** `[user-verdict]` Default: cherry-pick `src/utils/urlParams.ts` + `src/hooks/useUrlSync.ts` as a *reference* (the hard parts — sync-loop prevention, hierarchical-heritage validation, debounce — are already solved correctly) but rewrite the field mapping against the current `SearchFilters` shape (add `tags`, remove `lessonFormat`). Do NOT merge the branch as-is — it won't type-check. WIP design doc lives **only on the WIP branch** (`git show origin/feat/url-persistence:docs/plans/2025-12-21-url-persistence-design.md` — not present on `main`). <!-- TBD W1c -->
7. **URL-state scope — query+filters only, or also `sortBy` and lesson deep-linking (`?lesson=<id>`/`/lesson/:id`)?** `[user-verdict]` Default: match C114/C157 = query+filters only (the WIP scope). `sortBy` only makes sense in the URL after W1b makes sort real; deep-linking is a separate concern (lessons currently open in a client-only modal). <!-- TBD W1c -->
8. **History mode — `replace` vs `push` on filter changes.** `[evidence-lockable]` Default: `replace` (WIP choice; filter toggles don't spam browser history). Confirm the back-button UX is acceptable. <!-- TBD W1c -->

## 5. W1a — locked item specs (verified against `main` @ 4e06e63)

> Every anchor below was re-derived by the 2026-06-20 discovery pass; the 2026-06-12 review's line numbers had drifted. **Executors must still re-verify line numbers before editing** (repo may have moved). Likewise, any corpus counts cited (e.g. activityType noun tallies, tags-populated row count) **drift with the live data** — re-confirming them on TEST and finding slightly different numbers is expected, not a discrepancy.

### PR1 — "Broken-windows" CSS + copy + a11y + facet badges (`feat/theme-b-w1a-cosmetic-a11y`)

**C57 — mobile filter button unreachable** (review §3.1)
- Cause: in `src/styles/internal.css`, the `@media (max-width:767px)` override `.int-mobile-filter-btn { display: inline-flex }` (~514-516) comes **before** the base rule `.int-mobile-filter-btn { display: none }` (~720-734). Equal specificity (0,1,0); media queries add no weight; later source rule wins → button hidden at all widths. The button + drawer machinery (`IntMobileFilterButton.tsx`, `IntMobileFilterDrawer.tsx`, wired in `IntToolbar.tsx` and `SearchPage.tsx:186`) is otherwise correct — CSS is the only bug.
- **Fix (locked: Option A):** move the base `.int-mobile-filter-btn { display:none; … }` block (~720-734) so its final source position is **before** the `@media (max-width:767px)` block opener (~492) — the two are ~200 lines apart with unrelated CSS between, so the instruction is "base rule must precede the media block in source order," not "move it up a bit." There is exactly one other `.int-mobile-filter-btn` rule (the override at ~514) and **zero `!important`** in the file (verified). No specificity hacks; restores the documented intent. CSS-only, one file.
- Test: extend `e2e/performance.spec.ts:90` ("mobile viewport renders correctly", VIEWPORT.MOBILE 375×667) — assert the Filters button (`getByRole('button', { name: /open filters/i })`) is **visible** at 375px; add a desktop assertion (line ~113) that it's **hidden**, guarding the inverse regression.

**§3.2 — filter checkboxes keyboard/SR-inaccessible** (locked into W1a per user decision 2026-06-20)
- Cause: `src/styles/internal.css:208` `.int-check input { display: none; }` removes every `.int-check` checkbox from the focus order and a11y tree, across `IntSidebar.tsx` (9 categories) + `IntCulturalHeritageSection.tsx` (heritage). Only Grade pills (real `<button aria-pressed>`) work → 1 of 11 categories operable. (`IntDataTable` row-checkboxes use a different class and are out of scope.)
- **Fix:** replace `display:none` with an sr-only clip pattern (position:absolute; 1px; clip-path:inset(50%); …) so the input stays focusable + in the a11y tree but visually hidden; add `.int-check input:focus-visible + .int-check-box { outline: 2px solid var(--color-esy-green); outline-offset: 2px; }`. The visible box is the separate `.int-check-box` span — unaffected; the existing `input:checked + .int-check-box` rule keeps working. CSS-only, one file.
- Test: keyboard smoke (Tab into an expanded section, focus ring visible, Space toggles) + a Playwright assertion that `getByRole('checkbox', { name: … })` is focusable/checkable. Optional Chrome-devtools-mcp a11y audit.

**Copy/a11y one-liners**
- **`· Internal` wordmark** (review §4.7): `src/components/Layout/Header.tsx:69` source string is `"Lesson Library · Internal"` (CSS upper-cases it). Drop "Internal" from the public string (keep it only as the `Int*` component-namespace). Exact replacement copy is a curriculum-team-facing call — default `"Lesson Library"` (confirm at execution per `feedback_curriculum_facing_copy_plain.md`).
- **Phantom SR announcement** (review §4.4a): `src/components/Common/ScreenReaderAnnouncer.tsx:30` `if (filters.cookingMethods)` — empty array is truthy, so it fires every announcement and makes the "All filters cleared" branch unreachable. Fix: `if (filters.cookingMethods.length)` + phrasing matching the sibling array branches. **Isolated** — every other array filter already uses `.length`; only `cookingMethods` is wrong.
- **Unnamed lesson dialog** (review §4.4c): `src/components/Internal/IntLessonDrawer.tsx:15` `<Dialog>` has no accessible name. Fix: render `<DialogTitle className="sr-only">{lesson.title}</DialogTitle>` (announces the actual lesson) — `lesson` is non-null inside the gated body (`{lesson && …}`). **Add `DialogTitle` to the `@headlessui/react` import** (the file currently imports `Dialog, DialogPanel, Transition, TransitionChild` but not `DialogTitle`).
- **Nested `<main>`** (review §4.4b): `src/App.tsx:93` wraps all routes in `<main>` while `src/pages/SearchPage.tsx:79` renders a second `<main id="main-content" className="int-main" tabIndex={-1}>` (these are the **only two** `<main>` in `src/`). **Fix (locked, Gate-A-corrected):** keep the App-level `<main>` as-is and **downgrade SearchPage's inner element to `<div id="main-content" className="int-main" tabIndex={-1}>`** — it MUST keep `id="main-content"`, `className="int-main"` (the layout/padding hook, `internal.css:261`), and `tabIndex={-1}` (the skip-link focus target works on any element). Result: exactly one `<main>` app-wide; the existing `SkipLink` (rendered only inside SearchPage, `SearchPage.tsx:73`, targeting `#main-content`) still resolves on the search route — **unchanged from today**. *(Do NOT claim this makes the skip link app-wide: `<SkipLink/>` is not rendered in `App.tsx`, so non-search routes still have no visible skip link. Making skip-to-main app-wide = moving `<SkipLink/>` into `App.tsx` = explicitly OUT of W1a scope.)*

**C69 — activityType facet badge always blank** (PUBLIC; review §4.3 partial)
- Cause: stored values are bare nouns `['cooking','garden','academic','craft']` (TEST: 416/314/142/65); the sidebar badge looks up `counts.activityType[opt.value]` where `opt.value` is the slug `'cooking-only'` etc. (`filterDefinitions.ts:42-45`); `facetCounts.ts:52-53` buckets by the bare noun → lookup misses → `count || ''` → blank. (Filtering still works because the slug→noun reconciliation is server-side in `_alias_activity_type`.)
- **Fix (locked: counting-side map, mirror `tallyHeritage`):** in `src/utils/facetCounts.ts`, add `ACTIVITY_TYPE_SLUG_BY_NOUN = { cooking:'cooking-only', garden:'garden-only', academic:'academic-only', craft:'craft-only' }`; in `valuesForKey` case `'activityType'`, map each stored noun → its slug with a **verbatim fallback for unknowns** so the bucket key equals `opt.value`. Do **NOT** change `filterDefinitions.ts` option values — the server filter + reviewer pill UI + ReviewDetail save-path depend on the slug form.
- **No `'both'` fan-out (Gate-A correction):** `'both'` was retired by D2.1 on 2026-05-06 and TEST shows **zero** `'both'` rows; a synthetic `'both' → ['cooking-only','garden-only']` fan-out is speculative dead code AND the only thing that could double-count a single lesson. Use the verbatim fallback (which buckets a stray `'both'` to a harmless blank `'both'` key) and **probe PROD at execution to confirm `'both'` is truly gone**; only add fan-out if PROD still carries it. Each lesson's `activityType` is a noun array, so mapping-then-bucketing counts each lesson once per distinct slug — no dedupe needed once the fan-out is dropped.
- Test: **fix the misleading existing fixtures** at `facetCounts.test.ts` (~line 51 and ~71 — they feed slug-shaped input `'cooking-only'`/`'both'` that no real row contains, which is exactly why this bug passed CI). Replace with real nouns and assert the bucket is keyed by the slug IntSidebar looks up (input `['cooking']` → `counts.activityType['cooking-only'] === 1`). A small `IntSidebar` render assertion (a `'cooking'` lesson makes the "Cooking" badge show its count) is optional belt-and-suspenders.

**C84 — tags ("Lesson Type") badge always blank → suppress now** (user decision: hide in W1a, make-real in W1b)
- Cause: `facetCounts.ts:43-51` returns `[]` for `tags` by design (the `search_lessons` RPC doesn't return a `tags` column), so the count is always 0 → `IntSidebar.tsx:102` renders `{count || ''}` = a **blank** span (NOT literally "(0)"). **Tags are now populated** (~74 of ~745 in TEST) and the filter works, so the blank badge reads as "0 matches" on a working filter — actively misleading.
- **Fix (locked: targeted suppress, path b):** in `src/components/Internal/IntSidebar.tsx`, omit the count `<span class="int-check-count">` for the `tags` section only (e.g. `const showCount = key !== 'tags'`). Leave every other section's badge (cookingMethods/location/season/heritage — all correct today) untouched. The make-tags-real backend half is W1b Q5. *(Honest note: since the span already renders empty, the user-visible delta is near-nil — the value is removing the misleading empty slot and marking the intent so W1b can flip it to a real count.)*
- Note: the old finding's cooking-methods half ("Stovetop vs lowercase, never match") is **already fixed** (PR 6e kebab-ized the option values); do not re-touch it.
- Test: an `IntSidebar` render test (none exists today) asserting the Lesson Type section renders **no count span / empty count text** — assert absence of the `.int-check-count` element, **NOT** the absence of the string "(0)" (which never appears, so that assertion would pass vacuously). `facetCounts.test.ts` already proves the cooking-methods path is correct (template ~line 78).

### PR2 — Search reliability + form/picker a11y (`feat/theme-b-w1a-behavior`)

**C59 — false "No matches" flash / no loading state** (PUBLIC; review §3.5)
- Cause: `src/pages/SearchPage.tsx:43` destructures the hook with no loading flag; the empty-state branch (`:111-119`) renders `IntEmptyState` whenever `!isError && lessons.length === 0`, with no `isPending` branch; `src/hooks/useLessonSearch.ts:148-150` sets no `placeholderData`. Every queryKey change (`['lesson-search', rpcName, filters, pageSize]` — fires on every debounced keystroke/toggle) blanks `data` → false "No matches" until the RPC returns. Cold load shows the contradictory `"No results"` heading + `"Loading lessons…"` hint (the hint is hardcoded at `:117`).
- **Fix (locked):** (a) `useLessonSearch.ts` — add `placeholderData: keepPreviousData` to the `useInfiniteQuery` options (import `keepPreviousData` from `@tanstack/react-query` ^5.85.3 — confirmed exported + works with `useInfiniteQuery` in v5; first usage in the repo). (b) `SearchPage.tsx` — destructure `isPending`, add a branch **before** the empty check that renders a skeleton on cold load instead of `IntEmptyState`. Gate the loading branch on `isPending` (true only when there's no cached or placeholder data — with `keepPreviousData`, this cleanly distinguishes cold load from refetch).
- **Intended UX (make explicit so reviewers don't flag a "missing spinner"):** with `keepPreviousData`, prior results stay visible during a refetch (keystroke/filter change) instead of blanking — that retention IS the fix for the false-negative. A per-refetch fetching indicator is NOT required for W1a (goal #3 is "never a *false* negative," not "spinner on every refetch").
- **Empty-state hint (Gate-A correction — don't just delete the hint):** the empty branch currently hardcodes `"Loading lessons…"` at `:117` for the no-query/no-filter case. Removing it must NOT fall through to `IntEmptyState`'s default hint `"Try removing a filter or broadening your search."` — that's nonsensical when no filters are applied. Pass an explicit **neutral** hint for the genuine no-query/no-filter empty state (e.g. `""` or a "no lessons to show" message); the "Try removing a filter" hint should only show when a query or filters are active.
- **Infinite-scroll guard (Gate-A correction):** `InfiniteScrollTrigger` (`SearchPage.tsx:165`) fires load-more whenever the sentinel is visible unless told otherwise (`InfiniteScrollTrigger.tsx:27`). With `keepPreviousData`, the trigger must also be suppressed while `isPlaceholderData`/the new query is fetching, or it can fire against stale data mid-transition. Pass an `isPlaceholderData`-aware disable into the trigger.
- **Skeleton (locked: build a small int-* component, not inline animate-pulse):** no skeleton primitive exists in `src/components/Internal/` (only `IntEmptyState`; the only shimmer patterns are legacy-Tailwind `gray-*` in `VirtualizedTable`/`PageLoader`). Per `feedback_design_cohesion.md` (design cohesion over minimal-diff), author a small `IntListSkeleton` matching `IntListRow`, tokened with `int-*`/CSS vars (add a `.int-skeleton` shimmer to `internal.css`). `src/pages/CLAUDE.md` mandates loading-state handling; `src/components/CLAUDE.md:40-49` documents the `animate-pulse` convention to follow.
- Test: (1) extend `src/__tests__/integration/search-page.test.tsx:486` (Empty State block, `rpcMock` harness) with a never-resolving/deferred mock asserting the **skeleton** renders (not "No matches"). (2) **`keepPreviousData` proof is a NEW harness, not an "extend":** `useLessonSearch.wiring.test.tsx`'s existing helper reads `rpcMock.mock.calls` (RPC *params*), but proving `keepPreviousData` requires asserting the hook's *return* `data.pages` persist across a filter-change rerender — budget for a new test shape. (3) **Suggestions-transition test (Gate-A):** because `totalCount` derives from `data.pages[0]` and `keepPreviousData` makes it lag one fetch, the suggestions panel (`:135-163`, gated `totalCount===0 && hasQuery`) must not flicker/mis-fire mid-transition — add an explicit test (the skeleton test does NOT cover this). (4) infinite-scroll-not-firing-during-placeholder assertion.

**C14 — IntFormField missing ARIA wiring** (INTERNAL forms; the IntFormField slice of issue #39)
- Cause: `src/components/Internal/IntFormField.tsx` already wires `label htmlFor`↔child `id` (via `cloneElement` when the single child lacks an `id`), but does **not** set `aria-required` (when `required`), `aria-invalid` (when `error`), or `aria-describedby` linking the control to the hint/error `<p>` (which currently has no `id`).
- **Fix (scoped honestly per Gate A — this is NOT a universal one-liner):** (1) Always give the hint/error `<p>` a stable `id` (derive from `fieldId`), harmless even when nothing references it. (2) Inject `aria-required`/`aria-invalid`/`aria-describedby` onto the cloned child **only via the existing `isValidElement` single-child path** (the same guard already in the file at `:31-33`), and **merge** with any `aria-describedby` the child already carries. (3) Derive `fieldId` as `htmlFor ?? child.props.id ?? generatedId` so explicit-id children still wire up.
- **Known limitation to state in the task (do NOT over-claim "benefits all forms"):** the cloned child is not always a form control — at least one caller (`UserProfile.tsx` "Schools") passes a `<div>` wrapper, several pass `IntPillGroup` (which only puts `id`/`aria-label` on its wrapper div, not individual controls — `IntPillGroup.tsx:43`), and the existing tests cover string-child and multiple-children cases (no clone target). For those, the describedby `id` is still added but the control-level ARIA is not meaningfully wired. **Decide at execution:** either (a) also forward ARIA props in `IntPillGroup` (extends the PR), or (b) ship the single-form-control fix and file `IntPillGroup` ARIA-forwarding as a flagged follow-up. Default: (b) — keep PR2 tight.
- Test: extend `IntFormField.test.tsx` — assert `aria-invalid`/`aria-required`/`aria-describedby` appear and point at the hint/error `id` **for the single-input happy path**; do not assert coverage for the pill-group/multi-child cases the fix doesn't fully address.

**C79 — LessonSearchPicker no keyboard navigation** (INTERNAL: submitter UPDATE flow + reviewer dup-search hatch; NOT public search)
- Cause: `src/components/LessonSearchPicker.tsx` (≈177 lines) is a search-input + results-`<ul>` with zero managed keyboard nav — no `role=combobox/listbox/option`, no `aria-activedescendant`, no Arrow/Enter/Escape. Only browser-default Tab + Space/Enter-on-focused-button work.
- **Fix (locked shape: combobox/listbox pattern):** add `activeIndex` state (reset to -1 when results change); on the input add `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`, and an `onKeyDown` (ArrowDown/Up move active, clamped; Enter selects active via `onSelect` + `preventDefault`; Escape clears/collapses + keeps focus in input). On the `<ul>` add `role="listbox"`+id; on each option add `role="option"`, stable `id`, `aria-selected`, a highlight class, and `onMouseEnter` for pointer/keyboard parity. No focus trap (inline picker, not a modal — Tab still exits). Both consumers consume it unchanged.
- Open detail to settle at execution (small, executor may lock from evidence): **Escape semantics** — clear query vs. collapse list vs. (in ReviewDetail) collapse the whole search panel. Default: component-local clear/collapse + keep focus in input; expose an optional `onEscape`/`onClose` callback only if the reviewer panel needs the panel-collapse behavior.
- Test: extend `LessonSearchPicker.test.tsx` (already mocks supabase + uses `user-event`; ~11 `it()` blocks) — type → ArrowDown asserts `aria-activedescendant`/`aria-selected`; Enter calls `onSelect` with the active result (not a click); Escape collapses + keeps input focus; assert the combobox/listbox/option roles. **Regression guard (Gate A):** the refactor turns each result `<li><button onClick></button></li>` into a `<li role="option">` — the existing `'calls onSelect when a result … is clicked'` test must keep finding/activating the option via the *same* accessible query (or be deliberately updated, not incidentally broken). Do not disturb the `excludeRetired`, stale-response-discard, debounce, or can't-find-affordance tests.

## 6. W1b / W1c — scoped (lock at PR-cycle start)

**W1b** is a single migration rebuilding `search_lessons` + helper changes + the C58 client wiring (`useLessonSearch.ts` searchParams + queryKey + `SearchPage` pass-through). Mechanism choices are §4 Q1–Q5.

**Migration shape (Gate-A correction — NOT a "body-only CREATE OR REPLACE"):** if C58 lands the `order_by` param (the default lean), the function **signature changes** (15-arg → 16-arg), and Postgres `CREATE OR REPLACE` cannot change a signature. Follow the repo's own `20260514000000_search_lessons_filter_tags.sql` precedent: **`DROP FUNCTION IF EXISTS search_lessons(<old 15-arg signature>)` → `CREATE FUNCTION` (new signature, new param `DEFAULT`ed so the frontend/typegen stay compatible) → re-`GRANT EXECUTE` → `NOTIFY pgrst, 'reload schema'` → regenerate TS types** (`20260514000000:47,54,245` shows the DROP+CREATE+GRANT pattern). If, and only if, C58 is descoped to a frontend stopgap (no new param), then the other three changes (C136 sanitizer inside `expand_search_with_synonyms`, C11 ID-exclusion + `lesson_id` tiebreaker, `_match_location` helper for location-Both, C84 `tags` overlay) are all *body/helper* edits that a plain `CREATE OR REPLACE` can carry. Plus a new `IMMUTABLE` `_match_location(text[],text[])` helper. **This is the single hottest public RPC** — a body regression breaks all search, so the migration is fully TEST-DB-MCP-verified against the live corpus before merge and PROD-verified after, per the standing gates; `npm run test:rls` must stay green; Codex GATE 2 on the SQL before TEST.

**W1c** is pure-frontend: a URL↔store sync (debounced, replace-mode, sync-loop-guarded) serializing query + multi-select + hierarchical-heritage filters. The `feat/url-persistence` WIP is a review-hardened reference for the hard parts but is NOT mergeable (drops `lessonFormat`, omits `tags`, 340 commits behind). Mechanism choices are §4 Q6–Q8.

## 7. Shipping strategy

| PR | Title | Contains | Risk / notes |
|---|---|---|---|
| 1 | **W1a-cosmetic-a11y** | C57, §3.2 checkbox-a11y, copy/a11y one-liners (×4), C69, C84-suppress | Near-zero. CSS + small TS + facet map. No DB. Frontend-only revert. |
| 2 | **W1a-behavior** | C59 (+ new `IntListSkeleton`), C14, C79 | Low. Net-new component + first `keepPreviousData`. No DB. |
| 3 | **W1b-search-rpc** | C136, C58, C11, location-Both, C84 path-a (+ `LessonMetadata.tags` type + `normalizeMetadata`) | **Medium — hottest RPC.** One migration (DROP+CREATE if `order_by` lands — see §6), TEST-DB-gated; PROD-verify after. |
| 4 | **W1c-url-state** | C114/C157 | Low-med. Pure-frontend; sync-loop care; WIP as reference only. |

### Gap risk between PRs
None dangerous. PR1→PR2 are independent frontend slices. PR2→PR3: C58's full fix spans both (PR2 ships nothing for sort; the client wiring lands in PR3 with the RPC param, so there's no half-wired sort window). C84: PR1 suppresses the badge; PR3 (W1b) makes it real and removes the suppression — the intermediate state (suppressed) is correct, not broken.

### TEST DB rehearsal
- PR1, PR2, PR4: no schema — deploy-preview + manual smoke only.
- PR3 (W1b): mandatory `mcp__supabase-test__execute_sql` verification — `search_lessons('herbs & spices')` returns rows (not a 500); sort order changes with `order_by`; the 3 ghost IDs are excluded and no legitimate row is; `Indoor` query returns `Both`-tagged rows; tags badge data present. Re-verify each post-bot-round that touches DB state (`feedback_per_round_test_db_verification.md`). `npm run test:rls` after the migration. Codex GATE 2 on the migration SQL before TEST.

### Rollback paths
- PR1/2/4: standard frontend `git revert`; no data side effects.
- PR3: `CREATE OR REPLACE` is reversible by re-applying the prior function body; write a `.rollback` companion. Ghost-row exclusion is a `WHERE` clause (no data deleted — the actual deletion is a separate Wave-4 data task following the pre-delete FK checklist; W1b only *hides* them from search).

### Per-PR ritual
Per `feedback_pr_bot_review_workflow.md` + the kickoff's PER-PR RITUAL: pre-push reviewer-agent dispatch **+ Codex GATE 3** (different model family) → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage (`feedback_pr_comment_surfaces.md`) → rebuttal-pass every finding (`feedback_bot_review_investigation.md`), default-reject hardening that fails the "user-visible-bug-or-DB-risk" bar (these are internal-tool / low-risk PRs — calibrate acceptance accordingly) → consolidated fix-ups → per-round TEST-DB re-verify (PR3 only) → round-cap after 2.

### Known flakes
Pull up `reference_ci_flakes.md` before the PR3 PROD migration (SASL apply/verify flake + rerun; 3-signal PROD verification). Security Audit check is expected-red (pre-existing `npm audit`/lhci noise) — not a blocker.

## 8. Testing strategy

**Unit/integration (vitest + RTL):** `facetCounts.test.ts` (C69 — fix fixtures + add `'both'` case), `IntFormField.test.tsx` (C14 ARIA), `LessonSearchPicker.test.tsx` (C79 keyboard), `useLessonSearch.wiring.test.tsx` (C59 `keepPreviousData` persistence), `search-page.test.tsx:486` (C59 skeleton-not-empty), a new `IntSidebar` render test (C84 no tags badge), a new `ScreenReaderAnnouncer.test.tsx` (§4.4a — "All filters cleared" reachable).
**E2E (Playwright):** `e2e/performance.spec.ts` (C57 — Filters visible @375px, hidden @desktop); a keyboard/a11y assertion for §3.2 + the dialog name + no nested-main (extend or add an a11y spec).
**RLS:** no change for W1a/W1c; `npm run test:rls` must pass unchanged after the W1b migration.
**Manual smoke (per `superpowers:verification-before-completion`):** load `/` at 375px → open filters; Tab through a filter section with a screen reader / focus ring; type a query and confirm no "No matches" flash; confirm activityType + (after W1b) tags badges show real counts; confirm the masthead no longer says "Internal".
**Pre-PR gate (every PR):** `npm run check` (= type-check + lint) then `npm run test:run` (= `vitest run`, NOT watch).

## 9. Out of scope (captured for future work)

- **Split-view dead-end <1100px** (review §3.4, a real P1) and **toolbar overflow <768px** (review §4.8) — public mobile bugs **not** in the roadmap's Wave 1 list. Surface to the user for a future wave; they are NOT in Theme B as scoped. *(Flagged because the roadmap may have dropped them.)*
- Reviewer-side fixes: summary field (§3.7), UserProfile titles (§4.11), ReviewDashboard pagination (§4.12), AI-draft provenance chips (§4.10), draft persistence/batch nav (§4.9) — reviewer track (Wave 5), not public.
- ReviewDetail decomposition (§3.8 / C107) — Wave 5, gated on page-level tests first.
- Closed-vocabulary selects (§3.9) — timed to Stage-2 canonical vocab landing.
- Display-layer label hygiene (§4.5), search AND-of-OR semantics (§4.6 / C41), unaccent (C162), server-side facet counts beyond tags (§4.3 path-a wholesale) — later search/filter-UI waves.
- Ghost-row **deletion** (the data removal; W1b only hides them from search) — Wave 4 data-cleanup, pre-delete FK checklist.

## 10. References

- Campaign roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1; item table for C-ids)
- Source review: `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md`
- Discovery findings (2026-06-20, 10-agent verification): workflow `theme-b-w1a-discovery` — anchors + mechanisms re-verified against `main` @ 4e06e63
- WIP reference (W1c): `origin/feat/url-persistence` (e6610678); its design doc `docs/plans/2025-12-21-url-persistence-design.md` exists **only on that branch**, not on `main`
- Memories: `feedback_design_cohesion.md` (skeleton decision), `feedback_curriculum_facing_copy_plain.md` (header copy), `feedback_pr_bot_review_workflow.md` / `feedback_bot_review_investigation.md` / `feedback_pr_comment_surfaces.md` / `feedback_per_round_test_db_verification.md` (per-PR ritual), `feedback_data_safety_top_priority.md` (W1b), `feedback_workflow_orchestration.md` (supervisor-verify gate), `reference_ci_flakes.md` (W1b PROD migration)
