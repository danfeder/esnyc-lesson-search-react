# Concepts Worksheet — Wizard Redesign (Design)

> **Status: DESIGN APPROVED 2026-05-15.** Brainstorm session aligned on direction +
> refinements. Implementation plan + Batch 1 to follow. Branch: `tools/concepts-worksheet-form`.
>
> **Companion docs:**
> - `2026-05-15-concepts-tool-simplification-kickoff.md` — session kickoff (untracked, local)
> - `2026-05-15-concepts-worksheet-wizard-plan.md` — implementation plan (to be written)
> - `2026-05-15-concepts-worksheet-wizard-status.md` — execution status (to be written, per-batch updates)

## 1. Context

The current concepts worksheet tool (`scripts/build-concepts-tool.py` + `scripts/concepts-worksheet-tool.template.html`, built to `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`) presents 208 entries as a long-scroll page of cards, each carrying verdict radios, two notes textareas, theme/alias callouts, and a right-rail cluster-signals panel. Pre-handoff stress-test (operator inspection 2026-05-15) surfaced two persistent problems:

- **Visual density**: each card has up to 12 sub-components; the page renders ~9,400 DOM nodes; filter chip rows + sidebar add visual weight.
- **Confusion**: the four-verdict abstraction (`keep / merge / new / drop`) and two-notes-field model demand more taxonomy literacy than the curriculum team should need.

The session brief was "make it simpler and more user-friendly" and the user's framing was *"hold your hand a bit more."* The redesign below converts the tool from a metadata-editing surface into a guided decision workflow.

## 2. Guiding principles

1. **One decision per screen.** Single-entry wizard, not long scroll.
2. **Frame work by attention budget.** Three work types — Confirm / Resolve / Decide — replace abstract per-entry framing.
3. **Pre-fill is a visible suggestion, not state.** Display only; state writes on commit. Skip = no write = `<to_fill>` on export.
4. **Reviewer-facing language.** Plain-language verb labels in the UI; parser/export vocab unchanged.
5. **Wizard stays calm; review summary is the power-user surface.** Wizard guides one decision; summary handles grouping, mismatches, edit links, export.

## 3. Mental model — Confirm / Resolve / Decide

Every step in the wizard carries a small mode chip that tells the reviewer what kind of work this screen needs.

| Mode | What it is | Approx. count |
|---|---|---|
| **Confirm** | Claude made a reasonable call; agree or change it. Fast pass, ~3-5 s each. | ~150 |
| **Resolve** | Pick a canonical shape for a cluster of related entries. | 5 cluster signals |
| **Decide** | Deserves real judgment — high-impact, no recommendation, theme overlap, cluster mismatch. | ~50 |

The reviewer's story becomes:

> "Confirm the easy calls, resolve five clusters, and pause on the few that matter."

### Mode routing (deterministic)

```
if step is a cluster signal:
    mode = Resolve

elif entry.tier == "§11":
    mode = Decide                       # high-impact tier is always real attention

elif entry.theme_overlap.flagged:
    mode = Decide                       # 3 entries; cross-field call

elif entry has no Claude recommendation
     AND no cluster-derived pre-fill:
    mode = Decide                       # no default → must form a judgment

elif entry has been previously committed
     with a verdict that differs from
     Claude's recommendation (revisits):
    mode = Decide                       # the override stands; revisit treats it as a judgment moment

else:
    mode = Confirm                      # routine §12/§13 with either AI or cluster-derived pre-fill
```

### "Why this needs attention" (Decide steps only)

A one-line reason directly below the tier strip:

| Priority | Reason | When it applies |
|---|---|---|
| 1 | Theme overlap with themes worksheet | `theme_overlap.flagged == true` |
| 2 | Differs from cluster decision | reviewer committed a verdict that doesn't match the cluster shape |
| 3 | Part of cluster CON-XX (no decision yet) | cluster member and the Resolve step was Decided later |
| 4 | §11 High-impact concept | tier §11 (catch-all when none of the above apply) |
| 5 | No confident recommendation | no `suggested_verdict` and no cluster-derived pre-fill |

