# Component Guidelines

## Patterns

### Props Interface
```typescript
interface ComponentNameProps {
  id: string;               // Required props first
  className?: string;       // Optional props
  // eslint-disable-next-line no-unused-vars
  onChange?: (value: string) => void;  // Callbacks with eslint comment
}

export function ComponentName({ id, className = '' }: ComponentNameProps) {
  // ...
}
```

### Filter Components
Check if changes affect the 11 filter count before modifying.

### Imports
```typescript
import type { Lesson } from '@/types';
import { cn } from '@/utils/cn';
import { useSearchStore } from '@/stores/searchStore';
import { Search, Filter } from 'lucide-react';
```

## Conventions

- Named exports only (no default exports)
- Props interface ends with `Props`
- Place in feature folder: `components/FeatureName/ComponentName.tsx`
- Export from barrel file: `components/FeatureName/index.ts`
- Use `cn()` for conditional Tailwind classes

## Common Patterns

### Loading State
```typescript
if (isLoading) {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}
```

### Store Usage
```typescript
// Select specific state to avoid re-renders
const filters = useSearchStore(state => state.filters);

// Never mutate directly
setFilters({ query: value }); // Correct
// filters.query = value;     // Wrong
```
