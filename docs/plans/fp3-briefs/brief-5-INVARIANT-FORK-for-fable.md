# Brief 5 (Main Ingredients) — STOPPED at the §1 invariant fork, packaged for Fable

**Session:** fresh Opus executor, 2026-07-03. **Status:** build NOT started. The §1
data-invariant probe the brief mandated came back **non-zero on PROD (7 lessons)**, which
contradicts the locked design premise ("group-level filtering is a direct match"). The
kickoff names "data invariant broken" as a hard STOP-and-ask trigger, and the owner asked
to route this design fork to Fable. No code written, no branch pushed, nothing touched on
any database (all probes read-only). This doc is the complete handoff so Fable can
adjudicate without re-running anything.

---

## 1. The finding

The locked design (`2026-07-03-fable-design-session.md` §D-C) states: *"the data already
guarantees a specific's parent group rides along, so … group-level filtering is a direct
match."* Brief 5 §1 required verifying that on live data before building, and named the
remedy if it failed: *"surface the count + plan (backfill data fix vs client-side
expansion) before building."*

**It fails on PROD: 7 active lessons carry a specific ingredient whose parent group is
absent from the same array.** With a pure direct-match group filter, selecting a group
(e.g. "Beans & legumes") would silently miss these lessons even though they contain a
child of that group (e.g. "Black beans").

Why it matters: the app *already enforces* this invariant going forward — the reviewer
Zod schema (`mainIngredientsArraySchema.superRefine(refineMainIngredientParents)`,
`lessonMetadata.zod.ts:366-380`) **rejects** an orphan specific on save, and
`canonicalizeReviewMetadata.ts:253-262` auto-adds the parent. So these 7 are **legacy /
imported rows that violate a rule the current app guarantees** — not a design flaw in the
vocab.

---

## 2. Provenance (all queries read-only; DB = **PRODUCTION** `jxlxtzkmicfhchkhiojz`)

### 2a. Schema + overload facts
- `lessons.main_ingredients` exists, type `text[]` (`_text`). ✅
- Exactly **one** `search_lessons` overload on PROD — the 15-arg signature
  `(text, text[]×11, integer, integer, text)`. (Matters for the migration: adding
  `filter_main_ingredients` forces a signature change → must `DROP` the old 15-arg +
  `CREATE` the 16-arg inside a `BEGIN;/COMMIT;` so it stays gap-free under autocommit.)

### 2b. Census (matches the brief numbers exactly)
```sql
SELECT
  (SELECT count(*) FROM lessons WHERE retired_at IS NULL
     AND array_length(main_ingredients, 1) > 0) AS tagged_active_lessons,
  (SELECT count(DISTINCT val) FROM lessons l, unnest(l.main_ingredients) val
     WHERE l.retired_at IS NULL) AS distinct_values;
```
→ `tagged_active_lessons = 397`, `distinct_values = 72` (= 69 of 70 canonical present,
Melons unused, + 3 strays).

### 2c. Invariant probe (the fork trigger)
`parent_map` = the 42 non-null specific→group pairs from `INGREDIENT_PARENT_MAP`
(`lessonMetadata.zod.ts:273-320`).
```sql
WITH parent_map(specific, parent) AS ( VALUES ('Garlic','Alliums'), … 42 rows … )
SELECT count(DISTINCT l.lesson_id) AS violating_lessons
FROM lessons l
JOIN parent_map pm ON pm.specific = ANY(l.main_ingredients)
WHERE l.retired_at IS NULL
  AND NOT (pm.parent = ANY(l.main_ingredients));
```
→ **`violating_lessons = 7`** (expected 0).

### 2d. The 7 violating lessons (detail)

