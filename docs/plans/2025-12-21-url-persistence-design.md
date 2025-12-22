# URL Persistence for Search and Filter State

**Issue**: GH #24, beads `b1h`
**Date**: 2025-12-21
**Status**: Approved

## Overview

Add URL persistence so users can bookmark/share filtered searches and use browser back/forward navigation.

## Design Decisions

1. **Scope**: Essential state only (query + active filters). No page number or sort (transient/personal).
2. **URL keys**: Short names for readable URLs (`q`, `grades`, `activity`, etc.)
3. **Architecture**: Custom `useUrlSync()` hook, separate from SearchPage rendering.

## URL Parameter Mapping

| Store Field | URL Param | Type | Example |
|-------------|-----------|------|---------|
| `query` | `q` | string | `q=cooking` |
| `gradeLevels` | `grades` | array | `grades=3,4,5` |
| `activityType` | `activity` | array | `activity=cooking-only` |
| `location` | `loc` | array | `loc=kitchen` |
| `seasonTiming` | `season` | array | `season=Fall,Winter` |
| `thematicCategories` | `themes` | array | `themes=nutrition` |
| `coreCompetencies` | `skills` | array | `skills=teamwork` |
| `culturalHeritage` | `culture` | array | `culture=Asian` |
| `lessonFormat` | `format` | string | `format=recipe` |
| `academicIntegration` | `academic` | array | `academic=math` |
| `socialEmotionalLearning` | `sel` | array | `sel=mindfulness` |
| `cookingMethods` | `cooking` | array | `cooking=baking` |

Arrays use comma-separated values. Empty/default values omitted from URL.

## Files

### New Files

1. **`src/utils/urlParams.ts`** - Serialization utilities
   - `filtersToUrlParams(filters)` - Convert store state to URLSearchParams
   - `parseUrlToFilters(params)` - Convert URLSearchParams to partial filters
   - `PARAM_MAP` - Mapping between store keys and URL keys

2. **`src/hooks/useUrlSync.ts`** - Sync hook
   - On mount: parse URL → update store (URL wins for shared links)
   - On filter change: update URL with debounce (store wins)
   - Uses `replace` mode to avoid polluting history

### Modified Files

3. **`src/pages/SearchPage.tsx`** - Add `useUrlSync()` call

## Behavior

- **Mount**: URL params restore filter state (enables shared links)
- **Filter change**: URL updates after 300ms debounce
- **Invalid params**: Ignored gracefully (uses defaults)
- **Empty state**: Clean `/search` URL with no params
- **Browser nav**: Back/forward work correctly

## Example URLs

```
/search                           # Default (no filters)
/search?q=cooking                 # Search only
/search?q=salad&grades=3,4,5      # Search + grade filter
/search?grades=K,1&activity=garden-only&season=Spring
```
