/**
 * Loading fallback component for lazy-loaded routes.
 * Shows a centered spinner while page chunks are being loaded.
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"
          aria-hidden="true"
        />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
