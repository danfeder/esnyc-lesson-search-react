# Phase 7c — Submission Email Notifications: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development` for this session) to implement this plan task-by-task.

**Goal:** When a reviewer completes a submission review with `approved`, `needs_revision`, or `rejected`, the teacher receives a transactional email. Restore the "you'll receive an email" copy on the success page.

**Architecture:** Wire-up only — no greenfield. Resend SDK + `send-email` edge function + `RESEND_API_KEY` already in production. Add 3 templates to `send-email`, fill in the pre-marked Phase 7c hook in `complete-review`, restore the SubmissionPage copy. Fail-open on email send error (matches `user_invitations` precedent at `invitation-management/index.ts:268-269`). No DB schema changes.

**Tech Stack:** Deno (edge functions), Resend HTTP API, Supabase JS, React/TypeScript (frontend copy only).

**Estimated size:** 1 PR, ~175 LOC, mostly HTML template strings.

**Design source:** `docs/plans/2026-04-27-phase-7c-submission-emails-design.md` (committed `a98d3bc`).

---

## Pre-flight: critical context the implementer must know

1. **No new database migration.** This PR is pure edge-function + frontend code. The CI migration-apply path won't fire. No TEST DB schema verification needed (only TEST DB *runtime* verification of the email path — covered in Task 7).
2. **Do NOT write to `user_management_audit` for failed sends.** The table's `action` CHECK constraint (in `20251001_production_baseline_snapshot.sql:2142`) restricts values to a fixed list that does NOT include `email_sent_*` or `submission-email-failed`. The existing `send-email` function appears to violate this constraint at line 216 — the production constraint must have drifted from the migration baseline, but this PR should NOT take ownership of that mess. **Use `console.error` for failure logging in `complete-review`'s post-RPC email path.** If an audit row is desired later, that's a separate hygiene PR with a constraint-relaxing migration.
3. **There is no public `/lesson/:id` URL.** Lessons are viewed via in-page modal on the search page (`/`). The "Approved" CTA should link to `/profile` (where the teacher sees their submission with the linked `lesson_id`) — not a fictional `/lesson/<id>` route. This is a deviation from the design doc's "View your lesson → public lesson URL" wording; use `/profile` as the canonical "view status" target for all 3 email types.
4. **Resend "from" address** in production today: `'ESYNYC Lesson Library <onboarding@resend.dev>'` (the Resend dev sandbox sender). Existing 7 templates use it. Don't change it in this PR — that's a separate hygiene item.
5. **Auth model.** `complete-review` invokes `send-email` via `supabase.functions.invoke('send-email', ...)` using the **reviewer's JWT** (not service role) — the `serviceClient` is only used for the RPC call. `send-email` will see the reviewer as the authenticated user and gate on `role IN ('admin', 'super_admin')` — but reviewers have role `reviewer`, which would cause a 403. **This is a blocker.** Two options:
   - **(A)** Pass through the existing user JWT but ALSO accept role `reviewer` in `send-email`'s permission check (modify line 118 to include `'reviewer'`).
   - **(B)** In `complete-review`, instantiate a separate `serviceClient`-authed call to `send-email` so the auth check is bypassed (the `password-reset` / `role-changed` types already skip the auth check by including a `type !== 'X'` guard at line 80-85).
   - **Recommended: B.** Add `submission-approved`, `submission-needs-revision`, `submission-rejected` to the no-auth-required list in `send-email` (these are system-triggered, not user-triggered) and have `complete-review` invoke via the service client. Less surface area, cleaner mental model: "submission emails are system events."
6. **Per-PR ritual is mandatory.** Pre-push self-review via `feature-dev:code-reviewer`; bot-review investigation with Valid/Defer/Invalid triage; consolidated fix-up commits (not per-finding); round-cap after 2 rounds. See `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/feedback_pr_bot_review_workflow.md` and `…/feedback_bot_review_investigation.md`.
7. **Beads is broken on this repo.** Use TaskCreate (or just track via this plan). Don't run `bd` commands.
8. **Branch naming:** `feat/phase-7c-submission-emails` off `main`.

---

## Task 1: Add submission email types and templates to `send-email`

