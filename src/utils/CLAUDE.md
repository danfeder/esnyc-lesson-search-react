# Utilities Guidelines

## Key Files

| File | Purpose |
|------|---------|
| `filterDefinitions.ts` | Filter categories (consult stakeholders before changes) |
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

- Filters defined in `filterDefinitions.ts` - consult stakeholders before changes
- 6 Core Competencies (ESYNYC priorities)
- Grade groups: early-childhood, lower-elementary, upper-elementary, middle
