# Duplicate Resolution Plan for ESNYC Lesson Library

## Overview

This document outlines the comprehensive plan for identifying and resolving duplicate lessons in the ESNYC Lesson Library database. The database currently contains 831 lessons with at least 55 exact duplicate groups and potentially many more near-duplicates.

## Problem Statement

1. **Exact Duplicates**: 55 groups of lessons with identical content hashes
2. **Near Duplicates**: Lessons with minor revisions, different titles, or slightly modified content
3. **Version Variations**: Multiple versions of the same lesson from different years or updates
4. **Title Variations**: Same lesson content with different naming conventions

## Phase 1: Comprehensive Duplicate Analysis

### 1.1 Create Duplicate Analysis Script

Create `scripts/analyze-duplicates.js` that performs multi-level duplicate detection:

```javascript
// Similarity Thresholds
const THRESHOLDS = {
  exact: 1.0,           // Same content hash
  nearDuplicate: 0.85,  // Very similar content via embeddings
  similar: 0.70,        // Related content
  titleMatch: 0.70      // Similar titles
};

// Analysis Steps:
1. Query all lessons with embeddings
2. Group by content_hash for exact duplicates
3. Use pgvector similarity search for near-duplicates
4. Calculate title similarity using Jaccard coefficient
5. Generate combined similarity scores
```

### 1.2 Canonical Version Criteria

Establish a scoring system to automatically suggest the best canonical version:

| Criteria | Weight | Description |
|----------|--------|-------------|
| Recency | 20% | Most recent last_modified date |
| Completeness | 30% | Count of non-empty metadata fields |
| Quality | 20% | Based on confidence scores |
| File Naming | 10% | Cleaner, more descriptive filenames |
| Processing Notes | 20% | Lessons without "duplicate" notes |

### 1.3 Analysis Report Format

Generate a JSON report with the following structure:

```json
{
  "analysisDate": "2024-01-25",
  "totalLessons": 831,
  "duplicateGroups": {
    "exact": 55,
    "nearDuplicate": 0,  // To be determined
    "titleVariations": 0  // To be determined
  },
  "groups": [
    {
      "groupId": "group_001",
      "type": "exact|near|title",
      "similarityScore": 0.95,
      "lessons": [
        {
          "lessonId": "abc123",
          "title": "Herbs as Medicine",
          "lastModified": "2015-02-12",
          "metadataCompleteness": 0.85,
          "canonicalScore": 0.78,
          "isRecommendedCanonical": true
        }
      ]
    }
  ]
}
```

## Phase 2: Admin Interface for Duplicate Resolution

### 2.1 Create Admin Routes

1. **Route**: `/admin/duplicates`
   - Protected route requiring admin role
   - Lists all duplicate groups
   - Filtering by duplicate type and resolution status

2. **Route**: `/admin/duplicates/[groupId]`
   - Detailed comparison view
   - Side-by-side metadata display
   - Resolution actions

### 2.2 UI Components

#### Duplicate List Component
```typescript
interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title';
  similarityScore: number;
  lessonCount: number;
  status: 'pending' | 'resolved';
  recommendedCanonical?: string;
}
```

#### Comparison View Features
- Side-by-side lesson display
- Metadata diff highlighting (show differences in red/green)
- Preview of lesson content
- Confidence scores and recommendations
- Action buttons: Select Canonical, Merge Metadata, Archive

### 2.3 Resolution Workflow

1. **Review Group**: Admin reviews duplicate group
2. **Compare Lessons**: Side-by-side comparison with diff highlighting
3. **Select Canonical**: Choose the canonical version (or accept recommendation)
4. **Merge Metadata**: Optionally merge missing metadata from duplicates
5. **Confirm Action**: Review changes before committing
6. **Archive Duplicates**: Move non-canonical versions to archive

## Phase 3: Database Schema Updates

### 3.1 New Tables

```sql
-- Track canonical lesson mappings
CREATE TABLE canonical_lessons (
  duplicate_id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL REFERENCES lessons(lesson_id),
  similarity_score FLOAT NOT NULL,
  resolution_type TEXT CHECK (resolution_type IN ('exact', 'near', 'version', 'title')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  resolution_notes TEXT
);

-- Archive for removed duplicates
CREATE TABLE lesson_archive (
  -- Same structure as lessons table
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT
);

-- Track resolution decisions
CREATE TABLE duplicate_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  metadata_merged JSONB,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### 3.2 Migration Strategy

1. **Backup Current Data**
   ```bash
   pg_dump -t lessons > lessons_backup_$(date +%Y%m%d).sql
   ```

2. **Create Archive Table**
   - Copy structure from lessons table
   - Add archive-specific columns

3. **Update References**
   - Update bookmarks to point to canonical lessons
   - Update lesson_collections to use canonical IDs
   - Update any foreign key references

## Phase 4: Implementation Steps

### 4.1 Week 1: Analysis and Reporting
- [ ] Create duplicate analysis script
- [ ] Generate comprehensive duplicate report
- [ ] Review findings and adjust thresholds
- [ ] Establish canonical selection criteria

### 4.2 Week 2: Admin Interface
- [ ] Create admin routes and components
- [ ] Implement comparison view
- [ ] Add resolution workflow
- [ ] Test with sample duplicate groups

### 4.3 Week 3: Database Cleanup
- [ ] Create new tables via migration
- [ ] Implement archival process
- [ ] Update all references
- [ ] Run cleanup on test database first

### 4.4 Week 4: Production Deployment
- [ ] Final testing on staging
- [ ] Backup production database
- [ ] Run duplicate resolution
- [ ] Verify data integrity

## Phase 5: Testing Submission Pipeline

After cleaning duplicates, test the submission pipeline:

### 5.1 Test Scenarios

1. **Exact Duplicate Submission**
   - Submit existing lesson URL
   - Verify detection and UI response

2. **Near Duplicate Submission**
   - Submit slightly modified lesson
   - Check similarity scoring
   - Test update vs. create flow

3. **Edge Cases**
   - Different title, same content
   - Same title, different content
   - Version updates

### 5.2 Success Criteria

- All exact duplicates detected (100% accuracy)
- Near duplicates detected with >85% similarity
- Reviewer can easily choose update vs. create
- No false positives blocking legitimate new lessons

## Monitoring and Maintenance

### Post-Cleanup Monitoring
- Track new duplicate submissions
- Monitor false positive rate
- Adjust similarity thresholds as needed

### Regular Maintenance
- Monthly duplicate analysis reports
- Quarterly threshold adjustments
- Annual full database audit

## Appendix: Technical Details

### Similarity Calculations

1. **Content Hash**: SHA-256 of normalized content
2. **Embedding Similarity**: Cosine similarity via pgvector
3. **Title Similarity**: Jaccard coefficient on word sets
4. **Combined Score**: Weighted average of all measures

### Performance Considerations

- Batch processing for large datasets
- Index optimization for similarity searches
- Caching for repeated calculations
- Progressive loading for UI

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feat/duplicate-resolution`
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews