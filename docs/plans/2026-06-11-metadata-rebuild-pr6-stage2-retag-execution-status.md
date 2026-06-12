# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) Execution Status

**Last updated:** 2026-06-11 by Session 1 (evidence gathering, in progress)

## Current State

**Active PR:** none — not yet branched (design-lock mode; no pipeline code until design doc flips to Locked).

**Current task:** **Session 1 COMPLETE — all 7 evidence items done + verified.** E1/E2/E4/E5/E6 via workflow `wf_a3162cd5-7a3` (5 gather + 5 adversarial-verify agents); E3 via background executor (dry-run, $3.58 actual spend, raw JSONL supervisor-verified); E7 supervisor-run (claude 2.1.174 — `--max-turns` GONE from --help, rest of flag surface intact). Design doc now carries a "Session 1 evidence (2026-06-11)" section under the OQ list; **OQ5 LOCKED from evidence** (content_text is the body source; 3-row handling + VT/CR normalization in export). **Next: Session 2 mechanism re-decision walkthrough** (user = decision authority, plain language; supervisor has read the exploration doc end-to-end; all OQ evidence is in the design doc + `docs/plans/pr6-stage2-retag-evidence/`). After the walkthrough: lock remaining OQs, flip design Status to Locked, author impl-plan tasks.

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
- 2026-06-11 — E3 token-economics dry-run (OQ3): 15 lessons, claude-opus-4-7, $3.58 actual. V1 monolithic + V2 per-field complete; V3 shared-prefix 5/153 calls (Console credits exhausted) but the 5 calls answered the headline cache question. Supervisor verified raw JSONL reproduces every claimed number. Artifact: `oq3-token-economics-dryrun.md`; harness + raw data relocated to `/Users/danfeder/cCode/pr6-dryrun-tmp/` (outside the repo — ESLint doesn't ignore `.tmp/**` and the harness `.ts` files broke the lint baseline; rerun instructions in artifact postscript).
- 2026-06-11 — E7 `claude -p` flag re-verify (supervisor-run, claude 2.1.174): flag surface intact EXCEPT `--max-turns` gone from `--help`.

## In flight

(none — Session 1 complete; Session 2 walkthrough is next)

## Blocked

(none)

## Decisions made during execution

- 2026-06-11 — **OQ5 LOCKED from evidence** (tagged evidence-lockable): `lessons.content_text` is the re-tag body source as-is. Rationale: 100% live coverage, no truncation/corruption, 5/5 seeded-random Google-Doc comparison fresh. Handling in export step: exclude 2 ghost stubs, re-extract/hand-tag Who's Who in the Food System, strip VT + normalize CR (verbatim IDs in design doc + oq5 artifact).

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

### Session 1 — 2026-06-11 — evidence gathering (design-lock mode) — COMPLETE

- **Execution shape:** workflow `wf_a3162cd5-7a3` ran E1/E2/E4/E5/E6 as 5 parallel gather agents each followed by an adversarial verifier (10 agents, ~21 min); E3 ran as a single background executor (~30 min, $3.58 API spend); E7 run supervisor-side (one CLI probe). Supervisor independently reproduced load-bearing PROD numbers (767/21/788, 122, 230, 0, 3) before accepting.
- **Headline findings:** live corpus 767 not ~751 (~751 is today's TEST count); OQ3 decisively favors monolithic ($23.76 vs $220.60 Opus sync over 767 lessons — per-field prefixes sit under Opus's 4096-token cache minimum and cannot cache); v3-flagged sampling bucket is EMPTY (0 flags/831, confidence anti-correlated with quality); content_text ready (OQ5 locked); batch-vs-sync retention delta is shape-not-duration (both ≤~30 days; batches deletable on demand); `--max-turns` gone from claude CLI.
- **Doc state:** design doc gains "Session 1 evidence" section; OQ5 locked; Status stays Draft pending the Session 2 walkthrough (OQ1-OQ4, OQ6-OQ13).
- **Commits:** `30d2afa` (5/7 evidence + status checkpoint), session-end commit (design-doc evidence section + OQ5 lock + this entry).
- **Process learnings:** (1) fan-out + per-item adversarial verify caught real errors (27-vs-28 option count, an attribution overstatement in E4, E2's wrong 772-origin story) — pattern worth keeping; (2) exploration doc has non-UTF8 bytes → `grep -a` required, plain grep silently empty; (3) `.env.local` `ANTHROPIC_API_KEY` is the proxy-side key (401s on direct API) — direct scripts use `ANTHROPIC_CONSOLE_API_KEY`; (4) verifiers flagged that V3's tool_choice-doesn't-invalidate-cache finding EXCEEDS documented behavior — rerun before relying on it.
- **User-side follow-ups:** Anthropic Console credits exhausted mid-V3 — top-up needed before the ~$5.50 V3 rerun (optional; OQ3 answer already clear) and before any future dry-runs. Main remains 3 commits ahead of origin (docs-only, push not yet authorized).
