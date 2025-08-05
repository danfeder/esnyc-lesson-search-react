# Archived Migrations Manifest

This directory contains migrations that have been applied and consolidated into the main migration files.

## Archive Date: 2025-08-01

### Consolidation Summary

The following migrations have been consolidated into organized migration files:

1. **Base Schema Migrations** → `01_base_schema.sql`
   - Initial table structures
   - Core database setup

2. **User Management Migrations** → `02_user_management.sql`
   - User profiles enhancements
   - User invitations
   - User roles and permissions
   - Audit tables

3. **Search Functionality Migrations** → `03_search_functionality.sql`
   - Full-text search setup
   - Search functions
   - Search optimizations

4. **Duplicate Resolution Migrations** → `04_duplicate_resolution.sql`
   - Duplicate detection tables
   - Resolution functions
   - Archive structures

5. **RLS Policies Migrations** → `05_rls_policies.sql`
   - All Row Level Security policies
   - Policy fixes and optimizations

### Archived Files

The individual migration files in this directory were applied in the following order:

#### July 2025 Migrations
- `20250709015027_long_rain.sql` - Initial setup
- `20250710003317_twilight_tooth.sql`
- `20250710003355_sweet_mouse.sql`
- `20250722024424_lesson_submission_pipeline_schema.sql`

#### January 2025 Migrations (Day 23)
- Search and review system setup
- RLS fixes

#### January 2025 Migrations (Day 24)
- Location and search filter fixes

#### January 2025 Migrations (Day 31)
- User management system
- Duplicate resolution system
- Various fixes and optimizations

These files are kept for historical reference and rollback purposes.

## User-Specific Migrations

The `/user-specific` subdirectory contains migrations that were created for specific user accounts or one-time fixes:

- `07_create_admin_profile.sql` - Creates admin profile for df@esynyc.org (specific to Dan Feder's account)
  - Created: 2025-08-01
  - Purpose: Fixed missing user profile issue after login
  - Should NOT be included in production deployments
  - Contains hardcoded user IDs specific to Dan's account

## Archive Reasoning

### Why These Were Archived
1. **Consolidation**: 40+ individual migrations were creating deployment complexity
2. **Performance**: Loading many small migrations slowed down database initialization
3. **Clarity**: Consolidated files are easier to understand and maintain
4. **Testing**: Fewer files means faster test database resets

### Why Keep Them
1. **Rollback capability**: Can reconstruct exact migration sequence if needed
2. **Debugging**: Understanding how current schema evolved
3. **Audit trail**: Documentation of all database changes
4. **Learning**: Examples of migration patterns and fixes

## Rollback Procedures

If you need to rollback to a specific point:

1. **Identify target state**: Find the migration file representing desired state
2. **Create rollback migration**: Use ROLLBACK-*.sql files as templates
3. **Test thoroughly**: Always test rollback on a branch database first
4. **Document changes**: Update this manifest with rollback details

## Migration Patterns Learned

From these archived migrations, key patterns emerged:

- **RLS Recursion Issues**: Multiple attempts to fix (see *_fix_rls_recursion_*.sql files)
- **Function Ambiguity**: PostgreSQL function overloading issues (see *_fix_*_function_ambiguity.sql)
- **Array Handling**: JSONB vs array type conversions (see *_fix_*_array_handling.sql)
- **View Security**: Proper RLS on views requires careful setup (see *_view_security.sql files)

## Review Schedule

- **Next Review Date**: 2026-08-01
- **Reviewer**: Team Lead
- **Action Items**: 
  - Verify all migrations still in consolidated files
  - Check for any migrations that can be permanently deleted
  - Update documentation if schema has significantly changed