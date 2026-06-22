# Stage 2 Re-tag Mechanism — Exploration

> ## EXPLORATORY — NOT LOCKED — NOT A DECISION
>
> This document is a conversation artifact. It captures findings from a 2026-05-13 user-driven exploration of two questions:
>
> 1. Whether `claude -p` (Claude Code's non-interactive print mode) has any role in the Stage 2 corpus re-tag.
> 2. Whether the locked Stage 2 mechanism — "Anthropic SDK + Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`" (implementation plan line 11; PR 6+ approach line 861) — should be reopened.
>
> **Nothing here is decided.** Locked decisions (foundation D1–D9; Stage 1 D-C1–D-C15) remain in force. This doc recommends one of those locked decisions be reopened with new concrete evidence; it does **not** pre-decide the replacement.
>
> When the foundation phase reaches the Stage 2 planning point (after Stage 1 heritage + concepts curriculum-team fills complete), this doc is intended as prior reading for a stakeholder walkthrough — similar to how the schema-simplification investigation reports informed Session 77's concepts methodology design.

**Date:** 2026-05-13 (initial); 2026-05-14 (Codex review-round-1 findings integrated — see revision note below)
**Voices in the exploration:** Daniel Feder (user), Claude (Opus 4.7 in Claude Code, this assistant), Codex (in a parallel session the user ran), Hermes (in a parallel session the user ran)
**Status doc impact:** None. This doc does not update foundation or Stage 1 status docs. Foundation-phase code track still has no unblocked next PR; Stage 2 (PR 6+) remains gated on Stage 1 outputs.

**Revision note (2026-05-14).** Codex reviewed the 2026-05-13 draft and surfaced six findings. All six were accepted: §1 `claude -p` flag-surface verified live and caveat tightened; §2 `--max-budget-usd` mention added; §4 Q1 reframed from call-count to token-economics with cache dynamics; §4 Q3 body-source factually corrected (`lessons.content_text` is the single source at 100% coverage per Session 23 archive line 1146; the earlier draft's `lesson_versions.original_content` reference was wrong — that column does not exist); §4 added a TypeScript verification gap note (`scripts/**` is excluded from `tsconfig.json:29` and `eslint.config.js:18`); §5 prerequisites added items 7 (Batch API retention) and 8 (pre-walkthrough token-economics estimate); F6 discoverability — user chose belt-and-braces, so a one-line EXPLORATORY breadcrumb pointer was added to the foundation execution status doc's PR 6+ line in addition to the memory entries. Auto-memory + breadcrumb together preserve the orientation pathway for future-me when Stage 2 planning opens.

---

## About this doc

This is the conversation output of a single exploratory session. The user asked, in plain terms: *Could `claude -p` be useful for re-tagging lessons?* That question opened into a wider review of the Stage 2 mechanism lock.

Three structurally independent voices participated:

- **Claude** (this assistant) — primary investigator; ran the file reads, citations, and triangulation
- **Codex** — separate session the user ran in parallel; surfaced the load-bearing repo citations
- **Hermes** — separate session the user ran in parallel; framed the interactive-vs-batch mental model

The user explicitly directed Claude to treat the other voices the way bot PR reviewers are treated: investigate each non-obvious claim, accept what holds up against evidence, push back with rebuttal where it doesn't.

What this doc **is**: a durable reference for the eventual Stage 2 planning conversation, capturing what's been triangulated and what's still open.

What this doc **is not**: a plan amendment, a decision, a commit to any specific mechanism, or a status update. The implementation plan (`docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md`) is unchanged. The Stage 2 PR 6+ approach is unchanged.

---

## §1 — Does `claude -p` belong as the bulk re-tag mechanism?

### What `claude -p` actually is

`claude -p "prompt"` (also `claude --print`) is Claude Code's non-interactive mode. Instead of opening an interactive session, you hand it a prompt as a CLI argument or via stdin, the agent loop runs (model + tools + hooks + MCP + permissions), and it prints results then exits. It is the same Claude Code, but invocable from a shell command and built to be scripted.

Familiar surfaces (Claude's training-time knowledge, not live-verified):
- `--output-format json` for parseable output
- `--max-turns N` to cap the agent loop
- `--allowedTools` / `--disallowedTools` for tool sandboxing
- `--resume <session>` for stateful operations
- Billing follows the Claude Code configuration (Max subscription / API key)

**Flag surface verified 2026-05-14** via local `claude --help` (`/Users/danfeder/.local/bin/claude`). All flags Codex named exist and are documented:

- `--bare` — "Minimal mode: skip hooks, LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, and CLAUDE.md auto-discovery. Sets `CLAUDE_CODE_SIMPLE=1`. Anthropic auth is strictly `ANTHROPIC_API_KEY` or `apiKeyHelper`. Explicitly provide context via `--system-prompt[-file]`, `--add-dir`, `--mcp-config`, `--settings`, `--agents`."
- `--tools` — "Specify the list of available tools from the built-in set. Use `''` to disable all tools, `'default'` to use all tools, or specify tool names (e.g. `'Bash,Edit,Read'`)."
- `--json-schema <schema>` — "JSON Schema for structured output validation."
- `--no-session-persistence` — "Disable session persistence — sessions will not be saved to disk and cannot be resumed (only works with `--print`)."
- `--output-format <format>` — text / json / stream-json (only works with `--print`).
- `--max-turns N` — caps the agent loop.
- `--max-budget-usd <amount>` — "Maximum dollar amount to spend on API calls (only works with `--print`)." Built-in spend cap; relevant for §2 periphery work.
- `--allowedTools` / `--disallowedTools` — comma/space-separated tool allowlist or denylist.
- `--resume` / `--session-id` — stateful operations.

The flag surface is established and stable. The earlier exploration draft (2026-05-13) treated some of these as speculative; that caveat is removed.

### The question

For the ~749-lesson bulk re-tag run, should `claude -p` be the mechanism — instead of, or in addition to, the Anthropic SDK?

### Verdict: No

The bulk run cares about three things, and the SDK wins materially on all three.

| Dimension | SDK | `claude -p` |
|---|---|---|
| **Cost** | Anthropic Batch API: guaranteed 50% discount, `custom_id` per item, built for bulk async. | No batch discount. Every invocation pays full per-call cost **plus** the Claude Code system-prompt overhead. |
| **Auditability / recovery** | Per-item `custom_id`, partial-failure replay built in, raw responses storable; explicit retry semantics in SDK loops. | Each invocation is an opaque agent session; recovery is whatever the shell wrapper captured; the agent harness can make multi-turn decisions that aren't trivially logged. |
| **Determinism** | `tool_choice: { type: 'tool', name: 'submit_tags' }` with `input_schema` enum constraints — one API call, schema-shaped output. Already the pattern in `process-submission/index.ts:368-398` (running in PROD). | Agent loop with possible tool use, possible multi-turn deliberation, possible inconsistent self-correction across invocations. |

Codex and Hermes both converged on the same conclusion in their parallel sessions. Hermes's "long runs are harder to recover cleanly" warning, on inspection, applies more to `claude -p` loops than to Batch API runs (which were the implicit subject of Hermes's caution).

For the bulk run, `claude -p` is the wrong tool. The lock is correct on this dimension.

### Where `claude -p` would have to win, but doesn't

For the lock to be wrong, `claude -p` would have to be materially better at something the SDK can't match. Three candidates surfaced in the exploration:

- **Multi-step per-lesson reasoning** (read body → consult neighbor lessons → check worksheets → emit). Real value — but this is **periphery work** (spot-check / reviewer-validation), not the bulk run. See §2.
- **MCP / tool ecosystem inside each invocation.** Real value for periphery. Anti-feature for bulk (non-determinism, audit holes).
- **Developer ergonomics.** Small. The plan budgets 1-2 sessions of pipeline engineering specifically to amortize the SDK mental-model cost (see §3 for whether this estimate holds).

None clear the bar for the bulk run.

---

## §2 — Does `claude -p` belong in the periphery?

### The question

PR 6+ (implementation plan line 863) names "Spot-check ~50-100 sampled lessons (sampling protocol TBD: random / stratified-by-activity-type / targeted-at-audit-found)" as a Stage 2 step. The sampling and validation protocol itself is open. Is `claude -p` (or interactive Claude Code) a plausible tool for that step?

### Verdict: Plausibly yes, especially for reviewer-validation depth

Where the agent loop genuinely earns its keep:

1. **Per-cluster reviewer assistance.** "Look at these 8 Indigenous-cluster lessons together and tell me whether the concepts-side `indigenous_knowledge` / `indigenous_stories` / `native_american_history` fragmentation matches heritage's §9.1 `Indigenous and Diaspora` cluster." This is an agent task, not a batch task — the back-and-forth of reading multiple files, cross-referencing worksheets, and producing structured-but-narrative output is exactly what the agent loop is good at.
2. **Adjudicating CON-NN / heritage audit signals.** The concepts audit register has 24 open `CON-NN` signals; heritage has 50 open. Each signal asks a Stage-2 question that often spans multiple lessons + cross-worksheet references. Single-shot LLM calls are weak at this shape; the agent loop with tool use is strong.
3. **Confident-but-wrong probing in spot-check.** If the v3 tagging quality was mediocre despite high confidence scores (see §3), the spot-check protocol can't rely on flagging "low-confidence cases." It needs to probe **confident-but-wrong** cases — which means reading a lesson, looking at the new tags, looking at neighbor lessons, and arguing about whether the tags actually fit. Agent-loop work.

For any of the three uses above, `claude -p`'s built-in `--max-budget-usd <amount>` flag is a natural safety mechanism — caps per-invocation spend so an agent that goes off the rails can't burn unbounded budget. Useful pairing with `--max-turns` for hard limits on both cost and loop depth.

### What it does not replace

`claude -p` does not replace the design of the eval / QA protocol itself. PR 6+ line 863 names the sampling protocol as TBD; whatever protocol is chosen, `claude -p` is one possible execution mechanism for it, not a substitute for designing it. See §4 open question 4.

### Practical caution

Both Codex and Hermes (and Claude) reasoned about `claude -p` without live verification of its current flag surface. Hermes explicitly disclosed that `claude` was not installed in their environment ("I checked this Hermes environment, and claude isn't installed here right now, so I can't demo the live command from this machine"). Codex named flags Claude could not verify from training-time knowledge. If `claude -p` is used for periphery work, the flag surface should be probed live before relying on specific affordances.

---

## §3 — Should the Python+Pydantic locked decision be reopened?

### The lock as currently written

`docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md:11`:

> *"Tech Stack: TypeScript / React 19 / Vite (frontend), Supabase / PostgreSQL (database), Deno (edge functions), Vitest + Playwright (testing), **Anthropic SDK + Pydantic (LLM tagging pipeline; Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`)**."*

Same file, lines 856-867 (PR 6+ Stage 2 corpus re-tag):

> *"Status: TBD — depends on PR 5 + Stage 1 closure. Timing intentionally flexible per Cross-cutting Scope 3.*
>
> *Approach:*
> *1. Adapt `/Users/danfeder/cCode/taggingv3/gpt_tagger/` Python infrastructure: swap OpenAI for Anthropic; extend Pydantic validators to all 17 fields.*
> *2. Run on post-drop ~749-lesson corpus.*
> *3. Spot-check ~50-100 sampled lessons (sampling protocol TBD: random / stratified-by-activity-type / targeted-at-audit-found).*
> *4. Re-tag DIFF view vs. fresh-tag review (TBD).*
> *5. Cost ~$200-300; 1-2 sessions of pipeline engineering."*

### The smoking gun (Codex's catch)

`src/types/lessonMetadata.zod.ts:1-28` — the canonical Zod schema's own header comment:

```typescript
/**
 * Canonical lesson metadata Zod schema (Gate B canonical source).
 *
 * Source of truth for the canonical lesson shape — consumed by
 * process-submission (LLM-draft writer in PR 2; canonical keys), data-import
 * scripts, and the Stage 2 corpus re-tag (PR 6+).
 *
 * Companion schema `reviewFormPayload.zod.ts` captures the review-form shape
 * (themes/season/location keys, single-select strings) that complete-review
 * accepts. Bidirectional mappers in `src/utils/{reviewToLesson,
 * lessonToReview}Mapper.ts` mirror the SQL translation in
 * `complete_review_atomic` (see migration 20260428000003 lines 142-167).
 *
 * Closed-enum coverage in this scaffold:
 *   - activity_type (D2 — 4 values; D2.1 retired 'both' 2026-05-06)
 *   - tags (D2 + D7 — 2 values)
 *   - season_timing (existing valid_seasons CHECK — 4 values)
 *   - cultural_responsiveness_features (D9 — 7 master-list features)
 *
 * Other vocabulary fields stay open `z.array(z.string())` until Stage 1
 * worksheets close them in PR 5+ (see design doc §5).
 *
 * Sync discipline: this file is the canonical source. `enums.json` is
 * generated from it via `scripts/generate-enums-json.ts`. SQL CHECK
 * constraints + Pydantic mirrors are hand-synced from `enums.json` with
 * `-- SOURCE: enums.json["<key>"]` comment markers. See validator
 * architecture doc Decision 6 for sync-test details.
 */
```

Two implications:

1. The schema authors **explicitly named** "the Stage 2 corpus re-tag (PR 6+)" as a future consumer of this TypeScript Zod schema. The locked PR 6+ approach (adapt Python infra) is in tension with the canonical schema's own documented consumer path.
2. The cross-language Pydantic sync discipline is **acknowledged inline as an existing maintenance cost**. Codex's "second validation authority debt" claim is not hypothetical — the project already lives with it.

### Existing in-repo Anthropic + Zod substrate

The repo has two demonstrations of the canonical pattern (Anthropic SDK + `tool_choice` schema forcing + `cache_control` prompt caching) already in TypeScript:

**`supabase/functions/process-submission/index.ts:368-398`** (running in PROD):

```typescript
const response = await anthropic.messages.create({
  model: CRF_MODEL,
  max_tokens: 1024,
  system: [
    { type: 'text', text: crfPrompt, cache_control: { type: 'ephemeral' } },
  ],
  tools: [
    {
      name: 'submit_tags',
      description:
        'Submit the selected cultural_responsiveness_features value(s) for the lesson.',
      input_schema: {
        type: 'object',
        properties: {
          selected_values: {
            type: 'array',
            items: {
              type: 'string',
              enum: [...CULTURAL_RESPONSIVENESS_FEATURE_VALUES],
            },
            uniqueItems: true,
          },
        },
        required: ['selected_values'],
      },
      cache_control: { type: 'ephemeral' },
    },
  ],
  tool_choice: { type: 'tool', name: 'submit_tags' },
  messages: [{ role: 'user', content }],
});
```

**`scripts/eval-llm-tagging-prompt.ts:149-189`** (eval harness; same pattern):

```typescript
async function callAnthropic(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  body: string,
  vocab: Vocab
): Promise<{ predicted: string[]; usage: AnthropicUsage }> {
  const toolName = vocab.mode === 'single-label' ? 'submit_tag' : 'submit_tags';
  const inputSchema =
    vocab.mode === 'single-label'
      ? {
          type: 'object' as const,
          properties: {
            selected_value: { type: 'string' as const, enum: vocab.values },
          },
          required: ['selected_value'],
        }
      : {
          type: 'object' as const,
          properties: {
            selected_values: {
              type: 'array' as const,
              items: { type: 'string' as const, enum: vocab.values },
              uniqueItems: true,
            },
          },
          required: ['selected_values'],
        };

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: [
      {
        name: toolName,
        description: `Submit the selected ${vocab.name} value(s) for the lesson.`,
        input_schema: inputSchema,
        cache_control: { type: 'ephemeral' },
      },
    ],
```

The Stage 2 bulk runner would be a sibling of `eval-llm-tagging-prompt.ts` — same call shape, more scaffolding for orchestration and persistence.

### How much of `taggingv3` actually transfers

Investigation of `/Users/danfeder/cCode/taggingv3/gpt_tagger/`:

**File inventory:**

| File / group | LOC | Role | Reusable for Anthropic+post-D4? |
|---|---|---|---|
| `lesson_processor.py` | 303 | OpenAI `chat.completions.create` + Pydantic post-validation + tenacity retry + fallback-lesson on validation failure | ~10% (retry/fallback pattern as idea; calls all rewrite) |
| `models.py` | 255 | Pydantic schemas for v2/v3 16-category taxonomy | ~20% (architecture; field defs all rewrite) |
| `prompt_builder.py` | 224 | System prompt hardcoding v2 taxonomy in English prose | ~10% (architecture; text content all rewrite) |
| `main.py` | 227 | CLI argparse + commands | ~30% (CLI shape; commands change) |
| `validator.py` | 239 | Validation orchestration | ~30% (orchestration; schemas rewrite) |
| `batch_manager.py` + `async_batch_processor.py` + `run_async_production.py` + `batch_api_helper.py` | ~1,000-1,300 (mix of measured + byte-estimated) | OpenAI Batch API integration | ~5% (Anthropic Batch API is a different shape) |
| `fix_*.py`, `analyze_*.py`, `consolidate_*.py`, `run_ab_test.py`, etc. | ~3,800 | Confidence-scoring, batch-fix, human-review-queue tooling, A/B testing | Mostly no — see "v3 calibration" below |
| **Total** | **~6,846 (`wc -l` total)** | OpenAI-coupled and v2-vocab-coupled throughout | **~15-20% reusable at the code level** |

**The coupling is structural, not surface-level:**

1. **OpenAI Batch API ≠ Anthropic Batch API.** Different JSONL request shape, different polling protocol, different result collection. The ~1,000-1,300 LOC of batch infrastructure doesn't survive an SDK swap.
2. **`response_format: {"type": "json_object"}` vs `tool_choice: {type: "tool"}` are different paradigms.** OpenAI's JSON mode lets the model emit any JSON; Pydantic catches violations after. Anthropic's `tool_choice` with `input_schema` enums constrains generation *during*. The retry/fallback logic in `lesson_processor.py` is shaped around "JSON parse fail → retry," which is much rarer and shaped differently under tool-use mode.
3. **The Pydantic schemas encode v2 taxonomy that the foundation phase has already retired.** `lessonFormat: Literal["Standalone", ...]` — but D3 dropped this field entirely. `thematicCategories` validator hardcodes 7 v2 values — but post-D4 canonicalization will replace these. Realistic update is rewriting `models.py` from scratch against post-D4 canonical vocab + post-D9 CRF.
4. **The system prompt hardcodes the v2 taxonomy in English prose.** Lines 41-202 of `prompt_builder.py` are one giant 16-category taxonomy with v2/v3 vocab. Post-Stage-1, every section gets rewritten against locked vocab from heritage + concepts + the ~8 smaller fields' worksheets that don't yet exist.

### v3 calibration: prior experiment with useful scars

User-supplied context (2026-05-13): *"the old v3 gpt-4.1 tagging was successful in some ways, it also left a lot to be desired… it did an OK job, but not a particularly great job."*

This recalibrates how `taggingv3` should be treated as reference material. **It is not a successful system to port forward.** It is a prior experiment with useful scars.

Codex's framing (verbatim):

> *"That pushes me even more toward: Do not adapt the old Python pipeline as the default host. Use this repo's TS/Zod/Anthropic pattern as the new substrate.*
>
> *Use `taggingv3` mainly for:*
> *- old outputs as a baseline to beat, not preserve*
> *- known failure cases and weird lessons to seed the eval set*
> *- prompt/rubric ideas worth selectively stealing*
> *- batch artifact/review queue shape, if any of that was operationally useful*
> *- examples of what not to do, especially overconfident weak tags, stale vocab assumptions, and fields where it looked plausible but shallow*
>
> *The north star should be: Stage 2 is not 'rerun v3 with Claude.' It is 'build the first truly canonical retag pass.'"*

Three refinements from Claude:

1. **"Beat the baseline" requires an evaluation method.** PR 6+ line 863 names the sampling protocol as TBD. "Beating v3" depends on first building that eval / spot-check protocol. The framing names what needs to fill the TBD; it does not itself fill it.
2. **Failure-case selection has hidden bias.** v3's "failures" are mostly lessons where v3 returned low confidence. If v3's confidence scores correlated poorly with actual tagging quality, then "v3-flagged-low-confidence" misses the more dangerous category: **lessons where v3 was confidently wrong.** The eval set should include random sampling + adversarial probing alongside v3-flagged failures, to catch the confident-but-wrong category.
3. **The v3 review-queue mechanism is closer to anti-pattern than reusable structure.** The v3 review queue is driven by the OpenAI confidence threshold — exactly the mechanism the v3 "mediocre" calibration calls into question. So this belongs under "what not to do," not under "structural patterns worth reusing." The new review-queue mechanism should be designed around Zod schema validation failures + reviewer-validation gates, not around model self-reported confidence.

### Does this constitute "new concrete evidence" under the kickoff rule?

The kickoff prompt's rule: *"These were settled across stakeholder walkthroughs and implementation planning. New concrete evidence can reopen them; generic 'this could be better' arguments cannot."*

The exploration surfaces five pieces of concrete evidence:

1. **The Zod schema header explicitly names Stage 2 re-tag as a TypeScript consumer.** This is a documented expectation that conflicts with the locked Python-adaptation approach.
2. **Pydantic-mirror hand-syncing is acknowledged as an existing maintenance cost in the canonical schema file.** Schema duplication is not hypothetical debt.
3. **`taggingv3` code reuse is materially lower than the lock framing implies.** ~15-20% reusable code, not "swap OpenAI for Anthropic." Realistic engineering effort is closer to 3-5 sessions than the planned 1-2.
4. **Two production-running TypeScript demonstrations of the canonical Anthropic + Zod pattern exist already** (`process-submission/index.ts:368-398`, `scripts/eval-llm-tagging-prompt.ts:149-189`). The substrate the TypeScript path would build on is mature, not greenfield.
5. **v3 output quality was mediocre.** This devalues `taggingv3` as a system to port and revalues it as a prior experiment with useful scars — which sharply weakens the case for "adapt the Python infrastructure."

These are concrete, file-cited findings. They qualify as new evidence under the kickoff rule.

### Verdict

**Reopen the lock; do not pre-decide the replacement.**

Codex's framing in plain terms: the bulk mechanism decision should probably become *"TS/Zod batch runner vs Python/Pydantic adapter,"* with Codex's current vote being TS/Zod runner and `taggingv3` mined for lessons learned rather than ported forward.

Claude's framing aligns with this verdict. Hermes's framing converges on "SDK for bulk run; `claude -p` for periphery" without going as deep into the Python-vs-TypeScript question.

What this doc does **not** do: select the replacement mechanism. That decision belongs to a stakeholder walkthrough when Stage 2 planning begins (after Stage 1 heritage + concepts curriculum-team fills land). See §5.

### Codex's proposed plan-amendment language

If the lock is reopened and the walkthrough lands on the TS/Zod direction, Codex proposed this as candidate plan text (verbatim from Codex's 2026-05-13 response):

> *"The old `taggingv3` pipeline is historical reference material only. Stage 2 should not port its prompts, validators, or confidence heuristics wholesale. It should use current canonical schemas, current worksheet vocabulary, and a fresh eval/QA protocol designed to outperform v3."*

Claude's refinement to that text (folding in the "confident-but-wrong probing" point):

> *"…a fresh eval/QA protocol designed to outperform v3, including sampling that surfaces confident-but-wrong cases, not just v3-flagged failures."*

Neither of these is plan text yet. They are candidate language for the eventual decision walkthrough.

---

## §4 — Candidate TypeScript shape (only if §3 reopens and lands on TS+Zod)

This section sketches what the replacement could look like, **conditional** on the lock being reopened and the walkthrough landing on TypeScript+Zod. It is not a proposal to skip the walkthrough.

### Proposed directory shape (Codex)

```
scripts/stage2-retag/
  export-corpus.ts       # pull 749 lessons + body text → JSONL manifest
  run-retag.ts           # read manifest → Anthropic Batch API → JSONL results
  validate-output.ts     # Zod-validate results against canonical schema
  generate-diff-report.ts # human-readable diff vs current metadata
  prepare-apply.ts       # stage to temp table for review before applying

uses:
  src/types/lessonMetadata.zod.ts   (canonical schema, already named as consumer)
  src/types/generated/enums.json    (cross-runtime enum mirror, already exists)
  Anthropic SDK tool_choice schema forcing
  JSONL raw + parsed artifacts (auditability + replay)
```

This decomposition has properties the project values:

- **Each step independently runnable, inspectable, and re-runnable.** Matches data-safety "smallest step first" priority.
- **Maps to existing `scripts/` conventions** (see `scripts/CLAUDE.md`): prod-guard via `requireNonProd` from `./lib/require-env.mjs`, batch processing patterns, validation conventions.
- **Persistable JSONL artifacts at every step** — raw responses, parsed outputs, validation logs, diffs. Audit trail without bespoke infrastructure.
- **No edge function runtime constraints** — long-running script can checkpoint, resume, pause, and apply dry-run / apply gates in ways an edge function (`process-submission`) cannot.

**Verification gap to close before implementation.** The repo's current TypeScript guardrails do not cover `scripts/**`:

- `tsconfig.json:29` declares `"include": ["src"]` — type-check skips scripts.
- `eslint.config.js:18` lists `'scripts/**'` in the top-level ignores block — lint skips scripts.

For a mission-critical bulk re-tag runner that writes corpus-wide canonical data, the eventual implementation needs a dedicated check surface — likely a `tsconfig.scripts.json` extending the base config + an ESLint override + unit tests for artifact parsing, Zod validation, diff generation, and apply prep. Existing scripts in the repo (including `scripts/eval-llm-tagging-prompt.ts` which already runs the canonical pattern) operate without these guardrails today, but the Stage 2 re-tag runner crosses a different blast-radius threshold and deserves the lift. Worth scoping at walkthrough time.

### Critical refinement: do not extend `process-submission` itself

Codex's framing (verbatim):

> *"Tiny but important nuance: I would not extend `process-submission` itself into the bulk runner. I'd extract or mirror its Anthropic-call pattern into `scripts/`, because a one-time corpus migration wants different logging, artifact storage, retry semantics, dry-run/apply gates, and rollback behavior than an edge function handling one submission at a time."*

Claude concurs. The **call shape** transfers (Anthropic SDK + `tool_choice` + `cache_control`); the **runtime** does not (edge function vs long-running orchestration script). The Stage 2 runner should be a sibling of `eval-llm-tagging-prompt.ts`, not an extension of `process-submission/index.ts`.

### Open design questions for the eventual walkthrough

If the lock is reopened and the walkthrough lands on TypeScript, these questions are still open:

**Question 1 — Per-field tagging vs monolithic 17-field response.**

Two patterns:

| Pattern | Used by | Per-lesson shape | Tradeoffs |
|---|---|---|---|
| **Per-field** (one tool call per field per lesson) | `process-submission` does this for the 3 fields it covers in PR 2 | 17 calls per lesson; **body sent 17×**; per-field system prompt + per-field tool schema (each cacheable) | Easier to debug; easier to add fields incrementally; per-field retry; tighter prompt per call; risk: body-token repetition without cache hits balloons cost |
| **Monolithic** (one tool call returning all 17 fields per lesson) | `taggingv3` does this for v2's 16 categories | 1 call per lesson; **body sent 1×**; one big system prompt with all rules + one big tool schema with all enum constraints (cacheable) | Cheaper on raw token count; one shared cache; harder to debug; one-bad-field-poisons-response risk |

**The cost driver is not call count — it's body-token economics with cache dynamics in the middle.** Call count framing (749 vs 12,733) misses what actually matters.

Token math (rough, to be sharpened at walkthrough time):

- Per call cost ≈ system prompt (cacheable, ~1-2K tokens) + lesson body (dynamic, 3-10K tokens) + tool schema (cacheable, hundreds of tokens) + output (~1K tokens)
- The body is the dynamic part — it does NOT cache across lessons. It MAY cache across rapid-fire same-lesson calls (Anthropic's ephemeral cache is ~5-min TTL).
- Per-field with body-cache hits (calls bursted within ~5 min per lesson): body paid ~1× per lesson, system prompts paid ~1× per (field × cache-window).
- Per-field WITHOUT reliable body-cache hits (e.g., serialized batch processing): body paid 17× per lesson — significantly more expensive than monolithic.
- Monolithic: body paid 1× per lesson, but the system prompt is larger (17 fields' rules) and one cache slot covers it all.
- **Batch API caching is best-effort across batch items** — the 50% discount is guaranteed, the cache hits are not. This shifts the math against per-field unless body-cache reliability can be confirmed.

Required pre-walkthrough: token-estimate per pattern × Batch API caching reality × estimated cost. The pattern decision should be data-driven, not pattern-aesthetic. Worth deciding at walkthrough time, not now.

**Question 2 — Anthropic Batch API integration.**

The Batch API offers guaranteed 50% discount on bulk async work and `custom_id`-per-item failure tracking. For a 749-lesson one-time run, this is plausibly the right tool. But the design implications cascade:

- Batch API is async — submit a batch, poll for completion. Hours-to-days latency, not seconds. So `run-retag.ts` becomes "submit batch → poll → collect results" rather than "for-each lesson → call → record."
- Batch prompt caching is best-effort across batch items (per Anthropic docs); the 50% discount is guaranteed.
- Per-item retry on partial batch failure uses `custom_id` to identify and re-submit only the failed lessons.

For the dry-run / iteration phase, synchronous SDK calls on 10-20 lessons is the right shape. For the full-corpus run, Batch API is plausibly the right shape. Worth deciding at walkthrough time.

**Question 3 — Body-content extraction quality audit.**

The earlier exploration draft framed this as a "multi-source mess" — that was wrong. Per `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md:1146` (Session 23, 2026-05-06): *"Verified lesson bodies live in `lessons.content_text` (all 772 lessons populated, 100% coverage)."* The body source is single and canonical.

Note also: the column name on the archive table is `lesson_versions.content_text`, not `lesson_versions.original_content` (which does not exist). The earlier draft conflated the body-source question with the archive-table question.

What's actually open is **freshness and quality**, not source-shape:

- The 100% coverage measurement is from 2026-05-06; by the time Stage 2 opens, rows may have been touched via the submission/review pipeline. Some `content_text` could be stale relative to the canonical Google Doc.
- "Populated" ≠ "high quality." Truncated content, control-character corruption (the v3 Python infra explicitly strips ` ` and `` from `RawTextContent`), or stub rows could exist.
- A small number of lessons may legitimately need Google Docs / `lesson_versions` fallback if `lessons.content_text` is empty / stale / truncated.

Pre-walkthrough: a freshness + quality audit of `lessons.content_text` — null counts, character-length distribution, control-character occurrences, comparison to Google Doc canonical for a random sample. `export-corpus.ts` then reads from `lessons.content_text` as the primary source, with documented fallback only for known-bad rows.

**Question 4 — Eval / QA protocol design.**

PR 6+ line 863 names the sampling protocol as TBD ("random / stratified-by-activity-type / targeted-at-audit-found"). Per §3's third refinement, the protocol should:

- Include random sampling (catches confident-but-wrong cases)
- Include v3-flagged failure cases (selection-biased but still valuable signal)
- Include adversarial probing against the open `CON-NN` (concepts) and heritage audit signals
- Define what "beat v3" means concretely (since "v3 was mediocre" without measurement just shifts the problem)

This is its own design conversation, not a side-effect of the mechanism choice.

### Where `taggingv3` fits as reference material

Per §3 v3-calibration:

| `taggingv3` artifact | Reuse role | Notes |
|---|---|---|
| Old outputs | **Baseline to beat**, not preserve | Requires §4 Q4 eval protocol |
| Known failure cases | Seed for eval set | Selection bias — see §3 refinement 2 |
| Prompts / rubrics | Selective starting points only | v2 vocab; rewrite against post-D4 canonical |
| Batch / review queue shape | **Likely anti-pattern** — see §3 refinement 3 | Confidence-threshold-driven mechanism inherits the trust problem |
| A/B test rubric | Possibly useful methodology reference | Worth a look during walkthrough |
| Cost / throughput operational data | Useful regardless of quality | Estimates calibrated against real prior run |
| Pydantic schema architecture | Useful as conceptual reference | Not as code |

The north star (Codex's framing): **Stage 2 is not "rerun v3 with Claude." It is "build the first truly canonical retag pass."**

---

## §5 — What the eventual Stage 2 re-decision walkthrough needs

If and when this exploration's recommendation is acted on (reopen the lock), the re-decision is itself a piece of work. This section names what it needs.

### Trigger

Stage 1 heritage worksheet is complete; Stage 1 concepts worksheet curriculum-team-fill integration is complete (Session 82 per current Stage 1 concepts status doc). At that point, PR 5+ (D4 canonicalization migration) becomes the immediate next foundation-phase code-track work. PR 6+ (Stage 2 re-tag) follows.

The walkthrough should happen **before PR 6+ implementation begins**, not concurrently with it. If the lock is left in place, PR 6+ executes the locked plan (Python adaptation). If the lock is reopened, PR 6+ executes a revised plan (likely TypeScript). The decision belongs before code, not during.

### Prerequisites for the walkthrough

1. **Read this doc.** It is the primary input.
2. **Re-verify `claude -p` flag surface** is still current (the 2026-05-14 flag-surface listing in §1 may have drifted by the time Stage 2 opens). If `claude -p` is intended for any periphery role per §2, also probe its actual behavior with `--bare` + `--tools ""` + `--json-schema` + `--max-budget-usd` together to confirm the strip-down works for the reviewer-validation use case.
3. **Inspect `taggingv3` sample outputs.** Pick 5-10 representative lessons from the v3 run; look at the actual tags v3 assigned; calibrate where v3 was strong, weak, and confidently wrong. This converts the user's "v3 was mediocre" calibration into specific examples — useful both for designing the eval protocol (§4 Q4) and for grounding the "what not to do" reuse category.
4. **Sketch eval / QA protocol options.** §4 Q4 is a design conversation in itself. Pre-walkthrough, sketch 2-3 candidate sampling + measurement protocols so the walkthrough can decide between them rather than start from scratch.
5. **Run a `lessons.content_text` freshness + quality audit.** §4 Q3. Per the foundation status archive (Session 23, 2026-05-06), `lessons.content_text` had 100% coverage at 772 lessons; that's 8+ days old by 2026-05-13 and rows may have been touched. Audit: null counts post-retirement-drops; character-length distribution (catches truncation); control-character occurrences (catches corruption); a random-sample spot-check vs Google Docs canonical (catches staleness). Output: a documented body-source readiness statement covering ~749 post-drop lessons.
6. **Confirm the existing `process-submission` pattern is the right call shape.** Re-read `process-submission/index.ts:368-398` and `eval-llm-tagging-prompt.ts:149-189` in the context of the post-Stage-1 canonical vocab; confirm the pattern survives unchanged into Stage 2 (likely yes) or identify what needs adjustment.
7. **Verify Anthropic Batch API data-handling policy** before opting in. Per Codex's 2026-05-13 review citing Anthropic's Batch API docs: Message Batches are not eligible for Zero Data Retention; batch request and response data may be retained for up to ~29 days. Lesson body content is curriculum material that may carry copyright + program-asset concerns; the data-safety priority says verify the retention window is acceptable before submitting 749 lesson bodies through Batch API. Alternatives if not acceptable: synchronous SDK calls (no batch discount, but standard retention applies) or a ZDR-eligible tier if available at run time. Confirm via current Anthropic docs at run time — the policy may evolve.
8. **Pre-walkthrough token-economics estimate for Q1.** §4 Q1 is data-dependent, not aesthetic. Pre-walkthrough, run a small dry-run (10-20 lessons in both per-field and monolithic shape) to capture actual input token counts, cache-hit rates, and total cost. Without this, "per-field vs monolithic" is undecidable.

### Walkthrough deliverables

1. **Decision: lock stays or lock opens.** With evidence cited.
2. **If lock opens: replacement mechanism specified.** TypeScript+Zod in `scripts/stage2-retag/` is the leading candidate per this exploration, but the walkthrough decides, not this doc.
3. **§4 Q1 decided.** Per-field vs monolithic.
4. **§4 Q2 decided.** Batch API vs synchronous SDK, with dry-run/apply phasing.
5. **§4 Q3 decided.** Body-content extraction approach.
6. **§4 Q4 decided.** Eval / QA protocol shape.
7. **Implementation plan updated.** The locked text at line 11 + lines 856-867 either stays as-is (lock not reopened) or is amended (lock reopened); the design doc is updated to capture the new decision; the decision journal records the rationale.

### What the walkthrough should not do

1. Implement code. Decisions, then code.
2. Pre-commit to mechanisms before answering §4 questions 1-4.
3. Treat `taggingv3` outputs as gold-standard reference. They are baseline-to-beat per §3 v3-calibration.
4. Skip eval-protocol design. "Beat v3" without a measurement protocol is a goal without a yardstick.

### Foundation-phase status doc treatment

Once the walkthrough completes, the foundation execution status doc gets a Current State update naming the outcome. This exploration doc remains as historical reference, similar to the schema-simplification investigation reports the concepts methodology session referenced. It does not become a status doc and does not need ongoing maintenance.

---

## Appendix A — Verbatim evidence

### A.1 — `src/types/lessonMetadata.zod.ts:1-39`

Canonical Zod schema header (full text). Source-of-truth declaration is on lines 4-6; Pydantic-mirror sync discipline is on lines 23-27.

```typescript
/**
 * Canonical lesson metadata Zod schema (Gate B canonical source).
 *
 * Source of truth for the canonical lesson shape — consumed by
 * process-submission (LLM-draft writer in PR 2; canonical keys), data-import
 * scripts, and the Stage 2 corpus re-tag (PR 6+).
 *
 * Companion schema `reviewFormPayload.zod.ts` captures the review-form shape
 * (themes/season/location keys, single-select strings) that complete-review
 * accepts. Bidirectional mappers in `src/utils/{reviewToLesson,
 * lessonToReview}Mapper.ts` mirror the SQL translation in
 * `complete_review_atomic` (see migration 20260428000003 lines 142-167).
 *
 * Closed-enum coverage in this scaffold:
 *   - activity_type (D2 — 4 values; D2.1 retired 'both' 2026-05-06)
 *   - tags (D2 + D7 — 2 values)
 *   - season_timing (existing valid_seasons CHECK — 4 values)
 *   - cultural_responsiveness_features (D9 — 7 master-list features)
 *
 * Other vocabulary fields stay open `z.array(z.string())` until Stage 1
 * worksheets close them in PR 5+ (see design doc §5).
 *
 * Sync discipline: this file is the canonical source. `enums.json` is
 * generated from it via `scripts/generate-enums-json.ts`. SQL CHECK
 * constraints + Pydantic mirrors are hand-synced from `enums.json` with
 * `-- SOURCE: enums.json["<key>"]` comment markers. See validator
 * architecture doc Decision 6 for sync-test details.
 */
import { z } from 'zod';

// =============================================================================
// Closed-enum value lists (single source of truth — also exported so
// scripts/generate-enums-json.ts can serialize them to JSON for cross-runtime
// mirrors).
// =============================================================================

export const ACTIVITY_TYPE_VALUES = ['cooking', 'garden', 'academic', 'craft'] as const;

export const TAG_VALUES = ['orientation', 'bilingual_handouts'] as const;
```

### A.2 — `supabase/functions/process-submission/index.ts:360-398`

PROD-running canonical pattern. Anthropic SDK + `tool_choice` schema forcing + `cache_control` on both system prompt and tool definition.

```typescript
        if (!anthropicKey) {
          console.warn('[CRF auto-tag] ANTHROPIC_API_KEY not configured, skipping');
        } else {
          const crfPrompt = await loadCrfPrompt();
          const anthropic = new Anthropic({ apiKey: anthropicKey });
          console.log('[CRF auto-tag] Generating draft for submission:', submission.id);
          const startTime = Date.now();

          const response = await anthropic.messages.create({
            model: CRF_MODEL,
            max_tokens: 1024,
            system: [
              { type: 'text', text: crfPrompt, cache_control: { type: 'ephemeral' } },
            ],
            tools: [
              {
                name: 'submit_tags',
                description:
                  'Submit the selected cultural_responsiveness_features value(s) for the lesson.',
                input_schema: {
                  type: 'object',
                  properties: {
                    selected_values: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [...CULTURAL_RESPONSIVENESS_FEATURE_VALUES],
                      },
                      uniqueItems: true,
                    },
                  },
                  required: ['selected_values'],
                },
                cache_control: { type: 'ephemeral' },
              },
            ],
            tool_choice: { type: 'tool', name: 'submit_tags' },
            messages: [{ role: 'user', content }],
          });
```

### A.3 — `scripts/eval-llm-tagging-prompt.ts:149-189`

TypeScript eval harness using the same canonical pattern. This script is the closest precedent for the proposed `scripts/stage2-retag/run-retag.ts`.

```typescript
async function callAnthropic(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  body: string,
  vocab: Vocab
): Promise<{ predicted: string[]; usage: AnthropicUsage }> {
  const toolName = vocab.mode === 'single-label' ? 'submit_tag' : 'submit_tags';
  const inputSchema =
    vocab.mode === 'single-label'
      ? {
          type: 'object' as const,
          properties: {
            selected_value: { type: 'string' as const, enum: vocab.values },
          },
          required: ['selected_value'],
        }
      : {
          type: 'object' as const,
          properties: {
            selected_values: {
              type: 'array' as const,
              items: { type: 'string' as const, enum: vocab.values },
              uniqueItems: true,
            },
          },
          required: ['selected_values'],
        };

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: [
      {
        name: toolName,
        description: `Submit the selected ${vocab.name} value(s) for the lesson.`,
        input_schema: inputSchema,
        cache_control: { type: 'ephemeral' },
      },
    ],
```

### A.4 — `taggingv3/gpt_tagger/models.py:39-60`

Pydantic schema encoding v2 taxonomy. Note `lessonFormat` (retired by D3), v2 thematicCategories vocab (to be canonicalized by D4), and the validator hardcoding 7 v2 values.

```python
class Metadata(BaseModel):
    """Lesson metadata containing all taxonomy categories."""
    gradeLevel: List[Literal["3K", "PK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "High School"]]
    thematicCategories: List[str] = Field(min_length=1, max_length=3)
    culturalHeritage: List[str] = Field(default_factory=list, max_length=5)
    observancesHolidays: List[str] = Field(default_factory=list)
    locationRequirements: List[Literal["Indoor", "Outdoor", "Both"]]
    seasonTiming: List[str]
    academicIntegration: AcademicIntegration = Field(default_factory=AcademicIntegration)
    socialEmotionalLearning: List[str] = Field(min_length=1)
    cookingMethods: List[str] = Field(default_factory=list)
    mainIngredients: List[str] = Field(default_factory=list)
    lessonFormat: Literal[
        "Standalone", "Multi-session unit", "Double period",
        "Single period", "Co-taught", "Remote/virtual adapted",
        "Mobile education format"
    ]
    culturalResponsivenessFeatures: List[str] = Field(min_length=1)
    gardenSkills: List[str] = Field(default_factory=list)
    cookingSkills: List[str] = Field(default_factory=list)
    coreCompetencies: List[str] = Field(min_length=1)
```

### A.5 — Implementation plan locked text

`docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md:11`:

> Tech Stack: TypeScript / React 19 / Vite (frontend), Supabase / PostgreSQL (database), Deno (edge functions), Vitest + Playwright (testing), Anthropic SDK + Pydantic (LLM tagging pipeline; Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`).

`docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md:856-867`:

> ## PR 6+ — Stage 2 corpus re-tag
>
> **Status:** TBD — depends on PR 5 + Stage 1 closure. Timing intentionally flexible per Cross-cutting Scope 3.
>
> **Approach:**
> 1. Adapt `/Users/danfeder/cCode/taggingv3/gpt_tagger/` Python infrastructure: swap OpenAI for Anthropic; extend Pydantic validators to all 17 fields.
> 2. Run on post-drop ~749-lesson corpus.
> 3. Spot-check ~50-100 sampled lessons (sampling protocol TBD: random / stratified-by-activity-type / targeted-at-audit-found).
> 4. Re-tag DIFF view vs. fresh-tag review (TBD).
> 5. Cost ~$200-300; 1-2 sessions of pipeline engineering.

---

## Appendix B — Voice attribution summary

| Voice | Strongest contributions (2026-05-13 initial round) |
|---|---|
| **Codex** | The Zod schema header citation (`src/types/lessonMetadata.zod.ts:1-28`) naming Stage 2 as a consumer — the load-bearing piece of evidence in §3. The `process-submission` + `eval-llm-tagging-prompt.ts` citations establishing the substrate maturity. The "source material, not host pipeline" reframing. The "don't extend `process-submission` itself; mirror its pattern" runtime distinction. The proposed `scripts/stage2-retag/` directory shape. The "prior experiment with useful scars" v3 framing. The candidate plan-amendment language. |
| **Hermes** | The interactive-vs-batch mental model framing for `claude -p`. Honest disclosure that `claude` was not installed in the Hermes environment ("I checked this Hermes environment, and claude isn't installed here right now, so I can't demo the live command"). Use-case taxonomy for `claude -p` (tag drafter / second-pass reviewer / gap finder / chunk processor — narrowed by Claude to second-pass reviewer + gap finder as the genuine fits). |
| **Claude** | File-citation verification (all Codex citations checked against the actual repo state). The `taggingv3` LOC inventory and coupling analysis. The "Python reuse is ~15-20%, not swap-and-extend" quantification. The "1-2 session" estimate-vs-reality challenge. The three refinements to Codex's v3-calibration: eval-method-needed, failure-case selection bias, review-queue-as-anti-pattern. The body-content extraction sub-question (initially framed incorrectly — see Codex's 2026-05-14 correction below). The per-field-vs-monolithic open design question. |

### Codex review-round (2026-05-14)

| Finding | Contribution | Disposition |
|---|---|---|
| F1 | Body source is `lessons.content_text` at 100% coverage; the earlier draft's `lesson_versions.original_content` reference is wrong (column doesn't exist). | Accepted — factual correction; §4 Q3 rewritten |
| F2 | `scripts/**` excluded from `tsconfig.json:29` type-check and `eslint.config.js:18` lint; mission-critical re-tag runner needs a dedicated check surface. | Accepted; verification-gap note added to §4 |
| F3 | All `claude -p` flags named by Codex are documented in the current CLI; the earlier draft's "Codex may have hallucinated" caveat was overcautious. | Accepted — Claude verified via local `claude --help` 2026-05-14; §1 caveat replaced with verified flag list |
| F4 | Anthropic Batch API not ZDR-eligible; data may be retained ~29 days. Data-safety priority says verify before opting in. | Accepted; §5 prerequisite added |
| F5 | Per-field vs monolithic cost driver is token economics with prompt-cache dynamics, not raw call count. | Accepted; §4 Q1 reframed |
| F6 | Status-doc breadcrumb for discoverability (pure pointer, not decision content). | Deferred to user; current state is memory-only per user's earlier session decision |

Where voices converged across both rounds: SDK / Batch API for the bulk run; `claude -p` for periphery; `taggingv3` as reference not host; the lock deserves reopening; `lessons.content_text` is the canonical body source with quality audit needed.

Where voices diverged: Hermes did not go as deep into the Python-vs-TypeScript question (focused on interactive-vs-batch). Claude added the three v3-calibration refinements that Codex hadn't surfaced. Codex's 2026-05-14 review corrected Claude's body-source error and surfaced operational specifics (flag verification, `scripts/**` coverage gap, Batch retention) that the initial Claude analysis had missed. None of the divergences indicate substantive disagreement — they reflect different depths and different review rounds.

---

## Appendix C — What this exploration explicitly did not do

To be clear about scope:

- **Did not edit** `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md`, the design doc, the decision journal, or any status doc.
- **Did not edit** any source code, migrations, package files, Supabase files, or tests.
- **Did not propose** specific code for `scripts/stage2-retag/`. The §4 sketch is conditional on the lock being reopened.
- **Did not run** any LLM calls against TEST or PROD, any database mutations, or any external API calls.
- **Did not commit** anything. The doc lands in the worktree; the user reviews; the user decides whether to commit.
- **Did not verify** the live `claude -p` flag surface. Codex named flags Claude could not confirm from training; live verification deferred to the eventual periphery-use point.
- **Did not assess** the operational characteristics of the `taggingv3` Python infra in detail (only structural / coupling analysis from file reads). The user's "v3 was mediocre" calibration was taken as input, not investigated further.

This is an exploration, not a decision. It can sit in `docs/plans/` until Stage 2 planning begins, then become the primary input to the re-decision walkthrough.
