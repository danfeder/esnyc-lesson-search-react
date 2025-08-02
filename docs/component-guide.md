# ESYNYC Component Guide

## Overview

This guide documents the component architecture, patterns, and best practices for the ESYNYC Lesson Search application.

## Component Organization

### Directory Structure
```
src/components/
├── Common/          # Shared, reusable components
├── Filters/         # Filter-specific components
├── Layout/          # Page layout components
├── Modal/           # Modal-related components
├── Results/         # Search results components
└── Search/          # Search input components
```

## Core Components

### Layout Components

#### Header
**Location:** `components/Layout/Header.tsx`  
**Purpose:** Main navigation and user menu

```typescript
interface HeaderProps {
  className?: string;
}

// Usage
<Header />
```

**Features:**
- Responsive navigation
- User authentication status
- Role-based menu items
- Mobile hamburger menu

#### PageLayout
**Location:** `components/Layout/PageLayout.tsx`  
**Purpose:** Consistent page structure wrapper

```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

// Usage
<PageLayout title="Search Lessons">
  <SearchPage />
</PageLayout>
```

### Search Components

#### SearchBar
**Location:** `components/Search/SearchBar.tsx`  
**Purpose:** Main search input with autocomplete

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  showSuggestions?: boolean;
}

// Usage
<SearchBar 
  onSearch={handleSearch}
  placeholder="Search lessons..."
  showSuggestions={true}
/>
```

**Features:**
- Debounced input
- Search suggestions
- Clear button
- Keyboard navigation

### Filter Components

#### FilterSidebar
**Location:** `components/Filters/FilterSidebar.tsx`  
**Purpose:** Container for all filter components

```typescript
interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Usage
<FilterSidebar 
  isOpen={filtersOpen}
  onClose={() => setFiltersOpen(false)}
/>
```

#### Individual Filter Components

Each filter follows a consistent pattern:

```typescript
// Example: GradeFilter.tsx
interface GradeFilterProps {
  selected: string[];
  onChange: (grades: string[]) => void;
  className?: string;
}

export function GradeFilter({ selected, onChange, className }: GradeFilterProps) {
  // Implementation
}
```

**Available Filters:**
1. `ActivityTypeFilter` - Cooking/Garden/Both/Academic
2. `LocationFilter` - Indoor/Outdoor/Both
3. `GradeFilter` - 3K through 8th grade
4. `ThematicCategoryFilter` - 7 thematic categories
5. `SeasonFilter` - Seasonal timing options
6. `CoreCompetencyFilter` - 6 ESYNYC priorities
7. `CulturalHeritageFilter` - Hierarchical regions
8. `LessonFormatFilter` - Single-select dropdown
9. `AcademicIntegrationFilter` - Multi-select subjects
10. `SELFilter` - Social-emotional competencies
11. `CookingMethodFilter` - Single-select methods

### Results Components

#### LessonCard
**Location:** `components/Results/LessonCard.tsx`  
**Purpose:** Display individual lesson in results

```typescript
interface LessonCardProps {
  lesson: Lesson;
  onClick: () => void;
  isBookmarked?: boolean;
  onBookmark?: (lessonId: string) => void;
}

// Usage
<LessonCard 
  lesson={lesson}
  onClick={() => openLessonModal(lesson.id)}
  isBookmarked={bookmarks.includes(lesson.id)}
  onBookmark={handleBookmark}
/>
```

#### ResultsGrid
**Location:** `components/Results/ResultsGrid.tsx`  
**Purpose:** Responsive grid layout for results

```typescript
interface ResultsGridProps {
  lessons: Lesson[];
  loading?: boolean;
  emptyMessage?: string;
  onLessonClick: (lesson: Lesson) => void;
}

// Usage
<ResultsGrid 
  lessons={searchResults}
  loading={isLoading}
  emptyMessage="No lessons found"
  onLessonClick={handleLessonClick}
/>
```

### Modal Components

#### LessonModal
**Location:** `components/Modal/LessonModal.tsx`  
**Purpose:** Detailed lesson view

```typescript
interface LessonModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

