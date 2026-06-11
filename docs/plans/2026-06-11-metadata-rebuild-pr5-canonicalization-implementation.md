# PR 5 — D4 Vocabulary Canonicalization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan
> task-by-task.
>
> **STATUS: PR 5a TASKS AUTHORED (Session 1, 2026-06-11).** Design doc is LOCKED; §4 has the
> mechanism decisions + evidence. PR 5a tasks below are concrete; PR 5b tasks stay coarse until
> 5a is PROD-verified (locked staging decision). Verify every snippet against current code before
> applying — line numbers and trigger definitions drift.

**Goal:** Rewrite every populated `culturalHeritage` and `academicConcepts` value in the lesson
corpus to its Stage-1-locked canonical form, and ship the durable alias → canonical vocabulary
artifacts that PR 6 / auto-tag / filter UI consume.

**Architecture:** Two sequential data PRs (5a heritage rehearsal → 5b concepts at scale), each:
parser-emitted vocabulary artifact → alias-map migration → minimal filter alignment →
probe-verified at local/TEST/PROD. Canonical WHY reference: the design doc.

**Tech Stack:** PostgreSQL migrations (supabase), Python worksheet parsers
(`scripts/parse-heritage-worksheet.py`, parser in `scripts/build-concepts-tool.py`),
TypeScript (`src/utils/filterDefinitions.ts` alignment), MCP SQL probes.

**Design reference:** `docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-design.md` —
read before starting any task.

**Sub-skills to invoke:**
- `database-migrations` — before touching any file in `supabase/migrations/` (mind the
  same-day-prefix ASCII sort gotcha)
- `superpowers:verification-before-completion` — before claiming any task done
- `superpowers:test-driven-development` — for parser/artifact-emitter changes

**Per-PR ritual:** as specified in the kickoff prompt (pre-push reviewer agent → push → four-surface
bot triage → rebuttal pass → consolidated fix-ups → per-round TEST DB re-verification → round-cap 2).

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| 5a | Heritage canonicalization | Heritage vocab artifact + alias migration + filter alignment + probes | Rehearsal PR. ~88 values / 17 merges / 20 vocab-only `new` adds. |
| 5b | Concepts canonicalization | Concepts vocab artifact + alias migration (82 folds, 7 drops, `sorting_and_categorization` rename) + derived-state refresh | Reuses 5a mechanism. Lands only after 5a is PROD-verified. |

---

## Session 1 — design lock — ✅ DONE 2026-06-11

Discovery ran against TEST (772-row corpus) + full code-path trace; design doc §4 is LOCKED with
evidence inline; the two judgment calls (live-rows-only scope; no subject-key moves in 5b) were
user-confirmed. The tasks below were authored from those locks.

## PR 5a — Heritage canonicalization

