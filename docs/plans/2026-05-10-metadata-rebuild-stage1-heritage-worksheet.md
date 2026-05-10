# Stage 1 Heritage Worksheet

> **Status: SCAFFOLD (Session 60, 2026-05-10).** Header sections (purpose, methodology, hierarchy rules, verdict vocabulary, per-entry shape, cluster framing pattern, filter-UI tier conventions, parsing convention) are complete and load-bearing. Per-cluster framing blocks contain corpus distribution data from the Session 59 query. **Per-value entries are not yet populated** — that work happens in subsequent sessions before curriculum-team handoff. End-summary canonical-vocab table fills only as per-value verdicts close.
>
> **Owner during scaffold/pre-handoff phase:** project maintainer (Claude + user). **Owner at handoff:** ESYNYC curriculum team.
>
> **Companion doc:** `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` (project-internal progress tracker + Session 59 design rationale).

---

## 1. Purpose & methodology

### What this worksheet is

The Stage 1 heritage worksheet is the curriculum-team-facing artifact for **canonicalizing the `culturalHeritage` field** of the ESYNYC lesson taxonomy. It captures, per candidate value:

- Whether the value belongs in the canonical vocabulary (`keep` / `merge` / `split` / `drop` / `new`)
- What surface label the user-facing UI shows for it
- What aliases (case-mixing drift, kebab-case slugs, synonymous variants) collapse into it during the Stage 2 corpus re-tag migration
- Where the value sits in the hierarchy (parent canonical key, if any)
- What filter-UI tier it surfaces in (top-level filter / sub-filter / internal-only)

The output is a **locked canonical heritage vocabulary** that downstream consumers operate on:

| Consumer | What it does with the output |
| --- | --- |
| **PR 5+ (D4 vocab canonicalization migration)** | Reads the alias → canonical-key map; rewrites every `lessons.metadata.culturalHeritage` row to canonical surface labels. |
| **PR 6+ (Stage 2 corpus re-tag)** | Reads the canonical vocabulary + parent chains as the closed-vocab constraint for the Opus re-tag prompt. |
| **Submission-time LLM auto-tag (PR 2 deferred prompt)** | Same closed-vocab constraint; this prompt was gated on Stage 1 closure for a reason. |
| **Filter UI (sidebar)** | Reads the canonical surface labels + filter-UI tier markings to render the heritage filter. |
| **Reviewer UX (Phase 2)** | Reads the canonical vocabulary + parent chains for any picker / autocomplete the future reviewer redesign uses. |

The worksheet is **the source of truth for the canonical vocabulary** until the canonicalization migration ships and bakes the result into schema + data.

### What the curriculum team is being asked to do

For each candidate canonical value (per-value entry below), make a `verdict` call:

- **`keep`** — value is canonical; surface label and parent are as listed.
- **`merge`** — value is a non-canonical alias; merge into another canonical value (you specify which one).
- **`split`** — current canonical value bundles two distinct concepts; split into multiple canonical values (you specify which).
- **`drop`** — value should not be canonical; corpus rows tagged with it move to the merge target or to nothing.
- **`new`** — value should be added to canonical even though it's outside v3 baseline.

Plus the surface-label call (display string the UI shows), alias list (corpus variants that map to this canonical), parent (which cluster / sub-region this nests under), and filter-UI tier (where it surfaces in the sidebar).

### Methodology (per design doc §5)

Three inputs converge into each verdict:

1. **v3 baseline** (see Appendix A — verbatim §3 Cultural Heritage from `esynyc-taxonomy-schema-v2.md`) — the working hypothesis for canonical shape. Most v3 values will `keep` as-is; a few may `split` or change parent.
2. **Per-value Opus-corpus-read evidence** — for any value with non-trivial usage (5+ lessons) or any ambiguous value, an Opus agent reads the actual lesson bodies tagged with it to confirm whether the tagging is semantically consistent. Surfaced in collapsible `<details>` excerpts on each per-value entry. Mechanical canonical-vs-kebab-case-drift values don't need fresh Opus reads — the canonical-vs-alias call is structural.
3. **Reviewer / user validation** — curriculum-team subject-matter judgment on the cluster framing and verdict calls, especially for ambiguous identities, diaspora handling, and new sub-region candidates.

### Worksheet hand-off model

