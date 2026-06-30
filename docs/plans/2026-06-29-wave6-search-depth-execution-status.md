# Wave 6 — Search Depth (C41 + C42 spike) Execution Status

**Last updated:** 2026-06-29 by Session 4 (PR D built `7af13e2` + pushed `f883e2b` + applied to TEST + eval DONE — recall cliff RECOVERED 0.688→0.728, maxTotalCount violations 0, q40 repurposed per user; next = fix-up push → bot triage → user merge → PROD verify)

## Current State

**Phase:** **PR A MERGED (#568, squash → `48ad150` on main). PR B IN PROGRESS — B.1 + B.2 DONE +
SUPERVISOR-VERIFIED + GATE 2 (Codex) + GATE 3 (code-reviewer) BOTH CLEAN; pushing + opening PR now.** PR A
landed all 3 `claude-review` rounds (R1 `b993699` / R2 `6c83675` / R3 `4f5ebfd`, user-approved past the
round-cap). PR B branch `feat/wave6-c41-and-of-ors` cut off the merged main.

**Pre-push gates (all clean, ZERO findings — no rebuttal pass / fixups needed):** GATE 2 Codex (`gpt-5.5`,
read-only) on the migration SQL — all 11 adversarial checks clean, SAFE-TO-PROCEED (idempotency, DROP/CREATE
ordering, tsquery algebra, empty guard, rank NULL-handling, GRANT/NOTIFY, injection safety, trigram
interaction, rollback completeness, single-term parity). GATE 3 Opus code-reviewer on the committed diff —
nothing blocking; independently re-confirmed conventions, the planner-reorder-robust empty guard
(numnode/@@ are strict → NULL→false not error), byte-identical count/result WHEREs, rollback fidelity, and
the minimal types change. Both flagged the same reminder (already Task B.3): TEST-DB MCP verify once the
preview is live — local 5-row seed can't exercise the multi-term narrowing.

**Task B.2 (author migration) DONE — commit `60f24d6`.** Migration
`20260629000000_c41_and_of_ors_term_combination.sql` (+ `.sql.rollback`) + 1-line `database.types.ts` regen
(`expand_search_with_synonyms.Returns: string→unknown`). Authored by an Opus executor, then
SUPERVISOR-VERIFIED in the main loop: (a) mechanical diff proved `search_lessons` is byte-verbatim vs
`wave4_pr2` except the 4 intended edits (declare→`expanded_tsquery tsquery`, expander assignment, both-WHERE
empty guard `(expanded_tsquery IS NOT NULL AND numnode(...)>0 AND @@)`, rank `COALESCE(ts_rank(...,
expanded_tsquery),0)`); (b) the new expander's synonym-lookup branching is verbatim from w1b, only the
accumulation target changed (global→per-term `group_words`) + flat `string_agg(' | ')` → per-group `||` OR +
cross-group `&&` AND + numnode drop + NULL-when-empty; (c) LOCAL probes match the derived model exactly:
`food waste decay`→`'food' & 'wast' & ( 'decay' | 'decomposit' )`, `compost`→`'compost'` (single-term
unchanged), `the of and`→NULL, `decay of food`→`( 'decay' | 'decomposit' ) & 'food'`, `herbs & spices`→
`'herb' & 'spice'` (injection-safe), `search_lessons('the of and')`→0 no-error; (d) `supabase db reset` clean,
`npm run check` pass, `test:rls` pass (2 `archive_duplicate_lesson` failures proven PRE-EXISTING via a
files-aside controlled experiment — unrelated to C41); (e) rollback live-tested (restores flat-OR; old OR=2
vs C41=0). DROP+CREATE for the expander (return-type change), CREATE OR REPLACE for `search_lessons` (sig
unchanged), both re-GRANTed `anon/authenticated/service_role`, `NOTIFY pgrst` present.

**Types-regen caveat (carry forward):** the committed `database.types.ts` is stylistically behind the local
CLI (v2.95.4 reformats quotes/unions) and predates the `c02_retag_rollback`/`c02_retag_skipped` snapshot
tables; the executor made a SURGICAL 1-line edit rather than commit the 3,354-line CLI reformat. Pre-existing
drift, not C41; those tables aren't referenced in app code so type-check is unaffected. Don't "fix" it here.

**Task B.1 (caller-grep → return-type path) DONE — DEFAULT PATH confirmed.** `grep -rn
'expand_search_with_synonyms' supabase/ src/ scripts/` enumerated all refs; the **only LIVE runtime caller**
is `search_lessons` (live def `20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql:199`). Everything else is
non-runtime: superseded `search_lessons` defs in older migrations, the live expander CREATE+GRANT in
`20260620000000_w1b.sql:59/124`, comments, the `.rollback` file, `archive/*`, `README.md`/`src/lib/CLAUDE.md`
docs, the generated `src/types/database.types.ts:1606` (regen target), and the
`scripts/heritage/artifacts/heritage-filter-baseline.json:12` snapshot string. NO `src/` runtime caller
(frontend calls the RPC, not the expander) and NO `supabase/functions/` edge caller. → **default path:
expander returns `tsquery`; `search_lessons` redefined to consume it + empty-tsquery guard.**

Design **Locked**. GATE 1A/1B folded during scaffolding (5 GATE-A findings: F1 `plainto_tsquery`
not `to_tsquery`; F2 empty-tsquery RPC guard; F3 two-function DROP+CREATE scope; F4 types-regen; F5 C42
provenance-as-risk).

**Active PR:** **#569** `feat/wave6-c41-and-of-ors` → main. Migration 1 (strict-AND, `60f24d6`) pushed +
applied to TEST + CI green. **PIVOTING to add PR D (two-pass relax) on the SAME branch** (so the recall cliff
never reaches prod) before merge.

**Current task:** **PR D BUILT (`7af13e2`) — pushing to #569; next = CI→TEST eval + q40 gold `[user-verdict]`.**
Mig 2 `20260629010000_c41_pr_d_two_pass_relax.sql` (+rollback +mig-1-rollback F5 comment +surgical 4-line
types add) authored by an Opus workflow executor; **adversarially verified twice** (workflow verifier 10/10 +
GATE 2 Codex `gpt-5.5` 10/10, both SAFE-TO-PROCEED) and **supervisor-verified in the main loop** (read the
file: OR companion = mig-1 expander with the single `&&`→`||` at L140 + numnode drop intact; `search_lessons`
adds only `cnt_and`/`K_relax:=10` + the relax block; the three WHEREs — relax-count/total-count/page — are
predicate-identical; gap-free CREATE-OR-REPLACE only, no DROP; rank/F2-guard/ORDER-BY untouched; local probes
+ `npm run check` clean; OR companion → loose flat-OR while strict-AND expander unchanged). **K=10 CONFIRMED
via read-only TEST `cnt_and` probe** (the live mig-1 strict-AND `total_count` per gold query): clean gap 5↔11
— relaxers q12=0 / q09=5 / q40=2; keepers q38=11 / q36=18 / q37=21 / q41=46 / q27=130 / taste-test=32 /
ctrl_compost=178 / ctrl_garden=586.

**DONE this session:** pushed `f883e2b` → CI applied mig 2 to TEST → behavioral verify (teamwork 0→44, q09
5→174, q40 2→568, fwd=18/q38=11 stay strict, `the of and` → 1 trigram match no-error, compost=178 unchanged)
→ `npm run eval:search` after-scorecard (TEST, FINAL committed). **Net vs the committed pre-C41 flat-OR
baseline:** frozen-recall **0.728→0.728 (zero net recall loss — cliff fully recovered from strict-AND's
0.688)**; frozen-precision **0.833→0.800** (collocation dip); **maxTotalCount violations 6→0** (5 of 6 floods
fixed; q40 repurposed so it no longer violates); dup-flood 0; normalized-call mismatches 0; MRR 0.923;
predicate 14/21. Floods collapsed: food waste 568→37, food-waste-decay 583→18, worm-compost 619→11. Sentinel
q22 alarm + G3 churn = EXPECTED C41 multi-term tightening (diagnostic, not regressions).

**USER DECISIONS (2026-06-29 Session 4):** (1) **MERGE the trade + TRACK a phrase/collocation follow-up** —
strict AND-of-ORs hurts a few phrase-like queries, worst = `taste test` 7/10→1/10 (treated as taste & test →
quiz/test lessons; stays strict at 32 so relax doesn't rescue it; also `three sisters` 0.900→0.800). A real
fix needs phrase-aware search (`<->`/`phraseto_tsquery`), out of this PR's scope → see Out-of-scope. (2) **q40
REPURPOSED** to a recall-recovery probe (`queries.json` + `gold-provenance.md` synced; user-signed-off frozen
gold): dropped `maxTotalCount`, bar `>=4/10`→`>=3/10` (the measured 3/10 → passes); records that the typo
query recovers some on-topic results via relax. Final scorecard = 0 maxTotalCount violations.

**NEXT:** push the fix-up (q40 gold + `gold-provenance.md` + final `scorecards/test.md` + this status) to #569
→ bot triage (mig-2 round) → (user) merge → PROD MCP verify → then PR C (C42 spike).

**B.3 eval RESULT (strict-AND, TEST after-scorecard) — flood FIXED but recall CLIFF (the PR D trigger):**
- ✅ FLOOD GONE: `food waste decay` 583→**18**, `food waste` 568→**37**, `worm compost food waste` 619→**11**,
  `food scraps decomposition` 581→**21**; **maxTotalCount violations 6→0**; dup-flood 0; normalized-call
  mismatches 0. Probe precision held/improved (food scraps 6→7/10, mexican food 8→9/10, seed saving 5→7/10).
- ⚠️ RECALL CLIFF (fails "zero regression on frozen families"): `teamwork and cooperation` 44→**0 results**
  (`teamwork & cooper`; recall 0.4→0.0), `bugs that pollinate flowers` 174→5 (precision 9/10→1/5), `taste
  test` 503→32 (precision 7/10→1/10); **frozen-recall 0.728→0.688, frozen-precision 0.833→0.800**; typo canary
  `decompasition food waste` 568→2 (can't reach ≥4/10 → tripped). (Sentinel q22 278→36 + G3 churn are EXPECTED
  C41 tightening on multi-term, NOT regressions.)
- The intermediate strict-AND scorecard overwrote `scripts/search-eval/scorecards/test.md` (uncommitted) —
  PR D's re-eval will be the FINAL committed after-scorecard.

**PR D DESIGN (settled by supervisor; the design pre-authorized this contingency):**
- Mechanism: in `search_lessons`, compute `tq_and := expand_search_with_synonyms(q)` + count the AND-path
  (AND-FTS ∪ trigram, with filters). If `cnt_and < K` → switch the effective tsquery to
  `expand_search_with_synonyms_or(q)` (loose-OR) for the count + page + rank. Per-query all-AND OR all-OR (no
  mix) → clean total_count/pagination.
- `expand_search_with_synonyms_or(text) RETURNS tsquery`: NEW companion, identical per-group synonym logic but
  combines groups with `||` (OR) instead of `&&` (AND) — yields the old flat-OR. Same empty/numnode guards.
- `K` (relax threshold): eval-tuned on TEST. Must catch near-empty (q12=0, q09=5, q40=2) but NOT re-flood
  healthy AND sets. Gold AND-counts cluster either high (worm-compost-food-waste=11, food-waste-decay=18,
  food-scraps=21, mexican-food=47, three-sisters=43) or very low (0/2/5) — a clean gap at 6–10, so **K=10**
  separates cleanly (relaxes ≤9, keeps ≥10). Start K=10; eval-confirm on TEST by `CREATE OR REPLACE`-ing
  candidate-K `search_lessons` via `mcp__supabase-test__execute_sql` + `npm run eval:search`, then bake the
  chosen K into the migration (still LOCAL/unpushed → editable) before pushing.
- **RE-FLOOD-ON-RELAX (important nuance, surfaced 2026-06-29):** relaxing to FULL OR re-floods near-empty
  queries whose terms include a broad token. q40 `decompasition food waste` (AND=2) relaxes → OR `(decompasition|
  decomposit|food|waste)` → ~568 (the broad "food" dominates), EXCEEDING q40's `maxTotalCount=100`. This is
  inherent to "fall back to the old loose OR" (the endorsed mechanism) — a deliberate recall-over-precision
  choice for otherwise-near-empty queries. NET: recovers q12 (0→~44, relevant) + q09 (5→174, precision 1/5→
  ~9/10) strongly; q40 floods (typo query — acceptable). **CONSEQUENCE: q40's gold `maxTotalCount` guard must
  be removed/raised** (it relaxes by design now) — a GOLD-SET change → **USER SIGN-OFF required** (frozen-gold
  rule, `[user-verdict]`) before editing `queries.json`. The other guarded probes (q36/q37/q38/q41/q27) have
  AND≥11 ≥K → never relax → their guards still hold.
- **search_lessons count structure (for the executor):** add DECLARE `cnt_and bigint;` + `K_relax constant int
  := 10;`. AFTER the AND-expander assignment AND the cultures expansion, BEFORE the existing count, insert the
  relax block: `IF search_query IS NOT NULL AND search_query <> '' AND expanded_tsquery IS NOT NULL THEN SELECT
  count(*) INTO cnt_and FROM lessons l WHERE <WHERE-A>; IF cnt_and < K_relax THEN expanded_tsquery :=
  expand_search_with_synonyms_or(search_query); END IF; END IF;`. The existing total-count + page queries stay
  UNCHANGED (they reference `expanded_tsquery`, now possibly the OR form). All THREE `<WHERE-A>` blocks
  (relax-count, total-count, page) are then LITERALLY IDENTICAL (same `expanded_tsquery` var) — verify by
  diffing them. (One extra indexed count when not relaxed — cheap; chosen for verifiability over micro-opt.)
- `expand_search_with_synonyms_or(text) RETURNS tsquery`: copy migration-1's AND-expander body VERBATIM,
  change ONLY the group-combine operator `&&` → `||` (line ~130: `result_q := ... result_q || group_q`) + the
  fn name/comments. Yields OR-of-all-groups = the old flat-OR. Same numnode/NULL guards. STABLE. GRANT.
- PR structure: SECOND migration `20260629010000_c41_pr_d_two_pass_relax.sql` (+ `.sql.rollback`) on #569.
  ADDITIVE + GAP-FREE (fresh CREATE of the OR companion, CREATE OR REPLACE of search_lessons — NO DROP+CREATE)
  → no atomicity window, and it documents the correction to migration 1's inaccurate atomicity comment. Verify
  prefix sorts after `20260629000000` (no same-day bare-date trap). Rollback: DROP the OR companion + CREATE OR
  REPLACE search_lessons back to migration-1's strict-AND body + re-GRANT + NOTIFY.
- Re-GRANT the new companion + search_lessons (`anon/authenticated/service_role`); `NOTIFY pgrst`; types regen
  (surgically ADD the `expand_search_with_synonyms_or` block — `Returns: unknown` — do NOT commit the noisy
  full CLI reformat). Then GATE 2 Codex, push, re-triage, re-eval on TEST (cliffs recovered + flood guards
  hold), (user) merge, PROD verify.
- **Fold the bot F5 fix:** add a doc comment to migration-1's `.sql.rollback` (freely editable — never
  CI-applied) noting it re-introduces the pre-C41 all-stop-word `to_tsquery` crash.

**Bot triage of #569 (strict-AND migration) — all surfaces collected, rebuttal pass done:**
- **F1 [bot:BLOCKING→recalibrated SHOULD-FIX]** non-atomic DROP+CREATE + a factually-WRONG atomicity comment
  (mig 1 lines 46-48 claim "Supabase wraps each migration in a transaction"; FALSE — the CLI is autocommit,
  per the repo's own `c02_retag_apply.sql:60-63`). Bot's "34 migrations wrap" is FALSE (only 1 does; prior
  search redefs w1b/wave4_pr2 shipped UNWRAPPED). Gap risk negligible (~3-user internal site,
  [[project_user_base_accounts]]). RESOLUTION: can't edit mig 1 (pushed/applied to TEST per
  `database-migrations` skill) and a BEGIN/COMMIT can't be retrofitted via a new migration — but PR D's mig 2
  is GAP-FREE by construction and will carry an accurate comment + document the mig-1 correction.
- **F6 [bot] types `unknown`→`string`**: REJECTED — `supabase gen types` genuinely emits `unknown` for tsquery
  (verified by regen); committing `string` would drift from the generator. The committed surgical 1-line edit
  uses the genuine regen value; pre-existing unrelated drift (CLI reformat + c02 tables) stays out of scope.
- **F2/F3a/F3b [bot] cosmetic dead-code** (`group_q IS NOT NULL` always-true; `ELSE :=NULL` redundant;
  `numnode` in WHERE redundant): REJECTED — behavior-identical cosmetics; editing the TEST-applied mig 1 for
  them would create cosmetic TEST/PROD function-text drift; and the `numnode` guard is design-LOCKED (GATE-A
  F2 defensive). The PR D search_lessons (mig 2) supersedes mig 1's anyway.
- **F5 [bot:NOTE] rollback re-introduces the pre-C41 stop-word `to_tsquery` crash, undocumented**: ACCEPTED —
  the `.sql.rollback` is never CI-applied (freely editable); add a doc comment. Fold into PR D's work.

**Branch:** `feat/wave6-c41-and-of-ors` (off `48ad150`). Migration `20260629000000_c41_and_of_ors_term_combination.sql`
+ `.sql.rollback` shipped in commit `60f24d6`. Prefix sorts after the latest overall
`20260626000000_c02_enforce_check.sql` (no same-day bare-date `20260629_` → no ASCII trap).

**Last commit on main:** `48ad150` (PR A #568 squash-merge). PR B branched off it.

**Gold-set added (user-confirmed):** 5 probes q36/q37/q38/q40/q41 (predicate + maxTotalCount) — **q39 was
dropped in the round-1 fix-up** (it was a word-order duplicate of q36; Postgres FTS is order-independent, so
both measured an identical 583/2-of-10). q36 `food waste decay`, q37 `food scraps decomposition`, q38 `worm
compost food waste`, q40 `decompasition food waste` (typo recall-cliff CANARY — lenient `>=4/10`; an unmet
bar after C41 is the PR-D trigger), q41 `decay of food` (stop-word-middle: "of" survives parseSearchQuery's
FILLER list but must be dropped at the SQL layer via numnode). Pre-existing guards q06/q28 bumped 567→568
(benign TEST drift). The no-crash stop-word-heavy case is NOT a gold probe — it's covered by PR B Task B.3's
MCP `the of and` assertion (the app parser would mask it). Probes read RED by design. **R2 refinement:**
q36/q41 predicates also match title/summary ILIKE `'%decay%'` (the literal query term) so post-C41
precision isn't understated; q06/q28 provenanceNotes + new-bullet `≥` glyphs synced.

**Pre-next-PR verification (if any):** none for PR A (additive, no DB). PR B needs full TEST+PROD MCP verify.

**What ships, in order:** PR A = multi-term eval probes + before-baseline (`test/…`, additive) → PR B =
the C41 migration (`feat/wave6-c41-and-of-ors`, full DB discipline + GATE 2, eval-gated) → PR C = C42
go/no-go spike doc (`docs/…`, no code). PR D (two-pass relax) contingent on a measured recall cliff.

## Recent decisions worth carrying forward

- **Approach = strict AND-of-ORs via tsquery algebra, eval-gated** (both Claude + Codex converged;
  design §3). NOT quorum/ranking (only reorders the flood, leaves `total_count` inflated) and NOT
  two-pass-relax-upfront (held as a contingent fallback).
- **Build with `plainto_tsquery` + `||` + `&&` + `numnode`, NOT string concatenation / `to_tsquery`**
  (GATE-A F1: `to_tsquery` parses synonym metacharacters → injection/syntax risk; `plainto_tsquery`
  neutralizes them).
- **`search_lessons` must guard the FTS predicate on `expanded_tsquery IS NOT NULL AND numnode(...) > 0`**
  (GATE-A F2) — its only browse short-circuit today is the raw-text `search_query = ''` check, which
  won't catch a non-empty query that resolves to an empty tsquery.
- **Default mechanism: return `tsquery` (DROP+CREATE + re-GRANT + NOTIFY pgrst + types-regen); fallback
  to `text` return only if Task B.1's caller-grep finds a hidden caller** (GATE-A F3).
- **The eval harness `scripts/search-eval/` (`npm run eval:search`) is the gate** — frozen gold set,
  proven on the decay→decomposition change (recall 0.642→0.728, zero regression). It is NOT run by any
  CI workflow, so PR A's intentionally-red probes don't break CI (Codex-verified in GATE B).
- **Current flood evidence:** `food waste` = 568 results / 2-of-10 precision (`scripts/search-eval/scorecards/test.md:67`).

## Done

- ✅ **Scaffold (Session 1, 2026-06-29)** — four docs authored: design (Locked), implementation (PR A/B/C
  concrete tasks), kickoff, this status. Built on a 2-agent code survey (roadmap W6/W7 + the live search
  implementation) + a Codex approach-opinion pass, all folded into the design. GATE A (Codex on the design
  doc) + GATE B (Codex on the impl plan) ran and were folded BEFORE the commit.

## In flight

(none — scaffold session; execution starts next)

## Blocked

(none — PR A Task A.1 is a user-verdict checkpoint on the probe predicates, which is expected, not a blocker)

## Decisions made during execution

- **Task B.1 (2026-06-29, Session 3): DEFAULT PATH (expander returns `tsquery`).** Caller-grep proved the
  only live runtime caller of `expand_search_with_synonyms` is `search_lessons` (`20260622010000_*:199`); no
  hidden caller in `src/` or `supabase/functions/`. So the return-type change (`text`→`tsquery`) is safe under
  the default path: DROP+CREATE the expander, redefine `search_lessons` to consume the tsquery + empty guard,
  re-GRANT both, `NOTIFY pgrst`, regen types. No fallback (`text`-return) needed.
- Standard-mode scaffold (design Locked, not Draft): both strategy AND mechanism were settled in the
  brainstorm + two Codex passes, so the design ships Locked and the impl plan ships with concrete tasks
  (no design-lock Session 1 needed).
- Scaffold docs are bundled into ONE docs PR with the Wave-5 close-out edits (status-doc reconciliation +
  Sessions 6–7 archival) to avoid two docs-only CI cycles (`feedback_no_docs_push_during_pr`).

## Out-of-scope follow-ups captured here

- C42 BUILD + its prereqs C07 (embedding vector-space mismatch) / C01 (full-corpus regen) / C09 (dedup
  rework) — PR C only *scopes* them.
- **C42 spike (PR C) should name adopt-vs-build OSS options** alongside the in-house pgvector path:
  **ParadeDB** (`pg_search` Elasticsearch-grade BM25 — runs as a SEPARATE Postgres instance that logically
  replicates Supabase data, zero-ETL sync; NOT an in-database extension; could cover keyword + hybrid/vector
  in one Postgres-native engine) and **Meilisearch / Typesense** (typo-tolerance + ranking out of the box,
  optional vector). Raised by the 2026-06-29 `/btw` OSS-search question. Do NOT act mid-flight — finish C41;
  these are deliberate evaluations for the spike, and each re-introduces a second service + sync + a separate
  RLS/permissions story (the exact reasons the project dropped Algolia for PG FTS). **Detailed input notes
  (candidate table + verified ParadeDB-logical-replication architecture + recommendation) live in the NEW,
  UNCOMMITTED file `docs/plans/2026-06-29-c42-search-engine-options-notes.md`** — fold into PR C when the
  spike is written, or commit standalone then; do NOT let it ride the PR D commit history.
- **Phrase/collocation precision follow-up (C41 residual, USER-TRACKED 2026-06-29 Session 4).** Strict
  AND-of-ORs regresses top-10 precision on phrase-like multi-word queries that are NOT genuinely "every word
  AND'd" concepts — worst measured: `taste test` **7/10→1/10** (becomes taste & test → surfaces quiz/test
  lessons over taste-test activities; stays strict at 32 ≥ K so the relax does NOT rescue it), also `three
  sisters garden` 0.900→0.800. No in-scope fix — a real one needs phrase-aware search (`phraseto_tsquery` /
  `<->` adjacency, or a curated phrase entry for known collocations). User ACCEPTED the trade to ship C41+PR D
  and track this. Candidate for a future search wave (bundle with C162 unaccent). NOT a blocker for PR D merge.
- C162 (unaccent / accent-insensitive search) — independent; a full `search_vector` rebuild; bundle with a
  future trigger-rebuild migration.
- C43 (rejected single-token synonym pairs preserved as C42 seed data) — belongs to the C42 build.
- C121 / C122 (Google SSO / admin 2FA) — the other Wave-6 cluster; separate initiative.
- ~~Two-pass relax (PR D) — contingent on PR B's eval showing a recall cliff.~~ **DONE** — the cliff
  materialized (frozen-recall 0.728→0.688 on strict-AND) and PR D was built + merging on #569 (mig
  `20260629010000_*`); no longer out-of-scope.
