# Duplicate Detection Configuration

Last updated: 2025-09-01

## Current Configuration

### Thresholds
- **Semantic Similarity Threshold**: `0.5` (raised from 0.3)
- **Combined Score Floor**: `0.45` (filters out low-quality matches)
- **Max Results Per Submission**: `10` (limits storage and display)

### Scoring Weights

#### Combined Score Formula
```
combined_score = (title_similarity * 0.3) + (metadata_overlap * 0.2) + (semantic_similarity * 0.5)
```

#### Metadata Field Weights
| Field | Weight | Rationale |
|-------|--------|-----------|
| Grade Levels | 20% | Critical for age appropriateness |
| Thematic Categories | 20% | Core content categorization |
| Activity Type | 15% | Type of lesson activity |
| Cultural Heritage | 15% | Cultural context matters |
| Season Timing | 10% | When lesson is relevant |
| Main Ingredients | 10% | For cooking lessons |
| Cooking Methods | 10% | For cooking lessons |

### Match Type Classification
- **Exact**: `combined_score = 1.0` OR identical content hash
- **High**: `combined_score >= 0.85`
- **Medium**: `combined_score >= 0.7`
- **Low**: `combined_score >= 0.45` (below floor, filtered out)

## Title Similarity Algorithm

### Normalization Steps
1. Convert to lowercase
2. Remove punctuation (replaced with spaces)
3. Split into tokens
4. Remove stop words (the, a, an, is, are, etc.)
5. Calculate Jaccard similarity on token sets
6. Apply length ratio penalty

### Stop Words List
```
a, an, and, are, as, at, be, by, for, from, has, he, in, is, it, its, 
of, on, that, the, to, was, will, with, this, these, those, what, 
when, where, which, who, why, how
```

## Observability Metrics

The edge function logs the following metrics for each detection run:

```json
{
  "submissionId": "uuid",
  "matchCounts": {
    "exact": 0,
    "high": 1,
    "medium": 3,
    "low": 2,
    "total": 6,
    "preFilterTotal": 15,
    "filtered": 9
  },
  "scoreStats": {
    "min": 0.45,
    "max": 0.92,
    "avg": 0.68,
    "p50": 0.71,
    "p90": 0.89
  },
  "thresholds": {
    "semantic": 0.5,
    "combinedFloor": 0.45,
    "maxResults": 10
  }
}
```

## UI Behavior

### ReviewDashboard
- **Default View**: Shows exact, high, and medium matches only
- **Low Matches**: Hidden behind "Show X more low-quality matches" button
- **Max Display**: 5 matches shown inline (can expand)
- **Color Coding**:
  - Exact: Red (font-semibold)
  - High: Orange
  - Medium: Yellow
  - Low: Yellow with opacity-75

## Rollback Procedure

If issues arise, rollback to previous version:

```bash
# Check current version
supabase functions list | grep detect-duplicates

# Rollback edge function (replace XX with previous version)
# Note: Supabase doesn't support direct rollback, so keep previous version code

# Temporary mitigation: Lower thresholds in code
# - Set similarity_threshold back to 0.3
# - Set COMBINED_SCORE_FLOOR to 0.3
# - Redeploy
```

## Performance Targets

Based on improvement plan goals:
- **Low Match Reduction**: < 25% of persisted rows should be "low"
- **Score Distribution**: 
  - p50 ≥ 0.45 (achieved: ~0.45 with floor)
  - p90 ≥ 0.60 (monitoring needed)
- **Exact Duplicates**: 0 unresolved groups (currently: 13 groups pending resolution)

## Known Issues

1. **Exact Duplicates**: 13 groups with 2-3 identical lessons each need resolution
2. **Integration Tests**: Only unit tests exist, no mocked RPC integration tests
3. **Monitoring**: Metrics logged but not aggregated/dashboarded

## Testing Changes

To test configuration changes:

1. **Local Testing** (requires Docker):
```bash
supabase functions serve detect-duplicates --no-verify-jwt
```

2. **Unit Tests**:
```bash
npm test -- similarity.test.ts
```

3. **Manual Testing**:
- Submit a test lesson with known duplicates
- Check ReviewDashboard for match quality
- Query submission_similarities table for scores

## Future Improvements

1. **Dynamic Thresholds**: Adjust based on observed distribution
2. **Field-Specific Weights**: Allow per-lesson-type weight adjustments
3. **ML-Based Scoring**: Train model on reviewer decisions
4. **Batch Resolution Tool**: UI for resolving exact duplicates