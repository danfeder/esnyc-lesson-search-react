<!-- Paste the body below (everything under START) as the first message after /clear, every session. -->

<!-- ===== START OF KICKOFF BODY ===== -->

You are continuing execution of **C02 — Cooking Skills & Main Ingredients Re-tag** (the metadata-rebuild's deferred "PR F"). This prompt is pasted at the start of every session — assume no prior conversation context. Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

Two lesson-metadata fields — `cooking_skills` (122 distinct / 435 lessons) and `main_ingredients` (230 distinct / 430 lessons) — still hold sprawling, inconsistent free-form vocabularies. C02 re-tags them across ~700 live lessons to the **decided canonical vocabulary** (clean **and** complete), then **locks the reviewer write-surfaces** so they can't re-pollute. The method is a **hybrid-floor full LLM re-read** via the existing `scripts/stage2-retag/` harness: the LLM reads every lesson; a deterministic alias-map **floor** anchors the ~92–94% clean core (so the model can't regress it); the LLM owns the judgment work — replacing vague tags with real skills, splitting the old `Herbs & Aromatics` catch-all, **adding** the 1–3 starred specific foods (the two-level design), and dropping cosmetic noise. The prior ~$121 fable run produced ZERO output for these two fields, so this is fresh work (not a re-ship).

Phased delivery (see the design doc §8 + impl plan):
  - **P1:** harness extension + deterministic floor + pilot tooling (scripts-only, no DB)
  - **P2:** pilot + Opus-vs-Sonnet bake-off → 4-gate greenlight (artifacts)
  - **P3:** full run + apply migration (snapshot + dual-write column+JSONB; highest risk)
  - **P4:** enforcement lockdown — **split** P4a frontend (dropdowns + Zod enums) then P4b CHECK migration (expand/contract)

# WHERE THINGS LIVE

- `docs/plans/2026-06-22-c02-cooking-ingredients-retag-design.md` — the WHY + LOCKED decisions. Read once at session start. **CHECK ITS STATUS LINE: if it says `Draft`, you are in (or before) the design-lock session** — Session 1 works the §4 "Open design questions" list against real code/data, locks the answers, flips Status to Locked, and authors the impl plan's concrete tasks. **NO implementation code before that happens.**
- `docs/plans/2026-06-22-c02-cooking-ingredients-retag-implementation.md` — the WHAT (per-task). Ships as a SKELETON until Session 1 authors the tasks. Verify every snippet against current code before applying (line numbers drift); small repo-conformance adaptations OK, product/scope changes are not — if a needed change alters behavior/scope, stop and ask.
- `docs/plans/2026-06-22-c02-cooking-ingredients-retag-execution-status.md` — WHERE we are. Survives /clear. The "Current State" header is the load-bearing orientation piece.
- `docs/plans/2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` — created when the status doc grows unwieldy or at a PR boundary; read on demand via `grep -n`, not at session start.

# SESSION-START RITUAL (do FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file's Current State header (+ recent decisions / session log). Don't read the archive at session start.
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see LOCKED below).
4. Read the impl plan from the task you're about to start through the next 1–2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git matches the status file. If they diverge, trust git, then fix the status file.
6. If the worktree is dirty, confirm the changes are part of C02 before touching them; never revert unrelated user changes; if unsure, ask.
7. `npm run check` (= type-check + lint) — confirm a clean baseline. For harness work also `npm run test:run`. If it fails and is unrelated to the branch/task, report + ask before changing unrelated files.
8. Tell me where you are and what task is next. Don't start coding / dispatch the first executor until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR. You own orientation, user checkpoints, decisions, verification, and status bookkeeping — impl-plan tasks are EXECUTED by dispatched subagents (Agent tool) with fresh context. Keep supervisor context light so one session carries several tasks.

