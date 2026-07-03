# Utilities Guidelines

## Key Files

| File | Purpose |
|------|---------|
| `filterDefinitions.ts` | Filter categories (consult stakeholders before changes) |
| `heritageHierarchy.generated.ts` | Generated cultural-heritage hierarchy (do not hand-edit) |
| `logger.ts` | Use instead of console.log |
| `cn.ts` | Tailwind class merging |

## Cultural Heritage Hierarchy

Parent selection includes all children:
```typescript
// Selecting "Asian" includes Chinese, Japanese, Korean, etc.
isParentCultureSelected(selected, 'Chinese')
```

**Closed reviewer vocabulary (Brief 4, 2026-07-03).** The reviewer's Cultural Heritage
field is a closed pick-list — reviewers can no longer type new values. Both the picker
options (`culturalHeritageReviewOptions`) and the closed enum (`CULTURAL_HERITAGE_VALUES`
→ `CulturalHeritageEnum`) are GENERATED from the single source of truth
`data/vocab/cultural-heritage.vocab.json`. **To add a new heritage value: a maintainer
edits the vocab and runs `npx tsx scripts/heritage/generate-heritage-hierarchy.ts`, then
hand-syncs the value list into the edge mirror
`supabase/functions/_shared/metadataSchemas.ts` (the equivalence test flags drift).**
There is no reviewer free-text path. The SEARCH filter tree (`culturalHeritageOptions`,
top+sub tiers only) is a separate, untouched export.

## Logger Usage

```typescript
import { logger } from '@/utils/logger';

logger.debug('Dev-only message');  // Not in production
logger.error('Error:', error);     // Always logged + Sentry
```

## Class Names

```typescript
import { cn } from '@/utils/cn';

className={cn('base', active && 'active', className)}
```

## Environment Variables

Frontend vars require `VITE_` prefix:
```typescript
import.meta.env.VITE_SUPABASE_URL  // Works
import.meta.env.API_KEY            // Won't work
```

## Filter Constants

- Filters defined in `filterDefinitions.ts` - consult stakeholders before changes
- 6 Core Competencies (ESYNYC priorities)
- Grade groups: early-childhood, lower-elementary, upper-elementary, middle
