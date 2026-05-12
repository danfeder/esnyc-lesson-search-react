# Stage 1 Heritage Worksheet — Curriculum Team Kickoff

> **TL;DR.** We need your team's input on the canonical "Cultural Heritage" vocabulary the LessonSearch app uses to filter and search 831 lessons. The worksheet at `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` has 88 per-value entries (countries, regions, identities) where the structural proposals are populated; we need verdicts from you.

---

## What this is

The LessonSearch app tags every lesson with a Cultural Heritage value (e.g., `Italian`, `Levantine`, `Indigenous`). Over the years these values drifted — duplicate spellings, missing parents, inconsistent sub-regions, identities tagged differently from one lesson to the next. We're rebuilding the canonical vocabulary so the filter UI is coherent and search behaves predictably across the whole corpus.

The worksheet is the artifact where we capture which values stay, which merge, which need to be added, and how they nest. Once you're done, your decisions feed two follow-on engineering steps: a database migration that updates how heritage is stored, and an LLM-driven re-tag pass that brings the existing 831-lesson corpus into alignment with the new vocabulary.

## What we need from you

For each of the 88 per-value entries (organized by cluster — Asian, Americas, African, European, Middle Eastern, and a cross-cluster Diaspora & Indigenous section):

1. **A verdict.** One of five: `keep` (value is canonical as-is), `merge` (fold into another canonical — specify which one), `split` (break apart into multiple canonicals), `drop` (remove from canonical vocabulary entirely), or `new` (add to canonical, used for values not in the v3 baseline). The worksheet's `Notes` paragraphs include a pre-handoff recommendation based on corpus evidence and Opus body-content reads — these are starting points, not decisions; you're the deciders.

2. **Confirm or refine the structural proposals.** The `surface_label` (display string), `parent` (which cluster / sub-region it nests under), `filter_ui_tier` (where it surfaces in the sidebar — `top` / `sub` / `internal`), and `aliases` (corpus spelling variants that should map to the canonical) are pre-populated. If something looks wrong, refine it.

3. **Five `<to_fill>` cells in the cross-cluster §9.1 Diaspora & Indigenous section.** Two `canonical_key` + `surface_label` pairs depend on framing decisions (cluster root naming + the `Indigenous` vs. `Native American` vs. `Indigenous/Native American` call). Twelve `parent` fields cascade from those. The pre-handoff recommendations in the framing block + §9.1.1 + §9.1.4 Notes are the starting points.

4. **Five §9.1 cross-cluster framing decisions** (Decisions 1-5). These are discussed in the framing block at the top of §9.1 — pre-handoff recommendations are based on corpus evidence but they're load-bearing calls worth your team's attention.

5. **Five cluster decision summary narratives.** At the end of each regional cluster section (§11 Asian, §12 Americas, §13 African, §14 European, §15 Middle Eastern), there's a `### Cluster decision summary` block currently TBD. Write 2-5 paragraphs capturing the WHY behind the cluster's shape — why this hierarchy depth, why this country-specific bar, how multi-parent values were resolved. Future contributors revisiting heritage decisions will read this to understand WHY the cluster looks the way it does.

## How to navigate the worksheet

The worksheet is 2200 lines but most of that is per-value detail you'll work through one cluster at a time. Suggested reading order:

1. **§1-§8 — Header sections** (~300 lines). Read once for background: purpose, methodology, hierarchy rules, verdict vocabulary (read §3 carefully — those five verdicts are the core decision), per-entry shape, filter-UI tier conventions, parsing convention.
2. **§10 — Cluster template (annotated example).** A walk-through of what a fully-filled per-value entry looks like, with annotations explaining each field.
3. **§11-§15 + §9.1 — Per-value work.** Work cluster by cluster. Each cluster section starts with a framing block (corpus distribution + cluster decisions to surface), then per-value entries.
4. **Appendix A — v3 baseline.** Verbatim excerpt from the existing taxonomy schema for self-contained reference (you don't need to act on it; it's the "as-is" state we're proposing to refine).

Stop and ask before you fill if you're unsure how anything works.

## Filling in your decisions

### What to fill

- **`verdict`** — replace `<to_fill>` with one of: `keep` / `merge` / `split` / `drop` / `new`.
- **`merge_into` / `split_into` / `drop_to`** — only required when the verdict is `merge` / `split` / `drop`. Use the target canonical's slug (the kebab-case `canonical_key` value of the row you're merging into). Add it as a new labeled line if it's not already present.
- **`surface_label` / `parent` / `filter_ui_tier` / `aliases`** — the proposals are populated. Confirm or refine. If a proposal is right, leave it as-is.
- **Cluster decision summary blocks** (§5.3, end of each cluster section) — write 2-5 paragraphs explaining the cluster's shape.

