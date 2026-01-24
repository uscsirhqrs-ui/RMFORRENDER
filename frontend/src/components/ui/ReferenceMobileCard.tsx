/**
 * @fileoverview React Component - Reusable Mobile Card for References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-25
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Archive } from 'lucide-react';
import type { Reference } from '../../types/Reference.type';

interface ReferenceMobileCardProps {
    data: Reference;
    isSelected: boolean;
    onToggleSelect: () => void;
    linkBaseUrl: string; // e.g. '/references/local' or '/references/global'
    showLabName?: boolean;
    statusRenderer: (status: string) => string; // Function to get Tailwind classes
}

export const ReferenceMobileCard: React.FC<ReferenceMobileCardProps> = ({
    data: row,
    isSelected,
    onToggleSelect,
    linkBaseUrl,
    showLabName = false,
    statusRenderer
}) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                        <Link to={`${linkBaseUrl}/${row._id}`} className="text-indigo-600 font-bold text-sm hover:underline font-heading block">
                            {row.refId}
                        </Link>
                        <span className="text-xs text-gray-400 font-heading">
                            {new Date(row.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider font-heading ${statusRenderer(row.status)}`}>
                    {row.status}
                </span>
            </div>

            <div>
                <Link to={`${linkBaseUrl}/${row._id}`} className="font-semibold text-gray-900 font-heading line-clamp-2 mb-1 hover:text-indigo-600">
                    {row.subject}
                </Link>
                <div className="flex flex-wrap gap-2">
                    {row.priority && (
                        <span className="text-xs text-gray-500 font-medium">Priority: {row.priority}</span>
                    )}
                    {showLabName && row.labName && (
                        <span className="text-xs font-bold text-gray-500 uppercase font-heading">| {row.labName}</span>
                    )}
                </div>
            </div>

            {(row.isHidden || row.isArchived) && (
                <div className="flex gap-3 pt-2 border-t border-gray-50">
                    {row.isHidden && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 font-bold uppercase font-heading">
                            <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                    )}
                    {row.isArchived && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase font-heading">
                            <Archive className="w-3 h-3" /> Archived
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
