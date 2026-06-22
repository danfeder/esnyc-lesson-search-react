# Phase 7c — Submission Email Notifications

**Status:** Design approved 2026-04-27. Ready for implementation plan + execution.
**Owner:** Lesson submission Tier-1 initiative.
**Depends on:** Phase 4 (atomic `complete_review` RPC + edge function) — shipped 2026-04-27 in PR #449.
**Unblocks:** Phase 8a (reject UI + email wiring).

## Background

Phase 7a (PR #441) removed the misleading "you'll receive an email" copy from the submission success page because email infrastructure wasn't wired up. Phase 7c is the work that lets us put the promise back honestly. Teachers should be notified when a reviewer makes a decision on their submission.

The exploration agent confirmed the email infrastructure is ALREADY in place:

- **Resend SDK** integrated (HTTP via Deno fetch). Used in production by `user_invitations`.
- **`supabase/functions/send-email/index.ts`** is a fully-functional dispatch function with 7 existing email types (`invitation`, `welcome`, `password-reset`, etc.). All ESYNYC-branded HTML.
- **`RESEND_API_KEY`** configured in `.env`, staging, and production environments.
- **`user_management_audit`** table tracks email sends for follow-up.
- **`supabase/functions/complete-review/index.ts:229-231`** has an explicit pre-built hook with this comment: *"Phase 7c hook: send-email trigger lands here. Today no-op so reject / needs_revision / approve_* don't accidentally email teachers about 2025 submissions during recovery."*
- **`lesson_submissions.teacher_id` → `user_profiles.email`** is the email-fetch JOIN.

## Architecture

```
ReviewDetail UI → complete-review edge function → complete_review_atomic RPC
                                                      │
                                                      ↓ (status: approved | needs_revision | rejected)
                                          Edge function: post-RPC email branch
                                                      │
                                                      ↓ JOIN lesson_submissions × user_profiles
                                          send-email edge function (Resend)
                                                      │
                                                      ↓ log to user_management_audit
                                          (fail-open: errors logged, don't roll back approval)
```

The email send happens AFTER the RPC commits successfully. Failure to send does NOT roll back the approval — matches the `user_invitations` precedent at `invitation-management/index.ts:268-269`. The reviewer's decision is the source of truth; the email is a notification side-effect.

## Three email types

| Type | When | Body content | CTA | Subject |
|---|---|---|---|---|
| `submission-approved` | RPC returns `'approved'` (covers both `approve_new` and `approve_update`) | Pure celebration: "Your lesson `[title]` is now in the ESYNYC library." | "View your lesson" → public lesson URL | "Your ESYNYC lesson '[title]' was approved" |
| `submission-needs-revision` | RPC returns `'needs_revision'` | "A reviewer left feedback on `[title]`. Their notes: `[submission_reviews.notes verbatim]`." | "View submission" → /profile or /submission/:id | "Your ESYNYC lesson '[title]' needs revision" |
| `submission-rejected` | RPC returns `'rejected'` | Generic: "We're not able to publish `[title]` at this time. Please reach out to admin@esynyc.org if you'd like to discuss." | None / mailto:admin@esynyc.org | "Your ESYNYC lesson '[title]' was not selected for publication" |

### Content design rationale

- **Approved:** Single template covers both `approve_new` and `approve_update`. From the teacher's perspective, both are "approved" — the new-vs-update distinction is internal to the reviewer workflow. Pure congratulations; no implementation detail in the body.
- **Needs revision:** Reviewer notes included **verbatim**. The teacher needs the notes to act. Reviewers write these expecting the teacher to read them; sanitization would require new tooling and is YAGNI.
- **Rejected:** Generic copy without reviewer notes. Per Q1=A reasoning ("clean exit for spam/erroneous submissions"), the reject path needs a polite-but-final tone. Including notes risks leaking review language inappropriate for spam senders. Includes a contact email for legitimate teachers who want to discuss.
- **Subject lines:** Avoid the word "rejected" in user-facing copy — "not selected for publication" is softer for legitimate teachers and still unambiguous for the reject path.

## Code changes

| File | Change | Approx LOC |
|---|---|---|
| `supabase/functions/send-email/index.ts` | Add 3 entries to `EmailRequest.type` union. Add 3 generator functions modelled on the existing `invitation` template (same HTML shell, brand colors, container). | ~150 |
| `supabase/functions/complete-review/index.ts` | Replace the lines 229-231 hook comment with: fetch `teacher_email` via `user_profiles` JOIN; switch on `v_new_status`; invoke `send-email` with appropriate type + payload; wrap in try/catch; log failures to `user_management_audit` with `email_id=null` and a failure-reason field. | ~25 |
| `src/pages/SubmissionPage.tsx:237` | Restore "You'll receive an email when your submission is reviewed" copy (or similar — confirm exact wording in the implementation pass). | ~1 |

## Data flow detail

The edge function receives the RPC result. After RPC commit:

```typescript
// Pseudocode for the new lines 229-231 area
const { data: profile } = await supabase
  .from('lesson_submissions')
  .select('teacher_id, lesson_title, user_profiles!inner(email)')
  .eq('id', submissionId)
  .single();

if (!profile?.user_profiles?.email) {
  // Log: no email on file; skip send. Don't fail the request.
  return responseFromRPC;
}

let emailType: 'submission-approved' | 'submission-needs-revision' | 'submission-rejected';
switch (rpcResult.status) {
  case 'approved': emailType = 'submission-approved'; break;
  case 'needs_revision': emailType = 'submission-needs-revision'; break;
  case 'rejected': emailType = 'submission-rejected'; break;
  default: return responseFromRPC; // unknown status — don't email
}

try {
  await supabase.functions.invoke('send-email', {
    body: {
      type: emailType,
      to: profile.user_profiles.email,
      data: {
        lessonTitle: profile.lesson_title,
        reviewerNotes: emailType === 'submission-needs-revision' ? rpcResult.notes : undefined,
        lessonUrl: emailType === 'submission-approved' ? buildLessonUrl(rpcResult.lesson_id) : undefined,
      },
    },
  });
} catch (err) {
  // Fail-open: log + continue
  console.error('Phase 7c email send failed:', err);
  // Optional: insert audit row with type=submission-email-failed
}

return responseFromRPC;
```

Implementation should refine this — e.g., centralize the "build lesson URL" helper, decide on the audit-row shape for failed sends, and handle the `data` payload shape consistently with how the existing 7 email types pass their data.

## Testing strategy

### Local
1. Run `complete-review` against a seeded local submission with each of the 3 decisions.
2. With `RESEND_API_KEY` unset, the existing `send-email` fallback prints email content to console. Verify each email type renders correctly.
3. Confirm the failure path: stub `send-email` to throw; verify the RPC's success result still propagates back to the UI.

### TEST DB
1. Use the reviewer UI on the deploy preview to approve / request-revision / reject one test submission each.
2. Verify Resend's TEST API key inbox receives all 3 emails.
3. Spot-check rendered HTML in the inbox: brand colors, link CTAs work, reviewer notes render correctly in needs-revision.

### PROD smoke (post-merge)
1. After PROD deploy, do one real reviewer-flow test against a known-disposable submission (or coordinate with a reviewer for a sandbox lesson).
2. Verify the teacher's email arrives.
3. Watch `user_management_audit` for the audit row.

## Out of scope (call out for next-time)

- **Email template editor / admin-customizable content.** Static templates ship for now; an editor is a separate UX project.
- **Bounce / unsubscribe handling.** Resend handles globally for the workspace. ESYNYC isn't sending bulk; one-off transactional emails don't need a custom unsubscribe flow.
- **Email digest / batching.** Each review fires its own email, like invitations. Reviewers don't bulk-decide; teachers don't get spammed.
- **Phase 8a's rejection UI.** This PR ships the *backend* email path. The reviewer UI's reject button comes in 8a, which can call the same edge function path 7c builds.
- **`gradeLevels`/`subjects_taught` rendering in emails.** Out of scope per the existing `project_grades_subjects_unused.md` memory entry — these fields aren't consumed.

## Open questions resolved during design

- **Q: Email tone for rejection?** A: Generic + admin-contact. Avoids leaking review language for spam paths; legitimate teachers can still reach out via the email.
- **Q: Include reviewer notes in needs-revision email?** A: Yes, verbatim. Notes are written for the teacher to act on.
- **Q: Restore the success-page email promise?** A: Yes — that's the whole point.
- **Q: Failure mode?** A: Fail-open. Email send error does not roll back the approval. Matches `user_invitations` precedent.
- **Q: Two approve sub-types in the email?** A: One `submission-approved` template; teacher doesn't care about the new-vs-update internal distinction.

## Estimate

**Small — 1 PR.** Confidence high because:

- All infrastructure is already in production (Resend, send-email function, audit table).
- Hook location is pre-marked in code with a Phase 7c comment.
- Email path follows the proven `user_invitations` pattern; same function, same audit logging.
- No database schema changes needed.
- No new dependencies.

Realistic timeline: 1-2 working days dev + testing.

## Per-PR ritual reminders (USER PREFERENCE — must follow)

1. **Pre-push self-review** via `feature-dev:code-reviewer` on the staged diff before first push. Brief on intent + scope. Apply real findings before pushing.
2. **Bot-review investigation** — when claude-review / claude-database-review / etc. post findings, run the challenge pass for EVERY finding (including "minor"). Triage as Valid/Defer/Invalid before applying. Hold fixes as uncommitted edits; bundle into ONE consolidated fix-up commit after the review surface settles.
3. **Round-cap rule** — after 2 rounds of bot-fix cycles, round 3+ findings get tightest calibration ("user-visible bug or DB damage only").
4. **Calibration bar** — *"would the absence of this fix produce a bug a user notices or risk database damage?"* If no, default reject.

## Next step

Invoke the `superpowers:writing-plans` skill (in a fresh session — current session is at high context pressure) to convert this design into a step-by-step implementation plan. The plan should:

- Break the work into discrete commits (e.g., send-email type-additions first, then complete-review wire-up, then frontend copy, then end-to-end test).
- Include the per-PR ritual checklist.
- Surface any test seeding needed for local validation.

After the plan is written, the implementation proceeds via `superpowers:executing-plans` or `superpowers:subagent-driven-development` per the project's normal multi-PR rhythm.
