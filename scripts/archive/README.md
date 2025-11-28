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

### Scripts Archived 2025-11-28 (Codebase Cleanup PR #313)

The following scripts were archived as they are not registered in package.json and serve one-time or deprecated purposes:

| Script | Original Purpose |
|--------|-----------------|
| `backfill-publish-approved.ts` | One-time backfill for publish approval status |
| `create-reviewer-profile.js` | Create reviewer user profiles (one-time setup) |
| `create-test-profiles.js` | Create test user profiles (one-time setup) |
| `fix-mock-submissions.ts` | Fix mock submission data |
| `fix-rls-policies.js` | One-time RLS policy fixes |
| `generate-missing-embeddings.ts` | Generate embeddings for lessons missing them |
| `get-service-account-info.ts` | Debug Google service account configuration |
| `migrate-to-gemini-embeddings.ts` | One-time migration from OpenAI to Gemini embeddings |
| `test-duplicate-resolution.ts` | Test duplicate resolution functionality |
| `verify-gemini-migration.ts` | Verify Gemini embedding migration completed |
| `test-edge-function.js` | Duplicate of test-edge-function.ts |

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