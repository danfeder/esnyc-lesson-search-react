# Rung 8 — Remaining fail-open fetch sites (post PR #591)

Scope: repo-wide supabase/fetch sites whose error branch renders nothing (empty/absent state), excluding files covered by open PRs #582–#595 (notably #591: ProtectedRoute, IntFetchError, LessonSearchPicker, useEnhancedAuth, ReviewDashboard, UserProfile; #594: useLessonById/useLessonSearch; #595: ReviewDashboard/ReviewDetail/useReviewSubmission tab+note work — error-handling in those files still checked but flagged as overlap-risk).

Findings (incremental):

## F1 — AdminUsers.tsx: user list load failure renders "No users found."
- **File:** `src/pages/AdminUsers.tsx:212-215` (catch), `:647` (emptyMessage)
- `loadUsers()` catch only does `logger.error(...)` — no toast, no error state. `users` stays `[]`, `loading` → false, table renders `emptyMessage="No users found."`.
- **Failure scenario:** transient network drop / RLS mis-eval / Supabase 5xx while an admin opens /admin/users → page confidently claims there are zero users. No retry affordance. Classic fail-open, exactly the FP-05 shape #591 fixed elsewhere.

## F2 — AdminUsers.tsx: schools filter list silently empty on error
- **File:** `src/pages/AdminUsers.tsx:257-260`
- `loadSchools()` catch logs only; `schools` stays `[]` → the school filter dropdown renders with no options and no error signal.
- **Failure scenario:** schools fetch fails → admin sees a school filter with nothing in it and assumes no schools exist / filter is broken. Minor severity (filter aid only).

## F3 — AdminUserDetail.tsx: fetch error renders "User not found."
- **File:** `src/pages/AdminUserDetail.tsx:221-223` (catch), `:454` (render)
- `loadAll()` catch logs only. On any error (including the primary `user_profiles` select throwing), `user` stays null → page renders "User not found." — an affirmatively WRONG message for a network/RLS error.
- Also sub-fetches (`auditRes` :179, `subsRes` :198, `revsRes` :210) are silently dropped on error → activity/submissions/reviews sections render empty with no signal.
- **Failure scenario:** admin clicks into a real user during a transient failure → told the user doesn't exist; may re-invite or assume deletion.

## F4 — AdminInvitations.tsx: load failure → transient toast, then misleading empty CTA
- **File:** `src/pages/AdminInvitations.tsx:146-148` (catch → toast), `:161-164` (toast auto-dismiss 3.2s), `:47` + `:665-686` (empty state)
- Error IS surfaced, but only as a toast that self-dismisses after 3.2s. After that the page rests in the "No invitations — Invite your first teacher or reviewer to get started." empty state.
- **Failure scenario:** admin tabs back to the invitations page after a failed load (or misses the toast) → sees a persuasive empty-state CTA implying zero invitations exist. Lower severity than F1/F3 (there is a signal) but the resting state still fails open. No retry button either.

## F5 — AdminInviteUser.tsx: schools dropdown silently empty on fetch error
- **File:** `src/pages/AdminInviteUser.tsx:101-110` (load + catch logs only)
- `schools` fetch failure → `schoolOptions` stays `[]`; the school select renders with no options and no error signal. Admin can still send the invite but cannot attach a school, and nothing says why.
- **Failure scenario:** transient failure while opening the invite form → teacher invited with no school association; admin assumes school list is just empty.

## F6 — AdminInviteUser.tsx: pending-invite duplicate check ignores `error` entirely
- **File:** `src/pages/AdminInviteUser.tsx:~122-133` (`const { data } = await supabase.from('user_invitations')...` — `error` never destructured)
- On query error `data` is null → `(data ?? []).length > 0` → `pendingInviteFound` silently false → the "pending invite already exists" warning fails open.
- **Severity: low** — backstopped by the `unique_pending_invitation_per_email` partial unique index + `isEmailDuplicateError` handling at submit time, so worst case is a late error instead of an early warning.

## F7 — SchoolCheckboxGroup.tsx: fetch error → explicit empty list, no signal (feeds AdminUserDetail school editor)
- **File:** `src/components/Schools/SchoolCheckboxGroup.tsx:46-48` — catch logs then `setSchools([])` ("Set empty array on error" by design).
- Sole non-test consumer is `src/pages/AdminUserDetail.tsx` (school-assignment editor). On fetch error the editor shows zero schools with no error/retry.
- **Failure scenario:** admin edits a user's schools during a transient failure → sees an empty school list; saving via the same page's school-save path (`AdminUserDetail.tsx:309-318` delete-then-insert) while options failed to load could tempt clearing assignments believing none exist. (The save path itself does surface errors via `setSaveError`.)

## Checked and NOT findings (for completeness)
- `useLessonStats.ts` error path: sets `error` in state, and counts fall back to 0 — but sole consumer `App.tsx:94` passes them to `Header`, whose `totalLessons`/`totalCategories` props are documented vestigial ("unused in the new thin topbar", `Header.tsx:12-16`). Inert; not user-facing.
- `useLessonSuggestions.ts:65-66` — hides suggestions on error by explicit design comment ("keep UI quiet"); acceptable for a suggestion affordance.
- AdminInviteUser + AdminInvitations **email-send** paths are already honest: `emailSent` flag / `emailDelivered` result drive distinct copy (`AdminInviteUser.tsx:190-216`, `AdminInvitations.tsx:200-260`); no silent "sent" claim.
- Submission forms (`NewSubmissionForm.tsx`, `RevisingSubmissionForm.tsx`), `ResetPassword.tsx`, `AcceptInvitation.tsx` — all set rendered error state via `setError`/`parseDbError`.
- `UserProfile.tsx`, `ReviewDashboard.tsx`, `useEnhancedAuth.ts`, `LessonSearchPicker.tsx`, `ProtectedRoute.tsx` — covered by open PR #591; `useFacetCounts` by #593; `useLessonById`/search by #594; `ReviewDetail`/`useReviewSubmission` by #595 (skipped per brief).
- `src/components/Review/*`, `src/stores/*`, `src/utils/*` — no direct supabase fetch sites found (data via props/hooks).

