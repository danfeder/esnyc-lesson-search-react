# Stage 1 Concepts Worksheet

> **Status: PRE-HANDOFF FILLED (last update Session 81, 2026-05-12).** Header sections (§1–§10) and tier skeletons (§11–§13) in place; Appendix A v3 baseline populated; **all 208 per-value entries pre-filled across the 3 tiers** (32 high-impact in §11 / 39 mid-tier in §12 / 137 long-tail in §13). `verdict` + `curriculum_notes` fields stay `<to_fill>` per pre-handoff convention. PR-Concepts-1 (§11, Session 79, squash `1ab5e82`) + PR-Concepts-2 (§12, Session 80, squash `e7632e3`) + PR-Concepts-3 (§13, Session 81 — this PR). **Awaiting curriculum-team verdict pass** (Session 82+).
>
> **Owner during scaffold/pre-handoff phase:** project maintainer (Claude + user). **Owner at handoff:** ESYNYC curriculum team.
>
> **Companion doc:** `2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` (project-internal progress tracker + Session 77 design decisions D-C1 through D-C15).
>
> **Sibling worksheet:** `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` is the Stage 1 heritage precedent. This worksheet adapts heritage's labeled-line per-value shape and parsing convention; structural shape diverges (concept-first, not subject-first; flat-by-frequency, not clustered).

---

## 1. Purpose & methodology

### What this worksheet is

The Stage 1 concepts worksheet is the curriculum-team-facing artifact for **canonicalizing the `academicConcepts` field** of the ESYNYC lesson taxonomy. It captures, per candidate canonical concept:

- Whether the concept belongs in the canonical vocabulary (`keep` / `merge` / `new` / `drop`)
- What surface label the user-facing UI shows for it
- What near-duplicate aliases (case-mixing drift, granularity duplicates, semantic near-twins) collapse into it during the Stage 2 corpus re-tag migration
- Which current subject(s) it appears under, and which subject(s) it canonically lives under post-cleanup
- Whether the concept name shares a vocabulary with a `thematicCategories` value under case normalization (flagged for separate concept↔theme reconciliation)

The output is a **locked canonical concepts vocabulary** that downstream consumers operate on:

| Consumer | What it does with the output |
| --- | --- |
| **PR 5+ (D4 vocab canonicalization migration)** | Reads the alias → canonical-key map; rewrites every `lessons.metadata.academicConcepts` row to canonical surface labels. |
| **PR 6+ (Stage 2 corpus re-tag)** | Reads the canonical vocabulary as the closed-vocab constraint for the Opus re-tag prompt. |
| **PR 3b+ (`search_synonyms` population)** | Reads canonical concept keys; everyday-vocab → canonical mappings come from a separate post-worksheet curriculum-team brainstorm (per D-C10), not from this worksheet. |
| **Submission-time LLM auto-tag (PR 2 deferred concepts prompt)** | Same closed-vocab constraint; this prompt was gated on Stage 1 closure for a reason. |
| **Reviewer UX (Phase 2)** | Reads the canonical vocabulary for any picker / autocomplete the future reviewer redesign uses. |

The worksheet is **the source of truth for the canonical concepts vocabulary** until the canonicalization migration ships and bakes the result into schema + data.

### What the curriculum team is being asked to do

For each candidate canonical concept (per-value entry below), make a `verdict` call:

- **`keep`** — concept is canonical; surface label and subject context are as listed.
- **`merge`** — concept is a non-canonical near-duplicate; merge into another canonical concept (you specify which one). Example: `plant ID` → `plant identification`.
- **`new`** — concept should be added to canonical even though it's outside v3 baseline. Rare at this stage; the v3 vocabulary already covers ~208 strings.
- **`drop`** — concept should not be canonical; remove it entirely. Example: pure-noise singletons like `garden topics`, `general exploration`. Per D-C8 this is distinct from `merge` — `drop` removes from canonical vocab entirely; `merge` collapses into another canonical.

Plus the surface-label call (display string the UI shows), `merge_aliases` (near-duplicate corpus strings that collapse into this canonical), `recommended_primary_subject` (which of the 6 subjects this concept canonically lives under), and `recommended_secondary_subjects` (additional subjects where this concept legitimately appears as a lens).

### Methodology (per Session 77 design decisions; see companion execution status doc)

Three inputs converge into each verdict:

1. **v3 baseline** (Appendix A) — the 208-string canonical vocabulary inherited from the v3 batch-tagging run (July 2025). Most v3 strings will `keep` as-is; some have near-duplicate clusters that warrant `merge`; some singletons are noise that warrants `drop`.
2. **Per-concept Opus-corpus-read evidence** — for the ~60-90 highest-leverage concepts (all 8 cross-subject concepts, ~30-40 ambiguous near-duplicate clusters, ~10-15 sample singletons with vague names), an Opus agent reads the actual lesson bodies tagged with the concept to confirm whether the tagging is semantically consistent. Reads happen in an **upfront batch before Session 79 per-entry fill** (per D-C13); remaining reads are lazy during per-tier fill sessions. Surfaced in collapsible `<details>` excerpts on each per-value entry. Mechanical near-duplicate clusters (`plant identification` / `identifying plants` / `plant ID`) don't need fresh Opus reads — the canonical-vs-alias call is structural.
3. **Reviewer / curriculum-team validation** — curriculum-team subject-matter judgment on the verdict calls, especially for ambiguous near-duplicate clusters, cross-subject concepts, and `drop` candidates.

### Worksheet hand-off model

```
SCAFFOLD (Session 78)             PRE-HANDOFF (Sessions 79-81)            HANDOFF (Session 82+)
       │                                  │                                       │
       ▼                                  ▼                                       ▼
Header sections written         Per-value entries populated:           Curriculum team fills:
Tier skeletons in place         - canonical_key                        - verdict per entry
Appendix A v3 baseline           - canonical_label (proposal)           - canonical_label (confirm/refine)
populated as reference           - frequency + dual-count if merge      - merge_aliases (confirm/refine)
                                 - current_subjects (with counts)       - recommended_primary_subject
                                 - recommended_primary_subject          - recommended_secondary_subjects
                                 - recommended_secondary_subjects       - theme_overlap notes (confirm)
                                 - merge_aliases (proposal)             - curriculum_notes
                                 - theme_overlap flag if applicable
                                 - Opus-corpus-read excerpts (where
                                   batched per D-C13)
                                 - claude_notes (proposal)
```

### What this worksheet IS NOT

- Not an implementation plan. Code, migrations, and edge functions don't appear here.
- Not a reviewer-UX design doc. The "Phase 2 reviewer UX" track is separate.
- Not a Stage 2 corpus re-tag plan. Stage 2 uses this worksheet's output as input but is its own work track (PR 6+).
- Not an `everyday_vocab` → canonical mapping artifact. Per D-C10, that's a separate post-worksheet curriculum-team brainstorm session feeding PR 3b; `merge_aliases` (DB-level near-duplicate collapse) lives here, but `search_synonyms` (end-user query expansion) does not.
- Not a place to debate whether the `academicConcepts` field should exist or whether subject grouping should stay in the schema. Per D-C2, no schema migration happens before the worksheet ships; the field stays in its current `{Subject: [concepts]}` shape until post-worksheet decisions land.

---

## 2. Structural shape (concept-first, flat-by-frequency)

### The shape

The canonical concepts vocabulary is **a flat ordered list of canonical concepts**, ordered most-to-least frequent within each of three frequency-tier sections (§11 high-impact, §12 mid-tier, §13 long-tail). Subjects appear on each entry as **evidence columns** (`current_subjects`, `recommended_primary_subject`, `recommended_secondary_subjects`), not as section headers.

```
§11 High-impact tier (≥10 appearances; ~32 entries — calibratable at Session 79)
  ├─ concept entry (highest freq)
  ├─ concept entry (next highest)
  └─ ...

§12 Mid-tier (3–9 appearances; ~39 entries — calibratable)
  ├─ concept entry
  └─ ...

§13 Long-tail (1–2 appearances; ~137 entries — calibratable; most will be `drop` or `merge`)
  ├─ concept entry
  └─ ...
```

### Why concept-first instead of subject-first (D-C1)

Heritage worksheet used cluster-first sectioning (§11 Asian, §12 Americas, etc.) because heritage hierarchy is genuinely tree-shaped. Concepts is structurally different:

1. The current `{Subject: [concepts]}` shape on `lessons.metadata.academicConcepts` was inherited from legacy `academicIntegration.concepts`, not a deliberate design choice. Subject grouping is currently **UI-orphaned** — no live consumer reads the subject keys (verified by parallel-subagent investigation, reports cited in companion execution status doc).
2. Cross-subject investigation found that 2–4 of the 8 cross-subject concepts represent real subject-lens distinctions (e.g., `observation` as a Science practice vs an Arts practice); the remaining 4–6 are tagging artifacts. Subject-first sectioning would force per-subject verdicts on tagging-artifact concepts, hardening v3 inheritance into canonical structure.
3. The cost of restructuring the worksheet to concept-first is low because no live consumer depends on subject grouping.

The schema itself stays in `{Subject: [concepts]}` shape during the worksheet (per D-C2 — no schema migration before the worksheet ships). The concept-first worksheet output is structured to feed a future post-worksheet schema decision (flat-array + concept registry being one likely end-state).

### Why flat-by-frequency within tiers (D-C3)

- Highest-impact decisions get reviewed first; mistakes on `plant parts` (239 appearances) have a bigger blast radius than mistakes on `homeostasis` (1 appearance).
- Natural pareto stopping points emerge per session.
- No implicit subject inheritance via section order (alphabetical or subject-grouped ordering would re-impose subject affinity).
- Pre-grouped topic clustering would require Claude's subjective groupings; concept frequency is the only ordering dimension, which is data-objective.

### Why three frequency-tier sections (D-C4 + D-C14)

- Each tier PR meets the ~50-entry PR-review bandwidth limit. The actual distribution (32 / 39 / 137) at the locked cutoffs is close to but not perfectly balanced; Session 79 may recalibrate cutoffs or split the long-tail across multiple PRs (the 137 long-tail entries are mostly noise where review per-entry is fast).
- Tier boundaries map to decision-class:
  - **§11 High-impact (≥10):** load-bearing canonical decisions — top concepts that drive the bulk of the corpus's concept-tag signal.
  - **§12 Mid-tier (3–9):** volume work — most are `keep` with minor surface-label or alias refinements.
  - **§13 Long-tail (1–2):** noise filter — most are `drop` (genuine singletons) or `merge` (near-duplicate of a higher-frequency canonical).
- 3 tiers were chosen over 2 (top + mid combined) because the per-entry review character differs across tiers and mixing dilutes the curriculum-team's attention on high-stakes top-tier calls.

---

## 3. Verdict vocabulary

Each per-value entry has a `verdict` field. Four verdicts plus the unfilled marker (per D-C8):

| Verdict | What it means | Per-entry follow-up |
| --- | --- | --- |
| **`keep`** | Concept is canonical. Surface label and subject context all stand as listed (or are refined within `keep`). | Confirm `canonical_label`, `recommended_primary_subject`, `recommended_secondary_subjects`; populate `merge_aliases` list. |
| **`merge`** | Concept is a non-canonical near-duplicate; rows tagged with it should move to another canonical concept during Stage 2 re-tag. | Specify `merge_into: <canonical_key>`. Examples: `plant ID` → `plant_identification`; `adaptations` (plural) → `adaptation` (or vice versa per curriculum-team call). |
| **`new`** | Concept should be added to canonical even though it's outside v3 baseline. Rare for concepts (v3 vocabulary is broad); reserved for concepts surfaced from non-v3 corpus rows or curriculum-team additions. | Specify `canonical_label`, `recommended_primary_subject`, `recommended_secondary_subjects`, frequency evidence. |
| **`drop`** | Concept should not be canonical; remove from canonical vocab entirely. Rows tagged with it have no merge target — the concept simply disappears from the canonical surface. | No `merge_into`. Curriculum team should note in `curriculum_notes` why the concept is noise. Examples: `garden topics` (vague), `general exploration` (vague), `plant ID` if the canonical name is `plant identification` (covered by `merge` instead, but `drop` is the verdict if the curriculum team judges the concept itself non-canonical without a merge target). |
| **`<to_fill>`** | Curriculum team has not yet decided. Default state for all per-entry verdicts in the pre-handoff worksheet. The parser warns on `<to_fill>` entries but does not fail. | Curriculum team replaces with one of the four verdicts above. |

**Drop vs merge distinction (D-C8 rationale).** `drop` removes the concept from canonical vocab entirely; the alias chain has no canonical target. `merge` collapses the concept into another canonical that survives. Stage 2 re-tag produces different output states:

- `merge`: the `merge_aliases` map adds an entry `noncanonical_string → target_canonical`; rows tagged with the noncanonical get retagged to `target_canonical`.
- `drop`: the canonical vocab list excludes the concept; rows tagged with it lose the tag entirely (no replacement). The dropped concept does NOT appear in the canonical vocabulary going forward.

The curriculum team selects exactly one verdict per entry.

---

## 4. Per-value entry shape

Each per-value entry is a labeled-line block. Format (10 fields locked per D-C7):

```markdown
### `<canonical_key>`

- canonical_label: <Title Case label>
- verdict: <keep | merge | new | drop | <to_fill>>
- frequency: <count> appearances    (OR `<N> as-tagged, <M> if aliases merge` per D-C11)
- current_subjects: <Subject1 (count), Subject2 (count)>    (always shows counts per D-C12)
- recommended_primary_subject: <single subject>
- recommended_secondary_subjects: <comma-separated subjects, or `<none>`>
- merge_aliases: <list of (string, count) tuples, or `<none>`>    (or `merge_into: <canonical_key>` for merge-verdict entries)
- theme_overlap: <none | YES — adjudication notes>
- claude_notes: <one-paragraph pre-handoff recommendation>
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (N lessons)</summary>

- Opus-read excerpts from sample lessons tagged with this concept or its aliases
- Each excerpt is ~200-400 chars from the lesson body
- Excerpts are evidence the curriculum team can scan to verify the verdict

</details>
```

### Field-by-field semantics

- **`canonical_key`** (heading) — lowercase slug derived from `canonical_label`. Example: `plant_parts`, `plant_identification`. Examples use underscore-separated words (`snake_case`), but the final hyphen-vs-underscore convention is locked at parser-write time (Session 79 prep) since downstream consumers may prefer one or the other.
- **`canonical_label`** — Title Case display string the UI shows. Example: `Plant Parts`, `Plant Identification`.
- **`verdict`** — one of `keep | merge | new | drop | <to_fill>` (see §3).
- **`frequency`** — total lesson-appearances in the active corpus. Dual-count format `5 as-tagged, 8 if aliases merge` when `merge_aliases` is non-empty (per D-C11) — surfaces the curriculum team's actual decision-relevant numbers.
- **`current_subjects`** — comma-separated list of `Subject (count)` tuples; always shows per-subject counts even when single-subject (per D-C12). Example single-subject: `Science (239)`. Example multi-subject: `Science (5), Arts (1)`.
- **`recommended_primary_subject`** — single subject string. The subject this concept canonically lives under after cleanup. Most entries are single-subject; cross-subject concepts surface as multi-subject in `current_subjects` and pick one in `recommended_primary_subject`.
- **`recommended_secondary_subjects`** — comma-separated list, or `<none>`. Used when a concept legitimately appears as a lens in multiple subjects (e.g., `observation` may be primary Science and secondary Arts). Captures the genuine cross-subject signal at a coarser grain than per-lesson tagging (per D-C9 — no `per_lesson_override_signal` field).
- **`merge_aliases`** — list of `(corpus_string, count)` tuples for near-duplicates that collapse into this canonical. Pre-merge per-subject distribution stays in `current_subjects`; the post-merge total goes in `frequency` (per D-C11). For `merge`-verdict entries, replace this field with `merge_into: <canonical_key>` pointing at the canonical target.
- **`theme_overlap`** — `none` (default) or `YES — <adjudication notes>`. Flagged when the concept's canonical string matches a `thematicCategories` canonical string under case normalization. Three known cases: `ecosystems` (exact-string match — concepts side `ecosystems`, themes side `Ecosystems`; collide under `lower()`), `food systems` (concepts side `food systems`, themes side `Food Systems`), `plant growth` (concepts side `plant growth`, themes side `Plant Growth`) — per §6. Per D-C5, adjudication (which side keeps it; whether both keep with cross-reference) is deferred to the themes worksheet / D4 canonicalization migration; the flag preserves the signal.
- **`claude_notes`** — one-paragraph pre-handoff recommendation from Claude. Captures: why this verdict is recommended, where the corpus signal lives, any ambiguity worth flagging. Curriculum team reads this as a starting point, not a constraint.
- **`curriculum_notes`** — `<to_fill>` placeholder for curriculum-team free-form notes. May land empty if the entry needs no notes.

### Optional `<details>` block

For entries where Opus-corpus-read evidence was batched (per D-C13 — ~60-90 entries upfront before Session 79), a collapsible `<details>` block surfaces lesson body excerpts the curriculum team can scan. Mechanical near-duplicate clusters (case-mixing or pluralization drift) typically don't need fresh Opus reads — the canonical-vs-alias call is structural.

### Fillable fields

For curriculum-team fill:

- `verdict` — required, one of five (incl. `<to_fill>`).
- `merge_into` — required iff verdict is `merge`.
- `canonical_label` — confirm or refine the pre-populated proposal.
- `recommended_primary_subject` — confirm or refine.
- `recommended_secondary_subjects` — confirm or refine; can stay `<none>`.
- `merge_aliases` — confirm or refine; one-line `<!-- review note -->` inline tolerated.
- `theme_overlap` — only present on the 3 overlap concepts; curriculum team can add adjudication notes but the resolution itself defers per D-C5.
- `curriculum_notes` — optional but valued.

For Claude pre-population (Sessions 79–81):

- `canonical_key` — generated from `canonical_label` (lowercase, underscore-separated as `snake_case`; final separator convention locked at parser-write time per §4).
- `canonical_label` (proposal) — from v3 baseline OR best-fit Title Case from corpus drift cluster.
- `frequency` — total lesson-appearances in the active corpus (from Session 78 TEST DB probe, refreshed at fill time if corpus drifts).
- `current_subjects` — verbatim from probe data.
- `recommended_primary_subject` (proposal) — first-principles from `current_subjects` highest-count subject and concept semantics.
- `recommended_secondary_subjects` (proposal) — for cross-subject concepts only; `<none>` otherwise.
- `merge_aliases` (proposal) — all observed near-duplicate strings from probe data + Opus-corpus-read evidence for ambiguous cases.
- `theme_overlap` — flagged for the 3 case-normalized concept↔theme overlaps.
- `claude_notes` (proposal) — one-paragraph recommendation.

### Parser-compatible format

The labeled-line shape (`- <field_name>: <value>`) is parseable by a small Python script (mirroring the heritage worksheet parser introduced in Session 76 / PR #492). Future automation:

- Parses each `### <canonical_key>` block as one canonical-concept entry.
- Strips inline HTML comments (`<!-- ... -->`).
- Skips the `<details>` block (treated as human-reference content; not structurally parsed).
- Emits a structured JSON output for downstream consumers (per §10).

The parser stays out of scope for Session 78 (scaffold). It's a Session 79+ artifact (or post-worksheet, depending on whether per-tier fills benefit from incremental parser verification — TBD at Session 79 planning).

---

## 5. Frequency-tier section structure

### Three tiers

| Tier | Frequency cutoff | Section | Approx entries | Decision character |
| --- | --- | --- | --- | --- |
| **High-impact** | ≥ 10 appearances | §11 | ~32 (Session 78 probe) | Load-bearing canonical decisions. High blast-radius if wrong. Curriculum team should give per-entry attention. |
| **Mid-tier** | 3–9 appearances | §12 | ~39 (Session 78 probe) | Volume work — most are `keep` with minor surface-label or alias refinements. Curriculum team attention OK but variance acceptable. |
| **Long-tail** | 1–2 appearances | §13 | ~137 (Session 78 probe) | Noise filter — most are `drop` (vague singletons) or `merge` (near-duplicate of a higher-tier canonical). Rapid skim is fine for clear-drop singletons. |

### Why tier cutoffs are calibratable

Session 78's TEST DB probe surfaced the actual frequency distribution (32 / 39 / 137 at the locked cutoffs). Per D-C14, exact cutoffs are calibrated at Session 79 fill time against actual distribution. Two specific calibration considerations Session 79 should weigh:

1. **Long-tail size.** 137 entries is bigger than the ~50-entry PR-review sweet spot. Options at Session 79: (a) keep the 1–2 cutoff and accept the larger PR (most entries are noise-drop, so per-entry review time is low); (b) re-split the long-tail across two PRs (e.g., singletons-only vs 2-appearance entries — ~89 / ~48 in the Session 78 probe data); (c) adjust the tier boundaries elsewhere to rebalance.
2. **Mid-tier size.** 39 entries is on the smaller side of the bandwidth sweet spot; combining with high-impact (32 + 39 = 71) is one option but rejected by D-C4 because mixing changes the decision character.

The scaffold leaves the tier section headers in place under the locked cutoffs (≥10 / 3–9 / 1–2); Session 79 may rename / re-cut without breaking the scaffold's structural commitment to 3 tiers (the 3-tier shape itself is locked per D-C4).

### Curriculum-team review depth (D-C15)

The worksheet hand-off model assumes a **single curriculum-team pass** over the full 208-entry worksheet (Session 82+), not a per-tier handoff cadence. The curriculum team paces themselves over multiple sittings — they don't have to finish in one go.

Curriculum-team review depth can vary by tier:

- **§11 high-impact** deserves careful per-entry attention. Mistakes propagate widely.
- **§12 mid-tier** warrants attention but variance is acceptable. Most entries are routine `keep` calls.
- **§13 long-tail** is largely a noise filter. Rapid skim is fine for clear-drop singletons. Spend attention on the merge-candidate near-duplicate clusters that surface here (some long-tail concepts are actually near-duplicates of higher-tier canonicals that didn't get caught at tier-1/2 fill time).

This explicit framing is provided as **explicit permission to spend attention asymmetrically**, not as a constraint. Curriculum team reviews to the depth their judgment calls for.

---

## 6. Theme overlap convention

### The known overlaps

Three concept-vocab strings **share a vocabulary** with `thematicCategories` canonical strings under case normalization. Only `ecosystems` is exact-string identical; the other two overlap once both sides are lowercased (themes vocabulary uses Title Case canonical strings — `Ecosystems`, `Food Systems`, `Plant Growth` — per `src/utils/filterDefinitions.ts`).

| Concepts string (as `academicConcepts`) | Themes string (as `thematicCategories`) | Match type |
| --- | --- | --- |
| `ecosystems` — Science (73 appearances; canonical so far) | `Ecosystems` | Exact-string under `lower()`; case-normalized match |
| `food systems` — Social Studies (1 appearance) | `Food Systems` | Case-normalized match |
| `plant growth` — Science (9 appearances) | `Plant Growth` | Case-normalized match |

These overlaps surfaced from Session 77 TEST DB probes and are likely artifacts of the v3 batch-tagging run not enforcing a hard concept-vs-theme boundary. The themes-side vocabulary count and corpus distribution will be verified at themes worksheet time.

### How the worksheet handles them (per D-C5)

Per-value entries for the 3 overlap concepts flag `theme_overlap: YES — adjudication notes`. The adjudication (which side keeps the canonical string; whether both keep with cross-reference; whether one side renames) is **deferred to the themes worksheet / D4 canonicalization migration**, not resolved on this worksheet.

The 3 cases are too small to warrant a separate concept↔theme reconciliation pass. The right resolution depends on what the themes worksheet looks like — which doesn't exist yet. Flagging on the per-value entry preserves the signal for whoever does the cross-field reconciliation.

### What the flag captures

For each of the 3 overlap entries, the `theme_overlap` field has:

- `YES` marker so the parser surfaces these for cross-field downstream consumers
- A one-line note on the per-concept and per-theme corpus signal so the future reconciliation pass has the numbers
- Optional curriculum-team note on which side they think should keep the canonical string (advisory; not load-bearing)

The themes worksheet will mirror this convention on its side once it exists.

---

## 7. Merge_aliases convention

### What `merge_aliases` captures

`merge_aliases` is the list of **near-duplicate corpus strings** that should collapse into a single canonical concept. Each alias is a `(string, count)` tuple capturing the corpus literal and its current appearance count.

Examples (pre-handoff proposals; curriculum team confirms or refines):

- `plant_identification` canonical with `merge_aliases: [("identifying plants", 2), ("plant ID", 1)]`
- `seasonal_cycles` canonical might have `merge_aliases: [("seasonal change", 2), ("seasonal cycles", 6)]` if curriculum team picks "seasonal cycles" as the surface form (with "seasonal changes" 10 being a separate question — closer to canonical or also a merge candidate?)
- `adaptation` canonical might have `merge_aliases: [("adaptations", 5), ("plant adaptation", 1), ("plant adaptations", 1)]`

### Dual frequency on merge-candidate entries (D-C11)

When `merge_aliases` is non-empty, the `frequency` field surfaces **both pre-merge and post-merge counts**:

```
frequency: 5 as-tagged, 8 if aliases merge
```

Where:
- `5` is the count of corpus rows tagged with the canonical string itself (`plant identification`)
- `8` is the total after rolling in the alias counts (`plant identification` 5 + `identifying plants` 2 + `plant ID` 1)

Entries without `merge_aliases` show a single number: `frequency: 73 appearances`.

### Why dual count

It makes the curriculum team's decision-relevant data visible. They're choosing between "this concept has 5 lessons" and "this concept has 8 lessons after the proposed merge." If they reject the merge, the dual-count version requires no recalculation. The post-merge-only version becomes wrong if the merge is rejected.

### Distinguishing `merge_aliases` from `search_synonyms`

`merge_aliases` is **DB-level vocab cleanup** — it collapses near-duplicate canonical strings into a single canonical. This worksheet captures it.

`search_synonyms` is **end-user query expansion** — it maps user-typed everyday vocabulary (e.g., "leaves") to canonical concept slugs (e.g., `plant_parts`) for search matching. Per D-C10, that's a separate post-worksheet curriculum-team brainstorm session, not captured on this worksheet.

The distinction matters: `merge_aliases` affects what's stored in the DB; `search_synonyms` affects what's matched at query time. Don't conflate them.

---

## 8. Cross-subject convention

### The known cross-subject concepts (per Session 77 probe)

Eight concept strings appear under more than one of the 6 subject keys:

| Concept | Subject distribution (Session 78 probe) |
| --- | --- |
| `biodiversity` | Science (6), Social Studies (1) |
| `companion planting` | Science (10), Social Studies (3) |
| `historical figures` | Social Studies (68), Literacy/ELA (1) |
| `nutrition education` | Health (100), Science (7) |
| `observation` | Science (5), Arts (1) |
| `poetry` | Literacy/ELA (1), Arts (1) |
| `preservation` | Science (3), Social Studies (1) |
| `storytelling` | Literacy/ELA (75), Arts (1) |

### How the worksheet handles them (per D-C9 + D-C1)

Each cross-subject concept gets a **single canonical entry** with:

- `current_subjects: <all subjects (with counts)>` — surfacing the cross-subject signal.
- `recommended_primary_subject: <single subject>` — Claude's pre-handoff recommendation for the canonical subject home. Most cross-subject concepts have a clearly-dominant subject (e.g., `nutrition education` Health 100 vs Science 7).
- `recommended_secondary_subjects: <list or <none>>` — Claude's recommendation for subjects where the concept legitimately appears as a secondary lens. Per the schema-simplification investigation, 2–4 of the 8 cross-subject concepts have real lens distinction; the others are tagging artifacts.

The curriculum team confirms or refines both `recommended_primary_subject` and `recommended_secondary_subjects`.

### What does NOT happen on this worksheet

Per D-C9, this worksheet does **not** include a `per_lesson_override_signal` field for cases where individual lessons should override the subject home (e.g., `observation` Arts-side in an Arts lesson vs Science-side in a science lesson). The registry-level subject set (`recommended_secondary_subjects`) captures the cross-subject signal at a coarser grain. Per-lesson lens is a Stage 2 problem if it surfaces — Stage 2 re-tag can disambiguate at re-tag time.

### Why concept-first wins for cross-subject handling

Subject-first sectioning would have forced **two entries** for each cross-subject concept (one under each subject section), with two independent verdict calls. That would harden v3's tagging-artifact subject splits into canonical structure. Concept-first sectioning treats each cross-subject concept as **one canonical entity** with subject lens captured as an attribute — which matches the actual semantic shape (the concept doesn't change between subjects; only the lens does).

---

## 9. Curriculum-team review depth

(See §5 closing block for the per-tier review depth framing.) This section name is reserved in the scaffold for any additional curriculum-team-facing process guidance that surfaces during Session 79–81 fills. Keep it short.

For now, the load-bearing review-depth guidance lives in §5 and the introduction of each tier section (§11 / §12 / §13).

---

## 10. Parsing convention

When the worksheet is filled and ready for hand-off, the next-stage tool parses each per-value entry's labeled-line block. Parsing convention (adapted from heritage's §7):

