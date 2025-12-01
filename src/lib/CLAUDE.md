# External Library Configuration

## 🔐 Supabase Client Setup

### Frontend Client (Anon Key)
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// VITE_ prefix REQUIRED for frontend env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Admin Client (Service Role - Scripts Only!)
```typescript
// NEVER use service role key in frontend!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

## ⚠️ Common Supabase Issues

### RLS Policy Violations
```typescript
// ❌ WRONG - Will fail with RLS error
const { data, error } = await supabase
  .from('user_profiles')
  .select('*');  // Can't read all profiles!

// ✅ CORRECT - Read own profile only
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id);
```

### Error Handling Pattern
```typescript
// ALWAYS handle errors
const { data, error } = await supabase
  .from('lessons')
  .select('*');

if (error) {
  logger.error('Supabase error:', error);
  
  // Check for specific errors
  if (error.code === 'PGRST116') {
    throw new Error('RLS policy violation');
  }
  
  throw error;
}

// Now safe to use data
return data;
```

### Auth State Management
```typescript
// Listen for auth changes
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        // Handle sign in
      } else if (event === 'SIGNED_OUT') {
        // Handle sign out
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

## 🔍 Legacy: Algolia (Removed)

Algolia was removed from this project. Search now uses PostgreSQL full-text search with synonym/typo expansion. See `supabase/functions/search-lessons/` for the current implementation.

## 📊 Sentry Error Tracking

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/react';

// Only initialize in production
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Error boundary wrapper
export const SentryErrorBoundary = Sentry.ErrorBoundary;
```

## 📡 React Query Configuration

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        logger.error('Mutation error:', error);
        // Could show toast notification here
      },
    },
  },
});
```

### Query Key Patterns
```typescript
// Consistent query key structure
const queryKeys = {
  lessons: ['lessons'] as const,
  lesson: (id: string) => ['lessons', id] as const,
  lessonsWithFilters: (filters: SearchFilters) => 
    ['lessons', { filters }] as const,
  user: (id: string) => ['users', id] as const,
};

// Usage
useQuery({
  queryKey: queryKeys.lesson(lessonId),
  queryFn: () => fetchLesson(lessonId),
});
```

## 🎨 Tailwind CSS Config

```typescript
// Already configured via @tailwindcss/vite
// Custom colors in tailwind.config.js:
{
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#2c5530', // ESYNYC green
        },
        accent: {
          500: '#ff6b35', // ESYNYC orange
        },
      },
    },
  },
}
```

## 🚨 Library-Specific Gotchas

### Supabase
- RLS policies block operations - always check permissions
- Use `.single()` for single row expectations
- Use `.maybeSingle()` if row might not exist
- Timestamps are strings, not Date objects

### React Query
- `cacheTime` renamed to `gcTime` in v5
- Mutations don't refetch by default
- Use `invalidateQueries` after mutations
- Query keys must be serializable

### Sentry
- Don't log sensitive data (passwords, tokens)
- Use `beforeSend` to filter events
- Set user context for better debugging
- Exclude expected errors (404s, validation)

## 🔧 Environment Variable Checklist

```bash
# Frontend (.env)
VITE_SUPABASE_URL=         # Required
VITE_SUPABASE_ANON_KEY=     # Required
VITE_SENTRY_DSN=            # Optional (monitoring)

# Backend/Scripts only (Supabase secrets)
SUPABASE_SERVICE_ROLE_KEY=  # Admin operations
OPENAI_API_KEY=              # Embeddings (working in production)
GOOGLE_SERVICE_ACCOUNT_JSON= # Google Docs API (working in production)
RESEND_API_KEY=              # Email sending
```

## 📦 Import Patterns

```typescript
// Named imports for tree-shaking
import { createClient } from '@supabase/supabase-js';
import { useQuery, useMutation } from '@tanstack/react-query';

// Lazy load heavy libraries
const Sentry = import.meta.env.PROD
  ? await import('@sentry/react')
  : null;
```
