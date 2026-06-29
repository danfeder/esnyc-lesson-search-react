# Wave 6 — Search Depth (C41 + C42 spike) Execution Status

**Last updated:** 2026-06-29 by Session 1 (scaffold)

## Current State

**Phase:** **SCAFFOLD COMPLETE — ready to execute PR A.** Four-file kit authored on 2026-06-29.
Design **Locked** (Standard mode — strategy + mechanism both settled at scaffold time). **GATE 1A
(design) + GATE 1B (impl plan)** both ran (Codex `gpt-5.5`, inline) and folded during scaffolding —
GATE A folded 5 findings (F1 `plainto_tsquery` not `to_tsquery`; F2 empty-tsquery RPC guard; F3 honest
two-function DROP+CREATE scope; F4 types-regen; F5 C42 provenance-as-risk). No implementation code yet.

**Active PR:** none — not yet branched. **Next:** PR A Task A.1.

**Current task:** **PR A Task A.1 — propose the multi-term eval-probe predicates and get the user's
sign-off** (`[user-verdict]`: the gold `queries.json` is product-owner-frozen, so new entries +
predicates need confirmation BEFORE editing). Then A.2 (add probes + capture before-baseline scorecard).

**Branch:** `main` (PR A branch `test/wave6-search-eval-multiterm-probes` not yet cut).

**Last commit on branch:** (none)

**Last commit on main:** `b9514de` (Wave-5 follow-up #556). *(The scaffold docs commit — bundling these
four files with the Wave-5 close-out — is the first commit of this initiative; see session log.)*

**Pre-next-PR verification (if any):** none. PR A is additive (eval probes only), no DB, no TEST verify.

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
