# ESYNYC Lesson Submission Pipeline Specifications

## Table of Contents
1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Duplicate Detection Algorithm](#duplicate-detection-algorithm)
6. [Workflow States](#workflow-states)
7. [User Interface Specifications](#user-interface-specifications)
8. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

### Purpose
The Lesson Submission Pipeline is a comprehensive system for managing the submission, review, and approval of new and updated lesson plans for the ESYNYC Lesson Library. It addresses the critical need to prevent duplicate lessons while maintaining version history and ensuring quality through a structured review process.

### Key Objectives
1. **Eliminate Duplicates**: Use AI-powered detection to identify and consolidate duplicate lessons
2. **Streamline Review**: Provide an efficient interface for the dedicated reviewer to tag and approve lessons
3. **Maintain History**: Track version changes while keeping the main collection clean
4. **Ensure Quality**: Enforce consistent tagging across all filter categories

### System Components
- **Submission Portal**: Teacher-facing interface for submitting Google Doc links
- **Duplicate Detection Engine**: AI-powered system using content analysis
- **Review Dashboard**: Reviewer interface for tagging and approval
- **Version Control System**: Manages lesson versions and canonical relationships
- **Integration Layer**: Connects with existing frontend and Supabase backend

---

## System Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Teacher Portal │────▶│  Submission API  │────▶│  Google Docs    │
│                 │     │                  │     │      API        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │                  │
                        │  Duplicate       │◀────┐
                        │  Detection       │     │
                        │  Engine          │     │
                        └──────────────────┘     │
                                │                │
                                ▼                │
                        ┌──────────────────┐     │
                        │                  │     │
                        │  Supabase DB     │─────┘
                        │  - submissions   │
                        │  - lessons       │
                        │  - versions      │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │                  │
                        │  Review          │
                        │  Dashboard       │
                        │                  │
                        └──────────────────┘
```

### Technology Stack
- **Frontend**: React 19 + TypeScript (consistent with main app)
- **Backend**: Supabase Edge Functions
- **Database**: PostgreSQL with pgvector extension
- **AI/ML**: OpenAI Embeddings API for semantic similarity
- **External APIs**: Google Docs API for content extraction

### Security Considerations
- All submissions require authenticated teachers
- Reviewer role enforced through RLS policies
- Google Doc permissions validated before extraction
- Rate limiting on submission endpoint

---

## Database Schema

### New Tables

#### `lesson_submissions`
Stores all submitted lessons awaiting review.

```sql
CREATE TABLE lesson_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  google_doc_url TEXT NOT NULL,
  google_doc_id TEXT NOT NULL,
  extracted_content TEXT,
  content_hash VARCHAR(64),
  content_embedding vector(1536),
  
  -- Submission metadata
  submission_type TEXT CHECK (submission_type IN ('new', 'update')) NOT NULL,
  original_lesson_id TEXT REFERENCES lessons(lesson_id),
  
  -- Status tracking
  status TEXT CHECK (status IN ('submitted', 'in_review', 'needs_revision', 'approved')) NOT NULL DEFAULT 'submitted',
  reviewer_id UUID REFERENCES auth.users(id),
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  
  -- Reviewer feedback
  reviewer_notes TEXT,
  revision_requested_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_submissions_status ON lesson_submissions(status);
CREATE INDEX idx_submissions_teacher ON lesson_submissions(teacher_id);
CREATE INDEX idx_submissions_hash ON lesson_submissions(content_hash);
CREATE INDEX idx_submissions_embedding ON lesson_submissions USING ivfflat (content_embedding vector_cosine_ops);
```

#### `submission_reviews`
Tracks the review process and tagging decisions.

```sql
CREATE TABLE submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES lesson_submissions(id) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Tagged metadata (matches lesson metadata structure)
  tagged_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Duplicate detection results
  detected_duplicates JSONB DEFAULT '[]', -- Array of {lesson_id, similarity_score, match_type}
  canonical_lesson_id TEXT, -- If marking as version of existing
  
  -- Review process
  review_started_at TIMESTAMPTZ DEFAULT NOW(),
  review_completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `lesson_versions`
Archives historical versions of lessons.

```sql
CREATE TABLE lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of lesson data at this version
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  file_link TEXT NOT NULL,
  grade_levels TEXT[] NOT NULL,
  metadata JSONB NOT NULL,
  content_text TEXT,
  
  -- Version metadata
  archived_from_submission_id UUID REFERENCES lesson_submissions(id),
  archived_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT,
  
  UNIQUE(lesson_id, version_number)
);
```

#### `submission_similarities`
Pre-computed similarity scores for efficient duplicate detection.

```sql
CREATE TABLE submission_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES lesson_submissions(id) NOT NULL,
  lesson_id TEXT NOT NULL,
  
  -- Similarity metrics
  title_similarity FLOAT CHECK (title_similarity >= 0 AND title_similarity <= 1),
  content_similarity FLOAT CHECK (content_similarity >= 0 AND content_similarity <= 1),
  metadata_overlap_score FLOAT CHECK (metadata_overlap_score >= 0 AND metadata_overlap_score <= 1),
  combined_score FLOAT CHECK (combined_score >= 0 AND combined_score <= 1),
  
  -- Match details
  match_type TEXT CHECK (match_type IN ('exact', 'high', 'medium', 'low')),
  match_details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_similarities_submission ON submission_similarities(submission_id);
CREATE INDEX idx_similarities_score ON submission_similarities(combined_score DESC);
```

### Updates to Existing Tables

#### `lessons` table modifications
```sql
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_embedding vector(1536);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS canonical_id TEXT REFERENCES lessons(lesson_id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS has_versions BOOLEAN DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS original_submission_id UUID REFERENCES lesson_submissions(id);

-- Index for embedding similarity search
CREATE INDEX idx_lessons_embedding ON lessons USING ivfflat (content_embedding vector_cosine_ops);
CREATE INDEX idx_lessons_canonical ON lessons(canonical_id) WHERE canonical_id IS NOT NULL;
```

#### `user_profiles` table modifications
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('teacher', 'reviewer', 'admin')) DEFAULT 'teacher';
```

---

## API Endpoints

### Submission Endpoints

#### `POST /api/submissions/create`
Create a new lesson submission.

**Request:**
```json
{
  "google_doc_url": "https://docs.google.com/document/d/...",
  "submission_type": "new" | "update",
  "original_lesson_id": "lesson_123" // Only for updates
}
```

**Response:**
```json
{
  "submission_id": "uuid",
  "status": "submitted",
  "duplicate_check": {
    "has_potential_duplicates": true,
    "top_matches": [
      {
        "lesson_id": "lesson_456",
        "title": "Similar Lesson Title",
        "similarity_score": 0.92,
        "match_type": "high"
      }
    ]
  }
}
```

#### `GET /api/submissions/check-duplicate`
Check if a Google Doc URL already exists in the system.

**Request:**
```
GET /api/submissions/check-duplicate?url=https://docs.google.com/document/d/...
```

**Response:**
```json
{
  "exists": true,
  "lesson_id": "lesson_123",
  "title": "Existing Lesson Title",
  "last_modified": "2024-01-15"
}
```

### Review Endpoints

#### `GET /api/review/queue`
Get pending submissions for review.

**Response:**
```json
{
  "submissions": [
    {
      "submission_id": "uuid",
      "teacher_name": "Ms. Johnson",
      "google_doc_url": "...",
      "submitted_at": "2025-01-22T10:00:00Z",
      "extracted_title": "New Pizza Making Lesson",
      "detected_duplicates_count": 3,
      "highest_similarity": 0.85
    }
  ],
  "total_count": 15,
  "in_review_count": 2
}
```

#### `POST /api/review/start`
Start reviewing a submission.

**Request:**
```json
{
  "submission_id": "uuid"
}
```

#### `GET /api/review/details/:submission_id`
Get full details for review including duplicate analysis.

**Response:**
```json
{
  "submission": {
    "id": "uuid",
    "google_doc_url": "...",
    "extracted_content": "Full lesson text...",
    "teacher": {
      "name": "Ms. Johnson",
      "email": "teacher@school.edu"
    }
  },
  "duplicate_analysis": {
    "exact_matches": [],
    "high_similarity": [
      {
        "lesson_id": "lesson_456",
        "title": "Pizza Workshop Basics",
        "similarity_score": 0.92,
        "match_details": {
          "title_similarity": 0.85,
          "content_similarity": 0.94,
          "shared_grades": ["3", "4", "5"],
          "shared_tags": ["cooking", "Italian"]
        }
      }
    ],
    "medium_similarity": []
  }
}
```

#### `POST /api/review/tag`
Save tagging decisions for a submission.

**Request:**
```json
{
  "submission_id": "uuid",
  "metadata": {
    "gradeLevels": ["3", "4", "5"],
    "activityType": ["cooking-only"],
    "location": ["Indoor"],
    "seasons": ["Fall", "Winter"],
    "thematicCategories": ["Food Systems"],
    "culturalHeritage": ["Italian", "Mediterranean"],
    "coreCompetencies": ["Kitchen Skills and Related Academic Content"],
    "lessonFormat": ["Single period"],
    "academicIntegration": ["Math", "Science"],
    "socialEmotionalLearning": ["Self-management"],
    "cookingMethods": "Stovetop"
  }
}
```

#### `POST /api/review/approve`
Approve a submission and create/update the lesson.

**Request:**
```json
{
  "submission_id": "uuid",
  "action": "create_new" | "create_version",
  "canonical_lesson_id": "lesson_123" // Only for create_version
}
```

#### `POST /api/review/request-revision`
Send submission back for revision.

**Request:**
```json
{
  "submission_id": "uuid",
  "reason": "Missing learning objectives and assessment details",
  "specific_feedback": [
    "Please add clear learning objectives",
    "Include assessment rubric"
  ]
}
```

### Utility Endpoints

#### `GET /api/lessons/versions/:lesson_id`
Get version history for a lesson.

**Response:**
```json
{
  "current_version": {
    "version_number": 3,
    "title": "Current Title",
    "last_modified": "2025-01-15"
  },
  "versions": [
    {
      "version_number": 1,
      "title": "Original Title",
      "archived_at": "2024-06-01",
      "archive_reason": "Content update"
    }
  ]
}
```

---

## Duplicate Detection Algorithm

### Overview
The duplicate detection system uses a multi-layered approach combining exact matching, fuzzy string matching, and semantic similarity through AI embeddings.

### Algorithm Steps

#### 1. Content Extraction
```typescript
async function extractContent(googleDocUrl: string): Promise<ExtractedContent> {
  // 1. Parse Google Doc ID from URL
  const docId = parseGoogleDocId(googleDocUrl);
  
  // 2. Fetch content via Google Docs API
  const docContent = await googleDocsAPI.documents.get(docId);
  
  // 3. Extract plain text
  const plainText = extractPlainText(docContent);
  
  // 4. Extract structured elements
  const title = extractTitle(docContent);
  const sections = extractSections(docContent);
  
  return { plainText, title, sections, docId };
}
```

#### 2. Hash Generation
```typescript
function generateContentHash(content: string): string {
  // Normalize content for consistent hashing
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  return crypto.createHash('sha256')
    .update(normalized)
    .digest('hex');
}
```

#### 3. Embedding Generation
```typescript
async function generateEmbedding(content: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content.substring(0, 8000), // Token limit
  });
  
  return response.data[0].embedding;
}
```

#### 4. Similarity Calculation
```typescript
interface SimilarityScores {
  titleSimilarity: number;
  contentSimilarity: number;
  metadataOverlap: number;
  combined: number;
}

