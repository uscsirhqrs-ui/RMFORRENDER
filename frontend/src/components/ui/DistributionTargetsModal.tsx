/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState, useMemo } from 'react';
import { X, Search, Loader2, Bell, CheckSquare, Square, Building2, User, UserCheck } from 'lucide-react';
import { sendReminder } from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';
import UserProfileViewModal from './UserProfileViewModal';

interface DistributionTargetsModalProps {
    form: any;
    onClose: () => void;
}

export const DistributionTargetsModal: React.FC<DistributionTargetsModalProps> = ({ form, onClose }) => {
    const { showMessage } = useMessageBox();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLab, setFilterLab] = useState<string>('All');
    const [filterDesignation, setFilterDesignation] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Selection State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [bulkReminding, setBulkReminding] = useState(false);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

    // Extract unique values for filters
    const labs = useMemo(() => {
        const uniqueLabs = new Set<string>();
        form.sharedWithUsers?.forEach((u: any) => {
            if (u.labName) uniqueLabs.add(u.labName);
        });
        return ['All', ...Array.from(uniqueLabs).sort()];
    }, [form]);

    const designations = useMemo(() => {
        const uniqueDesigs = new Set<string>();
        form.sharedWithUsers?.forEach((u: any) => {
            if (u.designation) uniqueDesigs.add(u.designation);
        });
        return ['All', ...Array.from(uniqueDesigs).sort()];
    }, [form]);

    // Filter Logic
    const filteredUsers = useMemo(() => {
        if (!form.sharedWithUsers) return [];

        return form.sharedWithUsers.filter((user: any) => {
            if (typeof user !== 'object') return false; // Skip legacy ID-only records if any

            // Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!user.fullName?.toLowerCase().includes(q) &&
                    !user.email?.toLowerCase().includes(q)) {
                    return false;
                }
            }

            // Lab Filter
            if (filterLab !== 'All' && user.labName !== filterLab) return false;

            // Designation Filter
            if (filterDesignation !== 'All' && user.designation !== filterDesignation) return false;

            // Status Filter
            const status = user.submission?.status || 'Pending';
            if (filterStatus !== 'All') {
                if (filterStatus === 'Submitted') {
                    if (status !== 'Submitted' && status !== 'Approved') return false;
                } else if (filterStatus === 'Pending') {
                    if (status === 'Submitted' || status === 'Approved') return false;
                }
            }

            return true;
        });
    }, [form, searchQuery, filterLab, filterDesignation, filterStatus]);

    // Selection Handlers
    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedUsers(new Set());
        } else {
            const newSet = new Set<string>();
            filteredUsers.forEach((u: any) => newSet.add(u._id));
            setSelectedUsers(newSet);
        }
    };

    const isAllSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;
    const isIndeterminate = selectedUsers.size > 0 && selectedUsers.size < filteredUsers.length;

    // Bulk Remind
    const handleBulkRemind = async () => {
        if (selectedUsers.size === 0) return;
        setBulkReminding(true);
        try {
            const promises = Array.from(selectedUsers).map(userId =>
                sendReminder(form._id, [userId])
            );
            await Promise.all(promises);
            showMessage({ title: 'Sent', message: `Reminders sent to ${selectedUsers.size} users`, type: 'success' });
            setSelectedUsers(new Set()); // Clear selection
        } catch (e: any) {
            showMessage({ message: e.message || "Failed to send reminders", type: 'error' });
        } finally {
            setBulkReminding(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">

                {/* Header */}
                <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 font-headline">Distribution Targets</h2>
                        <p className="text-gray-500 text-xs mt-1 font-medium">{form.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters & Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative grow max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        {/* Lab Filter */}
                        <select
                            value={filterLab}
                            onChange={(e) => setFilterLab(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-w-[140px]"
                        >
                            {labs.map(lab => <option key={lab} value={lab}>{lab === 'All' ? 'All Labs' : lab}</option>)}
                        </select>

                        {/* Designation Filter */}
                        <select
                            value={filterDesignation}
                            onChange={(e) => setFilterDesignation(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 min-w-[140px]"
                        >
                            {designations.map(des => <option key={des} value={des}>{des === 'All' ? 'All Designations' : des}</option>)}
                        </select>

                        {/* Status Filter */}
                        <div className="flex bg-white border border-gray-200 rounded-lg p-1 shrink-0">
                            {['All', 'Pending', 'Submitted'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === status ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900"
                            >
                                {isAllSelected ? (
                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                ) : isIndeterminate ? (
                                    <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
                                        <div className="w-3 h-0.5 bg-white rounded-full" />
                                    </div>
                                ) : (
                                    <Square className="w-5 h-5 text-gray-300" />
                                )}
                                Select All
                            </button>
                            <span className="text-xs text-gray-400 font-medium">({filteredUsers.length} users found)</span>
                        </div>

                        {selectedUsers.size > 0 && (
                            <button
                                onClick={handleBulkRemind}
                                disabled={bulkReminding}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm"
                            >
                                {bulkReminding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                                Send Reminder ({selectedUsers.size})
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {/* Labs Summary (Only if no specific user filters active) */}
                    {searchQuery === '' && filterLab === 'All' && filterDesignation === 'All' && filterStatus === 'All' && form.sharedWithLabs?.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Participating Laboratories ({form.sharedWithLabs.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {form.sharedWithLabs.map((lab: string) => (
                                    <div key={lab} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] font-bold border border-indigo-100 flex items-center gap-2 truncate">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                        <span className="truncate" title={lab}>{lab}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user: any) => {
                                const isSelected = selectedUsers.has(user._id);
                                const status = user.submission?.status;
                                const isSubmitted = status === 'Submitted' || status === 'Approved';
                                const isDraft = status === 'Edited';

                                return (
                                    <div
                                        key={user._id}
                                        className={`flex items-center justify-between p-4 bg-white rounded-xl border transition-all cursor-pointer group ${isSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 hover:border-indigo-100 hover:shadow-sm'}`}
                                        onClick={() => toggleUser(user._id)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-600 cursor-pointer" onClick={() => toggleUser(user._id)} />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-300 group-hover:text-indigo-300 cursor-pointer" onClick={() => toggleUser(user._id)} />
                                                )}
                                            </div>

                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold border border-indigo-100">
                                                {user.fullName?.charAt(0) || <User className="w-5 h-5" />}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingProfileId(user._id);
                                                        }}
                                                        className="text-sm font-bold text-gray-900 truncate hover:text-indigo-600 hover:underline text-left"
                                                    >
                                                        {user.fullName || 'Unknown User'}
                                                    </button>

                                                    {isSubmitted && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-tight">
                                                            Submitted
                                                        </span>
                                                    )}
                                                    {isDraft && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-tight">
                                                            Draft
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 truncate">
                                                    {user.designation} <span className="text-gray-300 mx-1">•</span> {user.labName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Timestamp or Status Detail */}
                                        <div className="text-right pl-4 shrink-0">
                                            {user.submission?.date ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Last Activity</span>
                                                    <span className="text-xs font-bold text-gray-700">{new Date(user.submission.date).toLocaleDateString()}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">No activity yet</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserCheck className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">No users found</h3>
                                <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
                                <button
                                    onClick={() => { setFilterLab('All'); setFilterDesignation('All'); setFilterStatus('All'); setSearchQuery(''); }}
                                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 italic">* Results limited to specific users assigned to this form.</p>
                </div>
            </div>
            {/* User Profile Modal */}
            {viewingProfileId && (
                <UserProfileViewModal
                    isOpen={!!viewingProfileId}
                    onClose={() => setViewingProfileId(null)}
                    userId={viewingProfileId}
                />
            )}
        </div>
    );
};
