# Go-Live Tracker

**Goal:** basic functionality solid and live for real users, minimum effort. This is the ONLY
tracking doc for the sprint — the 4-file scaffold is retired for this phase (see Working model).

**Last updated:** 2026-07-02 (Fable, T3 merge + security-fix session). **#573 MERGED** (squash
`9a50dc6`) after Fable's own diff review; PROD edge deploy **user-approved** and 3-signal-verified
(invitation-management v26 + complete-review v9, shas match TEST bundles, bogus-token probe returns
the fixed 404). **RLS invitation-token fix = PR #574, TEST-VERIFIED, awaiting USER merge.** Branch
`fix/invitation-token-rls`, migration `20260702150000_lock_down_invitation_token_access.sql` (drop
enumeration SELECT policy + dead accept UPDATE policy; `validate_invitation_token` = sole
token-scoped anon read path, `SECURITY DEFINER` + `search_path=''` + tight grants + `NOTIFY pgrst`),
client swap in AcceptInvitation, AuthModal dead-signup deletion, invitation-management full
route-strip (F4), seeded RLS regression test. **Codex cross-check: no blocking findings** (its one
Low — missing pgrst notify — fixed). **TEST-DB verified live:** both target policies dropped, RPC
hardened, 3 anon probes pass (enumeration→`[]`, exact-token→1 row, bogus→`[]`). **3 claude bot
reviews, no blocking** — triaged all 4 surfaces; 2 real fixes applied (nullable `accepted_at` type,
anon-key env-check), rest rebutted. **Only red = cosmetic "Deploy to TEST — invitation-management"
no-op** (first #574 run deployed the route-strip live v9→v10; later non-edge commits re-deploy
identical v10 → strict guard no-ops; verified v10 ACTIVE w/ strip in deployed source; won't recur on
PROD, which holds pre-strip source). NEXT = **USER merges #574 → USER approves PROD migration → I
verify anon-can't-enumerate on PROD → Part 3c**. Deferred: accept E2E (→T3b/T5). `password-reset`
fn **deleted from BOTH TEST+PROD (user-approved), verified gone, deploy queue empty.** Process rules
(user, binding): **PROD applies are USER-only; self-review a diff before merge; verify Opus-handoff
claims before continuing.** No real invitations until the fix is on PROD. Prior update below.

**Prior update (2026-07-02, Opus, T3 execution session):** T2a (#571 `eeccedb`) + T2b (#572
`3a7d634`) shipped per project memory. **T3 built & merge-ready but NOT merged this session** — the
user handed the merge to a Fable session, bundled with a security fix that a Codex cross-check + the
PR review bots surfaced. PR **#573** (`feat/t3-auth-email`, tip `0427d73`): SMTP live from
`df@esynyc.org` (Gate 1 ✅), invite-accept verified end-to-end on TEST (Gate 3 ✅), all substantive CI
checks + all four review bots green; the only red is the two "Deploy to TEST" no-op-guard boxes
(cosmetic — an out-of-band pre-deploy froze the TEST version; the fix is verified live on TEST).
**Security STOP (fix needs a migration):** the public anon key can enumerate every *pending*
invitation token via an over-permissive RLS SELECT policy on `user_invitations`. Dormant now (0
pending on PROD) but T3 makes it live + load-bearing — invite becomes the *only* path to an account,
so token secrecy is now the whole security model. Full pickup doc:
`docs/plans/2026-07-02-t3-security-findings-handoff-for-fable.md`. **NEXT = Fable session: design +
ship the RLS fix → merge #573 → complete Part 3c go-live.** Part 3c (disable public signups + PROD
invite test) is deferred until the fix ships; no real invitations meanwhile.

