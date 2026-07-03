# L1 Audit — "The counts next to each filter are definitely not accurate"

**Date:** 2026-07-03 · **Scope:** read-only deep-dive (no code or data changed)
**DB evidence:** TEST project `rxgajgmphciuaqzvwmox` (685 active / 78 retired lessons). PROD has ~703 active lessons, so exact numbers there will differ slightly, but the *shape* of every finding is structural, not data-luck.

---

## Plain-language summary (for the owner)

**You're right, and it's worse than a rounding error.** The little numbers next to each filter are counted from **only the lessons the page has downloaded so far** — the first 20 results — not from the whole library. So on a fresh page load, "Cooking" shows something like **13** when the true answer is **386**. The numbers also *grow as you scroll* (because more lessons get downloaded), which is why they feel random.

Two smaller problems make it worse:

1. **"Indoor" undercounts on purpose-built logic mismatch.** The search engine correctly treats lessons tagged "Both" (indoor *or* outdoor) as matching "Indoor" — but the badge counter doesn't. Even if we fixed the main bug, Indoor would show 409 instead of 592.
2. **A real data bug we found along the way:** 66 lessons have their Thematic Category stored in the wrong format (`seed-to-table` instead of `Seed to Table`). These lessons are invisible to the Thematic Category filter itself — filtering "Seed to Table" silently misses ~26 lessons. This is a search-results bug, not just a badge bug, and it's fixable with a small one-time data cleanup.

Everything else we suspected (the activity-type name remapping, the cultural-heritage family-tree expansion, retired lessons leaking in) checked out **clean** — verified against the real database.

**Recommended fix:** have the database compute the badge numbers (it already knows how to filter — the counting query is nearly identical), instead of counting in the browser. One new read-only database function + a small frontend hook. Details and alternatives in §5.

---

## 1. Confirmed root cause (the scaffold hypothesis is CORRECT)

**Severity: P1 (user-breaking — the numbers are wrong on every page load) · Effort to fix: M · Confidence: HIGH**

### Data flow trace

| Step | Where | What happens |
|---|---|---|
| 1 | `src/hooks/useLessonSearch.ts:121-178` | Infinite query calls the `search_lessons` RPC, **20 rows per page** (`searchStore.ts:76` → `resultsPerPage: 20`), pages accumulate only as the user scrolls (`getNextPageParam`, lines 128-131) |
| 2 | `src/pages/SearchPage.tsx:73` | `const lessons = (data?.pages \|\| []).flatMap((p) => p.lessons)` — **only the pages fetched so far** |
| 3 | `src/pages/SearchPage.tsx:75` | `const counts = useFacetCounts(lessons)` — tallies that partial list (`src/utils/facetCounts.ts:146-159`) |
| 4 | `src/pages/SearchPage.tsx:115, 261` | `counts` passed to `<IntSidebar>` and `<IntMobileFilterDrawer>` (which just wraps IntSidebar — `IntMobileFilterDrawer.tsx:51`) |
| 5 | `src/components/Internal/IntSidebar.tsx:91, 101` | Badge renders `counts[key][opt.value] ?? 0`, displayed as `{count \|\| ''}` — zero shows as **blank** |
| 6 | `src/components/Internal/IntCulturalHeritageSection.tsx:33, 48` | Same pattern for the heritage tree |

Meanwhile the toolbar's total (`SearchPage.tsx:74`, `IntToolbar` line 120) comes from the RPC's `total_count` — the **full** filtered corpus. So the UI simultaneously says "685 lessons" and badges that sum to ≤20. That contradiction is what the owner is seeing.

### Smoking-gun measurement (TEST DB, default landing view: no query, no filters, first page of 20)

Simulated by calling the real RPC (`SELECT * FROM search_lessons(page_size => 20)`) and tallying its rows exactly the way `computeFacetCounts` does, vs. the count the filter would actually return when clicked:

| Facet value | Badge shows (page 1) | Truth (clicking the filter) | Off by |
|---|---:|---:|---:|
| Activity Type: Cooking | 13 | 386 | 30× |
| Location: Indoor | 10 | 592 | 59× |
| Season: Fall | 7 | 359 | 51× |
| Theme: Seed to Table | 12 | 387 | 32× |
| SEL: Relationship skills | 15 | 492 | 33× |
| Cultural Heritage: Asian | 3 | 67 | 22× |

And the numbers **change as you scroll** (each new page of 20 re-runs the tally over a bigger list), so they never look stable either.

