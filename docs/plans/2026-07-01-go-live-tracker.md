# Go-Live Tracker

**Goal:** basic functionality solid and live for real users, minimum effort. This is the ONLY
tracking doc for the sprint — the 4-file scaffold is retired for this phase (see Working model).

**Last updated:** 2026-07-03 (Fable, **t4b ✅ SHIPPED + PROD-VERIFIED — T4 IS CLOSED**). Merged
#578 (squash `9e0cc4e`, user-authorized); user approved both PROD gates (`migrate-production` run
28634657192 + Deploy Edge Functions, both `success`). **Post-apply PROD verify ALL GREEN (posted
to #578):** both migrations recorded; RPC + archive fn ACLs `{postgres,service_role}` (anon denied
via `has_function_privilege`); casefold live; retired-exclusion bait probe vs PROD's 61 retired
rows clean (0 retired candidates, no self-match, twin top 0.891); live corpus untouched at 703;
**3-signal edge verify: detect-duplicates v27 / process-submission v37→v38 / complete-review v10 —
all fresh, all shas BYTE-EXACT vs the TEST-verified bundles** (`aaba1497…`/`f4aa4396…`/`1e37ffac…`);
no-auth probe → 401. Reviewer flow now runs D7 against hash-honest pg_trgm detection (retired
lessons excluded, permanent CI guardrail); embedding pipeline retired end-to-end; admin Duplicates
pages + browser-reachable hard-delete gone. **NEXT = T5 smoke + launch** (residuals for T5: browser-
click the resubmit button + the new decision screen; the 3 deferred t4b follow-ups listed below are
post-launch). Prior update below.

**Prior update (2026-07-03, Fable, t4b BUILT — PR open, Opus first cut salvaged + completed
by Fable).** Opus's t4b session drifted mid-flight (user stopped it); Fable audited the working
tree — verdict: on-brief and worth salvaging (nothing pushed, no DB/edge touched; snapshot commit
`695e0bb` preserves the as-found state). Kept: migration (RPC + revoke), both edge-fn rewrites,
§C panel reshape, §D rejected badge, §E page removals. Fable completed: D7 publish-guard wiring in
ReviewDetail (was the one TS error), **complete-review embedding-block removal** (brief gap — the
Phase-4 block called OpenAI on every approve_update and on NULL-embedding approve_new; post-t4b
every new submission is NULL → publish would depend on OpenAI and 500 without the key; publishing
must not touch OpenAI), embedding stragglers (`useReviewSubmission` select/type,
`duplicateDetection.ts` orphan), MANAGE_DUPLICATES full removal (enum + role map + gating lists +
invite-UI previews), migration ACL-comment correction (live proacl has PUBLIC **and** explicit
anon/authenticated grants — both revokes load-bearing; verified TEST+PROD), aria-label fix, all
tests (12 relabeled + 3 new: guard-cancel / option-3 wiring / reject-requires-reason + new
IntDuplicateCard label-map suite). Gates: check ✅, tests 1958/1958 ✅, db reset ✅, test:rls 6/8
(2 pre-existing service-role validation failures, unchanged, grants-unrelated), local RPC+ACL
probes ✅. **TEST verification COMPLETE (2 DB rounds, queries+raw results on the PR):** migrations
`20260703000000`+`010000` recorded; ACLs `{postgres,service_role}` both fns; retired-exclusion
live-fire (bait = retired Aloo Gobi's own text → 0 retired in results, no self-match, twin top at
0.891); live edge smoke on v10 (near-copy → `hashMatch:false`/`medium`, NO false `exact`; score
math exact; artifacts cleaned, baseline 130/763/685 restored). **3 bot review rounds CONVERGED**
(R1 stale-note-on-leave + RPC casefold → fixed `e6d63fd` + migration `010000`; R2 stale-note-on-
card-switch → fixed `856fcd6` generalized to the search-repick variant; R3 = convergence, no new
bugs) + 2 permanent RLS-scenario guardrails added (anon-cannot-call RPC; RPC-never-returns-retired
— live-fire on TEST data every CI run). The 3 red "Deploy to TEST" checks are the documented
COSMETIC no-op (byte-identical bundles, shas verified — T3b pattern; PROD deploy on merge advances
genuinely). **Deferred follow-ups (post-launch list):** (1) `complete_review_atomic` guard/revive
semantics for approve_update-into-retired-target (Codex; pre-existing, narrowed by t4b); (2) GIN
trgm index for the RPC if corpus grows — note it must be a `lower()` expression index or a
`%`-operator rewrite (existing `idx_lessons_title_trgm` is raw-`title`, unusable by this query);
(3) delete `similarity.test.ts`'s dead title-similarity block + extract detect-duplicates
scoring/buckets into a pure fn with a unit suite. NEXT: 🔴 **USER merge #578 + PROD gates**
(migration approval + edge deploy — a PROD deploy no-op would be REAL, unlike TEST) → 3-signal
PROD verify → **T5**. Prior update below.

