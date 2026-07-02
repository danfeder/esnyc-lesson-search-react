# T2 Walkthrough: Submission → Review → Publish (with the user)

**Prepared:** 2026-07-01 (Fable). **Runs after** the edge auth-gate fix
(`docs/plans/2026-07-01-brief-edge-auth-gate-fix.md`) is deployed to TEST — the submission
step is broken everywhere until then.

> **✅ COMPLETED 2026-07-01 (Fable, live with user).** All 10 stations run (station 8
> witnessed organically at station 3 — no forced rejection needed). Pipeline verified
> door-to-door on TEST: submit → duplicate-detect → review → request-revisions →
> approve → publish → public search, first full run since the Deno-2 outage. Punch-list
> below fully populated (22 rows: 3 blocker-level, 5 bad, rest annoying/fine). Email
> inventory rows 2/4/5/7 confirmed live; row 5 (invitations) is the T3 centerpiece.
> Cleanup verified row-by-row: lesson + 2 submissions + 2 reviews + 2 similarities +
> 1 invitation deleted; library back to exactly 763 lessons. Dev-server env-var recipe
> below worked as written.

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
| 1 | Finding the door + new-vs-update split | Nothing — split is clear from the teacher's perspective. Nuance: the choice rests on what the teacher *thinks* is new; dedup checker is the backstop when they're wrong. | fine | no action |
| 2 | Submit form | One-link-only is RIGHT (extra files should be linked inside the doc). Confirmation copy ("We'll publish this once a reviewer approves") lands well. **Gap: no warning to share the doc** — a private doc submits fine and fails invisibly later. | annoying | patch (one line of copy + maybe a share-check) |
| 3 | My submissions list | Found it naturally under profile — location fine. **Cards show no lesson title** — just "View Google Doc →"; two submissions are already indistinguishable. | annoying | patch (show extracted_title on card) |
| 8 | Rejection dead-end (seen live at station 3, unforced) | Teacher's 2025-08 rejected submission renders with **no status badge at all** — blank dot, zero explanation. DB says `rejected`; UI says nothing. Phase-8a gap confirmed on a real row. | bad — but only reachable via backend today (no Reject button) | decide with decision-screen reshape (stations 6–7) |
| 4 | Review queue tabs | "All" is the first/default tab and reads like the inbox; the actual to-do lives under "Pending" (which even has the count badge). Reviewer's eye goes to the wrong place first. Plus known: "In Review" tab can never have contents. | annoying | patch (land on Pending; drop or wire "In Review") |
| 4 | Queue card | Headline shows first line of doc text ("Grade Levels: 5, 6, 7") instead of the lesson title — `extracted_title` exists in the DB and the card ignores it. Also the REVIEW button stretches the full card width (visual bug). | annoying | patch |
| 4 | False "1 MATCH · EXACT" on an original lesson (TEST artifact, but exposes a real labeling issue) | Badge driven by embedding similarity ≈1.0 against an unrelated lesson (title sim 0.16, hashMatch=false) — "EXACT" is awarded on fingerprint similarity alone even when the byte-level check disagrees. TEST fingerprints are canned ⇒ dedup accuracy untestable here. | fine for T2 (known artifact) | feed T4 dedup redesign (labeling + cross-table embedding mismatch) |
| 5 | Review screen: section order + vocab | Order makes sense. Metadata options verified canonical — form reads `ALL_FIELD_CONFIGS` from `filterDefinitions.ts` (same file as public filters) + DB CHECKs guard. | fine | no action |
| 5 | Doc pane doesn't follow the scroll | Embedded Google Doc frame stays put while the reviewer scrolls the metadata column → constant back-and-forth scrolling. | annoying | patch (sticky doc panel) |
| 5 | AI pre-fills | Absent on TEST (no ANTHROPIC_API_KEY in TEST edge env — expected, like the Google credential). Even live, AI drafts cover only 2/17 fields (activity type + CRF). Other 15 manual every time. | fine for T2 / decide for launch | decide: widen AI assist later (T4-adjacent) |
| 5 | "1 POSSIBLE DUP" header chip | Abbreviation "dup" reads like jargon — spell out "duplicate". | fine | patch (copy) |
| 5 | Duplicate card overflow | "55%" + "NEAR-DUPLICATE" text spills outside the card frame. | annoying | patch (CSS) |
| 5 | **Duplicate selection ↔ Decision disconnect (the big one)** | Selecting a duplicate candidate does NOT change the Decision radio; with "Approve & publish" still selected the selection is **silently ignored** and a second copy would be published (confirmed in code: `selectedDuplicate` only read when decision = merge). Only feedback is the bottom-bar button label changing — invisible while looking at the dup panel. User: "this whole duplicate situation is a bit complex," couldn't predict outcome. | **bad** | **reshape** — unify dup choice + decision into one coherent flow (T4 overlap) |
| 5b | **Dup panel conceptually overloaded (user follow-up, end of session)** | Beyond the disconnect: the panel's *purpose* is hard to grasp. It asks the reviewer to operate machinery (candidate rows + % + match-type labels + "merge" jargon + separate decision radio + search hatch = ~6 concepts) instead of answering the one real question: "Is this lesson already in the library — and if so, is this an update to it or just a copy?" Owner couldn't explain what the panel was trying to do. | **bad** | **reshape — binding design requirement for the T4 session**: detection (T4 backend) + this reviewer surface must be designed together as one plain-language question with evidence beneath it |
| 5 | "Merge into existing" unexplained | Even the owner couldn't recall what merge does. (Truth, from RPC: snapshot old lesson to `lesson_versions`, then overwrite the existing lesson in place with the submission's content/metadata; submission marked approved; nothing is blended.) No on-screen explanation. | bad | patch (inline plain-language explainer) or fold into reshape |
| 5 | Title-mismatch banner misattributes | Yellow "Heads up: **submitter linked to** 'Welcome & Garden…'" — false for a new-lesson submission; the dup detector auto-picked that target, the submitter never linked anything. | annoying | patch (copy/logic: say who actually picked the target) |
| 5 | "NOTE TO TRIAL" | Label is "Note to {teacher first name}" and the test teacher is named "Trial Teacher" → gibberish. Also placeholder promises "Will be emailed to the teacher along with the decision" — false today and likely false at launch (decision emails = "no" per user). Note itself IS saved and shown in My Submissions. | annoying | patch (label "Note to the teacher"; fix email promise to match T3 reality) |
| 6 | **All-7-fields gate blocks "Request revisions"** | `validateRequiredFields` runs before every decision with no decision-awareness — reviewer must fully classify a lesson just to bounce it back. Screen copy ("Fix tags before **publishing**") shows the gate was designed for publish only; revision path caught by accident. User workflow: triage first, tag only what's worth keeping. Tags on soon-to-change content are wasted effort. | **blocker** (for the send-back workflow) | patch — scope gate to the two approve decisions (frontend + matching edge-fn schema relax) |
| 6 | No confirmation after "Send for revision" | Silent redirect to the queue; reviewer must deduce success from the REVISION badge. DB write verified correct (status + note saved). | annoying | patch (success toast/banner) |
| 6 | Decision email attempt leaves no trace | complete-review's fail-open email block swallowed whatever went wrong — **no send-email invocation logged at all** after the 200 decision (verified twice, ingestion caught up). Same silent-swallow would hide failures of emails we DO want. | fine for launch (decision emails = "no") but **T3 must investigate** the swallow | T3 |
| 7 | Feedback display | "Revision requested" callout with the reviewer's note reads clearly — teacher understood WHAT was asked. | fine | no action |
| 7 | **No path to resubmit after revisions requested** | Teacher understands the ask but not HOW to act: no button, no instructions. "Update existing lesson" flow only targets published lessons (verified: `/submit/revising` searches the public library). User-designed fix: instructions + a "I've updated the doc — send back for review" button that **re-snapshots the doc** (re-run extract/process on the same submission row), flips status back to pending, preserves tags + feedback thread. Snapshot-not-live-doc design is deliberate and should stay (review integrity, search, link-rot). | **blocker** (revision loop can't close in-system) | patch-plus — user's button design; machinery already exists |
| 9 | Lesson title = Google Doc filename, reviewer can't edit | `doc.title` (Drive file name) becomes the published lesson title verbatim; review form has NO title field — reviewer controls 17 classification fields but not the most visible text on the lesson. "Copy of herb lesson DRAFT2" would publish as-is. | bad | patch (title field on review screen, prefilled from extraction) |
| 2b | Private-doc error is loud but unhelpful (refines row 2) | Extraction layer produces the helpful message ("Document not accessible — please share with <service account>") but process-submission swallows it into a generic "Failed to extract content," which is all the teacher sees. Also submit form itself still gives no proactive share hint. | annoying | patch (propagate the specific error; add share hint to form copy) |
| 9 | Publish is silent too | Same as revision send: redirect to queue, no confirmation. Publish verified in DB + live in public search (`lesson_afe2bf36…`, full pipeline door-to-door ✅ — first end-to-end run since the outage). | annoying | same patch as row 6 (success feedback on all three decisions) |
| 9 | **Every pipeline-published lesson has a blank summary** | Review form has no summary field; code parses a summary candidate from the doc (`parseExtractedContent`) but only uses it for the page header — never saved. New lesson's search card is bare next to import-era lessons. | bad | patch (summary field on review screen, prefilled from the parsed value) |
| 10 | Sign-in modal retains previous user's credentials | After sign-out, reopening the modal shows the prior user's email AND password still filled in. Security smell on shared school computers. | annoying | patch (clear fields on sign-out/modal close) |
| 10 | Invite confirmation toast too subtle | Bottom-corner toast, easily missed — but NB: the invite flow is the only one that confirms at all. | fine | polish (part of the row-6 success-feedback patch) |
| 10 | **Invite flow claims success unconditionally** | Confirmed live: invitation row created ✓, send-email genuinely attempted ✓ (post-T2a), **Resend rejected it (500** — sandbox sender delivers only to account owner). UI code shows the success toast regardless (email failure → console log only, dev-only `window._lastInvitationLink`); no copyable invite link in the UI as fallback. Admin on PROD would believe the teacher was emailed. | bad | **T3 centerpiece** (domain verification + honest failure UI + visible copyable invite link) |

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
| 2 | Revisions requested | teacher | custom (Resend) | ✗ **confirmed live 2026-07-01**: decision RPC succeeded but the email attempt vanished — no send-email invocation logged at all (fail-open catch swallowed the error pre-send; T3 investigate) | user said no — stands |
| 3 | Submission rejected | teacher | custom (Resend) | ✗ same (+ no Reject button) | user said no — confirm |
| 4 | Submission received | teacher | — never built — | — | **no — confirmed in walkthrough** (on-screen card is enough) |
| 5 | Invitation to join | invitee | custom (Resend) | ✗ **confirmed live 2026-07-01**: attempt now reaches Resend (T2a fixed the gate) but sandbox sender rejects all non-owner recipients (500); UI shows success toast regardless; no manual link fallback | **yes (T3)** |
| 6 | Welcome after accepting invite | new user | custom (Resend) | ✗ sandbox-only | decide |
| 7 | Forgot password | requester | Supabase built-in mailer | partial — **confirmed live 2026-07-01**: request reached the mailer; `@test.com` refused as undeliverable (`email_address_invalid`, honest error shown — only honest failure UI of the night); real addresses would send (supabase.io sender, plain template, heavy rate limits) | **yes (T3)** |
| 8 | Password was changed (notice) | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 9 | Role changed | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 10 | Account deactivated / reactivated | user | custom (Resend) | ✗ dead at gate → sandbox | decide |
| 11 | Signup confirmation | new signup | disabled in config | off — anyone can sign up unverified | decide |

Note for T3: there is a second, orphaned password-reset implementation (a polished custom
email that no screen ever triggers); the real flow uses Supabase's built-in mailer. T3
should retire one of the two.

## PROD real run (2026-07-01, same night — optional run from the script's closing offer)

One full end-to-end on the live site (`df@esynyc.org`, admin): submit herb doc → review →
approve → public search → verified cleanup. Findings:

- **Real extraction ✓** — 2,343 chars of the actual doc, real OpenAI embedding, 1.1 s Google
  API call. Title arrived as the Drive filename **including the `[WALKTHROUGH TEST] ` prefix**,
  published verbatim — live proof of the title finding (punch-list row 9).
- **Dedup happy path ✓** — real fingerprints, **0 candidates** for an original lesson (correct;
  detect-duplicates 200 in logs). Contrast with TEST's canned 0.9999 false alarm.
- **AI pre-fills: NEVER CONFIGURED ANYWHERE** — `supabase secrets list` on PROD shows **no
  `ANTHROPIC_API_KEY`**; 0 of 128 historical PROD submissions ever had `ai_draft_metadata`.
  The feature is fully built and has never once run outside local dev. Decision for T3/T5:
  add the key (5-min config + Anthropic account/billing) or accept manual-only tagging.
- **Decision-email vanish REPRODUCED on PROD** — approve → complete-review 200 → **no
  send-email invocation logged**, identical to TEST. Code-level bug, not env. Prime suspect:
  the Phase-7c teacher-email lookup embeds `user_profiles!inner(email)` without naming which
  FK — `lesson_submissions` has ≥3 FKs to `user_profiles` (teacher_id/reviewer_id/reviewed_by)
  → PostgREST ambiguous-embed error → swallowed by the fail-open catch on every call. T3 to
  confirm & fix-or-retire.
- **Blank summary confirmed with real content** — the real doc HAS a `Summary:` line; parser
  could read it; published lesson still blank. Environment-independent.
- **Signed-out submit UX** (bonus): auth modal + auto-resume of pending submission works.
- **Cleanup verified:** lesson `lesson_b63e8743…` + submission `dfb8d030…` + 1 review row
  deleted, 0 remaining, 0 `%WALKTHROUGH%` titles, PROD back to 785 lessons.

## Known broken things (so we don't re-discover them live)

- Submission pipeline entirely down until the auth-gate fix deploys (TEST **and** live site).
- No Reject button on the review screen; rejection = dead code + broken teacher-side display.
- No path for a teacher to resubmit after "revisions requested."
- "In Review" dashboard tab can never have contents.
- Signed-out users get pointed at a `/login` page that doesn't exist (login is a popup).
  **Pinpointed 2026-07-01:** the dead button is `UserProfile.tsx:249` (signed-out profile view →
  `navigate('/login')`). One-line fix → quick-wins patch bucket. NB the submit form handles
  signed-out correctly (auth modal + auto-resume of the pending submission — good pattern to
  copy). Backend refuses anonymous submissions regardless (RLS + gate). |
- On TEST only: extracted lesson text is canned placeholder content (no Google credential).
