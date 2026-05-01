# Stakeholder decisions walkthrough — kickoff prompt

**Use:** Paste this into a fresh post-`/clear` session to start the systematic walkthrough of the stakeholder decisions doc.
**Date created:** 2026-04-30
**Active artifact:** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions.md` (10 decision cards)

---

You're picking up the metadata rebuild stakeholder-decisions walkthrough. The user is the decision-driver; you're the thinking partner. This may be a preliminary pass before stakeholders, or the user making calls directly — confirm at the start.

## Required reading, in order

1. `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_metadata_rebuild_initiative.md` — initiative state. The bottom dated sections (starting at "2026-04-30 evening — feedback round 1 applied" and "2026-04-30 evening — stakeholder decisions document drafted") are most current. If newer dated sections exist below those, those represent more-recent state and override.
2. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions.md` — the artifact under walkthrough. 10 decision cards (Decision 0 through Decision 9) plus a how-decisions-interact map.

## Reference — don't read end-to-end; query as needed

3. `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md` — technical underpinning, ~950 lines. Use for corpus numbers, code-level details, or the §7/§2 methodology footnotes that the decisions doc references.
4. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-brief.md` — non-technical "where things stand" overview that the decisions doc builds on.
5. Satellite memory files referenced in `MEMORY.md` — three regimes, vocabulary drift, dedup-third-state, CRF theater, teacher-zero-metadata model, lessonFormat conflated, metadata cleanup candidates. Already auto-loaded via MEMORY.md; pull the specific one into focus when its decision comes up.

## Check for prior-session progress before responding

If sessions have happened since this kickoff was written:
- Run `git log --oneline -10` to see recent commits — captured decisions may have been committed.
- Look in `docs/plans/` for a file like `2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` (or similar). If it exists, read it; pick up from where the prior session left off.
- If `project_metadata_rebuild_initiative.md` has dated sections newer than 2026-04-30 evening, those represent more-recent state.

## The mode for each decision

1. **State refresh** — 2-3 sentences on where this decision stands. Pull from the decisions doc + foundational report.
2. **Options recap** — re-state succinctly, with tradeoffs.
3. **Thinking-partner mode** — surface what each option implies for engineering scope, migration risk, and UX. If the decision pulls in a question the user hasn't considered, flag it. If during a decision a workflow-level redesign feels more right than a field-level fix, surface that option even if it's not in the doc.
4. **Capture the call** — when the user decides, record: the call, the reasoning the user gave, any deferred sub-questions, any downstream decisions that follow.
5. **Don't rush.** Each decision deserves space. Stopping mid-walkthrough and resuming later is fine.
6. **Decisions captured aren't sealed.** If the user reopens one mid-walkthrough or in a later session because new info surfaced, treat the resolved record as a journal, not a contract. Update it.

## Working preferences — load these mentally before starting

(From feedback memory; condensed here for the walkthrough.)

- **Explain why, not just what.** Treat this as a thinking exercise. Show tradeoffs the user can react to.
- **Workflows are not sacred.** Surface workflow-level redesign options when they're more right than field-level fixes. The user is open to redesigning submission / review / dedup, not just patching them.
- **Data safety is top priority.** When a decision implies migration, foreground rehearsal / snapshot / idempotency / smallest-first. Ask before touching prod when in doubt.
- **Open to redesign.** If "rebuild" lands in Decision 0, the rest of the conversation should treat the existing schema as negotiable, not fixed.
- **Investigate before agreeing.** When the user proposes a position, check it against the foundational report's evidence (or re-query TEST DB via `mcp__supabase-test__execute_sql`) before just nodding. Decisions are a thinking exercise, not a checkbox.

## Output capture — propose to the user at session start

Two reasonable patterns. Ask which:

- **Inline annotations on the decisions doc.** Add "**Decision:** X" + "**Reasoning:** Y" blocks at the bottom of each card. Single source of truth, but mutates the stakeholder-facing doc — it'd no longer be pristine for sharing with actual stakeholders.
- **Separate resolved doc.** Create `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`. Keeps the original pristine for stakeholder use; the resolved doc records the user's calls + reasoning + deferred questions + downstream implications.

Commit captured decisions at the end of each session block.

## First action

Read the two required files (initiative memory + decisions doc), check for prior-session progress, then surface to the user:

1. A 1-paragraph state-of-play summary so they can confirm you're grounded.
2. The capture-format question above (inline vs. separate resolved doc).
3. Walkthrough order options:
   - **Doc order (0 → 9)** — most predictable.
   - **Interaction-aware** — e.g., 0 first (it bounds everything), then 4 (vocabulary cuts across many others), then the rest. Surfaces dependencies as they come up.
   - **User's pick** — start with whichever decision they have the strongest prior on.
4. Whether this is a preliminary pass before stakeholders, or the user making calls directly. Affects how aggressively you push back vs. just laying out tradeoffs.

Don't redo any research. Memory + the four docs are the canonical inputs.
