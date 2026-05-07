#!/usr/bin/env npx tsx
/**
 * Eval-gate harness for LLM-tagging prompts.
 *
 * Per-prompt precision/recall on a labeled hold-out before the prompt ships.
 * Spec: docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md §"Task 2.2".
 */

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import {
  computeMetrics,
  evaluateThresholds,
  type ThresholdConfig,
  type MetricsResult,
  type ThresholdResult,
  type LabelSet,
} from './lib/evalMetrics';

dotenv.config({ path: '.env.local' });

// ---- Input schemas ----

const sampleSchema = z.object({
  id: z.string(),
  body: z.string(),
  truth: z.array(z.string()),
});
const samplesSchema = z.array(sampleSchema);
type Sample = z.infer<typeof sampleSchema>;

const vocabSchema = z.object({
  name: z.string(),
  mode: z.enum(['multi-label', 'single-label']),
  values: z.array(z.string()).min(1),
});
type Vocab = z.infer<typeof vocabSchema>;

const thresholdSchema = z.object({
  macroF1: z.number().optional(),
  microF1: z.number().optional(),
  minRecallPerValue: z.number().optional(),
  minPrecisionPerValue: z.number().optional(),
  maxPredictionRateForAbsentValues: z.number().optional(),
});

const predictionSchema = z.object({
  id: z.string(),
  predicted: z.array(z.string()),
});
const predictionsSchema = z.array(predictionSchema);

// ---- Args ----

interface Args {
  prompt: string;
  samples: string;
  vocab: string;
  thresholdConfig?: string;
  output?: string;
  dryRunPredictions?: string;
  concurrency: number;
  limit?: number;
  model: string;
  baseUrl?: string;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = { concurrency: 5, model: 'claude-opus-4-7', help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--prompt':
        a.prompt = next;
        i++;
        break;
      case '--samples':
        a.samples = next;
        i++;
        break;
      case '--vocab':
        a.vocab = next;
        i++;
        break;
      case '--threshold-config':
        a.thresholdConfig = next;
        i++;
        break;
      case '--output':
        a.output = next;
        i++;
        break;
      case '--dry-run-with-predictions':
        a.dryRunPredictions = next;
        i++;
        break;
      case '--concurrency':
        a.concurrency = parseInt(next, 10);
        i++;
        break;
      case '--limit':
        a.limit = parseInt(next, 10);
        i++;
        break;
      case '--model':
        a.model = next;
        i++;
        break;
      case '--base-url':
        a.baseUrl = next;
        i++;
        break;
      case '--help':
      case '-h':
        a.help = true;
        break;
      default:
        throw new Error(`unknown flag: ${flag}`);
    }
  }
  if (a.help) return a as Args;
  for (const required of ['prompt', 'samples', 'vocab'] as const) {
    if (!a[required]) throw new Error(`--${required} is required (use --help for usage)`);
  }
  return a as Args;
}

// ---- Anthropic call ----

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

interface SamplePrediction {
  id: string;
  truth: string[];
  predicted: string[];
  error?: string;
}

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
    tool_choice: { type: 'tool', name: toolName },
    messages: [{ role: 'user', content: body }],
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === toolName) {
      const input = block.input as Record<string, unknown>;
      let predicted: string[] = [];
      if (vocab.mode === 'single-label') {
        const v = input.selected_value;
        predicted = typeof v === 'string' ? [v] : [];
      } else {
        const v = input.selected_values;
        predicted = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      }
      return { predicted, usage: response.usage as AnthropicUsage };
    }
  }
  return { predicted: [], usage: response.usage as AnthropicUsage };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

// ---- Output formatting ----

function formatMetric(v: number | null | undefined): string {
  if (v === null || v === undefined) return '   -  ';
  if (typeof v === 'number' && Number.isNaN(v)) return '  NaN ';
  return v.toFixed(3);
}

