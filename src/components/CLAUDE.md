# Component Development Guidelines

## ⚠️ CRITICAL RULES

1. **EXACTLY 11 FILTERS** - NEVER add or remove filter categories
2. **Props Interface** - YOU MUST end with "Props": `ComponentNameProps`
3. **ESLint Comments** - ALWAYS add `// eslint-disable-next-line no-unused-vars` for unused params
4. **Named Exports** - NEVER use default exports
5. **Path Aliases** - ALWAYS use `@/` imports, not relative paths

## 🚀 Component Creation Checklist

```typescript
// YOU MUST follow this exact pattern:
1. Define Props interface ending with "Props"
2. Use functional components with hooks
3. Export as named function (not default)
4. Place in feature folder: components/FeatureName/
5. Add loading and error states
6. Add to barrel export in index.ts
```

## 📋 Component Props Pattern

```typescript
// ALWAYS follow this structure:
interface ComponentNameProps {
  // Required props first
  id: string;
  title: string;
  
  // Optional props with ? and defaults
  className?: string;
  isOpen?: boolean;
  
  // Event handlers last with eslint comment
  // eslint-disable-next-line no-unused-vars
  onChange?: (value: string) => void;
  // eslint-disable-next-line no-unused-vars
  onClick?: (event: React.MouseEvent) => void;
}

export function ComponentName({ 
  id, 
  title, 
  className = '', 
  onChange 
}: ComponentNameProps) {
  // Component logic
}
```

## 🔧 Filter Component Pattern

```typescript
// CRITICAL: Check if this affects the 11 filters rule!
interface FilterNameProps {
  selected: string | string[];  // Single vs multi-select
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string | string[]) => void;
  className?: string;
  facets?: Record<string, number>;  // For counts
}

export function FilterName({ selected, onChange, facets }: FilterNameProps) {
  // YOU MUST maintain exactly 11 filter categories
}
```

## 🐛 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Cannot find module '@/types'" | Use `@/types` not `../types` |
| "no-unused-vars" for onChange | Add `// eslint-disable-next-line no-unused-vars` |
| "Missing displayName" | Use named function, not arrow function |
| "Too many re-renders" | Check useEffect dependencies |
| "Cannot read properties of undefined" | Add optional chaining: `data?.property` |
| "Hydration mismatch" | Ensure consistent server/client rendering |

## 🎯 Common Component Patterns

### Using Zustand Store
```typescript
import { useSearchStore } from '@/stores/searchStore';

export function MyComponent() {
  const { filters, setFilters } = useSearchStore();
  
  // NEVER mutate filters directly
  const handleChange = (value: string) => {
    setFilters({ query: value }); // ✅ Correct
    // filters.query = value;      // ❌ Wrong!
  };
}
```

### Headless UI Components
```typescript
import { Listbox, Disclosure, Switch } from '@headlessui/react';
import { cn } from '@/utils/cn';

// Use cn() for conditional classes
<Listbox.Option
  className={({ active }) => cn(
    'relative cursor-pointer py-2 px-4',
    active ? 'bg-primary-100' : 'text-gray-900'
  )}
>
```

### Error Boundary Wrapper
```typescript
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';

export function SafeComponent() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

### Loading States
```typescript
if (isLoading) {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

## 📦 Common Imports

```typescript
// Types - ALWAYS from @/types
import type { Lesson, SearchFilters } from '@/types';

// Utils - ALWAYS use @/ alias
import { cn } from '@/utils/cn';
import { logger } from '@/utils/logger';

// Stores - ALWAYS from @/stores
import { useSearchStore } from '@/stores/searchStore';

// Icons - from lucide-react
import { Search, Filter, X } from 'lucide-react';

// UI Libraries
import { Listbox, Dialog } from '@headlessui/react';
```

## 🧪 Testing Components

```typescript
// ComponentName.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should handle user interaction', async () => {
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## ⚠️ Component-Specific Critical Notes

- **Filters**: EXACTLY 11 categories - count stored in `filterDefinitions.ts`
- **Modals**: Use `focus-trap-react` for accessibility
- **Lists**: Implement virtualization for 50+ items using `react-window`
- **Forms**: Use controlled components with proper validation
- **Search**: Debounce input with 300ms delay minimum
- **Cultural Heritage**: Parent selection includes ALL children