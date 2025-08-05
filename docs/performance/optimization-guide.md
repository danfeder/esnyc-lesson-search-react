# Performance Optimization Guide

## Overview

This guide provides strategies and techniques for optimizing the ESYNYC Lesson Search platform's performance.

## Frontend Optimization

### 1. Bundle Size Optimization

#### Code Splitting
```typescript
// Route-based splitting
const routes = [
  {
    path: '/',
    element: <SearchPage />, // Always loaded
  },
  {
    path: '/admin/*',
    element: lazy(() => import('./pages/AdminDashboard')), // Lazy loaded
  },
  {
    path: '/submit',
    element: lazy(() => import('./pages/SubmissionPage')),
  },
];

// Component-based splitting
const HeavyComponent = lazy(() => 
  import(/* webpackChunkName: "heavy" */ './components/HeavyComponent')
);

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

#### Tree Shaking
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
  },
});

// Use named imports for better tree shaking
import { debounce } from 'lodash-es'; // ✅ Good
import _ from 'lodash'; // ❌ Bad - imports entire library
```

#### Dynamic Imports
```typescript
// Load heavy libraries only when needed
const loadPdfLibrary = async () => {
  const { PDFDocument } = await import('pdf-lib');
  return PDFDocument;
};

// Load polyfills conditionally
if (!window.IntersectionObserver) {
  await import('intersection-observer');
}
```

### 2. Rendering Optimization

#### Virtual Scrolling
```typescript
// Use react-window for large lists
import { FixedSizeList } from 'react-window';

const LessonList = ({ lessons }: { lessons: Lesson[] }) => (
  <FixedSizeList
    height={600}
    itemCount={lessons.length}
    itemSize={120}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <LessonCard lesson={lessons[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

#### React Optimization
```typescript
// Memoize expensive computations
const FilteredLessons = ({ lessons, filters }) => {
  const filteredLessons = useMemo(
    () => applyFilters(lessons, filters),
    [lessons, filters]
  );
  
  return <LessonGrid lessons={filteredLessons} />;
};

// Prevent unnecessary re-renders
const LessonCard = memo(({ lesson }: { lesson: Lesson }) => {
  return <div>{/* Card content */}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.lesson.id === nextProps.lesson.id &&
         prevProps.lesson.modified === nextProps.lesson.modified;
});

// Use useCallback for stable references
const SearchBar = () => {
  const handleSearch = useCallback((query: string) => {
    // Search logic
  }, []); // Dependencies
  
  return <input onChange={e => handleSearch(e.target.value)} />;
};
```

#### Debouncing & Throttling
```typescript
// Debounce search input
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Throttle scroll events
const useThrottle = (callback: Function, delay: number) => {
  const lastCall = useRef(0);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};
```

### 3. Image Optimization

#### Lazy Loading
```tsx
// Native lazy loading
<img
  src="image.jpg"
  loading="lazy"
  alt="Description"
/>

// Intersection Observer for custom lazy loading
const LazyImage = ({ src, alt, placeholder }) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return <img ref={imgRef} src={imageSrc} alt={alt} />;
};
```

#### Responsive Images
```html
<!-- Use srcset for different screen sizes -->
<img
  srcset="image-320w.jpg 320w,
          image-640w.jpg 640w,
          image-1280w.jpg 1280w"
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 600px,
         1200px"
  src="image-1280w.jpg"
  alt="Description"
/>

<!-- Use WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description">
</picture>
```

## Backend Optimization

### 1. Database Query Optimization

#### Query Analysis
```sql
-- Explain query plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM lessons 
WHERE grade_levels && ARRAY['3', '4']
AND search_vector @@ plainto_tsquery('garden');

-- Find slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

#### Index Optimization
```sql
-- Create appropriate indexes
CREATE INDEX CONCURRENTLY idx_lessons_grade_levels 
ON lessons USING GIN (grade_levels);

CREATE INDEX CONCURRENTLY idx_lessons_search_vector 
ON lessons USING GIN (search_vector);

CREATE INDEX CONCURRENTLY idx_lessons_created_at 
ON lessons (created_at DESC);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_active_submissions 
ON lesson_submissions (user_id, created_at) 
WHERE status = 'active';

-- Composite indexes for multi-column queries
CREATE INDEX CONCURRENTLY idx_user_school_role 
ON user_profiles (school_id, role) 
WHERE status = 'active';
```

#### Query Optimization Techniques
```sql
-- Use EXISTS instead of IN for better performance
-- Bad
SELECT * FROM lessons 
WHERE user_id IN (SELECT user_id FROM active_users);

-- Good
SELECT * FROM lessons l
WHERE EXISTS (
  SELECT 1 FROM active_users a 
  WHERE a.user_id = l.user_id
);

-- Use LIMIT for pagination
SELECT * FROM lessons
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;

-- Use prepared statements
PREPARE get_lesson_by_id AS
SELECT * FROM lessons WHERE id = $1;

EXECUTE get_lesson_by_id('lesson-uuid');
```

