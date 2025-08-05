# Archive Directory

This directory contains files that are no longer actively used but are kept for historical reference.

## Contents

### `/data/` (Archived: 2024-08-05)
Legacy data files from the original import process. These files have been successfully imported into the Supabase database and are no longer needed for the application to function.

**Files:**
- `consolidated_lessons.json` - Original JSON file containing all 831 lesson plans
- `Lessn Plan Raw Text - HIGH Confidence Lessons.csv` - Raw text content for lessons

**Status:** All data has been imported to Supabase via the `npm run import-data` script.

## Archive Policy

### Purpose
Archives serve as historical reference for:
- Data migration history
- Debugging past issues
- Understanding system evolution
- Rollback scenarios

### Retention Guidelines

| Archive Type | Retention Period | Review Cycle |
|-------------|-----------------|--------------|
| Data files | 1 year | Quarterly |
| Debug scripts | 6 months | Quarterly |
| Migrations | Indefinite | Annually |
| Documentation | 2 years | Annually |

### Archive vs Delete Decision Tree

**Archive when:**
- File contains historical data that may be referenced
- Code demonstrates how a problem was solved
- Migration or schema changes that affect database structure
- Original source data for imports

**Delete when:**
- Temporary files or logs
- Generated files that can be recreated
- Test data with no historical value
- Files containing sensitive information past retention period

### Naming Conventions
- Use descriptive names: `original-filename_ARCHIVED_YYYY-MM-DD.ext`
- For directories: Keep original name, document in README
- For migrations: Keep original timestamp prefix

### Security Considerations
- Remove any hardcoded credentials before archiving
- Document if file contained sensitive data (without including the data)
- Review archived files for PII annually

## Adding to Archive

When archiving files:
1. Move files to appropriate subdirectory
2. Create README.md in subdirectory if not present
3. Update this README with:
   - What was archived
   - Date of archival (YYYY-MM-DD format)
   - Reason for archiving
   - Original location
   - Dependencies or context needed to understand the file
   - Retention period and review date

## Archived Locations Reference

| Location | Contents | Documentation |
|----------|----------|---------------|
| `/archive/data/` | Original import data | This file |
| `/scripts/archive/` | Deprecated scripts | `/scripts/archive/README.md` |
| `/supabase/migrations/archive/` | Applied migrations | `/supabase/migrations/archive/MANIFEST.md` |

## Restoration Process

If you need to restore archived files:
1. Check the relevant README for context
2. Review for compatibility with current codebase
3. Update any outdated dependencies or API calls
4. Test thoroughly in development environment
5. Document the restoration in project changelog