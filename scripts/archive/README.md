# Archived Scripts

This directory contains scripts that are no longer actively used but are kept for historical reference and debugging purposes.

## Contents

### `debug-edge-function.mjs`
- **Archived:** 2025-08-05
- **Original Purpose:** Debugging edge function issues during development
- **Reason for Archive:** Edge functions now stable, debugging moved to Supabase dashboard logs
- **Original Location:** `/scripts/`
- **Dependencies:** Node.js ES modules
- **Status:** Can be permanently deleted after 6 months if no issues arise

### `debug-user-email.sql`
- **Archived:** 2025-08-05  
- **Original Purpose:** SQL queries to debug user email retrieval issues
- **Reason for Archive:** Issue resolved with proper RLS policies and user profile views
- **Original Location:** `/scripts/`
- **Related Issues:** User email not displaying in admin dashboard
- **Status:** Keep for reference when debugging similar auth issues

## Usage Notes

These scripts should NOT be run in production. They were created for specific debugging scenarios that have been resolved.

If you need to reference these scripts:
1. Review the code to understand the debugging approach
2. Create new scripts based on current requirements
3. Do not directly execute without updating for current schema

## Archive Policy

Scripts in this directory:
- Are not part of the build or deployment process
- Should not be imported or required by active code
- May contain outdated API calls or schema references
- Should be reviewed before any reuse