```
SCAFFOLD (this session)        PRE-HANDOFF (subsequent sessions)        HANDOFF (curriculum team)
       │                                  │                                       │
       ▼                                  ▼                                       ▼
Header sections written        Per-value entries populated:           Curriculum team fills:
Cluster framing blocks pre-     - canonical key                        - verdict per entry
populated with corpus           - corpus frequency                     - surface label
distribution data               - alias candidates                     - aliases (confirm/refine)
                                - parent (proposed)                    - parent (confirm/refine)
                                - filter-UI tier (proposed)            - filter-UI tier (confirm/refine)
                                - Opus-corpus-read excerpts            - notes
                                  (collapsible details)
                                - notes (proposed)
```

### What this worksheet IS NOT

- Not an implementation plan. Code, migrations, and edge functions don't appear here.
- Not a reviewer-UX design doc. The "Phase 2 reviewer UX" track is separate.
- Not a Stage 2 corpus re-tag plan. Stage 2 uses this worksheet's output as input but is its own work track (PR 6+).
- Not a place to debate whether `culturalHeritage` should exist as a field. That question is locked closed — the field stays.

---

## 2. Hierarchy rules (2-level-flexible)

### The shape

The canonical heritage vocabulary is **a forest of parent-chain trees**, with depth flexibility per cluster:

```
Cluster root (Asian, Americas, African, European, Middle Eastern, OR diaspora-cluster-root)
   │
   ├─ Sub-region (optional — present if cluster shape calls for one)
   │     │
   │     └─ Country-specific (optional — present if value granular enough)
   │
   └─ Country-specific (optional — directly under cluster root if no sub-region applies)
```

**2-level-flexible** means: each cluster can land at depth 1 (just cluster root), depth 2 (cluster + sub-region OR cluster + country), or depth 3 (cluster + sub-region + country). Depth is per-cluster, not uniform across the worksheet.

### Why flexible

The Session 59 corpus query (76 distinct `culturalHeritage` values across the active corpus) showed three things:

1. **Some clusters use deep nesting naturally.** Asian cluster has sub-regions actively used in the corpus (East Asian 35, South Asian 15, Southeast Asian 5, Central Asian 4) plus country-specifics under those (Chinese 15, Japanese 9, Indian 7, etc.) — depth 3 fits.
2. **Some clusters use shallow nesting.** Middle Eastern has one active sub-region (Levantine 14) and a handful of country-specifics — could be depth 2 (cluster → country) plus an optional Levantine sub-region.
3. **Some values fit no region→sub-region→country pattern.** Indigenous identities (Indigenous 24, Lenape 7, Haudenosaunee 3), diaspora identities (African American 24), and pan-regional identities span multiple regional axes. These get a **cross-cluster diaspora cluster** rather than being shoe-horned into a regional cluster.

Pre-locking 1-level depth would force "merge upward" of country-specifics that have substantial corpus usage and real semantic distinctness; pre-locking 3-level depth would over-engineer clusters that don't need sub-regions. Flexibility per cluster is the right call.

### Multi-parent values (cross-cluster)

Some values plausibly belong under more than one cluster (e.g., **Egyptian** — North Africa cluster, or Middle Eastern cluster? **Persian** — Middle Eastern cluster, or Central Asian cluster?). These get a **single canonical home** per the cluster framing call, but the cross-cluster section logs the alternative and the reasoning.

The hierarchy artifact UI (a future companion tool — design captured in the Stage 1 execution status doc Decision 2) surfaces the parent chain as a tree but allows visual inspection of multi-parent ambiguity via the cross-cluster section. The canonical store remains single-parent.

### Cluster boundaries

Cluster boundaries are inherited from v3 baseline (Asian / Americas / African / European / Middle Eastern) plus one diaspora-cluster-root for cross-region indigenous and diaspora identities. Curriculum team can refine cluster boundaries during worksheet fill if a value clearly belongs to a different cluster than its v3 placement — those refinements live in the cross-cluster section.

---

## 3. Verdict vocabulary

Each per-value entry has a `verdict` field. The five verdicts:

| Verdict | What it means | Per-entry follow-up |
| --- | --- | --- |
| **`keep`** | Value is canonical. Surface label, parent, filter-UI tier all stand as listed (or are refined within `keep`). | Confirm surface label, parent, filter-UI tier; populate alias list. |
| **`merge`** | Value is not canonical; rows tagged with it should move to another canonical value during Stage 2 re-tag. | Specify `merge_into: <canonical_key>`. Examples: `american` (lowercase drift) merges into `American`; `north-american` merges into `North American`. |
| **`split`** | Current canonical value bundles two genuinely distinct concepts; split into multiple canonical values. | Specify `split_into: [<canonical_key_1>, <canonical_key_2>, ...]` and the disambiguation rule (which lessons go to which new value). Rare; example: v3's `Russian/Ukrainian` may split into `Russian` + `Ukrainian` if curriculum-team judgment calls them distinct. |
| **`drop`** | Value should not be canonical; rows tagged with it move to merge target (specify) or to no tag (specify). | Specify `drop_to: <canonical_key>` OR `drop_to: <unset>`. Rare; example: if a value has 1 corpus occurrence and is clearly noise (typo, accidental). |
| **`new`** | Value should be added to canonical even though it's outside v3 baseline. Used for sub-regions or country-specifics with corpus signal but no v3 entry. | Specify surface label, parent, filter-UI tier, frequency, content evidence (Opus read on the lessons tagged with the source variant). Examples: `North African` (2 lessons), `East African` (1 lesson), `Yemeni` (3 lessons). |

