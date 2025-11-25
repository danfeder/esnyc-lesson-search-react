# Zustand Store Guidelines

## Store Pattern

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface StoreState {
  items: Item[];
  isLoading: boolean;
  // eslint-disable-next-line no-unused-vars
  setItems: (items: Item[]) => void;
}

export const useStoreName = create<StoreState>()(
  devtools(
    (set, get) => ({
      items: [],
      isLoading: false,
      setItems: (items) => set({ items }),
    }),
    { name: 'store-name' }
  )
);
```

## Key Rules

1. **Never mutate state** - Use `set()` with spread operator
2. **Reset page on filter change** - `setFilters` must reset `currentPage` to 1
3. **ESLint comments** - Add `// eslint-disable-next-line no-unused-vars` above action function types

## Filter Types

| Type | Examples |
|------|----------|
| Single-select (`string`) | `lessonFormat`, `cookingMethods` |
| Multi-select (`string[]`) | `gradeLevels`, `coreCompetencies` |

## Current Store: searchStore.ts

- Manages filters and view state (not results - those come from React Query)
- `setFilters`: Updates filters AND resets `currentPage` to 1
- `clearFilters`: Resets to initial state
- `toggleFilter`: Add/remove filter values

## State Updates

```typescript
// Correct: immutable update
set((state) => ({
  filters: { ...state.filters, query: 'new' }
}));

// Wrong: direct mutation
state.filters.query = 'new';
```

## Testing

```typescript
import { renderHook, act } from '@testing-library/react';

test('setFilters resets page', () => {
  const { result } = renderHook(() => useSearchStore());
  act(() => result.current.setFilters({ query: 'test' }));
  expect(result.current.viewState.currentPage).toBe(1);
});
```
