# Wave 6 — Search Depth (C41 + C42 spike) Execution Status

**Last updated:** 2026-06-29 by Session 2 (PR A pushed, #568)

## Current State

**Phase:** **PR A IN REVIEW — round-1 bot triage DONE.** PR A (**#568**) pushed; `claude-review` passed +
3 findings folded (fix-up `b993699`); awaiting round-2. Task A.1 (`[user-verdict]` on probe predicates)
DONE; Task A.2 (add probes + before-baseline) DONE + amended after a GATE-3 fold. Design **Locked**. GATE 1A/1B folded during scaffolding (5 GATE-A findings: F1 `plainto_tsquery`
not `to_tsquery`; F2 empty-tsquery RPC guard; F3 two-function DROP+CREATE scope; F4 types-regen; F5 C42
provenance-as-risk).

**Active PR:** **#568** `test/wave6-search-eval-multiterm-probes` → main (additive eval probes; no DB, no CI
eval gate). **Next:** four-surface triage of #568 → (user) merge → PR B (`feat/wave6-c41-and-of-ors`).

**Current task:** **PR A bot triage** (PER-PR steps 3–8). Then PR B Task B.1 (caller-grep return-type path)
once #568 merges to main.

**Branch:** `test/wave6-search-eval-multiterm-probes` (PR #568). **Last commit:** `b993699` (round-1 fix-up;
status-doc commit on top).

**Last commit on main:** `f12bbf3` (scaffold docs PR #567, merged this session). PR A branched off it.

**Gold-set added (user-confirmed):** 5 probes q36/q37/q38/q40/q41 (predicate + maxTotalCount) — **q39 was
dropped in the round-1 fix-up** (it was a word-order duplicate of q36; Postgres FTS is order-independent, so
both measured an identical 583/2-of-10). q36 `food waste decay`, q37 `food scraps decomposition`, q38 `worm
compost food waste`, q40 `decompasition food waste` (typo recall-cliff CANARY — lenient `>=4/10`; an unmet
bar after C41 is the PR-D trigger), q41 `decay of food` (stop-word-middle: "of" survives parseSearchQuery's
FILLER list but must be dropped at the SQL layer via numnode). Pre-existing guards q06/q28 bumped 567→568
(benign TEST drift). The no-crash stop-word-heavy case is NOT a gold probe — it's covered by PR B Task B.3's
MCP `the of and` assertion (the app parser would mask it). Probes read RED by design.

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

Next step: push `b993699` + status doc → wait for round-2 bot → (user) merge #568 → PR B Task B.1 (return-type caller-grep).