```
- <field_name>: <value>
```

- `<field_name>` is a known field (canonical_label / verdict / frequency / current_subjects / recommended_primary_subject / recommended_secondary_subjects / merge_aliases / theme_overlap / claude_notes / curriculum_notes; plus `merge_into` for merge-verdict entries).
- `<value>` is field-typed (string / enum / list of tuples / etc.).
- Inline HTML comments (`<!-- ... -->`) are tolerated and stripped by the parser.
- The `<details>` block (Opus-corpus-read excerpts) is **not** parsed structurally — it is human reference / evidence.
- Section framing prose (§1–§10 + intra-tier framing in §11–§13) is **not** parsed — it is human reference / methodology.

**Skipped entries.** If a `verdict` line is `<to_fill>` or missing, the parser warns but does not fail. Unparsed entries are excluded from the canonical vocabulary output until filled.

**`<to_fill>` propagation.** Default state for new entries is `verdict: <to_fill>` and `curriculum_notes: <to_fill>`. Other fields may also start as `<to_fill>` for entries where Claude lacks confidence. The parser distinguishes `<to_fill>` (unfilled) from explicit-empty (`merge_aliases: <none>`).

**Identity-shaped aliases.** Unlike heritage's drift entries (where a kebab-case lowercase drift literal merges into its Title Case canonical, producing identity entries like `"asian" → "asian"` in `alias_map`), concepts has no parallel case-mixing drift problem in the v3 baseline — Session 77 probes confirmed zero case/whitespace drift. Concept `merge_aliases` are exclusively semantic near-duplicates (`plant ID` → `plant_identification`), not case-mixing variants. The parser does not need to filter identity-shaped entries on output.

**Output shape (handed to PR 5+ migration; subject to schema-migration decisions deferred per D-C2):**

```json
{
  "canonical": [
    {"key": "plant_parts", "label": "Plant Parts", "primary_subject": "Science", "secondary_subjects": []},
    {"key": "plant_identification", "label": "Plant Identification", "primary_subject": "Science", "secondary_subjects": []},
    ...
  ],
  "alias_map": {
    "plant ID": "plant_identification",
    "identifying plants": "plant_identification",
    "adaptations": "adaptation",
    ...
  },
  "drops": ["garden topics", "general exploration", ...]
}
```

**`alias_map` keys** are corpus literal strings (near-duplicate near-twins); **values** are canonical keys. The future migration (PR 5+) rewrites every `lessons.metadata.academicConcepts` row to canonical strings using this map; drops are deleted from the array.

---

## §11 High-impact tier — concepts with ≥ 10 appearances

> **Status: filled (32 of 32 entries).** Session 79 per-value fills landed in PR-Concepts-1 with Phase 1 upfront Opus batch evidence integrated as `<details>` blocks on 10 entries (cross-subject + near-duplicate cluster + theme-overlap cases). Awaiting curriculum-team verdicts on `verdict` and `curriculum_notes` fields.
>
> **Review depth (D-C15):** high. These concepts drive the bulk of the corpus's academic-integration signal. Mistakes here propagate widely.
>
> **Frequency cutoff calibratability:** the ≥10 cutoff was the Session 78 locked default; Session 79 confirmed the 32-entry count at fill time.

<!-- Per-value entries — Phase 2a (Session 79; entries 1–11 of 32). Subsequent phases 2b + 2c append below. -->

### `plant_parts`

- canonical_label: Plant Parts
- verdict: <to_fill>
- frequency: 239 appearances
- current_subjects: Science (239)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Highest-frequency concept in the corpus (239 lessons) and the canonical anchor for plant-anatomy content across grades K–5 (roots, stems, leaves, flowers, fruits, seeds). Pure single-subject home; no cross-subject signal and no near-duplicate drift in the v3 baseline. Related concepts `roots` (Science 2) and `root vegetables` (Science 3) are anatomically more specific concepts the corpus distinguishes from the generic `plant_parts` (not aliases). Recommend keep as canonical with surface label "Plant Parts".
- curriculum_notes: <to_fill>

### `cultural_traditions`

- canonical_label: Cultural Traditions
- verdict: <to_fill>
- frequency: 206 as-tagged, 208 if aliases merge
- current_subjects: Social Studies (206)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: [("family traditions", 1), ("international food traditions", 1)]
- theme_overlap: none
- claude_notes: Second-largest concept in the corpus and the canonical Social Studies content tag for "this lesson engages with a cultural practice, holiday, or food heritage" — used broadly across AAPI Heritage Month, Lunar New Year, Black History Month, Three Sisters, hummus, Aloo Gobi, Thanksgiving lessons. Both Social-Studies singletons in this cluster — `family traditions` (Tamales lesson, 1) and `international food traditions` (Fattoush lesson, 1) — are already dual-tagged with `cultural traditions` and read as pure narrowings of the parent concept (family-specific framing; programmatic-theme framing); safe to fold in as aliases. Note: `cultural narratives` (Literacy/ELA, 8) is intentionally NOT merged here — it stays as its own standalone Literacy/ELA canonical entry (Session 80, mid-tier) since 7 of 8 instances co-tag with `storytelling` and consistently center reading/writing/telling a culturally-rooted story (genuine literacy-side narrative-storytelling lens, distinguishable from the broad SS content tag).
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (10 lessons sampled across cluster members)</summary>

**`cultural traditions` (Social Studies; 206 total, 5 sampled):**

- `1vtacAdf80q9FyZ4dEEzWmVLdycRmgJ7_MSRbrweoGwA` **AAPI Heritage Month — Philippines & Lumpia**: "Students will continue to learn about AAPI heritage month with a lesson focusing on the Philippines… Students will also prepare lumpia, which is a popular Filipino recipe."
- `1B3Phuk-DzUJFDHJKfg9RPlolcBWMeaq6gwWRjOfhU9I` **Hoppin' John Burgers: Celebrating Black History Month**: "Students will make Hoppin' John burgers, then will read 'What If We Were All The Same,' and discuss how our differences are important."
- `1LIpgLeP6F2iRRUklhiZKEKNIJm4XNfwNuO67ilEgwEM` **Lunar New Year and Dumplings**: "Third stop on our cooking world tour, learning about dumplings in preparation for Lunar New Year."
- `0BxEc0RZeYtCicXRsbXUyaDNKSEU` **Thanksgiving in the Garden**: "Students will learn how Thanksgiving is tied to Native American agriculture and how Native Americans passed along their knowledge to colonial Americans…"
- `12afDXwtfouvdhbJWIlpB07gF2L-N0KDg9Ws_OXqcca0` **Aloo Gobi (3–5)**: "Students will learn to make a simple and delicious Indian dish known as Aloo Gobi. They will discuss trade and what it means to grow different ingredients in different climates."

**`family traditions` (Social Studies; 1, all surveyed):**

- `1zbfn_WweqPwJD_we1vyGzaVTVLRvtXOaICLEpKwHxjg` **Tamales** (dual-tagged with `cultural traditions`): "Students will define tradition and share food traditions from their family. Students will make tamales with bell pepper, onion, and tomato filling." — Pure family-specific narrowing of the parent concept.

**`international food traditions` (Social Studies; 1, all surveyed):**

- `1TUWRgAOk2dykAk6yzDOqf4nVxXtk5PL3oRyE9V-3wMk` **Middle Eastern Salad — Fattoush** (dual-tagged with `cultural traditions`): "Students will practice making Fattoush… They will explore the bounty of the late summer harvest and begin investigate this year's theme of international food traditions." — Programmatic-theme narrowing.

**Cross-cluster: `cultural narratives` (Literacy/ELA; 8 total, 4 sampled) — STAYS STANDALONE, not merged here:**

- `1XlUFSs_ls80ONwWgGCPHHA8re4kfmzgL` **The Three Sisters** (LE; `cultural narratives` + `storytelling`): "Students will read a version of the Three Sisters legend to understand how corn, beans, and squash help each other grow in the garden."
- `113uxucSb35_m5yZ2GQeRWlzEuDWivLJ_G5LNgOx_vRc` **Food Roots Lesson** (LE; `cultural narratives` + `storytelling`; also SS `cultural traditions` + `immigration stories`): "Students will listen to a food roots story read aloud… come up with their own food roots narrative…"
- `1qTGQcuxoW6erfUZvXAoFPaYeXnoMxf8dcjSdKNTRO8U` **Celebrating Georgia Gilmore: Pies from Nowhere** (LE; `cultural narratives` + `storytelling`; also SS `historical figures` + `civil rights movement`): biography read-aloud about the Montgomery Bus Boycott.
- `1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` **Hummus and Pita** (LE; `cultural narratives` + `storytelling` + `recipe reading`): "Students will read a story by a Palestinian author about olive trees…"

Co-tagging stats: 7 of 8 `cultural narratives` lessons also tag `storytelling`; 6 of 8 also tag SS `cultural traditions` (already double-coded across subjects).

</details>

### `nutrition_education`

- canonical_label: Nutrition Education
- verdict: <to_fill>
- frequency: 107 appearances (Health 100 + Science 7)
- current_subjects: Health (100), Science (7)
- recommended_primary_subject: Health
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Heavily asymmetric cross-subject split — Health-100 vs Science-7 — but the Science-7 is **not a coherent biology-of-nutrition cohort**; it's a tagging-artifact of how `academicConcepts` got populated when Health was absent from a lesson's `academicIntegration` array. 6 of the 7 Science-tagged rows are cultural-recipe lessons (Agua Fresca, All About Corn, Juneteenth, BHM: Ice Cream Heroes, Carbon Footprint Tacos, Plants as Medicine) whose other Science concepts are absent or unrelated. Only Glucose Regulation (1 of 7) is genuinely science-framed AND it is already double-tagged with Health, so consolidating to Health-only loses zero signal. Recommend consolidate to Health as sole canonical subject. If a future lesson genuinely teaches the biology of nutrition (digestion, metabolism, macronutrients), a distinct Science concept like `digestion` or `human body systems` is more appropriate than overloading `nutrition_education`.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (13 lessons across Health + Science — all 7 Science + 6 Health-only sample)</summary>

**Science-tagged cohort (all 7):**

- `12eCbV1wJMk_qL3DPKY3qaR_q_eu7CpojLr0tmJXHm5k` **Plants as Medicine**: "Students will make a tea bag of aromatic herbs to understand how plants have been used as medicine." `academicIntegration: ["Science","Social Studies"]` — no Health. Botany + cultural-medicine framing, not biology of nutrition.
- `14JtnclwiZhMFr_MxwL9pK9D1StoyIhElXZUZX-sngKI` **Carbon Footprint / Black Bean Tacos**: "Students will learn about the carbon footprint of animal vs. plant based foods… while making black bean tacos." Sustainability + recipe; nutrition_education tag incidental.
- `1bjiET8ffFpU5_gCMgJBiTDPuHhE0lCPGBnv72LXzrW4` **Black History Month: Ice Cream Heroes**: "history of the Black chefs who popularized ice cream… plant-based ice cream made with only bananas." History + recipe.
- `1gHg6aknsieTv59SaRFx0HJy9Zft4oKFdUXiX3MzCd8A` **Juneteenth**: "discuss Juneteenth, why many people eat red foods… make a red fruit salad." Holiday + recipe.
- `1OfOMGHJwRPuGSfoM4TQ1A4J2bLbs7EPh1t_83NNngME` **Glucose Regulation** (Science + Health): "Students will test how much glucose is in different foods and drinks." **The only genuinely-science-framed row** — already double-tagged with Health.
- `1UmWmKPM-RNKCwVU4p3HbroX3b90NHUDpT6E_grpguUI` **Agua Fresca**: recipe + culture lesson.
- `1xaMyZf2OTGpX2GAD8-qgYADXHw1vTevByfs1bJ55lNs` **All About Corn**: history-of-an-ingredient lesson.

**Health-tagged sample (6 of 100):**

- `1QiqNPrXEpDXt7Hmc8uMC8hWCSNfhi3qacbIuVzqZxZA` **Juneteenth and Cultural Awareness Through Cooking** (Health): same lesson genre as the Science-tagged Juneteenth above, but here `academicIntegration: ["Social Studies","Health"]` puts nutrition_education under Health. **Direct evidence the split tracks `academicIntegration`, not lesson content.**
- `1GmkjYCD6QLIreMRxv6ebg0K1oc5U9y43` **Green Smoothie & Black Bean Brownies** (Health): "examine the role of sugar in both plant and human nutrition… fiber and protein which balance out the sugar/energy rush." More biologically-framed than 5 of 7 Science-tagged rows, yet correctly Health-only.
- `1fScJvz-agCFPz1ycN-GLI2nw7G_xAorMMbJ7KTCbPKE` **Sweet Potato Fries: Lunch Club** (Health): pure recipe + healthy-snack framing.
- `1xAHtAr8-faQdQW0eEoA_CL1pcySGhzsWguOj9e5R3UQ` **Trail Mix at PS 96** (Health): "make trail mix… learn about healthy snacks…"
- `1dXzaZv3yFh5wlHxkkZPPCrQdJWsXT5-tvGA4CP3yNuY` **Do we Recognize these Logos?** (Health): food-marketing context.
- `1f_AqSOkZJxlDgEKca_ePV4ywfJRapbY8SYzWUytUefo` **Vegetarian Chili** (Health): cafeteria-recipe lesson.

**Cross-cohort overlap:** Of 100 Health + 7 Science rows, only **1** carries both tags (Glucose Regulation). Health is the dominant home (100 / 107 = 93.5%); the Science-7 is not a coherent biology-framed subset but a tail of cultural-recipe lessons whose reviewer-chosen `academicIntegration` excluded Health.

</details>

### `visual_arts`

- canonical_label: Visual Arts
- verdict: <to_fill>
- frequency: 76 as-tagged, 78 if aliases merge
- current_subjects: Arts (76)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: [("coloring", 1), ("craft activity", 1)]
- theme_overlap: none
- claude_notes: Canonical Arts content tag for lessons engaging visual creation (drawing, painting, collage, garden journaling, plant illustration). Two long-tail singletons surfaced from the Wave 3 vague-singleton scan should merge in: `coloring` (Arts, 1 — pre-drawn seed-map coloring on a row already co-tagged `drawing`, so the merge is lossless) and `craft activity` (Arts, 1 — paper-cutout construction of a winter "garden bed"; too vague to be canonical). Both are PK–K lessons. Related concept `drawing` (Arts, 9) is intentionally NOT merged — it remains its own mid-tier canonical entry (Session 80) as a distinct visual-arts technique. Recommend keep as canonical with surface label "Visual Arts".
- curriculum_notes: <to_fill>

### `storytelling`

