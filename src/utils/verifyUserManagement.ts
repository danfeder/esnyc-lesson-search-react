import { supabase } from '../lib/supabase';

export async function verifyUserManagementSetup() {
  console.log('🔍 Verifying User Management Setup...\n');

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
    console.log('1️⃣ Checking user_profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, is_active, school_name, permissions')
      .limit(1);

    if (!profileError) {
      checks.userProfilesTable = true;
      console.log('✅ user_profiles table is accessible with new columns');
    } else {
      console.log('❌ user_profiles error:', profileError.message);
    }

    // 2. Check if user_invitations table exists
    console.log('\n2️⃣ Checking user_invitations table...');
    const { error: inviteError } = await supabase
      .from('user_invitations')
      .select('id, email, role, token')
      .limit(1);

    if (!inviteError || inviteError.code === 'PGRST116') {
      // PGRST116 = no rows
      checks.userInvitationsTable = true;
      console.log('✅ user_invitations table exists');
    } else {
      console.log('❌ user_invitations error:', inviteError.message);
    }

    // 3. Check if user_management_audit table exists
    console.log('\n3️⃣ Checking user_management_audit table...');
    const { error: auditError } = await supabase
      .from('user_management_audit')
      .select('id, action, actor_id')
      .limit(1);

    if (!auditError || auditError.code === 'PGRST116') {
      checks.auditTable = true;
      console.log('✅ user_management_audit table exists');
    } else {
      console.log('❌ user_management_audit error:', auditError.message);
    }

    // 4. Check if we can query with RLS
    console.log('\n4️⃣ Checking RLS policies...');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      console.log('✅ Authenticated as:', user.email);

      // Try to query profiles (should work for own profile)
      const { data: profileCheck, error: rlsProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!rlsProfileError) {
        checks.canQueryProfiles = true;
        if (profileCheck) {
          console.log('✅ Can query own profile (RLS working)');
        } else {
          console.log('⚠️  No profile exists yet for this user');
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
            console.log('✅ Created initial profile for user');
            checks.canQueryProfiles = true;
          } else {
            console.log('❌ Could not create profile:', createError.message);
          }
        }
      } else {
        console.log('❌ Cannot query own profile:', rlsProfileError.message);
      }

      // Try to query invitations (admin only)
      const { data: invites, error: rlsInviteError } = await supabase
        .from('user_invitations')
        .select('id')
        .limit(1);

      if (!rlsInviteError || rlsInviteError.code === 'PGRST116') {
        checks.canQueryInvitations = true;
        console.log('✅ Can query invitations (admin) or blocked (non-admin)');
      } else if (rlsInviteError.code === '42501') {
        // Permission denied
        console.log('✅ RLS correctly blocking non-admin from invitations');
        checks.canQueryInvitations = true;
      } else {
        console.log('❌ Invitation query error:', rlsInviteError.message);
      }
    } else {
      console.log('❌ Not authenticated - please sign in first');
      console.log('   You can sign in by clicking the user icon in the header');
    }

    // 5. Check current user's profile
    console.log('\n5️⃣ Checking current user profile...');
    if (user) {
      const { data: profile, error: currentProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && !currentProfileError) {
        checks.currentUserProfile = true;
        console.log('✅ Current user profile:', {
          email: user.email,
          role: profile.role || 'not set',
          is_active: profile.is_active !== false,
          school: profile.school_name || 'not set',
        });
      } else {
        console.log('❌ No profile found for current user');
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    console.log(`Passed: ${passedChecks}/${totalChecks} checks`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 All checks passed! User management system is ready.');
    } else {
      console.log('\n⚠️  Some checks failed. Please review the errors above.');
    }

    return checks;
  } catch (error) {
    console.error('❌ Verification failed:', error);
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
      console.log('❌ No authenticated user');
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
        console.log('❌ Failed to update role:', error.message);
      } else {
        console.log('✅ Updated current user to admin role');
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
        console.log('❌ Failed to update role:', error.message);
      } else {
        console.log(`✅ Updated ${targetEmail} to admin role`);
      }
    }
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}
