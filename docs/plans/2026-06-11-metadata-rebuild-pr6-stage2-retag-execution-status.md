# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) Execution Status

**Last updated:** 2026-06-11 by Session 1 (evidence gathering, in progress)

## Current State

**Active PR:** none — not yet branched (design-lock mode; no pipeline code until design doc flips to Locked).

**Current task:** Session 1 evidence gathering — **5 of 7 items DONE**, adversarially verified (workflow `wf_a3162cd5-7a3`, 5 gather + 5 verify agents) AND supervisor-spot-checked (PROD probe reproduced live=767/retired=21/total=788, cooking_skills=122 distinct, main_ingredients=230 distinct, 0 empty bodies, 3 sub-500-char rows). **E3 (token-economics dry-run, OQ3) dispatched to a background executor** — verify its report + artifact on return. E7 (`claude -p` flag re-verify) deferred pending OQ9. Then: annotate design-doc OQs with evidence pointers → Session 2 mechanism walkthrough (user = decision authority; supervisor has read the exploration doc end-to-end).

**Headline Session-1 findings** (full detail in `docs/plans/pr6-stage2-retag-evidence/`):
- **Live corpus = 767 lessons, not ~751.** 788 total − 21 `import:*` retirements; ~751 reproduces only on TEST (772/751 today). Definitional locked decision unaffected; resize plan text + cost projections to 767.
- **OQ2 (E1):** smaller fields split in tiers — 5 nearly-clean fields (academic subjects, SEL, core competencies, cooking methods, observances; ~90%+ canonical, only kebab twins + 3 single-value judgment calls) lockable in the walkthrough without worksheets; garden_skills needs a ~9-entry fold list; **cooking_skills (122 distinct, 93% of tagged rows off-vocab) + main_ingredients (230 distinct, 81% off-vocab, abstraction-level mix) genuinely need worksheets.** All 8 fields: uniform camelCase JSONB key + text[] column dual representation (apply must dual-write); kebab drift is submission-era (88/105 rows) not corpus-wide (7/662).
- **OQ5 (E2):** content_text READY — 100% coverage, no truncation/corruption, 5/5 random Google-Doc comparison fresh. 3 bad rows: exclude ghost stubs `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` + `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`; re-extract or hand-tag `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` (Who's Who in the Food System).
- **OQ6 (E4):** v3 flagged **zero** of 831 lessons for review → "v3-flagged" sampling bucket is EMPTY, not just biased; v3 confidence highest exactly where wrong. Citable confidently-wrong gallery built (soap lesson with cooking tags, 64 grade-smeared lessons at ≥90 conf, 82 incoherent Stovetop+"Basic prep only" pairs). Protocol rec: pre-run ~60-lesson answer key (~40 random + ~20 adversarial, curriculum-team labels with agent pre-fill) + post-run 3-bucket diff audit; "beats v3" = per-field F1 ≥ v3 everywhere + macroF1 ≥ 0.7 + per-value recall ≥ 0.5. Prerequisite user decision: grade-level ground-truth policy (source-doc claim vs age-appropriateness).
- **OQ4 (E5):** Batch retention ≤29 days confirmed, not ZDR-eligible, BUT batches deletable on demand post-download (effective window → hours); sync is ALSO retained up to 30 days under standard commercial terms, so the retention delta is artifact-shape, not duration. 50% discount confirmed, stacks with caching (best-effort 30-98% in batch). 767 lessons fit one batch. Acceptability = user verdict at walkthrough.
- **OQ1/OQ3/OQ12 (E6):** "mirror, don't extend" HOLDS; both call sites unchanged since exploration; per-field AND monolithic both expressible in the canonical shape → OQ3 is purely token economics. Gotchas: edge enums come from `_shared/metadataSchemas.ts` (not enums.json); tsx unpinned; scripts/ has no tsc/eslint gate (OQ12 lift confirmed needed); Opus 4.x 4096-token cache minimum can silently nullify caching of small per-field prompts.
- Verifier corrections to carry: cookingSkills configured list = 27 options (not 28), mainIngredients = 44 (not 45) — no downstream effect on drift percentages; E4's "validator fabricated tags at scale" softened to "fabrication designed in MetadataO4Mini variant; generation-level non-enforcement proven"; E2's "772 unexplained" → it's today's TEST count.
- Operational: the exploration doc has non-UTF8 bytes — `grep` sees it as binary and silently returns nothing; use `grep -a`.

**Branch:** main (not yet branched)

**Last commit on main:** `e5cc8ec` — docs(pr6-stage2-retag): supervisor+subagent execution model (main is ahead of origin/main by 2 unpushed scaffolding commits — user aware, push not yet authorized)

**Pre-next-PR verification (if any):** none yet. Inherited substrate state: PROD concepts census 675 / 119 / 1923 zero non-canonical; `pr5a_heritage_rollback` (37) + `pr5b_concepts_rollback` (676) live until this track's cleanup PR.

## Recent decisions worth carrying forward

- 2026-06-11 (scaffolding): **field scope (OQ2) deferred to the Session 2 walkthrough** by user choice, with a Session 1 PROD census of the ~8 smaller vocab fields as the evidence input.
- 2026-06-11 (scaffolding): track scaffolded in design-lock mode — the mechanism lock reopening is the walkthrough's first question (OQ1), per the exploration doc; nothing pre-decided.
- 2026-06-11 (scaffolding, post-review): **execution model = supervisor + fresh-context subagents** (user directive, generalized from the PR 5 kickoff into the templates + this track's kickoff). Session boundary = supervisor context budget, not task count; status header checkpointed after each verified task; OQ1-OQ13 tagged `[user-verdict]` vs `[evidence-lockable]` — verdict questions are never locked without the user.

## Done

- 2026-06-11 — Session 1 evidence items E1 (OQ2 smaller-fields PROD census), E2 (OQ5 content_text audit), E4 (OQ6 v3 baseline + eval protocol sketches), E5 (OQ4 Batch retention fact-check), E6 (call-shape confirmation). All adversarially verified (4× confirmed-with-caveats, 1× confirmed, zero refutations) + supervisor-spot-checked via independent PROD probe. Artifacts: `docs/plans/pr6-stage2-retag-evidence/oq{1,2,4,5,6}-*.md`.

## In flight

- E3 — token-economics dry-run (OQ3): background executor dispatched 2026-06-11; 3 variants (monolithic / per-field canonical / per-field shared-prefix), ≤20 lessons, sync-only, ≤$40 target spend, projections sized to 767 lessons. Artifact lands at `docs/plans/pr6-stage2-retag-evidence/oq3-token-economics-dryrun.md`.

## Blocked

(none)

## Decisions made during execution

(none yet)

## Out-of-scope follow-ups captured here

- `guyanese` parent (`latin-american`) — hand to curriculum team at the OQ8 touchpoint, before the filter-UI track surfaces the hierarchy (inherited from PR 5 follow-ups).
- Seed Bursts near-duplicate pair (`1HuffJuy…` + `1NqjpqXV…`) — dedup track (inherited from PR 5 follow-ups; not this track's to fix).

## Pointers to durable context

- Kickoff prompt: 2026-06-11-metadata-rebuild-pr6-stage2-retag-kickoff.md
- Design doc: 2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md (Draft until design lock; OQ1-OQ13)
- Implementation plan: 2026-06-11-metadata-rebuild-pr6-stage2-retag-implementation.md (SKELETON; its Session 1-2 work list is the current plan)
- Mechanism exploration (mandatory pre-walkthrough read): 2026-05-13-stage2-retag-mechanism-exploration.md
- Parent initiative status: 2026-05-03-metadata-rebuild-foundation-execution-status.md
- Vocab inputs: 2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md (§16) + 2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md
- PR 5 follow-ups inherited: 2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md ("Out-of-scope follow-ups" section)
- Archive: 2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status-archive.md (created when needed)

## Session log

<!-- New session entries land here. When a PR ships and the next PR
     begins, prior PR's entries move to the archive file. -->

(empty — Session 1 not yet started; scaffolding committed 2026-06-11)
