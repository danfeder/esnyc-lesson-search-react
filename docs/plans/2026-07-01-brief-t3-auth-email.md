# Brief: T3 — auth email (invite / reset) via Google Workspace SMTP + custom-email retirements

**Written by:** Fable, 2026-07-01 (post-T2 brief session; user decisions collected live).
**Executor:** Opus, fresh session. **This brief tells you exactly what to build, how to verify,
and when to STOP. Do not redesign, expand scope, or improvise around a failed assumption —
halt and report instead.** Runs AFTER the quick-wins patch PR
(`2026-07-01-brief-quickwins-patch.md`) has merged.

## User decisions (locked 2026-07-01 — do not re-open)

1. **Email is auth-only**: invitations + password reset. NO submission/review decision emails
   (inventory rows 1–3 = retire), NO welcome email (row 6 = retire), NO password-changed
   notice (row 8 = retire, and its edge fn is orphaned → delete whole fn). Rows 9–10
   (role-changed / deactivated notices in `user-management`) = **leave untouched, dormant**
   (fail-open, harmless; they auto-revive if Resend DNS ever lands). Row 11 mooted by (3).
2. **Sender = `df@esynyc.org`** via Google Workspace SMTP app password. No new mailbox.
3. **Site goes INVITE-ONLY**: public self-signup disabled. People join only via admin invite.
4. AI pre-fills stay OFF for launch (no `ANTHROPIC_API_KEY` work in this track — not T3's job).

## Architecture (decided — implement exactly this)

- **Password reset**: already uses Supabase's built-in mailer end-to-end
  (`AuthModal.tsx:48` `resetPasswordForEmail` → `/reset-password` → `ResetPassword.tsx`
  `updateUser`). The ONLY change it needs is real SMTP behind it (Part 0) and removal of the
  vestigial `password-reset/notify` call (Part 2c).
- **Invitations**: KEEP the custom `user_invitations` system (token + role + accept page) —
  do NOT migrate to `auth.admin.inviteUserByEmail` (that would rework the whole admin
  invitations dashboard for zero launch value). What changes: honest result UI + always-visible
  copyable invite link (the email attempt via Resend stays but its failure is surfaced, not
  hidden), and acceptance moves off public `signUp` so signups can be disabled.
- **Custom send-email fn**: stays (still serves invitation type + dormant rows 9–10).

## Part 0 — Dashboard config (guide the USER click-by-click, PROD project `jxlxtzkmicfhchkhiojz`)

These are hosted-dashboard changes; `supabase/config.toml` is local-only — do NOT edit it.
Plain language with the user throughout; they are the product owner, not a developer.

0a. **Google app password** (user, in their Google account for `df@esynyc.org`):
    myaccount.google.com → Security → confirm 2-Step Verification is ON (STOP and report if
    the org forbids it) → search "App passwords" → create one named `supabase-mailer` →
    16-character password appears once; user pastes it into the next step, never into a file.
0b. **Supabase SMTP** (user, Supabase dashboard → PROD project → Authentication → Emails →
    SMTP settings): Enable custom SMTP; Sender email `df@esynyc.org`; Sender name
    `ESYNYC Lesson Library`; Host `smtp.gmail.com`; Port `587`; Username `df@esynyc.org`;
    Password = the app password. Save.
0c. **URL configuration check** (you, read-only): Authentication → URL Configuration — confirm
    Site URL is the production site and the redirect list covers `<prod-origin>/reset-password`
    and `<prod-origin>/accept-invitation`. Fix only if wrong; record what you saw.
0d. **Live SMTP verification**: user triggers "Forgot password" on the PROD site for
    `df@esynyc.org`. Expect a reset email in their inbox (sender = df@esynyc.org, not
    supabase.io). **Tell the user NOT to complete the reset — receiving the email is the test.**
    If nothing arrives in ~5 min, check dashboard Auth logs; STOP if SMTP auth fails twice.
0e. **Do NOT disable signups yet** — that happens in Part 3, only after the acceptance rewire
    is deployed to PROD. Order matters: flipping it early bricks invitation acceptance.

## Part 1 — Retire the decision-email path (rows 1–3)

1a. **Confirm root cause first** (pre-registered probe, TEST project): the lookup at
    `complete-review/index.ts:257` selects
    `extracted_title, teacher_id, user_profiles!inner(email)` from `lesson_submissions`.
    The baseline schema gives `lesson_submissions` **no FK to `user_profiles`** (all three —
    teacher_id/reviewer_id/reviewed_by — reference `auth.users`), so PostgREST should fail to
    resolve the embed. Probe: GET
    `https://rxgajgmphciuaqzvwmox.supabase.co/rest/v1/lesson_submissions?select=extracted_title,teacher_id,user_profiles!inner(email)&limit=1`
    with the TEST service key (via curl). **Expected: a PGRST relationship error** ("could not
    find a relationship between lesson_submissions and user_profiles" or ambiguity variant).
    Record the exact error body in the PR description — this closes the walkthrough's
    "decision email vanishes" mystery (tracker note's "≥3 FKs" suspicion was close but the
    truth is "no FK at all"). If the probe SUCCEEDS instead → STOP (our model of the bug is
    wrong; Fable adjudicates).
1b. **Retire**: in `complete-review/index.ts`, delete the entire decision-email block (the
    teacher-email lookup ~255–276 + the send-email fetch at ~288–310 + its decision→type map)
    and replace with one comment + `console.log` breadcrumb: decision emails retired for
    launch per T3 (2026-07-01); root cause of historical silent failure = PostgREST embed
    with no FK path, see PR. Do not touch the RPC call or anything before it.

## Part 2 — Invitation honesty + retirements (frontend + edge)

2a. **`AdminInviteUser.tsx`** — replace the fire-and-forget email attempt + unconditional
    success toast (lines ~188–223) with an honest two-outcome result, and surface the invite
    link in the UI in BOTH outcomes:
    - The link already exists: `` `${window.location.origin}/accept-invitation?token=${inviteData.token}` ``
      (currently dev-only at :205/:213 behind `window._lastInvitationLink`). Promote it to a
      visible, copyable element (read-only input + Copy button is fine; match existing
      admin-page styling) shown on the post-create success surface.
    - Email attempt succeeded → "Invitation created and emailed to &lt;email&gt;. You can also copy
      the link below." Email attempt failed (today: always, Resend sandbox) → "Invitation
      created — the email could NOT be sent automatically. Copy this link and send it to
      &lt;email&gt; yourself." Plain language; no jargon; never claim an email was sent when it
      wasn't. Keep the `window._lastInvitationLink` dev hook or drop it — your call, minimal diff.
    - Check `AdminInvitations.tsx` resend action: if it shows an unconditional success toast
      too, apply the same honesty there (the edge fn returns success even when email fails —
      `invitation-management/index.ts:283-285`; prefer fixing the edge fn to return an
      `emailSent: boolean` field and reading it in both UIs).
2b. **Retire the welcome email** (row 6): delete the send-email call in
    `AcceptInvitation.tsx:139` (and its dead imports/state).
2c. **Retire the password-changed notice + the orphaned custom reset fn** (row 8): delete the
    `password-reset/notify` call in `ResetPassword.tsx:69`; then delete the entire
    `supabase/functions/password-reset/` function (its `/request` endpoint has no frontend
    caller — verified 2026-07-01 — and `/notify`'s only caller is the line you just removed).
    Grep for any remaining reference (deploy workflows list function names — remove it there;
    mind the edge-deletion ordering hazard in the CI-flakes memory doc). Also remove the
    now-unreachable `password-reset` and `password-changed` template branches in
    `send-email/index.ts` ONLY if trivially separable; otherwise leave the templates (dead
    templates are harmless; minimal diff wins).

## Part 3 — Invite-only (acceptance rewire, THEN close the door)

3a. **Rewire acceptance off public signup**: `AcceptInvitation.tsx` currently does client-side
    `supabase.auth.signUp` (:102) + client-side `user_profiles` insert (:110–122) + marks the
    invitation accepted (:125–129). Replace that block with a single call to the ALREADY-BUILT
    public accept endpoint `POST /functions/v1/invitation-management/invitations/accept`
    (edge fn lines 55–152, uses `auth.admin.createUser` at :96 — unaffected by the signup
    toggle). Before wiring: READ that endpoint end-to-end and verify it (i) validates
    token + expiry, (ii) creates the auth user with the submitted password and
    `email_confirm: true` (add that flag if missing — with confirmations enabled later it
    would strand users), (iii) creates the `user_profiles` row with the invitation's role,
    (iv) marks the invitation accepted. If it's missing any of those, bring it up to that
    exact list — nothing more. Keep the page's follow-up `signInWithPassword` (:150) as-is.
    Test the full accept flow on LOCAL (supabase start) and then on TEST with a throwaway
    invitation before touching PROD; delete test rows (auth user + profile + invitation)
    with verbatim IDs and RETURNING checks.
3b. **Hide the signup tab**: `AuthModal.tsx` — remove the "Sign up" link/mode entry points
    (~:165/:171). Leave the `signup` mode branch code dead or remove it if lint forces the
    issue; minimal diff.
3c. **Close the door (PROD dashboard, user clicks, AFTER the PR is merged + Netlify deploy is
    live + edge fns redeployed)**: Authentication → Sign In / Up → toggle OFF "Allow new users
    to sign up". Then verify end-to-end on PROD: create a real invitation to
    `mail@danfeder.org`, accept it via the copyable link, confirm sign-in works and the
    profile row has the invited role — then CLEAN UP (delete auth user via dashboard/admin
    API + `user_profiles` row + `user_invitations` row, verbatim IDs, verify 0 remaining).
    This is a PROD data mutation: smallest possible footprint, pre-registered cleanup,
    per the data-safety rules.

## PR mechanics

- One PR, branch `feat/t3-auth-email` off `main`. No DB migrations expected (schema untouched);
  if you find yourself needing one → STOP, that's a scope surprise.
- Edge-fn changes: complete-review, invitation-management (maybe), send-email (maybe),
  DELETE password-reset. Frontend: AdminInviteUser, AdminInvitations (maybe), AcceptInvitation,
  AuthModal, ResetPassword. Check `.github/workflows/` for the per-function deploy list and
  the deletion-ordering hazard.
- `npm run check` + `npm run test:run` before push (mandatory). Update/extend any tests
  touching the changed components; add none beyond what the diff demands.
- Bot review triage per the standard playbook (all four PR comment surfaces; rebut before
  fixing).
- After TEST deploy: re-run the accept-flow test on TEST (3a) and the Part 1a probe still
  errors (nothing depends on it now, but confirms no schema drift).

## Verification gates (pre-registered)

1. Part 0d: real reset email arrives at df@esynyc.org from df@esynyc.org (SMTP live).
2. Part 1a probe error recorded; after 1b, an approve on TEST completes with NO send-email
   invocation and NO error in complete-review logs (clean silence, by design now).
3. Accept flow green on LOCAL and TEST via the edge endpoint (3a), including role landing
   in `user_profiles.role`.
4. PROD end-to-end (3c): invite → link → accept → sign-in → cleanup verified with RETURNING.
5. PROD: signup toggle OFF; attempt to sign up via the API (curl `auth/v1/signup`) returns
   the "signups not allowed" error; the app UI no longer offers a signup entry point.

## STOP conditions

- Part 1a probe does NOT error (bug model wrong).
- The edge accept endpoint is materially different from the 4-point list in 3a (e.g. it
  doesn't create profiles at all) and bringing it up to spec needs schema changes.
- SMTP auth fails twice with a fresh app password (org policy may block app passwords —
  Fable adjudicates the fallback, likely the separate-mailbox or relay route).
- 2-Step Verification cannot be enabled on df@esynyc.org.
- Any need for a DB migration.
- E2E in CI fails in a way plausibly connected to auth/signup changes (check whether any
  E2E spec exercises public signup BEFORE you start — if one does, report it in your plan,
  don't silently rewrite it).

On any STOP: halt, write findings to a short handoff doc in `docs/plans/`, report back.
Fable adjudicates.

## On success — session end

Tracker (`docs/plans/2026-07-01-go-live-tracker.md`): T3 row → ✅ DONE with PR # + squash sha
+ one line of gate evidence; update "Last updated"; per the session-end protocol name the next
track (T4 dedup — **Fable design session**, the 2nd of 2 planned) in your report. Update
memory go-live lines (MEMORY.md + project_golive_sprint.md).
