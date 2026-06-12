# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) Execution Status

**Last updated:** 2026-06-12 by Session 3 (PR A execution, overnight autonomous)

## Current State

**Active PR:** none yet — PR A in progress on `feat/pr6a-stage2-retag-pipeline` (PR opens at A9).

**Session 3 progress (2026-06-12, overnight autonomous — user-authorized until 6:20am ET):** A1 ✅ `2503b01` (tsx ^4.22.4 pinned). A2 ✅ `091fb60` (check surface: `tsconfig.scripts.json` incl. `scripts/lib`, `type-check` chains `type-check:scripts`; ESLint ignore narrowed to `scripts/*` + `!scripts/stage2-retag/` — negation after `scripts/**` empirically does NOT re-include; gates proven to bite). Both adversarially verified + supervisor-verified. **Next: A3 (vocab TDD) → A4 (corpus export).** A4 note: no PROD service key on disk (`.env` points local) — export authenticates with PROD URL + publishable anon key, 765-record hard gate, STOP on mismatch. A8 risk: Console credits were exhausted Session 1 — probe with 1 lesson before the 15-lesson runs; if blocked, hold PR A unopened and switch to user-authorized fallback work (docs cleanup audit + simplification groundwork + frontend/UX notes + working-efficiency review, analysis-only artifacts off-branch) + draft the curriculum mini-worksheet.

**Sessions 1 + 2 (2026-06-11) — DESIGN LOCKED.** All 7 evidence items gathered + adversarially verified; all 13 OQs decided by the user in the Session-2 walkthrough (4 AskUserQuestion rounds). Design doc Status = **LOCKED**; per-OQ lock lines + Session-1 evidence section written in; foundation impl plan (line 11 + PR 6+ section) amended; decision journal D-S2 card appended; **implementation plan rewritten with concrete tasks** (PR A full detail; B medium; C/D/E outlines refined at cycle start; F rider). **Next session: execute PR A** — branch `feat/pr6a-stage2-retag-pipeline`, tasks A1-A9 (tsx pin → check surface → vocab module TDD → corpus export (765 records) → schema TDD → runner → validate/diff TDD → ≤20-lesson dry-run → ritual + PR). The headline locks: TS+Zod runner, monolithic, sync API, 12 fields now (cooking_skills + main_ingredients via team mini-worksheet → rider PR F), Protocol A+B eval with user gating everything, grades = source-doc claim only, 5-PR breakdown. Mini-worksheet for the team (cooking_skills + main_ingredients + guyanese-parent) should go OUT during PR A/B. Optional leftover: V3 cache-confirmation rerun (~$5.50) blocked on Console credit top-up — no decision depends on it.

