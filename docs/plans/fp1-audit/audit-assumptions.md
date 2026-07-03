# FP1 Assumptions Inventory — Frontend Design Concepts

**Date:** 2026-07-03 · **Scope:** read-only audit of the frontend's load-bearing design assumptions, as input to a philosophy review with the product owner.
**Method:** every claim below is anchored to a file/line in the repo as of `main` @ `8a8ae25`. Confidence is stated per finding. Nothing here is a bug report — it's "what the app quietly believes about its users, and whether that's still true."

---

## Plain-language summary

The app was designed around a few big beliefs: that teachers want to *filter* their way to lessons across 10 category checkboxes; that a lesson is best shown as a row/card that opens a side panel (with the real content living in Google Docs); that results should load as you scroll; that submitters can tell us whether their lesson is new or an update; and that logged-in "internal" screens deserve their own design system. Most of these still hold up — the recent work (T2–T5) already fixed the worst gaps. The three things most worth discussing in the philosophy review are:

1. **The little numbers next to filter options are only counted from the results loaded so far** (the first ~20), so they under-count and change as you scroll. Either make them honest or remove them.
2. **A lesson has no address of its own.** You can share a *search*, but not a *lesson* — a teacher who wants to send a colleague one lesson has to send the Google Doc link, which bypasses the library entirely.
3. **The admin area is sized for an organization, but has ~3 users.** Analytics charts about "user growth" over 3 accounts is effort pointed at nobody; the invite/user pages, by contrast, are now load-bearing because the site is invite-only.

Everything else is largely "keep, and write down why."

---

## 1. Filter taxonomy + facet-count badges

### 1a. Ten filter categories as the primary way teachers find lessons

**What it assumes.** Teachers think in ESYNYC's taxonomy — that a teacher looking for a lesson will recognize and use categories like "Core Competencies," "Thematic Categories," and "Social-Emotional Learning," and that 10 categories with ~60 total options is navigable, not overwhelming.

**How it behaves today.**
- The 10 search-facing categories are defined in `src/utils/filterDefinitions.ts:29-169` (`FILTER_CONFIGS`): activityType, location, gradeLevels, thematicCategories, seasonTiming, coreCompetencies, culturalHeritage, academicIntegration, socialEmotionalLearning, cookingMethods. Five more (`METADATA_CONFIGS`, lines 173-286) are reviewer-only and *not* search filters.
- The sidebar renders them in a fixed order: grade pills first (`src/components/Internal/IntSidebar.tsx:58-75`), then 8 checkbox sections (`IntSidebar.tsx:13-22, 77-107`), then the multi-tier Cultural Heritage tree (`src/components/Internal/IntCulturalHeritageSection.tsx:35-57`). Only Grade, Activity Type, and Season start expanded (`IntSidebar.tsx:81`); the other 7 are collapsed behind accordion headers (`IntFilterSection.tsx:17`).
- Free-text search is a separate, parallel path in the header (`src/components/Layout/Header.tsx:182-233`), with grade cues auto-detected from the query (`src/hooks/useLessonSearch.ts:113-119`).

**Does it still hold?** Mostly yes — this taxonomy is ESYNYC's own curriculum language (Core Competencies are the org's six priorities), and the audience is ESYNYC-affiliated teachers, so the vocabulary is *theirs*, not invented. The collapsed-by-default accordions are a good hedge against overwhelm. The open question is internal ordering and salience: is "Cooking Methods" (3 options: basic-prep/stovetop/oven, `filterDefinitions.ts:157-168`) worth a whole category to a teacher, while "Main Ingredients" (70 values, arguably the most teacher-intuitive facet of all — "what can I cook with the cabbage we harvested?") is reviewer-only metadata (`filterDefinitions.ts:175-183`) and only reachable via free-text search? That's a taxonomy-shape question only stakeholders can answer, and the file itself says so (`filterDefinitions.ts:28`).

**Recommendation: keep the structure, revisit the roster with stakeholders.** Specifically ask: (a) does Cooking Methods earn its slot; (b) should Ingredients be promoted to a search facet; (c) is the fixed sidebar order the order teachers actually reach for (grade → activity → season is plausibly right). Tradeoff in plain words: every category added makes each individual category easier to overlook; every removal makes some rare search impossible without typing.

**Severity: P3 (polish) · Effort: M (config change is small; the stakeholder conversation and a possible ingredients facet in the RPC are the work) · Confidence: high** (on behavior) / medium (on what teachers actually want — no usage data exists).