**Files:**
- Modify: `supabase/functions/send-email/index.ts:9-36` (extend `EmailRequest.type` union and `data` interface)
- Modify: `supabase/functions/send-email/index.ts:80-85` (add new types to no-auth-required list)
- Modify: `supabase/functions/send-email/index.ts:144-182` (add 3 cases to the switch)
- Modify: `supabase/functions/send-email/index.ts:end-of-file` (add 3 generator functions)

**Step 1: Extend the `EmailRequest` type union**

In `supabase/functions/send-email/index.ts`, change the `EmailRequest.type` union to add the 3 new values:

```typescript
interface EmailRequest {
  type:
    | 'invitation'
    | 'welcome'
    | 'password-reset'
    | 'password-changed'
    | 'role-changed'
    | 'account-deactivated'
    | 'account-reactivated'
    | 'submission-approved'
    | 'submission-needs-revision'
    | 'submission-rejected';
  to: string;
  data: {
    // existing fields untouched
    invitationId?: string;
    token?: string;
    inviterName?: string;
    recipientName?: string;
    role?: string;
    customMessage?: string;
    permissions?: string[];
    expiresAt?: string;
    resetUrl?: string;
    oldRole?: string;
    newRole?: string;
    changedBy?: string;
    deactivatedBy?: string;
    reactivatedBy?: string;
    reason?: string;
    // Phase 7c additions
    lessonTitle?: string;
    reviewerNotes?: string;
    profileUrl?: string;
    contactEmail?: string;
  };
}
```

**Step 2: Add new types to the no-auth-required list**

`send-email/index.ts:80-85` — Modify the `if (...)` guard to include the 3 new types so they bypass the admin/super_admin role check. Submission emails are system-triggered (called by `complete-review` after RPC commit), not user-triggered.

Before:
```typescript
if (
  type !== 'password-reset' &&
  type !== 'role-changed' &&
  type !== 'account-deactivated' &&
  type !== 'account-reactivated'
) {
```

After:
```typescript
if (
  type !== 'password-reset' &&
  type !== 'role-changed' &&
  type !== 'account-deactivated' &&
  type !== 'account-reactivated' &&
  type !== 'submission-approved' &&
  type !== 'submission-needs-revision' &&
  type !== 'submission-rejected'
) {
```

**Step 3: Add 3 cases to the switch (after line 178)**

Insert these case branches before the `default:` case in the switch at line 144-182:

```typescript
case 'submission-approved':
  subject = `Your ESYNYC lesson '${data.lessonTitle ?? 'submission'}' was approved`;
  emailHtml = generateSubmissionApprovedEmail(data, to);
  break;

case 'submission-needs-revision':
  subject = `Your ESYNYC lesson '${data.lessonTitle ?? 'submission'}' needs revision`;
  emailHtml = generateSubmissionNeedsRevisionEmail(data, to);
  break;

case 'submission-rejected':
  subject = `Your ESYNYC lesson '${data.lessonTitle ?? 'submission'}' was not selected for publication`;
  emailHtml = generateSubmissionRejectedEmail(data, to);
  break;
```

**Step 4: Add 3 generator functions at end of file**

Append these to `send-email/index.ts` (after `generateAccountReactivatedEmail`). Pattern: same HTML shell as `generateInvitationEmail` (line 242). Brand color `#22c55e`. Container width 600px. ESYNYC footer.

