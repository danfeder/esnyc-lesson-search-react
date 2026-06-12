# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) — Implementation Plan

> **Design LOCKED 2026-06-11.** All 13 OQs decided in the Session-2 walkthrough
> (user = decision authority). This plan's tasks are authored against those
> locks. PR A is specified in full; PR B in medium detail; PRs C/D/E as
> structured outlines **refined at each PR-cycle start** (they depend on the
> actual artifacts the earlier PRs produce). Verify every snippet/anchor
> against current code before applying — small repo-conformance adaptations
> allowed; product or design changes are not.

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to implement this plan task-by-task.

**Goal:** Re-tag the full live corpus (**767 lessons**, `retired_at IS NULL`) from lesson bodies against the locked canonical vocabulary — 12 fields in the main pass — with per-field enum enforcement, an answer-key eval gate ("beats v3"), a user-gated staged apply with rollback, embeddings regeneration, `search_synonyms` population (PR 3b), and cleanup of the PR 5 + PR 6 rollback tables. cooking_skills + main_ingredients follow in a second pass after a curriculum-team mini-worksheet.

**Architecture (locked):** TypeScript+Zod batch runner at `scripts/stage2-retag/` — export-corpus / run-retag / validate-output / generate-diff-report / prepare-apply — one **monolithic** enum-forced call per lesson, **synchronous** API, model picked empirically (claude-opus-4-7 vs claude-sonnet-4-6 on the answer key). Mirrors (never extends) the canonical call shape verified in `docs/plans/pr6-stage2-retag-evidence/oq1-call-shape-confirmation.md`: bare `new Anthropic({apiKey})`, `max_tokens` sized for ~12-field output, `system` array block + single forced tool each carrying `cache_control: {type:'ephemeral'}`, enums inline in `input_schema`, `tool_choice: {type:'tool', name:'submit_tags'}`, single user turn = lesson body, post-hoc Zod validation (enum adherence is NOT server-guaranteed), per-record usage accounting (eval-script plumbing, incl. `cache_creation/cache_read` counters).

**The 12 main-pass fields + vocab sources:**

| Field | Canonical vocab source |
|---|---|
| activity_type, tags, season_timing, cultural_responsiveness_features | `src/types/generated/enums.json` (4 PR-1 enums) |
| cultural_heritage | `data/vocab/cultural-heritage.vocab.json` (§16 88-row table) — adapter needed: `{provenance, canonical[], alias_map, drops}` → flat list |
| academic_concepts (framework + everyday, per D5) | `data/vocab/academic-concepts.vocab.json` — same adapter |
| academic_integration (6), social_emotional_learning (5), core_competencies (6), cooking_methods (3), observances_holidays (17), garden_skills (24) | NEW `scripts/stage2-retag/data/smaller-fields.vocab.json`, assembled in task A3 from filterDefinitions + the walkthrough locks (design doc §4 OQ2). **Copy value spellings from `filterDefinitions.ts` + the census artifact — never from memory.** |

**Design reference:** `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md` (§4 locks + Session-1 evidence). Read before any task.

**Sub-skills to invoke:** `superpowers:test-driven-development` (tasks marked TDD), `superpowers:verification-before-completion` (every task), `database-migrations` (before touching `supabase/migrations/` — PRs C/D/E), `superpowers:requesting-code-review` (between PRs).

**Per-PR ritual (mandatory, every PR):** canonical spec in the kickoff prompt's PER-PR RITUAL section. One-line shape: pre-push reviewer-agent dispatch → baseline checks → push + `gh pr create` → wait for bots → collect findings from all four PR surfaces → rebuttal-pass every finding → consolidated fix-ups → re-verify TEST DB per DB-touching round → round-cap after 2.

---

## Session 1-2 work list — ✅ COMPLETE 2026-06-11

All 7 evidence items gathered + adversarially verified (artifacts in `docs/plans/pr6-stage2-retag-evidence/`); walkthrough locked OQ1-OQ13. One optional leftover: the V3 shared-prefix cache-confirmation rerun (~$5.50) is blocked on a Console credit top-up — purely confirmatory, no decision depends on it.

