# Lesson Submission Pipeline - Implementation Work Plan

## Overview
This document provides a detailed, day-by-day implementation plan for building the lesson submission pipeline. We're taking a "full schema, incremental features" approach - creating the complete database structure upfront while building features incrementally toward MVP.

## Pre-Implementation Checklist
- [ ] Supabase project access confirmed
- [ ] Google Cloud project for Docs API created
- [ ] OpenAI API key for embeddings obtained
- [ ] CSV file with lesson content accessible
- [ ] Development environment ready

---

## Week 1: Database Foundation & Data Import

### Day 1-2: Complete Database Schema Creation

#### Tasks:
1. **Create all database migrations**
   ```bash
   # Generate migration file
   supabase migration new lesson_submission_pipeline
   ```

2. **Add all new tables** (from specs):
   - `lesson_submissions`
   - `submission_reviews` 
   - `lesson_versions`
   - `submission_similarities`

3. **Modify existing tables**:
   - Add columns to `lessons` table
   - Add role column to `user_profiles`

4. **Create indexes**:
   - Standard B-tree indexes for foreign keys
   - GIN indexes for arrays
   - IVFFlat indexes for vector similarity

5. **Set up RLS policies**:
   - Basic policies for teacher submissions
   - Reviewer role access
   - Public read for lessons

#### Validation:
- [ ] All tables created successfully
- [ ] Foreign key constraints work
- [ ] RLS policies tested with sample data
- [ ] Indexes created without errors

### Day 3: Data Import Script

#### Tasks:
1. **Create import script** (`scripts/import-lesson-content.ts`):
   ```typescript
   // Pseudocode structure
   - Parse CSV with proper quote handling
   - Match lessons by FileID to lesson_id
   - Generate content hashes
   - Batch insert content_text
   - Log any mismatches
   ```

2. **Handle data quality issues**:
   - Missing FileIDs
   - Encoding problems
   - Extra long content

3. **Create verification queries**:
   ```sql
   -- Verify import success
   SELECT COUNT(*) FROM lessons WHERE content_text IS NOT NULL;
   SELECT lesson_id, LENGTH(content_text) FROM lessons ORDER BY LENGTH(content_text) DESC LIMIT 10;
   ```

#### Validation:
- [ ] All 832 lessons have content_text
- [ ] Content hashes generated
- [ ] No data corruption

### Day 4: Embedding Generation Setup

#### Tasks:
1. **Create Supabase Edge Function** (`supabase/functions/generate-embeddings`):
   - Accepts lesson_id
   - Fetches content_text
   - Calls OpenAI embeddings API
   - Stores result in content_embedding

2. **Build rate-limited queue processor**:
   - Process in batches of 20
   - Handle API errors gracefully
   - Track progress

3. **Create monitoring queries**:
   ```sql
   -- Track embedding progress
   SELECT 
     COUNT(*) FILTER (WHERE content_embedding IS NOT NULL) as completed,
     COUNT(*) as total
   FROM lessons;
   ```

#### Validation:
- [ ] Edge function deployed
- [ ] Successfully generates embeddings
- [ ] Rate limiting works

### Day 5: Generate All Embeddings

#### Tasks:
1. **Run embedding generation**:
   - Start with 50 test lessons
   - Monitor for errors
   - Then run full batch

2. **Verify pgvector search**:
   ```sql
   -- Test similarity search
   SELECT lesson_id, title, 
     content_embedding <=> (SELECT content_embedding FROM lessons WHERE lesson_id = 'test-id') as distance
   FROM lessons
   WHERE content_embedding IS NOT NULL
   ORDER BY distance
   LIMIT 5;
   ```

3. **Identify test dataset**:
   - Extract the 26 known duplicates
   - Create test cases document

#### Validation:
- [ ] 90%+ lessons have embeddings
- [ ] Vector similarity search returns results
- [ ] Test dataset documented

---

## Week 2: Duplicate Detection Engine

