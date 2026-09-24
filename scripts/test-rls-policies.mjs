#!/usr/bin/env node

/**
 * Behavioral test suite for RLS (Row Level Security) policies and related
 * privilege boundaries. Each scenario exercises a real query as the anon or
 * service role and asserts what the database lets through.
 *
 * Run with:  npm run test:rls              (reads .env / environment variables)
 *            npm run test:rls -- --local   (uses the local `supabase start` stack;
 *                                           reads its URL and keys from `supabase status`)
 *
 * Any failing scenario makes the script exit non-zero.
 */

import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requireNonProd } from './lib/require-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `--local`: target the local Supabase stack using the URL and keys the CLI
// reports, instead of .env / environment variables. Cloud sessions have no
// .env and their environment variables point at the TEST project, so this is
// how they run the suite against their own sandbox stack.
const useLocalStack = process.argv.includes('--local');
if (useLocalStack) {
  let statusOut;
  try {
    statusOut = execFileSync('supabase', ['status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    console.error('❌ --local: `supabase status` failed. Is the local stack running (`supabase start`)?');
    console.error(String(err.stderr || err.message).trim());
    process.exit(1);
  }
  const localEnv = Object.fromEntries(
    statusOut
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, '')];
      })
  );
  process.env.VITE_SUPABASE_URL = localEnv.API_URL;
  process.env.VITE_SUPABASE_ANON_KEY = localEnv.ANON_KEY || localEnv.PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = localEnv.SERVICE_ROLE_KEY || localEnv.SECRET_KEY;
} else {
  // Load environment variables
  dotenv.config({ path: join(__dirname, '..', '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// The anon-key scenarios (public read checks + the invitation-enumeration
// regression) need this too; validate it up front so a missing value fails
// with this friendly message rather than a deep runtime error in a test.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.error(
    'Please ensure VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VITE_SUPABASE_ANON_KEY are set in .env, or pass --local to use the local supabase stack'
  );
  process.exit(1);
}

// The invitation-enumeration scenario below seeds (and deletes) a probe row,
// so this script now mutates data: guard against accidental prod runs.
requireNonProd({ scriptName: 'test-rls-policies.mjs' });

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Test specific policy scenarios
 */
async function testPolicyScenarios() {
  console.log('\n🧪 Testing Policy Scenarios...\n');

  const tests = [
    {
      name: 'Public can read lessons',
      test: async () => {
        // Create anonymous client
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await anonClient.from('lessons').select('id').limit(1);
        return !error;
      },
    },
    {
      name: 'Anonymous cannot insert lessons',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { error } = await anonClient.from('lessons').insert({
          title: 'Test Lesson',
          summary: 'This should fail',
        });
        return error !== null; // Should have an error
      },
    },
    {
      name: 'Service role can bypass RLS',
      test: async () => {
        const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
        return !error;
      },
    },
    // duplicate_group_dismissals policy tests
    {
      name: 'Anonymous cannot read duplicate_group_dismissals',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await anonClient
          .from('duplicate_group_dismissals')
          .select('id')
          .limit(1);
        // RLS hides all rows from anon users (no SELECT policy for anon)
        // which also prevents UPDATE/DELETE since rows are invisible
        return !error && (!data || data.length === 0);
      },
    },
    // archive_duplicate_lesson function tests
    {
      name: 'Anonymous cannot call archive_duplicate_lesson',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await anonClient.rpc('archive_duplicate_lesson', {
          p_lesson_id: 'test-lesson-1',
          p_canonical_id: 'test-lesson-2',
        });
        // Should fail with permission denied
        return error !== null || (data && data.success === false);
      },
    },
    // find_similar_lessons_text (T4b): service_role-only SECURITY DEFINER RPC.
    {
      name: 'Anonymous cannot call find_similar_lessons_text',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { error } = await anonClient.rpc('find_similar_lessons_text', {
          p_title: 'probe',
          p_content: 'probe content',
        });
        // Must fail: EXECUTE is revoked from PUBLIC/anon/authenticated.
        return error !== null;
      },
    },
    // T4b hard behavioral requirement: a retired lesson must never be offered
    // as a duplicate/update candidate. Read-only probe: feed the RPC a retired
    // row's OWN title+content (a perfect self-match if the filter were ever
    // dropped) and assert it does not come back. Runs wherever retired rows
    // exist (TEST/PROD-shaped data); skips on a fresh local seed with none.
    {
      name: 'find_similar_lessons_text never returns retired lessons',
      test: async () => {
        const { data: retired } = await supabase
          .from('lessons')
          .select('lesson_id, title, content_text')
          .not('retired_at', 'is', null)
          .not('content_text', 'is', null)
          .limit(1);
        if (!retired || retired.length === 0) {
          console.log('    ℹ️  Skipping: no retired lessons in this database');
          return true;
        }
        const bait = retired[0];
        const { data: results, error } = await supabase.rpc('find_similar_lessons_text', {
          p_title: bait.title,
          p_content: bait.content_text,
          p_limit: 10,
        });
        if (error || !Array.isArray(results)) return false;
        // The bait itself (and any other retired row) must be filtered out.
        return results.every((r) => r.lesson_id !== bait.lesson_id);
      },
    },
    // user_invitations token-harvest regression (fix shipped 2026-07-02):
    // the old "Public can view valid invitation by token" policy had no
    // token-equality predicate, so anon could enumerate every pending
    // invitation's email/role/token. Seed a real pending invitation and
    // assert (a) anon list-reads see nothing, (b) the token-scoped RPC
    // returns exactly the seeded row, (c) a wrong token returns nothing.
    {
      name: 'Anonymous cannot enumerate user_invitations; token-scoped RPC works',
      test: async () => {
        const probeEmail = 'rls-probe-invitation@test.invalid';
        // invited_by FKs to auth.users, NOT user_profiles — the TEST DB has
        // orphan profile rows whose auth user is gone, so source the id from
        // GoTrue's admin API to guarantee the FK holds.
        const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        const inviterId = userList?.users?.[0]?.id;
        if (!inviterId) {
          console.log('    ℹ️  Skipping: no auth user available to use as invited_by');
          return true;
        }
        // Clear any leftover probe row from an aborted earlier run, then seed.
        await supabase.from('user_invitations').delete().eq('email', probeEmail);
        const { data: seeded, error: seedError } = await supabase
          .from('user_invitations')
          .insert({
            email: probeEmail,
            role: 'teacher',
            invited_by: inviterId,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })
          .select('id, token')
          .single();
        if (seedError || !seeded) {
          console.log(`    ℹ️  Could not seed probe invitation: ${seedError?.message}`);
          return false;
        }
        try {
          const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

          const { data: listData, error: listError } = await anonClient
            .from('user_invitations')
            .select('token, email, role')
            .limit(10);
          const enumerationBlocked = !listError && (!listData || listData.length === 0);
          if (!enumerationBlocked) {
            console.log('    ❌ anon list-read returned rows (or errored unexpectedly)');
          }

          const { data: hitData, error: hitError } = await anonClient.rpc(
            'validate_invitation_token',
            { invite_token: seeded.token }
          );
          const lookupWorks =
            !hitError &&
            hitData?.length === 1 &&
            hitData[0].email === probeEmail &&
            hitData[0].is_valid === true;
          if (!lookupWorks) {
            console.log(`    ❌ token-scoped RPC lookup failed: ${hitError?.message ?? 'wrong row'}`);
          }

          const { data: missData, error: missError } = await anonClient.rpc(
            'validate_invitation_token',
            { invite_token: 'not-a-real-token' }
          );
          const missEmpty = !missError && (!missData || missData.length === 0);
          if (!missEmpty) {
            console.log('    ❌ RPC returned data for a bogus token');
          }

          return enumerationBlocked && lookupWorks && missEmpty;
        } finally {
          await supabase.from('user_invitations').delete().eq('id', seeded.id);
        }
      },
    },
    {
      // T4b (migration 20260703000000) revoked EXECUTE on the hard-deleting
      // archive RPC from the browser roles ahead of its retirement (the anon
      // scenario above covers that). Only service_role may call it, and the
      // function's own role check then refuses a caller with no user context.
      name: 'archive_duplicate_lesson refuses the service role without a user context',
      test: async () => {
        const { data, error } = await supabase.rpc('archive_duplicate_lesson', {
          p_lesson_id: 'nonexistent-lesson-id-12345',
          p_canonical_id: 'another-nonexistent-id',
        });
        return !error && !!data && data.success === false && /insufficient permissions/i.test(data.error || '');
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of tests) {
    try {
      const result = await testCase.test();
      if (result) {
        console.log(`✅ ${testCase.name}`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${testCase.name} - Error: ${err.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

/**
 * Main test runner
 */
async function main() {
  console.log('================================');
  console.log('    RLS Policy Test Suite');
  console.log('================================');

  try {
    const { passed, failed } = await testPolicyScenarios();

    console.log('\n================================');
    console.log('           SUMMARY');
    console.log('================================\n');
    console.log(`📊 Scenarios: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n✅ All RLS scenarios passed');
    } else {
      console.log(`\n❌ ${failed} RLS scenario(s) failed`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);