| lesson_id | title | stored `main_ingredients` | specifics missing their parent |
|---|---|---|---|
| `13vpumvgEgzO7jUWdEHamEjXWwOxvQ_KFHaeMVUKvQDo` | Celebrating Eid | Rice, Chickpeas, *Various spices* | Rice→Grains & starches, Chickpeas→Beans & legumes |
| `1HWSlL8xio3QQkculHrVLA0EvEBSU4Th_tEZU4pXiD4Q` | Nigeria / Red Bean Stew | Black-eyed peas, Alliums, Root vegetables, *Various spices* | Black-eyed peas→Beans & legumes |
| `1jfFP2nKtAti3HQZzX2Fi9X72M8BZ02uX` | Equivalent Ratios | Wheat/flour, Black beans, Potatoes, Bananas | all 4 → their groups |
| `1q1icjk5Pgdtqp1EFwU7vNmd07SzrnWfeAYTYqIs59ag` | Three Sister Arepas | Corn/masa, Black beans, Winter squash | all 3 → their groups |
| `1QiqNPrXEpDXt7Hmc8uMC8hWCSNfhi3qacbIuVzqZxZA` | Juneteenth… | Black-eyed peas, Leafy greens | Black-eyed peas→Beans & legumes |
| `1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M` | Soul Food Sunday | Leafy greens, Black-eyed peas, Corn/masa | Black-eyed peas, Corn/masa → their groups |
| `1WOgtZT6tIQs4DQxVZxG9drU1BgNaFCBdt87NKJX01Fs` | Honduras and Baleadas | Pinto beans, Wheat/flour, Dairy, *Avocados* | Pinto beans, Wheat/flour → their groups |

*Italicized values are also §2 strays.* These read like imported curriculum / early
submissions, not the C02 batch re-tag corpus (which auto-added parents).

### 2e. §2 stray-value census (confirms the brief; unchanged, still owner-gated)
3 stray values / 5 instances / **4 distinct active lessons**:
- `Avocados` ×1 — Honduras and Baleadas → map to **Avocado**
- `Basil` ×1 — Italy / Pesto → map to **Fresh herbs**
- `Various spices` ×3 — Celebrating Eid, Italy / Pesto, Nigeria / Red Bean Stew → map to **Spices**

(*"Italy / Pesto" carries both Basil and Various spices, hence 5 instances over 4 lessons.*)

**Overlap note:** 3 of the 4 stray lessons (Eid, Nigeria, Honduras) are also in the §1
violating set — so if Fable chooses the backfill path, both data fixes touch an
overlapping set and could ship as one owner-gated data migration.

---

## 3. The fork (Fable's call)

| # | Option | Ships correct… | PROD data mutation | Design fit | Notes |
|---|---|---|---|---|---|
| A | **Backfill 7 lessons' missing parents**, keep group filter = plain direct match `&&` | after the owner-gated backfill applies | yes: +parent groups on 7 lessons (bundle w/ §2 strays) | **matches locked design exactly** ("direct match", "simpler than heritage") | Heals rows that violate the app's own enforced Zod rule. Simplest RPC/predicate. Small window pre-approval where the 7 are under-matched at group level. |
| B | **Group→children expansion** in RPC + facet predicate (model on Cultural Heritage) | the moment it ships | **none** | diverges from locked "direct match / simpler than heritage" | Robust to future drift; zero PROD data risk. Adds an `expand_ingredients()`-style SQL fn + a down-expansion twin in `facetCounts.ts`. |
| C | **Both** — expansion now + backfill later as hygiene | immediately | yes (later) | diverges | Belt-and-suspenders; carries expansion complexity permanently even once data is clean. |

**Executor's lean (not a decision):** **A**. It restores the exact premise the owner
locked, keeps the query model as simple as the design promised, and the "fix" is just
enforcing on 7 legacy rows the invariant the app already guarantees. The only cost is one
more small owner-gated data fix — and it bundles cleanly with the §2 stray cleanup that's
already owner-gated. B is defensible if Fable would rather never touch PROD data and
accept permanent parity with heritage's expansion model.

---

## 4. What is INDEPENDENT of the fork (scope preview, so Fable sees the whole build)

Everything below is identical under A or B — only the RPC WHERE clause and the
`facetCounts` match predicate for `mainIngredients` change with the choice:

- **`filterDefinitions.ts`** (the one owner-approved edit): move `mainIngredients`
  `METADATA_CONFIGS → FILTER_CONFIGS` as a group→specific **tree** (24 groups w/ children
  + 4 group-less specifics as top-level leaves, generated from
  `MAIN_INGREDIENTS_VALUES` + `INGREDIENT_PARENT_MAP`). Opportunistic rider: drop the F3
  dead exports (`METADATA_KEYS`, demote `METADATA_CONFIGS` to private).