function calculateSimilarity(
  submission: Submission,
  existingLesson: Lesson
): SimilarityScores {
  // Title similarity using Levenshtein distance
  const titleSim = calculateTitleSimilarity(
    submission.title,
    existingLesson.title
  );
  
  // Content similarity using cosine similarity of embeddings
  const contentSim = cosineSimilarity(
    submission.embedding,
    existingLesson.embedding
  );
  
  // Metadata overlap (grades, tags, etc.)
  const metadataOverlap = calculateMetadataOverlap(
    submission.metadata,
    existingLesson.metadata
  );
  
  // Weighted combination
  const combined = (
    titleSim * 0.3 +
    contentSim * 0.5 +
    metadataOverlap * 0.2
  );
  
  return {
    titleSimilarity: titleSim,
    contentSimilarity: contentSim,
    metadataOverlap,
    combined
  };
}
```

#### 5. Match Classification
```typescript
function classifyMatch(similarity: number): MatchType {
  if (similarity >= 0.95) return 'exact';
  if (similarity >= 0.85) return 'high';
  if (similarity >= 0.70) return 'medium';
  if (similarity >= 0.50) return 'low';
  return 'none';
}
```

### Similarity Thresholds
- **Exact Match (≥95%)**: Nearly identical content, likely the same lesson
- **High Similarity (85-94%)**: Strong candidate for being a version
- **Medium Similarity (70-84%)**: Related content, manual review needed
- **Low Similarity (50-69%)**: Some overlap, probably different lessons

### Performance Optimizations
1. **Pre-compute embeddings** for all existing lessons
2. **Use vector index** (pgvector) for fast similarity search
3. **Cache recent comparisons** to avoid recomputation
4. **Batch process** multiple submissions

---

## Workflow States

### State Diagram
```
                    ┌─────────────┐
                    │  submitted  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                ┌───│  in_review  │───┐
                │   └─────────────┘   │
                │                     │
                ▼                     ▼
        ┌───────────────┐     ┌─────────────┐
        │needs_revision │     │  approved   │
        └───────┬───────┘     └─────────────┘
                │
                └─────────────────┘
