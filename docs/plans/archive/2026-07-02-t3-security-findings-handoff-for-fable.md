# T3 → Fable handoff: merge-readiness, CI background, and the security fix (2026-07-02)

Written by Opus at the end of the T3 execution session. **The user chose NOT to merge in that
session** — they want a Fable session to (1) take the invitation-token security fix (which needs a
migration → STOP condition), and (2) drive the merge + go-live. This doc is the single pickup point:
merge-readiness, the CI deploy background, the security work, and the recommended plan.

Branch: `feat/t3-auth-email` · PR **#573** · latest commit `0427d73`.

---

## 1. What T3 built (all done, verified)

Auth-only email + invite-only signup + custom-email retirements, per `2026-07-01-brief-t3-auth-email.md`.

- **SMTP live (Part 0):** `df@esynyc.org` via Google Workspace app password; owner ran the PROD
  "forgot password" test and the reset email arrived (Gate 1 ✅). URL Configuration was fixed
  (Site URL was a stale `http://localhost:3000` → set to `https://esynyc-lessonlibrary-v2.netlify.app`
  + redirect allow-list `…/**`).
- **Invite acceptance rewired** onto the server-side `invitation-management` accept endpoint
  (admin API, unaffected by the signup toggle). Verified end-to-end on TEST (Gate 3 ✅): auth user +
  email pre-confirmed + `user_profiles.role` = invited role + invitation marked accepted; test data
  cleaned up.
- **Latent routing bug fixed** in `invitation-management`: the hosted edge runtime includes the
  function slug in `pathname`, so the accept branch's `=== '/invitations/accept'` never matched and
  the endpoint 401'd (built-but-never-worked). Fixed with `endsWith('/invitations/accept')`. See §5
  finding 4 for the routes NOT fixed.
