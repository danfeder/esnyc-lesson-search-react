# PR 5 — D4 Vocabulary Canonicalization — Execution Status

**Last updated:** 2026-06-11 by Session 2 (PR 5a built + opened + TEST-verified)

## Current State

**Active PR: #504 — PR 5a heritage canonicalization, OPEN, TEST-verified, awaiting merge
decision.** Tasks A.1–A.4 complete; A.5 is at step 4-5 (bot round 1 triaged, merge gated on
user instruction). Branch `feat/pr5a-heritage-canonicalization`.

**What's on the PR:** vocab artifact `data/vocab/cultural-heritage.vocab.json` (71 canonicals /
88 alias_map entries / provenance, emitted by the parser's new `--emit-json` mode with
fail-loudly self-checks); deterministic generator `scripts/generate-heritage-rewrite-migration.py`;
migration `20260611000000_pr5a_heritage_canonicalization.sql` (snapshot → rewrite → post-verify;
idempotent); probe file + rehearsal evidence doc. Zero `src/` changes (predicted by design,
proven: 577 unit tests pass untouched).

**TEST verification (2026-06-11, post-CI-apply): ALL PROBES GREEN.** (a) 60 distinct / 916
appearances, zero non-canonical survivors; (b) zero alias rows, column + metadata; (c) 916
appearances, set_mismatch 0; (d) per-slug reach unchanged except `european` +1 — explained
strict improvement (kebab-only `eastern-european` row now reachable via parent); (e) all 5
ex-'Native American' lessons FTS-match 'Indigenous'; (f) idempotent (0 rows); backup table 34
rows, RLS on, 0 policies.

**Two probe-spec learnings (both corrected in the probe file, carry into PR 5b):**
(1) mirror integrity is SET equality, not byte equality — 5 live TEST rows have pre-existing
order-only column⇄metadata diffs (§J's `_meta_array_matches_column` is order-insensitive);
(2) parent-slug expansions lack child kebab variants, so canonicalization can INCREASE parent
filter reach (never decrease).

**Bot round 1 (all four surfaces):** database-review clean; code-review 5 findings — triaged
2 reject (style/below-bar), 1 already-done (evidence doc), 1 verified-no-action (slug list
exhaustive), 1 reject (snapshotted_at). Security & Dependencies CI failure is pre-existing
npm-audit noise (fails on main; known @lhci/cli follow-up).

**Next:** user merge decision → PROD migration approval → PROD before-census (regenerate
'Native American' id list FROM PROD!) → apply → full probe set via `mcp__supabase-remote` →
record in evidence doc. PR 5b is gated on PROD-green.

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
- Session 2 (2026-06-11): Tasks A.1–A.4 complete; PR #504 opened; TEST probes all green;
  bot round 1 triaged.

## In flight

- PR #504 (PR 5a) — open, TEST-verified, awaiting user merge decision + PROD approval.

## Blocked

(none)

## Decisions made during execution

- 2026-06-11 (S2): probe (c) mirror check corrected to SET equality (the §J invariant) after
  the byte-equality version flagged 5 pre-existing order-only rows — none touched by the
  rewrite. Probe file documents the 5 lesson_ids.
- 2026-06-11 (S2): probe (d) `european` 54→55 accepted as explained improvement (parent
  expansions lack child kebab variants; the kebab-only row gains parent-filter reach).
- 2026-06-11 (S2): bot round 1 — rejected subprocess-import-placement + --emit-date validation
  + snapshotted_at column (all below the "visible bug or DB risk" bar); slug-list exhaustiveness
  verified against filterDefinitions.ts (18 = 5 parents + 13 children).

## Out-of-scope follow-ups captured here

- 5 live rows carry pre-existing order-only column⇄metadata heritage diffs (lesson_ids in the
  probe file / evidence doc). Harmless under §J set-semantics; would self-heal on any future
  column write to those rows. Not PR 5a's to fix.
- `test:rls` has 2 pre-existing local-env scenario failures (`archive_duplicate_lesson`
  validates-existence / prevents-self-archiving) — fail identically on baseline without the
  PR 5a migration (stash-verified). Worth a look someday; not blocking.

## Pointers to durable context

- Kickoff prompt: 2026-06-11-metadata-rebuild-pr5-canonicalization-kickoff.md
- Design doc: 2026-06-11-metadata-rebuild-pr5-canonicalization-design.md (Draft until Session 1)
- Implementation plan: 2026-06-11-metadata-rebuild-pr5-canonicalization-implementation.md (skeleton)
- Parent initiative status: 2026-05-03-metadata-rebuild-foundation-execution-status.md
- Verdict inputs: 2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md (§16) +
  2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md

## Session log

### Session 2 — 2026-06-11 — PR 5a build + open + TEST verification

Major events:
- A.1: `--emit-json` mode on `parse-heritage-worksheet.py` (TDD: red on unrecognized flag;
  negative tests — bogus verdict refuses emit, unresolvable merge_into trips self-check +
  collision detector). Artifact emitted byte-stable; TEST coverage probe zero unresolved
  literals. Commit `f240af6`.
- A.2: generator + migration `20260611000000`. Local rehearsal: seeded drift row
  `['Native American','Indigenous','north-american']` → `['Indigenous','North American']`,
  mirror + FTS + backup verified, full-file re-run idempotent. Stash-tested test:rls baseline
  to prove the 2 scenario failures pre-exist. Commit `789a9db`.
- A.3: zero `src/` diff + 577 tests pass — design prediction held. (recorded, no commit needed)
- A.4: probe file (literals mechanically diffed vs artifact — exact) + evidence doc with TEST
  before-census (42 alias appearances / 34 rows — refines Session 1's "~36" estimate; zero
  dedup collisions; per-slug reach + expansion-membership evidence). Commit `3b11c5a`.
- A.5: pre-push reviewer (opus) — no blocking findings, 2 informational notes (both fail-safe
  by construction). Pushed; PR #504 opened. CI applied migration to TEST; FULL PROBE SET GREEN
  (with the set-equality + european+1 refinements above). Bot round 1 collected from all four
  surfaces and triaged: db-review clean, code-review 5 findings (2 reject, 1 done, 1 verified,
  1 reject), Security & Dependencies failure pre-existing on main.
- Operational notes: local supabase storage container threw transient 502s on `db reset`
  (DB state fine each time — confirmed via debug log + MCP); TEST DB responsive throughout.

Commits: `f240af6`, `789a9db`, `3b11c5a`, TEST-results docs commit, this status commit
(docs commits pushed bundled, per feedback_no_docs_push_during_pr).

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