```typescript
function generateSubmissionApprovedEmail(data: any, _email: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.esynyc.org';
  const profileUrl = data.profileUrl || `${baseUrl}/profile`;
  const lessonTitle = data.lessonTitle || 'Your lesson';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lesson Approved</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #16a34a; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lesson Approved!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Great news — your lesson <strong>${lessonTitle}</strong> has been approved and is now part of the ESYNYC Lesson Library.</p>
            <p>Thank you for sharing your work with the community of educators.</p>
            <div style="text-align: center;">
              <a href="${profileUrl}" class="button">View your submissions</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateSubmissionNeedsRevisionEmail(data: any, _email: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.esynyc.org';
  const profileUrl = data.profileUrl || `${baseUrl}/profile`;
  const lessonTitle = data.lessonTitle || 'Your lesson';
  const reviewerNotes = data.reviewerNotes || '';

  // Reviewer notes are rendered verbatim. Escape HTML to prevent injection;
  // notes come from a trusted reviewer but are still untrusted from an
  // email-template perspective (no HTML rendering).
  const escapedNotes = reviewerNotes
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Submission Needs Revision</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #16a34a; }
          .notes-box { background-color: white; padding: 20px; border-left: 4px solid #22c55e; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reviewer Feedback on Your Submission</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>A reviewer has left feedback on your lesson <strong>${lessonTitle}</strong>. Please review their notes and revise as needed.</p>
            ${escapedNotes ? `
            <div class="notes-box">
              <p><strong>Reviewer notes:</strong></p>
              <p>${escapedNotes}</p>
            </div>` : ''}
            <p>You can view and update your submission from your profile page:</p>
            <div style="text-align: center;">
              <a href="${profileUrl}" class="button">View your submissions</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateSubmissionRejectedEmail(data: any, _email: string): string {
  const lessonTitle = data.lessonTitle || 'your submission';
  const contactEmail = data.contactEmail || 'admin@esynyc.org';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Submission Status Update</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Submission Status Update</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Thank you for submitting <strong>${lessonTitle}</strong> to the ESYNYC Lesson Library. After review, we are not able to publish this lesson at this time.</p>
            <p>If you'd like to discuss this decision, please reach out to <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
            <p>We appreciate your interest in contributing to the library.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

**Note on rejection styling:** The rejected email uses gray (`#6b7280`) for the header instead of brand green — visually softens the negative message. Subject avoids the word "rejected" per design.

**Step 5: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: PASS (0 errors). Edge function code is Deno but `tsc` shouldn't complain — the file isn't in the React `tsconfig.json` include path. If it IS included, fix any import paths.

**Step 6: Commit**

```bash
git checkout -b feat/phase-7c-submission-emails
git add supabase/functions/send-email/index.ts
git commit -m "$(cat <<'EOF'
feat(emails): add 3 submission notification email templates

Phase 7c — adds 'submission-approved', 'submission-needs-revision',
and 'submission-rejected' types to send-email. Templates follow the
existing ESYNYC-branded HTML shell. Submission types bypass the
admin/super_admin auth check (system-triggered events).

Refs: docs/plans/2026-04-27-phase-7c-submission-emails-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire up the post-RPC email send in `complete-review`

**Files:**
- Modify: `supabase/functions/complete-review/index.ts:229-231` (replace the placeholder hook with real email path)

**Step 1: Read the current placeholder**

`complete-review/index.ts:229-231` is currently:

```typescript
// Phase 7c hook: send-email trigger lands here. Today no-op so reject /
// needs_revision / approve_* don't accidentally email teachers about
// 2025 submissions during recovery.
```

**Step 2: Replace with the email-send block**

Replace those 3 comment lines with this implementation (insert AFTER the RPC error-check block ending at line 227, BEFORE the success `return jsonResponse(...)` at line 233):

```typescript
    // Phase 7c: post-RPC email notification. Fail-open — errors are logged
    // but do not roll back the approval. The RPC has already committed.
    try {
      const { data: subRow } = await serviceClient
        .from('lesson_submissions')
        .select('lesson_title, teacher_id, user_profiles!inner(email)')
        .eq('id', submissionId)
        .single<{
          lesson_title: string;
          teacher_id: string;
          user_profiles: { email: string };
        }>();

      const teacherEmail = subRow?.user_profiles?.email;

      if (teacherEmail) {
        // Map RPC decision to email type. RPC returns the new status, but
        // here we map directly from the reviewer's decision since
        // approve_new and approve_update both result in 'approved'.
        let emailType:
          | 'submission-approved'
          | 'submission-needs-revision'
          | 'submission-rejected'
          | null = null;

        if (decision === 'approve_new' || decision === 'approve_update') {
          emailType = 'submission-approved';
        } else if (decision === 'needs_revision') {
          emailType = 'submission-needs-revision';
        } else if (decision === 'reject') {
          emailType = 'submission-rejected';
        }

        if (emailType) {
          const emailData: Record<string, unknown> = {
            lessonTitle: subRow.lesson_title,
          };
          if (emailType === 'submission-needs-revision' && notes) {
            emailData.reviewerNotes = notes;
          }

          const { error: emailErr } = await serviceClient.functions.invoke(
            'send-email',
            {
              body: {
                type: emailType,
                to: teacherEmail,
                data: emailData,
              },
            }
          );
          if (emailErr) {
            console.error(
              `Phase 7c: send-email returned error for submission ${submissionId}:`,
              emailErr
            );
          }
        }
      } else {
        console.warn(
          `Phase 7c: no teacher email found for submission ${submissionId}; skipping notification`
        );
      }
    } catch (err) {
      console.error(
        `Phase 7c: email notification failed for submission ${submissionId}:`,
        err
      );
    }
