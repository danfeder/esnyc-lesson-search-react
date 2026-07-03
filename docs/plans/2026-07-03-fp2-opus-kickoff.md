# FP2 walkthrough kickoff (paste into a fresh OPUS session, 2026-07-03 late morning)

You are Opus, running the two FP2 live walkthrough sessions with the product owner
(non-technical; plain language always; they drive the browser and narrate, you follow, explain,
and log). Repo: /Users/danfeder/cCode/esynyc-lessonsearch-v2. `git pull` first — local main is
behind.

**Your script is `docs/plans/2026-07-03-fp2-walkthrough-script.md` — follow it exactly.** It has
both session plans, every demo step, and the decision-capture checklist that is your primary
deliverable. Execute, don't redesign: if something genuinely surprises you (a demo behaves
differently than the script predicts and the script doesn't cover it), STOP that thread, note it,
and move on — surprises go back to Fable in your handoff, not into improvisation.

## State delta since the script was written (its Part 0 table is partially stale)

All morning gates are CLOSED (tracker `2026-07-03-frontend-polish-tracker.md` §"GATES CLOSED"
has the full receipts):

- **#590 (FP-02 themes) is MERGED and LIVE ON PROD** — Session 1 step 6 is now a
  verify-the-payoff step, not a before/after: "Seed to Table" should return **421** on the live
  site (it was 326 visible yesterday). Step 2's badge-count bug is UNCHANGED (still lies — #593
  is not merged).
- **#584, #582, #583 merged**; hosted embedding functions deleted; OpenAI key removed. No DB or
  edge gates remain today.
- **Open for the sessions: #585, #586, #591, #593, #594, #595** — all green, bot-triaged, none
  merged. Preview URLs are on each PR's checks (netlify deploy-preview).

## Merge authority

- The owner is present. After a PR's demo + decision questions are answered, merge ONLY on
  their explicit per-PR "go" (squash, clean subject, delete branch). All six are frontend-only —
  no PROD approval gates will fire.
- Overlap order (rebases are trivial for whichever lands second): #586 → #591 → #595, then
  #593 → #594.
- #594 owes one deploy-preview smoke before its merge: paste a permalink in a private window +
  probe a retired lesson id (script step 9 / Session 1 step 8 covers it).

## Session-end protocol

1. Fill the script's decision-capture checklist in place (edit the script file).
2. Transcribe outcomes to the tracker's backlog rows (FP-xx statuses).
3. Bundle ALL uncommitted local docs (tracker, script, kickoff files, rung8-morning-burn/,
   src/pages/CLAUDE.md, go-live-tracker note — everything `git status` shows under docs/) into
   ONE `docs:` PR at the end; merge on owner's go after CI.
4. TEST-DB cleanup: Session 2 creates a test submission — delete it and re-verify the baseline
   (763 total / 685 active / 130 subs / 0 `1E2EAUTH` markers) via `mcp__supabase-test__execute_sql`.
5. Write a short handoff note (new file `docs/plans/2026-07-03-fp2-handoff.md`) listing: decisions
   captured, PRs merged (with squash shas), anything that surprised you, anything left open.
   Keep it one page — the next Fable session reads it cold.

## Binding constraints (unchanged)

- PROD data/applies = user-only; you have no PROD gates today, keep it that way (nothing in the
  sessions writes to PROD — Session 2 runs on TEST + previews).
- `filterDefinitions.ts` semantics are stakeholder territory — capture decisions, change nothing.
- Plain language with the owner; investigate any bot finding before "fixing" anything.
