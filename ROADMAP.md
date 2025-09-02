# Development Roadmap

## Current Status (August 2025)

The ESYNYC Lesson Search v2 is largely feature-complete with a modern React/TypeScript/Supabase stack. The application successfully serves 831 lesson plans with advanced filtering and search capabilities.

## ✅ Completed Features

### Core Functionality
- **Search & Filtering**: PostgreSQL full-text search with 11 filter categories
- **Database**: PostgreSQL with full-text search and vector embeddings
- **Authentication**: Complete auth system with role-based access control
- **Admin Dashboard**: Full review workflow for lesson submissions
- **Duplicate Detection**: Multi-layer algorithm with hash and semantic similarity
- **Email Notifications**: Resend integration for user communications
- **User Management**: Invitation system and profile management
- **Responsive UI**: Mobile-friendly React interface with Tailwind CSS

### Data & Content
- **Lesson Import**: 829/831 lessons successfully imported with metadata
- **Content Embeddings**: OpenAI embeddings generated for semantic search
- **Search Synonyms**: Configured for ingredient grouping and cultural hierarchies
- **Google Docs Integration**: Partial implementation with fallback to mock data

### Infrastructure
- **Edge Functions**: 7 deployed functions for various backend tasks
- **CI/CD Pipeline**: GitHub Actions for testing and deployment
- **Test Framework**: Vitest with React Testing Library (100 tests, 70 passing)
- **Documentation**: Comprehensive docs including CLAUDE.md throughout

## 🚧 In Progress / Planned Features

### High Priority (Next Sprint)

#### 1. CSV Export Functionality
**Status**: TODO comment in code  
**Location**: `src/pages/SearchPage.tsx` line 155  
**Effort**: 2-3 hours  
**Implementation Plan**:
```typescript
// Add to SearchPage.tsx
const handleExport = async () => {
  // 1. Fetch all results (not paginated)
  // 2. Format as CSV with all metadata
  // 3. Include applied filters in filename
  // 4. Download using blob URL
};
```

#### 2. Complete Google Docs API Integration
**Status**: Implemented with fallback to mock  
**Location**: `supabase/functions/extract-google-doc/`  
**Effort**: 1-2 hours  
**Requirements**:
- Add `GOOGLE_SERVICE_ACCOUNT_JSON` to environment
- Test with real Google Docs
- Remove or reduce mock fallback usage

### Medium Priority (Q4 2025)

#### 3. Enhanced Analytics Dashboard
**Features**:
- Usage metrics and popular searches
- Filter combination analytics
- User engagement tracking
- Export usage reports

#### 4. Advanced Search Features
- Search history for logged-in users
- Saved search alerts
- Search suggestions based on history
- "More like this" functionality using embeddings

#### 5. Bulk Operations
- Bulk lesson updates for admins
- Batch CSV import improvements
- Bulk duplicate resolution

### Low Priority (2026)

#### 6. Mobile App
- React Native implementation
- Offline lesson viewing
- Push notifications for saved searches

#### 7. API Development
- Public API for lesson data
- Webhook support for integrations
- GraphQL endpoint

#### 8. Content Enhancements
- Lesson versioning system
- Collaborative editing
- Comment system for lessons
- Rating/review system

## 🔬 Technical Debt & Improvements

### Testing
- **Current Coverage**: ~30% (estimate)
- **Goal**: 80% coverage
- **Needs**:
  - More integration tests
  - E2E tests with Playwright
  - API endpoint testing
  - Edge function tests

### Performance
- Implement virtual scrolling for large result sets
- Add Redis caching layer
- Optimize bundle size (currently ~500KB)
- Lazy load heavy components

### Security
- Regular dependency updates
- Security audit of RLS policies
- Rate limiting on API endpoints
- OWASP compliance review

### Developer Experience
- Storybook for component development
- Better TypeScript types for Supabase
- Development seed data
- Local edge function testing

## 📊 Success Metrics

### Current Performance
- **Search Speed**: <200ms average
- **Page Load**: ~1.5s (target: <1s)
- **Database Size**: ~50MB
- **Monthly Active Users**: TBD
- **API Response Time**: <100ms p95

### Target Metrics (EOY 2025)
- **Test Coverage**: 80%
- **Lighthouse Score**: 95+
- **Search Accuracy**: 95%+ relevance
- **User Satisfaction**: 4.5+ rating

## 🗓️ Release Schedule

### v2.1.0 (September 2025)
- CSV export
- Complete Google Docs integration
- Test coverage to 50%

### v2.2.0 (November 2025)
- Analytics dashboard
- Advanced search features
- Performance optimizations

### v3.0.0 (Q1 2026)
- Public API
- Mobile app beta
- Collaborative features

## 📝 Implementation Priorities

1. **Must Have** (This Quarter):
   - CSV export
   - Google Docs API completion

2. **Should Have** (This Year):
   - Analytics dashboard
   - Test coverage improvement
   - Performance optimizations

3. **Nice to Have** (Future):
   - Mobile app
   - Public API
   - Advanced collaboration

## 🚀 Getting Started with New Features

### Adding a New Feature
1. Create feature branch from `main`
2. Update this ROADMAP with status
3. Add tests (aim for 80% coverage)
4. Update relevant CLAUDE.md files
5. Create PR with full description

### Feature Documentation Template
```markdown
#### [Feature Name]
**Status**: Not Started | In Progress | Complete  
**Priority**: High | Medium | Low  
**Effort**: X hours/days  
**Dependencies**: List any blockers  
**Implementation Notes**: Key considerations  
```

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

*Last Updated: August 2025*  
*Next Review: September 2025*
