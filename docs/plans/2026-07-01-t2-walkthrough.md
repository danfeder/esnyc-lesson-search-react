# T2 Walkthrough: Submission → Review → Publish (with the user)

**Prepared:** 2026-07-01 (Fable). **Runs after** the edge auth-gate fix
(`docs/plans/2026-07-01-brief-edge-auth-gate-fix.md`) is deployed to TEST — the submission
step is broken everywhere until then.

**What we produce:** (1) a punch-list of pain points, each rated by how much it hurts —
the punch-list decides whether we patch the current flow or reshape it; (2) a confirmed
email inventory (feeds T3).

## Where we run it

The app running on this laptop (`npm run dev`), pointed at the **TEST** database — the real
lesson library (763 lessons) and real behind-the-scenes machinery, but nothing we do touches
the live site. Claude starts everything; you just use the browser.

Accounts (all password `password123`): `teacher@test.com` (teacher hat),
`reviewer@test.com` (reviewer hat), `admin@test.com` (admin, for the email stations).

**Setup (Claude runs this, not the user).** Shell env vars beat `.env` in Vite, so no file
edits — start the dev server against TEST with:

```bash
VITE_SUPABASE_URL=$(grep -a "^TEST_SUPABASE_URL=" .env | cut -d= -f2) \
VITE_SUPABASE_ANON_KEY=$(grep -a "^TEST_SUPABASE_ANON_KEY=" .env | cut -d= -f2) \
npm run dev
```

Then confirm the auth-gate fix is still live on TEST before station 1 (expect **401**, not a
400 TypeError):

```bash
curl -s -w "|%{http_code}\n" -X POST \
  "https://rxgajgmphciuaqzvwmox.supabase.co/functions/v1/extract-google-doc" \
  -H "Authorization: Bearer $(python3 -c "print('A'*219)")" \
  -H "Content-Type: application/json" \
  -d '{"googleDocUrl":"https://docs.google.com/document/d/xxx_probe/edit"}'
```

Tip for the two hats: use a normal browser window for the teacher account and a private/
incognito window for the reviewer, so both stay signed in side by side.

Two prepared Google Docs (both shared, view-by-link):
- **Garden Herb Butter Toasts** — an original test lesson:
  `https://docs.google.com/document/d/1i83PRk_zp0_-MC6Njb7TJePT0Aem0Cqdbcfeuuyhs5k/edit`
- **Kimbap Korean Sushi Rolls** — a near-copy of a lesson already in the library, so the
  duplicate checker has something to catch:
  `https://docs.google.com/document/d/1ATmTDGGHcp4Grmph23ihePm1setVwZfl7jVriYARSMQ/edit`

**One honest limitation:** on TEST, the system can't actually read Google Docs (that
credential only exists on the live site), so after you submit, the lesson text the reviewer
sees will be canned placeholder content, not your doc. The forms, screens, statuses, and
duplicate machinery are all real. If you want one fully-real end-to-end run afterwards, we
can do a single carefully-cleaned-up run on the live site — your call at the end.

## The route

Narrate as you go: what's confusing, what's missing, what you'd never do this way. I'll
capture everything in the punch-list; you don't need to write anything.

1. **Teacher: finding the door.** Sign in as teacher, then try to find where you'd submit a
   lesson, starting from the homepage like a real teacher would. Then the submit page's
   two choices ("new lesson" vs "update an existing one") — is that split clear?
2. **Teacher: submitting.** The form asks for one thing only: a Google Doc link. Paste the
   Herb Butter Toasts link and submit. Narrate: is one-link-only right? What about
   attachments, PDFs, a heads-up about what happens next?