**Prior update (2026-07-03, Fable, t4c ✅ SHIPPED + PROD-VERIFIED — the dedup data track is
DONE).** Pre-merge review APPROVED with no changes (detail below), then on user authorization:
merged #577 (squash `badaadf`, 00:12Z) after a final PROD drift probe (still 764 / 61 live / 0
retired); user approved `migrate-production` run 28629708389 → `success` (00:17Z). **Post-apply
PROD verify ALL GREEN (queries + raw results posted to PR #577):** live **703** exactly (764−61);
all 61 targets `dedup:%`-retired; `t4_dedup_retire_rollback` = 61 rows, all-NULL prior state; 0
dedup-retired rows outside the snapshot (no survivor touched); PROD `schema_migrations` records the
wrapped BEGIN→LOCK→…→COMMIT sequence; fattoush search returns both kept survivors + neither stub;
retired stub still linkable via `lessons_with_metadata` (`dedup:fattoush-8c6942`). Recovery
artifacts in place (snapshot table + `.sql.rollback`); post-launch cleanup migration drops the
snapshot table once PROD-stable. Review-session detail:
Independent re-verification of PR #577, all green: generator output byte-identical to the committed
migration; decisions.json integrity holds (61 unique retired / 250 unique survivors / 0 overlap /
57 groups); the migration wraps every mutating statement in one `BEGIN` → `LOCK TABLE lessons
SHARE ROW EXCLUSIVE` → … → `COMMIT` transaction with sound guards (compile-time 61-distinct,
already-retired pre-guard, post-asserts incl. zero-survivor check). **Definitive wrapper proof:
TEST's `supabase_migrations.schema_migrations` row for `20260702160000` records the applied
statement sequence BEGIN → LOCK → snapshot → guards → UPDATE → asserts → COMMIT** — the wrapped
file is what ran on TEST, not workflow-log inference. TEST re-probed: 685 live / 57 dedup-retired /
snapshot 57 / 0 dedup-retired outside snapshot / fattoush search 3 results 0 retired. PROD re-probed
read-only: 764 live / all 61 present+live / 0 already retired / no rollback table — **STOP condition
clear**. Rulings on the handoff's open questions: (1) atomicity fix correct and complete; (2) the
reversible TEST re-validation surgery was the right call (TEST-only, reversible, left TEST in the
correct final state, and bought real evidence the wrapped file applies cleanly against real data);
(3) Codex #2 (snapshot-pollution) and #3 (present-in-this-db vs exact-61) rebuttals are sound — no
snapshot-empty assert or PROD-only exact-61 guard requested (the design was pre-decided in the
brief; the mandated post-apply live=703 check covers the residual risk). `.sql.rollback` verified:
restores prior state from the snapshot for exactly the 61 ids, idempotent, safe on an
already-applied DB. NEXT = **t4b** review-screen reshape + detection rewrite (Opus, brief ready) →
**T5** smoke + launch. Prior update below.

**Prior update (2026-07-02, Opus, t4c retire migration — PR #577 OPEN, reviewed).** Branch
`feat/t4c-dedup-retire`: migration `20260702160000_t4_dedup_retire.sql` (+`.sql.rollback`)
soft-retires the 61 approved duplicates (D5 snapshot-table pattern, never DELETE), generated
byte-deterministically from decisions.json by the committed
`scripts/dedup-sweep/generate-retire-migration.mjs` (no hand-typed ids). Local gates green;
**TEST verified: 57 retired, snapshot 57, 0 survivors, search excludes retired (685 live) —
matched the pre-registered 57.** CI all-green; both claude bots reviewed. **Atomicity fix
(claude[bot] HIGH, corroborated by a Codex cross-check):** this repo's `supabase db push` is
autocommit ([[project_supabase_migration_autocommit]]) so the guarded migration needed an
explicit `BEGIN;`/`COMMIT;` + `LOCK TABLE lessons SHARE ROW EXCLUSIVE` (c02 precedent) or a
failing post-assert couldn't roll back the write — added + validated locally. TEST validated
the unwrapped run's data-logic (identical); the wrapper is c02-PROD-proven + local-fresh-apply
(full TEST re-run available on request before the PROD gate). Rollback hardened to the 61 ids.
PROD re-probe: 764/61-present-live/0-retired → **703** expected. NEXT = 🔴 **USER-only** merge +
PROD gate → read-only PROD verify per the brief. **t4b** parallel-ok → **T5** launch. Prior
update below.

**Prior update (2026-07-02, Fable + user, T4 live walkthrough — 3rd authorized Fable
session). WALKTHROUGH DONE — all 113 dedup groups adjudicated with the user; 61 lessons
approved for retirement (live corpus 764→703 expected).** Artifact:
`docs/plans/t4-dedup/decisions.json` (verdicts: retire_duplicate 39 · keep_family 72 ·
unrelated 2; 250 named survivors; every lesson_id pulled verbatim from candidates.json via
`scripts/dedup-sweep/record-decisions.mjs`, checkpointed after every batch). **Load-bearing
mid-session discovery:** many "duplicate pairs" are two DB entries pointing at ONE Google Doc
(the Sept-2025 import re-ingested existing docs) — the `file_link` doc-ID cross-check
confirmed most Tier-A/B retires, dissolved 3 of the 7 "please confirm" flags + both
Decomposition pairs, and flipped 3 deck keep-both verdicts to retire-one (Plants and Music,
BCCS Empanadas, Street Vendors). User overrode the AI keeper-pick on 4 sets and kept the
Three Sisters Soup pair as a grade-band family (all overrides noted in decisions.json).
All 61 retire IDs pre-validated on PROD read-only (all exist, all live, none already
retired). **t4c brief written** (`2026-07-02-brief-t4c-retire-migration.md`): soft-retire
migration per D5, rollback snapshot table, TEST rehearsal, 3-signal verification, **PROD
gate = USER-only**. NEXT = **t4c (Opus, brief ready)**; t4b parallel-ok (Opus). Prior update
below.

**Prior update (2026-07-02, Opus, t4a sweep execution). T4a DONE — the dedup evidence
deck is built and ready for the Fable+user walkthrough.** Branch `feat/t4a-dedup-sweep` — **PR
#576 MERGED (squash `f6513c1`) 2026-07-02 after Fable diff review + user authorization; no PROD
gates fired (docs + read-only scripts only). Everything below is on `main`.** Read-only sweep pipeline at `scripts/dedup-sweep/`
(export → candidates → Sonnet-4.6 fan-out → deck; **zero DB writes**, live PROD read via anon
key). Outputs in `docs/plans/t4-dedup/`: **`candidates.json`** = 113 deterministic groups (Tier
**A=21 · B=41 · C=51**), every pre-registered calibration gate green (764 live rows, 46
same-title groups/96 rows, 1 hash pair, all 8 named-pair tiers hold, TS trigram matches SQL
pg_trgm ≤0.001, byte-identical re-run); **`deck.json` + `deck.md`** = one Sonnet-4.6 verdict per
group (model pinned `claude-sonnet-4-6`, pin asserted; 113/113 agents, 0 schema failures) —
tally **retire_duplicate 37 · keep_family 74 · unrelated 2**. **7 Tier-C groups flagged "please
confirm"** (AI says same lesson but <75% wording overlap = the "one copy is a fuller/table
import" pattern; per-brief re-run-once done, 1 of 8 flipped, 7 persist and are surfaced — not
auto-shipped, not overridden; decision is the user's). Mixed groups (a true-copy pair inside a
real family — Fattoush, Sun Printing, 3-Sisters-Tacos) come out keep_family with the copy-pair
named in the text (the single-verdict schema can't retire a subset). `npm run check` +
`test:run` (2059/2059) green; 5-group content spot-check all correct. NEXT = **Fable walkthrough
with the user** (read `docs/plans/t4-dedup/deck.md`, fill `decisions.json`, then write the t4c
retire-migration brief); t4b may run parallel (Opus). Prior update below.

**Prior update (2026-07-02, Fable, T4 dedup design session — the 2nd planned Fable
session). T4 DESIGN COMPLETE** — all decisions locked live with the user; design doc
`2026-07-02-t4-dedup-design-decisions.md` (D1–D12) + status doc `2026-07-02-t4-status.md` +
two Opus briefs written (`…-brief-t4a-candidate-sweep.md`, `…-brief-t4b-review-reshape.md`).
Key recon (PROD, read-only): live corpus 764; **46 same-title groups / ~50 excess copies**;
1 hash-identical pair; content trigram sim cleanly separates copies (≥0.92) from families
(≤0.75); pg_trgm installed; soft-retire mechanism already proven (21 May-retired imports —
that deferred deletion track is ALREADY DONE, nothing to fold in); Aug-2025 dedup pass left
86 resolutions + a live-routed admin Duplicates page whose "archive" **hard-deletes while
claiming soft-delete** → page removed + RPC revoked in t4b. User decisions: dup-clean now,
families project post-sprint (family labels recorded during the same review — no second
pass); adjudication = **live walkthrough, Fable-run (authorized 3rd Fable session)**;
review screen = one-decision-list shape; Sonnet fan-out **pinned to Sonnet 4.6** (not
Sonnet 5). Reject path verified already-supported server-side (frontend wiring only).
These docs ride the t4a PR. NEXT = **t4a sweep execution (Opus, brief ready)**; t4b may run
parallel (Opus); then Fable walkthrough with user → t4c retire migration → T5. Prior update
below.

**Prior update (2026-07-02, Fable, T3b adjudication + merge session).** **T3b ✅ SHIPPED +
PROD-VERIFIED — PR #575 merged (squash `03ebe4b`)** after Fable's own diff review. All four
review-round additions beyond the brief's literal text were adjudicated and APPROVED as
correctness hardenings (CAS on the flip UPDATE; nulling content-derived
embedding/hash/ai_draft in the flip — fixes a real gap in the brief; retired-original-lesson
re-check for update-type resubmits; per-card in-flight `Set`). Independently re-verified
before recommending: TEST fn v20 sha `a7fce21d…` + baseline 763/113/17/0 + 0 orphans (own
probes); the one red check traced commit-by-commit as the known cosmetic no-op (R3 `760e2e5`
deploy SUCCEEDED → v20 at 17:20Z; final commit `93ad106` frontend-only → pre=20/post=20).
User approved the PROD edge gate; **3-signal PROD verify GREEN: `process-submission`
v36→v37 (18:02Z, right after the 17:58Z merge), `ezbr_sha256` = the TEST-verified
`a7fce21d…` byte-exact, negative probes (no-auth → 400 "No authorization header"; anon
`resubmit:true` bogus-id → 400 "Unauthorized") — new bundle live, no PROD data touched.**
Residual: the UI button click itself still not browser-smoked → folds into T5's final smoke.
NEXT = **T4 dedup design (Fable session, the 2nd of 2 planned)** → T5 launch. Prior update
below.

**Prior update (2026-07-02, Fable, T3b brief session):** **T3b brief ready:**
`2026-07-02-brief-t3b-resubmit.md` — resubmit = a `resubmit` mode in `process-submission`
(re-extract the same row, flip needs_revision→submitted + null `revision_requested_reason`
only after a successful re-snapshot, DELETE stale `submission_similarities` before the dedup
re-run — insert-only + no unique constraint, verified) + an instructions-and-button block in
the My-submissions revision callout. **No migration needed** (column inventory + status CHECK
probed on TEST; teacher RLS stays read-only — writes go through the edge fn's service client
behind ownership/status gates, returned as 200 `success:false` plain-language errors).
Tag+feedback preservation is free — the `submission_reviews` restore path
(`useReviewSubmission.ts:373-417`) already prefills tags/note on re-review; RPC 55000 guard
only blocks terminal statuses, so re-review flows through the UPSERT path. **E2E decision:
the deferred accept-flow Playwright E2E does NOT ride T3b** — the repo has zero
authenticated-E2E fixture (`review-flow.spec.ts` is fully `.skip`ped on exactly that gap);
build-the-fixture-vs-accept-manual-smokes is a T5 call. TEST probe 2026-07-02: 0
`needs_revision` rows (113 approved + 17 rejected) — the executor creates the state during
the smoke. The T3b PR carries this tracker + the brief (do NOT sweep other untracked docs).
NEXT = **T3b execution (Opus, brief ready)**; then T4 dedup design (Fable). Prior update
below.

**Prior update (2026-07-02, Fable, #574 merge + PROD verify + Part 3c go-live session):**
**T3 TRACK CLOSED — THE SITE IS NOW INVITE-ONLY AND LIVE; real invitations are SAFE to send.**
**#574 MERGED** (squash `104337f`) after Fable's own diff review + independent re-verification
(re-ran all 3 anon probes live on TEST; confirmed the 5 surviving admin/own policies cover every
client-side admin op; confirmed the deploy-window is safe — PROD's OLD RPC was anon-callable, so the
new frontend worked before the migration landed). User approved BOTH PROD gates (migration + edge).
**Migration PROD-verified:** enumeration SELECT + dead accept UPDATE policies GONE; RPC hardened
(SECURITY DEFINER, `search_path=''`, 9-col return, grants anon/authenticated/service_role only);
3 anon probes pass on PROD (enumeration→`[]`, exact-token→1 row, bogus→`[]`); probe row deleted
(RETURNING-verified, baseline restored). **Edge deploy 3-signal-verified:** invitation-management
v26→v27, `ezbr_sha256` `c3ed3dfc…a160` = the TEST-verified v10 bundle exactly, bogus-token accept
probe → the fixed `404 Invalid or expired invitation`. **Part 3c COMPLETE:** user toggled OFF
"Allow new users to sign up"; `auth/v1/signup` → **422 `signup_disabled`** verified; PROD
end-to-end invite test on the REAL live site (isolated browser context): throwaway teacher invite →
accept page resolved it via the new token-scoped RPC (showed email + TEACHER role) → account
created, auto-signed-in, `user_profiles.role='teacher'`, invitation `accepted_at` set → then FULLY
cleaned (profile + auth user + invitation deleted with RETURNING; residue probes all 0; table back
to 1 total / 0 pending). NEXT = **T3b resubmit button: Fable brief first, then Opus executes**
(design sketch in punch-list row 7); after that T4 dedup design (the 2nd planned Fable session).
Prior update below.

**Prior update (2026-07-02, Fable, T3 merge + security-fix session):** **#573 MERGED** (squash
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
| T2b | Quick-wins patch PR (punch-list bucket 1: gate scoping, decision toasts, card titles, sticky pane, title+summary fields incl. RPC COALESCE-flip migration, sign-in clear, /login fix, copy + error propagation) | Opus | **✅ DONE — shipped PR #572 (`3a7d634`) 2026-07-01.** Brief: `2026-07-01-brief-quickwins-patch.md`. Carried the then-uncommitted sprint docs. |
| T3 | Auth email (invite/reset only) via Google Workspace SMTP; invite-only signup; custom-email retirements | Opus → **Fable** (merge + security fix + go-live) | **✅ TRACK CLOSED 2026-07-02** — #573 (`9a50dc6`) + RLS fix #574 (`104337f`) both merged + PROD-verified; **Part 3c DONE: public signups disabled (422 `signup_disabled` verified) + PROD end-to-end throwaway-teacher invite test passed on the live site and fully cleaned. Site is INVITE-ONLY and live; real invitations safe to send.** Residual: accept-flow Playwright E2E deferred to T3b/T5. |
| T3b | Resubmit-after-revisions button (punch-list bucket 2; user-designed re-snapshot flow) | Opus → **Fable** (adjudication + merge) | **✅ DONE 2026-07-02 — PR #575 merged (squash `03ebe4b`) + PROD edge deploy 3-signal-verified (v37, sha `a7fce21d…` = TEST-verified bundle, negative probes reject cleanly).** No migration. Gate-2 TEST smoke had proven the full server loop (CAS flip, stale-similarity clear 1→0, tag+note preservation, 4 negative probes, retired-guard). Residual: UI button click → T5 smoke. Brief: `2026-07-02-brief-t3b-resubmit.md`. |
| T4 | Corpus dedup sweep (764 live lessons) + review-screen reshape | Fable design ✅ → Opus t4a ✅ → Fable+user walkthrough ✅ → Opus t4c retire / t4b reshape | **t4c PR OPEN 2026-07-02 (`feat/t4c-dedup-retire`)** — soft-retire migration `20260702160000_t4_dedup_retire.sql` generated from decisions.json (61 losers, D5 snapshot pattern); local gates green; PROD re-probe 764/61-live/0-retired → 703; TEST rehearsal pre-registered 57/61 (742→685). NEXT = CI→TEST verify → 🔴 **USER-only PROD gate** → read-only PROD verify. **t4b** (Opus, `2026-07-02-brief-t4b-review-reshape.md`, independent) parallel-ok |
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
  **Design session 2026-07-02 (Fable):** everything above ratified + designed; see
  `2026-07-02-t4-dedup-design-decisions.md` for the full record (D1–D12), including: retire =
  the proven `retired_at` soft-retire, NO deletes (FK checklist moot); three verdicts
  retire_duplicate / keep_family(label) / unrelated; decisions land in a committed
  `docs/plans/t4-dedup/decisions.json` (no new DB table pre-launch); `detect-duplicates` gets
  a pg_trgm RPC (`exact` label = hash match ONLY, retired rows excluded from candidates);
  the Hummus/Bean-Dip "evidence" turned out to be fuzzy families, not same-title pairs —
  confirms fuzzy matching is required. The imports-deletion track is already executed
  (2026-05-08) — not part of T4.

## Explicitly NOT doing (pre-launch)

- Resend / esynyc.org DNS (someday-list; revisit only if Google-route fails)
- C42 engine spike (PR C), C162 unaccent, WHERE-DRY refactor, semantic search tier
- eslint-10 / TypeScript-6 major bumps (#460/#451), W7 tech-debt
- Overengineering hunts / simplification sweeps not in the path of T1–T5
- Embeddings regeneration (C2.4) — unnecessary if T4 retires embedding-based dedup
- Any personalization / auth-gated features (audience ≈ 3 internal accounts)
- AI pre-fill tagging (`ANTHROPIC_API_KEY`) — user decision 2026-07-01: launch manual-only;
  revisit post-launch if tagging feels slow (feature is built, never configured anywhere)
