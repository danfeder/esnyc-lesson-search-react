# Supabase Migrations

This directory contains consolidated database migrations for the ESNYC Lesson Search application.

## Consolidated Migration Structure

As of 2025-08-01, we've consolidated 51 individual migration files into 5 logical migration files:

### 1. `01_base_schema.sql`
- Core tables: lessons, user_profiles, lesson_submissions, submission_reviews
- Required extensions (uuid-ossp, pgcrypto, pg_trgm, unaccent, vector)
- Basic triggers and functions

### 2. `02_user_management.sql`
- User invitations table
- User management audit table
- Helper functions for role checking
- User activity logging
- Views for user profiles with emails

### 3. `03_search_functionality.sql`
- Full-text search configuration
- Search vector generation and maintenance
- Search indexes for performance
- Main search_lessons function with all filters
- Vector similarity search support

### 4. `04_duplicate_resolution.sql`
- Duplicate pairs detection table
- Resolution archive table
- Similarity calculation functions
- Duplicate detection and resolution functions
- Batch duplicate detection

### 5. `05_rls_policies.sql`
- Row Level Security policies for all tables
- Permission grants
- Security configuration

### 6. `06_fix_login_tracking.sql` (New)
- Fixes "Database error granting user" authentication issue
- Removes problematic auth.users trigger
- Creates safer manual login tracking mechanism
- Ensures user_management_audit table exists with proper structure

## Archive Directory

The `/archive` subdirectory contains all original migration files that were consolidated. These are kept for:
- Historical reference
- Rollback purposes
- Understanding the evolution of the schema

The `/archive/user-specific` subdirectory contains migrations specific to individual user accounts:
- These should NOT be run in production deployments
- They contain hardcoded user IDs or account-specific fixes

See `/archive/MANIFEST.md` for details about the archived migrations.

## Running Migrations

To apply these migrations to a new database:

```bash
# Apply all migrations in order
npx supabase db push

# Or apply individually
npx supabase db push --file migrations/01_base_schema.sql
npx supabase db push --file migrations/02_user_management.sql
# ... etc
```

## Important Notes

1. These migrations must be run in numerical order
2. They are designed to be idempotent (safe to run multiple times)
3. The consolidated migrations include all fixes and optimizations from the original files
4. Vector extension is required for embedding-based search functionality

## Future Migrations

When adding new migrations:
- Use the format: `XX_feature_name.sql` where XX is the next number
- Keep migrations focused on a single feature or area
- Include rollback instructions in comments
- Test on a development database first