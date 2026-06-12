# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) — Design Document

**Date:** 2026-06-11
**Status:** Draft — strategy locked, mechanism questions open (see "Open design questions"); Sessions 1-2 lock them
**Related:** `docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md` (MANDATORY pre-read — primary input to the mechanism re-decision), `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (parent initiative), `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md` (lines 11 + 856-867 hold the currently-locked-but-reopen-recommended mechanism text), `docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md` (PR 5 follow-ups this track inherits)

---

## 1. Why this exists

The corpus vocabulary is now fully canonical (PR 5a heritage + PR 5b concepts + #506 fold: PROD census 675 / 119 / 1923, zero non-canonical values) — but the **tag assignments themselves** are still mostly the output of the 2025 v3 GPT-4.1 run, which enum-enforced only 3 of 17 fields and whose tags on ~670 of 772 lessons no human reviewer ever validated. PR 5 rewrote the *spelling* of what's there; it did not re-derive *whether the tags are right* from the lesson bodies. The documented judgment-error classes remain live: tasting conflated with cooking (`both`-tagged garden lessons), cosmetics/craft lessons tagged `cooking`, stovetop lessons graded 3K-8, same-titled lessons classified inconsistently across variants.

Stage 2 is the cross-cutting Scope 3 commitment from the foundation walkthrough (2026-04-30): re-read every live lesson body against the validated canonical schema and re-tag with per-field enum enforcement on **all** re-tagged fields this time — "the first truly canonical retag pass," not "rerun v3 with Claude." It also carries the known one-shot backfills decided in the walkthrough: ~5 cosmetics lessons → `craft`, the 3 tasting-conflation `both` → `garden` fixes, consistent classification across the Seed Dispersal variants, `orientation` tag backfill (~15-30 lessons), `bilingual_handouts` tag backfill (6 lessons), and concepts re-tagged in both framework AND everyday vocabularies (the D5 decision) so PR 3b can populate `search_synonyms`.

**PR 3b folds into this track** (decided 2026-05-08): `search_synonyms` population with concept-derived everyday↔framework pairs from the re-tag outputs. The smart-search edge function already reads synonyms from the DB (PR 3a, Option B), so the TS-layer half of that work is done; only population remains. Full corpus embedding regeneration is also deferred to this track (foundation status doc: the natural batching boundary is when the underlying content meaningfully changes — that's here).

## 2. Constraints

1. **Data safety supersedes velocity.** The re-tag writes corpus-wide canonical data to PROD. Every apply step needs: local/TEST rehearsal first, a rollback snapshot, idempotency, and a dry-run/diff-review gate before any PROD write. Per `feedback_data_safety_top_priority.md`.
2. **Auditability and replay.** Every pipeline step's inputs and outputs must persist as inspectable artifacts (the exploration's JSONL-at-every-step property). Partial failure must be recoverable per-lesson, not per-run.
3. **Enum enforcement at generation time.** All re-tagged fields with locked vocab are constrained via schema-forced output (the `tool_choice` + `input_schema` enum pattern already running in PROD in `process-submission`), not validated-after-the-fact only.
4. **The mechanism decision precedes implementation.** The locked mechanism ("Anthropic SDK + Pydantic via Python adapter from `taggingv3/gpt_tagger/`") is recommended for reopening on five pieces of concrete file-cited evidence (exploration §3). The walkthrough decides; this scaffold does not pre-decide. No pipeline code before the design doc flips to Locked.
5. **Beat v3 measurably.** v3 output quality was mediocre (user calibration 2026-05-13). The eval/QA protocol must define what "better" means and must probe confident-but-wrong cases, not just v3-flagged-low-confidence cases.
6. **Cost bounded and estimated before the full run.** Original estimate ~$200-300; the per-field-vs-monolithic and Batch-vs-sync decisions are token-economics decisions requiring a small dry-run first, not aesthetics.

## 3. The chosen shape

**Deliberately not chosen yet.** Strategy is locked (Stage 2 happens, on the live post-PR-4 corpus of ~751 lessons, against locked canonical vocab, with reviewer spot-check before apply). Mechanism is open pending the re-decision walkthrough specified in exploration doc §5. The leading candidate per the exploration (Codex + Hermes + Claude triangulation) is a **TypeScript + Zod batch runner at `scripts/stage2-retag/`** (export-corpus / run-retag / validate-output / generate-diff-report / prepare-apply), with `taggingv3` mined as reference material (baseline-to-beat, failure-case seeds, prompt ideas, cost calibration) rather than ported. But the walkthrough decides, not this doc.

### What is already settled (do NOT re-debate)

| Settled | Source |
|---|---|
| Stage 2 re-tag happens; full live corpus; spot-check ~50-100 sampled lessons before/alongside apply | Scope 3 commit, foundation walkthrough session 1 |
| Foundation decisions D1-D9, Stage 1 decisions D-C1—D-C15 | Decision journals; exploration doc reopens ONLY the mechanism lock |
| Heritage canonical vocab = the §16 88-row table; concepts canonical vocab = the returned 208-entry worksheet + `urban revitalization` → Advocacy addendum | `2026-05-10-...-stage1-heritage-worksheet.md`, `2026-06-11-...-stage1-concepts-worksheet-returned.md`, PR #506 |
| Concepts re-tagged in framework + everyday vocabularies; synonyms feed `search_synonyms` (PR 3b) | D5 decision |
| `claude -p` is NOT the bulk mechanism (SDK wins on cost/auditability/determinism); plausibly useful for periphery (audit-signal adjudication, spot-check probing) | Exploration §1-§2 |
| Do not extend `process-submission` into the bulk runner; mirror its call shape into a standalone script | Exploration §4 |
| Drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` in a cleanup migration after PR 6 ships | PR 5 design §4.8 (locked) |
| Future vocab censuses run on PROD, not TEST (TEST missing 13 live PROD concepts rows) | PR 5b follow-up |

