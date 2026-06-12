#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Live token-mass preflight for the Stage 2 re-tag cached prefix (impl-plan
 * A5 guard): measures the system prompt + monolithic `submit_tags` tool via
 * the API's `count_tokens` endpoint and runs two guards:
 *
 *   1. Budget ceiling — fails (exit 1) if the mass exceeds the ~10K-token
 *      budget (stop and reassess the cost projection).
 *   2. Cache floor — prefixes below the model family's minimum cacheable
 *      length silently don't cache (`cache_control` no-ops, every call pays
 *      full input price, the cost projection is invalid). Below floor + 5%
 *      margin this FAILS (exit 1) for opus-family models and WARNS for
 *      sonnet. When the live call is unavailable (offline / zero credits),
 *      both guards fall back to the static chars/4 estimate.
 *
 * Run (task A8, one command):
 *
 *   npx tsx scripts/stage2-retag/preflight-token-mass.ts
 *
 * Uses ANTHROPIC_CONSOLE_API_KEY from `.env.local` — NOT ANTHROPIC_API_KEY,
 * which is the CLIProxyAPI proxy-side key and 401s against the direct API
 * (Session-1 finding). Single attempt, no retries: safe against a
 * zero-credit Console account.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { pathToFileURL } from 'node:url';

import {
  DEFAULT_MODEL,
  OPUS_MIN_CACHEABLE_PREFIX_TOKENS,
  SONNET_MIN_CACHEABLE_PREFIX_TOKENS,
  TOKEN_MASS_BUDGET_TOKENS,
  buildSubmitTagsTool,
  buildTokenCountRequest,
  estimateTokenMass,
  loadSystemPrompt,
} from './schema';
import { loadVocab } from './vocab';

dotenv.config({ path: '.env.local' });

/** Tiny fixed body: the preflight measures the cached prefix, not a lesson. */
const SAMPLE_BODY = '(preflight sample body)';

/** Safety margin over the cacheable floor (estimates are not exact). */
export const CACHE_FLOOR_MARGIN = 1.05;

export interface CacheFloorVerdict {
  level: 'pass' | 'warn' | 'fail';
  /** The model family's cacheable floor (null when the family is unknown). */
  floor: number | null;
  /** floor + 5% margin — the value the estimate must meet (null when unknown). */
  threshold: number | null;
  message: string;
}

/**
 * Compares a prefix token estimate against the model family's minimum
 * cacheable length + 5% margin. Below the threshold: FAIL for opus-family
 * models (the run's economics assume cache reads), WARN for sonnet.
 * Unknown families pass with a check-manually note.
 */
export function assessCacheFloor(model: string, prefixTokens: number): CacheFloorVerdict {
  const family = model.includes('opus') ? 'opus' : model.includes('sonnet') ? 'sonnet' : null;
  if (family === null) {
    return {
      level: 'pass',
      floor: null,
      threshold: null,
      message: `no cache-floor data for model ${model} — check the prompt-caching docs manually.`,
    };
  }
  const floor =
    family === 'opus' ? OPUS_MIN_CACHEABLE_PREFIX_TOKENS : SONNET_MIN_CACHEABLE_PREFIX_TOKENS;
  const threshold = Math.ceil(floor * CACHE_FLOOR_MARGIN);
  if (prefixTokens >= threshold) {
    return {
      level: 'pass',
      floor,
      threshold,
      message: `prefix ~${prefixTokens} tokens clears the ${family} cacheable minimum (${floor} + 5% margin = ${threshold}).`,
    };
  }
  return {
    level: family === 'opus' ? 'fail' : 'warn',
    floor,
    threshold,
    message:
      `prefix ~${prefixTokens} tokens is below the model's cacheable minimum + 5% margin ` +
      `(${floor} + 5% = ${threshold}) — cache_control silently no-ops below the floor ` +
      '(cache_creation_input_tokens stays 0), every call pays full input price, and the ' +
      'cost projection is invalid.',
  };
}

/**
 * Runs one `count_tokens` call over the exact run-call shape and returns the
 * measured input tokens (prompt + tool + the tiny sample body).
 */
export async function preflightTokenMass(): Promise<number> {
  const apiKey = process.env.ANTHROPIC_CONSOLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_CONSOLE_API_KEY missing from .env.local (do NOT use ANTHROPIC_API_KEY — ' +
        'it is the CLIProxyAPI proxy-side key and 401s against the direct API).'
    );
  }
  // maxRetries: 0 — exactly one attempt, never loop against the account.
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const response = await client.messages.countTokens(
    buildTokenCountRequest(loadVocab(), SAMPLE_BODY)
  );
  return response.input_tokens;
}

async function main(): Promise<void> {
  const prompt = loadSystemPrompt();
  const tool = buildSubmitTagsTool(loadVocab());
  const staticEstimate = estimateTokenMass(prompt, tool);
  console.log(`Static estimate (chars/4, prompt + serialized tool): ~${staticEstimate} tokens`);

  let measured: number | null = null;
  try {
    measured = await preflightTokenMass();
    console.log(`count_tokens measured (prompt + tool + tiny sample body): ${measured} tokens`);
  } catch (error) {
    console.warn(
      `count_tokens unavailable (${error instanceof Error ? error.message : String(error)}) — ` +
        'falling back to the static estimate for both guards.'
    );
  }
  const prefixEstimate = measured ?? staticEstimate;
  const basis = measured !== null ? 'measured' : 'static estimate, offline';

  if (prefixEstimate >= TOKEN_MASS_BUDGET_TOKENS) {
    console.error(
      `Token mass ${prefixEstimate} (${basis}) exceeds the ~${TOKEN_MASS_BUDGET_TOKENS}-token ` +
        'budget (impl-plan A5) — STOP and reassess the cost projection before any run.'
    );
    process.exit(1);
  }
  console.log(`Token-mass guard PASSED (budget ~${TOKEN_MASS_BUDGET_TOKENS}, ${basis}).`);

  const verdict = assessCacheFloor(DEFAULT_MODEL, prefixEstimate);
  if (verdict.level === 'fail') {
    console.error(`Cache-floor guard FAILED for ${DEFAULT_MODEL} (${basis}): ${verdict.message}`);
    process.exit(1);
  }
  if (verdict.level === 'warn') {
    console.warn(`Cache-floor WARNING for ${DEFAULT_MODEL} (${basis}): ${verdict.message}`);
  } else {
    console.log(`Cache-floor guard PASSED for ${DEFAULT_MODEL} (${basis}): ${verdict.message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error('Preflight failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
