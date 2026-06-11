# PR 5 — D4 Vocabulary Canonicalization (heritage + concepts) — Design Document

**Date:** 2026-06-11
**Status:** Draft — strategic scope LOCKED; migration mechanism to be locked in Session 1 (design-lock session) before any implementation tasks are authored
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

## 4. Open design questions — TO LOCK IN SESSION 1 (the design-lock session)

These are mechanism questions, not strategy questions. Session 1 reads the current code/data
shape, answers each, and updates this doc from Draft → Locked before any implementation task is
authored. <!-- TBD — each item below gets a locked answer + rationale in Session 1 -->

1. **Map extraction path.** Both worksheets have parsers (`scripts/parse-heritage-worksheet.py`,
   the parser inside `scripts/build-concepts-tool.py`). Do we extend them to emit the alias →
   canonical maps (JSON artifacts committed to the repo), or hand-author the maps? (Parser-driven
   is the strong default — §16 regeneration proved it — but the concepts parser reads the
   *unfilled* source worksheet; it needs pointing at the returned verdict record.)
2. **Artifact shape + location.** One canonical-vocabulary file per field (key, surface label,
   aliases[], parent, tier, verdict provenance)? Where does it live so PR 6 prompts and
   `filterDefinitions.ts` can both consume it without drift?
3. **Migration mechanism.** Script-generated SQL `UPDATE` per alias (auditable, verbose) vs. a
   mapping table + one set-based `UPDATE ... FROM` (compact, one shot) vs. a data-fix script via
   MCP with a migration only for any schema artifacts. Note repo rule: data changes CAN go via
   MCP, but a corpus-wide rewrite probably wants migration-file durability — decide explicitly.
4. **Where the values actually live.** Confirm via discovery: `metadata->'culturalHeritage'`
   (array?), `metadata->'academicConcepts'` (object with nested shape?), any mirrored flat
   columns, `lesson_submissions` rows (do in-flight submissions get rewritten too, or only
   `lessons`?), and `lesson_versions` archives (probably leave untouched — decide).
5. **Concepts nested shape.** `academicConcepts` on legacy rows is an object (regime-dependent
   shape per the three-regimes memory). Does canonicalization rewrite keys inside the nested
   shape, flatten it, or normalize shape as part of the pass? (Shape normalization may be better
   left to PR 6 re-tag — decide and document.)
6. **Heritage `new` values (20) and concepts `drop` values (7).** `new` values have no corpus
   rows — they enter the vocabulary artifact + filter config only. Confirm `drop` semantics:
   remove the value from rows entirely vs. leave for PR 6 re-tag to overwrite.
7. **Derived-state refresh.** Does rewriting `metadata` auto-refresh `search_vector` (trigger?)
   or does PR 5 need an explicit rebuild step? Do embeddings need regeneration now, or does that
   ride with PR 6's re-tag (strong default: ride with PR 6)?
8. **Verification probe set.** Define the before/after probes per tier (distinct-value census per
   field, per-alias row counts copied verbatim from the maps per
   `feedback_verbatim_identifiers_in_probes.md`, zero-orphan filter check).
9. **Submission-time auto-tag prompts.** Stage 1 closure unblocks the heritage/concepts
   vocab-locked prompts deferred from PR 2. In PR 5 scope or a fast-follow? (Default: fast-follow,
   keep PR 5 a data PR.)

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
- Both PRs: pre-apply snapshot of affected columns (e.g. a backup table or exported JSON of
  `lesson_id` → old value) committed to the rehearsal evidence, so a forward-rollback migration
  can restore prior values. Exact mechanism locked in Session 1 (question 8).

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
