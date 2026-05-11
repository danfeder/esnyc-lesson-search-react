# Stage 1 Heritage Worksheet

> **Status: PRE-HANDOFF (last update Session 68, 2026-05-11).** Header sections (purpose, methodology, hierarchy rules, verdict vocabulary, per-entry shape, cluster framing pattern, filter-UI tier conventions, parsing convention) are complete and load-bearing. Per-cluster framing blocks contain corpus distribution data from the Session 59 query. **Per-value entries: Asian cluster ✅ Session 62 (§11); Americas cluster ✅ Session 64 (§12); African cluster ✅ Session 66 (§13); European cluster ✅ Session 68 (§14); Middle Eastern + cross-cluster diaspora TBD subsequent sessions before curriculum-team handoff.** End-summary canonical-vocab table fills only as per-value verdicts close.
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
SCAFFOLD (Session 60)          PRE-HANDOFF (Sessions 62+)               HANDOFF (curriculum team)
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

The series of `#### <cluster>.<index>. <surface_label>` blocks per §4. These are the **vocabulary changes** consumers read mechanically.

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

- `<field_name>` is a known field (canonical_key / surface_label / parent / filter_ui_tier / verdict / merge_into / split_into / drop_to / aliases)
- `<value>` is field-typed (string / canonical_key-shape / enum / list)
- Inline HTML comments (`<!-- ... -->`) are tolerated and stripped by the parser
- Cluster framing blocks, cluster decision summary blocks, and per-entry `**Notes:**` blocks (no leading bullet — see §4) are **not** parsed structurally — they are human reference / narrative
- The end-summary canonical-vocab table (§16) is **generated mechanically** from parsed per-value entries; do not hand-edit it (changes get clobbered on re-parse)

**Skipped entries:** if a `verdict` line is missing or blank, the parser warns but does not fail. Unparsed entries are excluded from the canonical vocabulary output until filled.

