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
| `useLessonSearch({ filters, sortBy, pageSize, enabled })` | Public search via the `search_lessons` RPC; React Query infinite scroll (`pageParam` = page index) |
| `useUrlSync()` | Two-way URL ⇄ store sync for the search page (`hydrated`, `flush`). **Read the file header before touching it** — it documents a loop guard and history-mode invariants that several tests pin |
| `useFacetCounts(filters)` | True facet-count badges: one slim corpus fetch per session, counts computed client-side (`utils/facetCounts.ts`); `undefined` until loaded |
| `useLessonById(lessonId, { enabled })` | Single-lesson fetch for `/lesson/:id` permalinks (anon-readable; hides retired lessons) |
| `useLessonSuggestions({ filters, enabled })` | Zero-result suggestions via the `smart-search` edge function |
| `useLessonStats()` | Total lesson / category counts for the landing stats |
| `useEnhancedAuth()` | Auth state with role + permissions |
| `useDebounce(value, delay)` | Debounce an input value (300 ms typical) |
| `useMediaQuery(query)` | Subscribe to a CSS media query; gates the desktop split view (SSR/jsdom-safe) |
| `useSearchStore()` | Zustand store: filters + sort + layout prefs (`src/stores/`); pagination is NOT here |

## Common Errors

| Error | Fix |
|-------|-----|
| Invalid hook call | Only use in components or custom hooks |
| Missing dependency | Add to useEffect deps array |
| Rendered more hooks | Don't call hooks conditionally |
| Query key must be array | Use `['key']` not `'key'` |
