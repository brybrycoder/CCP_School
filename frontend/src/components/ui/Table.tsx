import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  compact = false,
}: TableProps<T>) {
  const getCellValue = (row: T, key: string): any => {
    const keys = key.split('.');
    let value: any = row;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    const columnKey = String(column.key);
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary-600" />
    );
  };

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={`
                  ${cellPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                  ${column.headerClassName || ''}
                `}
                onClick={() => column.sortable && onSort?.(String(column.key))}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`${cellPadding} text-center text-gray-500`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`${cellPadding} text-center text-gray-500`}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row, rowIndex)}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => {
                  const value = getCellValue(row, String(column.key));
                  return (
                    <td
                      key={String(column.key)}
                      className={`${cellPadding} text-sm text-gray-900 ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(value, row, rowIndex)
                        : value ?? '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
