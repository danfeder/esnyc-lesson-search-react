# FP1 Audit — Error Handling, Loading States, Empty States (src/ user-facing surfaces)

**Date:** 2026-07-03 · **Scope:** `src/` only, read-only audit · **Auditor:** Claude (Fable 5) subagent

## Plain-language summary

The good news: the parts of the site that got recent attention are in strong shape. The public
search page, the reviewer's decision screen, and the submission forms all show clear "loading",
"something went wrong", and "nothing found" messages, with retry buttons where they matter most.
The historically dangerous review-save path (where a silent failure could overwrite a prior
review) has been carefully hardened.

The remaining problems are all one pattern, in older corners of the app: **when a data fetch
fails, the code writes a note to the developer console and shows the user an "empty" screen
instead of an error.** So a network blip can make the reviewer's queue say "No submissions," a
teacher's profile say "No submissions yet" (hiding the resubmit button they came for), or a
lesson search say "No matches found" when the search actually broke. Nobody is told anything went
wrong, and there's no retry button. None of these lose data — they mislead, and a page refresh
fixes them — so everything below is "degraded" (P2) or "polish" (P3), not "broken" (P1).

There are 16 findings: 5 worth fixing soon (P2), 11 smaller polish items (P3). Almost all are
small fixes (add an error message + retry instead of showing the empty state).

**Severity:** P1 user-breaking / P2 degraded / P3 polish · **Effort:** S/M/L · every finding has a confidence line.

---

## P2 findings (degraded experience)

### 1. Review queue shows "No submissions" when the fetch actually failed

- **Where:** `src/pages/ReviewDashboard.tsx:226-230` (catch logs only) → render branch at `:304-310`
- **What happens:** `loadSubmissions()` throws on a DB/network error (`if (error) throw error` at `:149`); the catch does `logger.error(...)` and nothing else. `submissions` stays `[]`, `loading` flips false, and the page renders `IntEmptyState` — *"No submissions / Nothing matches this filter right now. Try another tab."*
- **Repro sketch:** open `/review` with the network throttled to fail the `lesson_submissions` select (DevTools → block `rest/v1/lesson_submissions`). The queue renders the friendly empty state; console has the only evidence.
- **Why it matters:** a reviewer can reasonably conclude the queue is empty and walk away; submissions sit unreviewed. This is exactly the T2-walkthrough fail-open pattern.
- **Fix shape:** add a `loadErr` state set in the catch; render an error card + Retry (the page already has the toast/`IntAlert` vocabulary).
- **Severity:** P2 · **Effort:** S · **Confidence:** high (code path read end-to-end)

### 2. Teacher profile shows "No submissions yet" when the fetch failed — hides the resubmit button

- **Where:** `src/pages/UserProfile.tsx:158-162` (catch logs only) → render branch at `:543-547`
- **What happens:** `loadSubmissions()` catch swallows the error; `submissions` stays `[]` and the "My submissions" card shows *"No submissions yet / Submit your first lesson to share with the community."*
- **Why it matters:** the teacher who came to `/profile` specifically to press *"I've updated my doc — send it back for review"* (T2b/T3b flow) instead sees a claim that they have never submitted anything. Misleading empty state + lost recovery path in the one flow the go-live tracker flags as never browser-clicked (see also finding 7).
- **Fix shape:** same as #1 — error state + retry inside the card.
- **Severity:** P2 · **Effort:** S · **Confidence:** high

### 3. LessonSearchPicker turns a failed query into "No matches found."

- **Where:** `src/components/LessonSearchPicker.tsx:84-88` (catch sets `results=[]`, `hasQueried=true`) → `:225-229` renders *"No matches found."*
- **Consumers:** ReviewDetail's search escape hatch (`src/components/Review/ReviewSearchPanel.tsx`) and the teacher UPDATE-target picker (`src/pages/RevisingSubmissionForm.tsx`).
- **What happens:** any thrown query error is logged at `logger.debug` (dev-only — invisible even in prod console) and rendered identically to a genuine zero-hit search.
- **Why it matters:**
  - Teacher path: "No matches found" while updating a lesson steers them to *"None of these is right — I'm updating but can't find it"* (`:231-240`), which submits with `originalLessonId: null` — the update loses its target binding and the reviewer has to reconstruct it.
  - Reviewer path: the escape hatch exists to find a merge target the cards missed; a silent failure reads as "it's not in the library."
- **Fix shape:** a third `errored` state rendering "Search failed — try again" instead of the no-matches card.
- **Severity:** P2 · **Effort:** S · **Confidence:** high

### 4. Auth profile-fetch blip silently signs the user "out" (visually) with no message

- **Where:** `src/hooks/useEnhancedAuth.ts:26-30`
- **What happens:** `fetchUserProfile` gets a *resolved* Supabase error (non-PGRST116 — e.g. transient network/RLS hiccup on `user_profiles`); the code logs, `setLoading(false)`, and returns **without ever setting `user`**. Every consumer (`Header`, `ProtectedRoute`, admin pages) now sees `user=null, loading=false`:
  - `ProtectedRoute` (`src/components/Auth/ProtectedRoute.tsx:38-39`) silently redirects the person to `/`;
  - the header shows the signed-out menu.
  There is no error surface and no retry — the user's only clue is "I got logged out?", fixed by refresh.