- **Reviewer-form compatibility:** `selectOptionsFromConfig`
  (`reviewDetailHelpers.ts:102`) currently maps **top-level options only** — it must be
  made to **flatten `children`** or the reviewer's Main-Ingredients `<Select>` silently
  loses the 42 specifics. (value===label so chip labels still resolve via fallback.)
- **`SearchFilters` + `initialFilters`**: add `mainIngredients: string[]`.
- **`urlParams.ts`**: add `mainIngredients ↔` a short param (e.g. `ing`); the recursive
  `validValuesForFilter` already walks `children`, so tree values validate for free.
- **`facetCounts.ts` / `useFacetCounts.ts`**: add `mainIngredients` to `FacetFilterKey`,
  `KEYS`, `EMPTY_COUNTS`, `FacetLesson`, `OPTION_VALUES_BY_KEY`, `PreparedLesson`,
  `prepareLesson`; add `main_ingredients` to `FACET_COLUMNS` (10→11), `FacetCorpusRow`,
  `rowToFacetLesson`. **← the per-option match predicate here is the fork-dependent line.**
- **`useLessonSearch.ts`**: pass `filter_main_ingredients` when non-empty.
- **New `IntMainIngredientsSection.tsx`** modeled on `IntCulturalHeritageSection`
  (≤2-deep tree, collapsed by default), slotted into `IntSidebar` at **position #3**
  (right after Activity Type, before Location) — needs the single `CHECKBOX_KEYS.map`
  broken so the bespoke section injects after `activityType`.
- **Migration** (`search_lessons` +`filter_main_ingredients text[]`): `DROP` the 15-arg +
  `CREATE` the 16-arg in one `BEGIN;/COMMIT;`; re-`GRANT`; `NOTIFY pgrst`. Name must sort
  after the head `20260703040000_*` (mind digits-before-underscore). **← the WHERE clause
  is the fork-dependent line.**
- **Split-deploy note for the owner:** the new param has `DEFAULT NULL`, so an OLD
  frontend call (no `filter_main_ingredients`) still resolves to the new 16-arg function;
  the only exposure is a user actively selecting an ingredient in the gap between Netlify
  deploy and PROD-migration approval → approve the migrate-production run promptly.

---

## 5. Next step

Fable picks A / B / C. Then a fresh Opus session executes the (now-unforked) brief end to
end: build → local gates → PR → TEST-DB verification → 4-surface bot triage → hand back
with the PROD pre-apply probes posted and the owner-gated data fix(es) prepared
(TEST-rehearsed, before/after counts). No PROD apply, no merge, no gate approval by the
executor — those stay owner-only.

---

## 6. RESOLVED — Option A (owner decision, 2026-07-04, via Fable adjudication)

Fable independently re-ran the invariant probe (same 7 lessons, same titles) and presented
A/B/C to the owner with previews; **the owner chose A: backfill the 7 lessons' missing
parent groups and keep the group filter a plain direct match**, exactly restoring the
locked D-C premise. Rationale: the 7 rows violate a rule the app itself already enforces
on every save (the Zod `refineMainIngredientParents` rule would reject them today), so
they are data errors to heal, not a competing design; B would carry heritage-style
expansion complexity forever for a ~15-user tool.

**Sequencing refinement (Fable):** apply the combined owner-gated data fix — §1 backfill
(7 lessons) + §2 stray cleanup (4 lessons; 3 overlap → ~8 distinct lessons) — **BEFORE the
feature merges**, killing the doc's "small window where the 7 are under-matched" entirely.
Adding group tags / canonicalizing strays is harmless to the live app pre-feature (nothing
filters on ingredients yet; the drawer simply shows the corrected tags). Order: executor
prepares exact SQL + TEST rehearsal with before/after counts → owner approves → apply to
PROD → invariant probe returns 0 → feature PR merges → migration gate.

---

## 7. NEW BLOCKER (2026-07-04, fresh Opus executor) — Option A's backfill trips `valid_cooking_skills`; reopens A-vs-B

