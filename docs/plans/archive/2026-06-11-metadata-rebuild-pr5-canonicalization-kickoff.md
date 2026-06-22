<!-- Paste everything below this line at the start of every PR-5 session, after /clear. -->

You are continuing execution of **PR 5 — D4 vocabulary canonicalization (heritage + concepts)**,
part of the metadata-rebuild foundation phase. This prompt is pasted at the start of every session
— assume no prior conversation context. Disk + git history + the execution status file are your
only source of truth.

# WHAT YOU'RE BUILDING

Both Stage-1 vocabulary worksheets are verdict-complete (heritage 2026-05-12: 51 keep / 17 merge /
20 new across 88 values; concepts 2026-06-11: 119 keep / 82 merge / 7 drop across 208 values,
merge graph validated). PR 5 consumes them: rewrite every populated `culturalHeritage` and
`academicConcepts` value in the lesson corpus to its canonical Title Case form, and ship durable
machine-readable alias → canonical vocabulary artifacts for downstream consumers (PR 6 Stage 2
re-tag, submission-time auto-tag, filter UI).

Sequence:
  Session 1: design-lock session — answer the design doc's §4 open mechanism questions, author
             concrete PR 5a tasks into the impl plan. NOT a code session.
  PR 5a: Heritage canonicalization (rehearsal — smaller field proves the mechanism)
  PR 5b: Concepts canonicalization (at scale; includes the 82 folds, 7 drops, and the
         `sorting` → `sorting_and_categorization` rename)

# WHERE THINGS LIVE

- docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-design.md
  WHY + locked decisions. Read end-to-end at session start. **Check its Status line:** if still
  "Draft", you are in (or before) Session 1 and must lock §4 before any implementation.
- docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-implementation.md
  WHAT. Skeleton until Session 1 fills it. Once filled: follow task order; verify every snippet
  against current code; repo-conformance adaptations OK, product/design changes are not.
- docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md
  WHERE WE ARE. The Current State header is the load-bearing orientation piece.
