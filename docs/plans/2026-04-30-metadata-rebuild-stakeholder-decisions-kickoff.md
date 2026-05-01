# Stakeholder decisions walkthrough — kickoff prompt

**Use:** Paste this into a fresh post-`/clear` session to start the systematic walkthrough of the stakeholder decisions doc.
**Date created:** 2026-04-30
**Active artifact:** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions.md` (10 decision cards)

---

You're picking up the metadata rebuild stakeholder-decisions walkthrough. The user is the decision-driver; you're the thinking partner. This may be a preliminary pass before stakeholders, or the user making calls directly — confirm at the start.

## Required reading, in order

**0. PICKUP CHECK FIRST:** if `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` exists, read its `## Walkthrough state — pickup checkpoint` header (top of file, right after the scaffold table). That tells you progress, next decision in queue, blockers, and any open questions waiting on the user. Then skim the most recent `### Session N` entry under `## Session log` (bottom of file) for the immediate carry-forward context. If the resolved doc doesn't exist, skip to step 1 — this is the first walkthrough session.

1. `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_metadata_rebuild_initiative.md` — initiative state. The bottom dated sections (starting at "2026-04-30 evening — feedback round 1 applied" and "2026-04-30 evening — stakeholder decisions document drafted") are most current. If newer dated sections exist below those, those represent more-recent state and override.
2. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions.md` — the artifact under walkthrough. 10 decision cards (Decision 0 through Decision 9) plus a how-decisions-interact map.
3. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — the status doc + decision journal. Already read for state in step 0; read the per-card sections (Decision N — Status / Decision / Reasoning blocks) for any cards already touched, so you don't relitigate settled calls.

## Reference — don't read end-to-end; query as needed

3. `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md` — technical underpinning, ~950 lines. Use for corpus numbers, code-level details, or the §7/§2 methodology footnotes that the decisions doc references.
4. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-brief.md` — non-technical "where things stand" overview that the decisions doc builds on.
5. Satellite memory files referenced in `MEMORY.md` — three regimes, vocabulary drift, dedup-third-state, CRF theater, teacher-zero-metadata model, lessonFormat conflated, metadata cleanup candidates. Already auto-loaded via MEMORY.md; pull the specific one into focus when its decision comes up.

## Check for prior-session progress before responding

The Walkthrough state header in the resolved doc (step 0 above) is the canonical source. Belt-and-braces:
- Run `git log --oneline -10` to see recent commits — captured decisions land as `docs(metadata-rebuild): walkthrough session N` style commits.
- If `project_metadata_rebuild_initiative.md` has dated sections newer than 2026-04-30 evening, those represent more-recent state and may indicate the initiative has moved past the walkthrough phase entirely (e.g., into implementation).

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

**If pickup check (step 0) found a resolved doc with prior-session work:** the mode + capture-format + walkthrough-order questions below are already settled — don't re-ask them. State-of-play summary in 1 paragraph, then go directly to the "Next in queue" decision named in the Walkthrough state header. Re-read the most recent Session log entry for any carry-forward context.

**If no resolved doc exists (first walkthrough session):** read the required files, then surface to the user:

1. A 1-paragraph state-of-play summary so they can confirm you're grounded.
2. The capture-format question above (inline vs. separate resolved doc).
3. Walkthrough order options:
   - **Doc order (0 → 9)** — most predictable.
   - **Interaction-aware** — e.g., 0 first (it bounds everything), then 4 (vocabulary cuts across many others), then the rest. Surfaces dependencies as they come up.
   - **User's pick** — start with whichever decision they have the strongest prior on.
4. Whether this is a preliminary pass before stakeholders, or the user making calls directly. Affects how aggressively you push back vs. just laying out tradeoffs.

Don't redo any research. Memory + the four docs are the canonical inputs.

## At session end (for whoever's running the session)

Before saying "done" or stopping for the day:
1. Update the Walkthrough state header at top of resolved doc (Last session date, Progress count, Next in queue, Open questions).
2. Add a `### Session N — YYYY-MM-DD` entry to the Session log at bottom of resolved doc (Covered / Calls landed / Key insights / Commit / Carry-forward).
3. **If the next walkthrough card has research that surfaced this session** (e.g., subagent findings, audit numbers, framing, candidate options) — capture it as a `**Pre-walkthrough context**` subsection inside that card BEFORE clearing. Mark provisional positions clearly as openers, not settled calls. This avoids the next session re-running expensive research or opening with a thinner evidence base. See Decision 1's pre-walkthrough context for the pattern.
4. Commit. Style: `docs(metadata-rebuild): walkthrough session N — <decisions touched>`.
5. If significant new state worth surfacing for non-walkthrough sessions, also update `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_metadata_rebuild_initiative.md`.
6. Push only if user asks.