function formatSummary(result: MetricsResult, thresholdResult: ThresholdResult): string {
  const lines: string[] = [];
  lines.push(`Samples: ${result.sampleCount}`);
  lines.push('');
  lines.push('Per-value (truth-count / pred-count / TP / FP / FN  ->  P / R / F1):');
  for (const pv of result.perValue) {
    const counts = `${String(pv.truthCount).padStart(3)} / ${String(pv.predictionCount).padStart(3)} / ${String(pv.tp).padStart(3)} / ${String(pv.fp).padStart(3)} / ${String(pv.fn).padStart(3)}`;
    const metrics = `${formatMetric(pv.precision)} / ${formatMetric(pv.recall)} / ${formatMetric(pv.f1)}`;
    lines.push(`  ${pv.value.padEnd(45)} ${counts}  ->  ${metrics}`);
  }
  lines.push('');
  lines.push(
    `Macro avg : P=${formatMetric(result.macro.precision)}  R=${formatMetric(result.macro.recall)}  F1=${formatMetric(result.macro.f1)}`
  );
  lines.push(
    `Micro avg : P=${formatMetric(result.micro.precision)}  R=${formatMetric(result.micro.recall)}  F1=${formatMetric(result.micro.f1)}`
  );
  lines.push('');
  if (thresholdResult.passed) {
    lines.push('PASSED — prompt cleared eval gate.');
  } else {
    lines.push('FAILED — prompt did not clear eval gate.');
    for (const f of thresholdResult.failures) {
      lines.push(`  - ${f}`);
    }
  }
  return lines.join('\n');
}

// JSON.stringify replacer: NaN/Infinity → null (JSON-spec compliant)
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

// ---- Help text ----

const HELP = `
Eval-gate harness for LLM-tagging prompts.

Usage:
  npx tsx scripts/eval-llm-tagging-prompt.ts \\
    --prompt <path/to/prompt.md> \\
    --samples <path/to/samples.json> \\
    --vocab <path/to/vocab.json> \\
    [--threshold-config <path/to/thresholds.json>] \\
    [--output <path/to/results.json>] \\
    [--dry-run-with-predictions <path/to/predictions.json>] \\
    [--concurrency <int=5>] \\
    [--limit <int>] \\
    [--model <id=claude-opus-4-7>] \\
    [--base-url <url>]

Inputs:
  --prompt           system prompt (plain text or markdown)
  --samples          JSON array of { id, body, truth } objects
  --vocab            JSON { name, mode: "multi-label"|"single-label", values: [...] }
  --threshold-config JSON { macroF1?, microF1?, minRecallPerValue?, minPrecisionPerValue?,
                                  maxPredictionRateForAbsentValues? }
  --output           path to write metrics JSON
  --dry-run-with-predictions
                     JSON [{ id, predicted }] — skip Anthropic call (math sanity check)
  --concurrency      parallel API calls (default 5)
  --limit            only process first N samples
  --model            Anthropic model ID (default claude-opus-4-7)
  --base-url         override Anthropic SDK baseURL (e.g. http://127.0.0.1:8317/api/provider/anthropic
                     when routing through CLIProxyAPI to bill against Claude Max extra usage).
                     Do NOT include the trailing "/v1" — SDK appends "/v1/messages" itself.
                     Falls back to ANTHROPIC_BASE_URL env var if unset.

Exit code: 0 if eval gate passes; 1 if it fails or input is invalid.

Env: ANTHROPIC_API_KEY required (loaded from .env.local; not needed for --dry-run-with-predictions).
     When --base-url targets a local proxy, the key is the proxy-side API key (not the Console key).
`;

