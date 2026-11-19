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
import { randomUUID } from 'crypto';
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

// ---------------------------------------------------------------------------
// Access-control hardening scenarios (migration *_access_control_hardening).
//
// These need real signed-in users in specific states (deactivated reviewer,
// user with no profile, ...), so they create throwaway accounts with the
// service role and remove them, and everything they wrote, afterwards.
// ---------------------------------------------------------------------------
const PROBE_RUN = `rlsprobe-${Date.now().toString(36)}`;
const probeUserIds = [];
const probeInvitationEmails = [];

async function makeProbeUser(role, { withProfile = true } = {}) {
  const email = `${PROBE_RUN}-${probeUserIds.length}-${role}@rls-probe.test.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${role}): ${error.message}`);
  const id = data.user.id;
  probeUserIds.push(id);
  if (withProfile) {
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id,
      user_id: id,
      email,
      full_name: `RLS probe ${role}`,
      role,
      is_active: true,
    });
    if (profileError) throw new Error(`insert profile(${role}): ${profileError.message}`);
  }
  const client = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn(${role}): ${signInError.message}`);
  return { id, email, client };
}

async function setProbeActive(id, isActive) {
  const { error } = await supabase.from('user_profiles').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`set is_active: ${error.message}`);
}

async function cleanupProbes() {
  if (probeInvitationEmails.length > 0) {
    await supabase.from('user_invitations').delete().in('email', probeInvitationEmails);
  }
  if (probeUserIds.length === 0) return;
  await supabase.from('lesson_submissions').delete().in('teacher_id', probeUserIds);
  await supabase.from('user_management_audit').delete().in('actor_id', probeUserIds);
  // Deleting a profile cascades to the audit rows that target it.
  await supabase.from('user_profiles').delete().in('id', probeUserIds);
  for (const id of probeUserIds) {
    await supabase.auth.admin.deleteUser(id);
  }
}

function accessControlScenarios() {
  const submissionRow = (teacherId, extra = {}) => ({
    teacher_id: teacherId,
    google_doc_url: `https://docs.google.com/document/d/${PROBE_RUN}`,
    google_doc_id: PROBE_RUN,
    submission_type: 'new',
    status: 'submitted',
    ...extra,
  });

  return [
    {
      // rls_posture_violations() lists: tables without RLS, views without
      // security_invoker, anon write privileges, authenticated write privileges
      // on views, and SECURITY DEFINER functions without a pinned search_path.
      name: 'Schema posture check reports no violations',
      test: async () => {
        const { data, error } = await supabase.rpc('rls_posture_violations');
        if (error) throw new Error(error.message);
        for (const row of data) console.log(`    ⚠️  ${row.object_name}: ${row.problem}`);
        return data.length === 0;
      },
    },
    {
      name: 'Posture check is not callable by anonymous or signed-in users',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { error: anonError } = await anonClient.rpc('rls_posture_violations');
        const teacher = await makeProbeUser('teacher');
        const { error: userError } = await teacher.client.rpc('rls_posture_violations');
        return anonError !== null && userError !== null;
      },
    },
    {
      name: 'Anonymous cannot read user_profiles_safe',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data, error } = await anonClient.from('user_profiles_safe').select('id').limit(1);
        return error !== null && !data;
      },
    },
    {
      // The filter matches no row on purpose: a privilege error is raised
      // before any row is considered, so this can never modify data.
      name: 'Nobody can write through the lessons_with_metadata view',
      test: async () => {
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const reviewer = await makeProbeUser('reviewer');
        const attempt = (client) =>
          client
            .from('lessons_with_metadata')
            .update({ title: 'rls probe' })
            .eq('lesson_id', `${PROBE_RUN}-no-such-lesson`);
        const [{ error: anonError }, { error: reviewerError }] = await Promise.all([
          attempt(anonClient),
          attempt(reviewer.client),
        ]);
        return anonError !== null && reviewerError !== null;
      },
    },
    {
      name: 'Deactivating a reviewer removes reviewer access; own profile stays readable',
      test: async () => {
        const { data: lessons, error: lessonError } = await supabase
          .from('lessons')
          .select('lesson_id, flagged_for_review')
          .limit(1);
        if (lessonError) throw new Error(lessonError.message);
        if (!lessons || lessons.length === 0) {
          console.log('    ℹ️  Skipping: no lessons in this database');
          return true;
        }
        const lesson = lessons[0];
        const reviewer = await makeProbeUser('reviewer');
        // Writes the value the row already has, so nothing changes.
        const noOpUpdate = () =>
          reviewer.client
            .from('lessons')
            .update({ flagged_for_review: lesson.flagged_for_review })
            .eq('lesson_id', lesson.lesson_id)
            .select('lesson_id');
        const profiles = () => reviewer.client.from('user_profiles').select('id');

        const activeUpdate = await noOpUpdate();
        const activeProfiles = await profiles();
        await setProbeActive(reviewer.id, false);
        const inactiveUpdate = await noOpUpdate();
        const inactiveProfiles = await profiles();
        const inactiveSubmissions = await reviewer.client.from('lesson_submissions').select('id');

        return (
          !activeUpdate.error &&
          activeUpdate.data.length === 1 &&
          !activeProfiles.error &&
          activeProfiles.data.length > 1 &&
          !inactiveUpdate.error &&
          inactiveUpdate.data.length === 0 &&
          !inactiveProfiles.error &&
          inactiveProfiles.data.length === 1 &&
          inactiveProfiles.data[0].id === reviewer.id &&
          !inactiveSubmissions.error &&
          inactiveSubmissions.data.length === 0
        );
      },
    },
    {
      name: 'A user can edit their own name but not role, user_id, email, notes or active flag',
      test: async () => {
        const teacher = await makeProbeUser('teacher');
        const other = await makeProbeUser('teacher');
        const update = (patch) =>
          teacher.client.from('user_profiles').update(patch).eq('id', teacher.id).select('id');
        const blocked = await Promise.all([
          update({ role: 'admin' }),
          update({ user_id: other.id }),
          update({ email: `${PROBE_RUN}-changed@rls-probe.test.invalid` }),
          update({ notes: 'self-written note' }),
          update({ is_active: false }),
        ]);
        const allowed = await update({ full_name: 'RLS probe renamed' });
        const { data: after } = await supabase
          .from('user_profiles')
          .select('role, user_id, is_active, notes, full_name')
          .eq('id', teacher.id)
          .single();
        return (
          blocked.every((r) => r.error !== null) &&
          !allowed.error &&
          allowed.data.length === 1 &&
          after.role === 'teacher' &&
          after.user_id === teacher.id &&
          after.is_active === true &&
          after.notes === null &&
          after.full_name === 'RLS probe renamed'
        );
      },
    },
    {
      name: 'Only an admin can write audit rows, and only naming themselves',
      test: async () => {
        const teacher = await makeProbeUser('teacher');
        const reviewer = await makeProbeUser('reviewer');
        const admin = await makeProbeUser('admin');
        const row = (actorId) => ({
          actor_id: actorId,
          action: 'invite_sent',
          target_email: `${PROBE_RUN}-audit@rls-probe.test.invalid`,
        });
        const asTeacher = await teacher.client.from('user_management_audit').insert(row(teacher.id));
        const asReviewer = await reviewer.client.from('user_management_audit').insert(row(reviewer.id));
        const adminAsOther = await admin.client.from('user_management_audit').insert(row(teacher.id));
        const adminAsSelf = await admin.client.from('user_management_audit').insert(row(admin.id));
        return (
          asTeacher.error !== null &&
          asReviewer.error !== null &&
          adminAsOther.error !== null &&
          adminAsSelf.error === null
        );
      },
    },
    {
      name: 'A user can self-create only a teacher profile, even with a pending invitation',
      test: async () => {
        const inviter = await makeProbeUser('admin');
        const invitedEmail = `${PROBE_RUN}-invited@rls-probe.test.invalid`;
        probeInvitationEmails.push(invitedEmail);
        const { error: inviteError } = await supabase.from('user_invitations').insert({
          email: invitedEmail,
          role: 'reviewer',
          invited_by: inviter.id,
        });
        if (inviteError) throw new Error(`seed invitation: ${inviteError.message}`);

        const newcomer = await makeProbeUser('teacher', { withProfile: false });
        const profile = (extra) => ({
          id: newcomer.id,
          user_id: newcomer.id,
          full_name: 'RLS probe newcomer',
          ...extra,
        });
        const insert = (row) => newcomer.client.from('user_profiles').insert(row);
        const claimInvite = await insert(profile({ role: 'reviewer', email: invitedEmail }));
        const asAdmin = await insert(profile({ role: 'admin', email: newcomer.email }));
        const otherEmail = await insert(profile({ role: 'teacher', email: invitedEmail }));
        const withNotes = await insert(profile({ role: 'teacher', email: newcomer.email, notes: 'x' }));
        const plainTeacher = await insert(profile({ role: 'teacher', email: newcomer.email }));
        return (
          claimInvite.error !== null &&
          asAdmin.error !== null &&
          otherEmail.error !== null &&
          withNotes.error !== null &&
          plainTeacher.error === null
        );
      },
    },
    {
      name: 'A teacher-created submission must start empty, and needs an active profile',
      test: async () => {
        const teacher = await makeProbeUser('teacher');
        const insert = (extra) =>
          teacher.client.from('lesson_submissions').insert(submissionRow(teacher.id, extra));
        const preApproved = await insert({ status: 'approved' });
        const fakeContent = await insert({ extracted_content: 'not from the doc' });
        const fakeReview = await insert({ reviewer_notes: 'looks great' });
        const plain = await insert({});
        await setProbeActive(teacher.id, false);
        const whileInactive = await insert({});
        return (
          preApproved.error !== null &&
          fakeContent.error !== null &&
          fakeReview.error !== null &&
          plain.error === null &&
          whileInactive.error !== null
        );
      },
    },
    {
      name: 'A profile change with no signed-in user is logged with a NULL actor',
      test: async () => {
        const teacher = await makeProbeUser('teacher');
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ full_name: 'RLS probe changed by service role' })
          .eq('id', teacher.id);
        if (updateError) throw new Error(updateError.message);
        const { data, error } = await supabase
          .from('user_management_audit')
          .select('actor_id, metadata')
          .eq('target_user_id', teacher.id)
          .eq('action', 'user_profile_updated')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw new Error(error.message);
        return data.length === 1 && data[0].actor_id === null && data[0].metadata?.source === 'service_role';
      },
    },
  ];
}

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
      // The function's role check (20260209140001) runs before any validation
      // and refuses a caller with no user context, which is what a service-role
      // JWT is. T4b (20260703000000) additionally revoked EXECUTE from the
      // browser roles ahead of the function's retirement; the anon scenario
      // above covers that side.
      name: 'archive_duplicate_lesson refuses the service role without a user context',
      test: async () => {
        const { data, error } = await supabase.rpc('archive_duplicate_lesson', {
          p_lesson_id: 'nonexistent-lesson-id-12345',
          p_canonical_id: 'another-nonexistent-id',
        });
        return !error && !!data && data.success === false && /insufficient permissions/i.test(data.error || '');
      },
    },
    ...accessControlScenarios(),
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
    let passed;
    let failed;
    try {
      ({ passed, failed } = await testPolicyScenarios());
    } finally {
      // Always remove the throwaway accounts and rows the scenarios created.
      await cleanupProbes().catch((cleanupError) => {
        console.error('⚠️  Probe cleanup failed:', cleanupError.message);
      });
    }

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