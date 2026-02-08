/**
 * Utility functions and constants for list virtualization
 */

// Performance thresholds for when to use virtualization
export const VIRTUALIZATION_THRESHOLDS = {
  MIN_ITEMS_FOR_GRID: 20, // Use virtualization for grids with 20+ items
  MIN_ITEMS_FOR_LIST: 50, // Use virtualization for lists with 50+ items
  MIN_ITEMS_FOR_TABLE: 30, // Use virtualization for tables with 30+ items
};

// Common dimensions
export const DIMENSIONS = {
  LESSON_CARD_HEIGHT: 280, // Height matches LessonCard component (280px)
  TABLE_ROW_HEIGHT: 64,
  LIST_ITEM_HEIGHT: 72,
  GRID_GAP: 24,
  TABLE_HEADER_HEIGHT: 56,
};

/**
 * Determine if virtualization should be used based on item count
 */
export function shouldVirtualize(
  itemCount: number,
  type: 'grid' | 'list' | 'table' = 'grid'
): boolean {
  switch (type) {
    case 'grid':
      return itemCount >= VIRTUALIZATION_THRESHOLDS.MIN_ITEMS_FOR_GRID;
    case 'list':
      return itemCount >= VIRTUALIZATION_THRESHOLDS.MIN_ITEMS_FOR_LIST;
    case 'table':
      return itemCount >= VIRTUALIZATION_THRESHOLDS.MIN_ITEMS_FOR_TABLE;
    default:
      return itemCount >= VIRTUALIZATION_THRESHOLDS.MIN_ITEMS_FOR_GRID;
  }
}

// debounceResize removed — use debounce from '@/utils/debounce' instead
