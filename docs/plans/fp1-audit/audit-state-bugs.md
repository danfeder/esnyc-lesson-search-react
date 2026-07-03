# FP1 Audit — State Management & React Lifecycle Bugs

**Date:** 2026-07-03 · **Scope:** `src/pages`, `src/components`, `src/hooks`, `src/stores` · **Mode:** read-only code audit (no code or data changed)

## Plain-language summary

Good news first: **the public search page is in solid shape.** The tricky parts — keeping the address bar in sync with the filters, not flashing "No matches" while results load, infinite scroll, the search box debounce — were all checked carefully and no user-breaking bug was found there. The store follows its own rules (page resets on every filter change, no state mutation).

What I did find, in order of importance:

1. **"Sign in, then we'll submit your lesson for you" silently does nothing.** On both lesson-submission forms, if a signed-out teacher clicks Submit, we pop up the sign-in box and promise to finish the submission after sign-in. A wiring mistake cancels that promise the instant sign-in succeeds, so after signing in… nothing happens. The teacher has to click Submit again. Nobody loses data, but the flow quietly breaks its promise.
2. **The profile page can throw away edits you're typing.** Any background account event (the hourly session refresh, or changing your password on that same page) makes the profile page reload itself from the database — flashing a loading spinner and overwriting any half-typed edits in the form.
3. A handful of smaller things: review-queue tab clicks can briefly show the wrong tab's rows on a slow connection; every page load fires two database queries whose answers are never shown to anyone; the "did you mean…" suggestion service is called on every search even though its answer is only shown when there are zero results; and the Location filter is documented as pick-one but the sidebar lets you tick all three boxes.

Nothing here is a "site is broken" (P1) issue. Items 1 and 2 are worth fixing before wider teacher rollout; the rest are cleanup.

**Severity:** P1 user-breaking / P2 degraded / P3 polish · **Effort:** S / M / L

---

## Findings

### F1 — P2 · Post-sign-in auto-submit is dead on both submission forms

**Severity/Effort/Confidence:** P2 · S · **High**

**Files:**
- `src/components/Auth/AuthModal.tsx:63-64` — on successful sign-in the modal calls `onSuccess?.()` **then `onClose()`**.
- `src/pages/NewSubmissionForm.tsx:164-167` — `onClose` handler does `pendingSubmitRef.current = false`.
- `src/pages/NewSubmissionForm.tsx:47-52` — the `useEffect([user])` that is supposed to `formRef.current?.requestSubmit()` when sign-in completes, gated on `pendingSubmitRef.current`.
- Identical pattern in `src/pages/RevisingSubmissionForm.tsx:51-56` and `:233-236`.

**Mechanism:** When a signed-out user clicks Submit, `handleSubmit` sets `pendingSubmitRef.current = true` and opens the AuthModal. On successful sign-in, AuthModal invokes `onSuccess()` **and then `onClose()`** in the same synchronous continuation (`AuthModal.tsx:63-64`). The forms' `onClose` — written for the *dismissal* case — synchronously clears `pendingSubmitRef`. The `[user]` effect that would auto-submit is a passive effect: it flushes *after* that continuation (React passive effects run after paint, long after the microtask that ran `onSuccess`/`onClose`). So by the time the effect reads the ref, it is already `false` → `requestSubmit()` never fires.

**Proof by contrast:** `src/pages/SubmissionPage.tsx:80-86` uses the same modal but navigates *inside* `onSuccess` (synchronously, before `onClose` clears its `pendingIntent`) — which is why that page's flow works and the two forms' flow doesn't.

**User-visible failure:** Signed-out teacher fills in the Google Doc URL → clicks Submit → signs in → modal closes → **nothing happens**. No submission, no error, no success screen. The form data is still there, so clicking Submit a second time works — but a teacher may believe they already submitted.

**Fix direction (smallest):** in AuthModal's success path, call only `onSuccess` and let the consumer close; or in the two forms, don't clear the ref in `onClose` when the close was success-initiated (e.g. clear it in a dedicated `onDismiss`). One-line-ish either way.

---

### F2 — P2 · UserProfile reloads (and clobbers in-progress edits) on any auth event

**Severity/Effort/Confidence:** P2 · S–M · **High** for the password-change trigger (deterministic); **Medium** for the token-refresh trigger (needs the page open ~an hour / a tab-refocus refresh).