- **Note:** the `catch` branch at `:78-80` (`setUser(null)`) has the same net effect for thrown errors. Both are fail-open-to-anonymous: safe for security, but silent.
- **Repro sketch:** while signed in, block `rest/v1/user_profiles` and reload any protected page — you land on `/` with no explanation.
- **Severity:** P2 · **Effort:** M (needs an error channel in the hook + a decision on what callers show) · **Confidence:** high on the code path; medium on real-world frequency (single-flight fetch, only ~3 logged-in accounts)

### 5. ReviewDashboard tells a real reviewer "Access denied" on a transient profile error

- **Where:** `src/pages/ReviewDashboard.tsx:124-128` (error → `setIsReviewer(false); return false` — no redirect, no error message) → render branch `:271-282`
- **What happens:** `checkAuth()` fetches the role from `user_profiles` itself (independently of the `ProtectedRoute` wrapper, which does its own fetch via `useEnhancedAuth`). If this second fetch returns an error, `user` is already set (`:116`) so the page skips the `null` branch and renders the *"Access denied — You don't have permission to access the review dashboard."* screen. A permissions accusation for what is actually a network blip, with no retry.
- **Repro sketch:** as a reviewer, make the page's own `user_profiles?select=role` call fail (the ProtectedRoute one may succeed — they are separate requests) → Access denied screen.
- **Fix shape:** distinguish "profile fetch failed" (error + retry) from "role not allowed" (access denied); or drop the duplicate role check and trust `ProtectedRoute`.
- **Severity:** P2 · **Effort:** S · **Confidence:** high

---

## P3 findings (polish)

### 6. Profile fields silently blank on load failure

- **Where:** `src/pages/UserProfile.tsx:126-130` (catch logs only) → `:368` ("Not provided"), `:408` ("No schools assigned")
- **What happens:** `loadUserProfile()` failure leaves `formData` empty; the page renders as if the user simply hasn't filled anything in. Entering edit mode + saving from this state would write empty-ish values over real ones (`full_name: '' → undefined` is dropped by `handleSave`'s `|| undefined`, softening the risk).
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 7. Resubmit/save feedback banners render off-screen (top of page, no scroll/focus)

- **Where:** `src/pages/UserProfile.tsx:338-349` (banners at top) vs `handleResubmit` at `:165-194` (button lives far down in "My submissions"); success auto-dismisses after 4s (`:182`)
- **What happens:** a teacher deep in the page clicks resubmit; success/error banners appear at the top, potentially outside the viewport, and the success one self-dismisses. Perceived result: button spun, nothing happened. Contrast `ReviewDetail.tsx:111-118`, which focuses + `scrollIntoView`s its banner.
- **Relevant context:** the go-live tracker lists "resubmit button never browser-clicked" as a T5 residual — this is the kind of thing that smoke would catch.
- **Fix shape:** scroll/focus the banner, or render feedback inline next to the clicked card.
- **Severity:** P3 · **Effort:** S · **Confidence:** medium-high (static read; exact viewport behavior needs the browser click)

### 8. No catch-all 404 route — unknown URLs render a blank page

- **Where:** `src/App.tsx:110-198` (`<Routes>` has no `path="*"` entry)
- **What happens:** any unmatched URL renders the header over an empty `<main>`. This includes stale bookmarks to the admin duplicate pages removed in T4b (`/admin/duplicates`, `/admin/duplicates/review/...`) and any typo'd link.
- **Fix shape:** `<Route path="*" element={<NotFound />} />` with a link back to search.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 9. AdminUsers: fetch failure shows "No users found."

- **Where:** `src/pages/AdminUsers.tsx:212-216` (catch logs only) → table `emptyMessage="No users found."` at `:647`
- **What happens:** the admin user list renders its legit empty message on error. Admin-only audience (~3 accounts), page has a toast system it could reuse.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 10. AdminUsers: CSV export fails silently

- **Where:** `src/pages/AdminUsers.tsx:392-394`
- **What happens:** `handleExport` catch logs only; the click produces no file and no feedback. The page's `setToast` error pattern (`:340`) is right there.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 11. AdminUserDetail: transient error shows "User not found."; section fetch errors blank silently

- **Where:** `src/pages/AdminUserDetail.tsx:221-225` (catch logs only) → `:454` ("User not found."); sub-resource guards at `:164-219` (`if (!xRes.error) …` — error branch silently skipped for email/schools/audit/submissions/reviews)
- **What happens:** whole-load failure claims the user doesn't exist; partial failures render empty activity/schools sections with no signal.
- **Severity:** P3 · **Effort:** S–M · **Confidence:** high

### 12. AdminAnalytics: partial fetch failures render as real zeros

