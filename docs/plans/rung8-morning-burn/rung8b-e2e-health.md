# rung8b — e2e suite health after tonight's merges (#581, #587, #588, #589, #592)

Read-only audit, 2026-07-03. Surface: `e2e/`. Baseline diff: `0ed0d5d..27e254c` (−4,525 lines, all dead-code/CSS/page deletions; no behavior additions).

## Verified CLEAN (no findings)

- **Selector breakage from tonight's deletions: NONE.** Every class-based e2e selector was checked against the post-sweep tree:
  - `.adm-dup` (review-journey.spec.ts:293,294,522) → survives at `src/styles/internal-admin.css:735` + `src/components/Internal/IntDuplicateCard.tsx:52`
  - `.adm-status` (11 uses) → 11 definitions survive in internal-admin.css
  - `.adm-callout--warning` (review-journey.spec.ts:451) → survives at internal-admin.css:1402
  - `.int-toolbar-left`/`.int-toolbar` (cultural-heritage-filter.spec.ts:104, performance.spec.ts:108), `label.int-check` (cultural-heritage-filter.spec.ts:76) → `src/styles/internal.css` untouched tonight
  - The 80+ `adm-*` classes deleted in #592 (`adm-dup-bar`, `adm-dup-compare`, `adm-kanban*`, `adm-metadiff*`, …) all belonged to the admin dup page retired in #578 — zero e2e references.
- **Stale name references: NONE.** Grepped e2e (specs, utils, README) for AdminAnalytics/analytics, ReviewActions, ReviewContent, SchoolSelector, VerifySetup, VirtualizedTable/virtual, sentry, algolia, confidence, version — no hits in selectors or comments.
- **No `waitForTimeout` / hard sleeps anywhere in e2e/.** The only `setTimeout`s are legit `test.setTimeout(180_000)` budget raises in review-journey.spec.ts (201, 364, 414, 507).
- **Tonight's `useLessonSearch`/`Header`/`searchStore` diffs are dead-code-only** (unused `confidence` mapping, `getSearchRpcName` env override, retired sort comments) — no new runtime behavior needing new e2e coverage.

## Findings

### F1 (flake pattern, medium-low): `networkidle` used as the universal wait across the whole public suite
- **Where:** ~20 call sites — e2e/filters.spec.ts:7,31,47,68; e2e/smoke.spec.ts:12,27,39,59; e2e/search.spec.ts:6,52,118,142; e2e/performance.spec.ts:35,54,60,68,76; e2e/cultural-heritage-filter.spec.ts:131,135,142; e2e/lessons.spec.ts:94,101.
- **Defect:** Playwright explicitly discourages `waitForLoadState('networkidle')` for tests. It is bimodal-flaky: (a) any persistent/periodic connection (Supabase auth token auto-refresh fetch, a future realtime channel) keeps the network busy → the wait burns toward the 30s test timeout (playwright.config.ts:7) and fails suite-wide; (b) it can also settle *before* a lazily-triggered data fetch starts, so downstream `toContainText` assertions race the real load. Currently masked by `retries: 2` in CI (playwright.config.ts:8), which converts it into invisible retry cost on every PR.
- **Failure scenario:** add any polling/heartbeat request to the app (or a Supabase session refresh lands mid-test on the deploy-preview) → 20+ tests time out at once with no code bug.
- **Fix shape:** replace with element-anchored waits (`await expect(resultsList).toBeVisible()` / response waits on the `search_lessons` RPC). Mechanical, one PR.

### F2 (weak test / coverage hole, low): "Pagination/Infinite Scroll" test asserts nothing about pagination
- **Where:** e2e/lessons.spec.ts:91–105 (`test.describe('Pagination/Infinite Scroll')`).
- **Defect:** the body scrolls to the bottom and then only asserts the *search box is still visible*. It never asserts more lessons load (no result-count-before vs -after, no page-2 request). Infinite scroll/pagination can break completely (page 2 never fetches) and this stays green.
- **Why it matters now:** FP-01 (facet badges tally loaded-pages-only, CONFIRMED on PROD) sits exactly in the pagination path; when that fix lands there will be zero e2e guard on load-more behavior. This is the coverage hole a regression would sail through.
- **Fix shape:** count `h2/h3` lesson cards before scroll, scroll, `expect.poll` count to increase (or intercept the RPC and assert a second page call).

### F3 (coverage hole, very low): retired admin routes have no 404/nav guard
- **Where:** no e2e file touches `/admin` dashboard nav; tonight #588 deleted the `/admin/analytics` route + AdminAnalytics page and #587 deleted VerifySetup.
- **Defect:** nothing asserts (a) AdminDashboard renders without dangling links post-retirement, or (b) the retired paths now land on the NotFound page rather than a blank ErrorBoundary screen. The deletion-evidence files verified link removal statically, but there is no living guard.
- **Failure scenario:** a future PR re-adds a sidebar link to a retired route (copy-paste from an old branch) → admin clicks through to a blank page; no test reddens.
- **Fix shape:** one cheap authenticated test: goto `/admin`, click every nav link, assert non-404/non-blank. Given ~3 admin users, fine to fold into the next authenticated-suite touch rather than its own PR.

## Skipped as out-of-scope
- Anything covered by open PRs #582–#595, the FP tracker backlog (FP-01/FP-02 fixes themselves), and round-1 rung8-*.md files (stores/hooks/error-gaps/facet-parity/lesson-detail/permalinks/handoff/submission-forms — none covered e2e/).