**Headline Session-1 findings** (full detail in `docs/plans/pr6-stage2-retag-evidence/`):
- **Live corpus = 767 lessons, not ~751.** 788 total − 21 `import:*` retirements; ~751 reproduces only on TEST (772/751 today). Definitional locked decision unaffected; resize plan text + cost projections to 767.
- **OQ2 (E1):** smaller fields split in tiers — 5 nearly-clean fields (academic subjects, SEL, core competencies, cooking methods, observances; ~90%+ canonical, only kebab twins + 3 single-value judgment calls) lockable in the walkthrough without worksheets; garden_skills needs a ~9-entry fold list; **cooking_skills (122 distinct, 93% of tagged rows off-vocab) + main_ingredients (230 distinct, 81% off-vocab, abstraction-level mix) genuinely need worksheets.** All 8 fields: uniform camelCase JSONB key + text[] column dual representation (apply must dual-write); kebab drift is submission-era (88/105 rows) not corpus-wide (7/662).
- **OQ5 (E2):** content_text READY — 100% coverage, no truncation/corruption, 5/5 random Google-Doc comparison fresh. 3 bad rows: exclude ghost stubs `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` + `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`; re-extract or hand-tag `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` (Who's Who in the Food System).
- **OQ6 (E4):** v3 flagged **zero** of 831 lessons for review → "v3-flagged" sampling bucket is EMPTY, not just biased; v3 confidence highest exactly where wrong. Citable confidently-wrong gallery built (soap lesson with cooking tags, 64 grade-smeared lessons at ≥90 conf, 82 incoherent Stovetop+"Basic prep only" pairs). Protocol rec: pre-run ~60-lesson answer key (~40 random + ~20 adversarial, curriculum-team labels with agent pre-fill) + post-run 3-bucket diff audit; "beats v3" = per-field F1 ≥ v3 everywhere + macroF1 ≥ 0.7 + per-value recall ≥ 0.5. Prerequisite user decision: grade-level ground-truth policy (source-doc claim vs age-appropriateness).
- **OQ4 (E5):** Batch retention ≤29 days confirmed, not ZDR-eligible, BUT batches deletable on demand post-download (effective window → hours); sync is ALSO retained up to 30 days under standard commercial terms, so the retention delta is artifact-shape, not duration. 50% discount confirmed, stacks with caching (best-effort 30-98% in batch). 767 lessons fit one batch. Acceptability = user verdict at walkthrough.
- **OQ1/OQ3/OQ12 (E6):** "mirror, don't extend" HOLDS; both call sites unchanged since exploration; per-field AND monolithic both expressible in the canonical shape → OQ3 is purely token economics. Gotchas: edge enums come from `_shared/metadataSchemas.ts` (not enums.json); tsx unpinned; scripts/ has no tsc/eslint gate (OQ12 lift confirmed needed); Opus 4.x 4096-token cache minimum can silently nullify caching of small per-field prompts.
- Verifier corrections to carry: cookingSkills configured list = 27 options (not 28), mainIngredients = 44 (not 45) — no downstream effect on drift percentages; E4's "validator fabricated tags at scale" softened to "fabrication designed in MetadataO4Mini variant; generation-level non-enforcement proven"; E2's "772 unexplained" → it's today's TEST count.
- Operational: the exploration doc has non-UTF8 bytes — `grep` sees it as binary and silently returns nothing; use `grep -a`.

**Branch:** `feat/pr6a-stage2-retag-pipeline` (off main at `d693e19`; main itself is 5 docs-only commits ahead of origin — user aware, push not yet authorized)

**Last commit on branch:** `091fb60` — feat(stage2-retag): dedicated type-check + lint surface for the runner (OQ12)

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

- 2026-06-12 (Session 3, supervisor, overnight) — **OQ2 observances count corrected 17 → 16, PENDING USER RATIFICATION.** The A3 executor proved the lock's "17 after End-of-year merge" unsatisfiable: `filterDefinitions.ts` has exactly 17 observances options INCLUDING both `End of year` and `End of year celebrations`; merging the pair yields 16; no 17th value exists anywhere on disk. "17" was the pre-merge census headline propagated into the lock text. Resolution: **16 canonical values; surviving spelling `End of year celebrations`** (stored usage 15 lessons vs 1); `Earth Month` Title-Case canonical (absorbs stored case-twin `Earth month`). Design doc deliberately NOT edited overnight — user ratifies first; if overridden it's a one-line vocab change + test rerun, and the full run is user-gated regardless. Also accepted (evidence-backed spec carve-outs, not design changes): `academic_concepts` is JSONB-only — no `lessons` text[] column exists — so the vocab mapping carries an explicit `column: null` exception (other 11 fields map 1:1); garden_skills canonical form = Title-Case labels (22 configured incl. `Crop rotation` + the 2 walkthrough adds); cooking_methods canonical form = kebab (`basic-prep`/`stovetop`/`oven`, the stored convention; UI labels update in PR E).
- 2026-06-11 — **OQ5 LOCKED from evidence** (tagged evidence-lockable): `lessons.content_text` is the re-tag body source as-is. Rationale: 100% live coverage, no truncation/corruption, 5/5 seeded-random Google-Doc comparison fresh. Handling in export step: exclude 2 ghost stubs, re-extract/hand-tag Who's Who in the Food System, strip VT + normalize CR (verbatim IDs in design doc + oq5 artifact).
- 2026-06-11 — **Session-2 walkthrough: ALL remaining OQs locked by the user.** OQ1 TS+Zod runner (lock reopened-and-changed; foundation plan + decision journal amended) · OQ2 hybrid 12-field main pass + small-field vocab locks (Food Justice→Social Justice, no-cook→basic-prep, End-of-year merge, garden_skills 24 = +Stewardship tasks +Sensory exploration, crop rotation kept) · OQ3 monolithic · OQ4 sync, Batch dropped, **retention accepted by user** · OQ6 Protocol A+B, **grades = always source-doc claim (silent docs gradeless)**, model picked empirically Opus-vs-Sonnet · OQ7 staging + emitter migration + `pr6_retag_rollback` + dual-write · OQ8 **user gates everything** (answer key = agent pre-fill + user verify; team gets only the mini-worksheet) · OQ9 post-run adjudication of all 74 register signals · OQ10 synonyms from the same call · OQ11 embeddings ride apply PR · OQ12 full check-surface lift + tsx pin · OQ13 five PRs A-E + rider F · observances field closes to fixed list. Full rationale per lock in design doc §4.

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

### Session 2 — 2026-06-11 — mechanism re-decision walkthrough — COMPLETE (same session as Session 1)

- **Format:** 4 AskUserQuestion rounds (mechanism cluster → field scope + vocab judgment calls → garden-skills list → eval/process cluster → mechanics/PR-shape), plain-language briefings before each; user decided every `[user-verdict]` question explicitly. Sessions 1+2 compressed into one calendar day as the kickoff anticipated.
- **Outcome:** all 13 OQs locked (see "Decisions made during execution"); design doc Status flipped to LOCKED; §3/§5/§6 rewritten as decided; foundation impl plan line 11 + PR 6+ section amended; decision journal gained the D-S2 addendum card; implementation plan rewritten with concrete tasks (A full, B medium, C/D/E outline + cycle-start refinement, F rider).
- **Notable user divergences from recommendations:** no-cook folded into basic-prep (rec was keep); grades = ALWAYS source-doc claim (rec was claim-else-judge); user gates everything (rec was team-gated spot-check); garden-skills folded user-side rather than via team. All recorded with rationale in design §4.
- **Process learnings:** AskUserQuestion rounds with recommendation-first options moved 13 locks through in one sitting; the evidence-section-in-design-doc pattern meant zero re-derivation during the walkthrough.
- **Commits:** session-end commit (design lock + foundation amendments + decision journal + impl plan + this entry + memory updates).