### Day 1: Core Similarity Functions

#### Tasks:
1. **Create utility functions** (`src/utils/similarity.ts`):
   ```typescript
   - calculateTitleSimilarity(title1, title2): number
   - generateContentHash(content): string
   - normalizeText(text): string
   ```

2. **Create Supabase functions**:
   ```sql
   -- Function to find similar lessons by embedding
   CREATE FUNCTION find_similar_lessons(
     embedding vector(1536),
     threshold float DEFAULT 0.5,
     limit int DEFAULT 10
   )
   ```

3. **Test with known duplicates**

#### Validation:
- [ ] Functions return expected similarity scores
- [ ] Known duplicates score > 0.85

### Day 2: Three-Layer Detection Implementation

#### Tasks:
1. **Build detection pipeline** (`src/services/duplicateDetection.ts`):
   ```typescript
   class DuplicateDetector {
     async detectDuplicates(content: string): Promise<DuplicateResults> {
       // 1. Hash check (exact match)
       // 2. Title similarity (fuzzy match) 
       // 3. Content similarity (embedding match)
       // Return combined results
     }
   }
   ```

2. **Create API endpoint** (`/api/check-duplicates`):
   - Accept content or Google Doc URL
   - Return similarity matches
   - Include match explanations

#### Validation:
- [ ] All three layers working
- [ ] API returns matches with scores
- [ ] Performance < 2 seconds

### Day 3-4: Accuracy Testing & Tuning

#### Tasks:
1. **Test with known duplicates**:
   - Run all 26 duplicate pairs
   - Measure detection accuracy
   - Document false negatives

2. **Test with known non-duplicates**:
   - Select 20 very different lessons
   - Verify low similarity scores
   - Document false positives

3. **Tune thresholds**:
   ```typescript
   const THRESHOLDS = {
     exact: 1.0,
     high: 0.85,  // Tune this
     medium: 0.70, // And this
     low: 0.50    // And this
   };
   ```

4. **Create accuracy report**:
   | Threshold | True Positives | False Positives | False Negatives |
   |-----------|----------------|-----------------|-----------------|
   | 0.85      | 24/26          | 2               | 2               |

#### Validation:
- [ ] 90%+ detection rate for known duplicates
- [ ] <5% false positive rate
- [ ] Thresholds documented

### Day 5: Integration & Edge Cases

#### Tasks:
1. **Handle edge cases**:
   - Very short lessons
   - Lessons without titles
   - Non-English content
   - Corrupted text

2. **Add caching layer**:
   - Cache recent comparisons
   - Cache embeddings

3. **Create performance benchmarks**:
   - Time for single detection
   - Time for batch detection
   - Memory usage

#### Validation:
- [ ] Edge cases handled gracefully
- [ ] Performance benchmarks documented
- [ ] Ready for integration

---

## Week 3: MVP Submission Flow

### Day 1: Submission Form UI

#### Tasks:
1. **Create submission page** (`src/pages/SubmitLesson.tsx`):
   ```tsx
   - Google Doc URL input
   - Validation (proper Google Docs URL)
   - Loading states
   - Error handling
   ```

2. **Add to router**:
   - Route: `/submit`
   - Require authentication

3. **Create success/error pages**

#### Validation:
- [ ] Form renders correctly
- [ ] URL validation works
- [ ] Submits to API

### Day 2: Google Docs Integration

#### Tasks:
1. **Create extraction function** (`supabase/functions/extract-google-doc`):
   ```typescript
   - Parse Doc ID from URL
   - Authenticate with Google
   - Extract plain text
   - Extract title
   - Handle permissions errors
   ```

2. **Add to submission flow**:
   - Call on form submit
   - Show extraction progress
   - Handle errors gracefully

#### Validation:
- [ ] Successfully extracts content
- [ ] Handles private docs appropriately
- [ ] Error messages helpful

### Day 3: Duplicate Warning Flow

