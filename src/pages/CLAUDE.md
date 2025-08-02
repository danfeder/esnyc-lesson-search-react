# Page Components

Page-level components that represent routes in the application.

## Page Structure Pattern
```typescript
export function PageName() {
  // 1. Hooks first
  const { user } = useAuthStore();
  
  // 2. Data fetching
  const { data, isLoading } = useQuery({...});
  
  // 3. Local state
  const [state, setState] = useState();
  
  // 4. Effects
  useEffect(() => {...}, []);
  
  // 5. Handlers
  const handleAction = () => {...};
  
  // 6. Early returns
  if (isLoading) return <LoadingSpinner />;
  
  // 7. Main render
  return <PageLayout>...</PageLayout>;
}
```

## Route Protection
```typescript
// In App.tsx
<ProtectedRoute permissions={[Permission.VIEW_ADMIN]}>
  <AdminPage />
</ProtectedRoute>
```

## Page-Specific Notes

### SearchPage
- Main page, no auth required
- Manages filter state via Zustand
- CSV export TODO still pending

### Admin Pages
- All require authentication
- Check permissions with `useUserPermissions`
- Use `AdminLayout` wrapper

### Submission Flow
1. `SubmissionPage` - Initial form
2. `ReviewSubmissions` - Admin review list
3. `ReviewDetail` - Individual review
4. `AdminDuplicates` - Duplicate management

## Data Loading Pattern
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['key', params],
  queryFn: () => fetchData(params),
});
```

## Common Imports
- `@/components/Layout/PageLayout`
- `@/hooks/useAuthStore`
- `@tanstack/react-query`