### 2. Caching Strategy

#### Application-Level Caching
```typescript
// In-memory cache with TTL
class Cache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  
  set(key: string, data: T, ttl: number = 3600000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
}

const lessonCache = new Cache<Lesson>();

// Use cache in API
export async function getLesson(id: string): Promise<Lesson> {
  // Check cache first
  const cached = lessonCache.get(id);
  if (cached) return cached;
  
  // Fetch from database
  const lesson = await fetchLessonFromDB(id);
  
  // Cache for 1 hour
  lessonCache.set(id, lesson, 3600000);
  
  return lesson;
}
```

#### Redis Caching (Future)
```typescript
// Redis setup
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

// Cache search results
export async function cachedSearch(filters: SearchFilters): Promise<Lesson[]> {
  const cacheKey = `search:${JSON.stringify(filters)}`;
  
  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Perform search
  const results = await performSearch(filters);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(results));
  
  return results;
}
```

### 3. API Optimization

#### Response Compression
```typescript
// Enable compression in Express
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    // Don't compress responses under 1KB
    return res.getHeader('Content-Length') > 1024;
  },
  level: 6, // Compression level (0-9)
}));
```

#### Pagination
```typescript
// Cursor-based pagination for better performance
export async function getLessons(cursor?: string, limit = 20) {
  const query = supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (cursor) {
    query.lt('created_at', cursor);
  }
  
  const { data, error } = await query;
  
  return {
    lessons: data,
    nextCursor: data?.[data.length - 1]?.created_at,
    hasMore: data?.length === limit,
  };
}
```

#### Field Selection
```typescript
// Only select needed fields
const { data } = await supabase
  .from('lessons')
  .select('id, title, summary, grade_levels') // Not SELECT *
  .limit(20);

// GraphQL-style field selection (future)
const query = `
  query GetLessons($limit: Int!) {
    lessons(limit: $limit) {
      id
      title
      summary
      gradeLevels
    }
  }
`;
```

## Network Optimization

### 1. HTTP/2 and HTTP/3

```nginx
# Nginx configuration for HTTP/2
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  # HTTP/2 push
  http2_push_preload on;
  add_header Link "</assets/style.css>; rel=preload; as=style";
}
```

### 2. Resource Hints

```html
<!-- DNS Prefetch for external domains -->
<link rel="dns-prefetch" href="https://api.algolia.com">
<link rel="dns-prefetch" href="https://fonts.googleapis.com">

<!-- Preconnect for critical resources -->
<link rel="preconnect" href="https://your-supabase-url.supabase.co">

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/main.css" as="style">

<!-- Prefetch next page resources -->
<link rel="prefetch" href="/api/lessons?page=2">
```

### 3. Service Worker (PWA)

```javascript
// sw.js - Service worker for offline support
const CACHE_NAME = 'esynyc-v1';
const urlsToCache = [
  '/',
  '/assets/main.css',
  '/assets/main.js',
  '/offline.html',
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event with cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});
```

## Monitoring & Profiling

### 1. Performance Monitoring

```typescript
// Custom performance monitoring
class PerformanceMonitor {
  private marks = new Map<string, number>();
  
  start(label: string) {
    this.marks.set(label, performance.now());
  }
  
  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.marks.delete(label);
    
    // Send to analytics
    this.report(label, duration);
    
    return duration;
  }
  
  private report(label: string, duration: number) {
    // Send to monitoring service
    if (window.gtag) {
      gtag('event', 'timing_complete', {
        name: label,
        value: Math.round(duration),
      });
    }
  }
}

const perfMonitor = new PerformanceMonitor();

// Usage
perfMonitor.start('search');
const results = await searchLessons(query);
const duration = perfMonitor.end('search');
console.log(`Search took ${duration}ms`);
```

### 2. React DevTools Profiler

```typescript
// Wrap components in Profiler for development
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  interactions: Set<any>
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="SearchResults" onRender={onRenderCallback}>
  <SearchResults />
</Profiler>
```

## Performance Checklist

### Before Deployment
- [ ] Bundle size under budget
- [ ] All images optimized
- [ ] Lazy loading implemented
- [ ] API responses < 200ms
- [ ] Database queries optimized
- [ ] Caching configured
- [ ] CDN configured
- [ ] Compression enabled

### After Deployment
- [ ] Monitor Core Web Vitals
- [ ] Check error rates
- [ ] Verify cache hit rates
- [ ] Review slow queries
- [ ] Analyze user feedback
- [ ] Compare with benchmarks

---

*Continuous performance optimization ensures a fast and responsive user experience.*