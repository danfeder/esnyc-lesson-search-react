// Search feature flag and helpers for routing to v1/v2 RPCs

export const isSearchV2Enabled = (import.meta as any)?.env?.VITE_ENABLE_SEARCH_V2 === 'true';

export function getSearchRpcName(): 'search_lessons' | 'search_lessons_v2' {
  return isSearchV2Enabled ? 'search_lessons_v2' : 'search_lessons';
}

