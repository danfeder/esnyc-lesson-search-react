#!/usr/bin/env node

/**
 * C1.3 — Heritage recursive-expansion tests (DB-level, LOCAL ONLY).
 *
 * Proves the PR C1.2 migration
 * (supabase/migrations/20260616000000_heritage_recursive_expansion.sql):
 * selecting a region/group recursively expands to ALL transitive descendants
 * and resolves the SLUG-vs-LABEL footgun, so SPECIFIC-ONLY (leaf-heavy)
 * heritage tags — the post-C2 storage shape — are matched by the live filter.
 *
 * HARNESS: standalone Node script mirroring scripts/test-rls-policies.mjs.
 *   NOT a vitest test — the vitest suite is hermetic (no DB) and CI has no
 *   local Supabase, so a DB-connecting vitest test would fail there. This is a
 *   LOCAL developer/verification gate (like `npm run test:rls`); CI coverage of
 *   the real RPC arrives later via the C1.8 E2E tests.
 *
 * EXERCISES THE REAL FILTER PATH: it seeds fixture `lessons` rows with
 *   specific-only `cultural_heritage`, then calls the live `search_lessons` RPC
 *   with `filter_cultures: [<slug>]` — the exact production chain
 *   `expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))` then
 *   `l.cultural_heritage && expanded_cultures` (and `retired_at IS NULL`) — and
 *   asserts the fixture is (or isn't) returned. No clause replica; the RPC IS
 *   the assertion.
 *
 * DATA SAFETY: this script WRITES + DELETES fixture rows, so it refuses to run
 *   against anything but the LOCAL DB (127.0.0.1/localhost). It inserts rows
 *   with a fixed `c13-heritage-test-` lesson_id prefix and DELETEs every one in
 *   a finally block, leaving the local DB clean.
 *
 * Run with:  npm run test:heritage   (or: node scripts/heritage/test-heritage-expansion.mjs)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

// =============================================================================
// DATA-SAFETY GUARD — LOCAL DB ONLY.
// This script INSERTs and DELETEs fixture lesson rows. Refuse to touch anything
// but a local Supabase. TEST (rxgajg…) / PROD (jxlxtz…) / any non-local host
// ABORTS immediately, before any client is created or any row is written.
// =============================================================================
function assertLocalDb(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    console.error(`❌ DATA-SAFETY GUARD: VITE_SUPABASE_URL is not a valid URL: ${url}`);
    process.exit(1);
  }
  const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
  if (!LOCAL_HOSTS.has(host)) {
    console.error('❌ DATA-SAFETY GUARD TRIPPED — refusing to run.');
    console.error(`   This script WRITES + DELETES fixture rows and is LOCAL-ONLY.`);
    console.error(
      `   VITE_SUPABASE_URL resolves to host "${host}" (expected 127.0.0.1/localhost).`
    );
    console.error(`   Point .env at the local Supabase (http://127.0.0.1:54321) and retry.`);
    process.exit(1);
  }
}

assertLocalDb(supabaseUrl);

// Create Supabase client with service role (bypasses RLS; LOCAL only per guard).
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Clearly-marked fixture id prefix — cleaned up in finally, never collides with
// real lesson_ids.
const FIXTURE_PREFIX = 'c13-heritage-test-';

/**
 * Fixture lessons. Each stores SPECIFIC-ONLY heritage (no ancestor chain),
 * modeling the post-C2 storage shape. cultural_heritage stores Title-Case
 * LABELS (the column's real form); the filter sends kebab SLUGS.
 */