**Verdict combinations.** A canonical value is `keep` or `new`; an alias / drift variant is `merge`. `split` and `drop` are rare. The curriculum team selects exactly one verdict per entry.

---

## 4. Per-value entry shape

Each per-value entry is a labeled-line block. Format:

```markdown
#### <cluster>.<index>. <surface_label> (<frequency_count>)

- **canonical_key:** `<slug>` — kebab-case lowercase
- **surface_label:** `<display string>`
- **parent:** `<canonical_key of parent>` OR `null` (for cluster-root entries)
- **filter_ui_tier:** `top` | `sub` | `internal`
- **verdict:** `keep` | `merge` | `split` | `drop` | `new`
- **merge_into / split_into / drop_to:** `<canonical_key>` (only for merge/split/drop)
- **aliases:** `["alias_1", "alias_2", ...]` (corpus variants that map to this canonical)

<details><summary>Corpus evidence (N lessons)</summary>

- Opus-read excerpts from sample lessons tagged with this value or its variants
- Each excerpt is ~200-400 chars from the lesson body
- Excerpts are evidence the curriculum team can scan to verify the verdict

</details>

<!-- Optional reviewer notes go here as inline HTML comments; parser strips them -->

**Notes:** <free-form prose — disambiguation rules, edge cases, multi-parent considerations>

---
```

### Fillable fields

For curriculum-team fill:

- `verdict` — required, one of five
- `merge_into` / `split_into` / `drop_to` — required iff verdict is merge / split / drop
- `surface_label` — confirm or refine the pre-populated proposal
- `aliases` — confirm or refine; one-line `<!-- review note -->` inline tolerated
- `parent` — confirm or refine
- `filter_ui_tier` — confirm or refine
- `notes` — optional but valued

For Claude-pre-population (in subsequent sessions before handoff):

- `canonical_key` — generated from surface label (kebab-case lowercase)
- `surface_label` (proposal) — from v3 baseline OR best-fit Title Case from corpus drift cluster
- `frequency_count` — total lesson-appearances in the active corpus (from Session 59 corpus query, refreshed if corpus drifts)
- `parent` (proposal) — v3 baseline or first-principles cluster fit
- `filter_ui_tier` (proposal) — first-principles from frequency + canonical-ness
- `aliases` (proposal) — all observed drift variants from corpus query
- Opus-corpus-read `<details>` — for values with frequency ≥5 OR ambiguous parent / verdict

### Parser-compatible format

The labeled-line shape (`- **field_name:** value`) is parseable by a small Python script (similar to the activity-type-v2 worksheet parser) into structured JSON for downstream consumers. The end-summary canonical-vocab table (§16) is regenerated mechanically from the parsed entries.

---

## 5. Cluster framing pattern (C-pattern: narrative + per-value SoT + decision summary + cross-cluster)

Each cluster has three components:

### 5.1 Cluster framing block (corpus distribution + decisions to surface)

A reference frame at the top of each cluster section. Contents:

```markdown
### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- <Cluster root>: <N> lessons
- <Sub-region>: <N> lessons
- ... per-value counts ...
- **Kebab-case drift in this cluster:** <count> values, <total_drift_appearances> appearances

**Cluster decisions to surface:**

1. <decision question 1, e.g., "Sub-region structure: do we keep East Asian / Southeast Asian / South Asian / Central Asian as separate sub-regions, or merge under a unified Asian umbrella?">
2. <decision question 2, e.g., "Country-specific bar: Chinese has 15 lessons, Korean has 3 lessons — what's the minimum bar to canonicalize a country-specific?">
3. <decision question 3, e.g., "Multi-parent ambiguity: <value> could belong here or under <other cluster>; which is the canonical home?">
```

This block is **reference data**; the curriculum team reads it before working through the cluster's per-value entries. The framing block is pre-populated during scaffold.

### 5.2 Per-value entries (source of truth)

The series of `### <cluster>.<index>. <surface_label>` blocks per §4. These are the **vocabulary changes** consumers read mechanically.

