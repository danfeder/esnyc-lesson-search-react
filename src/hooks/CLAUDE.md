# Custom React Hooks

## ⚠️ CRITICAL RULES

1. **Hook Prefix** - ALL hooks MUST start with "use"
2. **No Conditionals** - NEVER call hooks conditionally
3. **Consistent Returns** - ALWAYS return same shape
4. **ESLint Comments** - Add `// eslint-disable-next-line` for unused params
5. **Error Handling** - ALWAYS handle loading and error states

## 🎣 Hook Creation Pattern

```typescript
// YOU MUST follow this pattern:
export function useHookName(param: string) {
  // 1. Call other hooks at top level
  const [state, setState] = useState();
  
  // 2. Effects come after state
  useEffect(() => {
    // Effect logic
  }, [param]); // ALWAYS specify dependencies
  
  // 3. Return consistent shape
  return {
    data: state,
    isLoading: false,
    error: null,
    // Actions if needed
    refetch: () => {},
  };
}
```

## 📊 Data Fetching with React Query

```typescript
export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lesson', id],  // Consistent key structure
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select()
        .eq('id', id)
        .single();
      
      if (error) {
        logger.error('Failed to fetch lesson:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!id,  // Prevent query if no ID
    staleTime: 5 * 60 * 1000,  // 5 minutes
    retry: 2,
  });
}
```

### Error Handling Pattern
```typescript
export function useLessons() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: fetchLessons,
    throwOnError: false,  // Handle in component
  });
  
  // Transform error for UI
  if (error) {
    const userMessage = error.code === 'PGRST116' 
      ? 'You don\'t have permission to view lessons'
      : 'Failed to load lessons. Please try again.';
    
    return { 
      data: null, 
      isLoading: false, 
      error: userMessage 
    };
  }
  
  return { data, isLoading, error: null };
}
```

## 🐛 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Invalid hook call" | Hooks only in function components or custom hooks |
| "Missing dependency" | Add to useEffect deps array |
| "Rendered more hooks" | Don't call hooks conditionally |
| "Can't perform state update" | Check cleanup in useEffect |
| "Query key must be array" | Use `['key']` not `'key'` |

## 🔧 Common Hook Patterns

### Debounced Value
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cleanup function CRITICAL
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage
const debouncedSearch = useDebounce(searchQuery, 300);
```

### Local Storage Sync
```typescript
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error('Failed to load from localStorage:', error);
      return initialValue;
    }
  });
  
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Failed to save to localStorage:', error);
    }
  };
  
  return [storedValue, setValue];
}
```

### Permission Check
```typescript
export function usePermission(permission: Permission): boolean {
  const { user } = useAuthStore();
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    async function checkPermission() {
      if (!user) {
        setHasPermission(false);
        return;
      }
      
      const { data } = await supabase
        .rpc('has_permission', { 
          user_id: user.id, 
          permission 
        });
      
      setHasPermission(data || false);
    }
    
    checkPermission();
  }, [user, permission]);
  
  return hasPermission;
}
```

## 🧪 Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLesson } from './useLesson';

describe('useLesson', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });
  
  it('should fetch lesson data', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(
      () => useLesson('lesson-123'),
      { wrapper }
    );
    
    // Initial loading state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
  
  it('should handle errors', async () => {
    // Mock error response
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ 
            data: null, 
            error: { code: 'PGRST116' } 
          })
        })
      })
    }));
    
    const { result } = renderHook(() => useLesson('invalid'));
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

## 📦 Current Hooks Reference

### useAuthStore
```typescript
const { user, login, logout, isLoading } = useAuthStore();
```

### useSearch
```typescript
const { results, search, isSearching } = useSearch();
```

### useBookmarks
```typescript
const { bookmarks, addBookmark, removeBookmark } = useBookmarks();
```

### useLessonStats
```typescript
const { stats, isLoading, refetch } = useLessonStats();
```

## ⚠️ Hook-Specific Gotchas

- **useEffect**: ALWAYS include cleanup function for subscriptions
- **useQuery**: Keys must be arrays, not strings
- **useState**: Initial value function called only once
- **useCallback**: Dependencies array critical for performance
- **useMemo**: Don't overuse - profile first
- **useRef**: Value persists across renders