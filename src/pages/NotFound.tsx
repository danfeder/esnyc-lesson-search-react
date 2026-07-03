import React from 'react';
import { Link } from 'react-router-dom';

/**
 * FP-12: real 404 for unknown routes — including stale bookmarks to admin pages
 * that were removed. Friendly, plain-language copy with a clear way back to
 * search (never a blank screen or a raw router error). Rendered by the catch-all
 * `path="*"` route in App.tsx.
 */
export const NotFound: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 text-center">
          <p className="text-5xl font-bold text-primary-600 mb-2">404</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Page not found</h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find that page. The link may be out of date, or the page may have
            moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Back to search
          </Link>
        </div>
      </div>
    </div>
  );
};