If multiple reasons apply, the highest-priority one wins.

## 4. Reviewer-facing labels

UI uses plain language; the parser and export keep the locked vocab (D-C8).

| UI label | Exports as |
|---|---|
| Keep as concept | `keep` |
| Fold into another | `merge` |
| Add new concept | `new` |
| Remove | `drop` |

The translation lives in the JS render and commit handlers; nothing in `build-concepts-tool.py` or the worksheet markdown changes.

## 5. Pre-fill commit-on-action semantics

**Hard rule:** the pre-fill is **rendered**, not **stored**. `state.entries[key].verdict` is only written when the reviewer takes an explicit commit action.

### Display rule

```
displayedVerdict =
    state.entries[key].verdict                     # if committed, always wins
    || aiPrefillCandidate(entry, tier)             # §12/§13 + has suggested_verdict
    || clusterPrefillCandidate(entry, clusterState)  # cluster member + Resolve has fired
    || null                                        # blank radio for Decide steps without any prefill
```

### Commit actions (these write to `state.entries[key]`)

- **Confirm step**: clicking "✓ Agree — …" primary button
- **Any step**: choosing a verdict via "Pick something else ▾" radio
- **Merge destination picker**: clicking "Confirm" on a target
- Any explicit verdict radio click

### Non-commit actions (state untouched)

- Opening the step (even though the radio displays a pre-fill)
- "Decide later" (replaces "Skip")
- "← Previous"
- Jumping to entry via top-bar search

### Invariant: empty-export hash

Opening the tool, walking through any number of steps without committing, and closing the tab leaves `localStorage` empty for entries. Export then walks `raw_markdown_lines` unchanged — empty-export SHA matches source worksheet SHA. Verified in Batch 1 smoke check.

### Visual cue on a pre-filled radio

```
Verdict (suggested by Claude — confirm with Save · Next):
  (•) Keep as concept   ( ) Fold into another   ...
```

After commit:

```
Verdict (saved):
  (•) Keep as concept   ( ) Fold into another   ...
```

## 6. Per-entry step — layouts

The step is a single centered card (~720 px wide, more breathing room than the long-scroll cards) with consistent top-to-bottom order:

```
─── §<TIER> <TIER NAME> · <MODE> ───────  step N of 208
<canonical_label>                              §<tier>.<idx>
"<canonical_key>"     <freq> appearances · <primary subject>

[Tier strip: §<n> <Name>: <calm guidance>]
[Why this needs attention: <reason>]    (Decide / Resolve only)

[Theme-overlap callout]    (3 entries)
[Merge-aliases proposal]   (11 entries)

[Claude's recommendation — expanded or one-liner]

[Primary action area — Confirm vs Decide variants below]

[+ Add a note]    (or auto-opened notes drawer)
[← Previous]     [Decide later]     [Save · Next →]
```

### 6.1 Confirm step (routine §12/§13 with AI pre-fill)

```
─── §13 Long-tail · Confirm ────────────  step 142 of 208
Plant ID                                          §13.42
`plant_id`           2 appearances · Science

§13 Long-tail: quick pass; pause when unsure.

💡 Claude recommends: Fold into `plant_identification`
   Surface alias for plant_identification; 2 lessons match.   ▸ more

  ┌──────────────────────────────────────────────────────┐
  │  ✓ Agree — Fold into `plant_identification`         │
  │                                       Save · Next →  │
  └──────────────────────────────────────────────────────┘

  Pick something else ▾    + Add a note

  [← Previous]                                [Decide later]
```

- **One-line summary** of the reasoning (first sentence of `claude_notes`, extracted at build time). "▸ more" expands the full prose.
- **Primary button** commits the displayed pre-fill verdict (+ merge target if applicable) atomically.
- **"Pick something else ▾"** expands a 3-option radio (Keep as concept / Fold into another / Remove) plus a "Less common: add new concept" link.

### 6.2 Decide step (no pre-fill — §11 / theme-overlap / no-rec)

