import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export async function verifyUserManagementSetup() {
  logger.log('🔍 Verifying User Management Setup...\n');

  const checks = {
    userProfilesTable: false,
    userInvitationsTable: false,
    auditTable: false,
    canQueryProfiles: false,
    canQueryInvitations: false,
    currentUserProfile: false,
  };

  try {
    // 1. Check if we can query user_profiles with new columns
    logger.log('1️⃣ Checking user_profiles table...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, is_active, school_name, permissions')
      .limit(1);

    if (!profileError) {
      checks.userProfilesTable = true;
      logger.log('✅ user_profiles table is accessible with new columns');
    } else {
      logger.log('❌ user_profiles error:', profileError.message);
    }

    // 2. Check if user_invitations table exists
    logger.log('\n2️⃣ Checking user_invitations table...');
    const { error: inviteError } = await supabase
      .from('user_invitations')
      .select('id, email, role, token')
      .limit(1);

    if (!inviteError || inviteError.code === 'PGRST116') {
      // PGRST116 = no rows
      checks.userInvitationsTable = true;
      logger.log('✅ user_invitations table exists');
    } else {
      logger.log('❌ user_invitations error:', inviteError.message);
    }

    // 3. Check if user_management_audit table exists
    logger.log('\n3️⃣ Checking user_management_audit table...');
    const { error: auditError } = await supabase
      .from('user_management_audit')
      .select('id, action, actor_id')
      .limit(1);

    if (!auditError || auditError.code === 'PGRST116') {
      checks.auditTable = true;
      logger.log('✅ user_management_audit table exists');
    } else {
      logger.log('❌ user_management_audit error:', auditError.message);
    }

    // 4. Check if we can query with RLS
    logger.log('\n4️⃣ Checking RLS policies...');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      logger.log('✅ Authenticated as:', user.email);

      // Try to query profiles (should work for own profile)
      const { data: profileCheck, error: rlsProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!rlsProfileError) {
        checks.canQueryProfiles = true;
        if (profileCheck) {
          logger.log('✅ Can query own profile (RLS working)');
        } else {
          logger.log('⚠️  No profile exists yet for this user');
          // Create a profile if it doesn't exist
          const { error: createError } = await supabase.from('user_profiles').insert({
            id: user.id,
            user_id: user.id,
            role: 'teacher',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (!createError) {
            logger.log('✅ Created initial profile for user');
            checks.canQueryProfiles = true;
          } else {
            logger.log('❌ Could not create profile:', createError.message);
          }
        }
      } else {
        logger.log('❌ Cannot query own profile:', rlsProfileError.message);
      }

      // Try to query invitations (admin only)
      const { error: rlsInviteError } = await supabase
        .from('user_invitations')
        .select('id')
        .limit(1);

      if (!rlsInviteError || rlsInviteError.code === 'PGRST116') {
        checks.canQueryInvitations = true;
        logger.log('✅ Can query invitations (admin) or blocked (non-admin)');
      } else if (rlsInviteError.code === '42501') {
        // Permission denied
        logger.log('✅ RLS correctly blocking non-admin from invitations');
        checks.canQueryInvitations = true;
      } else {
        logger.log('❌ Invitation query error:', rlsInviteError.message);
      }
    } else {
      logger.log('❌ Not authenticated - please sign in first');
      logger.log('   You can sign in by clicking the user icon in the header');
    }

    // 5. Check current user's profile
    logger.log('\n5️⃣ Checking current user profile...');
    if (user) {
      const { data: profile, error: currentProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && !currentProfileError) {
        checks.currentUserProfile = true;
        logger.log('✅ Current user profile:', {
          email: user.email,
          role: profile.role || 'not set',
          is_active: profile.is_active !== false,
          school: profile.school_name || 'not set',
        });
      } else {
        logger.log('❌ No profile found for current user');
      }
    }

    // Summary
    logger.log('\n📊 Summary:');
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    logger.log(`Passed: ${passedChecks}/${totalChecks} checks`);

    if (passedChecks === totalChecks) {
      logger.log('\n🎉 All checks passed! User management system is ready.');
    } else {
      logger.log('\n⚠️  Some checks failed. Please review the errors above.');
    }

    return checks;
  } catch (error) {
    logger.error('❌ Verification failed:', error);
    return checks;
  }
}

// Function to set up an admin user for testing
export async function setupAdminUser(email: string) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.log('❌ No authenticated user');
      return;
    }

    // First check if we need to use the user's ID or look up by email
    const targetEmail = email || user.email;

    // Find the user by email
    const { data: authData } = await supabase.auth.admin.listUsers();
    const targetUser = authData?.users.find((u) => u.email === targetEmail);

    if (!targetUser) {
      // If admin API not available, try updating current user
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: 'admin',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logger.log('❌ Failed to update role:', error.message);
      } else {
        logger.log('✅ Updated current user to admin role');
      }
    } else {
      // Update the target user
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: 'admin',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUser.id);

      if (error) {
        logger.log('❌ Failed to update role:', error.message);
      } else {
        logger.log(`✅ Updated ${targetEmail} to admin role`);
      }
    }
  } catch (error) {
    logger.error('❌ Setup failed:', error);
  }
}
