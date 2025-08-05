# CSV Export Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing CSV export functionality for lesson search results.

## Current State

- **Location**: `src/pages/SearchPage.tsx` line 155
- **Status**: TODO comment placeholder
- **UI**: Export button already exists in `ResultsHeader` component

## Implementation Plan

### Step 1: Create CSV Utility Function

Create `src/utils/csvExport.ts`:

```typescript
import type { Lesson } from '@/types';

interface CSVExportOptions {
  lessons: Lesson[];
  filters?: SearchFilters;
  includeMetadata?: boolean;
}

export function generateCSV(options: CSVExportOptions): string {
  const { lessons, includeMetadata = true } = options;
  
  // Define headers
  const headers = [
    'Lesson ID',
    'Title',
    'Summary',
    'Grade Levels',
    'Link',
    ...(includeMetadata ? [
      'Activity Type',
      'Location',
      'Themes',
      'Seasons',
      'Core Competencies',
      'Cultural Heritage',
      'Lesson Format',
      'Academic Integration',
      'SEL Competencies',
      'Cooking Methods',
      'Confidence Score'
    ] : [])
  ];
  
  // Convert lessons to CSV rows
  const rows = lessons.map(lesson => {
    const baseFields = [
      lesson.lessonId,
      `"${lesson.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${lesson.summary?.replace(/"/g, '""') || ''}"`,
      lesson.gradeLevels.join('; '),
      lesson.fileLink
    ];
    
    if (includeMetadata) {
      const metadata = lesson.metadata || {};
      baseFields.push(
        (metadata.activityType || []).join('; '),
        (metadata.location || []).join('; '),
        (metadata.thematicCategories || []).join('; '),
        (metadata.seasons || []).join('; '),
        (metadata.coreCompetencies || []).join('; '),
        (metadata.culturalHeritage || []).join('; '),
        metadata.lessonFormat || '',
        (metadata.academicIntegration || []).join('; '),
        (metadata.socialEmotionalLearning || []).join('; '),
        metadata.cookingMethods || '',
        lesson.confidence?.overall?.toFixed(2) || ''
      );
    }
    
    return baseFields;
  });
  
  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateFilename(filters?: SearchFilters): string {
  const date = new Date().toISOString().split('T')[0];
  const parts = ['esynyc-lessons', date];
  
  if (filters?.query) {
    parts.push(filters.query.slice(0, 20).replace(/[^a-z0-9]/gi, '-'));
  }
  
  if (filters?.gradeLevels?.length) {
    parts.push(`grades-${filters.gradeLevels.join('-')}`);
  }
  
  return `${parts.join('_')}.csv`;
}
```

### Step 2: Implement Export Handler

Update `src/pages/SearchPage.tsx`:

```typescript
import { generateCSV, downloadCSV, generateFilename } from '@/utils/csvExport';
import { toast } from '@/components/ui/Toast'; // If you have toast notifications

const handleExport = async () => {
  try {
    // Show loading state (optional)
    toast.info('Preparing export...');
    
    // For current page results
    if (results.length === 0) {
      toast.warning('No results to export');
      return;
    }
    
    // Option A: Export current page results
    const csvContent = generateCSV({
      lessons: results,
      filters,
      includeMetadata: true
    });
    
    // Option B: Fetch ALL results (not just current page)
    // const allResults = await fetchAllResults(filters);
    // const csvContent = generateCSV({
    //   lessons: allResults,
    //   filters,
    //   includeMetadata: true
    // });
    
    const filename = generateFilename(filters);
    downloadCSV(csvContent, filename);
    
    // Track export analytics (optional)
    await supabase.from('export_logs').insert({
      user_id: user?.id,
      export_type: 'csv',
      record_count: results.length,
      filters: filters,
      created_at: new Date().toISOString()
    });
    
    toast.success(`Exported ${results.length} lessons`);
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export lessons. Please try again.');
  }
};
```

### Step 3: Fetch All Results (Optional)

For exporting ALL matching results, not just the current page:

```typescript
async function fetchAllResults(filters: SearchFilters): Promise<Lesson[]> {
  const allResults: Lesson[] = [];
  const pageSize = 100;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const searchParams = {
      search_query: filters.query || null,
      filter_grade_levels: filters.gradeLevels?.length ? filters.gradeLevels : null,
      // ... other filters
      page_size: pageSize,
      page_offset: offset,
    };
    
    const { data, error } = await supabase.rpc('search_lessons', searchParams);
    
    if (error) throw error;
    
    const lessons = data?.map(row => ({
      // ... map to Lesson type
    })) || [];
    
    allResults.push(...lessons);
    
    hasMore = lessons.length === pageSize;
    offset += pageSize;
    
    // Safety limit
    if (allResults.length > 5000) {
      console.warn('Export limited to 5000 results');
      break;
    }
  }
  
  return allResults;
}
```

### Step 4: Add Loading State

Update `ResultsHeader` component to show loading state:

```typescript
interface ResultsHeaderProps {
  // ... existing props
  isExporting?: boolean;
}