## Suggested fix shape
All of F1–F5 are the exact FP-05 pattern #591 already built tooling for (`IntFetchError` + retry). A follow-up PR can thread `IntFetchError` into AdminUsers list, AdminUserDetail main load (distinguish "not found" from "failed to load"), AdminInvitations resting state, and the two schools loaders.

## Verification (round 2)

Adversarial re-check against current main (`0ed0d5d`), error branches traced end-to-end from query → catch → render. All 7 claims hold; two get severity/nuance corrections (F3 nuance, F7 downgrade).

- **F1 — CONFIRMED (real fail-open).** Trace: `AdminUsers.tsx:118-120` `if (error) throw error` on the primary `user_profiles` query → catch at `:212-214` is `logger.error` only, no error state → `users` stays initial `[]` (`:46`) → `IntDataTable` renders `emptyMessage="No users found."` (`:647`). Secondary nuance the claim missed: on a *later* page/filter refetch error, `users` keeps the STALE previous page silently (no throw path resets it), so the admin sees old data labeled as current. **Severity for ~15-user tool: MODERATE** — highest of the batch alongside F3; admin-only page but the wrong message is confident and there's no retry. **Fix shape:** `loadError` state + `IntFetchError` w/ retry replacing the table when set (one state var + one conditional).

- **F2 — CONFIRMED.** `AdminUsers.tsx:255-261`: `loadSchools` uses `if (!error && data) setSchools(data)` + catch logs only — BOTH the non-throw error branch and the throw branch are silent; dropdown renders optionless. **Severity: LOW** (filter aid; users list still loads). **Fix shape:** fold into the same `loadError`/retry surface as F1, or a one-line "couldn't load schools" option in the select.

- **F3 — CONFIRMED (worst message of the batch).** Trace: `AdminUserDetail.tsx:151` `if (profileRes.error) throw profileRes.error` → catch `:221-223` logs only → `user` stays null → `:450-458` renders "User not found." Nuance: `.single()` (`:127`) returns PGRST116 on zero rows, so the genuinely-deleted-user case takes the SAME path — the message is right by accident for that case and affirmatively wrong for network/RLS/5xx. Sub-fetch claim also verified: `emailsRes/schoolsRes/auditRes/subsRes/revsRes` all guarded `if (!x.error…)` (`:164,:178,:186,:197,:209`) → silent empty sections. **Severity: MODERATE** — "user doesn't exist" can prompt a re-invite. **Fix shape:** set `loadError` in catch; render `IntFetchError`+retry when set; reserve "User not found." for `profileRes.error.code === 'PGRST116'`.

- **F4 — CONFIRMED as written (partial signal, fail-open resting state).** `AdminInvitations.tsx:146-148` catch → error toast; toast auto-dismissed at 3200 ms (`:161-164`); `invitations` stays `[]` → `:665-674` renders `EMPTY_COPY.all` "Invite your first teacher or reviewer to get started." with a prominent Invite CTA (`:47`). **Severity: LOW-MODERATE** (a signal exists but evaporates; resting state is persuasive-wrong). **Fix shape:** persistent inline error block instead of toast for the *load* failure (keep toasts for actions), + retry.

- **F5 — CONFIRMED.** `AdminInviteUser.tsx:98-110`: schools fetch throws into a log-only catch; `schoolOptions` stays `[]`. Invite still sendable, school silently unattachable. **Severity: LOW** (school attach is optional; assignment fixable later via AdminUserDetail). **Fix shape:** tiny inline "couldn't load schools — retry" next to the school select; don't block the form.

- **F6 — CONFIRMED, correctly graded low.** `AdminInviteUser.tsx:122-127`: `const { data } = await …` — `error` never read; on error `(data ?? []).length > 0` → false → warning fails open. Backstop verified real: `isEmailDuplicateError` handled at submit (`AdminInviteUser.tsx:219`) on top of the `unique_pending_invitation_per_email` partial unique index, so worst case = late error instead of early warning. **Severity: LOW.** **Fix shape:** destructure `error`; on error leave `pendingInviteFound` false but skip the "no pending invite" implication (or just log) — 2-line change.

- **F7 — CONFIRMED fail-open, but DOWNGRADE the data-loss tail.** `SchoolCheckboxGroup.tsx:46-48` catch → `setSchools([])` explicit; sole non-test consumer is `AdminUserDetail.tsx:803-805`. However the destructive scenario in the claim overstates: `editedSchools` is seeded from the user's own `user_schools` fetch in `loadAll` (`AdminUserDetail.tsx:97`, `:164-170`), NOT from the options list — so saving without touching checkboxes re-inserts the same assignments (`:313-316`); no silent clearing on save-as-is. The real harm is display-only: assigned schools render invisible/unchecked (options list empty), which could mislead an admin into manual re-editing. **Severity: LOW.** **Fix shape:** add `error` state to `SchoolCheckboxGroup` and render "couldn't load schools" + retry instead of an empty group (component-local, no API change).

**Batch verdict:** 7/7 real; ship as one small follow-up PR in the FP-05/#591 `IntFetchError` idiom. Priority order within the PR: F3 > F1 > F4 > F2/F5/F7 > F6. Nothing here is urgent for a ~15-user internal tool — all are transient-failure honesty fixes, no data-loss path confirmed (F7's was the only candidate and it doesn't survive the trace).