Supervisor context discipline:
- Delegate bulk reading (multi-file exploration, long diffs) to a subagent that returns conclusions.
- One impl-plan task per executor dispatch — never bundle two.
- **Verify in the main loop before accepting any executor's result — LOAD-BEARING** (`feedback_workflow_orchestration`: supervisor verification has caught real agent misses). Re-run the task's cheap checks yourself (`npm run check`, the key probe), inspect `git show --stat`, spot-check the artifact.
- Checkpoint the status Current State header after EACH verified task, not just at session end.
- Stop dispatching well before context gets heavy; run the session-end ritual and hand off.

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff): the four doc paths + the task ID (read the design doc + the task section from disk first); a digest of DATA SAFETY + the LOCKED decisions + the NEVER list; required skills (e.g. `database-migrations`, TDD); boundaries (commit on the feature branch OK; NEVER push/PR/PROD/edit the four scaffold docs — the supervisor owns those); "if blocked or disk contradicts the locked design, STOP and report — do not improvise" (subagents can't ask the user); required report = what was done, commits, verification commands + ACTUAL output.

If a workflow/ultracode opt-in is active, the Workflow tool is the preferred orchestration for fan-out phases (executor → adversarial verifier); same context discipline + supervisor-verify gate apply.

# LOCKED DECISIONS — do NOT re-debate (full set in the design doc; at-risk locks pinned here)

- **Method = hybrid-floor full LLM re-read** (NOT rules-only — can't add specifics/split Herbs/replace vague tags; NOT blind full-LLM — would regress the clean core). The LLM reads every lesson; the deterministic alias-map floor anchors the ~94% clean core.
- **Vocabulary** = the decided worksheet + C02 amendments: cooking-skills 23 (**Frying → Sautéing & stir-frying**, no 24th); ingredients = worksheet groups/specifics **+ Seaweed (nori), Cocoa & chocolate (group-less specifics), Sunflower butter / Tahini / Peanut butter (under Nuts & seeds)**; **Hummus → Chickpeas remap**. Solo sign-off (no team round). The **exact closed VALUES manifest + parent map + open-specifics freeze** is §4 Q1 (locked in Session 1).
- **Pilot before the full run**, greenlit on **4 separate gates** (no core regression / beats rules on judgment rows / low false-positive on added specifics / pantry-staple precision) — NOT one macro score. Gold key = AI-drafts-user-adjudicates + an independent hard-case protocol. Re-run an **Opus-vs-Sonnet bake-off** (fable suspended).
- **Enforcement rides with C02, AFTER data is clean**, via **expand/contract**: P3 data canonical (no CHECK) → P4a closed frontend/Zod deploys → P4b CHECK migration (separate approval). Mirror `garden_skills`. Specific→group invariant enforced (app-layer); "1–3 specifics" is guidance, not a cap.
- **Canonical surface = the typed `text[]` columns**; the apply **dual-writes** column + `metadata` JSONB.

Out of scope (captured as follow-ups in the design doc §10 — do NOT scope-creep):
  - Embeddings regeneration (rebuild's C2.4) · filter-UI surfacing of the two tiers · a hard "1–3" cap · curriculum-team validation round · a DB trigger for the invariant.

If you want to "improve" the design/plan mid-execution, STOP and surface it. Don't unilaterally rewrite the spec. New concrete evidence can re-open a lock; generic "this could be better" cannot.

# HARD RULES

DATA SAFETY (top priority — supersedes velocity):
- Schema/data-mutation changes ONLY through migration files. Never apply schema/bulk-data directly to PROD via MCP. (Read-only PROD SELECTs for verification/census are fine.)
- Before merging any DB-touching PR: wait for CI to apply the migration to TEST, then verify via `mcp__supabase-test__execute_sql`.
- After PROD migration applies: verify via `mcp__supabase-remote__execute_sql`. Mandatory — CI's verify step has known flakes (`reference_ci_flakes`), so MCP verification is the source of truth.
- Snapshot-before-mutate; sibling `.sql.rollback`; rehearse on TEST. When in doubt about touching PROD data, ask first.

MIGRATION DISCIPLINE:
- Before touching any file in `supabase/migrations/`, invoke the `database-migrations` skill (or `/new-migration`).
- New migration's `YYYYMMDDHHMMSS_` prefix must sort AFTER the latest existing — `ls supabase/migrations | sort | tail -3` first (ASCII gotcha: digits < underscore).
- **GATE 2 (Codex, pre-TEST):** before opening the PR / applying any migration to TEST, run a Codex adversarial review of the migration SQL (focus: idempotency, snapshot-completeness, dual-write column+JSONB lockstep, table-wide CHECK vs un-migrated/retired rows, rollback completeness incl. re-GRANT/NOTIFY if an RPC is recreated, quoting/escaping). Triage + fix before push. Additive to the migration skill + local reset/RLS tests + TEST/PROD verify.

CODEX ADVERSARIAL REVIEW (the Codex plugin IS installed — keep these gates; different model family, catches a different failure distribution; triage with the same default-reject-below-bar discipline as bot reviews, `feedback_bot_review_investigation` + `feedback_codex_over_crossexamine`). The supervisor CANNOT fire the `/codex:*` slash commands from the Skill tool — dispatch the `codex:codex-rescue` subagent via the Agent tool with an explicit **"return findings INLINE, do not background, poll your result"** contract (the known retrieval failure: it backgrounds + loses findings, unrecoverable since SendMessage isn't available here; `feedback_codex_return_inline`). If the wrapper flakes, fall back to `codex exec -s read-only` via Bash.
- GATE 1A (design doc) — done 2026-06-22 (Codex + Claude, folded).
- GATE 1B (impl plan / a substantial PR section) — run in Session 1 when the concrete tasks are authored (NARROWER than 1A; validate code anchors, migration shapes, ordering, verify commands).
- GATE 2 (pre-TEST migration) — above.
- GATE 3 (pre-push) — Codex review in parallel with the Claude code-reviewer; dedupe + rebuttal both.
- GATE 4 (pre-finalize) — Codex 2nd opinion on every real suggested bot change before finalizing.

PER-PR RITUAL (every PR; compact checklist — canonical detail in the cited memories):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` + **GATE 3 Codex** in parallel; dedupe + rebuttal; fix-ups before push. Re-dispatch on every push. (`feedback_bot_review_investigation`)
2. `npm run check`, push, `gh pr create`.
3. Wait for external bots — they ARE the second pass.
4. FOUR-SURFACE TRIAGE — issue-comments, review summaries, line-comments, checks/failed-run logs. "0 findings" needs evidence from all four. Use `/pr-triage <PR>`. Confirm the underlying run via `gh run view <id> --json status,conclusion`, not cached `gh pr checks`. (`feedback_pr_comment_surfaces`)
5. Investigate + rebuttal-pass EVERY finding; default-reject hardening that fails the "absence = user-visible bug or DB risk" bar. **GATE 4 Codex** on any real suggested change before finalizing. (`feedback_pr_bot_review_workflow`)
6. Consolidated fix-up commits — never amend pushed commits.
7. Re-verify TEST DB after every DB-touching round. (`feedback_per_round_test_db_verification`)
8. Round-cap after 2 bot rounds; a 3rd is critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main · merge a PR · approve a PROD migration in CI/CD · `git push --force` · rewrite the design/impl docs to "improve" mid-execution · fake-lock a `[user-verdict]` §4 question (present evidence + a recommendation; the user decides).

WHAT'S OK without asking:
- `git push -u origin feat/c02-...` for the current feature branch · `git commit` on the feature branch · `gh pr create` · reading/tests/baseline checks · read-only PROD SELECTs for verification · dispatching review agents.

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run its Verify commands and see green. "Tests pass" requires you ran them. Invoke `superpowers:verification-before-completion` if unclear.

TDD WHERE APPROPRIATE:
- The impl plan flags TDD tasks (harness + Zod). Failing-test-first → implement → green → commit. Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

A session carries as many tasks as supervisor context allows: dispatch → verify → checkpoint the status header, then next. Boundary = supervisor context budget, NOT task count. Always stop for: any user-gated decision (merge, PROD approval, `[user-verdict]` questions, the pilot greenlight), any anomaly needing user judgment, or heavy context (then session-end ritual). Never hand off mid-task — stop at commit boundaries.

# SESSION-END RITUAL (do LAST, every session)

1. `npm run check` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what landed.
3. Update the status file: refresh the Current State header (~300–500 words, the load-bearing orientation piece); append a session-log entry (commit hashes + task IDs + decisions + learnings); update recent-decisions + out-of-scope follow-ups. The SUPERVISOR owns this file; subagents never write it.
4. Commit the status file (+ kickoff edits if the rituals/locks changed).
5. PR-cycle archival (START of each new PR cycle, not mid-PR): move the prior PR's session entries to the archive file; audit each for learnings worth promoting to feedback memories / MEMORY.md first.
6. Initiative-close retrospective (FINAL session only): (a) lift out-of-scope follow-ups into project memory; (b) promote process learnings to feedback memories; (c) check whether anything should AMEND the scaffolding templates / `/kickoff-feature` (propose, don't silently edit); (d) MEMORY.md hygiene on close (compress the index line to ≤40 words + pointer; flip the project memory frontmatter to closed; move rare-use forensics to a `reference_*.md`).
7. Tell me in 2–3 sentences what got done and what next session picks up. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

MEMORY.md references include `feedback_multi_session_execution`, `feedback_data_safety_top_priority`, `feedback_per_round_test_db_verification`, `feedback_pr_bot_review_workflow`, `feedback_bot_review_investigation`, `feedback_pr_comment_surfaces`, `feedback_codex_over_crossexamine`, `feedback_codex_return_inline`, `reference_ci_flakes`, `reference_data_mutation_gotchas`, `project_metadata_rebuild_initiative`, `project_deferred_work_campaign`. They apply throughout.

# EXECUTION STATUS FILE

Already created at `docs/plans/2026-06-22-c02-cooking-ingredients-retag-execution-status.md`. If it's somehow missing, recreate from the status-doc template at `~/.claude/templates/multi-session-execution/status-doc-template.md`.

# RIGHT NOW

Read this prompt → read the design doc → read the impl plan → read the status file → `npm run check` → tell me where you are and what's next. Don't start coding until I confirm.

**The design doc Status is `LOCKED` and the impl plan's P1–P4b tasks are authored — design lock (Session 1) is DONE. You are in P1 IMPLEMENTATION on `feat/c02-harness`.** The status file's Current State header is the load-bearing orientation: it names the exact next task. As of the last checkpoint, **P1.1 (vocab manifest + alias-floor) and P1.2 (both fields in harness output) are COMPLETE + verified; the next task is P1.3** (deterministic alias-floor + parent-reconcile normalize rules R7/R8/R9 in `normalize.ts`, TDD). Follow the SESSION-START RITUAL + EXECUTION MODE above: orient, confirm with the user, then dispatch the next impl-plan task as a fresh-context executor (→ adversarial verifier) and supervisor-verify before accepting. **Trust git + the status file over any stale line here.** (Historical note: a Session-2 lock correction fixed the §4 Q1 manifest to **46 specifics / 70 main_ingredients values** with **Melons parented under "Squash, cucumbers & melons"** and **4 null-parent specifics** — that correction is already folded into all docs.)

<!-- ===== END OF KICKOFF BODY ===== -->