```

### State Definitions

#### `submitted`
- Initial state when teacher submits
- System extracts content and runs duplicate detection
- Appears in review queue
- **Transitions to**: `in_review`

#### `in_review`
- Reviewer has opened the submission
- Reviewer is actively tagging/reviewing
- Locked to prevent multiple reviewers
- **Transitions to**: `approved`, `needs_revision`

#### `needs_revision`
- Reviewer requested changes
- Teacher notified with specific feedback
- Can be resubmitted with same submission ID
- **Transitions to**: `submitted` (after resubmission)

#### `approved`
- Review complete, tags applied
- Lesson created/updated in main collection
- Version archived if applicable
- **Terminal state**

### State Transition Rules
1. Only one reviewer can have a submission `in_review`
2. State changes trigger email notifications
3. All transitions logged in audit table
4. Submissions auto-expire after 30 days if not reviewed

---

## User Interface Specifications

### Teacher Submission Portal

#### Submission Form
```
┌─ Submit a Lesson Plan ─────────────────────────────┐
│                                                    │
│  Google Doc URL *                                  │
│  ┌────────────────────────────────────────────┐   │
│  │ https://docs.google.com/document/d/...     │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Is this an update to an existing lesson?          │
│  ○ No, this is a new lesson                       │
│  ○ Yes, this updates an existing lesson           │
│                                                    │
│  [Additional fields appear if "Yes" selected]      │
│                                                    │
│  Additional Notes (optional)                       │
│  ┌────────────────────────────────────────────┐   │
│  │                                            │   │
│  │                                            │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│         [Cancel]  [Submit for Review]              │
└────────────────────────────────────────────────────┘
```

#### Duplicate Warning Modal
```
┌─ Potential Duplicate Found ────────────────────────┐
│                                                    │
│  ⚠️  Similar lesson detected                       │
│                                                    │
│  Your submission appears similar to:               │
│  "Pizza Making Workshop" (85% match)               │
│                                                    │
│  Would you like to:                                │
│  ○ Update the existing lesson                      │
│  ○ Continue with new lesson submission             │
│                                                    │
│  [View Existing Lesson]                            │
│                                                    │
│         [Cancel]  [Continue]                       │
└────────────────────────────────────────────────────┘
```

### Review Dashboard

#### Queue View
```
┌─ Review Queue ─────────────────────────────────────┐
│ Pending Reviews: 12  │  In Progress: 1            │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌─ Submission #1 ────────────────────────────────┐ │
│ │ Title: Garden-Based Pizza Making               │ │
│ │ Teacher: Ms. Johnson                           │ │
│ │ Submitted: 2 hours ago                         │ │
│ │ 🔍 High similarity detected (3 matches)        │ │
│ │                                [Start Review]  │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ┌─ Submission #2 ────────────────────────────────┐ │
│ │ Title: Composting Basics for 3rd Grade        │ │
│ │ Teacher: Mr. Davis                             │ │
│ │ Submitted: 1 day ago                           │ │
│ │ ✓ No duplicates detected                      │ │
│ │                                [Start Review]  │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

