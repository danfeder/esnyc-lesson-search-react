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