// ---- Main ----

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const promptText = readFileSync(args.prompt, 'utf8');
  const samples = samplesSchema.parse(JSON.parse(readFileSync(args.samples, 'utf8')));
  const vocab = vocabSchema.parse(JSON.parse(readFileSync(args.vocab, 'utf8')));
  const thresholds: ThresholdConfig = args.thresholdConfig
    ? thresholdSchema.parse(JSON.parse(readFileSync(args.thresholdConfig, 'utf8')))
    : {};

  const limited = args.limit ? samples.slice(0, args.limit) : samples;

  // Validate truth labels are inside the vocabulary
  for (const sample of limited) {
    for (const t of sample.truth) {
      if (!vocab.values.includes(t)) {
        throw new Error(
          `Sample ${sample.id} has truth value "${t}" not in vocabulary "${vocab.name}"`
        );
      }
    }
  }

  console.log(
    `Loaded ${limited.length} samples; vocabulary "${vocab.name}" (${vocab.mode}) has ${vocab.values.length} values.`
  );

  let predictions: SamplePrediction[];
  let totalUsage: AnthropicUsage | null = null;

  if (args.dryRunPredictions) {
    console.log(`Dry-run mode: loading predictions from ${args.dryRunPredictions}`);
    const preds = predictionsSchema.parse(JSON.parse(readFileSync(args.dryRunPredictions, 'utf8')));
    const predById = new Map(preds.map((p) => [p.id, p.predicted]));
    predictions = limited.map((s: Sample) => {
      const has = predById.has(s.id);
      return {
        id: s.id,
        truth: s.truth,
        predicted: predById.get(s.id) ?? [],
        ...(has ? {} : { error: 'no prediction provided' }),
      };
    });
  } else {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is required (set in .env.local) or pass --dry-run-with-predictions'
      );
    }
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(args.baseUrl ? { baseURL: args.baseUrl } : {}),
    });
    console.log(
      `Calling ${args.model} for ${limited.length} samples (concurrency ${args.concurrency})${args.baseUrl ? ` via ${args.baseUrl}` : ''}...`
    );

    totalUsage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };
    let done = 0;

    predictions = await mapWithConcurrency(limited, args.concurrency, async (sample: Sample) => {
      try {
        const { predicted, usage } = await callAnthropic(
          client,
          args.model,
          promptText,
          sample.body,
          vocab
        );
        totalUsage!.input_tokens += usage.input_tokens;
        totalUsage!.output_tokens += usage.output_tokens;
        totalUsage!.cache_creation_input_tokens =
          (totalUsage!.cache_creation_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
        totalUsage!.cache_read_input_tokens =
          (totalUsage!.cache_read_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
        done++;
        if (done % 10 === 0 || done === limited.length) {
          console.log(`  ${done}/${limited.length} processed`);
        }
        return { id: sample.id, truth: sample.truth, predicted };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`  sample ${sample.id} failed: ${msg}`);
        done++;
        return { id: sample.id, truth: sample.truth, predicted: [], error: msg };
      }
    });
  }

  const truthLabels: LabelSet[] = predictions.map((p) => p.truth);
  const predictedLabels: LabelSet[] = predictions.map((p) => p.predicted);
  const result = computeMetrics(predictedLabels, truthLabels, vocab.values);
  const thresholdResult = evaluateThresholds(result, thresholds);

  console.log('');
  console.log(formatSummary(result, thresholdResult));

  if (totalUsage) {
    console.log('');
    console.log(
      `Tokens: input=${totalUsage.input_tokens}  output=${totalUsage.output_tokens}  cache_create=${totalUsage.cache_creation_input_tokens}  cache_read=${totalUsage.cache_read_input_tokens}`
    );
  }

  if (args.output) {
    const errorCount = predictions.filter((p) => p.error).length;
    const output = {
      promptFile: args.prompt,
      vocabFile: args.vocab,
      model: args.dryRunPredictions ? '(dry-run)' : args.model,
      samplesProcessed: predictions.length,
      errorCount,
      vocabulary: vocab,
      metrics: result,
      thresholds,
      thresholdResult,
      tokenUsage: totalUsage,
      samples: predictions,
      completedAt: new Date().toISOString(),
    };
    ensureParentDir(args.output);
    writeFileSync(args.output, JSON.stringify(output, jsonReplacer, 2));
    console.log('');
    console.log(`Output: ${args.output}`);
  }

  return thresholdResult.passed ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