**Prior update (2026-07-01, Fable, post-T2 brief session):** **both execution briefs written
and user decisions locked.** Sequencing ratified by user: quick-wins patch PR now (T2b), resubmit
button after T3 (T3b), rejection + dup-panel redesign into T4. Briefs:
`2026-07-01-brief-quickwins-patch.md` (T2b; user added the editable-title field to scope) and
`2026-07-01-brief-t3-auth-email.md` (T3). User decisions 2026-07-01: (1) AI pre-fills stay OFF
for launch (manual tagging; revisit post-launch); (2) editable Title field joins the quick-wins
PR alongside Summary; (3) auth emails send from `df@esynyc.org` via Google Workspace app
password; (4) site goes **INVITE-ONLY** (public self-signup disabled — T3 rewires invitation
acceptance off public signUp first, since `AcceptInvitation.tsx` currently uses it). Code-map
corrections vs earlier suspicions: decision-email root cause is `lesson_submissions` having **NO
FK to `user_profiles` at all** (all three FKs → auth.users; embed can't resolve; T3 confirms by
probe then retires the block); the required-tags gate is frontend-only (complete-review's schema
is already all-optional — no edge relax needed); BUT the title fix needs a small migration
(`complete_review_atomic` COALESCE order prefers `extracted_title` over reviewer edits, 2 spots).
NEXT = **T2b quick-wins execution (Opus, brief ready)**. Previous update (T2 walkthrough) below.

**2026-07-01 (Fable, T2 walkthrough session with user)** — **T2 COMPLETE.** All 10
stations run live; pipeline verified door-to-door on TEST (submit → dup-detect → review →
revisions → approve → publish → public search — first full run since the Deno-2 outage).
Punch-list fully populated in `2026-07-01-t2-walkthrough.md` (22 rows: 3 blockers, 5 bad).
Email inventory rows 2/4/5/7 confirmed live; **row 5 (invitations) = T3 centerpiece: attempt now
reaches Resend post-T2a but sandbox sender rejects all non-owner recipients (500) AND the invite
UI shows a success toast unconditionally with no copyable-link fallback.** New T3 scope inputs:
the complete-review decision-email attempt vanishes without any send-email invocation logged
(fail-open catch swallows pre-send — investigate); forgot-password reached Supabase's built-in
mailer and honestly errored on the fake domain (`email_address_invalid`) — real addresses would
send. TEST cleaned & verified row-by-row (763 lessons, byte-identical state). **PROD real run also
done same night** (user approved the script's optional offer): real extraction ✓ (title = Drive
filename incl. `[WALKTHROUGH TEST]` prefix, published verbatim — live proof of the
title-uneditable finding); dedup happy path ✓ (0 candidates on an original, correct); **AI
pre-fills NEVER CONFIGURED anywhere — no `ANTHROPIC_API_KEY` in PROD secrets, 0/128 historical
submissions ever AI-drafted** (decide at T3/T5: add key or accept manual); **decision-email
vanish REPRODUCED on PROD → code bug, not env** (prime suspect: Phase-7c `user_profiles!inner`
embed ambiguous across ≥3 FKs → PostgREST error swallowed by fail-open catch — T3 confirm &
fix-or-retire); blank-summary confirmed with real content. PROD cleaned & verified (785
lessons, 0 walkthrough artifacts). Punch-list sequencing recommendation (pending user
ratification): quick-wins patch PR now (tag-gate blocker + toasts/titles/sticky-pane/copy/
summary-field/`/login` dead button), resubmit-button PR after T3, rejection + dup-panel redesign
folded into T4 (dup panel logged as **conceptually overloaded** — binding T4 design requirement:
one plain question, evidence beneath). Next = **T3 (Fable brief first, then Opus)**.

## Working model (binding for every session in this sprint)

- **Fable** (scarce — ration hard): design decisions, briefs, adjudication, anything surprising.
- **Opus**: executes Fable-written briefs. The brief tells you exactly what to build, how to
  verify, and when to STOP. Do not redesign, do not expand scope, do not improvise around a
  failed assumption — halt and report back instead. Code-writing + gate-running only.
- **Sonnet**: bulk/mechanical sweeps (e.g., dedup candidate generation).
- **User** is the product owner and a primary reviewer-user; plain language in anything
  user-facing; user adjudicates all data deletions/merges.
- Per-track record = the brief + the PR description + a status line here. No per-track
  design/kickoff/status scaffolds, with ONE exception: T4 dedup (data mutation) gets a slim
  design-decisions doc + status doc.
- Data-safety discipline is NOT ceremony and stays: rehearse on TEST, snapshot before bulk
  mutation, smallest batch first, `npm run check` before any push, TEST-DB MCP verify for any
  migration PR (re-run after each DB-affecting fix-up round).
