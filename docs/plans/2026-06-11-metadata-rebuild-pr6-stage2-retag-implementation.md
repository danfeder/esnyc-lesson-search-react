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
> A **NEW heritage-filter-rebuild PR lands BEFORE the apply** (see revised table
> row C0). PR C's heritage handling changes from full-chain dual-write to
> specific-only (the other 11 fields are unchanged). **Exact tasks are authored
> in the heritage-filter-rebuild design pass (next session, brainstorming-first)
> — NO filter/apply code until that design is checkpointed.** Design-doc banner +
> execution-status pivot block hold the rationale.

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

## PR breakdown (locked OQ13 — **REVISED 2026-06-16 by the heritage pivot; C0 inserted, C amended**)

| PR | Branch | Contains | DB writes | Gate |
|---|---|---|---|---|
| A | `feat/pr6a-stage2-retag-pipeline` | Runner + check surface + dry-run ≤20 lessons | none | normal review |
| B | `feat/pr6b-stage2-retag-fullrun` | Answer key + eval scoring + full run artifacts + diff + apply artifacts + register adjudication | none | **user green-light before the full run**; "beats v3" bar |
| **C0 (NEW, heritage pivot)** | TBD (e.g. `feat/pr6c0-heritage-filter`) | **Heritage filter rebuild — tasks authored in the design pass.** Unify 3 hierarchy sources → 1 (§16 vocab); recursive `expand_cultural_heritage` in `search_lessons` RPC; UI/`filterDefinitions` alignment; retire legacy `filterConstants.CULTURAL_HIERARCHY`; E2E. **NO data change** → backward-compatible with current full-chain corpus. | PROD via CI (RPC/migration) | design checkpoint + verify on current PROD data + CI approval |
| C | `feat/pr6c-stage2-retag-apply` | Apply migration (rollback snapshot, dual-write) — **heritage stored specific-only (pivot), other 11 fields unchanged**; targeted drops U-5/U-8/U-12 via manifest; post-apply U-1 integrity assertion; Who's-Who `content_text` repair; embeddings regen | PROD via CI | user spot-check sign-off (Protocol B) + CI approval; **lands after C0 verified** |
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

## PR C — Apply + embeddings (outline; refine at cycle start; `database-migrations` skill mandatory)

> **HERITAGE PIVOT 2026-06-16:** the C1 line below still reads as full-chain dual-write — **for heritage that is now superseded by Option B (specific-only storage).** C0 (heritage filter rebuild) lands first. PR C's heritage = the run's specific tags minus the targeted drops (U-5/U-8/U-12 via manifest), stored as-is (no parent-expansion), plus a post-apply assertion that no AA/Indigenous row carries `North American`. The other 11 fields' dual-write is unchanged. Re-specify C1's heritage portion in the design pass.

- C1 Migration (single file, idempotent): create `pr6_retag_rollback` snapshotting all about-to-change rows (12 columns + metadata) → apply dual-writes from the staged data → repair Who's-Who `content_text` (body from the PR-A export artifact) → add SQL CHECK constraints for the newly locked small-field enums (AFTER data is canonical — ordering is load-bearing) → analyze.
- C2 Rehearse: `supabase db reset` locally + `npm run test:rls`; PR opens → CI applies to TEST → verify via `mcp__supabase-test__execute_sql` (TEST validates mechanics; PROD MCP validates coverage — TEST is missing rows).
- C3 Merge → user approves PROD migration in CI → **PROD MCP verification with VERBATIM identifiers copied from the migration file** (counts per field, rollback-table row count, Who's-Who body length, spot lessons from the diff). Known SASL flake: rerun pattern per memory.
- C4 Embeddings regen (existing regen script precedent): TEST first, then PROD; verify embedding count + freshness timestamps via MCP.

## PR D — `search_synonyms` population (outline)

- D1 Distill everyday↔framework pairs from the PR-B run artifacts (concepts dual-vocab output); dedupe; emit population migration (idempotent upserts).
- D2 Same TEST-verify → merge → PROD-approve → PROD MCP verify cycle. Smoke the smart-search edge function reads the new rows (PR 3a Option B path).

## PR E — Cleanup (outline; gated on C PROD-verified, per PR 5 design §4.8)

- E1 Migration: drop `pr5a_heritage_rollback` (37 rows), `pr5b_concepts_rollback` (676), `pr6_retag_rollback`, + any staging table.
- E2 Code: observances field `creatable` → fixed list; filterDefinitions updates per the vocab locks (garden-skills +2, cooking methods labels, observances 16 — End-of-year pair merged, ratified 2026-06-12); close the 6 small-field enums in `lessonMetadata.zod.ts` + regenerate `enums.json` + sync the edge `_shared/metadataSchemas.ts` mirror (equivalence test enforces); clean the stale Python-mechanism comments (`scripts/generate-enums-json.ts:6-7`, `lessonMetadata.zod.ts` sync paragraph).
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
