# rung8b — Submission forms hunt (round 2)

Surface: `src/pages/NewSubmissionForm.tsx`, `src/pages/RevisingSubmissionForm.tsx`, `src/pages/SubmissionPage.tsx` (post-#585 main)
Hunt: validation gaps, error swallowing, state races beyond the fixed pendingSubmitRef flow.
Excluded: tracker backlog, PRs #582–#595, rung8-*.md round-1 (checked `rung8-error-gaps.md` — it only verified these forms "set rendered error state via setError/parseDbError"; the findings below are different failure modes).
Status: COMPLETE — 4 findings + 1 informational.

## F1 (MEDIUM) — Both forms discard the edge function's real error message on any non-2xx response

- **Files:** `src/pages/NewSubmissionForm.tsx:74` + `:84`; `src/pages/RevisingSubmissionForm.tsx:90` + `:101`
- Both forms do `if (invokeError) throw invokeError;` → `setError(parseDbError(err))`. When `process-submission` returns non-2xx, supabase-js gives a `FunctionsHttpError` whose `.message` is the hardcoded string **"Edge Function returned a non-2xx status code"**; the actual JSON error body is only reachable via `await err.context.json()`, which nobody calls. `parseDbError` (`src/utils/errorHandling.ts:48-50`) has no `code` on this error type, so it falls through to `error.message` → the teacher sees the raw generic string.
- `process-submission` HAS non-2xx paths despite its deliberate `200 {success:false}` convention:
  - `supabase/functions/process-submission/index.ts:721-733` — top-level catch-all returns **400** with `{success:false, error: error.message}` (covers DB insert failures, extract-google-doc fetch throws, dup-detection throws, malformed body, etc.).
  - `supabase/functions/process-submission/index.ts:377-386` — "Original lesson not found: <id>" returns **400** (update flow, target lesson deleted/retired between pick and submit).
- **Failure scenario:** teacher submits an update; the target lesson was retired minutes earlier (or any unexpected server error fires). The edge function composes a precise, user-appropriate message ("Original lesson not found…" / real error.message) — the form shows only "Edge Function returned a non-2xx status code". Teacher has no idea whether to retry, re-share the doc, or re-pick the lesson; likely files a support ping to the 15-person team.
- **Fix shape:** in both catch blocks, special-case `FunctionsHttpError`: `const body = await err.context.json().catch(() => null); setError(body?.error ?? parseDbError(err))`. (Or flip the two 400s in the edge fn to the existing 200-convention — index.ts:185-186 comments already explain that convention exists exactly because of this supabase-js behavior.)

## F2 (LOW-MED) — getUser-resolution race: auth modal opens for an already-signed-in user, then auto-submit fires behind the still-open modal

- **Files:** `src/pages/NewSubmissionForm.tsx:39-52` (user hydration + resubmit effect), `:56-59` (auth-first gate), `:162-169` (modal); identical shape `src/pages/RevisingSubmissionForm.tsx:43-56`, `:64-67`, `:231-238`
- `user` starts `null` and only becomes truthy when `supabase.auth.getUser()` resolves (async, network round-trip). A signed-in teacher who pastes a URL (autofill/paste is fast) and hits Submit inside that window takes the `!user` branch: `pendingSubmitRef=true` + `setShowAuthModal(true)`. Moments later `getUser()` resolves → the `[user]` effect fires `requestSubmit()` → the submission runs **while the login modal is open showing a sign-in form to an already-authenticated user**. Nothing in that path ever sets `showAuthModal` false (only the modal's own onClose/onSuccess do, and neither fires — no SIGNED_IN event occurs).
- **Failure scenario A (confusing but recovers):** submit succeeds → component switches to the success branch (modal unmounts) — but the user just watched a login form flash while "logged in". **Failure scenario B (stuck):** submit fails (e.g. doc not shared) → form re-renders with `showAuthModal` still `true` → the error banner is hidden behind a login modal presented to a signed-in user; if they "helpfully" re-enter credentials, AuthModal's flow runs pointlessly; closing it also resets `pendingSubmitRef` (harmless) but nothing explains what happened.
- **Fix shape:** in the resubmit effect (`if (user && pendingSubmitRef.current)`) also call `setShowAuthModal(false)` before `requestSubmit()`. One line, both forms.

## F3 (LOW) — Submit failures logged at `logger.debug`: invisible in production telemetry

- **Files:** `src/pages/NewSubmissionForm.tsx:83`, `src/pages/RevisingSubmissionForm.tsx:100`
- The only record of a failed submission attempt on the client is `logger.debug('… submit failed:', err)`. Debug-level is suppressed in prod builds, so a spike of failures (edge fn regression, Google API outage) leaves zero console/Sentry trace — diagnosis depends entirely on a teacher screenshotting the banner. `src/pages/CLAUDE.md` handler pattern specifies `logger.error('Page action failed:', error)` for exactly this spot.
- **Failure scenario:** process-submission starts 400-ing after a deploy; teachers see the (generic, per F1) banner and give up; nothing appears in logs/Sentry; the team learns about it days later by word of mouth.

## F4 (LOW) — Google Doc URL validation is not host-anchored

- **Files:** `src/pages/NewSubmissionForm.tsx:61`, `src/pages/RevisingSubmissionForm.tsx:60` + `:73`
- Validation is `/\/document\/d\/([a-zA-Z0-9-_]+)/.test(googleDocUrl)` — any string containing that path fragment passes, e.g. `https://mycompany.sharepoint.com/document/d/notarealdoc` or a pasted sentence containing a docs path. The wrong-host URL sails past the only client check, gets stored as `google_doc_url`, and fails much later inside extract-google-doc with a lower-quality server-side message (and per F1, possibly a fully generic one), instead of the crisp immediate "Please paste a valid Google Doc URL."
- **Failure scenario:** teacher pastes a link copied from an intranet page that proxies/wraps a Google Doc (`https://sites.google.com/...` embed link or a redirector containing `/document/d/…`). Client says nothing; submission is created then errors downstream, leaving a dead `lesson_submissions` row and a confused teacher.
- **Fix shape:** anchor host: `/^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/`. (Keep in sync with what the edge fn's extractor expects.)

## F5 (INFO) — Success payload dereferenced unguarded

- **Files:** `src/pages/NewSubmissionForm.tsx:76-81`, `src/pages/RevisingSubmissionForm.tsx:92-98`
- `payload.submissionId` etc. assume `response.data` exists whenever `response.success` is true. Contract drift in the edge fn (success:true with missing/renamed `data`) → TypeError → caught → `parseDbError` shows "Cannot read properties of undefined…" to a teacher whose submission actually SUCCEEDED server-side (row created, dup detection ran) — they'd likely resubmit, creating a duplicate submission. Currently the contract holds (index.ts:705-719), so informational only.

## Checked, NOT findings
- `SubmissionPage.tsx` — clean: pendingIntent set/cleared symmetrically (`:27-42`, `:86-89`); no fetch beyond auth hydration; intent buttons work logged-out by design (auth deferred to submit).
- RevisingSubmissionForm `cantFind`/`selectedLesson` mutual exclusion — safe: LessonSearchPicker only renders the cant-find button in the unselected search branch (`LessonSearchPicker.tsx:134`, `:231`), and `onSelect` clears `cantFind` (`RevisingSubmissionForm.tsx:176-179`).
- Mid-submit lesson reselection — not a race: `handleSubmit` closure snapshots `selectedLesson`, so request body (`:86`) and success copy (`:97`) always agree.
- Session expiry mid-fill — gracefully handled: submit re-routes through the auth modal + pendingSubmitRef resubmit.
- `originalLessonId: null` with `submissionType:'update'` (cant-find path) — intended contract; edge fn's not-found check is guarded on the id being present, and reviewer-matches copy is accurate.
- Double-submit — blocked by `isSubmitting` disable in both forms.