#### Review Interface
```
┌─ Review: Garden-Based Pizza Making ────────────────┐
│                                                    │
│ [Document Preview]          [Duplicate Analysis]   │
│ ┌────────────────┐         ┌────────────────────┐ │
│ │                │         │ 92% Pizza Workshop │ │
│ │  Google Doc    │         │ 78% Italian Cook.. │ │
│ │   Content      │         │ 65% Bread Making  │ │
│ │                │         │                   │ │
│ └────────────────┘         └────────────────────┘ │
│                                                    │
│ ─────────────── Tagging Wizard ─────────────────── │
│                                                    │
│ Step 1 of 11: Grade Levels                        │
│ ┌────────────────────────────────────────────────┐ │
│ │ ☐ 3K   ☐ PK   ☐ K    ☐ 1    ☐ 2              │ │
│ │ ☑ 3    ☑ 4    ☑ 5    ☐ 6    ☐ 7    ☐ 8      │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ [Previous]  [Next: Activity Type]                  │
│                                                    │
│ ─────────────── Quick Actions ──────────────────── │
│                                                    │
│ Version Management:                                │
│ ○ Create as new lesson                             │
│ ○ Update existing lesson: [Select lesson ▼]        │
│                                                    │
│ [Request Revision]  [Save Progress]  [Approve]     │
└────────────────────────────────────────────────────┘
```

