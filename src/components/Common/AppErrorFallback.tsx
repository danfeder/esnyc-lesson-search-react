import React from 'react';
import { ErrorFallbackProps } from './ErrorBoundary';

export const AppErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Icon and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
            <p className="text-lg text-gray-600">
              The ESYNYC Lesson Library encountered an unexpected error.
            </p>
          </div>

          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              We apologize for the inconvenience. The error has been logged and our team will
              investigate. In the meantime, you can try refreshing the page or returning to the home
              page.
            </p>
          </div>

          {/* Development Error Details */}
          {import.meta.env.MODE === 'development' && error && (
            <div className="mb-6">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                  <svg
                    className="w-4 h-4 mr-2 transform transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Developer Information
                </summary>
                <div className="mt-4 space-y-3">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                    <p className="text-xs font-mono mb-2 text-red-400">Error Message:</p>
                    <p className="text-xs font-mono">{error.toString()}</p>
                  </div>
                  {error.stack && (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-48">
                      <p className="text-xs font-mono mb-2 text-red-400">Stack Trace:</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-48">
                      <p className="text-xs font-mono mb-2 text-red-400">Component Stack:</p>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => (window.location.href = '/')}
              className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={resetError}
              className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            If this problem persists, please contact support or try again later.
          </p>
        </div>
      </div>
    </div>
  );
};