- **Session-end protocol (every session, every model):** (1) update your track's status line
  AND the "Last updated" line in this doc; (2) look at the Tracks table and end your report to
  the user with one sentence naming the next track, which model to run it on, and whether a
  Fable brief must be written first (if the next track's status says "Fable brief after …" or
  "Fable design", the next step is a Fable session, not execution); (3) if a STOP condition
  fired or anything genuinely surprised you, the next step is Fable adjudication — say so
  explicitly instead of naming the next track.

## Tracks

| # | Track | Model | Status |
|---|---|---|---|
| T1 | Search: `taste test` fix, then search CLOSES | Opus | **✅ DONE — shipped PR #570 (`d66dcdc`), PROD-verified 2026-07-01: `taste test` top-10 = 10/10 relevant (was ~1/10), q18 1/10→10/10. SEARCH TRACK CLOSED.** |
| T2 | Submission→review→publish walkthrough WITH user | user + any | **✅ DONE 2026-07-01 (Fable, live with user)** — all 10 stations; pipeline verified door-to-door on TEST (first full post-outage run); punch-list = 22 rows (3 blockers: revisions-blocked-by-tag-gate, no-resubmit-path, rejection dead-end; 5 bad incl. dup/decision disconnect, blank summaries, uneditable filename titles); email inventory rows 2/4/5/7 confirmed live; TEST cleaned & verified (763 lessons). Full detail + punch-list in `2026-07-01-t2-walkthrough.md` |
| T2a | Edge auth-gate fix (Deno 2 removed `timingSafeEqual`; submissions + all system emails dead on TEST+PROD) | Opus | **✅ DONE & PROD-VERIFIED — shipped PR #571 → squash `eeccedb`; all 6 gates green (4 TEST + 2 PROD), bot clean approve. Submission pipeline + email gate alive again on PROD.** brief at `2026-07-01-brief-edge-auth-gate-fix.md` |
| T2b | Quick-wins patch PR (punch-list bucket 1: gate scoping, decision toasts, card titles, sticky pane, title+summary fields incl. RPC COALESCE-flip migration, sign-in clear, /login fix, copy + error propagation) | Opus | **NEXT — brief ready:** `2026-07-01-brief-quickwins-patch.md`. Carries the uncommitted sprint docs. |
| T3 | Auth email (invite/reset only) via Google Workspace SMTP; invite-only signup; custom-email retirements | Opus → **Fable** (merge + security fix) | **✅ MERGED + PROD-VERIFIED 2026-07-02** (squash `9a50dc6`; user approved the PROD edge deploy; 3-signal verify + bogus-token probe passed). **RLS token-enumeration fix in flight:** branch `fix/invitation-token-rls` (migration + RPC-only anon read path + AuthModal dead-signup deletion + F4 route-strip + seeded RLS regression test); local gates green; Codex cross-check → PR → TEST verify → user merges → user approves PROD migration → then Part 3c. NO real invitations until the fix is on PROD. Residual: deployed-but-retired `password-reset` fn deletion (user OK pending); accept-flow E2E deferred to T3b/T5. |
| T3b | Resubmit-after-revisions button (punch-list bucket 2; user-designed re-snapshot flow) | Opus | Pending — Fable brief after T3 (design already sketched in punch-list row 7) |
| T4 | Corpus dedup sweep (~745 lessons) | Fable design → Sonnet candidates → user adjudicates → Opus ships | Pending (design session = 2nd of 2 planned Fable sessions) |
| T5 | Final smoke (public search incl. mobile + submission flow) → LAUNCH | any | Pending |

## Track notes

