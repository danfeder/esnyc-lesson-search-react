# Go-Live Tracker

**Goal:** basic functionality solid and live for real users, minimum effort. This is the ONLY
tracking doc for the sprint — the 4-file scaffold is retired for this phase (see Working model).

**Last updated:** 2026-07-01 (Fable, T2 prep session) — **LAUNCH BLOCKER FOUND during T2
rehearsal:** the submission pipeline is dead on TEST **and PROD** (`crypto.subtle.timingSafeEqual`
removed by the hosted runtime's Deno 2 upgrade; every service-role internal call 400s at the auth
gate — submissions, duplicate detection, and ALL system emails). Verified by live probe on both
projects; zero user impact so far (no PROD submission attempts since 2025-09). Fix brief ready for
Opus: `docs/plans/2026-07-01-brief-edge-auth-gate-fix.md`. T2 walkthrough fully prepped
(`docs/plans/2026-07-01-t2-walkthrough.md` + two shared test Google Docs + TEST accounts verified)
but **blocked behind the fix**. Next = Opus executes the fix brief, then T2 walkthrough with user.

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
| T2 | Submission→review→publish walkthrough WITH user | user + any | **Prepped, BLOCKED behind T2a** — walkthrough doc + test docs + env ready (`2026-07-01-t2-walkthrough.md`); email inventory already drafted from code |
| T2a | Edge auth-gate fix (Deno 2 removed `timingSafeEqual`; submissions + all system emails dead on TEST+PROD) | Opus (brief ready) | **NEXT** — brief at `2026-07-01-brief-edge-auth-gate-fix.md`; edge-only change, 3 call sites + shared helper; pre-registered gates + STOPs |
| T3 | Auth email (invite/reset/login only) via Supabase Auth + Google Workspace SMTP — no DNS | Opus | Pending (Fable brief after T2; map custom email edge fns → retire what built-ins cover) |
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
- **T3**: email is auth-only (user 2026-07-01): invitations, password reset, account management.
  NO submission/review notification emails needed. Resend DNS unavailable for weeks →
  route Supabase Auth email through the org's Google Workspace (no DNS needed). Custom
  `send-email` / `password-reset` / `invitation-management` edge fns: retire whatever the
  platform built-ins cover (map first — invitations may carry roles). **Email map now exists:**
  full inventory (13 custom sends, 2 built-in paths, per-email works-today + needed-for-launch
  columns) in `2026-07-01-t2-walkthrough.md` §Email inventory. Notable: the custom
  `password-reset` request endpoint is orphaned (no frontend caller; live flow uses the
  built-in mailer) — prime retirement candidate.
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
