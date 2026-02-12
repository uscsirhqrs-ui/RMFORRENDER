/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Check } from 'lucide-react';

interface ColumnVisibilityDropdownProps {
    allColumns: string[];
    visibleColumns: string[];
    onChange: (visibleColumns: string[]) => void;
}

const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({ allColumns, visibleColumns, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleCheckboxChange = (column: string) => {
        let temp: string[];
        if (visibleColumns.includes(column)) {
            // Prevent hiding the last visible column
            if (visibleColumns.length <= 1) return;
            temp = visibleColumns.filter(c => c !== column);
        } else {
            temp = [...visibleColumns, column];
        }
        // Maintain order based on allColumns
        const newVisible = allColumns.filter(c => temp.includes(c));
        onChange(newVisible);
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

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                className="inline-flex items-center justify-between w-full h-10 rounded-xl border border-gray-100 shadow-sm px-3 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all font-heading"
                onClick={toggleDropdown}
                title="View Columns"
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>View</span>
                </div>
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
                    className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 animate-scale-in">
                    <div className="py-1 max-h-96 overflow-y-auto">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Toggle Columns
                        </div>
                        {allColumns.map((column) => (
                            <label
                                key={column}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none transition-colors"
                            >
                                <div className={`w-5 h-5 mr-3 border rounded flex items-center justify-center transition-all ${visibleColumns.includes(column)
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'border-gray-300 bg-white'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={visibleColumns.includes(column)}
                                        onChange={() => handleCheckboxChange(column)}
                                    />
                                    {visibleColumns.includes(column) && (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    )}
                                </div>
                                <span className="capitalize">{column === 'refId' ? 'Ref ID' : column.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnVisibilityDropdown;
