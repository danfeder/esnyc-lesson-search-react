/**
 * Helper functions for working with generic facet maps
 */

/**
 * Get the count for a specific facet value
 * @param facets - The facets object from a search result
 * @param facetName - The name of the facet (e.g., 'metadata.thematicCategories')
 * @param value - The specific value to get count for
 * @returns The count for the facet value, or 0 if not found
 */
export const getFacetCount = (
  facets: Record<string, Record<string, number>>,
  facetName: string,
  value: string
): number => {
  return facets[facetName]?.[value] || 0;
};

/**
 * Get total count across all values for a facet
 * @param facets - The facets object from a search result
 * @param facetName - The name of the facet
 * @returns Total count across all values
 */
export const getTotalFacetCount = (
  facets: Record<string, Record<string, number>>,
  facetName: string
): number => {
  const facetValues = facets[facetName];
  if (!facetValues) return 0;

  return Object.values(facetValues).reduce((sum, count) => sum + count, 0);
};
