# Utility Functions & Constants

## ⚠️ CRITICAL CONSTANTS - NEVER MODIFY

### EXACTLY 11 FILTER CATEGORIES
Located in `filterDefinitions.ts` - YOU MUST maintain exactly 11:

```typescript
1. activityType          // Single-select (cooking/garden/both/academic)
2. location              // Single-select (indoor/outdoor/both)
3. gradeLevel            // Multi-select with groups
4. theme                 // Multi-select (7 themes)
5. seasonTiming          // Single-select with year-round option
6. coreCompetencies      // Multi-select (6 ESYNYC priorities)
7. culturalHeritage      // Hierarchical multi-select
8. lessonFormat          // Single-select dropdown
9. academicIntegration   // Multi-select (6 subjects)
10. socialEmotionalLearning // Multi-select (5 SEL competencies)
11. cookingMethods       // Single-select dropdown

// NEVER add a 12th filter or remove any
```

### Cultural Heritage Hierarchy
`filterConstants.ts` - Parent selection includes ALL children:

```typescript
CULTURAL_HIERARCHY = {
  Asian: ['Chinese', 'Japanese', 'Korean', 'Vietnamese', ...],
  'East Asian': ['Chinese', 'Japanese', 'Korean', 'Taiwanese'],
  Americas: ['Mexican', 'Dominican', 'Puerto Rican', ...],
  // etc.
}

// IMPORTANT: Selecting "Asian" MUST include all sub-cultures
```

### Ingredient Grouping for Search
`filterConstants.ts` - Smart search groupings:

```typescript
INGREDIENT_GROUPS = {
  'Root vegetables': ['potatoes', 'carrots', 'beets', 'turnips'],
  'Winter squash': ['butternut', 'honeynut', 'pumpkin', 'acorn squash'],
  'Leafy greens': ['collards', 'kale', 'lettuce', 'spinach'],
  // etc.
}

// Search for "butternut squash" → finds "Winter squash" lessons
```

### Core Competencies (EXACTLY 6)
```typescript
CORE_COMPETENCIES = [
  'Environmental and Community Stewardship',
  'Social Justice',
  'Social-Emotional Intelligence',
  'Garden Skills and Related Academic Content',
  'Kitchen Skills and Related Academic Content',
  'Culturally Responsive Education',
];
// These are ESYNYC's 6 educational priorities - NEVER change
```

## 🔧 Common Utility Patterns

### filterHelpers.ts
```typescript
// Check if parent culture is selected
export function isParentCultureSelected(
  selected: string[], 
  culture: string
): boolean {
  // If "Asian" is selected, "Chinese" is implicitly selected
  for (const parent of selected) {
    if (CULTURAL_HIERARCHY[parent]?.includes(culture)) {
      return true;
    }
  }
  return selected.includes(culture);
}
```

### facetHelpers.ts
```typescript
// Get count for filter option
export function getFacetCount(
  facets: Record<string, Record<string, number>>,
  category: string,
  value: string
): number {
  return facets?.[category]?.[value] || 0;
}
```

### debounce.ts
```typescript
// Debounce search input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

// Usage: const debouncedSearch = debounce(searchFunction, 300);
```

### logger.ts
```typescript
// NEVER use console.log directly in production
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
    // Also send to Sentry in production
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
};

// ALWAYS use: logger.debug() instead of console.log()
```

### cn.ts (className utility)
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage: className={cn('base-class', conditional && 'conditional-class')}
```

## 🚨 Common Errors & Solutions

### Filter Count Mismatch
```typescript
// ❌ WRONG - Adding 12th filter
FILTER_CONFIGS = {
  ...existing11Filters,
  newFilter: { ... } // NO! Breaks the 11 filter rule
}

// ✅ CORRECT - Replace existing filter if needed
// But discuss with team first!
```

### Cultural Heritage Selection
```typescript
// ❌ WRONG - Only checking direct selection
if (selectedCultures.includes('Chinese')) { ... }

// ✅ CORRECT - Check parent hierarchy too
if (isParentCultureSelected(selectedCultures, 'Chinese')) { ... }
```

### Grade Level Groups
```typescript
GRADE_GROUPS = {
  'early-childhood': { grades: ['3K', 'PK'] },
  'lower-elementary': { grades: ['K', '1', '2'] },
  'upper-elementary': { grades: ['3', '4', '5'] },
  'middle': { grades: ['6', '7', '8'] },
};

// Selecting a group selects all grades in it
```

## 📝 Validation Utilities

### Filter Validation
```typescript
export function validateFilters(filters: SearchFilters): string[] {
  const errors: string[] = [];
  
  // Check filter count (must be 11)
  const filterKeys = Object.keys(FILTER_CONFIGS);
  if (filterKeys.length !== 11) {
    errors.push(`Filter count is ${filterKeys.length}, must be 11`);
  }
  
  // Validate single vs multi-select
  if (Array.isArray(filters.lessonFormat)) {
    errors.push('lessonFormat must be string, not array');
  }
  
  return errors;
}
```

### Activity Type Detection
```typescript
export function deriveActivityType(skills: string[]): string {
  const hasGarden = skills.some(s => GARDEN_SKILLS.includes(s));
  const hasCooking = skills.some(s => COOKING_SKILLS.includes(s));
  
  if (hasGarden && hasCooking) return 'both';
  if (hasGarden) return 'garden';
  if (hasCooking) return 'cooking';
  return 'academic';
}
```

## 🔑 Environment Variables

```typescript
// Frontend variables MUST have VITE_ prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ❌ WRONG
const apiKey = import.meta.env.API_KEY; // Won't work!

// ✅ CORRECT  
const apiKey = import.meta.env.VITE_API_KEY;
```

## 📦 Export Pattern

Always re-export from barrel files:

```typescript
// utils/index.ts
export * from './filterHelpers';
export * from './facetHelpers';
export * from './debounce';
export * from './logger';
export { cn } from './cn';
```