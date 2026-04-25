import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type IntDataTableDensity = 'default' | 'compact' | 'ultra';
export type IntDataTableAlign = 'left' | 'right' | 'center';

export interface IntDataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: IntDataTableAlign;
  width?: string;
  numeric?: boolean;
  muted?: boolean;
}

export interface IntDataTableProps<T> {
  columns: IntDataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (next: string[]) => void;
  density?: IntDataTableDensity;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode;
  ariaLabel?: string;
  getSelectRowLabel?: (row: T) => string;
}

export function IntDataTable<T>({
  columns,
  rows,
  getRowKey,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  density = 'default',
  onRowClick,
  emptyMessage = 'No results.',
  ariaLabel,
  getSelectRowLabel,
}: IntDataTableProps<T>) {
  const allKeys = rows.map(getRowKey);
  const selectedSet = new Set(selectedKeys);
  const visibleKeySet = new Set(allKeys);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedSet.has(k));
  const someSelected = !allSelected && allKeys.some((k) => selectedSet.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedKeys.filter((k) => !visibleKeySet.has(k)));
    } else {
      const merged = new Set(selectedKeys);
      allKeys.forEach((k) => merged.add(k));
      onSelectionChange(Array.from(merged));
    }
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedSet.has(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]
    );
  };

  return (
    <div data-density={density} className="adm-table-wrap">
      <table className="adm-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(col.numeric && 'num')}
                style={{
                  width: col.width,
                  textAlign: col.align,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="muted"
                style={{ textAlign: 'center', padding: '24px 16px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              const isSelected = selectedSet.has(key);
              return (
                <tr
                  key={key}
                  className={cn(isSelected && 'selected', onRowClick && 'clickable')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={
                          getSelectRowLabel ? getSelectRowLabel(row) : `Select row ${key}`
                        }
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(col.numeric && 'num', col.muted && 'muted')}
                      style={{ textAlign: col.align }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
