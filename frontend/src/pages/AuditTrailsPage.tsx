/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    Search,
    Activity,
    ChevronLeft,
    ChevronRight,
    Database,
    Calendar,
    Eye,
    Pause,
    Play
} from 'lucide-react';
import { getAuditLogs, getAuditSettings, toggleAuditLogging } from '../services/audit.api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import ColumnVisibilityDropdown from '../components/ui/ColumnVisibilityDropdown';

const AuditTrailsPage: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        action: '',
        user: '',
        resource: '',
    });
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [isLoggingEnabled, setIsLoggingEnabled] = useState<boolean>(true);
    const [toggling, setToggling] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const allHeaders = ['timestamp', 'user', 'action', 'resource', 'details'];

    useEffect(() => {
        if (visibleColumns.length === 0) {
            setVisibleColumns(allHeaders);
        }
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await getAuditLogs({ page, ...filters, ...dateRange });
            if (response.success) {
                setLogs(response.data.logs);
                setTotalPages(response.data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await getAuditSettings();
            if (response.success) {
                setIsLoggingEnabled(response.data.isEnabled);
            }
        } catch (error) {
            console.error("Failed to fetch audit settings:", error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchSettings();
    }, [page, filters, dateRange]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
        if (action.includes('CREATE')) return 'text-emerald-600 bg-emerald-50';
        if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
        if (action.includes('LOGIN')) return 'text-indigo-600 bg-indigo-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-heading flex items-center gap-3 dark:text-white">
                        <ShieldAlert className="w-8 h-8 text-indigo-600" />
                        Audit Trails
                    </h1>
                    <p className="text-gray-500 font-heading mt-1 dark:text-gray-400">
                        Monitor all system activities and security events.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 pl-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isLoggingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Logging: {isLoggingEnabled ? 'Active' : 'Paused'}
                        </span>
                    </div>
                    <button
                        onClick={async () => {
                            setToggling(true);
                            try {
                                const res = await toggleAuditLogging();
                                if (res.success) {
                                    setIsLoggingEnabled(res.data.isEnabled);
                                    toast.success(`Audit logging ${res.data.isEnabled ? 'resumed' : 'paused'}`);
                                }
                            } catch (error) {
                                toast.error("Failed to toggle logging");
                            } finally {
                                setToggling(false);
                            }
                        }}
                        disabled={toggling}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${isLoggingEnabled
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                            }`}
                    >
                        {toggling ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isLoggingEnabled ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isLoggingEnabled ? 'Pause Logging' : 'Resume Logging'}
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-center">
                    <div className="relative col-span-1 md:col-span-1 lg:col-span-2">
                        <input
                            type="text"
                            name="user"
                            placeholder="Search by User ID..."
                            className="w-full pl-9 pr-4 h-10 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm font-heading"
                            onChange={handleFilterChange}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    <select
                        name="action"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm font-heading"
                        onChange={handleFilterChange}
                    >
                        <option value="">All Actions</option>
                        <option value="USER_LOGIN">User Login</option>
                        <option value="USER_LOGOUT">User Logout</option>
                        <option value="REFERENCE_CREATE">Reference Created</option>
                        <option value="REFERENCE_UPDATE">Reference Updated</option>
                        <option value="REFERENCE_DELETE">Reference Deleted</option>
                    </select>

                    <select
                        name="resource"
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm font-heading"
                        onChange={handleFilterChange}
                    >
                        <option value="">All Resources</option>
                        <option value="Reference">References</option>
                        <option value="User">Users</option>
                    </select>

                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`flex items-center justify-center gap-2 w-full h-10 px-4 rounded-lg transition-colors font-heading text-sm ${dateRange.startDate || dateRange.endDate
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            {dateRange.startDate ? (
                                <span className="truncate">
                                    {format(new Date(dateRange.startDate), 'MMM dd')}
                                    {dateRange.endDate ? ` - ${format(new Date(dateRange.endDate), 'MMM dd')}` : ' +'}
                                </span>
                            ) : 'Date Range'}
                        </button>
                        {showDatePicker && (
                            <div className="absolute right-0 lg:left-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 w-72 animate-in zoom-in-95 duration-200">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Start Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">End Date</label>
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            min={dateRange.startDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-600 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setDateRange({ startDate: '', endDate: '' });
                                            }}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => setShowDatePicker(false)}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-start-8 flex justify-end">
                        <ColumnVisibilityDropdown
                            allColumns={allHeaders}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                {visibleColumns.includes('timestamp') && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading">Timestamp</th>}
                                {visibleColumns.includes('user') && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading">User</th>}
                                {visibleColumns.includes('action') && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading">Action</th>}
                                {visibleColumns.includes('resource') && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading">Resource</th>}
                                {visibleColumns.includes('details') && <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading text-right">Details</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={visibleColumns.length} className="px-6 py-4 h-16 bg-gray-50/20"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                    {visibleColumns.includes('timestamp') && (
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-gray-200">
                                                {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                                            </div>
                                            <div className="text-xs text-gray-400 font-heading">
                                                {format(new Date(log.createdAt), 'yyyy')}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('user') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                    {log.user?.fullName?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-200 font-heading">
                                                        {log.user?.fullName || 'System'}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium font-heading">
                                                        {log.user?.email || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('action') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold font-heading border ${getActionColor(log.action).replace('text-', 'border-').replace('bg-', '')} ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('resource') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 font-heading uppercase">
                                                <Database className="w-3.5 h-3.5 text-indigo-400" />
                                                {log.resource}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('details') && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page <span className="font-bold text-gray-900 dark:text-white">{page}</span> of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div >

            {selectedLog && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold font-heading dark:text-white">Activity Detail</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <ChevronRight className="w-6 h-6 rotate-90" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                    <p className="text-gray-500 text-xs mb-1">Action Performed</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedLog.action}</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                    <p className="text-gray-500 text-xs mb-1">On Resource</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedLog.resource} ({selectedLog.resourceId || 'N/A'})</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                    <p className="text-gray-500 text-xs mb-1">IP Address</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedLog.metadata?.ip || 'Unknown'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                    <p className="text-gray-500 text-xs mb-1">Method</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{selectedLog.metadata?.method} {selectedLog.metadata?.url}</p>
                                </div>
                            </div>

                            {selectedLog.changes && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-indigo-600" />
                                        Data Changes
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {selectedLog.changes.before && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Before</p>
                                                <pre className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl overflow-x-auto dark:bg-red-900/20 dark:text-red-300">
                                                    {JSON.stringify(selectedLog.changes.before, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {selectedLog.changes.after && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">After</p>
                                                <pre className="p-4 bg-emerald-50 text-emerald-700 text-xs rounded-2xl overflow-x-auto dark:bg-emerald-900/20 dark:text-emerald-300">
                                                    {JSON.stringify(selectedLog.changes.after, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                <p className="text-xs text-indigo-600 font-bold mb-2">Browser Metadata</p>
                                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed italic">
                                    {selectedLog.metadata?.userAgent}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AuditTrailsPage;