**Verdict: CONFIRMED.** This is the bug the owner is reporting.

---

## 2. Second-order candidates — checked against the real DB

### 2a. `activityType` noun→slug remap (`facetCounts.ts:36-41, 64`) — **REFUTED as a bug**

- TEST DB column `activity_type` contains **exactly** the four bare nouns the map covers: `cooking` (386), `garden` (274), `craft` (128), `academic` (53). No `both`, no strays.
- 0 active lessons have an empty `activity_type` column with a leftover `metadata->'activityType'` key (so no stale-JSON leakage through the RPC's metadata reconstruction at `20260629010000_c41_pr_d_two_pass_relax.sql:339-354`).
- Server aliasing (`_alias_activity_type`, `20260513000000_alias_activity_type_add_craft.sql:37-57`) maps `cooking-only → {cooking-only, cooking}`; the client maps the same pair in reverse. Symmetric. **Confidence: HIGH.**

### 2b. Heritage ancestry expansion (`facetCounts.ts:118-135` + `heritageAncestry.generated.ts`) — **REFUTED as a bug**

- All **68 distinct** stored heritage labels on TEST are present in `aliasToSlug` (verified label-by-label). No phantom values, no leftover slug-form stragglers.
- Client ancestor chains mirror the server's recursive expansion exactly. Spot check "Asian": server `expand_cultural_heritage(_alias_cultural_heritage(ARRAY['asian']))` returns the same 15-node set {Asian, East Asian, South Asian, Southeast Asian, Central Asian, Chinese, Japanese, Korean, Taiwanese, Indian, Pakistani, Sri Lankan, Malaysian, Vietnamese, Uzbek} that the client's `ancestorsBySlug` produces; both count **67** lessons at full corpus.
- No hierarchy double-count: `tallyHeritage` unions per-lesson slugs into a `Set` first (`facetCounts.ts:120-131`), so a lesson tagged Chinese + Japanese credits `asian` once — matching the server's array-overlap semantics. **Confidence: HIGH.**

### 2c. Retired-lesson leakage — **REFUTED**

All three passes of `search_lessons` (relax-count, total-count, page query) end with `AND l.retired_at IS NULL` (`20260629010000_...sql:268, 312, and the page WHERE`). Badges only ever tally RPC rows, so the 78 retired lessons can't leak into the counts. **Confidence: HIGH.**

### 2d. `cookingMethods` — clean

Column values are exactly the three sidebar option slugs: `basic-prep` (380), `stovetop` (143), `oven` (91). The 297 rows with an empty column but a `metadata->'cookingMethods'` key all hold **empty arrays** (`jsonb_typeof = 'array'`, zero elements), which `normalizeMetadata` (`useLessonSearch.ts:56`) turns into `[]` — no leakage. Only the §1 partial-page problem applies. **Confidence: HIGH.**

---

## 3. NEW findings surfaced by the DB probes

### F2 — Thematic Categories kebab drift: 66 lessons invisible to the filter itself

**Severity: P2 (degraded search results — bigger than a badge issue) · Effort: S (one-time data normalization) · Confidence: HIGH on TEST; re-verify on PROD before fixing**

The `thematic_categories` **column** contains both vocabularies:

| Kebab value | rows | Title-Case twin | rows |
|---|---:|---|---:|
| `seed-to-table` | 26 | `Seed to Table` | 387 |
| `garden-basics` | 23 | `Garden Basics` | 190 |
| `garden-communities` | 12 | `Garden Communities` | 86 |
| `ecosystems` | 9 | `Ecosystems` | 121 |
| `plant-growth` | 5 | `Plant Growth` | 166 |
| `food-systems` | 4 | `Food Systems` | 324 |
| `food-justice` | 3 | `Food Justice` | 82 |

**66 distinct active lessons** carry a kebab tag with **no** Title-Case twin on the same row. Consequences:

- The server filter is a verbatim case-sensitive overlap (`l.thematic_categories && filter_themes`, `20260629010000_...sql:289-290`) and the sidebar sends Title-Case values (`filterDefinitions.ts:78-86`) — so filtering "Seed to Table" **misses those 26 lessons entirely**.
- The client badge tallies verbatim (`facetCounts.ts:67-68`) — same miss.

Unlike every other finding, this one changes **which lessons users find**, not just the number on the badge. Fix is a small data UPDATE (kebab → Title Case) — a data change per the migration guide, doable via MCP after PROD re-verification, ideally followed by a CHECK constraint so it can't drift again.

### F3 — Location "Both" subsumption not mirrored in badges

**Severity: P2 · Effort: S (falls out for free with fix Option A) · Confidence: HIGH**

Server: `_match_location` (`20260620000000_search_lessons_w1b.sql:137-163`) expands the filter Indoor→{indoor, both}, Outdoor→{outdoor, both}, case-insensitively. Client: verbatim tally of `locationRequirements` (`facetCounts.ts:65-66`).

TEST truth: Indoor filter matches **592** (409 `Indoor` + 183 `Both`); Outdoor matches **276** (93 + 183). A fetch-everything badge would still show 409 / 93. The badge logic structurally understates Indoor/Outdoor by the size of the `Both` population (183 lessons) no matter how many pages load.

### F4 — Badges show "narrowing" numbers for checkboxes that actually widen results

**Severity: P2 (misleading even if F1 were fixed naively) · Effort: M (a semantics decision inside any fix) · Confidence: HIGH**

Within one category, multi-select is OR (server: array-overlap `&&`). But the badge next to an unchecked sibling is tallied from the already-filtered result set. Measured: with **Garden** checked (274 results), the **Cooking** badge computes to **3** (cooking∩garden in the loaded 20) — yet clicking Cooking grows results to **605** (union). A user reads "Cooking (3)", expects 3, gets 605. Standard faceted-search convention is: within a category, count each value *ignoring that category's own selections*; across categories, apply the other filters.

### F5 — Zero renders as blank, hiding "0 here but plenty in the library"

**Severity: P3 · Effort: S · Confidence: HIGH**

`IntSidebar.tsx:101` and `IntCulturalHeritageSection.tsx:48` render `{count || ''}`. With partial-page counting, most badges show *nothing at all* on first load (see §1 table — e.g. any heritage not in the first 20 rows), which reads as "no lessons of this kind exist."

### F6 — Stale badge window during refetch

**Severity: P3 (transient) · Effort: S · Confidence: HIGH**

`useLessonSearch.ts:175` uses `placeholderData: keepPreviousData`. While a filter/keystroke refetch is in flight, `data.pages` still holds the *previous* query's rows, so badges (and their tallies) belong to the previous search until the new page resolves. SearchPage already gates the list and scroll trigger on `isPlaceholderData` (`SearchPage.tsx:86, 231`) but passes stale `counts` to the sidebar unguarded (`SearchPage.tsx:115`).

### F7 — Housekeeping (P3, S each)

- `SearchPage.tsx:73` builds a **new** `lessons` array every render (`flatMap`), so the `useMemo` in `useFacetCounts` (`facetCounts.ts:165-167`) re-tallies on every render, not just on data changes. Perf-only at 700 rows.
- `gradeLevels` counts are computed (`facetCounts.ts:59-60`) but never displayed — the grade pills render no badge (`IntSidebar.tsx:58-75`). Dead computation; also means Grade is already living without counts (a data point for Option C below).

---

## 4. Complete inventory: every way the displayed count can diverge from truth

| # | Mechanism | Status | Where |
|---|---|---|---|
| 1 | **Partial pages** — tally over ≤N loaded rows vs full filtered corpus; numbers grow while scrolling | **CONFIRMED, dominant** | SearchPage.tsx:73-75 |
| 2 | Zero displayed as blank (reads as "none exist") | Confirmed | IntSidebar.tsx:101 |
| 3 | Same-category badges show intersection while clicking unions (OR multi-select) | Confirmed | facetCounts + RPC `&&` semantics |
| 4 | Location Both-subsumption applied by server filter, not by badge tally | Confirmed (183-lesson gap) | facetCounts.ts:65 vs \_match_location |
| 5 | Theme kebab drift: 66 lessons match neither badge nor filter | Confirmed (data bug) | lessons.thematic_categories |
| 6 | Stale previous-query rows during refetch (keepPreviousData) | Confirmed (transient) | useLessonSearch.ts:175 |
| 7 | Loose-OR "relax" pass can swap in a broader result set when a query is scarce (<10 strict hits) — badges then tally the relaxed set; consistent with what's shown, but counts can exceed what the visible strict interpretation suggests | By design; note only | 20260629010000\_...sql:270-272 |
| 8 | activityType slug remap misses | Refuted (DB verified) | — |
| 9 | Heritage alias/ancestry misses or double-counts | Refuted (DB verified) | — |
| 10 | Retired-lesson leakage into badges | Refuted (RPC excludes) | — |
| 11 | Legacy `metadata` JSONB leaking stale values where columns are empty | Refuted for all 10 facet fields (only non-empty case was `cookingMethods`, all empty arrays) | — |

---

## 5. Fix options, in plain language

### Option A — Let the database count (server-side facet RPC). **Recommended.**

A new read-only function, e.g. `facet_counts(...)`, taking the **same filter arguments** as `search_lessons` and returning `(category, value, count)` rows. It reuses the exact WHERE clause the search already has (including `_match_location`, `_alias_activity_type`, heritage expansion, `retired_at IS NULL`), then does `unnest + GROUP BY` per facet column — on a ~700-row table this is milliseconds. The frontend gains one small hook (same React Query key ingredients as `useLessonSearch`) and `IntSidebar` doesn't change shape at all — it already takes a `counts` prop.

- Fixes #1, #2 (real zeros become honest zeros), #4 (compute each category's counts ignoring its own selections — the classic behavior), #5-badge-side, and #6 (its own query, no placeholder rows).
- **Tradeoffs:** one migration + CI cycle; the WHERE clause now lives in two functions and must be kept in sync (mitigate: comment-link them, or extract a shared predicate function); one extra RPC call per filter change (cacheable, cheap).

### Option B — Fetch everything, then count in the browser.

Raise the page size to cover the whole corpus (~703 rows) or add a "fetch all for counting" query, then keep the existing client tally.

- Fixes #1 and #2 only. **Does not fix** #4 (union semantics) and #3/#5 would require re-implementing `_match_location`-style logic in the client — more client/server mirror code, which is exactly the kind of duplication that already drifted (F3). Payload is roughly 1-2 MB of JSON per query change; tolerable on desktop, wasteful on mobile, and it grows with the corpus.
- Reasonable as a quick stopgap, wrong as the end state.

### Option C — Drop or reframe the numbers.

Remove badges (Grade Level already lives happily without them), or relabel to something honest like "of loaded results." Zero backend work, ships in an hour, and stops the trust damage immediately.

- **Tradeoff:** for a 700-lesson library the counts are genuinely useful scent ("Winter (317)" vs "Summer (124)"), so this loses real value. Best used as an interim measure *while* Option A is built, if the two can't ship together.

### Independent of the option chosen

- **Fix the F2 data drift** (66 kebab-theme lessons): re-verify on PROD, one UPDATE normalizing the 7 kebab values to Title Case, then a CHECK constraint. This improves *search results*, not just badges, and makes any counting approach more truthful.
- Decide F3 semantics for the "Both" location badge while doing Option A (Indoor = indoor+both is what the filter already does; the badge should say so).

---

## Appendix — evidence provenance

All queries were read-only `SELECT`s against TEST (`rxgajgmphciuaqzvwmox`) on 2026-07-03, run via `mcp__supabase-test__execute_sql`:

1. Corpus + activity vocab: active=685, retired=78; `activity_type` distinct = {cooking 386, garden 274, craft 128, academic 53}; col-empty-with-meta-key = 0.
2. Location/cooking vocab + subsumption: `location_requirements` = {Indoor 409, Both 183, Outdoor 93}; `_match_location(Indoor)` = 592, `(Outdoor)` = 276; `cooking_methods` = {basic-prep 380, stovetop 143, oven 91}; 297 col-empty `cookingMethods` rows all `[]`.
3. Heritage: 68 distinct labels (all present in `aliasToSlug`); `asian` expansion = 15 nodes, truth 67; americas 99, indigenous 47, mexican 34.
4. Page-1 simulation: `search_lessons(page_size => 20)` rows tallied client-style vs full-corpus truth (table in §1).
5. Theme drift: 82 kebab row-appearances; 66 distinct lessons kebab-only (no Title-Case twin on the row).
6. Filter-interaction: garden filter total 274; page-1 cooking badge 3; cooking-alone 386; garden∪cooking 605; garden∩cooking 55.

Key source files: `src/pages/SearchPage.tsx:73-75`, `src/utils/facetCounts.ts`, `src/hooks/useLessonSearch.ts:121-178`, `src/components/Internal/IntSidebar.tsx:91-101`, `src/components/Internal/IntCulturalHeritageSection.tsx:33-48`, `src/utils/heritageAncestry.generated.ts`, `supabase/migrations/20260629010000_c41_pr_d_two_pass_relax.sql` (current `search_lessons`), `20260620000000_search_lessons_w1b.sql:137-163` (`_match_location`), `20260513000000_alias_activity_type_add_craft.sql:37-57` (`_alias_activity_type`).
