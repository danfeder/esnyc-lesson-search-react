# Manual Fixes Needed for ESNYC Lesson Search v2

Due to auto-formatting/linting issues, please apply these fixes manually:

## 1. Fix Icon Imports

Since you're using lucide-react, we need to replace @heroicons/react imports with lucide-react equivalents:

### Header.tsx
```typescript
// Replace:
import { MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';

// With:
import { Search, User } from 'lucide-react';
```

Also update the JSX:
- `<MagnifyingGlassIcon className="w-6 h-6" />` → `<Search className="w-6 h-6" />`
- `<UserIcon className="w-6 h-6" />` → `<User className="w-6 h-6" />`

### SearchBar.tsx
```typescript
// Replace:
import { MagnifyingGlassIcon, XMarkIcon, LightBulbIcon } from '@heroicons/react/24/outline';

// With:
import { Search, X, Lightbulb } from 'lucide-react';
```

Update JSX:
- `<MagnifyingGlassIcon className="absolute left-6 w-6 h-6 text-gray-400" />` → `<Search className="absolute left-6 w-6 h-6 text-gray-400" />`
- `<XMarkIcon className="w-5 h-5" />` → `<X className="w-5 h-5" />`
- `<LightBulbIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />` → `<Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />`

## 2. Fix Type Inconsistencies

In `src/types/index.ts`, update the `LessonMetadata` interface to match component usage:

```typescript
export interface LessonMetadata {
  thematicCategory?: string[];  // Changed from thematicCategories
  season?: string[];             // Changed from seasonTiming
  coreCompetencies?: string[];
  culturalHeritage?: string[];
  location?: string[];           // Changed from locationRequirements
  activityType?: string[];
  lessonFormat?: string[];
  ingredients?: string[];        // Changed from mainIngredients
  skills?: string[];
  equipment?: string[];
  duration?: string;
  groupSize?: string;
  gradeLevel?: string[];
  gardenSkills?: string[];
  cookingSkills?: string[];
  cookingMethods?: string[];
}
```

## 3. Add Missing CSS Classes

Add to `src/index.css` after the `.lesson-card:hover::before` rule:

```css
.lesson-tag {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
}

.lesson-tag-season {
  @apply bg-amber-100 text-amber-800;
}

.lesson-tag-theme {
  @apply bg-emerald-100 text-emerald-800;
}

.lesson-tag-culture {
  @apply bg-purple-100 text-purple-800;
}
```

## 4. Update package.json Scripts

Replace the scripts section with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext ts,tsx",
  "format": "prettier --write src"
}
```

## 5. Install Dependencies

Run these commands:

```bash
# Install missing dependencies
npm install lucide-react react-router-dom @headlessui/react

# Install dev dependencies  
npm install -D tailwindcss autoprefixer postcss eslint prettier @types/node

# Remove @heroicons/react if no longer needed
npm uninstall @heroicons/react
```

## 7. Add Missing Environment Variables

Create a `.env` file (not just .env.example) with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps

1. Apply these manual fixes
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Fix any remaining TypeScript errors
5. Set up Supabase project and add credentials