import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorFallbackProps } from './ErrorBoundary';

export const RouteErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-xl font-semibold text-gray-900">Page Error</h2>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            This page encountered an error and cannot be displayed properly. You can try refreshing
            or navigate to a different page.
          </p>

          {import.meta.env.MODE === 'development' && error && (
            <div className="mb-6 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm font-mono text-red-600">{error.message || error.toString()}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={resetError}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
