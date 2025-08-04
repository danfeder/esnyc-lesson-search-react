import React, { useState } from 'react';

/**
 * Test component to verify error boundaries are working correctly.
 * This component should only be used in development mode for testing.
 * Remove or disable in production.
 */
const ErrorBoundaryTestComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error: This is an intentional error for testing error boundaries!');
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">Error Boundary Test (Dev Only)</h3>
      <p className="text-sm text-yellow-700 mb-4">
        Click the button below to trigger an error and test the error boundary.
      </p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Trigger Test Error
      </button>
    </div>
  );
};

// Only export in development mode
export const ErrorBoundaryTest =
  import.meta.env.MODE === 'development' ? ErrorBoundaryTestComponent : () => null;
