# Brief: Edge-function auth gate fix (`crypto.subtle.timingSafeEqual` removed in Deno 2)

**Written by:** Fable, 2026-07-01 (T2 prep session — discovered while rehearsing the submission
flow on TEST). **Executor:** Opus, fresh session. **This brief tells you exactly what to build,
how to verify, and when to STOP. Do not redesign, expand scope, or improvise around a failed
assumption — halt and report instead.**

## Root cause (verified live, do not re-derive)

The service-role auth gate used in three edge functions calls
`crypto.subtle.timingSafeEqual(tokenBytes, keyBytes)`. That API was a **non-standard Deno 1.x
extension, removed in Deno 2** — and Supabase's hosted edge runtime now runs Deno 2. The call
throws `TypeError: crypto.subtle.timingSafeEqual is not a function`, lands in each function's
catch-all, and returns 400.

The trap only fires when the bearer token's byte length **equals** the service-role key's length
— i.e. **exactly and only the legitimate server-to-server calls**. User-JWT calls have a
different length, short-circuit at the `tokenBytes.length === keyBytes.length &&` check, and
work fine. That's why browsers work and the pipeline looks alive while every internal call is
dead.

Evidence (2026-07-01):
- TEST: `process-submission` fails end-to-end with `"Failed to extract content"`;
  `extract-google-doc` returns 400 to the internal service-role call but 200 to a user JWT.
- Probe: a garbage bearer of exactly 219 chars (= service key length) against
  `extract-google-doc` returns `{"error":"crypto.subtle.timingSafeEqual is not a function"}` /
  HTTP 400 — on **both TEST and PROD**.
- Impact scan: no lesson_submissions rows created on PROD since 2025-09-19, so no user has hit
  this yet. Launch blocker, not an incident.

## Broken flows this fix repairs

1. `process-submission` → `extract-google-doc` (service bearer) — **fatal**: all new lesson
   submissions fail. This blocks the T2 walkthrough and launch.
2. `process-submission` → `detect-duplicates` (service bearer, `index.ts:568-572`) — fail-open
   (logged at `:585`), so duplicate detection silently never runs.
