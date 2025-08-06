# Zustand Store Patterns

## ⚠️ CRITICAL: ESLint no-unused-vars Pattern

YOU MUST follow this EXACT pattern for ALL store actions with parameters:

```typescript
interface SearchState {
  // ALWAYS add eslint comment for function parameters
  // eslint-disable-next-line no-unused-vars
  setFilter: (key: keyof SearchFilters, value: string) => void;
  // eslint-disable-next-line no-unused-vars
  setResults: (results: Lesson[], totalCount: number) => void;
  // eslint-disable-next-line no-unused-vars
  toggleFilter: (key: keyof SearchFilters, value: string) => void;
}
```

## 🏪 Store Creation Pattern

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStoreName = create<StoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      isLoading: false,
      
      // Actions - NEVER mutate state directly
      setItems: (items) => set({ items }),
      
      // Complex updates - use spread operator
      updateItem: (id, updates) => 
        set((state) => ({
          items: state.items.map(item => 
            item.id === id ? { ...item, ...updates } : item
          )
        })),
    }),
    {
      name: 'store-name', // Shows in Redux DevTools
    }
  )
);
```

## 📋 Current Stores

### searchStore.ts
- **Purpose**: Manages search filters, results, and pagination
- **Key Actions**:
  - `setFilters`: Updates filters AND resets page to 1
  - `clearFilters`: Resets to initialFilters
  - `appendResults`: For infinite scroll
  - `toggleFilter`: Add/remove filter values
- **IMPORTANT**: Filter changes ALWAYS reset currentPage to 1

## ⚠️ Common Gotchas

1. **NEVER mutate state directly**
   ```typescript
   // ❌ WRONG
   state.filters.query = 'new query';
   
   // ✅ CORRECT
   set((state) => ({ 
     filters: { ...state.filters, query: 'new query' }
   }));
   ```

2. **Filter types vary by selection mode**
   ```typescript
   // Single-select filters use string
   lessonFormat: string;
   cookingMethods: string;
   
   // Multi-select filters use string[]
   gradeLevels: string[];
   coreCompetencies: string[];
   ```

3. **Always reset page on filter change**
   ```typescript
   setFilters: (newFilters) =>
     set((state) => ({
       filters: { ...state.filters, ...newFilters },
       viewState: { ...state.viewState, currentPage: 1 }, // CRITICAL
       results: [], // Clear old results
       hasMore: true,
     })),
   ```

## 🧪 Testing Store Actions

```typescript
import { renderHook, act } from '@testing-library/react';
import { useSearchStore } from './searchStore';

test('setFilters resets page to 1', () => {
  const { result } = renderHook(() => useSearchStore());
  
  // Set page to 5
  act(() => {
    result.current.setViewState({ currentPage: 5 });
  });
  
  // Change filters
  act(() => {
    result.current.setFilters({ query: 'test' });
  });
  
  // Page should reset to 1
  expect(result.current.viewState.currentPage).toBe(1);
});
```

## 💡 Best Practices

1. **Use devtools in development only**
   ```typescript
   const store = process.env.NODE_ENV === 'development' 
     ? devtools(storeCreator) 
     : storeCreator;
   ```

2. **Separate concerns**
   - One store per domain (search, auth, UI)
   - Don't mix unrelated state

3. **Use TypeScript interfaces**
   ```typescript
   interface StoreState {
     // Define all state properties
     // Define all action signatures with eslint comments
   }
   ```

4. **Computed values with get()**
   ```typescript
   get activeFiltersCount: () => {
     const filters = get().filters;
     return Object.values(filters).filter(v => 
       Array.isArray(v) ? v.length > 0 : !!v
     ).length;
   }
   ```

## 🔧 Common Store Patterns

### Async Actions
```typescript
fetchData: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await api.getData();
    set({ data, isLoading: false });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}
```

### Optimistic Updates
```typescript
updateOptimistically: (id, updates) => {
  // Update UI immediately
  set((state) => ({
    items: state.items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  }));
  
  // Then sync with server
  api.update(id, updates).catch(() => {
    // Revert on error
    get().reloadItems();
  });
}
```

### Persisted State
```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      preferences: {},
      setPreferences: (prefs) => set({ preferences: prefs }),
    }),
    {
      name: 'user-preferences',
    }
  )
);
```