// In the component
<button
  onClick={onExport}
  disabled={isExporting}
  className="..."
>
  {isExporting ? (
    <Spinner className="w-4 h-4" />
  ) : (
    <Download className="w-4 h-4" />
  )}
  {isExporting ? 'Exporting...' : 'Export CSV'}
</button>
```

## Testing

### Manual Testing
1. Search for lessons with various filters
2. Click Export button
3. Verify CSV downloads with correct filename
4. Open CSV in Excel/Google Sheets
5. Verify all columns have data
6. Check special characters are properly escaped

### Unit Tests

Create `src/utils/csvExport.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateCSV, generateFilename } from './csvExport';

describe('CSV Export', () => {
  it('should generate valid CSV with headers', () => {
    const lessons = [
      {
        lessonId: '1',
        title: 'Test Lesson',
        summary: 'A test summary',
        gradeLevels: ['3', '4'],
        fileLink: 'https://example.com',
        metadata: {},
        confidence: { overall: 0.95 }
      }
    ];
    
    const csv = generateCSV({ lessons });
    const lines = csv.split('\n');
    
    expect(lines[0]).toContain('Lesson ID,Title,Summary');
    expect(lines[1]).toContain('1,"Test Lesson"');
  });
  
  it('should escape quotes in text fields', () => {
    const lessons = [
      {
        lessonId: '1',
        title: 'Lesson with "quotes"',
        summary: 'Summary with "quotes" too',
        // ...
      }
    ];
    
    const csv = generateCSV({ lessons });
    expect(csv).toContain('"Lesson with ""quotes"""');
  });
  
  it('should generate appropriate filename', () => {
    const filters = {
      query: 'garden vegetables',
      gradeLevels: ['3', '4']
    };
    
    const filename = generateFilename(filters);
    expect(filename).toMatch(/esynyc-lessons_\d{4}-\d{2}-\d{2}_garden-vegetables_grades-3-4\.csv/);
  });
});
```

## Accessibility Considerations

- Announce export completion to screen readers
- Ensure keyboard navigation works
- Provide alternative formats if needed (JSON, PDF)

## Performance Considerations

- For large datasets (>1000 rows), consider:
  - Streaming CSV generation
  - Web Worker for processing
  - Server-side generation
  - Pagination with "Export All" warning

## Future Enhancements

1. **Export Options Modal**:
   - Choose fields to include
   - Select format (CSV, Excel, JSON)
   - Filter by date range

2. **Scheduled Exports**:
   - Save export configuration
   - Email exports weekly/monthly

3. **Server-Side Generation**:
   - Create Edge Function for large exports
   - Generate and email download link

## Security Notes

- Sanitize all user input in CSV
- Validate user permissions for export
- Log exports for audit trail
- Consider rate limiting for large exports

## Rollout Plan

1. **Phase 1**: Basic CSV export of current page
2. **Phase 2**: Export all results option
3. **Phase 3**: Export configuration modal
4. **Phase 4**: Server-side generation for large datasets

## Estimated Time

- Basic implementation: 2-3 hours
- With all results fetch: +1 hour
- Full test coverage: +2 hours
- Total: 5-6 hours

---

*This guide will result in a fully functional CSV export feature that handles edge cases and provides a good user experience.*