**STOP fired during the very first build step (the data fix).** The Option-A backfill
cannot be applied to PROD as scoped, because of an *unrelated* grandfathered constraint on
the exact same rows. No code was written, no branch pushed, nothing committed. TEST was
touched only by the rehearsal attempt, which **rolled back cleanly** (verified 763/685/130,
7 violating, 4 strays — baseline intact). No PROD writes. This section is the complete
handoff so Fable can adjudicate without re-running anything.

### 7a. The finding
The combined data fix (`brief-5-data-fix.sql`) UPDATEs `main_ingredients` on the 8 affected
lessons. On the FIRST TEST rehearsal it aborted:
```
ERROR: 23514: new row for relation "lessons" violates check constraint "valid_cooking_skills"
DETAIL: Failing row … Nigeria / Red Bean Stew … cooking_skills = {Chopping,Mixing,Measuring}
```
**Mechanism:** `valid_cooking_skills` and `valid_main_ingredients` are the only two `NOT
VALID` CHECK constraints on `lessons` (`convalidated=false`, verified on PROD via
`pg_constraint`). `NOT VALID` grandfathers *existing* rows but is still **enforced on every
INSERT/UPDATE** — and Postgres re-checks the ENTIRE modified row against ALL its CHECK
constraints, not just the changed column. So writing `main_ingredients` re-validates the
row's *unchanged* `cooking_skills`, which is off-vocab on these legacy rows → the UPDATE
fails. No SQL trick avoids it (any write to the row re-checks it). `valid_main_ingredients`
is satisfied post-fix (all targets are canonical), so cooking_skills is the sole blocker.

### 7b. Why these rows (ties back to §2d)
These are the same "imported curriculum / early submission" rows the fork doc flagged —
they were **NOT in the C02 re-tag corpus**, which is exactly why they have BOTH problems:
missing ingredient parents (the §1 invariant) AND pre-C02 off-vocab `cooking_skills`
(e.g. "Basic Skills", "Recipe reading", "Chopping", "Following directions"). C02's
auto-add-parent + cooking_skills canonicalization simply never processed them.

### 7c. Scope (PROD `jxlxtzkmicfhchkhiojz`, read-only, 2026-07-04)
- **All 8** of my target lessons carry off-vocab `cooking_skills` → all 8 UPDATEs would
  fail on PROD, not just on TEST.
- Library-wide: **11 active** lessons (18 including retired) violate `valid_cooking_skills`.
  My 8 are a subset; 3 more active legacy rows share the same staleness (out of my scope).
