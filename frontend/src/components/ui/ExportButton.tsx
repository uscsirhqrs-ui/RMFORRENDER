/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState } from 'react';
import { Download, FileText, Table as TableIcon, Loader2 } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import Button from './Button';

interface ColumnDef {
    header: string;
    dataKey: string;
    formatter?: (val: any, row: any) => string;
}

interface ExportButtonProps {
    data: any[]; // Current page data
    columns: ColumnDef[];
    filename?: string;
    title?: string;
    onExportAll?: () => Promise<any[]>; // Function to fetch ALL data matching current filters
    className?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    exportedBy?: string;
    filterSummary?: string;
    logoUrl?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
    data,
    columns,
    filename = 'export',
    title = 'Data Export',
    onExportAll,
    className,
    variant = 'secondary',
    exportedBy,
    filterSummary,
    logoUrl
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape');

    const handleExport = async (format: 'csv' | 'pdf', scope: 'page' | 'all') => {
        setIsOpen(false);
        try {
            let exportData = data;
            const finalFilename = `${filename}-${scope}-${new Date().toISOString().split('T')[0]}`;

            if (scope === 'all') {
                if (!onExportAll) return;
                setIsLoading(true);
                exportData = await onExportAll();
                setIsLoading(false);
            }

            const processedData = exportData.map(row => {
                const newRow: any = {};
                columns.forEach(col => {
                    const keys = col.dataKey.split('.');
                    let val = row;
                    keys.forEach(k => {
                        val = (val && val[k] !== undefined) ? val[k] : '';
                    });

                    if (col.formatter) {
                        newRow[col.header] = col.formatter(val, row);
                    } else {
                        newRow[col.header] = val;
                    }
                });
                return newRow;
            });

            if (format === 'csv') {
                exportToCSV(processedData, finalFilename);
            } else {
                await exportToPDF(processedData, columns, title, finalFilename, exportedBy, filterSummary, pdfOrientation, logoUrl);
            }

        } catch (error) {
            console.error("Export failed:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="relative inline-block text-left">
            <Button
                variant={variant}
                label={isLoading ? "Exporting..." : "Export"}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                onClick={() => !isLoading && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 ${className}`}
                disabled={isLoading}
            />

            {isOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="py-2" role="menu">
                        {/* Orientation Select */}
                        <div className="px-4 py-2 border-b border-gray-100">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-heading mb-1">
                                PDF Orientation
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPdfOrientation('portrait'); }}
                                    className={`flex-1 py-1 text-xs font-bold rounded border ${pdfOrientation === 'portrait' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Portrait
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPdfOrientation('landscape'); }}
                                    className={`flex-1 py-1 text-xs font-bold rounded border ${pdfOrientation === 'landscape' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Landscape
                                </button>
                            </div>
                        </div>

                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider font-heading border-b border-gray-100 bg-gray-50/50">
                            Current Page ({data.length})
                        </div>
                        <button
                            onClick={() => handleExport('csv', 'page')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                        >
                            <TableIcon className="w-4 h-4" /> CSV
                        </button>
                        <button
                            onClick={() => handleExport('pdf', 'page')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                        >
                            <FileText className="w-4 h-4" /> PDF
                        </button>

                        {onExportAll && (
                            <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider font-heading border-b border-gray-100 bg-gray-50/50">
                                    All Data (Filtered)
                                </div>
                                <button
                                    onClick={() => handleExport('csv', 'all')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                    title="Export all rows matching current filters as CSV"
                                >
                                    <TableIcon className="w-4 h-4" /> All CSV
                                </button>
                                <button
                                    onClick={() => handleExport('pdf', 'all')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                    title={`Export all matching rows as PDF (${pdfOrientation})`}
                                >
                                    <FileText className="w-4 h-4" /> All PDF
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Click outside listener could be added here or via a custom hook */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            )}
        </div>
    );
};

export default ExportButton;
