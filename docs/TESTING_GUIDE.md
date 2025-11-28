# ESYNYC Lesson Search Testing Guide

## Overview

This guide covers the testing strategy, patterns, and best practices for the ESYNYC Lesson Search v2 application. We use Vitest for unit and integration testing, with React Testing Library for component tests.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Testing Patterns](#testing-patterns)
4. [Component Testing](#component-testing)
5. [Store Testing](#store-testing)
6. [Hook Testing](#hook-testing)
7. [API/Database Testing](#apidatabase-testing)
8. [Best Practices](#best-practices)
9. [Coverage Guidelines](#coverage-guidelines)

## Test Structure

```
src/
├── components/
│   ├── Filters/
│   │   ├── GradeFilter.tsx
│   │   └── GradeFilter.test.tsx
│   └── Search/
│       ├── SearchBar.tsx
│       └── SearchBar.test.tsx
├── stores/
│   ├── filterStore.ts
│   └── filterStore.test.ts
├── hooks/
│   ├── useLessonSearch.ts
│   └── useLessonSearch.test.ts
└── __tests__/
    └── integration/
        └── search-flow.test.tsx
```

### File Naming Conventions

- Unit tests: `[filename].test.ts(x)` - co-located with source files
- Integration tests: `__tests__/integration/[feature].test.tsx`
- Test utilities: `test-utils/[utility].ts`

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test SearchBar.test.tsx

# Run tests matching pattern
npm test -- --grep "filter"
```

## Testing Patterns

### Component Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './SearchBar';
import { useSearchStore } from '@/stores/searchStore';

// Mock Zustand store
vi.mock('@/stores/searchStore');

describe('SearchBar', () => {
  const mockSetSearchQuery = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchStore as any).mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchBar />
      </QueryClientProvider>
    );
  };

  it('should render search input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/search lessons/i)).toBeInTheDocument();
  });

  it('should update search query on input', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText(/search lessons/i);
    
    fireEvent.change(input, { target: { value: 'tomato' } });
    
    await waitFor(() => {
      expect(mockSetSearchQuery).toHaveBeenCalledWith('tomato');
    });
  });
});
```

### Store Testing Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFilterStore } from './filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useFilterStore());
    act(() => {
      result.current.clearAllFilters();
    });
  });

  it('should set grade filter', () => {
    const { result } = renderHook(() => useFilterStore());

    act(() => {
      result.current.setGradeFilter(['3rd', '4th']);
    });

    expect(result.current.filters.grades).toEqual(['3rd', '4th']);
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useFilterStore());

    act(() => {
      result.current.setGradeFilter(['3rd']);
      result.current.setSeasonFilter('spring');
      result.current.clearAllFilters();
    });

    expect(result.current.filters.grades).toEqual([]);
    expect(result.current.filters.season).toBeNull();
  });
});
```

### Hook Testing Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLessonSearch } from './useLessonSearch';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

describe('useLessonSearch', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch search results', async () => {
    const mockLessons = [
      { lesson_id: '1', title: 'Tomato Salad', total_count: 2 },
      { lesson_id: '2', title: 'Tomato Soup', total_count: 2 },
    ];

    (supabase.rpc as any).mockResolvedValue({
      data: mockLessons,
      error: null,
    });

    const { result } = renderHook(
      () => useLessonSearch({ filters: { query: 'tomato' } }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0].lessons).toHaveLength(2);
  });
});
```

## Component Testing

### Testing User Interactions

```typescript
it('should open filter modal on button click', async () => {
  const user = userEvent.setup();
  render(<FilterSidebar />);
  
  const filterButton = screen.getByRole('button', { name: /filters/i });
  await user.click(filterButton);
  
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

### Testing Async Behavior

```typescript
it('should show loading state while fetching', async () => {
  render(<LessonResults />);
  
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});
```

### Testing Accessibility

```typescript
it('should have accessible form labels', () => {
  render(<GradeFilter />);
  
  const checkbox = screen.getByRole('checkbox', { name: /3rd grade/i });
  expect(checkbox).toHaveAccessibleName('3rd Grade');
});
```

## Store Testing

### Testing Complex State Updates

```typescript
it('should merge cultural heritage filters correctly', () => {
  const { result } = renderHook(() => useFilterStore());

  act(() => {
    // Select parent category
    result.current.setCulturalFilter(['Asian']);
  });

  act(() => {
    // Add child category
    result.current.setCulturalFilter(['Asian', 'Chinese']);
  });

  // Should include both parent and child
  expect(result.current.filters.cultural).toContain('Asian');
  expect(result.current.filters.cultural).toContain('Chinese');
});
```

## Hook Testing

### Testing with React Query

```typescript
it('should refetch when filters change', async () => {
  const { result, rerender } = renderHook(
    ({ filters }) => useLessonSearch({ filters }),
    {
      wrapper,
      initialProps: { filters: { query: 'tomato' } },
    }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const firstCallCount = mockSupabase.rpc.mock.calls.length;

  rerender({ filters: { query: 'tomato', gradeLevels: ['3'] } });

  await waitFor(() => {
    expect(mockSupabase.rpc.mock.calls.length).toBeGreaterThan(firstCallCount);
  });
});
```

## API/Database Testing

### Mocking Supabase

```typescript
// test-utils/supabase-mock.ts
export const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
      in: vi.fn(() => ({
        data: [],
        error: null,
      })),
      textSearch: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      data: null,
      error: null,
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => ({
      data: { user: null },
      error: null,
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
});
```

### Testing Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  (supabase.rpc as any).mockResolvedValue({
    data: null,
    error: { message: 'Database connection failed' },
  });

  const { result } = renderHook(
    () => useLessonSearch({ filters: { query: 'tomato' } }),
    { wrapper }
  );

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error?.message).toContain('Database connection failed');
});
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Good - Testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### 2. Use Testing Library Queries Correctly

```typescript
// ❌ Bad - Using test IDs unnecessarily
screen.getByTestId('submit-button');

// ✅ Good - Using semantic queries
screen.getByRole('button', { name: /submit/i });
```

### 3. Avoid Testing Third-Party Libraries

```typescript
// ❌ Bad - Testing React Query internals
expect(queryClient.getQueryData(['lessons'])).toBeDefined();

// ✅ Good - Testing your app's behavior
expect(screen.getByText('10 lessons found')).toBeInTheDocument();
```

### 4. Keep Tests Focused and Independent

```typescript
// ❌ Bad - Multiple assertions in one test
it('should handle form submission', () => {
  // Tests validation
  // Tests submission
  // Tests success message
  // Tests redirect
});

// ✅ Good - Separate concerns
it('should validate required fields');
it('should submit form with valid data');
it('should show success message after submission');
it('should redirect after successful submission');
```

### 5. Use Descriptive Test Names

```typescript
// ❌ Bad
it('should work');
it('test filter');

// ✅ Good
it('should filter lessons by grade when grade checkbox is selected');
it('should clear all filters when clear button is clicked');
```

## Coverage Guidelines

### Target Coverage

- Overall: 80%+
- Critical paths: 95%+
- Utility functions: 100%
- Components: 80%+
- Stores: 90%+

### What to Test

1. **Critical User Flows**
   - Search functionality
   - Filter application
   - Lesson viewing
   - User authentication

2. **Business Logic**
   - Filter combinations
   - Search query building
   - Data transformations

3. **Edge Cases**
   - Empty states
   - Error states
   - Loading states
   - Boundary conditions

### What Not to Test

1. **Implementation Details**
   - Internal component state
   - Private methods
   - Style classes

2. **Third-Party Code**
   - Supabase SDK
   - React Query
   - UI libraries

3. **Simple Components**
   - Pure presentational components
   - Components with no logic

## Integration Testing

### Testing Complete User Flows

```typescript
// __tests__/integration/search-flow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';

describe('Search Flow Integration', () => {
  it('should search and filter lessons', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Search for lessons
    const searchInput = screen.getByPlaceholderText(/search lessons/i);
    await user.type(searchInput, 'tomato');

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText(/tomato salad/i)).toBeInTheDocument();
    });

    // Apply grade filter
    const filterButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filterButton);

    const gradeCheckbox = screen.getByRole('checkbox', { name: /3rd grade/i });
    await user.click(gradeCheckbox);

    // Verify filtered results
    await waitFor(() => {
      const results = screen.getAllByTestId('lesson-card');
      results.forEach(result => {
        expect(result).toHaveTextContent(/3rd/i);
      });
    });
  });
});
```

## Debugging Tests

### Using Debug Utilities

```typescript
import { screen, debug } from '@testing-library/react';

it('should render correctly', () => {
  render(<Component />);
  
  // Debug entire document
  screen.debug();
  
  // Debug specific element
  const element = screen.getByRole('button');
  debug(element);
  
  // Log accessible roles
  screen.logTestingPlaygroundURL();
});
```

### Common Issues and Solutions

1. **Act Warnings**
   ```typescript
   // Wrap state updates in act
   await act(async () => {
     fireEvent.click(button);
   });
   ```

2. **Async Testing**
   ```typescript
   // Always use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

3. **Timer Issues**
   ```typescript
   // Use fake timers for debounced operations
   vi.useFakeTimers();
   // ... perform actions
   vi.runAllTimers();
   vi.useRealTimers();
   ```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)