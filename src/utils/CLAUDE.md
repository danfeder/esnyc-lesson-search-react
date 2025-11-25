# Utilities Guidelines

## Key Files

| File | Purpose |
|------|---------|
| `filterDefinitions.ts` | The 11 filter categories (never modify count) |
| `filterConstants.ts` | Cultural hierarchy, ingredient groups |
| `logger.ts` | Use instead of console.log |
| `cn.ts` | Tailwind class merging |

## Cultural Heritage Hierarchy

Parent selection includes all children:
```typescript
// Selecting "Asian" includes Chinese, Japanese, Korean, etc.
isParentCultureSelected(selected, 'Chinese')
```

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

- 11 filters total - never add or remove
- 6 Core Competencies (ESYNYC priorities)
- Grade groups: early-childhood, lower-elementary, upper-elementary, middle