```

**Notes:**
- Uses `serviceClient` (not `userClient`) to invoke `send-email`. This works with the no-auth-required types added in Task 1.
- `notes` comes from the request body (already destructured at line 94). Used only for `submission-needs-revision`.
- Failure is **fail-open** — errors logged via `console.error` only. No `user_management_audit` write (see pre-flight note 2). Resend has its own delivery logs for forensics.
- The `<{...}>()` type assertion on `.single<>()` is required to convince TypeScript that `user_profiles!inner(email)` returns a typed object, not an array.

**Step 3: Verify TypeScript / Deno**

Run: `npm run type-check`
Expected: PASS. If it complains about Deno globals, this is an existing project pattern — edge functions are not in the main tsconfig.

**Step 4: Commit**

```bash
git add supabase/functions/complete-review/index.ts
git commit -m "$(cat <<'EOF'
feat(review): wire post-RPC submission email path in complete-review

Phase 7c — replaces the placeholder hook at lines 229-231 with the
actual email send. Fetches teacher email via lesson_submissions ×
user_profiles JOIN, maps reviewer decision to email type, invokes
send-email via service client. Fail-open: errors are logged via
console.error, never roll back the approval (matches user_invitations
precedent at invitation-management/index.ts:268-269).

Refs: docs/plans/2026-04-27-phase-7c-submission-emails-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Restore the email-promise copy in `SubmissionPage`

