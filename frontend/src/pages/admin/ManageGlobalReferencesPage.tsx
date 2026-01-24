/**
 * @fileoverview React Component - Manage Global References (Admin Page)
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Globe,
    Search,
    Eye,
    EyeOff,
    Archive,
    RotateCcw,
    ArrowLeft,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import {
    getAllReferences,
    bulkUpdateReferences,
    getReferenceFilters
} from '../../services/globalReferences.api';
import type { Reference } from '../../types/Reference.type';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import DropdownWithCheckboxes from '../../components/ui/DropDownWithCheckBoxes';
import DropDownWithSearch from '../../components/ui/DropDownWithSearch';

import ColumnVisibilityDropdown from '../../components/ui/ColumnVisibilityDropdown';
import { MobileCardList } from '../../components/ui/MobileCardList';
import { ReferenceMobileCard } from '../../components/ui/ReferenceMobileCard';
import { useAuth } from '../../context/AuthContext';
import { FeatureCodes } from '../../constants';
import { useMessageBox } from '../../context/MessageBoxContext';

const ManageGlobalReferencesPage = () => {
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const { showConfirm } = useMessageBox();

    // Permissions check
    useEffect(() => {
        if (user && !hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES)) {
            navigate('/references/global');
        }
    }, [user, hasPermission, navigate]);

    // State
    const [references, setReferences] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filters
    const [subjectFilter, setSubjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'hidden' | 'visible'>('all');
    const [archivalFilter, setArchivalFilter] = useState<'all' | 'archived' | 'active'>('all');

    // Dropdown Data
    const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
    const [availablePriorities, setAvailablePriorities] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalReferences, setTotalReferences] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [visibleColumns, setVisibleColumns] = useState<string[]>([
        'selection', 'refId', 'subject', 'status', 'priority', 'isHidden', 'isArchived', 'createdAt'
    ]);

    const fetchFilters = useCallback(async () => {
        try {
            const res = await getReferenceFilters('inter-lab');
            if (res.success && res.data) {
                if (res.data.statuses) setAvailableStatuses(res.data.statuses);
                if (res.data.priorities) setAvailablePriorities(res.data.priorities);
            }
        } catch (error) {
            console.error("Failed to fetch filters", error);
        }
    }, []);

    const fetchReferences = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {
                subject: subjectFilter,
                status: statusFilter,
                priority: priorityFilter,
                scope: 'inter-lab'
            };

            if (visibilityFilter === 'hidden') filters.isHidden = 'true';
            if (visibilityFilter === 'visible') filters.isHidden = 'false';
            if (archivalFilter === 'archived') filters.isArchived = 'true';
            if (archivalFilter === 'active') filters.isArchived = 'false';

            const res = await getAllReferences(currentPage, rowsPerPage, filters);
            if (res.success && res.data) {
                setReferences(res.data.data);
                setTotalReferences(res.data.pagination?.total || 0);
                setTotalPages(res.data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error("Failed to fetch references", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, rowsPerPage, subjectFilter, statusFilter, priorityFilter, visibilityFilter, archivalFilter]);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    const handleBulkAction = async (action: 'hide' | 'unhide' | 'archive' | 'unarchive', force = false) => {
        if (selectedIds.length === 0) return;

        if (!force) {
            const confirmMsg = `Are you sure you want to ${action} ${selectedIds.length} references?`;
            const confirmed = await showConfirm({
                title: 'Confirm Bulk Action',
                message: confirmMsg,
                type: 'warning',
                confirmText: 'Confirm',
                cancelText: 'Cancel'
            });
            if (!confirmed) return;
        }

        setProcessing(true);
        setMessage(null);
        try {
            const res = await bulkUpdateReferences(selectedIds, action, force);
            if (res.success) {
                setMessage({ type: 'success', text: `Successfully ${action}d ${selectedIds.length} references.` });
                setSelectedIds([]);
                fetchReferences();
            } else {
                setMessage({ type: 'error', text: res.message || `Failed to ${action} references.` });
            }
        } catch (error: any) {
            // Check for specific confirmation error from backend
            if (error.message && error.message.startsWith("CONFIRM_ARCHIVE:")) {
                // Remove the prefix for the user prompt
                const promptMsg = error.message.replace("CONFIRM_ARCHIVE: ", "");
                const confirmed = await showConfirm({
                    title: 'Archive Exception',
                    message: promptMsg,
                    type: 'warning',
                    confirmText: 'Yes, Archive',
                    cancelText: 'Cancel'
                });
                if (confirmed) {
                    setProcessing(false); // Reset briefly
                    handleBulkAction(action, true);
                    return;
                }
            } else if (error.response && error.response.status === 409 && error.response.data && error.response.data.message && error.response.data.message.startsWith("CONFIRM_ARCHIVE:")) {
                // Fallback for axios-like response structure if global api uses it (Global api uses fetch helper that might normalize error)
                const promptMsg = error.response.data.message.replace("CONFIRM_ARCHIVE: ", "");
                const confirmed = await showConfirm({
                    title: 'Archive Exception',
                    message: promptMsg,
                    type: 'warning',
                    confirmText: 'Yes, Archive',
                    cancelText: 'Cancel'
                });
                if (confirmed) {
                    setProcessing(false);
                    handleBulkAction(action, true);
                    return;
                }
            } else if (error.message && error.message.includes("409")) {
                // The `handleResponse` helper in globalReferences.api.ts throws generic Error if not handled, 
                // but usually returns JSON. If it throws Error with message from backend:
                // Let's assume the message property contains the backend message if handleResponse worked correctly.
                // Re-reading handleResponse: throw new Error(data.message || ...)
                // So if backend sent 409 and message "CONFIRM_ARCHIVE...", error.message will be that string.
                // The first if-check should catch it.
            }

            setMessage({ type: 'error', text: error.message || "Bulk action failed" });
        } finally {
            if (force || !message) {
                setProcessing(false);
            }
            if (!force) {
                setTimeout(() => setMessage(null), 5000);
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === references.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(references.map(r => r._id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'in progress': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'open': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'closed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'reopened': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/references/global')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Globe className="w-6 h-6 text-indigo-600" />
                            Manage Global References
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Administrative oversight for inter-lab references (Hide/Archive)
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-center">
                    <div className="relative col-span-1 md:col-span-2">
                        <input
                            type="text"
                            placeholder="Search by subject or Ref ID..."
                            className="pl-10 w-full rounded-lg pr-4 h-10 border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    <DropdownWithCheckboxes
                        name="Status"
                        options={availableStatuses.map(s => ({ label: s, value: s }))}
                        selectedValues={statusFilter}
                        onChange={setStatusFilter}
                    />

                    <DropdownWithCheckboxes
                        name="Priority"
                        options={availablePriorities.map(p => ({ label: p, value: p }))}
                        selectedValues={priorityFilter}
                        onChange={setPriorityFilter}
                    />

                    <DropDownWithSearch
                        placeholder="Select Visibility"
                        options={[
                            { label: 'All Visibility', value: 'all' },
                            { label: 'Visible Only', value: 'visible' },
                            { label: 'Hidden Only', value: 'hidden' }
                        ]}
                        selectedValue={visibilityFilter}
                        onChange={(val) => setVisibilityFilter(val as any)}
                    />

                    <DropDownWithSearch
                        placeholder="Select Archival Status"
                        options={[
                            { label: 'All Archival', value: 'all' },
                            { label: 'Active Only', value: 'active' },
                            { label: 'Archived Only', value: 'archived' }
                        ]}
                        selectedValue={archivalFilter}
                        onChange={(val) => setArchivalFilter(val as any)}
                    />

                    <div className="lg:col-start-8 flex justify-end">
                        <ColumnVisibilityDropdown
                            allColumns={['refId', 'subject', 'status', 'priority', 'isHidden', 'isArchived', 'createdAt', 'selection']}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2 font-heading">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {selectedIds.length} Selected
                                </span>
                                <div className="h-4 w-px bg-gray-200 mx-1" />
                                <div className="flex gap-2">
                                    <Button
                                        label="Hide"
                                        variant="secondary"
                                        className="h-8 px-3 text-xs font-heading"
                                        onClick={() => handleBulkAction('hide')}
                                        disabled={processing}
                                        icon={<EyeOff className="w-3.5 h-3.5" />}
                                    />
                                    <Button
                                        label="Unhide"
                                        variant="secondary"
                                        className="h-8 px-3 text-xs font-heading"
                                        onClick={() => handleBulkAction('unhide')}
                                        disabled={processing}
                                        icon={<Eye className="w-3.5 h-3.5" />}
                                    />
                                    <Button
                                        label="Archive"
                                        variant="secondary"
                                        className="h-8 px-3 text-xs font-heading"
                                        onClick={() => handleBulkAction('archive')}
                                        disabled={processing}
                                        icon={<Archive className="w-3.5 h-3.5" />}
                                    />
                                    <Button
                                        label="Restore"
                                        variant="secondary"
                                        className="h-8 px-3 text-xs font-heading"
                                        onClick={() => handleBulkAction('unarchive')}
                                        disabled={processing}
                                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feedback Message */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Table */}
            <div className={`transition-all duration-300 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {/* Desktop View */}
                <div className="hidden md:block">
                    <Table<Reference>
                        rows={references}
                        visibleColumns={visibleColumns}
                        columnWidths={{ selection: '48px', refId: '120px', subject: '400px' }}
                        customHeaderRenderers={{
                            selection: () => (
                                <input
                                    type="checkbox"
                                    checked={references.length > 0 && selectedIds.length === references.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            )
                        }}
                        customRenderers={{
                            selection: (row) => (
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(row._id)}
                                        onChange={() => toggleSelect(row._id)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </div>
                            ),
                            refId: (row) => (
                                <Link to={`/references/global/${row._id}`} className="text-indigo-600 font-bold text-xs hover:underline">
                                    {row.refId}
                                </Link>
                            ),
                            subject: (row) => (
                                <div className="flex flex-col">
                                    <Link to={`/references/global/${row._id}`} className="font-semibold text-gray-900 truncate hover:text-indigo-600 hover:underline" title={row.subject}>
                                        {row.subject}
                                    </Link>
                                    {row.isHidden && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 font-bold uppercase mt-0.5">
                                            <EyeOff className="w-2.5 h-2.5" /> Hidden
                                        </span>
                                    )}
                                    {row.isArchived && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                                            <Archive className="w-2.5 h-2.5" /> Archived
                                        </span>
                                    )}
                                </div>
                            ),
                            status: (row) => (
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusStyles(row.status)}`}>
                                    {row.status}
                                </span>
                            ),
                            isHidden: (row) => (
                                row.isHidden ?
                                    <span className="text-orange-600 flex items-center gap-1 font-bold text-[10px] uppercase"><EyeOff className="w-3 h-3" /> Yes</span> :
                                    <span className="text-gray-400 text-[10px] uppercase">No</span>
                            ),
                            isArchived: (row) => (
                                row.isArchived ?
                                    <span className="text-gray-600 flex items-center gap-1 font-bold text-[10px] uppercase"><Archive className="w-3 h-3" /> Yes</span> :
                                    <span className="text-gray-400 text-[10px] uppercase">No</span>
                            ),
                            createdAt: (row) => new Date(row.createdAt).toLocaleDateString()
                        }}
                    />
                </div>

                {/* Mobile View: Cards */}
                <MobileCardList
                    data={references}
                    keyExtractor={(row) => row._id}
                    emptyMessage="No references found."
                    renderItem={(row) => (
                        <ReferenceMobileCard
                            data={row}
                            isSelected={selectedIds.includes(row._id)}
                            onToggleSelect={() => toggleSelect(row._id)}
                            linkBaseUrl="/references/global"
                            statusRenderer={getStatusStyles}
                        />
                    )}
                />
            </div>

            {/* Pagination Controls */}
            {references.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none"
                        >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                        <span>Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalReferences)} of {totalReferences}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg"
                        >«</button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 rounded-lg"
                        >PREV</button>
                        <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">
                            {currentPage}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 rounded-lg"
                        >NEXT</button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 disabled:opacity-30 hover:bg-gray-100 rounded-lg"
                        >»</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGlobalReferencesPage;