const FIXTURES = [
  {
    lesson_id: `${FIXTURE_PREFIX}chinese`,
    title: 'C13 Fixture: Chinese (deep leaf, specific-only)',
    cultural_heritage: ['Chinese'], // 3rd-tier leaf: asian > east-asian > chinese
  },
  {
    lesson_id: `${FIXTURE_PREFIX}taiwanese`,
    title: 'C13 Fixture: Taiwanese (deep leaf, specific-only)',
    cultural_heritage: ['Taiwanese'], // east-asian > taiwanese (absent from old 1-tier table)
  },
  {
    lesson_id: `${FIXTURE_PREFIX}soul-food`,
    title: 'C13 Fixture: Soul Food (tradition leaf under African American)',
    cultural_heritage: ['Soul Food'], // african-american > soul-food (internal tier)
  },
  {
    lesson_id: `${FIXTURE_PREFIX}black-culinary-history`,
    title: 'C13 Fixture: Black culinary history (internal node, hidden in UI)',
    cultural_heritage: ['Black culinary history'], // african-american > black-culinary-history
  },
  {
    lesson_id: `${FIXTURE_PREFIX}italian`,
    title: 'C13 Fixture: Italian (unrelated control)',
    cultural_heritage: ['Italian'], // european > mediterranean > italian — NOT under asian
  },
];

/**
 * Seed all fixture rows. Title/summary/file_link are NOT NULL; everything else
 * uses table defaults (retired_at defaults NULL → fixtures pass the
 * `retired_at IS NULL` clause in search_lessons).
 */
async function seedFixtures() {
  const rows = FIXTURES.map((f) => ({
    lesson_id: f.lesson_id,
    title: f.title,
    summary: 'C1.3 heritage-expansion test fixture (auto-deleted).',
    file_link: `https://example.invalid/${f.lesson_id}`,
    cultural_heritage: f.cultural_heritage,
  }));

  const { error } = await supabase.from('lessons').upsert(rows, { onConflict: 'lesson_id' });
  if (error) {
    throw new Error(`Failed to seed fixtures: ${error.message}`);
  }
}

/** Delete every fixture row. Safe to call even if seeding partially failed. */
async function cleanupFixtures() {
  const { error } = await supabase.from('lessons').delete().like('lesson_id', `${FIXTURE_PREFIX}%`);
  if (error) {
    throw new Error(`Failed to clean up fixtures: ${error.message}`);
  }
}

