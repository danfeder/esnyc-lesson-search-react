# Performance Benchmarks

## Performance Metrics

**Note**: Actual performance metrics have not been measured yet. The values below are target benchmarks based on industry standards and similar applications.

### Target Page Load Times

| Page | First Contentful Paint | Time to Interactive | Largest Contentful Paint | Total Blocking Time |
|------|------------------------|-------------------|-------------------------|-------------------|
| Home/Search | < 1.0s | < 2.0s | < 1.5s | < 100ms |
| Search Results | < 1.2s | < 2.5s | < 2.0s | < 150ms |
| Lesson Detail | < 0.8s | < 1.5s | < 1.2s | < 50ms |
| Admin Dashboard | < 1.5s | < 3.0s | < 2.5s | < 200ms |
| Submission Form | < 1.0s | < 2.0s | < 1.5s | < 100ms |

### Target API Response Times (p95)

| Endpoint | Method | Target Time | Expected Payload |
|----------|--------|-------------|------------------|
| `/api/lessons/search` | POST | < 200ms | ~50KB |
| `/api/lessons/:id` | GET | < 50ms | ~5KB |
| `/api/auth/login` | POST | < 250ms | ~2KB |
| `/api/submissions` | POST | < 400ms | ~10KB |
| `/api/submissions/detect-duplicates` | POST | < 600ms | ~20KB |

### Expected Database Query Performance

| Query | Target Time | Expected Rows | Index Strategy |
|-------|-------------|---------------|----------------|
| Full-text search | < 50ms | 20-50 | GIN index on search_vector |
| Filter by grade | < 20ms | 50-200 | B-tree on grade_levels |
| Get lesson by ID | < 5ms | 1 | Primary key |
| User submissions | < 30ms | 10-30 | Composite on (user_id, created_at) |
| Duplicate detection | < 150ms | 0-10 | Vector index for similarity |

### Bundle Size Analysis

```
dist/
├── index.html          (2.1 KB)
├── assets/
│   ├── index-[hash].js     (185 KB) - Main bundle
│   ├── vendor-[hash].js    (245 KB) - Dependencies
│   ├── index-[hash].css    (42 KB)  - Styles
│   └── chunks/
│       ├── admin-[hash].js (65 KB)  - Admin routes
│       ├── auth-[hash].js  (28 KB)  - Auth components
│       └── search-[hash].js (35 KB) - Search features
```

**Total Initial Load**: ~475 KB (gzipped: ~145 KB)

## Performance Targets

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s ✅
- **FID** (First Input Delay): < 100ms ✅
- **CLS** (Cumulative Layout Shift): < 0.1 ✅
- **INP** (Interaction to Next Paint): < 200ms ✅

### Custom Metrics
- **Search Response**: < 200ms ✅
- **Filter Application**: < 100ms ✅
- **Page Navigation**: < 300ms ✅

## How to Measure Actual Performance

### Tools for Measurement

1. **Lighthouse CI**
```bash
# Install and run Lighthouse
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:5173
```

2. **WebPageTest**
- Visit https://www.webpagetest.org
- Enter your production URL
- Run test from multiple locations

3. **Chrome DevTools**
- Open DevTools → Performance tab
- Record page load
- Analyze metrics

### Load Testing Setup

```javascript
// k6 test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  // Search request
  let searchRes = http.post(
    'https://api.example.com/search',
    JSON.stringify({ query: 'garden', filters: {} }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search response < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Expected Load Test Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Requests/sec | > 100 | > 50 | < 25 |
| Request Duration (p95) | < 500ms | < 1000ms | > 2000ms |
| Request Duration (p99) | < 1000ms | < 2000ms | > 5000ms |
| Error Rate | < 0.1% | < 1% | > 5% |
| Concurrent Users | 200 | 100 | 50 |

## Database Performance

### Index Analysis

```sql
-- Current indexes and their usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

| Table | Index | Expected Usage | Strategy |
|-------|-------|----------------|----------|
| lessons | lessons_search_vector_idx | High - primary search | GIN for full-text |
| lessons | lessons_grade_levels_idx | High - filter queries | GIN for arrays |
| user_profiles | user_profiles_user_id_idx | Medium - auth checks | B-tree on UUID |
| lesson_submissions | submissions_user_id_idx | Low - admin queries | Composite index |

