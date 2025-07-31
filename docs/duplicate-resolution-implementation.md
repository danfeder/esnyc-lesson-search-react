# Duplicate Resolution Implementation Guide

## Quick Start

This guide provides step-by-step implementation details for the duplicate resolution plan.

## Step 1: Analysis Script Implementation

### 1.1 Create the Analysis Script

```javascript
// scripts/analyze-duplicates.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const CONFIG = {
  thresholds: {
    exact: 1.0,
    nearDuplicate: 0.85,
    similar: 0.70,
    titleMatch: 0.70
  },
  weights: {
    recency: 0.20,
    completeness: 0.30,
    quality: 0.20,
    naming: 0.10,
    notes: 0.20
  }
};

// Main analysis function
async function analyzeDuplicates() {
  console.log('🔍 Starting duplicate analysis...\n');

  // 1. Fetch all lessons
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at');

  if (error) throw error;

  // 2. Find exact duplicates by content_hash
  const exactDuplicates = findExactDuplicates(lessons);
  
  // 3. Find near duplicates using embeddings
  const nearDuplicates = await findNearDuplicates(lessons);
  
  // 4. Find title variations
  const titleVariations = findTitleVariations(lessons);
  
  // 5. Calculate canonical scores
  const groupsWithScores = calculateCanonicalScores([
    ...exactDuplicates,
    ...nearDuplicates,
    ...titleVariations
  ]);

  // 6. Generate report
  const report = generateReport(groupsWithScores);
  
  // 7. Save report
  await saveReport(report);
  
  return report;
}
```

### 1.2 Helper Functions

```javascript
// Find exact duplicates by content hash
function findExactDuplicates(lessons) {
  const hashGroups = {};
  
  lessons.forEach(lesson => {
    if (lesson.content_hash) {
      if (!hashGroups[lesson.content_hash]) {
        hashGroups[lesson.content_hash] = [];
      }
      hashGroups[lesson.content_hash].push(lesson);
    }
  });
  
  return Object.values(hashGroups)
    .filter(group => group.length > 1)
    .map((group, idx) => ({
      groupId: `exact_${idx + 1}`,
      type: 'exact',
      similarityScore: 1.0,
      lessons: group
    }));
}

// Find near duplicates using pgvector
async function findNearDuplicates(lessons) {
  const nearDuplicates = [];
  const processed = new Set();

  for (const lesson of lessons) {
    if (!lesson.content_embedding || processed.has(lesson.lesson_id)) {
      continue;
    }

    // Find similar lessons using pgvector
    const { data: similar } = await supabase.rpc(
      'find_similar_lessons_by_embedding',
      {
        query_embedding: lesson.content_embedding,
        similarity_threshold: CONFIG.thresholds.nearDuplicate,
        max_results: 10
      }
    );

    if (similar && similar.length > 1) {
      const group = {
        groupId: `near_${nearDuplicates.length + 1}`,
        type: 'near',
        similarityScore: similar[1].similarity_score,
        lessons: similar.map(s => lessons.find(l => l.lesson_id === s.lesson_id))
      };
      
      nearDuplicates.push(group);
      similar.forEach(s => processed.add(s.lesson_id));
    }
  }

  return nearDuplicates;
}

// Calculate canonical scores
function calculateCanonicalScore(lesson, group) {
  let score = 0;
  
  // Recency score
  if (lesson.last_modified) {
    const date = new Date(lesson.last_modified);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    score += CONFIG.weights.recency * (1 - Math.min(age / 10, 1));
  }
  
  // Completeness score
  const metadataFields = [
    'thematicCategories', 'seasonTiming', 'coreCompetencies',
    'culturalHeritage', 'locationRequirements', 'activityType',
    'lessonFormat', 'mainIngredients', 'skills'
  ];
  
  const completeness = metadataFields.reduce((acc, field) => {
    const value = lesson.metadata?.[field];
    return acc + (value && value.length > 0 ? 1 : 0);
  }, 0) / metadataFields.length;
  
  score += CONFIG.weights.completeness * completeness;
  
  // Quality score (from confidence)
  if (lesson.confidence?.overall) {
    score += CONFIG.weights.quality * lesson.confidence.overall;
  }
  
  // File naming score
  const hasCleanName = /^[A-Z]/.test(lesson.title) && 
                      !lesson.title.includes('Copy') &&
                      !lesson.title.includes('_v2');
  score += CONFIG.weights.naming * (hasCleanName ? 1 : 0);
  
  // Processing notes score
  const hasDuplicateNote = lesson.processing_notes?.toLowerCase().includes('duplicate');
  score += CONFIG.weights.notes * (hasDuplicateNote ? 0 : 1);
  
  return score;
}
```

## Step 2: Admin Interface Implementation

### 2.1 Routes Setup

```typescript
// src/App.tsx - Add admin routes

import { AdminDuplicates } from './pages/AdminDuplicates';
import { AdminDuplicateDetail } from './pages/AdminDuplicateDetail';

// Add to routes
<Route path="/admin/duplicates" element={
  <RequireAuth role="admin">
    <AdminDuplicates />
  </RequireAuth>
} />
<Route path="/admin/duplicates/:groupId" element={
  <RequireAuth role="admin">
    <AdminDuplicateDetail />
  </RequireAuth>
} />
```

### 2.2 Admin Duplicates List Page