- Distinct off-vocab `cooking_skills` on the 8 rows (11 values): `Assembling`, `Basic
  Skills`, `Chopping`, `Following directions`, `Grinding`, `Measuring (dry/liquid)`,
  `Mixing`, `Mixing/stirring`, `Recipe reading`, `Sautéing`, `Simmering`.
  Some map obviously (Mixing→"Mixing & stirring", Sautéing→"Sautéing & stir-frying",
  Simmering→"Boiling & simmering", Chopping→"Knife skills", Recipe reading→"Reading &
  following recipes", Assembling→"Assembling dishes", Measuring (dry/liquid)→"Measuring").
  Others have **no obvious canonical target**: `Basic Skills`, `Following directions`,
  `Grinding`. Those need a curriculum/owner mapping decision.
- The C02 re-tag was **LLM-semantic, per-lesson — not a deterministic old→new table**
  (`scripts/stage2-retag/`), and memory records an explicit "don't re-run the LLM re-tag /
  re-open frozen vocab" constraint. So there is no turnkey mapping to reuse.

### 7d. Why this reopens the locked A-vs-B call
Option A was chosen because the backfill is "simple — just heal rows that violate a rule
the app already enforces." That premise is now materially weaker:
- **A now requires a SECOND, out-of-scope data mutation** (canonicalize `cooking_skills` on
  ≥8 legacy rows, incl. 3 ambiguous values needing an owner mapping) *before* the ingredient
  backfill can even be written. Brief 5 explicitly scoped out "any other vocab edits."
- **Option B (group→children expansion in the RPC + facet predicate) needs ZERO PROD data
  mutation**, so it is *immune* to this blocker and ships correct the moment it merges. The
  cost Fable weighed against B (permanent heritage-style expansion complexity) is unchanged,
  but A's "cheap side" just got more expensive and now carries a vocabulary decision.

### 7e. Options for Fable (pick one)
| # | Path | PROD data mutation | Unblocks | Cost |
|---|------|--------------------|----------|------|
| A′ | Backfill **+ canonicalize cooking_skills** on the affected rows | yes, into 2 vocabularies incl. 3 ambiguous values | needs an owner cooking_skills mapping first | scope creep; a mapping decision; still A's simple RPC |
| B | Switch to **RPC/facet group→children expansion** (the shelved option) | **none** | immediately, no data touch | permanent expansion parity with heritage (2 predicates) |
| A″ | Ship A's feature now, **defer the data fix** to a later legacy-row cleanup | later | feature merges; 7 rows under-match at group level until cleanup | temporary under-match (the exact thing the §6 sequencing tried to avoid) |
| — | Broader **legacy-row rehab** (VALIDATE both NOT-VALID constraints after healing all 11/18 rows) | yes, larger | everything | a project, not a brief step |

**Executor's lean (not a decision):** **B** now looks materially stronger than it did at §6
— it needs no PROD data mutation, so it sidesteps both the ingredient invariant AND this
newly-surfaced cooking_skills entanglement in one move, and the feature ships correct on
merge with no owner-gated data step at all. A′ is defensible if the owner wants the data
genuinely healed and is willing to make the cooking_skills mapping call (which also fixes 3
more legacy rows as a bonus). The rest of the build (fork-doc §4) is unchanged and unbuilt.

### 7f. Artifacts left in the tree (uncommitted, no branch/PR)
- `brief-5-data-fix.sql` — the correct main_ingredients backfill+stray SQL, header-flagged
  BLOCKED. Directly usable under A′ once cooking_skills is resolved (would need the
  cooking_skills remap prepended, or the constraint handled).
- This §7.

---

## 8. RESOLVED (2nd fork) — Option A′ + owner mapping (2026-07-04, owner via Fable)

Fable independently verified §7's claims on PROD (both `NOT VALID` constraints
confirmed via `pg_constraint`; 11 active / 18 total violating rows; ambiguous-value
lesson context) and presented the fork + the three ambiguous mappings to the owner.

**Decision: A′ — heal the data.** Deciding logic: the 11 frozen active rows are a live
landmine independent of this feature (ANY update to them — including a reviewer
approve_update — fails the constraint), so the cooking_skills mapping work is owed
regardless; B would pay permanent expansion complexity AND still leave that debt.
Scope: heal **all 11 active** frozen lessons (not just the 8), then the §6 plan resumes
unchanged. The 7 retired frozen rows + `VALIDATE CONSTRAINT` for both NOT-VALID checks
stay parked as future hygiene.

**Owner-decided cooking_skills mapping (2026-07-04):**

| stored value | → canonical |
|---|---|
| Basic Skills | **DROP** (remove from array) |
| Following directions | Reading & following recipes |
| Grinding | Blending & juicing |
| Assembling | Assembling dishes |
| Chopping | Knife skills |
| Measuring (dry/liquid) | Measuring |
| Mixing | Mixing & stirring |
| Mixing/stirring | Mixing & stirring |
| Recipe reading | Reading & following recipes |
| Sautéing | Sautéing & stir-frying |
| Simmering | Boiling & simmering |

Execution notes for the data fix:
- **De-duplicate after remap** (a row may already carry the canonical value alongside
  the legacy one — the array must not end up with duplicates).
- The §7c value list came from the 8-row set; the full 11-active set may surface
  additional off-vocab values. Obvious canonical targets → map and record; any NEW
  value with no obvious target → STOP, hand back (same protocol as before).
- Single combined owner-gated data fix, ordered inside the UPDATE per row:
  cooking_skills remap (unfreezes the row) + main_ingredients parent backfill +
  stray canonicalization (Avocados→Avocado, Basil→Fresh herbs, Various spices→Spices).
  ~12 distinct lessons touched. TEST rehearsal with before/after counts; TEST baseline
  restored; owner approves before any PROD write; post-apply probes: invariant = 0,
  strays = 0, cooking_skills active violations = 0.
- Everything else (§4 build scope, §6 sequencing: data fix lands on PROD BEFORE the
  feature merges) is unchanged.
