# C02 — cooking_skills / main_ingredients vocab re-tag — DISCUSSION kickoff

**Type:** *Scoping / brainstorming conversation* — NOT a build session. Goal: talk through the approach in depth
with the user and reach decisions, THEN (only when decisions are settled) scaffold the real work via `/kickoff-feature`.
**Do NOT write code, migrations, or run the re-tag harness in this session.** Plan first.

---

## Session-start ritual (do FIRST)

1. Read this whole file.
2. Read memory: `project_deferred_work_campaign` (Wave 4 just closed; C02 is the "next-up" item) and
   `project_metadata_rebuild_initiative` (its "Deferred follow-ups" section defines C02 as the rebuild's deferred **"PR F"**).
   Also relevant: `project_vocabulary_drift_scope`, `project_stage2_mechanism_exploration`, `project_metadata_three_regimes`.
3. Read the decided vocabulary worksheet: `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`.
4. Read the Wave-4 design **carry-forward** for C02: `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md` §3.1 + §4 Q11–14a + §8
   (this is where the "C02 = content re-tag, do it in its own stage2-retag session" verdict + the open sub-questions live).
5. Skim the harness: `scripts/stage2-retag/` (the existing export→normalize→run-retag→validate→diff→apply pipeline; has
   Opus-4.8 / Fable dry-run artifacts + answer-key scoring; the user believes the dry-run was already "shippable").
6. **Re-query live counts (they drift):** on PROD (read-only `mcp__supabase-remote__execute_sql`), the distinct-value counts
   for `cooking_skills` and `main_ingredients` among `retired_at IS NULL` rows. As of 2026-06-22: **cooking_skills = 122 distinct
   across 435 lessons; main_ingredients = 230 distinct across 430 lessons** (vs the rebuilt cultural_heritage = 70). Re-confirm.
7. Tell the user where things stand and start the discussion. Don't propose a build plan until the decisions below are made.

## What C02 is (plain terms)

Two lesson-metadata fields — **cooking skills** and **main ingredients** — still have sprawling, inconsistent vocabularies
(~122 written-out forms for ~30 real cooking skills; ~230 for ~58 ingredient concepts). Every other metadata field was
canonicalized in the metadata rebuild (finished 2026-06-19); these two were the biggest/messiest and were **deliberately
deferred** as the rebuild's "PR F." C02 is that second pass: clean these two fields across the ~700 lessons.

## The core decision to work through: WHICH cleanup method, per field

Two fundamentally different mechanisms (explain the tradeoffs to the user in plain language; user is re-learning the pipeline):

- **Method 1 — rules-based migration ("5a/5b" style):** a smart find-and-replace in the DB. Write a mapping (messy value →
  canonical value), apply via a migration. Cheap, fast, deterministic, reversible. BUT it only *re-labels existing tags* — it
  can't add a skill a lesson teaches but wasn't tagged with, or drop a wrong one, because it never reads the lesson.
- **Method 2 — LLM content re-tag (`scripts/stage2-retag/` harness):** an AI re-reads each lesson's content and assigns the
  correct canonical skills/ingredients from scratch. Fixes wrong/missing tags, not just spelling. Slower, costs real money
  (the rebuild's full re-tag run was ~$121 over ~753 lessons), needs validation/answer-key scoring.

**The tension to resolve:** the rebuild's closing notes said "use the 5a/5b template" (assumes old tags are fine, just messy).
The Wave-4 design's closer look said the worksheet treats vague cooking tags as things to be *replaced by real skills found by
re-reading* — i.e. content judgment → Method 2. Likely answer is a **split:** `main_ingredients` is concrete ("tomatoes",
"basil") and may be mostly Method 1; `cooking_skills` is vaguer and probably needs Method 2. **Decide this per field.**

## Agenda — decisions to reach before scaffolding

1. **Method per field** (Method 1 / Method 2 / hybrid) — see above.
2. **How locked is the worksheet vocabulary?** Is the "decided" canonical set final, or do we expect to discover new
   terms during the re-tag (the worksheet hints "open to adding further as the re-tag reveals true counts")?
3. **Re-pollution prevention (in scope here or separate?):** reviewers can currently type free-form values (no enforcement) —
   so cleanup can re-pollute. Options: tighten reviewer dropdowns to the canonical set / add a Zod enum / add a DB CHECK. The
   Wave-4 design said this travels WITH the C02 session. Decide how far to go.
4. **Scope boundary:** just these 2 fields? Is the `cooking_skills`/`main_ingredients` two-level "specific-food tier" (per the
   worksheet) part of this, or a later pass? Embeddings regen (rebuild's "C2.4") is explicitly separate — confirm it stays out.
5. **Data-safety plan:** same posture as Wave 4 — 3-tier (local → TEST → PROD-with-approval), snapshot-before-mutate,
   reversible-first, TEST-verify then PROD-verify. (If Method 2, the apply step is still a migration over reviewed output.)
6. **Cost / effort / who reviews the AI output** (answer-key scoring, curriculum-team validation of the canonical set).

## Where everything lives

- Worksheet (decided vocab): `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- Harness: `scripts/stage2-retag/` (dry-run artifacts + answer-key scoring)
- Wave-4 carry-forward: `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md` §3.1 / §4 Q11–14a / §8
- Rebuild "PR F" definition: memory `project_metadata_rebuild_initiative` → "Deferred follow-ups"
- Canonical reasoning from the rebuild: `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`;
  PR-6 stage-2 status `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md`
- DB fields are `text[]` columns (`cooking_skills`, `main_ingredients`) mirrored in `metadata` JSONB; both feed `search_vector`
  (surface-sync is a near-non-issue per Wave-4 lock — column is canonical).

## Mode / working preferences

- **Plain language, no jargon** (the user is re-learning the pipeline; explain *why* + tradeoffs, not just *what*).
- Curriculum-team-facing vocabulary stays plain (concepts + curriculum fit, not DB/internal jargon).
- This is a **conversation first.** When decisions are settled, scaffold with `/kickoff-feature` (multi-session pattern) — the
  build then runs as supervisor + fresh-context executors with the same gate discipline used in Waves 1–4.

## Where the overall project stands (so you don't lose the thread)

Deferred-work campaign **Waves 1–4 all SHIPPED + PROD-verified**. Wave 4 (data/corpus) closed 2026-06-22: PR1 #538 (C12+C83) ·
PR2 #539 (C11 hard-delete + C49) · PR3 #540 (C88 dev-seed) · docs close #541. **C02 is the next piece of work** (its own session,
this discussion). After C02: deferred majors #460 eslint-10 / #451 TS-6.0, then roadmap Wave 5 (reviewer/admin). Master tracker:
`docs/plans/2026-06-21-deferred-campaign-status.md`; roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md`.