Free-form notes are welcome inline as HTML comments: `<!-- review note: ... -->`. The parser ignores these but a future reader will see them. Use this for "I'm not sure about this one" or "want to discuss" markers.

### What to leave alone

- **`canonical_key`** — this is the kebab-case-lowercase machine slug (`east-asian`, `african-american`). A small parser reads these to generate the canonical vocabulary list, so the slug needs to stay stable. The exceptions are the two `<to_fill>` `canonical_key` cells in §9.1.1 (cluster root) + §9.1.4 (Indigenous canonical) — those genuinely need your input.
- **`frequency`** — the count of how many lessons in the active corpus carry this value. Corpus-derived. We'll refresh this at the end of handoff before the data migration runs.
- **The §16 end-summary canonical-vocab table** at the bottom of the worksheet — this is **mechanically regenerated** from the per-value entries you fill in. Don't hand-edit it.
- **§9.2 / §9.3 / §9.4 cross-cluster housekeeping** — these were resolved earlier and are complete.

### What `<to_fill>` means

`<to_fill>` is an intentional placeholder marking "we need your decision here." When you decide, replace it with your value verbatim. Do not add new `<to_fill>` placeholders anywhere. If you genuinely can't decide and want to discuss, leave `<to_fill>` in place and add an inline `<!-- need to discuss with X -->` comment.

## Format constraints

The per-value entries use a labeled-line shape (`- **field_name:** value`) that a small Python parser reads to generate the canonical vocabulary list. A few simple rules keep the parser happy:

- **Keep the labeled-line format.** Each labeled field starts with `- **`, the field name, `:**`, then the value. Don't reflow these into prose.
- **Aliases use a JSON-array-like shape.** `["Foo", "Bar"]` or `[]` for empty. If you add a new alias, follow this format.
- **Inline HTML comments are safe.** `<!-- ... -->` anywhere in a labeled line or a `Notes` paragraph is fine; the parser strips them.
- **The `Notes:` paragraph at the end of each entry is free-form prose.** No leading bullet — it's narrative, not a structured field.
- **Don't reorder the per-value entries within a cluster.** Each entry is numbered (`### 11.1.`, `### 11.2.`, ...) and renumbering would break cross-references.

If something feels structurally off and you're not sure whether your edit will break the parser, ask before saving.

## Audit signals

You'll see references throughout the worksheet to audit-signal IDs like `AME-01`, `EUR-11`, `ME-09`, `X-04` — these point to a separate file (`docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`) that tracks ~50 corpus issues we noticed while populating the worksheet (lessons that need re-tagging, content drift, body-text vs. tag mismatches). These are NOT for you to act on — they're a queue for a separate cleanup pass after the worksheet returns. You can safely ignore them; we're just keeping references in case you want context on why a particular per-value Notes paragraph mentions one.

## Questions during review

Hit me (the project maintainer) directly with questions as you work — Claude Code chat is the channel. Anything from "what does this term mean?" to "I disagree with the pre-handoff recommendation on §X.Y, here's why" is welcome. The pre-handoff recommendations are starting points, not finished decisions; pushback is the whole point.

## What your decisions feed

The filled worksheet hands off to two follow-on engineering steps:

1. **D4 vocab canonicalization migration (PR 5+).** A database migration applies your `keep` / `merge` / `split` / `drop` / `new` decisions across the existing 831-lesson corpus, normalizing the heritage values to the canonical vocabulary.
2. **Stage 2 corpus re-tag (PR 6+).** An LLM pass re-evaluates each lesson's heritage tags against the new canonical vocabulary, catching the cases where the body content suggests a tag that's currently missing (or where a current tag doesn't match the body content). The audit signals mentioned above feed into this pass as known-issue priorities.

After both PRs land, the LessonSearch filter sidebar reflects your canonical vocabulary, and search behavior is coherent across the whole corpus.

---

*Drafted 2026-05-12 alongside Session 74's §16 end-summary shipping. Worksheet status: substantively complete pre-curriculum-team-handoff; awaits your verdicts.*