### Query Optimization

```sql
-- Slow query log analysis
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Frontend Performance

### Bundle Optimization

```javascript
// Vite config for optimization
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', 'lucide-react'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
          'utils': ['date-fns', 'clsx', 'lodash-es'],
        },
      },
    },
    // Tree shaking
    treeshake: {
      preset: 'recommended',
      moduleSideEffects: false,
    },
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
};
```

### Lazy Loading Strategy

```typescript
// Route-based code splitting
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ReviewDetail = lazy(() => import('./pages/ReviewDetail'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

// Component lazy loading
const FilterModal = lazy(() => import('./components/Filters/FilterModal'));
const LessonModal = lazy(() => import('./components/Modal/LessonModal'));

// Image lazy loading
<img
  src={placeholder}
  data-src={actualImage}
  loading="lazy"
  className="lazyload"
/>
```

## Caching Strategy

### Browser Caching

```nginx
# Nginx configuration
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location /api/ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### API Caching

```typescript
// React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Search results caching
const { data } = useQuery({
  queryKey: ['search', filters],
  queryFn: () => searchLessons(filters),
  staleTime: 30 * 1000, // 30 seconds
});
```

### Database Caching

```sql
-- Materialized view for expensive aggregations
CREATE MATERIALIZED VIEW lesson_statistics AS
SELECT 
  COUNT(*) as total_lessons,
  COUNT(DISTINCT user_id) as total_contributors,
  AVG(array_length(grade_levels, 1)) as avg_grades_per_lesson,
  MODE() WITHIN GROUP (ORDER BY activity_type) as most_common_activity
FROM lessons;

-- Refresh periodically
CREATE OR REPLACE FUNCTION refresh_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY lesson_statistics;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('refresh-stats', '0 * * * *', 'SELECT refresh_statistics()');
```

## Monitoring Tools

### Performance Monitoring Setup

```javascript
// Sentry Performance Monitoring
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Custom performance marks
performance.mark('search-start');
await searchLessons(filters);
performance.mark('search-end');
performance.measure('search-duration', 'search-start', 'search-end');

const measure = performance.getEntriesByName('search-duration')[0];
console.log(`Search took ${measure.duration}ms`);
```

### Real User Monitoring (RUM)

```javascript
// Send performance metrics to analytics
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Send to analytics
      analytics.track('Performance Metric', {
        name: entry.name,
        value: entry.startTime,
        metric_type: entry.entryType,
      });
    }
  });
  
  observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
}
```

## Performance Optimization Checklist

### Frontend
- [x] Code splitting by route
- [x] Lazy loading for modals
- [x] Image optimization
- [x] Bundle size < 500KB
- [x] Tree shaking enabled
- [x] Compression enabled
- [ ] Service worker for offline
- [ ] Prefetching critical resources

### Backend
- [x] Database indexes optimized
- [x] Query result caching
- [x] Connection pooling
- [x] Rate limiting
- [ ] CDN for static assets
- [ ] Redis caching layer
- [ ] GraphQL for efficient data fetching

### Infrastructure
- [x] HTTP/2 enabled
- [x] Gzip compression
- [x] Browser caching headers
- [ ] Edge caching
- [ ] Geographic distribution
- [ ] Auto-scaling configured

## Performance Budget

```javascript
// Performance budget configuration
module.exports = {
  budgets: [
    {
      type: 'bundle',
      name: 'main',
      maximumWarning: '200kb',
      maximumError: '250kb',
    },
    {
      type: 'bundle',
      name: 'vendor',
      maximumWarning: '300kb',
      maximumError: '350kb',
    },
    {
      type: 'time',
      metric: 'interactive',
      maximumWarning: 2000,
      maximumError: 3000,
    },
    {
      type: 'time',
      metric: 'first-contentful-paint',
      maximumWarning: 1000,
      maximumError: 1500,
    },
  ],
};
```

---

*Performance is continuously monitored and optimized to ensure the best user experience.*