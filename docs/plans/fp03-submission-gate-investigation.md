# FP-03 submission auth-gate investigation

Read-only characterization for a product-owner walkthrough handoff. No code changed.
Repo: `/Users/danfeder/cCode/esynyc-lessonsearch-v2`, branch `main`. PR #585 = `fix/fp03-authmodal-backdrop-and-resubmit`.

## TL;DR

The walkthrough script's "fill-first" premise (paste URL → click Submit → *then* sign-in pop-up → auto-submit)
describes the **pre-Phase-8b** SubmissionPage, which was a single monolithic form that rendered the Google-Doc
URL field to signed-out users. That flow was **removed** in commit `f218800` ("Phase 8b intent-first submitter
flow"), which rewrote SubmissionPage into a two-button intent chooser that gates on the *button click* — before any
URL field renders. That is why, on both live and #585's preview, clicking "Add a new lesson" pops the sign-in
modal immediately.

The FP-03 auto-submit machinery that #585 fixes now lives in `NewSubmissionForm` / `RevisingSubmissionForm`, not
in the chooser. Via the chooser it is **unreachable** (the page-level gate signs you in first). It is only reachable
if a signed-out user lands **directly** on `/submit/new` or `/submit/revising` (both are public, non-`ProtectedRoute`
routes) and submits from there.

---

## Q1 — What PR #585 changes for the FP-03 "submit-after-sign-in" behavior

PR #585 touches 3 files (2 new test files + 1 source change). The only source change is `AuthModal.tsx`:

- `src/components/Auth/AuthModal.tsx` (current `main` lines 63-64): on successful sign-in the old code ran
  `onSuccess?.(); onClose();`. #585 changes this to call **only `onSuccess()`** and drops the `onClose()`.
  It also makes `onSuccess` a **required** prop (was optional).
  (Second, unrelated change in the same PR: backdrop class `bg-black bg-opacity-50` → `bg-esy-ink/30`, the FP-04a
  scrim fix — not relevant to the gate question.)

The "pending submission" store and its trigger are NOT in the PR diff — they already exist on `main` in the two
form pages. #585 only unblocks them. The mechanism (in `NewSubmissionForm.tsx`, identical in
`RevisingSubmissionForm.tsx`):

- **Where the pending intent is stored:** a `useRef`, `pendingSubmitRef` — `NewSubmissionForm.tsx:37`
  (`RevisingSubmissionForm.tsx:41`). It is a boolean flag, not the URL itself; the URL stays in the
  `googleDocUrl` state.
- **How it is set:** `handleSubmit` — `NewSubmissionForm.tsx:54-60`: if `!user`, it sets
  `pendingSubmitRef.current = true` and opens the AuthModal, then returns without submitting.
- **What fires it after auth:** a `useEffect` keyed on `[user]` — `NewSubmissionForm.tsx:47-52`: when `user`
  becomes truthy and `pendingSubmitRef.current` is set, it clears the flag and calls
  `formRef.current?.requestSubmit()`, re-running `handleSubmit` (now with a user) to actually invoke
  `process-submission`.
- **Why #585 was needed:** AuthModal's success path previously called `onClose()`, and the form's
  `onClose` handler (`NewSubmissionForm.tsx:164-167`) clears `pendingSubmitRef.current = false`. So the ref was
  wiped before the `[user]` effect could flush → the promised auto-submit never fired. #585 stops AuthModal from
  calling `onClose()` on success, so the ref survives until the effect runs. (The form's `onSuccess` handler,
  `NewSubmissionForm.tsx:168`, only closes the modal; it does not clear the ref.)

## Q2 — Actual auth-gating on the submission flow (current `main`)

Entry point and gate ordering:

1. **"Submit Lesson"** nav link → `to="/submit"` — `src/components/Layout/Header.tsx:65-67`.
2. `/submit` → `SubmissionPage` — `src/App.tsx:107`. **Public route, no `ProtectedRoute` wrapper.**
3. SubmissionPage is the **new-vs-update chooser** — two buttons, "Add a new lesson…" and "Update a lesson…"
   (`src/pages/SubmissionPage.tsx:54-82`). Each button calls `handleIntent('new' | 'revising')`.
4. **The gate fires here, at intent-click, BEFORE any URL field:** `handleIntent` —
   `src/pages/SubmissionPage.tsx:27-34`: `if (!user) { setPendingIntent(intent); setShowAuthModal(true); return; }`.
   For a signed-out user it opens the AuthModal immediately and does **not** navigate to `/submit/new`.
5. On successful auth, `handleAuthSuccess` (`SubmissionPage.tsx:36-42`) closes the modal and *then*
   `navigate('/submit/' + pendingIntent)`. So the user only reaches the URL-field form **after** they are signed in.

So the gate that fires in the walkthrough is a **`useEffect`/handler guard inside SubmissionPage**
(`handleIntent`), NOT a `ProtectedRoute`. The URL field (`NewSubmissionForm.tsx:132-139`) lives on a different
route (`/submit/new`) that the signed-out user never reaches through the chooser.

Note: `/submit/new` and `/submit/revising` (`src/App.tsx:108-109`) are themselves **public, unwrapped routes** —
they render for signed-out users too. `NewSubmissionForm` carries its *own* second, independent auth gate in
`handleSubmit` (the `!user` branch at `NewSubmissionForm.tsx:56-60`) — this is the FP-03 machinery from Q1.

