/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.2
 * @since 2026-01-13
 */

import { useState, useEffect, useRef, useMemo } from 'react';

interface CheckboxOption {
  label: string;
  value: string;
  title?: string;
}

interface DropdownProps {
  options: CheckboxOption[];
  name: string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

function DropdownWithCheckboxes({ options, name, selectedValues, onChange, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(500);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleCheckboxChange = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(item => item !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      (option.label || "").toLowerCase().includes(query)
    );
  }, [options, searchQuery]);


  const handleLoadAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsProgressiveLoading(true);
    setLoadProgress(0);

    // Small delay to let the "Loading..." state render
    setTimeout(() => {
      let current = 100;
      const total = filteredOptions.length;
      const batchSize = 1000;

      const processBatch = () => {
        current += batchSize;
        if (current >= total) {
          setVisibleLimit(total);
          setLoadProgress(100);
          // Keep the progress bar visible for a moment
          setTimeout(() => setIsProgressiveLoading(false), 500);
        } else {
          setVisibleLimit(current);
          setLoadProgress(Math.round((current / total) * 100));
          // Use timeout of 20ms to ensure the browser has time to paint the progress bar
          setTimeout(processBatch, 20);
        }
      };

      processBatch();
    }, 100);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setVisibleLimit(500);
      setIsProgressiveLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setVisibleLimit(500);
    setIsProgressiveLoading(false);
  }, [searchQuery]);

  return (
    <div className="relative w-full text-left" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <button
        type="button"
        disabled={disabled}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm border rounded-lg shadow-sm transition-all font-heading ${disabled
          ? 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed opacity-75'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
        onClick={toggleDropdown}
      >
        <span className="flex items-center truncate">
          {selectedValues.length === 0 ? name :
            selectedValues.length === 1 ? (options.find(o => o.value === selectedValues[0])?.label || name) :
              `${name} (${selectedValues.length})`}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute mt-1 w-full rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-1000 overflow-hidden min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className='flex items-center p-3 border-b border-gray-100'>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-search mr-2 h-4 w-4 shrink-0 text-gray-400"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder={`Search ${name}...`}
              className="w-full focus:outline-none text-sm font-sans"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 bg-gray-50/50">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const allValues = filteredOptions.map(o => o.value);
                // Combine existing selected values with all visible ones, then unique
                const newValues = [...new Set([...selectedValues, ...allValues])];
                onChange(newValues);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tight"
            >
              Select All {searchQuery ? '(Filtered)' : ''}
            </button>
            <div className="w-px h-3 bg-gray-200 mx-2" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const filteredValues = filteredOptions.map(o => o.value);
                // Remove all visible values from selected list
                const newValues = selectedValues.filter(v => !filteredValues.includes(v));
                onChange(newValues);
              }}
              className="text-[11px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-tight"
            >
              Deselect All {searchQuery ? '(Filtered)' : ''}
            </button>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <>
                {/* Render ALL options in a single list to prevent jumping */}
                {filteredOptions.slice(0, visibleLimit).map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      title={option.title}
                      className={`flex items-center px-4 py-2 text-sm cursor-pointer transition-colors ${isSelected ? 'text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={isSelected}
                        onChange={() => handleCheckboxChange(option.value)}
                      />
                      <span className={`truncate ${isSelected ? 'font-semibold' : ''}`}>{option.label}</span>
                    </label>
                  )
                })}

                {filteredOptions.length > visibleLimit && !isProgressiveLoading && (
                  <div className="p-4 bg-amber-50 border-t border-amber-100 space-y-2">
                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-relaxed">
                      Showing {visibleLimit} of {filteredOptions.length} results.
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={handleLoadAll}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-[0.98]"
                    >
                      Load All Items (Slow)
                    </button>
                    <p className="text-[9px] text-amber-500 font-medium italic text-center">
                      Note: Loading all records may cause temporary lag.
                    </p>
                  </div>
                )}

                {isProgressiveLoading && (
                  <div className="p-4 bg-indigo-50 border-t border-indigo-100 space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse">
                        Rendering List...
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 tabular-nums">
                        {loadProgress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-indigo-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                        style={{ width: `${loadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-8 text-sm text-gray-500 text-center italic">
                No matches found...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DropdownWithCheckboxes;
