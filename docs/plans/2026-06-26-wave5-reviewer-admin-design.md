# Wave 5 — Reviewer/Admin Features — Design Document

**Date:** 2026-06-26
**Status:** **Draft** — strategy locked, mechanism questions open (see §"Open design questions"); Session 1 locks them, then the impl plan's concrete tasks get authored.
**Related:**
- `docs/plans/2026-06-20-deferred-work-roadmap.md` (§Wave 5, source of truth for scope; half-finished-features table)
- `docs/plans/2026-06-21-deferred-campaign-status.md` (master campaign status; Wave 5 row)
- Memory: `project_deferred_work_campaign` (wave history + standing gates), `project_teacher_zero_metadata_model`, `project_metadata_three_regimes`

---

## 1. Why this exists

Wave 5 is the **Reviewer/admin features** track of the deferred-work campaign (Waves 1–4 shipped + PROD-verified). It is a batch of internal reviewer/admin capabilities whose **backends largely already exist but whose UIs were never built**, plus a couple of latency/workflow improvements — gated by one piece of structural tech debt that everything else sits on top of.

The headline is **`src/pages/ReviewDetail.tsx`** — a **1,483-line monolith** (verified 2026-06-26; the roadmap's ~1361/1475 figures are stale drift) that is the reviewer's primary working surface. Under the teacher-zero-metadata model (`project_teacher_zero_metadata_model`), this single screen supplies essentially all reviewer classification metadata for every submission (16 editable metadata controls + a document-derived `summary`; the often-cited "17 fields" counts the Zod payload's `summary` key, which `ReviewDetail` parses from the doc but never renders as an editable control), so it concentrates the project's most behavior-critical, regression-sensitive UI. It has **zero page-level tests today**, loads its data with **fully serial awaits**, and is shared by the frontend-B2 and simplification tracks. The roadmap therefore directs: **decompose it once, behind page-level tests, then build the rest of the wave on the clean structure.**

The three personalization features (Bookmarks / Saved Searches / Collections, umbrella issue #103) are **"missing-UI only."** A workflow agent confirmed — including a live read-only PROD check (`jxlxtzkmicfhchkhiojz`) — that all three tables exist in the **applied baseline snapshot** (`20251001_production_baseline_snapshot.sql`) with RLS enabled, but have **zero frontend wiring** (the only `src/` reference is generated `database.types.ts`). They are high-leverage: the expensive part (schema + RLS + PROD apply) is already done; only React UI remains.

> ⚠️ **Schema-of-record trap (load-bearing).** `supabase/migrations/10_future_user_features.sql.skip` is a **skipped** migration — never applied — and **its column shapes differ from reality** (it has `bookmarks.lesson_id` as `uuid` + a `notes` column; `saved_searches` extra `updated_at`/`is_default`; `lesson_collections.lesson_ids` as `uuid[]`). **Read the applied shapes from the baseline snapshot / `src/types/database.types.ts`, NEVER from the `.skip` file.** The applied truth is captured in §6 below.

## 2. Goals & constraints

1. **Decompose ReviewDetail ONCE, test-first.** Standing gate: *no refactor without page-level tests first*. The safety net (page-level RTL + pure-helper unit tests) lands **before** any structural move, so behavior regressions are visible. Decompose once so C107, frontend-B2, and the simplification track all build on the same tested structure rather than re-cutting it three times.
2. **Ship the three personalization UIs on existing backends.** Frontend-only, no migrations (to be confirmed in Session 1). Highest leverage in the wave.
3. **Reversible-first; data safety is the top constraint** (`feedback_data_safety_top_priority`). The entire spine (tests → decompose → C107 → C111/C112/C113) is frontend-only and git-revertible. All **schema/migration** work (C22 migration + RPC; C74/C78; C28's C27 dependency) is concentrated in the **admin tail** at the end, behind the standard migration discipline (TEST-DB MCP verify → PROD MCP verify). The personalization spine writes rows to existing tables but adds no schema.
4. **Do not regress the reviewer flow.** The decomposition must preserve the documented invariants the page depends on (activityType slug round-trip, search-hatch effect ordering, three-metadata-regime legacy rows, the closed-enum Zod/DB-CHECK contract from C02, hooks-order/early-return rule). These are enumerated as risks in §5.

## 3. The chosen shape: test-first decomposition → frontend-first personalization → DB tail last

Wave 5 ships as a sequence of small, mostly-reversible PRs that follow the roadmap's explicit within-wave order (`Decompose → C107 → C111/C112/C113 → C28 · C22 · C74/C78`), re-expressed as a reversible-first PR breakdown:

| PR | Scope | DB? | Reversibility |
|----|-------|-----|---------------|
| **0 — Safety net** | Page-level RTL test for ReviewDetail (mock supabase client + `functions.invoke('complete-review')`) **+** unit tests for in-file pure helpers (`parseExtractedContent`, `reAddActivityTypeSuffix` incl. legacy scalar/`both` branches, `candidateCards` 4-case builder). **No refactor.** | no | pure-additive |
| **1 — Decompose** | Extract decomposition seams (§5) into components/hooks; tests stay green; **no behavior change**. | no | git revert |
| **2 — C107** | Serial→parallel data loading in the extracted `useReviewSubmission` hook (§5.bis). | no | git revert |
| **3 — C111 Bookmarks UI** | `useBookmarks` hook + bookmark action across the result views (grid/list/detail) + "My Bookmarks" view. Establishes the reusable, auth-gated bookmark action C113 reuses. | no* | git revert |
| **4 — C112 Saved Searches UI** | Save/restore filter sets via `saved_searches.filters` JSONB. Leans on Wave-1 URL/filter serialization. | no* | git revert |
| **5 — C113 Collections UI** | Named collections over `lesson_ids text[]`; `is_public` sharing surface (scope TBD — see open Q5). | no* | git revert |
| **6+ — Admin tail** | C28 analytics (computable KPIs; defer the "Library searches" KPI needing unbuilt C27), C22 assignee (**migration + RPC + product decision**), C74/C78 override-view / claim-lock. | **yes** | migration rollback + git revert |

\* "no DB" assuming Session-1 discovery confirms the existing tables/RLS suffice (open Q3).

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Decompose without tests first** | Violates the standing gate; ReviewDetail is the highest-regression-risk surface in the app (all 17 fields, three metadata regimes, documented effect-ordering bug history). Behavior regressions would be invisible — Goal 1/4. |
| **Build personalization before decomposing** | C111/C113 add a LessonCard action and the personalization UIs churn shared surfaces; doing them on top of the monolith means re-doing the work after decomposition. Roadmap sequences decompose-first deliberately. |
| **One big "Wave 5" PR** | Un-reviewable, un-reversible, couples frontend-only work to DB migrations — violates reversible-first + data-safety (Goal 3). |
| **DB tail (C22/C74/C78) interleaved with the spine** | Pulls irreversible DB work forward ahead of the safe frontend wins, against reversible-first. C22 also needs a product decision (open Q7) that shouldn't block the personalization UIs. |

## 4. Open design questions — TO LOCK IN SESSION 1

> Session 1 (design-lock) works this list in order, against the **real code/data**, writing a locked answer + one-line rationale under each, then flips Status to **Locked** and authors the impl plan's concrete tasks. `[evidence-lockable]` = the executor may lock from discovery evidence. `[user-verdict]` = executor presents evidence + a recommendation; the **user** decides — never locked unilaterally.

1. **Decomposition boundaries & PR-1 grouping** `[user-verdict]`. One decomposition PR or split into 2 (easy pure seams + doc/banner components first; then the big `<ReviewMetadataForm>`/`<ReviewDecisionPanel>` + `useReviewSubmission`)? And how far to lift the data hook — return an *initial-form-state object* vs. own all form state in the hook (§5 risk 2)? *Default leaning:* split PR-1 into two reviewable commits/PRs; `useReviewSubmission` returns an initial-form-state object rather than owning the 13 useState pieces. Real risk/PR-count tradeoff → user decides. <!-- TBD Session 1 -->
2. **Safety-net test strategy** `[evidence-lockable]`. Page-level RTL scope: render via `MemoryRouter` at `/review/:id` with a **table-aware supabase query-builder mock** and a **local `functions.invoke` mock** (the global test setup mocks `supabase.from` but has **no `functions` member** — follow the local-mock pattern in `src/__tests__/integration/search-page.test.tsx`); enforce the **assert-behavior-not-call-sequence** rule (load-bearing because C107 changes call ordering); include legacy/three-regime fixtures; pick which pure helpers get unit suites first. *Default:* characterization tests pinning current behavior + 3 helper unit suites (incl. the `reAddActivityTypeSuffix` scalar/`both` legacy branches). Executor presents the coverage plan when locking. <!-- TBD Session 1 -->
3. **Do the personalization UIs need any new migration?** `[evidence-lockable]`. Confirm C111/C112/C113 need **no** schema change: `bookmarks UNIQUE(user_id,lesson_id)` supports toggle/upsert; `saved_searches.filters jsonb` can hold the app's `FilterState`; `lesson_collections` RLS (incl. the `is_public` public-read path) covers the planned operations. *Default:* no migration for the three UIs. <!-- TBD Session 1 -->
4. **C112 filter-serialization dependency** `[evidence-lockable]`. The Wave-1 **C114** work already shipped a serializer — `src/utils/urlParams.ts` (`buildSearchParams`/`parseSearchParams` over `SearchFilters`) + two-way sync in `src/hooks/useUrlSync.ts`. Since `saved_searches.filters` is `jsonb`, C112 can likely persist the `SearchFilters` object directly (no URL-string round-trip needed). Confirm the `SearchFilters` shape is jsonb-safe; the dependency on C114 is weaker than a hard block, and C157 (full shareable-URL encoding) is NOT required. *Default:* store the `SearchFilters` object as jsonb; add a minimal adapter only if a gap appears. <!-- TBD Session 1 -->
5. **Collections sharing surface** `[user-verdict]`. Three rungs, increasing blast radius: **(a) private-only** collections; **(b) authenticated sharing** — `is_public=true` readable by other *signed-in* users (works under the existing RLS, **no migration**); **(c) anonymous public** share route — requires a new anon SELECT policy/**migration + security review** (the project's first truly public surface fed by user content). Which rung ships in this wave? *Default leaning:* (a) private-only now; defer (b)/(c). User decides. <!-- TBD Session 1 -->
6. **Admin-tail scope** `[user-verdict]`. Keep C28/C22/C74/C78 in this scaffold as a lighter, product-decision-gated **Phase 6**, or split them into a separate **Wave 5.2**? And confirm C28 is scoped to **computable KPIs only** (defer the "Library searches" KPI that needs unbuilt C27). *Default leaning:* keep them in-scope but gated (each DB-touching item waits on its product decision/migration); C28 = computable KPIs only. <!-- TBD Session 1 -->
7. **C22 assignee product decision** `[user-verdict]`. **Self-claim** ("Assigned to me" = a reviewer claims a submission) vs **admin-assign** vs both — this gates the migration (new column + RPC) shape. *Default leaning:* self-claim (simplest, matches the reviewer workflow). User decides. Tied to C78 claim-lock. <!-- TBD Session 1 -->
8. **C107 parallel-fetch error semantics** `[evidence-lockable]`. `Promise.all` (fail-fast → `ReviewErrorBoundary`, matches today's all-or-nothing serial behavior) vs `Promise.allSettled` (partial render). *Default:* `Promise.all`, preserving current error behavior; tests assert final state, not call order. <!-- TBD Session 1 -->
9. **Collections array-mutation mechanism (carries a hidden migration dependency)** `[user-verdict]`. Adding/removing a lesson from `lesson_collections.lesson_ids text[]`: **(a)** client **read-modify-write** via supabase-js `.update()` — **no migration**, but a lost-update race if the same user edits one collection in two tabs; or **(b)** an **atomic server-side RPC** (`array_append`/`array_remove`) — race-free but **requires a migration** (supabase-js cannot express the array SQL functions), which breaks the "no migration for the 3 UIs" default. *Default leaning:* (a) read-modify-write for the wave (single-user, low concurrency); revisit (b) if races appear. Ties to Q3. User decides given the migration tradeoff. <!-- TBD Session 1 -->

## 5. Section 1 — ReviewDetail decomposition (PR 0 + PR 1)

**Current anatomy (verified 2026-06-26, `src/pages/ReviewDetail.tsx`, 1,483 lines):** single **named-export** `ReviewDetail()` (L202; not a default export); 13 `useState` (L205–243); pure module helpers (L96–200); one `loadSubmission` data callback (L308–492) + load effect (L494–496); `handleSaveReview` (L518–603, validate→strip activityType `-only` slugs→canonicalize→Zod→`functions.invoke('complete-review')`→navigate); 3-column render (L748–1483: LEFT metadata form 850–1162, MIDDLE doc panel 1164–1207, RIGHT decision column 1209–1478). Already-extracted + tested pieces: `reviewMismatch` / `reviewPreselect` / `reviewMetadataInit` helpers, the `Int*` design kit, `GoogleDocEmbed`, `LessonSearchPicker`. Route is lazy-loaded (App.tsx L32) and wrapped by `ProtectedRoute` (L112) with `ReviewErrorBoundary` (L115–117) around the page body.

**Decomposition seams** (ranked by extractability; line ranges are 2026-06-26 anchors — re-verify before extracting):

| Seam → target | Lines | Extractability |
|---|---|---|
| In-file pure helpers → `reviewDetailHelpers.ts` (`reAddActivityTypeSuffix`, `parseExtractedContent`, `normalizeMatchType`, `selectOptionsFromConfig`, `flattenHeritageOptions`, `ZOD_FIELD_TO_LABEL`) | 96–200 | **easy** — module-scope pure; mirrors existing helper-extraction pattern. `reAddActivityTypeSuffix` has legacy scalar/`both` branches that MUST be test-pinned first. |
| `candidateCards` builder → `buildCandidateCards()` | 606–609, 621–694 | **easy** — pure useMemo, 4 discrete branches → table-driven tests. Highest value/lowest risk. |
| `<ReviewDocPanel>` (embed/text toggle + localStorage viewMode) | 237–250, 1164–1207 | **easy** — cleanest seam; self-contained props. |
| `<SubmitterIntentBanner>` (4-state IIFE) | 1215–1279 | **easy** — pure of submission fields; "never fall through to green when update" invariant must be test-pinned. |
| `<TitleMismatchWarning>` (IIFE) | 1319–1334 | **easy** — pure; uses already-tested `titlesAreSimilar`. |
| Validation + progress → `reviewValidation.ts` | 252–306, 539–560 | **easy/medium** — near-pure of `metadata`; cooking/garden conditional branches need tests. |
| Save flow → `submitReview()` service + thin orchestrator | 507–516, 518–603 | **medium** — payload/invoke is extractable; orchestration couples to 4 setters + navigate + scrollTo. |
| Search escape hatch → `useSearchEscapeHatch` + `<ReviewSearchPanel>` | 219–220, 699–705, 726–739, 1338–1377 | **medium** — two effects carry a **documented ordering invariant** (reset-first then auto-expand-last; one-directional open was a round-1 bug). Preserve declaration order + dep arrays verbatim. |
| `<ReviewMetadataForm>` (LEFT column) | 850–1162 | **medium** — large but cohesive; wide `metadata`/`onChange` surface; the 5 closed-enum react-selects have *different* label resolution — do **not** over-DRY (risk 7). |
| `<ReviewDecisionPanel>` (RIGHT column) | 1209–1478 | **medium** — composite; best decomposed into its sub-seams (banner/cards/mismatch/search/radios/note/bar). |
| `useReviewSubmission(id)` data hook | 205–206, 308–496 | **medium/hard** — fetch graph is liftable but the load path **also seeds form-restoration state** (`metadata`, `decision`, `notes`, `selectedDuplicate`, `legacyDecisionWarning`) with a "don't clobber restored review" invariant (restore-existing L430–464 vs preselect-from-intent L472–486). This is also where C107 lands → pair them (open Q1/Q8). |

**Decomposition risks (must be covered by PR-0 tests before any move):** (1) gate currently unmet — no page test exists; (2) form-state seeding entanglement (restore vs preselect); (3) activityType `-only` slug round-trip — load re-adds, save strips; the legacy scalar/`both` fan-out is a `.map`-on-scalar landmine that throws into the error boundary; (4) search-hatch effect ordering (last-writer-wins); (5) three metadata regimes — tests must exercise **legacy** rows (`canonicalizeReviewMetadata`, legacy `reject` decision warning), not just clean modern ones; (6) hooks-order/early-return rule (all hooks unconditional, above the loading/not-found returns); (7) over-DRYing the 5 closed-enum selects would break the closed-enum Zod/DB-CHECK contract (C02); (8) error-surface coupling to `ReviewErrorBoundary`; (9) network/edge mocking burden + the C107 serial→parallel error-handling change.

## 5.bis Section 2 — C107 data-loading parallelization (PR 2)

`loadSubmission` (L308–492) runs **6 sequential awaits**. Dependencies: (1) submission row → independent; (2) `submission_similarities` → independent; (3) `lessons_with_metadata` for similarity ids → depends on #2; (4) off-list submitter-target lesson → depends on #1 + #3; (5) latest `submission_reviews` → depends only on `id`; (6) teacher `user_profiles` → depends on #1. **The win:** #1, #2, #5 each need only `id`, and #6 needs only #1's `teacher_id` → a conservative shape is `await #1 → Promise.all([#2, #5, #6]) → await #3 → conditional await #4`; a tighter one is `Promise.all([#1, #2, #5]) → Promise.all([#3, #6]) → #4` (more parallelism, since #1/#2/#5 are all id-only). No `Promise.all` exists in the function today; no React Query (raw supabase-js + useState/useEffect). Lands inside the extracted `useReviewSubmission` hook so it's tested by PR-0's net. Exact shape + error semantics: open Q8.

## 6. Section 3 — Personalization UIs (PR 3 / PR 4 / PR 5)

**Applied schema (source of record = baseline snapshot + `database.types.ts`; PROD-verified RLS — NOT the `.skip` file):**

- **`bookmarks`** (PR 3) — `id uuid pk`, `user_id uuid` (FK `auth.users` ON DELETE CASCADE), `lesson_id text NOT NULL` (FK `lessons.lesson_id` ON DELETE CASCADE — **TEXT, not uuid**), `created_at`. **`UNIQUE(user_id, lesson_id)`**. Indexes on both FKs. RLS: 1 policy "Users can manage own bookmarks" — ALL, TO authenticated, `USING/WITH CHECK (auth.uid() = user_id)`.
- **`saved_searches`** (PR 4) — `id uuid pk`, `user_id uuid` (FK cascade), `name text NOT NULL`, **`filters jsonb NOT NULL DEFAULT '{}'`**, `created_at`. (No `updated_at`/`is_default` — those exist only in the stale `.skip`.) RLS: 1 policy, ALL, authenticated, own-row.
- **`lesson_collections`** (PR 5) — `id uuid pk`, `user_id uuid` (FK cascade), `name text NOT NULL`, `description text`, **`lesson_ids text[] DEFAULT '{}'`** (array membership, not a join table; **text[], not uuid[]**), `is_public boolean DEFAULT false`, `created_at`, `updated_at` (maintained by trigger). RLS: **4 policies, all `TO authenticated`** — SELECT `auth.uid()=user_id OR is_public=true`; INSERT/UPDATE/DELETE own-row. ⚠️ The SELECT policy is authenticated-only: `is_public=true` is readable by *other signed-in users*, NOT by anonymous visitors (anon has a table grant but no matching RLS policy) — an anonymous public-share route would need a new policy/migration + security review (see Q5).

**Implications carried into the impl plan:** all three couple to the existing auth hook **`useEnhancedAuth`** (`src/hooks/useEnhancedAuth.ts`) / Supabase session, and the three `user_id` columns are nullable but effectively-required via RLS `WITH CHECK (auth.uid()=user_id)`; `lesson_id` is `text` (lesson ids are slugs, not uuids). **There is no `LessonCard` component** — search results render through `IntCardGrid` / `IntListRow` / `IntLessonDrawer` / `IntSplitDetail` (`@/components/Internal`, see `SearchPage.tsx`), so the bookmark action is a **multi-view surface** (grid card + list row + detail), must be **auth-gated** (bookmarks RLS is authenticated-only while public search serves anonymous users), and its exact insertion points are a Session-1 discovery item; C111 establishes that reusable action and C113 reuses it. Collections array mutation (add/remove a lesson) is a real mechanism+migration decision — see **open Q9**. C112's `filters` payload maps to the app's **`SearchFilters`** type; because `filters` is `jsonb`, C112 can store the `SearchFilters` object directly (likely no URL-string serializer needed — open Q4).

## 7. Section 4 — Admin tail (PR 6+)

Lighter, product-decision-gated; each DB-touching item carries the full migration discipline. Detailed tasks are authored only after their open questions lock.
- **C28 — AdminAnalytics lesson-centric KPI rewrite.** Scope to **computable** KPIs (avg-review-time, etc.); **defer** the "Library searches" KPI (needs unbuilt **C27** search-query logging). Frontend + possibly a read-only RPC.
- **C22 — reviewer assignee / "Assigned to me".** **Migration (new column) + RPC + frontend**, gated on the self-claim-vs-admin-assign product decision (open Q7). Tied to C78. **Split-deploy rule (standing gate, `reference_ci_flakes`):** ship the migration/RPC PR FIRST (with `CREATE OR REPLACE`, grants, `NOTIFY pgrst, 'reload schema'`) → TEST-DB verify → THEN the frontend PR that calls the new RPC — bundling them risks the PGRST202 stale-client outage window.
- **C74 — override-tracking admin view.** Needs a `submission_reviews.canonical_lesson_id` write (shared with out-of-wave C73). Internal-only, low priority.
- **C78 — submission "claim" lock** to prevent concurrent-edit reviewer collisions. Low priority; pairs with C22.

## 8. Section 4 (shipping) — Migration / shipping strategy

PR breakdown: see §3. The spine (PR 0–5) is frontend-only. Migrations appear only in PR 6+ (C22/C74/C78, possibly a C28 read RPC).

### Gap risk between PRs
Spine PRs are independent frontend additions — no dangerous partially-shipped state (a half-shipped personalization UI is just an absent feature, not a broken one). The one ordering constraint: **PR 0 (tests) must merge before PR 1 (decompose)** so the gate is satisfied; **PR 3 (C111) before PR 5 (C113)** for the shared LessonCard action.

### TEST DB rehearsal
- PR 0–5: **no schema changes** → no DB rehearsal beyond deploy-preview + manual smoke (assuming open Q3 confirms no migration). `npm run test:rls` must pass unchanged. **But PR 3–5 are the first real authenticated writes to these tables** — manually verify cross-user RLS isolation on the deploy preview (user A cannot see user B's bookmarks/saved searches/private collections).
- PR 6+ (C22/C74/C78): standard migration discipline — local `supabase db reset` + `npm run test:rls`, then **TEST-DB MCP verify** before merge, **PROD-DB MCP verify** after apply (CI verify flakes; MCP is source of truth, `reference_ci_flakes`).

### Rollback paths
- PR 0–5: standard frontend `git revert`; **no schema migrations.** Note PR 3–5 introduce the **first production write paths** to `bookmarks`/`saved_searches`/`lesson_collections` — `git revert` removes the UI but not user-created rows (acceptable: rows are user-owned, RLS-isolated, harmless if orphaned).
- PR 6+: forward-rollback migration ready before merge + idempotent; `git revert` for frontend; additive-RPC PRs split per the C22 rule (§7).

### Per-PR ritual
Per `feedback_pr_bot_review_workflow` / `feedback_bot_review_investigation` / `feedback_pr_comment_surfaces` / `feedback_per_round_test_db_verification`: pre-push reviewer-agent dispatch **+ GATE 3 Codex** → baseline checks → push + `gh pr create` → wait for external bots → **four-surface triage** → rebuttal-pass every finding (**GATE 4 Codex** on real suggested changes) → consolidated fix-ups → per-round TEST-DB re-verify (DB rounds only) → round-cap after 2.

### Known issues / pre-existing flakes
`migrate-production.yml` SASL apply/verify flake (rerun); edge-deploy silent-no-op (3-signal verify) — only relevant if the admin tail adds an edge function. See `reference_ci_flakes`.

## 9. Section 5 — Testing strategy

### Unit
- `reviewDetailHelpers` (`parseExtractedContent`, `reAddActivityTypeSuffix` incl. **legacy scalar/`both`**, `normalizeMatchType`, `flattenHeritageOptions`, `selectOptionsFromConfig`): pure-function assertions on representative + legacy inputs.
- `buildCandidateCards`: all 4 cases (target-in-list / off-list / no-target / reviewer-searched).
- `reviewValidation`: cooking/garden conditional required-field branches; progress counts.
- Personalization hooks (`useBookmarks`, saved-search, collections): toggle/upsert, array add/remove, error paths (mock supabase).

### Integration / page-level (the gate)
- **ReviewDetail page-level RTL test** (PR 0): mount with mocked supabase + `functions.invoke('complete-review')`; assert load → render → edit → save **behavior (final state), not call sequence** (so C107's reordering doesn't break it); include a **legacy-regime fixture** (scalar activityType / legacy `reject` decision) and a modern fixture.

### E2E
- Existing Playwright suite must stay green across the decomposition (no behavior change). Personalization UIs: add minimal happy-path E2E if the suite pattern supports authenticated flows (confirm in Session 1).

### RLS
- No RLS changes in the spine → `npm run test:rls` passes unchanged. **PR 3–5 are the first authenticated client writes against these tables' RLS — add a cross-user isolation check** (user A cannot read/modify user B's rows) to the smoke pass. PR 6+ items that add policies/columns: extend `test:rls`.

### Manual smoke checklist
- Reviewer opens a submission → all metadata controls render, progress bar correct, save succeeds (post-decompose + post-C107).
- Reopen an **approved legacy** submission → no clobbering, no `.map`-on-scalar crash.
- Bookmark toggle persists across reload; saved search restores filters; collection add/remove updates membership.

## 10. Out of scope (captured for future work)
- **F4/F5 process tooling** (executor-brief / exec-session) — the roadmap nominally sequenced these "after W1, before W5"; we are proceeding with Wave 5 now at flagship scaffold weight per user direction. F4/F5 remain queued (`reference_working_efficiency_deferred`).
- **C27** search-query logging + `top_search_terms` view (blocks C28's "Library searches" KPI) — out of Wave 5; C28 ships without that KPI.
- **C157 / broader shareable-URL search encoding** — the W1c **C114** serializer (`urlParams.ts` + `useUrlSync`) already exists and is what C112 reuses (open Q4); any remaining saved-search-specific serializer gaps are in scope, but the broader C157 shareable-URL work stays in Wave 6.
- **Public collections sharing route** — deferred by default (open Q5) unless the user opts it into this wave.
- **C73** (`submission_reviews.canonical_lesson_id` for the reviewer flow) — shares a column need with C74 but is a separate out-of-wave item.
- **Deeper dedup/search items** (C09/C41/C42 etc.) — Wave 6.

## 11. References
- `docs/plans/2026-06-20-deferred-work-roadmap.md` — Wave 5 scope (source of truth)
- `docs/plans/2026-06-21-deferred-campaign-status.md` — master campaign status (Wave 5 row → point at these docs)
- `supabase/migrations/20251001_production_baseline_snapshot.sql` — applied personalization-table schema (L1534 bookmarks, L1710 lesson_collections, L1967 saved_searches)
- `src/pages/ReviewDetail.tsx` — the decomposition target
- Memory: `project_deferred_work_campaign`, `project_teacher_zero_metadata_model`, `project_metadata_three_regimes`, `feedback_workflow_orchestration`, `feedback_data_safety_top_priority`, `reference_ci_flakes`