### 1b. Facet-count badges are computed only from the results loaded so far

**What it assumes.** That a number next to a filter option ("Fall · 7") helps teachers predict what clicking will do — and implicitly, that the number is *true*.

**How it behaves today.** The badge counts are tallied client-side over only the pages of results that have been fetched — the first 20, plus 20 more per scroll:
- `src/pages/SearchPage.tsx:73-75`: `lessons` = flattened *loaded* pages, then `useFacetCounts(lessons)`.
- `src/utils/facetCounts.ts:146-159`: a pure client-side tally over that array.
- Page size is 20 (`src/stores/searchStore.ts:76` `resultsPerPage: 20`).
- Zero renders as *blank*, not "0" (`IntSidebar.tsx:101` `{count || ''}`), and options with no visible count remain fully clickable.
- Meanwhile the headline result count IS accurate — it comes from the server (`useLessonSearch.ts:165-166` `total_count`). So the toolbar can say "212 lessons" while the Season section's badges sum to ~20.

Concretely: search for nothing (full ~700-lesson library), and "Winter" might show "4" because 4 of the first 20 loaded lessons are Winter — while dozens more exist. Scroll, and the badges silently grow. A teacher who reads "4" as "there are 4 winter lessons" is misinformed.

**Does it still hold?** No — the assumption behind showing a count ("it's a truthful preview") is not what the code delivers. This is the one place in the search UI where the interface *asserts a number that isn't real*. (Cultural Heritage badges have the same property, with careful ancestor roll-up logic — `facetCounts.ts:118-135` — that is correct *within* the loaded subset but still subset-only.)

**Recommendation: rethink — pick one of two honest options.** (1) **Cheap:** drop the numbers entirely (checkboxes work fine without them; blank-when-zero already makes them half-invisible). (2) **Real:** compute counts server-side in the search RPC over the full filtered set. Tradeoff: option 1 loses a nicety few users likely rely on; option 2 is real backend work (new aggregate in `search_lessons`) that mostly pays off if teachers turn out to be heavy filter-browsers.

**Severity: P2 (degraded — misleading numbers in the primary public UI) · Effort: S to remove / L to make truthful · Confidence: high.**

### 1c. "Location" is declared single-select but the public sidebar treats it as multi-select — and "Both" is a stored value

**What it assumes.** That a lesson's location need (Indoor/Outdoor/Both) is a single choice, per `filterDefinitions.ts:41-49` (`type: 'single'`) and the project's own docs (root `CLAUDE.md`: "only Location is single-select").

**How it behaves today.** The `single` declaration is only honored in the *reviewer* form (`src/components/Review/ReviewMetadataForm.tsx:62-68`, single-select pill adapter). The public sidebar renders Location as ordinary checkboxes in `CHECKBOX_KEYS` (`IntSidebar.tsx:13-22`) with array-toggling (`searchStore.ts:154-171`), the store models it as `string[]` (`searchStore.ts:67`), and the RPC receives an array (`useLessonSearch.ts:145`). So a searcher can check Indoor + Outdoor + Both simultaneously. Separately, "Both" existing as a *data value* alongside Indoor/Outdoor means "show me outdoor-capable lessons" arguably requires checking two boxes (Outdoor and Both).

**Does it still hold?** The inconsistency is harmless in practice (multi-select-as-OR is sensible for a search filter even when the underlying field is single-valued), but the "Both" value is a small taxonomy smell worth one stakeholder question: should the filter present as two simple checkboxes (Indoor-friendly / Outdoor-friendly) with "Both" matching either, rather than exposing the storage value?