### 5.3 Cluster decision summary block (the WHY)

A free-form prose block at the end of each cluster section that captures the curriculum-team reasoning for the cluster's shape:

```markdown
### Cluster decision summary

<Free-form prose. Curriculum team writes 2-5 paragraphs explaining:>

- Why this cluster's hierarchy ended up at the depth it did
- Why the bar for country-specific canonicalization landed where it did
- How ambiguous / multi-parent values were resolved (with cross-references to the
  cross-cluster section as needed)
- Any edge cases worth documenting for future Stage 2 / D4 / Phase 2 work
- Any deferred questions or known limitations
```

This block is **the rationale record**. Future contributors revisiting heritage decisions read this to understand WHY the cluster looks the way it does.

### 5.4 Cross-cluster section

One top-level section (§9 below) for values and conventions that span clusters:

- Diaspora identities (African American, etc.)
- Indigenous identities (Indigenous, Lenape, Haudenosaunee, etc.)
- Multi-parent canonical values (Egyptian → African or Middle Eastern? Persian → Middle Eastern or Central Asian?)
- Filter-UI tier conventions that apply uniformly (see §6)
- Naming conventions (Title Case canonical labels; kebab-case-lowercase slugs)

---

## 6. Filter-UI tier conventions

The user-facing sidebar filter for `culturalHeritage` doesn't surface every canonical value at the top level — that would produce a 50+ option flat list. Each canonical value carries a `filter_ui_tier` marking:

| Tier | What it means | Where it surfaces |
| --- | --- | --- |
| **`top`** | Top-level filter chip in the sidebar's `Cultural Heritage` filter | Visible without expand; curriculum-team highest-priority signal. Examples: cluster roots (Asian, Americas, African, European, Middle Eastern), high-frequency sub-regions. |
| **`sub`** | Sub-filter shown when parent `top` is selected | Renders under the parent chip on expand. Examples: lower-frequency sub-regions, high-frequency country-specifics. |
| **`internal`** | Stored in metadata + searchable via FTS / embeddings, but not surfaced as a clickable filter chip | Drives search relevance but not faceted filtering. Examples: very-rare country-specifics (≤2 corpus occurrences), historical tags retained for backwards compatibility. |

**First-principles guideline for the curriculum team to refine:**

- `top` if frequency ≥40 lessons OR cluster root
- `sub` if frequency ≥5 lessons AND has a clear parent `top`
- `internal` if frequency <5 lessons OR redundant given a parent `sub` already exists

These are **defaults**, not rules. Curriculum-team judgment overrides — e.g., a value with 4 corpus occurrences may deserve `sub` if it has high curricular significance.

---

## 7. Parsing convention

When the worksheet is filled and ready for hand-off, the next-stage tool parses each per-value entry's labeled-line block. Parsing convention:

```
- **<field_name>:** <value>
```

- `<field_name>` is a known field (canonical_key / surface_label / parent / filter_ui_tier / verdict / merge_into / split_into / drop_to / aliases / notes)
- `<value>` is field-typed (string / canonical_key-shape / enum / list)
- Inline HTML comments (`<!-- ... -->`) are tolerated and stripped by the parser
- Cluster framing blocks and cluster decision summary blocks are **not** parsed structurally — they are human reference / narrative
- The end-summary canonical-vocab table (§16) is **generated mechanically** from parsed per-value entries; do not hand-edit it (changes get clobbered on re-parse)

**Skipped entries:** if a `verdict` line is missing or blank, the parser warns but does not fail. Unparsed entries are excluded from the canonical vocabulary output until filled.

**Output shape (handed to PR 5+ migration):**

```json
{
  "canonical": [
    {"key": "asian", "label": "Asian", "parent": null, "filter_ui_tier": "top"},
    {"key": "east-asian", "label": "East Asian", "parent": "asian", "filter_ui_tier": "sub"},
    ...
  ],
  "alias_map": {
    "Asian": "asian",
    "asian": "asian",
    "North American": "north-american",
    "north-american": "north-american",
    ...
  },
  "drops": [...]
}
```

**alias_map keys** are corpus literal strings (canonical surface labels OR drift variants); **values** are canonical keys (kebab-case lowercase slugs). Identity-shaped entries (e.g., `"north-american": "north-american"`) are meaningful — they confirm a kebab-case drift literal resolves to the canonical_key for the corresponding Title Case canonical surface label.

---

## 8. Table of contents

