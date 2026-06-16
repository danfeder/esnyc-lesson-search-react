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
 *
 * Optional proxy path (`--base-url <url>`): routes the count_tokens call
 * through a local CLIProxyAPI proxy (billing against Claude Max). When set,
 * the API key source switches to ANTHROPIC_API_KEY (the proxy-side key) and a
 * trailing `/v1` is stripped (the SDK appends `/v1/...`; project-memory trap).
 * Expected value: `http://127.0.0.1:8317/api/provider/anthropic`. Unset =
 * direct API + ANTHROPIC_CONSOLE_API_KEY, byte-for-byte unchanged.
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
import { normalizeBaseUrl } from './run-retag';
import { loadVocab } from './vocab';

dotenv.config({ path: '.env.local' });

/** Tiny fixed body: the preflight measures the cached prefix, not a lesson. */
const SAMPLE_BODY = '(preflight sample body)';

/** Safety margin over the cacheable floor (estimates are not exact). */
export const CACHE_FLOOR_MARGIN = 1.05;

export interface CacheFloorVerdict {
  /**
   * pass = clears the family floor; warn = sonnet below floor (non-fatal);
   * fail = opus below floor (fatal); unknown = no cacheable-floor data for the
   * model family (e.g. claude-fable-5). `unknown` is deliberately NOT `pass`:
   * an unknown-family preflight cannot be a real pass, so the call site renders
   * it as a distinct non-fatal warning rather than a green check.
   */
  level: 'pass' | 'warn' | 'fail' | 'unknown';
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
 * Unknown families return `unknown` (not a silent pass) with a check-manually
 * note, so the preflight surfaces them as a distinct non-fatal warning.
 */
export function assessCacheFloor(model: string, prefixTokens: number): CacheFloorVerdict {
  const family = model.includes('opus') ? 'opus' : model.includes('sonnet') ? 'sonnet' : null;
  if (family === null) {
    return {
      level: 'unknown',
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
 *
 * Direct path (normalizedBaseUrl undefined): byte-for-byte unchanged — bare
 * client against ANTHROPIC_CONSOLE_API_KEY. Proxy path (set): passes the
 * baseURL AND switches the key source to ANTHROPIC_API_KEY (the proxy-side
 * key). The caller is responsible for normalizing the URL (trailing-/v1 strip).
 * maxRetries: 0 either way — exactly one attempt, never loop against the account.
 */
export async function preflightTokenMass(normalizedBaseUrl?: string): Promise<number> {
  let client: Anthropic;
  if (normalizedBaseUrl !== undefined) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY missing from .env.local — required when --base-url routes ' +
          'through the CLIProxyAPI proxy (it is the proxy-side key; the direct-API ' +
          'ANTHROPIC_CONSOLE_API_KEY 401s against the proxy).'
      );
    }
    client = new Anthropic({ apiKey, baseURL: normalizedBaseUrl, maxRetries: 0 });
  } else {
    const apiKey = process.env.ANTHROPIC_CONSOLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_CONSOLE_API_KEY missing from .env.local (do NOT use ANTHROPIC_API_KEY — ' +
          'it is the CLIProxyAPI proxy-side key and 401s against the direct API).'
      );
    }
    client = new Anthropic({ apiKey, maxRetries: 0 });
  }
  const response = await client.messages.countTokens(
    buildTokenCountRequest(loadVocab(), SAMPLE_BODY)
  );
  return response.input_tokens;
}

const HELP = `
Stage 2 re-tag cached-prefix token-mass preflight (impl-plan A5 guard).

Measures the system prompt + monolithic submit_tags tool via count_tokens and
runs two guards: a ~${TOKEN_MASS_BUDGET_TOKENS}-token budget ceiling and the
model family's cacheable-prefix floor (FAIL for opus below floor, WARN for
sonnet, UNKNOWN for other families). Offline, both guards fall back to the
static chars/4 estimate.

Usage:
  npx tsx scripts/stage2-retag/preflight-token-mass.ts [flags]

Flags:
  --base-url <url>   route the count_tokens call through a local CLIProxyAPI
                     proxy to bill against Claude Max (e.g.
                     http://127.0.0.1:8317/api/provider/anthropic). Do NOT
                     include the trailing "/v1" — the SDK appends it; a trailing
                     "/v1" is stripped with a stderr warning. When set, the API
                     key source switches to ANTHROPIC_API_KEY (the proxy-side
                     key); unset = direct API + ANTHROPIC_CONSOLE_API_KEY.
  --help, -h         show this help and exit

Env (direct API, no --base-url): ANTHROPIC_CONSOLE_API_KEY required (from
     .env.local). Do NOT use ANTHROPIC_API_KEY — it is the CLIProxyAPI
     proxy-side key and 401s against the direct API.
Env (--base-url set): ANTHROPIC_API_KEY required (the proxy-side key).
`;

/**
 * Parses the preflight's flags: `--base-url <url>` and `--help`/`-h` (the
 * preflight is otherwise argument-free). Mirrors run-retag's flag style.
 * `--help` short-circuits, so it is honored even alongside an incomplete
 * value flag.
 */
export function parsePreflightArgs(argv: string[]): { baseUrl?: string; help: boolean } {
  const out: { baseUrl?: string; help: boolean } = { help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--help' || flag === '-h') {
      out.help = true;
      return out;
    } else if (flag === '--base-url') {
      if (next === undefined || next.startsWith('--')) {
        throw new Error('flag --base-url requires a value');
      }
      out.baseUrl = next;
      i++;
    } else {
      throw new Error(`unknown flag: ${flag} (only --base-url and --help are supported)`);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parsePreflightArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const normalizedBaseUrl = args.baseUrl !== undefined ? normalizeBaseUrl(args.baseUrl) : undefined;

  const prompt = loadSystemPrompt();
  const tool = buildSubmitTagsTool(loadVocab());
  const staticEstimate = estimateTokenMass(prompt, tool);
  console.log(`Static estimate (chars/4, prompt + serialized tool): ~${staticEstimate} tokens`);
  if (normalizedBaseUrl !== undefined) {
    console.log(`Routing count_tokens via CLIProxyAPI proxy: ${normalizedBaseUrl}`);
  }

  let measured: number | null = null;
  try {
    measured = await preflightTokenMass(normalizedBaseUrl);
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
  } else if (verdict.level === 'unknown') {
    // Not a pass: the model family has no documented cacheable floor, so the
    // cache economics can't be verified here. Non-fatal, but visibly distinct.
    console.warn(
      `Cache-floor UNKNOWN for ${DEFAULT_MODEL} (${basis}): ${verdict.message} ` +
        'The cache-floor guard could not run — this is NOT a pass.'
    );
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
