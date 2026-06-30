# Wave 6 — Search Depth (C41 + C42 spike) Execution Status

**Last updated:** 2026-06-29 by Session 3 (PR A merged; PR B B.1+B.2 done + all 3 gates clean; pushing)

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

**Active PR:** none yet — PR B not pushed. Migration not yet authored.

**Current task:** **PR B Task B.2** — author the migration (default path: DROP+CREATE the `tsquery`-returning
expander via `plainto_tsquery`/`||`/`&&`/`numnode`; redefine `search_lessons` consuming the tsquery + empty
guard; re-GRANT both; `NOTIFY pgrst`; types regen) + the rollback migration. Then local `db reset` +
`test:rls` + local eval, GATE 2 Codex, push, four-surface triage, TEST+PROD MCP verify.

**Branch:** `feat/wave6-c41-and-of-ors` (off `48ad150`). New migration prefix: `20260629000000_` sorts after
the latest overall `20260626000000_c02_enforce_check.sql` (no same-day bare-date `20260629_` exists → no ASCII
trap).

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
- C162 (unaccent / accent-insensitive search) — independent; a full `search_vector` rebuild; bundle with a
  future trigger-rebuild migration.
- C43 (rejected single-token synonym pairs preserved as C42 seed data) — belongs to the C42 build.
- C121 / C122 (Google SSO / admin 2FA) — the other Wave-6 cluster; separate initiative.
- Two-pass relax (PR D) — contingent on PR B's eval showing a recall cliff.
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