- New pgTAP search-test infrastructure — only a lightweight expander assertion is in scope.

## Pointers to durable context

- Kickoff prompt: `2026-06-29-wave6-search-depth-kickoff.md`
- Design doc: `2026-06-29-wave6-search-depth-design.md` (Locked; §3-4 = the SQL specifics + GATE-A fixes)
- Implementation plan: `2026-06-29-wave6-search-depth-implementation.md` (PR A/B/C tasks)
- Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md` (§Wave 6)
- Predecessor: auto-memory `project_search_modernization` (S0–S3 shipped; this is the deferred "deeper G2")
- Memory: `project_deferred_work_campaign`, `reference_ci_flakes`, `reference_database_pipeline`,
  `feedback_data_safety_top_priority`

## Session log

### Session 1 — 2026-06-29 — scaffold (Wave-5 close-out + Wave-6 search-depth kickoff)

Major events:
- **Wave 5 confirmed fully closed** (PR 0–2 #552–#555 + follow-up #556 all merged; `HEAD = b9514de`).
  Reconciled the stale Wave-5 status doc to CLOSED + archived its Sessions 6–7.
- **Brainstormed the next initiative** (user: Wave 6 search-depth, "land C41 well, scope C42"). 2-agent
  code survey (roadmap W6/W7; live search implementation) + a Codex approach-opinion pass → approach locked
  = strict AND-of-ORs via tsquery algebra, eval-gated.
- **Authored the four-file scaffold** (design Locked, impl PR A/B/C, kickoff, this status).
- **GATE A (Codex on design doc)** — folded 5 findings (F1–F5; design §§2–7). **GATE B (Codex on impl
  plan)** — NO blockers (SQL-sketch fold logic / guard / `STABLE` all PASS); folded 5 SHOULD-FIXes:
  caller-grep live-vs-historical classification, runnable `public.search_lessons('food waste decay')`
  probe (ellipsis removed), added RPC-level `count(*) … 'the of and'` empty-tsquery probe, `*.sql`-filtered
  migration-order check + corrected latest-overall baseline (`20260626000000_*`) + same-day ASCII trap note,
  and "preserve the existing `COALESCE(ts_rank,0)`".
- **Next session:** paste the kickoff → execute PR A Task A.1 (user-verdict on probe predicates).

### Session 2 — 2026-06-29 — PR A built + pushed (#568)

Major events:
- **Merged scaffold docs PR #567** (`f12bbf3`) to main (user-authorized) so PR A branches off a main that
  carries the reference docs. All substantive checks were green (UNSTABLE was only the pending `claude-review`).
- **PR A Task A.1 (`[user-verdict]`) DONE** — proposed 7 multi-term eval probes + predicates; user approved.
- **PR A Task A.2 DONE** — added probes + captured the TEST before-baseline; first commit `3680278`.
- **GATE 3 (pre-push: code-reviewer + Codex `gpt-5.5`, parallel)** — code-reviewer CLEAN (traced every
  predicate against `predicate.ts` grammar, JSON valid, no collateral edits, scorecard arithmetic checks).
  **Codex found one real issue:** two probes (`compost for the garden`, `lesson about the garden`) used
  connector words that `parseSearchQuery`'s FILLER list (`lesson/lessons/for/about/a/an/the`) strips BEFORE
  the RPC, so they never reached/tested the SQL-level stop-word handling. **Folded (user-confirmed):** q41 →
  `decay of food` ("of" survives FILLER, dropped at SQL via numnode — a genuine, discriminating test); **q42
  DROPPED** (no-crash case relocated to PR B Task B.3's MCP `the of and`). Commit amended → `0c1e9cb` (6
  probes q36–q41). q36–q40 + single-term controls (q21/q23/q24/q29) verified byte-identical.
- **PR #568 opened**, base main. Probes read RED by design (`npm run eval:search` is not a CI gate).

Decisions / learnings:
- **parseSearchQuery two-filter insight (load-bearing for C41 probe design):** the app-layer FILLER list
  (`lesson/lessons/for/about/a/an/the`) ≠ the SQL FTS stop-word list (`of/and/in/...`). A true SQL stop-word
  probe must use a word the app parser KEEPS but FTS DROPS (of/and/in). This is why q41 uses `decay of food`.
- **TEST-DB drift:** the prior committed scorecard was 11 days stale (`18bd28b`, 2026-06-18). The refreshed
  baseline picks up benign per-query drift on untouched rows (q06 567→568, q08 14→22, q19 91→107, q26
  470→499, q28 567→568, etc.; corpus stayed 745). **PR B must compare LINE ITEMS, not aggregate counts** —
  and re-baseline close in time to PR B's after-run to minimize interim drift.
- Two pre-existing gold guards now barely tripped by drift (q06 `rotting food` 568 vs 567, q28 `mexican food`
  568 vs 567). NOT a PR A concern; C41 will likely pull both back under guard (both are 2-word queries that
  AND-collapse). Out-of-scope to re-tune old guards here.

**Round 1 (bot triage) — DONE.** `claude-review` PASSED + posted 3 findings (reviews/line-comment surfaces
empty; four-surface confirmed). All real, all measurement-quality (no DB/correctness bug): (1) q36 `food
waste decay` ≡ q39 `decay food waste` — identical query (FTS ignores word order; scorecard confirmed both
583/2-of-10) → **user: drop q39**; (2) q06/q28 guards stale at 567 (TEST now 568) → **user: bump both to
568**; (3) new provenance bullets used ASCII `-` vs existing em-dash `—` → aligned. Folded into fix-up
`b993699` (q39 dropped → 5 probes; q06/q28→568; em-dash). Bot also positively CONFIRMED the q41 `of` fix and
q39's predicate scoping. GATE 4 not separately dispatched — findings were empirically verifiable from the
scorecard (identical numbers / 568-vs-567), not product/DB-code changes. Round-cap: 1 of 2 used.

**Round 2 (bot triage) — DONE.** Pushed `b993699`+status (`aebfdb5`); `claude-review` PASSED again + posted
3 more findings (reviews/line-comments empty; four-surface confirmed). All real, measurement-quality: (1)
q41 (and q36) predicate omitted `%decay%` — the literal query term — so post-C41 precision would be
understated → **added `%decay%` to q36/q41** (rejected the bot's `%rot%`: over-matches carrot/protein/
rotation); (2) q06/q28 `provenanceNote` still said 567 → synced to 568; (3) new gold-provenance bullets used
ASCII `>=` vs existing `≥` (U+2265) → aligned. Bot also refuted 2 non-issues (q38 red is by-design; stale
PR-body table → fixed via `gh pr edit`). Folded as a **Workflow** (executor → adversarial verifier; verifier
confirmed `%decay%` over-match risk LOW + before still RED) → commit `6c83675`. Notable: `%decay%` left the
before-baseline byte-identical (the flooded top-10 carry no `decay` token yet — it only bites post-C41), so
the commit is just the 2 source files. Round-cap: **2 of 2 used**.

**Round 3 (bot triage) — DONE (folded past round-cap, user-approved).** Pushed `6c83675`+status (`270421f`);
`claude-review` PASSED a 3rd time + posted 3 more findings, all valid but trivial (doc/dead-code, zero
measurement impact): (1) q38's note over-claimed "reads red by design" — its predicate already passes 10/10
pre-C41, so q38 is a flood-COUNT guard, not a precision probe → note/description clarified; (2) q38's
`%vermicompost%` clauses are dead (subsumed by `%compost%`) → removed (scorecard byte-identical, proving
inert); (3) gold-provenance q06 spec line still said ~567 → synced to ~568. Bot refuted 3 non-findings
(q40-no-`decay` intentional; q37 6/10 expected; q38/q40 sharing q37 SQL fine). Folded → `4f5ebfd`. User chose
"one quick fix-up then merge" past the 2/2 round-cap (findings concrete + cheap + improve the durable baseline).

Next step: squash-merge #568 (user-authorized) → PR B Task B.1 (return-type caller-grep) off updated main.

### Session 3 — 2026-06-29 — PR B built+verified+pushed (#569); eval → recall cliff → PR D chosen

Major events:
- **PR A confirmed merged** (`48ad150` on main); status reconciled (git ahead of the prior "merging" header).
- **PR B Task B.1 DONE** — caller-grep → DEFAULT PATH (only `search_lessons` calls the expander; commit
  `2346dcb`).
- **PR B Task B.2 DONE** — migration `60f24d6` (strict-AND expander returning tsquery + two-pass-free
  search_lessons + rollback + 1-line types regen). Authored by an Opus executor; SUPERVISOR-VERIFIED (mechanical
  verbatim diff of search_lessons vs wave4_pr2 = only the 4 intended edits; expander synonym-logic verbatim from
  w1b; local db reset + test:rls + npm check pass; local probes exact; rollback live-tested).
- **GATE 2 (Codex gpt-5.5) + GATE 3 (Opus code-reviewer)** ran in parallel — BOTH clean, zero findings. Pushed
  `e0dbdb6` + opened **PR #569**. CI green (e2e applied the migration to TEST; all 4 Claude bot reviews success).
- **B.3 TEST verify (MCP):** flood collapsed on real data — `food waste decay` 583→18, `food waste` 568→37,
  `the of and` no-error. **B.3 eval (after-scorecard):** flood FIXED (maxTotalCount violations 6→0) but RECALL
  CLIFF (frozen-recall 0.728→0.688, frozen-precision 0.833→0.800; `teamwork and cooperation`→0; `bugs that
  pollinate flowers` 174→5/precision 9/10→1/5; typo canary q40 tripped) — the design's PR D trigger.
- **Bot triage of #569** (all 4 surfaces): F1 (atomicity comment WRONG + naked DROP+CREATE — recalibrated; bot
  over-stated, mis-cited convention; resolved via PR D's gap-free mig 2) ; F6 (`unknown`→`string` REJECTED — CLI
  emits unknown, verified) ; F2/F3a/F3b cosmetic dead-code REJECTED (TEST-applied → would drift; numnode guard
  is design-LOCKED) ; F5 rollback doc comment ACCEPTED (fold into PR D). Rebuttal pass committed in Current State.
- **USER DECISION: build PR D (two-pass relax).** Full design settled + recorded in Current State (mechanism, OR
  companion, K=10 eval-tuned, count structure, the RE-FLOOD-ON-RELAX nuance + q40 gold-guard adjustment needing
  user sign-off, the gap-free 2nd-migration structure).

Decisions / learnings:
- **e2e.yml does BOTH a dry-run comment AND a real `supabase db push` to TEST** (line 126) — the "dry-run" PR
  comment is informational; the migration IS applied to TEST (MCP-confirmed). Don't be misled by the dry-run text.
- **Repo migration convention re-confirmed:** the Supabase CLI is AUTOCOMMIT (no per-file transaction wrapper) —
  authoritative source is `c02_retag_apply.sql:60-63`. Only 1 migration uses explicit `BEGIN;/COMMIT;` (c02, for
  a LOCK); function-redef migrations (w1b, wave4_pr2) ship UNWRAPPED. So a DROP+CREATE has a (here-negligible)
  gap; prefer ADDITIVE/CREATE-OR-REPLACE-only migrations (like PR D's mig 2) to avoid it.
- **`npm run db:types` has an internal `> src/types/database.types.ts` redirect** — running it OVERWRITES the
  committed file with the full noisy CLI reformat (≈2007 lines + unrelated c02 tables). To inspect regen output
  without clobbering, capture differently or `git checkout` to restore. The committed types file uses scoped
  surgical edits by design.
- **`supabase gen types` maps `tsquery` → `unknown`** (not `string`) — so the surgical `Returns: unknown` is
  correct; a `string` "fix" would drift from the generator.
- Two-pass-full-OR relax RE-FLOODS broad-term near-empty queries (q40) — the blunt edge of the design's chosen
  mechanism (it rejected quorum). Acceptable as recall-over-precision for near-empty queries; needs the q40
  gold-guard adjustment.

Next session (PR D BUILD): read this status doc's PR D DESIGN block (complete spec) → get user sign-off on the
q40 gold-guard change → dispatch executor for mig 2 (`20260629010000_*`: OR companion + two-pass search_lessons
+ rollback) → verify + eval-tune K on TEST → GATE 2 → fold F5 rollback comment → push to #569 → re-triage →
(user) merge → PROD verify. PR C (C42 spike) still pending after PR B/D close.

### Session 4 — 2026-06-29 — PR D built + 4× verified + pushing (CI→TEST eval next)

Major events:
- **`/btw` OSS-search-engine detour** (forked agent): ParadeDB / Meilisearch / Typesense surveyed → none worth
  a mid-flight pivot at ~745 lessons (relevance tuning, not scale; project already dropped Algolia for PG FTS);
  all three captured as named adopt-vs-build options for the **C42 spike (PR C)**. Detailed input notes in the
  NEW uncommitted `docs/plans/2026-06-29-c42-search-engine-options-notes.md` (pointer in Out-of-scope below);
  do NOT let it ride the PR D commit history.
- **q40 `[user-verdict]` re-sequenced:** user (understandably) wanted the plot re-grounded; agreed to DEFER the
  q40 gold decision until AFTER the build, when real measured numbers make it concrete. User gave the
  go-ahead to build. (So q40 sign-off now lands post-eval, not pre-build.)
- **PR D BUILT — commit `7af13e2`** (4 files, +685): mig 2 + its rollback + mig-1 rollback F5 doc comment +
  surgical 4-line `database.types.ts` add. Built via a **Workflow** (Opus executor → Opus adversarial verifier;
  `feedback_workflow_orchestration` default under ultracode). Verifier 10/10 SAFE-TO-PROCEED.
- **Supervisor main-loop verify** (load-bearing): read mig 2 end-to-end + git show --stat + `npm run check`
  clean + LOCAL MCP probes (OR companion → `'food' | 'wast' | 'decay' | 'decomposit'`; strict-AND expander
  UNCHANGED; `'the of and'`→NULL; single-term parity; all `search_lessons` calls no-error).
- **GATE 2 Codex (`gpt-5.5`, read-only, inline)** — all 10 adversarial checks PASS, SAFE-TO-PROCEED (two-pass
  correctness, three-WHERE mechanical zero-diff, gap-free, OR-companion equivalence, NULL/rank safety,
  GRANT/NOTIFY, rollback==mig-1 verbatim, idempotency, trigram interaction, injection). Confirmed the 3 known
  tradeoffs are correctly implemented. GATE 3 (pre-push code-review + adversarial Codex on the diff) treated as
  satisfied by the workflow verifier + GATE 2 Codex on this exact diff.
- **K=10 validated read-only on TEST** (mig-1 strict-AND `total_count` per gold query = the `cnt_and` PR D
  compares): clean gap 5↔11 (see Current task). No tuning needed → chose the canonical data-safe flow: push →
  CI applies mig 2 to TEST → eval there (NOT a manual MCP CREATE-OR-REPLACE on TEST).

Decisions / learnings:
- **K=10 needs no pre-push MCP tuning** — the read-only `cnt_and` probe (calling the already-TEST-applied mig-1
  strict-AND `search_lessons`) fully validates the relax partition without writing any function to TEST. This
  supersedes the PR D DESIGN block's "CREATE OR REPLACE candidate-K on TEST via MCP" step (which was contingent
  on K being uncertain). Cleaner + more data-safe (CI applies; MCP read-only verifies).
- **`taste test` (32 results, ≥K) is a residual** the relax does NOT fix — a strict-AND precision dip on a
  healthy-count 2-term query, outside PR D's near-empty-recall-cliff remit. Surface it honestly in the eval
  writeup; it is NOT a PR D regression to chase here.
- Workflow template-literal gotcha: `String.raw` + escaped backticks broke the script parser; rewrote prompts
  as a `[...].join('\n')` array of plain single-quoted strings (no backticks/backslashes inside).

Next step: push `7af13e2` + this status checkpoint → wait for CI to apply mig 2 to TEST → `npm run eval:search`
(target=test) after-scorecard + MCP TEST verification probes → bring user the scorecard + q40 measured numbers
for the `[user-verdict]` gold change → edit q40 → re-eval (final committed after-scorecard) → bot triage of
#569 → (user) merge → PROD verify. Then PR C (C42 spike).

**Session 4 (cont.) — pushed + eval + user decisions:**
- Pushed `f883e2b` (mig 2 + status). CI applied mig 2 to TEST within ~1 min (MCP-confirmed: OR companion +
  relax present). Behavioral verify on TEST: cliffs recovered (teamwork 0→44, q09 5→174), floods held
  (fwd=18, q38=11), q40 re-floods 2→568, `the of and`→1 (trigram, no-error), compost=178 unchanged.
- `npm run eval:search` (target=test) FINAL scorecard, diffed vs the committed pre-C41 flat-OR baseline:
  recall 0.728 (zero net loss; strict-AND's cliff at 0.688 fully recovered), precision 0.833→0.800
  (collocation dip), maxTotalCount violations 6→0 (after q40 repurpose), dup-flood 0, predicate 14/21.
- **User decisions:** (1) merge + track the phrase/collocation precision follow-up (taste test 7/10→1/10) —
  recorded in Out-of-scope; (2) q40 repurposed to a recall-recovery probe (drop maxTotalCount, bar ≥3/10) —
  `queries.json` + `gold-provenance.md` edited (user-signed-off frozen-gold change), re-eval → 0 violations.
- Learnings: the committed `scorecards/test.md` on disk was the FLAT-OR baseline (Session 3's strict-AND
  scorecard was uncommitted + reverted), so the PR's scorecard diff correctly shows the full flat-OR→relax
  delta. Predicate threshold is parsed from the predicate `description` `>=N/10` (no separate field) — so the
  q40 bar change is the `>=4`→`>=3` text edit. Fix-up push next: q40 gold + provenance + final scorecard +
  this status.
