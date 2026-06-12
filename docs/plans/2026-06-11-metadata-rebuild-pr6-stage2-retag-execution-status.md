# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) Execution Status

**Last updated:** 2026-06-12 ~14:30 ET by Session 5 (PR-B cycle start)

## Current State

**PR A (#507) — MERGED 2026-06-12 16:55 UTC as `f982d1a`** (bot round 1: zero accepted findings; Security Audit red = pre-existing main breakage, not PR-introduced; full triage in Session-5 archive entry).

**PR-B CYCLE ACTIVE (started 2026-06-12).** Branch `feat/pr6b-stage2-retag-run` off main at `f982d1a` (= PR A #507 merge; bot round 1 closed with zero accepted findings — triage detail in the archive). Carries local docs commit `de26881`. **Done this cycle:** impl-plan B-section refined (B0-B7, `f3451d8`); **B0 ✅ `7efcf50`** (cache-floor `level:'unknown'` + preflight --help; toolChoice symmetry VERIFIED ALREADY CLOSED in PR A via shared buildMessageRequest — deferral was stale; repair-prompt review: fabrications prompt-immune, rules already present — effective fix is code-side; 286 tests). **B1 ✅ `fb6ab84`** (sampler seed 20260612, 40 stratified + 20 adversarial, worksheet 2,034 lines + parse round-trip, 318 tests; determinism re-verified byte-identical; dry-run-notes L-numberings differ r1-vs-r3 — adversarial IDs anchored to verbatim citations, never L-numbers). **B2 pre-fill ✅ (2026-06-12):** 6 parallel Fable agents drafted all 60 lessons from BODIES ONLY (current PROD tags excluded from context — v3 is a scored contestant); supervisor independently validated all 60 records (JSON, exact ID coverage, keyset = 13 worksheet anchors, ZERO vocab violations — heritage uniformly label-form); drafts merged into the worksheet DRAFT column (780/780 cells); parser round-trip smoke: 60 records, DRAFT-fallback works. Evidence + agent notes at `artifacts/prefill/evidence-notes.md`; full structured drafts (concepts everyday-vocab + synonym pairs — NOT carried by the worksheet cell, scoring joins from draft JSONL) at `artifacts/prefill/draft-{1..6}.jsonl`. **CURRENT GATE: USER verifies the worksheet (OQ8).** Cross-batch rulings the user should set while verifying: (1) CRF stamp policy (3 tiers seen: bracketed-template→empty · unbracketed all-7 stamp→transcribed+flagged · genuine prose→mapped); (2) heritage vocab gaps (Muslim/Eid lessons left EMPTY; Wild Soda raw-tag row); (3) concepts vocab gaps (fossil-fuels/energy, health topics); (4) grade-claim boundary (CCSS citations? adaptation-section claims? variation matrices counted); (5) **R4 verdict is PER-LESSON, not one direction** (Cajun 3-5: drop Math+Arts concepts · Cajun 6-8: ADD Science integration AND drop Math+Arts) — normalize.ts blanket add-integration is wrong at least sometimes; B3 quantifies. Contestants for B3 scoring: **claude-fable-5 primary (`--tool-choice-auto`) + claude-opus-4-7 challenger** (4-8 + sonnet dropped; DEFAULT_MODEL = 4-7), both via the CLIProxyAPI proxy at `http://127.0.0.1:8317/api/provider/anthropic` — **proxy v7.1.68 must be RUNNING** (`~/.local/bin/cli-proxy-api -config ~/.cli-proxy-api/config.yaml`; pull-latest before runs; mid-run 400 → pull latest → `--resume`). Measured full-run projections: fable ~$129 · o47 ~$47-79 w/repairs (Max credits via proxy). **B4 full run = USER GREEN-LIGHT, gated on the B3 scorecard.** No DB writes anywhere in PR B.

**PR-B deferred findings to fold into B-tasks:** R4 reconcile-direction conflict (prompt says drop-concept, code adds-integration — answer key adjudicates) · ~~repair-pass toolChoice gate asymmetry~~ (B0: already closed in PR A) · ~~fable cache-floor labeling~~ + ~~preflight --help~~ (B0 `7efcf50`) · NEW: garden_skills code-side rule candidate (empty when activity_type lacks `garden`, or anchor repair with chosen activity_type — B0 diagnosis; decide at B3 alongside academic-strip recheck routing) · `strict:true` optional hardening (API rejected uniqueItems) · o47 garden_skills fabrications concentrated in REPAIR records (review repair prompting) · **L14 heritage ban fails ALL FOUR models** (answer-key adversarial item; possible code-side rule) · academic-strip can amplify when `academic` was correct (consider recheck routing) · even fable fabricated one season on a [Table] body (L10 — answer-key check on [Table] bodies).

**Operational notes:** exploration doc has non-UTF8 bytes (`grep -a` required) · `.env.local` `ANTHROPIC_API_KEY` = proxy-side key (direct API uses `ANTHROPIC_CONSOLE_API_KEY`) · corpus snapshot `artifacts/corpus.jsonl` is gitignored + Who's-Who sidecar requires authenticated re-fetch · answer-key inputs: ~40 stratified-random + ~20 adversarial from `oq6-v3-baseline-and-eval-protocols.md` failure gallery; grades = source-doc claim only; "beats v3" = per-field F1 ≥ v3 everywhere AND macroF1 ≥ 0.7 AND per-value recall ≥ 0.5; eval reuses `scripts/lib/evalMetrics`.

**Pre-next-PR verification (if any):** none pending. Inherited substrate: PROD concepts census 675 / 119 / 1923 zero non-canonical; `pr5a_heritage_rollback` (37) + `pr5b_concepts_rollback` (676) live until PR E.

## Recent decisions worth carrying forward

- 2026-06-11 (scaffolding): **field scope (OQ2) deferred to the Session 2 walkthrough** by user choice, with a Session 1 PROD census of the ~8 smaller vocab fields as the evidence input.
- 2026-06-11 (scaffolding): track scaffolded in design-lock mode — the mechanism lock reopening is the walkthrough's first question (OQ1), per the exploration doc; nothing pre-decided.
- 2026-06-11 (scaffolding, post-review): **execution model = supervisor + fresh-context subagents** (user directive, generalized from the PR 5 kickoff into the templates + this track's kickoff). Session boundary = supervisor context budget, not task count; status header checkpointed after each verified task; OQ1-OQ13 tagged `[user-verdict]` vs `[evidence-lockable]` — verdict questions are never locked without the user.

## Done

- 2026-06-11 — Session 1 evidence items E1 (OQ2 smaller-fields PROD census), E2 (OQ5 content_text audit), E4 (OQ6 v3 baseline + eval protocol sketches), E5 (OQ4 Batch retention fact-check), E6 (call-shape confirmation). All adversarially verified (4× confirmed-with-caveats, 1× confirmed, zero refutations) + supervisor-spot-checked via independent PROD probe. Artifacts: `docs/plans/pr6-stage2-retag-evidence/oq{1,2,4,5,6}-*.md`.
- 2026-06-11 — E3 token-economics dry-run (OQ3): 15 lessons, claude-opus-4-7, $3.58 actual. V1 monolithic + V2 per-field complete; V3 shared-prefix 5/153 calls (Console credits exhausted) but the 5 calls answered the headline cache question. Supervisor verified raw JSONL reproduces every claimed number. Artifact: `oq3-token-economics-dryrun.md`; harness + raw data relocated to `/Users/danfeder/cCode/pr6-dryrun-tmp/` (outside the repo — ESLint doesn't ignore `.tmp/**` and the harness `.ts` files broke the lint baseline; rerun instructions in artifact postscript).
- 2026-06-11 — E7 `claude -p` flag re-verify (supervisor-run, claude 2.1.174): flag surface intact EXCEPT `--max-turns` gone from `--help`.

## In flight

(PR-B cycle start: impl-plan B refinement + B1)

## Blocked

(none)

## Decisions made during execution

- 2026-06-12 (Session 4, interactive) — **cooking_skills + main_ingredients vocab DECIDED by user walkthrough; curriculum team SKIPPED entirely (user call); two-rounds confirmed (PR F stays separate, now unblocked).** Headline divergences from the overnight draft: ONE general **Knife skills** entry absorbing the five specific cuts AND knife safety (user: "specifics can get too messy"); Kitchen & food safety separate (oven/food safety/washing); ingredients = two levels (C), 24 groups, NO "Other vegetables" — distributed instead (squash group renamed **Squash, cucumbers & melons** absorbing Cucumbers + Melons; **Mushrooms** own group; green beans/snow peas → Beans & legumes; Celery/Fennel group-less specifics); Potatoes → Root vegetables (not Grains & starches); Avocado under Tropical fruits; all nine near-miss specifics pulled up (34 starter specifics); pantry-staples featured-only rule. **`guyanese` verdict: Both** — hierarchy parent stays `latin-american`, re-tag prompt rule dual-tags `caribbean` (vocab json is single-parent; multi-parent deferred to filter-UI track). Full record: `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`. Probe note: all 88 "Following directions" uses are on cooking lessons (66 cooking + 22 cooking/garden).
- 2026-06-12 (Session 3, supervisor, overnight; **RATIFIED by user 2026-06-12 ~10:05 ET** — design doc + impl plan lock lines amended) — **OQ2 observances count corrected 17 → 16.** The A3 executor proved the lock's "17 after End-of-year merge" unsatisfiable: `filterDefinitions.ts` has exactly 17 observances options INCLUDING both `End of year` and `End of year celebrations`; merging the pair yields 16; no 17th value exists anywhere on disk. "17" was the pre-merge census headline propagated into the lock text. Resolution: **16 canonical values; surviving spelling `End of year celebrations`** (stored usage 15 lessons vs 1); `Earth Month` Title-Case canonical (absorbs stored case-twin `Earth month`). Design doc deliberately NOT edited overnight — user ratifies first; if overridden it's a one-line vocab change + test rerun, and the full run is user-gated regardless. Also accepted (evidence-backed spec carve-outs, not design changes): `academic_concepts` is JSONB-only — no `lessons` text[] column exists — so the vocab mapping carries an explicit `column: null` exception (other 11 fields map 1:1); garden_skills canonical form = Title-Case labels (22 configured incl. `Crop rotation` + the 2 walkthrough adds); cooking_methods canonical form = kebab (`basic-prep`/`stovetop`/`oven`, the stored convention; UI labels update in PR E).
- 2026-06-11 — **OQ5 LOCKED from evidence** (tagged evidence-lockable): `lessons.content_text` is the re-tag body source as-is. Rationale: 100% live coverage, no truncation/corruption, 5/5 seeded-random Google-Doc comparison fresh. Handling in export step: exclude 2 ghost stubs, re-extract/hand-tag Who's Who in the Food System, strip VT + normalize CR (verbatim IDs in design doc + oq5 artifact).
- 2026-06-11 — **Session-2 walkthrough: ALL remaining OQs locked by the user.** OQ1 TS+Zod runner (lock reopened-and-changed; foundation plan + decision journal amended) · OQ2 hybrid 12-field main pass + small-field vocab locks (Food Justice→Social Justice, no-cook→basic-prep, End-of-year merge, garden_skills 24 = +Stewardship tasks +Sensory exploration, crop rotation kept) · OQ3 monolithic · OQ4 sync, Batch dropped, **retention accepted by user** · OQ6 Protocol A+B, **grades = always source-doc claim (silent docs gradeless)**, model picked empirically Opus-vs-Sonnet · OQ7 staging + emitter migration + `pr6_retag_rollback` + dual-write · OQ8 **user gates everything** (answer key = agent pre-fill + user verify; team gets only the mini-worksheet) · OQ9 post-run adjudication of all 74 register signals · OQ10 synonyms from the same call · OQ11 embeddings ride apply PR · OQ12 full check-surface lift + tsx pin · OQ13 five PRs A-E + rider F · observances field closes to fixed list. Full rationale per lock in design doc §4.

## Out-of-scope follow-ups captured here

- ~~`guyanese` parent (`latin-american`)~~ — **RESOLVED 2026-06-12** (user verdict: Both; see Session-4 decision entry). Residual for the filter-UI track: consider true multi-parent support in the heritage hierarchy schema.
- Generic "following directions" as a cross-activity classroom skill — noted for any future SEL/competencies vocab pass (Cooking Skills is not its home; surfaced in the Session-4 walkthrough).
- Seed Bursts near-duplicate pair (`1HuffJuy…` + `1NqjpqXV…`) — dedup track (inherited from PR 5 follow-ups; not this track's to fix).

## Pointers to durable context

- Kickoff prompt: 2026-06-11-metadata-rebuild-pr6-stage2-retag-kickoff.md
- Design doc: 2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md (LOCKED 2026-06-11; OQ1-OQ13 + 2026-06-12 amendments)
- Implementation plan: 2026-06-11-metadata-rebuild-pr6-stage2-retag-implementation.md (concrete tasks; PR A done, B refined at cycle start)
- Mechanism exploration (mandatory pre-walkthrough read): 2026-05-13-stage2-retag-mechanism-exploration.md
- Parent initiative status: 2026-05-03-metadata-rebuild-foundation-execution-status.md
- Vocab inputs: 2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md (§16) + 2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md
- PR 5 follow-ups inherited: 2026-06-11-metadata-rebuild-pr5-canonicalization-execution-status.md ("Out-of-scope follow-ups" section)
- Archive: 2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status-archive.md (Sessions 1-5 + PR-A Current-State snapshots)

## Session log

<!-- New session entries land here. When a PR ships and the next PR
     begins, prior PR's entries move to the archive file. -->

### (Sessions 1-5 — PR A cycle — moved to the archive file 2026-06-12 at PR-B cycle start)

New session entries land below.