- canonical_label: Storytelling
- verdict: <to_fill>
- frequency: 76 appearances (Literacy/ELA 75 + Arts 1)
- current_subjects: Literacy/ELA (75), Arts (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA content tag for narrative-comprehension and oral-sharing practices — picture-book read-alouds (*The Carrot Seed*, *Spring After Spring*), personal food-memory sharing, letter writing, cultural-narrative reading. The single Arts-tagged lesson ("Mr. Anthony's Spring Trees Unit") shows no distinguishably performative or theatrical lens — its summary is one sentence, body fields are empty, and `storytelling` is redundantly tagged under both subjects on the same row. Only 1 of 75 (1.3%) Literacy/ELA storytelling lessons also carries Arts:storytelling, and it is precisely this thinly-described row. No coherent performative-storytelling cohort exists in the corpus. Recommend consolidate to Literacy/ELA as sole canonical subject; reserve a distinct Arts concept like `dramatic performance` or `puppetry` if curriculum ever needs a genuine theatrical-storytelling lens.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (6 lessons across Literacy/ELA + Arts; co-occurrence stats from full 75-row population)</summary>

- `13REACG4YMxTiRNKer3COca2quFvSlb1a` **Mr. Anthony's Spring Trees Unit** (Arts AND Literacy/ELA): summary is one sentence — "Students will learn all about Spring Trees!" No body fields populated. `academicConcepts` carries `storytelling` redundantly under both `Arts: ["visual arts","storytelling"]` and `Literacy/ELA: ["storytelling","vocabulary development"]`. The Arts tag is not paired with any performative/theatrical concept; it sits next to `visual arts`. **This is the only lesson in the corpus carrying Arts:storytelling.**
- `1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` **Hummus and Pita** (LE): "Students will read a story by a Palestinian author about olive trees in Palestine and how hummus is an important food in Palestinian culture…" Narrative/comprehension lens.
- `1pIcyAiQqaFTZTDsU6TR5G3sRyo_EmsVH` **Food Memories** (LE): "Students will share a food memory… use sensory language to describe what they smelled, heard, felt and tasted." Personal-narrative + ELA vocabulary work.
- `1uV2W6gUUZMDDM4VlhghIJ9w4GoLHpd1_` **Women's History Month: Alice Waters** (LE): "Students will write letters to Alice…" Composition + biographical reading.
- `1Ebh6tFUdUgk3BwowZPq-JCvADMo2SOff` **Women's History Month: Rachel Carson** (LE): "*Spring After Spring* will be read aloud…" Picture-book read-aloud.
- `1nHQfqeyaGR6lr0zGuanfS_SFTzlPWNh2` **The Carrot Seed** (LE): canonical picture-book read-aloud — textbook narrative-comprehension use.

**Co-occurrence stats (full 75-lesson LE storytelling population, `retired_at IS NULL`):**

- 75 lessons tag `storytelling` under Literacy/ELA.
- 20 of 75 (27%) also carry some Arts concepts in `academicConcepts.Arts` (e.g., `visual arts`) — but those Arts arrays are for other concepts.
- Only 1 of 75 (1.3%) also carries `storytelling` under Arts — the Spring Trees row.
- The performative-lens hypothesis (puppetry, drama, oral-tradition-as-performance distinct from narrative reading) finds zero supporting evidence in the Arts:storytelling row or in the broader corpus.

</details>

### `ecosystems`

- canonical_label: Ecosystems
- verdict: <to_fill>
- frequency: 73 appearances
- current_subjects: Science (73)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: YES — `ecosystems` (concepts, Science 73) is **exact-string identical** to `Ecosystems` (themes, Title Case canonical per `src/utils/filterDefinitions.ts`) under `lower()`. This is the only exact-string concept↔theme collision in the corpus (the other two case-normalized overlaps — `food systems` / `plant growth` — are not exact-string). Per D-C5, adjudication (which side keeps the canonical string; whether both keep with cross-reference; whether one side renames) is deferred to the themes worksheet / D4 canonicalization migration. Flag preserves the signal for the future reconciliation pass.
- claude_notes: Canonical Science concept covering food webs, habitat interdependence, biodiversity, and ecological-systems thinking. No near-duplicate drift within the Science concepts vocabulary; related concepts `food webs` (Science, 11) and `biodiversity` (Science, 6 + Social Studies, 1) are intentionally distinct (food webs = trophic-level focus; biodiversity = species-diversity focus). The only complication is the theme-overlap flag — `ecosystems` shares an exact-string vocabulary with `thematicCategories: Ecosystems`. Resolution defers to the themes worksheet per D-C5; this entry surfaces the signal and recommends keep as Science canonical pending that reconciliation.
- curriculum_notes: <to_fill>

### `recipe_reading`

- canonical_label: Recipe Reading
- verdict: <to_fill>
- frequency: 69 appearances
- current_subjects: Literacy/ELA (69)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA content tag for reading a recipe as procedural text — students follow ordered instructions, decode ingredient lists, and use the recipe as a comprehension/decoding artifact while cooking. Confirmed across 5 sampled lessons spanning grades K–5. Two related Literacy/ELA concepts intentionally stay standalone (Session 80, mid-tier): `recipe_writing` (LE, 2) — students *compose* their own recipes drawing on personal/cultural knowledge — and `recipe_selection` (LE, 1) — students *vote among* their designed recipes as an evaluation/decision-making practice. The three represent distinguishable literacy moves (comprehension vs. composition vs. evaluation), not a single canonical with aliases. Note also: `recipe_scaling` (Math, 3) is a separate Math-side concept (fractions/ratios for scaling), **not** part of this Literacy/ELA family.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (10 lessons across recipe-reading + sibling LE concepts + recipe_scaling Math comparison)</summary>

**`recipe reading` (Literacy/ELA; 69 total, 5 sampled):**

- `1l6irtaLAUCwJKUVzi0mFwnVsFrsYpdBmLqOgHZ7RKSk` **Garden on a Cracker**: "Students will discuss what can be found in a garden and assemble a 'garden' on a cracker… work together to follow a recipe to make a simple bean dip…" Recipe-as-procedural-text.
- `1SXGRa4IWP5stnCgUctK5H7kp2gYIzTWbex4yWNbJzqI` **Pearsauce/Applesauce (3K/PreK)**: "Students will be able to name their favorite fruits and follow along with a recipe." Earliest-grade follow-the-recipe practice.
- `15MzdlSDCvHEWEDsD83ukH9Y49qj-MNcfdjtcpdAna3w` **Following Instructions**: "Students will practice following instructions and work together to complete a recipe… practice knife skills and follow the steps of a recipe." Framed explicitly as instructions-following.
- `1bSSPsUhFEcR1eFzEB9_PvsoANMmvNhTXYxePmhRQ0lI` **Vegetable Whole Wheat Pasta**: cooking lesson with multi-step recipe execution.
- `1VopeukPABPXfPNpelqpzrVTnBmj-KMauFyeZ68a62BQ` **Summer Veg Saute (Knife Cuts Part 2)**: recipe as procedural anchor for knife-skills practice.

**`recipe writing` (Literacy/ELA; 2 total, both surveyed — standalone canonical, not merged here):**

- `19CMwluTwweSei-u_gCvoerBrGG839U_Al7a4ORiZKa8` **Fruit Salad Challenge**: "Students will compete in teams to make the best fruit salad…" Team-based composition of an original recipe — distinct from reading an existing one.
- `167u70cUC4N1EJ9H-9IAl1c4J7zGZ6Ta_LOvDStgqGks` **Foods From Around the World: Recipe Design**: "create their own recipe, using their personal knowledge and their learning in this unit." Explicit recipe composition.

**`recipe selection` (Literacy/ELA; 1 total — standalone canonical, not merged here):**

- `1nNPA0q0yh9gE_Qz7Nx5_jmUIqhkOAOWrISWtv7pYLs4` **Foods From Around the World: Final Vote**: "Students will vote on their recipe for their final class of the year and start seeds for that recipe." Companion to the Recipe Design lesson — evaluation/decision-making practice (also CASEL "responsible decision-making").

**`recipe scaling` (Math; 3 total, 2 sampled — separate Math-side concept, NOT part of this Literacy/ELA family):**

- `1jfFP2nKtAti3HQZzX2Fi9X72M8BZ02uX` **Equivalent Ratios** (Math): "Students will calculate equivalent ratios to complete a recipe to feed the whole class." Math computation using a recipe as context.
- `1_rHQ9aGoFQkgrM1ebgtqo5o6ZjJqXAoA` **Green Room Party** (Math): math (likely scaling) precedes recipe execution.

</details>

### `historical_figures`

- canonical_label: Historical Figures
- verdict: <to_fill>
- frequency: 69 appearances (Social Studies 68 + Literacy/ELA 1)
- current_subjects: Social Studies (68), Literacy/ELA (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: The Social Studies / Literacy/ELA split is almost certainly a v3 batch-tagging inconsistency, not a genuine cognitive-lens distinction. The Social Studies cohort (68 lessons) covers historical individuals as agents of cultural, civic, or scientific change — Cesar Chavez, George Washington Carver, Black History Month figures, ancient civilizations' staple-crop architects, LGBTQ activists — and that lens (people-as-history-makers) is the canonical home. The single Literacy/ELA outlier ("In the Garden with Dr. Carver") teaches the SAME historical figure (Carver) via picture-book read-aloud; a separate Social-Studies-tagged lesson ("Lotion & Agar Soap — K") on the same person sits cleanly under Social Studies. If "biographical reading comprehension" were a distinct ELA lens, we would expect dozens of similar lessons, not one. Recommend consolidate `historical_figures` to Social Studies as sole canonical subject; the read-aloud-of-biography dimension is already captured by `storytelling` under Literacy/ELA. Note related concept `historical_context` (Social Studies, 1) — likely also a candidate `keep` or `merge into historical_figures`, deferred to Session 81 (long-tail review).
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (7 lessons across Social Studies + Literacy/ELA)</summary>

- `13biNspAVeUukqY_WNu7jN4CQKydttOt7OR85dnY3EFw` **In the Garden with Dr. Carver** (Literacy/ELA — sole non-SS row): "Students will read a story about plant scientist Dr. Carver and then will do a garden job… Students will learn about an exemplary Black scientist, gardener, and leader whose work and knowledge contributes to our garden today." Co-tagged `storytelling` under LE. K-grade read-aloud biography.
- `1f1FVc2FsYYwFtCFWDRAxSfsT3BcPC1E5` **Lotion & Agar Soap — K** (Social Studies — SAME person, Carver): "Students will create two cosmetics recipes & make connections to Dr. George Washington Carver…" **Direct evidence the LE/SS split is tagging-artifact, not lens distinction — same person, different subject tag.**
- `1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU` **Farm Workers & Pesticides** (SS): "Students will read a story to learn about how pesticides negatively affect farm workers and learn about the activist work of Cesar Chavez…" Civic/activist-figure lens; note also involves "read a story" but is tagged SS.
- `1QiqNPrXEpDXt7Hmc8uMC8hWCSNfhi3qacbIuVzqZxZA` **Juneteenth and Cultural Awareness Through Cooking** (SS): holiday-anchored historical-events lens.
- `1uDDPxAKSjEPYMU36W80bEbSMa_YuuGPNw62CXFGD6hM` **Hoppin' John Burgers: Celebrating Black History Month** (SS): cultural-contributors-as-historical-figures lens.
- `1Bu7pmpP3oDfpHBPwCaroz3gpJokwB3TjZfkJUKYzk-k` **The Tradition of Lesbian Potlucks** (SS): movement-figures / community-history lens.
- `0BzCUl-9h7sgEVHdwcE9LZlJxRXM` **Staple Foods: Amaranth** (SS): "NYS Social Studies 2.3a: Understand the roles and contributions of individuals and groups to social, political, economic, cultural, scientific, technological…" Standards-anchored.

</details>

### `measurement`

- canonical_label: Measurement
- verdict: <to_fill>
- frequency: 66 appearances
- current_subjects: Math (66)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Highest-frequency Math concept in the corpus (66 lessons; ~44% of all Math concept appearances). Canonical Math content tag for measurement skills (length, volume, weight, temperature, time, area, perimeter — typically in cooking and gardening contexts). Closest related Math concepts — `weight` (1), `volume` (2), `area` (1), `perimeter` (1) — are anatomically more specific and corpus-distinguished from the generic `measurement` tag (not aliases). Recommend keep as canonical with surface label "Measurement".
- curriculum_notes: <to_fill>

### `vocabulary_development`

- canonical_label: Vocabulary Development
- verdict: <to_fill>
- frequency: 59 appearances
- current_subjects: Literacy/ELA (59)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA content tag for vocabulary-building activities — naming, defining, expanding word knowledge in cooking and garden contexts. Pure single-subject home; no cross-subject signal and no near-duplicate drift in the v3 baseline. Related LE concepts (`reading comprehension` 6, `descriptive language` 1, `figurative language` 1, `sensory details` 1) are distinguishably different literacy practices, kept separate. Recommend keep as canonical with surface label "Vocabulary Development".
- curriculum_notes: <to_fill>

### `geography`

- canonical_label: Geography
- verdict: <to_fill>
- frequency: 56 appearances
- current_subjects: Social Studies (56)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies content tag for lessons engaging with regional/national/global geography — typically tied to "where this food/ingredient comes from" framing. No cross-subject signal and no near-duplicate drift in the v3 baseline. Related concepts `map reading` (Social Studies, 1) and `trade routes` (Social Studies, 16) are distinguishably narrower practices kept as separate canonicals. Recommend keep as canonical with surface label "Geography".
- curriculum_notes: <to_fill>

<!-- Per-value entries — Phase 2b (Session 79; entries 12–22 of 32). -->

### `decomposition`

- canonical_label: Decomposition
- verdict: <to_fill>
- frequency: 47 appearances
- current_subjects: Science (47)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering composting, organic-matter breakdown, microbe activity, and nutrient cycling in soil — typically tied to school-garden compost programs. No cross-subject signal; no near-duplicate drift in the v3 baseline. Related concept `microorganisms` (Science, 3) is distinguishably narrower (microbe biology) kept as separate canonical. Recommend keep as canonical with surface label "Decomposition".
- curriculum_notes: <to_fill>

### `soil_science`

- canonical_label: Soil Science
- verdict: <to_fill>
- frequency: 44 appearances
- current_subjects: Science (44)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering soil composition, soil health, soil layers, soil organisms, and soil-plant interactions. Related concept `soil` (Science, 1) is a likely long-tail alias candidate (deferred to Session 81 evaluation); too thin a singleton to confirm direction now. Recommend keep as canonical with surface label "Soil Science".
- curriculum_notes: <to_fill>

### `life_cycles`

- canonical_label: Life Cycles
- verdict: <to_fill>
- frequency: 43 as-tagged, 45 if aliases merge
- current_subjects: Science (43)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: [("growing cycles", 1), ("growth patterns", 1)]
- theme_overlap: none
- claude_notes: Dominant canonical (43 lessons) spanning the full life-cycle territory ESYNYC teaches: plant life cycles (seed-saving, seed-starting, seasonal growing, "Anywhere Farm"), animal life cycles (butterfly metamorphosis, bees in "Bee Habitat"), and integrated plant-and-animal lessons. The two long-tail singletons in this cluster are alias drift: `growing cycles` (Spring and Summer Plants — origins of seasonal plants) and `growth patterns` (Up, Down and Around — how plants grow in different directions) are both about plant development over time, which the `life_cycles` canonical already covers. No semantic distinction beyond label phrasing.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (7 lessons across cluster members)</summary>

**`life cycles` (43 total, 5 sampled):**

- `1QNvw2_DVlrd8079Jwgyfb8jQzjho1Ut5` **Animal Life Cycles and Adaptations**: "Students will learn about animal life cycles and adaptations, create animal adaptation cards, and examine butterfly life cycles and adaptations."
- `1WKXLADkrfgZ7462f3JKfHNV-trHtuNtmo3i6Gq-PqeA` **Butterflies**: "Students will learn about the Butterfly Life Cycle and a little bit about butterflies generally (what do they eat, where do they live)…"
- `1ejnMz5mRDOi4NIPakPgEpKCKpnPz7yx-SAg07-FlTr4` **Edible Flower Collages & Salad**: "Students will collect a variety of natural textures and colors in the garden, explore the life cycles in plants and animals, and make an edible flower collage and salad."
- `1k7KqowpILVoRe-X0sOiOtcwJyC8_fJ17nwLu-DW5_r4` **October Seed Saving**: "Students will understand the importance of seed saving throughout history, and they will learn how to save their own seeds from the garden."
- `1NF_sOLKR8um-3T9Eck-_i6j-GEwv0X58TqqJk2Qu350` **Expert's Guide to Gardening: Seed Starting**: "Students will start seeds indoors. Students will then write and illustrate a how-to guide about seed starting."

**`growing cycles` (1, all surveyed):**

- `1zQSzYL0c5Txt5RPNtL4RRU0xSmxuA4VdR8YVHcPcUAY` **Spring and Summer Plants** (tagged-as: `growing cycles`): "Students will learn about the origins of two plants: one typically grown in the spring and another that is typically grown in the summer. Students will understand why each plant is grown during different seasons." — Plant-developmental subset of life cycles.

**`growth patterns` (1, all surveyed):**

- `1jKHsDt0dglFBOn5eWUszoH9nGjpBqRrbAompJYr36tk` **Up, Down and Around** (tagged-as: `growth patterns`): "Students read *Up, Down and Around* and then will cycle through the greenhouse to identify all the different ways plants, fruits and vegetables grow." — Plant-developmental subset of life cycles.

</details>

### `plant_needs`

- canonical_label: Plant Needs
- verdict: <to_fill>
- frequency: 41 appearances
- current_subjects: Science (41)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering what plants require to live and grow (sun, water, soil, air, nutrients). High-frequency standalone with no near-duplicate drift in the v3 baseline. Related concept `plant nutrition` (Science, 2) is distinguishably narrower (specifically nutritional uptake) kept as separate canonical. Recommend keep as canonical with surface label "Plant Needs".
- curriculum_notes: <to_fill>

### `immigration_stories`

- canonical_label: Immigration Stories
- verdict: <to_fill>
- frequency: 34 appearances
- current_subjects: Social Studies (34)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies content tag for lessons engaging immigrant food/family/cultural-transmission narratives — typically paired with `cultural traditions` (e.g., Food Roots Lesson, Hummus and Pita, food-worker history lessons). High-frequency single-subject home; no cross-subject signal and no near-duplicate drift. Recommend keep as canonical with surface label "Immigration Stories".
- curriculum_notes: <to_fill>

### `healthy_choices`

- canonical_label: Healthy Choices
- verdict: <to_fill>
- frequency: 30 appearances
- current_subjects: Health (30)
- recommended_primary_subject: Health
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Health content tag for lessons engaging student decision-making about food and lifestyle (snack choices, water-vs-sugary-drinks, balanced plates, food-marketing analysis). High-frequency single-subject home; no cross-subject signal. Related concept `hydration` (Health, 1) is distinguishably narrower (specifically water intake) kept as separate canonical. Recommend keep as canonical with surface label "Healthy Choices".
- curriculum_notes: <to_fill>

### `pollinators`

- canonical_label: Pollinators
- verdict: <to_fill>
- frequency: 28 appearances
- current_subjects: Science (28)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering bees, butterflies, hummingbirds, and pollination biology — typically tied to "bee habitat" and "pollinator gardens" lessons. No cross-subject signal; no near-duplicate drift in the v3 baseline. Distinct from related concepts `beneficial insect identification` (Science, 1) — more specific entomology lens — and `biodiversity` (Science, 6 + Social Studies, 1). Recommend keep as canonical with surface label "Pollinators".
- curriculum_notes: <to_fill>

### `counting`

- canonical_label: Counting
- verdict: <to_fill>
- frequency: 20 appearances
- current_subjects: Math (20)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math content tag for early-grade counting and number-recognition activities — typically counting seeds, vegetables, plates, or recipe ingredients in PK–2 lessons. Related concepts `tallying` (Math, 1) and `categorization` (Math, 1) are distinguishably different early-Math practices, kept as separate canonicals. Recommend keep as canonical with surface label "Counting".
- curriculum_notes: <to_fill>

### `data_collection`

- canonical_label: Data Collection
- verdict: <to_fill>
- frequency: 19 appearances
- current_subjects: Math (19)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math content tag for data-collection practices — typically recording plant growth measurements, taste-test responses, or class poll results. Related concepts `graphing` (Math, 3) and `sorting` (Math, 1) are downstream data-handling steps, kept as separate canonicals. Recommend keep as canonical with surface label "Data Collection".
- curriculum_notes: <to_fill>

### `water_cycles`

- canonical_label: Water Cycles
- verdict: <to_fill>
- frequency: 17 appearances
- current_subjects: Science (17)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering the water cycle (evaporation, condensation, precipitation, runoff) — typically tied to garden-irrigation and weather-pattern lessons. No cross-subject signal; no near-duplicate drift. Note: corpus label is plural ("water cycles") — preserved as canonical surface label per worksheet convention of mirroring the dominant corpus form. Curriculum team may prefer singular "Water Cycle" given the singular phenomenon; flagged as a low-stakes surface-label call.
- curriculum_notes: <to_fill>

### `trade_routes`

- canonical_label: Trade Routes
- verdict: <to_fill>
- frequency: 16 appearances
- current_subjects: Social Studies (16)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies content tag for lessons engaging historical trade and food-origin geography — typically tied to "where this ingredient came from" mapping (Silk Road, Columbian Exchange, transatlantic food movements). Closely related to `geography` (Social Studies, 56) but distinguishably narrower (specifically trade-route history). Recommend keep as canonical with surface label "Trade Routes".
- curriculum_notes: <to_fill>

<!-- Per-value entries — Phase 2c (Session 79; entries 23–32 of 32). End of §11. -->

### `estimation`

- canonical_label: Estimation
- verdict: <to_fill>
- frequency: 15 appearances
- current_subjects: Math (15)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math content tag for estimation practices — typically estimating quantities (seeds per packet, vegetables per garden bed), times (cooking durations), or measurements (cup-equivalents) in cooking and gardening contexts. No cross-subject signal; no near-duplicate drift. Closely related to `measurement` (Math, 66) — used together when students estimate then measure precisely. Recommend keep as canonical with surface label "Estimation".
- curriculum_notes: <to_fill>

### `community_systems`

- canonical_label: Community Systems
- verdict: <to_fill>
- frequency: 15 as-tagged, 17 if aliases merge
- current_subjects: Social Studies (15)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: [("community", 1), ("community building", 1)]
- theme_overlap: none
- claude_notes: Canonical Social Studies content tag — currently a broad civic/structural bucket combining several sub-lenses: farm and food workers (Cesar Chavez, Booker T. Whatley's CSA, School Food Heroes), food and environmental systems (food-system environmental impact, watersheds, biodiversity, the Lorax debate), community gardens and food justice, and community membership norms. The unifying thread is "systems thinking applied to community + food + environment." Two singletons fold in cleanly: `community` (Social Studies, 1 — Mural Painting 101: public-space ownership) and `community building` (Social Studies, 1 — Meet the Green Room: classroom welcoming/SEL) — neither has corpus depth to stand alone. **Note: a third related singleton `community activism` (Social Studies, 1 — Guerilla Gardening for Birds) is intentionally NOT merged here** — it redirects to merge into the existing canonical `advocacy` (Social Studies, 3 — Food System Advocates, Lorax Debate), since `community activism` is a near-synonym for `advocacy` rather than a sub-lens of `community_systems`. Stage 2 may want to sharpen the boundary between `community_systems` / `food systems` / `environmental justice` — those concepts currently overlap in their corpus usage.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (18 lessons sampled across cluster + related concepts)</summary>

**`community systems` cluster (15 lessons, all sampled):**

- `1Bk8XOVO3OD7eEVsdHZc7fgpAdlmJHDHR` **Who Grew Your Lunch?**: "Students will read narratives to learn more about the farmers and workers who grow our food." [farm workers / food system]
- `1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU` **Farm Workers & Pesticides**: "Students will read a story… learn about the activist work of Cesar Chavez…" [farm workers / food system / activism]
- `1exshEQcKwxp6NmN2FbKX010ds55NMaohartd8NV4cEc` **Booker T. Whatley's CSA**: "Booker T. Whatley… pioneering of the CSA (Community Supported Agriculture) model…" [food system / CSA]
- `1nbnwFytunU5eIfH7IpqfM1wXrqEeU6marG3o6lOBJdM` **School Food Heroes**: "the work that school food workers do…" [food system workers]
- `1HuffJuy_-bVzIAm4GxzBhG3gOtiRoAKBBapswfhZrCg` **Seed Bursts**: "community garden activists and make their own to plant in their communities." [community gardens / activism]
- `1F9HMi267ePLvdQUys_rOe1wuna6NhP9ScssgXA4gufE` **Natural Resources and Our Garden**: conservation framing. [environmental system]
- `1V1Ho1hoyHjHI9Zs2N_MudkOxRwi2g8pI60txN_1DsNU` **Environmental Impact of the Food System** (also tagged `environmental justice`): "explore the environmental impact of different kinds of foods…" [food system + env-justice]
- `1--zJNW0DZBiogPJvNw65XQlItZ7h2FHelNrHPFNK3Yw` **Community Gardens & Food Justice**: "introduced to food justice by learning about community gardens…" [food justice / community gardens]
- `1TcLFx4PqfwvY7BL6hZApm039rPpWF9HENeQAXLsmt8I` **Introduction to Photovoice**: "Food Photovoice Project." [food-narrative civic action]
- `1ASkYeKJRJaQrSFlqQU3BStblC4tIVgBXUFystjahWh0` **Watersheds**: "examine different watershed models and observe how different land uses affect water quality…" [environmental system]
- `1raRGSNW74_POCDLaJAgLk7ct7uqvSkzjqWy3bWbZFYM` **Along the River!**: water-system protection. [environmental system]
- `18sSQUw48YOS12Egcpbk-N4MR3HjN-CnaoI64nzoEElM` **School Lunch Heroes**: school food workers. [food system workers]
- `1bVDe707ybEfXjRhURKAmvdArp200ufJDnAxp3xx_qzw` **The Lorax Debate** (CO-TAGGED with `advocacy`): "read Dr. Seuss' Lorax and learn about the importance of advocacy…" [community systems + advocacy CO-TAG]
- `1dHNasB4vEvH8G_OIy5Y7kVTOjXSovx_qLUGVB2UYk-M` **BIODIVERSITY**: "story of the 3 sisters and learn about biodiversity." [environmental system]
- `0BwC8Pf3ZwAXjS3JwZUFpbVlETzA` **Our Garden and Kitchen Community**: "different members in the garden community… become active members…" [community membership norms]

**`community` singleton:**

- `13jE3-XsWBgxZpiSFB0MDFxur3HGv_zAxqzstYDhhuaI` **Mural Painting 101: Beautifying the Garden** (tagged-as: `community`): "using art to take ownership of and take care of public spaces…" — public-space ownership; pure narrowing.

**`community building` singleton:**

- `17MEeMT7CWyareeKsrPFyDfeURWMrYCNMjmVMVBTobX0` **Meet the Green Room** (tagged-as: `community building`): "Students will be welcomed to ESYNYC programming, go over class expectations and work collaboratively to brainstorm…" — classroom norms / welcoming (SEL-adjacent). Weakest fit of the merge candidates; alternative is to drop the concept tag entirely on this single lesson rather than promote a singleton.

**`community activism` singleton — REDIRECTED to merge into `advocacy`, NOT this canonical:**

- `1zcUU8ZGOM2kU1pTPPm9K-QccEVQTmhURBp6uLnzKhVs` **Guerilla Gardening for Birds** (tagged-as: `community activism`): "make seed bursts to grow bird-friendly plants in their neighborhood, learning about the importance of habitat and the role they can play to make New York City a better home for birds." — neighborhood civic action / direct action; structurally parallel to `advocacy` (3) lessons (Food System Advocates, Lorax Debate), not to `community_systems`.

**Related concepts surveyed for boundary context (kept as separate canonicals):**

- `1ooeavtd1AUn9ZlM9vDS9J9g3rBvRQJ48Hk4lhTzlDw4` **Food System Advocates** (tagged-as: `advocacy` + `social justice issues`)
- `1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk` **Food System Advocates (Part 1)** (`advocacy` + `social justice issues`)
- `1pnHqm6JGB5AATRIGyU3KHeeUhKlbR7KvQXFQRxm45gA` **Food Debates** (`environmental justice` + `food systems`)

</details>

### `seeds`

- canonical_label: Seeds
- verdict: <to_fill>
- frequency: 13 appearances
- current_subjects: Science (13)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Broad general-purpose Science concept covering seed anatomy and parts (e.g., "Seed Maps" dissecting a lima bean), what seeds need to grow, edible seeds (e.g., "Cooking with Seeds: Ful Medames", "Lentil Wraps"), seed sorting, seed saving and the origins of agriculture, and planting seeds in the garden. Two adjacent concepts intentionally stay standalone rather than merging in: `seed dispersal` (Science, 3) — distinct ecological lens (water/wind/animal-attachment mechanisms; all 3 lessons are model-building exercises) — and `seed starting` (Science, 1) — distinct propagation/germination concept (pre-germination for transplant). All three are different scientific lenses on seeds; each gets its own canonical entry (`seed_dispersal` in Session 80 mid-tier; `seed_starting` in Session 81 long-tail).
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (13 lessons across cluster — all members sampled)</summary>

**`seeds` (13 total, 9 sampled):**

- `19OW9S7QbgkM_XtHaYS-qOqrQi37ILPbe` **Seeds**: "Students will learn a dance to show what seeds need to grow and remove seeds from pods or fruits to save them."
- `1OEkfD4RFpBGO3ThBUEyThjjgZtypepfB` **Seed Maps**: "Students examine different kinds of edible seeds, dissect a lima bean, and color in a picture of all the parts of a seed." [anatomy]
- `1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE` **Cooking with Seeds: Ful Medames**: "Students will make connections to seeds that they eat, then work together to make ful medames, an Egyptian breakfast dish." [edible seeds]
- `1z8haBSaUGDcZj8oJZm1GewvY6q9yqViChbrNxHpdRIQ` **Lentil Wraps**: "lentil wrap and discuss plant based proteins and signs of spring." [edible seeds / legume]
- `1zJ9YkEXYPu4YVOJTwGJsYT2iUOUSYYhq` **Seed Mosaics**: "how a seed grows and will make seed mosaics."
- `1oUCj2ax8d4JEgo-jveknC3gR3Q4kKUju03WTIt9EMvc` **Seed Saving and the Neolithic Revolution**: "origins of agriculture and seed saving…" [seed saving]
- `1kFyghgNIAzktCjT5kRijYKY3qtg--4NS` **Seed Sorting, Greater Than or Less Than**: "sort seeds into groups based on their physical type…" [classification]
- `1el1EApCZrr5y0a0yR1iYEdaZ23IMDEif` **Tropical Seeds**: "continue sowing seeds in the garden and learn that some tropical seeds are used to make cookies." [planting + edible]
- `1VKc93F8VynYic-8QfH1o0gqyamu4d5ciD05_MiLPvYA` **Plant Part Puzzles**: "Students will plant seeds outside." [planting]

**Adjacent canonicals (kept standalone, not merged):**

- `seed dispersal` (Science, 3 — all 3 are model-building lessons on water/wind/animal-attachment dispersal mechanisms; distinct ecological lens). Sample: `1_WlZmDJv8Ql-sCLlOyxr2qL4zeb1GQda` **Seed Dispersal** ("Students build models of seeds that can float in water, float through the air, or attach to animals.")
- `seed starting` (Science, 1 — Foods From Around the World: Final Vote — "start seeds for that recipe"; propagation/timing concept distinct from generic planting).

</details>

### `companion_planting`

- canonical_label: Companion Planting
- verdict: <to_fill>
- frequency: 13 appearances (Science 10 + Social Studies 3)
- current_subjects: Science (10), Social Studies (3)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Tagging-artifact cross-subject split. Companion planting is fundamentally an agronomic concept (intercropping plants whose biology benefits each other — the corn/beans/squash mutualism). All 13 lessons cluster tightly around one corpus theme: 11 are Three-Sisters / Lenape / Squanto Indigenous-agriculture lessons, plus 1 generic "Planting in Patterns" garden-pattern lesson, plus 1 cooking variant. The Science / Social Studies split reflects reviewer inconsistency rather than genuine cognitive-lens difference — identical lesson templates land on opposite subjects ("3 Sisters Tacos" → Social Studies vs "Three Sisters Tacos" → Science; "3 Sisters Dip" → Social Studies vs "Three Sisters Soup" → Science). The cultural/historical framing is already captured on these same rows by Social-Studies concepts `cultural traditions`, `Native American history`, `historical figures`, `colonialism's impact`, plus `culturalHeritage` tags. Recommend consolidate all 13 occurrences under Science as the canonical subject; Indigenous-agriculture context is preserved on the rows by the co-present Social-Studies concepts.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (13 lessons across Science + Social Studies — 10 Science, 3 Social Studies, 0 overlap)</summary>

**Science cohort (10 lessons):**

- `0BwC8Pf3ZwAXjMmRRd0xWTUQ0U1U` **Squanto's Ad Agency**: "agricultural techniques he taught the English…"
- `0BwC8Pf3ZwAXjVTZsQVBuMUs3T2M` **The Lenape Farmers and Skits**: "agricultural techniques they used…"
- `1XlUFSs_ls80ONwWgGCPHHA8re4kfmzgL` **The Three Sisters**: "understand how corn, beans, and squash help each other grow in the garden." [explicit biological-mutualism framing]
- `1l2xxZKHe1VxKG9RovqhaqrVjoz1VOnsy-pObtCqqGV4` **Planting in Patterns** (Science-only, sole non-Three-Sisters lesson): "design their own patterns, then plant in patterns in the garden." **The ONLY row with `companion planting` and NO Social-Studies tags — confirms the agronomic-not-cultural reading when stripped of Three-Sisters framing.**
- `1zrWJ0unlwyo7hjeb9ZG2betTOIaitwzN` **Three Sisters Soup**: "highlights the agricultural method of companion planting." [explicit "agricultural method"]
- `1AVz6xA4ZJO7mT3oWSJ2unIiY0APuj9yg` **Middle School Three Sisters Soup and Forage Salad**: same explicit "agricultural method" framing.
- `13uPiVU50hQcj_Ho1vEhfJmVeK8BFTqb-0BdHmx-wIdg` **Three Sisters in the Kitchen**
- `1hlnX5VDqvm83un6VT_B_OpJ08bZ9uN-KlS_lVYkqOE8` **Lenape Farming Techniques**: row also has `soil science` — pairing with another agronomic concept reinforces Science lens.
- `1VYlTlYBqXiaIa1Tu9d9ZX8dI9YtYETH35bhDl8W3fgA` **Three Sisters Pupusas and Curtido**
- `1fNjAzV9JZhGsVCvQZui8jtoSfcSBEiNkU9yhTg55lEQ` **Three Sisters Tacos**: nearly identical to the Social-Studies-tagged "3 Sisters Tacos" below — **smoking gun of reviewer-inconsistency.**

**Social Studies cohort (3 lessons):**

- `13FPqZmdrIamQqrzLZUoeLt8CGTnP3vNJv_C_q5gyxjA` **The Story of the 3 sisters** (SS): story-only lesson; `companion planting` under Social Studies here likely reflects the absence of any actual planting activity.
- `1BQdTnCzvCWc7u6MA9ey1HFm-H1g-fXdcgGXFU_Fxzww` **3 Sisters Tacos** (SS): same template as the Science **Three Sisters Tacos** above; opposite subject placement.
- `1S_zIVPNORzjlZbmmm89reX2GFZFV1uwAM6B2mqa7B0U` **3 Sisters Dip & Pita chips** (SS): summary's "work well together / help each other" framing IS the companion-planting biological-mutualism claim, just rendered as story.

</details>

### `thermal_energy`

- canonical_label: Thermal Energy
- verdict: <to_fill>
- frequency: 12 appearances
- current_subjects: Science (12)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering heat transfer and thermal energy in cooking contexts — typically tied to "what happens when food cooks" lessons (boiling, baking, frying, melting). Related concepts `mechanical_energy` (Science, 1), `phases of matter` (Science, 2), and `states of matter` (Science, 1) are distinguishably different physics concepts kept as separate canonicals. Recommend keep as canonical with surface label "Thermal Energy".
- curriculum_notes: <to_fill>

### `colonialisms_impact`

- canonical_label: Colonialism's Impact
- verdict: <to_fill>
- frequency: 12 appearances
- current_subjects: Social Studies (12)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies content tag for lessons engaging the historical impact of colonialism on food systems, cultures, agriculture, and displacement — typically tied to Indigenous-foodways, transatlantic-trade, and post-colonial-displacement lessons. Possessive form ("Colonialism's") preserves the natural-language phrasing; canonical_key uses `colonialisms_impact` (apostrophe dropped per snake_case convention). No cross-subject signal; no near-duplicate drift. Adjacent concepts `slavery` (Social Studies, 1), `Native American history` (Social Studies, 1), `Indigenous knowledge` (Social Studies, 1), `Indigenous stories` (Social Studies, 1), and `history of the American West` (Social Studies, 1) are distinct cultural/historical concepts kept as separate canonicals (Session 81 long-tail review). Recommend keep as canonical with surface label "Colonialism's Impact".
- curriculum_notes: <to_fill>

### `food_webs`

- canonical_label: Food Webs
- verdict: <to_fill>
- frequency: 11 appearances
- current_subjects: Science (11)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering trophic-level relationships in ecosystems (producers → consumers → decomposers) — typically tied to "who eats whom" food-chain and ecosystem-modeling lessons. Distinct from related concepts `ecosystems` (Science, 73 — broader ecological-systems frame), `producers` (Science, 2), `consumers` (Science, 2), and `biodiversity` (Science, 6 + Social Studies, 1). Recommend keep as canonical with surface label "Food Webs".
- curriculum_notes: <to_fill>

### `seasonality`

- canonical_label: Seasonality
- verdict: <to_fill>
- frequency: 11 as-tagged, 24 if aliases merge
- current_subjects: Science (11)
- recommended_primary_subject: Science
- recommended_secondary_subjects: Health, Social Studies
- merge_aliases: [("seasonal cycles", 6), ("seasonal eating", 7)]
- theme_overlap: none
- claude_notes: Canonical Science concept for the **food-availability lens** ("which foods grow in which season; cook with what's local and now") — typically tied to seasonal-scavenger-hunt, winter-fruit-salad, summer-harvest-salsa, and food-preservation lessons. Two near-duplicates fold in cleanly despite their misleading labels: `seasonal cycles` (Science, 6) — DESPITE the cycle-sounding label, 6 of 7 sampled lessons are seasonal-eating content (Pumpkin Spice Muffins, Food Miles, September Salsa Toasts, Tomato Sauce, Sweet and Sour Roots, Alice Waters edible education) — and `seasonal eating` (Science, 7) — pure food-availability lens (Eating in Season, summer-crop scavenger hunts, fall-harvest cooking, Food Geography - Pizza). Post-merge total: 24 lessons. Recommended secondary subjects (Health for nutrition-of-seasonal-eating, Social Studies for food-geography and local-food-systems) capture the cross-disciplinary nature of seasonal-eating lessons. **Companion canonical:** `seasonal_changes` (entry 32 below) is the **phenomenology lens** — keep as a separate canonical absorbing `seasonal change` (2) + `seasons` (2). The corpus mixes these two lenses heavily; see the audit-signal note at the bottom of the `<details>` block.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (38 lessons across the full seasonality + seasonal_changes cluster; combined evidence for both canonicals)</summary>

**`seasonality` (11 lessons, tagged-as: `seasonality`):**

- `1fScJvz-agCFPz1ycN-GLI2nw7G_xAorMMbJ7KTCbPKE` **Sweet Potato Fries: Lunch Club** [food lens]
- `1gLuwRIEfiYyfqztlMGAEOeAuJI1flmj7` **Aloo Gobi** [food lens]
- `1EPkNrvYIN_1pGe7zRjikBwIo2FcfNVxa3QADs26qYf8` **Winter Fruit Salad (Seasonality)** [food lens]
- `1BVqAJ319zKHJq4EBMuvXu3nhn0o5Yc4iAnnh8TvwiEc` **PS 109 Leaf Rubbing Cards** [PHENOMENOLOGY — likely mistagged; should sit under seasonal_changes]
- `1MUz9pgQ4Qb7hRGx0Rqhp5Xzma2xM6kjBZ2Y7P44urKU` **Two Types of Potato Hash Browns** [food lens]
- `1kgvrmzkZ7o81URjqGwoq1DK0VicdTIHfvtXEvvmfxK8` **Winter Fruit Salad (Mobile Education)** [food lens]
- `1UuTbP_4V0UhFCUjKKkHy7qaED4ZoyWHCMoHF70VflC4` **Seasonality Scavenger Hunt**: "which foods grow in which season." [food lens — definitional]
- `14JdOakN4HRDb_auGVrz9hAWHPcgpp9BjEEqN1YJhgOg` **Food Preservation in the Kitchen**: "how seasonality affects cooking practices and techniques." [food lens — definitional]
- `15pgBlVdHdxpRCD22dmwzIgG-aBgHwe8dK2BNzg-85ks` **The Garden in the Winter** [mixed: phenomenology + food]
- `1kSgjpijAnIVj2ocA_UHc3ggMT2cdk8Z7` **Beet Ketchup**: "the importance of a root vegetable as a storage crop…" [food lens — storage-crop = seasonal-availability]
- `1XmATwlVih6GFIL4MOlhDC2GXQuex6V0W` **Summer Harvest Salsa** [food lens]

**`seasonal cycles` (6 of 7 sampled, tagged-as: `seasonal cycles`):**

- `1K0zdfgOhbMmfWLeSwPfpz3dJ0RM7fLrAilQ2Ebfjilk` **Pumpkin Spice Muffins** [food lens — LABEL says cycles, CONTENT is food]
- `1tVWgHidAxvsPRMW2aJXd6YcFP9w0kbK6uOj_nbpu-KM` **Food Miles Game** [food systems lens]
- `0B9X3sp9nlAgmVmZpaFd6clptWTA` **September Salsa Toasts** [food lens — "exploring and eating the fall harvest"]
- `1uV2W6gUUZMDDM4VlhghIJ9w4GoLHpd1_` **Women's History Month: Alice Waters** [food-systems / edible-education lens]
- `1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8` **Introduction to Salad Project** [food / year-long-growing lens]
- `14J7Twqm1YFCToMB1DpIjtQhN_va2CH6r_iCJQSef5X0` **Tomato Sauce with Summer Vegetables**: "explore the bounty of late summer harvest." [food lens]
- `1xdz4aJqRcHYaAluj-x3C0VoQRM3UNy-gERUvpuOuwcM` **Sweet and Sour Roots, Two Ways**: "discuss their qualities and seasonal availability." [food lens — definitional]

**`seasonal eating` (7 sampled, tagged-as: `seasonal eating`):**

- `1ncYLZbPt8k5p09bbTterR3d6U3hv6MzRH7-JXRP4rDQ` **The Seasons: Winter** [phenomenology — appears mistagged; part of Seasons template-trio]
- `0BxEc0RZeYtCiUGNLaHJQSUFoQVE` **September Sixth Grade Summer Plant Hunt** [food / garden lens]
- `0BxEc0RZeYtCiOWhTRk5FRjBUc0k` **Food Geography - Pizza**: "historic and geographic origins of the food they eat…" [food-geography lens]
- `15uTWnv3aOIIeOLAhCjiA-9cG9xZlBKONpMZt-oyJYEQ` **September Sixth Grade Summer and Pizza Plant Hunt** [food lens]
- `1cX_lHizAQAD-XccT95OugIwfmcCXIWsI35hk4ewmF1c` **The Seasons: Fall**: "the different kinds of weather… seasons go in a cycle." [phenomenology — same template as Seasons: Spring tagged under `seasonal_changes` elsewhere]
- `1G2slXxMJJB4pRclGYIcjUA4XhGxqemytyzHQkJug3Yc` **Eating in Season**: "certain foods are available only in certain seasons in the northeast." [food lens — definitional]

**`seasonal changes` (10 lessons, tagged-as: `seasonal changes` — belongs to companion canonical `seasonal_changes` below):**

- `1CE324nZDL2kz_4P5TwDuvoX7Zx_NMwUz` **Leaf Collecting** [phenomenology]
- `19ZBXDDQ5vZ2y5LrJ8w_7D7sqXSQNQeUF06ovPagaQo0` **Fall/Winter Veggies and Fruits** [phenomenology + light food]
- `0BzCUl-9h7sgELW96MDR3dkZ3MlE` **Signs of Spring** [phenomenology]
- `0BxEc0RZeYtCiVVRTV0xRM2FpQ3M` **The Year in Seasons**: "seasons go in a cycle." [phenomenology — definitional]
- `13REACG4YMxTiRNKer3COca2quFvSlb1a` **Mr. Anthony's Spring Trees Unit** [phenomenology — also see entry 5 (`storytelling`) for cross-cluster note]
- `1HHuEkR4gaoN7_Q7mlcteiDQ93glIfluzHF9sZSfZ0k8` **The Garden in the Summer** [phenomenology / garden phenology]
- `1A34UK78EbtdHIVeiVe0lNiLJaJ557y-JlS_o673-hmw` **The Garden in the Fall** [phenomenology]
- `1Yy7iv3vxPHukKFooYce0yr5BOqUcqprM2rhUWX12Cgo` **The Garden in the Spring** [phenomenology]
- `1e0UWQYtEYVnGioomuIHx4LwJn3sJ8wKV` **Seasonal Changes**: "Students will observe and discuss the changes in trees throughout the year…" [phenomenology — definitional]
- `1bO5UbLgXj5Puo2h-KXm31-0rmWIr4hItroTNYpIwta8` **The Seasons: Spring** [phenomenology — template-trio]

**`seasonal change` singular (2 lessons; long-tail merge into `seasonal_changes`):**

- `1CSPiEww-2bIuRRyPnbZAqG8K_8D1kw7hr85RSRJACSk` **Spring Special Spot and Signs of Spring Scavenger Hunt** [phenomenology — pure singular drift]
- `19Sjs7Fz7Z8ToT421a3VVT_j8_b-KUXAp` **Fall: Special Spot** [phenomenology — pure singular drift]

**`seasons` (2 lessons; long-tail merge into `seasonal_changes`):**

- `0BwC8Pf3ZwAXjN04xRGEwcl9Cd0k` **The Summer Garden** [mixed — garden phenology + food; tag is generic]
- `1Sh9vw7Co-Y5Sl4q-l4e1zUEojDscaxgof8AnWwlMI9A` **Garden Celebration: Culmination of Plant Parts and Seasons** [phenomenology — generic seasons review]

**Audit signal (for the Stage 2 audit register):** `Seasons: Spring` is tagged `seasonal changes` while `Seasons: Fall` and `Seasons: Winter` (from the same template-trio) are tagged `seasonal eating` — direct evidence that the legacy taxonomy could not reliably distinguish these two concepts. When re-tagging in Stage 2, reviewers will need an explicit decision rule (food-availability lens vs cycle-phenomenology lens) to handle the template-trio consistently.

</details>

### `sensory_exploration`

- canonical_label: Sensory Exploration
- verdict: <to_fill>
- frequency: 11 appearances
- current_subjects: Science (11)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering five-senses exploration of food and garden materials — typically tied to early-grade taste/smell/touch/sight/sound activities (taste-test bars, sensory scavenger hunts, herb-smelling). Related concepts `taste` (Science, 1), `sound` (Science, 1), `observation` (Science, 5) are distinguishably narrower single-sense or methodology concepts kept as separate canonicals. Recommend keep as canonical with surface label "Sensory Exploration".
- curriculum_notes: <to_fill>

### `seasonal_changes`

- canonical_label: Seasonal Changes
- verdict: <to_fill>
- frequency: 10 as-tagged, 14 if aliases merge
- current_subjects: Science (10)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: [("seasonal change", 2), ("seasons", 2)]
- theme_overlap: none
- claude_notes: Canonical Science concept for the **phenomenology lens** — "seasons go in a cycle; signs of spring; trees changing through the year." The cleanest, most semantically coherent member of the broader seasonality cluster (10 of 10 lessons are phenomenology, vs the mixed signal in `seasonality` 11 / `seasonal cycles` 6 / `seasonal eating` 7). Two singletons fold in: `seasonal change` (Science, 2 — pure singular drift; both Spring/Fall Special Spot are garden-observation phenomenology) and `seasons` (Science, 2 — Summer Garden + Garden Celebration; generic seasons-cycle review). Post-merge total: 14 lessons. **Companion canonical:** `seasonality` (entry 29 above) is the **food-availability lens** — keep as separate canonical absorbing `seasonal cycles` (6) + `seasonal eating` (7). For the full `<details>` corpus-evidence block covering all 6 cluster members and the audit signal about scrambled corpus labels, see entry 29's `<details>` block above.
- curriculum_notes: <to_fill>

---

## §12 Mid-tier — concepts with 3–9 appearances

> **Status: filled (39 of 39 entries).** Session 80 per-value fills landed in PR-Concepts-2. Three entries integrate Session 79 Phase 1 upfront Opus batch evidence as `<details>` blocks (biodiversity + observation cross-subject splits + preservation cross-subject + canonical-absorbing). Two entries propose `merge → seasonality` (§11 entry 30) for the seasonality-cluster mid-tier members (`seasonal_cycles` 6 + `seasonal_eating` 7); curriculum team may flip to standalone-keep if the surface-label direction reads differently. Awaiting curriculum-team verdicts on `verdict` and `curriculum_notes` fields.
>
> **Review depth (D-C15):** moderate. Most entries are `keep` with minor surface-label or alias refinements. Attention OK but variance acceptable. Pay closer attention to: (a) merge-candidate entries (advocacy + community activism per CON-05; preservation + food preservation per CON-09; plant_identification + identifying plants + plant ID; adaptations + adaptation + plant adaptation + plant adaptations; social_justice_issues + social justice; seasonal_cycles + seasonal_eating proposing merge into §11 seasonality); (b) audit-signal-referenced entries (writing CON-12; observation CON-13; garden_exploration CON-14; nutrition CON-15); (c) cross-subject entries (biodiversity, observation, preservation); (d) the single theme-overlap entry (plant_growth per §6).
>
> **Frequency cutoff calibratability:** the 3–9 cutoff was the Session 78 locked default; Session 80 confirmed the 39-entry count at fill time against the same probe with `retired_at IS NULL` filter — without the filter the same probe returns 42 entries, so 3 distinct concept strings appear only on retired lessons and correctly drop out of the live-corpus mid-tier. Tier-cutoff calibration call per D-C14: Session 80 punted the long-tail split decision to Session 81 (preliminary count: ~108 singletons + ~29 two-appearance entries = 137 long-tail total; one 137-entry PR is too big for the 50-entry bandwidth sweet spot, but the 108/29 split leaves one PR still oversized — Session 81 weighs an even-thirds split or alternate cuts).

<!-- Per-value entries — Session 80; 39 entries frequency-descending, alphabetical tie-break within frequency. -->

### `drawing`

- canonical_label: Drawing
- verdict: <to_fill>
- frequency: 9 appearances
- current_subjects: Arts (9)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Arts concept covering the act of drawing — typically tied to garden-journaling, plant-illustration, observational sketching (Special Spot scavenger hunts, leaf rubbings), and "draw what you see" early-grade exercises. The §11 `visual_arts` 76 claude_notes explicitly preserves `drawing` as a separate mid-tier canonical rather than rolling it in: the corpus treats drawing as a distinct technique deserving its own home. Adjacent narrower Arts concepts `painting` 1, `coloring` 1, and `craft activity` 1 are long-tail singletons (the latter two merge into `visual_arts` per §11). Recommend keep with surface label "Drawing"; curriculum team may want to reconsider the drawing-vs-visual_arts boundary if the corpus signal feels muddled (option: collapse drawing into visual_arts as a specific technique).
- curriculum_notes: <to_fill>

### `fractions`

- canonical_label: Fractions
- verdict: <to_fill>
- frequency: 9 appearances
- current_subjects: Math (9)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math concept covering fractional arithmetic in cooking and recipe contexts — measuring ingredients, scaling recipes, and visual fractions (pizza slices, halving fruit). Distinct from related math canonicals in §11 (`measurement` 66, `counting` 20, `data_collection` 19, `estimation` 15) and §12 `recipe_scaling` 3 (which applies fractions but emphasizes scaling-as-operation). Recommend keep with surface label "Fractions".
- curriculum_notes: <to_fill>

### `plant_growth`

- canonical_label: Plant Growth
- verdict: <to_fill>
- frequency: 9 appearances
- current_subjects: Science (9)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: YES — `plant growth` (concepts, Science 9) shares a vocabulary with `Plant Growth` (themes, Title Case canonical per `src/utils/filterDefinitions.ts`) under `lower()`. One of three known concept↔theme overlaps in §6 (`ecosystems` exact-string per §11 entry 6; `plant growth` and `food systems` 1 long-tail are case-normalized matches). Per D-C5, adjudication (which side keeps the canonical string; whether both keep with cross-reference; whether one side renames) is deferred to the themes worksheet / D4 canonicalization migration; this flag preserves the signal.
- claude_notes: Canonical Science concept covering plant-growth processes — sprouting seeds, growth stages, tracking seedling progress — typically tied to early-grade plant-life observation lessons. Distinct from §11 `plant_parts` 239 (anatomy), `plant_needs` 41 (resource requirements), `life_cycles` 43 (broader cyclic-process frame including animals), and `seeds` 13 (seed-anatomy-to-planting concept). Adjacent long-tail concepts `growing cycles` 1 and `growth patterns` 1 are likely too vague to stand alone; curriculum team may want to fold them into `plant_growth` at Session 81 long-tail review. The theme-overlap flag is the only structural complication. Recommend keep as Science canonical pending the themes-worksheet reconciliation pass.
- curriculum_notes: <to_fill>

### `cultural_narratives`

- canonical_label: Cultural Narratives
- verdict: <to_fill>
- frequency: 8 appearances
- current_subjects: Literacy/ELA (8)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering reading, writing, and telling stories rooted in cultural context — Three Sisters legend, Food Roots Lesson, Celebrating Georgia Gilmore (Pies from Nowhere biography read-aloud), Hummus and Pita (Palestinian olive-trees story). The §11 `cultural_traditions` 206 (Social Studies) claude_notes explicitly preserves `cultural_narratives` as a separate Literacy/ELA canonical rather than folding it in: 7 of 8 lessons co-tag with `storytelling` (Literacy/ELA) and consistently center reading-or-telling a culturally-rooted story, which is a genuine literacy-side narrative-storytelling lens distinguishable from the broad Social Studies content tag. Distinct from §12 `narrative_writing` 3 (which targets student composition rather than reading/comprehension). Recommend keep as standalone Literacy/ELA canonical.
- curriculum_notes: <to_fill>

### `photosynthesis`

- canonical_label: Photosynthesis
- verdict: <to_fill>
- frequency: 8 appearances
- current_subjects: Science (8)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering the biological process of photosynthesis — plant-energy production from sunlight, role of chlorophyll, food-making in leaves. Adjacent long-tail biological-process concepts `cellular respiration` 1 and `chemical reactions` 1 are distinguishably different processes kept as separate canonicals. Distinct from §11 `plant_needs` 41 (which includes sunlight as a need but covers the broader resource-requirement frame). Recommend keep with surface label "Photosynthesis".
- curriculum_notes: <to_fill>

### `writing`

- canonical_label: Writing
- verdict: <to_fill>
- frequency: 8 appearances
- current_subjects: Literacy/ELA (8)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic Literacy/ELA tag used when reviewers pick "writing" as a free-form composition concept without specifying the writing genre. **Boundary tension with mid-tier sub-types.** §12 also has `how_to_writing` 5, `narrative_writing` 3, `opinion_writing` 3, `descriptive_writing` 3, `persuasive_writing` 4, plus long-tail `argumentative writing` 2, `informational writing` 2, `recipe writing` 2, `comparative writing` 1, `creative writing` 1 (corpus-tagged Arts, not Literacy/ELA — included in the cluster review per the canonical-shape question), `letter writing` 1, `writing claims` 1. Curriculum team needs to decide: (a) keep `writing` 8 as a residual catch-all for un-genred writing instruction (cluster ~8 base + sub-type total ~28 = ~36 writing lessons spread across labels); (b) drop `writing` 8 in favor of more-specific genre tags (force reviewers to pick a genre at re-tag time); or (c) flip and treat `writing` as the canonical with all genre sub-types as merge_aliases. Recommend option (a) standalone keep with surface label "Writing"; option (b) loses signal on the 8 "writing-without-specified-genre" rows; option (c) collapses pedagogically distinct genres (opinion vs narrative vs persuasive teach different skills, per Common Core ELA standards). Audit signal CON-12 captures this decision.
- curriculum_notes: <to_fill>

### `biodiversity`

- canonical_label: Biodiversity
- verdict: <to_fill>
- frequency: 7 appearances
- current_subjects: Science (6), Social Studies (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Tagging-artifact cross-subject split. Across 7 sampled lessons (6 Science, 1 Social Studies), `biodiversity` is used in a single consistent ecological sense — diversity of species and resilience of living communities (food webs, monoculture-vs-polyculture, plant families, adaptation, ecosystems). The lone Social Studies tagging is on "The Story of the 3 sisters," whose teacher-facing summary frames the lesson as the Lenape indigenous practice of *companion planting*; that lesson already carries `Social Studies: [cultural traditions, companion planting]` doing the cultural-knowledge work, and `Science: [plant parts, ecosystems]` doing the natural-science work, so adding `biodiversity` to Social Studies is over-stretch rather than a distinct lens. Notably, the parallel "BIODIVERSITY" lesson (`1dHNasB4...`) explicitly teaches *both* social and ecological diversity but the reviewer correctly placed `biodiversity` only under Science and used `cultural traditions` + `community systems` for the Social Studies axis — a deliberately non-duplicated assignment that the "3 sisters" tagging contradicts. Recommend consolidating to Science as the sole canonical home; cultural-knowledge framing is preserved by `cultural traditions` + `companion planting` co-tags. Adds a fourth data point to the broader artifact pattern captured in CON-04 (historical_figures) + CON-08 (companion_planting) + CON-10 (nutrition_education) — `academicConcepts` subject keys frequently track each lesson's `academicIntegration` array rather than its content. Distinct from §11 `food_webs` 11 (trophic-level focus vs species-diversity focus) and §11 `ecosystems` 73 (broader ecological-systems frame).
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (7 lessons across Science + Social Studies)</summary>

- `1v7aPRuAM9q1jdffDr1IqgxZUKqTZ7By-` **Biodiversity** (Science): "Students will play a game to understand the importance and advantages of biodiversity... Students will be able to explain what biodiversity is and how biodiversity provides protection against environmental risks." Co-tagged `Science: food webs`, theme `Ecosystems`. Pure ecology.
- `1dHNasB4vEvH8G_OIy5Y7kVTOjXSovx_qLUGVB2UYk-M` **BIODIVERSITY** (Science): "Students will learn and understand the importance of diversity amongst members of a social and ecological community and how that diversity increases the richness and resilience of that community." Uses 3-sisters story as the vehicle. Reviewer assigned `Science: [biodiversity, ecosystems]` AND `Social Studies: [cultural traditions, community systems]` — note `biodiversity` deliberately NOT placed under Social Studies even though the lesson explicitly teaches social diversity.
- `1f8rMP3RKcbOHCrh1td_H_3yHnnUyKAvIgyOT7f0Pac0` **Biodiversity & Monoculture** (Science): "Students will understand the difference between biodiverse farms and monoculture farms and the impact that plant diversity has on animals." Pollinator ecology; clear ecological lens.
- `13REACG4YMxTiRNKer3COca2quFvSlb1a` **Mr. Anthony's Spring Trees Unit** (Science): identifying native trees and seasonal indicators; co-tagged `Science: [plant identification, seasonal changes, biodiversity]`. Native-species diversity = ecological.
- `1tYdCp_VLcX-ymleYFMRBj20Pzf4U7j912gg_k_-yMko` **Plant Families** (Science): "Students will use their observation skills to sort plants into different categories... Students will begin to explore the concept of biodiversity." Species-grouping introduction to biodiversity — ecological.
- `0BzCUl-9h7sgESGZ0MThTY0NBYVE` **Seed Dispersal** (Science): "individual variations within a species may cause certain individuals to have an advantage in survival and reproduction"; co-tagged `Science: [adaptation, seed dispersal, biodiversity]`. Adaptation/variation = ecological.
- `13FPqZmdrIamQqrzLZUoeLt8CGTnP3vNJv_C_q5gyxjA` **The Story of the 3 sisters** (Social Studies): "Students will become familiar with the indigenous planting technique of companion planting by learning about the 3 sisters, corn, beans and squash." Reviewer placed `Social Studies: [cultural traditions, companion planting, biodiversity]` and `Science: [plant parts, ecosystems]`. The cultural-knowledge angle is already carried by `cultural traditions` + `companion planting`; `biodiversity` here is over-stretch — the analogous `1dHNasB4...` lesson kept `biodiversity` on the Science side only.

</details>

### `seasonal_eating`

- canonical_label: Seasonal Eating
- verdict: <to_fill>
- frequency: 7 appearances
- current_subjects: Science (7)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Recommend merge into `seasonality` (§11 entry 30, freq 11) as the food-availability lens canonical home — already proposed in §11 `seasonality`'s `merge_aliases: [("seasonal cycles", 6), ("seasonal eating", 7)]`. Per §11 seasonality entry's `<details>` block, 5 of 7 sampled `seasonal eating` lessons are pure food-availability content (September Sixth Grade Summer Plant Hunt, Food Geography - Pizza, September Sixth Grade Summer and Pizza Plant Hunt, Eating in Season "certain foods are available only in certain seasons in the northeast" — definitional, and one more); 2 of 7 are phenomenology-content lessons mistagged (The Seasons: Fall + The Seasons: Winter — direct evidence of the template-trio mistagging captured in audit signal CON-01). Curriculum team can flip the merge direction if "seasonal eating" reads as a more pedagogically-clear surface label than "seasonality" — both pick the same merged cohort, the choice is purely surface-label preference. Companion canonical `seasonal_changes` (§11 entry 32, freq 10) covers the phenomenology lens. Cross-reference §11 entry 30's `<details>` block for the combined 38-lesson cluster evidence.
- curriculum_notes: <to_fill>

### `music`

- canonical_label: Music
- verdict: <to_fill>
- frequency: 6 appearances
- current_subjects: Arts (6)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Arts concept covering music-making in lesson contexts — songs about plants/food/garden, instrument creation, listening exercises. Adjacent long-tail concepts `song` 1 (Literacy/ELA — different lens, likely lyric-as-text composition) and `instrument making` 1 (Arts — narrower craft-construction lens) are distinguishably distinct and stay separate canonicals. Recommend keep with surface label "Music".
- curriculum_notes: <to_fill>

### `observation`

- canonical_label: Observation
- verdict: <to_fill>
- frequency: 6 appearances
- current_subjects: Science (5), Arts (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Tagging-artifact cross-subject split. The single Arts-tagged lesson ("Spring Special Spot and Signs of Spring Scavenger Hunt") is a direct curricular twin of the Science-tagged "Fall: Special Spot" — both are seasonal garden-observation lessons in the same Special Spot series, and the Spring version's only difference appears to be that the tagger bundled "observation" together with "drawing" under Arts (as "observational drawing") instead of keeping observation under Science where its companion lesson placed it. All five Science-tagged lessons frame observation as empirical/sensory garden-science practice (Rachel Carson nature-writing, sensory scavenger hunts, plant-needs observation, seasonal-change observation). No lesson in the sample uses observation as a distinguishably artistic/perceptual training practice (e.g., still-life, perceptual aesthetics). Recommend consolidating to Science as the sole canonical home, and treating Arts-paired observation in these garden lessons as `drawing` (the act) + `observation` (the science practice the drawing supports). Related §11 concept `sensory_exploration` 11 is broader (5-senses exploration); observation is the methodology-of-noticing concept. Audit signal CON-13 captures the v3 tagger's behavior of attaching `observation` to whichever subject already carried `drawing` — worth a corpus-wide audit before consolidation.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (6 lessons across Science + Arts)</summary>

- `1ycSqtbE4BzPe28OrrOG7T72wvvG51ynT_Q2GrR5Rg-I` **4 Color Scavenger Hunt** (Science: ["sensory exploration","observation"]): "Students walk around the garden looking for signs which instruct them in various tasks, mostly sensory observations." Pure sensory/empirical garden observation; no artistic framing.
- `19Sjs7Fz7Z8ToT421a3VVT_j8_b-KUXAp` **Fall: Special Spot** (Science: ["seasonal change","observation"]; Arts: ["drawing"]): "Students will talk about the seasons and then sit outside in the garden in a place of their choosing to observe the garden in the fall." Observation is filed under Science; drawing alone is under Arts. The Special-Spot series treats observation as a seasonal-science practice.
- `13biNspAVeUukqY_WNu7jN4CQKydttOt7OR85dnY3EFw` **In the Garden with Dr. Carver** (Science: ["plant needs","observation"]): "Students will read a story about plant scientist Dr. Carver and then will do a garden job to practice their own skills as garden scientists and experts." Observation explicitly framed as scientific practice ("garden scientists").
- `1CSPiEww-2bIuRRyPnbZAqG8K_8D1kw7hr85RSRJACSk` **Spring Special Spot and Signs of Spring Scavenger Hunt** (Arts: ["drawing","observation"]; Science: ["seasonal change","weather"]): "Students will draw pictures of what they observe in the garden during springtime, and will then complete the Signs of Spring Sensory Scavenger Hunt." THE SMOKING GUN: same curricular series as Fall: Special Spot but inconsistently filed — observation moved under Arts, paired with drawing. Summary frames it as "what they observe" (empirical), not perceptual-training.
- `1eqwPqe-b3yL59iy8tBSWyxwM1cDoIyNURl6mpuiTews` **Welcome to the Garden** (Science: ["sensory exploration","observation"]): "Students are introduced to garden rules, make class agreements, and participate in sensory exploration of the garden space." Sensory/empirical observation.
- `1Ebh6tFUdUgk3BwowZPq-JCvADMo2SOff` **Women's History Month: Rachel Carson** (Science: ["ecosystems","observation"]): "Students will learn about Rachel Carson and how she inspired the environmental movement by her writing based on observations of nature." Observation explicitly framed as ecological/scientific practice (Carson as a scientist).

</details>

### `reading_comprehension`

- canonical_label: Reading Comprehension
- verdict: <to_fill>
- frequency: 6 appearances
- current_subjects: Literacy/ELA (6)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering reading-for-understanding practices — text questions, summarizing, identifying main ideas. Adjacent long-tail concept `reading` 2 (Literacy/ELA) may fold in as a generic-comprehension-without-specified-scaffold alias; Session 81 long-tail review will weigh. Distinct from §11 `recipe_reading` 69 (specific recipe-text reading), §11 `storytelling` 76 (narrative-storytelling lens), and §12 `cultural_narratives` 8 (cultural-story reading). Recommend keep with surface label "Reading Comprehension".
- curriculum_notes: <to_fill>

### `seasonal_cycles`

- canonical_label: Seasonal Cycles
- verdict: <to_fill>
- frequency: 6 appearances
- current_subjects: Science (6)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Recommend merge into `seasonality` (§11 entry 30, freq 11) — already proposed in §11 `seasonality`'s `merge_aliases: [("seasonal cycles", 6), ("seasonal eating", 7)]`. Per §11 seasonality entry's `<details>` block, DESPITE the cycle-sounding surface label, 6 of 7 sampled `seasonal cycles` lessons are seasonal-eating content (Pumpkin Spice Muffins, Food Miles Game, September Salsa Toasts, Tomato Sauce with Summer Vegetables, Sweet and Sour Roots Two Ways, Alice Waters edible-education) — the food-availability lens that §11 seasonality canonicalizes. The label "seasonal cycles" misleads; the lessons under it teach what's available when to cook, not seasonal phenomenology. Curriculum team can flip the merge direction if "seasonal cycles" reads as a clearer surface label than "seasonality" — both pick the same merged cohort. Companion canonical `seasonal_changes` (§11 entry 32, freq 10) covers the phenomenology lens (signs of spring, leaf collecting, garden phenology); those lessons would NOT route here. Cross-reference §11 entry 30's `<details>` block for the combined 38-lesson cluster evidence.
- curriculum_notes: <to_fill>

### `adaptations`

- canonical_label: Adaptations
- verdict: <to_fill>
- frequency: 5 as-tagged, 8 if aliases merge
- current_subjects: Science (5)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: [("adaptation", 1), ("plant adaptation", 1), ("plant adaptations", 1)]
- theme_overlap: none
- claude_notes: Canonical Science concept covering biological adaptations — how organisms (plants and animals) develop traits to survive in their environments. The 5 base-tagged lessons span plant adaptations (seasonal-survival, drought-tolerance) and broader ecosystem adaptation (variation, natural selection). Three near-duplicate long-tail singletons fold in cleanly: `adaptation` (Science, 1 — singular drift), `plant adaptation` (Science, 1 — narrower plant-specific lens), and `plant adaptations` (Science, 1 — pluralized variant of plant adaptation). The §7 worksheet example used `adaptation` (singular) as the proposed canonical key; this entry uses `adaptations` (plural) per the highest-frequency-wins convention used in §11 (`seasonality` 11 > `seasonal_changes` 10 > seasonality-cluster aliases). Curriculum team can flip the canonical label to singular if pluralization feels less idiomatic; both labels pick the same merged cohort. Post-merge total: 8 lessons.
- curriculum_notes: <to_fill>

### `animal_needs`

- canonical_label: Animal Needs
- verdict: <to_fill>
- frequency: 5 appearances
- current_subjects: Science (5)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering animal life requirements (food, water, shelter, space) — typically tied to early-grade habitat lessons and pollinator-resource lessons. Symmetric pairing with §11 `plant_needs` 41 (plant biology counterpart). Adjacent §12 concept `habitats` 4 is distinct (focused on the environmental-context that supports needs); §11 `pollinators` 28 overlaps in subject matter but emphasizes pollinator-specific ecology. Recommend keep with surface label "Animal Needs".
- curriculum_notes: <to_fill>

### `how_to_writing`

- canonical_label: How-to Writing
- verdict: <to_fill>
- frequency: 5 appearances
- current_subjects: Literacy/ELA (5)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering procedural / instructional-writing genre — typically tied to recipe-writing lessons, garden-task instructions, and step-by-step "how to" composition. Adjacent long-tail concept `recipe writing` 2 may be considered an alias (recipe writing is one specific application of how-to writing); curriculum team can decide at Session 81 long-tail review. Distinct from other §12 writing sub-types (`narrative_writing` 3, `opinion_writing` 3, `descriptive_writing` 3, `persuasive_writing` 4) and §12 catchall `writing` 8 — each represents a pedagogically distinct genre. Recommend keep with surface label "How-to Writing". Audit signal CON-12 captures the broader writing-cluster canonical-shape question.
- curriculum_notes: <to_fill>

### `plant_identification`

- canonical_label: Plant Identification
- verdict: <to_fill>
- frequency: 5 as-tagged, 8 if aliases merge
- current_subjects: Science (5)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: [("identifying plants", 2), ("plant ID", 1)]
- theme_overlap: none
- claude_notes: Canonical Science concept covering plant-identification practices — herb identification, weed-vs-edible identification, plant-family sorting, native-plant recognition. Two near-duplicate long-tail variants fold in cleanly: `identifying plants` (Science, 2 — verb-form drift) and `plant ID` (Science, 1 — abbreviated drift); the §7 worksheet example explicitly modeled this cluster. Post-merge total: 8 lessons. Adjacent §11 concept `plant_parts` 239 is distinct (anatomy lens); §11 `plant_needs` 41 is distinct (resource lens). Recommend keep with surface label "Plant Identification".
- curriculum_notes: <to_fill>

### `social_justice_issues`

- canonical_label: Social Justice Issues
- verdict: <to_fill>
- frequency: 5 as-tagged, 7 if aliases merge
- current_subjects: Social Studies (5)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: [("social justice", 2)]
- theme_overlap: none
- claude_notes: Canonical Social Studies concept covering social-justice-themed lessons — food justice, equity, civil rights movement, Cesar Chavez and farm labor. Long-tail near-duplicate `social justice` (Social Studies, 2) folds in cleanly as a label-shortening variant. Curriculum team may want to consider whether `social_justice_issues` or `social_justice` is the better surface label (both pick the same merged cohort; the "issues" suffix is slightly less neutral). Post-merge total: 7 lessons. Adjacent §12 concepts `environmental_justice` 3 and `advocacy` 3 are distinct civic concepts kept as separate canonicals (environmental_justice focuses specifically on environment-related justice; advocacy is action-orientation). Recommend keep with surface label "Social Justice Issues" or curriculum-team preference of "Social Justice".
- curriculum_notes: <to_fill>

### `bilingual_education`

- canonical_label: Bilingual Education
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Literacy/ELA (4)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering bilingual-education practices — Spanish-English vocabulary lessons, dual-language read-alouds, multilingual food-vocabulary work. Distinct from §11 `vocabulary_development` 59 (broader vocabulary frame, single-language). Recommend keep with surface label "Bilingual Education".
- curriculum_notes: <to_fill>

### `garden_exploration`

- canonical_label: Garden Exploration
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Science (4)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic Science tag for garden-introduction lessons — typically tied to early-grade "welcome to the garden" first-day-of-program lessons. **Pedagogical-content lightness flag for curriculum-team consideration:** unlike specific Science concepts like §11 `plant_parts` 239 or `pollinators` 28, "garden exploration" doesn't denote a distinct scientific concept being taught — it's a context tag meaning "this lesson takes place in/around the garden." Adjacent long-tail vague-Science singletons (`garden topics` 1, `general exploration` 1, `plant science` 1) are recommended drops per audit signals CON-02 + CON-03 + the singletons-garden-meta scan (Session 79). Curriculum team should decide whether `garden_exploration` is canonical enough to keep (4 lessons share the framing) or also lands on the drop list (treat the broader "garden as context" as captured by the `location: garden` filter rather than as an academic concept). Audit signal CON-14 captures this boundary question.
- curriculum_notes: <to_fill>

### `global_connections`

- canonical_label: Global Connections
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Social Studies (4)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies concept covering globalization, food-trade routes, and cultural-exchange-across-borders content — typically tied to "where does our food come from" geography lessons and trade-routes lessons. Adjacent §11 concepts `geography` 56 (broader spatial-knowledge frame) and `trade_routes` 16 (specific trade-economics lens) are distinct. Recommend keep with surface label "Global Connections".
- curriculum_notes: <to_fill>

### `habitats`

- canonical_label: Habitats
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Science (4)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering animal-and-plant habitat-context — typically tied to pollinator-habitat lessons, biodiversity-of-habitats lessons, and "what does this animal need to live" lessons. Symmetric pairing with §12 `animal_needs` 5 — habitats (environmental context) vs animal_needs (resource requirements). Distinct from §11 `ecosystems` 73 (broader system-of-relationships frame). Recommend keep with surface label "Habitats".
- curriculum_notes: <to_fill>

### `movement`

- canonical_label: Movement
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Arts (4)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Arts concept covering movement-based pedagogy — dance, body-based learning, kinesthetic activities (e.g., "Students will learn a dance to show what seeds need to grow"). Adjacent long-tail concepts `dance` 1 (Arts) and `imaginary play` 1 (Arts) are narrower or distinguishable lenses kept as separate canonicals. Recommend keep with surface label "Movement".
- curriculum_notes: <to_fill>

### `nutrition`

- canonical_label: Nutrition
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Science (4)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic Science tag for nutrition content — **boundary tension with §11 `nutrition_education` 107 (Health 100, Science 7).** The §11 nutrition_education canonical absorbs nutrition-as-broad-content; this `nutrition` 4 Science tag may cover narrower biology-of-nutrition framings (macronutrients, energy from food, plant-vs-animal sources) — OR it may be pure label drift (a shorter alias of `nutrition_education`). Curriculum team should decide whether `nutrition` is a Science-specific narrower concept (distinct from Health-side `nutrition_education`) or just label drift (merge into `nutrition_education`'s Science-7 secondary). Without Opus-read corpus inspection, the call isn't decidable from probe data alone; flag for curriculum-team judgment or targeted Opus read at fill time. Audit signal CON-15 captures this nutrition-vs-nutrition_education boundary question. Related long-tail concepts `plant nutrition` 2, `macronutrients` 1, `macromolecules` 1 are distinguishably narrower biology concepts kept separate.
- curriculum_notes: <to_fill>

### `persuasive_writing`

- canonical_label: Persuasive Writing
- verdict: <to_fill>
- frequency: 4 appearances
- current_subjects: Literacy/ELA (4)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering persuasive composition genre — typically tied to "convince your reader" and food-system advocacy lessons. Adjacent long-tail concept `argumentative writing` 2 may be considered a variant (some pedagogy distinguishes "argumentative" as evidence-based vs "persuasive" as emotion-allowed; Common Core ELA standards treat argument as the 6-12 successor to K-5 opinion-writing, with persuasive as a pre-CCSS umbrella term). Curriculum team can decide at Session 81 long-tail review. Distinct from other §12 writing sub-types and §12 catchall `writing` 8 (see CON-12). Recommend keep with surface label "Persuasive Writing".
- curriculum_notes: <to_fill>

### `preservation`

- canonical_label: Preservation
- verdict: <to_fill>
- frequency: 4 as-tagged, 5 if aliases merge
- current_subjects: Science (3), Social Studies (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: Social Studies (conditional)
- merge_aliases: [("food preservation", 1)]
- theme_overlap: none
- claude_notes: The 3 Science `preservation` lessons (jam-making in *Bud Not Buddy/Jam*, vegetable pickling in *Pickle Lesson with Ms. Ingrit*, rose glycerite/honey infusion in *Healing with Roses*) all describe food-or-edible-plant preservation techniques — jamming, pickling/fermenting, herbal infusion — which is the same cognitive lens as the sole `food preservation` Science lesson (*Sandor Katz: Food Hero*, fermentation/cultured butter). On the Science axis these are a single concept and should consolidate; this entry uses `preservation` as the canonical label (highest-frequency-wins convention from §11), but the Session 79 Opus read flagged that `food_preservation` is the more semantically precise label — curriculum team may flip the canonical-label direction (both pick the same merged Science cohort, choice is purely surface-label preference). Post-merge total: 5 lessons. The lone Social Studies `preservation` tag (*Three Sisters Succotash*, paired with `Indigenous / North American / Americas` cultural-heritage and Social Studies `cultural traditions`) plausibly carries a distinct *cultural-historical preservation of Indigenous foodways* lens — "modern and past methods of preservation" framing is comparative-history, not technique-acquisition — but it's a single-lesson signal and the summary is thin. Curriculum team decides: (a) accept the cultural-heritage lens and keep `preservation` as a Social Studies-only label distinct from a Science `food_preservation` canonical, or (b) treat the Three Sisters tagging as artifactual and consolidate all 4 lessons under Science as `food_preservation`, dropping `preservation` from the vocabulary. If (a) is chosen, consider renaming the Social Studies form to something less ambiguous (e.g., `cultural_preservation` or `traditional_foodways_preservation`) to make the lens explicit. Audit signal CON-09 (created Session 79) is closed by this entry's merge_aliases proposal pending Stage 2 implementation.
- curriculum_notes: <to_fill>

<details><summary>Corpus evidence (5 lessons across Science + Social Studies + `food preservation` comparison; reproduced from Session 79 Phase 1 Opus batch per F2 hardening pattern)</summary>

- `1jS-jjcZs0zF-WSwzkrgryefL2kiBepp2ahvqQzzQodI` **Bud Not Buddy/Jam** (Science): "Students will learn about preservation of food, and learn about canning techniques developed and used during the Great Depression era." Lens = food-science preservation (canning/jamming). Cultural heritage: `North American, Americas`. Other concepts: Literacy `novel connections, recipe reading`; Social Studies `historical figures, cultural traditions`. Has a historical-context overlay but the `preservation` concept is tagged ONLY under Science, and the body describes canning *technique*.
- `1yUHWKsyYlQoHqmOuuX4IttgvcVY5uDOeJwsKAwjco9s` **Pickle Lesson with Ms. Ingrit** (Science): "Students will harvest carrots, radishes and scallions from the garden and pickle them!" Lens = food-science preservation (pickling/fermentation). No cultural-heritage tagging. Concepts: Science `plant parts, preservation`. Purely a food-preservation technique lesson.
- `1130Pa-vFa5TJC8uK-sjgpOjsvD7TkJYAau5esNfsmY0` **Healing with Roses** (Science): "Students will make a rose glycerite tincture (glycerite is a sweet syrupy plant-based extract) and rose infused honey to understand the healing properties of roses, physically, emotionally and spiritually." Lens = botanical/herbal preservation (infusion/extraction). Stretches the food-preservation framing but is still a *substance-stabilization-via-sugar/alcohol* technique, consistent with the canning/pickling/fermenting cohort. Other concepts: Social Studies `cultural traditions`.
- `1w_JBTJYmqF0qcXiOtV_nV32nphCjD8uEYRSHdHyROFE` **Three Sisters Succotash** (Social Studies): "Students will learn to make a simple Native American dish using corn, beans, and squash. They will also compare and contrast modern and past methods of preservation." Lens = potentially cultural-historical preservation of Indigenous foodways — `preservation` here is tagged *only* under Social Studies (Science slot has `plant parts` only), paired with `Indigenous / North American / Americas` cultural heritage tags and Social Studies `cultural traditions`. The "compare and contrast modern vs past methods" framing is comparative-history, not technique-acquisition. This is the one lesson whose `preservation` use case looks distinguishable.
- `1w0c7tESqksEPlQL-Fj1tpTL3i2ofmN_Agq-UwwqErBE` **Sandor Katz: Food Hero** (Science, `food preservation` comparison): "Students learn about fermentation expert Sandor Katz and make cultured butter while discussing food preservation." Lens = food-science preservation (fermentation). Concepts: Science `fermentation, food preservation`; Social Studies `historical figures, cultural traditions`. Indistinguishable in lens from the 3 Science `preservation` lessons above — the only difference is the tagger picked the more specific term.

</details>

### `advertising`

- canonical_label: Advertising
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Social Studies (3)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies concept covering food-marketing and advertising-analysis lessons — typically tied to "Do we Recognize these Logos?" media-literacy lessons and food-industry-marketing critique. Adjacent long-tail concept `food marketing` 1 (Social Studies) may merge in cleanly; curriculum team can decide at Session 81 long-tail review. Recommend keep with surface label "Advertising".
- curriculum_notes: <to_fill>

### `advocacy`

- canonical_label: Advocacy
- verdict: <to_fill>
- frequency: 3 as-tagged, 4 if aliases merge
- current_subjects: Social Studies (3)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: [("community activism", 1)]
- theme_overlap: none
- claude_notes: Canonical Social Studies concept covering advocacy / civic-action lessons — Food System Advocates (Parts 1 + main), The Lorax Debate, action-orientation-on-issues. Long-tail singleton `community activism` (Social Studies, 1 — *Guerilla Gardening for Birds*, neighborhood civic action for bird habitat) folds in cleanly as a near-synonym; the §11 `community_systems` 15 canonical explicitly redirects `community activism` to merge here rather than into community_systems, since the lesson's "make seed bursts to grow bird-friendly plants in their neighborhood... role they can play to make New York City a better home" framing is structurally parallel to existing advocacy lessons. Post-merge total: 4 lessons. Adjacent §12 concepts `social_justice_issues` 5 and `environmental_justice` 3 are distinct civic concepts (issue-orientation vs action-orientation). Audit signal CON-05 (created Session 79) is closed by this entry's merge_aliases proposal pending Stage 2 implementation.
- curriculum_notes: <to_fill>

### `descriptive_writing`

- canonical_label: Descriptive Writing
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Literacy/ELA (3)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering descriptive-writing genre — typically tied to sensory-language food-memory lessons (e.g., Food Memories where students describe taste/smell/texture). Adjacent long-tail concept `descriptive language` 1 (Literacy/ELA) is likely a closely-related variant — the language-vs-writing distinction (using descriptive language vs producing descriptive composition) may collapse in practice. Curriculum team can decide at Session 81 long-tail review. Distinct from other §12 writing sub-types (see CON-12 for the writing-cluster canonical-shape question). Recommend keep with surface label "Descriptive Writing".
- curriculum_notes: <to_fill>

### `environmental_justice`

- canonical_label: Environmental Justice
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Social Studies (3)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Social Studies concept covering environmental-justice content — environmental impact of food systems, food debates, community impact of pollution. Per audit signal CON-06 (from §11 `community_systems` 15 entry), this concept currently overlaps semantically with `community_systems` ("food-system environmental impact" and "Environmental Impact of the Food System" lesson appears under both labels) and to a lesser extent with `social_justice_issues` 5. Stage 2 reviewer-validation pass should sharpen the boundary between these three concepts — or confirm the overlap as intentional broad-bucket framing. Adjacent §12 concepts `social_justice_issues` 5 (broader social-justice) and `advocacy` 3 (action-orientation) are kept as separate canonicals. Recommend keep with surface label "Environmental Justice"; flag the CON-06 boundary question for curriculum-team adjudication.
- curriculum_notes: <to_fill>

### `food_presentation`

- canonical_label: Food Presentation
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Arts (3)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Arts concept covering food-as-art-form lessons — plating, food-art design, visual-composition of meals. Distinct from §11 `visual_arts` 76 (broader visual-creation umbrella) and §11 `cultural_traditions` 206 (cultural framing). Recommend keep with surface label "Food Presentation".
- curriculum_notes: <to_fill>

### `graphing`

- canonical_label: Graphing
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Math (3)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math concept covering data visualization — bar graphs, pictographs, charts of cooking/garden data. Distinct from §11 `data_collection` 19 (broader data-work canonical) — graphing is the specific visualization step. Recommend keep with surface label "Graphing".
- curriculum_notes: <to_fill>

### `legumes`

- canonical_label: Legumes
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Science (3)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrow Science botanical concept covering legume plants (beans, lentils, peas) — typically tied to bean-cooking and lentil-lesson curriculum. Adjacent long-tail concept `plant-based proteins` 1 (Science) may overlap conceptually (legumes are the main plant-protein source) but is a distinguishably different nutritional lens; kept separate. Recommend keep with surface label "Legumes".
- curriculum_notes: <to_fill>

### `microorganisms`

- canonical_label: Microorganisms
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Science (3)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Science concept covering microorganism biology — yeast, bacteria, fermentation organisms — typically tied to fermentation lessons, sourdough, decomposition. Adjacent long-tail singletons `yeast` 1 (Science), `microbiome` 1 (Science), and `fermentation` 1 (Science) are narrower related concepts; the §11 `decomposition` 47 canonical covers the broader breakdown-process frame. Curriculum team can consider whether `microorganisms` should absorb these singletons at Session 81 long-tail review. Recommend keep with surface label "Microorganisms".
- curriculum_notes: <to_fill>

### `narrative_writing`

- canonical_label: Narrative Writing
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Literacy/ELA (3)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering narrative-composition genre — story-writing, personal-narrative, food-memory storytelling-as-composition. Distinct from §12 `cultural_narratives` 8 (which covers reading or telling culturally-rooted stories, including by other authors), and from §11 `storytelling` 76 (which covers narrative-comprehension and oral-sharing rather than student production). Distinct from other §12 writing sub-types (see CON-12 for the writing-cluster canonical-shape question). Recommend keep with surface label "Narrative Writing".
- curriculum_notes: <to_fill>

### `novel_connections`

- canonical_label: Novel Connections
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Literacy/ELA (3)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering text-to-text or text-to-experience connections from novel-reading — typically tied to literature-circle / novel-study lessons that connect a book's content to food, gardens, or cultural themes (Bud Not Buddy/Jam, etc.). The label is mildly idiomatic; curriculum team may want a clearer surface label like "Novel-to-Lesson Connections" or "Literature Connections". Distinct from §11 `recipe_reading` 69 (procedural-text reading) and §12 `cultural_narratives` 8 (culturally-rooted-story reading). Recommend keep with surface label "Novel Connections" (or curriculum-team preferred clearer phrasing).
- curriculum_notes: <to_fill>

### `opinion_writing`

- canonical_label: Opinion Writing
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Literacy/ELA (3)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Literacy/ELA concept covering opinion-piece composition — taste-test-opinion writing, "what's your favorite" reflection writing. Distinct from §12 `persuasive_writing` 4 (which targets audience-convincing via argument) and long-tail `argumentative writing` 2 (evidence-based argumentation). The opinion / persuasive / argumentative trio reflects Common Core ELA writing-standard distinctions (opinion = K-5; argument = 6-12; persuasive = pre-CCSS umbrella term); curriculum team may want to flag this distinction in pedagogical context. The broader writing-cluster canonical-shape question (writing 8 generic + sub-types) is captured in CON-12. Recommend keep with surface label "Opinion Writing".
- curriculum_notes: <to_fill>

### `recipe_scaling`

- canonical_label: Recipe Scaling
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Math (3)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Canonical Math concept covering recipe-scaling arithmetic — doubling/halving recipes, ratio-based scaling for portion-counts. Adjacent long-tail concepts `scaling` 1 (Math — generic; possibly absorb at Session 81 long-tail review), `ratios` 2 (Math), and `unit rates` 2 (Math) are kept as separate canonicals; `recipe_scaling` is the recipe-specific application. Distinct from §12 `fractions` 9 (which provides the arithmetic foundation but is used outside recipe contexts too). Recommend keep with surface label "Recipe Scaling".
- curriculum_notes: <to_fill>

### `root_vegetables`

- canonical_label: Root Vegetables
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Science (3)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrow Science botanical concept covering root vegetables — carrots, potatoes, beets, radishes — typically tied to root-vegetable cooking lessons. Adjacent long-tail concept `roots` 2 (Science) is distinct anatomically (general plant-anatomy concept). Per §11 `plant_parts` 239 claude_notes, both `roots` and `root_vegetables` are "anatomically more specific concepts the corpus distinguishes from the generic `plant_parts` (not aliases)" — the corpus convention treats them as standalone. Recommend keep with surface label "Root Vegetables" as a culinary-botanical specific concept.
- curriculum_notes: <to_fill>

### `seed_dispersal`

- canonical_label: Seed Dispersal
- verdict: <to_fill>
- frequency: 3 appearances
- current_subjects: Science (3)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrow Science ecological concept covering seed-dispersal mechanisms — water, wind, animal-attachment — typically tied to model-building lessons where students design seed-dispersal mechanisms. Per §11 `seeds` 13 claude_notes, `seed_dispersal` is kept as a separate canonical (distinct ecological lens from the broader seeds concept; all 3 corpus lessons are model-building exercises). Adjacent long-tail concept `seed starting` 1 (Science) is also kept separate per §11 seeds claude_notes (propagation/germination concept). Recommend keep with surface label "Seed Dispersal".
- curriculum_notes: <to_fill>

---

## §13 Long-tail tier — concepts with 1–2 appearances

> **Status: filled (137 of 137 entries).** Session 81 per-value fills landed in PR-Concepts-3 with 137 entries (29 frequency-2 + 108 frequency-1, all alphabetical within frequency-descending order per D-C3). Single-PR option chosen per D-C14 split decision (alternatives considered: 108-vs-29 split, even-thirds split, alphabetical halves — single PR wins because merge clusters stay coherent: `plant_identification` aliases span freq-2 + freq-1, `adaptations` aliases span 3 freq-1 entries, `cultural_traditions` / `community_systems` / `visual_arts` alias members are mixed freq). No upfront Opus batch needed (Session 79's Phase 1 batch covered the cross-cutters and ambiguous near-duplicate clusters; long-tail singletons are mostly drop-by-content-light judgment or merge-into-proposed-canonical). Forward-referenced merge_alias proposals from §11/§12 land here as alias-side entries (CON-05 advocacy / CON-09 preservation / CON-11 historical_context closure; §11 cultural_traditions / community_systems / visual_arts; §12 adaptations / plant_identification / social_justice_issues / how_to_writing / reading_comprehension; §11 seasonal_changes seasons cluster). Awaiting curriculum-team verdicts on `verdict` and `curriculum_notes` fields.
>
> **Review depth (D-C15):** light. Most entries are `drop` (vague singletons like `garden topics`, `general exploration`, `plant science` per CON-02/CON-03) or `merge` (near-duplicate of a higher-tier canonical, often with the merge proposal already living in the §11/§12 canonical entry's `merge_aliases` field). Rapid skim is fine for clear-drop singletons; merge-candidate clusters warrant attention; the CON-11 `historical_context` merge-vs-keep call + the §6 theme-overlap `food systems` entry + CON-16 Indigenous-cluster reframing question + CON-22 reading-cluster boundary all need substantive verdicts.
>
> **Frequency cutoff calibratability:** the 1–2 cutoff was the Session 78 locked default; Session 80 punted the split decision to Session 81; Session 81 ran the calibration probe (returns **108 freq-1 + 29 freq-2 = 137 ✓** at `retired_at IS NULL` filter, matching Session 80's preliminary count exactly) and committed to single-PR per D-C14.

<!-- Per-value entries — Session 81; 137 entries frequency-descending, alphabetical tie-break within frequency. 29 freq-2 entries first, then 108 freq-1 entries. -->

### `argumentative_writing`

- canonical_label: Argumentative Writing
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by audit signal CON-12 (writing-cluster canonical-shape question; see §12 `writing` entry). Pedagogically distinct from §12 `persuasive_writing` 4 in some upper-grade ELA frameworks (Common Core distinguishes "argument" as evidence-based claim support from "persuasion" as rhetorical appeal), but the corpus signal at N=2 cannot reliably support that distinction. Verdict depends on the CON-12 curriculum-team decision: (a) keep `writing` 8 as catch-all → this entry plausibly merges into `persuasive_writing` 4 or stands alone; (b) drop `writing` 8 → keep this as a sub-canonical; (c) flip writing as canonical with sub-types as aliases → merge into `writing`. Recommend pending CON-12 verdict.
- curriculum_notes: <to_fill>

### `climate`

- canonical_label: Climate
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Science concept covering climate science framings (regional climate, climate-vs-weather distinction). Paired with long-tail singleton `climate change` 1 (Science) — see CON-20 audit signal for the climate / climate_change merge-or-distinguish question. Curriculum team may keep `climate` as the broader canonical and absorb `climate change` 1 as merge_alias (climate change is a sub-topic of climate science), OR keep both standalone if the climate-change-specific framing is pedagogically distinct. Recommend keep with `climate change` 1 as candidate merge_alias pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `consumers`

- canonical_label: Consumers
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Ecology concept (food-web trophic level — organisms that consume producers). Pairs with long-tail singleton `producers` 2 (Science) — both are food-web-position concepts. Recommend merge into §11 `food_webs` 11 cluster, OR keep both as a standalone trophic-level mini-cluster if the curriculum team wants explicit producers/consumers tagging. The merge direction is supported by `food_webs` being the established canonical home for trophic-level lessons; producers/consumers are sub-concepts of food-web structure.
- curriculum_notes: <to_fill>

### `discussion`

- canonical_label: Discussion
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Literacy/ELA concept covering classroom-discussion practice — accountable talk, paired discussion, whole-class conversation. Adjacent long-tail concepts `debate` 1 (Lit/ELA) + `public speaking` 1 (Lit/ELA) cover narrower oral-communication practices; curriculum team may consolidate the trio (discussion + debate + public_speaking) into a single `oral_communication` canonical at re-tag time, or keep separate. Recommend keep with surface label "Discussion".
- curriculum_notes: <to_fill>

### `erosion`

- canonical_label: Erosion
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct earth-science concept covering soil-erosion, water-erosion, and weathering processes. Adjacent §11 `soil_science` 44 covers the broader soil-formation frame; erosion is a specific process narrower than soil_science. Recommend keep standalone with surface label "Erosion"; curriculum team may also fold into soil_science if the corpus signal feels narrow.
- curriculum_notes: <to_fill>

### `germination`

- canonical_label: Germination
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct plant-biology concept covering seed-germination process — the specific transition from dormant seed to emerging seedling. Adjacent §11 `life_cycles` 43 covers broader cyclic-process frame; §12 `plant_growth` 9 covers post-germination growth stages; §11 `seeds` 13 covers seed-anatomy-and-planting. Germination is the specific moment-of-emergence concept distinguishable from these neighbors. Recommend keep standalone with surface label "Germination"; curriculum team may merge into plant_growth or seeds if the boundary feels artificial.
- curriculum_notes: <to_fill>

### `identifying_plants`

- canonical_label: Identifying Plants
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Verb-form drift of §12 `plant_identification` 5 — already proposed for merge in `plant_identification`'s `merge_aliases: [("identifying plants", 2), ("plant ID", 1)]`. Post-merge total for plant_identification canonical: 8 lessons. The §7 worksheet methodology used this cluster as the canonical example of merge_aliases conventions. Recommend merge into `plant_identification` per the established proposal.
- curriculum_notes: <to_fill>

### `informational_writing`

- canonical_label: Informational Writing
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by audit signal CON-12. Pedagogically distinct from §12 `how_to_writing` 5 (procedural genre) and §12 `descriptive_writing` 3 (sensory-detail genre) — informational writing emphasizes factual exposition rather than process-explanation or vivid-imagery. One of the two lessons here is the *Informational Writing - Topics/Subtopics* template that surfaced CON-03 (the lesson with vague Science co-tags `garden topics` + `plant science`). Verdict depends on CON-12 verdict: (a) keep `writing` 8 as catch-all → keep this standalone or merge into how_to_writing; (b) drop writing 8 → keep as sub-canonical; (c) flip → merge into writing. Recommend pending CON-12 verdict.
- curriculum_notes: <to_fill>

### `patterns`

- canonical_label: Patterns
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Math (2)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Math concept covering pattern recognition (number patterns, shape patterns, garden-bed arrangement patterns). Adjacent §11 `counting` 20, `data_collection` 19, `estimation` 15 are different math practices kept as separate canonicals. Recommend keep with surface label "Patterns".
- curriculum_notes: <to_fill>

### `performance`

- canonical_label: Performance
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Arts (2)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Arts concept covering performance arts (skits, plays, demonstrations). Adjacent long-tail Arts concepts `dance` 1, `puppetry` 1, `puppet making` 1, `instrument making` 1 cover specific performance modalities; curriculum team may consolidate under a broader `performing_arts` canonical at re-tag time. Recommend keep with surface label "Performance" pending the broader Arts-cluster review.
- curriculum_notes: <to_fill>

### `phases_of_matter`

- canonical_label: Phases of Matter
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Physical-science concept covering states / phases of matter (solid / liquid / gas / transitions). Closely paired with long-tail singleton `states of matter` 1 (Science) — see CON-19 audit signal for the phases-vs-states canonical-label question; both labels refer to the same physical-chemistry concept. Recommend canonical here as `phases_of_matter` (higher frequency wins per §7 alpha tie-break convention used in §11/§12) with `states of matter` as merge_alias proposal pending curriculum-team verdict on canonical surface label.
- curriculum_notes: <to_fill>

### `plant_nutrition`

- canonical_label: Plant Nutrition
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct plant-biology concept covering plant-nutritional-uptake processes (water, nutrients, photosynthesis-derived energy). Adjacent §11 `plant_needs` 41 covers resource requirements broadly; §12 `photosynthesis` 8 covers the specific energy-production mechanism; §12 `nutrition` 4 covers human nutrition. Recommend keep standalone — narrower than plant_needs but distinct from photosynthesis. Curriculum team may merge into plant_needs if the boundary feels artificial.
- curriculum_notes: <to_fill>

### `poetry`

- canonical_label: Poetry
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (1), Arts (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: Arts
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Cross-subject concept appearing once each under Literacy/ELA and Arts — one of 8 known cross-subject concepts per §8. The Lit/ELA-side lens is typically text-poetry reading or composition; the Arts-side lens is performance-poetry (recitation, spoken word). Both lenses are pedagogically real (unlike the tagging-artifact crosses in CON-04/08/10), so Lit/ELA primary + Arts secondary is the recommendation. Curriculum team confirms whether to keep both subjects as canonical (poetry as a genuine cross-subject concept) or consolidate to a single subject home. Recommend keep cross-subject with Lit/ELA primary.
- curriculum_notes: <to_fill>

### `producers`

- canonical_label: Producers
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Ecology concept (food-web trophic level — autotrophic organisms, primarily plants, that produce food via photosynthesis). Pairs with long-tail freq-2 `consumers` 2 (Science) and §11 `food_webs` 11. Recommend merge into §11 `food_webs` 11 cluster as a trophic-level sub-concept, OR keep both `producers` + `consumers` standalone as a paired mini-cluster if curriculum team wants explicit producers/consumers tagging. The merge direction is supported by `food_webs` being the established canonical home for trophic-level lessons.
- curriculum_notes: <to_fill>

### `protein`

- canonical_label: Protein
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Nutrition-chemistry concept covering protein as a macronutrient. Adjacent singletons `macromolecules` 1 + `macronutrients` 1 (both Science) + §12 `nutrition` 4 + §11 `nutrition_education` 107 cover broader nutrition-related concepts; long-tail `plant-based proteins` 1 (Science) is the specific plant-protein subtopic. Recommend keep standalone OR merge into `macronutrients` 1 (treat protein as a specific macronutrient example) — both pick the same content; curriculum team picks the surface-label preference.
- curriculum_notes: <to_fill>

### `ratios`

- canonical_label: Ratios
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Math (2)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Math concept covering ratio reasoning — typically tied to recipe scaling (ingredient ratios) and proportional reasoning. Adjacent freq-2 `unit_rates` 2 (Math) is closely related (rates are a specific kind of ratio); §12 `recipe_scaling` 3 applies ratio reasoning specifically. Recommend keep standalone with `unit rates` 2 as candidate merge_alias (ratios is the broader concept, unit rates a sub-application) pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `reading`

- canonical_label: Reading
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic Literacy/ELA tag without specified comprehension-or-genre frame. Recommend merge into §12 `reading_comprehension` 6 — `reading_comprehension` is the established canonical for reading-for-understanding lessons; `reading` 2 is a label-shortening variant. Curriculum team may instead keep `reading` 2 as a separate broader-frame canonical if the 2 lessons here are not specifically comprehension-focused (read-aloud, sustained silent reading, etc.) — see CON-22 audit signal for the broader reading-cluster boundary question (reading / reading_comprehension / narrative_reading / biography_reading / informational_text).
- curriculum_notes: <to_fill>

### `recipe_writing`

- canonical_label: Recipe Writing
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by CON-12. Already flagged in §12 `how_to_writing` 5's claude_notes as candidate merge_alias (recipe writing is a specific application of how-to writing — procedural composition with ingredient-quantity emphasis). Recommend merge into §12 `how_to_writing` 5 pending CON-12 curriculum-team verdict on the broader writing-cluster shape. If CON-12 picks option (a) `writing` 8 as catch-all, `recipe_writing` could either fold into how_to_writing or remain a distinct sub-canonical.
- curriculum_notes: <to_fill>

### `research`

- canonical_label: Research
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Literacy/ELA concept covering research practices — gathering information, citing sources, organizing findings. Adjacent long-tail concept `note-taking` 1 (Lit/ELA) is a research sub-practice. Recommend keep with surface label "Research"; curriculum team may consolidate research + note_taking into a single canonical at re-tag time.
- curriculum_notes: <to_fill>

### `roots`

- canonical_label: Roots
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific plant-anatomy concept (roots as a plant part). The §11 `plant_parts` 239 canonical is the established home for plant-anatomy tagging; `roots` 2 is plausibly a sub-part-specific drift that should merge into plant_parts. Adjacent §12 `root_vegetables` 3 covers a related but distinct concept (vegetables grown from roots — turnips, carrots, beets — emphasizing the harvest-and-eat dimension rather than plant anatomy). Recommend merge into §11 `plant_parts` 239 as a sub-anatomy alias.
- curriculum_notes: <to_fill>

### `scientific_method`

- canonical_label: Scientific Method
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Science concept covering the scientific-method-as-practice frame (hypothesis, experiment, conclusion). Closely paired with long-tail singleton `scientific claims` 1 (Science) — both cover science-as-practice rather than science-as-content. Recommend keep standalone with `scientific claims` 1 as candidate merge_alias; alternatively keep both standalone as parallel science-practice canonicals. Curriculum team picks.
- curriculum_notes: <to_fill>

### `seasonal_change`

- canonical_label: Seasonal Change
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Singular-form drift of §11 `seasonal_changes` 10 (entry 32) — already proposed in `seasonal_changes`'s `merge_aliases: [("seasonal change", 2), ("seasons", 2)]`. Post-merge total for seasonal_changes canonical: 14 lessons. Per CON-01 audit signal, the broader seasonality cluster (seasonal_changes / seasonality / seasonal_eating / seasonal_cycles) has cross-cluster mistagging where "Seasons" template-trio lessons split between phenomenology (`seasonal_change`) and food-availability (`seasonal_eating`) canonicals. Recommend merge into §11 `seasonal_changes` 10.
- curriculum_notes: <to_fill>

### `seasons`

- canonical_label: Seasons
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic-label drift of §11 `seasonal_changes` 10 (entry 32) — already proposed in `seasonal_changes`'s `merge_aliases: [("seasonal change", 2), ("seasons", 2)]`. The 2 lessons here are part of the "Seasons" template-trio cohort surfaced in CON-01 audit signal (cross-cluster mistagging between seasonality canonicals). Recommend merge into §11 `seasonal_changes` 10.
- curriculum_notes: <to_fill>

### `sequencing`

- canonical_label: Sequencing
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Literacy/ELA (2)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Literacy/ELA concept covering sequencing practices — ordering events, story-sequence, procedural-sequence. Recommend keep standalone with surface label "Sequencing"; the concept is structurally distinct from §12 `reading_comprehension` 6 (which covers broader text-understanding) and §11 `vocabulary_development` 59 (which covers word-level work).
- curriculum_notes: <to_fill>

### `social_justice`

- canonical_label: Social Justice
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Social Studies (2)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Label-shortening variant of §12 `social_justice_issues` 5 — already proposed in `social_justice_issues`'s `merge_aliases: [("social justice", 2)]`. Post-merge total for social_justice_issues canonical: 7 lessons. Curriculum team may flip the canonical direction (use `social_justice` as the surface label, treat `social_justice_issues` 5 as the merge_alias) — both pick the same merged cohort; the choice is purely surface-label preference. Recommend merge per the established proposal.
- curriculum_notes: <to_fill>

### `spices`

- canonical_label: Spices
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrow cooking-science concept covering spice-related lessons (taste-and-flavor, food chemistry, cultural cuisine spice profiles). The Science subject placement is borderline — these lessons are typically more cultural-culinary than scientific in framing. Recommend keep standalone with surface label "Spices"; curriculum team may also drop as too narrow OR consider re-subject-tagging (Social Studies-side cultural-cuisine if the 2 lessons frame spices culturally rather than chemically).
- curriculum_notes: <to_fill>

### `tool_use`

- canonical_label: Tool Use
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Science (2)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Science concept covering scientific tool-use (microscope, scale, measuring instruments) in garden / cooking contexts. Adjacent §12 `simple_machines` 1 covers physics-tool-use; tool_use is the broader laboratory/observation practice. Recommend keep with surface label "Tool Use"; curriculum team may also drop if the 2 lessons are not specifically about tool-use as a teaching concept.
- curriculum_notes: <to_fill>

### `unit_rates`

- canonical_label: Unit Rates
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Math (2)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific Math concept covering unit-rate reasoning (price per pound, miles per hour, etc.). Sub-application of freq-2 `ratios` 2 (rates are a specific kind of ratio). Recommend keep standalone if curriculum team wants explicit unit-rate tagging, OR merge into `ratios` 2 as a sub-concept. Both options keep the math signal; choice is granularity preference.
- curriculum_notes: <to_fill>

### `volume`

- canonical_label: Volume
- verdict: <to_fill>
- frequency: 2 appearances
- current_subjects: Math (2)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Geometric/measurement concept covering volume measurement (capacity, cubic units, recipe-quantity volume). Closely paired with §11 `measurement` 66 (the established canonical for measurement lessons) and long-tail singletons `weight` 1, `area` 1, `perimeter` 1 — see CON-23 audit signal for the measurement-cluster boundary question (volume / weight / area / perimeter / measurement). Recommend either merge into §11 `measurement` 66 as a sub-dimension alias OR keep standalone as a specific-measurement-dimension canonical; curriculum-team verdict on whether the §11 measurement canonical absorbs these sub-dimensions or keeps them as parallel specifics.
- curriculum_notes: <to_fill>

### `adaptation`

- canonical_label: Adaptation
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Singular-form drift of §12 `adaptations` 5 — already proposed in `adaptations`'s `merge_aliases: [("adaptation", 1), ("plant adaptation", 1), ("plant adaptations", 1)]`. Post-merge total for adaptations canonical: 8 lessons. Curriculum team may flip canonical direction (use `adaptation` as the surface label, treat `adaptations` 5 as the merge_alias) — both pick the same merged cohort; the choice is purely surface-label preference (singular feels more concept-y; plural feels more lesson-list-y). Recommend merge per the established proposal.
- curriculum_notes: <to_fill>

### `animal_welfare`

- canonical_label: Animal Welfare
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Social Studies concept covering animal-welfare ethics (factory farming, humane treatment, vegetarianism). Adjacent long-tail singleton `factory farming` 1 (SS) is closely related; both concepts together cover the food-ethics axis. Recommend keep standalone with surface label "Animal Welfare"; curriculum team may consolidate animal_welfare + factory_farming under a broader `food_ethics` canonical at re-tag time.
- curriculum_notes: <to_fill>

### `area`

- canonical_label: Area
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Geometry concept covering area calculation (garden-bed area, recipe-pan area). Part of the measurement-cluster boundary question (CON-23 — area / perimeter / volume / weight / measurement). Recommend merge into §11 `measurement` 66 as a sub-dimension alias, OR keep standalone if curriculum team wants explicit area tagging. The mid-tier `measurement` canonical is the established home for measurement lessons.
- curriculum_notes: <to_fill>

### `argumentation`

- canonical_label: Argumentation
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Practice-of-arguing concept (verbal claim-defense) — pairs with freq-2 `argumentative_writing` 2 (the written-form variant). Both are part of the CON-12 writing/argument-cluster. Adjacent long-tail `debate` 1 + `discussion` 2 + `public_speaking` 1 cover related oral-communication practices. Recommend keep or merge into `debate` 1 / `discussion` 2 pending CON-12 verdict on the broader argumentation-writing-discussion-debate cluster shape.
- curriculum_notes: <to_fill>

### `beneficial_insect_identification`

- canonical_label: Beneficial Insect Identification
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific Science concept covering beneficial-insect identification (pollinators, predators of pests) in garden contexts. Closely related to §11 `pollinators` 28 (broader pollinator-ecology canonical) and §12 `plant_identification` 5 (identification practice across plants — see also long-tail `identifying plants` 2 alias). Recommend merge into §11 `pollinators` 28 as a sub-concept OR drop as overly narrow specific application; the broader pollinator-ecology canonical likely covers the beneficial-insect framing.
- curriculum_notes: <to_fill>

### `biography`

- canonical_label: Biography
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Literary genre — biography as a reading category. Closely paired with long-tail singleton `biography reading` 1 (Lit/ELA) — see CON-22 audit signal for the reading-cluster boundary question. Recommend merge `biography` + `biography reading` into a single canonical (likely `biography_reading` or `biographies`) OR merge into §11 `storytelling` 76 (which covers culturally-rooted narratives and biographies of food-history figures — Cesar Chavez, Rachel Carson, Dr. Carver) as the established canonical home for biographical reading. Pending curriculum-team verdict on reading-cluster boundary.
- curriculum_notes: <to_fill>

### `biography_reading`

- canonical_label: Biography Reading
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Reading-practice variant of long-tail singleton `biography` 1 (Lit/ELA). See CON-22 reading-cluster audit signal. Recommend merge with `biography` 1 into a single canonical, OR merge both into §11 `storytelling` 76 / §12 `reading_comprehension` 6 / §12 `cultural_narratives` 8 (the latter is where biography-of-food-history-figures-as-cultural-narrative arguably belongs). Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `biotic_abiotic_factors`

- canonical_label: Biotic/Abiotic Factors
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Ecology concept distinguishing living (biotic) from non-living (abiotic) components of ecosystems. Closely related to §11 `ecosystems` 73 (the established broader ecology canonical). Recommend merge into §11 `ecosystems` 73 as a sub-concept — biotic/abiotic-factor framings are sub-vocabulary within ecosystem teaching. Curriculum team may keep standalone if the specific biotic/abiotic distinction warrants its own tag.
- curriculum_notes: <to_fill>

### `cardiovascular_system`

- canonical_label: Cardiovascular System
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific human-anatomy concept covering the cardiovascular system. Closely paired with long-tail singleton `circulatory system` 1 (Science) — see CON-18 audit signal for the cardiovascular/circulatory canonical-label question (these labels refer to the same anatomical system). Recommend merge into a single canonical (likely `circulatory_system` as the more commonly-used pedagogical surface label) with the other as alias. Curriculum-team verdict on surface label.
- curriculum_notes: <to_fill>

### `categorization`

- canonical_label: Categorization
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Classification skill — grouping items by attribute. Closely paired with long-tail singleton `sorting` 1 (Math) — both are classification practices. Recommend merge `categorization` + `sorting` into a single canonical (likely `categorization` as the more pedagogically formal term) OR keep both standalone if curriculum team wants distinct kindergarten-friendly tags.
- curriculum_notes: <to_fill>

### `cellular_respiration`

- canonical_label: Cellular Respiration
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct cellular-biology concept — the cellular energy-production process complementary to §12 `photosynthesis` 8 (these two are the paired energy-cycle concepts in biology curricula). Recommend keep standalone if curriculum team wants to preserve the cellular-respiration / photosynthesis pairing in the canonical vocabulary, OR drop as too narrow for the corpus (N=1). The keep argument is stronger if curriculum team wants symmetric coverage of the photosynthesis pair.
- curriculum_notes: <to_fill>

### `chemical_reactions`

- canonical_label: Chemical Reactions
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct chemistry concept covering chemical-reaction mechanisms (cooking-chemistry, fermentation as chemical-reaction). Adjacent long-tail `fermentation` 1 (Science) is a specific application of chemical reactions in cooking contexts. Recommend keep standalone with surface label "Chemical Reactions"; curriculum team may consolidate the chemistry-cluster (chemical_reactions + fermentation + yeast) at re-tag time.
- curriculum_notes: <to_fill>

### `circulatory_system`

- canonical_label: Circulatory System
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific human-anatomy concept — same anatomical system as long-tail singleton `cardiovascular system` 1 (see CON-18 audit signal). Recommend merge with `cardiovascular_system` 1 into a single canonical. Surface-label preference (cardiovascular vs circulatory) is a curriculum-team call; the two terms cover the same anatomy with different vocabulary registers (cardiovascular is medical / clinical; circulatory is K-12 pedagogically common).
- curriculum_notes: <to_fill>

### `civil_rights_movement`

- canonical_label: Civil Rights Movement
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific historical-movement concept tied to civil-rights-era lessons (likely co-tagged with `historical_figures` 68 for figures like Georgia Gilmore, Cesar Chavez, etc.). Adjacent §12 `social_justice_issues` 5 covers broader social-justice frames. Recommend keep standalone with surface label "Civil Rights Movement" — specific enough as a historical-movement concept to warrant its own canonical, distinct from the broader social-justice category.
- curriculum_notes: <to_fill>

### `climate_change`

- canonical_label: Climate Change
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific climate-science concept — sub-topic of `climate` 2 (freq-2). See CON-20 audit signal for the climate / climate_change canonical-shape question. Recommend merge into `climate` 2 as a sub-concept (climate change is a specific phenomenon within climate science), OR keep both standalone if curriculum team wants distinct climate-change tagging for environmental-justice / advocacy lessons. The merge direction is supported by climate being the broader canonical.
- curriculum_notes: <to_fill>

### `coloring`

- canonical_label: Coloring
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific Arts technique — already proposed for merge in §11 `visual_arts` 76's `merge_aliases: [("coloring", 1), ("craft activity", 1)]`. Coloring is a sub-technique of visual_arts (the established broad-Arts canonical). Recommend merge per the established proposal.
- curriculum_notes: <to_fill>

### `colors_of_plants`

- canonical_label: Colors of Plants
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague observation-frame tag — closer to a lesson topic ("today we looked at plant colors") than a distinct scientific concept. Recommend merge into §11 `plant_parts` 239 (plant anatomy includes coloration), OR `sensory_exploration` 11 (color observation as a sensory practice), OR drop as too narrow. Pending curriculum-team verdict; lean toward merge into plant_parts.
- curriculum_notes: <to_fill>

### `community`

- canonical_label: Community
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Label-shortening drift of §11 `community_systems` 15 — already proposed in `community_systems`'s `merge_aliases: [("community", 1), ("community building", 1)]`. Per CON-06 audit signal, community_systems double-duties as "food systems" + "environmental systems" + "community structures" — `community` 1 plausibly lands on the community-structures lens. Recommend merge into §11 `community_systems` 15.
- curriculum_notes: <to_fill>

### `community_activism`

- canonical_label: Community Activism
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Cross-cluster merge target per CON-05 audit signal — already proposed in §12 `advocacy` 3's `merge_aliases: [("community activism", 1)]` (NOT into §11 `community_systems` 15 despite the surface-label cluster; activism is the action-orientation that pairs with advocacy, not the structural systems frame of community_systems). The lesson here is "Guerilla Gardening for Birds" (per CON-05 evidence). Recommend merge into §12 `advocacy` 3 per the established proposal.
- curriculum_notes: <to_fill>

### `community_building`

- canonical_label: Community Building
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Label variant of §11 `community_systems` 15 — already proposed in `community_systems`'s `merge_aliases: [("community", 1), ("community building", 1)]`. Per CON-06, the broader community_systems canonical may eventually narrow its scope (sharpen the food-systems vs environmental-systems vs community-structures boundaries); `community_building` would fall on the community-structures side. Recommend merge into §11 `community_systems` 15; curriculum team may also drop if the boundary-sharpening in CON-06 retires this surface-label.
- curriculum_notes: <to_fill>

### `comparative_writing`

- canonical_label: Comparative Writing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by CON-12. Pedagogically distinct from §12 `descriptive_writing` 3 + `narrative_writing` 3 + `persuasive_writing` 4 + `opinion_writing` 3 — comparative writing emphasizes side-by-side analysis. Verdict depends on CON-12 verdict; recommend pending curriculum-team decision.
- curriculum_notes: <to_fill>

### `craft_activity`

- canonical_label: Craft Activity
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Activity-tag rather than a distinct Arts concept — already proposed for merge in §11 `visual_arts` 76's `merge_aliases: [("coloring", 1), ("craft activity", 1)]`. Recommend merge into §11 `visual_arts` 76 per the established proposal; alternatively drop as too vague (curriculum team may judge "craft activity" as a context-tag like "this lesson involves crafting" rather than a concept).
- curriculum_notes: <to_fill>

### `creative_writing`

- canonical_label: Creative Writing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by CON-12 — note this is corpus-tagged Arts not Literacy/ELA (per §12 `writing` entry and Appendix A.6), an apparent tagging-artifact since creative writing is canonically a Lit/ELA practice. Recommend re-subject to Literacy/ELA as part of CON-12 cluster decision. Per CON-12 verdict: (a) keep `writing` 8 as catch-all → merge `creative_writing` into `writing`; (b) drop `writing` 8 → keep as Lit/ELA sub-canonical; (c) flip → merge into `writing` 8. Pending CON-12 curriculum-team verdict.
- curriculum_notes: <to_fill>

### `dance`

- canonical_label: Dance
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Arts concept covering dance / movement-arts. Adjacent §12 `movement` 4 (Arts) is the broader movement-canonical (dance is a specific kind of movement). Recommend merge into §12 `movement` 4 as a sub-concept OR keep standalone if curriculum team wants explicit dance tagging.
- curriculum_notes: <to_fill>

### `debate`

- canonical_label: Debate
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Distinct Literacy/ELA concept — formal debate practice (resolved-position arguing). Part of the argument-discussion-debate cluster (CON-12-adjacent — see also long-tail `argumentation` 1, `discussion` 2, `public_speaking` 1). Recommend keep standalone with surface label "Debate" OR consolidate into a broader `oral_communication` / `discussion` canonical at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `descriptive_language`

- canonical_label: Descriptive Language
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Literacy concept covering descriptive-language use (sensory words, adjectives, vivid imagery). Part of the figurative-language-cluster — see long-tail singletons `figurative language` 1, `similes` 1, `sensory details` 1 + §11 `vocabulary_development` 59. Recommend merge into §11 `vocabulary_development` 59 (the broader word-craft canonical) OR consolidate the figurative-language cluster (descriptive_language + figurative_language + similes + sensory_details) into a single `figurative_language` canonical at curriculum-team discretion — see CON-24 audit signal for the cluster boundary.
- curriculum_notes: <to_fill>

### `design`

- canonical_label: Design
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague Arts concept — could be visual design, graphic design, garden design, or design-thinking process. Recommend keep standalone OR drop as too vague; if keep, curriculum team should clarify surface label (e.g., "Visual Design" or "Garden Design") for downstream coherence.
- curriculum_notes: <to_fill>

### `engineering`

- canonical_label: Engineering
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Engineering as a subject is conventionally Science (STEM); corpus-tagging under Arts is an apparent tagging-artifact. Adjacent §12 `simple_machines` 1 (Science) and `mechanical energy` 1 (Science) cover engineering-adjacent physics. Recommend re-subject to Science AND merge into §12 `simple_machines` 1 OR keep standalone after re-subject; curriculum-team verdict on surface-label and subject placement.
- curriculum_notes: <to_fill>

### `environmental_impact`

- canonical_label: Environmental Impact
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague environmental-effects concept — closely related to §12 `environmental_justice` 3 (advocacy-oriented environmental ethics) and §11 `community_systems` 15 (per CON-06, includes environmental-systems lens). Recommend merge into §12 `environmental_justice` 3 (the advocacy-canonical) OR keep standalone if curriculum team wants a neutral environmental-effects tag distinct from environmental-justice advocacy. Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `environmental_stewardship`

- canonical_label: Environmental Stewardship
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Environmental-ethics concept emphasizing responsible-care framing (distinct from environmental_justice's advocacy frame). Adjacent §12 `environmental_justice` 3 (SS) and long-tail `environmental impact` 1 (SS) cover related environmental-themed concepts. Recommend merge into a broader environmental-ethics canonical (potentially renaming environmental_justice to a more inclusive term) OR keep standalone with surface label "Environmental Stewardship"; curriculum team picks.
- curriculum_notes: <to_fill>

### `factory_farming`

- canonical_label: Factory Farming
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific food-systems concept tied to industrial-agriculture critique. Adjacent long-tail singletons `animal welfare` 1 (SS), `farm labor` 1 (SS), `food marketing` 1 (SS), `food systems` 1 (SS — theme overlap) cover related food-systems / food-ethics tags. Recommend keep standalone OR consolidate the food-ethics cluster (animal_welfare + factory_farming + farm_labor + food_marketing) under a broader `food_ethics` canonical at curriculum-team discretion. The §11 `community_systems` 15 may already cover factory_farming's food-systems aspect.
- curriculum_notes: <to_fill>

### `family_traditions`

- canonical_label: Family Traditions
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrower family-specific lens within the cultural-traditions frame — already proposed in §11 `cultural_traditions` 206's `merge_aliases: [("family traditions", 1), ("international food traditions", 1)]`. Family traditions is a sub-application of cultural traditions where the cultural unit is family rather than ethnic / national group. Recommend merge into §11 `cultural_traditions` 206 per the established proposal.
- curriculum_notes: <to_fill>

### `farm_labor`

- canonical_label: Farm Labor
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Labor-history concept tied to farm-worker / Cesar-Chavez / migrant-labor lessons. Adjacent long-tail `factory_farming` 1, `slavery` 1, `civil_rights_movement` 1 cover related labor-history and ethics concepts. Recommend keep standalone with surface label "Farm Labor" OR consolidate into a broader `labor_history` canonical at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `feedback_systems`

- canonical_label: Feedback Systems
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Advanced biology/systems-thinking concept covering feedback loops (homeostatic regulation, ecological feedback). Adjacent long-tail singleton `homeostasis` 1 (Science) covers the biological-regulation lens specifically. Recommend keep standalone OR consolidate feedback_systems + homeostasis under a broader `biological_systems` canonical at curriculum-team discretion. May also drop as too advanced for the K-12 corpus signal.
- curriculum_notes: <to_fill>

### `fermentation`

- canonical_label: Fermentation
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific chemistry/biology concept covering fermentation processes (yeast, bacteria, food-preservation chemistry). Per CON-09 audit signal, fermentation is one of the §12 `preservation` cluster's content patterns (the Sandor Katz "Food Hero" lesson — currently tagged `food preservation` 1 — covers fermentation specifically). Adjacent long-tail singletons `yeast` 1 (Sci) + `chemical reactions` 1 (Sci) cover related fermentation-specific chemistry. Recommend keep standalone OR merge into a broader cooking-chemistry canonical (fermentation + yeast + chemical_reactions) at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `figurative_language`

- canonical_label: Figurative Language
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Literacy concept covering metaphor / simile / personification / imagery. Part of the figurative-language cluster (CON-24) — see long-tail singletons `descriptive_language` 1, `similes` 1, `sensory_details` 1. Recommend either keep `figurative_language` as the canonical absorbing `similes` 1 + (potentially) `descriptive_language` 1 + `sensory_details` 1 as merge_aliases, OR consolidate into §11 `vocabulary_development` 59 as the broader word-craft canonical. Pending curriculum-team verdict on cluster shape.
- curriculum_notes: <to_fill>

### `food_marketing`

- canonical_label: Food Marketing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Commercial food-industry concept covering marketing-of-food (advertising-aimed-at-children, food-packaging analysis). Closely related to §12 `advertising` 3 (Social Studies) — food_marketing is a specific application of advertising in the food-systems context. Recommend merge into §12 `advertising` 3 (the broader canonical) OR keep standalone if curriculum team wants explicit food-marketing tagging distinct from general advertising.
- curriculum_notes: <to_fill>

### `food_memory`

- canonical_label: Food Memory
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Niche concept — likely tied to a personal-narrative / food-memoir writing or reading lesson. Adjacent §12 `cultural_narratives` 8 (Lit/ELA) covers culturally-rooted narrative which often involves food-memory framing. Recommend merge into §12 `cultural_narratives` 8 OR drop as too narrow / niche; pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `food_preservation`

- canonical_label: Food Preservation
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: CON-09 closure — already proposed for merge in §12 `preservation` 4's `merge_aliases: [("food preservation", 1)]`. The Science-side merge is straightforward (Sandor Katz "Food Hero" lesson covers fermentation, which is food-preservation chemistry — same lens as the other Science preservation lessons). Post-merge total for preservation canonical: 5 lessons. Recommend merge per the established proposal; cultural-preservation lens (Three Sisters Succotash SS-tagged `preservation` 1 in §12) is the open question CON-09 captures.
- curriculum_notes: <to_fill>

### `food_processing`

- canonical_label: Food Processing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague concept — could be industrial food-processing (commercial scale) or kitchen food-prep (small scale). The Science subject tagging suggests the industrial / food-chemistry frame. Adjacent §12 `preservation` 4, `fermentation` 1, `chemical_reactions` 1 cover related food-chemistry concepts. Recommend keep standalone OR merge into a broader food-chemistry canonical at curriculum-team discretion. May also drop as too vague.
- curriculum_notes: <to_fill>

### `food_systems`

- canonical_label: Food Systems
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: YES — `food systems` (concepts, Social Studies 1) shares a vocabulary with `Food Systems` (themes, Title Case canonical per `src/utils/filterDefinitions.ts`) under `lower()`. One of three known concept↔theme overlaps in §6 (`ecosystems` exact-string at §11 entry 6; `food systems` and `plant growth` are case-normalized matches; `plant_growth` 9 lives at §12). Per D-C5, adjudication (which side keeps the canonical string; whether both keep with cross-reference; whether one side renames) is deferred to the themes worksheet / D4 canonicalization migration; this flag preserves the signal. Per CON-06, §11 `community_systems` 15 already double-duties as the "food systems" lens within concepts — the themes-side overlap may make this entry redundant entirely. Three resolution options: (a) concept-side keeps the canonical (`food systems` 1 standalone); (b) themes-side keeps the canonical (drop the concept entry); (c) both keep with cross-reference. Themes worksheet existence gates the verdict.
- claude_notes: One of 3 theme-overlap concepts per §6 / D-C5. Per CON-06, the broader `community_systems` 15 (§11) double-duties as the food-systems lens within concepts already. The 1-lesson signal here likely doesn't warrant its own canonical when the themes-side `Food Systems` and the concepts-side `community_systems` together cover the food-systems frame. Recommend pending themes worksheet existence + the §11 `community_systems` boundary-sharpening (CON-06 Stage 2 action). Most likely Stage 2 outcome: drop concept-side `food_systems` 1 entirely, theme-side `Food Systems` carries the food-systems-as-theme signal, and `community_systems` 15 narrows to community-structures-only.
- curriculum_notes: <to_fill>

### `garden_topics`

- canonical_label: Garden Topics
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Drop per CON-03 audit signal — `garden topics` is one of two vague Science concepts tagged on the *Informational Writing - Topics/Subtopics* ELA lesson (the other being `plant science` 1, also a drop). The lesson teaches the literacy concept of topics-vs-subtopics using cooking/gardening as brainstorming fodder; the Science tags are defensive slot-filling, not real concepts being taught. Zero plant biology, zero growth processes. Recommend drop.
- curriculum_notes: <to_fill>

### `general_exploration`

- canonical_label: General Exploration
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Drop per CON-02 audit signal — `general exploration` is the lone Science singleton on the *Soul Food Sunday* template-stub lesson (body is verbatim ESYNYC blank template "Do something here. (time)"; never filled). The lesson is a cleanup-candidate to either delete or recover; the Science tag is template-default scaffolding, not a real concept. Recommend drop (will resolve with CON-02 cleanup track).
- curriculum_notes: <to_fill>

### `growing_cycles`

- canonical_label: Growing Cycles
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague plant-process tag — covered by either §11 `life_cycles` 43 (broader cyclic-process frame including plants and animals) or §12 `plant_growth` 9 (specific plant-growth-stages frame). Recommend merge into §12 `plant_growth` 9 (plant-specific) OR §11 `life_cycles` 43 (broader); the §11 canonical is the more established home, but plant_growth more semantically specific. Pending curriculum-team verdict; lean toward plant_growth merge for specificity.
- curriculum_notes: <to_fill>

### `growth_patterns`

- canonical_label: Growth Patterns
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague plant-growth-pattern tag — covered by §12 `plant_growth` 9. Recommend merge into §12 `plant_growth` 9 OR drop as too vague to be canonical; pending curriculum-team verdict. Adjacent long-tail singleton `growing cycles` 1 (Science) is a similar vague-Science-singleton that lands on similar merge candidates.
- curriculum_notes: <to_fill>

### `harvest`

- canonical_label: Harvest
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Noun-form gardening concept — closely paired with long-tail singleton `harvesting` 1 (gerund form; Science). See CON-21 audit signal for the harvest / harvesting form-drift question. Recommend merge `harvest` + `harvesting` into a single canonical (likely `harvesting` as the action-oriented gerund form, OR `harvest` as the more concise noun form) AND consider merging the resulting canonical into a broader life-cycle or plant_growth canonical at curriculum-team discretion. Both labels cover the same activity-of-harvesting concept; surface-label choice is curriculum-team preference.
- curriculum_notes: <to_fill>

### `harvesting`

- canonical_label: Harvesting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Gerund-form gardening concept — closely paired with long-tail singleton `harvest` 1 (noun form). See CON-21 audit signal for the harvest / harvesting form-drift question. Recommend merge with `harvest` 1 into a single canonical. Surface-label preference is curriculum-team call. The combined-pair concept may also merge into a broader life-cycle / plant-growth canonical depending on curriculum-team verdict.
- curriculum_notes: <to_fill>

### `historical_context`

- canonical_label: Historical Context
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: CON-11 closure — the §11 `historical_figures` 68 entry's claude_notes flagged this singleton as a candidate merge_alias OR a candidate standalone-keep depending on whether the curriculum team distinguishes "historical context" (era / setting backdrop — when a lesson uses a historical time period as scene-setting rather than centering specific historical-figures-as-history-makers) as a different cognitive lens from "historical figures" (people-as-history-makers). Recommend either: (a) **merge** into §11 `historical_figures` 68 if the curriculum team views these lenses as the same canonical (post-merge total: 69 lessons); or (b) **keep standalone** if "historical context" denotes a backdrop-lens distinct from people-centric historical-figures content. The 1-lesson signal is too thin to decide structurally — curriculum-team subject-matter judgment is the right input here.
- curriculum_notes: <to_fill>

### `history_of_the_american_west`

- canonical_label: History of the American West
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific historical-period concept — corpus literal `history of the American West` (lowercase article, capitalized proper noun). Likely tied to a specific lesson on US-westward-expansion history. Recommend keep standalone (specific enough to warrant its own tag) OR drop as too narrow / specific for the canonical vocabulary; alternatively merge into §11 `historical_figures` 68 + `geography` 56 if the lesson centers people-and-place rather than historical-period-as-topic. Curriculum-team verdict on specificity threshold.
- curriculum_notes: <to_fill>

### `holidays`

- canonical_label: Holidays
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic holidays tag — closely paired with long-tail singleton `national and religious holidays` 1 (SS). See CON-17 audit signal for the holidays-cluster question. Recommend merge `holidays` + `national_and_religious_holidays` into §11 `cultural_traditions` 206 (holidays are typically cultural-tradition observations; e.g., Diwali, Thanksgiving, Día de los Muertos, Eid). Both labels cover the same content; cultural_traditions is the established broader canonical.
- curriculum_notes: <to_fill>

### `homeostasis`

- canonical_label: Homeostasis
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Advanced biology concept covering homeostatic regulation. Adjacent long-tail singleton `feedback systems` 1 (Sci) is closely related (homeostasis is regulated via feedback systems). Recommend either keep standalone OR drop as too advanced / narrow for the K-12 corpus signal. May also consolidate with feedback_systems into a broader biological-regulation canonical. Curriculum team picks.
- curriculum_notes: <to_fill>

### `hydration`

- canonical_label: Hydration
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Health (1)
- recommended_primary_subject: Health
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: One of three Health canonicals (alongside §11 `nutrition_education` 107 and `healthy_choices` 30). Distinct from the nutrition-education broader frame — hydration is a specific health-practice concept. Recommend keep standalone OR merge into `healthy_choices` 30 as a sub-practice. The Health subject has only 3 distinct concepts in the v3 baseline, so collapsing further may erode coverage; lean toward keep.
- curriculum_notes: <to_fill>

### `imaginary_play`

- canonical_label: Imaginary Play
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Early-childhood dramatic-play concept (pretend, role-play). Distinct from §12 `movement` 4 + `music` 6 + long-tail `dance` 1, `performance` 2 (cluster of performing-arts concepts). Recommend keep standalone for early-grade Arts coverage OR drop as too narrow; curriculum team picks. May also consolidate the dramatic-play + performance cluster (imaginary_play + performance + puppetry + dance) under a broader `performing_arts` canonical.
- curriculum_notes: <to_fill>

### `indigenous_knowledge`

- canonical_label: Indigenous Knowledge
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Indigenous-perspectives concept tied to Native-American / Indigenous-content lessons (Three Sisters, traditional ecological knowledge, Indigenous foodways). Closely paired with long-tail singletons `Indigenous stories` 1 (SS), `Native American history` 1 (SS) — see CON-16 audit signal for the Indigenous-cluster reframing question. The heritage worksheet's §9.1 cross-cluster `Indigenous and Diaspora` cluster (D1 in heritage `culturalHeritage` field) covers Indigenous identity at the heritage field; concepts-side coverage is fragmented across these 3 singletons. Recommend curriculum team consider: (a) consolidate all 3 singletons under a single `indigenous_perspectives` canonical, OR (b) merge into §11 `cultural_traditions` 206 (treat as cultural-tradition lens), OR (c) keep separate. Pending curriculum-team verdict; CON-16 captures the reframing question.
- curriculum_notes: <to_fill>

### `indigenous_stories`

- canonical_label: Indigenous Stories
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: Literacy/ELA
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Indigenous-narrative concept — story-form Indigenous-content tagged Social Studies rather than Literacy/ELA. See CON-16 Indigenous-cluster audit signal. The lesson likely also fits §12 `cultural_narratives` 8 (Lit/ELA) and §11 `storytelling` 76 (Lit/ELA) — story-form content is conventionally Lit/ELA. Recommend either: (a) re-subject to Literacy/ELA and merge into `cultural_narratives` 8; OR (b) consolidate with `Indigenous knowledge` 1 + `Native American history` 1 under a unified Indigenous-perspectives canonical; OR (c) merge into §11 `cultural_traditions` 206. Pending curriculum-team verdict per CON-16.
- curriculum_notes: <to_fill>

### `informational_text`

- canonical_label: Informational Text
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Reading-side counterpart to `informational_writing` 2 — informational text as a reading-genre frame (nonfiction reading, encyclopedic-text comprehension). See CON-22 reading-cluster audit signal. Recommend merge into §12 `reading_comprehension` 6 as a sub-application (reading comprehension of informational texts) OR keep standalone as a distinct nonfiction-reading canonical. Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `instrument_making`

- canonical_label: Instrument Making
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific Arts/craft concept covering musical-instrument construction. Adjacent §12 `music` 6 (the broader music canonical) + long-tail `puppet making` 1 + `craft activity` 1 cover related making/craft concepts. Recommend merge into §12 `music` 6 (instrument-making as a sub-application of music education) OR keep standalone if curriculum team wants the craft-construction lens distinct from music-as-listening-or-performance. Curriculum team picks.
- curriculum_notes: <to_fill>

### `international_food_traditions`

- canonical_label: International Food Traditions
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrower geography-flavored variant of §11 `cultural_traditions` 206 — already proposed in `cultural_traditions`'s `merge_aliases: [("family traditions", 1), ("international food traditions", 1)]`. International food traditions is a sub-application of cultural traditions emphasizing geographic-cuisine framing. Recommend merge into §11 `cultural_traditions` 206 per the established proposal.
- curriculum_notes: <to_fill>

### `letter_writing`

- canonical_label: Letter Writing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by CON-12 — letter-writing genre (personal letter, formal letter, advocacy letter). Verdict depends on CON-12 verdict. Recommend pending curriculum-team decision; if CON-12 picks (a) keep `writing` 8 as catch-all → likely merge into `writing` 8; if (b) drop writing 8 → keep as sub-canonical; if (c) flip → merge into writing.
- curriculum_notes: <to_fill>

### `literary_elements`

- canonical_label: Literary Elements
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Literary-craft concept covering literary-element analysis (character, setting, plot, theme). Adjacent long-tail `figurative_language` 1, `descriptive_language` 1, `similes` 1, `sensory_details` 1 cover figurative-language craft (CON-24). Recommend keep standalone as the literary-elements canonical, with the figurative-language cluster as separate concepts; alternatively consolidate literary craft (literary_elements + figurative_language + similes + descriptive_language) under a broader `literary_craft` canonical at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `macromolecules`

- canonical_label: Macromolecules
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Biochemistry concept — macromolecules (proteins, carbohydrates, lipids, nucleic acids). Closely paired with long-tail singleton `macronutrients` 1 (Sci) and freq-2 `protein` 2 (Sci) — these together cover nutrition-chemistry / biochemistry. Recommend either keep standalone OR merge into `macronutrients` 1 (broader nutrition-chemistry frame) OR drop as too advanced for K-12 corpus. Pending curriculum-team verdict on the biochemistry-cluster shape.
- curriculum_notes: <to_fill>

### `macronutrients`

- canonical_label: Macronutrients
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Nutrition-chemistry concept covering protein, carbohydrate, fat (the macronutrient classes). Closely paired with freq-2 `protein` 2 + long-tail singleton `macromolecules` 1 (Sci). Recommend keep standalone as the macronutrients canonical absorbing `protein` 2 + `macromolecules` 1 as merge_aliases at curriculum-team discretion, OR keep as a parallel-with-protein narrower-specific canonical. The nutrition-chemistry cluster (macronutrients + protein + macromolecules + plant-based proteins + plant_nutrition + nutrition + nutrition_education) is sprawling; curriculum team picks the canonical shape.
- curriculum_notes: <to_fill>

### `map_reading`

- canonical_label: Map Reading
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Geography-skill concept — map reading practice (legend interpretation, coordinate reading, regional identification). Adjacent §11 `geography` 56 is the established canonical for geography lessons. Recommend merge into §11 `geography` 56 as a sub-skill OR keep standalone if curriculum team wants explicit map-skills tagging distinct from broader geography content.
- curriculum_notes: <to_fill>

### `mechanical_energy`

- canonical_label: Mechanical Energy
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Physics concept — mechanical energy (kinetic + potential). Adjacent long-tail singleton `simple machines` 1 (Sci) and §12 `thermal_energy` 12 cover related physics concepts. Recommend keep standalone OR consolidate mechanical_energy + simple_machines under a broader `physics_concepts` canonical at curriculum-team discretion. The §12 `thermal_energy` 12 is the established energy-related canonical (high-impact-adjacent).
- curriculum_notes: <to_fill>

### `microbiome`

- canonical_label: Microbiome
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Microbiology concept — microbial communities (gut microbiome, soil microbiome). Closely related to §12 `microorganisms` 3 (the broader microbe canonical). Recommend merge into §12 `microorganisms` 3 as a sub-concept (microbiome is a specific microbial-community framing within microorganism content).
- curriculum_notes: <to_fill>

### `narrative_reading`

- canonical_label: Narrative Reading
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Reading-side narrative-genre concept — see CON-22 reading-cluster audit signal (reading / reading_comprehension / narrative_reading / biography_reading / informational_text). Recommend merge into §12 `reading_comprehension` 6 as a sub-genre (narrative-reading is reading-comprehension applied to narrative texts) OR keep standalone if curriculum team wants explicit narrative-reading tagging distinct from broader reading-comprehension.
- curriculum_notes: <to_fill>

### `national_and_religious_holidays`

- canonical_label: National and Religious Holidays
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific holidays variant — closely paired with long-tail singleton `holidays` 1 (SS). See CON-17 audit signal for the holidays-cluster question. Recommend merge `national_and_religious_holidays` + `holidays` into §11 `cultural_traditions` 206 (holidays are typically cultural-tradition observations). The verbose surface-label "national and religious holidays" is unusually specific; cultural_traditions absorbs this content cleanly.
- curriculum_notes: <to_fill>

### `native_american_history`

- canonical_label: Native American History
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific historical-content concept — Native American history. See CON-16 Indigenous-cluster audit signal (Indigenous_knowledge / Indigenous_stories / Native_American_history singletons together). Heritage worksheet's §9.1 cross-cluster `Indigenous and Diaspora` cluster (D1) covers Native American as a heritage-side identity already. Recommend curriculum team consider: (a) consolidate the 3 Indigenous singletons under unified `indigenous_perspectives` canonical; OR (b) merge into §11 `historical_figures` 68 + `geography` 56 if the lesson centers specific Native-American historical figures + places; OR (c) merge into §11 `cultural_traditions` 206; OR (d) keep standalone. Pending curriculum-team verdict per CON-16.
- curriculum_notes: <to_fill>

### `note_taking`

- canonical_label: Note-Taking
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Research-practice concept — note-taking as a sub-skill of research / informational-reading. Closely paired with freq-2 `research` 2 (Lit/ELA) + long-tail `organizing ideas` 1 (Lit/ELA). Recommend merge into freq-2 `research` 2 as a sub-skill OR consolidate research + note_taking + organizing_ideas under a broader `research_practices` canonical at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `organizing_ideas`

- canonical_label: Organizing Ideas
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-process / research-process concept — organizing ideas before drafting. Adjacent long-tail `note_taking` 1, freq-2 `research` 2 cover related writing/research-process skills; CON-12 writing-cluster also adjacent. Recommend merge into freq-2 `research` 2 OR into CON-12 writing-cluster outcome; pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `painting`

- canonical_label: Painting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific Arts technique — should likely follow `coloring` 1 + `craft activity` 1 (both already proposed merge into §11 `visual_arts` 76) and merge into `visual_arts` 76 as a sub-technique. Recommend merge into §11 `visual_arts` 76; this is a third visual-art-technique singleton not currently in the established proposed merge_aliases list but parallel in pattern.
- curriculum_notes: <to_fill>

### `perimeter`

- canonical_label: Perimeter
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Geometry concept — perimeter measurement. Part of the measurement-cluster boundary (CON-23) — see freq-2 `volume` 2, long-tail `area` 1, `weight` 1, §11 `measurement` 66. Recommend merge into §11 `measurement` 66 as a sub-dimension alias OR keep standalone with surface label "Perimeter". The mid-tier `measurement` canonical is the established home for measurement lessons.
- curriculum_notes: <to_fill>

### `pests`

- canonical_label: Pests
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Garden-pest concept — pest identification, pest management, IPM. Adjacent long-tail `beneficial insect identification` 1 (Sci) is the complementary concept (beneficial-vs-pest insects). Recommend keep standalone OR consolidate the insect-cluster (pests + beneficial_insect_identification + §11 `pollinators` 28) at curriculum-team discretion. The §11 pollinators canonical is high-impact and may absorb the beneficial-insects framing; pests would be the complementary canonical.
- curriculum_notes: <to_fill>

### `photojournalism`

- canonical_label: Photojournalism
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Unusual concept — photojournalism is more commonly a media-studies / arts concept than Lit/ELA. The 1-lesson signal is too thin to know whether to drop or keep. Recommend keep standalone if curriculum team confirms the lesson genuinely centers photojournalism-as-Lit/ELA-genre; otherwise drop OR re-subject to Arts.
- curriculum_notes: <to_fill>

### `plant_adaptation`

- canonical_label: Plant Adaptation
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Narrower plant-specific variant of §12 `adaptations` 5 — already proposed in `adaptations`'s `merge_aliases: [("adaptation", 1), ("plant adaptation", 1), ("plant adaptations", 1)]`. Recommend merge into §12 `adaptations` 5 per the established proposal.
- curriculum_notes: <to_fill>

### `plant_adaptations`

- canonical_label: Plant Adaptations
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Pluralized variant of long-tail `plant adaptation` 1 — already proposed in §12 `adaptations` 5's `merge_aliases: [("adaptation", 1), ("plant adaptation", 1), ("plant adaptations", 1)]`. Recommend merge into §12 `adaptations` 5 per the established proposal.
- curriculum_notes: <to_fill>

### `plant_and_animal_similarities`

- canonical_label: Plant and Animal Similarities
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Comparative-biology concept — typically tied to early-grade life-science lessons comparing plants and animals. Adjacent §11 `life_cycles` 43 (broader cyclic-process frame for both plants and animals) is the established canonical home. Recommend merge into §11 `life_cycles` 43 OR drop as too vague / specific to a single lesson framing. The 1-lesson signal is thin; lean toward merge.
- curriculum_notes: <to_fill>

### `plant_id`

- canonical_label: Plant ID
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Abbreviated drift of §12 `plant_identification` 5 — already proposed in `plant_identification`'s `merge_aliases: [("identifying plants", 2), ("plant ID", 1)]`. Note corpus literal preserves "ID" (uppercase). Recommend merge into §12 `plant_identification` 5 per the established proposal.
- curriculum_notes: <to_fill>

### `plant_reproduction`

- canonical_label: Plant Reproduction
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Plant-biology concept — flower-to-seed reproduction, pollination, fruit-as-seed-carrier. Closely paired with §11 `pollinators` 28 (which covers the pollination axis), §11 `seeds` 13, §11 `life_cycles` 43, §12 `plant_growth` 9. Recommend either keep standalone (plant_reproduction is distinguishable from pollinators which focuses on bee/butterfly ecology rather than the reproductive process) OR merge into §11 `life_cycles` 43 (the broader plant-and-animal cyclic-process frame). Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `plant_science`

- canonical_label: Plant Science
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Drop per CON-03 audit signal — `plant science` is the second vague Science concept tagged on the *Informational Writing - Topics/Subtopics* ELA lesson (the other being `garden topics` 1, also a drop). The lesson teaches the literacy concept of topics-vs-subtopics using cooking/gardening as brainstorming fodder; the Science tags are defensive slot-filling, not real concepts. Recommend drop.
- curriculum_notes: <to_fill>

### `plant_based_proteins`

- canonical_label: Plant-Based Proteins
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific nutrition concept — plant-derived protein sources (legumes, beans, nuts). Adjacent freq-2 `protein` 2 (Sci) + long-tail `macronutrients` 1, `macromolecules` 1, §12 `legumes` 3 + §11 `nutrition_education` 107 cover related nutrition-chemistry concepts. Recommend merge into §12 `legumes` 3 (the specific protein-source canonical for plant-protein lessons) OR into `protein` 2 (the broader protein canonical) OR §11 `nutrition_education` 107 (the broader nutrition canonical). Pending curriculum-team verdict; lean toward legumes merge.
- curriculum_notes: <to_fill>

### `planting`

- canonical_label: Planting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Gardening-activity tag — closer to a context tag ("today we planted seeds") than a distinct scientific concept. Adjacent §11 `seeds` 13 (seed-anatomy-and-planting frame), §12 `plant_growth` 9, long-tail `seed starting` 1, `spacing` 1, `harvest` 1, `harvesting` 1 cover related gardening-activity concepts. Recommend merge into §11 `seeds` 13 (the seed-anatomy-and-planting canonical absorbs planting-as-activity) OR drop as too vague. Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `problem_solving`

- canonical_label: Problem Solving
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Unusual Lit/ELA tag — problem-solving is more conventionally Math (or cross-curricular). The Lit/ELA placement is an apparent tagging-artifact. Adjacent §11 / §12 don't have a clear merge target. Recommend re-subject to Math AND keep standalone, OR drop as too vague + likely re-subject anyway. Curriculum team picks.
- curriculum_notes: <to_fill>

### `public_speaking`

- canonical_label: Public Speaking
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Oral-communication skill — pairs with long-tail `debate` 1, `argumentation` 1, freq-2 `discussion` 2 (oral-communication cluster). Recommend keep standalone OR consolidate into a broader `oral_communication` canonical at curriculum-team discretion. Pedagogically distinct enough from discussion (presentation vs dialogue) to plausibly stand alone.
- curriculum_notes: <to_fill>

### `puppet_making`

- canonical_label: Puppet Making
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific craft concept — paired with long-tail `puppetry` 1 (the performance side of the same activity). Adjacent §11 `visual_arts` 76 covers craft generally; §12 `movement` 4, long-tail `performance` 2 + `dance` 1 cover performing-arts. Recommend either: (a) merge puppet_making into §11 `visual_arts` 76 (craft side) AND puppetry into the performing-arts cluster (performance + dance), OR (b) keep puppet_making + puppetry as a paired puppetry-cluster, OR (c) drop both as too narrow. Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `puppetry`

- canonical_label: Puppetry
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Arts (1)
- recommended_primary_subject: Arts
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Performance-side puppet concept — paired with long-tail `puppet making` 1 (the craft side). Recommend either keep both standalone as a paired cluster, OR consolidate with §12 `movement` 4, `music` 6, long-tail `performance` 2, `dance` 1 under a broader performing-arts canonical, OR drop as too narrow. Curriculum team picks.
- curriculum_notes: <to_fill>

### `read_aloud`

- canonical_label: Read-Aloud
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Teaching-technique tag — read-aloud is a pedagogical practice (teacher reads to students) rather than a distinct content concept. Adjacent §11 `storytelling` 76 (the established narrative-reading-and-telling canonical) covers most read-aloud lessons in the corpus. Recommend merge into §11 `storytelling` 76 OR drop as too vague (read-aloud is a technique, not a concept).
- curriculum_notes: <to_fill>

### `recipe_selection`

- canonical_label: Recipe Selection
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Vague recipe-related Lit/ELA tag — could be choosing-among-recipes practice or recipe-as-text selection. Adjacent §11 `recipe_reading` 69 (the established broad-recipe Lit/ELA canonical) likely absorbs this content. Recommend merge into §11 `recipe_reading` 69.
- curriculum_notes: <to_fill>

### `scaling`

- canonical_label: Scaling
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Generic-label drift of §12 `recipe_scaling` 3 — scaling-as-math-operation applied to recipes (doubling, halving, tripling ingredient quantities). Recommend merge into §12 `recipe_scaling` 3 as a label-shortening alias.
- curriculum_notes: <to_fill>

### `scientific_claims`

- canonical_label: Scientific Claims
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Science-practice concept — making and supporting scientific claims (evidence-based reasoning). Closely paired with freq-2 `scientific_method` 2 (the broader science-as-practice canonical). Recommend merge into freq-2 `scientific_method` 2 as a sub-practice OR keep standalone as a distinct claim-and-evidence frame.
- curriculum_notes: <to_fill>

### `seed_starting`

- canonical_label: Seed Starting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific gardening-activity concept — starting seeds indoors / in trays. Adjacent §11 `seeds` 13 is the established broad-seeds canonical (covers seed-anatomy-and-planting). Recommend merge into §11 `seeds` 13 as a sub-activity, per the §11 `seeds` entry's existing acknowledgment that "seed_dispersal in Session 80 mid-tier; seed_starting in Session 81 long-tail" both relate to the seeds cluster.
- curriculum_notes: <to_fill>

### `sensory_details`

- canonical_label: Sensory Details
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Figurative-language sub-concept covering sensory imagery (taste, smell, touch detail in writing). Part of CON-24 figurative-language cluster (`figurative_language` 1, `descriptive_language` 1, `similes` 1, `sensory_details` 1 + §11 `vocabulary_development` 59). Recommend merge into `figurative_language` 1 as a sub-type OR into §11 `vocabulary_development` 59 as broader word-craft canonical. Pending CON-24 verdict.
- curriculum_notes: <to_fill>

### `similes`

- canonical_label: Similes
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific figurative-language device — typically a sub-concept of figurative_language. Part of CON-24 figurative-language cluster. Recommend merge into `figurative_language` 1 (the broader figurative-language canonical) OR into §11 `vocabulary_development` 59 (the established broader word-craft canonical). Pending CON-24 verdict.
- curriculum_notes: <to_fill>

### `simple_machines`

- canonical_label: Simple Machines
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Physics concept — lever, pulley, wedge, screw, inclined plane, wheel-and-axle (the 6 simple machines). Closely paired with long-tail `mechanical_energy` 1 (Sci). Recommend keep standalone OR consolidate simple_machines + mechanical_energy under a broader `physics_concepts` canonical at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `slavery`

- canonical_label: Slavery
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Social Studies (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific historical-content concept covering slavery-as-history (likely tied to a lesson on US slavery, African diaspora, or food-and-labor history). Adjacent §11 `historical_figures` 68, long-tail `civil_rights_movement` 1, `farm_labor` 1, `colonialism's_impact` 12 cover related historical-content concepts. Recommend keep standalone as a specific historical-content concept distinct from the §11 `colonialisms_impact` 12 broader-canonical AND from the §11 `historical_figures` 68 people-centric canonical. The 1-lesson signal is thin but the concept's pedagogical weight warrants keeping.
- curriculum_notes: <to_fill>

### `soil`

- canonical_label: Soil
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Label-shortening drift of §11 `soil_science` 44 — `soil` 1 is plausibly a soil-science lesson tagged with the shorter label. Recommend merge into §11 `soil_science` 44 as a label-shortening alias. The 44-lesson `soil_science` canonical is the established home for soil-related lessons.
- curriculum_notes: <to_fill>

### `song`

- canonical_label: Song
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Unusual Lit/ELA tag — song / lyric content is more conventionally Arts (music). The Lit/ELA placement may be a tagging-artifact (lesson centers song lyrics as text rather than song-as-performance). Adjacent §12 `music` 6 (Arts) is the established music canonical. Recommend either: (a) re-subject to Arts and merge into §12 `music` 6; (b) keep as Lit/ELA `song` standalone (treating song as a text-genre); (c) drop as too narrow. Pending curriculum-team verdict.
- curriculum_notes: <to_fill>

### `sorting`

- canonical_label: Sorting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Classification-practice concept — typically tied to early-grade pre-math activities (sort plants by leaf shape, sort foods by color). Closely paired with long-tail `categorization` 1 (Math). Recommend merge with `categorization` 1 into a single canonical, OR keep both standalone if curriculum team wants distinct kindergarten-friendly tags. The pair feels redundant; lean toward merge.
- curriculum_notes: <to_fill>

### `sound`

- canonical_label: Sound
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Physics concept covering sound waves, frequency, vibration. Distinct from other Science singletons in the corpus. Recommend keep standalone OR drop as too narrow / specific (1-lesson signal). The §11 `sensory_exploration` 11 covers sensory-observation including sound, but at a coarser grain (sensory_exploration is multi-sense observation, not sound-specifically).
- curriculum_notes: <to_fill>

### `spacing`

- canonical_label: Spacing
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Gardening-practice concept — seed/plant spacing in garden beds. Adjacent long-tail `planting` 1, `seed starting` 1, §11 `seeds` 13, §12 `plant_growth` 9 cover related gardening-activity concepts. Recommend merge into §11 `seeds` 13 (the seed-anatomy-and-planting canonical) OR drop as too narrow.
- curriculum_notes: <to_fill>

### `states_of_matter`

- canonical_label: States of Matter
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Physical-science concept — same content as freq-2 `phases of matter` 2 (Sci). See CON-19 audit signal for the phases-of-matter / states-of-matter canonical-label question. Recommend merge into freq-2 `phases_of_matter` 2 (higher-frequency wins per established convention). Surface-label preference (phases-of-matter is more chemistry-formal; states-of-matter is more K-12 colloquial) is a curriculum-team call.
- curriculum_notes: <to_fill>

### `tallying`

- canonical_label: Tallying
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Data-collection practice — tally marks, count-by-mark. Closely related to §11 `counting` 20 and §11 `data_collection` 19. Recommend merge into §11 `counting` 20 (the broader count-tracking canonical) OR §11 `data_collection` 19 (the broader data-collection canonical). Pending curriculum-team verdict; lean toward data_collection (tallying is a specific data-collection technique).
- curriculum_notes: <to_fill>

### `taste`

- canonical_label: Taste
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific sensory concept — taste-as-sense / taste-testing in cooking lessons. Adjacent §11 `sensory_exploration` 11 covers broader sensory observation (the 5-senses frame). Recommend merge into §11 `sensory_exploration` 11 (taste is one of the 5 senses covered by sensory_exploration).
- curriculum_notes: <to_fill>

### `voting`

- canonical_label: Voting
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Social Studies
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Civic-engagement concept — voting practices, democratic process. The Lit/ELA subject placement is an apparent tagging-artifact (voting is conventionally Social Studies / civics). Recommend re-subject to Social Studies AND keep standalone, OR merge into §12 `advocacy` 3 (the civic-action canonical) at curriculum-team discretion. Pending verdict.
- curriculum_notes: <to_fill>

### `weather`

- canonical_label: Weather
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Meteorology concept — weather observation, weather patterns, weather-vs-climate distinction. Distinct from freq-2 `climate` 2 (Sci) but closely related (weather is short-term; climate is long-term). Adjacent §11 `seasonal_changes` 10 covers seasonal phenomenology. Recommend keep standalone OR merge into §11 `seasonal_changes` 10 (weather is part of seasonal observation) at curriculum-team discretion.
- curriculum_notes: <to_fill>

### `weight`

- canonical_label: Weight
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Math (1)
- recommended_primary_subject: Math
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Measurement-dimension concept — weight measurement (grams, pounds, ounces). Part of the measurement-cluster boundary (CON-23). Recommend merge into §11 `measurement` 66 as a sub-dimension alias OR keep standalone if curriculum team wants explicit weight tagging distinct from broader measurement.
- curriculum_notes: <to_fill>

### `writing_claims`

- canonical_label: Writing Claims
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Literacy/ELA (1)
- recommended_primary_subject: Literacy/ELA
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Writing-cluster sub-type covered by CON-12 — claim-and-evidence writing (similar to argumentative_writing 2 freq-2 in pedagogical character). Verdict depends on CON-12 verdict. Recommend pending curriculum-team decision; if CON-12 picks (a) keep `writing` 8 as catch-all → likely merge into freq-2 `argumentative_writing` 2 or `writing` 8; if (b) drop writing 8 → keep as sub-canonical; if (c) flip → merge into writing.
- curriculum_notes: <to_fill>

### `yeast`

- canonical_label: Yeast
- verdict: <to_fill>
- frequency: 1 appearances
- current_subjects: Science (1)
- recommended_primary_subject: Science
- recommended_secondary_subjects: <none>
- merge_aliases: <none>
- theme_overlap: none
- claude_notes: Specific microorganism concept — yeast as a fermentation agent (bread-making, brewing-adjacent). Closely paired with long-tail `fermentation` 1 (Science) + §12 `microorganisms` 3 (the broader microbe canonical). Recommend merge into §12 `microorganisms` 3 OR merge into long-tail `fermentation` 1 (yeast is the fermentation-causing organism). Curriculum team picks; lean toward microorganisms merge (broader canonical, established mid-tier home).
- curriculum_notes: <to_fill>

---

## Appendix A — v3 baseline (academicConcepts)

The 208 distinct concept strings currently populating `lessons.metadata.academicConcepts` on TEST DB, grouped by current subject. Source: Session 78 TEST DB probe over 663 live (non-retired) rows. Within each subject, concepts are listed alphabetically; counts in parens are `(appearances)`.

This appendix is **reference data**, not the worksheet's canonical structure. The canonical structure is concept-first (§11–§13 above); subject grouping persists here only because the `lessons.metadata.academicConcepts` schema is `{Subject: [concepts]}` — the appendix mirrors that schema shape so future readers can trace v3-baseline strings back to their source-of-truth subject context.

**Per-subject totals (Session 78 probe):**

| Subject | Distinct concepts | Total appearances |
| --- | --- | --- |
| Science | 92 | 774 |
| Social Studies | 37 | 453 |
| Literacy/ELA | 46 | 290 |
| Math | 18 | 150 |
| Health | 3 | 131 |
| Arts | 20 | 114 |
| **Total** | **216 pairs** (208 distinct strings cross-subject; 8 cross-subject overlaps) | **1912** |

### A.1 Science (92 distinct concepts)

`adaptation` (1), `adaptations` (5), `animal needs` (5), `beneficial insect identification` (1), `biodiversity` (6), `biotic/abiotic factors` (1), `cardiovascular system` (1), `cellular respiration` (1), `chemical reactions` (1), `circulatory system` (1), `climate` (2), `climate change` (1), `colors of plants` (1), `companion planting` (10), `consumers` (2), `decomposition` (47), `ecosystems` (73), `environmental stewardship` (1), `erosion` (2), `feedback systems` (1), `fermentation` (1), `food preservation` (1), `food processing` (1), `food webs` (11), `garden exploration` (4), `garden topics` (1), `general exploration` (1), `germination` (2), `growing cycles` (1), `growth patterns` (1), `habitats` (4), `harvest` (1), `harvesting` (1), `homeostasis` (1), `identifying plants` (2), `legumes` (3), `life cycles` (43), `macromolecules` (1), `macronutrients` (1), `mechanical energy` (1), `microbiome` (1), `microorganisms` (3), `nutrition` (4), `nutrition education` (7), `observation` (5), `pests` (1), `phases of matter` (2), `photosynthesis` (8), `plant ID` (1), `plant adaptation` (1), `plant adaptations` (1), `plant and animal similarities` (1), `plant growth` (9), `plant identification` (5), `plant needs` (41), `plant nutrition` (2), `plant parts` (239), `plant reproduction` (1), `plant science` (1), `plant-based proteins` (1), `planting` (1), `pollinators` (28), `preservation` (3), `producers` (2), `protein` (2), `root vegetables` (3), `roots` (2), `scientific claims` (1), `scientific method` (2), `seasonal change` (2), `seasonal changes` (10), `seasonal cycles` (6), `seasonal eating` (7), `seasonality` (11), `seasons` (2), `seed dispersal` (3), `seed starting` (1), `seeds` (13), `sensory exploration` (11), `simple machines` (1), `soil` (1), `soil science` (44), `sound` (1), `spacing` (1), `spices` (2), `states of matter` (1), `taste` (1), `thermal energy` (12), `tool use` (2), `water cycles` (17), `weather` (1), `yeast` (1)

### A.2 Social Studies (37 distinct concepts)

`advertising` (3), `advocacy` (3), `animal welfare` (1), `biodiversity` (1), `civil rights movement` (1), `colonialism's impact` (12), `community` (1), `community activism` (1), `community building` (1), `community systems` (15), `companion planting` (3), `cultural traditions` (206), `environmental impact` (1), `environmental justice` (3), `factory farming` (1), `family traditions` (1), `farm labor` (1), `food marketing` (1), `food systems` (1), `geography` (56), `global connections` (4), `historical context` (1), `historical figures` (68), `history of the American West` (1), `holidays` (1), `Indigenous knowledge` (1), `Indigenous stories` (1), `immigration stories` (34), `international food traditions` (1), `map reading` (1), `national and religious holidays` (1), `Native American history` (1), `preservation` (1), `slavery` (1), `social justice` (2), `social justice issues` (5), `trade routes` (16)

### A.3 Literacy/ELA (46 distinct concepts)

`argumentation` (1), `argumentative writing` (2), `bilingual education` (4), `biography` (1), `biography reading` (1), `comparative writing` (1), `cultural narratives` (8), `debate` (1), `descriptive language` (1), `descriptive writing` (3), `discussion` (2), `figurative language` (1), `food memory` (1), `historical figures` (1), `how-to writing` (5), `informational text` (1), `informational writing` (2), `letter writing` (1), `literary elements` (1), `narrative reading` (1), `narrative writing` (3), `note-taking` (1), `novel connections` (3), `opinion writing` (3), `organizing ideas` (1), `persuasive writing` (4), `photojournalism` (1), `poetry` (1), `problem solving` (1), `public speaking` (1), `read-aloud` (1), `reading` (2), `reading comprehension` (6), `recipe reading` (69), `recipe selection` (1), `recipe writing` (2), `research` (2), `sensory details` (1), `sequencing` (2), `similes` (1), `song` (1), `storytelling` (75), `vocabulary development` (59), `voting` (1), `writing` (8), `writing claims` (1)

### A.4 Math (18 distinct concepts)

`area` (1), `categorization` (1), `counting` (20), `data collection` (19), `estimation` (15), `fractions` (9), `graphing` (3), `measurement` (66), `patterns` (2), `perimeter` (1), `ratios` (2), `recipe scaling` (3), `scaling` (1), `sorting` (1), `tallying` (1), `unit rates` (2), `volume` (2), `weight` (1)

### A.5 Health (3 distinct concepts)

`healthy choices` (30), `hydration` (1), `nutrition education` (100)

### A.6 Arts (20 distinct concepts)

`coloring` (1), `craft activity` (1), `creative writing` (1), `dance` (1), `design` (1), `drawing` (9), `engineering` (1), `food presentation` (3), `imaginary play` (1), `instrument making` (1), `movement` (4), `music` (6), `observation` (1), `painting` (1), `performance` (2), `poetry` (1), `puppet making` (1), `puppetry` (1), `storytelling` (1), `visual arts` (76)

### A.7 Cross-subject concepts (8 strings appearing under more than one subject)

Cross-referenced from A.1–A.6 above; this list is informational, surfacing the cross-subject signal in one place. Per-subject counts already appear in the per-subject sections.

- `biodiversity` — Science (6), Social Studies (1)
- `companion planting` — Science (10), Social Studies (3)
- `historical figures` — Social Studies (68), Literacy/ELA (1)
- `nutrition education` — Health (100), Science (7)
- `observation` — Science (5), Arts (1)
- `poetry` — Literacy/ELA (1), Arts (1)
- `preservation` — Science (3), Social Studies (1)
- `storytelling` — Literacy/ELA (75), Arts (1)

### A.8 Concept↔theme case-normalized overlaps (3 strings)

Concept strings sharing a vocabulary with `thematicCategories` canonical strings under case normalization. Themes side uses Title Case (`Ecosystems`, `Food Systems`, `Plant Growth`); concepts side is lowercase — only `ecosystems` is exact-string identical, the other two collide under `lower()`. Per §6 + D-C5, these get a `theme_overlap: YES` flag on their per-value entries; adjudication defers to the themes worksheet / D4 canonicalization migration.

- `ecosystems` — Science (73)
- `food systems` — Social Studies (1)
- `plant growth` — Science (9)
