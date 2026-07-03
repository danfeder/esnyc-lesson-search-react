# Frontend/UX Review Re-Verification — 2026-07-03

**Source document:** `~/cCode/pr6-overnight-2026-06-12/overnight-review/frontend-ux-review.md` (written 2026-06-12)
**Method:** Every one of the 26 findings re-checked against current code (file:line pointers below are current as of `main` @ `8a8ae25`), plus 5 read-only PROD SQL probes run today (703 live lessons).

## Plain-language summary

The old review found 9 serious problems (P1s) and 17 smaller ones. The good news: **almost everything serious has been fixed** in the waves of work since mid-June. All four broken search-page behaviors (mobile filters, keyboard access, the Sort dropdown, the false "No matches" flash) are fixed and verifiable in the current code — several fixes even cite the review's own finding numbers in code comments. The broken "Unknown" lessons were deleted, reviewers can now edit the title and summary, and the giant review page was split into clean pieces.

What's still open falls into three buckets:

1. **One real search bug that survived everything:** about 74 lessons carry old-style theme labels (like `seed-to-table` instead of "Seed to Table"), which makes them **invisible to the Thematic Categories filter** and makes those raw machine-labels show on the public lesson drawer. This is the sharpest remaining issue.
2. **Two known content gaps:** 65 lessons still have no summary text (the reviewer tool now prevents new ones, but the old ones weren't backfilled), and the sidebar filter counts still only count the lessons loaded on screen, not the whole library.
3. **A tail of polish items** (raw error text, dead code left behind by the July redesigns, the internal submission pages not matching the design system, etc.) — none of them break anything for the ~3 logged-in users or for public searchers.

**Scorecard: 12 findings fully FIXED, 2 OBSOLETE (the surface was removed), 12 still open in some form (2 at P2, 10 at P3) — plus 2 new small findings surfaced by this re-check.**

---

## Part 1 — The four headline P1s (deep verification)

### 1. Mobile filters unreachable (orig. 3.1) — **FIXED**
- The base `.int-mobile-filter-btn { display:none }` rule now sits **before** the `<768px` media override, with a comment explaining exactly this cascade bug and citing the finding number: `src/styles/internal.css:533-537` ("MUST precede the <768px @media override below… (C57)"), override at `internal.css:576-578`.
- The trigger is now a real component (`src/components/Internal/IntMobileFilterButton.tsx`), rendered from the toolbar (`IntToolbar.tsx:4`), opening a dedicated `IntMobileFilterDrawer` wired in `src/pages/SearchPage.tsx:258-262`.
- Fixed by Theme B W1a PR1 (`19d99b7`, "public broken-windows CSS + a11y + facets").
- **Confidence: high** (code-verified; not browser-tested in this pass).

### 2. Filter checkboxes keyboard/SR-inaccessible (orig. 3.2) — **FIXED**
- `display:none` replaced with the exact visually-hidden clip pattern the review prescribed: `src/styles/internal.css:211-222` (sr-only clip keeps inputs focusable and in the AX tree), plus the requested focus ring `internal.css:224-227` (`.int-check input:focus-visible + .int-check-box { outline: 2px solid … }`).
- Inputs are real `<input type="checkbox">` elements: `src/components/Internal/IntSidebar.tsx:93-98`.
- Fixed by W1a PR1 (`19d99b7`).
- **Confidence: high**.

### 3. Sort dropdown no-op (orig. 3.3) — **FIXED end-to-end**
- SearchPage passes `sortBy: viewState.sortBy` into the hook (`src/pages/SearchPage.tsx:66`); the hook forwards it as the RPC's `order_by` param (`src/hooks/useLessonSearch.ts:16,107,154-156`) and includes it in the queryKey (`useLessonSearch.ts:122`).
- The RPC accepts and applies it: `supabase/migrations/20260629010000_c41_pr_d_two_pass_relax.sql:181` (`order_by text DEFAULT 'relevance'`), with a normalized `sort_key` (line 204) and conditional ORDER BY (lines 404-411). The dead "grade" option was removed from the dropdown (`IntToolbar.tsx:23-25` comment).
- Fixed by W1b PR3a/PR3b (`3c592b1` migration + `5197069` client wiring, "C58").
- **Confidence: high**.

### 4. Split view dead-end <1100px (orig. 3.4) — **FIXED**
- `SearchPage.tsx:95-104`: `useMediaQuery('(min-width: 1100px)')` coerces the *effective* view to list when narrow (stored preference untouched, so wide screens restore split), and the drawer renders whenever `!isSplit` (`SearchPage.tsx:254-256`). The Split option itself is hidden below 1100px via `allowSplit={isWide}` (`SearchPage.tsx:131`). Code comments cite "§3.4" — the review's own section number.
- **Confidence: high**.

### 5. No loading state / false "No matches" flash (orig. 3.5) — **FIXED**
- `useLessonSearch.ts:175`: `placeholderData: keepPreviousData` (exactly the prescribed fix); `SearchPage.tsx:163-167` branches on `isPending` to a skeleton (`IntListSkeleton`) so cold load never shows the contradictory empty state. Pagination, the SR announcer, and the suggestions panel are all additionally gated on `isPlaceholderData` (`SearchPage.tsx:86,112,197-198,231`). URL hydration is also gated so shared links don't fire a premature empty-filter query (`SearchPage.tsx:43-49,70`).
- Fixed by W1a PR2 (`530b253`, "C59").
- **Confidence: high** (code-verified; deterministic).

### 6. Ghost rows + duplicates on page 1 (orig. 3.6) — **FIXED**
- The 3 "Unknown" rows were **deleted** by `supabase/migrations/20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql` (snapshot table + guarded delete + fail-loud assert). PROD probe today: **0 rows** with `title='Unknown'` among 703 live lessons.
- No-query ordering now has deterministic tiebreakers: `…c41_pr_d_two_pass_relax.sql:409-410` (`sub.title ASC, sub.lesson_id ASC`).
- The duplicate corpus was swept in T4c (PR #577, 61 user-approved retires; RPC excludes `retired_at IS NOT NULL` rows at `…c41_pr_d…sql:268`). 3 live Fattoush lessons remain — these are the known deliberate keeps (designed-companion/"third state" lessons, adjudicated in the T4 walkthrough), not an oversight.
- **Confidence: high** (migration + PROD probe).

---

## Part 2 — Remaining P1s from the original

### 7. Reviewer can't see/edit summary (orig. 3.7) — **FIXED (flow); backfill residual STILL-REAL**
- The reviewer form now has editable Title + Summary fields: `src/components/Review/ReviewMetadataForm.tsx:78-95`, persisted server-side by `supabase/migrations/20260702000000_complete_review_atomic_reviewer_title.sql` (T2b, July 2).
- **Residual:** PROD probe today: **65 of 703 live lessons still have empty `summary`** — the historical backfill never ran (was 86/105 pre-dedup; dedup retired some). Public cards/list rows render `lesson.summary` directly (`IntListRow.tsx:68`), so these 65 show blank description lines.
- Residual severity: **P2 (degraded)** / effort **M** (needs a content-generation or extraction pass, not a code fix) / **confidence: high** (PROD probe 2026-07-03).

### 8. ReviewDetail monolith + dead decomposition (orig. 3.8) — **FIXED (core); dead-code residual STILL-REAL**
- `src/pages/ReviewDetail.tsx` is now **508 lines** (was 1451), decomposed into `ReviewMetadataForm` / `ReviewDecisionPanel` / `ReviewDocPanel` / `ReviewSearchPanel` (W5 PRs #552-#555) plus the T4b decision-panel reshape (`9e0cc4e`, five-option one-decision list — `ReviewDecisionPanel.tsx:62-67`). Logic lives in tested helpers (`useReviewSubmission.ts`, `reviewDetailHelpers.ts`, etc.).
- **Residual:** of the dead trio, `ReviewDuplicates` was deleted (T4b), but **`ReviewActions.tsx` and `ReviewContent.tsx` are still dead code** — exported from `src/components/Review/index.ts:8-9` with zero consumers anywhere in `src` (grep-verified), and `ReviewActions` still encodes the pre-T4b decision model, actively misleading next to the new five-option panel.
- Residual severity: **P3 (polish)** / effort **S** (delete two files + two export lines) / **confidence: high**.

### 9. Free-text CreatableSelect on drift fields (orig. 3.9) — **MOSTLY FIXED; one field residual**
- 4 of the 5 flagged fields are now closed selects with in-code rationale: mainIngredients (`ReviewMetadataForm.tsx:247-249`), cookingSkills (:275-277), gardenSkills (:309-311), observancesHolidays (:341-343) — matching the closed C02/PR-6e vocabularies + DB CHECKs (`filterDefinitions.ts:178-232`).
- **Residual:** `culturalHeritage` is still a `CreatableSelect` (`ReviewMetadataForm.tsx:213`). This may be deliberate — the heritage vocab/worksheet track is still in flight (`docs/plans/heritage-worksheet-form/`) — but until heritage closes, reviewer-typed heritage values can drift.
- Residual severity: **P3** / effort **S** (once the heritage vocab locks) / **confidence: high** on the code fact, **medium** on whether it's intentional.

---

## Part 3 — P2 findings

### 10. No URL state (orig. 4.1) — **MOSTLY FIXED; lesson deep-link residual**
- W1c (`9eb1b6e`) shipped two-way URL↔store sync for query + filters + sort: `src/hooks/useUrlSync.ts` + `src/utils/urlParams.ts`, hydration-gated first query (`SearchPage.tsx:43-49`). Searches and filtered sets are now shareable/bookmarkable/refresh-surviving.
- **Residual:** the *open lesson* is still non-shareable — `selectedLesson` is plain component state (`SearchPage.tsx:51`), no `?lesson=` param, and `App.tsx:111-116` still has no `/lesson/:id` route; Back still closes the tab rather than the drawer.
- Residual severity: **P3** (nice-to-have for a shared library; core sharing need met) / effort **M** / **confidence: high**.

### 11. Location "Both" filter trap (orig. 4.2) — **FIXED (semantics); declaration mismatch residual**
- Server-side Both-expansion shipped: `_match_location` helper (`supabase/migrations/20260620000000_search_lessons_w1b.sql:137`), used in every pass of the current RPC (`…c41_pr_d…sql:253-255,297-299,387-389`). Selecting Indoor no longer drops the "Both" lessons.
- **Residual:** `filterDefinitions.ts:43` still declares location `type:'single'` while `IntSidebar.tsx:13-22` renders it in `CHECKBOX_KEYS` with multi-toggle semantics (`searchStore.ts:154-171`). Harmless in practice (multi-select of a 3-value facet with Both-expansion is coherent), but the declared type and project CLAUDE.md ("Location is single-select") contradict the rendered control.
- Residual severity: **P3** / effort **S** / **confidence: high**.

### 12. Facet counts misleading (orig. 4.3) — **PARTIALLY FIXED; core claim STILL-REAL**
- Fixed parts: Cooking Methods badge case-mismatch (option values now kebab to match stored data — `filterDefinitions.ts:160-167`); tags facet removed entirely (W1c); heritage counts now slug-keyed and ancestor-aware (`facetCounts.ts:101-135`); activityType noun→slug mapping (`facetCounts.ts:36-41`).
- **Still real:** counts are still computed **from loaded pages only** — `SearchPage.tsx:73-75` feeds the flattened loaded pages into `useFacetCounts` (`facetCounts.ts:146-167`). With a 20-row first page over a 703-lesson corpus, badges show misleadingly tiny numbers that grow as you scroll. Zero still renders as blank (`IntSidebar.tsx:101`, `count || ''`).
- Severity: **P2 (degraded — actively misleads public filter use)** / effort **M** (server-side counts RPC) or **S** (remove badges until truthful) / **confidence: high**.

### 13. A11y batch: phantom announcement, nested mains, unnamed dialog (orig. 4.4) — **FIXED (all three)**
- (a) Announcer now checks `.length` on every array incl. cookingMethods (`ScreenReaderAnnouncer.tsx:44-45`), so "All filters cleared" is reachable and no phantom "cooking method:" reads. Also gains a `suppressed` gate against stale counts (:27).
- (b) Single `<main>` in `App.tsx:108`; SearchPage now uses `div#main-content` (`SearchPage.tsx:117`).
- (c) Lesson dialog has an accessible name: `DialogTitle` with the lesson title (`IntLessonDrawer.tsx:41`).
- **Confidence: high**.

### 14. Display-layer label hygiene (orig. 4.5) — **PARTIALLY FIXED; sharpened — see NEW-A**
- Fixed/absorbed parts: cookingSkills/mainIngredients/gardenSkills/observances are stored as Title-Case canonical values post-rebuild (so those rows read fine verbatim); the list row shows only the first heritage value, label-mapped (`IntListRow.tsx:48,86`); grade arrays on PROD are now canonically ordered (probe today: only **1** of 703 rows out of order), so "1–PK"-style ranges are effectively gone even though `intGradesLabel` (`IntListRow.tsx:22-26`) is still order-naive.
- **Still real (display):** `MetaRow` renders values verbatim with only culturalHeritage label-mapped (`IntLessonDetail.tsx:59-73`): the drawer shows raw `basic-prep` / `stovetop` / `oven` (all PROD cookingMethods are kebab — probe today) and raw kebab themes for the drifted rows; heritage ancestry chains still stack as multiple tags — **56 live lessons** store a child+parent pair (probe today).
- Severity: **P3 (display polish)** / effort **S** (map through `ALL_FIELD_CONFIGS` labels + kebab→Title fallback in MetaRow; collapse ancestry to most-specific) / **confidence: high**. The *filter* consequence of the same drift is the more serious NEW-A below.

### 15. Invisible OR-based search expansion (orig. 4.6) — **CORE FIXED; transparency residual**
- The OR-soup semantics were replaced by AND-of-OR-groups with a two-pass relax (W6: `20260629000000_c41_and_of_ors_term_combination.sql` + `20260629010000_c41_pr_d_two_pass_relax.sql`), plus the taste-test collocation carve-out (`20260701000000…`). Multi-word precision is the shipped, PROD-verified behavior.
- **Residual:** synonym expansion is still invisible — `expandedQuery` is captured (`useLessonSuggestions.ts:73`) and never rendered; no "Including matches for tomato" hint anywhere in `src`.
- Residual severity: **P3** / effort **S** / **confidence: high**.

### 16. "LESSON LIBRARY · INTERNAL" wordmark (orig. 4.7) — **FIXED**
- `src/components/Layout/Header.tsx:69` now reads `<small>Lesson Library</small>`; no "INTERNAL" string remains in the header.
- **Confidence: high**.

### 17. Toolbar overflow <768px (orig. 4.8) — **FIXED**
- Mobile block now wraps both the toolbar and its right cluster: `internal.css:589-605` (`flex-wrap` on `.int-toolbar` and `.int-toolbar-right`, with a comment citing "§4.8").
- **Confidence: high** (code-verified; not pixel-tested in this pass).

### 18. No review drafts / batch navigation (orig. 4.9) — **STILL-REAL (downgraded)**
- No draft persistence in the current review flow: zero `localStorage` use in `ReviewDetail.tsx` / `useReviewSubmission.ts` / the Review panels (grep-verified; only `GoogleDocEmbed`'s one-time hint flag uses it). No prev/next queue navigation; save still exits to `/review`. The `AdminDuplicateReview` component that modeled the pattern was itself removed in T4b.
- Given the audience reality (~3 internal reviewers, no collisions, low queue volume) this is a workflow convenience, not a breakage.
- Severity: **P3** (was P2) / effort **S-M** / **confidence: high**.

### 19. AI-draft provenance invisible (orig. 4.10) — **STILL-REAL (downgraded)**
- `computeInitialMetadataFromAiDraft` still silently seeds the form (`useReviewSubmission.ts:436-438`); `ai_draft_model` / `ai_draft_generated_at` exist only in `database.types.ts` — never selected or rendered (grep-verified across `src`).
- Severity: **P3** (was P2; the T4b decision panel now surfaces duplicate *evidence*, and reviewers are 3 trusted internals) / effort **M** / **confidence: high**.

### 20. Teacher "My submissions" rows untitled (orig. 4.11) — **FIXED**
- `UserProfile.tsx:561-562` renders `extracted_title || 'Untitled submission'` as the row heading, and T3b added the in-row Resubmit button (`UserProfile.tsx:165-176, 592-595`) with per-id in-flight state. (The T5 tracker's "browser-click the resubmit button" smoke residual is a launch-checklist item, not a code finding.)
- **Confidence: high**.

### 21. ReviewDashboard unpaginated `select('*')` (orig. 4.12) — **PARTIALLY FIXED; core STILL-REAL (downgraded)**
- Still `select('*')` on `lesson_submissions` with no range/limit (`ReviewDashboard.tsx:139-141`), pulling full `extracted_content` for every submission ever. Fixed part: it now prefers the real `extracted_title` with the regex fallback demoted (`ReviewDashboard.tsx:237-240`).
- With ~114 submissions total and 3 users, this is a perf smell, not a felt problem.
- Severity: **P3** (was P2) / effort **S** / **confidence: high**.

### 22. Design-system drift (orig. 4.13) — **STILL-REAL**
- The submission flow remains raw Tailwind: `NewSubmissionForm.tsx` / `SubmissionPage.tsx` / `RevisingSubmissionForm.tsx` have essentially zero `adm-*`/`int-*` classes (grep counts 1/0/1) vs. `bg-green-50 border-green-200`-style utility soup. `SubmitterIntentBanner.tsx:47-77` is raw Tailwind rather than `IntAlert`. `LessonSearchPicker.tsx` still carries off-system styling (emerald/blue palette, `focus:ring-blue-500`).
- Severity: **P3** (internal-only surfaces; teachers see the submission flow but it's functional) / effort **S-M** (class swaps) / **confidence: high**.

---

## Part 4 — P3 findings

### 23. "Lesson Type" taxonomy + badge/filter mismatch (orig. #23) — **HALF OBSOLETE, HALF STILL-REAL**
- The vestigial "Lesson Type" (tags) facet was retired repo-wide in W1c (`9eb1b6e`) — that half is **obsolete**.
- **Still real:** the card/list activity badge is derived from skills presence (`intActivityLabel`, `IntListRow.tsx:13-19` — cookingSkills/gardenSkills → "Cook"/"Grow"/"Cook + Grow"/"Academic") while the Activity Type *filter* queries the stored `activityType` field (`useLessonSearch.ts:146`; values cooking-only/garden-only/academic-only/craft-only). A lesson can be badged "Cook" yet not match the "Cooking" filter, and "Craft" has no badge at all. Stakeholder-gated per CLAUDE.md.
- Severity: **P3** / effort **S** (render from `activityType` once stakeholders bless) / **confidence: high**.

### 24. Raw error text + unreachable "no-cook" lessons (orig. #24) — **HALF STILL-REAL, HALF OBSOLETE**
- **Still real:** raw `error.message` from Supabase renders in the public error state (`SearchPage.tsx:148-160`).
- **Obsolete:** "no-cook" no longer exists — PROD probe today: **0** live rows carry `no-cook`; the cookingMethods vocab was rebuilt to exactly {basic-prep, stovetop, oven}.
- Severity: **P3** / effort **S** / **confidence: high**.

### 25. Focus outline / "No more results" noise / duplicated helper (orig. #25) — **MOSTLY FIXED; one residual**
- Search-input focus: `internal.css:75` still sets `outline: none` but now swaps `border-color` to green on focus — a visible (if low-contrast) indicator, and W1a PR2 shipped form/picker focus work. Effectively fixed; flag only if an axe audit scores the border swap insufficient.
- `countActiveFilters` duplication: gone — single definition (`SearchPage.tsx:26`).
- **Still real:** "No more results to load" renders whenever `!hasMore` (`InfiniteScrollTrigger.tsx:57-60`), including single-page result sets where it's pure noise.
- Severity: **P3** / effort **S** / **confidence: high**.

### 26. Reuse AdminDuplicateReview building blocks for Phase-2 (orig. #26) — **OBSOLETE**
- The AdminDuplicates/AdminDuplicateReview pages were **removed** in T4b (`9e0cc4e`); their intent (evidence cards + sticky one-decision bar) was rebuilt natively into `ReviewDecisionPanel` (D7 five-option list). The design note has been consumed by events.
- **Confidence: high**.

---

## Part 5 — NEW findings surfaced by this re-verification

### NEW-A. ~74 lessons invisible to the Thematic Categories filter (kebab theme drift)
- **What:** the `lessons.thematic_categories` column on PROD still holds both vocab regimes. PROD probes today (live rows only): kebab-only rows with no Title-Case twin in the same array — `seed-to-table` 29, `garden-basics` 24, `garden-communities` 16, `ecosystems` 12, `plant-growth` 5, `food-systems` 4, `food-justice` 4 (≈74 distinct rows; some carry two kebab values).
- **Why it matters:** the RPC filters themes by **exact array overlap** (`…c41_pr_d_two_pass_relax.sql:245-246`, `l.thematic_categories && filter_themes`) and the UI sends Title-Case values (`filterDefinitions.ts:78-86`), so all ~74 lessons silently never match any theme filter (~10% of the corpus). Same drift also splits the sidebar facet buckets (badge undercounts) and puts raw `seed-to-table`-style strings on the public drawer (`IntLessonDetail.tsx:63`).
- **Fix shape:** a one-off data normalization migration (kebab → canonical Title-Case, 7 value pairs), or a `_match_themes` normalizing helper in the RPC mirroring `_match_location`. Data fix is cleaner and also fixes display + facets. This is the residue of the known vocabulary-drift backlog — thematicCategories was apparently never swept the way cooking_skills/main_ingredients (C02) and the small fields (PR 6e) were.
- Severity: **P2 (degraded — silent recall loss on a public filter)** / effort **S** (guarded data migration) / **confidence: high** (PROD probes 2026-07-03, queries in this doc's history).

### NEW-B. Post-redesign dead exports
- **What:** three components are exported but have zero consumers (grep-verified across `src`, tests excluded):
  - `ReviewActions` / `ReviewContent` — `src/components/Review/index.ts:8-9` (pre-T4b leftovers; `ReviewActions` encodes the retired 4-decision model);
  - `IntMetadataDiff` — `src/components/Internal/index.ts:45,50-51` — newly orphaned when T4b deleted its only consumer (AdminDuplicateReview).
- **Why it matters:** the old review's "dead decomposition misleads explorers" point, recreated one layer down; `ReviewActions` in particular contradicts the shipped decision model.
- Severity: **P3** / effort **S** (delete 3 files + exports + their tests) / **confidence: high**.

---

## Verdict table

| # | Original finding | Verdict | Residual severity/effort |
|---|---|---|---|
| 1 | Mobile filters unreachable | **FIXED** (W1a `19d99b7`, C57) | — |
| 2 | Checkbox a11y | **FIXED** (W1a `19d99b7`) | — |
| 3 | Sort no-op | **FIXED** (W1b `3c592b1`+`5197069`, C58) | — |
| 4 | Split-view dead-end | **FIXED** (§3.4 coercion in SearchPage) | — |
| 5 | No loading state | **FIXED** (W1a PR2 `530b253`, C59) | — |
| 6 | Ghost rows / dup on page 1 | **FIXED** (wave4 PR2 delete + t4c dedup) | — |
| 7 | No reviewer summary field | **FIXED** (T2b) / backfill **STILL-REAL** | P2 / M — 65 empty summaries |
| 8 | ReviewDetail monolith | **FIXED** (W5 + T4b) / dead code **STILL-REAL** | P3 / S — ReviewActions, ReviewContent |
| 9 | CreatableSelect drift fields | **MOSTLY FIXED** | P3 / S — culturalHeritage still creatable |
| 10 | No URL state | **MOSTLY FIXED** (W1c) | P3 / M — no lesson deep-link |
| 11 | Location "Both" trap | **FIXED** (W1b `_match_location`) | P3 / S — single/multi declaration mismatch |
| 12 | Facet counts misleading | **PARTIAL** | **P2** / M — still loaded-pages-only |
| 13 | SR phantom / nested main / dialog name | **FIXED** (all 3) | — |
| 14 | Raw vocab / grades / ancestry display | **PARTIAL** | P3 / S — kebab in drawer, 56 stacked chains |
| 15 | OR-search semantics | **FIXED** (W6 C41) / transparency residual | P3 / S — expandedQuery unsurfaced |
| 16 | "· INTERNAL" wordmark | **FIXED** | — |
| 17 | Toolbar overflow | **FIXED** (§4.8) | — |
| 18 | No drafts / batch nav | **STILL-REAL** | P3 / S-M (audience ~3 reviewers) |
| 19 | AI provenance invisible | **STILL-REAL** | P3 / M |
| 20 | Untitled "My submissions" | **FIXED** (T3b) | — |
| 21 | Dashboard `select('*')` | **PARTIAL** | P3 / S |
| 22 | Design-system drift | **STILL-REAL** | P3 / S-M |
| 23 | Lesson-Type taxonomy | **HALF OBSOLETE** | P3 / S — badge≠filter field (stakeholder-gated) |
| 24 | Raw error text / no-cook | **HALF OBSOLETE** | P3 / S — raw `error.message` remains |
| 25 | Focus ring / noise / dup helper | **MOSTLY FIXED** | P3 / S — "No more results" on single-page sets |
| 26 | Reuse AdminDuplicateReview blocks | **OBSOLETE** (T4b removed the surface) | — |
| A | *(new)* Kebab theme drift blocks filter | **NEW** | **P2** / S — ~74 lessons unreachable via theme filter |
| B | *(new)* Dead exports post-T4b | **NEW** | P3 / S |

## Honest gaps of this re-verification
- Code + PROD-data verification only; no browser/E2E pass in this session (the mobile button, toolbar wrap, and focus styles were verified in source, not rendered).
- The 65 empty-summary rows were not traced to submission-vs-import provenance (the backfill scoping query from the original is still unrun).
- Whether `culturalHeritage` staying creatable is deliberate (pending heritage worksheet track) was not confirmed with the owner.
