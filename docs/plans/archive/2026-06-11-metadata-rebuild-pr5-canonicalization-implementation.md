# PR 5 — D4 Vocabulary Canonicalization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan
> task-by-task.
>
> **STATUS: PR 5b TASKS AUTHORED (Session 3, 2026-06-11) — PR 5a SHIPPED + PROD-VERIFIED
> (#504 → `0b8057f`).** Design doc is LOCKED; §4 has the mechanism decisions + evidence.
> B-tasks below are concrete, authored from the proven 5a mechanism. Verify every snippet
> against current code before applying — line numbers and trigger definitions drift.

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

**Branch:** `feat/pr5b-concepts-canonicalization` — cut from `main`. Precondition MET: the
returned verdict record is in `main` since PR #503 (`e476f2b`, 2026-06-11); PR 5a is
PROD-verified (#504 → `0b8057f`, probes (a)–(f) green on PROD).

**Pre-flight reads (verify against current code; line numbers drift):**
- `docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` — provenance
  header (3 conflict resolutions + 5 cluster-signal verdicts), §10 (output contract incl. the
  JSON shape), Appendix A (the 208 v3-baseline corpus literals with per-subject counts)
- `scripts/build-concepts-tool.py` — `parse_worksheet` (~line 509), `verify_invariants`
  (~line 604), `parse_merge_aliases` (~line 405), `Entry` dataclass (~line 341)
- `scripts/parse-heritage-worksheet.py` `--emit-json` section + `data/vocab/cultural-heritage.vocab.json`
  (the proven artifact pattern: provenance/canonical/alias_map/drops)
- `scripts/generate-heritage-rewrite-migration.py` + migration `20260611000000_pr5a_heritage_canonicalization.sql`
  (the proven generator/migration pattern)
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql` +
  `20260523000000_flatten_academic_concepts_safer.sql` (FTS trigger fires on `UPDATE OF metadata`;
  `_flatten_academic_concepts` feeds subject keys + values into weight C)
- `supabase/migrations/20260518000000_activity_type_multi_select.sql` `lessons_normalize_write`
  (§A `academicIntegration.concepts` rescue — verified inert corpus-wide; §V validates 3 unrelated
  keys only; §J is heritage-only — concepts has NO flat column, so no mirror concerns)

**Key corpus facts (TEST probes 2026-06-11; re-verify at execution):**
- 663 live rows with concepts / 208 distinct strings / 1912 appearances — exactly Appendix A
  (100% verdict coverage). The 4 extra strings live only on the 21 retired rows (out of scope).
- Verdicts: 119 keep / 82 merge / 7 drop. No `new` verdicts. Merge graph validated at archive
  time: every `merge_into` target is itself a keep (no chains; `seasonal_changes` inbound folds
  were re-pointed to `seasonality` at archive time).
- Drop literals (8 appearances total): `discussion` (2), `design` (1), `food systems` (1),
  `garden topics` (1), `general exploration` (1), `historical context` (1), `plant science` (1).
- 8 strings appear under 2 subjects (Appendix A.7) — alias mapping is subject-agnostic; the 216
  (subject, string) pairs collapse to 208 distinct strings.
- Stored literals are lowercase; canonical labels are Title Case — so unlike 5a's 17 pairs,
  essentially EVERY appearance rewrites (~201 non-identity pairs). The generator still filters
  identity pairs mechanically rather than assuming.

**Two 5a probe learnings to carry (already corrected in the 5a probe file):**
1. Array-content comparisons are SET equality, not byte equality, wherever order isn't load-bearing.
2. (Heritage-specific, no 5b analog: parent-slug filter reach can increase. Concepts is not a
   filter field — no probe (d) analog at all; see B.4.)

### Task B.1: Concepts vocab artifact emitter

**Files:**
- Create: `scripts/emit-concepts-vocab.py`
- Create: `data/vocab/academic-concepts.vocab.json` (committed emitter output)

**Step 1:** New script (TDD per the test plan: start with the self-checks failing on a
deliberately-corrupted in-memory copy, then the real file passing). It loads
`scripts/build-concepts-tool.py` via `importlib.util.spec_from_file_location` (hyphenated
filename is not import-able as a module name) and reuses `parse_worksheet` +
`verify_invariants` + `parse_merge_aliases`. Default `--worksheet` is the RETURNED file
(`docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md`) — NEVER the
unfilled 2026-05-12 source. `--emit-json PATH` + `--emit-date` flags mirror the heritage
emitter (no ambient clock).

**Step 2:** Parse Appendix A (sections A.1–A.6) from the same file: every `` `literal` (count) ``
pair under each subject heading → 216 (subject, literal, count) tuples / 208 distinct literals /
sum 1912. Hard-fail if any of those three totals differs.

**Step 3:** Corpus-literal recovery — match each of the 208 entries to its Appendix A literal by
normalized comparison (lowercase, strip every non-alphanumeric character from both the entry's
`canonical_key` and the literal; e.g. `colonialisms_impact` ↔ `colonialism's impact`,
`how_to_writing` ↔ `how-to writing`, `biotic_abiotic_factors` ↔ `biotic/abiotic factors`).
The match must be exactly 1:1 across all 208 entries ↔ 208 literals; any unmatched entry,
unmatched literal, or double-match is a hard error.

**Step 4:** Build the artifact (worksheet §10 shape + provenance header, 5a pattern):

```python
artifact = {
    "provenance": {
        "source": "docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md",
        "source_commit": "<git rev-parse HEAD at emit time>",
        "verdict_counts": {"keep": 119, "merge": 82, "drop": 7},
        "emitted": "<--emit-date>",
        "renames": {"sorting": "sorting_and_categorization"},  # the one PR-5b key rename
    },
    "canonical": [  # keep entries ONLY (concepts has no `new` verdicts)
        {"key": ..., "label": e.canonical_label, "primary_subject": ...,
         "secondary_subjects": [...], "frequency": ...}
    ],
    "alias_map": {},  # corpus literal -> canonical key; built below
    "drops": [],      # the 7 drop entries' corpus literals
}
```

alias_map construction: (1) every keep entry's corpus literal → its own key; (2) every merge
entry's corpus literal → its `merge_into` key. **`sorting` rename special case:** the keep
entry headed `` `sorting` `` emits key `sorting_and_categorization` (label is already
"Sorting and Categorization" in the returned file — hard-fail if not, guards a stale file);
`categorization`'s `merge_into: sorting` re-points to `sorting_and_categorization`; the corpus
literal `sorting` maps to `sorting_and_categorization` in alias_map.

**Step 5:** Self-checks (fail loudly, no silent emit): canonical count == 119; merge count == 82;
drops == 7 with exactly the literals listed in the corpus facts above; every `merge_into`
resolves to a canonical (keep) key after the rename; alias_map has exactly 201 entries
(208 − 7 drops); labels unique among canonicals; no literal appears in both alias_map and drops;
appearance sum == 1912.

**Step 6:** Run `--verify-only` against the returned file (parser invariants must pass — the
returned file keeps the 32/39/137 tier structure), then emit
`data/vocab/academic-concepts.vocab.json`. Spot-check: `seasonal eating` → `seasonality`;
`categorization` → `sorting_and_categorization`; `colonialism's impact` → `colonialisms_impact`
(keep, label "Colonialism's Impact" — verify actual label from the file, don't assume);
`garden topics` in drops.

**Step 7:** Corpus-coverage probe on TEST (acceptance test; literals generated FROM the artifact,
never hand-typed — feedback_verbatim_identifiers_in_probes):

```sql
-- expect zero rows back: every live concept string resolves through alias_map ∪ drops
SELECT v, count(*) FROM lessons l,
  jsonb_each(l.metadata->'academicConcepts') s(subj, arr),
  jsonb_array_elements_text(arr) v
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND v NOT IN (<alias_map keys + drops, generated from the JSON>)
GROUP BY v;
```

**Step 8:** Commit: `tools(pr5b): concepts vocab artifact emitter + academic-concepts.vocab.json`

### Task B.2: Rewrite migration (generator + migration file)

**Files:**
- Create: `scripts/generate-concepts-rewrite-migration.py` (reads the vocab JSON, prints the
  full migration SQL deterministically — mapping VALUES list never hand-typed)
- Create: `supabase/migrations/20260612000000_pr5b_concepts_canonicalization.sql` (generator
  output, committed). **Invoke the `database-migrations` skill first.** Latest existing prefix
  is `20260611000000_pr5a...` — the next-day prefix `20260612000000` sorts safely after it
  (re-check `ls supabase/migrations | grep -E '^2026' | sort | tail -3` at execution).

**Migration structure (generator template; adapts the 5a template to jsonb-only):**

```sql
-- 1) Rollback snapshot (idempotent: ON CONFLICT DO NOTHING)
CREATE TABLE IF NOT EXISTS public.pr5b_concepts_rollback (
  lesson_id text PRIMARY KEY,
  metadata_academicconcepts jsonb
);
ALTER TABLE public.pr5b_concepts_rollback ENABLE ROW LEVEL SECURITY;  -- no policies: service-role only
INSERT INTO public.pr5b_concepts_rollback (lesson_id, metadata_academicconcepts)
SELECT l.lesson_id, l.metadata->'academicConcepts'
FROM public.lessons l
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (  -- contains ≥1 non-identity-rewritable or dropped literal
    SELECT 1 FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr),
                  jsonb_array_elements_text(arr) v
    WHERE v IN (<non-identity alias literals + drop literals>))
ON CONFLICT (lesson_id) DO NOTHING;

-- 2) Rewrite metadata.academicConcepts in place:
--    per subject key: map each element through alias_map (literal → canonical LABEL),
--    delete drop literals, dedupe preserving first-occurrence order;
--    remove subject keys whose arrays become empty;
--    if the whole object becomes empty, remove the academicConcepts key entirely
--    (matches the corpus convention that rows without concepts lack the key).
--    Subject keys are otherwise UNTOUCHED (no moves — locked §4.5).
--    FTS refreshes via update_lesson_search_vector_trigger (UPDATE OF metadata).
UPDATE public.lessons l SET metadata = <rebuilt> WHERE <row contains ≥1 alias-or-drop literal>;

-- 3) Post-verify DO block: RAISE EXCEPTION if any non-identity literal or drop literal
--    survives on live rows; also RAISE if any subject array is empty or any
--    academicConcepts object is empty (the emptied-key cleanup must have caught them).
```

Generator self-checks (5a pattern): every alias target key resolves to a canonical entry; every
RHS is a canonical surface label distinct from its LHS (identity pairs filtered mechanically);
drop list == the artifact's 7 drops; pair count logged and compared to 208 − 7 − <identity count>.

**Steps:** generate → read the generated SQL end-to-end → local rehearsal: `supabase db reset` +
`npm run test:rls`, then seed local lessons covering the three edge shapes — (i) fold-collision
dedup: `{"Science": ["adaptations", "adaptation", "garden topics"]}` →
`{"Science": ["Adaptations"]}`; (ii) full-empty: `{"Science": ["garden topics"]}` →
`academicConcepts` key removed; (iii) cross-subject: same literal under two subject keys rewrites
under both, no cross-subject dedup — verify FTS regenerates (search_vector changes) and re-running
the UPDATE matches 0 rows (idempotency). Commit:
`feat(pr5b): concepts canonicalization migration (rollback snapshot + alias rewrite + drops)`

### Task B.3: Frontend no-op verification

Concepts is not a filter field (`filterDefinitions.ts` has no academicConcepts category), so the
expected `src/` diff is ZERO — prove it: `npm run test` (full unit suite passes untouched) and
record in the status doc that the branch diff contains no `src/` changes. If anything in `src/`
turns out to need touching, STOP — that contradicts the locked design; surface to the user.

### Task B.4: Probe set + rehearsal evidence

**Files:**
- Create: `docs/plans/pr5b-concepts-verification-probes.sql` (literals generated from the
  artifact JSON; before/after expected values as comments)
- Create: `docs/plans/2026-06-11-pr5b-concepts-rehearsal-evidence.md` (TEST before-census,
  expected-after computed, filled in as each tier applies)

Probe set (adapts 5a's (a)–(f); **no probe (d) filter-reach analog** — concepts feeds FTS only,
not a sidebar filter; in its place a subject-key integrity probe):
(a) live distinct concept-string census across all subject arrays — after == exactly the set of
    canonical labels that have ≥1 corpus appearance (computable from the artifact + before-census);
(b) per-alias appearance counts — before: recorded; after: zero appearances of ANY non-identity
    literal or drop literal (metadata only — there is no flat column for concepts);
(c) appearance conservation — after-sum == before-sum − drop appearances (8 expected on TEST)
    − fold-collision dedups (computed from before-state: same-subject-array co-occurrence of a
    fold source with its target or a sibling source);
(d′) subject-key integrity — per-subject-key row counts unchanged EXCEPT rows whose key emptied
    (expected lesson_ids computed from before-state); zero empty arrays; zero empty
    academicConcepts objects; shape still object-of-arrays on every live row;
(e) FTS smoke — `search_lessons` for a canonicalized term matches the lessons its pre-rewrite
    alias matched (pick from the artifact: e.g. lessons tagged `seasonal eating` before must
    FTS-match 'Seasonality' after; 'Sorting and Categorization' matches the ex-`sorting` +
    ex-`categorization` lessons);
(f) idempotency — re-run the UPDATE, expect "UPDATE 0".
Backup-table check: `pr5b_concepts_rollback` row count == rows matched by the rewrite WHERE;
RLS enabled, 0 policies.

Commit with B.2 or separately: `docs(pr5b): verification probes + rehearsal evidence scaffold`

### Task B.5: PR ritual → TEST → merge → PROD

Same ritual as A.5, with 5b specifics:
1. Pre-push: `npm run type-check && npm run lint`; code-reviewer agent (opus) on
   `git diff main...HEAD`; rebuttal pass; fix-ups BEFORE push.
2. Push, `gh pr create` (body: design-doc link, probe plan, rollback path, scale numbers).
3. CI applies migration to TEST. Run the FULL probe file via `mcp__supabase-test__execute_sql`;
   record in the evidence doc. Re-run after EVERY fix-up round that touches DB state.
4. Four-surface bot triage; round-cap 2.
5. Merge on user instruction. Run the PROD before-census BEFORE approving the PROD workflow
   (5a pattern: PROD counts can differ from TEST — record them, recompute expected-after).
   Expect possible SASL flake (rerun via `gh run rerun --failed`).
6. PROD verify via `mcp__supabase-remote__execute_sql`: full probe set + backup-table check;
   record in evidence doc. This closes PR 5; the rollback-table drops (5a + 5b) stay tracked
   in the status doc for the post-PR-6 cleanup migration.

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
