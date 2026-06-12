#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Live token-mass preflight for the Stage 2 re-tag cached prefix (impl-plan
 * A5 guard): measures the system prompt + monolithic `submit_tags` tool via
 * the API's `count_tokens` endpoint and fails (exit 1) if the mass exceeds
 * the ~10K-token budget.
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
  console.log(
    `Static estimate (chars/4, prompt + serialized tool): ~${estimateTokenMass(prompt, tool)} tokens`
  );

  const measured = await preflightTokenMass();
  console.log(`count_tokens measured (prompt + tool + tiny sample body): ${measured} tokens`);

  if (measured >= TOKEN_MASS_BUDGET_TOKENS) {
    console.error(
      `Token mass ${measured} exceeds the ~${TOKEN_MASS_BUDGET_TOKENS}-token budget ` +
        '(impl-plan A5) — STOP and reassess the cost projection before any run.'
    );
    process.exit(1);
  }
  console.log(`Token-mass guard PASSED (budget ~${TOKEN_MASS_BUDGET_TOKENS}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error('Preflight failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