- §9 [Cross-cluster section](#9-cross-cluster-section)
- §10 [Cluster template (annotated example)](#10-cluster-template-annotated-example)
- §11 [Cluster: Asian](#11-cluster-asian)
- §12 [Cluster: Americas](#12-cluster-americas)
- §13 [Cluster: African](#13-cluster-african)
- §14 [Cluster: European](#14-cluster-european)
- §15 [Cluster: Middle Eastern](#15-cluster-middle-eastern)
- §16 [End summary: canonical vocabulary table](#16-end-summary-canonical-vocabulary-table)
- [Appendix A: v3 baseline (Cultural Heritage)](#appendix-a-v3-baseline-cultural-heritage)

---

## 9. Cross-cluster section

### 9.1 Diaspora & indigenous identities

Values that don't fit a region→sub-region→country pattern get a single canonical home here. Per Session 59 design decision: these are a **cross-cluster diaspora cluster**, not absorbed into a regional cluster.

**Corpus distribution (active, non-retired lessons):**

- `African American`: 24 lessons (canonical surface label TBD; current v3 baseline label is `African American diaspora`)
- `African American diaspora`: 2 lessons
- `Indigenous`: 24 lessons
- `Indigenous/Native American`: 1 lesson (v3 canonical surface label)
- `Indigenous Peoples`: 1 lesson
- `Native American`: 5 lessons
- `Lenape`: 7 lessons
- `Haudenosaunee`: 3 lessons
- v3-baseline-but-corpus-absent: `Soul Food`, `Three Sisters traditions`, `Black culinary history`, `Cajun/Creole`

**Cross-cluster decisions to surface:**

1. Diaspora-cluster naming: is the cluster root `Diaspora & indigenous`, `Indigenous & diaspora`, or split into two cluster roots (`Indigenous` + `Diaspora`)? Pre-population proposal: single cluster root, label TBD curriculum team.
2. `African American` (24) vs `African American diaspora` (2, v3 canonical): which surface label is canonical? Both refer to the same concept; the corpus-prevalent form is `African American` but v3 chose `African American diaspora` for diaspora-axis disambiguation.
3. `Indigenous` (24) vs `Native American` (5) vs `Indigenous/Native American` (1, v3 canonical): which surface label is canonical?
4. Specific indigenous nations (`Lenape` 7, `Haudenosaunee` 3, plus v3-baseline `Three Sisters traditions` corpus-absent): are these `sub` or `internal` tier? Are they parented under a sub-region (Northeast Woodlands? Eastern Woodlands?) or directly under the diaspora-cluster root?
5. v3-baseline-but-corpus-absent values (`Soul Food`, `Three Sisters traditions`, `Black culinary history`, `Cajun/Creole`): `keep` for future tagging, `drop` for lack of corpus signal, or `internal`-tier only?

**Per-value entries:** *(TBD — populated in subsequent session before handoff)*

**Cross-cluster decision summary:** *(TBD — curriculum team writes during fill)*

---

### 9.2 Multi-parent canonical values

Values that plausibly belong under more than one cluster. These get a single canonical home plus an entry here logging the alternative.

**Known multi-parent candidates (from corpus + v3 baseline):**

| Value | Possible parents | Pre-handoff recommendation |
| --- | --- | --- |
| `Egyptian` (2 lessons) | African (North African sub-region) OR Middle Eastern | TBD |
| `Persian` (1 lesson) | Middle Eastern OR Central Asian | TBD |
| `Moroccan` (1 lesson) | African (North African sub-region) OR Middle Eastern | TBD |
| `Israeli` (1 lesson, v3 canonical) | Middle Eastern (v3) OR Mediterranean | TBD |
| `Spanish` (5 lessons, v3 canonical) | European (Mediterranean sub-region, v3) OR Latin American (some Spanish-language curricula) | TBD |

**Decision rule (pre-handoff proposal):** assign the canonical home based on **culinary/cultural heritage tradition the lesson body invokes**, not geopolitical boundaries. Curriculum team refines.

---

### 9.3 Filter-UI tier conventions (cross-cluster)

Tier conventions inherited from §6. Cross-cluster section logs any cluster-specific exceptions if curriculum team chooses to override the defaults (e.g., promote a country-specific to `top` for filter prominence regardless of frequency).

### 9.4 Naming conventions

- **Surface labels:** Title Case. `East Asian`, not `east-asian` or `EAST ASIAN`.
- **Canonical keys (slugs):** kebab-case lowercase. `east-asian`, not `EastAsian` or `east_asian`.
- **Aliases:** every observed corpus variant goes in the alias list, exactly as it appears. The Stage 2 migration rewrites all alias appearances to the canonical surface label.

---

## 10. Cluster template (annotated example)

The following block is a **template** showing the shape of a cluster section. Per-cluster blocks (§11-§15) follow this shape.

```markdown
## <Cluster N>. Cluster: <Cluster Name>

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- <Cluster root>: <count> lessons
- <Sub-region 1>: <count> lessons
- <Sub-region 2>: <count> lessons
- <Country 1>: <count> lessons
- ... etc ...
- **Kebab-case drift in this cluster:** <count> drift values, <total drift appearances> appearances

**Cluster decisions to surface:**

1. <decision question 1>
2. <decision question 2>
3. <decision question 3>

### Per-value entries

#### N.1. <surface label of cluster root> (<freq>)

- **canonical_key:** `<slug>`
- **surface_label:** `<label>`
- **parent:** `null` (for cluster-root entries) or another canonical key
- **filter_ui_tier:** `top` / `sub` / `internal`
- **verdict:** `keep` / `merge` / `split` / `drop` / `new`
- **aliases:** `[...]`

<details><summary>Corpus evidence (N lessons)</summary>

- Excerpt 1...
- Excerpt 2...

</details>

**Notes:** ...

---

#### N.2. <next value> (<freq>)
... and so on ...

### Cluster decision summary

<Free-form prose. Curriculum team writes 2-5 paragraphs.>
```

---

## 11. Cluster: Asian

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- `Asian` (cluster root): 63 lessons
- `East Asian` (sub-region): 35 lessons
- `South Asian` (sub-region): 15 lessons
- `Southeast Asian` (sub-region): 5 lessons
- `Central Asian` (sub-region): 4 lessons
- `Chinese`: 15 lessons
- `Japanese`: 9 lessons
- `Indian`: 7 lessons
- `Pakistani`: 4 lessons
- `Uzbek`: 4 lessons
- `Korean`: 3 lessons
- `Vietnamese`: 2 lessons
- `Sri Lankan`: 1 lesson
- `Malaysian`: 1 lesson
- `Taiwanese`: 1 lesson
- **Kebab-case drift in this cluster:** 3 values (`asian` 1, `east-asian` 2, `south-asian` 3) — 6 appearances; all merge into Title Case parents.

**Cluster decisions to surface:**

1. **Sub-region structure:** v3 baseline lists East / Southeast / South / Central. Corpus has all four with substantial usage (≥4 lessons). Keep all four as canonical sub-regions, or collapse the smaller ones (Central Asian 4, Southeast Asian 5)?
2. **Country-specific bar:** Chinese (15), Japanese (9), Indian (7), Pakistani (4), Uzbek (4), Korean (3), Vietnamese (2) — where does the bar land for canonicalization? Pre-handoff proposal: all ≥3 lessons get `sub`-tier canonical entries; ≤2 lessons get `internal`-tier OR `merge` into sub-region parent. Curriculum team refines.
3. **v3-baseline-but-corpus-absent country-specifics:** v3 includes `Filipino`, `Thai`, `Bengali` — none appear in active corpus. `keep` for future use, `drop` for absence, or `internal`-tier?
4. **Asian-as-default fallback:** a lesson tagged `Asian` (63 lessons) without sub-region — is that signal that the lesson is genuinely pan-Asian, or is it under-tagging? Worth a sample Opus read.

### Per-value entries

*(TBD — per-value entry blocks for Asian cluster populated in subsequent session before handoff)*

### Cluster decision summary

*(TBD — curriculum team writes during fill)*

---

## 12. Cluster: Americas

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- `Americas` (cluster root): 170 lessons (highest-frequency cluster root in corpus)
- `North American` (sub-region): 83 lessons
- `Latin American` (sub-region): 77 lessons
- `Caribbean` (sub-region): 17 lessons
- `Mexican`: 38 lessons
- `Puerto Rican`: 4 lessons
- `Salvadoran`: 2 lessons
- `Honduran`: 2 lessons
- `Cuban`: 2 lessons
- `Jamaican`: 2 lessons
- `Peruvian`: 2 lessons
- `Brazilian`: 1 lesson
- `Ecuadorian`: 1 lesson
- `Guyanese`: 1 lesson
- `Central American`: 1 lesson (NEW — not in v3)
- `South American`: 1 lesson (NEW — not in v3)
- `Southern United States`: 1 lesson (NEW — not in v3)
- **Kebab-case drift in this cluster:** 4 values (`americas` 1, `north-american` 13, `latin-american` 4, `caribbean` 1) — 19 appearances; all merge into Title Case parents.

**Cluster decisions to surface:**

1. **`Americas` is the heaviest cluster root in the corpus (170 lessons).** Tagging convention — is `Americas` a meaningful tag in itself or an under-tagged default? Worth a sample Opus read to distinguish "lesson genuinely about pan-Americas heritage" from "lesson with no specific heritage but tagged `Americas` by default."
2. **`North American` (83) and `Latin American` (77) parity.** Both substantial — confirm both as `top`-tier sub-region canonicals. The North American category interacts with the cross-cluster diaspora section: `African American` lessons and indigenous lessons could plausibly carry `North American` parent.
3. **New sub-region candidates:** `Central American` (1), `South American` (1), `Southern United States` (1) — each has only 1 corpus occurrence. `new` (curriculum-team adds), `merge` into existing sub-region, or `drop`?
4. **Country-specific bar:** Mexican (38) is clearly canonical. Below Mexican: Puerto Rican (4), Salvadoran/Honduran/Cuban/Jamaican/Peruvian (each 2), then 1-lesson values. Same bar question as Asian cluster.
5. **v3-baseline-but-corpus-absent values:** `Dominican` (Latin American, v3) and `Cajun/Creole` (North American, v3 — also tracked in cross-cluster §9.1). Both corpus-absent. Per-value: `keep` for future tagging, `drop` for absence, or `internal`-tier? Cajun/Creole has high cultural significance; Dominican is typical Latin American country-specific signal that may emerge as the corpus grows.

### Per-value entries

*(TBD — per-value entry blocks for Americas cluster populated in subsequent session before handoff)*

### Cluster decision summary

*(TBD — curriculum team writes during fill)*

---

## 13. Cluster: African

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- `African` (cluster root): 41 lessons
- `West African` (sub-region): 15 lessons
- `North African` (sub-region): 2 lessons (NEW — not in v3)
- `East African` (sub-region): 1 lesson (NEW — not in v3)
- `Ethiopian`: 1 lesson
- `Nigerian`: 2 lessons
- `Egyptian`: 2 lessons (multi-parent — see §9.2)
- `Kenyan`: 2 lessons
- `Moroccan`: 1 lesson (multi-parent — see §9.2)
- **Kebab-case drift in this cluster:** 1 value (`african` 1) — 1 appearance; merges into Title Case parent.

**Cluster decisions to surface:**

1. **Sub-region structure:** v3 baseline has only `West African` as a sub-region. Corpus shows `North African` (2) and `East African` (1) as `new` candidates. Curriculum team: do these sub-regions get canonical entries despite low corpus frequency? Pre-handoff recommendation: yes — they fill structural gaps and provide canonical homes for country-specifics (Egyptian, Moroccan → North African; Kenyan, Ethiopian → East African).
2. **Multi-parent values:** `Egyptian` and `Moroccan` are North African geographically but Middle Eastern culturally for many curricular purposes. See §9.2 for the canonical-home decision.
3. **v3-baseline-but-corpus-absent country-specifics:** v3 doesn't enumerate many — just `Ethiopian`, `Nigerian`, plus `West African` as a sub-region without children. Pre-population may propose adding `South African` (not in corpus, not in v3) only if curriculum-team flags the gap.
4. **Country-specific bar:** all African country-specifics in corpus have ≤2 lessons. Apply the same bar as other clusters, OR weight differently given the diversity of the continent?

### Per-value entries

*(TBD — per-value entry blocks for African cluster populated in subsequent session before handoff)*

### Cluster decision summary

*(TBD — curriculum team writes during fill)*

---

## 14. Cluster: European

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- `European` (cluster root): 53 lessons
- `Mediterranean` (sub-region): 39 lessons
- `Eastern European` (sub-region): 3 lessons
- `Italian`: 24 lessons (heaviest country-specific in this cluster)
- `Spanish`: 5 lessons (multi-parent — see §9.2)
- `Ukrainian`: 3 lessons
- `Greek`: 2 lessons
- `Russian`: 1 lesson (v3 lists `Russian/Ukrainian` as a combined canonical — see decision #1 below)
- `Irish`: 2 lessons (NOT in v3 baseline — proposed `new`)
- **Kebab-case drift in this cluster:** 3 values (`european` 1, `mediterranean` 2, `eastern-european` 1) — 4 appearances; all merge into Title Case parents.

**Cluster decisions to surface:**

1. **`Russian/Ukrainian` v3 canonical → split?** v3 combines Russian and Ukrainian into one canonical entry. Corpus has `Ukrainian` (3) and `Russian` (1) as separate values. Given current geopolitical context + distinct culinary traditions, the curriculum-team-likely call is `split` into `Russian` + `Ukrainian` as separate canonicals under `Eastern European`. Confirm at handoff.
2. **Mediterranean sub-region (39) is heavier than the cluster root in some senses.** Italian (24) drives most of this. Confirm Mediterranean as a `top`-tier sub-region.
3. **`Polish` and `French` v3 canonicals, corpus-absent.** Keep for future tagging, drop, or internal?
4. **`Irish` (2 lessons, not in v3):** `new` canonical, parent = `European` (no sub-region applies — Northern European isn't in v3 and no other countries cluster there).
5. **Multi-parent for `Spanish` (5):** see §9.2 — European/Mediterranean or Latin American/cross-cluster?

### Per-value entries

*(TBD — per-value entry blocks for European cluster populated in subsequent session before handoff)*

### Cluster decision summary

*(TBD — curriculum team writes during fill)*

---

## 15. Cluster: Middle Eastern

### Cluster framing

**Corpus distribution** (active, non-retired lessons; from Session 59 query):

- `Middle Eastern` (cluster root): 23 lessons
- `Levantine` (sub-region): 14 lessons
- `Yemeni`: 3 lessons (NOT in v3 baseline — proposed `new`)
- `Persian`: 1 lesson (NOT in v3 baseline — proposed `new`, multi-parent — see §9.2)
- `Palestinian`: 1 lesson
- `Israeli`: 1 lesson
- **Kebab-case drift in this cluster:** 2 values (`middle-eastern` 1, `levantine` 2) — 3 appearances; all merge into Title Case parents.

**Cluster decisions to surface:**

1. **v3-baseline-but-corpus-absent country-specifics:** v3 lists `Lebanese`, `Syrian`, `Jordanian` under Levantine. None appear in active corpus despite Levantine (14) being well-represented. Keep, drop, or internal? Pre-handoff recommendation: keep all three at `sub`-tier; Levantine cluster has high curricular significance and country-specific signals can emerge as the corpus grows.
2. **`Yemeni` (3 lessons, not in v3):** `new` canonical. Parent: directly under `Middle Eastern` (Yemen doesn't fit Levantine cleanly).
3. **`Persian` (1 lesson):** see §9.2 — Middle Eastern home, or Central Asian?
4. **`Egyptian` (2 lessons):** see §9.2 — North African home, or Middle Eastern?

### Per-value entries

*(TBD — per-value entry blocks for Middle Eastern cluster populated in subsequent session before handoff)*

### Cluster decision summary

*(TBD — curriculum team writes during fill)*

---

## 16. End summary: canonical vocabulary table

**Mechanically regenerated** from parsed per-value entries (§11-§15) and the cross-cluster diaspora cluster (§9.1). Do not hand-edit.

```
| canonical_key | surface_label | parent | filter_ui_tier | frequency | aliases |
|---|---|---|---|---|---|
| TBD — populated when per-value entries fill |
```

This table serves as the **hand-off artifact** to PR 5+ (D4 vocab canonicalization migration) and PR 6+ (Stage 2 re-tag prompt closed-vocab constraint).

---

## Appendix A: v3 baseline (Cultural Heritage)

> Verbatim excerpt from `esynyc-taxonomy-schema-v2.md` §3 Cultural Heritage. Embedded here so the worksheet is self-contained for curriculum-team handoff. Per §1 methodology, the v3 baseline is the working hypothesis for canonical shape; most v3 values will `keep` as-is, a few may `split` or change parent.

- **Type:** Multi-select
- **Required:** No
- **Limit:** 5 tags maximum
- **Hierarchical Structure:**
  - **Asian**
    - **East Asian**
      - Chinese
      - Japanese
      - Korean
      - Taiwanese
    - **Southeast Asian**
      - Vietnamese
      - Filipino
      - Malaysian
      - Thai
    - **South Asian**
      - Indian
      - Bengali
      - Pakistani
    - **Central Asian**
      - Uzbek
  - **Americas**
    - **Latin American**
      - Mexican
      - Dominican
      - Puerto Rican
      - Salvadoran
    - **Caribbean**
      - Jamaican
    - **North American**
      - Cajun/Creole
      - Indigenous/Native American
        - Lenape
        - Three Sisters traditions
      - African American diaspora
        - Soul Food
        - Black culinary history
  - **African**
    - **West African**
    - Ethiopian
    - Nigerian
  - **European**
    - **Eastern European**
      - Russian/Ukrainian
      - Polish
    - **Mediterranean**
      - Italian
      - Spanish
      - Greek
    - French
  - **Middle Eastern**
    - **Levantine**
      - Palestinian
      - Lebanese
      - Syrian
      - Jordanian
    - Israeli
- **Note:** Selecting a specific culture auto-populates parent categories (can be removed)

---

*End of worksheet scaffold (Session 60, 2026-05-10).*
