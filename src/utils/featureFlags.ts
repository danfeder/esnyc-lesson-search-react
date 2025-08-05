/**
 * Feature flags for toggling functionality
 *
 * All feature flags should:
 * 1. Start with VITE_ to be accessible in the frontend
 * 2. Have a clear default behavior (can be true or false)
 * 3. Be documented with their purpose
 */

export const FEATURES = {
  /**
   * Enable Google Docs iframe embedding in the review page
   * When true: Shows live Google Doc editor
   * When false: Shows extracted text preview
   * Default: true (enabled unless explicitly disabled)
   */
  GOOGLE_DOC_EMBED: import.meta.env.VITE_ENABLE_DOC_EMBED !== 'false',
} as const;

// Type for feature flag keys
export type FeatureFlagKey = keyof typeof FEATURES;

/**
 * Helper function to check if a feature is enabled
 * @param feature - The feature flag key to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlagKey): boolean {
  return FEATURES[feature] ?? false;
}

/**
 * Get all feature flags and their current states
 * Useful for debugging and admin panels
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return { ...FEATURES };
}