```
─── §11 High-impact · Decide ──────────  step 7 of 208
Plant Parts                                        §11.7
`plant_parts`        239 appearances · Science

§11 High-impact: review carefully.
Why this needs attention: §11 High-impact concept.

💡 Claude recommends: Keep as concept
   Foundational science concept; consistent tagging across 239
   lessons mostly Science; no clear merge target. Sub-types
   (plant_part_function, plant_part_specific) live as separate
   canonicals to preserve granularity...

  Your call (no default):
  ( ) Keep as concept
  ( ) Fold into another
  ( ) Remove
  Less common: add new concept

  + Add a note

  [← Previous]    [Decide later]    [Save · Next →]
   (disabled until a verdict is picked)
```

- **No pre-fill**: radio is blank.
- **`claude_notes` expanded by default** (Decide gets full reasoning visible).
- **Less common link** opens `new` as a 4th radio option.

### 6.3 Confirm step with cluster-derived pre-fill (after a Resolve)

```
─── §11 High-impact · Confirm ─────────  step 31 of 208
Recipe Writing                                    §11.27
`recipe_writing`     12 appearances · Literacy/ELA

§11 High-impact: review carefully.

💡 Suggested from CON-12 Writing-cluster: Fold into `writing`
   You picked "Use `writing` as the umbrella; collapse all
   specific sub-types" — this member follows that decision.

  ┌──────────────────────────────────────────────────────┐
  │  ✓ Agree — Fold into `writing`                      │
  │                                       Save · Next →  │
  └──────────────────────────────────────────────────────┘

  Pick something else ▾    + Add a note

  [← Previous]                                [Decide later]
```

- **Caption swap**: "Suggested from CON-12" replaces "AI suggestion."
- **Tier strip still shows** ("§11 High-impact: review carefully") because tier doesn't change with mode.
- Note: §11 normally routes to Decide, but cluster-derived pre-fills downgrade attention to Confirm. The §11 high-impact framing is still surfaced in the tier strip; the reviewer can still override via "Pick something else."
- **Override here triggers mismatch flag** + auto-opens notes drawer.

## 7. Merge destination picker

When the team picks "Fold into another" (or accepts a merge recommendation), the verdict area transitions to a destination picker. **The verdict isn't committed until a target is chosen.**

### 7.1 High-confidence target (parsed from `Recommend merging into X` hint)

```
Fold `seasonal_eating` into…

  Claude suggests:
  ┌──────────────────────────────────────────────┐
  │ → seasonality                                │
  │   (high-confidence target)         [Confirm] │
  └──────────────────────────────────────────────┘

  Pick a different target ▾    [Cancel]
```

- **Single-click commit** when the target is high-confidence.

### 7.2 Low-confidence or no target

```
Fold `seasonal_eating` into…

  Pick merge target:
  ┌──────────────────────────────────────────────┐
  │ [ search canonical_keys…                    ]│
  │                                              │
  │ → seasonality                                │
  │ → seasonal_cooking                           │
  │ → harvest                                    │
  │ ...                                          │
  └──────────────────────────────────────────────┘
                              [Cancel]  [Confirm]
```

