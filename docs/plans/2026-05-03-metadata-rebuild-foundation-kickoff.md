<!--
  KICKOFF PROMPT — paste at session start (after /clear) for foundation-phase
  metadata rebuild execution. Body is everything between the START and END
  markers.
-->

<!-- ===== START OF KICKOFF BODY (paste from here onward) ===== -->

You are continuing execution of the **metadata-rebuild foundation phase**.
This prompt will be pasted at the start of every session in this work — assume
no prior conversation context. Treat what's on disk + git history + the
execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

The foundation phase of the lesson-corpus metadata rebuild. The corpus has 3
metadata regimes (legacy ~684 / submission-era ~78 / post-B-update ~7) with
~4,920 row-appearances of vocabulary drift across 10 fields, a `lessonFormat`
field that conflates 3 orthogonal axes, and 87% of tags inherited from a
2025-07-10 v3 GPT-4.1 batch run that no human reviewer ever validated.
Foundation phase rebuilds the substrate (schema + canonical vocabulary +
LLM-at-submission pipeline + corpus refresh) so downstream work — Stage 1
worksheets, Stage 2 re-tag, Phase 2 reviewer UX — operates on clean ground.

This is D0's hybrid frame: foundation-now / reviewer-UX-later. Per session 9,
foundation phase deliberately does NOT redesign reviewer UX or build new
pickers — those defer to Phase 2.

**Pre-PR-1 Gates (run before PR 1 branches; investigation/decision tasks):**
  Gate A: lessonFormat dependency sweep (verify ~95-surface inventory in current repo)
  Gate B: Validator architecture decision + Zod canonical scaffold
  Gate C: Per-prompt readiness audit (~6 candidate fields → vocab-locked / Stage-1-gated / dropped)

**Estimated 6+ sequential PRs (final count TBD; some PRs gate on Stage 1
worksheet outputs from the parallel curriculum-team track):**
  PR 1: Structural schema + lessonFormat dependency sweep (D2 enum, D3 coordinated removal, D6 series_id+part_number, D7 tags, D9 crf_confirmed, filter UI, Zod canonical scaffolding from Gate B)
  PR 2: Submission-time LLM auto-tag — vocab-locked prompts only (CRF + activity_type + tags + Gate-C-classified vocab-locked); Stage-1-gated prompts (academicConcepts, cultural_heritage, ...) deploy after worksheets
  PR 3a: Search infra now (search_vector + embeddings + smart-search drift fix; independent of Stage 1)
  PR 3b: Search synonym population (depends on Stage 2 re-tag outputs; folds into PR 6+)
  PR 4: Corpus drops (23 third-party imports) + archive-concepts recovery + N1 retitle (FSA "& 2" drop)
  PR 5+: D4 vocab canonicalization (depends on Stage 1 worksheet outputs)
  PR 6+: Stage 2 corpus re-tag + reviewer validation flow (depends on PR 5 + Stage 1 closure + Stage 2 reviewer-validation UX walk; flexible timing)

# WHERE THINGS LIVE

- `/Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-05-03-metadata-rebuild-foundation-design.md`
  The WHY behind every locked decision (compressed). Read once at session
  start. Return when a "why are we doing it this way" question comes up.

- `/Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`
  The full decision journal — per-card "Decision" + "Reasoning" + "Downstream
  implications" blocks across 13 walkthrough calls + cross-cutting tracks.
  Authoritative source for any locked decision's rationale (the design doc
  references this for full detail). Read the Walkthrough state header first
  if pickup is ambiguous; per-card blocks for any specific decision.

- `/Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md`
  The WHAT. Source of truth for the next task: exact file paths, code
  snippets, test commands, commit messages. Follow it for product scope and
  task order. Verify every snippet against the current code before applying
  it — line numbers, imports, types, prop names, and APIs may have drifted
  since the plan was written. Small repo-conformance adaptations are allowed;
  product or design changes are not. If a needed adaptation changes behavior
  or scope, stop and ask. Tasks marked **TBD** depend on Stage 1 worksheet
  outputs or implementation-time decisions; expand them when the dependency
  lands.

