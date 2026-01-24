/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState, useMemo } from 'react';
import { splitCamelCaseToWords } from '../../utils/Helperfunctions';


type TableProps<T> = {
  rows: T[];
  visibleColumns?: string[];
  customRenderers?: { [key: string]: (row: T) => React.ReactNode };
  customHeaderRenderers?: { [key: string]: () => React.ReactNode };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  columnWidths?: { [key: string]: string };
};

function Table<T extends { [key: string]: any }>({
  rows,
  visibleColumns,
  customRenderers,
  customHeaderRenderers,
  onSort,
  sortConfig: externalSortConfig,
  columnWidths
}: TableProps<T>) {
  const [filters] = useState<{ [key: string]: string }>({});
  const [internalSortConfig, setInternalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Use external sort config if provided, otherwise fallback to internal (for compatibility)
  const sortConfig = externalSortConfig !== undefined ? externalSortConfig : internalSortConfig;

  const allKeys = rows?.length ? Object.keys(rows[0]) : [];
  const keys = visibleColumns || allKeys;

  const filteredRows = rows.filter(row => {
    return keys.every(key => {
      const filterValue = filters[key];
      if (!filterValue) return true;
      const cellValue = row[key]?.toString().toLowerCase();
      return cellValue.includes(filterValue.toLowerCase());
    });
  });

  const sortedRows = useMemo(() => {
    // If onSort is provided, we assume the parent handles sorting (server-side)
    if (onSort || !sortConfig) return filteredRows;

    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredRows, sortConfig, onSort]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    if (onSort) {
      onSort(key, direction);
    } else {
      setInternalSortConfig({ key, direction });
    }
  };

  // const handleFilterChange = (key: string, value: string) => {
  //   setFilters(prev => ({ ...prev, [key]: value }));
  // };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full min-w-[1000px] table-fixed bg-white">
        <colgroup>
          {keys.map(key => (
            <col key={key} style={{ width: columnWidths?.[key] || (key === 'selection' ? '48px' : 'auto') }} />
          ))}
        </colgroup>
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {keys.map(key => {
              const isSelection = key === 'selection';
              return (
                <th
                  key={key}
                  className={`py-4 px-3 transition-colors truncate align-middle ${isSelection ? 'text-center' : 'text-left'} group overflow-hidden ${!isSelection ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                  onClick={() => !isSelection && requestSort(key)}
                  title={!isSelection ? splitCamelCaseToWords(key) : undefined}
                >
                  <div className={`flex items-center ${isSelection ? 'justify-center' : 'gap-2'} text-[13px] font-regular text-gray-800  tracking-widest font-heading`}>
                    <span className={!isSelection ? 'truncate' : ''}>
                      {customHeaderRenderers && customHeaderRenderers[key]
                        ? customHeaderRenderers[key]()
                        : splitCamelCaseToWords(key)}
                    </span>
                    {!isSelection && (!customHeaderRenderers || !customHeaderRenderers[key]) && (
                      <span className="opacity-50 group-hover:opacity-100 transition-opacity text-gray-600 ">
                        ↑↓
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors last:border-b-0">
              {keys.map(key => (
                <td
                  key={key}
                  className="px-3 py-4 align-middle truncate text-sm text-gray-700 max-w-0"
                  title={!customRenderers?.[key] ? String(row[key] || "") : undefined}
                >
                  {customRenderers && customRenderers[key]
                    ? customRenderers[key](row)
                    : typeof row[key] === 'boolean' ? (row[key] ? 'Yes' : 'No') : row[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

  );
}

export default Table;