- **T1**: root cause diagnosed 2026-07-01 (Fable, live PROD probes): strict-AND (`'tast' & 'test'`)
  excludes genuine tasting lessons that never say "test"; the 32 survivors are casual
  "do a taste test" mentions (bean dip, hummus) + academic "test" lessons. Relax correctly
  doesn't fire (32 ≥ 10). **v1 fix (oneway synonym `test → taste`) DISPROVEN on TEST** —
  absorption collapse (`'tast' & ('tast'|'test')` ≡ `'tast'`, 501 rows, q18 2/10); executor
  halted per STOP, handoff at `docs/plans/2026-07-01-t1-redesign-handoff-for-fable.md`.
  **v2 fix (Fable redesign, 2026-07-01): collocation carve-out** — the expander maps the exact
  bigram `taste test(s)` to the weight-restricted tsquery `'tast':AB` (title/summary tier only),
  one CREATE OR REPLACE migration, blast radius = that one query string by construction.
  Fully rehearsed on TEST including a real eval run: q18 1/10 → **10/10** (gate ≥7), total 32 → 51
  (strict subset of the 53-lesson tasting pool), pass-rate 14/21 → 15/21, scorecard diff exactly
  2 lines, all other rows byte-identical; TEST restored after. The T1 PR also carries the
  outstanding uncommitted docs: this tracker, both briefs, the handoff doc, the Wave-6
  status-doc post-merge edit, and `docs/plans/2026-06-29-c42-search-engine-options-notes.md`.
  **SHIPPED 2026-07-01 (Opus): PR #570 → squash `d66dcdc`, migration applied to PROD.** CI-applied
  TEST reproduced the committed scorecard byte-identical; bot triage clean (claude-database-review
  no findings; the one `claude` review = "no blocking issues", 4 non-blocking observations all
  rebutted as out-of-scope/not-a-regression). **PROD verification:** `expand_search_with_synonyms
  ('taste test')` = `'tast':AB`, total_count 52 (PROD corpus vs TEST 51), top-10 = **10/10**
  `is_tasting` (exactly the predicted set: Tastes Around the World, Eat the Rainbow, Colonial Foods
  of NY, A Fruit Is A Suitcase For Seeds, All About Corn, Plant Parts, Stems, The Garden in the
  Winter, 5th grade December #2, Food Geography - Pizza). **Search track CLOSED.** These tracker
  edits are uncommitted post-merge — they ride the next docs-carrying PR (T3/T4).
- **T2**: user narrates pain points as teacher + reviewer; also log every email the flow tries
  to send. User dislikes the current flow — their punch-list decides patch-vs-reshape. Rejected-
  teacher path is a known blind spot to walk explicitly. **Prep session 2026-07-01 (Fable):**
  full flow mapped from code; email inventory drafted (13 custom sends + 2 built-in paths, all
  currently broken in ≥1 of 3 stacked layers); walkthrough runs on local dev server pointed at
  TEST (real corpus + functions, no PROD risk); two shared test Google Docs prepared (original +
  near-duplicate of Kimbap for dup-detection theater); teacher/reviewer/admin@test.com verified.
  Known limitation: TEST lacks `GOOGLE_SERVICE_ACCOUNT_JSON` → extraction returns mock content
  (flow mechanics real, doc text canned); optional single PROD run at the end if user wants
  full realism.
- **T2a (blocker, found 2026-07-01)**: hosted edge runtime upgraded to Deno 2, which removed the
  non-standard `crypto.subtle.timingSafeEqual`; the service-role auth gate in extract-google-doc
  / detect-duplicates / send-email throws → 400, but ONLY for bearer tokens whose length equals
  the service key's — i.e. exactly the legitimate internal calls, while user-JWT calls
  short-circuit and work, which is why nothing looked wrong. Confirmed by length-probe on both
  TEST and PROD (`"crypto.subtle.timingSafeEqual is not a function"`). Consequences: submissions
  fatal-fail at extraction; dup detection silently skipped; ALL system emails die before Resend
  (a third breakage layer under the sandbox-sender and no-DNS layers). No PROD submission
  attempts since 2025-09 → no user damage. Fix = shared XOR-fold `timingSafeEqual` helper + 3
  call-site swaps + CLAUDE.md pattern update; carries the uncommitted sprint docs. E2E note: CI
  E2E passed throughout because user-JWT paths work — the breakage was invisible to every
  existing check.
  **SHIPPED 2026-07-01 (Opus): PR #571 `fix/edge-auth-gate-deno2`.** Also added a colocated unit
  test for the helper (`_shared/timing-safe-equal.test.ts`, 5 cases) per the bot review's one
  non-blocking suggestion. All four pre-registered TEST gates passed: (1) garbage 219-char bearer
  probe → **401** (not the 400 TypeError) on extract-google-doc / send-email / detect-duplicates;
  (2) positive path as `teacher@test.com` → `success:true` (submissionId, `duplicatesFound:0`);
  (3) row `submitted` + `extracted_content` present, and TEST edge logs show the internal
  service-bearer calls to `extract-google-doc` (v11) + `detect-duplicates` (v9) both returning
  **200** (v10 previously logged the 400 TypeError — confirms the deploy advanced the bundle, not
  a silent no-op); (4) test row deleted. `send-email` bundle sha changed (v13→v14). Full PR CI
  green incl. E2E; claude bot review = clean approve (verified no 4th call site, no timing
  side-channel, imports resolve). **Merged as squash `eeccedb`; PROD deploy approved + succeeded
  2026-07-01.** PROD gates 5–6 passed: all three fns version-bumped (extract-google-doc 29→30,
  detect-duplicates 25→26, send-email 31→32) with `ezbr_sha256` matching the TEST-verified
  bundles exactly (`cb0409d3`/`1b294ff6`/`32e1d570`) → not a silent no-op; garbage 219-char bearer
  probe → **401** on all three (was the 400 TypeError). Did NOT create a real PROD submission (T2
  handles live validation). These PROD-verified tracker edits are uncommitted post-merge — they
  ride the next docs-carrying PR (T3/T4). **Non-blocking follow-up for a future hardening pass
  (from bot review, out-of-scope here):** `process-submission/index.ts:134` gates its service-role
  check with a plain `token === supabaseServiceKey` (not constant-time) — pre-existing, unaffected
  by Deno 2, low severity for an internal high-entropy key; candidate to migrate onto the shared
  `timingSafeEqual` helper later.
- **T3**: email is auth-only (user 2026-07-01): invitations, password reset, account management.
  NO submission/review notification emails needed. Resend DNS unavailable for weeks →
  route Supabase Auth email through the org's Google Workspace (no DNS needed). Custom
  `send-email` / `password-reset` / `invitation-management` edge fns: retire whatever the
  platform built-ins cover (map first — invitations may carry roles). **Email map now exists:**
  full inventory (13 custom sends, 2 built-in paths, per-email works-today + needed-for-launch
  columns) in `2026-07-01-t2-walkthrough.md` §Email inventory. Notable: the custom
  `password-reset` request endpoint is orphaned (no frontend caller; live flow uses the
  built-in mailer) — prime retirement candidate.
  **Brief written 2026-07-01 (`2026-07-01-brief-t3-auth-email.md`); architecture decided:**
  reset = built-in mailer + Workspace SMTP (config only); invitations KEEP the custom
  `user_invitations` system (no migration to `auth.admin.inviteUserByEmail`) with honest
  email-outcome UI + always-visible copyable invite link; invite-only = rewire
  `AcceptInvitation.tsx` onto the already-built (never wired) admin-API accept endpoint in
  `invitation-management`, THEN disable signups in the dashboard — order matters, the page
  currently creates accounts via public `signUp`. Decision-email root cause CORRECTED:
  `lesson_submissions` has no FK to `user_profiles` at all (all three FKs → `auth.users`), so
  the `user_profiles!inner(email)` embed at `complete-review/index.ts:257` can never resolve —
  brief pre-registers a confirm probe, then retires the block. Dispositions: rows 1–3 retire,
  row 6 retire, row 8 retire + delete the whole `password-reset` fn, rows 9–10 left dormant,
  row 11 mooted by invite-only.
- **T4**: use simple text-similarity (pg_trgm) for candidates; **retire the embedding machinery,
  don't repair it** (two mismatched pipelines). Companion lessons (Part 1/Part 2) need a
  "related, not duplicate" outcome. Pre-delete FK checklist applies (see memory:
  data-mutation gotchas). Known dup evidence: Black Bean Dip ×2, Hummus ×2, School and Garden
  Communities ×2 in one top-10.

## Explicitly NOT doing (pre-launch)

- Resend / esynyc.org DNS (someday-list; revisit only if Google-route fails)
- C42 engine spike (PR C), C162 unaccent, WHERE-DRY refactor, semantic search tier
- eslint-10 / TypeScript-6 major bumps (#460/#451), W7 tech-debt
- Overengineering hunts / simplification sweeps not in the path of T1–T5
- Embeddings regeneration (C2.4) — unnecessary if T4 retires embedding-based dedup
- Any personalization / auth-gated features (audience ≈ 3 internal accounts)
- AI pre-fill tagging (`ANTHROPIC_API_KEY`) — user decision 2026-07-01: launch manual-only;
  revisit post-launch if tagging feels slow (feature is built, never configured anywhere)
