# Phase 2: Review Interface Design

**Date:** 2025-12-02
**Status:** Approved - Ready for Implementation

## Overview

Rebuild the duplicate review interface from scratch, replacing the static JSON-based system with the new `duplicateGroupService.ts` backend built in Phase 1.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Rebuild from scratch | Old code tightly coupled to JSON format |
| Workflow | Hybrid (list + detail with Save & Next) | Enables fast sequential review |
| Layout | Responsive grid | Handles variable group sizes (2-5+ lessons) |
| State | Local useState + beforeunload warning | Simple, YAGNI, each save commits immediately |
| Archive linking | Dropdown per lesson | Supports multiple kept lessons scenario |

## Component Architecture

### New Files

```
src/pages/
  AdminDuplicatesNew.tsx      # List page
  AdminDuplicateReviewNew.tsx # Detail page

src/components/Admin/DuplicatesNew/
  DuplicateGroupCard.tsx      # Card in list view
  DuplicateReviewHeader.tsx   # Progress, confidence, detection method
  LessonReviewCard.tsx        # Lesson card with Keep/Archive selector
  ResolutionActions.tsx       # Bottom bar actions
```

### Routing

```typescript
/admin/duplicates-new          → AdminDuplicatesNew (list)
/admin/duplicates-new/:groupId → AdminDuplicateReviewNew (detail)
```

### Data Flow

1. List page calls `fetchDuplicateGroups()` from service
2. User clicks group → navigates to detail page
3. Detail page shows lessons in responsive grid
4. User makes Keep/Archive selections (local state)
5. "Save & Next" calls `resolveDuplicateGroup()` → navigates to next

## List Page Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Duplicate Resolution                                       │
│  Review and resolve duplicate lessons. 67 groups pending.   │
├─────────────────────────────────────────────────────────────┤
│  [Pending (67)]  [Resolved (12)]  [All (79)]                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Fattoush (3 lessons)                    [Review →]  │    │
│  │ High confidence · Same title + Similar content      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ... more groups ...                                        │
└─────────────────────────────────────────────────────────────┘
```

### Group Card Shows

- Primary title (from first lesson)
- Lesson count
- Confidence level (High/Medium)
- Detection reason ("Same title" / "Similar content (X%)" / "Both")
- "Review" button

### Filtering

- **Pending** (default) - not yet resolved
- **Resolved** - already handled
- **All** - both

## Detail Page Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to list          Group 12 of 67    [High Confidence]│
│                          Detected by: Same title            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ [Keep ▾]         │  │ [Archive → A ▾]  │  │ [Keep ▾]   │ │
│  ├──────────────────┤  ├──────────────────┤  ├────────────┤ │
│  │ Fattoush         │  │ Fattoush         │  │ Fattoush   │ │
│  │                  │  │ (Mobile Ed)      │  │ Deluxe     │ │
│  │ 2,456 chars      │  │ 2,341 chars      │  │ 1,892 chars│ │
│  │ Grades: 3-5      │  │ Grades: 3-5      │  │ Grades: 6-8│ │
│  │ ✓ Has summary    │  │ ✗ No summary     │  │ ✓ Has summ │ │
│  │                  │  │ ⚠ Table format   │  │            │ │
│  │ "A fresh Middle  │  │ "A fresh Middle  │  │ "An elev." │ │
│  │  Eastern salad." │  │  Eastern salad." │  │            │ │
│  │ [Open Doc ↗]     │  │ [Open Doc ↗]     │  │ [Open Doc] │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  [Keep All]              [Skip]           [Save & Next →]   │
└─────────────────────────────────────────────────────────────┘
```

### Lesson Card Shows

- **Dropdown**: Keep / Archive → [kept lessons]
- Title
- Content length (chars)
- Grade levels
- Summary indicator (✓/✗)
- Format warning (⚠ Table format) if applicable
- Content preview (~150 chars)
- Link to Google Doc

### Responsive Grid

- 3 columns on desktop
- 2 columns on tablet
- 1 column on mobile

### Actions

- **Keep All** - dismiss group, all stay active
- **Skip** - come back later, go to next
- **Save & Next** - resolve and advance to next pending

## State Management

### Selection State

```typescript
type Selection =
  | { action: 'keep' }
  | { action: 'archive'; archiveTo: string };

const [selections, setSelections] = useState<Record<string, Selection>>({});
```

### Initial State

- First lesson defaults to "Keep"
- All others default to "Archive → first lesson"

### Dropdown Behavior

- Archive dropdown shows only lessons currently marked "Keep"
- Changing Keep → Archive auto-selects first available kept lesson
- At least one lesson must remain "Keep" (validation)

### Quick Action

- "Keep only this one" - click any card to set it as Keep, all others Archive to it

### Unsaved Changes

- `beforeunload` event warns if navigating away with unsaved selections

## Resolution Flow

### Save & Next

1. Build `GroupResolution` from selections
2. Call `resolveDuplicateGroup()` from service
3. On success, navigate to next pending group
4. If no more pending, navigate to list with success message

### Keep All

1. Call `dismissDuplicateGroup()` from service
2. Records in `duplicate_group_dismissals` table
3. Navigate to next pending group

### Skip

1. No database changes
2. Navigate to next pending group
3. Skipped groups remain in "pending" filter

## Implementation Notes

### Why "New" Suffix

- Allows side-by-side development with existing pages
- Old pages (`AdminDuplicates.tsx`, `AdminDuplicateDetail.tsx`) removed in Phase 4
- Routes updated to remove "-new" suffix after cleanup

### Service Integration

Uses existing functions from `duplicateGroupService.ts`:
- `fetchDuplicateGroups()` - get all groups with metadata
- `resolveDuplicateGroup()` - execute resolution
- `dismissDuplicateGroup()` - keep all / dismiss

### Error Handling

- Show inline error if resolution fails
- Retry button available
- Don't navigate away on error

## Out of Scope

- Batch operations (resolve multiple groups at once)
- Undo/revert resolutions
- Title editing (available in old UI, defer to future if needed)