**Identity-shaped drift entries:** drift entries (`verdict: merge`) can carry a `canonical_key` value identical to their `merge_into` target's `canonical_key` — e.g., the kebab-case drift `asian` and the canonical `Asian` both have `canonical_key: asian`. Parsers MUST filter on `verdict in ('keep', 'new')` BEFORE keying canonical vocabulary by `canonical_key`, otherwise drift entries silently collide with (or de-duplicate) their canonical sources. Drift entries contribute only to the `alias_map` output (not to the `canonical` array); identity entries like `"asian" → "asian"` in `alias_map` are harmless.

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
| `Egyptian` (2 lessons) | African (North African sub-region) OR Middle Eastern | **North African primary** (Session 66). Corpus splits the multi-parent question evenly — 1/2 lessons tag `Egyptian + North African + African`, 1/2 tag `Egyptian + Middle Eastern + African` (both are ful medames). Single-parent home recommended = `North African` (geographic anchor + first lesson's hierarchical chain); Middle Eastern flagged as multi-parent alternative in §13.6 Notes for curriculum-team review. |
| `Persian` (1 lesson, NEW canonical) | Middle Eastern OR Central Asian | **Middle Eastern primary (Session 70).** Single corpus lesson `Kuku Sabzi` (`1q78Gpy8f9L1gXvJ8h2GvurXs9eaFMyIM`) tags `[Persian, Middle Eastern]` depth-2 direct-under-Middle-Eastern with body explicitly anchoring Iran ("Show Iran on the world map. Explain that some people in Iran are Persian and that we are making a Persian herb omelette today called Kuku Sabzi"). NO Central Asian co-presence in corpus tagging. Single-parent home recommended = `middle-eastern` (geographic anchor for modern Iran + cultural anchor of Persian-as-Iranian-identity + 1/1 corpus Middle Eastern pairing); Central Asian flagged as multi-parent alternative in §15.4 Notes for curriculum-team review (historical Persianate world extends into Central Asia — Persian-speaking populations in Tajikistan, Afghanistan, Uzbekistan; Silk Road / Mongol-era cultural diffusion — but the corpus tags only the modern Iran framing). |
| `Moroccan` (1 lesson) | African (North African sub-region) OR Middle Eastern | **North African primary** (Session 66). Sole corpus lesson tags `Moroccan + North African + African`; body explicitly anchors Morocco in "Northern Africa" with map activity (`"The flavors of this recipe come from a country called Morocco in Northern Africa. Show Morocco on the map."`). No Middle Eastern corpus signal — curriculum-team may surface the alternative if curricular framing changes, but the corpus does not. |
| `Israeli` (1 lesson, v3 canonical) | Middle Eastern (v3) OR Mediterranean | **Middle Eastern primary (Session 70).** Single corpus lesson `Breakfast around the World / Israeli Salad` (`18oKyXzj8zydRDEtQvZ68USr144_9vfMJhckXNo6NFVk`) tags `[Israeli, Middle Eastern]` depth-2 direct-under-Middle-Eastern matching v3 baseline (Appendix A — Israeli listed directly under `Middle Eastern`, NOT under Levantine despite being Levantine geographically). Body anchors explicitly: "Israel is a small country in the Middle East (point it out on map) about the same size as New Jersey." NO Mediterranean co-presence in corpus tagging. Single-parent home recommended = `middle-eastern` (v3 baseline alignment + corpus signal + body's explicit Middle East anchor); Mediterranean flagged as multi-parent alternative in §15.6 Notes for curriculum-team review (Israeli cuisine has substantial Mediterranean overlap — hummus, falafel, shakshuka, Israeli salad are all Mediterranean-coded culinarily — but corpus tagging is purely Middle Eastern). |
| `Spanish` (5 lessons, v3 canonical) | European (Mediterranean sub-region, v3) OR Latin American (Spanish-language colonial-origin dishes) | **Mediterranean primary (European cluster)** (Session 68). Corpus splits 2 + 3: the 2 Tortilla Española lessons tag pure Spain-the-country cuisine (`[Spanish, Mediterranean, European]`, no Latin American); the 3 empanada lessons (BCCS Empanadas, Empanadas, Empanadas & Corn Salad) tag `Spanish` alongside Latin American + Americas as a colonial-origin bridge — body text "Empanadas are a popular food in Latin America but have origins in Spain." 4 of 5 carry `Mediterranean` (only `Empanadas & Corn Salad` omits — it goes `[Latin American, Americas, Mexican, Spanish, European]`); all 5 carry `European`. Single-parent home recommended = `mediterranean` (Spain-the-country anchor + v3 baseline placement + 4/5 corpus Mediterranean-pairing rate); Latin American flagged as multi-parent alternative in §14.5 Notes for curriculum-team review of colonial-origin dishes. |

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

#### 11.1. Asian (63)

- **canonical_key:** `asian`
- **surface_label:** `Asian`
- **parent:** `null`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (63 active lessons; 4 without sub-region/country, 59 with at least one child tag)</summary>

- **`1puemyxDt0Cy3w5acFa9bjZGdfWEsZLs5` — "Tastes Around the World":** Tagged `[Asian, Latin American, Mediterranean]`. A gallery-walk lesson with six country stations spanning continents — "Dominican Republic: tostones and oregano / Japan: green tea and seaweed / Ecuador: pickled onions and cilantro / India: chai and garam masala / Colombia: arepas and dragon fruit / Ethiopia: dates and turmeric." `Asian` carries two distinct countries (Japan + India) inside one comparative lesson.
- **`1lv-gM8xprEt5t1YVLxvBN8eYI0uabXRN8XETqJVOJZQ` — "5th Grade Food Cultures Unit Overview":** Tagged `[Latin American, Asian, African, European]`. Summary — "Through this series of six lessons students will learn about food cultures from around the world. These lessons will cover the countries Ukraine, Uzbekistan, Mexico, China, and some Caribbean Island nations." `Asian` is the umbrella for both Uzbekistan (Central Asian) and China (East Asian) inside a single curated unit.
- **`1iTH3kooXMEVDsZaV1wqVGLvgXO3c55lrxtsIHGlaz28` — "India / Aloo Gobi":** Tagged `[Indian, South Asian, Asian]`. Single-country lesson — "Introduce country of India: map, flag, language, food facts / India is a large country in Asia... Indian dishes often have many flavorful spices and seasonings / Introduce recipe: Aloo Gobi." `Asian` here is a redundant ancestor in the 3-level chain Indian → South Asian → Asian, not an independent signal.

**Tagging pattern:** Cohort A (4/63) is genuinely pan-Asian — all four are around-the-world comparison or multi-country curriculum lessons where `Asian` carries 2+ unrelated countries (Japan+India, China+Uzbekistan, etc.) and there is no single sub-region to assign. Cohort B (59/63) uses `Asian` as the redundant root of a Country → Sub-region → `Asian` ancestry chain (e.g., Vietnamese/Southeast Asian/Asian, Japanese/East Asian/Asian, Uzbek/Central Asian/Asian); the `Asian` tag adds no information beyond what the children already encode. No under-tagged Cohort A cases surfaced — when a country is identifiable, the writer tagged the country.

</details>

**Notes:** Cluster root for the Asian cluster. Cohort A's 4 lessons demonstrate `Asian` as a meaningful pan-region tag (not under-tagging) — multi-country comparison and world-foods unit lessons. Cohort B's 59 lessons use `Asian` as redundant hierarchical-parent ancestry; the worksheet's parent-chain shape preserves this without requiring it to carry independent information. Filter-UI tier `top` is the cluster-root default and the corpus signal supports it.

---

#### 11.2. East Asian (35)

- **canonical_key:** `east-asian`
- **surface_label:** `East Asian`
- **parent:** `asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (35 active lessons; 9 without a country tag, 26 with at least one)</summary>

- **`16ZNi4Oeu5j4mMOZrEk7OYlrqIhSsqj_f` — "Agar Jelly - MS"** (no-country cohort; tagged `East Asian + Asian` only): Lesson explicitly disclaims country specificity — "We are making a dessert that many people enjoy during the lunar new year. Note: some students may know this holiday as Chinese new year, but it is celebrated in many countries throughout Asia. The main ingredient, agar, comes from seaweed — similar to what we used to make sushi last week." Genuinely pan-East-Asian framing (Lunar New Year as multi-country holiday + agar dessert + cross-reference to Japanese sushi).
- **`1HPlsYxxlLedPhVzJETkI62iz3JW9q7ytnVMKXAswiHM` — "Rice Paddy Modeling"** (no-country cohort; tagged `East Asian + Asian` only): Body is unambiguously China-specific — "Ask students to tell you what they already know about the ancient Chinese empire. Explain that today is all about one of the foods that first came from Ancient China: rice!" No mention of Japan, Korea, or other East Asian rice cultures — this is a missing-country tag (should also carry `Chinese`).
- **`1-1T0a4pCECA5e0ek7pcvFoTRa3-piEGwGHKWrsnxtUs` — "Chinese Scrambled Eggs and Soybean Dumplings"** (with-country cohort; tagged `Chinese + East Asian + Asian`): Summary — "Students will learn to make scrambled eggs and vegetable dumplings in the Chinese tradition..." — clean hierarchical chain (country + sub-region + region all present).

**Tagging pattern:** Cohort B (26 lessons) is consistent — each carries one country tag plus `East Asian + Asian` as parent-chain redundancy. Cohort A (9 lessons without a country) is mixed — some are genuinely pan-East-Asian (Agar Jelly explicitly cross-references Chinese/Japanese traditions), but others are clearly missing a country tag (Rice Paddy Modeling is explicitly Chinese in the body; "Ancient China Bingo" is in the title itself). One Cohort A lesson — "Bánh Mì" — is tagged `Vietnamese + East Asian + Asian`, which is a mis-tag (Vietnam is Southeast Asian, not East Asian). Net: `East Asian` legitimately exists as a sub-region for genuine multi-country lessons, but at least 3-4 of the 9 Cohort A rows need a country tag added during re-tagging.

</details>

**Notes:** v3 canonical sub-region. Filter-UI tier `sub` proposed by frequency default (35 lessons; just under the ≥40 `top` threshold). Curriculum team may promote to `top` given near-threshold count and cluster significance. Corpus surfaces one mis-tagged lesson (Bánh Mì should be Southeast Asian, not East Asian) — flag for Stage 2 re-tag fix-up.

---

#### 11.3. South Asian (15)

- **canonical_key:** `south-asian`
- **surface_label:** `South Asian`
- **parent:** `asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (15 active lessons; 4 without a country tag, 11 with at least one)</summary>

- **`0BwC8Pf3ZwAXjNnhsOUZNLVRIUE0` — "Aloo Gobi (3rd-5th)":** "Welcome back to your kitchen, everyone! Today we will make an Indian and Pakistani dish called Aloo Gobi... It is a dish made with spices, potatoes, and cauliflower. Aloo is the Hindu word for potato and gobi means cauliflower." (Tagged `[South Asian, Asian]` only — no Indian or Pakistani country tag despite the lesson explicitly naming both.)
- **`1aqSoaGDAVFvSWjZJeKAEIkHvPdrWKsxq` — "Black Bean Burgers":** "One of the countries mentioned in the article was India. Many people in India are vegetarians... because their religion considers cows a sacred animal... So instead of eating the hamburgers made of meat that you are used to, they eat veggie burgers instead." (Tagged `[North American, South Asian, Americas]` — India-anchored but no Indian country tag.)
- **`1V7feFPt6bZc0b695g_3Qe_U4AAE-xO5s` — "Sri Lankan Curry":** "This month we are making food from Southeast Asia from a small country called Sri Lanka (show on map). Sri Lanka is close to India and has a lot of influences from other countries that have colonized them in the past (Britain, Portugal, Amsterdam). This is a reason there are now many more countries that eat curry. One of the most important ingredients in our Sri Lankan curry is coconut milk!" (Tagged `[Sri Lankan, South Asian, Asian]`.)

**Tagging pattern:** The 4 no-country `South Asian` lessons are not genuinely pan-South-Asian — they explicitly name India and/or Pakistan in the body and look like missing country tags. The single `Sri Lankan` lesson is substantive (map activity, geography, colonial history, regional curry comparison) and reads as a strong candidate for `Sri Lankan` as a `new` canonical child of `South Asian`.

</details>

**Notes:** v3 canonical sub-region. The Sri Lankan Curry lesson body mis-locates Sri Lanka as "Southeast Asia" (it's geographically South Asia); the tagging itself is correct (`Sri Lankan + South Asian + Asian`). The 4 no-country `South Asian` lessons look like missing-country tags (Aloo Gobi mentions Indian AND Pakistani; Black Bean Burgers anchors on India explicitly) — flag for Stage 2 re-tag.

---

#### 11.4. Southeast Asian (5)

- **canonical_key:** `southeast-asian`
- **surface_label:** `Southeast Asian`
- **parent:** `asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (5 active lessons — 4 SE-Asian cuisine + 1 non-cuisine near-miss; 2 of the 4 cuisine lessons carry an SE-Asian country tag, 2 don't)</summary>

- **`1pjRERorBS4k4iil9VRgiRzjDHZtunwn3v-NFt7xTuwQ` — "Mushroom Khao Soi":** "Students will make khao soi, a dish from Thailand, Myanmar, and Laos... we are continuing this month to explore recipes that come from Asia and the Pacific Islands, as a way of celebrating AAPI Heritage Month. Show a map and point out Thailand, Myanmar, and Laos." (Tagged `Southeast Asian + Asian` only — no country tag despite explicit Thai/Lao/Burmese framing.)
- **`1vtacAdf80q9FyZ4dEEzWmVLdycRmgJ7_MSRbrweoGwA` — "AAPI Heritage Month - Philippines & Lumpia":** "A lesson focusing on the Philippines... Students will also prepare lumpia, which is a popular Filipino recipe... Because of both its location and history of colonization (especially by Spain), culture and food in the Philippines is a mixture of Asian and Spanish flavors." (Tagged `Southeast Asian + Asian` only — explicitly Filipino but no Filipino country tag.)
- **`1xA88OeHAL5csyB1zfUwvQaibMNdryE7c` — "Bats & Banana Pancakes":** "Bananas originated in Southeast Asia, in the jungles of Malaysia, Indonesia or the Philippines where many varieties of wild bananas still grow today." (Tagged `Southeast Asian + Asian + Caribbean + Latin American + Americas` — Southeast Asia surfaces only as an origin-story aside in a bat-pollinator lesson.)

**Tagging pattern:** `Southeast Asian` has a coherent corpus signal — 4 of 5 lessons cook a genuinely SE-Asian dish (Thai/Lao khao soi, Malaysian ABC shaved ice, Filipino lumpia, Vietnamese summer rolls) and frame the region explicitly. The 5th (Bats & Banana Pancakes) is a near-miss using SE Asia only as a banana-origin reference. Country-tag coverage is incomplete — only 2 of the 4 cuisine lessons carry a country tag; Khao Soi and Lumpia should but don't. Implication — keep `Southeast Asian` as a canonical sub-region. The cluster is real and pedagogically used (AAPI Heritage Month framing); collapsing to Asian would lose the deliberate regional grouping. Stage 2 should add missing country tags (Thai/Lao for Khao Soi, Filipino for Lumpia) and re-evaluate whether Bats & Banana Pancakes should drop the SE-Asian tag entirely.

</details>

**Notes:** v3 canonical sub-region. At the ≥5 corpus-read threshold; included. Signal supports keeping the sub-region (4/5 lessons are genuine SE-Asian cuisine with AAPI Heritage Month framing). Country-tag coverage issues noted for Stage 2.

---

#### 11.5. Central Asian (4)

- **canonical_key:** `central-asian`
- **surface_label:** `Central Asian`
- **parent:** `asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical sub-region. Below the ≥5 corpus-read threshold; structural call. The single country canonical under Central Asian is `Uzbek` (4 lessons); the sub-region + country combine to 8 lessons of Central Asian content. Filter-UI tier `sub` proposed despite frequency 4 (below the default `sub` threshold of 5) — v3 canonical status and sole-parent-for-Uzbek role support sub-tier. Curriculum team may demote to `internal` if they prefer the strict frequency default.

---

#### 11.6. Chinese (15)

- **canonical_key:** `chinese`
- **surface_label:** `Chinese`
- **parent:** `east-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (15 active lessons tagged with `Chinese`)</summary>

- **`1JCT_JOaWRCF_-9M_0P3VVVU_seTz8xcr7VKzkdA8rLk` — "Smashed Cucumber Salad":** "China is the 3rd biggest country in the world... The weather and food also changes in different areas of China. Today we are making a recipe from the Sichuan region, which is near the middle of China." Show students China and the Sichuan region on the map.
- **`1FUV91GHRSx5T0w2VYJgZlZjqid4vU7-Ic-Hra6rV5Q8` — "Lucky 8 Stir Fry":** "Eight is a lucky number in Chinese culture, especially around Lunar New Year. The word in Chinese for the number 'eight' is the same as the word for 'prosperity'... Today we are going to be making a Chinese dish that has eight vegetables in it..." (bok choy, snow peas, bean sprouts, mushroom).
- **`1eViPJBz9xeqq8o3U3e3MTaccETv6n2C1Q-w6DhG1E-I` — "3rd Grade Chinese-Style Dumplings":** Soybean dumplings with wonton wrappers, scallion, ginger, garlic, white pepper, rice wine vinegar, sesame oil, soy sauce; steamed in bamboo baskets, eaten with chopsticks. "Today we are traveling to China to make Chinese style dumplings... Play Chinese music as students come into classroom."

**Tagging pattern:** Tagging is semantically consistent — every sampled lesson shows recognizable Chinese-heritage cuisine, ingredients, or cultural framing. The cluster is dumpling/Lunar-New-Year heavy (~7 of 15 — vegetable dumplings, fortune cookies, Lucky 8 stir fry, dumplings-for-LNY), with the remainder being other clearly Chinese dishes (Sichuan smashed cucumber, fried rice, sesame cauliflower, Chinese roasted carrots, scrambled eggs with soybeans, plant-part stir fry) plus one Grace Lin read-aloud ("The Ugly Vegetables") which is China-themed via the author and story content. Regional specificity appears once (Sichuan); otherwise lessons frame China at the country level. No false positives in the sample.

</details>

**Notes:** v3 canonical country, parent = East Asian. Highest-frequency country in the Asian cluster. Clean tagging signal; no candidates for `merge` / `drop`.

---

#### 11.7. Japanese (9)

- **canonical_key:** `japanese`
- **surface_label:** `Japanese`
- **parent:** `east-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (9 active lessons tagged with `Japanese`)</summary>

- **`1fR_VcTO7V1OWM7qp2EweRBN9Zl9z1e3N7pQuvZhJO1k` — "Vegetable Sushi":** "Today we are going to make a special recipe from Japan. Can someone come up and point out Japan on a map?... The recipe from today is made with rice, vegetables and rolled up using a seaweed wrap called 'nori'... in Japan, sushi is traditionally made using fish, which is abundant in Japan because it is an island country surrounded by water... learn how to use chopsticks to eat our sushi with!"
- **`1d1KP9lfI6jQdF9sBU74ncPv36OZZbTfm` — "Vegetable Ramen":** "Ramen is a Japanese dish (show Japan on Map). The word ramen means 'pulled noodles'. Noodles came from China 4000 years ago... We're going to cook up some ramen noodles today, add them to broth, and top them with fresh vegetables." Toppings include mushrooms, scallions, ginger, mirin-style aromatics; chopsticks listed in materials.
- **`1R6DqXH9XvSvZq9B0106w0CHtS3kvuJNX53taROiZZBE` — "Daikon Pickles & Furikake":** "The recipes we are creating today are from Japan and Korea. We will be cooking the leaves to make a recipe called..." Lesson uses daikon radish + furikake (a canonical Japanese rice seasoning); CR section explicitly invites students to connect to family heritage and home country.

**Tagging pattern:** Tagging is mostly semantically consistent — most sampled lessons feature core Japanese dishes/ingredients (sushi, nori, ramen, daikon, furikake, miso) with explicit Japan framing in the lesson body. Two looser tags exist — "Food Preservation" only mentions sushi as one example among many global preservation techniques, and "Spring and Summer Plants" centers Mexican amaranth with mizuna as a secondary tasting. Both feel weaker than the cuisine-focused majority.

</details>

**Notes:** v3 canonical country, parent = East Asian. Clean signal for cuisine-focused lessons; two looser tags are not misuse but worth flagging if Stage 2 wants tighter `Japanese` semantics.

---

#### 11.8. Indian (7)

- **canonical_key:** `indian`
- **surface_label:** `Indian`
- **parent:** `south-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (7 active lessons tagged with `Indian`)</summary>

- **`1gLuwRIEfiYyfqztlMGAEOeAuJI1flmj7` — "Aloo Gobi":** "Explain that today, we are going to make a recipe from Northern India. It is called Aloo Gobi. It uses some flavors and ingredients that you may already know, and some flavors that are new."
- **`1a4viRwOePhno2u67vPKhHza4Aj-CMpRQ` — "World Religions - Hinduism":** "Those who practice Hinduism believe that cows are a sacred animal, so they don't eat beef. But many hindus don't eat meat at all!... Today we are going to make a vegetarian dish called biryani. Biryani is a rice dish filled with vegetables that is popular in India where a lot of people who practice Hinduism live."
- **`1jiYzGtxroLR7lpqAWGQTIroLh3Gr13XbcxWhTLDR_Ec` — "Navdanya & The Importance of Seed Saving":** "Explain that today we are going to be learning about a movement called Navdanya that began in India... This lesson encourages learning within the context of culture by providing an example of leadership and resistance in the South Asian community."

**Tagging pattern:** All 7 lessons are unambiguously South-Asian-Indian — 4 Aloo Gobi variants (potato-cauliflower dish from northern India/Pakistan with Hindi vocab and Bollywood music cues), a Hinduism/biryani lesson, a Navdanya seed-sovereignty lesson explicitly framed "South Asian community," and a Food Preservation lesson that references India once for pickle history. No American Indian / Indigenous framing appears anywhere; the Food Preservation tag is the weakest fit (India is one of several cultural examples, not the focus) but not a misuse.

</details>

**Notes:** v3 canonical country, parent = South Asian. No `Indian` / American-Indian ambiguity in the corpus — every sampled lesson is unambiguously South-Asian-Indian. (The cross-cluster section §9.1 separately handles American-Indian / Indigenous canonicals.)

---

#### 11.9. Pakistani (4)

- **canonical_key:** `pakistani`
- **surface_label:** `Pakistani`
- **parent:** `south-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = South Asian. Below the ≥5 corpus-read threshold; structural call. Note — the §11.3 South Asian corpus read surfaced an Aloo Gobi lesson tagged `South Asian` only that explicitly names Pakistani heritage; under-tagging suggests the actual `Pakistani` corpus footprint is larger than 4. Stage 2 re-tag should pick up the missing country tags. Filter-UI tier `sub` proposed despite frequency 4 (below the default sub threshold of 5) — v3 canonical status plus corroborating under-tagged evidence supports sub-tier.

---

#### 11.10. Uzbek (4)

- **canonical_key:** `uzbek`
- **surface_label:** `Uzbek`
- **parent:** `central-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country and the only canonical child of Central Asian. Below the ≥5 corpus-read threshold; structural call. Filter-UI tier `sub` proposed despite frequency 4 — sole-child-of-Central-Asian status supports it.

---

#### 11.11. Korean (3)

- **canonical_key:** `korean`
- **surface_label:** `Korean`
- **parent:** `east-asian`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = East Asian. Just at the ≥3-lesson sub-tier bar per §11 cluster decision #2 (pre-handoff proposal — all ≥3 lessons get sub-tier). Below the ≥5 corpus-read threshold; structural call. The §11.7 Japanese corpus read surfaced a lesson tagged with both Japan and Korea (Daikon Pickles & Furikake), so Korean tagging extends beyond the 3 explicit Korean-only rows.

---

#### 11.12. Vietnamese (2)

- **canonical_key:** `vietnamese`
- **surface_label:** `Vietnamese`
- **parent:** `southeast-asian`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Southeast Asian. Below the ≥3-lesson sub-tier bar per §11 cluster decision #2 — `internal`-tier proposed (filter-searchable via FTS / embeddings but not surfaced as a clickable filter chip). Curriculum team may promote to `sub` given v3 canonical status. The §11.2 East Asian corpus read surfaced a Bánh Mì lesson mis-tagged as `Vietnamese + East Asian + Asian`; the correct parent chain is `Vietnamese + Southeast Asian + Asian` — flag for Stage 2 fix-up.

---

#### 11.13. Sri Lankan (1)

- **canonical_key:** `sri-lankan`
- **surface_label:** `Sri Lankan`
- **parent:** `south-asian`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A South Asian lists Indian / Bengali / Pakistani only). 1 corpus lesson, but the §11.3 South Asian corpus read found the single Sri Lankan Curry lesson substantive — map activity, geographic locator, colonial-history context, ingredient specificity around coconut milk. Candidate for `new` verdict if curriculum team agrees; otherwise `merge → south-asian` is the structural alternative. `internal`-tier proposed regardless given the 1-lesson frequency.

---

#### 11.14. Malaysian (1)

- **canonical_key:** `malaysian`
- **surface_label:** `Malaysian`
- **parent:** `southeast-asian`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Southeast Asian. 1 corpus lesson. Below the ≥3-lesson sub-tier bar per §11 cluster decision #2 — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status.

---

#### 11.15. Taiwanese (1)

- **canonical_key:** `taiwanese`
- **surface_label:** `Taiwanese`
- **parent:** `east-asian`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = East Asian. 1 corpus lesson. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status.

---

#### 11.16. `asian` (drift literal — 1 corpus appearance)

- **canonical_key:** `asian`
- **surface_label:** `asian`
- **parent:** `null`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `asian`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row. Surfaced explicitly as a `merge` entry for parser-and-reader clarity. The `canonical_key` field matches the merge target's slug (both are kebab-case-lowercase by slug convention applied to the same underlying value — see §7 alias_map identity-shaped entries). This entry contributes `"asian" → "asian"` to the `alias_map` output (literal-to-canonical-key); verdict `merge` excludes it from the canonical vocabulary list.

---

#### 11.17. `east-asian` (drift literal — 2 corpus appearances)

- **canonical_key:** `east-asian`
- **surface_label:** `east-asian`
- **parent:** `asian`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `east-asian`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 2 corpus rows. Same convention as §11.16. Contributes `"east-asian" → "east-asian"` to `alias_map`.

---

#### 11.18. `south-asian` (drift literal — 3 corpus appearances)

- **canonical_key:** `south-asian`
- **surface_label:** `south-asian`
- **parent:** `asian`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `south-asian`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 3 corpus rows. Same convention as §11.16. Contributes `"south-asian" → "south-asian"` to `alias_map`.

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

#### 12.1. Americas (170)

- **canonical_key:** `americas`
- **surface_label:** `Americas`
- **parent:** `null`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (170 active lessons; ~28 genuinely pan-Americas or cross-continent, ~142 country/sub-region chains)</summary>

- **`1IxkjYeOmhz2M_MC_Cbzj8vJMnLNVA5UX56CGi6E_Ap8` — "Food Photovoice Lesson Four: What the World Eats"** (Cohort A; tagged `[Asian, African, European, Americas]`): Summary — "Students will look at photographs of families from around the world and their food for the week making comparisons about amount, cost and type of food." Body — "This week, we are going to look at food and families around the world. We will look at photos that show us a family that lives somewhere in the world and what this family eats in an entire week..." `Americas` carries the entire Western Hemisphere alongside three other continents in a single explicit world-comparison lesson — no sub-region/country children, and none would be appropriate.
- **`1G1tJ-_RY56dsObDj_75hm3xBoL5Mgh9Nj44p3dEqlWk` — "Rice & Beans 2-ways"** (Cohort A; tagged `[Cuban, Jamaican, Caribbean, Latin American, Americas]`): "Today we are going to create two Rice and Beans recipes from two different countries. We will be making a Cuban-style rice and beans recipe, and Jamaican-style rice and beans recipe." Two unrelated Caribbean countries in one lesson; `Americas` is a redundant ancestor here but the lesson is structurally pan-Caribbean/cross-country, which the worksheet's parent-chain shape preserves.
- **`13FPqZmdrIamQqrzLZUoeLt8CGTnP3vNJv_C_q5gyxjA` — "The Story of the 3 sisters"** (Cohort B variant; tagged `[Lenape, Indigenous, Americas]` — no `North American` parent): Body — "Who are the Lenape? They are an Indigenous people who used to inhabit the eastern seaboard... The Lenape planted the 3 sisters because they knew they would grow best together." Single-people Indigenous lesson reaching `Americas` directly without a `North American` geographic parent, illustrating the inconsistent diaspora-vs-sub-region tagging pattern (see Notes).

**Tagging pattern:** Cohort A (~28/170, ~16%) is meaningfully pan-Americas in three shapes — (i) world-comparison lessons that explicitly tag 2-4 continents; (ii) cross-Americas-country lessons that tag 2+ sub-regions (Rice & Beans 2-ways spans Cuban + Jamaican; History of Tex-Mex spans Mexican + North American; Black Bean Dip spans Mexican + Caribbean); and (iii) genuine pan-region framings with no specific country (Descriptive Language, Our Garden and Kitchen Community — both tag `Caribbean + Latin American + Americas` describing community-cultural breadth rather than a specific cuisine). Cohort B (~142/170, ~84%) uses `Americas` as the redundant root of a Country → Sub-region → `Americas` ancestry chain. Audit signal: a small set of edge cases over-tag `Americas` with multiple Americas sub-regions despite the body content being about a different region — e.g., `Bats & Banana Pancakes` is tagged `Caribbean + Latin American + Americas` though SE Asia is the actual subject; `Flies & Fruit` similarly mixes South Asian + Caribbean + Latin American + Americas.

</details>

**Notes:** Cluster root for the Americas cluster (highest-frequency cluster root in the corpus at 170 lessons). Cohort A's ~28 lessons confirm `Americas` as a meaningful pan-region tag, not under-tagging. Cohort B's ~142 lessons use `Americas` as hierarchical-parent ancestry. **Cross-cluster diaspora interaction is INCONSISTENT in the corpus** (per TEST DB direct queries 2026-05-10): African American lessons carry `North American` 16/24 of the time (67%); Indigenous 19/24 (79%); Lenape 3/7 (43%); Native American 3/5 (60%). The remaining diaspora/Indigenous lessons skip `North American` entirely and reach `Americas` only via the identity tag's parent chain. Curriculum team should decide whether the canonical schema requires the geographic parent be present on all diaspora-tagged lessons (Stage 2 backfill) or treats `Americas` as the canonical anchor for identity-tagged lessons (status quo). Filter-UI tier `top` is the cluster-root default. Stage 2 audit signal: review the over-tagged Asian-cluster lessons that also carry `Caribbean + Latin American + Americas` (Bats & Banana Pancakes, Flies & Fruit) — candidates to drop the Americas sub-region tagging entirely.

---

#### 12.2. North American (83)

- **canonical_key:** `north-american`
- **surface_label:** `North American`
- **parent:** `americas`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (83 active lessons; cohort breakdown ~23 African American + West African diaspora, ~23 Indigenous-cluster, 2 Mexican cross-tag, ~35 USA-generic)</summary>

- **`1bjiET8ffFpU5_gCMgJBiTDPuHhE0lCPGBnv72LXzrW4` — "Black History Month: Ice Cream Heroes"** (African American cohort; tagged `[African American, North American, Americas]`): "Ice cream was first introduced to America by a Black chef named James Hemings. James Hemings was enslaved by the American president, Thomas Jefferson until he became free at the age of 30. He studied cooking in France and brought many French recipes to America..." Banana-only ice cream lesson framed around three Black culinary innovators (Hemings, Augustus Jackson, Alfred Cralle). `North American` here functions as the geographic anchor for the African American diaspora story.
- **`12ZjWQaqW6hOPDo16zi9PN3iG92jI4KLz` — "Blue Corn Cookies"** (Indigenous cohort; tagged `[Native American, North American, Americas]`): "Today you are going to learn about a food Native Americans/American Indians eat called CORN... This is Blue Corn, blue is utilized a lot by some Tribes of the American West like the Hopi and Navajos..." Tribe-specific in body (Hopi, Navajo) but heritage tag stops at the pan-Indigenous level; `North American` as geographic parent under which `Native American` sits.
- **`1ldS7zEG960hNqyamfSPAbO_mKmmRpHvJ` — "History of Tex-Mex Food"** (Mexican cross-cluster cohort; tagged `[Mexican, Latin American, Americas, North American]`): "Today we are going to learn about Tex-Mex food. Based on the name can you tell where in the world Tex-Mex is from? (Texas and Mexico). Tex-Mex is considered fusion food because it combines foods from different cultures/communities." Carries BOTH `Latin American` (v3 cultural-cluster parent) AND `North American` (geographic parent) — the only sub-region in the corpus where v3 surfaces a dual-parent chain on the same lesson. Both Mexican-tagged North-American rows (Tex-Mex, Vegetarian Quesadillas) demonstrate this pattern.

**Tagging pattern:** `North American` decomposes into four cohorts with very different semantic loads (cohort sizes are exclusive-bucketed by tag-presence priority: AA/WA diaspora > Indigenous-cluster > Mexican > residual). **Cohort A — African American / West African diaspora (~23 lessons):** 15 carry `African American` only, 7 carry `West African` only, 1 carries both; framings include Black History Month, Juneteenth, Hoppin' John, Soul Food, the Black Panther Party. **Cohort B — Indigenous / Native American / Lenape / Haudenosaunee (~23 lessons):** dominated by Three Sisters / corn / Thanksgiving framing; uses `North American` as the standard hierarchical parent above the indigenous-people tags. **Cohort C — Mexican (2 lessons):** Tex-Mex and Vegetarian Quesadillas; both carry the dual `Latin American + North American` parent chain, acknowledging Mexico's geographic placement. **Cohort D — USA-generic residual (~35 lessons):** pure "American" cooking-school dishes (mac & cheese, apple pie, pumpkin muffins, ketchup, cranberry oat cookies), historical-period lessons (Civil War, Colonial NY, Plantations & Industrial Ag), and US-school-garden / NYC-specific content (Honeybee Man, Guerilla Gardening, Alice Waters, Michelle Obama) with no specific ethnic anchor.

</details>

**Notes:** v3 canonical sub-region. Filter-UI tier `top` proposed by frequency (83 lessons, well above the ≥40 threshold) and cluster-parent role. **Cross-cluster diaspora interaction is partial, not uniform** — only 67% of African American lessons and 79% of Indigenous lessons in the corpus carry `North American` as a parallel tag (per §12.1 Notes; verified by direct TEST DB queries 2026-05-10). The 35 USA-generic lessons (Cohort D) raise an open structural question: should there be a `United States` country canonical under `North American`, or is "American cooking-school" content best left as a `North American` direct-child cohort without further canonical structure? v3 has no `American`/`United States` country tag; the corpus has none either. This question is not directly framed by any of the 5 §12 cluster decisions — worth curriculum-team consideration as a candidate decision-summary item at handoff. `Cajun/Creole` (v3-canonical-corpus-absent) currently lives in cross-cluster §9.1; §12 decision #5 considers whether to move it under `North American` here, possibly as a child of the new `southern-united-states` sub-region (§12.17). Stage 2 audit signal: the Mexican / Latin American dual-tag pattern (2 lessons) is the only place where v3 surfaces conflicting cluster parents — both Tex-Mex and Vegetarian Quesadillas carry the dual chain, suggesting the dual-parent pattern is intentional rather than a tagging error.

---

#### 12.3. Latin American (77)

- **canonical_key:** `latin-american`
- **surface_label:** `Latin American`
- **parent:** `americas`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (77 active lessons; 38 with `Mexican`, 24 with no country tag, 4 with `Puerto Rican`, 11 distinct lessons with other-LA-country tags — 2 Cuban + 1 Jamaican + 2 Salvadoran + 2 Honduran + 2 Peruvian + 1 Brazilian + 1 Ecuadorian + 1 Guyanese = 12 tag-appearances but 11 distinct lessons since Rice & Beans 2-ways double-counts as Cuban + Jamaican)</summary>

- **`1u84NuJq0TStf_mZlUtht2OjNnf8bKkSbBuwEBkDSCfI` — "Foods From Around the World: Mexico"** (Mexican cohort; tagged `Mexican + Latin American + Americas`): Summary — "Students will do a reading and watch a video about the culture, geography, and typical ingredients from Mexico, as well as how this food culture is present in New York City." Unambiguous country-specific lesson; `Latin American` here functions as parent-chain redundancy under `Mexican`, mirroring the East Asian Cohort B pattern.
- **`1fSCWUvOjhGHy2TYYvy7rnzx6tL9KS8CRo2A71txuuNw` — "Literary Sancocho"** (no-country cohort; tagged `Latin American + Americas` only): Body explicitly frames the dish pan-regionally — "Today we are going to make sancocho, which is a Latin American soup, that is made up of a variety of ingredients." No country anchor. Genuinely Cohort A — the lesson author chose a multi-country dish deliberately. Compare with **`1q1icjk5Pgdtqp1EFwU7vNmd07SzrnWfeAYTYqIs59ag` — "Three Sister Arepas"** (also no-country, tagged `Latin American + Americas + Indigenous`), where the dish (arepas) is in fact Colombian/Venezuelan-specific — that's a missing-country tag, not a deliberate pan-LA choice.
- **`1rwjyCJ7i7WelQhfAVmxP_8kx-8no7KdmE94v0ExqNRw` — "Making Tostones"** (Puerto Rican cohort; tagged `Puerto Rican + Caribbean + Latin American + Americas`): Body offers the corpus's own articulation of the LA/Caribbean overlap — "Tostones are made in many different Latin American and Caribbean countries like Puerto Rico, Jamaica, Nicaragua, Cuba, Florida, Honduras and Venezuela." All 4 PR lessons in the corpus carry BOTH `Caribbean + Latin American` simultaneously — the corpus does not treat the two as alternative placements; it dual-codes.

**Tagging pattern:** Cohort B (53 distinct lessons with at least one country tag — Mexican 38 + Puerto Rican 4 + 11 distinct other-LA-country lessons) is highly consistent: country tag + `Latin American` + `Americas` is the standard chain. Cohort A (24 no-country) is mixed: roughly half are genuine pan-LA framings (Sancocho, Literary Sancocho, generic Empanadas, "Tastes Around the World," cultures-unit overviews); the other half are under-tagged country-specific lessons (arepas without Colombian/Venezuelan; "Harvesting Friends / Cosechando Amigos" with no country). One mis-tag surfaces: `1mAI2VtQntfWhUtIEKT1xP6Q028Hx-Jyqx_Xr-V2vWkI` ("Empanadas") carries `Latin American + Spanish + Mediterranean + European` based on a single body sentence noting empanada origins in Spain — over-tagged from the European parent chain. Notably, `Latin American` shows partial overlap with `Caribbean` for 6 lessons (all 4 Puerto Rican rows + `Black Bean Dip (Mobile Education)` Mexican-but-also-Caribbean + `Rice & Beans 2-ways` Cuban/Jamaican dual) — the corpus encodes Caribbean and Latin American as overlapping rather than mutually exclusive regions.

</details>

**Notes:** v3 canonical sub-region. Filter-UI tier `top` proposed by frequency (77 lessons, well above the ≥40 threshold). Cohort split: 53 country-anchored distinct lessons (Mexican-dominant at 38, then 4 Puerto Rican + 11 other-LA-country distinct lessons) vs 24 no-country (roughly half deliberate pan-LA, half under-tagged country-specific lessons). The corpus DOES support v3's Latin American placement for Puerto Rican — all 4 PR lessons dual-code as `Puerto Rican + Caribbean + Latin American + Americas` simultaneously, and "Making Tostones" itself articulates the LA/Caribbean overlap in lesson body text. Curriculum team should decide whether the hierarchy artifact treats Caribbean ⊂ Latin American, Caribbean as sibling sub-region with shared members, or models Puerto Rico as a dual-parent leaf — the corpus pattern points to dual-parent. Stage 2 audit signals: (1) arepa lessons (Three Sister Arepas + Three Sisters Empanadas) need `Colombian`/`Venezuelan` country tags; (2) empanada lessons over-tagged with `Spanish + European` chain based on single body sentence about Spanish origins; (3) Cohort A no-country rows mixing in `Asian` sub-regions (Bats & Banana Pancakes tagged `Southeast Asian + Caribbean + Latin American`; Flies & Fruit tagged `South Asian + Caribbean + Latin American`) need a focused re-tag pass — likely artifacts of v3 multi-cuisine tagging on weakly-cultural lessons.

---

#### 12.4. Caribbean (17)

- **canonical_key:** `caribbean`
- **surface_label:** `Caribbean`
- **parent:** `americas`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (17 active lessons; 11 in Cohort 1 — 7 country-tagged with hierarchy carry-up + 4 cross-cluster carry-ins; 4 pan-Caribbean / no-country; 2 Callaloo cross-cluster acknowledgments)</summary>

- **`18b977UbveLAzs1crIsZ1Jj9GZIQw5f-ACgtgpM35cmw` — "Arroz con Gandules"** (tagged `Puerto Rican + Caribbean + Latin American + Americas`): Summary — "Students will make arroz con gandules, a recipe from Puerto Rico, and a salad with cabbage, carrot, and apple." Body keywords explicitly list "Hispanic/Latinx heritage, Caribbean, Puerto Rico". All 4 Puerto Rican lessons in the corpus follow this exact shape — they carry BOTH `Caribbean` AND `Latin American` simultaneously. The v3 baseline's "PR under Latin American not Caribbean" choice is contradicted by every PR lesson in the actual corpus.
- **`1G1tJ-_RY56dsObDj_75hm3xBoL5Mgh9Nj44p3dEqlWk` — "Rice & Beans 2-ways"** (tagged `Cuban + Jamaican + Caribbean + Latin American + Americas`): Body — "Today we are going to create two Rice and Beans recipes from two different countries. We will be making a Cuban-style rice and beans recipe, and Jamaican-style rice and beans recipe." Multi-country pan-Caribbean lesson where Cuban + Jamaican both tag, and `Caribbean` legitimately functions as the joining parent — also paired with `Latin American` (the Cuban tag pulls it in).
- **`1xA88OeHAL5csyB1zfUwvQaibMNdryE7c` — "Bats & Banana Pancakes"** (tagged `Southeast Asian + Asian + Caribbean + Latin American + Americas`): Body — "Bananas originated in Southeast Asia, in the jungles of Malaysia, Indonesia or the Philippines... Bananas constitute a significant portion of the export revenues for many Latin American and Caribbean countries." The lesson is ABOUT bat-pollinator biology and banana economics, not Caribbean foodways — `Caribbean` was tagged for a one-sentence mention of Latin American/Caribbean banana exports. Clear over-tagging from a single content cue.

**Tagging pattern:** Three distinct cohorts (totals verified by direct TEST DB enumeration 2026-05-10). **(1) Country-tagged with hierarchy carry-up + cross-cluster carry-ins (11 distinct Cohort 1 lessons total):** 7 country-tagged distinct lessons (8 country tag-appearances since Rice & Beans 2-ways dual-tags as Cuban + Jamaican) — 4 Puerto Rican + 2 Jamaican (Plantain Chips with Jerk Seasoning + Rice & Beans 2-ways) + 1 Cuban (Rice & Beans 2-ways — same lesson as one Jamaican) + 1 Guyanese (Guyanese Curried Chickpeas), plus 4 cross-cluster Caribbean carry-ins — "Black Bean Dip" (Mexican + Caribbean, body cites "popular in Costa Rica, Mexico, Cuba"), "Bats & Banana Pancakes" (Southeast Asian + Caribbean, over-tag), "Flies & Fruit" (South Asian + Caribbean, similar over-tag), and "New Years Food Traditions" (East Asian + African + European + Caribbean + Americas, multi-continent world-tour). Of these, **every single Puerto Rican lesson carries `Caribbean` AND `Latin American` together** — the corpus does NOT respect the v3 either/or split. **(2) Pan-Caribbean / country-absent (4 lessons):** "Foods From Around the World: Caribbean Islands", "Food Memories", "Descriptive Language", "Our Garden and Kitchen Community" — `Caribbean` operates as the primary heritage tag without a country, sometimes genuinely regional, sometimes inheriting from incidental recipe choice. **(3) Cross-cluster acknowledgment (2 lessons):** "Callaloo" + "Middle School Family Cooking Night: Callaloo" tag `Caribbean + Americas + West African + African` — explicitly acknowledging the dish's West African diasporic origin alongside its Caribbean home. Net: `Caribbean` legitimately functions as both a parent (when paired with country tags) and as a primary regional tag (when no country is specified); the v3 placement of Puerto Rican under Latin American (Spanish-speaking axis) is empirically rejected by 4/4 PR rows in the corpus.

</details>

**Notes:** v3 canonical sub-region. **Puerto Rican placement signal is decisive: 4/4 PR lessons carry BOTH `Caribbean` AND `Latin American` simultaneously** — the corpus has never respected v3's geographic-vs-Spanish-speaking either/or framing; in practice PR sits in both subtrees at once. This surfaces multi-parent membership as an open schema question — Session 59 design decision #1 ("2-level-flexible parent chains") governs hierarchy depth, not multi-parent membership; the current per-entry shape is single-parent (Notes-level flag here is the interim accommodation; adding a `parents:` plural field would be a future schema/worksheet decision). Filter-UI tier `sub` proposed (17 lessons, between sub and top thresholds). Cluster decision: curriculum team may promote to `top` given v3 canonical status + role as parent for 4 country-specific tags (Puerto Rican × 4 [multi-parent shared with Latin American] + Jamaican × 2 + Cuban × 1 [Rice & Beans 2-ways, dual-tagged with Jamaican] + Guyanese × 1 = 8 country tag-appearances across 7 distinct lessons; plus 4 cross-cluster Caribbean carry-ins, totaling Cohort 1's 11 distinct lessons). Stage 2 audit signals: (a) "Bats & Banana Pancakes" should drop `Caribbean + Latin American + Americas` — a single sentence about banana export economies does not make a banana-and-bats biology lesson a Caribbean food lesson; (b) "Descriptive Language" and "Our Garden and Kitchen Community" carry `Caribbean + Latin American + Americas` with no body content surfacing a clear regional framing; (c) the two Callaloo `Caribbean + West African` pairings are intentional and worth preserving as the template for diaspora-aware tagging. Trinidadian, Haitian, Bahamian, and Dominican are all zero-corpus — none surface even adjacent to the 4 pan-Caribbean lessons.

---

#### 12.5. Mexican (38)

- **canonical_key:** `mexican`
- **surface_label:** `Mexican`
- **parent:** `latin-american`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (38 active lessons tagged with `Mexican`)</summary>

- **`1zbfn_WweqPwJD_we1vyGzaVTVLRvtXOaICLEpKwHxjg` — "Tamales":** "These tamales are from Mexico, but many of Mexico's neighboring countries also make tamales... Tamales are a food tradition from Mexico. They can take a long time to prepare, so they are usually prepared on very special days, like Christmas, New Year's, Mexican Independence Day, or birthdays." Masa harina + corn husks + bell pepper / tomato / onion / mozzarella filling; lesson explicitly frames tradition as the word of the day and invites students to share their own family food traditions.
- **`1ldS7zEG960hNqyamfSPAbO_mKmmRpHvJ` — "History of Tex-Mex Food":** "Today we are going to learn about Tex-Mex food. Based on the name can you tell where in the world Tex-Mex is from? (Texas and Mexico). Tex-Mex is considered fusion food because it combines foods from different cultures/communities. If there is a map locate where Texas and Mexico are — take note of proximity." Students read a Tex-Mex history article and make enchiladas. Heritage chain `[Mexican, Latin American, Americas, North American]` is the cross-cluster signal that distinguishes this lesson and "Vegetarian Quesadillas" from the cuisine-pure majority.
- **`1lsIXKwRddBM5Qvz6JMAd7BC78EHSU5jOiFd4vmpvP_4` — "Corn and the Aztec Empire":** "You all read an article about the Aztec Empire... what food was very important during this time? Corn, which is a very versatile vegetable, was used for most meals. Today we will be making atole, which is a creamy dish made from corn flour that can be consumed as a drink or with a spoon. Atole is something that has been eaten since ancient times..." 7th grade winter lesson explicitly bridges pre-Columbian Mesoamerican history to modern Mexican cuisine.

**Tagging pattern:** Tagging is semantically clean — every sampled lesson has a recognizable Mexican thread (cuisine, ingredient, history, or geography). The cluster is salsa- and corn-heavy: ~9 of 38 are salsa variants (Garden Salsa, Harvest Salsa × 4 incl. Mobile Education variants, Pico de Gallo, Summer Harvest Salsa, Top Chef Salsa, Salsa Toast × 2, September Salsa Toasts), ~6 are corn dishes (esquites × 3, Mexican Street Corn Salad × 1, atole, Three Sisters tortilla/enchilada/taco lessons), and the remainder spans tacos, tamales, quesadillas, guacamole, agua fresca, jicama slaw, empanadas, amaranth, and burrito bowls. Three lessons frame Mexico through Hispanic/Latinx Heritage Month rather than country cuisine specifically (Esquites × 2 + Foods From Around the World: Mexico). One lesson — "Farm Workers & Pesticides" — uses the Mexican tag to frame Cesar Chavez and migrant farm worker activism rather than cuisine, but stays plausibly within heritage scope.

</details>

**Notes:** v3 canonical country, parent = Latin American. Biggest country in the Americas cluster and one of the cleanest signals in the corpus — no false positives in the sample. Three observations: (1) **No sub-region detail in lesson bodies** — no Yucatecan / Oaxacan / Sinaloan / Sonoran framing surfaces; the only sub-style that appears is `Tex-Mex` (2 lessons), correctly cross-tagged to `North American` and behaving as a Mexican-American fusion category rather than a Mexico-internal region. (2) **Cross-cluster tagging is mostly principled but has 2 looser cases.** `3 Sisters Tacos` carries `[Lenape, Indigenous, Mexican, Latin American, Americas]` — defensible (Three Sisters agriculture spans Mesoamerican and Indigenous North American traditions). `Empanadas & Corn Salad` carries `[..., Mexican, Spanish, European]` for the colonial-fusion angle, also defensible. Looser: `Black Bean Dip` adds `Caribbean` (no Caribbean framing in the summary), and `September Salsa Toasts` adds `[Italian, European]` (likely noise from the "toast" element, weakest fit in the cluster). (3) **One geography-only lesson** — `Monarch Migration` uses `Mexican` because monarchs overwinter in Mexico, not because of cuisine or culture; the lesson body literally writes `Tags: Mexico, North America`. Borderline for a heritage tag but raises the question of whether `culturalHeritage` should accept geographic-place tagging. Flag for the curriculum team.

---

#### 12.6. Puerto Rican (4)

- **canonical_key:** `puerto-rican`
- **surface_label:** `Puerto Rican`
- **parent:** `latin-american`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (4 active lessons tagged with `Puerto Rican` — full cohort read; all 4 dual-coded as Caribbean AND Latin American)</summary>

- **`18b977UbveLAzs1crIsZ1Jj9GZIQw5f-ACgtgpM35cmw` — "Arroz con Gandules":** "Explain that we are making a recipe from Puerto Rico today. Show it on the map and let them know that it is part of the United States... arroz con gandules, rice and pigeon peas, is considered by some to be the national dish of Puerto Rico... adobo seasoning is a very important part of Puerto Rican cooking, and we are going to be making our own adobo seasoning mix today." Lesson body tags list "Hispanic/Latinx heritage, Caribbean, Puerto Rico." Heritage array: `["Puerto Rican", "Caribbean", "Latin American", "Americas"]`.
- **`1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU` — "Arroz con Gandules / Apple Jicama Slaw":** "Show them Puerto Rico on the map and let them know that it is part of the United States... Talk about how Puerto Rico is a part of the US and that it is a commonwealth / territory, and if you're born there you are a US citizen... What language do people speak in Puerto Rico?" Makes sofrito with aji dulce, culantro; same arroz con gandules dish. Heritage array: `["Puerto Rican", "Caribbean", "Latin American", "Americas"]`.
- **`1rwjyCJ7i7WelQhfAVmxP_8kx-8no7KdmE94v0ExqNRw` — "Making Tostones":** Lesson summary: "they will learn about a new Latin American and Caribbean food." Body: "Tostones are made in many different Latin American and Caribbean countries like Puerto Rico, Jamaica, Nicaragua, Cuba, Florida, Honduras and Venezuela. Tostones are made from plantains." Explicitly groups Puerto Rico in a Pan-Caribbean + Latin-American frame with Jamaica (Anglophone Caribbean) and Cuba (Spanish Caribbean). Heritage array: `["Puerto Rican", "Caribbean", "Latin American", "Americas"]`.

**Tagging pattern:** Tagging is semantically consistent and unambiguous as MULTI-PARENT. All 4 lessons carry the identical 4-level heritage hierarchy `["Puerto Rican", "Caribbean", "Latin American", "Americas"]` — the existing tagger treats this country as belonging to BOTH the Caribbean parent AND the Latin American parent simultaneously, not one or the other. Cuisine is uniformly Spanish-Caribbean / Afro-Caribbean (arroz con gandules × 3 with sofrito, adobo, pigeon peas, plantains; tostones × 1). Body framing splits cleanly: the rice-and-gandules lessons foreground the US-commonwealth-territory angle ("Puerto Rico is a part of the US"), while the tostones lesson foregrounds the Pan-Caribbean culinary network (PR alongside Jamaica, Cuba, Nicaragua, Honduras, Venezuela). The corpus signal does NOT support v3's single-parent placement under Latin American; it supports MULTI-PARENT (Latin American AND Caribbean).

</details>

**Notes:** v3 canonical country, parent = Latin American per v3 baseline. **The corpus signal recommends MULTI-PARENT placement under BOTH `caribbean` and `latin-american`** — 4/4 lessons stamped with both parents, and the tostones body explicitly groups Puerto Rico with Jamaica (Anglophone-Caribbean, NOT Latin American) AND Cuba (Spanish Caribbean) in a single "Latin American and Caribbean" framing that only makes sense if PR sits in both. The arroz-con-gandules lessons' US-territory framing ("part of the United States... commonwealth / territory") is a third weak axis that doesn't translate cleanly to a heritage-hierarchy parent. Filter-UI tier `sub` proposed (4 lessons; below the ≥5 threshold for `sub` by frequency, but v3 canonical status + decisive corpus signal + the cross-cluster placement question support sub-tier). The `parent` field above shows the v3 baseline (`latin-american`); curriculum team should decide whether to (a) leave as single-parent Latin American per v3, (b) move to single-parent Caribbean, or (c) introduce multi-parent (both Caribbean and Latin American). The worksheet currently encodes single-parent per §2's "single canonical home" convention for multi-parent values; multi-parent surfacing via Notes flag is the current accommodation pending curriculum-team review (see Session 64 process notes for the `parents:` plural-field question). **Signal for §12 framing #5 (Dominican):** the tostones lesson body lists Cuba but NOT Dominican Republic, even though Dominican cuisine shares tostones + sofrito + similar Caribbean-Spanish-speaking diaspora — suggests Dominican is genuinely absent from the corpus, not just under-tagged. **Stage 2 audit signal:** the existing 4-level hierarchy tagging on every Puerto Rican lesson is the cleanest cohort observed in the worksheet so far — if the canonical schema adopts multi-parent for Puerto Rican, no re-tagging needed; if forced single-parent, all 4 require a parent-drop decision.

---

#### 12.7. Salvadoran (2)

- **canonical_key:** `salvadoran`
- **surface_label:** `Salvadoran`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Latin American per v3 baseline. 2 corpus lessons. Below the ≥3-lesson sub-tier bar per §11 cluster decision #2 — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status. If §12 framing #3's `Central American` NEW sub-region candidate is accepted, parent re-routes to `central-american`.

---

#### 12.8. Honduran (2)

- **canonical_key:** `honduran`
- **surface_label:** `Honduran`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A Latin American lists Mexican / Dominican / Puerto Rican / Salvadoran only). 2 corpus lessons. Candidate for `new` verdict — Honduran cuisine shares Central American culinary traditions with Salvadoran. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. If §12 framing #3's `Central American` NEW sub-region candidate is accepted, parent re-routes to `central-american`.

---

#### 12.9. Cuban (2)

- **canonical_key:** `cuban`
- **surface_label:** `Cuban`
- **parent:** `caribbean`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A Caribbean lists only Jamaican). 2 corpus lessons (per direct TEST DB query): "Rice & Beans 2-ways" (heritage `[Cuban, Jamaican, Caribbean, Latin American, Americas]`) and "Everybody Cooks Rice" (heritage `[Cuban, Latin American, Americas]` — notably MISSING the `Caribbean` parent despite Cuba being geographically Caribbean). Candidate for `new` verdict — Cuban appears alongside Jamaican in the cross-Caribbean comparison lesson and is geographically + culturally a clear Caribbean country. The §12.6 Puerto Rican tostones body lists Cuba in its pan-Caribbean culinary geography — Cuban presence in the corpus is well-supported beyond just the 2 explicitly-tagged rows. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. **Stage 2 audit signal:** "Everybody Cooks Rice" is missing the `Caribbean` parent tag — should re-tag to `[Cuban, Caribbean, Latin American, Americas]` (or to multi-parent equivalent depending on the cluster decision).

---

#### 12.10. Jamaican (2)

- **canonical_key:** `jamaican`
- **surface_label:** `Jamaican`
- **parent:** `caribbean`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Caribbean per v3 baseline. 2 corpus lessons (Rice & Beans 2-ways pairs with Cuban; a separate Jamaican-tagged lesson per the §12.4 corpus read). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status. (The §12.4 Caribbean and §12.6 Puerto Rican corpus reads both surface Jamaican as part of Anglophone-Caribbean comparison framings — well-supported corpus signal.)

---

#### 12.11. Peruvian (2)

- **canonical_key:** `peruvian`
- **surface_label:** `Peruvian`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A Latin American lists Mexican / Dominican / Puerto Rican / Salvadoran only). 2 corpus lessons. Candidate for `new` verdict — Peru is the largest South American country by population and culinary tradition; corpus presence well-supported. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. If §12 framing #3's `South American` NEW sub-region candidate is accepted, parent re-routes to `south-american`.

---

#### 12.12. Brazilian (1)

- **canonical_key:** `brazilian`
- **surface_label:** `Brazilian`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. 1 corpus lesson. Candidate for `new` verdict — Brazil is the largest country in South America by population and area. Note: Brazil is Portuguese-speaking, not Spanish-speaking; "Latin American" parent is the v3-baseline-derived placement but Brazilian cultural identity sits adjacent to Hispanic Latin American rather than within it. `internal`-tier proposed. If §12 framing #3's `South American` NEW sub-region candidate is accepted, parent re-routes to `south-american` (which would be a more natural geographic fit).

---

#### 12.13. Ecuadorian (1)

- **canonical_key:** `ecuadorian`
- **surface_label:** `Ecuadorian`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. 1 corpus lesson. Candidate for `new` verdict — Ecuador is part of Andean South American culinary tradition. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. If §12 framing #3's `South American` NEW sub-region candidate is accepted, parent re-routes to `south-american`.

---

#### 12.14. Guyanese (1)

- **canonical_key:** `guyanese`
- **surface_label:** `Guyanese`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. 1 corpus lesson. Candidate for `new` verdict — Guyana is geographically South American but culturally distinct (Anglophone, large Indo-Caribbean and Afro-Guyanese populations; culinary traditions overlap with Caribbean). The §12.4 Caribbean corpus read identifies the 1 Guyanese-tagged lesson as also tagged `Caribbean` — empirical multi-parent signal similar to Puerto Rican. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Cluster decision: parent could be `latin-american` (v3-baseline-style), `caribbean` (geographic-cultural fit), `south-american` (geographic fit if §12 framing #3's NEW sub-region candidate accepted), or multi-parent. Curriculum team call.

---

#### 12.15. Central American (1)

- **canonical_key:** `central-american`
- **surface_label:** `Central American`
- **parent:** `americas`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (v3 has no `Central American` sub-region; v3 Latin American lists Mexican / Dominican / Puerto Rican / Salvadoran as flat country-specifics). 1 corpus lesson tagged with this value. Candidate for `new` verdict — would create a Central American sub-region as a sibling of Latin American and Caribbean. If accepted, would re-parent Salvadoran (2 lessons) and Honduran (2 lessons) from `latin-american` to `central-american`. Filter-UI tier `internal` proposed at the 1-corpus-occurrence level — curriculum team may promote to `sub` if the re-parenting cohort (Salvadoran + Honduran + this 1 row = 5 lessons) justifies sub-tier. **Cluster decision required:** §12 framing #3 asks specifically about this candidate.

---

#### 12.16. South American (1)

- **canonical_key:** `south-american`
- **surface_label:** `South American`
- **parent:** `americas`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. 1 corpus lesson tagged with this value. Candidate for `new` verdict — would create a South American sub-region as a sibling of Latin American and Caribbean. If accepted, would naturally re-parent Peruvian (2), Brazilian (1), Ecuadorian (1), and possibly Guyanese (1) from `latin-american` to `south-american`. Filter-UI tier `internal` proposed at the 1-corpus-occurrence level — curriculum team may promote to `sub` if the re-parenting cohort (~5-6 lessons) justifies sub-tier. **Cluster decision required:** §12 framing #3. Note: arepa-tagged lessons (Three Sister Arepas, Three Sisters Empanadas) are currently untagged for country (Colombian / Venezuelan) per §12.3 audit signal; Stage 2 country-tag backfill would also feed into the `south-american` cohort.

---

#### 12.17. Southern United States (1)

- **canonical_key:** `southern-united-states`
- **surface_label:** `Southern United States`
- **parent:** `north-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. 1 corpus lesson tagged with this value. Candidate for `new` verdict — would create a Southern United States sub-region under North American, useful for Soul Food / Cajun-Creole / Southern-cuisine framing. Note: v3 baseline lists `Cajun/Creole` as a `North American` child (currently corpus-absent — see §9.1 cross-cluster); if `Southern United States` becomes a canonical sub-region, `Cajun/Creole` could naturally re-parent under it. The §12.2 North American corpus read identified ~35 USA-generic lessons (Cohort D) that have no specific ethnic anchor — some of these may eventually carry `Southern United States` tagging if a southern-cuisine sub-region cohort emerges (Stage 2). Filter-UI tier `internal` proposed at 1-lesson frequency. **Cluster decision required:** §12 framing #3.

---

#### 12.18. Dominican (0)

- **canonical_key:** `dominican`
- **surface_label:** `Dominican`
- **parent:** `latin-american`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Latin American per v3 baseline. **0 corpus lessons** — this is a v3-baseline-but-corpus-absent value (per §12 framing decision #5). Verdict options: `keep` for future tagging (Dominican cuisine shares strong tradition with Puerto Rican and Cuban; corpus may grow); `drop` for absence of corpus signal; or `internal`-tier-only as a placeholder. The §12.6 Puerto Rican corpus read flags that the tostones body explicitly lists Cuba (also corpus-present, see §12.9) but NOT Dominican Republic, even though Dominican cuisine shares tostones / sofrito / similar Caribbean-Spanish-speaking diaspora — suggests Dominican is genuinely absent rather than under-tagged. Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. **Note on convention:** this entry diverges from §11 Asian cluster's convention (where v3-canonical-corpus-absent values Filipino / Thai / Bengali were handled at cluster-decision-summary level without per-value entries). §12 framing decision #5 explicitly asks the verdict at per-value level, so Dominican gets a per-value entry. Curriculum team's verdict here also informs how to handle the parallel Asian v3-absent values.

---

#### 12.19. `americas` (drift literal — 1 corpus appearance)

- **canonical_key:** `americas`
- **surface_label:** `americas`
- **parent:** `null`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `americas`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row. Surfaced explicitly as a `merge` entry for parser-and-reader clarity. The `canonical_key` field matches the merge target's slug (both are kebab-case-lowercase by slug convention applied to the same underlying value — see §7 alias_map identity-shaped entries). This entry contributes `"americas" → "americas"` to the `alias_map` output (literal-to-canonical-key); verdict `merge` excludes it from the canonical vocabulary list.

---

#### 12.20. `north-american` (drift literal — 13 corpus appearances)

- **canonical_key:** `north-american`
- **surface_label:** `north-american`
- **parent:** `americas`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `north-american`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 13 corpus rows — the largest single drift footprint in the Americas cluster. Same convention as §11.16. Contributes `"north-american" → "north-american"` to `alias_map`.

---

#### 12.21. `latin-american` (drift literal — 4 corpus appearances)

- **canonical_key:** `latin-american`
- **surface_label:** `latin-american`
- **parent:** `americas`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `latin-american`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 4 corpus rows. Same convention as §11.16. Contributes `"latin-american" → "latin-american"` to `alias_map`.

---

#### 12.22. `caribbean` (drift literal — 1 corpus appearance)

- **canonical_key:** `caribbean`
- **surface_label:** `caribbean`
- **parent:** `americas`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `caribbean`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row. Same convention as §11.16. Contributes `"caribbean" → "caribbean"` to `alias_map`.

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

#### 13.1. African (41)

- **canonical_key:** `african`
- **surface_label:** `African`
- **parent:** `null`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (41 active lessons; 3 genuinely pan-region, 9 country/sub-region chains without diaspora overlay, 25 cross-cluster diaspora carry-ins, 4 under-tagged residuals)</summary>

- **`1IxkjYeOmhz2M_MC_Cbzj8vJMnLNVA5UX56CGi6E_Ap8` — "Food Photovoice Lesson Four: What the World Eats"** (Cohort A; tagged `[Asian, African, European, Americas]`): Body — "This week, we are going to look at food and families around the world. We will look at photos that show us a family that lives somewhere in the world and what this family eats in an entire week..." An explicit four-continent comparison lesson with no sub-region or country children; `African` carries the entire continent alongside three other continents and none of the standard sub-regions (North/East/West) would be appropriate. The same pan-Africa framing shape as the §11.1 Asian Cohort A.
- **`1HWSlL8xio3QQkculHrVLA0EvEBSU4Th_tEZU4pXiD4Q` — "Nigeria / Red Bean Stew"** (Cohort B; tagged `[Nigerian, West African, African]`): Body — "Red Bean Stew/Nigeria (Foods around the World). Summary: Students will learn about Nigeria and make red bean stew." Single-country lesson with the canonical 3-level chain Nigerian → West African → African; `African` is the redundant root of the ancestry chain, not an independent signal. Companion shape to the §11.1 Aloo Gobi (Indian → South Asian → Asian) example.
- **`14wTm_zkFDwSqkUBJj01zdY2Lq1D6-eXdj6BQcZwOrQ4` — "Black Eyed Peas, the South and BHM"** (Cohort C; tagged `[African American, North American, Americas, West African, African]`): Summary — "In honor of Black History Month, we are making black eyed peas and collard greens with a really tasty spice called berbere." The five-tag stack threads the African diaspora simultaneously: `African American + North American + Americas` is the post-emancipation U.S. South cuisine, and `West African + African` is the pre-emancipation origin (black-eyed peas + berbere). This is the dominant cohort shape — `African` paired with U.S./Americas diaspora tags in Black History Month and Juneteenth lessons. The companion `Stewed Black Eyed Peas w/Plantains` summary names it explicitly: "Also a traditional dish eaten throughout the Americas, it demonstrates the African Diaspora."
- **`1xAXJC36uPVXF-yL1zmbCk6SqFJU_Ht5Kkg0Mc7NfwL8` — "Wangari Maathai 4th/5th"** (Cohort D under-tagged; tagged `[African]` only): Body — "Today we're going to learn about a hero who helped her community and the Earth by planting trees... Introduce Wangari Maathai." The lesson is about Wangari Maathai, a Kenyan environmental activist, but only `African` is tagged — the sibling lesson `October Seed Saving` (also Wangari Maathai content per body: "a real woman who lived in Kenya, a country in Africa. Her name is Wangari Maathai") correctly tags `[Kenyan, African]`. Inconsistent depth on the same source material.

**Tagging pattern:** Cohort A (3/41, ~7%) is genuinely pan-Africa — world-comparison and around-the-world-foods lessons where `African` carries the whole continent alongside other continents with no specific country to assign. Cohort B (9/41, ~22%) uses `African` as the redundant root of a Country → Sub-region → `African` ancestry chain (Nigerian/West African/African, Egyptian/North African/African, Kenyan/African, Ethiopian/African, Moroccan/North African/African, East African/African). Cohort C (25/41, ~61%) is the dominant pattern and the distinctive feature of this cluster: `African` paired with `African American` and/or `West African` and `Americas/North American` in Black History Month, Juneteenth, and African American foodways lessons — the tagging is intentionally diasporic-aware, locating dishes both at their West African origin and at their U.S. cultural home. Cohort D (4/41, ~10%) flags under-tagging: `Wangari Maathai 4th/5th` carries only `African` despite Kenyan body content; `Edmond Albius` carries `[African, African American diaspora]` without a sub-region tag (body identifies Réunion / East Africa); the two `Lotion & Agar Soap` lessons (K + MS) carry `[African, North American]` — Dr. George Washington Carver content where the African American identity tag is the natural fit (sibling `In the Garden with Dr. Carver` carries it correctly). **Cross-cluster diaspora pairing rates** (active corpus, TEST DB query 2026-05-10): 15 of 24 `African American` lessons carry `African` as a parallel tag (62.5%); 3 of 24 carry `West African` (12.5%); 1 of 2 `African American diaspora` lessons carries `African`. Of the 12 `West African + African` lessons that do NOT also carry `African American`, 10 are diaspora-aware Cohort C carry-ins (2 Callaloo, 7 with `North American` parent — Juneteenth × 3, BHM × 2, Newly Freed Americans, BEP Hummus — and 1 Juneteenth that omits NA too); only 1 (Nigeria/Red Bean Stew) is pure West African + African with no cross-cluster tag. The diaspora connection is encoded in the West African + Americas/North American/Caribbean pairing even when the explicit `African American` tag is omitted.

</details>

**Notes:** Cluster root for the African cluster (third-largest cluster root in the corpus at 41 lessons, after Americas 170 and Asian 63). Cohort C's 25 lessons (~61%) make this the most diaspora-heavy cluster root in the corpus — by contrast with Asian's §11.1 (Cohort A pan-region 4 + Cohort B hierarchical-parent 59 dominate) and Americas's §12.1 (Cohort A pan-Americas ~28 + Cohort B hierarchical-parent ~142). Neither of those cluster roots carries a comparable cluster-level diaspora cohort — for Americas, the sub-region §12.2 North American is where the diaspora cohort lives (Cohort A African American/West African diaspora ~23, Cohort B Indigenous/Native American ~23, Cohort D USA-generic ~35), not the cluster root itself. Filter-UI tier `top` is the cluster-root default and well-supported by frequency. Stage 2 audit signals include: under-tagged Kenyan content (Wangari Maathai 4th/5th), under-tagged Carver content (2 soap lessons), under-tagged Réunion / East African geography (Edmond Albius), and a Cohort A heritage-array anomaly (`5th Grade Food Cultures Unit Overview` carries `African` despite no African country in the body keywords — plausible legacy auto-tagging artifact; flag for Stage 2 reviewer validation). The cross-cluster diaspora interaction with §9.1 is the heaviest in the corpus and would benefit from explicit Stage 2 attention to (a) whether `African American`-content lessons should carry both `African` AND `West African` (current corpus pattern: 15/24 carry `African`, 3/24 carry `West African`) and (b) whether the cluster-root convention for diaspora-bridged dishes is `African` or `West African` (a structural curriculum-team question).

---

#### 13.2. West African (15)

- **canonical_key:** `west-african`
- **surface_label:** `West African`
- **parent:** `african`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (15 active lessons; 14 of 15 carry at least one cross-cluster tag — only Nigeria/Red Bean Stew is pure West African + African. Cross-cluster pairings overlap — 1 lesson is both `African American` AND `North American`. Bucket counts: 3 with `African American`, 2 with `Caribbean`, 8 with `North American` (7 of those WITHOUT explicit `African American`; 1 of those also `Southern United States`), 2 with Americas-only cross-cluster (Juneteenth `1gHg6...` + Seed & Date Balls). 2 lessons additionally country-tag `Nigerian`.)</summary>

- **`1HWSlL8xio3QQkculHrVLA0EvEBSU4Th_tEZU4pXiD4Q` — "Nigeria / Red Bean Stew"** (Cohort A, country-tagged + pure-WA; tagged `[Nigerian, West African, African]`): "Red Bean Stew/Nigeria (Foods around the World) Keywords: Nigeria, red bean stew. Summary: Students will learn about Nigeria and make red bean stew." Anchored to a single named country with no diaspora framing — students learn about Nigeria specifically, no slave-trade or African-American history context. The ONLY lesson in the cohort that is pure West African + African (no `North American`, `African American`, or `Caribbean` carry-along) — the cleanest country-anchored row.
- **`10VASBkheY2wLqM6A81N6yLjwY0lMGbcFcQ7MElBYqEY` — "A Short History of African American Farmers and Cooks"** (Cohort A + Cohort C — country tag AND African American diaspora; tagged `[Nigerian, West African, African American, African, Americas]`): "Students will read an introductory text about influence of African Americans on American farming and food traditions, moving from the era of slavery to the modern era. Then students will cook and eat Nigerian asaro, a recipe that combines African and American influences." Explicitly bridges Nigeria → African American culinary tradition by pairing a Black-history reading with a Nigerian dish. The five-tag chain is the corpus's most-articulated diaspora pattern — country + sub-region + region + diaspora-cluster + geographic-anchor.
- **`1UnaUuap0s73WmekEM-m0amMyaww8T_bYS6JeNFgZmmY` — "Callaloo"** (Cohort C, Caribbean diaspora pairing; tagged `[Caribbean, Americas, West African, African]`): "Today we will make a dish called Callaloo which comes from tropical Caribbean islands like Trinidad, Jamaica and Dominica. (Point to the countries on a world map). These are places that are warm for most of the year… We will look at how people eat different foods in different climates, and at how traditional dishes change when people move around the world." Body anchors entirely in Caribbean geography; the `West African + African` tag pair acknowledges the dish's diasporic origin without surfacing in the lesson text. Both Callaloo lessons in the cohort use this same `Caribbean + West African + African` tag chain (the corpus's headline cross-cluster pattern — also surfaced in the §12.2 North American read).
- **`1NHQd8BVmNECNgkMV4FeJjC5fzMxi-Pcp` — "Stewed Black Eyed Peas w/Plantains"** (Cohort C, African American diaspora pairing; tagged `[West African, African, African American, Americas]`): "As a tribute to Black History month, students will learn how to make a black-eyed pea stew with fried plantains, a popular dish throughout western Africa. Also a traditional dish eaten throughout the Americas, it demonstrates the African Diaspora… This dish is traditionally eaten for luck during the New Year in the American South. It originates in Africa, particularly Western Africa and Ghana, where it was brought to the Americas through the slave trade." Body explicitly names "the African Diaspora" as the framing concept — the most pedagogically-explicit diaspora lesson in the cohort. Curiously omits the `North American` tag despite anchoring in the American South.
- **`1DdaCvc-EWgpVEHQLfngJnMUrHO3TsRRRfdMRsG9XX0o` — "Newly Freed Americans"** (Cohort C, North American diaspora framing without explicit `African American` tag; tagged `[West African, African, North American, Americas]`): "Most Black Americans who lived in the South after the Civil War trace their ancestry to West Africa. Yams were a very important crop to West African peoples." Lesson body is unambiguously about African American history (sharecropping, post-Civil-War sweet potato cultivation, Black culinary culture preservation) — yet carries no `African American` tag. This is the pattern across 7 of the 8 `North American`-paired lessons in the cohort: Juneteenth, Black History Month, and Civil War framings tag `West African + North American` but omit `African American` despite all-but-explicit content alignment.
- **`149Rdf7CWlzT281PVn5cXzPekcyHA2ozj` — "Seed & Date Balls"** (Cohort D, over-tagged audit signal; tagged `[West African, African, Americas, Asian]`): The body's West African reference is one paragraph deep in a multi-civilizational survey: "Seed balls may have been used by the Ancient Egyptians to seed the receding banks of The Nile after annual floods. They have been used in Asia and elsewhere, especially in arid regions… In the Carolinas in the 1700's, West African slaves, predominantly women, were brought in to cultivate rice using a seed ball technique that was used in Africa." Lesson's actual focus is springtime seed-ball gardening + a date-ball snack — neither the seed-ball technique nor the date-ball recipe is meaningfully West African. The `Asian` tag is similarly tenuous (one body sentence). This is the cohort's clearest over-tagging case.

**Tagging pattern:** West African is unusually diaspora-heavy — **14 of 15 lessons (93%) carry at least one cross-cluster diaspora tag**, far above the East Asian (~26%) and South Asian comparisons (per §11.2 and §11.3). The diaspora pairings split into three buckets: **3 lessons (20%) carry the explicit `African American` tag** (Short History, BHM black-eyed peas, Stewed BEP w/Plantains); **2 lessons (13%) carry `Caribbean`** (both Callaloo lessons, mirroring the §12.4 finding that Caribbean dishes intentionally surface West African diasporic origin); and **8 lessons (53%) carry `North American` as a diaspora-framing parent** — of those 8, 7 (47%) carry `North American` WITHOUT an explicit `African American` tag despite content that is unambiguously African American (Juneteenth lessons, BHM cornbread/Hoppin' John, Newly Freed Americans, Black-Eyed Pea Hummus); the 1 NA-with-explicit-AA case is the BHM black-eyed peas lesson which is fully five-tag-stacked. Only **1 lesson (7%)** — Nigeria / Red Bean Stew — is pure West African + African with no cross-cluster carry-along. **Country-tag adoption is sparse** — 2 of 15 lessons (13%) carry `Nigerian`; the remaining 13 stop at `West African` even when bodies name specific countries (e.g., Stewed BEP w/Plantains explicitly cites "Western Africa and Ghana"; no `Ghanaian` tag). **The headline Stage 2 audit signal is the African American under-tagging pattern** — 7-8 lessons read as African American-cluster content (Juneteenth, BHM, post-Civil-War sharecropping, Hoppin' John, Newly Freed Americans) but omit the `African American` diaspora-cluster tag the §12.2 read showed should be present. The flip-side (Seed & Date Balls' over-tag of `West African` for one body sentence about Carolina rice cultivation) is a single, easily-corrected case.

</details>

**Notes:** v3 canonical sub-region. Filter-UI tier `sub` proposed (15 lessons, comfortably above the ≥5 sub-tier bar; below the ≥40 `top` threshold). Curriculum team may promote to `top` given the cluster's curricular density and the 93% diaspora-pairing rate — `West African` carries an unusually high amount of pedagogical weight per the corpus pattern. Pre-handoff structural recommendation: keep parent = `african`. v3 baseline lists `Nigerian` (and `Ethiopian`) directly under `African` without a `West African` intermediate; the corpus's 2/2 Nigerian rows actually use `[Nigerian, West African, African]` — empirical support for re-parenting Nigerian under `west-african` (see §13.5 Notes). Stage 2 audit signals: (a) 7 Juneteenth / BHM lessons missing the `African American` tag; (b) 1 over-tagged lesson (Seed & Date Balls) — both flagged in the corpus read's "Audit signals" section preserved in the worksheet revision history. The two-Callaloo `Caribbean + West African` pattern is intentional and worth preserving as the template for diaspora-aware tagging (mirrors the §12.4 Caribbean finding).

---

#### 13.3. North African (2)

- **canonical_key:** `north-african`
- **surface_label:** `North African`
- **parent:** `african`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A lists only `West African` as a sub-region under `African`). Proposed `new` candidate per the §13 framing block decision #1 — fills the structural gap for North African country-specifics (Egyptian, Moroccan). 2 corpus lessons currently carry `North African`:

- `1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE` ("Cooking with Seeds: Ful Medames") — tagged `[Egyptian, North African, African]`. Body locates the ful medames dish in Egypt; structural three-level chain country → sub-region → cluster root.
- `1LyuuuF-GNwUfVIgxrR_3NQLCEbD59GkfFN145WeTk3Q` ("Moroccan Carrot Salad, Two Ways") — tagged `[Moroccan, North African, African]`. Body — "The flavors of this recipe come from a country called Morocco in Northern Africa. Show Morocco on the map." — explicitly anchors Morocco in North Africa with a map activity. Clean three-level chain.

**Multi-parent interaction:** the second Ful Medames lesson (`1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U`) — same dish, different tagging — tags `[Egyptian, Middle Eastern, African]` (no North African; uses Middle Eastern as the sub-region anchor). The corpus splits the Egyptian multi-parent question evenly at 1/1; see §9.2 + §13.6 Egyptian Notes. Filter-UI tier `sub` proposed despite low corpus frequency (2 lessons) — fills structural role of canonical home for country-specifics. Curriculum team may consider `internal`-tier if the new-sub-region status warrants a lower-visibility chip.

---

#### 13.4. East African (1)

- **canonical_key:** `east-african`
- **surface_label:** `East African`
- **parent:** `african`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. Proposed `new` candidate per the §13 framing block decision #1 — fills the structural gap for East African country-specifics (Kenyan, Ethiopian). 1 corpus lesson currently carries `East African`:

- `13wZWpVxLu5wuquuOugOCJf0Z9oRerMo9Af9pV1P5mAM` ("Sukuma Wiki") — tagged `[East African, African]`. Body keywords: "collards, tomatoes, East African, Kenya, Tanzania, Uganda, Swahili." Pan-East-African framing — the dish is multi-country regional (per body keywords), and the lesson deliberately stops at the sub-region rather than picking a single country. Reads as Cohort B (sub-region without country tag) in §11.2 / §11.3 style.

**Under-tagging signal:** the 2 Kenyan lessons (§13.7) and 1 Ethiopian lesson (§13.8) all skip `East African` and chain directly to `African`. If `East African` is canonicalized as a `new` sub-region, those 3 rows would benefit from `East African` backfill in Stage 2. Filter-UI tier `sub` proposed despite the 1-lesson frequency — same structural rationale as North African (§13.3): the canonical home for country-specifics earns the chip. Curriculum team may consider `internal`-tier given the corpus signal of 1; the case for `sub` rests on structural role rather than frequency. Stage 2 audit signal: Sri Lankan Curry-style body errors are absent here — the Sukuma Wiki body is geographically accurate.

---

#### 13.5. Nigerian (2)

- **canonical_key:** `nigerian`
- **surface_label:** `Nigerian`
- **parent:** `west-african`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) directly under `African` without a `West African` intermediate. Pre-handoff structural recommendation: re-parent under `west-african` — both corpus lessons (`1HWSlL8xio3QQkculHrVLA0EvEBSU4Th_tEZU4pXiD4Q` "Nigeria / Red Bean Stew" and `10VASBkheY2wLqM6A81N6yLjwY0lMGbcFcQ7MElBYqEY` "A Short History of African American Farmers and Cooks") tag the full chain `[Nigerian, West African, African]`, providing empirical support. Below the ≥3-lesson sub-tier bar per the cluster-bar convention (§11 cluster decision #2; mirrored in §12 cluster decision #4) — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status. No Stage 2 audit signal specific to Nigerian beyond the (cross-referenced) audit on `Stewed Black Eyed Peas w/Plantains` (body cites "Western Africa and Ghana" but tags only `[West African, African, African American, Americas]` — `Ghanaian` candidate; outside this entry's scope).

---

#### 13.6. Egyptian (2)

- **canonical_key:** `egyptian`
- **surface_label:** `Egyptian`
- **parent:** `north-african`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline (Appendix A's `African` cluster lists only `West African` sub-region + `Ethiopian` + `Nigerian` country-specifics; no Egyptian entry). Proposed `new` candidate. **Multi-parent — see §9.2.** Both Egyptian lessons in the corpus are ful medames but tag inconsistently: `1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE` ("Cooking with Seeds: Ful Medames") tags `[Egyptian, North African, African]` (African cluster route); `1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U` ("Ful Medames") tags `[Egyptian, Middle Eastern, African]` (Middle Eastern cluster route). The corpus splits 1/1 between the two cluster placements — neither convention has won. §9.2 pre-handoff recommendation: single-parent canonical home = `north-african` (geographic anchor + matches one of the two corpus rows); Middle Eastern flagged as multi-parent alternative for curriculum-team review per the §9.2 decision rule (culinary/cultural heritage tradition the lesson body invokes). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Curriculum team may promote to `sub`. Stage 2 follow-on: the two ful medames lessons should converge on a single tagging convention — whichever cluster wins, the other lesson should be re-tagged for consistency.

---

#### 13.7. Kenyan (2)

- **canonical_key:** `kenyan`
- **surface_label:** `Kenyan`
- **parent:** `east-african`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. Proposed `new` candidate. 2 corpus lessons: `18IhN8D7FYW-0rfXk-X3JpwNTTOILXblS` ("Earth Heroes") tags `[Kenyan, African, Brazilian, Latin American, Americas]` — multi-country comparison lesson where Kenya is one of several "earth heroes" countries; `1k7KqowpILVoRe-X0sOiOtcwJyC8_fJ17nwLu-DW5_r4` ("October Seed Saving") tags `[Kenyan, African]` — Wangari Maathai content. **Empirical signal: 0/2 Kenyan lessons currently carry `East African` as parallel tag** — both chain directly to `African`. The pre-handoff re-parent under `east-african` is structural (matches the §13 framing block decision #1) rather than corpus-supported; Stage 2 backfill would add `East African` to both rows. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Curriculum-team consideration: confirm `east-african` parent (vs. direct under `african`) and whether the §13.4 East African sub-region warrants Stage 2 backfill on existing Kenyan rows.

---

#### 13.8. Ethiopian (1)

- **canonical_key:** `ethiopian`
- **surface_label:** `Ethiopian`
- **parent:** `east-african`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) directly under `African` without an `East African` intermediate. Pre-handoff structural recommendation: re-parent under `east-african` (per §13 framing block decision #1). 1 corpus lesson: `1PuE6Pj23USsj3DLlcZsDf9l_N59EEMgWNEGnp1O_AVE` ("Misir Wot (Ethiopian Spiced Red Lentils)") tags `[Ethiopian, African]` — does NOT carry `East African`. Empirical pattern matches Kenyan (§13.7): direct chain from country to cluster root, skipping the geographic sub-region. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed. Curriculum team may promote to `sub` given v3 canonical status. Stage 2 backfill: add `East African` to this row if the new sub-region is adopted.

---

#### 13.9. Moroccan (1)

- **canonical_key:** `moroccan`
- **surface_label:** `Moroccan`
- **parent:** `north-african`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** NOT in v3 baseline. Proposed `new` candidate. **Multi-parent — see §9.2.** 1 corpus lesson: `1LyuuuF-GNwUfVIgxrR_3NQLCEbD59GkfFN145WeTk3Q` ("Moroccan Carrot Salad, Two Ways") tags `[Moroccan, North African, African]` — clean three-level chain. Body anchors Morocco in "Northern Africa" with an explicit map activity ("The flavors of this recipe come from a country called Morocco in Northern Africa. Show Morocco on the map."). **No Middle Eastern corpus signal** — unlike Egyptian (§13.6), where the corpus split evenly 1/1 between North African and Middle Eastern, Moroccan's sole corpus lesson cleanly anchors in North Africa. §9.2 pre-handoff recommendation: `north-african` is the clear primary parent; Middle Eastern alternative noted in §9.2 only for curricular-framing parity with Egyptian — corpus does not support it. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed.

---

#### 13.10. `african` (drift literal — 1 corpus appearance)

- **canonical_key:** `african`
- **surface_label:** `african`
- **parent:** `null`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `african`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row (`lesson_2d1dc9177095438787c8087cbf48f682` — "Food Origins Scavenger Hunt", tagged `[asian, americas, african, european]`, a multi-continent comparison lesson where all four cluster-root tags are kebab-case-lowercase — recognizable post-PR-update synthetic-`lesson_` ID). Same convention as §11.16-18 and §12.19-22. The `canonical_key` field matches the merge target's slug (both are kebab-case-lowercase by slug convention applied to the same underlying value — see §7 alias_map identity-shaped entries; recall the §7 parser invariant: `verdict in ('keep', 'new')` filter applies BEFORE keying canonical_key). This entry contributes `"african" → "african"` to the `alias_map` output (literal-to-canonical-key); verdict `merge` excludes it from the canonical vocabulary list.

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

#### 14.1. European (53)

- **canonical_key:** `european`
- **surface_label:** `European`
- **parent:** `null`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (53 active lessons; 3 genuinely pan-region multi-continent, 35 hierarchical-chain country/sub-region (22 Italian + 5 Mediterranean-only + 3 Ukrainian + 2 Spanish + 2 Irish + 1 Greek), 11 cross-cluster Americas carry-ins, 4 anomaly residuals)</summary>

- **`1IxkjYeOmhz2M_MC_Cbzj8vJMnLNVA5UX56CGi6E_Ap8` — "Food Photovoice Lesson Four: What the World Eats"** (Cohort A; tagged `[Asian, African, European, Americas]`): Body — "This week, we are going to look at food and families around the world. We will look at photos that show us a family that lives somewhere in the world and what this family eats in an entire week..." A four-continent comparison lesson with no sub-region/country children; `European` carries the entire continent alongside three other continent-level tags. Identical pan-region framing shape as the §13.1 African and §11.1 Asian Cohort A entries (which surface this same lesson).
- **`1qFG6f3CdmVqjeTJ_Xfv_y2cITHd6beOeCycIZKV73mE` — "Italy / Pesto"** (Cohort B Italian; tagged `[Italian, Mediterranean, European]`): Body — "Pesto was invented by Italians in the city of Genoa. Basil grew very well in their soil... People were eating pesto in the days of the Roman Empire... Italians never ate, grew or even saw tomatoes until after 1492. That's because tomatoes are from America, and no one in Europe had ever seen one until after Columbus first went there." A single-country lesson with the canonical three-level chain Italian → Mediterranean → European; `European` is the redundant root of the ancestry chain, not an independent signal. Direct companion shape to §11.1's Indian → South Asian → Asian and §13.1's Nigerian → West African → African. The Italian → Mediterranean → European chain dominates the cluster (22 of 53 lessons, 42%) — almost all are pesto / pizza / pasta / panzanella / tomato-sauce recipes carrying the identical three-tag stack.
- **`1i-jRBvEt7y6JAIeoiGDsX7J75sok1BV4BXZbD-vYlp4` — "Borscht"** (Cohort B Ukrainian/Russian; tagged `[Ukrainian, Russian, Eastern European, European]`): Body — "Explain that today we are making a soup that comes from Eastern Europe, countries like Russia and Ukraine. 'This pink soup is made with winter vegetables and is a great way to stay warm in the cold winter months!'... Solicit answers from students, many Russian/Ukrainian students will be excited to share!" The corpus's only `Ukrainian + Russian` dual-country lesson — a four-tag stack that names two specific countries plus the sub-region plus the cluster root, in body content that genuinely treats the dish as cross-country Eastern European. The clean three-level chain pattern carries through `Foods From Around the World: Ukraine` and `Varenyky` (both `[Ukrainian, Eastern European, European]`) but no other corpus lesson dual-codes Russian alongside.
- **`1OLfezTbT0voh-Km85VIkJiuOmhju7CiF9kGSKb8JnXs` — "Garlic Bread and Planting"** (Cohort B Mediterranean-only; tagged `[Mediterranean, European]`): Body content is fully horticultural — "Discuss Fall: What season are we in? What happens in the fall?... Using a visual aid of bulbs, show that bulbs are similar to seeds because they have a coat or skin on the outside to protect them... Garlic has also been used as medicine for thousands of years. It's antibacterial and can treat infections... Pull up the stick for the spot you want to plant / Make a hole about the depth of your pointer finger." No country anchor, no cultural framing — `Mediterranean + European` is functioning as a culinary-ingredient tag for garlic/olive-oil/bread foods rather than a geographic anchor. The 5 Mediterranean-only Cohort B lessons (Chickpea & Spinach Salad, Garlic Bread, Harvest & Baking Breadsticks, Rainbow Pizza, Welcome Back Chickpea Pizza) all share this shape: olive-oil + bread/vegetable/chickpea recipes that read as Italian-leaning in spirit but stop at the sub-region tag.
- **`16mykieJMT9T8b1iKHErAUFRhC-Sou_FckP-CzyJIOG4` — "BCCS Empanadas"** (Cohort C; tagged `[Latin American, Spanish, Mediterranean, Americas, European]`): Body — "Today we are going to be practicing working together while making a vegetarian empanada. Empanadas are a popular food in Latin America but have origins in Spain, there are many different ingredients that can be used for empanada filling." The five-tag stack threads the diaspora deliberately: `Latin American + Americas` is the dish's current cultural home (where empanadas are eaten today) and `Spanish + Mediterranean + European` is the dish's stated origin (where the food technique came from). The sibling lesson `Empanadas` (`1mAI2VtQntfWhUtIEKT1xP6Q028Hx-Jyqx_Xr-V2vWkI`) carries the identical five-tag stack with the identical "Latin America but have origins in Spain" body framing — the corpus's clearest pedagogically-explicit European-diaspora tagging. The same pattern surfaces in `Apple Pie` (`[North American, European]` with body reading "Take your shopping list and some walking shoes. Then catch a steamship bound for Europe... Find a farm deep in the countryside. Gather some superb semolina wheat... Then hop a train to France and locate a chicken") and in `September Salsa Toasts` (`[Mexican, Latin American, Americas, Italian, European]` — body cross-references Spanish salsa + Italian crostini etymology in the vocabulary block).
- **`1QLiWw08Qi5CSB6uMwwm27WDgMNG-LMhtqOu6z85VRkk` — "Food Preservation"** (Cohort D over-tag; tagged `[Japanese, Indian, Mediterranean, European, Asian]`): Body samples three civilizations' preservation methods in three paragraphs — "Sushi is a dish from Japan that uses a type of seaweed as a wrapper... cucumbers were originally made into pickles in India over 4,000 years ago... Ancient people in Greece and Rome used honey to make jelly with fruit." The five-tag stack faithfully captures the three-civilization survey, but the lesson is primarily a Japan/India-anchored read with one Greece/Rome sentence. `European + Mediterranean` is structurally legitimate (Greece + Rome → Mediterranean → European) but light on body evidence vs. the Asian sub-tags. Closest cohort analog is the §13.2 West African `Seed & Date Balls` over-tag where one sentence of body content drives a parallel tag chain. **`1_rHQ9aGoFQkgrM1ebgtqo5o6ZjJqXAoA` — "Green Room Party"** is the contrasting Cohort D anomaly (tagged `[European]` only): body content is three-cheese mashed potatoes prepared as the winning entry from a class math assignment about scaling recipes — no European country, no Eastern/Mediterranean sub-region, no culinary-tradition framing. Under-tagged with no clear right answer (mashed potatoes are pan-European at best; the cultural framing is "winning student math project," not Europe).

**Tagging pattern:** Cohort A (3/53, ~6%) is genuinely pan-Europe — world-comparison and around-the-world-foods unit lessons where `European` carries the whole continent alongside other continent-level tags with no specific country or sub-region to assign. This rate sits in the same low band as §13.1 African (3/41 ~7%) and §11.1 Asian (4/63 ~6%); §12.1 Americas is the outlier at ~28/170 ~16%. European's distinctive shape lives not in Cohort A but in its Cohort B/C distribution — the corpus's "foods around the world" lessons disproportionately reach for specific European countries (Ukraine, Italy, Spain, Ireland, Greece) rather than the cluster root, and the cluster's defining feature is heavy Italian-skewed hierarchical-parent ancestry (Cohort B 66%) plus cross-cluster Americas carry-in (Cohort C 21%), in contrast to §13.1 African where Cohort C diaspora-aware pairings dominate the cluster root at 61%. Cohort B (35/53, ~66%) uses `European` as the redundant root of a Country → Sub-region → `European` ancestry chain — the breakdown is **Italian → Mediterranean → European (22 lessons, 42% of cluster root)**, **Mediterranean → European only (5 lessons, 9%)**, **Ukrainian → Eastern European → European (3 lessons, 6%)**, **Spanish → Mediterranean → European (2 lessons, 4%)**, **Irish → European, no sub-region intermediate (2 lessons, 4%)**, **Greek → Mediterranean → European (1 lesson, 2%)**. The Italian-heavy skew is the cluster's defining feature: pesto / pizza / pasta / panzanella / tomato sauce / sourdough recipes account for ~40% of all European-tagged lessons. Mediterranean is the dominant sub-region pivot — 31 of the 35 Cohort B lessons (89%) carry `Mediterranean` as the intermediate, vs. only 3 with `Eastern European` and 2 (Ireland/Colcannon, Potato Leek Soup) with no sub-region intermediate at all. **`Irish` chains directly to `European` skipping any sub-region** — there is no `Western European` or `Northern European` canonical in the corpus, which means Irish-tagged lessons either get a two-level chain (Irish → European) while all other country-tagged Europeans get three levels (Country → Mediterranean/Eastern European → European), or `Irish` would need a sub-region parent introduced in canonicalization. Cohort C (11/53, ~21%) is the cross-cluster Americas carry-in: `European` paired with `Americas / Latin American / Mexican / North American` in lessons where the dish's European-origin and Americas-current-home are both tagged. The dominant shapes are **Empanada lessons (3) carrying the five-tag `[Latin American, Spanish, Mediterranean, Americas, European]` stack with explicit "origins in Spain, popular in Latin America" body framing**; **Apple Pie / Colonial Foods of New York (2) carrying `[North American, European]` framing the U.S. as a destination for European immigrant cuisine**; **Following a Recipe + Kitchen Cognates (2) carrying `[European, Latin American, Americas]` despite body content that is actually bilingual-cognate or hot-chocolate-recipe with no European origin claim — likely Stage 2 over-tag candidates**; and **Food Geography - Pizza + Food Processing Through History + September Salsa Toasts + Sandwich Swap (4) carrying mixed combinations of `Italian/Spanish/Mexican/Latin American/North American/European` for fusion or world-foods comparative lessons**. Cohort C's diaspora-aware pattern parallels §13.1 African Cohort C (61% of African-tagged lessons carry African American or Caribbean cross-tags) — the European-Americas pairing exists at lower density (~21%) because European-origin dishes in NYC food culture aren't pedagogically framed as "diaspora" the way West African / African American dishes are; they're framed as "origins in" Spain or Italy or Ireland. Cohort D (4/53, ~8%) flags audit signals: **Green Room Party** (under-tagged, only `European`, body is a class-math-project mashed-potato recipe with no continental anchor — flag for Stage 2 reviewer judgment of whether to keep `European`, demote to `internal`, or drop entirely); **Cellular Respiration + Microbiome** (over-tagged science lessons — body content is yeast-cell-respiration experiments and gut-microbiome biology; the European/Mediterranean tag rides on the recipe vehicle being garlic bread or tzatziki rather than on cultural-heritage content. The §13.1-style audit framing applies: cultural-heritage tags on science lessons where the recipe is incidental are plausible legacy auto-tagging artifacts); **Food Preservation** (over-tagged — body samples Japan + India + Greece/Rome but the `European + Mediterranean` tag stands on a single sentence about ancient Greek/Roman honey-jelly, parallel to §13.2 Seed & Date Balls). **5th Grade Food Cultures Unit Overview** (Cohort A) inherits the §13.1 audit flag: its tag stack includes `African` despite no African country in the body keywords (Ukraine, Uzbekistan, Pakistan, China, Mexico, Caribbean Islands, NYC) — `European` is the only one of the four continent-level tags substantiated by the body (Ukraine), so the Cohort A placement is defensible but the four-continent tag set is corpus-wide a legacy auto-tagging artifact. **Stage 2 audit signals to surface:** (a) Irish-tagged lessons skip the sub-region level entirely — does canonicalization require introducing `Northern European` or `Western European` to give Irish a parent? (b) Mediterranean-only Cohort B lessons (5) are pan-Mediterranean-ingredient lessons rather than country-anchored — keep the `Mediterranean` tag, drop to `European` only, or relabel as something like "Italian-influenced" if reviewer confirms? (c) Following a Recipe + Kitchen Cognates Cohort C cases over-tag `European` for a hot-chocolate recipe and a Spanish-cognate matching game (no European origin claim in either body) — review for tag-drop. (d) Cellular Respiration + Microbiome science-lesson over-tags parallel the §13.1 audit framing on `5th Grade Food Cultures` — review for Mediterranean+European tag-drop given the cultural-heritage signal rides entirely on the recipe vehicle. (e) Green Room Party single-tag `European` is the corpus's only `European`-without-sub-region row — under-tag flag.

</details>

**Notes:** Cluster root for the European cluster (fourth-largest cluster root in the corpus at 53 lessons, after Americas 170, Asian 63, and African 41). Cohort B's 35 lessons (~66%) make this the most hierarchical-chain-heavy cluster root in the corpus — by contrast with §13.1 African (Cohort C diaspora-heavy at ~61%) and §12.1 Americas (mixed pan-Americas + hierarchical-parent + sub-region cohorts). Cohort C's 11 lessons (~21%) is the cluster's cross-cluster signal — `European` paired with `Americas / Latin American / Mexican / North American` for European-origin dishes finding their U.S. cultural home (Apple Pie, Colonial Foods of New York, empanada lessons) — at lower density than §13.1 African Cohort C because European-origin dishes in NYC food culture aren't pedagogically framed as "diaspora" the way West African / African American dishes are. Filter-UI tier `top` is the cluster-root default and well-supported by frequency (53 lessons, comfortably above the ≥40 top-tier threshold). Stage 2 audit signals captured to register entries EUR-01 through EUR-14: Green Room Party single-`European` under-tag (EUR-01); science-lesson Mediterranean+European over-tags (Cellular Respiration + Microbiome, EUR-02); Cohort C over-tags without body-content European-origin (Following a Recipe + Kitchen Cognates, EUR-03); the open structural question of whether Irish should acquire a `Northern European` / `Western European` sub-region parent (EUR-14); the `5th Grade Food Cultures Unit Overview` heritage-array anomaly already tracked under AFR-07.

---

#### 14.2. Mediterranean (39)

- **canonical_key:** `mediterranean`
- **surface_label:** `Mediterranean`
- **parent:** `european`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (39 active lessons; 37 of 39 carry `European` as a parent — 95%; the 2 exceptions are `Street Vendors/Chicken Over Rice` and `Tastes Around the World`. Cohort breakdown: 23 Italian-anchored (B-Italian, 59%); 4 Spanish-anchored (B-Spanish, 10% — 2 actual Spain-cuisine + 2 Spanish-language-curriculum carry-ins to Latin American empanadas); 2 Greek (B-Greek, 5% — Tzatziki + Where Does Pizza Come From which is dual-tagged Italian + Greek); 8 pan-Mediterranean with no country (B-pan-Med, 21%); 4 cross-cluster anomalies where `Mediterranean` rides alongside non-European cluster tags (Food Preservation, Street Vendors, Tastes Around the World, Sandwich Swap — the last is also counted in B-pan-Med since it pairs hummus/pita with sunbutter/jelly across cluster lines without naming a country). Sum 23 + 4 + 2 + 8 + 4 = 41 reconciles to 39 via 2 acknowledged overlaps: Where Does Pizza Come From in both B-Italian and B-Greek; Sandwich Swap in both B-pan-Med and cross-cluster.)</summary>

- **`1qFG6f3CdmVqjeTJ_Xfv_y2cITHd6beOeCycIZKV73mE` — "Italy / Pesto"** (Cohort B-Italian, country-anchored; tagged `[Italian, Mediterranean, European]`): "Italy/Pesto (Foods around the World) Keywords: italy, pesto, sofrito… Pesto was invented by Italians in the city of Genoa. Basil grew very well in their soil, and they needed to figure out a way to eat it… Italians never ate, grew or even saw tomatoes until after 1492. That's because tomatoes are from America, and no one in Europe had ever seen one until after Columbus first went there." The cleanest example of the cohort's dominant tagging shape — country (Italian) → sub-region (Mediterranean) → cluster root (European), with `Mediterranean` operating purely as a redundant geographic-ancestry chain link, the way `East Asian` does for `Chinese` in §11.2 / §11.6. The body never invokes the Mediterranean as a region — it speaks of Italy, of Genoa, and of pre-Columbian Europe. `Mediterranean` is curatorial scaffolding, not pedagogical signal. The 22 other Italian-anchored lessons in the cohort (Pesto Pizza, Pasta, Panzanella, Tomato Sauce with Summer Vegetables, Sourdough & Fungi K + MS, Following Instructions [pizza], Friendship Pizza, Plant Part Pizza, Plant Part Pasta, Whole Wheat Pizza, Vegetable Whole Wheat Pasta, Primavera Pasta, Kale Pesto, Pea Shoot Pesto, Pesto Celebration, Peach Sorbet, King of Pizza, Alternative Proteins [Italian sausage], Food Geography-Pizza, Food Traditions and Pesto Pasta) all use the same three-tag chain with identical pizza-pasta-pesto curricular content. **Italian-anchored content is 23 of 39 lessons (59%)** — the Mediterranean tag is, in practice, the corpus's umbrella label for Italian cuisine.
- **`0B5ixnZghJTD6QWZIRUo1cWZ1NWs` — "Where Does Pizza Come From?"** (Cohort B-Italian + B-Greek, dual-country-anchored; tagged `[Italian, Mediterranean, European, Greek]`): "We think of lasagna as an Italian food, but lasagna may have a connection to ancient Greece. The ancient Greeks had a flat, thin bread, which they called lagana… The Italians learned about lagana, which may have inspired them to create a flat, thin noodle that we call lasagna… Just like lasagna, you may find that pizza has connections to several places around the world." The single lesson in the cohort where `Mediterranean` actually does work — the body's pedagogical move is the Greek-to-Italian transmission of a flatbread tradition, and the sub-region tag captures the cross-country regional throughline that neither `Italian` nor `Greek` alone would. The sibling lesson `Tzatziki (Mobile Education)` (tagged `[Greek, Mediterranean, European]`) is the only other Greek-anchored row and frames `tzatziki` cross-regionally — "This sauce is very popular in Greece as well as other countries in the Middle East. Many cultures around the world have similar yogurt sauces/dips, like Raita in India, Labneh in the Middle East, and Caesar/Ranch dressing in America." Cohort B-Greek is 2/39 (5%); both lessons explicitly draw cross-country regional connections in their bodies.
- **`1N7gRmGohK_fCtpiHemQTl1-Bpg-hwOF9` — "Tortilla Española"** (Cohort B-Spanish, Spain-cuisine; tagged `[Spanish, Mediterranean, European]`): "Tortilla Española. Students will get a chance to cook with eggs by making tortilla espanola… Students will use eggs from chickens in our garden, and will learn more about our chickens and the eggs that they produce." Genuine Spain-the-country cuisine — Spanish potato-and-egg tortilla, not Latin American tortilla flatbread. The duplicate row `1JEpJpbINYmbIN9j5W2dYrgIW6e0EqpalMa3kqm_53cI` ("Tortilla Espanola") carries the same three-tag chain. **Cohort B-Spanish splits 2 + 2:** 2 Spain-cuisine rows (the two Tortilla Española lessons) and 2 Latin American empanada lessons that ride into the Mediterranean cluster on the Spanish-language-curriculum / Spanish-colonial-origin signal — `1mAI2VtQntfWhUtIEKT1xP6Q028Hx-Jyqx_Xr-V2vWkI` ("Empanadas") and `16mykieJMT9T8b1iKHErAUFRhC-Sou_FckP-CzyJIOG4` ("BCCS Empanadas"), both tagged `[Latin American, Spanish, Mediterranean, Americas, European]` with body text "Empanadas are a popular food in Latin America but have origins in Spain." The empanada rows are the cohort's clearest case of `Spanish` operating as both a heritage-cluster country tag AND a Latin American multi-parent bridge — the `Mediterranean` tag rides along because of the `Spanish` country tag, not because the dish is Mediterranean cuisine.
- **`1dkvE8YLHr-ZOiBGrTGPl1jk4CbP5G67K` — "Chickpea & Spinach Garden Salad"** (Cohort B-pan-Med, no country; tagged `[Mediterranean, European]`): "Students will harvest spinach from the garden and make a chickpea spinach salad… Students will be able to experience a harvest-to-table recipe and the benefits of eating beans… Make dressing: Measure ½ tbsp lemon juice, mix with honey, olive oil, raisins, and spices." No country mentioned; the lesson tags `Mediterranean` on the strength of the ingredient signature (chickpeas + spinach + olive oil + lemon + honey + raisins — a generic Mediterranean-diet flavor profile). This shape repeats across the 8-lesson B-pan-Med cohort: `Garlic Bread and Planting` (garlic + bread, no country), `Harvest & Baking Lesson: Breadsticks` (rosemary + parmesan + bread, no country), `Welcome Back Chickpea Pizza` (chickpea-flour crust), `Rainbow Pizza` (vegetable pizza), `Microbiome` (yogurt + tzatziki — same recipe as the Greek-tagged Tzatziki but stripped of country tag), `Cellular Respiration` (yeast + garlic bread — science lesson where the bread is the experiment subject), and `Sandwich Swap` (hummus + pita as one option alongside sun butter + jelly). **The pan-Mediterranean cohort tags `Mediterranean` on ingredient-and-dish signature rather than on body content** — the lessons rarely or never invoke "the Mediterranean" as a place or culture. This is the cohort that makes `Mediterranean` distinctive from `Italian` — without it, all 8 of these lessons would have to either acquire a spurious country tag or drop their cluster signal entirely.
- **`1T1sgLmsWzEYkAXNvsX4NMitYf0Au9o0Y8QZEsXpcPSo` — "Street Vendors / Chicken Over Rice"** (Cohort C, cross-cluster anomaly; tagged `[Middle Eastern, Mediterranean, Americas]` — **no `European`**): "Students will learn about the history of mobile street vending, create a model food truck business, and prepare an ESYNYC take on NYC's classic halal cart 'chicken over rice'… cooking a halal-style dish… students can harvest/use parsley, garlic, and mushrooms." One of only **2 lessons in the cohort that omits the `European` parent** — the lesson treats the Mediterranean as a Middle-Eastern-adjacent geographic-cuisine signal (halal cart food, parsley/garlic/mushroom flavor base), not as a European sub-region. The sibling Cohort C anomaly `Tastes Around the World` (tagged `[Asian, Latin American, Mediterranean]` — also no `European`) uses Mediterranean as one term in a three-continent comparison; the body's gallery walk includes Dominican tostones, Japanese green tea, Ecuadorian pickled onions, Indian chai, Colombian arepas, and Ethiopian dates — no Mediterranean station appears in the body sample, so `Mediterranean` here looks like an auto-tag artifact rather than content-aligned signal. The other 2 cross-cluster carry-ins (`Food Preservation` tagged `[Japanese, Indian, Mediterranean, European, Asian]` — Mediterranean rides along on a pickled-cucumber + dried-seaweed multi-civilizational food-preservation survey; `Sandwich Swap` tagged `[Mediterranean, European, Americas]` — hummus-pita + sun-butter-jelly as parallel "many cultures have sandwiches" options) DO carry `European` and read as legitimate cohort tags via the hummus / pita / olive-oil ingredient signature.

**Tagging pattern:** Mediterranean is the corpus's third-most-populous sub-region (39 active lessons) and shows the **tightest cluster-root coupling rate in the worksheet so far**: 37 of 39 lessons (95%) carry `European` as a parent, well above any cross-cluster diaspora pairing in the African (§13.2) or Asian (§11.2) reads. The 2 European-omitted lessons (Street Vendors, Tastes Around the World) are both Cohort C anomalies where `Mediterranean` is the sole connection to the European cluster — both warrant Stage 2 reviewer attention since the omission may be either intentional (Middle-Eastern-adjacent framing for Street Vendors; gallery-walk auto-tagging for Tastes Around the World) or an error. **Italian dominance is the headline cohort signal: 23 of 39 lessons (59%) carry `Italian`** — pizza, pasta, pesto, panzanella, and sourdough collectively are 23/23 of the Italian-anchored content, and the `Mediterranean` tag functions as redundant ancestry-chain scaffolding (Italian → Mediterranean → European) the same way `East Asian` functions for Chinese-anchored content in §11.6. Cohort B-Spanish (4/39, 10%) splits structurally: 2 Spain-cuisine lessons (the two Tortilla Española rows) anchor cleanly; the other 2 are Latin American empanada lessons (BCCS Empanadas + Empanadas) that ride into the Mediterranean cluster on the Spanish-language-curriculum / Spanish-colonial-origin signal, carrying the multi-parent five-tag stack `[Latin American, Spanish, Mediterranean, Americas, European]`. These 2 empanada rows are the corpus's clearest case of `Spanish` operating as a heritage-cluster bridge between §12 Americas (where Latin American sits) and §14 European (where Spanish sits) — a structural parallel to the §13.2 West African / African American diaspora bridge pattern, though in the empanadas case the bridge is colonial-linguistic rather than diasporic. Cohort B-Greek (2/39, 5%) is small but pedagogically substantive — both Greek-tagged lessons (Tzatziki, Where Does Pizza Come From) explicitly invoke cross-country Mediterranean transmission in their body text, making Greek the cohort where `Mediterranean` does the most semantic work per row. **Cohort B-pan-Med (8/39, 21%) is the distinctive feature of this sub-region** — the bucket of country-less lessons where `Mediterranean` tags on ingredient-and-dish signature (chickpea, olive oil, garlic, parmesan, yogurt, hummus, pita, sourdough) rather than on body-text geography. Without this cohort, `Mediterranean` would be almost entirely redundant with `Italian` + `Spanish` + `Greek`; with it, the sub-region earns independent semantic weight as the home for ingredient-coded Mediterranean-diet content that doesn't name a country. **Stage 2 audit signals:** (a) the 2 European-omitted Cohort C lessons (Street Vendors, Tastes Around the World) — verify whether `European` should be backfilled or whether the omission is intentional; (b) Cohort C carry-ins — `Food Preservation` (Mediterranean tags on one pickle-paragraph aside about cucumbers from India + a sushi-from-Japan note) and `Tastes Around the World` (no Mediterranean station appears in the gallery-walk body) are over-tag candidates parallel to the §13.2 Seed & Date Balls / `West African` over-tag case; (c) the duplicate Tortilla Española rows (`1JEpJpbINYmbIN9j5W2dYrgIW6e0EqpalMa3kqm_53cI` + `1N7gRmGohK_fCtpiHemQTl1-Bpg-hwOF9`) are near-identical content with identical tagging — potential dedup pair; (d) Microbiome and Tzatziki are the same recipe (tzatziki dip) but Microbiome strips the `Greek` country tag while Tzatziki retains it — under-tagging signal worth Stage 2 reconciliation.

</details>

**Notes:** v3 canonical sub-region. **Filter-UI tier `top` proposed** — at 39 lessons, just below the ≥40 lessons-for-top threshold, but the cluster framing block decision #2 surfaces the question explicitly: Mediterranean (39) is functionally heavier than the cluster root (53) once Italian-anchored content (23) is factored in. Tier promotion to `top` aligns with curricular usage and gives the Italian-pizza-pasta-pesto curriculum a prominent filter chip; curriculum-team-likely call. Pre-handoff structural recommendation: keep parent = `european` (v3 alignment + 95% European-pairing rate; only 2 of 39 omit). The 8-lesson pan-Mediterranean cohort (no country tag) is the sub-region's distinctive feature — chickpea / olive-oil / garlic / yogurt / hummus / pita / sourdough recipes that need `Mediterranean` to carry their cultural-heritage signal without invoking a specific country. Stage 2 audit signals captured to register entries EUR-04 (Microbiome strips `Greek`), EUR-05 (Tortilla Española dedup pair), EUR-08 (Cohort C Mediterranean carry-along over-tags — Food Preservation, Street Vendors, Tastes Around the World, Sandwich Swap).

---

#### 14.3. Eastern European (3)

- **canonical_key:** `eastern-european`
- **surface_label:** `Eastern European`
- **parent:** `european`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical sub-region. 3 corpus lessons all carry the full `[Eastern European, European]` parent chain plus a country tag: `Borscht` (`1i-jRBvEt7y6JAIeoiGDsX7J75sok1BV4BXZbD-vYlp4`) tags `[Ukrainian, Russian, Eastern European, European]` — dual-country Eastern Europe pan-region lesson (body: "today we are making a soup that comes from Eastern Europe, countries like Russia and Ukraine… many Russian/Ukrainian students will be excited to share!"); `Foods From Around the World: Ukraine` (`1-AYK5D4_VEmu2ZWgFtaJItK_rn3hhoEK8YdPr_F0Ows`) tags `[Ukrainian, Eastern European, European]` — country-anchored Ukraine lesson with Ukrainian American NYC community framing; `Varenyky` (`1kk7iWzUOFQY786Ilr2MqaEiCmfv1EpUm`) tags `[Ukrainian, Eastern European, European]` — Ukrainian dumpling lesson. **Empirical signal: 3/3 Eastern European lessons carry `European`** (100% pairing rate) and 3/3 also carry `Ukrainian`; `Russian` appears only in the Borscht dual-tag. The canonical 3-level chain Ukrainian → Eastern European → European is consistently applied across all 3 rows. Filter-UI tier `sub` proposed (3 lessons is at the threshold per §6 conventions); curriculum team may consider `internal` given the low corpus frequency, but the sub-region serves a clear structural purpose as the canonical home for Ukrainian / Russian and (if `keep`) Polish (v3-corpus-absent — see §14.11). Stage 2 follow-on: if Polish receives a `keep` verdict, Eastern European sub-region acquires structural depth even without additional corpus rows. Worth confirming at handoff whether the v3 combined `Russian/Ukrainian` canonical should be split (see §14.6 Ukrainian, §14.9 Russian, EUR-12) — corpus already treats them as separate values per the Borscht dual-tag pattern.

---

#### 14.4. Italian (24)

- **canonical_key:** `italian`
- **surface_label:** `Italian`
- **parent:** `mediterranean`
- **filter_ui_tier:** `sub`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (24 active lessons tagged with `Italian`)</summary>

- **`1ms4TxvW79FtHz9GDfJO7H1ay6r8akuxPLSbO1qRvs_4` — "Panzanella":** "Students will practice making Italian bread salad... Start the day with Italian music playing and stop it as a cue for students to turn their voices off and be ready to listen in the opening circle... Our first special recipe is from the country It[aly]..." Part of a year-long "international food traditions" arc; the opening lesson explicitly anchors Italy as the cuisine.
- **`1qFG6f3CdmVqjeTJ_Xfv_y2cITHd6beOeCycIZKV73mE` — "Italy / Pesto":** Header `Italy/Pesto (Foods around the World)`. Pesto facts: "Pesto was invented by Italians in the city of Genoa. Basil grew very well in their soil... People were eating pesto in the days of the Roman Empire... Italians never ate, grew or even saw tomatoes until after 1492. That's because tomatoes are from America, and no one in Europe had ever seen one until after Columbus first went there." Rare Italian-region specificity (Genoa) and one of two lessons that name an Italian sub-region.
- **`1wFKZlUxu_aavugzZuK31_MHzonxS3wC1B1wRQ4c4Nbc` — "Pasta":** "This month we are making food from Italy. Who has eaten pasta/noodles/spaghetti before?... K-3: Making pasta with mushroom and tomato sauce... 4-5: Making pumpkin ravioli! Compare ravioli to other dumplings we have made." Materials include `Culture Box: photos, flag, scavenger hunt cards` — explicit Italy-country framing with a culture-box artifact.
- **`0BxEc0RZeYtCiOWhTRk5FRjBUc0k` — "Food Geography - Pizza":** "New York is very famous for its pizza, but before it could get here, it had a long journey... another place that is famous for pizza is Naples... the best pizza in Italy is from Naples, and the best pizza in the world is from Italy..." Heritage chain `[Italian, Mediterranean, European, North American, Americas]` — the `North American + Americas` extension reflects pizza-as-NYC-Italian-American-cuisine, NOT a pizza-from-North-America claim. Names Naples specifically (second Italian sub-region surfaced).
- **`0B5ixnZghJTD6QWZIRUo1cWZ1NWs` — "Where Does Pizza Come From?":** "We think of lasagna as an Italian food, but lasagna may have a connection to ancient Greece. The ancient Greeks had a flat, thin bread, which they called lagana. Show photo of lagana. The Italians learned about lagana, which may have inspired them to create a flat, thin noodle that we call lasagna... Italy also has an important place in pizza history." The `Greek` co-tag is intentional and body-supported — the lesson treats Italian pizza/lasagna as a tradition built on ancient Greek antecedents.

**Tagging pattern:** Tagging is mostly semantically consistent — every body-read lesson except two has explicit Italy framing (cuisine, vocabulary, geography, history, music cue, or culture-box artifact). The cluster is dominated by three dish families: **pizza** (~8 of 24: Food Geography Pizza, Where Does Pizza Come From, Friendship Pizza, King of Pizza, Pesto Pizza, Plant Part Pizza, Whole Wheat Pizza, plus pizza-via-vehicle lessons), **pesto** (6 of 24: Italy / Pesto, Pesto Celebration, Pesto Pizza, Kale Pesto, Pea Shoot Pesto, Food Traditions and Pesto Pasta, plus Friendship Pizza which uses pesto), and **pasta** (5: Pasta, Plant Part Pasta, Primavera Pasta, Vegetable Whole Wheat Pasta, Tomato Sauce with Summer Vegetables) — together these account for ~80% of the corpus. Remaining lessons are panzanella, peach sorbet, sourdough × 2, alternative proteins (sausage-and-peppers), and the cross-cluster carry-ins. Two looser tags surface: **`Following Instructions`** uses pizza-making as a generic recipe-following vehicle with no Italy framing in the body (Italian tag inherited from the dish, not the lesson focus), and **`September Salsa Toasts`** carries Italian only because the vocabulary section defines "Crostini; Italian for 'little toasts.'" — a one-word etymology tag on a Mexican-salsa lesson; clearly noise. The 6 pesto lessons all have body-confirmed Italian framing (Genoa origin, Italian "pestare" etymology, pesto facts cards) — pesto's density reflects ESYNYC's school-garden basil-harvest curriculum, not default-tag drift. Two lessons name Italian sub-regions (Genoa, Naples); none of the other ~22 lessons surface regional detail. **Italian-American signal is present but never named:** Food Geography Pizza explicitly bridges Naples-to-NYC pizza ("New York is very famous for its pizza... before it could get here, it had a long journey"), and the lesson's `North American` co-tag encodes this diaspora-cuisine angle without using the term "Italian-American." No corpus lesson uses "Italian-American" as a label, so it does not surface as a candidate `new` country-specific — the diaspora reading lives entirely in the cross-cluster heritage chain.

</details>

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) under `Mediterranean`. Heaviest country-specific in the corpus's European cluster (24 lessons; comparable to §11.6 Chinese at 15 and §12.5 Mexican at 38). Filter-UI tier `sub` proposed per §6 conventions (24 lessons sits comfortably above the ≥5 sub-tier bar and below the ≥40 `top` threshold); curriculum team may promote to `top` given the cluster's curricular density. Pre-handoff structural recommendation: keep parent = `mediterranean` (v3 alignment + 23/24 = 96% Mediterranean-pairing rate). **Italian-American signal is present but never explicitly named** — `Food Geography - Pizza` bridges "Naples to NYC" pizza-as-American-immigrant cuisine via the `North American + Americas` carry-along, but no corpus lesson uses "Italian-American" as a literal tag, so the candidate does not surface as a `new` country-specific in this round. Stage 2 audit signals captured to register entries EUR-06 (September Salsa Toasts Italian over-tag — one-word etymology on a Mexican salsa lesson) and EUR-07 (Italian recipe-vehicle over-tags — Following Instructions + Alternative Proteins as inherited-tag rather than primary cuisine).

---

#### 14.5. Spanish (5)

- **canonical_key:** `spanish`
- **surface_label:** `Spanish`
- **parent:** `mediterranean`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) under `Mediterranean`. **Multi-parent — see §9.2.** Corpus splits 2 + 3: the 2 Tortilla Española lessons (`1JEpJpbINYmbIN9j5W2dYrgIW6e0EqpalMa3kqm_53cI` + `1N7gRmGohK_fCtpiHemQTl1-Bpg-hwOF9`) tag pure Spain-the-country cuisine via the `[Spanish, Mediterranean, European]` chain (no Latin American); both bodies explicitly anchor "a recipe from a country in Europe called Spain." The 3 empanada lessons (BCCS Empanadas, Empanadas, Empanadas & Corn Salad) tag `Spanish` alongside Latin American + Americas as a colonial-origin bridge — body text "Empanadas are a popular food in Latin America but have origins in Spain." 4 of 5 Spanish-tagged lessons carry `Mediterranean` (only `Empanadas & Corn Salad` omits — it tags `[Latin American, Americas, Mexican, Spanish, European]`); all 5 carry `European`. §9.2 pre-handoff recommendation: single-parent canonical home = `mediterranean` (Spain-the-country anchor + v3 baseline placement + 4/5 corpus Mediterranean-pairing rate); Latin American flagged as multi-parent alternative for curriculum-team review per the §9.2 decision rule (culinary/cultural heritage tradition the lesson body invokes). Sits at the ≥5-lesson sub-tier threshold; `internal`-tier proposed as a conservative multi-parent bridge choice pending curriculum-team review (Latin American alternative flagged above). Curriculum team may promote to `sub` per the §6 threshold or retain the conservative call. Stage 2 audit signals captured to register entries EUR-11 (Spanish multi-parent disposition + AME-06 coordination — the 3 empanada lessons are reframed from over-tag to intentional colonial-origin bridge), EUR-13 (Empanadas & Corn Salad 5-tag stack reviewer validation — Mexican co-tag content-supported via Mexican-style corn salad ingredients but worth confirming the absence of Mediterranean is intentional), and EUR-05 (duplicate Tortilla Española rows shared with §14.2 Notes audit signal).

---

#### 14.6. Ukrainian (3)

- **canonical_key:** `ukrainian`
- **surface_label:** `Ukrainian`
- **parent:** `eastern-european`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) under `Eastern European` as part of the combined `Russian/Ukrainian` canonical entry. **Per §14 framing block decision #1: corpus already treats Ukrainian and Russian as separate values** (3 Ukrainian + 1 Russian as distinct heritage values, with only the Borscht row dual-tagging both); pre-handoff recommendation is `split` into separate canonicals, with Ukrainian retaining the Eastern European parent. 3 corpus lessons: `Borscht` tags `[Ukrainian, Russian, Eastern European, European]` (Eastern Europe pan-country lesson, "many Russian/Ukrainian students will be excited to share"); `Foods From Around the World: Ukraine` tags `[Ukrainian, Eastern European, European]` (country-anchored Ukraine lesson — body opens "today we are learning about Ukraine and the Ukrainian American community in New York City"); `Varenyky` (canonical row `1kk7iWzUOFQY786Ilr2MqaEiCmfv1EpUm`) tags `[Ukrainian, Eastern European, European]` (Ukrainian dumpling lesson, "Show the world map and ask students to identify Ukraine"). Empirical signal: 3/3 carry the full Ukrainian → Eastern European → European 3-level chain. Below the ≥3-lesson sub-tier bar (sits exactly at 3) — `internal`-tier proposed; curriculum team may promote to `sub` given v3 canonical status + the Ukrainian American NYC community framing in `Foods From Around the World: Ukraine`. Stage 2 follow-on captured to register entry EUR-12 (v3 `Russian/Ukrainian` combined canonical key needs explicit retirement — no corpus rows actually use the combined value; the corpus diverged from v3 by operating with separate Russian + Ukrainian values).

---

#### 14.7. Greek (2)

- **canonical_key:** `greek`
- **surface_label:** `Greek`
- **parent:** `mediterranean`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) under `Mediterranean`. 2 corpus lessons: `Tzatziki (Mobile Education)` (`1pcHIE8XKH0K4P0VkCFcpi-cAPiMqepljmPxYllnXYjU`) tags `[Greek, Mediterranean, European]` — body explicitly anchors "a traditional Greek yogurt and cucumber sauce" with explicit cross-regional comparisons ("This sauce is very popular in Greece as well as other countries in the Middle East. Many cultures around the world have similar yogurt sauces/dips, like Raita in India, Labneh in the Middle East, and Caesar/Ranch dressing in America."); `Where Does Pizza Come From?` (`0B5ixnZghJTD6QWZIRUo1cWZ1NWs`) tags `[Italian, Mediterranean, European, Greek]` — Greek lagana → Italian lasagna transmission lesson (body: "ancient Greeks had a flat, thin bread, which they called lagana. The Italians learned about lagana, which may have inspired them to create a flat, thin noodle that we call lasagna"); the corpus's only Italian + Greek dual-country row. Both bodies actively invoke cross-country Mediterranean transmission — Greek is the only Mediterranean country-specific where the sub-region label does meaningful semantic work in the body content (per §14.2 `<details>` Tagging pattern). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may promote to `sub` given v3 canonical status + the pedagogically-substantive cross-Mediterranean transmission framing. Stage 2 audit signal captured to register entry EUR-04 (Microbiome lesson uses the same tzatziki recipe but strips the `Greek` country tag — under-tagging signal).

---

#### 14.8. Irish (2)

- **canonical_key:** `irish`
- **surface_label:** `Irish`
- **parent:** `european`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** **NOT in v3 baseline** (Appendix A's `European` cluster lists `Eastern European` + `Russian/Ukrainian` + `Polish` + `Mediterranean` + `Italian` + `Spanish` + `Greek` + `French`; no Irish entry). Proposed `new` candidate per §14 framing block decision #4. 2 corpus lessons both anchor cleanly to Ireland-the-country: `Ireland / Colcannon` (`1fD6vZTk364ZQ0tfBHJAHpW-itfX28me6_VJ-w1xFr1Y`) tags `[Irish, European]` with body "Intro to Ireland - show on map, discuss culture, highlight traditional foods" + Gaelic etymology ("cal ceannann," "white-headed cabbage") + Irish Potato Famine context; `Potato Leek Soup` (`18LGHGw5bid1uFmapJbJlSUlwX4-h7oUGNoZ-nu47egM`) tags `[Irish, European]` (November lesson — potato + leek + cabbage variation that fits the colcannon pattern). **Both Irish lessons skip the sub-region level** — they chain Irish → European directly (depth 2), not Irish → sub-region → European (depth 3) like Italian/Spanish/Greek (via Mediterranean) or Ukrainian/Russian (via Eastern European). No v3 sub-region (`Western European` / `Northern European`) exists for Ireland, and no other corpus country-specifics cluster there (French is v3-corpus-absent — see §14.10), so Irish acts as the only direct-under-European country-specific. Pre-handoff structural recommendation: keep parent = `european` (skipping the absent sub-region level is correct per §2 hierarchy-rules depth-flexibility — a 2-level chain is valid when the cluster shape doesn't call for a sub-region). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may consider creating a new `Western European` or `Northern European` sub-region if the corpus is expected to grow to include additional UK / Nordic country-specifics. Stage 2 audit signal captured to register entry EUR-14 (depth-2-vs-depth-3 asymmetry between Irish and Italian/Spanish/Greek/Ukrainian/Russian — structurally legitimate but worth surfacing at canonicalization).

---

#### 14.9. Russian (1)

- **canonical_key:** `russian`
- **surface_label:** `Russian`
- **parent:** `eastern-european`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, listed in v3 baseline (Appendix A) under `Eastern European` as part of the combined `Russian/Ukrainian` canonical entry. **Per §14 framing block decision #1: pre-handoff recommendation is `split` into separate canonicals, with Russian retaining the Eastern European parent.** 1 corpus lesson: `Borscht` (`1i-jRBvEt7y6JAIeoiGDsX7J75sok1BV4BXZbD-vYlp4`) tags `[Ukrainian, Russian, Eastern European, European]` — the corpus's only Russian-tagged row, and it dual-tags both Ukrainian + Russian (body: "today we are making a soup that comes from Eastern Europe, countries like Russia and Ukraine… many Russian/Ukrainian students will be excited to share!"). Empirical signal: 1/1 Russian carries the full Russian → Eastern European → European chain plus the additional Ukrainian co-tag (Borscht is treated as a genuinely cross-country Eastern Europe lesson). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may consider `keep` for future tagging given (a) v3 canonical status, (b) distinct culinary tradition from Ukrainian per §14 framing decision #1's geopolitical + culinary-distinctness rationale, (c) the single corpus row's dual-country tag is a legitimate Eastern Europe pan-country lesson rather than a tagging error. Stage 2 follow-on captured to register entry EUR-12 (same as §14.6 Ukrainian — v3 `Russian/Ukrainian` combined canonical key retirement; corpus already operates with the split).

---

#### 14.10. French (0)

- **canonical_key:** `french`
- **surface_label:** `French`
- **parent:** `european`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = European per v3 baseline (Appendix A — French is listed directly under `European`, **NOT** under `Mediterranean`, despite France having a Mediterranean coastline). **0 corpus lessons** — this is a v3-baseline-but-corpus-absent value (per §14 framing block decision #3). Verdict options: `keep` for future tagging (French cuisine is a curricular staple and the corpus may grow to include canonical French dishes like quiche, ratatouille, French toast); `drop` for absence of corpus signal; or `internal`-tier-only as a placeholder. Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. **Note on convention:** matches the §12.18 Dominican (0) precedent — v3-canonical-corpus-absent values get per-value entries rather than being handled only at cluster-decision-summary level (a divergence from §11 Asian's convention for Filipino/Thai/Bengali). Curriculum-team consideration: v3's placement of French directly under `European` (skipping `Mediterranean`) implies French cuisine is treated as broader-than-Mediterranean — covers Northern French (Brittany, Normandy, Burgundy) plus Mediterranean French (Provence, Côte d'Azur). If `keep`, retain the v3 placement under European direct (not under Mediterranean). Curriculum-team verdict here also informs how to handle the parallel Polish v3-corpus-absent value (§14.11).

---

#### 14.11. Polish (0)

- **canonical_key:** `polish`
- **surface_label:** `Polish`
- **parent:** `eastern-european`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Eastern European per v3 baseline (Appendix A — listed under `Eastern European` alongside the combined `Russian/Ukrainian`). **0 corpus lessons** — this is a v3-baseline-but-corpus-absent value (per §14 framing block decision #3). Verdict options: `keep` for future tagging (Polish cuisine — pierogi, kielbasa, bigos — has substantial NYC community presence and the corpus may grow); `drop` for absence of corpus signal; or `internal`-tier-only as a placeholder. Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. Matches the §12.18 Dominican (0) precedent for v3-canonical-corpus-absent values (per §14.10 French Notes convention). Curriculum-team consideration: if `keep` for Polish + Ukrainian + Russian, the `Eastern European` sub-region acquires structural depth and canonicalization treats it as a depth-3 sub-region; if `drop` for Polish, Eastern European still works at depth 3 for the canonically-active Ukrainian + Russian under it (per §14.3 Notes).

---

#### 14.12. `european` (drift literal — 1 corpus appearance)

- **canonical_key:** `european`
- **surface_label:** `european`
- **parent:** `null`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `european`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row (`lesson_2d1dc9177095438787c8087cbf48f682` — "Food Origins Scavenger Hunt", tagged `[asian, americas, african, european]`, the corpus's all-kebab-case multi-continent comparison row — recognizable post-PR-update synthetic-`lesson_` ID). Same convention as §13.10 `african` drift and §11.16-18 / §12.19-22 patterns. The `canonical_key` field matches the merge target's slug (both are kebab-case-lowercase by slug convention applied to the same underlying value — see §7 alias_map identity-shaped entries; recall the §7 parser invariant: `verdict in ('keep', 'new')` filter applies BEFORE keying canonical_key). This entry contributes `"european" → "european"` to the `alias_map` output (literal-to-canonical-key); verdict `merge` excludes it from the canonical vocabulary list.

---

#### 14.13. `mediterranean` (drift literal — 2 corpus appearances)

- **canonical_key:** `mediterranean`
- **surface_label:** `mediterranean`
- **parent:** `european`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `mediterranean`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 2 corpus rows (both synthetic-`lesson_` IDs): `lesson_432a153ed122455da80567b41996b8dc` ("Imperfect Foods") tags `[mediterranean]` only — single-tag drift on an ugly-produce + pasta-tomato-basil cooking lesson with Mediterranean ingredient signature; `lesson_730a61c3737c498fb82cb1c074d1d5b1` ("Pasta Party") tags `[mediterranean]` only — pici-pasta party lesson with body content "Pici comes from Tuscany, in Italy" (genuinely Italian content tagged with lowercase kebab Mediterranean instead of the full canonical Italian → Mediterranean → European chain). Same convention as §13.10 `african` drift. Contributes `"mediterranean" → "mediterranean"` to `alias_map`. Stage 2 audit signal captured to register entry EUR-09 (Pasta Party body explicitly anchors Italy/Tuscany — should pick up `Italian + Mediterranean + European` canonical chain in Stage 2 re-tag).

---

#### 14.14. `eastern-european` (drift literal — 1 corpus appearance)

- **canonical_key:** `eastern-european`
- **surface_label:** `eastern-european`
- **parent:** `european`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `eastern-european`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row (`lesson_4d119999d8d54a828d9cb217f6d98613` — "Varenyky", synthetic-`lesson_` ID). This row has near-identical body content to the canonical `Varenyky` row (`1kk7iWzUOFQY786Ilr2MqaEiCmfv1EpUm` — see §14.6 Ukrainian Notes) but tags only the lowercase kebab `eastern-european` rather than the full canonical 3-level chain `[Ukrainian, Eastern European, European]`. Same convention as §13.10 `african` drift. Contributes `"eastern-european" → "eastern-european"` to `alias_map`. Stage 2 audit signal captured to register entry EUR-10 (synthetic-ID Varenyky drift is a likely duplicate-pair candidate with canonical Varenyky row — body content + title are near-identical; only heritage tagging shape differs).

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

#### 15.1. Middle Eastern (23)

- **canonical_key:** `middle-eastern`
- **surface_label:** `Middle Eastern`
- **parent:** `null`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (23 active lessons; 2 cluster-root-only Cohort A, 19 hierarchical-chain Cohort B [13 Levantine-only + 3 Yemeni + 1 Persian + 1 Israeli + 1 Palestinian three-level chain], 2 cross-cluster Cohort C)</summary>

- **`1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8` — "Introduction to Salad Project"** (Cohort A; tagged `[Middle Eastern]`): Body — "In the upper grades gardening class is a little bit different… in the fifth grade you will start a class project. In the fifth grade the project you will be working on is a salad project!… In kitchen class you'll be making a salad from the middle east, it's called fattoush, you're going to make a salad that uses plants that are available right now such as tomatoes and cucumbers." The `Middle Eastern` tag rides on a single forward-looking sentence about a future fattoush kitchen-class; the lesson body itself is a 5th-grade garden-orientation scavenger-hunt with kale/fruit/potato-salad tastings and no other Middle Eastern framing. Cohort A here is structurally an under-tag candidate: if `Middle Eastern` is right, the canonical sibling `Fattoush` lesson (`[Levantine, Middle Eastern]`) suggests `Levantine` should also be present; if not, the tag is recipe-vehicle drift on a single mention.
- **`13Zcy3oAPJxwEH8e5ZN43C83sb3kzTzr8I_X_XLr4dLM` — "Plant Based Eating"** (Cohort A; tagged `[Middle Eastern]`): Body — "Students will learn about different types of diets with a focus on plant based eating… Carnivore: eats meat. Herbivore: eats plants. Omnivore: eats both meat and plants… Today we are going to make a recipe that is completely plant based." The body never mentions the Middle East — the `Middle Eastern` tag rides entirely on the appendix listing "Hummus" + "Chips" as the day's task cards. Structurally parallel to the §14.1 European Cohort D `Cellular Respiration / Microbiome` over-tag pattern where the cultural-heritage tag clings to the recipe vehicle rather than to body content; the §13.1 African `5th Grade Food Cultures` heritage-array anomaly is the nearest analog. Strong Stage 2 audit candidate for tag-drop.
- **`1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI` — "Fattoush"** (Cohort B Levantine; tagged `[Levantine, Middle Eastern]`): Body — "Today we are making food from a region called the Middle East. It includes countries like Syria, Lebanon, Jordan, Israel and Palestine. (raise hands if you know anyone from here)… For example, today we will make Fattoush. It is a bread salad with fresh summer vegetables from our garden like cucumbers and tomatoes." The canonical two-level chain Levantine → Middle Eastern, anchored in a body that explicitly names 5 Levantine countries inside the regional framing. Companion shape to §11.1's Indian → South Asian → Asian and §13.1's Nigerian → West African → African except at depth 2 instead of depth 3 (no country anchor surfaces). The Levantine-only Cohort B accounts for 13 of 19 hierarchical-chain lessons (~68%) — hummus / fattoush / shepherd salad / za'atar / dolmas-for-Eid / chilled cucumber and tahini soup / herb hummus / Ma'amoul Cookies / Bean Dips / Recipe Reading / Celebrating Eid all carry this same depth-2 chain. The cluster's defining feature.
- **`1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` — "Hummus and Pita"** (Cohort B Palestinian three-level chain; tagged `[Palestinian, Levantine, Middle Eastern]`): Body — "Students will read a story by a Palestinian author about olive trees in Palestine and how hummus is an important food in Palestinian culture since the main ingredients (chickpeas, olive oil, sesame) are native plants in that region and indigenous Palestinian people have stewarded this land… Emphasize that hummus is a food enjoyed in many different countries in the Middle East, like Lebanon, Saudi Arabia, Iran, Iraq, Egypt, and more." The corpus's only depth-3 Palestinian chain — country → sub-region → cluster-root — and the body matches the depth (Palestinian-author book, indigenous-stewardship framing, then explicit "enjoyed in many Middle Eastern countries" widening). The sibling `Chilled Cucumber and Tahini Soup` (`[Levantine, Middle Eastern]`) frames itself around "Palestinian culture" + "Palestinian cooking" in the body but stops at the Levantine sub-region — a country-tag depth asymmetry parallel to the §13.1 Kenyan under-tag pattern (Wangari Maathai 4th/5th carries only `African` despite Kenyan body content).
- **`1ulDJYHIEKOqidEYl9gQ2xsBFEVhI2alJ` — "Yemeni Fasoulia"** (Cohort B Yemeni direct-under-ME; tagged `[Yemeni, Middle Eastern]`): Body — "Students will learn about Yemen and make fasoulia, a Yemeni breakfast, and khobz, Yemeni flatbread… Show Yemen on the world map. Depending on grade level, give a brief description of the situation in Yemen." Anchored to a single named country with explicit map-locate + situation-context framing. All three Yemeni lessons (Fasoulia, Shakshuka, Zahawig — also `Kuku Sabzi` for Persian and `Breakfast around the World / Israeli Salad` for Israeli) skip any sub-region intermediate and tag depth 2: Country → Middle Eastern. Structurally parallel to the §14.1 European `Irish` → `European` depth-2 asymmetry (no `Western European` / `Northern European` canonical) — Yemeni, Persian, and Israeli have no canonical sub-region parent under `Middle Eastern` in the corpus (no `Arabian Peninsula`, no `Persian Gulf`, no `Iranian`), so their hierarchical chains naturally truncate at depth 2.
- **`1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U` — "Ful Medames"** (Cohort C cross-cluster Egyptian; tagged `[Egyptian, Middle Eastern, African]`): Body — "This month we are making food from Egypt and we will be making a breakfast that people eat in Egypt all the time called ful medames. Locate where Egypt is on the map and show the class. This recipe is made with fava beans." The tag stack is structurally distinctive: Egyptian → Middle Eastern → African bypasses the `North African` sub-region entirely. **The sibling lesson** `Cooking with Seeds: Ful Medames` (`1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE`) routes Egyptian differently as `[Egyptian, North African, African]` — the canonical three-level chain per the Session 66 §13.6 Egyptian resolution that placed Egyptian primarily under North African. Two corpus rows about identical content (Egyptian ful medames) carry incompatible parent chains: one bypasses North African and dual-cluster-tags with Middle Eastern; the other follows the canonical North African chain. Stage 2 audit signal.
- **`1T1sgLmsWzEYkAXNvsX4NMitYf0Au9o0Y8QZEsXpcPSo` — "Street Vendors/'Chicken' Over Rice"** (Cohort C three-cluster; tagged `[Middle Eastern, Mediterranean, Americas]`): Body — "Students will learn about the history of mobile street vending, create a model food truck business, and prepare an ESYNYC take on NYC's classic halal cart 'chicken over rice'… This lesson engages with various cultural models: on a local scale in reference to the diverse street vending options readily available to us in our city, in the historical sense in regards to how independent food vending allowed for many immigrants to settle in the U.S., and by cooking a halal-style dish." A three-cluster tag stack threading the diaspora (Middle Eastern + European-via-Mediterranean + Americas) for an NYC halal-cart immigrant-foodways lesson — closest in shape to the §14.1 European empanada lessons that thread Latin American + Spanish + Mediterranean + Americas + European. **A duplicate row** (`lesson_e8fa030e63bf4a9cb13b95448a3450c0`) for the same title carries the completely different array `[south-asian, levantine]` in kebab-case canonical form, with no overlap to the canonical row's array. Two corpus rows about identical body content with both incompatible clusters AND incompatible casing. Stage 2 audit signal.

**Tagging pattern:** The Middle Eastern cluster root's distinctive feature is its overwhelmingly hierarchical-chain shape — Cohort B accounts for 19 of 23 lessons (~83%), substantially higher than §14.1 European (66%), §11.1 Asian (~94% but at much larger N), §12.1 Americas (~84%), or §13.1 African (~22% Cohort B; diaspora-dominant instead). Within Cohort B, Levantine sub-region dominance is the cluster's defining feature: **Levantine → Middle Eastern (13 lessons, 57% of cluster root)** anchors the Cohort B distribution, with the 13 lessons concentrated in hummus / fattoush / shepherd salad / za'atar / dolmas-for-Eid / Ma'amoul / Bean Dips / Recipe Reading / Celebrating Eid / Chilled Cucumber and Tahini Soup / Herb Hummus / Middle Eastern Salad — Fattoush — the cluster's curricular vocabulary is essentially Levantine. **Yemeni → Middle Eastern (3 lessons, 13%)** is depth-2 direct-under-ME, parallel to §14.1's `Irish → European` depth-2 asymmetry — no `Arabian Peninsula` canonical exists in the corpus to give Yemeni a sub-region parent. **Persian (1) and Israeli (1)** are similar depth-2 direct-under-ME placements (no `Iranian` or `Levantine`-Israeli sub-region intermediate — `Israeli` arguably could chain through `Levantine` per the §11 cluster decisions on country/sub-region routing, but currently doesn't, and `Persian` would need a new `Iranian` or `Persian Gulf` sub-region canonical to acquire one). The §9.2 Israeli multi-parent disposition is the relevant cross-cluster question. **Palestinian → Levantine → Middle Eastern (1)** is the only depth-3 chain in the cluster, surfacing the open question of whether more body-content Palestinian lessons should be country-tagged (the `Chilled Cucumber and Tahini Soup` body content explicitly anchors "Palestinian culture" but the lesson stops at the Levantine sub-region tag). Cohort A is tied for the lowest of any cluster root in the corpus at 8.7% (2 lessons) — both rows are under-tag candidates rather than genuine pan-Middle-East comparison lessons: `Introduction to Salad Project` rides the `Middle Eastern` tag on a single forward-looking sentence about a future fattoush lesson; `Plant Based Eating` rides it entirely on the recipe vehicle being hummus. Neither matches the Cohort A pattern from larger clusters (world-comparison lessons that explicitly tag 2+ continents like §14.1's `Food Photovoice` or §13.1's pan-Africa comparisons). Cohort C is also tied for the lowest of any cluster root at 8.7% — Middle Eastern cuisine doesn't carry-along across clusters the way African (61% diaspora Cohort C) and European (21% Americas cross-cluster) cuisines do. The two Cohort C lessons split into very different shapes: `Ful Medames` is a cluster-routing inconsistency (Egyptian dual-routed through ME + African, bypassing North African), and `Street Vendors` is an NYC-immigrant-foodways three-cluster framing (parallel to the European empanada-pattern). **Stage 2 audit signals to surface:** (ME-01) Egyptian routing inconsistency between the two Ful Medames corpus rows — canonical-row `[Egyptian, Middle Eastern, African]` vs sibling `[Egyptian, North African, African]` — cross-reference §13.6 Session 66 Egyptian resolution which placed Egyptian primarily under North African (duplicate of AFR-05 surfaced from Middle Eastern perspective); (ME-02) Street Vendors duplicate-row cross-cluster + casing disagreement — canonical `[Middle Eastern, Mediterranean, Americas]` vs drift row `[south-asian, levantine]`; (ME-03) Introduction to Salad Project Cohort A under-tag question — `Middle Eastern` rides on one forward-looking sentence about future fattoush, candidate for either Levantine backfill or tag-drop; (ME-04) Plant Based Eating Cohort A recipe-vehicle over-tag — body never mentions ME, tag rides entirely on hummus task card, parallel to §14.1 EUR-02 Cellular Respiration / Microbiome science-lesson recipe-vehicle pattern; (ME-05) Yemeni / Persian / Israeli depth-2 asymmetry — three sub-region-less direct-under-ME placements raise the same canonicalization question as §14.1 EUR-14 Irish-direct-under-European: do canonical schema additions like `Arabian Peninsula`, `Iranian`, or routing-Israeli-through-Levantine need to be introduced, and what is the §9.2 Israeli multi-parent disposition for this cluster.

</details>

**Notes:** Cluster root for the Middle Eastern cluster — the 5th and smallest regional cluster root in the corpus at 23 lessons (after Americas 170, Asian 63, European 53, African 41). Cohort B's 19 lessons (~83%) make this the most hierarchical-chain-heavy cluster root in the corpus, surpassing European's ~66% and rivaling the depth-2 Asian and depth-2 Americas chain rates at much smaller N. Cohort A's 2 lessons (~9%) and Cohort C's 2 lessons (~9%) are tied for the lowest of any cluster root, and both Cohort A rows are likely under-tag candidates rather than genuine pan-Middle-East framings (no world-comparison or multi-country-survey shape surfaces in the cluster at all — distinct from §13.1 African and §14.1 European Cohort A patterns). Levantine sub-region dominance (13 of 19 Cohort B = 68%) is the cluster's defining feature; the cluster's curricular vocabulary is essentially Levantine, with Yemeni / Persian / Israeli depth-2 direct-under-ME placements rounding out the remaining 5 hierarchical lessons plus the one Palestinian depth-3 chain. Filter-UI tier `top` is the cluster-root default and is supported by 23 lessons being substantially above any sub-tier threshold while still being the smallest cluster root — even at this floor, the cluster root carries enough corpus mass to justify top-tier surfacing for parent-chain selection behavior. Stage 2 audit signals captured to register entries ME-01 through ME-05: Egyptian routing inconsistency between the two Ful Medames rows (ME-01, duplicate of AFR-05); Street Vendors duplicate-row cross-cluster + casing disagreement (ME-02); Introduction to Salad Project under-tag question (ME-03); Plant Based Eating recipe-vehicle over-tag (ME-04); Yemeni / Persian / Israeli depth-2 sub-region asymmetry raising the canonicalization question parallel to EUR-14 Irish-direct-under-European (ME-05).

---

#### 15.2. Levantine (14)

- **canonical_key:** `levantine`
- **surface_label:** `Levantine`
- **parent:** `middle-eastern`
- **filter_ui_tier:** `top`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

<details><summary>Corpus evidence (14 active lessons; **100% Middle Eastern pairing — 14/14 lessons carry `Middle Eastern` as parent, the cleanest hierarchical signal of any sub-region in the worksheet**. Cohort breakdown: 6 hummus-anchored (43% — Bean Dips, Hummus, Hummus and Pita, Harvesting Carrots/Hummus, Herb Hummus, Recipe Reading); 2 Fattoush-anchored (14% — Fattoush, Middle Eastern Salad - Fattoush); 3 Eid-specific (21% — Celebrating Eid, Dolmas for Eid, Ma'amoul Cookies for Eid); 3 standalone Levantine dishes (21% — Chilled Cucumber and Tahini Soup, Shepherd Salad, Za'atar with Roasted Potatoes). Country-tag pattern: 13 of 14 lessons (93%) tag `Levantine + Middle Eastern` ONLY with no country-specific tag; only `Hummus and Pita` (1 lesson) carries the 3-level chain `Palestinian → Levantine → Middle Eastern` — the cluster's only 3-level row. Body-text country naming is more frequent than tag-level naming: 5 lessons name specific Levantine countries in their bodies (Fattoush names "Syria, Lebanon, Jordan, Israel and Palestine"; Chilled Cucumber Soup names Palestine; Hummus and Pita names Palestine + Lebanon + Saudi Arabia + Iran + Iraq + Egypt; Middle Eastern Salad - Fattoush names "Iraq, Yemen, Lebanon, and Iran"; Za'atar names Egypt) but only Hummus and Pita carries that signal into the heritage tags. 0 cross-cluster anomalies — no Levantine lesson omits the `Middle Eastern` parent or pairs with a non-Middle-Eastern cluster.)</summary>

- **`1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI` — "Fattoush"** (Cohort B-Fattoush, country-less; tagged `[Levantine, Middle Eastern]`): Body — "Today we are making food from a region called the Middle East. It includes countries like Syria, Lebanon, Jordan, Israel and Palestine. (raise hands if you know anyone from here)… Recipes from here have changed over time with people moving to and from the Middle East and with trade… today we will make Fattoush. It is a bread salad with fresh summer vegetables from our garden like cucumbers and tomatoes." The clearest case of the sub-region's dominant tagging shape — the body explicitly names the five Levantine-cluster countries, the lesson uses a Lebanese-Syrian dish (Fattoush) as its vehicle, yet the heritage tags stop at `Levantine + Middle Eastern` without invoking any country-specific. This is the corpus's signature country-less B-Levantine cohort pattern — the structural parallel to §14.2 Mediterranean's 8-lesson B-pan-Med cohort, but at higher density (13/14 = 93% vs. Mediterranean's 8/39 = 21%). The Materials list includes "Culture Box: photos, currency, spices, magnifying glass" for "Middle Eastern Countries" — pluralized, no single country anchored.
- **`1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` — "Hummus and Pita"** (Cohort A, country-anchored; tagged `[Palestinian, Levantine, Middle Eastern]` — **the cluster's only 3-level chain**): Body — "We are going to be learning about foods that are native to Palestine and important to Palestinian culture and tradition (olives/olive oil, chickpeas)… Emphasize that hummus is a food enjoyed in many different countries in the Middle East, like Lebanon, Saudi Arabia, Iran, Iraq, Egypt, and more. 'Today we are going to focus on one country that eats hummus and grows the plants needed to make hummus - Palestine!'… Both Palestinians and Israelis feel ancestral connections to the same land… However, Israel is forcefully occupying the land." The only Levantine-cohort lesson where the heritage tags carry country-level specificity — the body's pedagogical move is explicitly Palestinian-cultural and explicitly anti-occupation framing, and the heritage chain reflects that with the full Palestinian → Levantine → Middle Eastern stack. This single lesson demonstrates that the country-level layer of the v3 hierarchy *exists* — but the 13 sibling rows show it is almost never used.
- **`11ItiMGkBnyCYE13EhzVmUCMSeYivseKkcDcfe-26UEw` — "Hummus"** (Cohort B-hummus, country-less; tagged `[Levantine, Middle Eastern]`): Body — "Read The Sandwich Swap & discuss what the story means to students. Reminder about the importance of trying new foods and not yucking anybody's yum, different families eating different foods… Ask if anyone eats hummus or knows what it is (they serve it at lunch sometimes!) Describe hummus and introduce ingredients and directions." A canonical instance of the country-less B-hummus pattern — no country named, no Levantine geography invoked, just hummus-as-school-lunch-food framed through a Jordanian-author picturebook (Sandwich Swap) that the lesson never names as Jordanian. The 5 other hummus-anchored rows (Bean Dips, Herb Hummus, Harvesting Carrots/Hummus, Recipe Reading) share this shape: hummus as the curricular vehicle, `Levantine` as the cultural-heritage signal, no country tag. Hummus-anchored content is 6/14 (43%) — the dish-family equivalent of §14.4 Italian's pizza-pasta-pesto dominance in the Mediterranean cohort.
- **`13nUlv33cUEy2yjjzCARmrlCIHO4oDwQxyCNHVyUtKGk` — "Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds"** (Cohort A, country-named-in-body-not-in-tag; tagged `[Levantine, Middle Eastern]`): Body — "Show Palestine on the map. 'Today we are making a recipe from Palestine, which is a nation in the Middle East. We are going to be combining foods that grow in our garden, like the cucumbers and tomatoes, along with sesame, a traditional Palestinian ingredient, to make a soup.' 'We are going to watch a video about Chef Ayat, who is Palestinian and has her own restaurant in Brooklyn.'" An audit-worthy under-tag — the body is unambiguously Palestinian (mentions Palestine 4+ times, names a Palestinian chef, frames the recipe as Palestinian cooking) but the heritage tags omit `Palestinian` and stop at `[Levantine, Middle Eastern]`. The parallel `Hummus and Pita` lesson carries the full 3-level chain on the same Palestinian framing; this lesson does not. **Pair this with the drift-literal duplicate row `lesson_426e363f5de14520b790695e25b95cda`** ("Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds" — identical title, identical body content with the same Palestine-on-the-map framing and Chef Ayat video reference, tagged `[levantine]` — lowercase singular, missing `Middle Eastern` parent entirely). The two rows are near-certain dedup pair: same lesson, drift-literal variant has degraded tagging (lost the parent + lost the canonical surface label casing). Stage 2 should reconcile to one row with the canonical `[Palestinian, Levantine, Middle Eastern]` chain.
- **`1LSEGMUYjXZX5J24AitIpVHWvKpiLC5tmAtEQAfSub1I` — "Dolmas for Eid (stuffed grape leaves)"** (Cohort B-Eid; tagged `[Levantine, Middle Eastern]`): Body — "A holiday that is coming up/just happened is Eid! Muslims around the world celebrate 2 different Eids… We have a very exciting recipe to celebrate Eid because it is something that is eaten in many different Islamic countries. Here are some of the many names and where they come from. Do you know a name for stuffed grape leaves that isn't on this list? Dolma - Greece; Tolma - Armenia; Yarpaq dolmasi - Azerbaijan; Yebra - Syria; Mahshi or Warak Enab - Egypt." A revealing tag-vs-body mismatch — the lesson body explicitly names 5 origin countries (Greece, Armenia, Azerbaijan, Syria, Egypt) spanning 4 different culturally-tagged regions (Greece in §14 Mediterranean; Armenia/Azerbaijan pan-Caucasus; Syria in §15 Levantine; Egypt in §13 or §15 depending on cluster boundary) but the heritage tag is narrowed to `Levantine + Middle Eastern` on what is functionally a pan-Islamic-world dish. The two sibling Eid lessons (Celebrating Eid, Ma'amoul Cookies for Eid) share this pattern — Eid is the pan-Muslim curricular hook, but the heritage tag is `Levantine + Middle Eastern` rather than a broader Islamic-cultural-heritage signal or a multi-region cluster. Eid-specific content is 3/14 (21%) of the cohort; the curricular framing is pan-Muslim, the tag is sub-regional Levantine.
- **`1RcuAcHgStjdTUlodk5Lq8Yg3QH2UHmXAPL5uzKwHekk` — "Za'atar with Roasted Potatoes"** (Cohort B-standalone; tagged `[Middle Eastern, Levantine]`): Body — "Keywords: za'atar, Middle East, Egypt, Arabic, potatoes, spices, thyme, oregano, sumac, cumin, sesame… Explain that today we will be cooking today using a spice mix called za'atar from the Middle East. Read the reading together." Za'atar is a pan-Levant spice blend (Lebanese, Syrian, Palestinian, Jordanian — also Egyptian by diffusion); the keywords surface Egypt but the body's only geographic anchor is "the Middle East." Like Shepherd Salad and the hummus cohort, this is a country-less B-Levantine row where the cultural-heritage tag rides on the dish-and-ingredient signature rather than on body-text country naming. The Egypt keyword raises a structural question — Egyptian cuisine sits at the §13 African / §15 Middle Eastern cluster boundary in v3 (see §15 framing and cross-cluster §9 conventions); the lesson does not invoke Egyptian framing in the agenda flow, so the tag stays sub-regional Levantine rather than country-anchored.

**Tagging pattern:** Levantine is the corpus's **cleanest hierarchical sub-region**, with 100% Middle Eastern pairing across all 14 active lessons — a higher pairing rate than §14.2 Mediterranean (95% European), §11.2 East Asian (mixed Asian-cluster carry-ins), §12.2 North American (67% African American + 79% Indigenous), or §13.2 West African (mixed Cohort B/C diaspora carry-ins). There are 0 cross-cluster anomalies in the Levantine cohort — no lesson omits the `Middle Eastern` parent and no lesson pairs with a non-Middle-Eastern regional cluster. **Dish-family clustering is the headline cohort signal**: 6 of 14 lessons (43%) are hummus-anchored — Bean Dips, Hummus, Hummus and Pita, Harvesting Carrots/Hummus, Herb Hummus, and Recipe Reading (which uses hummus as its recipe-reading vehicle) — making hummus the dish-family equivalent of §14.4 Italian's pizza-pasta-pesto dominance, except concentrated in a single dish rather than three. Fattoush adds 2 more (14%), Eid-specific lessons add 3 (21%), and the remaining 3 (21%) are standalone Levantine dishes (Chilled Cucumber and Tahini Soup, Shepherd Salad, Za'atar with Roasted Potatoes). **The 13 country-less B-Levantine cohort (93%) is the sub-region's defining structural feature** — hummus, Fattoush, tahini soup, za'atar, shepherd salad, and Eid recipes that tag `Levantine + Middle Eastern` WITHOUT invoking a specific country tag, even when the lesson body explicitly names Lebanese / Syrian / Palestinian / Jordanian origins. The v3 baseline (Appendix A) lists `Lebanese`, `Syrian`, and `Jordanian` as country-specific canonicals under Levantine, but the corpus has **0 lessons** tagged with any of those three values; the country-level layer of the hierarchy exists in v3 but is functionally unused for 13 of 14 rows. Only `Hummus and Pita` carries the 3-level chain (Palestinian → Levantine → Middle Eastern), and that single lesson demonstrates that the country layer is *available* but rarely deployed — the cohort prefers the sub-region tag to carry the cultural-heritage signal. **Stage 2 audit signals**: (a) **drift-literal duplicate `lesson_426e363f5de14520b790695e25b95cda`** is a near-certain dedup pair with the canonical Chilled Cucumber Soup row `13nUlv33...` — identical title, identical Chef-Ayat-Palestinian-restaurant body, but degraded tagging (`[levantine]` lowercase singular, missing Middle Eastern parent) — reconcile to the canonical row with full `[Palestinian, Levantine, Middle Eastern]` chain (register entry ME-06); (b) **Chilled Cucumber Soup under-tag** — the canonical row is explicitly Palestinian in body 4+ times but omits the `Palestinian` country tag while the parallel Hummus and Pita lesson carries it — under-tagging signal for Stage 2 reviewer to backfill or rationalize (register entry ME-07); (c) **Eid-specific Levantine over-narrowing** — 3 Eid lessons (Celebrating Eid, Dolmas for Eid, Ma'amoul Cookies for Eid) tag `Levantine + Middle Eastern` on what are explicitly pan-Islamic-world curricular framings; Dolmas for Eid names 5 origin countries spanning Greece, Armenia, Azerbaijan, Syria, and Egypt; Eid itself is pan-Muslim and not specifically Levantine; flag for reviewer judgment whether a broader cluster-level tag or a multi-region heritage signal would better serve these lessons (register entry ME-08); (d) **country-tag backfill candidates** — 13 of 14 Levantine lessons are country-less in heritage despite frequent body-text country naming; Fattoush is canonically Lebanese-Syrian, Ma'amoul is pan-Levantine, Za'atar is pan-Levantine-with-Egyptian-diffusion, the hummus cohort is pan-Levantine; Stage 2 should determine whether `Lebanese` / `Syrian` / `Jordanian` (v3-canonical but 0 corpus rows) should be backfilled or whether the v3 country-level canonicals should be marked `internal` tier given near-zero corpus usage (register entry ME-09).

</details>

**Notes:** v3 canonical sub-region. 14 lessons; **100% Middle Eastern pairing rate — the highest hierarchical-coupling rate of any sub-region in the worksheet** (above §14.2 Mediterranean's 95% European pairing, §12.2 North American's partial 67-79% diaspora pairing, and §11.2 East Asian's mixed carry-ins). Filter-UI tier `top` proposed per §6 conventions — at 14 lessons Levantine sits comfortably above the ≥5 `sub` threshold and below the ≥40 frequency-based `top` threshold, but it qualifies for `top` on structural grounds: Levantine is the §15 Middle Eastern cluster's *only* meaningful sub-region (the cluster has no Persian sub-region with ≥10 lessons, no North African Middle Eastern bridge sub-region, etc.), and the cluster root has limited additional decomposition, making Levantine the natural anchor filter chip for the cluster — parallel to §14.2 Mediterranean's `top` proposal at 39 lessons even below the 40-lesson cluster-root threshold, where structural cluster-defining role overrode the frequency bar. Pre-handoff structural recommendation: keep parent = `middle-eastern` (v3 alignment + 14/14 = 100% Middle Eastern pairing rate, the highest in the worksheet). **The 13-lesson country-less B-Levantine cohort is the sub-region's defining structural feature** — hummus / Fattoush / tahini / za'atar / shepherd salad / Eid recipes that tag `Levantine + Middle Eastern` without invoking country specificity, structurally parallel to §14.2 Mediterranean's 8-lesson B-pan-Med cohort but at much higher density (93% vs. 21% of the sub-region). The single 3-level chain (Hummus and Pita → Palestinian → Levantine → Middle Eastern) is structurally significant — it confirms the country-level v3 layer exists and is canonically valid, but the corpus uses it only once. Stage 2 audit signals captured to register entries ME-06 (drift-literal Chilled Cucumber Soup dedup pair), ME-07 (Chilled Cucumber Soup Palestinian under-tag), ME-08 (Eid-specific Levantine over-narrowing — pan-Muslim curricular framings tagged sub-regionally), and ME-09 (Lebanese / Syrian / Jordanian country-tag backfill candidates given the 13-row country-less cohort and v3's currently-unused country-level canonicals).

---

#### 15.3. Yemeni (3)

- **canonical_key:** `yemeni`
- **surface_label:** `Yemeni`
- **parent:** `middle-eastern`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** **NOT in v3 baseline** (Appendix A's `Middle Eastern` cluster lists `Levantine` [Palestinian, Lebanese, Syrian, Jordanian] + `Israeli`; no Yemeni entry). Proposed `new` candidate per §15 framing block decision #2. 3 corpus lessons all anchor cleanly to Yemen-the-country with depth-2 direct-under-Middle-Eastern tagging: `Yemeni Fasoulia` (`1ulDJYHIEKOqidEYl9gQ2xsBFEVhI2alJ`) tags `[Yemeni, Middle Eastern]` with body "Show Yemen on the world map. Depending on grade level, give a brief description of the situation in Yemen"; `Yemeni Shakshuka` (`1x4iNndIGdwuqZuIkMc9-iDkHsc7lA-Y8dG9nptzZKs8`) tags `[Yemeni, Middle Eastern]` with Yemen anchored via Hawaij spice mix + recipe-title framing (lighter body framing than Fasoulia, but Hawaij is a definitively Yemeni spice signature); `Zahawig` (`188Ph9s6OEdUgNQScQOxGiqAtvNd2r78X`) tags `[Yemeni, Middle Eastern]` with body explicit "Zahawig/Sahawiq, Middle East, Arabic, Yemen, condiment… Introduce the recipe of the day, zahawig, a sauce from Yemen" plus "This could be used as a part of a larger lesson unit about foods and cultural traditions of the Middle East." Empirical signal: 3/3 carry the depth-2 chain Yemeni → Middle Eastern with NO Levantine intermediate (Yemen sits on the Arabian Peninsula, not in the Levant). Structurally parallel to §14.8 Irish (depth-2 direct-under-European, no sub-region intermediate) and to the §13.4 East African / §13.3 North African NEW sub-region candidates surfaced in §13 African cluster. Below the ≥3-lesson sub-tier bar (sits exactly at 3) — `internal`-tier proposed; curriculum team may promote to `sub` given the clean Yemen anchoring across all 3 corpus rows and the curricular substance (map-locate + situation-context framing in Yemeni Fasoulia; Hawaij spice + zahawig sauce). Pre-handoff structural recommendation: parent = `middle-eastern` direct (Yemen doesn't fit Levantine cluster geography); if curriculum team prefers to surface an `Arabian Peninsula` sub-region NEW candidate (covering Yemeni + possibly future Saudi Arabian / Emirati / Omani country-specifics — Hummus and Pita §15.5 body names Saudi Arabia as a hummus-eating country), the parent re-routes to `arabian-peninsula`. Stage 2 audit signal cross-ref ME-05 (Yemeni depth-2 asymmetry parallel to EUR-14 Irish-direct-under-European — same canonicalization question).

---

#### 15.4. Persian (1)

- **canonical_key:** `persian`
- **surface_label:** `Persian`
- **parent:** `middle-eastern`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** **NOT in v3 baseline** (Appendix A's `Middle Eastern` cluster lists `Levantine` + `Israeli`; no Persian or Iranian entry). Proposed `new` candidate per §15 framing block decision #3. **Multi-parent — see §9.2.** 1 corpus lesson `Kuku Sabzi` (`1q78Gpy8f9L1gXvJ8h2GvurXs9eaFMyIM`) tags `[Persian, Middle Eastern]` depth-2 direct-under-Middle-Eastern with body explicitly anchoring the Iran framing: "Show Iran on the world map. Explain that some people in Iran are Persian and that we are making a Persian herb omelette today called Kuku Sabzi." The lesson is a Persian herb omelette + Mast-o Khair cucumber-yogurt sauce. Empirical signal: 1/1 carries the depth-2 chain with NO Central Asian co-presence in corpus tagging. §9.2 pre-handoff recommendation: single-parent canonical home = `middle-eastern` (geographic anchor for modern Iran + cultural anchor of Persian-as-Iranian-identity + 1/1 corpus Middle Eastern pairing); Central Asian flagged as multi-parent alternative for curriculum-team review per §9.2 decision rule (historical Persianate world extends into Central Asia even though the corpus tags only the modern Iran framing — Persian-speaking populations in Tajikistan, Afghanistan, Uzbekistan; Silk Road / Mongol-era cultural diffusion). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may consider `keep` for future tagging given v3-canonical status of similar single-country Middle Eastern values like Israeli + Palestinian. Stage 2 audit signal cross-ref ME-05 (depth-2 asymmetry; canonicalization question about whether an `Iranian` sub-region intermediate should be introduced).

---

#### 15.5. Palestinian (1)

- **canonical_key:** `palestinian`
- **surface_label:** `Palestinian`
- **parent:** `levantine`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Levantine per v3 baseline (Appendix A — Palestinian listed under `Levantine` alongside Lebanese, Syrian, Jordanian). 1 corpus lesson `Hummus and Pita` (`1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg`) tags `[Palestinian, Levantine, Middle Eastern]` — **the cluster's only depth-3 chain** (per §15.1 + §15.2 Notes). Substantive Palestinian-anchored body: "Students will read a story by a Palestinian author about olive trees in Palestine and how hummus is an important food in Palestinian culture since the main ingredients (chickpeas, olive oil, sesame) are native plants in that region and indigenous Palestinian people have stewarded this land, cared for these native plants and survived on this food for many generations… 'Today we are going to focus on one country that eats hummus and grows the plants needed to make hummus - Palestine!' …Both Palestinians and Israelis feel ancestral connections to the same land… However, Israel is forcefully occupying the land." Strong indigenous-stewardship framing + explicitly anti-occupation pedagogical content + Palestinian-author book anchor — the body justifies the full 3-level country tag in a way other Levantine-cohort lessons do not. Body also names 5 other hummus-eating Middle Eastern countries (Lebanon, Saudi Arabia, Iran, Iraq, Egypt) widening to pan-Middle-East scope while keeping the country focus on Palestine. Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may consider `keep` for future tagging given v3 canonical status + the pedagogical substance of the single corpus lesson + likely growth potential for Levantine country-specifics. Stage 2 audit signal cross-ref ME-07 (sibling Chilled Cucumber and Tahini Soup lesson `13nUlv33...` has equally substantive Palestinian body framing — including "Show Palestine on the map. Today we are making a recipe from Palestine" + a Palestinian-chef video segment — but stops at `[Levantine, Middle Eastern]` without the country tag; under-tag candidate for backfill).

---

#### 15.6. Israeli (1)

- **canonical_key:** `israeli`
- **surface_label:** `Israeli`
- **parent:** `middle-eastern`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Middle Eastern direct per v3 baseline (Appendix A — Israeli listed directly under `Middle Eastern`, **NOT** under `Levantine`, despite Israel being Levantine geographically). **Multi-parent — see §9.2.** 1 corpus lesson `Breakfast around the World / Israeli Salad` (`18oKyXzj8zydRDEtQvZ68USr144_9vfMJhckXNo6NFVk`) tags `[Israeli, Middle Eastern]` matching v3's depth-2 placement, with body "Intro to Israel - show on map, discuss culture, highlight traditional foods. Israel is a small country in the Middle East (point it out on map) about the same size as New Jersey. The capital is Jerusalem… It has snowy mountains in the north, and hot deserts in the south. Most people speak either Arabic or Hebrew. Let's practice some Hebrew! To say hello, you say 'Shalom.'" Empirical signal: 1/1 carries the depth-2 chain with NO Levantine intermediate (matching v3) and NO Mediterranean co-presence. §9.2 pre-handoff recommendation: single-parent canonical home = `middle-eastern` (v3 baseline alignment + corpus signal + body's explicit "Israel is a small country in the Middle East" anchor); Mediterranean flagged as multi-parent alternative for curriculum-team review per §9.2 decision rule (Israeli cuisine has substantial Mediterranean overlap — hummus, falafel, shakshuka, Israeli salad are all Mediterranean-coded culinarily — but corpus tagging is purely Middle Eastern and no body content invokes Mediterranean framing). Below the ≥3-lesson sub-tier bar — `internal`-tier proposed; curriculum team may consider `keep` for future tagging given v3 canonical status. **Cross-reference §15.5 Palestinian:** both Israeli and Palestinian are Levantine geographically, but v3 routes them asymmetrically — Palestinian → Levantine → Middle Eastern (depth 3) vs Israeli → Middle Eastern (depth 2). The corpus follows v3's asymmetric routing exactly. v3-by-design (intentional placement reflecting the geopolitical sensitivity of Israeli-vs-Levantine identity rather than tagging error) — but worth recording explicitly for curriculum-team awareness during the §9.2 multi-parent disposition decision. Stage 2 audit signal cross-ref ME-05 (Israeli depth-2 canonicalization question — should Israeli route through `Levantine` like Palestinian, or stay depth-2 per v3?).

---

#### 15.7. Lebanese (0)

- **canonical_key:** `lebanese`
- **surface_label:** `Lebanese`
- **parent:** `levantine`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Levantine per v3 baseline (Appendix A). **0 corpus lessons** — this is a v3-baseline-but-corpus-absent value per the §12.18 Dominican / §14.10 French / §14.11 Polish precedent. Strong body-text reference points across the Levantine cohort despite zero direct tagging: `Hummus and Pita` (§15.5) body lists Lebanon as a hummus-eating country ("a food enjoyed in many different countries in the Middle East, like Lebanon, Saudi Arabia, Iran, Iraq, Egypt"); `Fattoush` (§15.2) body explicitly names Lebanon as a Levantine country ("It includes countries like Syria, Lebanon, Jordan, Israel and Palestine"); `Middle Eastern Salad - Fattoush` body names Lebanon. Fattoush itself is canonically Lebanese-Syrian cuisine, suggesting Lebanese-specific tagging would be content-justified on multiple Levantine cohort lessons. Verdict options: `keep` for future tagging (curricular Lebanese signal is well-attested in body content; corpus may grow); `drop` for absence of direct corpus signal; or `internal`-tier-only as a placeholder. Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. Pre-handoff recommendation per §15 framing block decision #1: keep at `sub`-tier (Levantine cluster has high curricular significance and country-specific signals can emerge as the corpus grows). Curriculum-team verdict here also informs Syrian + Jordanian dispositions (§15.8, §15.9) — parallel structural cases. Stage 2 audit signal cross-ref ME-09 (Lebanese / Syrian / Jordanian country-tag backfill candidates across the 13-row country-less Levantine cohort).

---

#### 15.8. Syrian (0)

- **canonical_key:** `syrian`
- **surface_label:** `Syrian`
- **parent:** `levantine`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Levantine per v3 baseline (Appendix A). **0 corpus lessons** — v3-baseline-but-corpus-absent per the §12.18 Dominican / §15.7 Lebanese precedent. Body-text reference points: `Fattoush` (§15.2) body names Syria as a Levantine country ("It includes countries like Syria, Lebanon, Jordan, Israel and Palestine"); `Dolmas for Eid` (§15.2) body explicitly names Syria via the "Yebra - Syria" entry in the multi-country stuffed-grape-leaves vocabulary list. Fattoush itself is canonically Lebanese-Syrian cuisine, suggesting Syrian-specific tagging would be content-justified on Fattoush cohort lessons. Verdict options identical to §15.7 Lebanese (`keep` / `drop` / `internal`-only placeholder). Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. Pre-handoff recommendation per §15 framing block decision #1: keep at `sub`-tier. Curriculum-team verdict coordinates with §15.7 Lebanese + §15.9 Jordanian. Stage 2 audit signal cross-ref ME-09.

---

#### 15.9. Jordanian (0)

- **canonical_key:** `jordanian`
- **surface_label:** `Jordanian`
- **parent:** `levantine`
- **filter_ui_tier:** `internal`
- **verdict:** `<to_fill>`
- **aliases:** `[]`

**Notes:** v3 canonical country, parent = Levantine per v3 baseline (Appendix A). **0 corpus lessons** — v3-baseline-but-corpus-absent per the §12.18 Dominican / §15.7 Lebanese precedent. Body-text reference points: `Fattoush` (§15.2) body names Jordan as a Levantine country ("It includes countries like Syria, Lebanon, Jordan, Israel and Palestine"); the `Hummus` (§15.2) lesson frames the lesson around `The Sandwich Swap`, a picturebook by a Jordanian-American author (Queen Rania of Jordan + Kelly DiPucchio) — but the lesson body never names the author or the Jordanian connection explicitly, so the Jordanian framing is structural / authorial rather than body-text-supported. Verdict options identical to §15.7 Lebanese (`keep` / `drop` / `internal`-only placeholder). Filter-UI tier `internal` proposed regardless of verdict given 0 frequency. Pre-handoff recommendation per §15 framing block decision #1: keep at `sub`-tier. Curriculum-team verdict coordinates with §15.7 Lebanese + §15.8 Syrian. Stage 2 audit signal cross-ref ME-09.

---

#### 15.10. `middle-eastern` (drift literal — 1 corpus appearance)

- **canonical_key:** `middle-eastern`
- **surface_label:** `middle-eastern`
- **parent:** `null`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `middle-eastern`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 1 corpus row (`lesson_362e8be6fa894f5381f85297d42944f1` — "Eid: Stuffed Dates", tagged `[south-asian, middle-eastern]`, synthetic-`lesson_` ID — recognizable post-PR-update / post-B-update regime). Cross-cluster Cohort C drift — body is pan-Muslim Eid celebration framing ("Students will learn about the importance of Eid… Muslims and those who celebrate Eid"), so the `south-asian + middle-eastern` tag stack reflects intentional pan-Muslim curricular framing for South Asian Muslim + Middle Eastern Muslim diaspora populations, not a tagging error in the cluster choice — only the lowercase kebab casing is non-canonical. Same convention as §13.10 `african` drift + §14.12 `european` drift + §11.16-18 / §12.19-22 patterns. The `canonical_key` field matches the merge target's slug (both are kebab-case-lowercase by slug convention applied to the same underlying value — see §7 alias_map identity-shaped entries). This entry contributes `"middle-eastern" → "middle-eastern"` to the `alias_map` output (literal-to-canonical-key); verdict `merge` excludes it from the canonical vocabulary list. Stage 2 audit signal cross-ref ME-08 (Eid-specific Levantine over-narrowing applies to this row too — the cross-cluster pan-Muslim framing is the same pattern, here in kebab-case form).

---

#### 15.11. `levantine` (drift literal — 2 corpus appearances)

- **canonical_key:** `levantine`
- **surface_label:** `levantine`
- **parent:** `middle-eastern`
- **filter_ui_tier:** `internal`
- **verdict:** `merge`
- **merge_into:** `levantine`
- **aliases:** `[]`

**Notes:** Kebab-case-lowercase drift literal observed in 2 corpus rows (both synthetic-`lesson_` IDs — post-PR-update / post-B-update regime): `lesson_426e363f5de14520b790695e25b95cda` ("Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds") tags `[levantine]` only — single-tag drift with NO Middle Eastern parent, on a Palestinian-anchored body identical to the canonical row `13nUlv33...` (`[Levantine, Middle Eastern]`); near-certain dedup pair (per §15.2 `<details>` analysis). `lesson_e8fa030e63bf4a9cb13b95448a3450c0` ("Street Vendors/'Chicken' Over Rice") tags `[south-asian, levantine]` — Cohort C cross-cluster drift on the same NYC-halal-cart-immigrant-foodways body as canonical row `1T1sgLmsW...` (which tags `[Middle Eastern, Mediterranean, Americas]`); near-certain dedup pair with the canonical row carrying completely different (incompatible) cluster tags. Same convention as §13.10 `african` drift + §14.13 `mediterranean` drift. Contributes `"levantine" → "levantine"` to `alias_map`. Stage 2 audit signal cross-refs ME-06 (drift-literal Chilled Cucumber Soup dedup pair) and ME-02 (Street Vendors duplicate-row cross-cluster + casing disagreement).

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

*End of worksheet (last update Session 70, 2026-05-11 — Middle Eastern cluster per-value entries populated; all 5 regional clusters complete).*