3. `complete-review` / `password-reset` / `user-management` → `send-email` (service bearer) —
   fail-open, so ALL system emails die at the gate **before Resend is even reached**. (Resend
   sandbox sender + missing DNS are additional, separate layers of email breakage — out of
   scope here, T3's problem.)

## The fix (decided — implement exactly this)

**1. New shared helper** `supabase/functions/_shared/timing-safe-equal.ts`:

```ts
// Constant-time byte-equality for secrets. Deno 2 removed the non-standard
// crypto.subtle.timingSafeEqual, so we implement the standard XOR fold.
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
```

**2. Three call sites** — in each, import the helper and replace only the
`crypto.subtle.timingSafeEqual(tokenBytes, keyBytes)` expression with
`timingSafeEqual(tokenBytes, keyBytes)`. Keep the existing length short-circuit line intact
(it's redundant with the helper's own check; that's fine — minimal diff wins).

- `supabase/functions/extract-google-doc/index.ts:48`
- `supabase/functions/detect-duplicates/index.ts:231`
- `supabase/functions/send-email/index.ts:102`

**3. Docs:** update the canonical auth-gate snippet in `supabase/functions/CLAUDE.md` (~line 41)
to import/use the shared helper, and add one line to its Common Errors table:
`crypto.subtle.timingSafeEqual is not a function` → Deno 2 removed it; use
`_shared/timing-safe-equal.ts`.

**Nothing else.** No CORS changes, no gate refactors, no std imports, no touching the other
functions, no migrations.

## PR mechanics

- Branch `fix/edge-auth-gate-deno2` off `main`.
- The PR also carries the currently-uncommitted docs that are waiting for a docs-carrying PR:
  the modified `docs/plans/2026-07-01-go-live-tracker.md`, this brief, and
  `docs/plans/2026-07-01-t2-walkthrough.md`. **Do NOT sweep in any other untracked
  `docs/plans/` files** — several are deliberately uncommitted.
- `npm run check` + `npm run test:run` before push (mandatory trio; all fast).
- No DB changes → no TEST-DB migration verification needed; this is an edge-function-only PR.
- Check `.github/workflows/` to confirm how edge functions deploy to TEST vs PROD (PROD
  requires manual approval; watch for the known matrix silent-no-op — see the CI/deploy flakes
  memory doc pattern: verify by function `version`/`updated_at` bump via
  `mcp__supabase-test__list_edge_functions`, not by workflow green alone).

## Verification gates (pre-registered — run all, in order)

**After TEST deploy of the three functions:**
1. Gate probe: POST to TEST `extract-google-doc` with header
   `Authorization: Bearer <219 × 'A'>` and body
   `{"googleDocUrl":"https://docs.google.com/document/d/xxx_probe/edit"}`.
   **Expect HTTP 401 `Invalid authentication token`** (was: 400 TypeError). Same probe shape
   against `send-email` and `detect-duplicates` (any minimal valid-JSON body) — expect 401/403
   family, never the TypeError 400.
2. Positive path (proves service-role acceptance end-to-end): sign in as `teacher@test.com` /
   `password123` via TEST auth REST, POST `process-submission` with
   `{"googleDocUrl":"https://docs.google.com/document/d/1i83PRk_zp0_-MC6Njb7TJePT0Aem0Cqdbcfeuuyhs5k/edit","submissionType":"new","originalLessonId":null}`
   (that's the prepared [WALKTHROUGH TEST] Garden Herb Butter Toasts doc).
   **Expect `success:true`** with a submissionId. Notes: TEST has no
   `GOOGLE_SERVICE_ACCOUNT_JSON`, so extracted content will be **canned mock lesson text — that
   is expected and fine** (the gate, not extraction fidelity, is under test). If
   `ANTHROPIC_API_KEY` is unset on TEST, auto-tagging is skipped with a console warn — also
   fine, not a STOP.
3. Confirm the row: `SELECT status, extracted_content IS NOT NULL FROM lesson_submissions WHERE
   id = '<returned submissionId>'` → `submitted`, `true`. Also confirm `detect-duplicates`
   logged 200 (not 400) in TEST edge logs.
4. **Clean up:** `DELETE FROM lesson_submissions WHERE id = '<returned submissionId>' AND
   extracted_content IS NOT NULL RETURNING id;` — copy the id verbatim from step 2's response,
   never retype from memory.

**After PROD approval + deploy:**
5. 3-signal PROD edge-deploy verification per the flakes playbook (workflow green + function
   `version` bump on all three via `mcp__supabase-remote__list_edge_functions` + gate probe).
6. Gate probe against PROD `extract-google-doc` (same 219-char garbage bearer) → **expect 401**.
   Do **NOT** create a real submission on PROD — the T2 walkthrough handles live validation.

## On success — tee up the T2 walkthrough (do all of this before ending your session)

1. **Tracker** (`docs/plans/2026-07-01-go-live-tracker.md`): T2a row → ✅ DONE with PR #,
   squash sha, and one line of gate evidence (TEST probe 401 + positive path green + PROD probe
   401). T2 row → **NEXT (unblocked)**. Update the "Last updated" line. Append a short
   "SHIPPED" line to the T2a track note. Commit these edits as part of the PR's final push if
   timing allows; otherwise leave them uncommitted per the no-docs-only-push rule.
2. **Memory**: update the go-live lines in `MEMORY.md` and `project_golive_sprint.md`
   (NEXT = T2 walkthrough with user, Fable session; T2a shipped w/ PR#). Also update the
   fix-brief pointer inside `project_supabase_edge_deno2_timingsafeequal.md` if the helper
   path changed (it shouldn't).
3. **End your report with this copy-paste kickoff prompt** for the user's next session (fill in
   the PR number and sha). The user will `/clear`, switch to `/model fable`, and paste it:

   > Context: ESYNYC go-live sprint — this is the T2 session: the submission→review→publish
   > walkthrough WITH me, live, right now. T2a (edge auth-gate fix) shipped as PR #___
   > (squash `___`) and is verified on TEST and PROD. Read
   > `docs/plans/2026-07-01-t2-walkthrough.md` first — it is the full script (stations, test
   > accounts, prepared Google Doc links, email inventory, known-broken list); sprint context
   > in `docs/plans/2026-07-01-go-live-tracker.md`. Start by (1) launching the local dev
   > server pointed at TEST exactly as the walkthrough doc's setup section says, (2) re-running
   > the one-line gate probe from the walkthrough doc to confirm the fix is still live on TEST,
   > then (3) tell me when to open my browser and guide me station by station. Plain language
   > throughout; capture my narration into the punch-list table and confirm the email
   > inventory rows as we hit them.

## STOP conditions

- The TypeError persists after a confirmed deploy (version bumped) on either project.
- The gate returns anything other than 401 for the garbage probe or the positive path fails
  for a reason other than the documented mock/tagging caveats.
- Any of the three functions starts failing at boot / 5xx-ing after deploy.
- E2E in CI fails in a way plausibly connected to these functions.

On any STOP: halt, write findings to a short handoff doc in `docs/plans/`, report back. Fable
adjudicates.
