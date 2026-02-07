import React, { useMemo, useCallback } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { DIMENSIONS } from '@/utils/virtualization';

export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;

  render: (item: T) => React.ReactNode;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];

  getRowKey?: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;

  onRowClick?: (item: T) => void;
}

// Loading skeleton row
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LoadingRow: React.FC<{ columns: Column<any>[] }> = ({ columns }) => (
  <tr className="animate-pulse">
    {columns.map((col) => (
      <td key={col.key} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </td>
    ))}
  </tr>
);

export function VirtualizedTable<T>({
  data,
  columns,
  getRowKey: _getRowKey, // Currently unused with window virtualization
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  headerClassName = '',
  rowClassName = '',
  onRowClick,
}: VirtualizedTableProps<T>) {
  // Calculate row count
  const rowCount = useMemo(() => {
    if (isLoading && data.length === 0) return 10; // Show 10 skeleton rows
    return data.length;
  }, [data.length, isLoading]);

  // Use window virtualizer for natural scrolling
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: useCallback(() => DIMENSIONS.TABLE_ROW_HEIGHT, []),
    overscan: 3, // Render 3 extra rows for smoother scrolling
    scrollMargin: 0,
  });

  // Handle loading state
  if (isLoading && data.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`bg-gray-50 ${headerClassName}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingRow key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Handle empty state
  if (!isLoading && data.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`bg-gray-50 ${headerClassName}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={`rounded-lg border border-gray-200 ${className}`}>
      {/* Table Header - Fixed at top */}
      <div className={`bg-gray-50 border-b border-gray-200 sticky top-0 z-10 ${headerClassName}`}>
        <div className="flex w-full" style={{ minHeight: DIMENSIONS.TABLE_HEADER_HEIGHT }}>
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{
                width: col.width || `${100 / columns.length}%`,
                flexShrink: col.width ? 0 : 1,
              }}
            >
              {col.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual container with total size */}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Render only visible rows */}
        {virtualItems.map((virtualRow) => {
          const isLoadingRow = isLoading && virtualRow.index >= data.length;
          const item = isLoadingRow ? null : data[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`flex items-center border-b border-gray-200 h-full bg-white hover:bg-gray-50 ${
                  onRowClick && !isLoadingRow ? 'cursor-pointer' : ''
                } ${rowClassName}`}
                onClick={() => item && onRowClick?.(item)}
                role="row"
                tabIndex={onRowClick && !isLoadingRow ? 0 : undefined}
                onKeyDown={(e) => {
                  if (item && onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {isLoadingRow ? (
                  <div className="w-full px-6 py-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ) : (
                  <div className="w-full flex">
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className={`px-6 py-4 ${col.className || ''}`}
                        style={{
                          width: col.width || `${100 / columns.length}%`,
                          flexShrink: col.width ? 0 : 1,
                        }}
                      >
                        {item && col.render(item)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading data...' : `Showing ${data.length} items`}
      </div>
    </div>
  );
}
