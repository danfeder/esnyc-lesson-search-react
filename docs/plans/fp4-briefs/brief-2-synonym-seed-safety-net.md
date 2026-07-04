# FP4 Brief 2 — Synonym seed safety net (M)

Read `docs/plans/fp4-briefs/README.md` (standing rules) first. Evidence: **C3/FP4-SYN-06**
in `docs/plans/fp4-discovery/discovery-evidence.md`. Fable re-probed 2026-07-03 with an
independent anti-join: **74 live PROD rows, exactly 60 unowned by any migration** (14 seeded:
13 tuples in `20260522000000_seed_search_synonyms_from_smart_search.sql` + 1 `decay` tuple in
`20260618120000_seed_search_synonym_decay_decomposition.sql`; the 20251001 baseline is
schema-only). TEST currently mirrors PROD (74). The unowned rows include
`activity → [activities, lesson, lessons, project, projects]`, which FP-19's hint honesty
and its tests depend on.

## Problem

A local `supabase db reset` or a `reset-test-db.yml` run silently drops `search_synonyms`
to 14 rows — search behavior becomes unreproducible locally and TEST desyncs from PROD.
This is the wave's only silent-data-drift item. Fix = one insurance migration. **No PROD
behavior change** (rows already exist there; the insert no-ops).

## Scope — one PR, one migration

1. **Dump the live table** (read-only): PROD `SELECT term, synonyms, synonym_type FROM
   search_synonyms ORDER BY term, synonym_type, synonyms` via `mcp__supabase-remote__execute_sql`.
   Commit provenance: the SQL, the full raw 74-row output, and which DB, to
   `docs/plans/fp4-briefs/brief-2-synonyms-census.md`.
2. **Generate the seed programmatically** — do NOT hand-transcribe 60 rows. Write a
   throwaway generator (scratchpad, not committed) that emits properly-escaped SQL tuples
   from the dump (watch `women''s`-style quoting and text[] literals). Migration file:
   `supabase/migrations/20260706000000_seed_search_synonyms_live_rows.sql` (if that date is
   taken, next free day — never same-day-suffix naming).
3. **Migration shape** (mirror `20260522000000`'s pattern): `BEGIN;` … `COMMIT;` wrapped;
   `INSERT … SELECT FROM (VALUES …) WHERE NOT EXISTS` guarded on the full
   `(term, synonyms, synonym_type)` tuple so it is idempotent everywhere. Post-asserts
   inside the transaction: total row count ≥ 74; the `activity` tuple exists; zero
   duplicate `(term, synonym_type)` pairs introduced (compare count vs distinct). Rows must
   satisfy the existing `search_synonyms_lexemes_no_whitespace` CHECK — they already do on
   PROD, so exact transcription is the guarantee; if any INSERT trips the CHECK, your
   transcription is wrong — fix the generator, don't relax the data.
4. **Local verify:** `supabase db reset` → table has 74 rows; anti-join local vs the
   committed dump = 0 differences both directions. `npm run test:rls` (2 known pre-existing
   failures only). `npm run check` + `npm run test:run`.
5. **TEST verify after CI applies:** count still 74 (insert no-oped), anti-join vs dump = 0.
   Post on the PR.

## Owner gates

Merge + the standard PROD migration approval. After PROD applies: re-count 74 (no change —
say so explicitly in the hand-back).

## STOP conditions

Live row count ≠ 74 when you dump (data moved since 2026-07-03 — re-census, note it, and
proceed only if the delta is additive); any live row that fails the CHECK constraint when
re-inserted; any temptation to also *edit* synonym content (out of scope — this brief owns
existing state, changes nothing). "STOP = write the hand-back and END YOUR TURN; design
forks route to Fable; the owner only answers explicit approvals (data fix / merge / gates)."
