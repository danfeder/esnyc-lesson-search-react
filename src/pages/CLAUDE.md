# Page Components

## ⚠️ CRITICAL RULES

1. **Protected Routes** - ALWAYS check permissions for admin pages
2. **Loading States** - YOU MUST handle loading/error states
3. **Page Structure** - Follow exact order: hooks → data → state → effects → handlers → render
4. **Route Guards** - Use `ProtectedRoute` wrapper for auth
5. **Error Boundaries** - Wrap pages in error boundaries

## 📄 Page Structure Pattern

```typescript
export function PageName() {
  // 1. Hooks FIRST (NEVER conditional)
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // 2. Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['page-data'],
    queryFn: fetchPageData,
  });
  
  // 3. Local state
  const [localState, setLocalState] = useState();
  
  // 4. Effects (with cleanup!)
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependencies]);
  
  // 5. Event handlers
  const handleSubmit = async () => {
    try {
      // Handle action
    } catch (error) {
      logger.error('Page action failed:', error);
    }
  };
  
  // 6. Early returns (loading/error states)
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorState message="Failed to load page" />;
  }
  
  // 7. Main render
  return (
    <PageLayout>
      {/* Page content */}
    </PageLayout>
  );
}
```

## 🔐 Route Protection Patterns

```typescript
// App.tsx route configuration
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

// Basic protection
<ProtectedRoute>
  <UserProfile />
</ProtectedRoute>

// Permission-based protection
<ProtectedRoute permissions={[Permission.VIEW_ADMIN]}>
  <AdminDashboard />
</ProtectedRoute>

// Role-based protection
<ProtectedRoute roles={['admin', 'reviewer']}>
  <ReviewDashboard />
</ProtectedRoute>
```

## 🐛 Common Page Errors & Solutions

| Error | Solution |
|-------|----------|
| "Cannot access before initialization" | Move hooks to top of component |
| "Too many re-renders" | Check setState in render/effects |
| "Navigation cancelled" | Add cleanup in useEffect |
| "Permission denied" | Check user role in ProtectedRoute |
| "Data undefined on render" | Add loading state check |

## 🚦 Page-Specific Troubleshooting

### SearchPage Issues
```typescript
// Problem: Filters not updating results
// Solution: Check store subscription
const filters = useSearchStore(state => state.filters);
// NOT: const { filters } = useSearchStore(); // Wrong!

// Problem: Too many API calls
// Solution: Debounce search input
const debouncedQuery = useDebounce(query, 300);
```

### Admin Pages Issues
```typescript
// Problem: Unauthorized access
// Solution: Check multiple permission levels
const canView = hasPermission(Permission.VIEW_USERS);
const canEdit = hasPermission(Permission.EDIT_USERS);

if (!canView) {
  return <Navigate to="/unauthorized" replace />;
}

// Problem: Stale data after mutations
// Solution: Invalidate queries
const { mutate } = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

### Review Flow Issues
```typescript
// Problem: Lost form data on navigation
// Solution: Save to localStorage
useEffect(() => {
  const savedData = localStorage.getItem('review-draft');
  if (savedData) {
    setFormData(JSON.parse(savedData));
  }
}, []);

useEffect(() => {
  localStorage.setItem('review-draft', JSON.stringify(formData));
}, [formData]);
```

## 📊 Data Loading Best Practices

```typescript
// Parallel data loading
const [lessonsQuery, statsQuery] = useQueries({
  queries: [
    { queryKey: ['lessons'], queryFn: fetchLessons },
    { queryKey: ['stats'], queryFn: fetchStats },
  ],
});

// Dependent queries
const { data: user } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
});

const { data: profile } = useQuery({
  queryKey: ['profile', user?.id],
  queryFn: () => fetchProfile(user.id),
  enabled: !!user?.id, // Only run when user exists
});

// Infinite scroll
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['lessons', filters],
  queryFn: ({ pageParam = 0 }) => fetchLessons(pageParam, filters),
  getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
});
```

## 🗂️ Current Pages Reference

`src/pages/*.tsx` is the source of truth — run `ls src/pages/*.tsx` for the authoritative, current list, since this inventory drifts as pages are added. As of 2026-07 there are 14 page components:

### Public
- **SearchPage** - Main search interface, no auth

### Auth & account flows
- **AcceptInvitation** - Accept an admin/reviewer invitation
- **ResetPassword** - Password-reset flow
- **UserProfile** - User's profile and settings

### Teacher / submission
- **SubmissionPage** - Submission entry point
- **NewSubmissionForm** - New-lesson submission form
- **RevisingSubmissionForm** - Revise a returned submission

### Reviewer
- **ReviewDashboard** - Submissions list
- **ReviewDetail** - Individual review interface

### Admin
- **AdminDashboard** - Admin overview
- **AdminUsers** - User management
- **AdminUserDetail** - Single-user detail
- **AdminInvitations** - Invitations list
- **AdminInviteUser** - Send a new invitation

(The AdminDuplicates / AdminDuplicateReview pages were removed in T4b (D10) —
duplicate handling now lives entirely in the reviewer flow on ReviewDetail.
AdminAnalytics was retired in the frontend-polish phase, owner decision D3.)

## ⚠️ Page-Specific Critical Notes

### SearchPage
- Uses PostgreSQL full-text search (Algolia removed)
- Filter categories defined in `filterDefinitions.ts`

### ReviewDetail
- Google Docs extraction WORKING (real API in production, mock fallback in dev)
- Validates metadata before submission
- Must handle all filter categories defined in `filterDefinitions.ts`
- **Template vocab mapping (FP5 Brief 1, owner 2026-07-04):** the 2026 lesson
  template's wording maps 1:1 onto the app's options. "Cultural diversity" in a
  template doc **is** the Core Competency **Cultural Diversity** (renamed from
  "Culturally Responsive Education" — same concept). The template's
  Social-Emotional words map onto the **Social-Emotional Skills** category (the 5
  CASEL values + Bravery/Kindness/Respect/Collaboration/Pride/Joy).
  **Social-Emotional Intelligence** is a *Core Competency* the template dropped.
  **FP5 Brief 3 (owner 2026-07-04):** the reviewer form now enforces this — its
  Core Competencies pill is hidden unless the review's metadata AS INITIALLY
  LOADED already carries it (so old carriers stay editable; unticking it
  mid-review keeps the pill visible). It remains a legal stored value and the
  public search facet keeps it (388/431 active lessons carry it).

### Submission Flow
```
SubmissionPage → detect-duplicates → ReviewDashboard → ReviewDetail → Approval
```

## 🔄 Navigation Patterns

```typescript
// Programmatic navigation
const navigate = useNavigate();

// Navigate with state
navigate('/review/123', { 
  state: { from: 'dashboard' } 
});

// Replace history
navigate('/login', { replace: true });

// Go back
navigate(-1);

// Access navigation state
const location = useLocation();
const fromPage = location.state?.from || '/';
```