**Recommendation: simplify (presentation only — don't touch stored data).** Tradeoff: near-zero; risk is only in stakeholder sign-off since it's a filter-definition change (`filterDefinitions.ts:28`).

**Severity: P3 · Effort: S · Confidence: high** (behavior verified in code; user impact is a judgment call).

---

## 2. Search result presentation

### 2a. Results are rows/cards that open an in-page panel; lessons have no page — and no address — of their own

**What it assumes.** Two things: (1) a teacher evaluates lessons by *scanning many quickly*, so detail should appear in-context (drawer/split rail) without losing the list; and (2) the library is a **finding aid, not a content host** — the lesson itself lives in Google Docs, so a dedicated lesson page would have little to show.

**How it behaves today.**
- Three view modes — list (default), grid, split — plus a density switch (`src/types/index.ts:89-98`; default `view: 'list'` at `searchStore.ts:78`). Split is desktop-only, coerced to list below 1100px (`SearchPage.tsx:96-104`).
- Clicking a result sets component-local `selectedLesson` (`SearchPage.tsx:51,180-190`) and opens either a right-side drawer (`IntLessonDrawer.tsx:12-59`, a Headless-UI Dialog) or the split rail (`IntSplitDetail.tsx:10-30`). There is **no `/lesson/:id` route** — the full route table is `src/App.tsx:110-198`.
- The detail panel (`IntLessonDetail.tsx:37-76`) shows title, summary, an "Open Lesson Plan" external link to the Google Doc (`:48-57`), and the full metadata list. The actual lesson content is never rendered in-app.
- Search *state* is shareable — W1c URL sync makes query/filters/sort bookmarkable (`useUrlSync.ts:18-45`) — but the open lesson is not part of the URL, so a shared link never re-opens a specific lesson.

**Does it still hold?** The scan-many model fits the audience and the drawer implementation is polished (a11y, focus handling, C59 anti-flash work all present). The "finding aid" belief is genuinely load-bearing and probably correct — re-hosting Google Doc content would be a large, low-value project. But the *no-address* consequence deserves a decision rather than remaining an accident: "send this lesson to a colleague" is arguably the most natural teacher action, and today it's either (a) share a search URL and say "click the third one," or (b) share the Google Doc link — which teaches teachers to bypass the library. A dedicated lesson *page* is not needed to fix this; a `?lesson=<id>` URL param that opens the drawer on load would ride the existing URL-sync machinery.

**Recommendation: keep the drawer model; rethink only the missing permalink.** Tradeoff: adding `?lesson=` is a small, contained change (one more URL param through `useUrlSync`/`urlParams`), but it does add state-sync surface (see §6) — worth doing deliberately, not casually.

**Severity: P2 (degraded — sharing a single lesson, a core teacher act, has no good path) · Effort: M · Confidence: high** (route absence and URL-sync scope verified).

### 2b. What a card claims about a lesson: the Cook/Grow badge is derived from *skills tags*, not the Activity Type field

**What it assumes.** That "does this lesson have cooking skills or garden skills tagged" is a faithful proxy for what kind of lesson it is.

**How it behaves today.** Every card/row shows an activity chip — Cook / Grow / Cook + Grow / Academic — computed by `intActivityLabel` (`src/components/Internal/IntListRow.tsx:13-20`) purely from whether `metadata.cookingSkills` / `metadata.gardenSkills` are non-empty. It does **not** read `metadata.activityType` — the field the Activity Type *filter* actually filters on (`facetCounts.ts:62-64`, RPC param at `useLessonSearch.ts:146`). Beyond the chip, a card shows: grades, title, summary, first season, first theme (`IntCard.tsx:12-49`); list rows add first heritage (`IntListRow.tsx:43-96`). "First value only" is a deliberate scanning economy.

Consequence: filter by Activity Type = "Cooking," and any matching lesson whose `cookingSkills` array happens to be empty renders with an "Academic" chip — the UI visibly contradicting the filter the user just applied. Whether rows like that exist depends on data (cookingSkills went through the C02 re-tag, so coverage is likely good), which is why this is flagged as an assumption rather than a bug.

**Does it still hold?** Roughly — skills-presence and activity type correlate strongly post-retag. But two parallel definitions of "what kind of lesson is this" is exactly the kind of quiet divergence that erodes trust in the metadata later.

**Recommendation: simplify — make the chip read `metadata.activityType` (the filterable truth), falling back to skills-derivation only when it's empty.** Tradeoff: a one-file change; small risk that some legacy rows have quirky activityType values, which the fallback covers.

**Severity: P3 · Effort: S · Confidence: high** on the mechanism; medium on how often it visibly misfires (needs a data probe, out of scope for this read-only pass).

---

## 3. Infinite scroll vs pagination

**What it assumes.** Teachers *browse* rather than *navigate to page 7*; nobody needs to cite "page 3 of the results"; and the corpus (~700 live lessons) is small enough that "keep scrolling" never becomes absurd.

**How it behaves today.**
- 20 results per fetch (`searchStore.ts:76`), appended via `useInfiniteQuery` (`useLessonSearch.ts:121-131`).
- An IntersectionObserver sentinel fires 100px before the bottom (`src/components/Common/InfiniteScrollTrigger.tsx:27-54`), with a screen-reader-visible "Load more results" button as the keyboard fallback (`:90-100`), aria-live progress announcements (`:73-79`), and a terminal "No more results to load" state (`:57-63`).
- The recent C59 hardening closed the classic infinite-scroll traps: the sentinel hides during refetches so it can't paginate stale rows (`SearchPage.tsx:231-245`), and placeholder data never triggers a next-page fetch (`SearchPage.tsx:83-88`).
- A vestige remains: `currentPage` still lives in the store and is dutifully reset on every filter change (`searchStore.ts:94,118,131`; comment at `SearchPage.tsx:132-137` admits it exists only "for any future paginated consumer").

**Does it still hold?** Yes, comfortably. With good filters, nobody should ever be 200 rows deep; the accurate toolbar total ("212 lessons") gives the orientation that page numbers would otherwise provide; the a11y fallbacks exist. The one real cost of infinite scroll — you can't deep-link a position — is mooted by the URL carrying the *filters* instead. Pagination would buy back-button-to-page-N and a reachable footer (there is no footer, so nothing is being buried) at the cost of more clicks in the common case.

**Recommendation: keep.** Optionally delete the dead `currentPage` plumbing next time someone is in the store — it's the kind of "for a future consumer" state that confuses later readers.

**Severity: P3 · Effort: S (nothing to do; vestige cleanup trivial) · Confidence: high.**

---

## 4. The submission flow's two-branch intent model (new vs update)

**What it assumes.** That a submitting teacher (a) knows whether some version of their lesson is already in the library, and (b) can find it in a search picker — and that capturing this intent up-front is worth an extra decision screen.

**How it behaves today.**
- `/submit` is a two-button intent chooser: "Add a new lesson" vs "Update a lesson that's already in the library" (`src/pages/SubmissionPage.tsx:9, 52-82`), each routing to its own form (`App.tsx:113-115`).
- The **new** branch is a single Google-Doc-URL field posting `submissionType: 'new'` (`NewSubmissionForm.tsx:68-73`).
- The **update** branch adds "Step 1 · Find the lesson you're revising" via a search picker (`RevisingSubmissionForm.tsx:155-186`, `LessonSearchPicker` with `excludeRetired`), posting `submissionType: 'update'` + the chosen `originalLessonId` (`:80-89`). Crucially there is an escape hatch — "can't find it" lets them proceed with `originalLessonId: null` and copy promising "A reviewer will identify which lesson this updates" (`:160-172, 224-228`).
- The intent is **advisory, not binding**: duplicate detection runs on every submission regardless (pg_trgm, post-T4b), the reviewer sees the submitter's claim as context (`src/components/Review/SubmitterIntentBanner.tsx`), and the T4b decision panel lets the reviewer publish-as-new, merge, or override either way (`src/components/Review/ReviewDecisionPanel.tsx`). Teachers supply zero metadata either way (the teacher-zero-metadata model) — both forms are essentially "paste a link."

**Does it still hold?** Yes — *because* the branch is advisory. The failure mode of intent screens (user guesses wrong, system trusts the guess) is fully defused: a wrong "new" gets caught by duplicate detection; a wrong or unfindable "update" falls back to reviewer matching. What the branch buys: when the teacher *does* pick the right target lesson, the reviewer's merge is pre-linked — real time saved for the people who are actually scarce here (the ~3 reviewers). What it costs: one extra screen and one moment of "um, is it in there already?" for the teacher. Given that a wrong answer costs the teacher nothing, that's a fair trade.

**Recommendation: keep.** If the philosophy review wants to trim, the *cheapest simplification* is copy, not structure: the chooser's two descriptions (`SubmissionPage.tsx:64-66, 78-80`) could more explicitly say "not sure? pick either — a reviewer checks everything," making the low stakes visible to the teacher. Collapsing to a single form would simplify one screen but discard the pre-linked-merge benefit and make reviewers do lookup work a motivated teacher would have done for free.

**Severity: P3 · Effort: S · Confidence: high.**

---

## 5. Admin surface inventory vs. the ~3 real users

**What it assumes.** The admin area is shaped like a multi-role organization's back office: user directory, per-user detail, invitation pipeline, analytics dashboards. That shape assumes an audience of administrators managing a population of users.

**How it behaves today.** Six admin pages exist behind permission-gated routes (`App.tsx:134-195`), reached from a tile hub (`AdminDashboard.tsx:13-42` — four tiles: User Management, Analytics, Invitations, Review Dashboard):

| Page | Size | What it is | Load-bearing today? |
|---|---|---|---|
| `AdminDashboard.tsx` | 2.3K | Tile hub | Harmless glue |
| `AdminUsers.tsx` | 22.2K | User directory (search, roles, status) | **Yes** — invite-only site (T3) makes this the front door for accounts |
| `AdminUserDetail.tsx` | 37.7K | Single-user deep-dive (largest page in the app) | Partially — heavy for a 3-account population |
| `AdminInviteUser.tsx` | 18.8K | Send invitation | **Yes** — the only way accounts get created since T3 |
| `AdminInvitations.tsx` | 22.8K | Invitation pipeline (pending/accepted/expired) | **Yes**, same reason |
| `AdminAnalytics.tsx` | 19.7K | Recharts dashboards: user growth over time, role pie charts, invitation acceptance rates (`AdminAnalytics.tsx:1-46`) | **No** — growth curves over ~3 accounts carry near-zero information |

The T4b cleanup already demonstrated the right instinct: the two admin Duplicates pages were deleted when their job moved into the reviewer flow (`src/pages/CLAUDE.md`, "removed in T4b (D10)" note).

**Does it still hold?** Half of it. The *invitation/user* half flipped from speculative to essential the day the site went invite-only. The *analytics* half is the clearest case in the codebase of effort pointed at an audience that doesn't exist yet ([user base ≈ 3 internal accounts]; general-user login is a later rollout). It also carries the app's only charting dependency (recharts) — bundle weight for an unvisited page, though it is lazy-loaded (`App.tsx:47-49`).

**Recommendation: simplify.** Keep Dashboard/Users/Invite/Invitations as-is. For Analytics: park it — either remove the route + tile until the general-user rollout, or leave it but explicitly de-prioritize any maintenance on it. `AdminUserDetail` (37.7K) is worth a look for over-service next time it's touched, not proactively. Tradeoff in plain words: deleting Analytics now costs a re-build later *if* the user base grows; parking it costs nothing but honesty. Nobody loses a feature they use today either way.

**Severity: P3 (polish — nothing user-facing degrades) · Effort: S (park) / M (audit UserDetail) · Confidence: high** on inventory and audience; medium on recharts bundle relevance (lazy-loading already contains it).

---

## 6. State-management layering on the search page (Zustand + React Query + URL)

**What it assumes.** That three coordinated state layers are worth their complexity because each buys something teachers/devs need: **Zustand** = instant UI updates and one authoritative in-app copy of filters; **URL** = shareable/bookmarkable/refresh-proof searches; **React Query** = cached server results with stale-while-revalidate polish. Plus a fourth, quieter layer: **localStorage** persists view/density preferences only (`searchStore.ts:192-199`), and component-local state holds the open lesson + mobile drawer (`SearchPage.tsx:51-52`).

**How it behaves today.** The layers have clear ownership, and the boundaries are enforced in code, not convention:
- Store owns live filters/view state; results explicitly do *not* live there (`src/stores/CLAUDE.md`: "not results — those come from React Query").
- URL owns the shareable subset (query/filters/sort), synced two-way by `useUrlSync` (`useUrlSync.ts:46-140`) with a debounce, a one-use echo-loop guard, and full-replace hydration (`searchStore.ts:113-119`).
- React Query owns server data, keyed on `[rpc, filters, sortBy, pageSize]` (`useLessonSearch.ts:122`) so the cache follows the store automatically; `keepPreviousData` + hydration gating prevent false "No matches" flashes (`useLessonSearch.ts:170-176`, `SearchPage.tsx:43-49, 63-71`).

The cost is visible on the page: `useUrlSync`'s own 27-line comment documents two latent sync bugs that had to be designed away (`useUrlSync.ts:18-45`), and SearchPage carries ~8 C58/C59 coordination comments. The counterweight: every seam is now covered by focused tests (`useUrlSync.test.tsx`, `searchStore.test.ts`, `useLessonSearch.wiring.test.tsx`).

**Does it still hold?** Yes — but only because the layering is *done and tested*, not because it's cheap. Shareable URLs genuinely matter for this audience (teachers passing searches around is the sharing story, per §2a). The realistic alternative (URL as the single source of truth, store derived) would be a rewrite that removes comment-complexity without changing anything a user can see. The actual risk is prospective: every *new* piece of search state must pick exactly one home or the sync-bug class returns. Note the precedent already set: the open-lesson selection lives in *no* synced layer (`SearchPage.tsx:51`), which is precisely why lessons aren't shareable — §2a and this section are the same decision viewed from two sides.

**Recommendation: keep — and freeze the pattern.** Write one paragraph in `src/stores/CLAUDE.md`/`src/hooks/CLAUDE.md` stating the ownership rule (URL = shareable subset; store = live UI; RQ = server data; nothing may live in two). Any future state (e.g. the `?lesson=` param from §2a) extends the existing machinery rather than adding a fourth mechanism. Tradeoff: none in the keep direction; the simplification alternative spends real effort for invisible gains.

**Severity: P3 · Effort: S (docs only) · Confidence: high.**

---

## 7. The "internal design system" (Int*) vs public UI split

**What it assumes.** The naming (`components/Internal/`, `Int*` prefixes, `internal.css` / `internal-admin.css`) encodes an original belief: internal tool screens (review/admin) warrant their own design system, *separate from* the public search UI.

**How it behaves today.** That split no longer exists — the "internal" system IS the app-wide design system, and the name is a fossil:
- The **public** search page is built entirely from Int* parts (`SearchPage.tsx:6-17` imports 10 of them); the app-wide header is `int-topbar` (`Header.tsx:64`); public submission forms use `IntFormField`/`IntButton`/`IntPageHeader` (`NewSubmissionForm.tsx:7-13`).
- Essentially every page imports from `components/Internal` (16/16 page files match `grep -l "components/Internal" src/pages/*.tsx`).
- ~45 components live in the barrel (`src/components/Internal/index.ts`), backed by `src/styles/internal.css` (24K) + `internal-admin.css` (77K).
- Three styling idioms coexist inside it: `int-*` classes (search/shell), `adm-*` classes (admin — but leaking into public forms: `NewSubmissionForm.tsx:138` uses `adm-input`), and ad-hoc Tailwind utilities with raw palette values on the same public pages (`SubmissionPage.tsx:58` `border-gray-200 … hover:border-blue-500` vs the CSS-variable esy palette used elsewhere, e.g. `SearchPage.tsx:153-155`).

**Does it still hold?** The original assumption is dead, and its death was the right call — the v3.0 migration unified the app under one visual system, consistent with the owner's "minimize moving parts" and "design cohesion over minimal-diff" principles. What remains is residue: (a) a name that actively misleads ("Internal" components rendering the most public page in the product — a future contributor could reasonably conclude they must build *separate* public components, re-creating the split); (b) the three-idiom styling mix, which shows up as small visible seams (the submission chooser's blue/emerald Tailwind palette vs the esy green/ink palette everywhere else).

