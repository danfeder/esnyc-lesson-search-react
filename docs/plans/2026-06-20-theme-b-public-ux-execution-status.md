# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 6 (PR3/W1b SPLIT. **PR3a migration SHIPPED + PROD-verified** — merged `3c592b1`, all 4 search bugs fixed in production. **Next = PR3b (frontend sort wiring)** off post-merge main — the Task-3.2 work preserved on `feat/theme-b-w1b-frontend`/`9988bd0`.)

## Current State

**W1a SHIPPED** — PR1 #522 → `19d99b7`, PR2 #523 → `530b2536` (squash). Full PR1/PR2 detail lives in `…-execution-status-archive.md` (grep, don't read whole).

**Active = PR3 / W1b — SPLIT into two PRs for safe rollout (user verdict 2026-06-20).** The single hottest public RPC → **DATA SAFETY is the top constraint**.
- **PR3a = migration-only** — branch `feat/theme-b-w1b-search-rpc` (off `main` @ `530b2536`): the `20260620000000` migration + the `order_by?: string` types delta + W1b docs. Frontend is UNCHANGED here (still doesn't send `order_by`) → backward-compatible: the new 16-arg RPC's `DEFAULT 'relevance'` serves the old frontend with zero outage window. **This is what pushes/merges first.**
- **PR3b = frontend wiring** — branch `feat/theme-b-w1b-frontend` (currently at `9988bd0`, holds the Task-3.2 commit + everything below it). Ships AFTER PR3a's migration is live + verified on PROD. For PR3b, cut a fresh branch off the post-PR3a `main` and cherry-pick the Task-3.2 frontend changes (avoids the rebase-after-squash friction).

**Why split (deploy-ordering BLOCKER, Codex GATE 3):** `ci.yml` auto-deploys the frontend to PROD on merge (gated only by `test`, no approval), while `migrate-production.yml` holds the migration for MANUAL approval. A combined PR would let the new frontend (sending `order_by`) go live before the migration applied → old 15-arg RPC → PostgREST PGRST202 → **all public search errors** until the migration lands. Split = expand/contract: backward-compatible migration first, frontend after. (Availability risk, not data loss; resolved by splitting.)

**Task 3.1 (migration) DONE + verified — commit `136ba4a`.** All four fixes (C136 sanitizer / `_match_location` helper+GRANT / DROP+CREATE 16-arg `search_lessons` w/ `sort_key`+`sub`-subquery ORDER BY / C11 ghost exclusion both WHEREs). RETURNS unchanged. **Supervisor-verify + GATE 2 both caught real C136 crashes**: per-word strip turned `mother's`→invalid `mother s`; space-only split let a pasted tab survive. SHIPPED fix = strip operators/quotes→spaces BEFORE split + split on `\s+`. Local smoke green; `supabase db reset` clean; `npm run check` green; RLS = 2 pre-existing `archive_duplicate_lesson` failures (proven unrelated). Title-collation LOW resolved by TEST data (`en_US.UTF-8`, 1/745 lowercase-start → plain `title ASC` is intuitive). impl-plan Task 3.1 step 1 + design §4 Q2 corrected to the shipped mechanism.

**Task 3.2 (frontend) DONE + verified — commit `9988bd0` (on `feat/theme-b-w1b-frontend`, NOT on the PR3a branch).** `useLessonSearch` sends `order_by` + adds `sortBy` to queryKey; `SearchPage` threads `viewState.sortBy` + resets page on sort; `IntToolbar` drops the grade option; tests incl. an end-to-end SearchPage→RPC assertion (added per pre-push review). Verified green (1380 tests with it; 1373 without on the migration-only branch).

**PR3a OPEN = [#524](https://github.com/danfeder/esnyc-lesson-search-react/pull/524)** (pushed Session 6). CI auto-applied the migration to TEST.

**✅ TEST-DB verification PASSED on the real corpus (Session 6, exact numbers):**
- No 500: `herbs & spices`→20, `mother's`→8, `plant (food)`→20 (real matches; all crashed pre-fix).
- C11: the 3 ghosts are **non-retired** (were leaking before) → `total_count`=**742**=745 live−3; **0** ghosts in browse or Indoor.
- location-Both: raw Indoor=440/Both=198/Outdoor=107; `search_indoor`=**635**(440+198−3 ghosts), `search_outdoor`=**305**(107+198), `search_both`=**198**(Both only). Exact — Indoor/Outdoor include Both; Both matches only Both.
- Sort: title A–Z verified; modified≠relevance; NULL→relevance; stale grade→relevance; browse deterministic.

**🎉 PR3a SHIPPED + PROD-VERIFIED (Session 6) — merged squash `3c592b1`, migration live on PROD.** 3-signal PROD verify (live corpus = 767 lessons) all green: 16-arg sig + `_match_location` live; no 500 on `herbs & spices`(20)/`mother's`(8); total 767→**764** (3 non-retired ghosts excluded, 0 in browse); location-Both exact (raw Indoor 452/Both 205/Outdoor 110 → search **654/315/205**); sort title-A–Z / modified≠relevance / NULL+grade→relevance / deterministic. `migrate-production.yml` Apply succeeded first try (no SASL flake). **The four search bugs (C136 crash, location-Both, real sort backend, ghost leak) are fixed in production.**

**✅ Bot round 1 CLEAN (Session 6).** All CI green except expected-red Security-Audit (E2E, Test&Build, Coverage, CodeQL, semgrep, all 3 `claude-*` reviews PASS). Four-surface triage: `claude[bot]` posted 1 review summary + 1 code-review comment + 5 line comments — **all confirmations / informational; ZERO blockers, ZERO required code changes.** The only quasi-suggestions (document the all-operators→0-results edge; CTE-refactor the duplicated WHERE; the title-path ORDER-BY redundancy) are all pure nits the bot itself marked "no change needed" / out-of-scope → rejected (and editing a pushed/TEST-applied migration is forbidden anyway). No GATE 4 needed (no real suggested change). The bot independently re-derived the split decision, GRANTs, ghost parity, `sort_key`, and the C136 strip-before-split.

**NEXT = PR3b (frontend sort wiring).** PR3a is done (merged + PROD-verified). PR3b ships the Task-3.2 frontend (now SAFE — the RPC supports `order_by` in PROD). Steps: sync local `main` to `3c592b1` → `git checkout -b <pr3b-branch> main` → cherry-pick the Task-3.2 frontend changes from `feat/theme-b-w1b-frontend`/`9988bd0` (the 6 files: `useLessonSearch.ts`, `SearchPage.tsx`, `IntToolbar.tsx` + their tests) → bring this status file forward → pre-push gate (code-reviewer + Codex GATE 3) → push → PR → bots (GATE 4) → **user-gated merge** → frontend auto-deploys to PROD (the Sort dropdown goes live; no migration). Pure-frontend, low-risk. (NOTE: the local status-doc commits live on the now-merged `feat/theme-b-w1b-search-rpc` branch — bring the status file content onto the PR3b branch via `git checkout feat/theme-b-w1b-search-rpc -- docs/plans/2026-06-20-theme-b-public-ux-execution-status.md`.)

**§4 Q1–Q5 LOCKED 2026-06-20** (rationale written inline in design doc §4; W1b flipped to Locked):
- **Q1 C58 sort** [user verdict] = **"Sort minus grade"**: real server-side `order_by` for relevance/title/modified; REMOVE the no-op `grade` option from IntToolbar. `order_by text DEFAULT 'relevance'` → 16-arg → DROP+CREATE. (Sort is a confirmed true no-op today.)
- **Q2 C136** [evidence] = sanitize inside `expand_search_with_synonyms` (per-word regex-strip of tsquery operators `[&|!():*<>]`; trigram fallback preserves recall).
- **Q3 C11** [evidence — TEST+PROD] = exclude 3 exact ghost IDs (`1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd`, `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU`, `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`; all title="Unknown", all [Indoor]; identical TEST/PROD) in BOTH count+result WHERE + `lesson_id ASC` tiebreaker.
- **Q4 location-Both** [evidence — TEST] = new IMMUTABLE `_match_location` mirroring `_match_cooking_methods`; data is `text[]`, Indoor 456 / Both 203 / Outdoor 107 = 766/766 title-case; expand Indoor→{Indoor,Both}, Outdoor→{Outdoor,Both}, Both→{Both}; replace bare `&&` in both WHEREs.
- **Q5 C84 tags** [user verdict] = **DEFERRED** out of W1b → its own data-quality audit session (tags predate the metadata rebuild). PR1 badge suppression stays; filter still works. Tracked: `project_tags_field_audit_pending` memory + design §9.

**Evidence probes (TEST/PROD, 2026-06-20):** corpus 766; ghosts identical TEST+PROD; location 3 single-element title-case values; tags 74/766; `updated_at` exists (timestamptz); current `search_lessons` = the 15-arg signature (DROP target); EXECUTE grantees = PUBLIC, anon, authenticated, postgres, service_role; `_match_location` confirmed not-yet-existing.

**Tasks authored** (impl plan PR 3): **Task 3.1** = the one migration (C136 sanitizer + `_match_location` helper + DROP/CREATE `search_lessons` w/ `order_by` + C11 exclusion + location swap in both queries; RETURNS unchanged; regenerate types; rollback block; **ORDER BY gotcha**: can't reference the `rank` alias inside a CASE — wrap the result SELECT in a subquery `sub`). **Task 3.2** = client wiring (useLessonSearch `order_by` + queryKey; SearchPage reset page on sort; IntToolbar drop the grade option) + tests.

**Next actions (in order):**
1. ✅ **GATE 1B DONE** (Codex, 2026-06-20, inline) — BLOCKER `_match_location` GRANT + HIGH `service_role` grant + 2 MEDIUM (`sort_key` normalization; quote-strip) folded into Task 3.1.
2. ✅ **Task 3.1 DONE + supervisor-verified** (Session 6) — commit `136ba4a`, local-only. Caught + fixed the C136 mid-word crash (`mother's`).
3. ✅ **GATE 2 DONE** (Codex, Session 6, inline) — 8/9 areas CLEAN; 1 MEDIUM (whitespace split) accepted + fixed (`\s+` split). Ghost-IDs-real + apply-verify flagged UNVERIFIED (ghosts already TEST/PROD-probed Session 5; apply-verify is the standing gate).
4. ✅ **Task 3.2 DONE + supervisor-verified** (Session 6) — commit `9988bd0` (now on `feat/theme-b-w1b-frontend`). Pre-push fix-up: end-to-end SearchPage→RPC test + comment honesty.
5. ✅ **Pre-push gate DONE** (Session 6) — code-reviewer (no BLOCKER/HIGH) + Codex GATE 3 (inline). Codex caught the **deploy-ordering BLOCKER** → resolved by SPLITTING into PR3a/PR3b (user verdict). Test-gap (both models) accepted + fixed. Title-collation LOW resolved by data.
6. **Push PR3a** (`feat/theme-b-w1b-search-rpc`, migration-only) + open the PR. **← NEXT.**
7. **TEST-DB-MCP verify** PR3a on the real corpus (re-verify each DB-affecting round) → bot rounds (GATE 4) → user-gated merge → PROD approval + **3-signal verify** (`reference_ci_flakes.md` first).
8. **THEN PR3b** (frontend) — fresh branch off post-PR3a `main`, cherry-pick the Task-3.2 frontend changes from `feat/theme-b-w1b-frontend`/`9988bd0`; pre-push gate; push; bots; merge. (No new migration; pure-frontend.)

**Branch layout after the split (Session 6):**
- `feat/theme-b-w1b-search-rpc` (PR3a) = `735337d`(docs) → `1bc0198`(docs) → `136ba4a`(migration+types) → `cafd701`(docs) → split-bookkeeping docs commit. **This is the migration PR.** Push this.
- `feat/theme-b-w1b-frontend` (PR3b source) = the above + `9988bd0`(frontend). Holds the Task-3.2 work until PR3a lands on PROD. **Do NOT push this yet.**
- Docs are bundled into PR3a (acceptable — they document the migration). For PR3b, cherry-pick only the frontend changes onto a fresh branch off post-merge main.

## Recent decisions worth carrying forward

- **PR3 SPLIT into PR3a (migration) + PR3b (frontend) — user verdict 2026-06-20 (Session 6).** Codex GATE 3 found a PROD deploy-ordering hazard: the frontend auto-deploys to PROD on merge (no approval) while the migration waits for manual approval, so a combined PR would let the new frontend hit the old RPC → PGRST202 → public-search outage window. Split = expand/contract: ship the backward-compatible migration first (the old frontend works against the new 16-arg RPC via `DEFAULT 'relevance'`), then the frontend after the migration is PROD-live. **General lesson for this repo:** any migration that ADDS a param the frontend will send needs the migration on PROD *before* the frontend deploys — split the PR (or make the client backward-compatible). The combined-PR pattern is unsafe given the auto-frontend-deploy + manual-migration-approval pipeline.
- **C136 sanitizer mechanism corrected during the build (Session 6)** — the LOCKED-plan's "per-word strip after the split" was buggy (mid-word operator/quote → invalid `to_tsquery` token, e.g. `mother's` → `mother s`). Shipped mechanism: strip the operator/quote char class to spaces BEFORE splitting + split on `\s+` (whitespace-robust, GATE-2 add). Caught by supervisor-verify (mid-word) + GATE 2 Codex (tab/newline). Both are correctness fixes *inside* locked decision Q2 ("sanitize inside `expand_search_with_synonyms`") — not product/design changes, so fixed without a user gate. impl-plan §Task-3.1-step-1 + design §4 Q2 updated to match.
- **Supervisor-verify on migrations is load-bearing** (re-confirmed Session 6): re-running the local SQL smoke myself — NOT just reading the diff — caught a real public-search crash the spec'd executor's spec-driven smoke missed (it tested `expand_search_with_synonyms('mother''s')` directly, which returns a string without error; the crash only fires when that string hits `to_tsquery` inside `search_lessons`).
- **GATE 4** (2026-06-20, user-requested): every bot-surfaced *real suggested change* gets a Codex 2nd opinion before finalizing accept/reject. Codex dispatches MUST say "return findings INLINE, do not background" (async-handoff flake; worked first-try ×3 now incl. GATE 2 Session 6).
- **W1b §4 locks** (2026-06-20): see Current State; full rationale in design §4.
- **Tags deferred** (2026-06-20 user verdict): C84 path-a needs a data-quality audit session first — do NOT expose tags in W1b.

## Out-of-scope follow-ups captured here

- **`tags` public badge (C84 path-a)** — deferred to its own audit session (`project_tags_field_audit_pending` memory). The `LessonMetadata.tags` type gap (`database.types.ts:256` has `tags`; `src/types/index.ts` `LessonMetadata` does not) is part of THAT future work, not W1b.
- **`filter_lesson_format` dead RPC param** — kept in the W1b signature (harmless); dropping it = the separate deferred Task 1.3a (also needs the frontend to stop sending it). Bundle into a future RPC change, NOT W1b.
- **C14 IntPillGroup ARIA-forwarding** (from PR2) — pill-group controls only get wrapper-level `id`/`aria-label`; flagged follow-up.
- **LessonSearchPicker stale state after select→clear (R2-4, from PR2)** — REAL but pre-existing; fix later with a reset on `selected→null` + a test.
- **ArrowUp APG return-to-input (R2-2, from PR2)** — current clamp-at-0 is LOCKED design §5; only change with user sign-off (a design change, not a bug).

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (W1a + W1b LOCKED; W1c §4 Q6–Q8 still open)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2/PR3 concrete; PR4 skeleton)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Archive (PR1+PR2 cycles): `2026-06-20-theme-b-public-ux-execution-status-archive.md` — grep, don't read whole.

## Session log

### Session 6 — 2026-06-20 — Task 3.1 migration + Task 3.2 frontend built + verified + pre-push-gated; PR3 split for safe rollout

Supervisor session. Built + verified both W1b tasks, ran the pre-push gate, and split PR3 into a migration-first PR3a + a follow-up frontend PR3b per a Codex-caught deploy-ordering hazard (user verdict). Stopped before pushing PR3a.

- Oriented; git matched the status file; baseline `npm run check` clean. Untracked `docs/plans/*` are unrelated other-initiative kickoffs (left alone).
- **Dispatched Task 3.1 executor** (Opus, fresh context, `database-migrations` + `/new-migration` + TDD skills, local-first, no push). It built `20260620000000_search_lessons_w1b.sql` faithfully per spec (all four fixes; `sub`-subquery ORDER BY; both-WHERE deltas; GRANTs incl. `_match_location` + `service_role`; RETURNS unchanged) + the 1-line types delta; committed locally.
- **Types regen note (from executor):** local Supabase CLI is **v2.95.4**, older than whatever generated the committed `database.types.ts` (which carries a `PostgrestVersion: '13.0.5'` pin a full regen would strip). Executor applied ONLY the true schema delta (`order_by?: string`) to preserve format. Verified it matches a temp full-regen modulo formatting. **Follow-up:** consider regenerating with a newer CLI before merge (optional — current delta is correct).
- **Supervisor-verify (load-bearing):** read the full SQL; diffed the body against `20260520020000` (faithful copy + only intended deltas); re-ran the local MCP smoke myself. **Caught a real crash:** `search_lessons('mother''s')` → `syntax error in tsquery: "mother s"`. Root cause: the spec's per-word strip leaves a mid-word operator/quote as an internal space. **Fixed** (strip-before-split), re-applied (`supabase db reset`), re-verified, amended the commit.
- **GATE 2 (Codex on the SQL, inline — no async flake):** 8/9 areas CLEAN (DROP/CREATE sig, GRANTs, C11 both-WHERE parity, quoting, ORDER BY subquery, `_match_location` semantics, rollback). **1 MEDIUM:** space-only split lets a pasted tab/newline survive → `to_tsquery` error. Rebuttal-passed (real, crash-class, public surface) → **accepted + fixed** (`regexp_split_to_array(…, '\s+')`); confirmed `E'herbs\tspices'` crashed pre-fix, clean post-fix. Re-applied + re-verified; amended the commit → **`136ba4a`**.
- **Final smoke (all green, no crash):** operators `& | ( ) : *`, mid-word quotes (`mother's`, `herbs&spices`), `a:b`, tab/newline/CR, empty/NULL (→5 match-all); title≠modified order; deterministic empty-query order; NULL/grade→relevance; `_match_location` truth table (Indoor⊇Both, Both-only, Outdoor∌Both); ghost clause executes; signature = 16-arg; grants = anon/authenticated/service_role(+postgres owner). `npm run check` green.
- **Dispatched Task 3.2 executor** (Opus, fresh context, TDD): client wiring — `useLessonSearch` `order_by`+queryKey, `SearchPage` thread+page-reset, `IntToolbar` drop grade option, tests. Committed `659facc` → 1380 tests green.
- **Supervisor-verify Task 3.2:** read the diff (correct per spec), re-ran `npm run check` + the 3 touched test files (38 pass, non-vacuous). Confirmed the stale-`grade`-in-select edge is UNREACHABLE — `searchStore` `partialize` persists only `view`/`density`, never `sortBy`, so `sortBy` resets to `relevance` each load and the toolbar can only set the 3 valid values.
- **Pre-push gate (code-reviewer + Codex GATE 3, parallel):**
  - code-reviewer: no BLOCKER/HIGH; verified C136 fix, ghost-parity, GRANTs, `sub` ORDER BY empirically. MEDIUM = the `currentPage:1` write is functionally inert (nothing reads `viewState.currentPage`; real reset is the queryKey) + the comment/test overstate it. LOW = title collation might not be A–Z.
  - Codex GATE 3 (inline): SQL/caching/page-reset CLEAN. **BLOCKER = deploy-ordering** (combined frontend+migration unsafe — frontend auto-deploys before manual-approval migration). LOW = no end-to-end SearchPage→RPC test.
  - **Triage:** title-collation resolved by TEST data (`en_US.UTF-8`, 1/745 lowercase-start → plain `title ASC` intuitive — no migration change). Test-gap (both models agreed) → added an end-to-end SearchPage→RPC assertion + softened the `currentPage` comment; kept the write (spec'd/convention). Amended frontend → `9988bd0`. Deploy-ordering BLOCKER → **user verdict: SPLIT** (see recent-decisions).
- **Split executed:** preserved the frontend commit on `feat/theme-b-w1b-frontend` (`9988bd0`); `git reset --hard cafd701` on the migration branch (drops the frontend commit). Migration branch (PR3a) re-verified green (`npm run check`; full suite 1373) with the frontend back at its pre-3.2 (backward-compatible) state. Updated this status file + design §7 / impl PR3 header for the split.
- **Pushed PR3a (#524)** + opened the migration PR (body flags the rollout-ordering + standing gates). CI auto-applied the migration to TEST. **Ran the mandatory TEST-DB verification on the real corpus — ALL GREEN** (numbers in Current State): no 500 on punctuation; total 745→742 (3 non-retired ghosts excluded, 0 in browse/Indoor); location-Both exact (Indoor 635=440+198−3, Outdoor 305=107+198, Both 198); sort title-A–Z / modified≠relevance / NULL+grade→relevance / deterministic. The 3 ghosts being NON-retired confirms C11 fixes a real live leak.
- **Bot round 1 (PR3a) CLEAN:** four-surface triage — `claude[bot]` posted 1 review + 1 code-review + 5 line comments, ALL confirmations/nits, zero required changes, no GATE 4 (no real suggested change). The all-operators→0/CTE-refactor/title-ORDER-BY nits were rejected (bot-marked "no change needed"/out-of-scope; editing a pushed migration is forbidden anyway).
- **PR3a MERGED + PROD-VERIFIED** (user approved both merge + PROD gate): squash `3c592b1`; `migrate-production.yml` Apply succeeded first try (no SASL flake). 3-signal PROD verify (live corpus 767) all green — no 500 on punctuation; 767→764 (3 ghosts excluded); location-Both exact 654/315/205; sort works. **All four W1b search bugs fixed in production.**
- **Captured a durable memory:** the additive-RPC-param deploy-ordering rule → `reference_ci_flakes.md` + MEMORY.md index (so future migrations split correctly).
- **NEXT = PR3b (frontend sort wiring)** — pure-frontend, now safe (PROD RPC supports `order_by`). See the NEXT block in Current State for the branch/cherry-pick recipe.

Learnings:
- **Catch deploy-ordering hazards before merge, not after.** An additive RPC param + a frontend that sends it, in one PR, is unsafe here: the frontend auto-deploys to PROD on merge while the migration waits for manual approval → outage window. Codex (different model family) caught what the in-loop review didn't frame as a rollout risk. Expand/contract (migration-first) is the fix.
- **Re-run the migration's behavioral smoke in the MAIN LOOP, not just read the diff** — the executor's spec-driven smoke tested the sanitizer function in isolation (returns a string, no error) and missed that the string is invalid only once `to_tsquery` consumes it inside `search_lessons`. The end-to-end `search_lessons('mother''s')` probe is what caught it.
- **A LOCKED mechanism can still be wrong.** Q2's locked decision (sanitize inside `expand_search_with_synonyms`) was right; its *literal code sketch* (per-word strip) was buggy. Correctness fixes inside a locked decision don't need a user gate; product/design changes do. Update the plan docs to match what shipped.
- **Codex "return findings INLINE" worked first-try a 4th time** (GATE 2). Reliable.

### Session 5 — 2026-06-20 — PR3/W1b cycle opened: §4 locked, Task 3.1/3.2 authored + GATE-1B-hardened

Supervisor session. No code on the branch yet — this session was the full W1b design-lock + task-authoring + plan-review phase. Clean handoff at the end.

- Oriented; git matched the status file; baseline `npm run check` clean. Worktree had pre-existing untracked `docs/plans/*` (unrelated — left alone).
- **User decisions:** Q1 = "Sort minus grade" (real `order_by` for relevance/title/modified, drop the grade option); Q5 = **defer tags** to its own audit session (tags predate the metadata rebuild — needs vocab reconciliation before public exposure).
- Captured the **tags-audit-pending** concern as a durable project memory (`project_tags_field_audit_pending`) + MEMORY.md index line (user: "don't lose track").
- **§4 evidence gathering:** background Explore agent code digest (current RPC body @ `20260520020000`, sort wiring, C136 sanitizer site, `_match_cooking_methods` helper, tags chain, migration ordering) + TEST/PROD MCP probes (ghosts identical TEST/PROD all title="Unknown"/[Indoor]; location 766/766 single-element title-case; tags 74/766; `updated_at` exists; current 15-arg sig; grantees incl. service_role).
- **Locked §4 Q1–Q5** inline in design doc + updated status line / §6 / §7 table / §9; flipped W1b → Locked.
- **Authored Task 3.1 (migration) + Task 3.2 (client wiring)** in the impl plan (skeleton → concrete).
- **PR-cycle archival:** moved PR2 (Sessions 3/4 + round outcomes + Done detail + decisions) into the archive; slimmed this file to the PR3 cycle.
- **GATE 1B** (Codex, returned **inline** — no async flake): **1 BLOCKER** (missing `_match_location` GRANT — invoker-rights RPC), **1 HIGH** (`service_role` missing from the `search_lessons` GRANT vs the `20260514` precedent), **3 MEDIUM** (explicit-`NULL order_by` wouldn't fall back to relevance → add a normalized `sort_key`; sanitizer apostrophe/quote handling left ambiguous → make quote-strip explicit; DROP+CREATE atomicity), **9 LOW**. Rebuttal-passed all → accepted + folded BLOCKER/HIGH/2-MEDIUM into Task 3.1; documented atomicity (precedent + Supabase per-file transaction wrapping → no missing-function window; CREATE-OR-REPLACE impossible since sig changes); confirmed the 9 LOW are already in the plan or impl-time checks.
- **Handoff:** stopped at this clean boundary rather than start the migration build on a heavy context — DATA SAFETY on the hottest public RPC warrants a fresh budget for executor + supervisor-verify + GATE 2.

Learnings:
- **GATE 1B (reviewing the authored PLAN before any code) is load-bearing for migrations** — it caught a runtime BLOCKER (helper GRANT) + a HIGH grant gap that would otherwise surface only at TEST/PROD apply, plus a real NULL-fallback hole. Run a plan-review gate before dispatching migration executors, not just a post-code gate.
- **Codex "return findings INLINE, do not background" worked first-try a 3rd consecutive time** (PR2 ×2 + this) — promote to a feedback memory (the async-handoff flake is reliably avoided by the explicit instruction).
