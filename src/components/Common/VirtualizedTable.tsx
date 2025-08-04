import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { DIMENSIONS, calculateOptimalHeight, debounceResize } from '../../utils/virtualization';

export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  // eslint-disable-next-line no-unused-vars
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  // eslint-disable-next-line no-unused-vars
  getRowKey: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  // eslint-disable-next-line no-unused-vars
  onRowClick?: (item: T) => void;
  maxHeight?: number;
}

// Loading skeleton row
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
  getRowKey,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  headerClassName = '',
  rowClassName = '',
  onRowClick,
  maxHeight = 600,
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = debounceResize(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const calculatedHeight = calculateOptimalHeight(window.innerHeight, 300);
        setDimensions({
          width: rect.width,
          height: Math.min(calculatedHeight, maxHeight),
        });
      }
    });

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [maxHeight]);

  // Row renderer
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      if (isLoading || index >= data.length) {
        return (
          <div style={style} className="flex items-center border-b border-gray-200">
            <div className="w-full px-6 py-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        );
      }

      const item = data[index];
      const key = getRowKey(item, index);

      return (
        <div
          key={key}
          style={style}
          className={`flex items-center border-b border-gray-200 hover:bg-gray-50 ${
            onRowClick ? 'cursor-pointer' : ''
          } ${rowClassName}`}
          onClick={() => onRowClick?.(item)}
          role="row"
          tabIndex={onRowClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRowClick(item);
            }
          }}
        >
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
                {col.render(item)}
              </div>
            ))}
          </div>
        </div>
      );
    },
    [data, columns, getRowKey, isLoading, onRowClick, rowClassName]
  );

  // Get row height
  const getItemSize = useCallback(() => DIMENSIONS.TABLE_ROW_HEIGHT, []);

  // Handle loading state
  if (isLoading && data.length === 0) {
    return (
      <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
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
      <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
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

  // Calculate item count
  const itemCount = isLoading ? Math.max(data.length, 10) : data.length;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}
    >
      {/* Table Header */}
      <div
        className={`bg-gray-50 border-b border-gray-200 ${headerClassName}`}
        style={{ height: DIMENSIONS.TABLE_HEADER_HEIGHT }}
      >
        <div className="flex w-full h-full items-center">
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

      {/* Virtualized Table Body */}
      {dimensions.width > 0 && (
        <List
          ref={listRef}
          height={dimensions.height - DIMENSIONS.TABLE_HEADER_HEIGHT}
          itemCount={itemCount}
          itemSize={getItemSize}
          width={dimensions.width}
          className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
          overscanCount={3}
        >
          {Row}
        </List>
      )}

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading data...' : `Showing ${data.length} items`}
      </div>
    </div>
  );
}