- **Honest invite UI:** `AdminInviteUser` shows a post-create success surface with an always-visible
  copyable link + truthful email-status; `AdminInvitations` resend derives `emailDelivered` from the
  actual `functions.invoke` `error` (it resolves, doesn't throw, on non-2xx).
- **Retirements:** decision emails (root cause: no FK `lesson_submissions`→`user_profiles`; PGRST200
  probe recorded), welcome email, password-changed notice, and the whole `password-reset` edge fn.
- Local gates: `npm run check` + `npm run test:run` (2054 tests) green.

---

## 2. Merge-readiness of PR #573

**All substantive CI checks PASS:** E2E, Test & Build, Test Coverage, CodeQL, semgrep, and all four
review bots (claude-review, claude-database-review, claude-component-review, performance-review).

**Bot verdict: no blocking findings** (all COMMENTED, none REQUEST_CHANGES). Triage in §6.

**The ONLY red = the two "Deploy to TEST — {complete-review, invitation-management}" jobs.** These
are cosmetic — see §3. They are not required checks (main has no branch protection), so they do not
block merge.

---

## 3. CI background — why the two "Deploy to TEST" jobs are red (cosmetic)

The failure is the **silent-no-op guard** (added in C33 PR #537), not a real deploy error. Log:
`SILENT NO-OP — complete-review version did not advance (pre=15, post=15)`.

**Why it fired here (self-inflicted, harmless):** during verification, the executor deployed both
functions to TEST **out-of-band via the CLI before opening the PR** (to confirm the accept fix on the
real hosted runtime). Supabase only bumps a function's `version`/`ezbr_sha256` when the bundled source
actually changes; a byte-identical redeploy freezes the version. So CI's subsequent deploy of the
identical committed source didn't advance the version, and the strict guard (both functions are
"changed vs main" → strict) errored. Re-pushing then ping-pongs: whichever function didn't change in
the new commit no-ops against its already-deployed TEST version.

**Proof the code is correct and live on TEST** (not a failed deploy): a POST to the live TEST accept
endpoint with a bogus token returns `404 {"error":"Invalid or expired invitation"}` — i.e. it reaches
the *fixed* accept branch. Pre-fix it returned `401 {"error":"Invalid token"}` (bounced at the auth
gate). complete-review's retirement deployed correctly in the first CI run (TEST v15).

**This will NOT recur on PROD:** PROD holds the OLD versions of both functions, so the merge-triggered
PROD deploy is a genuine change → versions advance → guard passes. (Still 3-signal-verify per §7.)

**If you want the TEST deploy boxes green** (purely cosmetic): make ONE commit that gives BOTH
`complete-review` AND `invitation-management` a fresh bundle (a real code line, e.g. a log tweak, in
each — comments may be minified away), so a single CI run advances both. Not necessary for merge.

**Lesson logged:** don't out-of-band-deploy edge functions to TEST before the PR — let CI do the first
deploy so the version advances cleanly.

---

## 4. 🔴 Security Finding 1 — anon can harvest all pending invitation tokens (needs a migration → your call)

**The hole.** RLS policy `"Public can view valid invitation by token"` on `user_invitations`
(`20251001_production_baseline_snapshot.sql:3095`):
```sql
FOR SELECT USING (token IS NOT NULL AND expires_at > now() AND accepted_at IS NULL)
```
Granted to role `{public}` (which includes the anon key shipped in the frontend bundle). There is **no
`token = <caller value>` predicate**, so `AcceptInvitation.tsx`'s `.eq('token', …)` is only a
client-side filter, not access control. An unauthenticated
`GET /rest/v1/user_invitations?select=token,email,role&accepted_at=is.null` enumerates **every pending
invite, including its role and token.** Verified empirically on TEST (returned a seeded pending admin
invite's token) and the identical policy confirmed on PROD. PROD currently has **0 pending invites** →
dormant right now.

**Risk profile RISES with this PR (corrected — the claude-database-review bot's point, and it's
right; the earlier draft's "T3 doesn't worsen it" was wrong):**
- *Before* T3, the accept endpoint 401'd on every call (the pathname bug), so a harvested token was a
  **dead end**.
- T3 **fixes that endpoint** (admin API, works even with signups disabled) **and** makes invite the
  **only** path to a new account. The security of that sole path now rests **entirely on token
  secrecy**, which this RLS policy breaks. So T3 converts the hole from "latent/unreachable" to
  "live and load-bearing."
- The exploit window opens exactly when the point of this PR is realized (start sending invites). A
  harvested *admin/reviewer* invite → attacker self-provisions that role.

**Fix (needs a migration — that's the STOP condition; recommended shape):**
1. Replace the public list-style SELECT policy so anon can no longer enumerate pending invitations.
2. Move `AcceptInvitation`'s pre-accept detail fetch (email/role/school shown before the invitee sets
   a password) to a **token-scoped** path — a `SECURITY DEFINER` RPC `get_invitation_by_token(p_token)`
   returning only the matching row, **or** a `GET /invitations/lookup?token=…` on `invitation-management`
   (service-role; returns only that row). Then swap the one client `.select('*').eq('token',…)`.
3. Rehearse on TEST (RLS test), verify anon can no longer enumerate, then the standard TEST→PROD
   migration pipeline.

**Sequencing (user decision 2026-07-02): "merge T3 now, fix right after; no real invitations until the
fix ships; Part 3c deferred."** The database-review bot pushed back (gently) that there's little
daylight between "T3 merges" and "the hole is live," since the very next owner step is disable-signups
+ invite real users. So: **do the RLS fix before the first real (esp. privileged) invite.** If 3c must
be exercised before the fix lands, use a **throwaway low-privilege (teacher) invite**, accept + delete
it immediately, and never leave a privileged invite pending.

---

## 5. Findings 2 & 4 (defer / bundle with the security pass)

- **F2 (Medium, low-prob) — non-atomic accept.** `invitation-management/index.ts:104-147`: `createUser`
  → profile insert → invitation update are three unguarded ops. A failure after `createUser` strands
  an auth user with no profile, and retry hits the "already registered" branch with no recovery. The
  frontend correctly does NOT sign the user in on a non-2xx, so no silent broken session — but the
  invitee is stuck. Pre-existing shape; both bots agree it's fine to defer. Fix later: cleanup-on-
  failure (delete the auth user) or make idempotent (recover when auth user exists but profile doesn't).
- **F4 (Low) — the other `invitation-management` routes are still slug-broken.** Only the accept route
  got the pathname fix. The admin routes (`POST /invitations`, `GET`, `.../resend`, `DELETE`) still
  test `pathParts[0] === 'invitations'` on the unstripped path → they'd 404 on the hosted runtime.
  **Unused by the frontend** (it does client-side inserts/updates), so no live impact. When you touch
  this fn for the security fix, adopt `user-management`'s fnName-strip (`index.ts:99-103`) function-wide
  to fix all routes in one pass.

---

## 6. Bot review triage (all four surfaces checked; no blocking findings)

- **AuthModal dead `signup` branch** (flagged by every bot). The "Sign up" entry point is removed, but
  the `signup` mode (Full Name field, `supabase.auth.signUp` call, "Create Account" JSX) is left dead
  but wired. The brief §3b explicitly permitted leaving it (minimal diff). **Recommend removing it in
  the security pass** (it touches auth anyway): a future edit that re-adds a `setMode('signup')` would
  silently resurrect a client-side signup path that bypasses invites entirely (no role, no profile
  row). Left as-is this session to avoid another CI cycle.
- **AcceptInvitation raw `fetch` vs `supabase.functions.invoke`** (nit, 2 bots). Deliberate: raw fetch
  cleanly reads the server's `{ error }` body for good UX ("Invitation has expired" etc.); `invoke`'s
  non-2xx body extraction (`error.context`) is clunkier. Kept. Switch to `invoke` only if you value
  codebase consistency over the error-message ergonomics.
- **Add a Playwright E2E for accept-invitation** (token→password→sign-in). Good suggestion — accept is
  now the SOLE account path, so a regression = nobody can onboard. Out of T3's minimal scope; recommend
  as a fast-follow (bundle with the security fix, since that changes the accept detail-fetch anyway).
- Nits confirmed OK by bots: `emailSent` derivation, complete-review `console.log` + no unused vars,
  no remaining `password-reset` references (F3 already fixed — removed from
  `scripts/test-edge-functions.mjs` HEALTH_CHECK).
- Invite-only **server-side** enforcement = the GoTrue "disable new signups" toggle (Part 3c), by
  design (brief gate 5 verifies `auth/v1/signup` rejects). The removed button is UX only.

---

## 7. Merge + PROD deploy verification (when you merge)

1. **Squash-merge** PR #573 (main is unprotected; the two deploy no-op reds are cosmetic — merge with
   `--admin`/`--squash` if the CLI balks on the red boxes).
2. On merge: Netlify deploys the frontend to PROD automatically; `deploy-edge-functions.yml` runs the
   **PROD** matrix for `complete-review` + `invitation-management` behind a **manual approval** gate.
3. Approve the PROD deploy. **3-signal verify each function** (per `reference_ci_flakes.md`): version
   advanced + `ezbr_sha256` matches the TEST build **or** grep `get_edge_function` `files[].content`
   for a known new line (invitation-management: the `endsWith('/invitations/accept')` +
   "Invitation accepted: created user" log; complete-review: the "decision emails retired for launch"
   breadcrumb). PROD holds the OLD versions so the deploy is genuine — no no-op expected, but verify.
4. Sanity-probe PROD accept routing with a bogus token → expect `404 "Invalid or expired invitation"`
   (proves the fix is live) — creates no data.

---

## 8. Deferred: Part 3c + go-live (do AFTER the security fix)

`AuthModal` no longer offers signup, but the **dashboard toggle is still ON** — public self-signup via
the Auth API still works until 3c. Complete go-live once the RLS fix has shipped:
- Dashboard → Authentication → Sign In/Up → toggle **off** "Allow new users to sign up".
- Gate 5: `curl auth/v1/signup` → "signups not allowed".
- PROD end-to-end: real invite → accept via copyable link → sign-in → confirm role → clean up
  (verbatim IDs, RETURNING). Owner is at the keyboard for the dashboard step.

---

## 9. Recommended plan for the Fable session

1. Design + ship the **RLS fix** (§4) — the one migration + the token-scoped detail fetch. Rehearse on
   TEST (anon can no longer enumerate), verify, PROD pipeline.
2. Bundle the cheap cleanups while in these files: remove AuthModal's dead `signup` branch (§6);
   optionally fnName-strip all `invitation-management` routes (§5 F4); optionally the accept E2E.
3. Decide: fold the fix into PR #573 (so T3 + the fix merge together — cleanest for the security story),
   or merge #573 first then ship the fix as the immediate next PR. Either way, **no real privileged
   invite before the fix is on PROD.**
4. Then complete **Part 3c** + go-live (§8).