## 4. Open design questions — TO LOCK IN SESSIONS 1-2

<!-- Design-lock mode. Session 1 = evidence gathering against real code/data
     (the exploration doc §5 prerequisites map onto OQ evidence items below).
     Session 2 = the re-decision walkthrough with the user as decision
     authority. Sessions may compress into one or expand; the gate is that
     every OQ below has a locked answer + rationale written under it before
     Status flips to Locked and impl-plan tasks are authored.
     Tags: [evidence-lockable] = executor may lock from discovery evidence
     with a one-line rationale; [user-verdict] = executor presents evidence
     + a recommendation, the USER decides — never locked unilaterally. -->

1. **OQ1 — Bulk mechanism: TypeScript+Zod runner vs Python/Pydantic adapter** `[user-verdict]`. The reopen-recommendation rests on: Zod schema header names Stage 2 as a TS consumer; Pydantic hand-sync is acknowledged debt; `taggingv3` reuse is ~15-20% (3-5 sessions realistic, not 1-2); two PROD-running TS demonstrations of the canonical pattern exist; v3 quality was mediocre. Leading: TS+Zod at `scripts/stage2-retag/`. Walkthrough decides; if reopened-and-changed, amend implementation plan line 11 + lines 856-867 + decision journal. <!-- TBD Session 2 -->
2. **OQ2 — Field scope of the re-tag** `[user-verdict]` (user-deferred 2026-06-11 to this walkthrough). Only heritage + concepts vocab are locked; the ~8 smaller vocab fields (cooking_skills, garden_skills, SEL, core_competencies, cooking_methods, main_ingredients, observances/holidays, academic subjects) have no Stage 1 worksheets. Options: (a) complete smaller-field worksheets first, one all-field pass; (b) re-tag locked-vocab fields now (heritage, concepts, activity_type, tags, CRF, season_timing), second pass later; (c) hybrid. **Session 1 evidence: PROD census of the ~8 smaller fields' distinct-value counts + drift shapes** so this is decided with real numbers. <!-- TBD Session 2 -->
3. **OQ3 — Per-field vs monolithic call shape** `[user-verdict]`. Token-economics decision (body 3-10K tokens is the dynamic part; cache dynamics in the middle; Batch API caching is best-effort). **Session 1 evidence: 10-20 lesson dry-run in both shapes capturing input tokens, cache-hit rates, projected full-run cost** (exploration §5 item 8). <!-- TBD Session 2 -->
4. **OQ4 — Batch API vs synchronous SDK** `[user-verdict]` (the retention-acceptability half is a data-safety call). Batch = guaranteed 50% discount + `custom_id` replay, but async polling and **not ZDR-eligible (~29-day retention)** — verify current Anthropic data-handling policy is acceptable for lesson-body curriculum content before opting in (exploration §5 item 7). Likely shape: sync for dry-run/iteration, Batch for full run if retention is acceptable. <!-- TBD Session 2 -->
5. **OQ5 — Body-source readiness** `[evidence-lockable]`. `lessons.content_text` is the single canonical source (100% coverage at 772 rows as of 2026-05-06; stale measurement). **Session 1 evidence: freshness + quality audit on the ~751 live rows** — null counts, length distribution (truncation), control characters (corruption), random-sample comparison vs Google Doc canonical (staleness). Output: a body-source readiness statement + documented fallback for known-bad rows. <!-- TBD Session 1 -->
6. **OQ6 — Eval / QA spot-check protocol** `[user-verdict]`. Must include random sampling (catches confident-but-wrong), v3-flagged failures (biased but useful), and adversarial probes against open audit signals; must define "beat v3" concretely. **Session 1 evidence: inspect 5-10 `taggingv3` sample outputs to convert "v3 was mediocre" into specific failure examples; sketch 2-3 candidate protocols** (exploration §5 items 3-4). Who performs spot-check (Claude periphery agent / curriculum team / both) is part of the answer. <!-- TBD Session 2 -->
7. **OQ7 — Apply mechanism + rollback** `[evidence-lockable]` (PR 5's emitter/rollback precedent guides; the PROD apply itself stays user-gated regardless). How re-tag output reaches PROD: staged temp table + diff review + apply migration is the exploration's sketch; the PR 5 emitter-generates-migration pattern is precedent. Rollback snapshot shape (PR 5-style in-migration backup tables) + idempotency + the pre-delete/pre-update checklist apply. <!-- TBD Session 2 -->
8. **OQ8 — Reviewer-validation flow** `[user-verdict]`. Original plan named "Re-tag DIFF view vs fresh-tag review (TBD)" and the foundation plan gates PR 6 on a "Stage 2 reviewer-validation UX walk." Decide: what the curriculum team actually reviews (diff report artifact? worksheet-style doc? UI?), at what depth (spot-check-only per D4's lists-first sequencing), and what their sign-off gates. Keep curriculum-facing artifacts plain-language per `feedback_curriculum_facing_copy_plain.md`. <!-- TBD Session 2 -->
9. **OQ9 — Audit-signal adjudication** `[user-verdict]` (which of the 74 signals resolve in this track is a scope call). 24 open CON-NN (concepts) + 50 open heritage register signals carry Stage 2 action columns. Decide which resolve in this track, the mechanism (agent-loop periphery work is the exploration's §2 fit — re-verify `claude -p` flag surface live if used), and where resolutions get recorded (the registers). Includes CON-16 (Indigenous cluster cross-field alignment with heritage §9.1). <!-- TBD Session 2 -->
10. **OQ10 — PR 3b synonym extraction shape** `[evidence-lockable]`. How everyday↔framework pairs come out of the re-tag output (same tool call? second pass?) and the `search_synonyms` population migration shape; both search layers already read from DB. <!-- TBD Session 2 -->
11. **OQ11 — Embedding regeneration sequencing** `[evidence-lockable]`. Full-corpus regen after re-tag apply (cost trivial, ~$0.03/regen at current rates); decide TEST/PROD ordering and whether it rides the apply PR or follows. <!-- TBD Session 2 -->
12. **OQ12 — Check surface for `scripts/stage2-retag/` (if TS path wins OQ1)** `[evidence-lockable]`. `tsconfig.json` includes only `src`; ESLint ignores `scripts/**`. The re-tag runner crosses a blast-radius threshold that deserves `tsconfig.scripts.json` + ESLint override + unit tests for parsing/validation/diff/apply-prep. Also revisit the Stage-1 worksheet `Notes`-field human-only-prose parsing convention if a worksheet parser is needed (foundation status doc out-of-scope item). <!-- TBD Session 2 -->
13. **OQ13 — PR breakdown + count** `[user-verdict]`. Authored after OQ1-OQ12 lock. Candidate skeleton in the implementation plan (pipeline+dry-run → full run+diff+staging → apply+embeddings → PR 3b synonyms → cleanup/rollback-drops); the walkthrough may merge or split. <!-- TBD Session 2 -->

## 5. Migration / shipping strategy

TBD with OQ13. Known fixed points regardless of mechanism:

- Schema/data changes reach PROD only through migration files + CI (never `mcp__supabase-remote__apply_migration`).
- TEST rehearsal note: TEST is missing 13 live PROD concepts rows — TEST rehearsal validates *mechanics*, but PROD MCP verification validates *coverage*. Apply-step probes must run against PROD post-apply with verbatim identifiers per `feedback_verbatim_identifiers_in_probes.md`.
- The cleanup migration dropping `pr5a_heritage_rollback` + `pr5b_concepts_rollback` ships at the END of this track (after the re-tag is PROD-verified), per PR 5 locked design §4.8.
- Known CI flakes inherited: migrate-production SASL (both Apply + Verify variants; rerun pattern), deploy-edge-functions esm.sh 522 (if any edge function is touched).

## 6. Testing strategy

TBD with the mechanism (OQ1, OQ12). Fixed points: dry-run before full run; full run validated against the canonical Zod schema (or its Pydantic mirror if OQ1 retains Python); diff report reviewed before any apply; `npm run test:rls` unchanged unless a migration touches policies; spot-check protocol per OQ6 executed before PROD apply sign-off.

## 7. Out of scope (captured for future work)

- **Seed Bursts near-duplicate pair** (`1HuffJuy…` + `1NqjpqXV…`, different metadata) — dedup track, not this one. The re-tag treats both as live rows.
- **Phase-2 reviewer UX redesign** (guided pickers, per-field guidance, concepts editor + its clearing semantics) — only the minimal reviewer-validation flow needed by OQ8 is in scope.
- **Resend email setup** — unrelated; still deferred per user.
- **`guyanese` parent under `latin-american`** — curriculum-team question to pass along before the filter-UI track surfaces the hierarchy; this track should hand it off (cheap, rides OQ8's curriculum-team touchpoint) but the filter-UI work itself is out of scope.
- **Filter UI redesign** (5-value Activity Type group, Lesson Type tag filter, heritage hierarchy surfacing) — Phase 2.
- **The ~8 smaller-field Stage 1 worksheets** — in scope ONLY if OQ2 lands on "worksheets first"; otherwise a sibling track.

## 8. References

- `docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md` — primary mechanism input; §5 lists the walkthrough prerequisites this doc's OQ evidence items mirror
- `docs/plans/2026-05-03-metadata-rebuild-foundation-{design,implementation}.md` — parent initiative; impl plan lines 11 + 856-867 are the text OQ1 amends if reopened-and-changed
- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` (§16) + `docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` — locked vocab inputs
- Audit signal registers: heritage worksheet register (50 open) + concepts worksheet register (24 open CON-NN)
- `docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md` — inherited follow-ups
- Memory: `project_metadata_rebuild_initiative.md`, `project_stage2_mechanism_exploration.md`, `feedback_data_safety_top_priority.md`, `feedback_curriculum_facing_copy_plain.md`, `project_crf_stamp_theater.md` (D9 re-tag design for CRF), `project_dedup_third_state.md`
