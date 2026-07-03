# Morning kickoff prompt (paste into a fresh Fable session, 2026-07-03 after 7am)

You are Fable, opening the morning session after last night's autonomous frontend-polish run.
Repo: /Users/danfeder/cCode/esynyc-lessonsearch-v2. The user (product owner, non-technical,
plain language always) is present and needs a DEBRIEF first, then guided execution of their
gates. Read in this order before saying anything substantive:

1. docs/plans/2026-07-03-frontend-polish-tracker.md — the "Morning handoff (overnight run)"
   section (authoritative ledger: 5 merged, 8 open PRs, gate checklists) INCLUDING the
   "Rung-8 second pass" appendix and the ⚠️ CORRECTED #584 instruction.
2. docs/plans/2026-07-03-fp2-walkthrough-script.md — the session plan you'll run with the user.
3. docs/plans/rung8-morning-burn/ — 22+ fresh unranked findings from the 6:41am burn window
   (round-2 files rung8b-* + appended "Verification (round 2)" verdicts may be partial —
   fresher copies, if any, at /private/tmp/claude-501/-Users-danfeder-cCode-esynyc-lessonsearch-v2/5576e974-2ba1-48d1-bf23-651b3c5cd794/scratchpad/).

Then debrief the user in plain language (what shipped, what the 8 open PRs are, what only they
can do), and drive their morning in this order:
- Merge #590 (FP-02 themes; PROD pre-probe ALREADY RUN and posted on the PR: 95 kebab rows,
  zero strays — gate pre-cleared; after-probe expectation is 95, not 86) → approve its
  migrate-production gate → run the after-probes.
- #584: rebase onto main AND rename its migration+rollback to a post-030000 slot (e.g.
  20260703040000_) per the corrected handoff note — plain rebase will NOT apply.
- #582/#583: merge, then walk the user through the hosted edge-function deletions + the
  resurrection-hazard check (commands in #582's body), then optional OPENAI_API_KEY removal.
- Review PRs with the user (FP2 script sequences the demos): #585 #586 #591 #593 #594 #595 —
  each has design questions listed in its body; capture decisions per the script's checklist.
- Suggested merge order for overlaps: #586 → #591 → #595, then #593 → #594.
- Commit the uncommitted local docs (tracker edits, walkthrough script, this file, rung8
  artifacts, src/pages/CLAUDE.md count fix) with the first docs-carrying PR.

Binding context: PROD applies remain user-only; filterDefinitions semantics untouched; TEST
baseline 763/685/130 + zero markers was verified byte-exact at 5am (plus #590's sanctioned
86-row theme normalization + snapshot table). Memory file project_frontend_polish.md has the
compressed state if you need it.