3. **Teacher: ...now what?** After the confirmation card, where do you go to check on it?
   (There's a "My submissions" list under your profile.) Note: the system never emails the
   teacher an acknowledgment — is that okay?
4. **Reviewer: the queue.** Switch to the reviewer account. Find the submission in the
   review dashboard. Do the status tabs make sense? (Heads-up: the "In Review" tab is
   permanently empty — nothing ever sets that status.)
5. **Reviewer: the review screen.** Open it. This is the big one — you supply ALL the
   lesson's classification (the teacher provides none). Walk every section and narrate.
   Also submit the Kimbap doc (as teacher) beforehand or during, so you see the duplicate
   warnings fire on a real near-copy.
6. **Reviewer: the decision.** Three options exist: Approve & publish, Merge into existing,
   Request revisions. **There is no Reject button** — rejection exists in the machinery but
   was never wired into this screen. First run: Request revisions (write real feedback).
7. **Teacher: getting feedback.** Back as teacher — find the feedback. Then the trap
   question: how do you send a corrected version? (There is no path — "update a lesson"
   only works against already-published lessons. Narrate what you'd expect.)
8. **The rejection dead-end.** I'll force a rejection behind the scenes on a spare
   submission, then you look at it as the teacher. Expect a blank/broken status and zero
   explanation — this is the known Phase-8a gap, seen live.
9. **Approve & publish.** Submit the herb doc once more (or reuse), approve it as reviewer,
   then find it in the public search. Does the published result look right?
10. **Email stations (feeds T3).** As admin: invite a fake user, watch what happens; then
    the "forgot password" path. I'll check the logs after each step and tell you what email
    the system *tried* to send and whether it would have arrived.

Afterwards: I clean up everything we created on TEST (submissions, the published test
lesson, invitations), verifying each deletion.

## Punch-list (filled in during the walkthrough)

| # | Station | What hurt | How bad (blocker / annoying / fine) | Patch or reshape? |
|---|---------|-----------|--------------------------------------|-------------------|
| | | | | |

## Email inventory (from code, 2026-07-01 — confirm live during walkthrough)

Today **no system email reaches a real teacher's inbox**, for three stacked reasons:
(a) the auth-gate bug killed every system-triggered email before it was even composed
(fix in flight); (b) even fixed, emails go out from Resend's sandbox address
(`onboarding@resend.dev`), which only delivers to the Resend account owner; (c) the
esynyc.org email domain was never verified (the DNS task on the someday-list).
Separately, if the email API key isn't configured, the sender pretends success and sends
nothing.

| # | When it should happen | Who gets it | Sent how | Works today? | Needed for launch? |
|---|----------------------|-------------|----------|--------------|--------------------|
| 1 | Submission approved | teacher | custom (Resend) | ✗ dead at gate → sandbox | user said no (auth-only) — confirm |
| 2 | Revisions requested | teacher | custom (Resend) | ✗ same | user said no — confirm |
| 3 | Submission rejected | teacher | custom (Resend) | ✗ same (+ no Reject button) | user said no — confirm |
| 4 | Submission received | teacher | — never built — | — | decide |
| 5 | Invitation to join | invitee | custom (Resend) | ✗ sandbox-only | **yes (T3)** |
| 6 | Welcome after accepting invite | new user | custom (Resend) | ✗ sandbox-only | decide |
| 7 | Forgot password | requester | Supabase built-in mailer | partial (heavy rate limits, plain template) | **yes (T3)** |
| 8 | Password was changed (notice) | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 9 | Role changed | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 10 | Account deactivated / reactivated | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 11 | Signup confirmation | new signup | disabled in config | off — anyone can sign up unverified | decide |

Note for T3: there is a second, orphaned password-reset implementation (a polished custom
email that no screen ever triggers); the real flow uses Supabase's built-in mailer. T3
should retire one of the two.

## Known broken things (so we don't re-discover them live)

- Submission pipeline entirely down until the auth-gate fix deploys (TEST **and** live site).
- No Reject button on the review screen; rejection = dead code + broken teacher-side display.
- No path for a teacher to resubmit after "revisions requested."
- "In Review" dashboard tab can never have contents.
- Signed-out users get pointed at a `/login` page that doesn't exist (login is a popup).
- On TEST only: extracted lesson text is canned placeholder content (no Google credential).
