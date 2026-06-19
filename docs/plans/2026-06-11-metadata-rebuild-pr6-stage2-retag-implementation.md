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

> **▶▶ HERITAGE PIVOT 2026-06-16 (Session 12) — affects the PR breakdown + PR C.**
> User chose **Option B** for heritage: store **specific-only** tags + rebuild the
> live filter for complete recursive expansion (one source of truth = the §16
> `cultural-heritage.vocab.json`). Filter-first, open-ended maintenance window.
> A **NEW heritage-filter-rebuild PR (C1) lands BEFORE the apply (C2)** (see revised
> table + the full PR C1 task list below). The apply's heritage handling changes from
> full-chain dual-write to specific-only (the other 11 fields are unchanged).
> **Design COMPLETE + LOCKED 2026-06-16** (`docs/plans/2026-06-16-heritage-filter-rebuild-design.md`);
> PR C1 tasks authored below. Design-doc banner + execution-status pivot block hold the rationale.

**Goal:** Re-tag the full live corpus (**767 lessons**, `retired_at IS NULL`) from lesson bodies against the locked canonical vocabulary — 12 fields in the main pass — with per-field enum enforcement, an answer-key eval gate ("beats v3"), a user-gated staged apply with rollback, embeddings regeneration, `search_synonyms` population (PR 3b), and cleanup of the PR 5 + PR 6 rollback tables. cooking_skills + main_ingredients follow in a second pass after a curriculum-team mini-worksheet.