**Branch:** `feat/pr5a-heritage-canonicalization` — cut from `main`. NOTE: PR 5a needs only the
heritage worksheet, which is in `main` since 2026-05-12 (PRs #491/#492). The concepts verdict
archive (`0c33808`, on `tools/concepts-worksheet-form`) gates PR 5b only — that branch must reach
`main` before 5b starts, not before 5a.

**Pre-flight reads (verify against current code; line numbers drift):**
- `scripts/parse-heritage-worksheet.py` (entire — the artifact emitter extends this; `Entry`
  dataclass ~line 75, `verify_invariants` ~line 274)
- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` §7 (alias_map output
  contract) + §16 (the 88-row verdict table — the data the emitter round-trips)
- `supabase/migrations/20260518000000_activity_type_multi_select.sql:70-348` (current
  `lessons_normalize_write` — §J cultural_heritage column-wins sync, §V closed-enum validation)
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql` (FTS trigger; fires on
  `UPDATE OF cultural_heritage, metadata`)
- `supabase/migrations/20260520000000_corpus_cleanup_retire_imports.sql` (`retired_at` semantics)

**Key corpus facts (TEST probe 2026-06-11; re-verify at execution time):**
- 78 distinct heritage values all-rows / 77 live; 916 live appearances; column⇄metadata mirror
  exact on all 335 populated rows.
- Non-identity rewrites: 13 kebab literals (`north-american` 13, `latin-american` 4,
  `south-asian` 3, `mediterranean` 2, `east-asian` 2, `levantine` 2, + 7 singletons) and 4
  semantic merges (`Native American` 5, `African American diaspora` 2,
  `Indigenous/Native American` 1, `Indigenous Peoples` 1) → ~36 row-appearances total.

### Task A.1: Heritage vocab artifact emitter (`--emit-json`)

**Files:**
- Modify: `scripts/parse-heritage-worksheet.py` (add `--emit-json PATH` mode)
- Create: `data/vocab/cultural-heritage.vocab.json` (committed emitter output)

**Step 1:** Read the script end-to-end. Add `--emit-json PATH` argparse flag that, after parsing
+ `verify_invariants`, builds the design-doc §4.2 shape:

```python
artifact = {
    "provenance": {
        "source": "docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md",
        "source_commit": "<git rev-parse HEAD at emit time>",
        "verdict_counts": {"keep": 51, "merge": 17, "new": 20},
        "emitted": "<date, passed via --emit-date flag (no ambient clock)>",
    },
    "canonical": [  # verdict in ('keep','new') ONLY — §7 identity-collision invariant
        {"key": e.canonical_key, "label": e.surface_label, "parent": e.parent,
         "filter_ui_tier": e.filter_ui_tier, "verdict": e.verdict, "frequency": e.frequency}
        for e in entries if e.verdict in ("keep", "new")
    ],
    "alias_map": {},  # corpus literal -> canonical key; built below
    "drops": [],      # heritage has no drop verdicts
}
```

alias_map construction: (1) every keep/new entry's `surface_label` → its own key (identity,
confirms the canonical literal); (2) every merge entry's `surface_label` (the corpus literal —
for kebab drift that IS the kebab string) → its `merge_into` key; (3) every alias listed in any
entry's `aliases` array → that entry's resolved canonical key. Collisions with differing targets
→ hard error.

**Step 2:** Built-in self-checks (fail loudly, no silent emit): canonical count == 71; every
`merge_into`/`parent` resolves to a canonical key; alias_map covers every merge entry's literal;
labels unique among canonicals.

**Step 3:** Run `python3 scripts/parse-heritage-worksheet.py --verify-only` (must still pass,
unchanged behavior) then `--emit-json data/vocab/cultural-heritage.vocab.json`. Inspect with
`python3 -m json.tool`. Spot-check against §16: `north-american` kebab → `north-american` key;
`Native American` → `indigenous`; `African American diaspora` → `african-american`.

