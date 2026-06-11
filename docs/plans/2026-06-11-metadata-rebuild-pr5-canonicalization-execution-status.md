# PR 5 — D4 Vocabulary Canonicalization — Execution Status

**Last updated:** 2026-06-11 by Session 1 (design lock)

## Current State

**Active PR:** none — Session 1 (design lock) complete; design doc §4 is LOCKED, PR 5a tasks
A.1–A.5 are authored concrete in the impl plan. Next session starts PR 5a execution.

**Current task:** PR 5a Task A.1 (heritage vocab artifact emitter), on branch
`feat/pr5a-heritage-canonicalization` (cut from `main` at `e476f2b`, 2026-06-11). The
branch-landing question is CLOSED: `tools/concepts-worksheet-form` merged to `main` via PR #503
(squash `e476f2b`, 2026-06-11 — wizard tool + concepts verdict archive + this track's four-file
scaffold). Both 5a and 5b inputs and docs are in `main`; no gating remains except 5b-waits-for-5a.

**Design-lock outcomes (full evidence in design doc §4):** parser-driven JSON artifacts in
`data/vocab/` (worksheet-specified shapes); migration-file mechanism with emitter-generated
VALUES mapping + in-migration rollback snapshot tables; heritage rewrite writes the flat COLUMN
(normalize-trigger §J mirrors metadata — column wins, verified in `20260518000000`); concepts
rewrite edits `metadata.academicConcepts` values in place (no flat column, shape + subject keys
untouched); FTS auto-refreshes via trigger; live rows only (`retired_at IS NULL`); concepts'
7 drops deleted from rows; heritage filter alignment expected ZERO `src/` change (proven by
probe (d), not assumed).

**Key TEST-DB facts (2026-06-11 probes; re-verify at execution):** 772 rows total, 21 soft-
retired. Heritage: column⇄metadata mirror EXACT on all 335 populated rows; 77 live distinct
values / 916 appearances; ~36 row-appearances need rewriting (13 kebab literals + 4 semantic
merges). Concepts: 684 rows object-shaped under exactly the 6 subject keys; live rows reproduce
worksheet Appendix A verbatim (663 rows / 208 distinct / 1912 appearances = 100% verdict
coverage); the 4 extra strings live only on retired rows. `academicIntegration.concepts`
dual-source is empty corpus-wide (rescue trigger inert). In-flight submissions carry neither key.

## Recent decisions worth carrying forward

- 2026-06-11 strategic scope locked via user Q&A: heritage+concepts only / two PRs heritage-first /
  data + keep-filters-working. See design doc §3.
- 2026-06-11 concepts merge-cycle resolutions (preservation survives; sorting survives as
  "Sorting and Categorization", key rename in PR 5b; seasonality absorbs seasonal family) are
  curriculum-team-direction-level decisions — implementation never reopens them.
- 2026-06-11 Session 1 user confirmations: (1) rewrite LIVE rows only — retired imports keep
  stale vocab, probes filter on `retired_at IS NULL`; (2) PR 5b rewrites concept STRINGS only —
  no subject-key moves (recommended_primary_subject is PR 6 re-tag input).

## Done

- Session 1 (2026-06-11): design doc §4 Draft → LOCKED (9 mechanism answers + filter-alignment
  finding); PR 5a tasks A.1–A.5 authored concrete; PR 5b carry-forward knowledge captured in
  impl plan; test plan made concrete.

## In flight

(none — next session opens PR 5a)

## Blocked

(none)

## Decisions made during execution

(none yet)

## Out-of-scope follow-ups captured here

(none yet)

## Pointers to durable context

- Kickoff prompt: 2026-06-11-metadata-rebuild-pr5-canonicalization-kickoff.md
- Design doc: 2026-06-11-metadata-rebuild-pr5-canonicalization-design.md (Draft until Session 1)
- Implementation plan: 2026-06-11-metadata-rebuild-pr5-canonicalization-implementation.md (skeleton)
- Parent initiative status: 2026-05-03-metadata-rebuild-foundation-execution-status.md
- Verdict inputs: 2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md (§16) +
  2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md

## Session log

### Session 1 — 2026-06-11 — design lock

Major events:
- Discovery: Explore agent traced every read/write/derive path for both fields (FTS trigger
  `20260521000000`+`20260523000000`; normalize trigger `20260518000000` §J column-wins + §A
  rescue + §V validation; `search_lessons` alias/expansion pipeline; edge-function raw-overlap
  legacy path; parser internals). MCP probes on TEST established the corpus facts now in the
  Current State header. TEST DB was cold-starting at session open (~several min of connection
  timeouts before it woke).
- Verified first-hand (not just agent-reported): `lessons_normalize_write` §J column-wins
  behavior; §V validation scope (3 unrelated keys only); the `20260521000000` corpus-wide
  `SET metadata = metadata` backfill precedent.
- Load-bearing discovery wins: heritage column⇄metadata mirror is EXACT (write the column, let
  the trigger mirror — no dual-write needed); live-row concepts coverage is exactly 100% of
  Appendix A (the 212-vs-208 census delta is entirely the 21 retired rows); concepts keys are
  not invertible to corpus literals (`colonialisms_impact` ↔ "colonialism's impact") → emitter
  must match against Appendix A 1:1.
- User decisions: live-rows-only scope; strings-only in 5b (both recommended options).
- Design doc §4 rewritten Draft → LOCKED with evidence; §5 rollback section updated to match.
  Impl plan: A.1–A.5 authored (emitter → migration generator → frontend no-op proof → probes +
  rehearsal evidence → PR ritual); B.x carry-forward notes; concrete test plan.
- Learnings for execution: the `20260520120000` season-timing repair exists because a corpus-wide
  UPDATE once tripped a CHECK via the normalize trigger — local rehearsal must include a seeded
  drift-row trigger test (in Task A.2 steps); backup tables need RLS enabled with no policies.

Commits: (this session's single docs commit — design lock + impl plan + status)

### Session 0 — 2026-06-11 — scaffolding

Major events:
- Four-file scaffold created via /kickoff-feature after concepts verdicts returned + archived and
  heritage verdicts confirmed already integrated (stale-memory correction).
- Strategic scope locked via user Q&A (3 questions, all recommended options accepted).
- Design doc intentionally Draft: 9 mechanism questions enumerated in §4 for Session 1 to lock.