- Autocomplete over all 208 canonical_keys (same datalist as today's tool).
- "Confirm" disabled until a target is selected.

### 7.3 Target extraction confidence

Parser change (Batch 1):

```python
SUGGESTED_MERGE_TARGET_HIGH_CONFIDENCE_RE = re.compile(
    r"Recommend\s+merg(?:e|ing)\s+(?:into\s+|to\s+)?`([a-z_]+)`",
    re.IGNORECASE,
)
```

The pattern matches `Recommend merging into \`plant_identification\`` and similar verbatim forms. If the regex hits and the captured `canonical_key` exists in the entry set, target is high-confidence. Otherwise, fall back to picker.

## 8. Notes drawer (auto-surface)

One optional textarea per step, hidden behind `+ Add a note` link. Maps to worksheet's `curriculum_notes` field. `reviewer_note` channel is removed.

### Auto-open triggers

| Trigger | Drawer prompt |
|---|---|
| Reviewer overrides Claude's recommendation | "Worth noting why?" |
| Reviewer picks "Add new concept" or "Remove" | "Optional rationale for the team" |
| Cluster-member verdict differs from Resolve decision | "Heads up — this differs from the cluster shape you picked. Worth a quick note?" |
| Manual click on `+ Add a note` | (no prompt; just opens) |

### Export behavior

- Note non-empty → exported `- curriculum_notes: <text>` line at the entry's `curriculum_notes` field lineno
- Note empty / drawer never opened → exported line stays `- curriculum_notes: <to_fill>` (byte-identical to source)
- No HTML-comment-block injection (the old `reviewer_note` channel)

## 9. Cluster signal step (Resolve)

```
─── Resolve cluster ─────────────────  CON-12 (1 of 5)
Writing-cluster canonical shape

  About this question: how should the writing cluster
  (catch-all + 7 sub-types) resolve canonically? Your decision
  shapes 8 related entries below.

  ( ) Keep all 8 as separate canonicals
  ( ) Replace `writing` catch-all with the specific sub-types
  ( ) Use `writing` as the umbrella; collapse all sub-types

  Members (7) — click to peek:
  · writing · narrative_writing · opinion_writing
  · descriptive_writing · how_to_writing · recipe_writing
  · informational_writing

  + Add a note

  [← Previous]   [Decide later]   [Save · Continue →]
```

- Cluster signal text is read straight from `payload.cluster_signals` (which the parser builds from `CLUSTER_SIGNAL_DEFINITIONS` in `build-concepts-tool.py`). The audit register remains source of truth; UI doesn't rephrase options.
- "Save · Continue" commits the cluster decision AND **derives per-member pre-fills**:
  - **"Keep all 8 as separate canonicals"**: no pre-fill change; members walk through as Confirm (with their own AI pre-fill) or Decide (if §11 or no rec).
  - **"Replace `writing` catch-all with specific sub-types"**: pre-fills `writing` itself as `drop`; sub-types walk through with their own pre-fills.
  - **"Use `writing` as the umbrella"**: pre-fills each sub-type as `merge → writing`; `writing` itself walks through as `keep`.
- Member pre-fills carry caption **"Suggested from CON-12"** at the per-entry step.
- **"Decide later"** on a cluster step leaves member entries in Decide mode with reason "Part of cluster CON-XX (no decision yet)."

## 10. Top bar — decision debt

```
Concepts Worksheet · Curriculum Review              ● Saved locally

  12 to decide · 146 to confirm · 5 cluster shapes      ▮▮▮▮▯▯▯▯▯▯

  [🔍 Jump to entry…]                  [Review so far]  [⚙ Advanced]
```

- **Decision-debt counters** update live as each commit lands.
  - "to decide" = unfilled Decide-mode steps
  - "to confirm" = unfilled Confirm-mode steps (pre-fill rendered but not yet committed)
  - "cluster shapes" = unanswered Resolve steps
- "Decide later" count is shown only in the review summary (not in the top bar — keeps the wizard calm).
- **Jump to entry**: autocomplete search over canonical_keys and labels. Selecting jumps the wizard to that step (state-preserving).
- **Review so far**: opens the review summary screen at any time (return arrow brings you back to the wizard step you were on).
- **⚙ Advanced**: import / download JSON progress / show wizard intro / clear all progress (same set as today, minus filter actions).

## 11. Review summary

End-of-wizard destination, and the only escape hatch beyond linear navigation.

```
─── REVIEW YOUR DECISIONS ──────────────  206 of 208 committed
Concepts Worksheet · Curriculum Review            ● Saved locally

  KEEP AS CONCEPT (101)                              [show ▾]
  FOLD INTO ANOTHER (78)                             [show ▾]
    seasonal_eating → seasonality           [edit]
    plant_id        → plant_identification  [edit]
    ...
  ADD NEW CONCEPT (0)                                [show ▾]
  REMOVE (3)                                         [show ▾]

  CLUSTER CHOICES (5 of 5)                           [show ▾]
    CON-12 — Use `writing` as the umbrella
    ...

  ⚠ DECIDE LATER (2)                                 [show ▾]
    biography_reading                       [resume]
    figurative_language                     [resume]

  ⚠ DIFFERS FROM CLUSTER DECISION (1)                [show ▾]
    narrative_writing — your verdict `keep`, CON-12 suggests `merge`

  [← Back to wizard]                       [Save & Export ↓]
```

- Sections are collapsible; each row links back into the wizard at that step.
- **Mismatch section** is informational only — the reviewer's committed verdict wins on export; the section just surfaces "you might want to revisit this."
- **Save & Export** works regardless of `Decide later` or mismatch counts (entries in Decide later export as `<to_fill>`).

## 12. What's removed (vs. current tool)

- Both notes textareas (curriculum_notes + reviewer_note); replaced by single auto-surface drawer
- Right sidebar cluster panel (now Resolve steps in the wizard flow)
- All filter chips (status / tier / subject / theme-overlap-only)
- Inline search input (replaced by jump-to-entry in top bar)
- Onboarding modal in its current shape (rewritten as wizard intro screen)
- Cross-membership cluster badges as clickable nav (now still visible but no separate sidebar)

## 13. What's preserved

- localStorage auto-save (debounced ~250 ms, badge unchanged)
- Save & Export → byte-identical roundtrip when zero state writes
- Cluster-signal HTML comment block at top of exported worksheet
- Import a saved markdown file (restores wizard state)
- Clear-all-progress action, Show-welcome action (now: "Show wizard intro")
- Three-tier locked distribution (32/39/137) and four-verdict vocab (`keep/merge/new/drop`) per D-C4 / D-C8
- Theme-overlap callout, merge_aliases proposal, corpus evidence collapsible
- Cluster-membership badges on per-entry steps (informational; clicking jumps back to the Resolve step)

## 14. Implementation plan — two batches

Each batch leaves the tool in a working state — no half-implemented behavior on disk.

### Batch 1: Wizard MVP

Working tool with the single-entry layout, mode framing, pre-fill commit-on-action semantics, merge destination picker, notes drawer, and a simple "Done" end screen. Cluster Resolve steps render fully but **don't yet auto-pre-fill member entries** (Batch 2). Review summary is deferred (Batch 2).

Scope:
- New CSS for single-entry layout (~720 px centered card) + top bar
- JS step-machine: derived sequence (entries in tier order + cluster signals interleaved before first member); current step index in localStorage
- Per-entry step renderer with mode chip, tier strip, "Why this needs attention" microcopy, Confirm/Decide layout variants, `claude_notes` hybrid expand, merge destination picker with high-confidence shortcut
- Cluster signal step renderer (option radio, member list, no member auto-pre-fill yet)
- Linear nav (← Previous · Decide later · Save · Next) + keyboard (K/M/N/D verdict select for the Decide step, Enter to commit, Left for Previous, L for Decide later)
- Top bar: decision-debt counters + jump-to-entry search + Advanced menu (minus filter actions)
- Notes drawer with auto-open triggers (override + new/drop only; cluster-mismatch deferred to Batch 2)
- Drop from template: notes textareas, filter chips, sidebar, inline search
- Pre-fill commit-on-action semantics enforced in `entryFilled` + render
- Parser change (`build-concepts-tool.py`):
  - Add `claude_notes_summary` field (first-sentence extraction)
  - Add `suggested_merge_target` field (high-confidence extraction from `Recommend merging into \`X\`` hints)
- Simple "Done" end screen with Save & Export button
- Smoke verification:
  - Empty export SHA matches source worksheet SHA
  - Merge verdict without target counts unfilled
  - Reload preserves position + committed verdicts
  - Roundtrip: fill 5 entries → export → import → state restored

### Batch 2: Hand-holdy polish

Adds the cluster-member auto-pre-fill chain, the review summary screen, cluster-mismatch detection, and the wizard intro rewrite.

Scope:
- Cluster Resolve decisions auto-pre-fill member entries (per-option logic in §9)
- Cluster-derived pre-fill caption "Suggested from CON-XX" on member steps
- Mismatch detection: per-entry verdict ≠ cluster shape's derivation → flag + auto-open notes drawer + "Differs from cluster decision" reason on Decide step
- Review summary screen: grouped by verdict + Decide later bucket + cluster choices + mismatch highlights + edit/resume links
- Top-bar "Review so far" link routes to summary
- Wizard intro screen (rewrite of onboarding) — 3-step intro: "What you're doing" → "Three work types" → "Save your work"
- Decision-debt counter recomputation on each commit + on mismatch flag changes
- Smoke verification: full flow walked end-to-end; cluster Resolve → walk members → review summary → export

## 15. Verification loop (each batch)

```bash
python3 scripts/build-concepts-tool.py --verify-only
python3 scripts/build-concepts-tool.py --build-html
```

Then browser smoke (manual or chrome-devtools-mcp):

1. **Empty-export hash invariant**: fresh open → close → diff source worksheet vs exported markdown → must be byte-identical (SHA-256 match).
2. **Skip semantics**: open a step, hit "Decide later," advance, export → verdict line is `<to_fill>`.
3. **Pre-fill non-commit**: open a §13 Confirm step (pre-fill rendered), hit "← Previous" → state.entries[key].verdict still undefined; export of that entry is `<to_fill>`.
4. **Commit roundtrip**: agree on 5 entries → export → re-import → state restored.
5. **Merge destination picker**: pick "Fold into another" on a high-confidence entry → primary "Confirm" commits both verdict + target atomically.
6. **Cluster Resolve + member walk** (Batch 2): pick "Use `writing` as the umbrella" on CON-12 → walk member entries → each shows "Suggested from CON-12" with `merge → writing` pre-fill.
7. **Mismatch flag** (Batch 2): override a cluster-derived pre-fill → mismatch flag set + notes drawer auto-opens + review summary lists under "Differs from cluster decision."

## 16. Out of scope / explicit non-goals

- Changing the 4-verdict vocab (`keep / merge / new / drop`) or 3-tier distribution (32/39/137) — locked per D-C4 / D-C8.
- Changing cluster signal option text — audit register is source of truth; UI doesn't rephrase.
- Multi-reviewer collaboration (single browser, single localStorage; the file is per-machine per the README).
- Mobile/phone redesign — desktop-first; the single-entry layout incidentally improves on tablet.
- New "search synonyms" features — Stage 1 worksheet scope only.
- Editing the worksheet's `<to_fill>` convention or per-entry shape — parser invariants stay locked.

## 17. Decision log (this session)

| ID | Decision | Rationale |
|---|---|---|
| W1 | Direction: single-entry wizard | User chose over phases + density-cut |
| W2 | Pre-fill hybrid: §11 blank, §12/§13 prefilled | High-impact gets conscious calls; routine gets fast path |
| W3 | Cluster signals: just-in-time interleaved | Most hand-holdy; sets context at the right moment |
| W4 | Pre-fill is display-only, commit on action | Protects empty-export hash; prevents silent rubber-stamping |
| W5 | Notes: single drawer, auto-surface | Cuts dual-textarea confusion; surfaces where evidence matters |
| W6 | Claude notes: hybrid expand | Avoid 208 prose-reading screens; expand where attention matters |
| W7 | Mental model: Confirm / Resolve / Decide | Replaces taxonomy framing with attention-budget framing |
| W8 | Reviewer-facing verdict labels | Plain language; export vocab unchanged |
| W9 | `new` behind "Less common: add new concept" link | 0 rec entries; structurally identical to keep for reviewers |
| W10 | Tier framing strip with calm copy | Useful context; no "variance is okay" / "quick keeps" tone |
| W11 | Progress as decision debt, not raw count | Makes work feel smaller and structured |
| W12 | "Skip" renamed "Decide later" | Less punitive; review summary groups under it |
| W13 | Cluster-derived pre-fills labeled "Suggested from CON-XX" | Source transparency over hidden commands |
| W14 | Review summary is the only power-user surface | Wizard stays calm |
| W15 | Merge as destination picker; high-confidence shortcut | Verdict + target as one atomic decision |
| W16 | Two-batch implementation | Each batch leaves tool working; Batch 1 = MVP wizard, Batch 2 = polish |
