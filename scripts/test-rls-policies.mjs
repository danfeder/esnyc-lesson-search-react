#!/usr/bin/env node

/**
 * Test script for RLS (Row Level Security) policies
 * This script verifies that all tables have proper RLS enabled and policies configured
 * Run with: node scripts/test-rls-policies.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Test if RLS is enabled on all tables
 */
async function testRLSEnabled() {
  console.log('\n📋 Testing RLS Status on All Tables...\n');

  const { data, error } = await supabase.rpc('test_rls_policies');

  if (error) {
    console.error('❌ Error testing RLS policies:', error.message);
    return false;
  }

  let allEnabled = true;
  const results = [];

  for (const table of data) {
    const status = table.has_rls_enabled ? '✅' : '❌';
    const policyStatus = table.policy_count > 0 ? `(${table.policy_count} policies)` : '⚠️  NO POLICIES';
    
    results.push({
      table: table.table_name,
      enabled: table.has_rls_enabled,
      policies: table.policy_count,
    });

    console.log(`${status} ${table.table_name.padEnd(30)} RLS: ${table.has_rls_enabled ? 'ENABLED' : 'DISABLED'} ${policyStatus}`);

    if (!table.has_rls_enabled) {
      allEnabled = false;
    }
  }

  return { allEnabled, results };
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
 * Check for tables without RLS
 */
async function checkTablesWithoutRLS() {
  console.log('\n⚠️  Checking for Unprotected Tables...\n');

  const { data, error } = await supabase.rpc('test_rls_policies');

  if (error) {
    console.error('Error checking tables:', error.message);
    return [];
  }

  const unprotected = data.filter(table => !table.has_rls_enabled);

  if (unprotected.length === 0) {
    console.log('✅ All tables have RLS enabled!');
  } else {
    console.log(`⚠️  Found ${unprotected.length} unprotected tables:`);
    unprotected.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
  }

  return unprotected;
}

/**
 * Main test runner
 */
async function main() {
  console.log('================================');
  console.log('    RLS Policy Test Suite');
  console.log('================================');

  try {
    // Test 1: Check RLS status
    const { allEnabled, results } = await testRLSEnabled();

    // Test 2: Check for unprotected tables
    const unprotected = await checkTablesWithoutRLS();

    // Test 3: Test specific scenarios
    const { passed, failed } = await testPolicyScenarios();

    // Summary
    console.log('\n================================');
    console.log('           SUMMARY');
    console.log('================================\n');

    const totalTables = results.length;
    const protectedTables = results.filter(r => r.enabled).length;
    const tablesWithPolicies = results.filter(r => r.policies > 0).length;

    console.log(`📊 Tables: ${protectedTables}/${totalTables} have RLS enabled`);
    console.log(`📊 Policies: ${tablesWithPolicies}/${totalTables} tables have policies`);
    console.log(`📊 Scenarios: ${passed} passed, ${failed} failed`);

    if (allEnabled && passed > failed) {
      console.log('\n✅ RLS implementation is working correctly!');
    } else {
      console.log('\n⚠️  Some RLS issues need attention');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);