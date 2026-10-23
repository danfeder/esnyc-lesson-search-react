# Google Docs Embedding Implementation Plan

## Executive Summary

**Recommendation: Implement Phase 1 (Simple iframe Embed) immediately, followed by Phase 2 (UX Enhancements) based on user feedback.**

The key insight: Reviewers already need Google accounts to access lesson docs, so we're not adding new authentication requirements - we're actually reducing friction by eliminating tab switching.

## Implementation Options Analysis

### Option 1: Direct iframe Embedding (Recommended for Phase 1)

**Implementation:**
```jsx
<iframe 
  src={`https://docs.google.com/document/d/${googleDocId}/edit?embedded=true`}
  width="100%"
  height="600px"
  frameBorder="0"
/>
```

**Strengths:**
- ✅ Immediate improvement to workflow (no tab switching)
- ✅ Preserves full Google Docs functionality
- ✅ Real-time collaboration works automatically
- ✅ Auto-save functionality preserved
- ✅ Minimal development time (1-2 hours)
- ✅ Users already familiar with Google Docs interface

**Weaknesses:**
- ❌ Requires Google account login (but users already need this)
- ❌ Shows Google UI elements (might be distracting)
- ❌ No control over permissions (managed by Google)
- ❌ Potential loading performance issues

**Risk Mitigation:**
- Add loading skeleton
- Include "Open in Google Docs" fallback button
- Clear error messages for permission issues

### Option 2: Published/Read-Only View

**Implementation:**
```jsx
<iframe 
  src={`https://docs.google.com/document/d/${googleDocId}/pub?embedded=true`}
  width="100%"
  height="600px"
/>
```

**Strengths:**
- ✅ No authentication required
- ✅ Cleaner, distraction-free interface
- ✅ Better performance

**Weaknesses:**
- ❌ No editing capability (defeats the purpose)
- ❌ Requires manual publishing step
- ❌ Doesn't show real-time updates
- ❌ Still requires tab switching for editing

**Verdict: Not recommended** - Doesn't solve the core problem.

### Option 3: Hybrid Toggle Approach

**Strengths:**
- ✅ Flexibility for different use cases
- ✅ Users can choose their preferred view

**Weaknesses:**
- ❌ Added UI complexity
- ❌ Increased development time (3-4 days)
- ❌ Mode switching might be jarring
- ❌ Still has all authentication issues

**Verdict: Consider for Phase 2** if users request it.

### Option 4: Custom Rich Text Editor

**Strengths:**
- ✅ Complete control over UI/UX
- ✅ Better integration with review workflow
- ✅ Custom permission system

**Weaknesses:**
- ❌ Massive development effort (2-3 weeks)
- ❌ Need to build collaboration from scratch
- ❌ Complex syncing with Google Docs API
- ❌ Maintenance burden
- ❌ Users lose familiar Google Docs features

**Verdict: Not recommended** unless iframe approach completely fails.

## Recommended Implementation Plan

### Phase 1: MVP (Day 1)
**Goal:** Get basic embedding working to validate the approach

#### 1. Create GoogleDocEmbed Component

```tsx
// src/components/Review/GoogleDocEmbed.tsx
import React, { useState } from 'react';
import { AlertCircle, ExternalLink, FileText } from 'lucide-react';

interface GoogleDocEmbedProps {
  docId: string;
  onError?: (error: Error) => void;
  height?: string;
  fallbackToText?: () => void;
}

export const GoogleDocEmbed: React.FC<GoogleDocEmbedProps> = ({
  docId,
  onError,
  height = '100%',
  fallbackToText
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const error = new Error('Failed to load Google Doc. You may not have permission to view this document.');
    setError(error);
    setLoading(false);
    onError?.(error);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Document</h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          {error.message}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.open(`https://docs.google.com/document/d/${docId}/edit`, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Docs
          </button>
          {fallbackToText && (
            <button
              onClick={fallbackToText}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Show Text View
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="space-y-4 w-full max-w-2xl px-8">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      )}
      <iframe
        src={`https://docs.google.com/document/d/${docId}/edit?embedded=true`}
        className={`w-full border-0 ${loading ? 'invisible' : 'visible'}`}
        style={{ height }}
        onLoad={handleLoad}
        onError={handleError}
        title="Lesson Document"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};
```

#### 2. Update ReviewDetail Page

Replace the text display section with the new GoogleDocEmbed component.

#### 3. Add Error Boundary

Wrap the component in an error boundary to handle unexpected failures gracefully.

#### 4. Add Fallback Button

Include an "Open in Google Docs" button as an escape hatch for users who prefer the traditional workflow.

### Phase 2: UX Enhancements (Days 2-3)
**Goal:** Polish based on user feedback

#### 1. Permission Checking
- Check if user has access before showing iframe
- Show "Request Access" button if needed
- Cache permission status to avoid repeated checks

#### 2. Loading Experience
```tsx
// Enhanced loading skeleton
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded mb-4" />
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
      ))}
    </div>
  </div>
);
```

#### 3. View Preferences
```tsx
// Add toggle for different view modes
const [viewMode, setViewMode] = useState<'embed' | 'text'>(() => {
  return localStorage.getItem('reviewViewMode') || 'embed';
});

const toggleViewMode = () => {
  const newMode = viewMode === 'embed' ? 'text' : 'embed';
  setViewMode(newMode);
  localStorage.setItem('reviewViewMode', newMode);
};
```

#### 4. Mobile Optimization
```tsx
// Detect mobile and adjust
const isMobile = useMediaQuery('(max-width: 768px)');