#### Tagging Wizard Steps
1. **Grade Levels** - Multi-select checkboxes
2. **Activity Type** - Single-select (Cooking/Garden/Both/Academic)
3. **Location** - Single-select (Indoor/Outdoor/Both)
4. **Season & Timing** - Multi-select with year-round option
5. **Thematic Categories** - Multi-select from 7 themes
6. **Cultural Heritage** - Hierarchical multi-select
7. **Core Competencies** - Multi-select from 6 competencies
8. **Lesson Format** - Single-select dropdown
9. **Academic Integration** - Multi-select subjects
10. **Social-Emotional Learning** - Multi-select SEL skills
11. **Cooking Methods** - Single-select dropdown

### Side-by-Side Comparison View
```
┌─ Compare Lessons ──────────────────────────────────┐
│                                                    │
│  New Submission          │  Existing Lesson        │
│ ─────────────────────────┼──────────────────────── │
│  Garden Pizza Making     │  Pizza Workshop Basics  │
│  Submitted: Today        │  Updated: 2024-03-15    │
│  Grades: 3-5            │  Grades: 3-5            │
│                         │                         │
│  [Highlighted differences in content]              │
│                                                    │
│  Similarity: 92%                                   │
│  - Title: 78% match                               │
│  - Content: 94% match                             │
│  - Same grade levels                              │
│  - Similar ingredients                            │
│                                                    │
│  [Create as New]  [Update Existing]                │
└────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Database Setup**
   - Create all new tables
   - Update existing tables
   - Set up pgvector extension
   - Create RLS policies

2. **Content Import Pipeline**
   - Import CSV data to database
   - Generate hashes for existing content
   - Create embeddings for all lessons
   - Identify and link known duplicates

### Phase 2: Core APIs (Week 3-4)
1. **Google Docs Integration**
   - Set up API credentials
   - Build content extraction
   - Handle permissions/errors

2. **Duplicate Detection Engine**
   - Implement similarity algorithms
   - Build embedding generation
   - Create similarity search
   - Test with known duplicates

### Phase 3: Submission System (Week 5-6)
1. **Teacher Portal**
   - Build submission form
   - Add validation
   - Implement duplicate warnings
   - Create submission tracking

2. **Submission API**
   - All submission endpoints
   - State management
   - Notification triggers

### Phase 4: Review System (Week 7-9)
1. **Review Dashboard**
   - Queue management
   - Filtering/sorting
   - Bulk operations

2. **Tagging Wizard**
   - 11-step form
   - Progress saving
   - Validation rules
   - Smart defaults

3. **Comparison Tools**
   - Side-by-side view
   - Diff highlighting
   - Version selection

### Phase 5: Integration (Week 10-11)
1. **Version Control**
   - Archive system
   - Version viewing
   - Canonical linking

2. **Frontend Integration**
   - Update lesson display
   - Add version indicators
   - Link to history

### Phase 6: Testing & Launch (Week 12)
1. **Testing**
   - End-to-end workflows
   - Performance testing
   - User acceptance testing

2. **Documentation**
   - User guides
   - Admin documentation
   - API documentation

3. **Deployment**
   - Production setup
   - Monitoring
   - Launch plan

## Success Metrics
- Duplicate detection accuracy > 90%
- Average review time < 10 minutes per lesson
- Zero duplicate lessons in main collection after 6 months
- Teacher satisfaction score > 4.5/5
- System uptime > 99.9%