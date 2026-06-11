# PR 5 — D4 Vocabulary Canonicalization (heritage + concepts) — Design Document

**Date:** 2026-06-11
**Status:** LOCKED (Session 1, 2026-06-11) — strategic scope locked 2026-06-11; §4 mechanism questions locked Session 1 after TEST-DB discovery + code-path trace. Implementation tasks authored in the companion impl plan.
**Related:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (parent),
`docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` (D4 decision journal),
`docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` (heritage vocabulary input),
`docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` (concepts verdict record),
`docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md` (consult before PR 6 planning; PR 5 should not foreclose its options)

---

## 1. Why this exists

The lesson corpus's vocabulary drift was *born* in the v3 GPT-4.1 tagging run (Pydantic enforced
enums on only 3 of 17 fields) and never cleaned: ~36% of the corpus carries strict-kebab or
case-mixed variants, with thousands of row-appearances of drift across the vocabulary fields.
The D4 walkthrough decision (2026-04-30, locked) committed to full canonicalization in the
foundation phase, with Stage 1 worksheets producing the locked vocabularies.

Both Stage 1 vocabulary worksheets are now verdict-complete:

- **Heritage** (integrated 2026-05-12, PRs #491 + #492): 88 values → 51 keep / 17 merge / 20 new,
  plus the five §9.1 framing decisions (e.g. "Indigenous and Diaspora" cluster root).
- **Concepts** (returned + archived 2026-06-11, commit `0c33808`): 208 values → 119 keep /
  82 merge / 7 drop, all 5 cluster signals answered, merge graph validated (every fold target is
  itself a keep; the 3 reviewer contradictions were resolved per user direction and documented
  in-file).

PR 5 consumes those verdicts: it rewrites the corpus's `culturalHeritage` and `academicConcepts`
values to the canonical vocabularies and produces the machine-readable alias → canonical maps
that downstream consumers (PR 6 Stage 2 re-tag, submission-time auto-tag prompts, filter UI)
operate on.

## 2. Goals

1. **Every populated `culturalHeritage` / `academicConcepts` value in `lessons` resolves to a
   canonical surface label** from its worksheet (Title Case per D4). No drift variant, kebab slug,
   or merged-away value survives in live rows.
2. **The alias → canonical map is a durable, machine-readable artifact** — not just SQL side
   effects. PR 6's re-tag prompt and the deferred submission-time auto-tag prompt need the locked
   vocabulary as input; the filter UI needs surface labels + hierarchy.
3. **Zero data loss and full rehearsal** per `feedback_data_safety_top_priority.md`: local →
   TEST → PROD, idempotent migrations, snapshot/backup before PROD apply, row-count + value-set
   verification probes before and after at each tier.
4. **Search keeps working through the rewrite.** `academicConcepts` is in `search_vector` and the
   embedding inputs (PR 3a); heritage feeds the hierarchical filter. Rewrites must refresh
   derived search state and not orphan filter values.

## 3. The chosen shape (strategic layer — LOCKED 2026-06-11)

| Decision | Locked answer |
|---|---|
| Field scope | **Heritage + concepts only.** The ~8 smaller vocab fields (cooking_skills, garden_skills, mainIngredients, …) wait for their own (much smaller) Stage 1 worksheets; they are NOT in PR 5. |
| Staging | **Two PRs: 5a heritage first, 5b concepts second.** Heritage (~88 values) is the smaller rehearsal that proves the alias-map mechanism; concepts (~208 values + 82 folds) reuses the proven pattern. Each goes local → TEST → PROD before the next starts. |
| Code scope | **Data + keep-filters-working.** `filterDefinitions.ts` / runtime aliases updated only as far as needed so existing search + filters don't break or point at orphaned values. The full new heritage filter tree (Indigenous-and-Diaspora root, tier structure) is a separate later track. |
| Vocab casing | Title Case canonical surface labels across both fields (D4). |
| Concepts conflict resolutions | As archived 2026-06-11: `preservation` survives its pair; `sorting` survives relabeled **"Sorting and Categorization"** (the canonical-key rename to `sorting_and_categorization` happens HERE, in PR 5b, as part of canonicalization); `seasonality` absorbs the whole seasonal family. |

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Wait for all ~10 field worksheets, one big pass** | Gates shipped value on un-started curriculum-team work; heritage+concepts are the two largest fields and the only PR-6 prerequisites. |
| **One PR for both fields** | Violates smallest-first rehearsal discipline; concepts' 82-fold rewrite deserves a mechanism already proven on heritage's 17. |
| **Data-only (no code changes)** | Filter checkboxes silently matching zero lessons is a user-visible regression; "keep filters working" is cheap. |
| **Ship full new filter UI in this track** | UI redesign has its own design surface (tiers, tree, labels) and would couple a data migration to frontend review cycles. |

## 4. Mechanism decisions — LOCKED (Session 1, 2026-06-11)

Locked after TEST-DB discovery (probes over the 772-row corpus) and a full code-path trace of
both fields (FTS trigger, normalize trigger, RPCs, frontend consumers, edge functions). Evidence
inline per item. The two judgment calls (4a scope, 5a subject keys) were put to the user
2026-06-11; both resolved to the recommended option.

1. **Map extraction path — parser-driven, both fields.**
   Heritage: extend `scripts/parse-heritage-worksheet.py` with an `--emit-json <path>` mode — its
   `Entry` dataclass already carries every field the artifact needs, and §16 regeneration proved
   the parse is trustworthy. Concepts: a new small emitter script that reuses
   `scripts/build-concepts-tool.py`'s parse functions (`parse_worksheet`, `parse_merge_aliases`,
   `verify_invariants`) pointed at the RETURNED verdict record
   (`2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md`), not the unfilled source
   worksheet. The `sorting` → `sorting_and_categorization` key rename is a documented single
   special case at emit time (the returned entry keeps heading `sorting` with label "Sorting and
   Categorization" + an in-file curriculum note deferring the rename to here).
   *Punctuation wrinkle:* concepts canonical_keys are not mechanically invertible to corpus
   literals (`colonialisms_impact` ↔ `colonialism's impact`), so the emitter recovers each
   entry's corpus literal by normalized matching (lower, strip non-alnum, spaces→underscores)
   against Appendix A's 208 v3-baseline strings; the match must be exactly 1:1 or the emitter
   fails loudly.

2. **Artifact shape + location — worksheet-specified JSON, one file per field, in `data/vocab/`.**
   The worksheets already specify the handoff shapes (heritage §7, concepts §10):
   `{canonical: [...], alias_map: {corpus literal → canonical_key}, drops: [...]}` — heritage
   canonical entries carry `{key, label, parent, filter_ui_tier}`, concepts entries carry
   `{key, label, primary_subject, secondary_subjects}`. We add a `provenance` header block
   (source worksheet path + git commit + verdict counts + emit date). Files:
   `data/vocab/cultural-heritage.vocab.json` and `data/vocab/academic-concepts.vocab.json`
   (repo-root `data/` already holds corpus data; `scripts/eval-data/*-vocab.json` is precedent
   for committed vocab JSON). PR 6 prompts and any future `filterDefinitions.ts` alignment read
   these files; PR 5 itself needs no TS import of them.

3. **Migration mechanism — migration files with emitter-generated inline mapping; no MCP rewrite.**
   A corpus-wide rewrite gets migration-file durability deliberately: CI rehearsal on TEST, the
   PROD approval gate, and a permanent audit record. Mechanism per PR: one migration containing
   (a) a backup-table snapshot (see §5), (b) a `VALUES`-list alias→canonical mapping CTE generated
   by the emitter (auditable, byte-stable), (c) a set-based `UPDATE` over rows containing at least
   one non-identity alias, (d) verification `DO` blocks that `RAISE EXCEPTION` if any alias
   survives post-rewrite. Idempotent by construction: canonical values map to themselves, so
   re-running matches zero rows. Precedent: `20260521000000`'s corpus-wide
   `UPDATE lessons SET metadata = metadata` backfill ran cleanly through both triggers.

4. **Where the values live — verified on TEST (2026-06-11 probes).**
   - Heritage: flat `cultural_heritage text[]` column + `metadata->'culturalHeritage'` array,
     **perfectly mirrored** (335 populated rows; per-value counts identical across all 78
     distinct values). `lessons_normalize_write()` §J makes the column win on disagreement
     (`20260518000000` is the live definition) — so the migration **writes the column** and lets
     the trigger mirror metadata in the same statement.
   - Concepts: `metadata->'academicConcepts'` only — NO flat column. 684 rows with object shape,
     all under exactly the 6 canonical subject keys, all values arrays. The
     `academicIntegration.concepts` dual-source is empty corpus-wide (zero object-shaped
     `academicIntegration` rows), so the trigger's §A rescue is inert for this rewrite.
   - `lesson_submissions`: `ai_draft_metadata` carries neither key on any of the 130 rows —
     nothing to rewrite. `lesson_versions` (7 rows) + `lesson_archive` (143 rows) are historical
     snapshots — **left untouched** (they record what was true at archive time).
   - **Scope: live rows only (`retired_at IS NULL`) — user-confirmed 2026-06-11.** The 21
     soft-retired imports (PR 4 corpus cleanup) hold 4 concept strings that exist nowhere else
     and got no verdict; live-row worksheet coverage is exactly 100% (208/208 strings, 1912
     appearances — Appendix A reproduced verbatim by today's probe). All probes filter on
     `retired_at IS NULL`.

5. **Concepts nested shape — values rewritten in place; shape and subject keys untouched.**
   The `{Subject: [concepts]}` object stays (worksheet decision D-C2: no schema/shape change
   before Stage 2). **Subject keys also stay — user-confirmed 2026-06-11:** concepts are NOT
   moved to their `recommended_primary_subject` in PR 5b; subject placement is a per-lesson
   judgment that belongs to PR 6's re-tag (which re-reads lessons). PR 5b maps each array element
   through the alias map, Title-Cases via canonical labels, dedupes within each subject array
   (folds can collide with an existing co-tag), deletes dropped values, and removes any subject
   key whose array becomes empty.

6. **`new` and `drop` semantics.**
   Heritage's 20 `new` values: vocabulary artifact only — zero corpus rows, zero filter-config
   changes in PR 5 (they surface in the future filter-redesign track). Heritage has no drops.
   Concepts' 7 drops: **deleted from rows now** — that is the worksheet §10 contract verbatim
   ("drops are deleted from the array"); leaving them for PR 6 would mean shipping a
   "canonicalized" corpus that still carries verdict-rejected values.

7. **Derived-state refresh — automatic; no explicit rebuild step.**
   `update_lesson_search_vector_trigger` (BEFORE INSERT/UPDATE, `20260521000000` +
   `20260523000000` helper) fires on `UPDATE OF cultural_heritage, metadata, ...` — both PRs'
   UPDATEs hit those columns, so `search_vector` regenerates row-by-row in the same statement.
   Embeddings ride with PR 6 re-tag (locked default stands; no forcing reason found).

8. **Verification probe set + rollback (per tier: local → TEST → PROD).**
   Before/after probes, identifiers copied VERBATIM from the vocab artifacts:
   (a) distinct-value census per field (live rows) — after-state must equal the artifact's
   canonical label set exactly; (b) per-alias row counts before (expected counts recorded in the
   rehearsal evidence) and **zero rows containing any alias after**; (c) appearance-conservation
   total — post-rewrite appearance sum equals pre-sum minus drop appearances minus
   fold-collision dedups (expected value computed from the before-census); (d) zero-orphan filter
   check — every `filterDefinitions.ts` heritage slug still reaches ≥1 live row through
   `_alias_cultural_heritage` + `expand_cultural_heritage`; (e) FTS smoke — a canonicalized
   concept term matches the same lessons its pre-rewrite alias did; (f) idempotency — re-running
   the UPDATE matches 0 rows. Rollback: each migration snapshots affected rows into a backup
   table (`pr5a_heritage_rollback` / `pr5b_concepts_rollback`: lesson_id + old column + old
   metadata key) BEFORE rewriting; restore is a forward migration reading the backup table.
   Backup tables are dropped in a later cleanup migration after PR 6 ships.

9. **Submission-time auto-tag prompts — fast-follow, out of PR 5.** Both PRs stay data PRs; the
   vocab-locked prompts consume the `data/vocab/` artifacts in their own small PR after 5b.

### Filter alignment finding (Session 1)

The expected `filterDefinitions.ts` change for PR 5a is **zero** — to be proven by probe (d), not
assumed. Stored heritage values stay Title Case surface labels; the sidebar's kebab slugs already
bridge via `_alias_cultural_heritage` (`20260505000000`); the hierarchy table's Title Case
parents/children remain valid canonical labels post-rewrite; and the semantic merges
(`Native American` → `Indigenous`, `African American diaspora` → `African American`, 13 kebab
drift literals → their Title Case twins) only touch values that were never filter-reachable.
The legacy edge-function path (`_shared/search-helpers.ts` raw `overlaps` on
`metadata->culturalHeritage`, no alias bridge) is not used by the live UI (the RPC is); its
behavior for Title Case stored values is unchanged by the rewrite.

## 5. Migration / shipping strategy

| # | PR | Contains | Notes |
|---|---|---|---|
| 5a | **Heritage canonicalization** | Heritage vocab artifact + alias-map migration + minimal `filterDefinitions.ts` alignment + verification probes | Rehearsal PR — proves the mechanism. ~88 values, 17 merges. |
| 5b | **Concepts canonicalization** | Concepts vocab artifact + alias-map migration (incl. 82 folds, 7 drops, `sorting_and_categorization` rename) + search_vector refresh if needed | Reuses 5a's proven mechanism. Larger blast radius; lands second. |

### Gap risk between PRs
Low. The two fields are independent; heritage canonical + concepts drifted is a fine intermediate
state. No shared schema.

### TEST DB rehearsal
- Both PRs: migration applies to TEST via CI on PR open; run the verification probe set via
  `mcp__supabase-test__execute_sql` BEFORE merge (mandatory per CLAUDE.md), re-run per fix-up
  round per `feedback_per_round_test_db_verification.md`.

### Rollback paths
- Both PRs: the migration itself snapshots affected rows into a backup table
  (`pr5a_heritage_rollback` / `pr5b_concepts_rollback`) before rewriting (locked §4.8). Restore
  is a forward migration reading the backup table; backup tables are dropped in a cleanup
  migration after PR 6 ships.

### Known issues / pre-existing flakes
- `migrate-production.yml` SASL flake (Apply + Verify variants) — rerun via
  `gh run rerun --failed`; PROD MCP verification is the source of truth.
- Beads CLI broken — no `bd` commands.

## 6. Out of scope (captured for future work)

- The ~8 smaller vocabulary fields (each needs its own worksheet first).
- Full heritage filter-UI redesign (new tree, tiers, surface-label rollout in the sidebar).
- Stage 2 corpus re-tag (PR 6) and search-synonym population (PR 3b) — consult
  `2026-05-13-stage2-retag-mechanism-exploration.md` before planning; PR 5 should avoid
  mechanism choices that foreclose its options.
- Embedding regeneration (rides with PR 6 re-tag unless Session 1 finds a forcing reason).
- Submission-time auto-tag prompt updates (default fast-follow — Session 1 question 9).
- W3 source-worksheet content errors (7 items listed in
  `2026-06-10-concepts-wizard-finish-plan.md`) — metadata-rebuild track backlog, not PR 5.

## 7. References

- D4 decision + rationale: `2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`
- Heritage verdicts: `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` (§16 summary table)
  + audit-signal register `2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`
- Concepts verdicts: `2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md`
  (provenance header documents the 3 conflict resolutions)
- Memories: `project_metadata_rebuild_initiative.md`, `project_vocabulary_drift_scope.md`,
  `project_metadata_three_regimes.md`, `feedback_data_safety_top_priority.md`