if (isMobile) {
  // Show simplified view or prompt to open in app
  return <MobileGoogleDocView docId={docId} />;
}
```

### Phase 3: Future Enhancements (If Needed)

#### If Authentication is a Major Issue:
1. Implement Google OAuth flow
2. Store tokens securely
3. Auto-authenticate iframe

#### If Collaboration Needs Enhancement:
1. Add presence indicators
2. Show who's currently editing
3. Activity feed

#### If Performance is Poor:
1. Lazy load iframe
2. Implement virtual scrolling
3. Cache mechanisms

## Technical Implementation Details

### Security Considerations

```tsx
// Content Security Policy headers
const iframeCSP = {
  sandbox: "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
  allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
};
```

### Error Handling

```tsx
const ErrorFallback = ({ error, docId }) => {
  const [reportSent, setReportSent] = useState(false);

  const reportError = async () => {
    try {
      await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message, docId, page: 'review' })
      });
      setReportSent(true);
    } catch (e) {
      console.error('Failed to report error', e);
    }
  };

  return (
    <div className="p-6 bg-red-50 rounded-lg">
      <h3 className="text-red-800 font-semibold mb-2">Unable to load document</h3>
      <p className="text-red-600 mb-4">{error.message}</p>
      <div className="flex gap-4">
        <button
          onClick={() => window.open(`https://docs.google.com/document/d/${docId}/edit`)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open in Google Docs
        </button>
        <button
          onClick={reportError}
          disabled={reportSent}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          {reportSent ? 'Error Reported' : 'Report Issue'}
        </button>
      </div>
    </div>
  );
};
```

### Performance Monitoring

```tsx
// Track iframe load times
const trackPerformance = () => {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      // Send to analytics
      if (window.analytics) {
        window.analytics.track('google_doc_embed_load', {
          loadTime,
          docId,
          success: true
        });
      }
    },
    onError: (error) => {
      const loadTime = performance.now() - startTime;
      if (window.analytics) {
        window.analytics.track('google_doc_embed_error', {
          loadTime,
          docId,
          error: error.message
        });
      }
    }
  };
};
```

## Success Metrics

### Primary Metrics
- **Tab Switch Reduction**: Measure reduction in tab switches during review sessions
- **Review Completion Time**: Should decrease by 20-30%
- **User Satisfaction**: Survey reviewers on workflow improvement

### Secondary Metrics
- **iframe Load Time**: Target < 3 seconds
- **Error Rate**: Should be < 5%
- **Fallback Usage**: Track how often users use the escape hatch

### Monitoring Dashboard
```typescript
// Analytics to track
interface EmbedMetrics {
  loadTime: number;
  errorRate: number;
  fallbackUsage: number;
  userSatisfaction: number;
  tabSwitches: number;
  sessionDuration: number;
}
```

## Decision Tree

```
Start with Phase 1 (1 day)
    ↓
Deploy behind feature flag
    ↓
Test with 5-10 reviewers (1 week)
    ↓
Gather feedback
    ↓
< 20% error rate? → Proceed to Phase 2
> 20% error rate? → Investigate issues:
    ├─ Permission issues? → Add OAuth flow
    ├─ Performance issues? → Optimize loading
    └─ Fundamental blockers? → Consider custom editor
```

## Files to Create/Modify

### New Files
1. `src/components/Review/GoogleDocEmbed.tsx` - Main embed component
2. `src/components/Review/GoogleDocEmbed.test.tsx` - Unit tests
3. `src/components/Review/GoogleDocEmbed.stories.tsx` - Storybook stories
4. `src/hooks/useGoogleDocPermission.ts` - Permission checking hook
5. `docs/google-docs-embedding.md` - This documentation

### Modified Files
1. `src/pages/ReviewDetail.tsx` - Replace text display with embed
2. `src/types/index.ts` - Add GoogleDocEmbed types
3. `src/utils/constants.ts` - Add embed configuration
4. `src/utils/analytics.ts` - Add tracking events

## Rollback Plan

### Feature Flag Implementation
```typescript
// src/utils/featureFlags.ts
export const FEATURES = {
  GOOGLE_DOC_EMBED: process.env.REACT_APP_ENABLE_DOC_EMBED === 'true'
};

// In ReviewDetail.tsx
{FEATURES.GOOGLE_DOC_EMBED ? (
  <GoogleDocEmbed docId={docId} />
) : (
  <LegacyTextView content={content} />
)}
```

### Rollback Steps
1. Set feature flag to false
2. Deploy immediately (no code changes needed)
3. Monitor for 24 hours
4. If stable, investigate and fix issues
5. Re-enable when resolved

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Permission errors | High | Medium | Clear error messages, fallback button |
| Slow loading | Medium | Low | Loading skeleton, performance monitoring |
| Google UI confusion | Low | Low | User training, documentation |
| Mobile issues | Medium | Medium | Responsive design, mobile detection |
| Security concerns | Low | High | Proper CSP headers, sandbox attributes |

## Conclusion

The simple iframe embedding approach (Phase 1) provides immediate value with minimal risk. Since reviewers already need Google accounts to access documents, we're not adding new friction - we're removing it by eliminating context switching.

**Key Success Factors:**
1. Start simple with basic iframe
2. Gather real user feedback
3. Iterate based on actual problems, not hypothetical ones
4. Keep the old text view as a fallback
5. Monitor performance and errors closely

**Next Immediate Steps:**
1. Create GoogleDocEmbed component
2. Add to ReviewDetail page behind feature flag
3. Deploy to staging for testing
4. Get feedback from 5-10 reviewers
5. Iterate based on feedback