# Stage 1 Concepts Worksheet

> **Status: SCAFFOLD (last update Session 78, 2026-05-12).** Header sections (§1–§10) and tier skeletons (§11–§13) are in place; Appendix A v3 baseline is populated. **No per-value entries yet.** Per-value fills land across PR-Concepts-1 (high-impact tier ≥10 appearances), PR-Concepts-2 (mid-tier 3–9 appearances), PR-Concepts-3 (long-tail 1–2 appearances). Curriculum-team handoff happens once all three tier PRs ship.
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
- Whether the concept name is string-identical to a `thematicCategories` value (flagged for separate concept↔theme reconciliation)

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

- **`canonical_key`** (heading) — kebab-case lowercase slug derived from `canonical_label`. Example: `plant_parts`, `plant_identification`. Underscores between words inside the slug; hyphen-vs-underscore convention to be locked at parser-write time (Session 79 prep).
- **`canonical_label`** — Title Case display string the UI shows. Example: `Plant Parts`, `Plant Identification`.
- **`verdict`** — one of `keep | merge | new | drop | <to_fill>` (see §3).
- **`frequency`** — total lesson-appearances in the active corpus. Dual-count format `5 as-tagged, 8 if aliases merge` when `merge_aliases` is non-empty (per D-C11) — surfaces the curriculum team's actual decision-relevant numbers.
- **`current_subjects`** — comma-separated list of `Subject (count)` tuples; always shows per-subject counts even when single-subject (per D-C12). Example single-subject: `Science (239)`. Example multi-subject: `Science (5), Arts (1)`.
- **`recommended_primary_subject`** — single subject string. The subject this concept canonically lives under after cleanup. Most entries are single-subject; cross-subject concepts surface as multi-subject in `current_subjects` and pick one in `recommended_primary_subject`.
- **`recommended_secondary_subjects`** — comma-separated list, or `<none>`. Used when a concept legitimately appears as a lens in multiple subjects (e.g., `observation` may be primary Science and secondary Arts). Captures the genuine cross-subject signal at a coarser grain than per-lesson tagging (per D-C9 — no `per_lesson_override_signal` field).
- **`merge_aliases`** — list of `(corpus_string, count)` tuples for near-duplicates that collapse into this canonical. Pre-merge per-subject distribution stays in `current_subjects`; the post-merge total goes in `frequency` (per D-C11). For `merge`-verdict entries, replace this field with `merge_into: <canonical_key>` pointing at the canonical target.
- **`theme_overlap`** — `none` (default) or `YES — <adjudication notes>`. Flagged when the concept's canonical string is identical to a `thematicCategories` canonical string. Three known cases: `ecosystems`, `food systems`, `plant growth` (per §6). Per D-C5, adjudication (which side keeps it; whether both keep with cross-reference) is deferred to the themes worksheet / D4 canonicalization migration; the flag preserves the signal.
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

- `canonical_key` — generated from `canonical_label` (kebab-case lowercase, underscore-separated).
- `canonical_label` (proposal) — from v3 baseline OR best-fit Title Case from corpus drift cluster.
- `frequency` — total lesson-appearances in the active corpus (from Session 78 TEST DB probe, refreshed at fill time if corpus drifts).
- `current_subjects` — verbatim from probe data.
- `recommended_primary_subject` (proposal) — first-principles from `current_subjects` highest-count subject and concept semantics.
- `recommended_secondary_subjects` (proposal) — for cross-subject concepts only; `<none>` otherwise.
- `merge_aliases` (proposal) — all observed near-duplicate strings from probe data + Opus-corpus-read evidence for ambiguous cases.
- `theme_overlap` — flagged for the 3 string-identical concept↔theme overlaps.
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

Three concept-vocab strings are **string-identical** to `thematicCategories` canonical strings:

| String | As `academicConcepts` (Subject) | As `thematicCategories` |
| --- | --- | --- |
| `ecosystems` | Science (73 appearances; canonical so far) | Canonical thematicCategory (count varies; verified at themes worksheet time) |
| `food systems` | Social Studies (1 appearance) | Canonical thematicCategory |
| `plant growth` | Science (9 appearances) | Canonical thematicCategory |

These overlaps surfaced from Session 77 TEST DB probes and are likely artifacts of the v3 batch-tagging run not enforcing a hard concept-vs-theme boundary.

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

> **Status: empty skeleton.** ~32 entries (Session 78 probe count at ≥10 cutoff). Session 79 fills per-value entries here after the upfront Opus batch (per D-C13).
>
> **Review depth (D-C15):** high. These concepts drive the bulk of the corpus's academic-integration signal. Mistakes here propagate widely.
>
> **Frequency cutoff calibratability:** the ≥10 cutoff is the Session 78 locked default. Session 79 may recalibrate after seeing full per-concept frequency context.

<!-- Per-value entries land here in PR-Concepts-1 (Session 79). -->

---

## §12 Mid-tier — concepts with 3–9 appearances

> **Status: empty skeleton.** ~39 entries (Session 78 probe count at 3–9 cutoff). Session 80 fills per-value entries here.
>
> **Review depth (D-C15):** moderate. Most entries are `keep` with minor surface-label or alias refinements. Attention OK but variance acceptable.

<!-- Per-value entries land here in PR-Concepts-2 (Session 80). -->

---

## §13 Long-tail tier — concepts with 1–2 appearances

> **Status: empty skeleton.** ~137 entries (Session 78 probe count at 1–2 cutoff). Session 81 fills per-value entries here. Session 79 may decide to split this tier across multiple PRs (singletons-only vs 1-and-2-appearance entries) to keep PR sizes near the ~50-entry sweet spot — see §5 calibration note.
>
> **Review depth (D-C15):** light. Most entries are `drop` (vague singletons like `garden topics`, `general exploration`) or `merge` (near-duplicates of higher-tier canonicals). Rapid skim is fine for clear-drop singletons; merge candidates warrant attention.

<!-- Per-value entries land here in PR-Concepts-3 (Session 81). -->

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

### A.8 Concept↔theme string-identical overlaps (3 strings)

Concept strings string-identical to `thematicCategories` canonical strings. Per §6 + D-C5, these get a `theme_overlap: YES` flag on their per-value entries; adjudication defers to the themes worksheet / D4 canonicalization migration.

- `ecosystems` — Science (73)
- `food systems` — Social Studies (1)
- `plant growth` — Science (9)
