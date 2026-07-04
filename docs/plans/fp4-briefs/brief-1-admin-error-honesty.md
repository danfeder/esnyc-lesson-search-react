# FP4 Brief 1 — Admin error honesty (M)

Read `docs/plans/fp4-briefs/README.md` (standing rules) first. Evidence: cluster **C2** in
`docs/plans/fp4-discovery/discovery-evidence.md` (findings AD/F1–F7, FP20a, FP20b) — every
file:line below was verified there 2026-07-03 and re-probed by Fable.

## Problem

Seven admin fetch sites swallow load failures and render confidently-wrong empty states; the
CSV export fails silently; and three list pages can apply a stale response after fast
tab-clicks. Admin-only (~3 accounts), frontend-only, no DB changes.

## Scope — one PR

Reuse the existing honest-error idiom throughout: the `IntFetchError` card + retry, as
already wired in ReviewDashboard's loadError branch (ReviewDashboard.tsx:359 area, landed in
#591). Do not invent a new error surface.

1. **AdminUsers list (F1).** `src/pages/AdminUsers.tsx:212-216` log-only catch →
   set a loadError state; render IntFetchError + Try again instead of the table;
   `"No users found."` (:647) only after a *successful* empty response. Also: a failed
   refetch currently keeps the previous page's rows labelled as the new query's result —
   the error state must cover that path too.
2. **AdminUserDetail (F3).** `src/pages/AdminUserDetail.tsx:221-225`. Reserve
   `"User not found."` (:454) for `profileRes.error?.code === 'PGRST116'` (genuinely no
   row); every other error → IntFetchError + retry. The five sub-fetches (guards at
   :163/:171/:179/:198/:210) may stay soft-fail, but add one inline "Couldn't load
   everything — retry" signal if any of them errored (don't silently render empty sections).
3. **AdminUsers school filter (F2).** `AdminUsers.tsx:255-262` — on error, show a small
   inline signal at the dropdown (e.g. disabled option "Schools unavailable — retry"); don't
   block the users list.
4. **AdminInvitations (F4).** `AdminInvitations.tsx:146-151` — LOAD failure gets a
   persistent inline error block + retry (keep toasts for row actions); never rest on
   "Invite your first teacher…" after a failed load.
5. **AdminInviteUser schools (F5).** `AdminInviteUser.tsx:98-111` — same inline signal as F2.
6. **AdminInviteUser duplicate check (F6).** The pending-invite check never destructures
   `error`; on query error it treats null data as "no duplicate" and proceeds. Fix:
   destructure `error`; on error show a retryable inline message and abort the submit. (The
   DB's `unique_pending_invitation_per_email` partial index is the real backstop — this is
   about honest UX, not correctness.)
7. **SchoolCheckboxGroup (F7).** Swallows fetch errors into `setSchools([])` → generic "No
   schools available". Distinguish error (retry affordance) from genuinely-empty.
8. **CSV export (FP20b).** `AdminUsers` export catch is a silent no-op → add an error toast.
9. **Staleness guards (FP20a).** Request-id ref guard (the idiom already in
   `LessonSearchPicker.tsx`) on: ReviewDashboard tab fetches (effect on `[filter]`,
   ReviewDashboard.tsx:110-116, apply-site :238), AdminUsers `loadUsers`
   (:217-221), AdminUserDetail `loadAll` (:228-230; the route is NOT key-remounted —
   App.tsx renders it without `key`, unlike `/review/:id`). Optional rider only if trivial:
   stop ReviewDashboard re-running `checkAuth()` on every tab click.

Out of scope: FP20c (review-queue pagination — shelved), AdminDashboard (static hub, no
fetches), any RLS/schema change, redesigning toasts.

## Tests

Per touched page: mock a rejected/erroring fetch → assert IntFetchError visible + retry
refetches; assert "No users found."/"User not found." only on genuine empty/PGRST116; one
stale-response test for the request-id guard (slow response A resolving after B must not
clobber B).

## Verify

`npm run check` + `npm run test:run` green. Manual drive on local dev (admin@test.com /
password123): kill network in devtools → each page shows the error card, retry recovers.

## STOP conditions

Any fix requiring an RLS/schema change; any page whose data flow doesn't match the evidence
file:lines (re-probe first — lines can drift); any design fork (e.g. you think a page needs
React Query instead) → write the hand-back and end your turn; design forks route to Fable.
