/**
 * T4 dedup sweep — evidence-deck fan-out (one Sonnet 4.6 agent per group).
 *
 * Reads `docs/plans/t4-dedup/candidates.json` + the local corpus export, builds
 * one fully self-contained prompt per candidate group (deck-prompt.ts), and runs
 * each through an independent headless `claude -p` agent PINNED to
 * `claude-sonnet-4-6` (user directive 2026-07-02 — NOT the `sonnet` alias, which
 * is Sonnet 5). Agents get no DB and no file access; each returns ONLY a JSON
 * verdict, validated with zod. Collection is entirely script-side — no agent
 * output flows through the orchestrator's conversation.
 *
 * Output:
 *   docs/plans/t4-dedup/deck.json        (committed) — collected verdicts
 *   scripts/dedup-sweep/artifacts/deck-raw/<group>.json (gitignored) — raw envelopes
 *
 * The script hard-fails (STOP) if: the pinned model is not the one that ran,
 * >10% of agents fail schema validation after one retry, or a mechanical check
 * (retire_duplicate below the content floor / survivor not in group) is still
 * violated after a re-run.
 *
 * Usage:  npx tsx scripts/dedup-sweep/run-deck.ts
 */
/* eslint-disable no-console -- CLI script: console output is the operator UI */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { buildDeckPrompt, type CandidateGroup, type CorpusBody } from './deck-prompt';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '..', '..');
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.json');
const RAW_DIR = path.join(ARTIFACTS_DIR, 'deck-raw');
const CANDIDATES_PATH = path.join(REPO_ROOT, 'docs', 'plans', 't4-dedup', 'candidates.json');
const DECK_JSON_PATH = path.join(REPO_ROOT, 'docs', 'plans', 't4-dedup', 'deck.json');

// A clean working directory for the spawned agents, created OUTSIDE the repo:
// `claude` walks up the directory tree loading CLAUDE.md files, so an in-repo cwd
// would reload the project context every call. A tmp dir keeps the repo
// CLAUDE.md / skills / MCP out of each sub-session (the prompt is
// self-contained), cutting per-call overhead ~3×.
const AGENT_CWD = mkdtempSync(path.join(os.tmpdir(), 'dedup-deck-'));

const MODEL = 'claude-sonnet-4-6';
const CONCURRENCY = 6;
const TIER_B_MIN = 0.75; // no retire_duplicate below this group-max content_sim
const SCHEMA_FAIL_STOP_RATIO = 0.1;

const verdictSchema = z.object({
  whats_the_same: z.string().min(1),
  whats_different: z.string().min(1),
  recommended_verdict: z.enum(['retire_duplicate', 'keep_family', 'unrelated']),
  family_type: z
    .enum(['grade-band', 'mobile-ed', 'series-part', 'same-dish-different-lesson', 'other'])
    .nullable(),
  survivor_lesson_id: z.string().nullable(),
  survivor_why: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
});
type Verdict = z.infer<typeof verdictSchema>;

interface DeckEntry extends Verdict {
  group_id: string;
}

// ---------------------------------------------------------------------------
// One agent call
// ---------------------------------------------------------------------------

interface AgentResult {
  ok: boolean;
  verdict?: Verdict;
  rawResult?: string;
  model?: string;
  error?: string;
}

function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

