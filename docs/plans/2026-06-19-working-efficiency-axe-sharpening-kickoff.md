# Working-Efficiency Axe-Sharpening — Session Kickoff

> Paste this at the start of a FRESH session. It is self-contained — assume no prior
> conversation. The job: execute the **"axe-sharpening" subset** of the 2026-06-12
> fable overnight Working-Efficiency Review — the recurring session-overhead fixes
> that make EVERY future session cheaper, safer, and less error-prone. This runs
> BEFORE the deferred-backlog fan-out (it's the "clean the glasses before the
> inspection" step). It is mostly config + docs hygiene — careful, reversible,
> verify-as-you-go. NOT a feature/bug task.

## SOURCE — read this first, in full

`~/cCode/pr6-overnight-2026-06-12/overnight-review/working-efficiency.md`
— 16 prioritized findings (F1–F16; P1/P2/P3), headline ≈ **10–14K tokens/session of
recoverable overhead** plus a hang-trap and several permission-stall classes.
**It lives OUTSIDE the repo** (a sibling dir of `~/cCode/esynyc-lessonsearch-v2/`),
which is why it was hard to find. Each finding has evidence + a concrete remediation;
read them, but **do not trust them blindly** — the doc is a week old and is itself an
AI artifact, so VERIFY each against current reality before acting (see step 1).

The doc is one of a 6-file overnight set. The OTHER 5 (`FINDINGS_SUMMARY`,
`docs-cleanup-audit`, `ARCHIVE_PROPOSAL`, `frontend-ux-review`,
`simplification-groundwork`) are **OUT OF SCOPE here** — they're project-backlog
items swept by the deferred-backlog fan-out
(`docs/plans/2026-06-19-deferred-backlog-fanout-kickoff.md`). Do not tackle them in
this session.

## THE JOB — 3 steps

### 1. RE-VERIFY every finding is still live (obsolescence pass)
The doc is dated 2026-06-12; ~a week of work has shipped since (the metadata-rebuild
initiative closed; MEMORY.md was partially trimmed 2026-06-19). For EACH F#, check the
ACTUAL current state of the file/config/behavior it names, and mark it
`live` / `partially-done` / `obsolete` **with evidence** (file:line, a command's
output, a config value). Ultracode is on — a short parallel verification fan-out (one
agent per finding cluster) is appropriate; the supervisor confirms the verdicts.
**Confirmed still-live as of 2026-06-19** (seen firsthand last session): **F1** beads
fires wrong-guidance + JSONL warnings every session/commit; **F2** MEMORY.md is still
over its ~24.4KB index limit. Others (esp. **F3** CLAUDE.md wrong-facts incl. the
`npm run test` watch-mode hang-trap) MUST be re-verified before acting.

### 2. SPLIT findings into two buckets
- **CLAUDE-CAN-APPLY** (this session does these, carefully, with before/after verify):
  - Repo files → via the normal **PR flow** (branch + commit + PR; no direct-to-main):
    root `CLAUDE.md` wrong-facts (F3), per-dir CLAUDE.md fixes (F14 scripts/Algolia
    contradiction, pages/ inventory), `.gitignore` for beads/tooling strays (F11),
    a missing non-watch test script in `package.json` if F3 needs it.
  - Personal (non-repo) files → edited directly: `MEMORY.md` trim (F2 — **relocate**
    rare-use operational forensics to topic files, don't delete facts; get under the
    limit), `~/.claude/templates/multi-session-execution/*` + the `kickoff-feature`
    skill (F4 executor-dispatch re-reads, F5 kickoff boilerplate → single-source the
    invariant protocol so dispatches/kickoffs stop re-pasting ~12K/335 lines).
- **NEEDS-YOUR-HANDS** (do NOT attempt — prepare exact step-by-step instructions for
  the user): everything in `~/.claude/settings.json` (hooks, plugins, the permission
  allowlist) — F1's beads-hook removal, F6 Supabase-MCP triple-injection + unused
  branching tools, F7 permissions + `/fewer-permission-prompts` (interactive only),
  F12 double marketplace/plugin skills; AND the beads **remove-or-repair decision**
  itself (`bd doctor --fix --yes` to repair vs. retire the tracker). The doc marks
  these "Claude can't or shouldn't self-apply" — respect that.

### 3. Apply + report
Apply the Claude-can bucket with verification between changes. Deliver a tight
**"do these yourself"** checklist for the needs-your-hands bucket (exact commands /
settings.json diffs / which `/command` to run). Note any findings verified `obsolete`
(with evidence) so the user trusts the cull.

## DISCIPLINE / GUARDRAILS

- **Load-bearing config + docs — every change verified and reversible.** Re-read each
  target before editing; confirm the effect after. If a change could break a working
  session (hooks, MCP routing, permissions), it belongs in the needs-your-hands bucket.
- **Verify the doc's claims against reality first.** A "wrong fact" the doc cites may
  itself be stale, or already fixed. Evidence before edits (e.g., actually run the
  test command before declaring it a hang-trap; actually `wc -c MEMORY.md` before/after).
- **F3 hang-trap is the highest-value correctness fix:** confirm what `npm run test`
  actually does (watch vs run), fix CLAUDE.md to point at the non-hanging command, and
  add the missing script if warranted — this protects every future agent.
- **F2 MEMORY.md:** relocate, don't delete; link topic files with `[[name]]`; the goal
  is under the loaded-index size limit with no fact lost.
- **File-ownership boundary is strict:** repo files → PR; `~/.claude/*` personal files
  → direct edits EXCEPT `settings.json` (user-owned, needs-your-hands).
- **Checkpoint with the user before** pushing any repo PR or making sweeping
  MEMORY.md/template changes — surface the plan + recommended order first.

## SCOPE BOUNDARY
- **IN:** F1–F16 of `working-efficiency.md` (session-overhead / how-Claude-works-here).
- **OUT:** the other 5 overnight files; the broader deferred backlog; any project
  feature/bug/UX work — all of that is the deferred-backlog fan-out's job, which runs
  AFTER this pass.

## SESSION-START RITUAL
1. Read `working-efficiency.md` in full.
2. Re-verify all 16 findings vs current state (parallel verification fan-out OK);
   record live/partial/obsolete + evidence.
3. Split into the two buckets.
4. Surface the plan + recommended order to the user BEFORE applying repo-file or any
   sweeping changes.
5. Apply the Claude-can bucket with verification; deliver the needs-your-hands checklist.
