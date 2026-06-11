# PR 5 — D4 Vocabulary Canonicalization — Execution Status

**Last updated:** 2026-06-11 by Session 0 (scaffolding)

## Current State

**Active PR:** none — pre-Session-1 (scaffolding committed; design doc is Draft)

**Current task:** Session 1 = design-lock session. Answer design doc §4's 9 open mechanism
questions (discovery reads/queries → locked answers → author concrete PR 5a tasks into the impl
plan). NOT a code session.

**Branch:** scaffolding landed on `tools/concepts-worksheet-form` (the active working branch when
this track spun up — also carries the concepts verdict archive `0c33808`). Session 1 should
confirm with the user how this branch reaches `main` before/with PR 5a, since PR 5a's branch cuts
from `main` and needs the verdict archive present.

**Last commit on main:** (check at Session 1 start — `git log --oneline -3 main`)

**Pre-Session-1 verification:** none. Inputs are ready: heritage worksheet verdicts in `main`
since 2026-05-12 (PRs #491/#492); concepts verdict archive at
`docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` (commit `0c33808`,
on `tools/concepts-worksheet-form`, validated: 119 keep / 82 merge / 7 drop, clean merge graph).

## Recent decisions worth carrying forward

- 2026-06-11 strategic scope locked via user Q&A: heritage+concepts only / two PRs heritage-first /
  data + keep-filters-working. See design doc §3.
- 2026-06-11 concepts merge-cycle resolutions (preservation survives; sorting survives as
  "Sorting and Categorization", key rename in PR 5b; seasonality absorbs seasonal family) are
  curriculum-team-direction-level decisions — implementation never reopens them.

## Done

(empty — fill as work completes)

## In flight

(none yet)

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

### Session 0 — 2026-06-11 — scaffolding

Major events:
- Four-file scaffold created via /kickoff-feature after concepts verdicts returned + archived and
  heritage verdicts confirmed already integrated (stale-memory correction).
- Strategic scope locked via user Q&A (3 questions, all recommended options accepted).
- Design doc intentionally Draft: 9 mechanism questions enumerated in §4 for Session 1 to lock.