/** Count remaining fixture rows (cleanup verification). */
async function countFixtures() {
  const { count, error } = await supabase
    .from('lessons')
    .select('lesson_id', { count: 'exact', head: true })
    .like('lesson_id', `${FIXTURE_PREFIX}%`);
  if (error) {
    throw new Error(`Failed to count fixtures: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Run the REAL filter path: call search_lessons with filter_cultures=[slug]
 * (exactly what useLessonSearch.ts sends) and return whether the given fixture
 * lesson_id appears in the result set. page_size is large enough to contain
 * the full corpus + fixtures so pagination never hides a match.
 */
async function filterMatchesFixture(slug, fixtureLessonId) {
  const { data, error } = await supabase.rpc('search_lessons', {
    filter_cultures: [slug],
    page_size: 2000,
    page_offset: 0,
  });
  if (error) {
    throw new Error(`search_lessons RPC failed for slug "${slug}": ${error.message}`);
  }
  const ids = new Set((data || []).map((r) => r.lesson_id));
  return ids.has(fixtureLessonId);
}

/**
 * Assertions. Each calls the live filter path and checks the expected fixture
 * inclusion/exclusion. RED context (vs the pre-migration one-tier function) is
 * documented per case below and was demonstrated separately (see the report /
 * file header). All are GREEN against the current recursive migration.
 */
function buildAssertions() {
  return [
    {
      // CASE 1 — parent → deep descendant (the headline rebuild win).
      // Specific-only {Chinese} (asian > east-asian > chinese) IS returned when
      // filtering by the top region slug `asian`. C1.0 baseline: chinese=0 today.
      // RED note: Chinese was ALSO a direct child in the old flat Asian list, so
      // see Case 1b for the strict recursion proof (deep leaf absent from old list).
      name: 'CASE 1: filter `asian` returns specific-only {Chinese} (deep 3rd-tier leaf)',
      slug: 'asian',
      fixture: `${FIXTURE_PREFIX}chinese`,
      expect: true,
    },
    {
      // CASE 1b — strict recursion proof. Taiwanese is asian > east-asian >
      // taiwanese AND is absent from the old one-tier Asian children list, so the
      // OLD function returns 0 here (clean recursion RED); the NEW recursive walk
      // reaches it through east-asian.
      name: 'CASE 1b: filter `asian` returns specific-only {Taiwanese} (deep leaf, RED under old 1-tier)',
      slug: 'asian',
      fixture: `${FIXTURE_PREFIX}taiwanese`,
      expect: true,
    },
    {
      // CASE 2 — tradition leaf under a newly-added group.
      // Specific-only {Soul Food} (african-american > soul-food) IS returned when
      // filtering by `african-american`. C1.0 baseline: african-american=0 today
      // (the whole group is missing from the old table → clean RED).
      name: 'CASE 2: filter `african-american` returns specific-only {Soul Food} (tradition leaf)',
      slug: 'african-american',
      fixture: `${FIXTURE_PREFIX}soul-food`,
      expect: true,
    },
    {
      // CASE 3 — slug-input matches label-stored data (the SLUG-vs-LABEL footgun).
      // Filtering by the slug `chinese` matches a fixture that STORES the
      // Title-Case label 'Chinese'. C1.0 baseline: chinese=0 (slug never resolved
      // to label under the old alias/expand → clean RED).
      name: 'CASE 3: filter slug `chinese` matches label-stored {Chinese} (slug↔label bridge)',
      slug: 'chinese',
      fixture: `${FIXTURE_PREFIX}chinese`,
      expect: true,
    },
    {
      // CASE 4 — internal node still matches via expansion (hidden in UI).
      // `black-culinary-history` is an internal-tier node (filter_ui_tier=internal)
      // not shown as a UI option, but it must still resolve through expansion.
      name: 'CASE 4: filter internal node `black-culinary-history` matches {Black culinary history}',
      slug: 'black-culinary-history',
      fixture: `${FIXTURE_PREFIX}black-culinary-history`,
      expect: true,
    },
    {
      // CASE 5 — no false positives. An unrelated heritage ({Italian}, under
      // european) is NOT returned when filtering by `asian`.
      name: 'CASE 5: filter `asian` does NOT return unrelated {Italian} (no false positives)',
      slug: 'asian',
      fixture: `${FIXTURE_PREFIX}italian`,
      expect: false,
    },
  ];
}

async function main() {
  console.log('================================================');
  console.log('  C1.3 Heritage Recursive-Expansion Test Suite');
  console.log('================================================');
  console.log(`DB: ${supabaseUrl} (LOCAL — data-safety guard passed)\n`);

  let passed = 0;
  let failed = 0;

  try {
    await seedFixtures();
    console.log(
      `🌱 Seeded ${FIXTURES.length} specific-only fixtures (prefix "${FIXTURE_PREFIX}").\n`
    );

    const assertions = buildAssertions();
    for (const a of assertions) {
      let actual;
      try {
        actual = await filterMatchesFixture(a.slug, a.fixture);
      } catch (err) {
        console.log(`❌ ${a.name}\n     ERROR: ${err.message}`);
        failed++;
        continue;
      }
      if (actual === a.expect) {
        console.log(`✅ ${a.name}\n     expected=${a.expect} actual=${actual}`);
        passed++;
      } else {
        console.log(`❌ ${a.name}\n     expected=${a.expect} actual=${actual}`);
        failed++;
      }
    }
  } finally {
    // Always clean up — leave the local DB exactly as we found it.
    try {
      await cleanupFixtures();
      const remaining = await countFixtures();
      console.log(`\n🧹 Cleanup: deleted fixtures; ${remaining} "${FIXTURE_PREFIX}" rows remain.`);
      if (remaining !== 0) {
        console.error(`❌ Cleanup incomplete — ${remaining} fixture rows leaked.`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ Cleanup failed: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n================================================');
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  console.log('================================================');

  if (failed > 0) {
    process.exit(1);
  }
  console.log('✅ All heritage recursive-expansion assertions passed.');
}

main().catch((err) => {
  console.error('\n❌ Test suite crashed:', err);
  process.exit(1);
});