#### Tasks:
1. **Integrate detection into submission**:
   - After extraction, check duplicates
   - Show warning modal if matches found
   - Allow override or cancel

2. **Create comparison UI**:
   ```tsx
   <DuplicateWarningModal
     matches={detectedMatches}
     onProceed={handleProceed}
     onCancel={handleCancel}
     onViewMatch={handleViewMatch}
   />
   ```

#### Validation:
- [ ] Warnings appear for duplicates
- [ ] User can view existing lessons
- [ ] Can proceed or cancel

### Day 4: Basic Review Interface

#### Tasks:
1. **Create review dashboard** (`src/pages/ReviewDashboard.tsx`):
   - List pending submissions
   - Show similarity badges
   - Basic approve/reject buttons

2. **Add review endpoints**:
   - GET `/api/review/pending`
   - POST `/api/review/approve`
   - POST `/api/review/reject`

3. **Update lesson on approval**:
   - Copy to main lessons table
   - Set canonical relationships

#### Validation:
- [ ] Dashboard shows submissions
- [ ] Can approve/reject
- [ ] Approved lessons appear in main collection

### Day 5: End-to-End Testing & Polish

#### Tasks:
1. **Complete workflow testing**:
   - Submit new lesson (no duplicates)
   - Submit duplicate lesson
   - Review and approve
   - Review and reject
   - Verify in main collection

2. **Add basic analytics**:
   ```sql
   -- Submission metrics
   SELECT 
     COUNT(*) as total_submissions,
     COUNT(*) FILTER (WHERE status = 'approved') as approved,
     AVG(EXTRACT(EPOCH FROM (review_completed_at - created_at))/3600) as avg_review_hours
   FROM lesson_submissions;
   ```

3. **Document MVP limitations**:
   - No tagging wizard yet
   - No revision workflow
   - Basic UI only

#### Validation:
- [ ] Full workflow works end-to-end
- [ ] No data corruption
- [ ] Performance acceptable

---

## Week 4: MVP Refinement (Buffer Week)

### Day 1-2: User Testing
- Have reviewer test the system
- Document feedback
- Fix critical issues

### Day 3-4: Performance Optimization
- Optimize slow queries
- Add database indexes if needed
- Improve UI responsiveness

### Day 5: Documentation & Handoff
- Create user guide for teachers
- Create guide for reviewer
- Document known issues

---

## Post-MVP Roadmap

### Phase 1: Tagging Wizard (Week 5-6)
- 11-step tagging interface
- Progress saving
- Smart defaults

### Phase 2: Version Control (Week 7-8)
- Version history UI
- Diff viewer
- Canonical relationship management

### Phase 3: Advanced Features (Week 9-10)
- Revision workflow
- Bulk operations
- Email notifications

### Phase 4: Polish & Launch (Week 11-12)
- UI/UX improvements
- Performance optimization
- Production deployment

---

## Risk Mitigation

### Technical Risks:
1. **Embedding API fails**: Have fallback to title/hash only
2. **Google Docs API limits**: Add caching, queue system
3. **Poor duplicate detection**: Manual override options

### Process Risks:
1. **Reviewer overwhelmed**: Add priority queue
2. **Too many false positives**: Tunable thresholds
3. **Data loss**: Regular backups, audit trail

---

## Success Metrics for MVP

### Must Have:
- [ ] Detects 90% of known duplicates
- [ ] <5% false positive rate  
- [ ] Submission to review < 5 minutes
- [ ] No data corruption

### Nice to Have:
- [ ] Reviewer completes review < 10 min
- [ ] Teachers find UI intuitive
- [ ] System handles 50 submissions/day

---

## Daily Standup Template

```
Date: ___________
Yesterday: 
- Completed: 
- Blockers:

Today:
- Planning to:
- Need help with:

Metrics:
- Lessons with embeddings: ___/832
- Known duplicates detected: ___/26
- API response time: ___ms
```