**Architecture (locked):** TypeScript+Zod batch runner at `scripts/stage2-retag/` — export-corpus / run-retag / validate-output / generate-diff-report / prepare-apply — one **monolithic** enum-forced call per lesson, **synchronous** API, model picked empirically — **contestants per the 2026-06-12 r3 comparison: claude-fable-5 (primary; requires `--tool-choice-auto` — Fable rejects forced tool_choice) vs claude-opus-4-7 (challenger; the bare default) on the answer key. 4-8 and Sonnet dropped (full evidence in the run artifacts' dryrun-notes.md).** Mirrors (never extends) the canonical call shape verified in `docs/plans/pr6-stage2-retag-evidence/oq1-call-shape-confirmation.md`: bare `new Anthropic({apiKey})`, `max_tokens` sized for ~12-field output, `system` array block + single forced tool each carrying `cache_control: {type:'ephemeral'}`, enums inline in `input_schema`, `tool_choice: {type:'tool', name:'submit_tags'}`, single user turn = lesson body, post-hoc Zod validation (enum adherence is NOT server-guaranteed), per-record usage accounting (eval-script plumbing, incl. `cache_creation/cache_read` counters).

**The 12 main-pass fields + vocab sources:**

| Field | Canonical vocab source |
|---|---|
| activity_type, tags, season_timing, cultural_responsiveness_features | `src/types/generated/enums.json` (4 PR-1 enums) |
| cultural_heritage | `data/vocab/cultural-heritage.vocab.json` (§16 88-row table) — adapter needed: `{provenance, canonical[], alias_map, drops}` → flat list |
| academic_concepts (framework + everyday, per D5) | `data/vocab/academic-concepts.vocab.json` — same adapter |
| academic_integration (6), social_emotional_learning (5), core_competencies (6), cooking_methods (3), observances_holidays (16 — ratified 2026-06-12, see design §4 OQ2), garden_skills (24) | NEW `scripts/stage2-retag/data/smaller-fields.vocab.json`, assembled in task A3 from filterDefinitions + the walkthrough locks (design doc §4 OQ2). **Copy value spellings from `filterDefinitions.ts` + the census artifact — never from memory.** |

**Design reference:** `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md` (§4 locks + Session-1 evidence). Read before any task.

**Sub-skills to invoke:** `superpowers:test-driven-development` (tasks marked TDD), `superpowers:verification-before-completion` (every task), `database-migrations` (before touching `supabase/migrations/` — PRs C/D/E), `superpowers:requesting-code-review` (between PRs).

**Per-PR ritual (mandatory, every PR):** canonical spec in the kickoff prompt's PER-PR RITUAL section. One-line shape: pre-push reviewer-agent dispatch → baseline checks → push + `gh pr create` → wait for bots → collect findings from all four PR surfaces → rebuttal-pass every finding → consolidated fix-ups → re-verify TEST DB per DB-touching round → round-cap after 2.

---

## Session 1-2 work list — ✅ COMPLETE 2026-06-11

All 7 evidence items gathered + adversarially verified (artifacts in `docs/plans/pr6-stage2-retag-evidence/`); walkthrough locked OQ1-OQ13. One optional leftover: the V3 shared-prefix cache-confirmation rerun (~$5.50) is blocked on a Console credit top-up — purely confirmatory, no decision depends on it.

## PR breakdown (locked OQ13 — **REVISED 2026-06-16 by the heritage pivot; filter PR C1 inserted, apply renamed C2** — supersedes the earlier "C0/C" sketch; see `2026-06-16-heritage-filter-rebuild-design.md`)

| PR | Branch | Contains | DB writes | Gate |
|---|---|---|---|---|
| A | `feat/pr6a-stage2-retag-pipeline` | Runner + check surface + dry-run ≤20 lessons | none | normal review |
| B | `feat/pr6b-stage2-retag-fullrun` | Answer key + eval scoring + full run artifacts + diff + apply artifacts + register adjudication | none | **user green-light before the full run**; "beats v3" bar |
| **C1 (NEW, heritage pivot)** | `feat/pr6c1-heritage-filter` | **Heritage filter rebuild — full tasks authored 2026-06-16 (design pass), see below.** Generator (vocab.json → committed TS artifact + SQL seed); recreate `cultural_heritage_hierarchy` as full tree + recursive `expand_cultural_heritage`; regen `filterDefinitions` to ~31 nested options; rewrite `IntCulturalHeritageSection` to recurse; retire orphaned `filterConstants.CULTURAL_HIERARCHY`; unit + E2E. **NO lesson-data writes** → backward-compatible with current full-chain corpus (keystone-proven superset). | PROD via CI (table/RPC migration) | design checkpoint ✅ + verify same-or-greater counts on current PROD data + CI approval |
| C2 | `feat/pr6c-stage2-retag-apply` (existing) | Apply migration (rollback snapshot, dual-write) — **heritage stored specific-only (pivot), other 11 fields unchanged**; targeted drops U-5/U-8/U-12 via manifest + map-surfaced error corrections; post-apply U-1 integrity assertion (hierarchy-derived); Who's-Who `content_text` repair; grade_levels guarded+reviewed; **embeddings DEFERRED** to a separate task. **Internal tasks C2.1–C2.4 (Session-18 Codex-corrected).** | PROD via CI | user spot-check sign-off (Protocol B) + CI approval; **lands after C1 verified** |
| D | `feat/pr6d-search-synonyms` | `search_synonyms` population from run artifacts | PROD via CI | CI approval |
| E | `feat/pr6e-stage2-cleanup` | Drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` + `pr6_retag_rollback` (+ staging); observances→fixed; filterDefinitions updates; Zod enum closing + enums.json regen + edge-mirror sync; stale-Python comment cleanup | PROD via CI | C PROD-verified first (PR 5 design §4.8) |
| F (rider) | `feat/pr6f-second-pass` | cooking_skills + main_ingredients re-tag (vocab DECIDED 2026-06-12, team skipped) | PROD via CI | same B/C gates, miniature; no external blocker |

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
- Flags: `--model` (default `claude-opus-4-8` since 2026-06-12; was 4-7), `--limit N` (dry-run), `--resume` (skip ids already in output JSONL), `--output` path.
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
- Capture measured per-lesson token mass + projected 767-lesson cost for both `claude-opus-4-8` and `claude-sonnet-4-6` (one 15-lesson run each — both contestants' prompts must be final-identical; the 2026-06-12 4-7 dry-run stays as the E3-comparable baseline).
- **Verify:** all dry-run records Zod-pass (after repair at most); projected cost within ~2× of the $24/$14 design estimates — if not, stop and report.
- **Commit:** `feat(stage2-retag): dry-run artifacts + cost confirmation`

### A9 — Per-PR ritual → open PR A
- Full ritual (reviewer-agent dispatch pre-push; baselines; `gh pr create`). PR body: design-doc link, dry-run cost table, explicit "no DB writes in this PR".

---

## PR B — Answer key + full run + apply artifacts — REFINED 2026-06-12 (cycle start)

Branch `feat/pr6b-stage2-retag-run` (off `f982d1a`). **No DB writes anywhere in PR B.** Contestants: **claude-fable-5 primary (`--tool-choice-auto`) + claude-opus-4-7 challenger**; ALL runs via the CLIProxyAPI proxy (`--base-url http://127.0.0.1:8317/api/provider/anthropic`; proxy must be RUNNING; results not path-interchangeable with direct API; pull-latest before runs).

### B0 — Deferred small-fix bundle (code; TDD where logic changes) — NEW at refinement
Fold the code-shaped PR-A deferrals BEFORE any B3 runs so the runs ride fixed code:
- **Repair-pass toolChoice gate symmetry** (`run-retag.ts`): main pass honors `--tool-choice-auto`, repair pass behavior must match it symmetrically (resume-identity aware — changing repair call shape must not silently invalidate resume).
- **Cache-floor labeling for unknown families** (`preflight-token-mass.ts` `assessCacheFloor`): unknown-family (fable) currently returns `level: 'pass'` — give it a distinct level/label so a fable preflight isn't a silent pass.
- **`preflight-token-mass.ts --help`** (mirror run-retag's usage block).
- **Repair-pass prompt review**: o47's garden_skills fabrications concentrated in REPAIR records across all 3 rounds — review/tighten the per-field repair prompt; record the conclusion in `artifacts/dryrun-notes.md`.
- `strict:true`: NO action (API rejects `uniqueItems` in the strict subset — recorded; revisit only on schema restructure).
- **Verify:** full suite green (≥285), `type-check` both surfaces, `lint`. **Commit:** `fix(stage2-retag): PR-A deferral bundle — repair toolChoice symmetry, cache-floor labeling, preflight --help`

### B1 — Answer-key sampler + labeling worksheet — TDD
- `scripts/stage2-retag/sample-answer-key.ts`, deterministic (recorded seed) over `artifacts/corpus.jsonl` (765 records):
  - **~40 stratified-random**: strata = current activity_type (from the corpus snapshot's PROD tags) × body-length quartile.
  - **~20 adversarial**: hand-listed IDs in checked-in `data/answer-key-adversarial.json`, seeded from `oq6-v3-baseline-and-eval-protocols.md`'s failure gallery (same-titled families, cosmetics suspects, closing-tasting lessons, wide-grade recipes) PLUS the PR-A escalations: ≥2 L14-class heritage-ban cases, ≥2 `[Table]`-marker bodies (fable fabricated a season on one), ≥2 R4 reconcile-direction cases (academic_concepts⇄academicIntegration conflicts).
  - Emits `artifacts/answer-key-sample.jsonl` (IDs + bodies + current tags) + `artifacts/answer-key-worksheet.md` (plain-language per-lesson labeling sheets, pattern of the two prior worksheets; 12 fields + grades source-doc-claim column; per-field vocab lists inlined).
- TDD: stratification determinism, bucket counts, adversarial inclusion, worksheet rendering.
- **Commit:** `feat(stage2-retag): answer-key sampler + labeling worksheet (TDD)`

### B2 — Answer-key fill: agent pre-fill + USER verification `[user-gated]`
- Supervisor dispatches pre-fill agent(s) reading the 60 bodies, drafting labels per field into the worksheet draft column WITH per-label body-quote evidence. Locked grade policy: source-doc claim only; silent docs gradeless.
- **R4 adjudication rides here**: for reconcile-direction cases the key records the CORRECT direction; outcome decides whether `normalize.ts`'s adds-integration reconcile flips to drop-concept (code follow-up lands in B2 if needed, BEFORE B3 runs).
- **USER verifies/corrects every sheet** (OQ8 lock). Confirmed worksheet → `artifacts/answer-key.final.jsonl` via a small converter (part of B1's tooling).

### B3 — Contestant runs + eval scoring `[USER COST APPROVAL]`
- Pipeline runs on the 60 key lessons: fable + o47 via proxy (estimate from r3 measured rates: ~$10 + ~$4 — exceeds the ≤20-lesson dry-run allowance, so explicit user OK before running).
- Score THREE contestants against the key: v3 (= current PROD tags in the corpus snapshot), fable, o47 — reusing `scripts/lib/evalMetrics`; per-field F1 / macroF1 / per-value recall. **Gates:** winning model per-field F1 ≥ v3 everywhere AND macroF1 ≥ 0.7 AND per-value recall ≥ 0.5.
- Also quantify from the key: **academic-strip amplification** (cases where `academic` was correct and the strip hurts) → decide recheck routing; **L14 heritage-ban failures** → decide code-side rule. Record both decisions in the status doc.
- **Commit:** scoring script + scorecard artifact.

### B3.5 — Pre-B4 corpus prep (green-lit 2026-06-12 Session 8; the RUN stays separately gated)
Three items, all must complete before B4 launches:
- **B3.5a — Corpus-wide doc-surfaces capture** (~710 remaining live docs; 59 already swept Session 7 → `artifacts/prefill/header-filename-sweep.md`). Method proven: Drive filename via metadata; page headers via `inspect_doc_structure` (native Docs) / `word/header*.xml` (.docx). Chunk across multiple background agents (~80-100 docs each); merge into the doc-surfaces sidecar format B2.5 expects (1:1 with corpus ids); supervisor spot-checks a sample against Session-7 sweep rows. Output: full-corpus sidecar artifact.
- **B3.5b — Full-corpus completeness screen** (3/60 key lessons were incomplete/non-lesson; expect ~35 corpus-wide). Heuristic pass over `corpus.jsonl` bodies (missing agenda/objectives/materials signature, stub length, non-lesson template) + agent review of flagged rows → plain-language candidate list with body evidence. **USER verdicts on candidates** (deletion follow-ups pattern from Session 7); confirmed non-lessons excluded from the run corpus (exclusions file precedent `9d4b626`).
- **B3.5c — Fold the 3 Session-7 deletion verdicts** (L10 Celebrating Eid `…`, L21 Kitchen Appendices, L27 Three Sister Arepas — verbatim ids in `data/answer-key-exclusions.json` + rulings doc) into the corpus/export exclusions so B4 doesn't run them.

### B4 — Full run `[USER GREEN-LIGHT — real-money full-corpus rule; prep green-lit, RUN gate still pending]`
- Present B3 scorecard + final cost projection FIRST. On green-light: `run-retag.ts` over all live records post-B3.5 exclusions + repair pass (proxy; resume-capable). **Winner locked at B3 (2026-06-12): claude-fable-5 `--tool-choice-auto` with `--fallback-model claude-opus-4-7`** (refusal-only fallback, ruling Session 8). validate-output must show **100% Zod-pass post-repair** (fallback records count as their lesson's result).

### B5 — Apply artifacts
- Full diff report + `prepare-apply.ts` emitting (i) staging data as SQL/CSV artifact, (ii) draft apply migration (PR-5 emitter precedent) with `pr6_retag_rollback` snapshot DDL + dual-write UPDATEs, (iii) spot-check worksheet (~50-100 sampled across changed / unchanged / weird buckets) for the user's Protocol-B review.

### B6 — Register adjudication
- Agent pass walks all 74 audit signals (24 CON-NN + 50 heritage) against the NEW tags; marks resolved-by-retag vs still-open in the registers; surfaces judgment calls (CON-16 etc.) to the user. Docs-only edits.

### B7 — Ritual → PR B (artifacts + registers; still no DB writes).

## PR C1 — Heritage filter rebuild (full detail) — authored 2026-06-16 (design pass)

> **REQUIRED reads before any task:** `docs/plans/2026-06-16-heritage-filter-rebuild-design.md` (authoritative); `data/vocab/cultural-heritage.vocab.json`; the live defs of `cultural_heritage_hierarchy`, `expand_cultural_heritage`, `_alias_cultural_heritage`, `search_lessons` (latest defining migration in `supabase/migrations/` + PROD `pg_get_functiondef`); `src/utils/filterDefinitions.ts` (heritage block ~L124-170); `src/components/Internal/IntCulturalHeritageSection.tsx`; `src/utils/facetCounts.ts` + `src/utils/filterUtils.ts` (heritage helpers). **Branch:** `feat/pr6c1-heritage-filter` off the current tip (carries the design + pivot doc commits). **NO lesson-data writes anywhere in C1.** `database-migrations` skill MANDATORY for C1.2.

- **C1.0 — Capture ground truth + backward-compat baseline (read-only).** Pull live defs of the 3 functions + `SELECT * FROM cultural_heritage_hierarchy` via PROD MCP. Build the **before-counts baseline**: for every current top+sub heritage option, the count of lessons that match it today (use `search_lessons`'s own heritage path / the `&&` expanded match against current PROD data). Save as an artifact (`scripts/heritage/artifacts/heritage-filter-baseline.json`). This is the C1.9 gate evidence. No code change.
- **C1.1 — Generator script — TDD.** Create `scripts/heritage/generate-heritage-hierarchy.ts` reading `cultural-heritage.vocab.json`; emits (a) committed `src/utils/heritageHierarchy.generated.ts` — the nested `culturalHeritage` options (vocab `top`+`sub` tiers only, `internal` excluded, nested by `parent_key`, kebab `value`/Title `label`); (b) committed `supabase/migrations/<seed>.sql` body / a `.sql` fragment with all ~71 `(key,label,parent_key)` rows for C1.2. Tests: output matches a vocab-derived fixture; roots/tiers correct; `internal` excluded from the UI artifact but present in the seed; **drift guard** (re-run == committed artifact, byte-identical). Register under `tsconfig.scripts.json` + ESLint scope (extend the stage2 check surface if needed).
- **C1.2 — Hierarchy table + recursive expansion migration** (`database-migrations` skill; date prefix sorts after floor `20260613000000_…`). One idempotent migration: recreate `cultural_heritage_hierarchy` as `(key text PRIMARY KEY, label text NOT NULL, parent_key text REFERENCES cultural_heritage_hierarchy(key))` + reseed from C1.1's SQL; rewrite `expand_cultural_heritage` as `WITH RECURSIVE` returning input nodes **plus all transitive descendants, resolved to `label`** for the existing `&&` overlap; **preserve the `search_lessons` integration** (same set-of-labels contract feeding `l.cultural_heritage && expanded_cultures`). FIRST confirm no other DB object references the old table's columns (grep migrations + scan `pg_get_functiondef`). Local `supabase db reset` + `npm run test:rls`.
- **C1.3 — Expansion tests — TDD (DB, write FAILING-against-old first).** Prove the regression is caught: author tests that select a top region and expect a lesson stored with ONLY a deep descendant (specific-only fixture rows in a local seed) — these FAIL on the old one-tier function, PASS on the recursive one. Cover: parent→all descendants incl. tradition leaves (Soul Food under African American); slug-input matches label-stored data (the bridge); `internal` nodes still match. Local Supabase.
- **C1.4 — UI options regen + recursive type.** Point `filterDefinitions.ts` `culturalHeritage.options` at `heritageHierarchy.generated.ts`. Make the option/`FilterConfig` type's `children` recursive (`children?: HierarchicalOption[]`). Update consumers that assumed 2 levels — `filterUtils.ts` (`isParentCultureSelected`/`getCultureChildren` → recurse), `facetCounts.ts`, active-pills. Unit tests for the recursive helpers.
- **C1.5 — Component rewrite (nested render).** Rewrite `IntCulturalHeritageSection.tsx` to render the nested tree recursively with depth-based indent (extend `int-check--child` styling per depth). Preserve per-node checkbox toggle + facet counts. Verify visually (`npm run dev` / chrome-devtools MCP screenshot of the heritage section).
- **C1.6 — Facet-count coherence — DECIDED 2026-06-16 (user verdict: fix keying + expansion-aware). TDD.** Investigation (Session 15) found heritage count badges are ALREADY broken on prod (pre-existing, not a C1.4/C1.5 regression): `counts.culturalHeritage` is keyed by stored **Title-Case labels** but the component looks up by **kebab slug** → all badges resolve 0/blank. (Impl-plan's old "counts still accurate for C1" premise = false.) **Scope (per design doc §3.7):** (1) **fix the slug↔label count keying** so badges render — produce a **slug-keyed** heritage count map (normalize stored labels → slugs at tally) so the component's `countFor(node.value)` works unchanged; (2) **expansion-aware parent counts** — a parent's badge = **distinct lessons** matching `{self ∪ all transitive descendants}`. **Algorithm:** per lesson, label→slug each stored value, expand each to `{self ∪ ancestors}`, **union into one Set per lesson**, increment each slug once (NOT sum-of-descendant-counts — that double-counts e.g. Chinese+Japanese toward Asian). **Maps:** need a label→slug normalizer + slug→ancestors map over the **FULL 71-node tree incl. `internal`** (a lesson can store an internal-tier label like `Soul Food` → must credit `African American`/`Indigenous and Diaspora`); preferred source = extend `generate-heritage-hierarchy.ts` to ALSO emit a committed ancestry/alias-map artifact (keep existing outputs byte-identical; extend drift guard) — or read `cultural-heritage.vocab.json`. Do NOT naively reuse `getCultureDescendantValues` (walks DOWN, double-count-prone). Unit tests: keying fix renders a non-zero badge; parent count = distinct lessons across descendants incl. internal leaves; no double-count on a multi-tagged lesson; drift guard if the generator gains an output. **Out of scope:** `activityType` has the same class of bug (`cooking-only` slug vs `Cooking` stored) → separate follow-up, not fixed here.
- **C1.7 — Retire orphaned `CULTURAL_HIERARCHY`.** Grep-confirm zero live importers; delete the constant (+ now-dead helpers) from `src/utils/filterConstants.ts`; type-check + lint green.
- **C1.8 — E2E (Playwright). SCOPE DECIDED 2026-06-16 (user, Session 16): "structural + superset", NO data fixtures.** The original literal assertion ("select Asian → results include a lesson tagged ONLY with a deep descendant") is NOT satisfiable pre-C2: the current corpus stores FULL ancestor chains, so specific-only lessons don't exist yet (they land in C2). Deep-descendant-only retrieval is already proven at the DB layer in **C1.3** (fixtures, RED-against-old) and becomes UI-relevant only post-C2; the repo's E2E convention also deliberately avoids per-lesson data assertions (no seed/fixture mechanism). So C1.8 is the **UI integration/smoke proof** that the rebuilt nested filter works end-to-end (recursion-correctness stays covered by C1.3 + C1.9). On the PUBLIC search page (`/`), assert: **(a)** the Cultural Heritage filter section expands and renders the nested tree across tiers, incl. the newly-added groups (Asian → … → Chinese/Japanese; **Indigenous and Diaspora → African American**; Indigenous → Lenape); **(b)** a parent checkbox and a nested child checkbox each render and toggle, applying/clearing the filter (URL param / active chip updates); **(c)** selecting parent "Asian" yields a result set that is a **superset (≥)** of selecting child "Chinese" — monotonic, robust at any data size, NO exact counts. Data-magnitude checks (e.g. "African American returns >0") are meaningful only against the fuller CI/TEST DB — write them so they do NOT falsely fail on the sparse local seed (guard behind a data-presence/`>0 total results` check, or assert the facet badge, not a hard floor). **Selectors:** follow the repo idiom (text/role/aria locators → `input[type=checkbox]`; result count via IntToolbar `<strong>`); add a minimal `data-testid` to the heritage checkboxes only if a semantic locator would be too fragile. **Verify:** run `npm run test:e2e` locally (dev server + local Supabase with the C1.2 migration applied) — structural assertions (a)/(b) and the monotonic (c) must pass on local data; report the local run output. The data-magnitude exercise runs in CI against the deploy preview (TEST DB) at C1.10. Deep-descendant-only UI proof deferred to C2.
- **C1.9 — Backward-compat verification (the apply gate).** Re-run the C1.0 baseline against the NEW filter on current PROD data (local → TEST after CI applies → PROD read-only): **every parent returns same-or-greater, never fewer.** Capture the after-table; the diff is the recorded gate evidence (expect heals like Asian 65→74).
- **C1.10 — Per-PR ritual → open PR C1.** Pre-push code-reviewer dispatch on `git diff main...HEAD` + rebuttal pass + fix-ups; `npm run type-check && npm run lint`; push `feat/pr6c1-heritage-filter`; `gh pr create`. CI applies migration to TEST → verify via `mcp__supabase-test__execute_sql`. Bot rounds + triage. **Merge USER-GATED; PROD migration approval USER-GATED.**

## PR C2 — Apply (embeddings DEFERRED) (REFINED 2026-06-16 at C2 cycle start; Session 18 recon + PROD census + Codex adversarial review + user decisions; `database-migrations` skill mandatory)

> **HERITAGE PIVOT 2026-06-16 (specified + recon-verified):** heritage is stored **specific-only** (Option B) — the run's specific tags minus the targeted drops, stored as-is (NO parent-expansion), plus a post-apply assertion that no AA/Indigenous row carries `North American`. The recursive filter that makes specific-only safe shipped in **PR C1** (live on PROD). The other 11 fields' dual-write is unchanged.
>
> **Session-18 recon headline (verified against `full-run.fable.jsonl` + PROD):** `prepare-apply.ts` already stages heritage specific-only with NO chain expansion (it's just one of the 11 `FLAT_FIELDS`; `newFlatValues` copies the run array verbatim) → **the pivot needs NO emitter expansion change**; the only heritage work is the corrections manifest below. The `academic_concepts` JSONB-only exception (`column: null`) holds.

**Locked targeted corrections (verbatim ids + before→after, all confirmed against the run file in Session 18):**
| Ref | Lesson | id | run heritage → C2 target |
|---|---|---|---|
| U-5 | Fattoush | `1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI` | `[Middle Eastern,Levantine,Lebanese,Syrian,Jordanian,Palestinian,Israeli]` → **drop Israeli + Jordanian** = `[Middle Eastern,Levantine,Lebanese,Syrian,Palestinian]` |
| U-8 | Alternative Proteins | `1yTTJr3D9B6iljmmqdqtWUf6WnpRm683_` | `[Italian,European]` → **set `[]`** |
| U-12 | Intro to Salad Project | `1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8` | `[Middle Eastern]` → **set `[]`** |
| C1-flag | Arroz con Gandules / Apple Jicama Slaw | `1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU` | `[Puerto Rican,Caribbean,Latin American,South Asian]` → **drop South Asian** |

> **ID CORRECTION:** the heritage-rebuild design doc named `055b000b…` for the Arroz fix — that id does NOT exist in the corpus (0 grep matches). The real spurious-`South Asian` row is `1VShcRmc…` (verified). **Salsa Toasts: NO action** (user decision 2026-06-16) — of 3 Salsa rows, two are already `[]` and the third `14MTTw-8EGeW0BMghM8C8imcWlKXB7P1q-SH-84m7E8U` carries `[Latin American]` which is a defensible tag, not an error.

**Other Session-18 decisions baked into the tasks:**
- **Small-field CHECK constraints: INCLUDED in C2** (user decision). PROD census proved it's safe: all 113 live rows with non-canonical small-field values are in the 753-corpus → the apply canonicalizes every one (live residue = **0**). The ONLY straggler is **1 retired row** `15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz` ("Children's Aid Society: Food Justice Program") carrying `Food Justice` in `core_competencies` → a 1-row vocab-aligned fold (`Food Justice`→`Social Justice`) makes the whole table canonical. (NOT the big full-corpus canonicalization originally feared.)
- **Grade levels: INCLUDED but GUARDED + REVIEWED** (user decision 2026-06-16, post-Codex review). The B5 emitter writes `grade_levels` + `metadata.gradeLevels` UNCONDITIONALLY on every changing row from the run output (`prepare-apply.ts:441,453`) — which would OVERWRITE grades on **728 rows** (C2.1-measured against the run file: 132 real value-changes + 596 no-op same-value writes) with no before/after review AND **BLANK grades to `[]` on 25 rows** where the run captured none (`grade_levels` empty/absent in `rawInput`) — a user-facing filter. (Plan originally estimated 731/33; C2.1 measured 728/25.) **Fix (C2.1):** NEVER write an empty grade — preserve the existing value when the run grade is empty/absent — AND emit a before/after grade diff as a Protocol-B review surface; C2.3 adds a post-apply grade assertion. Honors OQ6 (grades = source-doc claim) safely.
- **Embeddings: DEFERRED out of C2** (user decision 2026-06-16, post-Codex review). The earlier "1-row, metadata-free" plan was **WRONG** — the embedding recipe is metadata-INCLUSIVE in `generate-embeddings.mjs`/`prepareLessonText` (embeds culture, concepts, skills, ingredients, grades, theme before content) and **INCONSISTENT across 3 scripts** (live `process-submission` = `title+content` only; `regenerate-all-embeddings.mjs` = content only). Since C2 changes metadata corpus-wide, a deliberate recipe-settlement + full-corpus regen + relevance check is **its own task**, NOT part of the high-stakes apply (open maintenance window → temporary staleness harmless). C2.4 is removed; see the status-doc out-of-scope follow-up.

> **⚠️ Session-18 Codex adversarial review (gpt-5.5/xhigh) corrected this plan BEFORE any build.** It caught three issues the recon + 4 PROD censuses + supervisor-verify all missed: (1) the embeddings recipe is NOT metadata-free → reversed the 1-row decision; (2) the unconditional `grade_levels` overwrite/blank (25 rows would lose grades — C2.1-measured; plan est. 33) → guarded + reviewed; (3) the U-1 assertion's hand-listed label set is incomplete vs the hierarchy → derive it (C2.2 §7). All 3 verified against code + accepted. This is the per-PR Codex plan-review gate in action.

**Migration file:** `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (floor = `20260616000000_heritage_recursive_expansion.sql`, confirmed; `20260617…` sorts after).

### C2.1 — Corrections manifest + emitter wiring (TDD)
- **Create** `scripts/stage2-retag/data/heritage-corrections.json` — the 4 corrections above (provenance: register U-5/U-8/U-12 + C1 map Arroz; Session-18 verification). Shape: `{provenance, corrections:[{id, field:"cultural_heritage", drop:[…] | set:[…], ref}]}`. Prefer `set` where the full target is known.
- **Modify** `scripts/stage2-retag/prepare-apply.ts` — add `loadHeritageCorrections` (mirror `loadCorpusExclusions`); apply drops/sets to `fields['cultural_heritage']` **BEFORE change-detection** (so a drop-only row, e.g. U-12 `[Middle Eastern]`→`[]`, is detected as changed and staged). Flows into CSV + staging SQL + draft migration identically (single source).
- **Modify** `prepare-apply.ts` grade handling (Codex finding #2 — DATA SAFETY): in `applyUpdate`, when the staged `gradeLevels` is empty/absent, **OMIT** the `grade_levels` column write AND the `metadata.gradeLevels` `jsonb_set` for that row (preserve the existing prod value) instead of writing `[]`. So the 25 empty/absent-grade rows are never blanked; the 728 non-empty rows still write. Emit a **before/after grade diff** review artifact (`pr6-retag-grade-diff.md`): "after" = run grades from the staged rows, "before" = current prod grades via a read-only PROD/TEST census (the corpus snapshot lacks current grades). TDD: assert NO empty-grade clause is emitted; assert the 25 known empty/absent-grade rows produce no grade write; assert the diff artifact lists the writes. **[C2.1 DONE — measured 728 writes (132 real changes / 596 no-op) / 25 preserved; "before" census committed at `data/prod-grades-census.json`.]**
- **Modify** `scripts/stage2-retag/prepare-apply.test.ts` — TDD RED→GREEN: U-5 drops the 2, U-8/U-12 clear, Arroz drops South Asian, drop-only change detection fires; PLUS the grade-guard assertions above.
- **Regenerate** artifacts (`npx tsx prepare-apply.ts`); spot-check the 4 lessons' staged heritage.
- **Verify:** `npm run type-check && npm run lint && npx vitest run scripts/stage2-retag/prepare-apply.test.ts`.

### C2.2 — The C2 apply migration (`database-migrations` skill MANDATORY; idempotent single file)
Sections in **load-bearing order**:
1. `pr6_retag_rollback` DDL (+ RLS enabled, no policies = service-role-only) — **extend the B5 snapshot to also capture `content_text`** (for the Who's-Who rollback).
2. Snapshot `INSERT … SELECT … WHERE lesson_id IN (<changing ids> ∪ Who's-Who ∪ the retired `15T4wU94…`) ON CONFLICT DO NOTHING` (PR-5a precedent; preserves the first pre-apply snapshot on re-run).
3. Per-lesson dual-write `UPDATE`s from the **corrected** staged data (text[] column + `jsonb_set` metadata; `academic_concepts` JSONB-only; heritage specific-only). Hand-port the regenerated `pr6-retag-apply.draft.sql` (the draft is a never-executed template). **Grade guard (C2.1):** the regenerated SQL OMITS `grade_levels`/`metadata.gradeLevels` for rows whose run-grade is empty → existing grades are never blanked; the 728 non-empty-grade rows are written and covered by the C2.1 grade-diff signoff.
4. Who's-Who `content_text` repair: `UPDATE lessons SET content_text=<body literal> WHERE lesson_id='1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg' AND length(content_text) < 1000` (body from `scripts/stage2-retag/artifacts/whos-who-body.txt` / `corpus.jsonl` line 431; guard makes it idempotent/no-op once repaired).
5. **Retired fold-fix:** `UPDATE lessons SET core_competencies = array_replace(core_competencies,'Food Justice','Social Justice'), metadata = jsonb_set(...) WHERE lesson_id='15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz'` (the lone retired non-canonical row; makes the table canonical for the CHECK).
6. **Six small-field CHECK constraints** — AFTER data is canonical. Idempotent `DO $$ … pg_constraint existence check … ADD CONSTRAINT valid_<field> CHECK (col IS NULL OR col <@ ARRAY[…]::text[])` per `20260515000000_metadata_value_validation.sql` precedent. Fields + vocab from `scripts/stage2-retag/data/smaller-fields.vocab.json`: `academic_integration`(6), `social_emotional_learning`(5), `core_competencies`(6), `cooking_methods`(3), `observances_holidays`(16), `garden_skills`(24). (heritage + academic_concepts get NO CHECK.)
7. **U-1 integrity assertion** (`DO $$` hard-fail; Codex finding #3 — DERIVE, don't hand-list): build the forbidden label set by recursively expanding the `indigenous-and-diaspora` subtree from the live hierarchy — e.g. `SELECT array_agg(label) FROM expand-equivalent of indigenous-and-diaspora` (reuse `expand_cultural_heritage(ARRAY['indigenous-and-diaspora'])` or a recursive CTE over `cultural_heritage_hierarchy`) — NOT a hand-typed list (the prior parenthetical omitted Lenape / Haudenosaunee / Three Sisters traditions / exact `Cajun/Creole` label, so a `North American`+missing-label row could slip through). Assert no live lesson carries `North American` alongside any derived label, on **BOTH** `cultural_heritage` (column) **AND** `metadata->'culturalHeritage'` (mirror).
8. `ANALYZE public.lessons;`
- **Verify locally:** `supabase db reset && npm run test:rls`; then a local MCP census = the 6 small fields all canonical (the Session-18 census query, expecting 0 non-canonical) + the 4 heritage corrections present + U-1 = 0.

### C2.3 — TEST rehearsal + PROD apply
- **Protocol-B sign-off gate (pre-merge):** user reviews the diff-report spot-check AND the new `pr6-retag-grade-diff.md` (728 grade writes, of which 132 are real value-changes — a user-facing filter being re-derived from source-doc claims per OQ6; 25 empty-grade rows preserved) and signs off BEFORE merge.
- PR opens → CI applies to TEST → verify with `mcp__supabase-test__execute_sql` (mechanics; PROD MCP validates coverage — TEST is missing rows).
- Merge → user approves PROD migration → **PROD MCP verify with VERBATIM ids copied from the migration file** (`feedback_verbatim_identifiers_in_probes`): per-field change counts, `pr6_retag_rollback` row count, Who's-Who `length(content_text)` ≈ 3,300, the 4 heritage-correction arrays, the retired fold-fix, the 6 CHECK constraints exist + the all-canonical census returns 0, U-1 = 0 (column + mirror), **grade post-apply assertion (no row blanked; the 728 written grades match the run, the 25 empty/absent-grade rows kept their prior values)**. Known SASL flake → rerun pattern per memory.

### C2.4 — Embeddings: DEFERRED out of C2 (user decision 2026-06-16, post-Codex review)
- **NOT done in C2.** The embedding recipe is metadata-inclusive (`prepareLessonText` embeds culture/concepts/skills/grades) and inconsistent across 3 scripts; settling the canonical recipe + full-corpus regen + a search-relevance check is its OWN task (status-doc out-of-scope follow-up). C2 ships without touching embeddings; the open maintenance window makes temporary staleness harmless. If the separate embeddings task lands later, it should run AFTER C2's metadata apply so it regenerates from the final tags.

## PR D — `search_synonyms` population (outline)

- D1 Distill everyday↔framework pairs from the PR-B run artifacts (concepts dual-vocab output); dedupe; emit population migration (idempotent upserts).
- D2 Same TEST-verify → merge → PROD-approve → PROD MCP verify cycle. Smoke the smart-search edge function reads the new rows (PR 3a Option B path).

## PR E — Cleanup (outline; gated on C2 PROD-verified, per PR 5 design §4.8)

- E1 Migration: drop `pr5a_heritage_rollback` (37 rows), `pr5b_concepts_rollback` (676), `pr6_retag_rollback`, + any staging table. **✅ DONE Session 21 (`9f2db46`, migration `20260619000000_pr6e_drop_rollback_tables.sql`); PROD-confirmed counts 37/676/754, zero dependents, no DB staging table.**

### E2 — Full canonical reconciliation (SCOPE EXPANDED — Session 21 recon + user decision 2026-06-19)

**Why expanded:** Session-21 recon (2 read-only agents + PROD census + firsthand reads, see status-doc Session-21 log + decision D-E1) found that C2 canonicalized the 6 columns AND added DB CHECK constraints, but the **reviewer-entry layer + filter value-forms were never updated to match**. Net effect on PROD now (harmless in the maintenance window, MUST fix before reviewers return): a reviewer save of `cooking_methods` (form emits Title `Stovetop`, CHECK wants kebab `stovetop`) or `garden_skills` (form emits kebab `planting`, CHECK wants Title `Planting`) is **rejected by the column CHECK**; observances is still free-text so a typed holiday outside the locked 16 also fails the CHECK; the cooking-method **facet badge reads 0** (buckets by stored `stovetop`, looks up by `Stovetop`). **User decision (AskUserQuestion 2026-06-19): FULL reconciliation** — make reviewer form, search, facets, Zod schemas, and DB CHECKs all consistent and canonical. `filterDefinitions.ts` is stakeholder-gated per `src/utils/CLAUDE.md`; the *vocab* was already locked (OQ2, ratified 2026-06-12), this expansion only adds the *value-form* alignment + reviewer-control type changes, user-approved.

**THE canonical source of truth for all 6 value lists = `scripts/stage2-retag/data/smaller-fields.vocab.json`** (recon-verified BYTE-IDENTICAL to the live PROD CHECK arrays in `20260617000000_pr6c2_retag_apply.sql` §6). **COPY value spellings VERBATIM from that file — never transcribe from this plan or from memory.** Decode SQL apostrophe-doubling (`Indigenous Peoples'' Month` → `Indigenous Peoples' Month`); use the JSON, not the .sql. Canonical forms: academic_integration(6 Title), social_emotional_learning(5 Title), core_competencies(6 Title), cooking_methods(3 **kebab**: basic-prep/stovetop/oven), observances_holidays(16), garden_skills(24 **Title-Case**, = configured 22 + `Stewardship tasks` + `Sensory exploration`).

- **E2a — Zod/enum/schema closing (the canonical-vocab contract).** In `src/types/lessonMetadata.zod.ts`: add `<FIELD>_VALUES as const` + `<Field>Enum = z.enum(...)` for the 6 fields (mirror the 4 existing closed enums at lines 37-68); change the 6 open `z.array(z.string())` fields (lines ~97-107) to `z.array(<Field>Enum)`; **academicIntegration is a union (object OR array) — close ONLY the array branch, preserve the object branch** (lines 75-80). In `scripts/generate-enums-json.ts`: add the 6 imports + 6 `enums`-object keys (the generator is HAND-WIRED — new exports don't auto-flow). Run `npm run generate:enums` → `src/types/generated/enums.json` gains exactly the 6 keys. Mirror all 6 enum closings VERBATIM into `supabase/functions/_shared/metadataSchemas.ts` (lessonMetadata side). Clean stale Python-mechanism comments: `scripts/generate-enums-json.ts:6-7` ("Pydantic models (Stage 2 batch host repo)") + `lessonMetadata.zod.ts:23-27` ("Pydantic mirrors") + update the now-outdated closed-enum-coverage / "fields stay open" prose (lessonMetadata.zod.ts:14-21). Update guardrail tests: `src/types/generated/enums.json.test.ts` (asserts "exactly four keys" → now 10) + `src/types/edgeSharedSchemas.equivalence.test.ts` (fix non-canonical fixtures `cookingMethods:['Stovetop']`→`['stovetop']`, `coreCompetencies:['Cooking']`→canonical; add value-list equality assertions for the 6 new enums). **`lessonMetadataSchema` safety — VERIFIED SAFE TO CLOSE (Session 21).** Runtime consumers: `process-submission/index.ts:414,512` (CRF + activity-type auto-tag) `safeParse` drafts that contain ONLY already-closed fields (`culturalResponsivenessFeatures`, `activityType`) — never the 6 fields, and on failure they only `console.error` (no write blocked); `reviewMetadataInit.ts:9` `computeInitialMetadataFromAiDraft` returns `null`→empty form on failure (graceful). No auto-tagger populates the 6 fields (teacher-zero-metadata). Worst case = an old `ai_draft_metadata` JSONB holding a non-canonical 6-field value degrades gracefully to an empty reviewer form. So closing the 6 enums blocks no write and crashes nothing. The review *submission* path is the real gate, via `reviewFormPayloadSchema` (closed in E2b).
- **E2b — UI + reviewer-entry layer emits canonical values.** In `src/utils/filterDefinitions.ts`: `cookingMethods` options → `value` canonical kebab (`basic-prep`/`stovetop`/`oven`), `label` human (`Basic prep`/`Stovetop`/`Oven`) [fixes facet badge + reviewer save]; `gardenSkills` options → `value` = canonical Title-Case (value=label) AND add the 2 missing (`Stewardship tasks`, `Sensory exploration`) = 24; `observancesHolidays` → `type:'creatable'`→`'multiple'`, drop the duplicate `End of year` option (keep `End of year celebrations`) = fixed 16. In `src/components/.../ReviewDetail.tsx`: ensure the reviewer controls for the 3 affected fields emit canonical values — `garden_skills` + `observances_holidays` change from `CreatableSelect` (free-text) to a non-creatable `Select` (mirror the CRF pattern ~line 1099) so reviewers can't enter off-vocab values that the CHECK rejects; verify cooking_methods pill + reopen-display map stored canonical values to selected options (the `value`-match round-trip — same failure mode documented for activityType at ReviewDetail ~116-130). Close the **review-submission** schema enums to match: `src/types/reviewFormPayload.zod.ts` + the edge mirror `reviewFormPayloadSchema` in `_shared/metadataSchemas.ts` (both copies, lock-step — the equivalence test enforces). Update/extend reviewer-form + facet tests (`facetCounts.test.ts:55,78`, `reviewToLessonMapper.test.ts:51,64`) to canonical values; add a reviewer-submission test asserting canonical-accept / off-vocab-reject. **Do NOT touch the adjacent PR-F fields `cookingSkills` / `mainIngredients` in `METADATA_CONFIGS`.**
- **E2 verification:** `npm run generate:enums` (clean regen, 6 new keys); `npx vitest run src/types/edgeSharedSchemas.equivalence.test.ts src/types/generated/enums.json.test.ts`; `npm run test` (full suite); `npm run type-check && npm run lint`. Confirm no remaining `z.array(z.string())` open-form for the 6 fields in any of the 4 schema copies; confirm filterDefinitions value-forms === smaller-fields.vocab.json for all 6.

- E3 Track close-out: initiative retrospective per kickoff session-end ritual; update foundation status doc Current State; lift follow-ups to memory.

## PR F (rider, deferred) — second pass

**Vocab DECIDED 2026-06-12** — the mini-worksheet was decided in an in-session user
walkthrough instead of going to the team (user choice: skip the team entirely; the
`guyanese` question resolved Both). Decision record:
`docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
— cooking_skills 23 entries (incl. a consolidated general **Knife skills** absorbing
the five specific cuts + knife safety); main_ingredients 24 groups + **two-level**
group/specifics tagging (34 starter specifics; Potatoes under Root vegetables;
no "Other" catch-all). PR F = vocab module extension (incl. two-level parent mapping,
a NEW shape the vocab module doesn't carry yet) → miniature B/C cycle (answer-key
delta optional, diff + user gate + apply migration). User confirmed two-rounds
(NOT folded into the 12-field main pass) 2026-06-12. Unblocked; not a blocker for E.

---

## Test plan

Locked (design §6): TDD for A3/A5/A7 modules; dry-run before full run; 100% post-repair Zod-pass required before apply artifacts; Protocol A gates the full run, Protocol B + user sign-off gates the apply; `npm run type-check && npm run lint` (now incl. the scripts surface) every session; `npm run test:rls` on every migration PR; PROD MCP verbatim-identifier probes after every PROD apply.