**Files:**
- Modify: `src/pages/SubmissionPage.tsx:396` (one line — restore email-promise wording removed by Phase 7a / PR #441 / commit `89d9f7a`)

**Step 1: Find the line**

The current bullet (set by PR #441) at `src/pages/SubmissionPage.tsx:396` reads:

```jsx
<li>· Track your submission's status from your profile.</li>
```

**Step 2: Replace with email-promise wording**

The original (pre-#441) wording was: `You'll receive an email once your lesson is approved.` That's slightly underclaimed for what 7c ships — also covers needs-revision and rejection. Use:

```jsx
<li>· You'll receive an email when your submission is reviewed.</li>
```

This matches the design doc note ("Restore the email-promise copy at `src/pages/SubmissionPage.tsx:237`" — note the design doc's line number is stale; current file has the bullet at ~line 396).

**Step 3: Type-check + lint**

```bash
npm run type-check && npm run lint
```
Expected: PASS for both. Pure string change, no logic.

**Step 4: Commit**

```bash
git add src/pages/SubmissionPage.tsx
git commit -m "$(cat <<'EOF'
feat(submission): restore email-promise copy on success page

Phase 7c — Phase 7a (PR #441) removed the 'you'll receive an email'
wording because the email pipeline wasn't wired up. With 7c shipping
the actual email path, restore the promise. Wording covers all 3
review outcomes (approved / needs revision / rejected) rather than
just approved.

Refs: docs/plans/2026-04-27-phase-7c-submission-emails-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Local end-to-end smoke test

**Goal:** Verify all 3 email types render correctly in the dev-mode console fallback (no actual Resend send needed locally).

**Step 1: Reset local DB and start Supabase**

```bash
supabase db reset
supabase functions serve send-email --no-verify-jwt &
supabase functions serve complete-review --no-verify-jwt &
```

**Step 2: Seed a test submission and reviewer**

In a separate terminal, use `mcp__supabase__execute_sql` (LOCAL) to insert a test submission with a known teacher_id pointing at a profile with a real email. Reuse one of the seeded `admin@test.com` / `teacher@test.com` accounts (per `reference_test_credentials.md` memory).

```sql
-- Find an existing teacher account
SELECT id, email FROM user_profiles WHERE role = 'teacher' LIMIT 1;

-- Insert a test submission attributed to that teacher
INSERT INTO lesson_submissions (
  id, teacher_id, lesson_title, status, submission_type,
  google_doc_url, google_doc_id, content_text
) VALUES (
  gen_random_uuid(), '<teacher-uuid>', 'Phase 7c smoke test lesson',
  'in_review', 'new', 'https://docs.google.com/document/d/test', 'test', 'placeholder content'
)
RETURNING id;
```

**Step 3: Invoke `send-email` directly for each of the 3 new types**

Without `RESEND_API_KEY` set in local env, `send-email` falls back to console-logging the rendered HTML (line 126-139). For each type, run:

```bash
curl -X POST 'http://localhost:54321/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <local-anon-key>" \
  -d '{
    "type": "submission-approved",
    "to": "test@example.com",
    "data": { "lessonTitle": "My Test Lesson" }
  }'

curl -X POST 'http://localhost:54321/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <local-anon-key>" \
  -d '{
    "type": "submission-needs-revision",
    "to": "test@example.com",
    "data": {
      "lessonTitle": "My Test Lesson",
      "reviewerNotes": "Please add learning objectives and clarify the materials list. <script>alert(1)</script>"
    }
  }'

curl -X POST 'http://localhost:54321/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <local-anon-key>" \
  -d '{
    "type": "submission-rejected",
    "to": "test@example.com",
    "data": { "lessonTitle": "My Test Lesson" }
  }'
```

**Expected for each:**
- HTTP 200
- Response body contains `"success": true, "message": "Email logged (development mode)"`
- Console output (in the `supabase functions serve` terminal) shows the rendered HTML
- For needs-revision: confirm the `<script>` tag is HTML-escaped to `&lt;script&gt;` in the rendered notes

**Step 4: Test the failure path via `complete-review`**

Stub the `send-email` invoke to fail by stopping the `send-email` server (`kill %1`) while leaving `complete-review` running. Submit a complete-review request via the dev UI or via curl:

```bash
curl -X POST 'http://localhost:54321/functions/v1/complete-review' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer <reviewer-jwt>" \
  -d '{
    "submissionId": "<test-submission-uuid>",
    "decision": "needs_revision",
    "notes": "Test failure path"
  }'
```

**Expected:**
- HTTP 200 with `success: true` (the RPC committed)
- `complete-review` console shows: `Phase 7c: send-email returned error...` or `Phase 7c: email notification failed...`
- Database: the `submission_reviews` row exists, the submission status changed to `needs_revision`. The email failure did NOT roll back.

**Step 5: Document the smoke**

No commit. Just verify locally before pushing.

---

## Task 5: Pre-PR checklist + first push (with pre-push self-review)

**Step 1: Run the mandatory pre-PR checks**

```bash
npm run type-check && npm run lint
```
Expected: 0 errors. If there are existing-codebase warnings, that's fine — only our changes need to be clean.

**Step 2: Pre-push self-review via `feature-dev:code-reviewer`**

This is MANDATORY per `feedback_pr_bot_review_workflow.md`. Dispatch the `feature-dev:code-reviewer` subagent with this brief:

```
Brief for the reviewer:
- Scope: Phase 7c of the lesson submission Tier-1 work. 3 commits on
  branch feat/phase-7c-submission-emails.
- Goal: Wire submission emails (approved / needs_revision / rejected)
  into the existing send-email + complete-review pipeline.
- Design: docs/plans/2026-04-27-phase-7c-submission-emails-design.md
- Out of scope: PR #441's email-promise wording was deliberately
  pessimistic; the new wording covers all 3 outcomes (intentional).
- Out of scope: user_management_audit writes for failed sends. The
  table's CHECK constraint doesn't accept new action types and we're
  not relaxing it in this PR. console.error is the failure log.
- Out of scope: Resend "from" address (still onboarding@resend.dev,
  same as the existing 7 templates).
- Out of scope: lesson view URL (no public /lesson/:id route exists;
  CTA points at /profile by design).
- Look for: HTML injection in reviewerNotes (Step 3 of Task 1 escapes
  4 chars + newline → <br>; verify completeness), email-data
  destructuring assumptions, fail-open path correctness, JOIN syntax
  on lesson_submissions × user_profiles.
- Run: git diff main..feat/phase-7c-submission-emails
```

Apply real findings. Re-run `npm run type-check && npm run lint` if any code changed. If no findings, proceed.

**Step 3: First push and PR creation**

```bash
git push -u origin feat/phase-7c-submission-emails

gh pr create --title "feat(emails): Phase 7c — submission notification emails" --body "$(cat <<'EOF'
## Summary

Phase 7c of the lesson-submission Tier-1 initiative. When a reviewer completes a review, the submitting teacher gets a transactional email matching the decision:

- `approve_new` / `approve_update` → "Lesson Approved" email
- `needs_revision` → "Reviewer Feedback" email (with verbatim notes)
- `reject` → "Submission Status Update" email (generic + admin contact)

Restores the "you'll receive an email when reviewed" copy on the submission success page (originally removed by PR #441 because the email path didn't exist).

## What's in the PR

- `supabase/functions/send-email/index.ts` — adds 3 type entries, no-auth-required guard, switch cases, and 3 HTML template generators (~150 LOC)
- `supabase/functions/complete-review/index.ts` — replaces the Phase 7c placeholder hook (lines 229-231) with the real send path: JOIN `lesson_submissions × user_profiles`, decision→email-type mapping, fail-open invocation via service client (~50 LOC)
- `src/pages/SubmissionPage.tsx` — restore email-promise copy (1 LOC)

## Architecture

The send happens AFTER `complete_review_atomic` commits. Email failure does NOT roll back the approval (fail-open), matching the `user_invitations` precedent at `invitation-management/index.ts:268-269`. The reviewer's decision is the source of truth; the email is a side-effect notification.

Submission types bypass the admin/super_admin auth check in `send-email` (system-triggered, not user-triggered).

## Out of scope (and why)

- **`user_management_audit` writes for failed sends.** The table's `action` CHECK constraint doesn't accept new action types. Adopting that mess is a separate hygiene PR. `console.error` is the failure log; Resend retains delivery records.
- **Resend "from" address.** Still `onboarding@resend.dev` (the dev sandbox), same as the existing 7 templates. Domain-verification is a separate item.
- **Public lesson URL CTA.** No `/lesson/:id` route exists. All 3 emails link to `/profile` instead.
- **Phase 8a's reject UI.** This PR ships the backend email path. The reviewer-side reject button comes in 8a.

## Test plan

- [ ] Local: `npm run type-check && npm run lint` clean
- [ ] Local: each of the 3 email types renders correctly to console (RESEND_API_KEY unset)
- [ ] Local: `<script>` tag in reviewerNotes is HTML-escaped, not rendered
- [ ] Local: failure path — `send-email` unavailable does NOT roll back the RPC
- [ ] TEST DB: deploy preview's reviewer UI sends each of the 3 email types; verify Resend test inbox receives them with correct branding + working CTAs
- [ ] PROD smoke (post-merge): one real reviewer-flow test against a known disposable submission

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Wait for CI to settle**

Use `gh pr checks <pr-number> --watch` or the Monitor tool to wait for ALL CI checks to complete. Per `feedback_pr_bot_review_workflow.md`:
- Wait for ALL checks to finish
- Wait for any pending bot review comments to post
- "CI completing with no new bot comment counts as 'the bot reviewed and had nothing to say'" — that satisfies the gate; don't wait longer

Do NOT push fix-up commits while CI is mid-run. Hold all triage as uncommitted working-tree edits.

---

## Task 6: Bot-review investigation + consolidated fix-up commit

**Step 1: Collect all bot findings**

Once CI is done and all bots have posted (or 5+ minutes have elapsed since the last bot comment), gather:

```bash
gh pr view <pr-number> --comments
gh api repos/<owner>/<repo>/pulls/<pr-number>/comments
```

Bots active on this repo: `claude-review`, `claude-database-review` (won't fire — no migrations), maybe `Greptile`/`semgrep`/`CodeQL` security tools.

**Step 2: Triage every finding (including "minor")**

Per `feedback_bot_review_investigation.md`, the protocol is the challenge pass for EVERY finding. For each, write:

- **What the bot said** (paraphrase)
- **Verification** (read the surrounding code, check whether prior commits handle it)
- **Verdict:** Valid / Defer / Invalid
- **Reasoning** (one sentence)

Calibration bar: *"would the absence of this fix produce a bug a user notices or risk database damage?"* If no, default reject.

Common bot patterns to expect:
- "Add error handling for the JOIN" → Verify what the existing code does. If `subRow` is null we already fall through to the no-email branch. Likely Invalid.
- "Add `submission-email-failed` audit row" → Reject (CHECK-constraint mismatch, see pre-flight note 2).
- "Test coverage for the new email types" → Defer/Invalid (this is a thin wire-up; the templates are static; runtime smoke covers it).
- "Sanitize the lesson title in the subject line" → Verify. Lesson titles come from `extracted_title` which is reviewer-tagged; not user-injected at send time. Likely Invalid.
- "Use a more specific TypeScript type for the JOIN result" → If the type assertion is needed for `tsc` to pass, current code is fine.

**Step 3: Write the triage table to the PR as a comment**

Post the full triage as a single PR comment (transparency for the human reviewer). Format:

```
## Triage of bot findings

| Finding | Verdict | Reasoning |
|---|---|---|
| ... | Valid / Defer / Invalid | ... |
```

**Step 4: Apply only Valid findings as a single fix-up commit**

```bash
# After making all edits to working tree:
git add <files>
git commit -m "$(cat <<'EOF'
fix(emails): apply bot-review findings (Phase 7c round 1)

Consolidated fix-up: <one-line summary of each accepted finding>.
Triage table posted on PR.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

**Step 5: Round-cap rule**

Per `feedback_pr_bot_review_workflow.md`, after 2 full rounds of bot comments + fix-ups, round 3+ findings get the tightest calibration: "user-visible bug or DB damage only." Anything below that bar is deferred or rejected without code change.

**Step 6: Repeat until merge-ready**

Loop on Steps 1-4 until no new findings or round-cap kicks in.

---

## Task 7: TEST DB runtime smoke (deploy preview)

**Step 1: Wait for Netlify deploy preview to be live**

Per CLAUDE.md: "MANDATORY: Before merging any PR with database changes: 1. Wait for deploy preview to be live (CI applies migrations to TEST DB)..."

This PR has NO database changes, but the deploy preview still needs to come up so the frontend hits the deployed `complete-review` and `send-email` edge functions on TEST.

**Step 2: Deploy edge functions to TEST**

The repo's edge-function deploy workflow handles this automatically on PR (per `.github/workflows/deploy-edge-functions.yml`). Verify both functions deployed:

```bash
gh run list --workflow=deploy-edge-functions.yml --limit=3
```

Or use `mcp__supabase-test__list_edge_functions` to confirm both `send-email` and `complete-review` are deployed.

**Step 3: Reviewer UI smoke on TEST**

Log in to the deploy preview as a reviewer (use `reviewer@test.com` / `password123` per `reference_test_credentials.md`). Find a test submission (or create one) and run all 3 review decisions:

1. Approve a submission → check Resend test inbox for `submission-approved` email
2. Mark another as needs revision with notes → check inbox for `submission-needs-revision`, verify notes render correctly
3. (If reject UI exists yet — Phase 8a may not have shipped) — directly invoke `complete-review` with `decision: 'reject'` via curl with a reviewer JWT to validate the rejection email

**Step 4: Spot-check rendered HTML**

Open each received email in the Resend dashboard (or the Resend test inbox UI):
- Brand color matches (#22c55e for approved/needs-revision, #6b7280 for rejected)
- Lesson title appears in subject + body
- CTAs link to `https://deploy-preview-NNN--esynyc-lessonlibrary-v2.netlify.app/profile`
- Reviewer notes render as paragraphs with `<br>` line breaks (no raw `<script>` if you injected one)
- Footer copyright + "do not reply" present

**Step 5: Negative path on TEST**

Manually flip the reviewer UI test submission to use a teacher_id whose profile has a NULL email, then approve. Watch `mcp__supabase-test__get_logs` for the `complete-review` function — should show the `Phase 7c: no teacher email found` warning. RPC should still succeed; UI should show "Approved" without throwing.

---

## Task 8: Merge + post-merge PROD smoke

**Step 1: Verify all required CI checks green**

```bash
gh pr checks <pr-number>
```
Required: type-check, lint, E2E, RLS tests (if applicable). Security Audit fails on every PR (see project memory) — ignore unless the failure changed shape.

**Step 2: Merge**

```bash
gh pr merge <pr-number> --squash --delete-branch
```

Repo convention is squash-merge per `feedback_pr_bot_review_workflow.md`.

**Step 3: Wait for production edge-function deploy**

The deploy-edge-functions workflow runs on push to `main`. Watch:

```bash
gh run list --workflow=deploy-edge-functions.yml --limit=1
```

Wait until both `send-email` and `complete-review` are redeployed to PROD.

**Step 4: PROD smoke**

Coordinate with a real reviewer (or use a sandbox/throwaway test submission on PROD if one exists):

1. Have the reviewer (or you, with a reviewer-role test account on PROD if available) approve / request-revision / reject one disposable submission each
2. Verify each teacher email is received
3. Use `mcp__supabase-remote__get_logs` for the `complete-review` function: confirm no `Phase 7c: ...` error logs

**Step 5: Update the project memory**

Update `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_lesson_submission_tier1.md`:

- Phase 7c row: ⏳ → ✅ Shipped (PR #NNN → `<sha>`)
- "Last updated" line + key result: "Phase 7c shipped. Submission emails wired up. Phase 8a unblocked."
- Add a "Calibration takeaways from Phase 7c" section if anything notable came up

**Step 6: Session-close kickoff prompt**

Per `feedback_user_relearning.md` and the initiative's session-close protocol, write a kickoff prompt for the next session that:
1. Names the initiative
2. Tells next session to read the project anchor first
3. Names the current next-action: Phase 8a (rejection UI) or Phase 1b Stage 2 (DROP), or work the 4 held-outs

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `user_profiles!inner(email)` JOIN syntax doesn't return the expected shape on the `serviceClient` | Pre-flight test in Task 4 Step 2 (curl directly); type-assert with `.single<>()`; fallback path logs a warning and skips |
| Resend rate limits or auth fails | Existing 7 templates work today; no behavior change for them. Phase 7c additions are independent — just 3 new types |
| Reviewer notes contain HTML/markdown that renders weirdly | Task 1 Step 4 escapes 5 chars + newline → `<br>`. Verified in local smoke (Task 4 Step 3) |
| Submission's teacher_id points at a deleted user_profiles row | The JOIN returns null → skips email send → logs warning. RPC already committed; teacher-side impact is only a missed notification (which they'd never receive anyway since they're deleted) |
| `complete-review` already-shipped behavior breaks | Diff is purely additive after the RPC's success branch. The fail-open `try/catch` blocks any new exception from propagating to the user |
| Constraint violation on `user_management_audit` insert | We don't write to that table in this PR (pre-flight note 2) |

---

## Definition of done

- [ ] All 3 commits land on `feat/phase-7c-submission-emails` (Tasks 1-3)
- [ ] Local smoke verified (Task 4)
- [ ] PR opened with full description (Task 5)
- [ ] CI green; bot review triaged + applied (Task 6)
- [ ] TEST DB smoke verified (Task 7) — all 3 email types received with correct rendering
- [ ] Merged + PROD smoke verified (Task 8)
- [ ] Project memory updated with Phase 7c shipped status
- [ ] Session-close kickoff prompt written for next session

---

## Per-PR ritual reminders (USER PREFERENCE — must follow)

These are mandatory for every PR in this initiative; skipping = process violation.

1. **Pre-push self-review** via `feature-dev:code-reviewer` (Task 5 Step 2). Brief on intent + scope + out-of-scope. Apply real findings before first push.
2. **Bot-review investigation** (Task 6) — challenge every finding (incl. "minor"). Triage Valid/Defer/Invalid. Bundle accepted into ONE consolidated fix-up commit; don't push per-finding.
3. **Round-cap rule** — after 2 rounds of bot-fix cycles, round 3+ findings get tightest calibration ("user-visible bug or DB damage" only).
4. **Calibration bar** — *"would the absence of this fix produce a bug a user notices or risk database damage?"* If no, default reject.
5. **Don't bypass:** never use `--no-verify`, never amend commits, never skip the type-check/lint pre-PR step.

---

## Out of scope for Phase 7c

- Phase 8a (rejection UI) — Q1 already answered "A: keep both reject + needs_revision". Becomes shovel-ready after this PR ships.
- Phase 8b (`approve_update` redesign) — bigger structural change.
- Phase 1b Stage 2 (DROP `publish_approved_submissions`) — observation-window-blocked until ~2026-05-04.
- The 4 held-out orphans (Lunar New Year B-new, African American Food Traditions, Applesauce, Acai Bowls) — independent of email work.
- Email template editor, bounce/unsubscribe handling, digest/batching, custom Resend domain — see design doc "Out of scope" section.
- Fixing the `user_management_audit` CHECK-constraint drift between baseline migration and live PROD — separate hygiene PR.