```typescript
// src/pages/AdminDuplicates.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title';
  similarityScore: number;
  lessonCount: number;
  status: 'pending' | 'resolved';
  recommendedCanonical?: string;
  lessons: Array<{
    lessonId: string;
    title: string;
  }>;
}

export const AdminDuplicates: React.FC = () => {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDuplicateGroups();
  }, []);

  const loadDuplicateGroups = async () => {
    try {
      // Load from analysis report
      const { data } = await supabase
        .storage
        .from('reports')
        .download('duplicate-analysis-latest.json');
      
      if (data) {
        const report = JSON.parse(await data.text());
        setGroups(report.groups);
      }
    } catch (error) {
      console.error('Error loading duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(group => 
    filter === 'all' || group.status === filter
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Duplicate Resolution</h1>
      
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          All ({groups.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded ${
            filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Pending ({groups.filter(g => g.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded ${
            filter === 'resolved' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Resolved ({groups.filter(g => g.status === 'resolved').length})
        </button>
      </div>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div key={group.groupId} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {group.lessons[0]?.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {group.lessonCount} duplicates • 
                  {group.type === 'exact' ? 'Exact Match' : 
                   group.type === 'near' ? 'Near Duplicate' : 'Title Variation'} • 
                  {(group.similarityScore * 100).toFixed(0)}% similar
                </p>
              </div>
              <Link
                to={`/admin/duplicates/${group.groupId}`}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Review
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2.3 Duplicate Detail Comparison View

```typescript
// src/pages/AdminDuplicateDetail.tsx

export const AdminDuplicateDetail: React.FC = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [selectedCanonical, setSelectedCanonical] = useState<string>('');
  const [mergeMetadata, setMergeMetadata] = useState(false);

  const handleResolve = async () => {
    if (!selectedCanonical) return;

    try {
      // 1. Mark selected as canonical
      // 2. Optionally merge metadata
      // 3. Archive duplicates
      // 4. Update references
      // 5. Log resolution

      const { error } = await supabase.rpc('resolve_duplicate_group', {
        group_id: groupId,
        canonical_id: selectedCanonical,
        merge_metadata: mergeMetadata
      });

      if (!error) {
        navigate('/admin/duplicates');
      }
    } catch (error) {
      console.error('Error resolving duplicates:', error);
    }
  };

  // Render side-by-side comparison
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Implementation details... */}
    </div>
  );
};
```

## Step 3: Database Functions

### 3.1 Resolution Function

```sql
-- supabase/migrations/add_duplicate_resolution.sql

CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  group_id TEXT,
  canonical_id TEXT,
  merge_metadata BOOLEAN DEFAULT FALSE
) RETURNS void AS $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- 1. Create canonical mapping
  FOR duplicate_record IN 
    SELECT lesson_id FROM lessons 
    WHERE lesson_id != canonical_id 
    AND lesson_id IN (
      -- Get lessons in this group
      SELECT lesson_id FROM duplicate_groups WHERE group_id = group_id
    )
  LOOP
    INSERT INTO canonical_lessons (
      duplicate_id, 
      canonical_id, 
      resolution_type,
      resolved_by
    ) VALUES (
      duplicate_record.lesson_id,
      canonical_id,
      'admin_resolved',
      auth.uid()
    );
  END LOOP;

  -- 2. Merge metadata if requested
  IF merge_metadata THEN
    -- Merge logic here
  END IF;

  -- 3. Archive duplicates
  INSERT INTO lesson_archive 
  SELECT *, NOW(), auth.uid(), 'Duplicate of ' || canonical_id
  FROM lessons 
  WHERE lesson_id != canonical_id 
  AND lesson_id IN (
    SELECT duplicate_id FROM canonical_lessons 
    WHERE canonical_id = canonical_id
  );

  -- 4. Update references
  UPDATE bookmarks 
  SET lesson_id = canonical_id 
  WHERE lesson_id IN (
    SELECT duplicate_id FROM canonical_lessons 
    WHERE canonical_id = canonical_id
  );

  -- 5. Delete archived lessons
  DELETE FROM lessons 
  WHERE lesson_id IN (
    SELECT duplicate_id FROM canonical_lessons 
    WHERE canonical_id = canonical_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 4: Testing Plan

### 4.1 Test Data Setup

```javascript
// scripts/test-duplicate-scenarios.js

const testScenarios = [
  {
    name: 'Exact Duplicate',
    lesson1: { title: 'Garden Salsa', content: 'Make fresh salsa...' },
    lesson2: { title: 'Garden Salsa', content: 'Make fresh salsa...' },
    expectedSimilarity: 1.0
  },
  {
    name: 'Near Duplicate',
    lesson1: { title: 'Garden Salsa', content: 'Make fresh salsa...' },
    lesson2: { title: 'Summer Garden Salsa', content: 'Make fresh salsa from garden...' },
    expectedSimilarity: 0.85
  },
  {
    name: 'Version Update',
    lesson1: { title: 'Herbs as Medicine', content: 'Learn about herbs...' },
    lesson2: { title: 'Herbs as Medicine (Updated)', content: 'Learn about medicinal herbs...' },
    expectedSimilarity: 0.80
  }
];
```

## Deployment Checklist

- [ ] Backup production database
- [ ] Run analysis script on test data
- [ ] Review analysis report
- [ ] Deploy admin interface to staging
- [ ] Test resolution workflow
- [ ] Create rollback plan
- [ ] Schedule maintenance window
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Generate post-cleanup report