## Q3 — Is there a reachable path that creates a "pending submission"?

**Via the chooser (the walkthrough's assumed path): NO.** The SubmissionPage `handleIntent` gate
(`SubmissionPage.tsx:28`) intercepts the signed-out click and signs the user in *first*; by the time
`handleAuthSuccess` navigates to `/submit/new`, `user` is already set, so `NewSubmissionForm.handleSubmit`'s
`!user` branch (`NewSubmissionForm.tsx:56`) never runs and `pendingSubmitRef` is never set. The FP-03 auto-submit
is effectively **dead on this path**.

**Via direct/deep-link entry to the form route: YES.** Because `/submit/new` (and `/submit/revising`) are public,
non-`ProtectedRoute` routes (`App.tsx:108-109`), a signed-out user who reaches the form directly — typed URL,
bookmark, browser refresh while on that URL, an external deep link, or the in-page "Adding a new lesson · Change"
back-link area (`NewSubmissionForm.tsx:117-123`) — sees the URL field, can paste a URL and click **Submit**. That
hits `handleSubmit` → `!user` → sets `pendingSubmitRef.current = true` → opens AuthModal
(`NewSubmissionForm.tsx:56-59`). After sign-in, with #585's fix, the `[user]` effect
(`NewSubmissionForm.tsx:47-52`) fires the auto-submit. Exact reachable steps:
`navigate directly to /submit/new while signed out → paste Google Doc URL → click Submit → sign-in pop-up →
sign in → submission auto-fires`.

So the FP-03 fix is **not literally dead code** — it guards the direct-entry path — but it is **unreachable through
the primary chooser UI**, which is the path the walkthrough exercised.

## Q4 — Best characterization (with evidence)

**A fill-first flow existed and was removed; the script describes that removed flow. The pending-submit trigger
now lives in a different component reachable only via a different (direct-URL) entry.**

Evidence — the pre-Phase-8b `SubmissionPage` (commit before `f218800`) was genuinely fill-first:
- It rendered the Google-Doc URL `<input type="url">` inline on the page for everyone (old `SubmissionPage.tsx:123-126`).
- `handleSubmit` validated the URL, then `if (!user) { setShowAuthModal(true); return; }` (old
  `SubmissionPage.tsx:61-70`) — i.e., pop the modal *after* the user filled + clicked Submit.
- AuthModal `onSuccess` re-fired the submit: `if (googleDocUrl) { handleSubmit(...) }`
  (old `SubmissionPage.tsx:405-408`) — the original auto-submit-after-sign-in.

Commit `f218800` ("feat(submit): Phase 8b intent-first submitter flow") **rewrote** SubmissionPage
(429 lines removed) into the two-button chooser and **created** `NewSubmissionForm.tsx` (+152) and
`RevisingSubmissionForm.tsx` (+220). The commit message states: *"Rewrites SubmissionPage as a two-button intent
picker. Adds /submit/new (URL-paste only) and /submit/revising … routes."* The fill-first machinery
(`pendingSubmitRef` + `[user]` auto-submit effect) was carried over into the two new form components, but the
architecture in front of it changed from fill-first to **intent-first** with a page-level gate on the chooser
buttons. That page-level gate is what fires immediately in the walkthrough.

Supplementary note: the copy the script quotes — "sign in and we'll submit your lesson" — is **not literal UI text**.
A grep across `src/` finds no such string; it is the PR author's paraphrase of the mechanism in the #585 description.
There is no on-screen promise message in either the chooser or the form.

---

## File:line index

- `src/components/Layout/Header.tsx:65-67` — "Submit Lesson" nav link → `/submit`
- `src/App.tsx:107-109` — `/submit`, `/submit/new`, `/submit/revising` all **public** (no `ProtectedRoute`)
- `src/pages/SubmissionPage.tsx:27-34` — `handleIntent` page-level gate (the modal that fires immediately)
- `src/pages/SubmissionPage.tsx:36-42` — `handleAuthSuccess` navigates to the form only after sign-in
- `src/pages/NewSubmissionForm.tsx:37` — `pendingSubmitRef` (the stored intent)
- `src/pages/NewSubmissionForm.tsx:47-52` — `[user]` effect that auto-fires the submit
- `src/pages/NewSubmissionForm.tsx:54-60` — `handleSubmit` `!user` branch (sets the ref, opens modal)
- `src/pages/NewSubmissionForm.tsx:132-139` — the Google-Doc URL input (only on `/submit/new`)
- `src/pages/NewSubmissionForm.tsx:164-168` — AuthModal wiring: `onClose` clears the ref, `onSuccess` only closes
- `src/pages/RevisingSubmissionForm.tsx:41,52-54,64-66,234-237` — byte-identical FP-03 machinery
- `src/components/Auth/AuthModal.tsx:63-64` (main) — the `onSuccess?.(); onClose();` that #585 changes to `onSuccess()`
- Pre-Phase-8b `SubmissionPage.tsx:123-126, 61-70, 405-408` (via `git show f218800^:…`) — the removed fill-first flow
- `f218800` "feat(submit): Phase 8b intent-first submitter flow" — the rewrite that removed fill-first
