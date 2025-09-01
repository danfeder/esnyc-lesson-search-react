// Search feature flag and helpers for routing to v1/v2 RPCs

export const isSearchV2Enabled = (import.meta as any)?.env?.VITE_ENABLE_SEARCH_V2 === 'true';

// For now, always use v1 RPC to satisfy current DB typings and CI.
// When `search_lessons_v2` is implemented and types are regenerated,
// we can re-enable flag-based switching here.
export function getSearchRpcName(): 'search_lessons' {
  return 'search_lessons';
}