- **Where:** `src/pages/AdminAnalytics.tsx:263-265`, `:300-302`, `:380-384` (per-section catches log only); empty-copy branches at `:584`, `:600`, `:625`
- **What happens:** a failed section quietly contributes 0s / "No submissions in this period." — an admin reads wrong numbers, not an error. Low stakes today (internal dashboard), but misleading data is worse than a visible error.
- **Severity:** P3 · **Effort:** M (several sections) · **Confidence:** high

### 13. SchoolCheckboxGroup: fetch error renders "No schools available"

- **Where:** `src/components/Schools/SchoolCheckboxGroup.tsx:42-47` (catch → `setSchools([])`) → `:66-68` ("No schools available")
- **Consumer:** AdminUserDetail school editing. (Sibling `SchoolSelector.tsx:51-56` has the identical pattern but appears to have no page consumer today — export-only via the barrel.)
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 14. Public search error banner shows raw `error.message`, no retry affordance

- **Where:** `src/pages/SearchPage.tsx:148-161`
- **What happens:** the error card (good: it exists, `role="alert"`) prints the raw message — a public teacher can see `TypeError: Failed to fetch` or PostgREST internals. No Retry button (React Query does auto-retry once per `App.tsx:72`, and any filter change refetches, but the user isn't told that).
- **Fix shape:** friendly copy + a Retry button calling `refetch()`.
- **Severity:** P3 · **Effort:** S · **Confidence:** high

### 15. Header sign-out ignores the signOut result

- **Where:** `src/components/Layout/Header.tsx:56-60`
- **What happens:** `await supabase.auth.signOut()` — the resolved `{ error }` is never checked; the code closes the menu and navigates to `/` regardless. If sign-out failed (network), the header re-renders still signed-in with no explanation; an actual throw would leave the menu open and surface as an unhandled rejection.
- **Severity:** P3 · **Effort:** S · **Confidence:** medium (supabase-js signOut usually resolves `{ error }` rather than throwing; failure is rare and self-evident)

### 16. GoogleDocEmbed can show its loading skeleton indefinitely

- **Where:** `src/components/Review/GoogleDocEmbed.tsx:207-239`
- **What happens:** the error card is wired to `<iframe onError>`, which browsers rarely fire for cross-origin load failures; a doc blocked at network level can leave "Loading Google Doc..." forever with no timeout. Mitigations already present: the pre-flight screen and the Editor/Text toggle in `ReviewContent.tsx:29-56` give the reviewer a one-click escape, and permission-denied docs render Google's own error inside the frame.
- **Fix shape (optional):** a loading timeout (~10s) that flips to the existing error card.
- **Severity:** P3 · **Effort:** S · **Confidence:** low-medium (depends on browser iframe behavior; not reproduced live)

---

## Surfaces audited and found solid (no findings)

For coverage transparency — these were read end-to-end and follow the right patterns:

- **Public search core** (`useLessonSearch.ts`, `SearchPage.tsx`): C59 suite holds — cold-load skeleton, `keepPreviousData` prevents false "No matches" during refetch, suggestions panel gated on settled data, infinite-scroll trigger hidden during placeholder data, URL hydration gate prevents the pre-hydration empty flash (`useUrlSync.ts`).
- **Review load path** (`useReviewSubmission.ts`): reviews-fetch errors BLOCK with a retryable screen (R2-1) so a prior review can't be silently overwritten; submission-fetch errors split not-found vs retryable (F2); duplicate-card fetch failures surface a non-blocking Retry banner (`ReviewDecisionPanel.tsx:155-171`) instead of zero cards.
- **Review save path** (`ReviewDetail.tsx:141-282`): validation banners focus + scroll; save errors render with real messages; success is confirmed via a navigation toast on the queue (auto-dismissed, `ReviewDashboard.tsx:91-95`).
- **Submission forms** (`NewSubmissionForm.tsx`, `RevisingSubmissionForm.tsx`): both treat transport errors AND `{ success:false }` bodies as errors; `process-submission` deliberately returns user-facing failures as 200 `{ success:false }` so the real message reaches the teacher.
- **Auth pages** (`AuthModal.tsx`, `AcceptInvitation.tsx`, `ResetPassword.tsx`): loading/disabled buttons, visible error + success states, modal state reset on close.
- **AdminInvitations / AdminInviteUser**: toasts on load and per-action failures; email-send failure downgraded honestly ("email delivery may be delayed" + copyable link).
- **`useLessonSuggestions.ts:65-68`** swallows suggestion errors by design (suggestions are a nice-to-have; the primary search error still surfaces) — reviewed, accepted as intentional.

## Suggested fix order

1. Findings **1–3** (one shared pattern: error state + retry instead of empty state) — small, high-value, protects the reviewer queue and the teacher resubmit flow.
2. Findings **4–5** (auth-blip UX) — decide once how a transient profile failure should look, apply to hook + dashboard.
3. Finding **8** (404 route) — trivial, closes the removed-T4b-pages blank-screen hole.
4. Remaining P3s opportunistically when touching those files.
