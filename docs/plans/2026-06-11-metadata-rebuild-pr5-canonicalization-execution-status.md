# PR 5 — D4 Vocabulary Canonicalization — Execution Status

**Last updated:** 2026-06-11 by Session 3 (PR 5b B-tasks authored; B.1 DONE)

## Current State

**PR 5b is IN FLIGHT on branch `feat/pr5b-concepts-canonicalization` (cut from `main` at
`d7b9ef4`). B-tasks B.1–B.5 are authored concrete in the impl plan (commit `f3f050f`); Task
B.1 is DONE (commit `76f2714`). Next task: B.2 — migration generator + migration file + local
rehearsal.** No PR opened yet; nothing pushed.

**B.1 outcome:** `scripts/emit-concepts-vocab.py` (loads `build-concepts-tool.py` via
importlib — hyphenated filename; `sys.modules` registration required for dataclass
resolution) + committed artifact `data/vocab/academic-concepts.vocab.json`: 119 canonical /
201 alias_map entries / 7 drops; provenance records the `sorting`→`sorting_and_categorization`
rename. Negative tests all refuse loudly (corrupted verdict, broken merge_into, the UNFILLED
source worksheet); emit is byte-stable; spot-checks green (`seasonal eating`→`seasonality`,
`categorization`→`sorting_and_categorization`, `colonialism's impact`→`colonialisms_impact`;
drops = design / discussion / food systems / garden topics / general exploration / historical
context / plant science). **TEST coverage probe: ZERO unresolved literals; corpus facts
re-confirmed live (663 rows / 208 distinct / 1912 appearances — still exactly Appendix A).**
Zero identity literal→label pairs — all 201 aliases are real rewrites (lowercase → Title
Case), so the migration's VALUES list carries all 201.

