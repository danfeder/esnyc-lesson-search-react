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

Files in this directory:
- Are not required for the application to run
- Are kept for historical reference only
- Should not be modified
- May be permanently deleted after 1 year if no longer needed
- Should not be included in production deployments

## Adding to Archive

When archiving files:
1. Move files to appropriate subdirectory
2. Update this README with:
   - What was archived
   - Date of archival
   - Reason for archiving
   - Original location