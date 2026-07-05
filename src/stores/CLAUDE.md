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
2. **Pagination is NOT in the store** - it lives in React Query as the
   infinite-query `pageParam` (see `useLessonSearch`). A filter or sort change
   rebuilds the query key, which restarts the query at page 0 automatically —
   the store has no `currentPage` field to reset.
3. **ESLint comments** - Add `// eslint-disable-next-line no-unused-vars` above action function types

## Filter Types

| Type | Examples |
|------|----------|
| Multi-select (`string[]`) | `gradeLevels`, `coreCompetencies`, `cookingMethods` |

## Current Store: searchStore.ts

- Manages filters and view state (not results or pagination - those come from React Query)
- `setFilters`: Merges into `filters` (pagination restarts via the query key)
- `clearFilters`: FULL reset to initial state (query + sort included). Used by tests/teardown, not the UI.
- `clearFilterSelections`: Clears facet selections only — the typed query and sort survive (D-E). This is what the Filters-panel "Clear all" button calls.
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

test('setFilters merges into filters', () => {
  const { result } = renderHook(() => useSearchStore());
  act(() => result.current.setFilters({ query: 'test' }));
  expect(result.current.filters.query).toBe('test');
});
```
