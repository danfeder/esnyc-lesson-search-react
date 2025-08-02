# Custom React Hooks

Reusable logic extracted into custom hooks.

## Hook Patterns

### Data Fetching Hook
```typescript
export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: () => supabase
      .from('lessons')
      .select()
      .eq('id', id)
      .single(),
    enabled: !!id,
  });
}
```

### State Management Hook
```typescript
export function useFilters() {
  const filters = useFilterStore(state => state.filters);
  const setFilter = useFilterStore(state => state.setFilter);
  const resetFilters = useFilterStore(state => state.resetFilters);
  
  return { filters, setFilter, resetFilters };
}
```

### Effect Hook
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

## Current Hooks

### useAuthStore
- User authentication state
- Login/logout methods
- Permission checking

### useSearch
- Search functionality
- Integrates with Algolia
- Handles debouncing

### useBookmarks
- User's bookmarked lessons
- Persists to localStorage
- Syncs with database

### useLessonStats
- Admin statistics
- Lesson counts by category
- Submission metrics

## Hook Rules
1. Start with "use" prefix
2. Can call other hooks
3. Cannot be conditional
4. Return consistent shape

## Testing Hooks
```typescript
import { renderHook } from '@testing-library/react';

test('hook behavior', () => {
  const { result } = renderHook(() => useCustomHook());
  expect(result.current.value).toBe(expected);
});
```