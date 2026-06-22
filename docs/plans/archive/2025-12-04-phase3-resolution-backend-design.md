# Phase 3: Resolution Backend Design

**Date:** 2025-12-04
**Status:** Approved - Ready for Implementation

## Overview

Simplify the backend resolution logic by replacing the old `resolve_duplicate_group` SQL function with a cleaner, purpose-built `archive_duplicate_lesson` function.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Archive approach | Hard delete + archive | Keeps `lessons` table clean, `lesson_archive` preserves data |
| SQL function | Build new, remove old | Old function has baggage we don't need |
| `duplicate_resolutions` table | Don't use | `lesson_archive` provides sufficient audit trail |
| User tracking | Use `auth.uid()` | Automatic, can't be spoofed |
| Re-flagging prevention | Current approach works | Archived lessons gone, dismissals filtered |

## New SQL Function

### `archive_duplicate_lesson(p_lesson_id TEXT, p_canonical_id TEXT)`

**Purpose:** Archive a single lesson as a duplicate of another lesson.

**Steps:**
1. Verify caller is admin (using existing `is_admin()` function)
2. Verify lesson to archive exists
3. Verify canonical lesson exists
4. Copy lesson to `lesson_archive` with:
   - `archived_by` = `auth.uid()`
   - `archived_at` = `now()`
   - `canonical_id` = the kept lesson
   - `archive_reason` = "Archived as duplicate of {canonical_id}"
5. Delete from `lessons` table
6. Return success

**Error cases:**
- Not admin → error
- Lesson doesn't exist → error
- Canonical lesson doesn't exist → error

**Design notes:**
- One lesson at a time (caller loops if needed)
- Single function = atomic transaction
- Simple interface: just two IDs

## Service Layer Changes

### `resolveDuplicateGroup()` in `duplicateGroupService.ts`

**Current:** Calls old `resolve_duplicate_group` with many parameters.

**New:**
```typescript
for (const archiveRes of toArchive) {
  const { error } = await supabase.rpc('archive_duplicate_lesson', {
    p_lesson_id: archiveRes.lessonId,
    p_canonical_id: archiveRes.archiveTo,
  });

  if (error) throw error;
}
```

**What stays the same:**
- Validation logic (at least one "keep", archive targets must be kept lessons)
- Return type `{ success, archivedCount, keptCount, error }`

**What's removed:**
- Hardcoded `p_duplicate_type`, `p_similarity_score`, etc.

### `dismissDuplicateGroup()`

No changes needed - already works correctly via `duplicate_group_dismissals` table.

## What We're Removing

### `resolve_duplicate_group` SQL function

- Old function designed for previous JSON-based workflow
- Has parameters we don't need (duplicate_type, similarity_score, resolution mode)
- Writes to `duplicate_resolutions` table (which we're not using)
- Will be dropped in the migration that creates the new function

## What We're NOT Changing

### Tables
- `duplicate_resolutions` - Leave historical data, clean up in Phase 4 if desired
- `duplicate_group_dismissals` - Works correctly for "Keep All"
- `lesson_archive` - Already has all columns we need

### Functions
- `find_duplicate_pairs` - Detection logic, works fine
- `get_lesson_details_for_review` - Fetches lesson data, works fine

## Re-flagging Prevention

Already works correctly:
- **Archived lessons** → Gone from `lessons` table → Won't be re-detected
- **Dismissed groups** → Stored in `duplicate_group_dismissals` → Filtered by `fetchDuplicateGroups`

## Implementation Plan

### Migration file
One migration that:
1. Creates `archive_duplicate_lesson` function
2. Drops `resolve_duplicate_group` function

### Service update
Update `resolveDuplicateGroup()` to call new function.

### Testing
- Test with Phase 2 UI
- Verify lessons archived correctly
- Verify `lesson_archive` has correct `archived_by`, `canonical_id`, `archive_reason`

## Out of Scope

- Changes to `duplicate_resolutions` table (Phase 4 cleanup)
- Changes to detection logic
- Prevention of new duplicates during submission (future phase)
