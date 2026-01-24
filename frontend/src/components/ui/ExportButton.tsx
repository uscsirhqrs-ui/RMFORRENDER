import React, { useState } from 'react';
import { Download, FileText, Table as TableIcon, Loader2, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';
import Button from './Button';

interface ColumnDef {
    header: string;
    dataKey: string;
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
    filterSummary
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

            // Transform data for CSV if needed (flattening logic is simple in utils, but we pass raw data)
            // Ideally, we might want to pre-process data here based on columns to ensure CSV matches PDF columns
            const processedData = exportData.map(row => {
                const newRow: any = {};
                columns.forEach(col => {
                    const keys = col.dataKey.split('.');
                    let val = row;
                    keys.forEach(k => {
                        val = (val && val[k]) ? val[k] : '';
                    });
                    newRow[col.header] = val; // Use header as key for CSV readability
                });
                return newRow;
            });

            if (format === 'csv') {
                exportToCSV(processedData, finalFilename);
            } else {
                exportToPDF(exportData, columns, title, finalFilename, exportedBy, filterSummary);
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
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="py-1" role="menu">
                        <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider font-heading border-b border-gray-100">
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
                                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider font-heading border-b border-gray-100">
                                    All Data (Filtered)
                                </div>
                                <button
                                    onClick={() => handleExport('csv', 'all')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                                >
                                    <TableIcon className="w-4 h-4" /> All CSV
                                </button>
                                <button
                                    onClick={() => handleExport('pdf', 'all')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
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