- `/Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md`
  Source of truth for WHERE we are. Survives /clear because it's on disk +
  in git. If it doesn't exist, you're starting Session 1 — create it using
  the template at the bottom of this prompt.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the execution status file (or note it needs creating).
3. Read the design doc end-to-end. Settled decisions are NOT debatable
   (see "LOCKED" below).
4. Read the implementation plan from the task you're about to start through
   the next 1-2 tasks (don't read it all unless useful).
5. `git status --short --branch && git branch --show-current && git log --oneline -10`
   — confirm git matches the status file. If they diverge, trust git, then
   update the status file to match reality before proceeding.
6. If the worktree is dirty, identify whether the changes are part of the
   metadata-rebuild foundation phase before touching them. Never revert or
   overwrite unrelated user changes. If unsure, ask.
7. `npm run type-check && npm run lint` — confirm a clean baseline.
   If it fails, diagnose first. If the failure is unrelated to the current
   branch/task, report it and ask before changing unrelated files. If it
   is caused by current branch work, fix it before proceeding.
8. Tell me where you are and what task is next. Don't start coding until
   I confirm orientation.

# LOCKED DECISIONS — do NOT re-debate

These were settled across 9 walkthrough sessions covering 13 calls + cross-
cutting tracks. New concrete evidence can re-open them; generic "this could
be better" arguments cannot. Per-card rationale lives in the decision journal.

**Schema-affecting:**
- **D2** — `activity_type` vocabulary expanded to 5 values (`cooking / garden / both / academic / craft`); single-select stays; orientation handled via existing `tags` array column (closed enum, starting `["orientation"]`); no `lesson_function` general field; no multi-select.
- **D3** — `lessonFormat` dropped entirely. No replacement, no derivation. Three axes (time-structure / standalone-vs-unit / mobile-delivery) lost their case independently.
- **D6** — `series_id` (text) + `part_number` (int) columns added in PR 1; ~7 series, ~14 lessons backfilled in PR 1. **Dedup pipeline rework that reads series_id and skips comparison within a series is OUT OF SCOPE for foundation phase** — that lives in the dedup-pipeline third-state work track per design §11. Foundation phase ships the column scaffolding only.
- **D7** — `bilingual_handouts` joins tags closed enum (now `["orientation", "bilingual_handouts"]`); "valid variations" principle (no other cross-row modeling — no school_id, no mobile_ed_adaptation, no dish_canonical, no parent_lesson_id).
- **D9** — `cultural_responsiveness_features` stays `text[]` of the 7 master-list features (Brown CR framework); add `crf_confirmed boolean default false` backend marker.

**Vocab / data:**
- **D4** — Title Case canonical across all ~10 vocabulary-bearing fields; v3 baseline + curriculum-team-validated worksheets; Pydantic on all 17 fields (replaces v3's 3-of-17 enforcement).
- **Cross-cutting Scope 3** — full corpus re-tag with Opus, two stages (Stage 1 worksheet validation, Stage 2 corpus re-tag); flexible Stage 2 timing.
- **23-lesson import-drop list** — locked (5 PFLP + 11 FoodCorps + 7 one-offs); foundation-phase corpus shrinks 772 → ~749.

**Pipeline:**
- **D5** — submission-time LLM auto-tag for `academicConcepts`; both-vocab re-tag (framework + everyday); populate `search_synonyms` from concepts (in PR 3b after Stage 2); add concepts to `search_vector` and embedding script (in PR 3a, independent of Stage 1).
- **D9 (pipeline)** — CRF submission-time LLM auto-tag at submission; reviewer-validate-lenient; leave older legacy lessons as-is; re-tag modern-template lessons only.
- **Extension to ~10 high-fit fields** — submission-time Opus tagging rides on D5 + D9 infra; per-prompt eval gates before each ships.

**Per-prompt readiness gating (per session 9 + reviewer feedback):**
- **Vocab-locked (ships in PR 2):** CRF, activity_type, tags + any Gate-C-classified vocab-locked.
- **Stage-1-gated (deploys after corresponding worksheet lands, NOT in PR 2):** academicConcepts (concepts worksheet), cultural_heritage (heritage worksheet) + any Gate-C-classified Stage-1-gated.
- **Operational gating choice:** Stage-1-gated prompts do NOT deploy with v3-baseline vocabulary. Pre-canonical drift creates Stage 2 cleanup cost; the prompts wait for their worksheets.

**Validator architecture (per design doc §5, Option B confirmed; refined round 2):**
- **Two TS schemas, not one** (LessonMetadata and ReviewMetadata genuinely diverge):
  - `src/types/lessonMetadata.zod.ts` — canonical (array values, thematicCategories/seasonTiming/locationRequirements keys). Imported by `process-submission`, data-import scripts, Stage 2 batch.
  - `src/types/reviewFormPayload.zod.ts` — review-form (single-select strings, themes/season/location keys). Imported by `complete-review` edge function and `ReviewDetail.tsx`.
  - `src/utils/{reviewToLesson,lessonToReview}Mapper.ts` — bidirectional pure-function mappers mirroring the SQL translation in `complete_review_atomic`.
- Edge functions resolve `zod` via `supabase/functions/deno.json` (`"imports": { "zod": "npm:zod@3" }`); fallback to `https://esm.sh/zod@3` URL imports if needed.
- Pydantic mirrors enums for Stage 2 batch via generated `enums.json`; CI tests Zod ↔ Pydantic equivalence.
- SQL CHECK + trigger value-validation hand-synced from canonical Zod source.
- Today's coverage: 1 SQL CHECK, 1 shape-only trigger covering 10/17, 0 Zod, 5/17 Pydantic in v3. Foundation phase establishes all artifacts.

**Rollout-compatibility pattern (PR 1):**
- PostgREST returns hard `PGRST202` 404 on unknown RPC parameters; Netlify caches JS bundles 1 year (hash-immutable); TanStack Query staleTime 5 min. Stale browser tabs can emit old RPC params after column drops.
- **Pattern:** keep deprecated parameters/projections with `DEFAULT NULL` for one release; drop in a follow-up migration ≥24-48h after frontend deploys.
- Applies to PR 1: `search_lessons.filter_lesson_format` parameter + `lessons_with_metadata` view's `lesson_format` projection both kept for one release; dropped in Task 1.3a follow-up migration.

**LLM draft storage contract (PR 2):**
- Drafts live in new column `lesson_submissions.ai_draft_metadata jsonb` (+ `ai_draft_generated_at` + `ai_draft_model`).
- Stored in **canonical-keys shape** (matches `lessons.metadata`, not `submission_reviews.tagged_metadata`).
- ReviewDetail.tsx reads `ai_draft_metadata` at form-init (when no review row exists yet) and applies `lessonToReviewMapper` for display.
- `complete_review_atomic` does NOT change — reviewer's saved metadata is the final answer; draft is read-only display.
- Why not pre-create a `submission_reviews` row: UNIQUE(submission_id) + NOT NULL `reviewer_id` FK to `auth.users` make sentinel-reviewer infeasible.

**Stage 2 reviewer model — two layers:**
- **Locked QC floor (Cross-cutting Scope 3):** spot-check 50-100 sampled lessons; flagged patterns escalate.
- **Deferred Stage 2 reviewer-validation UX walk (session 9):** whether Stage 2 needs broader per-field reviewer validation across ~700 unreviewed lessons, and what that flow looks like. Walked during foundation-phase implementation planning when LLM-draft-validation flow becomes the active design surface (likely just before PR 6+).

**Architectural / process:**
- **D0** — hybrid frame (foundation phase + Phase 2 reviewer UX redesign).
- **D1 meta layer** — schema decoupled from filter UI; content layer = heritage worksheet round, deferred to curriculum-team track (parallel, foundation-gating).
- **D8 substance** — teacher-zero (reviewers remain sole metadata authority); D8 phase-2 reviewer-tooling questions dropped at session 9 after audit-attribution check.
- **N1** — FSA retitle (drop "& 2"); Winter After School Session 2 leave-as-is.
- **Stage 1 worksheet methodology** — Position 1 (Opus-corpus-read integrated into worksheet drafting); per-field judgment on whether Opus reads needed; novelty pass added.

**Out of scope (Phase 2 / separate work tracks — do NOT scope-creep):**
- Marginal-field LLM prompts (`grade_levels`, `location`)
- Reviewer-validate UI redesign (the picker UI for editing LLM drafts)
- Stage 2 reviewer-validation UX walk (deferred walk to land during foundation-phase implementation planning when the LLM-draft-validation flow is the active design surface)
- General reviewer UX redesign (guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text — mechanism inventory archived as candidate inputs for future Stage 2 walk)
- Dedup-pipeline third-state redesign (separate work track; handles same-dish-sibling, cross-site variants, cross-version siblings, series_id-driven skip-comparison)
- CRF UI surfacing to end users (sidebar / badge / silent)

**NOT out-of-scope (parallel foundation-phase track, gating to D4 + Stage 2):**
- Stage 1 heritage / concepts / ~8 smaller-field worksheet rounds — curriculum-team-driven; output gates D4 vocab migration timing + Stage 2 re-tag prompt design.

If you find yourself wanting to "improve" the design or plan mid-execution,
STOP and surface it to the user. Don't unilaterally rewrite the spec.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema changes ONLY through migration files. Never apply schema directly
  to production via `mcp__supabase-remote__apply_migration` / direct SQL.
- Before merging any DB-touching PR: wait for CI to apply migration to TEST,
  then verify via `mcp__supabase-test__execute_sql`.
- After PROD migration applies: verify via `mcp__supabase-remote__execute_sql`.
  Mandatory — CI's verify step has known SASL flakes (per memory), so MCP
  verification is the source of truth.
- After PROD edge-function deploy: verify via
  `mcp__supabase-remote__get_edge_function <slug>` (compare ezbr_sha256 or
  grep for known new code line) — Supabase CLI's "Deployed Functions" log
  line is NOT a guarantee deployment took.
- When in doubt about touching prod data, ask first.
- Pre-delete checklist (per memory's hygiene-follow-ups note from Phase 6.2):
  for any DELETE FROM lessons, check (1) FK refs INTO the row from
  bookmarks / canonical_lessons / duplicate_resolutions / lesson_archive /
  lesson_submissions / lesson_versions / collections+dismissals arrays /
  submission_reviews+_archive / submission_similarities; (2) FK ref OUT FROM
  the row via `lessons.original_submission_id`. Document mitigation per row.

MIGRATION DISCIPLINE:
- Before touching any file in `supabase/migrations/`, invoke the
  `database-migrations` skill via the Skill tool.
- Verify the new migration's date prefix sorts AFTER the latest existing
  one. Run `ls supabase/migrations | sort | tail -3` first. ASCII gotcha
  (per memory): files like `20260208140000_*` sort BEFORE `20260208_*`
  because digits < underscore. When adding same-day migrations alongside
  an existing `YYYYMMDD_` file, use the NEXT day's date with a timestamp
  to ensure correct sort order.

PER-PR RITUAL (every PR, every time):
1. Pre-push review: DISPATCH a code-reviewer agent (e.g.
   `feature-dev:code-reviewer` or `superpowers:code-reviewer`) on
   `git diff main...HEAD`. The agent does the line-by-line read, not you —
   you cannot impartially review your own work. Investigate every finding
   per `feedback_bot_review_investigation.md` (verify against actual code,
   push back where the agent is wrong). Apply fix-up commits BEFORE push
   (or amend, since the work isn't pushed yet). Re-dispatch a fresh review
   on every push that follows, not just the initial PR open.
2. Run `npm run type-check && npm run lint` (mandatory pre-PR).
3. Push the feature branch.
4. Open the PR with `gh pr create`.
5. Wait for external bot reviewers to land (CodeRabbit, Claude Review,
   etc.) — they ARE the second pass; do NOT dispatch a redundant
   code-reviewer agent here.
6. COLLECT findings from ALL FOUR PR surfaces — querying only one is a
   verification failure (per `feedback_pr_comment_surfaces.md`):
     a. `gh pr view <PR> --comments` (issue-comments, where bots typically post their full report)
     b. `gh api repos/<owner>/<repo>/pulls/<PR>/reviews --jq '.[] | {user: .user.login, state, body}'`
     c. `gh api repos/<owner>/<repo>/pulls/<PR>/comments --jq '.[] | {user: .user.login, path, line, body}'`
     d. `gh pr checks <PR>` + `gh run view <id> --log-failed` for any failing check
   "0 findings" is a CLAIM that requires evidence from all four.
7. INVESTIGATE & TRIAGE each finding (rebuttal pass per
   `feedback_bot_review_investigation.md`; default-reject hardening per
   `feedback_pr_bot_review_workflow.md`). Surface accept/reject
   recommendations with rationale BEFORE applying.
8. Apply accepted findings as consolidated fix-up commits (do NOT amend
   pushed commits).
9. RE-VERIFY TEST DB after each round (per
   `feedback_per_round_test_db_verification.md`). Every round that touches
   DB-applied state needs its own evidence — one-time verification at PR
   open is NOT sufficient.
10. ROUND-CAP AFTER 2 ROUNDS of bot review. If a 3rd round comes in, fix
    only critical bugs, document the rest, ship.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only)
- Merge a PR
- Approve a PROD migration in CI/CD
- `git push --force` on any branch
- Re-write design doc or implementation plan to "improve" mid-execution
- `bd` commands — beads is broken (per memory `project_beads_broken.md`); use TodoWrite/TaskCreate alternatives or in-conversation tracking

WHAT'S OK without asking:
- `git push -u origin feat/metadata-foundation-...` for the current feature branch
- `git commit` on the feature branch (often, small)
- `gh pr create` for the current branch
- Reading anything, running tests, running baseline checks
- Dispatching review agents via the Agent tool

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run the verification commands in that task's
  spec. Evidence before assertions. Invoke the
  `superpowers:verification-before-completion` skill if unclear.
- "Tests pass" requires that you ran them and saw the green output, not
  that the diff looks like it should pass.

TDD WHERE APPROPRIATE:
- The implementation plan flags TDD tasks. Follow the failing-test-first →
  implement → green → commit loop. Don't skip the failing-test step.
- Invoke `superpowers:test-driven-development` for these tasks.

# SESSION SCOPE

Default: ONE task per session, or a small group of trivially-related tasks.
Stop at natural commit boundaries. Don't try to ship an entire PR in one
session unless it's tiny.

If you finish a task with cycles to spare and the next task is small +
independent, do it. If the next task is substantive, end the session.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run type-check && npm run lint` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what
   landed.
3. Update the execution status file:
   - What got done this session (commit hashes + task IDs)
   - Where the next session picks up (specific task ID + any setup needed)
   - Any blockers, surprises, or decisions made
   - Current branch + what's pushed vs. local
4. Commit the status file.
5. Tell me in 2-3 sentences what got done and what the next session picks
   up. End there.

# AUTO-LOADED MEMORY (already in your context, don't duplicate)

Your auto-loaded MEMORY.md references include:
- `feedback_multi_session_execution.md` (the rule-level memory for this pattern)
- `feedback_pr_bot_review_workflow.md`
- `feedback_bot_review_investigation.md`
- `feedback_pr_comment_surfaces.md`
- `feedback_per_round_test_db_verification.md`
- `feedback_data_safety_top_priority.md`
- `feedback_user_relearning.md`
- `feedback_workflows_not_sacred.md`
- `feedback_plain_language.md` (especially relevant when asking the user decision questions — see Session 3 / Gate C reinforcement)
- `feedback_opus_subagents.md` (use Opus when dispatching subagents via the Agent tool)
- `project_metadata_rebuild_initiative.md` (initiative pointer)
- `project_metadata_three_regimes.md` / `project_vocabulary_drift_scope.md` / `project_lesson_format_conflated.md` / `project_dedup_third_state.md` / `project_metadata_cleanup_candidates.md` / `project_crf_stamp_theater.md` / `project_teacher_zero_metadata_model.md` / `project_imported_non_esynyc_drops.md`
- Plus the SASL-flake / edge-function-deploy-verification / pre-delete-checklist hygiene notes

They apply throughout. Re-read them if a question comes up that they might cover.

# SESSION REMINDERS (re-read each session)

These three working patterns surfaced during the early sessions of this
initiative. They apply throughout the foundation phase:

1. **Use Supabase MCP tools and skills proactively, not only for the
   mandatory verification checkpoints.** This initiative is supabase-heavy.
   For any DB-touching investigation (corpus distribution audits, schema
   shape checks, drift-pattern queries, before-and-after metadata
   comparisons), `mcp__supabase-test__execute_sql` and
   `mcp__supabase-test__list_tables` are usually the right first move over
   reading SQL files or guessing from memory. PROD reads via
   `mcp__supabase-remote__execute_sql` are fine for read-only audits — be
   careful only when writing. Before any migration file work, invoke the
   `database-migrations` skill via the Skill tool (kickoff §HARD RULES says
   this is mandatory). The `supabase:supabase` and
   `supabase:supabase-postgres-best-practices` skills are also available —
   invoke them when their triggers fit (RLS work, edge functions, query
   tuning, etc.).

2. **When dispatching subagents via the Agent tool, use Opus.** Pass
   `model: "opus"` explicitly for substantive work — code review, codebase
   exploration / explanation, design analysis, multi-step research,
   subagent-driven development, plan execution. Agent definitions may
   default to Sonnet; override the model parameter. Mechanical lookups
   (single-file grep, exact-string find) can use defaults. When in doubt,
   Opus. See `feedback_opus_subagents.md`.

3. **Plain language when asking the user decision questions.** Lead with
   what the field/concept IS in the world, then layer the technical name on
   second pass. Don't stack project-internal shorthand ("vocab-locked,"
   "Stage-1-gated," "Path 3," phase numbers, walkthrough card IDs) without
   bridging to plain English. The user is making a real call from your
   framing — they shouldn't have to translate. This applies to decision
   questions specifically, not internal commits / status doc entries / agent
   prompts. See `feedback_plain_language.md` (reinforced 2026-05-03 Gate C
   session — first version of the three-question summary stacked too much
   internal vocab and had to be redone).

# EXECUTION STATUS FILE TEMPLATE (create on Session 1)

If `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md`
does not exist yet, create it using the existing scaffold at that path
(the `/kickoff-feature` skill seeded it).

# RIGHT NOW

Read this prompt → read design doc → read implementation plan from current
task → read status file → run baseline checks → tell me where you are and
what's next. Don't start coding until I confirm.

**For Sessions 1-3 (pre-PR-1):** the first three sessions execute Gates A
(lessonFormat dependency sweep verification), B (validator architecture
decision + Zod canonical scaffold), and C (per-prompt readiness audit).
None of these is a code-bearing PR — they produce inputs that PR 1 / PR 2
consume. Gate B's scaffold lands as Task 1.0 of PR 1.

<!-- ===== END OF KICKOFF BODY ===== -->
