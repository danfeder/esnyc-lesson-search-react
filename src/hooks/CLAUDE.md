# Custom Hooks Guidelines

## Hook Pattern

```typescript
export function useHookName(param: string) {
  const [state, setState] = useState();

  useEffect(() => {
    // Effect logic
    return () => { /* cleanup */ };
  }, [param]);

  return { data: state, isLoading: false, error: null };
}
```

## Rules

- Prefix with `use`
- Never call conditionally
- Always return consistent shape
- Include cleanup in useEffect for subscriptions

## React Query Pattern

```typescript
export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select()
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
```

## Common Hooks

| Hook | Purpose |
|------|---------|
| `useLessonSearch({ filters })` | Search lessons with infinite scroll |
| `useLessonSuggestions({ filters })` | Search suggestions via smart-search |
| `useEnhancedAuth()` | Auth state with permissions |
| `useDebounce(value, delay)` | Debounce search input (300ms typical) |
| `useLessonStats()` | Lesson statistics |
| `useSearchStore()` | Search filters/view state (Zustand) |

## Common Errors

| Error | Fix |
|-------|-----|
| Invalid hook call | Only use in components or custom hooks |
| Missing dependency | Add to useEffect deps array |
| Rendered more hooks | Don't call hooks conditionally |
| Query key must be array | Use `['key']` not `'key'` |