**Recommendation: keep the unified system; simplify the *story* around it.** Cheapest first step is documentation: one line in `src/components/CLAUDE.md` — "Int* is the app-wide design system; the name is historical; build all new UI from it." Opportunistic second step: migrate stray raw-Tailwind-palette spots (the `/submit` chooser is the main one) to system components/tokens when those files are next touched. A wholesale rename (`Internal` → `DesignSystem`/`Esy`) is honest but churns ~45 files' imports for zero user-visible gain — only worth bundling into some future mechanical refactor. Tradeoff in plain words: the risk being managed is *future confusion*, not present breakage, so spend documentation (cheap) rather than renames (churn).

**Severity: P3 · Effort: S (doc line + opportunistic cleanups) · Confidence: high.**

---

## Cross-cutting observations for the philosophy review

- **The app's deepest belief — "we are an index, not a host" — is undocumented but everywhere:** no lesson content is ever rendered in-app (§2a), submissions are just links (§4), and the only CTA on a lesson is "Open Lesson Plan" → Google Docs (`IntLessonDetail.tsx:48-57`). Worth writing down as an explicit product principle, because several future feature ideas (in-app previews, PDFs, favorites) quietly violate it.
- **Two findings are really one decision:** the missing lesson permalink (§2a) and the "selection lives in no synced layer" note (§6). If the owner wants shareable lessons, the implementation path is already paved by the URL-sync machinery.
- **The only truth-telling problem found is the facet badges (§1b).** Everything else is shape/priority judgment; that one is the interface asserting a number that isn't real, in the public teacher-facing surface, and should be resolved (either direction) before the go-live audience grows.