**Files:**
- `src/hooks/useEnhancedAuth.ts:109-116` — `onAuthStateChange` calls `fetchUserProfile(session.user)` on **every** event with a session (`TOKEN_REFRESHED`, `USER_UPDATED`, `SIGNED_IN`), and `fetchUserProfile` always `setUser({...})` with a **new object identity** (`useEnhancedAuth.ts:70-76`).
- `src/pages/UserProfile.tsx:99` + `:133` — `loadUserProfile` / `loadSubmissions` are `useCallback([user])`, so their identity changes with `user`.
- `src/pages/UserProfile.tsx:196-201` — `useEffect([user, authLoading, loadUserProfile, loadSubmissions])` re-runs both loaders whenever the `user` object identity changes.
- `src/pages/UserProfile.tsx:110-113` — `loadUserProfile` unconditionally `setFormData(...)` from the DB row.
- `src/pages/UserProfile.tsx:271-281` — `if (authLoading || loading)` early-returns the whole page to a spinner while reloading.

**Mechanism:** Any auth event → new `user` object → effect refires → `setLoading(true)` (full-page spinner replaces the form) → on resolve, `setFormData` overwrites whatever the user had typed. `editMode` survives (it's separate state), but the typed values are gone.

**Concrete repro (deterministic variant):** open `/profile` → "Edit profile" → type a new name (don't save) → open "Change password" and change the password. `supabase.auth.updateUser` fires `USER_UPDATED` → the page flashes to "Loading your profile…" and the unsaved name edit is silently reverted. The slow variant: leave the profile edit form open across the ~hourly token refresh → same reset with no user action at all.

**Fix direction:** key the load effect on `user?.id` (stable) instead of the `user` object; and/or have `loadUserProfile` not overwrite `formData` while `editMode` is true.

---

### F3 — P3 · Last-write-wins races on list fetches keyed to fast-changing UI state (ReviewDashboard tabs, AdminUsers filters, AdminUserDetail navigation)

**Severity/Effort/Confidence:** P3 (internal-only audience, needs slow responses + quick clicks) · M · **High** on mechanism, **Medium** on real-world frequency.

**Files:**
- `src/pages/ReviewDashboard.tsx:97-106` — effect on `[filter]` runs `checkAuth()` then `loadSubmissions()` with **no cancellation/abort and no staleness guard**; `loadSubmissions` (`:136-149`) applies the response with `setSubmissions(...)` whenever it lands.
- `src/pages/AdminUsers.tsx` — `loadUsers` is `useCallback([filters, page])` (ends `:217`), driven by `useEffect([loadUsers])` (`:219-221`), same no-guard pattern; the debounced search (`:73-76`) makes two-in-flight overlap easy.
- `src/pages/AdminUserDetail.tsx:226-231` — `loadAll` keyed `[userId]`, effect re-runs on param change without cancelling the previous request (this page is NOT key-remounted the way `/review/:id` is — see `App.tsx:90-97` which fixed exactly this class for ReviewDetail).

**User-visible failure:** reviewer clicks the "Pending" tab, then quickly "Approved": if the Pending response resolves last, the Approved tab shows Pending rows (and vice versa) until the next interaction. Same shape on AdminUsers (search/filter results from the previous query) and AdminUserDetail (previous user's data shown for the new user's URL if the old response lands last).

**Bonus inefficiency:** `ReviewDashboard.checkAuth()` re-runs `getUser` + a `user_profiles` query on *every tab click* (`:97-106`), not just on mount.

**Fix direction:** the standard stale-guard — a request-id ref (exactly like `LessonSearchPicker.tsx:49,63,80` already does in this codebase) or moving these to React Query.

---

### F4 — P3 · `useEnhancedAuth` is per-consumer: 3+ parallel auth listeners and duplicate profile fetches

**Severity/Effort/Confidence:** P3 · M · **High** (mechanism is plain; impact is waste, not breakage)

**Files:** `src/hooks/useEnhancedAuth.ts:102-119` (each hook instance registers its own `onAuthStateChange` + runs its own `checkUser`/profile fetch); consumers: `src/components/Layout/Header.tsx:39`, `src/components/Auth/ProtectedRoute.tsx:22`, `src/pages/UserProfile.tsx:69`.

**Mechanism:** the hook is not context-backed, so a page like `/profile` mounts three independent instances → three subscriptions, and every auth event triggers **three** `user_profiles` round-trips. Each instance holds its own `user` copy, so surfaces can briefly disagree (e.g. Header menu vs page) while the fetches interleave. There is also a first-sign-in race where `checkUser` and the `SIGNED_IN` listener both fetch (and, for a missing profile row, both attempt the insert at `useEnhancedAuth.ts:47-51` — the loser falls into the `createError` fallback that sets a default-TEACHER basic profile, `:53-59`). With ~3 invited internal accounts whose profiles all exist, this is waste + latent-risk rather than live breakage.

**Fix direction:** lift to a single `AuthProvider` context (one listener, one fetch per event), or cache per-`user.id` via React Query.

---

### F5 — P3 · `ScreenReaderAnnouncer` subscribes to the whole store (banned pattern) and announces on page load

**Severity/Effort/Confidence:** P3 · S · **High**

**Files:** `src/components/Common/ScreenReaderAnnouncer.tsx:21` — `const { filters } = useSearchStore();` is the exact whole-store destructure that `src/pages/CLAUDE.md` ("SearchPage Issues") and `src/components/CLAUDE.md` ("Store Usage") flag as wrong; every store write (view/density/sort toggles included) re-renders it. Secondary: the effect at `:24-58` sets "All filters cleared. Showing all N lessons." on the **first settle after mount** with no user action — a screen-reader user hears a spurious "filters cleared" announcement just for landing on the page.

**User-visible failure:** minor — extra re-renders are cheap here; the real user-facing part is the spurious mount announcement for screen-reader users.

**Fix direction:** `useSearchStore((s) => s.filters)` + skip the first settled announcement (e.g. `useRef` first-run flag).

---

### F6 — P3 · smart-search suggestions edge function is invoked on every query, but its output is only shown on zero results

**Severity/Effort/Confidence:** P3 · S · **High**

**Files:** `src/pages/SearchPage.tsx:77-80` — `useLessonSuggestions({ filters, enabled: !!filters.query?.trim() })`; the render gate at `SearchPage.tsx:197-201` shows suggestions only when `totalCount === 0`. `src/hooks/useLessonSuggestions.ts:15-17,44` — enabled purely on non-empty query; each (query × filters) combination invokes the `smart-search` **edge function**.

**User-visible failure:** none directly — this is a cost/latency leak: every public search with a term burns an edge-function invocation whose result is discarded whenever there are any results (the overwhelmingly common case). On a public, no-login search page this scales with all visitor traffic.

**Fix direction:** gate `enabled` on the main search having settled at zero (`totalCount === 0 && !isPending && !isPlaceholderData`) — accepted tradeoff: suggestions appear one round-trip later in the rare zero-result case.

---

### F7 — P3 · Two dead database queries on every page load for every visitor

**Severity/Effort/Confidence:** P3 · S · **High**

**Files:**
- `src/lib/supabase.ts:25-35` — module-scope "connection test": a `lessons_with_metadata` count query runs at import time on **every app load**, result unused (success branch is commented out).
- `src/App.tsx:100` — `useLessonStats()` fetches a live-lesson count (`src/hooks/useLessonStats.ts:21-49`) and passes it to `Header`, which **explicitly ignores it** (`src/components/Layout/Header.tsx:22-28`: "Retained for backwards compatibility … unused"). When it resolves, the `AppContent` state update re-renders the whole app tree for nothing (the `App.tsx:78-89` comment even engineers around this re-render).

**User-visible failure:** none visible; two wasted DB round-trips per visitor load and one gratuitous app-wide re-render. Free removal.

**Fix direction:** delete the module-scope test; delete `useLessonStats` from `AppContent` + the two vestigial Header props.

---

### F8 — P3 · `useFacetCounts` memo is defeated — recomputes on every SearchPage render

**Severity/Effort/Confidence:** P3 · S · **High** on mechanism, low impact at current corpus size

**Files:** `src/pages/SearchPage.tsx:73-75` — `lessons` is rebuilt via `flatMap` **every render**, so `useFacetCounts(lessons)`'s `useMemo([lessons])` (`src/utils/facetCounts.ts:165-167`) never hits cache. Every render of SearchPage (filter changes, drawer select, fetch-state flips, viewport changes) re-tallies all loaded lessons × 10 facet keys (incl. the heritage ancestor expansion).

**User-visible failure:** none today (~700 lessons max is fast); it's a footgun that grows with pagination depth and negates a memo the code clearly intended.

**Fix direction:** `const lessons = useMemo(() => (data?.pages ?? []).flatMap(p => p.lessons), [data])`.

---

### F9 — P3 · Location filter is declared single-select but rendered as a free multi-select

**Severity/Effort/Confidence:** P3 · S · **High** on the divergence itself; unknown user harm (needs a stakeholder/product call, per the filter-change rule)

**Files:** `src/utils/filterDefinitions.ts:41-48` — `location: { type: 'single', ... }`. `src/components/Internal/IntSidebar.tsx:13-22` — `location` sits in `CHECKBOX_KEYS` and is rendered as an ordinary multi-checkbox group; nothing anywhere reads `cfg.type` to enforce single-select. `src/utils/urlParams.ts:30-33` even asserts "`location` is single-select in the UI" — which is no longer true.

**User-visible failure:** a visitor can tick Indoor + Outdoor + Both simultaneously. With the option set {Indoor, Outdoor, Both}, multi-OR semantics are at best confusing (does Indoor+Outdoor equal Both?) and the counts badge math (`IntSidebar.tsx:91`) treats them as independent buckets. Root CLAUDE.md documents Location as the one single-select filter, so either the definition or the sidebar is wrong.

**Fix direction:** decide with stakeholders: either honor `type:'single'` in `IntSidebar` (radio-style: selecting one clears the others), or re-type the filter as `multiple` and fix the doc/comments.

---

## Minor notes (no individual writeup warranted)

- **Pending URL write lost on immediate navigation** — `src/hooks/useUrlSync.ts:121-125,130-137`: the 300 ms store→URL debounce is cancelled on unmount, so a filter toggled <300 ms before leaving the search page never reaches the URL; Back then restores the pre-toggle state. Consistent with replace-mode "best-effort URL" semantics; P3, leave unless someone complains. (The rest of useUrlSync — one-use echo token, canonical-string equality, StrictMode idempotence — checked out under adversarial interleavings.)
- **"No more results to load" shows even for single-page result sets** — `src/components/Common/InfiniteScrollTrigger.tsx:56-63` + `SearchPage.tsx:231`: a 5-result search ends with terminal copy meant for exhausted pagination. Cosmetic.
- **UserProfile success-banner timers aren't cleaned up / can cross-cancel** — `src/pages/UserProfile.tsx:182,224`: two overlapping saves can clear each other's banners early; timers not cleared on unmount (harmless in React 18+). Contrast with the correctly cleaned toast timers in `ReviewDashboard.tsx:91-95`.
- **ReviewDashboard renders a blank frame during the auth check** — `ReviewDashboard.tsx:267-269` returns `null` (not a spinner) until `checkAuth` resolves. Blank-flash on entry; internal-only.
- **`EditableTitle` appears to be dead code** — `src/components/Admin/EditableTitle.tsx` is exported from the barrel but has zero usages outside it (the T4b admin duplicate pages that used it were removed). Candidate for deletion, not a bug.
- **Sidebar facet counts tally only loaded pages** — `src/utils/facetCounts.ts:146` runs over the lessons fetched so far (first page ≈ 20), while `totalCount` can be hundreds; badge numbers grow as you scroll. Reads as an intentional W1c tradeoff, flagged here so it isn't mistaken for a counting bug later.
- **Drawer/split-rail keeps showing the previously selected lesson after filters change** — `SearchPage.tsx:51,248-256`: `selectedLesson` is never invalidated when the result set changes. Arguably intended (the lesson still exists); noting for completeness.

## Checked and found sound (for reviewer confidence)

- `searchStore` follows both store rules: every filter-mutating action resets `currentPage` to 1 (`searchStore.ts:91-95,122-171` incl. `hydrateUrlState:113-119`), and all writes are immutable spreads. Persist `partialize` correctly limits to view/density; a stale persisted `sortBy:'grade'` from old blobs self-heals on mount because URL hydration always overwrites `sortBy`.
- `useUrlSync` two-way sync: echo-token consumption, debounce supersession by external nav, unmount cleanup, and the hydration gate (`enabled: hydrated`) that prevents the empty-filter first RPC — all verified against back/forward, rapid-toggle, and StrictMode double-invoke scenarios.
- `useLessonSearch`: query key fully determines the derived RPC call; `keepPreviousData` + the `isPlaceholderData` gates on the scroll trigger, announcer, and suggestions panel are mutually consistent (the C59 set).
- `LessonSearchPicker` has a textbook request-id staleness guard (`:49,63,80-93`) — the pattern F3's pages should copy.
- `useReviewSubmission`/`ReviewDetail`: id changes are handled by the `key={id}` remount (`App.tsx:90-97`), the seed applies via one `useLayoutEffect`, reviews-fetch errors block the form (R2-1), and the decision panel disables all actions while `saving`.
- `useSearchEscapeHatch`, `IntersectionObserver` cleanup, `useMediaQuery`/`useDebounce` subscriptions/timeouts, Header click-outside listener, AuthModal state reset on close, toast timers on the admin pages — all correctly cleaned up.
