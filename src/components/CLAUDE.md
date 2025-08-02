# Component Development Guidelines

This directory contains all React components. When working here, follow these patterns:

## Component Creation Checklist
- Define TypeScript interface for props
- Use functional components with hooks
- Export named functions (not default)
- Place in appropriate feature folder
- Add loading and error states

## Quick Patterns

### New Filter Component
```typescript
interface [Name]FilterProps {
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  className?: string;
}
```

### Using Zustand Store
```typescript
const { filters, setFilter } = useFilterStore();
```

### Headless UI Pattern
```typescript
import { Listbox, Disclosure, Switch } from '@headlessui/react';
```

## Common Imports
- `@/types` - Type definitions
- `@/utils/cn` - Class name utility
- `@/stores/*` - Zustand stores
- `lucide-react` - Icons

## Testing Components
- Test file: `ComponentName.test.tsx`
- Use React Testing Library
- Test user interactions, not implementation

## Component-Specific Notes
- **Filters**: Exactly 11 categories, no more, no less
- **Modals**: Use focus-trap-react for accessibility
- **Lists**: Implement virtualization for 50+ items