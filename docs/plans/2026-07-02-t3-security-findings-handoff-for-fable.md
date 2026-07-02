# T3 handoff — security findings for Fable adjudication (2026-07-02)

Written by Opus during T3 execution (PR #573, branch `feat/t3-auth-email`). **A STOP
condition fired:** the proper fix for the top finding needs a DB migration, which the T3
brief pre-registers as a halt-and-report trigger. The T3 code itself is complete and
verified (SMTP live gate ✅, accept-flow-on-TEST gate ✅). A Codex cross-check surfaced the
findings below; #1 is a real security issue central to the invite-only model.

## Finding 1 (HIGH — but currently dormant): anon can harvest all pending invitation tokens

**What:** the RLS policy `"Public can view valid invitation by token"` on `user_invitations`
grants role `{public}` (which includes the anon key) `SELECT` on **any** row where
`token IS NOT NULL AND expires_at > now() AND accepted_at IS NULL`. There is **no** requirement
that the caller already knows a specific token — the app's `.eq('token', …)` in
`AcceptInvitation.tsx` is only an app-side filter. The anon key ships in the public frontend
bundle.

**Evidence:**
- TEST, empirical: `GET /rest/v1/user_invitations?select=token,email,role&accepted_at=is.null`
  with the anon key returned a seeded pending **admin** invitation's `token` (no token supplied).
- PROD: identical policy confirmed via `pg_policies`. PROD currently has **0 pending
  invitations** → the hole is dormant right now (nothing to harvest until an invite is created).

**Impact:** an attacker can harvest pending invitation tokens (and their `role`), then use the
now-working accept endpoint to create an account with the invited role — up to **admin**
(privilege escalation). Exploitable only while a privileged invitation is pending (≤7-day window).

**Pre-existing:** the policy predates T3; the OLD client-side accept (`supabase.auth.signUp` +
client profile insert with `role: invitation.role`) was equally exploitable with a harvested
token. T3 neither introduced nor worsened the hole — but invite-only's security premise depends
on token secrecy, so it's directly relevant now.

**Why this is a STOP (Fable):** closing it needs a **migration** (RLS is schema) — RLS cannot
express "only if you supplied this exact token," so no in-app-only fix exists. Fix options:
1. **(recommended)** Replace the public `SELECT` policy so anon can no longer list pending
   invitations, and move `AcceptInvitation`'s invite-detail fetch (email/role/school, shown
   before the invitee sets a password) to a **token-scoped** path: either a
   `SECURITY DEFINER` RPC `get_invitation_by_token(p_token)` returning only the matching row, or
   a new `GET /invitations/lookup?token=…` on `invitation-management` (service-role, returns only
   that row). Migration = drop/replace the policy; edge+frontend = swap the one fetch.
2. Keep the policy but this does **not** close the raw-REST hole — not viable.

**Recommendation:** fix before any real (especially privileged) invitations are sent in PROD.
The T3 code PR can merge independently (strict improvement, hole dormant), but "go live /
start inviting" should wait for this fix.

## Finding 2 (MEDIUM — low probability): non-atomic acceptance can strand a user

`invitation-management` accept: `createUser` → `user_profiles` insert → invitation `update` are
separate ops. If the profile insert or the accepted-update fails **after** `createUser` succeeded,
the endpoint errors and `AcceptInvitation` never signs the user in (good — no silent broken
session), but a retry then hits the `"already registered"` short-circuit → the invitee is stuck
with an auth user, no profile, and no automated recovery. Pre-existing (the old client flow had
the same shape); out of T3's minimal scope. Fix later: cleanup-on-failure (delete the auth user
if the profile/update fails) or make the endpoint idempotent (recover when the auth user exists
but the profile doesn't).

## Finding 4 (LOW): the other `invitation-management` routes are still slug-broken

T3 fixed only the accept route's pathname match (`endsWith('/invitations/accept')`). The
authenticated admin routes (`POST /invitations`, `GET /invitations`, `.../resend`, `DELETE`)
still check `pathParts[0] === 'invitations'` against the **unstripped** path, so they would 404
on the hosted runtime the same way accept did. They are **unused by the frontend** (which does
client-side inserts/updates), so there's no live impact. If Fable does the security pass on this
function, adopt `user-management`'s fnName-strip (`index.ts:99-103`) function-wide to fix all
routes consistently in one pass.

## Already handled inside T3 (not for Fable)

- **F3** (Codex): the deleted `password-reset` was still listed in
  `scripts/test-edge-functions.mjs` `HEALTH_CHECK` (run daily by `edge-function-smoke.yml`) —
  removed.
- Invite-only **server-side** enforcement is the GoTrue "disable new signups" dashboard toggle
  (Part 3c), by design; brief gate 5 verifies `auth/v1/signup` rejects. The removed AuthModal
  button is UX only.
- `emailSent`/`emailDelivered` honesty holds in PROD (RESEND_API_KEY is set, so `send-email`
  returns the real Resend outcome); the "logged (200) in development mode" path only affects
  envs without the key.