- Verdict inputs (read-only — never edit these):
  - docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md (§16 = 88-row summary)
  - docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md (provenance
    header documents the 3 conflict resolutions)

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the execution status file — Current State header orients you.
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see LOCKED below).
4. Read the impl plan from the current task through the next 1-2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10`
   — if git and the status file diverge, trust git, then fix the status file.
6. Worktree dirty? Identify whether changes belong to this initiative before touching them.
   Never revert unrelated user changes; ask if unsure.
7. `npm run type-check && npm run lint` — confirm clean baseline before changing anything.
8. Tell me where you are and what task is next. Don't start until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS (adopted after Session 3, user decision)

This session runs as a SUPERVISOR. You do the orientation, the user-facing checkpoints, the
verification, and the status-file bookkeeping yourself — but each impl-plan task is EXECUTED
by a dispatched subagent (Agent tool) that starts with fresh context. This keeps the main
context light, so one session can carry several tasks without degrading.

Per task:
1. Dispatch ONE executor subagent (general-purpose; default model inheritance — never downgrade
   executors or reviewers to a smaller model). Its prompt must contain:
   - The four doc paths (kickoff / design / impl plan / status) + the task ID (e.g. "Task B.2"),
     with instruction to READ the design doc and its task section from disk before acting.
   - A digest of this prompt's DATA SAFETY + MIGRATION DISCIPLINE blocks, the LOCKED decisions,
     and the NEVER list — copied in, because the subagent never sees this prompt.
   - Which skills the task requires (e.g. `database-migrations` before touching
     supabase/migrations/; TDD for parser/emitter work).
   - Boundaries: committing on the feature branch is OK; NEVER push, open a PR, touch PROD, or
     edit the verdict worksheets / design doc / impl plan / status file — the supervisor owns
     those.
   - "If blocked, or anything on disk contradicts the locked design, STOP and report back with
     what you found — do not improvise." (Subagents cannot ask the user questions.)
   - Required report format: what was done, commits made, verification commands run + their
     actual output.
2. VERIFY in the main loop before accepting — this is LOAD-BEARING
   (feedback_workflow_orchestration: supervisor verification has caught real agent misses).
   Re-run the task's cheap verification commands yourself (script self-checks, type-check/lint,
   the key MCP probe), inspect `git log` / `git show --stat`, spot-check the artifact. Only
   then mark the task done.
3. Everything user-facing stays in the main loop: orientation confirm, push + PR open
   (allowed without asking, but announce), bot-round triage recommendations, merge, PROD
   approval, and all status-file updates.

The PER-PR RITUAL below stays supervisor-run (its pre-push reviewer dispatch is already a
subagent; bot triage and TEST/PROD MCP verification are supervisor work).

# LOCKED DECISIONS — do NOT re-debate

(New concrete evidence can reopen; generic "could be better" cannot.)

- Field scope: heritage + concepts ONLY. The ~8 smaller vocab fields wait for their own worksheets.
- Two PRs, heritage first (5a) as the rehearsal, concepts second (5b). 5b starts only after 5a is
  PROD-verified.
- Code scope: data + keep-filters-working. `filterDefinitions.ts` aligned only as far as needed so
  filters/search don't break. Full heritage filter-tree redesign = separate later track.
- Title Case canonical surface labels (D4).
- Concepts conflict resolutions stand as archived 2026-06-11: `preservation` survives;
  `sorting` survives relabeled "Sorting and Categorization" (key rename to
  `sorting_and_categorization` happens in PR 5b); `seasonality` absorbs the seasonal family.
- The worksheet verdicts themselves are the curriculum team's word — implementation never
  second-guesses a verdict. Genuine anomalies discovered mid-build get surfaced to the user, not
  patched.

Out of scope (do NOT scope-creep): smaller-field worksheets; full filter-UI redesign; PR 6 re-tag
+ PR 3b synonyms (consult docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md before any
PR 6 planning); embedding regeneration; submission-time auto-tag prompt updates (fast-follow).

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema changes ONLY through migration files; NEVER `mcp__supabase-remote__apply_migration`.
- This initiative rewrites corpus data: every migration must be idempotent, preceded by a
  committed rollback snapshot mechanism (per design §5), and probe-verified before/after at each
  tier with identifiers copied VERBATIM from the vocabulary artifacts
  (per feedback_verbatim_identifiers_in_probes).
- Before merging any DB-touching PR: CI applies to TEST → verify via mcp__supabase-test__execute_sql.
- After PROD apply: verify via mcp__supabase-remote__execute_sql (CI verify step has known SASL
  flakes; MCP is the source of truth). Rerun flaky workflow runs via `gh run rerun --failed`.
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE:
- Invoke the `database-migrations` skill before touching supabase/migrations/.
- `ls supabase/migrations | sort | tail -3` first; date prefix must sort AFTER the latest
  (ASCII gotcha: digits < underscore — same-day additions may need next-day prefixes).

PER-PR RITUAL (every PR, every time):
1. Pre-push: dispatch a code-reviewer agent on `git diff main...HEAD` (the agent reads, not you);
   investigate every finding (rebuttal pass); fix-ups BEFORE push.
2. `npm run type-check && npm run lint`, push, `gh pr create`.
3. Wait for external bots — they are the second pass; no redundant agent dispatch.
4. Collect findings from ALL FOUR surfaces: `gh pr view --comments` / `gh api .../pulls/<PR>/reviews`
   / `gh api .../pulls/<PR>/comments` / `gh pr checks` + failed-run logs. "0 findings" needs
   evidence from all four.
5. Investigate + triage every finding; default-reject hardening that fails the "absence = visible
   bug or DB risk" bar; surface accept/reject recommendations with rationale BEFORE applying.
6. Consolidated fix-up commits (never amend pushed commits).
7. Re-verify TEST DB after every round that touches DB-applied state.
8. Round-cap after 2 bot rounds; 3rd round = critical bugs only.

NEVER without explicit user instruction:
- Push to main / merge a PR / approve a PROD migration / force-push
- Rewrite design doc or impl plan to "improve" them mid-execution
- Edit the two verdict-input worksheet files
- `bd` commands (Beads CLI is broken)

OK without asking:
- `git commit` + `git push -u origin feat/pr5...` on feature branches; `gh pr create`
- Reading anything; running tests/baseline checks; MCP reads/probes on local + TEST
- Dispatching review agents

VERIFICATION BEFORE COMPLETION:
- Evidence before assertions, always. Run the task's verification commands and show output.

# SESSION SCOPE

Under supervisor + subagent execution, a session may carry MULTIPLE tasks: dispatch → verify →
brief status note, then next task. One impl-plan task per subagent dispatch — never bundle two
tasks into one agent. Still stop for: any user-gated decision (merge, PROD approval), any
anomaly needing user judgment, or supervisor context growing heavy (then do the session-end
ritual and hand off to a fresh session).

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run type-check && npm run lint` — must pass (skip only for pure-docs sessions).
2. `git status && git log --oneline -5` — confirm what landed.
3. Update the execution status file: refresh Current State header (~300-500 words); append session
   log entry (commits + decisions + learnings); update decisions roll-up + out-of-scope list.
   The SUPERVISOR owns this file — subagents never write it.
4. Commit the status file (bundle with the session's work commit when a PR is open — don't push
   docs-only commits during an open PR per feedback_no_docs_push_during_pr).
5. At each new-PR boundary: archive the prior PR's session-log entries to
   ...-execution-status-archive.md; promote any process learnings to memory first.
6. Tell me in 2-3 sentences what got done and what next session picks up. End there.

# RIGHT NOW

Read this prompt → status file → design doc → impl plan (current task) → run baseline checks →
tell me where you are and what's next. Don't dispatch the first executor subagent until I
confirm orientation. If the design doc still says Draft, this is Session 1 (design lock):
work the §4 question list, no code.
