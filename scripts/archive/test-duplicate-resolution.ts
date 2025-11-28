#!/usr/bin/env npx tsx
/**
 * Test script to debug duplicate resolution issues
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDuplicateResolution() {
  console.log('🔍 Testing duplicate resolution functionality...\n');

  try {
    // 1. Test fetching duplicate_resolutions table
    console.log('1️⃣ Testing duplicate_resolutions table access...');
    const { data: resolutions, error: resError } = await supabase
      .from('duplicate_resolutions')
      .select('group_id')
      .limit(5);

    if (resError) {
      console.error('❌ Error fetching duplicate_resolutions:', resError);
      console.error('   Error details:', JSON.stringify(resError, null, 2));
    } else {
      console.log('✅ Successfully fetched duplicate_resolutions');
      console.log(`   Found ${resolutions?.length || 0} resolved groups`);
    }

    // 2. Test the current user's role
    console.log('\n2️⃣ Checking current user role...');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('⚠️  No authenticated user found');
      console.log('   You may need to log in first');
    } else {
      console.log('✅ User authenticated:', user.email);

      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
      } else {
        console.log(`   Role: ${profile?.role || 'none'}`);
        console.log(`   Active: ${profile?.is_active ?? true}`);

        if (!['admin', 'reviewer', 'super_admin'].includes(profile?.role || '')) {
          console.warn('⚠️  User does not have reviewer/admin role');
          console.warn('   Duplicate resolution requires reviewer or admin privileges');
        }
      }
    }

    // 3. Test the resolve_duplicate_group function with a mock call
    console.log('\n3️⃣ Testing resolve_duplicate_group function...');

    // This is a dry run - we'll use invalid IDs to trigger validation errors
    const { data: testResult, error: testError } = await supabase.rpc('resolve_duplicate_group', {
      p_group_id: 'test-group-001',
      p_canonical_id: 'test-lesson-001',
      p_duplicate_ids: ['test-lesson-002'],
      p_duplicate_type: 'exact',
      p_similarity_score: 0.95,
      p_merge_metadata: false,
      p_resolution_notes: 'Test resolution',
    });

    if (testError) {
      console.log('⚠️  Expected error from test call:', testError.message);

      // Check if it's a permission error or a validation error
      if (testError.message.includes('permission')) {
        console.error('❌ Permission denied - user needs reviewer/admin role');
      } else if (testError.message.includes('not found')) {
        console.log('✅ Function is accessible (failed on validation as expected)');
      } else {
        console.error('❌ Unexpected error:', testError.message);
      }
    } else if (testResult) {
      console.log('📊 Function response:', testResult);
      if (!testResult.success) {
        console.log('   Error details:', testResult.error);
        console.log('   Hint:', testResult.hint);
      }
    }

    // 4. Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('check_rls_policies', {
        table_name: 'duplicate_resolutions',
      })
      .catch((err) => ({ data: null, error: err }));

    if (policyError) {
      console.log('⚠️  Could not check RLS policies (function may not exist)');
    } else if (policies) {
      console.log('📋 RLS policies:', policies);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Debugging Summary:');
  console.log('1. Check if user is logged in and has reviewer/admin role');
  console.log('2. Ensure duplicate_resolutions table has proper RLS policies');
  console.log('3. Verify the resolve_duplicate_group function exists and is accessible');
  console.log('='.repeat(60));
}

testDuplicateResolution().catch(console.error);
