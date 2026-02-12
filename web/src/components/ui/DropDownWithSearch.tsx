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
import { createPortal } from 'react-dom';

interface SearchOption {
    label: string;
    value: string;
    title?: string;
}

interface DropdownProps {
    options: SearchOption[];
    placeholder: string;
    selectedValue: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

function DropDownWithSearch({ options, placeholder, selectedValue, onChange, disabled = false }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleLimit, setVisibleLimit] = useState(500);
    const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 300 });

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            if (!isOpen && dropdownRef.current) {
                const rect = dropdownRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom - 10; // 10px buffer

                // Determine layout: strictly below unless space is extremely tight
                const calculatedMaxHeight = Math.max(100, Math.min(spaceBelow, 300));

                setPosition({
                    top: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    maxHeight: calculatedMaxHeight
                });
            }
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (value: string) => {
        onChange(value);
        setIsOpen(false);
        setSearchQuery("");
    };

    const filteredOptions = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(query)
        );
    }, [options, searchQuery]);

    const handleLoadAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsProgressiveLoading(true);
        setLoadProgress(0);

        setTimeout(() => {
            let current = 100;
            const total = filteredOptions.length;
            const batchSize = 1000;

            const processBatch = () => {
                current += batchSize;
                if (current >= total) {
                    setVisibleLimit(total);
                    setLoadProgress(100);
                    setTimeout(() => setIsProgressiveLoading(false), 500);
                } else {
                    setVisibleLimit(current);
                    setLoadProgress(Math.round((current / total) * 100));
                    setTimeout(processBatch, 20);
                }
            };

            processBatch();
        }, 100);
    };

    // Close dropdown on scroll/resize (but ignore internal scrolls)
    useEffect(() => {
        if (isOpen) {
            const handleScroll = (event: Event) => {
                // If scrolling inside the menu (e.g. the options list), don't close
                if (menuRef.current && menuRef.current.contains(event.target as Node)) {
                    return;
                }
                setIsOpen(false);
            };

            const handleResize = () => setIsOpen(false);

            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll, true); // Capture phase required for invalidating on outside scroll

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
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

    const selectedOption = useMemo(() => options.find(opt => opt.value === selectedValue), [options, selectedValue]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'hover:bg-gray-50'
                    }`}
                onClick={toggleDropdown}
            >
                <span className="truncate block">
                    {selectedOption ? selectedOption.label : <span className="text-gray-500">{placeholder}</span>}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {isOpen && createPortal(
                <>
                    {/* Transparent Backdrop for handling outside clicks */}
                    <div
                        className="fixed inset-0 z-[9998] bg-transparent"
                        onMouseDown={() => setIsOpen(false)}
                    />

                    <div
                        ref={menuRef}
                        className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 ring-1 ring-black ring-opacity-5 flex flex-col overflow-hidden animate-fade-in text-left"
                        style={{
                            top: position.top,
                            left: position.left,
                            width: position.width,
                            maxHeight: `${position.maxHeight}px`
                        }}
                    >
                        <div className='flex items-center p-3 border-b border-gray-100 bg-gray-50'>
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
                                placeholder="Search..."
                                className="w-full focus:outline-none text-sm font-sans bg-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div
                            className="overflow-auto flex-1 p-1 dropdown-scrollbar-forced pointer-events-auto"
                        >
                            <style>{`
                            .dropdown-scrollbar-forced::-webkit-scrollbar {
                                width: 12px;
                                height: 12px;
                            }
                            .dropdown-scrollbar-forced::-webkit-scrollbar-track {
                                background: #f1f5f9;
                                border-radius: 4px;
                            }
                            .dropdown-scrollbar-forced::-webkit-scrollbar-thumb {
                                background-color: #94a3b8;
                                border: 2px solid #f1f5f9;
                                border-radius: 8px;
                            }
                            .dropdown-scrollbar-forced::-webkit-scrollbar-thumb:hover {
                                background-color: #64748b;
                            }
                            .dropdown-scrollbar-forced::-webkit-scrollbar-corner {
                                background: transparent;
                            }
                            /* Firefox fallback */
                            .dropdown-scrollbar-forced {
                                scrollbar-width: auto;
                                scrollbar-color: #94a3b8 #f1f5f9;
                            }
                        `}</style>
                            {filteredOptions.length > 0 ? (
                                <>
                                    {selectedOption && filteredOptions.some(opt => opt.value === selectedValue) && (
                                        <div
                                            key={selectedOption.value}
                                            className="flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer bg-indigo-50 text-indigo-700 font-medium border-b border-indigo-100/50 mb-1"
                                            onClick={() => handleSelect(selectedOption.value)}
                                        >
                                            <span className="truncate mr-2">{selectedOption.label}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 shrink-0">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    )}

                                    {filteredOptions
                                        .filter(opt => opt.value !== selectedValue)
                                        .slice(0, visibleLimit)
                                        .map((option) => (
                                            <div
                                                key={option.value}
                                                className="px-3 py-2 text-sm rounded-md cursor-pointer text-gray-700 hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSelect(option.value)}
                                            >
                                                <span className="truncate">{option.label}</span>
                                            </div>
                                        ))}

                                    {filteredOptions.length > visibleLimit && !isProgressiveLoading && (
                                        <div className="p-3 bg-amber-50 border-t border-amber-100 space-y-2 mt-1 rounded-b-lg">
                                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                                                Showing {visibleLimit} of {filteredOptions.length} results.
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleLoadAll}
                                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-[0.98]"
                                            >
                                                Load All Items (Slow)
                                            </button>
                                        </div>
                                    )}

                                    {isProgressiveLoading && (
                                        <div className="p-3 bg-indigo-50 border-t border-indigo-100 space-y-2 mt-1 rounded-b-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest animate-pulse">
                                                    Rendering List...
                                                </span>
                                                <span className="text-[10px] font-bold text-indigo-600 tabular-nums">
                                                    {loadProgress}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-indigo-200 rounded-full overflow-hidden">
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
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

export default DropDownWithSearch;
