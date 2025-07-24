// App version configuration
// Update this when releasing new versions

export const APP_VERSION = '2.0.0';

// Version history
export const VERSION_HISTORY = {
  '2.0.0': {
    date: '2025-01-24',
    changes: [
      'Replaced Algolia with PostgreSQL full-text search',
      'Added lesson submission and review system',
      'Implemented authentication for teachers and reviewers',
      'Added 11 comprehensive filter categories',
      'Integrated Google Docs API for lesson imports',
      'Added duplicate detection with similarity scoring',
    ],
  },
  '1.0.0': {
    date: '2024-01-01',
    changes: ['Initial release with Algolia search'],
  },
};
