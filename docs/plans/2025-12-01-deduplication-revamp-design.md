# Lesson Deduplication Revamp - Design Document

**Date:** 2025-12-01
**Status:** Draft - Ready for Implementation

## Overview

A simplified duplicate cleanup system replacing the current complex workflow. Focus is on cleaning up existing 783 lessons, with prevention as a future phase.

## Goals

1. **Find all duplicates** - Using title matching + embedding similarity (~200 pairs)
2. **Make review fast** - Rich context so admins can decide in seconds
3. **Make it trustworthy** - Clear actions, proper archival, audit trail
4. **Keep it simple** - No complex scoring formulas or auto-resolution

## Non-Goals (This Phase)

- Prevention of new duplicates during submission
- Auto-resolution or batch operations
- "Related lessons" or "variations" features
- Re-generating embeddings or fixing data quality

## Key Findings from Data Analysis

### Duplicate Sources

| Source | Pairs | Detection Method |
|--------|-------|------------------|
| doc_id vs doc_id | 169 | Mostly embedding (154), some title (15) |
| doc_id vs lesson_* | 32 | Mostly title (31) |
| lesson_* vs lesson_* | 1 | Embedding |
| **Total** | **~200** | |

### Root Causes

1. **Title variations** - "(Mobile Education)", "(Part 1 & 2)", grade markers
2. **Cross-source import** - Same lesson imported twice with different extraction
3. **Embedding failures** - Table formatting causes negative similarity for true duplicates

### Data Quality Issues