function runClaudeAgent(prompt: string): Promise<AgentResult> {
  return new Promise((resolve) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--model',
        MODEL,
        '--output-format',
        'json',
        '--strict-mcp-config',
        '--disallowed-tools',
        'Bash Edit Write Read Task WebFetch WebSearch Glob Grep NotebookEdit',
      ],
      { cwd: AGENT_CWD, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => resolve({ ok: false, error: `spawn error: ${e.message}` }));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({ ok: false, error: `claude exit ${code}: ${err.slice(0, 300)}` });
        return;
      }
      let envelope: {
        result?: string;
        is_error?: boolean;
        modelUsage?: Record<string, unknown>;
      };
      try {
        envelope = JSON.parse(out);
      } catch {
        resolve({ ok: false, error: `unparseable envelope: ${out.slice(0, 200)}` });
        return;
      }
      const models = Object.keys(envelope.modelUsage ?? {});
      const model = models.join(',');
      if (envelope.is_error) {
        resolve({ ok: false, rawResult: envelope.result, model, error: 'agent is_error' });
        return;
      }
      const jsonStr = extractJsonObject(envelope.result ?? '');
      if (!jsonStr) {
        resolve({ ok: false, rawResult: envelope.result, model, error: 'no JSON object found' });
        return;
      }
      const parsed = verdictSchema.safeParse(normalizeVerdictKeys(tryJson(jsonStr)));
      if (!parsed.success) {
        resolve({
          ok: false,
          rawResult: envelope.result,
          model,
          error: `schema: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
        });
        return;
      }
      resolve({ ok: true, verdict: parsed.data, rawResult: envelope.result, model });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Parse a JSON string, returning a sentinel object on failure so the zod
 *  layer produces the readable error rather than a throw. */
function tryJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { __parse_error__: true };
  }
}

/** Remap the handful of key aliases Sonnet occasionally emits (e.g. dropping
 *  "the" from `whats_the_same`) onto the canonical schema keys before
 *  validation. Only obvious synonyms — anything unmapped still fails loudly. */
function normalizeVerdictKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  const aliases: Record<string, string> = {
    whats_same: 'whats_the_same',
    what_is_the_same: 'whats_the_same',
    what_the_same: 'whats_the_same',
    same: 'whats_the_same',
    whats_the_difference: 'whats_different',
    what_is_different: 'whats_different',
    whats_diff: 'whats_different',
    different: 'whats_different',
    verdict: 'recommended_verdict',
    recommendation: 'recommended_verdict',
    survivor: 'survivor_lesson_id',
    survivor_id: 'survivor_lesson_id',
    survivor_reason: 'survivor_why',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[aliases[k] ?? k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const candidates: { groups: CandidateGroup[] } = JSON.parse(
    readFileSync(CANDIDATES_PATH, 'utf8')
  );
  const corpus: CorpusBody[] = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
  const bodies = new Map<string, CorpusBody>();
  for (const rec of corpus) bodies.set(rec.lesson_id, rec);

  const allGroups = candidates.groups;
  // Selection modes:
  //  DECK_ONLY=id,id  → re-run just these groups and MERGE into the existing
  //                     deck.json (the retry-once-then-STOP flow for violations).
  //  DECK_LIMIT=N     → run the first N groups only (smoke test, no merge).
  const onlyEnv = process.env.DECK_ONLY;
  const limitEnv = process.env.DECK_LIMIT;
  const merge = Boolean(onlyEnv);
  let groups: CandidateGroup[];
  if (onlyEnv) {
    const wanted = new Set(
      onlyEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    groups = allGroups.filter((g) => wanted.has(g.group_id));
    const notFound = [...wanted].filter((id) => !groups.some((g) => g.group_id === id));
    if (notFound.length > 0) {
      throw new Error(`DECK_ONLY ids not found in candidates.json: ${notFound.join(', ')}`);
    }
  } else if (limitEnv) {
    groups = allGroups.slice(0, Number.parseInt(limitEnv, 10));
  } else {
    groups = allGroups;
  }
  console.log(
    `🔄 Deck fan-out: running ${groups.length}${
      merge
        ? ` (DECK_ONLY re-run, merging into ${allGroups.length})`
        : limitEnv
          ? ` (of ${allGroups.length}, DECK_LIMIT)`
          : ''
    } groups → ${MODEL} (concurrency ${CONCURRENCY})`
  );
  console.log(`   agent cwd: ${AGENT_CWD}`);

  mkdirSync(RAW_DIR, { recursive: true });

  const runGroup = async (
    group: CandidateGroup
  ): Promise<{ group: CandidateGroup; res: AgentResult }> => {
    const prompt = buildDeckPrompt(group, bodies);
    let res = await runClaudeAgent(prompt);
    if (!res.ok) {
      // One retry on failure (schema/parse/transient).
      res = await runClaudeAgent(prompt);
    }
    writeFileSync(
      path.join(RAW_DIR, `${group.group_id}.json`),
      JSON.stringify(
        {
          group_id: group.group_id,
          model: res.model,
          ok: res.ok,
          error: res.error,
          raw: res.rawResult,
        },
        null,
        2
      )
    );
    if (res.model && res.model !== MODEL) {
      throw new Error(
        `MODEL PIN VIOLATION on ${group.group_id}: ran on "${res.model}", expected "${MODEL}" — STOP`
      );
    }
    return { group, res };
  };

  let done = 0;
  const outcomes = await pool(groups, CONCURRENCY, async (group) => {
    const r = await runGroup(group);
    done += 1;
    if (done % 10 === 0 || done === groups.length) {
      console.log(`   ${done}/${groups.length} agents complete`);
    }
    return r;
  });

  const failures = outcomes.filter((o) => !o.res.ok);
  const failRatio = failures.length / groups.length;
  console.log(
    `\nAgents ok: ${groups.length - failures.length}/${groups.length}, failed: ${failures.length}`
  );
  for (const f of failures) console.log(`   ✗ ${f.group.group_id}: ${f.res.error}`);
  if (failRatio > SCHEMA_FAIL_STOP_RATIO) {
    throw new Error(
      `${failures.length}/${groups.length} agents failed (> ${SCHEMA_FAIL_STOP_RATIO * 100}%) after one retry — STOP and report`
    );
  }

  // Assemble deck entries (group_id assigned script-side, not trusted from agent).
  const newEntries: DeckEntry[] = [];
  for (const o of outcomes) {
    if (o.res.ok && o.res.verdict) {
      newEntries.push({ group_id: o.group.group_id, ...o.res.verdict });
    }
  }

  // In DECK_ONLY mode, merge the re-run verdicts over the existing deck.
  let deck: DeckEntry[];
  if (merge) {
    const existing: { deck: DeckEntry[] } = JSON.parse(readFileSync(DECK_JSON_PATH, 'utf8'));
    const map = new Map(existing.deck.map((e) => [e.group_id, e]));
    for (const e of newEntries) map.set(e.group_id, e);
    deck = [...map.values()];
  } else {
    deck = newEntries;
  }

  // Mechanical checks (scripted, not eyeballed) run over the set that SHOULD be
  // in the deck: the full candidate set for full/merge runs, the subset for a
  // DECK_LIMIT smoke.
  const checkGroups = merge || !limitEnv ? allGroups : groups;
  const byGroupId = new Map(allGroups.map((g) => [g.group_id, g]));
  const violations: string[] = [];
  for (const entry of deck) {
    const g = byGroupId.get(entry.group_id);
    if (!g) {
      violations.push(`${entry.group_id}: no matching candidate group`);
      continue;
    }
    if (entry.recommended_verdict === 'retire_duplicate') {
      if (g.max_content_sim < TIER_B_MIN) {
        violations.push(
          `${entry.group_id}: retire_duplicate but group max overlap ${Math.round(g.max_content_sim * 100)}% < ${TIER_B_MIN * 100}%`
        );
      }
      if (!entry.survivor_lesson_id) {
        violations.push(`${entry.group_id}: retire_duplicate with no survivor_lesson_id`);
      } else if (!g.members.some((m) => m.lesson_id === entry.survivor_lesson_id)) {
        violations.push(`${entry.group_id}: survivor ${entry.survivor_lesson_id} not in group`);
      }
    }
    if (entry.recommended_verdict === 'keep_family' && !entry.family_type) {
      violations.push(`${entry.group_id}: keep_family with no family_type`);
    }
  }
  const missing = checkGroups.filter((g) => !deck.some((d) => d.group_id === g.group_id));
  for (const g of missing) violations.push(`${g.group_id}: no deck entry produced`);

  console.log(
    `\nMechanical checks: ${violations.length === 0 ? 'clean ✓' : `${violations.length} violation(s)`}`
  );
  for (const v of violations) console.log(`   ⚠️  ${v}`);

  // Write deck.json regardless so the retry-once-then-STOP flow can inspect it,
  // but exit non-zero on unresolved violations so the operator STOPs.
  deck.sort((a, b) => (a.group_id < b.group_id ? -1 : 1));
  const summary = {
    total: deck.length,
    retire_duplicate: deck.filter((d) => d.recommended_verdict === 'retire_duplicate').length,
    keep_family: deck.filter((d) => d.recommended_verdict === 'keep_family').length,
    unrelated: deck.filter((d) => d.recommended_verdict === 'unrelated').length,
  };
  writeFileSync(
    DECK_JSON_PATH,
    `${JSON.stringify({ model: MODEL, generated_agents: deck.length, summary, violations, deck }, null, 2)}\n`
  );
  console.log(
    `\n✅ Wrote ${deck.length} verdicts to ${DECK_JSON_PATH}\n   ` +
      `retire_duplicate=${summary.retire_duplicate}  keep_family=${summary.keep_family}  unrelated=${summary.unrelated}`
  );

  if (violations.length > 0) {
    console.error(
      '\n❌ Mechanical violations remain — inspect deck.json + deck-raw, re-run offenders, then STOP if still violating.'
    );
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  console.error('❌ Deck fan-out failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
