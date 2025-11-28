# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive cleanup plan documentation
- Archive directory for legacy files

### Removed
- Unnecessary backup files
- System files (.DS_Store)
- Empty directories

## [2.0.0] - 2024-08-05

### Added
- Complete React/TypeScript rewrite
- Supabase backend integration
- PostgreSQL database with full-text search
- User authentication and role-based access
- Admin dashboard for content management
- Review workflow for lesson submissions
- Duplicate detection system
- Email notifications
- User profiles and saved searches
- Real-time filtering with Zustand state management
- Responsive mobile design
- Accessibility improvements

### Changed
- Migrated from vanilla JavaScript to React 19 + TypeScript
- Replaced static JSON data with PostgreSQL database
- Upgraded from client-side filtering to server-side search
- Modernized UI with Tailwind CSS
- Improved search with Algolia integration

### Security
- Row Level Security (RLS) policies on all tables
- Secure authentication with Supabase Auth
- Protected admin routes

## [1.0.0] - 2023-07-01

### Added
- Initial release with vanilla JavaScript
- Static JSON data file with 831 lessons
- Client-side search and filtering
- Multiple filter categories (see filterDefinitions.ts)
- CSV export functionality
- Responsive design
- Lesson detail modals

[Unreleased]: https://github.com/danfeder/esnyc-lesson-search-react/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/danfeder/esnyc-lesson-search-react/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/danfeder/esnyc-lesson-search-react/releases/tag/v1.0.0