**Step 4:** Corpus-coverage probe on TEST (the artifact's acceptance test) — every live corpus
literal must resolve through alias_map. Generate the literal list FROM the artifact file, never
typed by hand (feedback_verbatim_identifiers_in_probes):

```sql
-- expect zero rows back:
SELECT v, count(*) FROM lessons, unnest(cultural_heritage) v
WHERE retired_at IS NULL AND v NOT IN (<alias_map keys, generated from the JSON>)
GROUP BY v;
```

**Step 5:** Commit: `tools(pr5a): heritage vocab artifact emitter + cultural-heritage.vocab.json`

### Task A.2: Rewrite migration (generator + migration file)

**Files:**
- Create: `scripts/generate-heritage-rewrite-migration.py` (reads the vocab JSON, prints the
  full migration SQL deterministically — mapping VALUES list never hand-typed)
- Create: `supabase/migrations/<datestamp>_pr5a_heritage_canonicalization.sql` (generator output,
  committed). **Invoke the `database-migrations` skill first**; check
  `ls supabase/migrations | sort | tail -3` for the ASCII date-prefix gotcha.

**Migration structure (generator template):**

```sql
-- 1) Rollback snapshot (idempotent: only rows not already backed up)
CREATE TABLE IF NOT EXISTS public.pr5a_heritage_rollback (
  lesson_id text PRIMARY KEY,
  cultural_heritage text[],
  metadata_culturalheritage jsonb
);
ALTER TABLE public.pr5a_heritage_rollback ENABLE ROW LEVEL SECURITY;  -- no policies: service-role only
INSERT INTO public.pr5a_heritage_rollback (lesson_id, cultural_heritage, metadata_culturalheritage)
SELECT l.lesson_id, l.cultural_heritage, l.metadata->'culturalHeritage'
FROM public.lessons l
WHERE l.retired_at IS NULL
  AND EXISTS (SELECT 1 FROM unnest(l.cultural_heritage) v
              JOIN (VALUES <NON-IDENTITY ALIAS PAIRS>) m(alias, canonical) ON v = m.alias)
ON CONFLICT (lesson_id) DO NOTHING;

-- 2) Rewrite: map each element, dedupe preserving first-occurrence order.
--    Writes the COLUMN; lessons_normalize_write §J mirrors metadata (column wins);
--    update_lesson_search_vector refreshes FTS (UPDATE OF cultural_heritage).
WITH alias_map(alias, canonical) AS (VALUES <NON-IDENTITY ALIAS PAIRS>)
UPDATE public.lessons l
SET cultural_heritage = (
  SELECT array_agg(val ORDER BY first_ord)
  FROM (SELECT COALESCE(m.canonical, u.val) AS val, min(u.ord) AS first_ord
        FROM unnest(l.cultural_heritage) WITH ORDINALITY u(val, ord)
        LEFT JOIN alias_map m ON m.alias = u.val
        GROUP BY COALESCE(m.canonical, u.val)) mapped
)
WHERE l.retired_at IS NULL
  AND EXISTS (SELECT 1 FROM unnest(l.cultural_heritage) v
              JOIN alias_map m ON v = m.alias);

-- 3) Post-verify: RAISE EXCEPTION if any alias literal survives on live rows
--    (checks BOTH column and metadata mirror).
DO $$ ... $$;

-- ROLLBACK (comment): forward migration restoring from pr5a_heritage_rollback,
-- then UPDATE ... SET metadata = metadata to re-fire mirror + FTS.
```

Generator self-check: the VALUES list contains exactly the artifact's non-identity alias pairs
(expected: 17 merge literals + any non-identity `aliases[]` strings), each canonical RHS is a
canonical **surface label** (the stored form), not a key.

**Steps:** generate → read the generated SQL end-to-end → `supabase db reset` (local; 5-row seed
exercises trigger paths, not coverage) → `npm run test:rls` → seed one local lesson with
`cultural_heritage = ARRAY['Native American','Indigenous','north-american']` and verify rewrite
yields `['Indigenous','North American']` + metadata mirror matches + re-run UPDATE matches 0 rows
(idempotency) → commit:
`feat(pr5a): heritage canonicalization migration (rollback snapshot + alias rewrite)`

### Task A.3: Frontend no-op verification

No `filterDefinitions.ts` change expected (design doc §4 "Filter alignment finding"). Prove it:
`npm run test` (filter/facet suites must pass untouched) and record in the status doc that the
diff contains zero `src/` changes. If anything in `src/` turns out to need touching, STOP — that
contradicts the locked design; surface to the user before proceeding.

### Task A.4: Probe set + rehearsal evidence

**Files:**
- Create: `docs/plans/pr5a-heritage-verification-probes.sql` (probes a–f from design §4.8, with
  alias literals generated from the artifact JSON; before/after expected values as comments)
- Create: `docs/plans/2026-06-11-pr5a-heritage-rehearsal-evidence.md` (before-census from TEST,
  expected-after computed, filled in as each tier applies)

Probe sketch (full SQL authored in this task):
(a) live distinct-value census — after == artifact canonical labels with rows, exactly;
(b) per-alias counts — before: recorded; after: all zero (column AND metadata);
(c) appearance conservation — after-sum == before-sum − dedup collisions (compute expected from
    before-state: rows containing both an alias and its target);
(d) zero-orphan filter check — for each `filterDefinitions.ts` heritage slug, run the RPC-path
    expansion (`expand_cultural_heritage(_alias_cultural_heritage(ARRAY[slug]))`) and confirm
    row count > 0 OR matches the pre-rewrite count for known-thin slugs;
(e) FTS smoke — `search_lessons` for 'Indigenous' returns ⊇ the lessons previously tagged
    'Native American';
(f) idempotency — re-run the UPDATE statement, expect "UPDATE 0".
Backup-table check: `pr5a_heritage_rollback` row count == rows matched by the rewrite WHERE.

Commit with A.2 or separately: `docs(pr5a): verification probes + rehearsal evidence scaffold`

### Task A.5: PR ritual → TEST → merge → PROD

1. Pre-push: `npm run type-check && npm run lint`; dispatch code-reviewer agent on
   `git diff main...HEAD` (agent reads the diff); rebuttal pass on every finding; fix-ups
   BEFORE push.
2. Push, `gh pr create` (PR body: design-doc link, probe plan, rollback path).
3. CI applies migration to TEST. Run the FULL probe file via `mcp__supabase-test__execute_sql`;
   record results in the rehearsal evidence doc. Re-run after EVERY fix-up round that touches
   DB state (feedback_per_round_test_db_verification).
4. Four-surface bot triage (comments / reviews / line-comments / checks); round-cap 2.
5. Merge on user instruction. PROD migration workflow: user approves; expect possible SASL flake
   (rerun via `gh run rerun --failed`).
6. PROD verify via `mcp__supabase-remote__execute_sql`: full probe set (a)–(f) + backup-table
   count. Record in evidence doc. PR 5b is gated on this step being green.

## PR 5b — Concepts canonicalization

**Branch:** `feat/pr5b-concepts-canonicalization`

**Pre-flight reads:**
- `docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` (provenance
  header + the 8 resolution notes)
- Parser internals of `scripts/build-concepts-tool.py` (`parse_worksheet`, field extraction)
- PR 3a migration(s) that added `academicConcepts` to `search_vector`

**Precondition:** `tools/concepts-worksheet-form` (carries the returned verdict record,
`0c33808`) must reach `main` before this branch cuts.

### Tasks B.x — authored after 5a is PROD-verified, from the proven 5a mechanism

Session-1 knowledge to carry into B-task authoring (don't re-derive):
- Emitter: new script reusing `build-concepts-tool.py` parse functions, pointed at the RETURNED
  file; recovers corpus literals by normalized match against Appendix A (must be 1:1 for all 208
  strings or fail); `sorting` → `sorting_and_categorization` key rename is a documented special
  case at emit time; label "Sorting and Categorization".
- Rewrite target: `metadata.academicConcepts` ONLY (no flat column). Map each array element
  through alias_map → canonical **surface label** (Title Case — nearly every appearance changes
  case); dedupe within each subject array (folds collide with co-tags); delete the 7 drops;
  remove subject keys whose arrays become empty; subject keys otherwise UNTOUCHED
  (user-confirmed). Live rows only.
- FTS refreshes via trigger (`UPDATE OF metadata`); `_flatten_academic_concepts`
  (`20260523000000`) feeds both subject keys and values into `search_vector` weight C.
- Scale: 663 live rows with concepts, 208 distinct strings, 1912 appearances; 82 folds +
  7 drops; backup table `pr5b_concepts_rollback`.

---

## Test plan

### Unit / script-level
- Emitter self-checks are the unit layer (built into the scripts, fail-loudly): heritage
  canonical count 71, verdict counts 51/17/20; concepts 119 canonical / 82 folds / 7 drops;
  every merge/fold target resolves to a canonical; alias-map collision detection; concepts
  Appendix-A literal match exactly 1:1.
- Generator self-check: migration VALUES list == artifact's non-identity pairs, RHS values are
  canonical surface labels.
- `--verify-only` invariants on both parsers still pass unchanged.

### Integration / DB (probes a–f per design §4.8; all scoped `retired_at IS NULL`)
- Before/after distinct-value census per field at each tier; per-alias row counts copied verbatim
  from the artifacts; zero rows retain any alias after apply (column AND metadata for heritage);
  appearance-conservation totals; idempotency (re-apply matches 0 rows); backup-table row counts.

### RLS
- No policy changes; backup tables get RLS enabled with no policies (service-role only).
  `npm run test:rls` must pass unchanged.

### Manual smoke
- Heritage filter returns results for every visible checkbox post-rewrite (TEST deploy preview);
  `search_lessons` for 'Indigenous' covers the ex-'Native American' lessons; a canonicalized
  concept term (e.g. 'Plant Parts') FTS-matches the lessons its lowercase form did.
