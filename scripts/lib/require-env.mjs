/**
 * Prod-guard for local mutation scripts.
 *
 * Every script in scripts/ that mutates data should call requireNonProd()
 * immediately after loading .env. The guard:
 *   - Identifies which Supabase project VITE_SUPABASE_URL resolves to.
 *   - Logs the detected target so the operator can see it before any work runs.
 *   - Refuses to run against production unless --i-mean-prod is passed.
 *   - Refuses to run if the target is unknown (empty URL, typo, etc.).
 *
 * The helper is deliberately .mjs so both Node scripts (.js / .mjs) and
 * tsx-run scripts (.ts) can import it without a build step.
 */

const PROD_PROJECT_REF = 'jxlxtzkmicfhchkhiojz';
const TEST_PROJECT_REF = 'rxgajgmphciuaqzvwmox';

export function describeSupabaseTarget() {
  const url = process.env.VITE_SUPABASE_URL || '';
  if (url.includes(PROD_PROJECT_REF)) return { target: 'production', url };
  if (url.includes(TEST_PROJECT_REF)) return { target: 'test', url };
  if (url.includes('127.0.0.1') || url.includes('localhost')) return { target: 'local', url };
  return { target: 'unknown', url };
}

export function requireNonProd({ scriptName = 'this script' } = {}) {
  const { target, url } = describeSupabaseTarget();
  const explicitOptIn = process.argv.includes('--i-mean-prod');

  console.log(`\u{1F6F0}  Supabase target: ${target}${url ? ` (${url})` : ''}`);

  if (target === 'unknown') {
    console.error('');
    console.error(`⚠  ${scriptName} could not identify its Supabase target.`);
    console.error(`   VITE_SUPABASE_URL: ${url || '<not set>'}`);
    console.error('   Set VITE_SUPABASE_URL to your local, test, or prod Supabase URL.');
    console.error('');
    process.exit(1);
  }

  if (target === 'production' && !explicitOptIn) {
    console.error('');
    console.error(`⛔ ${scriptName} refuses to run against PRODUCTION Supabase.`);
    console.error(`   VITE_SUPABASE_URL resolves to the prod project (${PROD_PROJECT_REF}).`);
    console.error('   If this is deliberate:');
    console.error('     1. Verify you have a recent backup (the weekly backup workflow,');
    console.error('        or a manual `supabase db dump --data-only`).');
    console.error('     2. Re-run with --i-mean-prod appended.');
    console.error('');
    process.exit(1);
  }

  if (target === 'production' && explicitOptIn) {
    console.warn(`⚠  Proceeding against PRODUCTION (--i-mean-prod was passed).`);
  }

  return { target, url };
}
