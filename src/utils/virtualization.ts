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

// Viewport calculations
export const VIEWPORT = {
  MOBILE_BREAKPOINT: 640, // sm
  TABLET_BREAKPOINT: 768, // md
  DESKTOP_BREAKPOINT: 1024, // lg
  MAX_GRID_HEIGHT: 800,
  MIN_GRID_HEIGHT: 400,
};

/**
 * Calculate optimal height for virtualized container based on viewport
 */
export function calculateOptimalHeight(windowHeight: number, headerOffset: number = 200): number {
  const calculatedHeight = windowHeight - headerOffset;
  return Math.min(Math.max(calculatedHeight, VIEWPORT.MIN_GRID_HEIGHT), VIEWPORT.MAX_GRID_HEIGHT);
}

/**
 * Determine number of columns based on container width
 */
export function getColumnCount(width: number, isMobile?: boolean): number {
  if (isMobile === true || width < VIEWPORT.TABLET_BREAKPOINT) return 1;
  if (width < VIEWPORT.DESKTOP_BREAKPOINT) return 2;
  return 2; // Max 2 columns for lesson cards
}

/**
 * Calculate column width accounting for gaps
 */
export function calculateColumnWidth(
  containerWidth: number,
  columnCount: number,
  gap: number = DIMENSIONS.GRID_GAP
): number {
  if (columnCount === 1) return containerWidth;
  return (containerWidth - gap * (columnCount - 1)) / columnCount;
}

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

/**
 * Calculate overscan count based on device type
 * Overscan = number of items to render outside visible area for smoother scrolling
 */
export function getOverscanCount(isMobile: boolean): { row: number; column: number } {
  return {
    row: isMobile ? 1 : 2,
    column: isMobile ? 0 : 1,
  };
}

/**
 * Debounce function for resize events
 */
export function debounceResize(callback: () => void, delay: number = 150): () => void {
  let timeoutId: NodeJS.Timeout;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}