- 83 `lesson_*` format lessons have empty summary fields (content extracted with [Table] markup)
- 4 "Unknown" title lessons (failed extraction)
- Previous 86 resolutions were done correctly (don't re-review)

### Estimated Impact

- 783 current lessons
- 264 involved in duplicate pairs (33.7%)
- ~60-80 groups to review
- ~190 lessons to archive
- **~593 lessons remaining after cleanup**

---

## Detection Logic

### Criteria

```sql
Flag as potential duplicate if:
  1. Same normalized title (case-insensitive, trimmed)
     OR
  2. Embedding similarity >= 0.95
```

### Why Both Signals

| Signal | Catches | Misses |
|--------|---------|--------|
| Same title | Cross-source dupes, format-broken pairs | Title variations |
| Embedding ≥0.95 | Title variations, similar content | Table-format pairs |

### Confidence Indicator

| Signals Present | Confidence |
|-----------------|------------|
| Same title + embedding ≥0.95 | **High** |
| Same title + embedding <0.95 | **Medium** (format issue) |
| Different title + embedding ≥0.95 | **Medium** |

### Grouping

Pairs clustered transitively: A↔B, B↔C → Group {A, B, C}

### Exclusions

- Skip pairs involving "Unknown" titled lessons
- Skip already-resolved groups from previous 86 resolutions
- Don't use 0.90 threshold (11,000+ false positives)

---

## Resolution Options

### Flexible Per-Lesson Marking

Admin marks each lesson in a group:

| Action | Result |
|--------|--------|
| **Keep** | Lesson stays active (canonical or distinct) |
| **Archive → [kept lesson]** | Archived with link to specified kept lesson |

### Example Scenario

5 lessons flagged: A, B, C, D are duplicates; E is distinct

| Lesson | Action | Link To |
|--------|--------|---------|
| A - Harvest Salsa | Keep | - |
| B - Harvest Salsa (Mobile) | Archive | → A |
| C - Harvest Salsa (P12X) | Archive | → A |
| D - Harvest Salsa (Px12) | Archive | → A |
| E - Salsa Verde | Keep | - |

**Result:** A and E remain active; B, C, D archived.

### Quick Actions

- **"Keep only this one"** - One-click: keep selected, archive rest linked to it
- **"Keep All"** - Dismiss group entirely, all stay active
- **"Skip"** - Come back later

---

## Review Interface

### Per Lesson Display

| Field | Purpose |
|-------|---------|
| Title | Spot variations |
| Summary | Quick content sense; empty = format issue |
| Content length | Big difference = probably not duplicates |
| Grade levels | Same or different coverage |
| Format indicator | Badge for table-format lessons |
| Preview (first 200 chars) | Scan actual content |
| Link to Google Doc | Open original if needed |

### Per Group Display

- Confidence indicator (High/Medium)
- Detection reason ("Same title" / "Similar content" / "Both")
- Progress: "Group 12 of 67"

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Group 12 of 67                          [High Confidence]  │
│  Detected by: Same title + Similar content                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ ○ Keep          │  │ ○ Keep          │  │ ● Keep       │ │
│  │ ● Archive → C   │  │ ● Archive → C   │  │              │ │
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤ │
│  │ Harvest Salsa   │  │ Harvest Salsa   │  │ Harvest Salsa│ │
│  │ (Mobile Ed)     │  │ (P12X)          │  │              │ │
│  │ 2,341 chars     │  │ 2,298 chars     │  │ 2,456 chars  │ │
│  │ Grades: 3-5     │  │ Grades: 3-5     │  │ Grades: 3-5  │ │
│  │ Has summary ✓   │  │ Has summary ✓   │  │ Has summary ✓│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│         [ Keep All ]              [ Save & Next → ]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### Tables to Modify/Create

**Option A: Reuse existing tables**
- `duplicate_resolutions` - Already exists, extend if needed
- `lesson_archive` - Already exists, already has `canonical_id`

**Option B: Simplified new approach**
- Add `duplicate_group_dismissals` table for "Keep All" decisions
- Use existing `lesson_archive` for archived lessons

### Key Fields for Resolution Tracking

```sql
-- Track dismissed groups (Keep All decisions)
CREATE TABLE duplicate_group_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_ids TEXT[] NOT NULL,  -- All lessons in the dismissed group
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  detection_method TEXT,  -- 'same_title', 'embedding', 'both'
  notes TEXT
);
```

### Archive Process

When archiving a duplicate:
1. Copy full lesson data to `lesson_archive`
2. Set `canonical_id` to the kept lesson
3. Set `archive_reason` describing the resolution
4. Delete from `lessons` table

---

## Implementation Phases

### Phase 1: Detection & Grouping (Backend)
- SQL query/function to find all duplicate pairs
- Grouping algorithm (union-find for transitive clustering)
- API endpoint to fetch groups with lesson details

### Phase 2: Review Interface (Frontend)
- New admin page or revamp existing `/admin/duplicates`
- Side-by-side comparison UI
- Keep/Archive selection per lesson
- Progress tracking

### Phase 3: Resolution Execution (Backend)
- API endpoint to submit resolution decisions
- Archive non-kept lessons with proper linking
- Record dismissals for "Keep All"
- Prevent re-flagging of resolved/dismissed groups

### Phase 4: Cleanup & Polish
- Remove old static JSON report dependency
- Clean up unused code from old system
- Update documentation

---

## Future Considerations (Out of Scope)

### Prevention Phase
- Detect duplicates during new lesson submission
- Warn submitter before creating duplicate
- Integration with `detect-duplicates` edge function

### Data Quality Improvements
- Backfill empty summaries for 53 unique `lesson_*` lessons
- Fix 4 "Unknown" titled lessons
- Consider re-generating embeddings with format normalization

### Related Lessons Feature
- Surface similar (but not duplicate) lessons
- "You might also like" functionality
- Version tracking for intentional variations

---

## Appendix: Detection Query

```sql
-- Find all duplicate pairs
WITH dup_pairs AS (
  SELECT DISTINCT
    LEAST(l1.lesson_id, l2.lesson_id) as id1,
    GREATEST(l1.lesson_id, l2.lesson_id) as id2,
    CASE
      WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
           AND 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
      THEN 'both'
      WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
      THEN 'same_title'
      ELSE 'embedding'
    END as detection_method,
    1 - (l1.content_embedding <=> l2.content_embedding) as similarity
  FROM lessons l1
  CROSS JOIN lessons l2
  WHERE l1.lesson_id < l2.lesson_id
    AND l1.title != 'Unknown'
    AND l2.title != 'Unknown'
    AND (
      LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
      OR 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
    )
)
SELECT * FROM dup_pairs
ORDER BY
  CASE detection_method
    WHEN 'both' THEN 1
    WHEN 'same_title' THEN 2
    ELSE 3
  END,
  similarity DESC;
```

---

## Summary

- **~200 pairs** to review, forming **60-80 groups**
- **Flexible resolution**: Keep multiple, archive some, or dismiss all
- **Rich context**: Titles, summaries, lengths, format indicators
- **Simple detection**: Title match OR embedding ≥0.95
- **~45-90 minutes** estimated cleanup time
- **~593 lessons** remaining after cleanup (down from 783)