**B.2 next (authored, not started):** generator `scripts/generate-concepts-rewrite-migration.py`
→ migration `20260612000000_pr5b_concepts_canonicalization.sql` (next-day prefix sorts after
5a's `20260611000000`; re-check at execution). jsonb-only rewrite of
`metadata.academicConcepts`: literal→LABEL per subject array, delete 7 drops, dedupe
first-occurrence, remove emptied subject keys, **remove the academicConcepts key entirely if
the whole object empties** (minor mechanism decision recorded Session 3 — matches the corpus
convention that concept-less rows lack the key). Backup table `pr5b_concepts_rollback`
(lesson_id PK + jsonb), RLS on / no policies. Local rehearsal seeds three edge shapes:
fold-collision dedup, full-empty row, cross-subject literal. Probes (B.4): no filter-reach
analog (concepts isn't a filter field); replaced by a subject-key-integrity probe (d′).

**PR 5a is DONE: #504 merged to main (squash `0b8057f`, 2026-06-11 23:40 UTC) and
PROD-verified — full probe set (a)–(f) green on PROD via MCP (run `27384490534`, all 4 jobs
clean, no SASL flake). PR 5b (concepts canonicalization) is UN-GATED and is the next work.**
PROD outcome: 37 rows rewritten (43 alias appearances), 936 appearances conserved, 60 distinct
canonical values, european filter-slug reach 56→57 (predicted improvement), backup table
`pr5a_heritage_rollback` 37 rows (RLS on, 0 policies; drop after PR 6 — tracked below).
Full per-tier evidence: `2026-06-11-pr5a-heritage-rehearsal-evidence.md`.

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

(The PR 5b carry-forward knowledge formerly summarized here is now fully authored into the
impl plan's B.1–B.5 tasks — the impl plan is the execution source of truth for 5b.)

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

- 2026-06-11 (post-Session 3, user decision): execution switches to SUPERVISOR + FRESH-CONTEXT
  SUBAGENTS from Session 4 — each impl-plan task runs in a dispatched Agent with fresh context;
  the main session orients, verifies (load-bearing), owns user-gated checkpoints + this status
  file, and may carry multiple tasks per session. Mechanics are in the kickoff prompt's
  EXECUTION MODE section.

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
- Session 2 (2026-06-11): **PR 5a complete end-to-end** — Tasks A.1–A.5; PR #504 opened,
  TEST-verified, 2 bot rounds triaged, merged (`0b8057f`), PROD-applied + PROD-verified
  (probe set green, evidence doc fully filled). PR 5b un-gated.
- Session 3 (2026-06-11): B.1–B.5 authored concrete into the impl plan (`f3f050f`); Task B.1
  done (`76f2714` — emitter + artifact + TEST coverage probe zero unresolved).

## In flight

- PR 5b on `feat/pr5b-concepts-canonicalization` — B.1 done; B.2 (generator + migration +
  local rehearsal) is next. Not pushed, no PR yet.

## Blocked

(none)

## Decisions made during execution

- 2026-06-11 (S3): all-drop rows lose the `academicConcepts` key entirely (not left as `{}`)
  when the rewrite empties the whole object — matches the corpus convention that concept-less
  rows lack the key. Reversible until B.2 generates the migration.
- 2026-06-11 (S2): probe (c) mirror check corrected to SET equality (the §J invariant) after
  the byte-equality version flagged 5 pre-existing order-only rows — none touched by the
  rewrite. Probe file documents the 5 lesson_ids.
- 2026-06-11 (S2): probe (d) `european` 54→55 accepted as explained improvement (parent
  expansions lack child kebab variants; the kebab-only row gains parent-filter reach).
- 2026-06-11 (S2): bot round 1 — rejected subprocess-import-placement + --emit-date validation
  + snapshotted_at column (all below the "visible bug or DB risk" bar); slug-list exhaustiveness
  verified against filterDefinitions.ts (18 = 5 parents + 13 children).

## Out-of-scope follow-ups captured here

- **Drop `pr5a_heritage_rollback` (and later `pr5b_concepts_rollback`) in a cleanup migration
  after PR 6 ships** (locked design §4.8). Tracked here so it isn't missed if PR 6 takes a
  while. (Bot round 2 suggestion, accepted.)
- **`guyanese` parent (`latin-american`) flagged by bot round 2** — Guyana is often grouped
  culturally with the Caribbean. The parent is a curriculum-team verdict (locked; implementation
  doesn't second-guess), but worth passing to the team before the filter-UI track surfaces the
  hierarchy (PR 6+ / filter redesign).
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

### Session 3 — 2026-06-11 — PR 5b B-task authoring + B.1 (emitter + artifact)

Major events:
- B-tasks B.1–B.5 authored concrete into the impl plan from the proven 5a mechanism, after
  re-reading the returned worksheet's §10 contract + Appendix A structure + the 5a
  emitter/generator/migration trio. Verdict counts grep-confirmed in the returned file
  (119/82/7; 82 `merge_into` lines). Branch `feat/pr5b-concepts-canonicalization` cut from
  `main` (`d7b9ef4`). Commit `f3f050f`.
- B.1: `scripts/emit-concepts-vocab.py` written TDD-style (red: script absent → negative
  fixtures → green). Implementation notes: `build-concepts-tool.py` loaded via
  `importlib.util.spec_from_file_location` AND registered in `sys.modules` before
  `exec_module` (Python 3.14 dataclass resolution fails without the registry entry);
  normalized matching is lowercase-alphanumerics-only on BOTH key and literal (bridges
  `colonialisms_impact`↔"colonialism's impact", `how_to_writing`↔"how-to writing",
  `biotic_abiotic_factors`↔"biotic/abiotic factors"); one secondary-subject value carries a
  "(conditional)" qualifier — emitter strips trailing parentheticals before validating against
  the 6 canonical subjects.
- Negative tests (all refuse, exit 1): seasonality verdict flipped to `<to_fill>` (trips
  verdict-count + merge-resolution + alias-count checks); `categorization` merge_into broken
  to a nonexistent key; the UNFILLED 2026-05-12 source worksheet (208 unsupported verdicts).
- Artifact emitted byte-stable: 119 canonical / 201 alias_map / 7 drops; zero identity
  literal→label pairs (every alias is a real rewrite). TEST acceptance probe: zero unresolved
  literals corpus-wide; 663/208/1912 re-confirmed exactly. Commit `76f2714`.
- Decision (minor mechanism, recorded for B.2): when a row's entire academicConcepts object
  empties (all-drop rows), the migration removes the key entirely rather than leaving `{}` —
  matches the corpus convention that concept-less rows lack the key. Flagged here for user
  visibility; reversible until B.2 generates the migration.
- Operational note: zsh ate an unquoted `===` separator mid-test-script (`=cmd` expansion) —
  one negative-test run had to be re-run; no impact on results.

Commits: `f3f050f` (B-task authoring), `76f2714` (B.1), plus this status commit.

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

Commits: `f240af6`, `789a9db`, `3b11c5a`, `5223f1a` (TEST results), `c2a6630` + `ad9ef39`
(status/triage) — all squashed into main as `0b8057f`.

Merge + PROD (same session, continued):
- Bot round 2: "Approve with optional cleanup"; 6 findings triaged (2 repeats re-rejected,
  2 rejected on investigation, 2 accepted as docs: rollback-drop tracking + the `guyanese`
  parent question surfaced as a curriculum-team item). Round cap reached.
- Squash-merged as `0b8057f` (auto-merge unavailable — repo setting off; direct merge clean).
- PROD before-census run pre-approval (37 rows / 43 appearances; coverage zero-unresolved;
  east-asian 4 + latin-american 5 vs TEST's 2 + 4 — PROD-only rows).
- User approved run `27384490534`; ALL 4 JOBS GREEN — no SASL flake this time.
- PROD after-probes (a)–(f) + backup: green; european 56→57 exactly as predicted; PROD has
  zero order-only mirror diffs (TEST had 5).
- Evidence doc fully filled across all three tiers; PR 5b un-gated.

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