## PR breakdown (locked, OQ13)

| PR | Branch | Contains | DB writes | Gate |
|---|---|---|---|---|
| A | `feat/pr6a-stage2-retag-pipeline` | Runner + check surface + dry-run ≤20 lessons | none | normal review |
| B | `feat/pr6b-stage2-retag-fullrun` | Answer key + eval scoring + full run artifacts + diff + apply artifacts + register adjudication | none | **user green-light before the full run**; "beats v3" bar |
| C | `feat/pr6c-stage2-retag-apply` | Apply migration (rollback snapshot, dual-write), Who's-Who body repair, embeddings regen | PROD via CI | user spot-check sign-off (Protocol B) + CI approval |
| D | `feat/pr6d-search-synonyms` | `search_synonyms` population from run artifacts | PROD via CI | CI approval |
| E | `feat/pr6e-stage2-cleanup` | Drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` + `pr6_retag_rollback` (+ staging); observances→fixed; filterDefinitions updates; Zod enum closing + enums.json regen + edge-mirror sync; stale-Python comment cleanup | PROD via CI | C PROD-verified first (PR 5 design §4.8) |
| F (rider) | `feat/pr6f-second-pass` | cooking_skills + main_ingredients re-tag when mini-worksheet returns | PROD via CI | worksheet returned + same B/C gates, miniature |

**Pre-flight reads (every implementation PR, refresh against current code):** the design doc §4; `docs/plans/pr6-stage2-retag-evidence/oq1-call-shape-confirmation.md` (the verified call shape — §2 table is the spec); `src/types/lessonMetadata.zod.ts`; `scripts/eval-llm-tagging-prompt.ts`; `scripts/CLAUDE.md`; `supabase/functions/process-submission/index.ts` (mirror, don't extend); heritage §16 + concepts returned worksheet + `oq2-smaller-fields-census.md` (vocab inputs).

---

## PR A — Pipeline scaffolding + dry-run (full detail)

### A1 — Branch + toolchain pin
- `git checkout -b feat/pr6a-stage2-retag-pipeline` off current `main`.
- Add `tsx` to `package.json` devDependencies (it is currently fetched ad hoc by `npx` — unpinned-toolchain finding, oq1 artifact §3). Match the latest version `npm i -D tsx` resolves; `npm run eval:llm-tagging -- --help` still works.
- **Verify:** `ls node_modules/.bin/tsx` exists; `git diff package.json package-lock.json` shows only the tsx addition.
- **Commit:** `chore(stage2-retag): pin tsx as a devDependency`

### A2 — Check surface (OQ12)
- New `tsconfig.scripts.json`: extends `./tsconfig.json`, `include: ["scripts/stage2-retag/**/*.ts", "scripts/lib/**/*.ts"]`, `compilerOptions: { noEmit: true, types: ["node"] }` (verify the base config's `lib`/`module` settings suit Node ESM at execution time).
- `package.json`: add `"type-check:scripts": "tsc -p tsconfig.scripts.json --noEmit"`; chain it into `"type-check"` so the pre-PR gate and CI pick it up automatically.
- `eslint.config.js`: keep the global `'scripts/**'` ignore but add a subsequent config object scoped to `scripts/stage2-retag/**/*.ts` re-enabling the standard TS rules (flat-config later-object-wins; verify the ignores block semantics at execution — a top-level `ignores`-only object is global, so the override may instead require narrowing the ignore glob to exclude `scripts/stage2-retag`).
- **Verify:** `npm run type-check` and `npm run lint` pass on a stub `scripts/stage2-retag/index.ts`; deliberately introduce a type error + lint error in the stub and confirm both gates FAIL, then remove.
- **Commit:** `feat(stage2-retag): dedicated type-check + lint surface for the runner (OQ12)`

### A3 — Vocab assembly module — TDD
- `scripts/stage2-retag/vocab.ts` + `vocab.test.ts`; `scripts/stage2-retag/data/smaller-fields.vocab.json`.
- Loads all 12 fields' canonical lists: the 4 from `enums.json`; heritage + concepts via an adapter for the `{provenance, canonical[], alias_map, drops}` shape of `data/vocab/*.vocab.json`; the 6 newly locked small fields from `smaller-fields.vocab.json` (assemble per the design-doc OQ2 lock; copy spellings from `filterDefinitions.ts` and `oq2-smaller-fields-census.md` §5 — includes the walkthrough's adds/folds/merges: +Stewardship tasks, +Sensory exploration, no `Food Justice`, no `no-cook`, single End-of-year value).
- Each field declares: enum values, display labels, multi/single select, and the dual-write column name + JSONB key (from the census §1 mapping table).
- **Tests first:** adapter flattening, drops excluded, alias_map NOT in enum lists, the six small-field counts (6/5/6/3/17/24), every field has column+JSONB mapping.
- **Verify:** `npx vitest run scripts/stage2-retag/vocab.test.ts` green; `npm run type-check && npm run lint`.
- **Commit:** `feat(stage2-retag): canonical vocab assembly for the 12 main-pass fields (TDD)`

### A4 — Corpus export
- `scripts/stage2-retag/export-corpus.ts` → `scripts/stage2-retag/artifacts/corpus.jsonl` (gitignore the artifacts dir).
- Reads PROD **read-only** (follow `scripts/CLAUDE.md` conventions for env/keys; verify at execution which env vars carry PROD access for scripts — `.env.local` inventory — and add an explicit assert-read-only guard: the script constructs no write statements).
- Selects `id, title, content_text` + current values of the 12 fields (columns) for `retired_at IS NULL`; **excludes** ghost stubs `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` and `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`; for `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` (Who's Who in the Food System, 462-char import-failure body) fetches the body from its live Google Doc at export time (no DB write — PROD `content_text` repair rides PR C).
- Normalization per OQ5 lock: strip `\x0B`, normalize `\r\n`/`\r` → `\n`.
- **Verify:** `wc -l artifacts/corpus.jsonl` = **765**; spot-check 2 records' JSON shape; the Who's-Who record's body length ≈ 3,300 chars not 462; `grep -c $'\x0b'` = 0.
- **Commit:** `feat(stage2-retag): corpus export (765 records, OQ5 exclusions + normalization)`

### A5 — Prompt + monolithic tool schema + result schema — TDD
- `scripts/stage2-retag/prompts/stage2-retag.md` (system prompt): per-field tagging rules incl. the walkthrough policies — **grades = source-doc claim ONLY, silent docs → empty array**; tasting ≠ cooking (the `both`-conflation class); cosmetics/soap → `craft` not `cooking`; same-titled variants tagged independently from each body; concepts in BOTH framework + everyday vocabulary + everyday↔framework synonym pairs (D5/OQ10); CRF per D9 master-list semantics.
- `scripts/stage2-retag/schema.ts` + `schema.test.ts`: builds the single `submit_tags` tool `input_schema` from the vocab module (one enum-constrained property per field, `uniqueItems`, `required` all fields — empty arrays allowed where "none" is legitimate) and the Zod result schema that every API response must `safeParse` (mirrors the input_schema + synonym-pair list + grade array).
- Token-mass guard: count_tokens preflight on prompt+tools; expect ~6-8K (the dry-run measured 6,274-token cached prefix for 17 fields; 12 fields lands lower). If it exceeds ~10K, stop and reassess cost projection before running.
- **Tests first:** schema contains exactly 12 field properties; enum lists match vocab module; Zod rejects off-enum values, accepts both-vocab concepts shape, rejects missing fields.
- **Commit:** `feat(stage2-retag): monolithic tool schema + result validation (TDD)`

### A6 — Runner
- `scripts/stage2-retag/run-retag.ts`: reads `corpus.jsonl`, calls the API per lesson (canonical shape per the oq1 artifact §2 — two `cache_control` breakpoints: tool + system; body as single user turn), concurrency 5 (`mapWithConcurrency` precedent from the eval script), SDK default retries.
- Flags: `--model` (default `claude-opus-4-7`), `--limit N` (dry-run), `--resume` (skip ids already in output JSONL), `--output` path.
- Appends one JSONL record per lesson: id, model, prompt+schema hash, raw tool_use input, Zod parse result, usage (incl. cache counters), per-record cost, latency, error.
- Repair pass: `--repair` mode re-runs ONLY Zod-failed fields as per-field calls (today's PROD shape verbatim — single-field tool, same prompt section) and merges results.
- API key: `ANTHROPIC_CONSOLE_API_KEY` from `.env.local` (the `ANTHROPIC_API_KEY` there is the CLIProxyAPI proxy-side key and 401s against the direct API — Session-1 finding). Check at execution whether `strict: true` tool mode is available on SDK ^0.95 — if yes, evaluate enabling it (the dry-run saw enum non-enforcement inflate outputs without it); Zod + repair pass remains the backstop regardless.
- **Verify:** `--limit 3` dry-run produces 3 valid records with `cache_read_input_tokens > 0` from record 2 on; `--resume` skips them; a forced-bad-enum unit test routes through repair logic.
- **Commit:** `feat(stage2-retag): sync monolithic runner with resume + repair pass`

### A7 — Validate + diff report — TDD
- `scripts/stage2-retag/validate-output.ts`: run-level summary (records, Zod pass/fail per field, repair-pass outcomes, usage/cost totals).
- `scripts/stage2-retag/generate-diff-report.ts`: per-field corpus diff old→new (adds/drops/changes with counts + per-lesson detail), emitting a **plain-language markdown report** (this becomes the Protocol-B artifact in PR B).
- **Tests first** on fixture JSONL: counts, edge cases (empty arrays, identical sets, casing-only changes flagged separately).
- **Commit:** `feat(stage2-retag): output validation + plain-language diff report (TDD)`

### A8 — Dry-run + iteration (≤20 lessons; allowed without further approval)
- Run `--limit 15` (stratified ids from the corpus by body length), inspect every record against its body, iterate the prompt (document each iteration in `artifacts/dryrun-notes.md`), re-run validate + diff on the dry-run slice.
- Capture measured per-lesson token mass + projected 767-lesson cost for both `claude-opus-4-7` and `claude-sonnet-4-6` (one 15-lesson run each — both contestants' prompts must be final-identical).
- **Verify:** all dry-run records Zod-pass (after repair at most); projected cost within ~2× of the $24/$14 design estimates — if not, stop and report.
- **Commit:** `feat(stage2-retag): dry-run artifacts + cost confirmation`

### A9 — Per-PR ritual → open PR A
- Full ritual (reviewer-agent dispatch pre-push; baselines; `gh pr create`). PR body: design-doc link, dry-run cost table, explicit "no DB writes in this PR".

---

## PR B — Answer key + full run + apply artifacts (medium detail; refine at cycle start)

- **B1** `sample-answer-key.ts`: ~60 lessons = ~40 stratified-random (by activity_type × body length) + ~20 adversarial seeded from `oq6-v3-baseline-and-eval-protocols.md`'s failure gallery (same-titled families, cosmetics suspects, closing-tasting lessons, wide-grade recipes). Emits a plain-language labeling worksheet (pattern: the two prior worksheets).
- **B2** Answer-key fill: agent pre-fills draft labels per field from bodies; **user verifies/corrects** (OQ8 lock — no curriculum-team dependency). Locked grade policy applies.
- **B3** Eval scoring: score THREE contestants against the key — v3's existing PROD tags, the new pipeline on Opus, the new pipeline on Sonnet — reusing `scripts/lib/evalMetrics` + the eval-script harness. **Gates:** new pipeline (winning model) must meet per-field F1 ≥ v3 on every re-tagged field AND macroF1 ≥ 0.7 AND per-value recall ≥ 0.5. Model with the better quality/cost picture wins; record the choice in the status doc.
- **B4** Full run: **USER GREEN-LIGHT REQUIRED (real-money, full-corpus rule)** — present the B3 scorecard + final cost projection first. Then `run-retag.ts` over all 765 exported records + repair pass; validate-output summary must show 100% Zod-pass post-repair.
- **B5** Apply artifacts: full diff report + `prepare-apply.ts` emitting (i) the staging data as SQL/CSV artifact, (ii) the draft apply migration (PR-5 emitter precedent) with `pr6_retag_rollback` snapshot DDL + dual-write UPDATEs, (iii) the spot-check worksheet (~50-100 sampled lessons across the three buckets: changed / unchanged / weird) for the user's Protocol-B review.
- **B6** Register adjudication: agent pass walks all 74 audit signals (24 CON-NN + 50 heritage) against the NEW tags; marks resolved-by-retag vs still-open in the registers; surfaces judgment calls (CON-16 etc.) to the user. Docs-only edits.
- **B7** Ritual → PR B (artifacts + registers; still no DB writes).

## PR C — Apply + embeddings (outline; refine at cycle start; `database-migrations` skill mandatory)

- C1 Migration (single file, idempotent): create `pr6_retag_rollback` snapshotting all about-to-change rows (12 columns + metadata) → apply dual-writes from the staged data → repair Who's-Who `content_text` (body from the PR-A export artifact) → add SQL CHECK constraints for the newly locked small-field enums (AFTER data is canonical — ordering is load-bearing) → analyze.
- C2 Rehearse: `supabase db reset` locally + `npm run test:rls`; PR opens → CI applies to TEST → verify via `mcp__supabase-test__execute_sql` (TEST validates mechanics; PROD MCP validates coverage — TEST is missing rows).
- C3 Merge → user approves PROD migration in CI → **PROD MCP verification with VERBATIM identifiers copied from the migration file** (counts per field, rollback-table row count, Who's-Who body length, spot lessons from the diff). Known SASL flake: rerun pattern per memory.
- C4 Embeddings regen (existing regen script precedent): TEST first, then PROD; verify embedding count + freshness timestamps via MCP.

## PR D — `search_synonyms` population (outline)

- D1 Distill everyday↔framework pairs from the PR-B run artifacts (concepts dual-vocab output); dedupe; emit population migration (idempotent upserts).
- D2 Same TEST-verify → merge → PROD-approve → PROD MCP verify cycle. Smoke the smart-search edge function reads the new rows (PR 3a Option B path).

## PR E — Cleanup (outline; gated on C PROD-verified, per PR 5 design §4.8)

- E1 Migration: drop `pr5a_heritage_rollback` (37 rows), `pr5b_concepts_rollback` (676), `pr6_retag_rollback`, + any staging table.
- E2 Code: observances field `creatable` → fixed list; filterDefinitions updates per the vocab locks (garden-skills +2, cooking methods labels, observances 17); close the 6 small-field enums in `lessonMetadata.zod.ts` + regenerate `enums.json` + sync the edge `_shared/metadataSchemas.ts` mirror (equivalence test enforces); clean the stale Python-mechanism comments (`scripts/generate-enums-json.ts:6-7`, `lessonMetadata.zod.ts` sync paragraph).
- E3 Track close-out: initiative retrospective per kickoff session-end ritual; update foundation status doc Current State; lift follow-ups to memory.

## PR F (rider, deferred) — second pass

Mini-worksheet (cooking_skills + main_ingredients + the `guyanese`-parent question) goes OUT to the curriculum team during PR A/B; PR F runs when it returns: vocab module extension → miniature B/C cycle (answer-key delta optional, diff + user gate + apply migration). Not a blocker for E.

---

## Test plan

Locked (design §6): TDD for A3/A5/A7 modules; dry-run before full run; 100% post-repair Zod-pass required before apply artifacts; Protocol A gates the full run, Protocol B + user sign-off gates the apply; `npm run type-check && npm run lint` (now incl. the scripts surface) every session; `npm run test:rls` on every migration PR; PROD MCP verbatim-identifier probes after every PROD apply.
