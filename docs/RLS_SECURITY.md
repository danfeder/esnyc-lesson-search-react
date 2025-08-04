# Row Level Security (RLS) Documentation

## Overview

This document describes the Row Level Security implementation for the ESYNYC Lesson Search application. RLS ensures that users can only access and modify data they are authorized to see.

## Security Principles

1. **Principle of Least Privilege**: Users only have access to the minimum data required
2. **Defense in Depth**: Multiple layers of security (RLS + application logic)
3. **Fail Secure**: Default to denying access unless explicitly allowed
4. **Audit Trail**: All sensitive operations are logged

## Table Security Matrix

| Table | Public Read | Authenticated Read | Owner Write | Admin Write | Notes |
|-------|------------|-------------------|-------------|-------------|-------|
| `lessons` | ✅ | ✅ | ❌ | ✅ | Public can view all lessons |
| `user_profiles` | ❌ | Own only | Own (limited) | ✅ | Users can't change role/status |
| `lesson_submissions` | ❌ | Own only | Own (drafts) | ✅ | Teachers see own, reviewers see all |
| `submission_reviews` | ❌ | Related only | ❌ | ✅ | Teachers see reviews of their submissions |
| `user_invitations` | Token only | Own/Admin | ❌ | ✅ | Public needs token to view |
| `user_management_audit` | ❌ | Own logs | ❌ | Read only | Audit trail is immutable |
| `duplicate_pairs` | ❌ | Reviewers | ❌ | ✅ | Duplicate detection system |
| `duplicate_resolution_archive` | ❌ | ❌ | ❌ | ✅ | Archive is admin-only |
| `schools` | ✅ | ✅ | ❌ | ✅ | Everyone can view schools |
| `user_schools` | ✅ | ✅ | ❌ | ✅ | User-school relationships |
| `bookmarks` | ❌ | Own only | Own | ❌ | Personal bookmarks |
| `saved_searches` | ❌ | Own only | Own | ❌ | Personal saved searches |
| `lesson_collections` | Public only | Own + Public | Own | ❌ | Can be made public |

## Role Hierarchy

```
super_admin
    ↓
  admin
    ↓
 reviewer
    ↓
 teacher
```

### Role Capabilities

#### Teacher
- Create lesson submissions
- View own submissions and reviews
- Update own profile (limited fields)
- Manage own bookmarks and saved searches

#### Reviewer  
- All teacher capabilities
- View all submissions
- Create and update reviews
- View duplicate detection data

#### Admin
- All reviewer capabilities  
- Manage users and invitations
- Update any lesson
- View audit logs
- Resolve duplicates

#### Super Admin
- All admin capabilities
- Delete users
- Modify system settings
- Full database access

## Key Security Features

### 1. Protected Fields
Users cannot modify these fields on their own profile:
- `role` - Prevents privilege escalation
- `is_active` - Prevents self-activation
- `invited_by` - Audit trail integrity
- `created_at` - Timestamp integrity

### 2. Token-Based Access
User invitations use secure tokens for public access without authentication.

### 3. Audit Logging
All user management actions are logged in `user_management_audit` table with:
- Actor (who performed the action)
- Target (who was affected)
- Action type
- Timestamp
- Metadata

### 4. Service Role Functions
Sensitive operations use SECURITY DEFINER functions:
- `delete_user_safely()` - Only super_admin can delete users
- `test_rls_policies()` - Test RLS configuration

## Testing RLS Policies

### Manual Testing
```sql
-- Test as anonymous user
SET ROLE anon;
SELECT * FROM lessons; -- Should work
INSERT INTO lessons (title) VALUES ('Test'); -- Should fail

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM user_profiles WHERE id = 'user-uuid-here'; -- Should work
```

### Automated Testing
```bash
# Run RLS test suite
npm run test:rls

# This will:
# 1. Check all tables have RLS enabled
# 2. Verify policy counts
# 3. Test specific scenarios
# 4. Report any security issues
```

## Common Patterns

### 1. User Owns Resource
```sql
CREATE POLICY "Users can view own items" ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 2. Role-Based Access
```sql
CREATE POLICY "Admins can modify" ON table_name
  FOR ALL
  USING (is_admin(auth.uid()));
```

### 3. Public Read, Admin Write
```sql
CREATE POLICY "Public read" ON table_name
  FOR SELECT
  USING (true);

CREATE POLICY "Admin write" ON table_name
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
```

### 4. Conditional Access
```sql
CREATE POLICY "View public or own" ON table_name
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
```

## Troubleshooting

### Issue: "Permission Denied" Errors

1. Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'your_table';`
2. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. Test with service role to bypass RLS
4. Check user's role and permissions

### Issue: Users Can Access Unauthorized Data

1. Review SELECT policies on the table
2. Check for overly permissive USING clauses
3. Verify role checking functions
4. Test with different user roles

### Issue: Legitimate Operations Failing

1. Check if required policies exist
2. Verify auth.uid() is properly set
3. Check for restrictive WITH CHECK clauses
4. Review policy conditions

## Best Practices

1. **Always Enable RLS**: Never leave tables unprotected
2. **Test Policies**: Use the test suite after changes
3. **Document Policies**: Comment complex policies
4. **Audit Changes**: Log who changes what
5. **Fail Secure**: Deny by default, allow explicitly
6. **Regular Reviews**: Periodically audit RLS policies
7. **Use Helper Functions**: Centralize role checking logic

## Migration Rollback

If issues arise, the migration can be rolled back:

```bash
# Check rollback commands in:
supabase/migrations/08_complete_rls_policies.sql

# The file contains commented rollback SQL at the bottom
```

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] Each table has appropriate policies
- [ ] Sensitive fields are protected from user modification
- [ ] Audit logging is in place
- [ ] Service role is only used when necessary
- [ ] Policies are tested with different roles
- [ ] No overly permissive policies exist
- [ ] Documentation is up to date

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security#security-best-practices)