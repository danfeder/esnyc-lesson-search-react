# Overengineering / Dead-Code Audit — `src/`

**Date:** 2026-07-03 · **Scope:** `src/` only (e2e suite and `_shared` edge helpers explicitly excluded) · **Method:** read-only; every claim below was verified by grep/read with file:line evidence. No code or data was changed.

## Plain-language summary

This codebase was built in layers over two years, and each new layer tended to replace an old one **without deleting it**. The good news: the live code paths (search, review, admin) are in decent shape — the recent T4b/W5 rewrites are clean. The clutter is almost all *leftovers*: whole files nobody imports anymore, styling for admin pages that were deleted in July, a permissions system sized for an organization with hundreds of users (there are ~3), and an analytics dashboard with pie charts about those same 3 users.

**Roughly 1,800 lines of TypeScript/React can be deleted outright with zero behavior change** (they are provably unreachable — nothing imports them), plus **~515 lines of orphaned CSS**, plus **two whole npm dependencies** (`@tanstack/react-virtual`, and `recharts` if the analytics charts go). A second tier of findings are "working but oversized" mechanisms — worth simplifying when someone is next in those files, not urgent.

Nothing here is user-breaking. Every finding is P2 (quietly degraded / wasteful) or P3 (polish/hygiene).

**Suggested order of attack:** Section A first (pure deletions, one PR, low risk) → Section B (dead exports inside live files) → Section C/D/E as opportunistic follow-ups.

---

## A. Dead files — nothing imports them (pure deletions)

### A1. Five orphaned Internal design-system components (T4b leftovers)