// Usage
<LessonModal 
  lesson={selectedLesson}
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onEdit={handleEdit}
  canEdit={userCanEdit}
/>
```

### Common Components

#### LoadingSpinner
**Location:** `components/Common/LoadingSpinner.tsx`  
**Purpose:** Consistent loading indicator

```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

// Usage
<LoadingSpinner size="medium" />
```

#### ErrorBoundary
**Location:** `components/Common/ErrorBoundary.tsx`  
**Purpose:** Catch and display component errors

```typescript
// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

#### Button
**Location:** `components/Common/Button.tsx`  
**Purpose:** Consistent button styling

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

// Usage
<Button 
  variant="primary"
  size="medium"
  onClick={handleSubmit}
  loading={isSubmitting}
>
  Submit
</Button>
```

## Component Patterns

### 1. Controlled Components
All form inputs should be controlled:
```typescript
const [value, setValue] = useState('');

<input 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### 2. Composition Pattern
Build complex components from simpler ones:
```typescript
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### 3. Render Props
For flexible rendering logic:
```typescript
<DataList
  items={items}
  renderItem={(item) => <CustomItem {...item} />}
/>
```

### 4. Custom Hooks
Extract component logic into hooks:
```typescript
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

## State Management

### Using Zustand Stores
```typescript
// In component
import { useFilterStore } from '@/stores/filterStore';

function MyComponent() {
  const { filters, setFilter } = useFilterStore();
  
  const handleFilterChange = (filterName: string, value: any) => {
    setFilter(filterName, value);
  };
}
```

### Local State vs Global State
- **Local State**: UI state (open/closed, hover, focus)
- **Global State**: Filters, search results, user data

## Styling Guidelines

### Tailwind Classes
```typescript
// Consistent spacing
<div className="space-y-4">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Dark mode support
<div className="bg-white dark:bg-gray-800">
```

### Component Classes
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/utils/cn';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className // Allow override
)}>
```

## Accessibility

### Required Attributes
```typescript
// Buttons
<button aria-label="Close modal">

// Forms
<label htmlFor="search-input">Search</label>
<input id="search-input" aria-describedby="search-help">

// Loading states
<div role="status" aria-live="polite">
  <span className="sr-only">Loading...</span>
</div>
```

### Keyboard Navigation
```typescript
// Handle keyboard events
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    onClose();
  }
};
```

## Testing Components

### Component Test Pattern
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onSearch when submitted', () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(input);
    
    expect(handleSearch).toHaveBeenCalledWith('test');
  });
});
```

## Performance Optimization

### Memoization
```typescript
// Memoize expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);

// Memoize values
const processedData = useMemo(() => {
  return processData(rawData);
}, [rawData]);
```

### Code Splitting
```typescript
// Lazy load heavy components
const HeavyModal = lazy(() => import('./HeavyModal'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <HeavyModal />
</Suspense>
```

## Common Pitfalls

1. **Don't mutate state directly**
   ```typescript
   // ❌ Wrong
   filters.grades.push('3rd');
   
   // ✅ Correct
   setFilters({ ...filters, grades: [...filters.grades, '3rd'] });
   ```

2. **Don't forget cleanup**
   ```typescript
   useEffect(() => {
     const timer = setTimeout(...);
     return () => clearTimeout(timer); // Cleanup
   }, []);
   ```

3. **Don't overuse useEffect**
   ```typescript
   // ❌ Unnecessary effect
   useEffect(() => {
     setFullName(`${firstName} ${lastName}`);
   }, [firstName, lastName]);
   
   // ✅ Derive during render
   const fullName = `${firstName} ${lastName}`;
   ```

## Adding New Components

1. Create component file in appropriate directory
2. Define TypeScript interface for props
3. Export named function (not default)
4. Add Storybook story (if applicable)
5. Write unit tests
6. Update this guide if it's a core component

## Component Checklist

- [ ] TypeScript props interface defined
- [ ] Proper error handling
- [ ] Loading states handled
- [ ] Accessibility attributes
- [ ] Responsive design
- [ ] Dark mode support (if applicable)
- [ ] Unit tests written
- [ ] Props documented
- [ ] Memoization applied where needed