- **What:** `IntConfidencePill.tsx` (16 L), `IntDetectionMethodChip.tsx` (23 L), `IntGroupReviewBar.tsx` (63 L + 104 L test), `IntMetadataDiff.tsx` (154 L + 214 L test), `IntSpecRail.tsx` (14 L) in `src/components/Internal/`.
- **Evidence:** word-boundary grep across all of `src` finds each name only in its own file, its own test, and the barrel `src/components/Internal/index.ts` (lines 11–12, 24–25, 37–38, 45–51, 63–64). No page or component renders them.
- **Why vestigial:** these are the confidence/detection-method/group-review/metadata-diff widgets for the **admin Duplicates pages removed in T4b (July 2)** and the retired embedding-based dedup. `IntDetectionMethodChip` still has an `embedding` variant (`IntDetectionMethodChip.tsx:19` builds `adm-method-chip--embedding`) for a detection method that no longer exists.
- **Removal simplifies:** −270 L components, −318 L tests, 5 barrel entries + 10 type re-exports, and unlocks the CSS cleanup in E1 (their `adm-confidence-pill--*` / `adm-method-chip--*` styles die with them).
- **Risk:** very low. Caution for the executor: `IntCard` *looks* equally dead by naive grep but **is used** (imported by `IntCardGrid.tsx:2`, which SearchPage's grid view renders) — a path-substring grep exclusion hides it. Use word-boundary greps and run `npm run check` + `npm run test:run` after deletion.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A2. `ReviewContent.tsx` and `ReviewActions.tsx` — superseded Review components

- **What:** `src/components/Review/ReviewContent.tsx` (79 L) and `src/components/Review/ReviewActions.tsx` (102 L), both still exported from `src/components/Review/index.ts:8-9`.
- **Evidence:** zero imports anywhere in `src` (or tests) outside their own files and the barrel. `ReviewDetail.tsx:467` uses `ReviewDocPanel` (the W5-era replacement for `ReviewContent`); the T4b `ReviewDecisionPanel` replaced `ReviewActions`.
- **Why vestigial:** classic replace-without-delete. `ReviewContent` duplicates `ReviewDocPanel` almost feature-for-feature (both gate on `FEATURES.GOOGLE_DOC_EMBED`, both have an embed/text `viewMode` toggle, both call `sanitizeContent`) — a parallel mechanism frozen in time.
- **Removal simplifies:** −181 L, removes one of the two "doc panel" implementations so future editors don't patch the wrong one.
- **Risk:** very low.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A3. `EditableTitle` + `utils/validation.ts` — dead pair; kills the whole `components/Admin/` folder

- **What:** `src/components/Admin/EditableTitle.tsx` (135 L) and its only dependency `src/utils/validation.ts` (30 L: `validateTitle`, `MAX_TITLE_LENGTH`, `prepareTitleUpdatesForRpc`).
- **Evidence:** `EditableTitle` is referenced only by `src/components/Admin/index.ts:1` (the barrel's *sole* export). `validation.ts` is imported only by `EditableTitle.tsx:3`; `prepareTitleUpdatesForRpc` has zero callers anywhere.
- **Why vestigial:** the T2b reviewer-editable Title/Summary (the live feature) lives in `ReviewMetadataForm` and does not touch these files. This was an earlier admin-side inline-title-edit experiment.
- **Removal simplifies:** deletes an entire directory (`components/Admin/`), −165 L.
- **Risk:** very low.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A4. `SchoolSelector.tsx` — 155-line component kept alive by a one-line type

- **What:** `src/components/Schools/SchoolSelector.tsx` (155 L).
- **Evidence:** the component is never rendered. The only cross-file references are type-only: `SchoolCheckboxGroup.tsx:3` and `UserProfile.tsx:7` import the `School` interface it happens to export; `Schools/index.ts` re-exports it.
- **Removal simplifies:** move `interface School` into `SchoolCheckboxGroup.tsx` (or `Schools/index.ts`), delete the component. −150 L net.
- **Risk:** very low; type move is mechanical.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A5. `VerifySetup` page + `verifyUserManagement.ts` — one-time setup scaffolding, including a broken "make me admin" helper

- **What:** `src/pages/VerifySetup.tsx` (109 L), `src/utils/verifyUserManagement.ts` (222 L), the dev-only route at `App.tsx:197`, and the lazy import at `App.tsx:62-64`.
- **Evidence:** route is gated behind `import.meta.env.DEV`, so it is unreachable in production; the util is imported only by this page (`VerifySetup.tsx:2`).
- **Why vestigial:** it's a checklist that verifies the user-management **tables exist** — a one-time concern from the original build, long since settled (and better answered today by `supabase migration list` / the MCP tools). Bonus vibe-code: `setupAdminUser` (`verifyUserManagement.ts:168-221`) calls `supabase.auth.admin.listUsers()` **from the browser** — an admin API that can never work with the anon key — then falls back to trying to UPDATE the current user's own row to `role: 'admin'` (self-privilege-escalation that only RLS stands in front of). It cannot succeed, but it's exactly the kind of code that shouldn't exist at all.
- **Removal simplifies:** −331 L, one route, one lazy chunk; removes a confusing pseudo-privilege-escalation path.
- **Risk:** very low (dev-only).
- **Severity:** P3 (P2 flavor for the escalation-shaped code) · **Effort:** S · **Confidence:** high

### A6. `VirtualizedTable` + `utils/virtualization.ts` — an entire virtualization system with zero users, holding an npm dependency hostage

- **What:** `src/components/Common/VirtualizedTable.tsx` (217 L), `src/utils/virtualization.ts` (40 L: `VIRTUALIZATION_THRESHOLDS`, `DIMENSIONS`, `shouldVirtualize`).
- **Evidence:** `VirtualizedTable` is referenced only by the barrel `Common/index.ts:9`. `virtualization.ts` is imported only by `VirtualizedTable.tsx:3`. `@tanstack/react-virtual` (`package.json:61`) is imported **nowhere else** in `src`.
- **Why vestigial:** built for rendering thousands of table rows. The biggest tables in the app are the admin user list (~3 rows) and the review queue. Textbook built-for-scale-that-doesn't-exist.
- **Removal simplifies:** −257 L **and removes the `@tanstack/react-virtual` dependency entirely** (smaller install, one less Dependabot stream).
- **Risk:** very low.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A7. Four dead utility/config files

| File | Lines | Evidence it's dead |
|---|---|---|
| `src/utils/authHelpers.ts` | 14 | sole export `hasAdminOrReviewerAccess` — 0 imports anywhere |
| `src/utils/duplicateConstants.ts` | 88 | `CATEGORY_INFO` / `ACTION_INFO` / `COLOR_CLASSES` — 0 imports (old admin-Duplicates UI vocabulary: match categories, "archive/keep" actions) |
| `src/utils/facetHelpers.ts` | 18 | sole export `getFacetCount` — 0 imports. **Not** the live `facetCounts.ts` (that one is used by SearchPage/IntSidebar); this is a near-namesake leftover that invites edit-the-wrong-file mistakes |
| `src/config/version.ts` | 23 | `APP_VERSION` + `VERSION_HISTORY` (changelog frozen at "2.0.0, 2025-01-24", still advertising Algolia removal and embedding dedup) — 0 imports; the whole `src/config/` dir exists for this |
- **Removal simplifies:** −143 L, deletes the `src/config/` directory, removes the `facetHelpers` vs `facetCounts` confusion trap.
- **Risk:** none.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### A8. `lessonToReviewMapper.ts` — production file whose only consumer is another file's test

- **What:** `src/utils/lessonToReviewMapper.ts` (97 L, export `lessonToReview`).
- **Evidence:** only import is `reviewToLessonMapper.test.ts:3`, which uses it for a round-trip property test.
- **Why vestigial (partially):** it's genuinely useful *as a test oracle*, but it ships in `src/utils` looking like production code.
- **Removal simplifies:** move it into `src/__tests__/helpers/` (or inline into the test) so the utils folder only contains code the app runs.
- **Risk:** low — keep the round-trip test intact.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

---

## B. Dead exports inside live files

### B1. `lib/supabase.ts` — two dead helpers and a wasted network request on every page load

- **Dead exports:** `handleSupabaseError` (`supabase.ts:38-45`) and `buildSearchQuery` (`supabase.ts:48-60`) — 0 callers each. `buildSearchQuery` is a leftover *third* search-query mechanism (hand-rolled tsquery builder) superseded by the `search_lessons` RPC + `parseSearchQuery`.
- **Also:** a module-load "connection test" (`supabase.ts:25-36`) fires a real `HEAD` count query against `lessons_with_metadata` **on every page load for every visitor** — including anonymous teachers on public search — and does nothing with the result but log an error. Its success branch is already commented out.
- **Removal simplifies:** −~35 L; one fewer request per visit; kills the last remnant of the pre-RPC search path.
- **Risk:** very low.
- **Severity:** P2 (the per-visit request) / P3 (the dead exports) · **Effort:** S · **Confidence:** high

### B2. `lib/sentry.ts` — elaborate unused machinery (94 L of it)

- **Dead exports:** `setUserContext` + its private `hashEmail` (SHA-256 via WebCrypto **plus a hand-rolled 32-bit fallback hash**, `sentry.ts:200-244`) — 0 callers; user context is never set. `withErrorHandling` HOF (`sentry.ts:274-293`) — 0 callers.
- **Why vestigial:** privacy-conscious email hashing for a Sentry user-context feature that was never wired up; a generic async-wrapper abstraction nobody adopted.
- **Removal simplifies:** −~94 L from a security-sensitive file, making what *actually* reports to Sentry auditable at a glance.
- **Risk:** very low.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### B3. `utils/logger.ts` — dead methods and two behavioral booby traps

- **Dead surface:** `logger.info` — **0 callers**; `logger.track` — **0 callers** (verified by grep). `logger.log` is used in only 2 files, one of which is the dead `verifyUserManagement.ts` (A5).
- **Booby trap 1:** `logger.info`'s production path (`logger.ts:166-177`) promotes any message containing the substrings `"success"` or `"complete"` into a real Sentry event (`captureMessage`) — a magic-string heuristic that would create noise events if anyone ever started using `.info`.
- **Booby trap 2:** the sanitizer (`logger.ts:34-49`) replaces any *string argument* containing `key`, `auth`, `session`, `email`, etc. with `[REDACTED]` wholesale — so `logger.error('Session refresh failed')` logs as `[REDACTED]`. Over-redaction that destroys the diagnostics the logger exists to provide.
- **Removal simplifies:** delete `info`/`track`/`log`, keep `debug`/`warn`/`error`; narrow redaction to object *values* under sensitive keys (the `sanitizeObject` half is fine) rather than any message mentioning "session".
- **Risk:** low; `error`/`warn`/`debug` call sites (51/11/3) are untouched.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### B4. `lib/search.ts` — a feature flag nobody reads and a function that returns a constant

- **What:** `isSearchV2Enabled` (`search.ts:3`) reads `VITE_ENABLE_SEARCH_V2` and is consumed by **nothing** — not even `getSearchRpcName()` two lines below, which is hardcoded to return `'search_lessons'` (`search.ts:8-10`) and has exactly one caller (`useLessonSearch.ts:3`). `.env.example:58-59` still documents the flag.
- **Why vestigial:** scaffolding for a `search_lessons_v2` that was never built (search modernization went a different route and closed in June).
- **Removal simplifies:** delete the file + the `.env.example` entry, inline the string at the call site. One less phantom env var for the owner to wonder about in Netlify.
- **Risk:** none.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### B5. Stale hand-written types in `types/index.ts` duplicating/contradicting reality

- **Dead types (0 imports each):** `User` and `UserProfile` (`types/index.ts:71-86` — a *second*, stale user-profile shape with `subjects`/`school` fields that contradicts both `EnhancedUserProfile` and generated `database.types.ts`), `ApiResponse<T>` (`:126-130`), `FacetCount` (`:65-68`, orphaned along with `facetHelpers.ts`, A7 — the live code uses `FacetCounts` from `utils/facetCounts.ts`).
- **Dead union members:** `ViewState['sortBy']` still allows `'confidence' | 'grade'` (`types/index.ts:93`) but the UI offers only relevance/title/modified and the RPC coerces stale values (see the C58 comment at `IntToolbar.tsx:23-26`).
- **Dead plumbing:** `Lesson.confidence` `{overall,title,summary,gradeLevels}` is faithfully mapped from every search row (`useLessonSearch.ts:95-99`) and then **rendered nowhere** — its last consumer was the dead `IntConfidencePill` (A1) and the removed confidence sort.
- **Removal simplifies:** the types file becomes an honest picture of the app; deleting the confidence mapping trims every search result object.
- **Risk:** low; dropping `Lesson.confidence` touches `useLessonSearch` + fixtures, so do it as its own small change with `npm run check`.
- **Severity:** P3 · **Effort:** S–M · **Confidence:** high

### B6. Assorted dead exports

- `DefaultErrorFallback` (`Common/ErrorBoundary.tsx`, re-exported `Common/index.ts:1`) — 0 users; every boundary passes an explicit fallback.
- `utils/filterUtils.ts`: `getCultureDescendantValues` (`:30`), `formatCategoryName` (`:51`), `getCategoryIcon` (`:70` — an emoji-per-category map from the pre-design-system UI) — 0 non-test callers; only `buildCultureLabelMap` is live.
- `searchStore.ts` / `types/index.ts`: `resultsPerPage` is state that is never *set* anywhere (fixed 20 at `searchStore.ts:76`, read once at `SearchPage.tsx:65`) — a constant cosplaying as state.
- `src/utils/CLAUDE.md` "Key Files" table references `filterConstants.ts`, which does not exist — stale doc pointer.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

---

## C. Parallel mechanisms doing the same job

### C1. Two debounce implementations, one call site each — and one changes behavior under test

- **What:** `hooks/useDebounce.ts` (value-debounce hook; sole user `AdminUsers.tsx:49`) and `utils/debounce.ts` (function-debounce; sole user `Header.tsx:20,191-213`).
- **The worse part:** `utils/debounce.ts:13-24` sniffs `VITEST_WORKER_ID`/`NODE_ENV` and, **in tests, skips debouncing entirely** (synchronous passthrough). Production ships different behavior than any test ever exercises — the header search debounce is untestable by construction.
- **Simplification:** pick one (the hook is simpler), convert the Header to it, delete `utils/debounce.ts` including the env-sniffing fork; use vitest fake timers where needed.
- **Risk:** low-medium — Header search is the public entry point; verify typing→results manually after the swap.
- **Severity:** P3 · **Effort:** S–M · **Confidence:** high

### C2. Three stacked global error boundaries with two duplicate fallback UIs

- **What:** render-error handling is layered three deep: ① `Sentry.ErrorBoundary` with a ~30-line inline fallback UI (`main.tsx:19-50`), ② custom `ErrorBoundary` + `AppErrorFallback` (`App.tsx:209-214`), ③ custom `ErrorBoundary` + `RouteErrorFallback` (`App.tsx:104`). (The keyed `ReviewErrorBoundary` at `App.tsx:90-97` is separate and **load-bearing** — leave it alone.)
- **Why vestigial:** ①'s fallback can effectively never render (② catches first, and ② already reports to Sentry via `logger.error` → `captureException`), yet it's the most elaborately styled of the three. Two hand-rolled "Something went wrong" cards will drift apart.
- **Simplification:** keep ② (app-fatal) and ③ (route-level); reduce ① to a bare `Sentry.ErrorBoundary` with the same `AppErrorFallback`, or drop it and keep only the custom pair. −~35 L and one canonical error card.
- **Risk:** medium-low; error paths are rarely exercised, so smoke it by throwing in a test component in dev.
- **Severity:** P3 · **Effort:** M · **Confidence:** medium (facts high; consolidation choice needs a human call)

---

## D. Built for scale/roles that don't exist (~3 logged-in users)

### D1. 13-permission RBAC with per-user override merging — 7 permissions never checked, override UI never built

- **What:** `types/auth.ts:10-29` defines 13 `Permission`s; grep shows only 6 are ever checked anywhere (`VIEW_USERS` ×11, `VIEW_ANALYTICS` ×7, `REVIEW_LESSONS` ×6, `INVITE_USERS` ×2, `EDIT_USERS` ×1, `DELETE_USERS` ×1). `VIEW_LESSONS`, `SUBMIT_LESSONS`, `APPROVE_LESSONS`, `DELETE_LESSONS`, `MANAGE_ROLES`, `EXPORT_DATA`, `SYSTEM_SETTINGS` exist only in `DEFAULT_PERMISSIONS`.
- **Plus:** `useEnhancedAuth.ts:122-148` implements a 27-line per-user permission-override merge (custom grants + explicit revocations from a `permissions` JSONB column) — and the admin UI deliberately never exposes it: `AdminUserDetail.tsx:880` literally says `{/* intentionally empty — no permissions matrix */}`. So the override engine can only ever see data nobody can enter.
- **Plus:** `ProtectedRoute` props `requireAll` / `fallback` / `redirectTo` (`ProtectedRoute.tsx:10-12`) are never passed by any of the 9 routes in `App.tsx` — always default.
- **Why it's safe to shrink:** the *real* enforcement is RLS + edge functions server-side; the frontend checks are cosmetic gating. Role-derived permissions (the `DEFAULT_PERMISSIONS` lookup) are all the product uses.
- **Simplification:** trim the enum to the 6 live permissions, delete the override-merge block, drop the unused ProtectedRoute props. Keeps the `hasPermission` call-site API intact, so the blast radius is `types/auth.ts` + `useEnhancedAuth` + its (758-line!) test.
- **Risk:** medium-low — pure frontend gating; RLS is unaffected. Verify admin/review nav still renders per role on TEST creds.
- **Severity:** P3 · **Effort:** M · **Confidence:** high (facts) / medium (that trimming is worth the test-file churn now)

### D2. `useEnhancedAuth` silently creates a TEACHER profile for any authenticated user missing one — self-signup-era logic on an invite-only site

- **What:** `useEnhancedAuth.ts:32-67`: if a logged-in user has no `user_profiles` row, the hook client-side INSERTs one with `role: 'teacher'`.
- **Why vestigial:** since T3 (invite-only, no signup), profiles are created by the invitation-accept flow. A missing profile now signals something *wrong* (half-deleted user, failed invite), and this code papers over it from the browser.
- **Also worth knowing:** `useEnhancedAuth` is a plain hook, not a context — its 8 consumers (Header, ProtectedRoute, 6 pages) each run their own `getUser()` + profile fetch + auth listener. Works fine at this scale; just don't mistake it for shared state.
- **Simplification:** replace auto-create with "treat as signed-out + log error." −~35 L and one masked failure mode.
- **Risk:** medium — confirm `AcceptInvitation` truly creates the profile row in all paths (invite → accept → first login) on TEST before removing the crutch.
- **Severity:** P3 · **Effort:** M · **Confidence:** medium (the *dependency check* is the unknown, not the diagnosis)

### D3. `AdminAnalytics` — 631 lines + the `recharts` library to chart ~3 users

- **What:** `src/pages/AdminAnalytics.tsx` renders "Total users / Active users / Invitations sent / Acceptance rate" stat cards (`:469-497`), a user-growth line chart (`:507-508`), a **role-distribution pie chart** (`:539-540`), and a 7/30/90-day range selector (`:111,444-445`) — over a population of ~3 internal accounts that essentially never changes. `recharts` (`package.json:74`) is imported by this file **only**.
- **Simplification options:** (a) delete the page + route + nav link + `recharts` (biggest win: a heavy dependency gone from install/build/Dependabot); (b) keep a chartless stat-card version. Owner's call — this is a product decision, not just hygiene.
- **Risk:** low technically; it's reachable UI, so confirm the owner doesn't use it before deleting.
- **Severity:** P3 · **Effort:** M · **Confidence:** high (facts) / n/a (keep-or-kill is a product call)

### D4. `AdminUsers` bulk operations + filter machinery for a 3-row table

- **What:** `AdminUsers.tsx` (685 L) has multi-select checkboxes, a bulk-actions dropdown with focus-trap management (`:61-69,235-251`), bulk delete with count confirmation (`:265-275`), and a dedicated edge-function sub-route call (`POST user-management/users/bulk`, `:284-287`). `UserFilters` (`types/auth.ts:177-185`) supports search/role/active/borough/school/sort — for a list of ~3.
- **Also:** `AdminInviteUser.tsx:85-86,253-254` still initializes and submits `grades_taught: [] / subjects_taught: []` — fields the app never displays or consults (kept backend-only by prior decision).
- **Simplification:** if/when this page is next touched, drop bulk-select UI + the borough/school filters; leave the edge function alone (server side is out of scope here). Low urgency — it works.
- **Risk:** medium (it's live admin UI with an edge-function contract); do not bundle with the pure deletions.
- **Severity:** P3 · **Effort:** L · **Confidence:** high (facts) / medium (net value of removal)

---

## E. CSS systems layered on each other

### E1. ~515 lines of orphaned rules in `internal-admin.css` (mostly deleted-Duplicates-page styling, plus a kanban board that never shipped)

- **What:** `src/styles/internal-admin.css` is 3,033 lines. Measured: of 407 distinct `.adm-*`/`.int-*` simple classes defined across both internal stylesheets, **90 appear nowhere in `src` TS/TSX**; after excluding variants that are built dynamically at runtime (`adm-status--${status}` via `IntStatusBadge.tsx:33`, `adm-dup-matchtype--${matchType}` via `IntDuplicateCard.tsx:64` — those are live), **77 truly-dead classes remain, spanning ~93 rule blocks ≈ 515 lines**.
- **Dead clusters:** `adm-kanban*` (a whole kanban-board system — no kanban exists anywhere in the app), `adm-dup-compare*`/`adm-dup-group*`/`adm-sim-slider*`/`adm-group-progress*`/`adm-keep-radio`/`adm-bulkbar*`/`adm-archive-picker` (the T4b-removed admin Duplicates pages), `adm-spec-card*`, `adm-step*` (a step-wizard), `adm-confidence-bar*`, plus `adm-confidence-pill--*`/`adm-method-chip--*` (die with A1).
- **Note:** this measurement counts classes used by the *currently-dead* components in A1 as "used" — so deleting A1 first frees slightly more.
- **Removal simplifies:** ~17% of the biggest CSS file; less scrolling past ghosts when styling admin pages.
- **Risk:** low-medium — CSS-in-string dynamic construction is the false-positive hazard; the two known dynamic patterns above are already excluded, but re-grep each cluster name before deleting (the measured list can be regenerated with the same script).
- **Severity:** P3 · **Effort:** M · **Confidence:** high for the named clusters; medium for long-tail singles

### E2. The legacy Tailwind component layer in `index.css` is 100% unused

- **What:** `index.css:70-119` (`@layer components`: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`, `.filter-badge`, `.lesson-card` + gradient `::before` hover effect, `.lesson-tag`, `.lesson-tag-season/theme/culture`) and `index.css:121-148` (`@layer utilities`: `.text-balance`, `.scrollbar-hide`, `.line-clamp-2/3`).
- **Evidence:** 0 className references in `src` for every one of them (`.card` verified separately — the 108 raw grep hits are substrings of `IntCard`/`adm-*-card` etc.; no `className="card"` exists). These styled the pre-design-system public UI; the internal design system (`.int-*`) replaced that surface, and `line-clamp-*`/`text-balance` are native Tailwind v4 utilities anyway.
- **Also:** two color-token systems coexist by design (`--color-primary/accent-*` for older admin/submission chrome vs `--color-esy-*` for the design system, `index.css:29-33` documents this). That layering is *acknowledged* and live — not flagged for removal, just noting the direction of travel is `esy-*`.
- **Removal simplifies:** −~78 L; new pages can't accidentally resurrect the old visual language.
- **Risk:** very low.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

---

## F. Minor / for completeness

- **F1. `FEATURES` flag system has exactly one flag** (`utils/featureFlags.ts` → `GOOGLE_DOC_EMBED`, default-on unless `VITE_ENABLE_DOC_EMBED === 'false'`). It *is* genuinely consumed (`ReviewDocPanel.tsx:29,49,62` + a test spy), so keep the behavior — but the ceremonial "feature flag registry" file for one boolean could collapse into the consumer whenever convenient. P3 · S · high.
- **F2. Route lazy-loading remap boilerplate** (`App.tsx:20-64`): 15 near-identical `lazy(() => import(...).then(m => ({default: m.X})))` blocks. Harmless and working; a tiny `lazyNamed(loader, name)` helper would halve it, but this is optional taste. P3 · S · high.
- **F3. `AuditValues`/`AuditAction`/`UserManagementAudit` types are live** (AdminUserDetail + IntActivityTimeline) — *not* dead despite living next to D1's unused permissions; don't over-delete in `types/auth.ts`.

---

## Quick-win deletion manifest (Section A + B, one or two PRs)

| Target | LOC | Also removes |
|---|---|---|
| A1 five Int components + tests + barrel entries | ~600 | unblocks E1 CSS |
| A2 ReviewContent + ReviewActions | 181 | a duplicate doc-panel mechanism |
| A3 EditableTitle + validation.ts | 165 | `components/Admin/` dir |
| A4 SchoolSelector (keep `School` type) | ~150 | |
| A5 VerifySetup + verifyUserManagement + dev route | 331 | escalation-shaped dead code |
| A6 VirtualizedTable + virtualization.ts | 257 | **`@tanstack/react-virtual` dependency** |
| A7 authHelpers, duplicateConstants, facetHelpers, version | 143 | `src/config/` dir |
| A8 lessonToReviewMapper → test helper | (move) | |
| B1–B6 dead exports/types/plumbing | ~250 | per-visit HEAD request (B1) |
| E2 legacy index.css layers | ~78 | |
| **Total straight deletions** | **~2,150 L of TS/TSX + ~590 L CSS (with E1)** | **1 npm dep (2 with D3)** |

Validation for the deletion PR(s): `npm run check` + `npm run test:run` (both fast), then a manual smoke of public search, review detail, and admin users — the only live surfaces adjacent to the deletions.
