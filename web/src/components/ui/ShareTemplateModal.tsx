/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Share2, Loader2, CheckCircle2, Building2, Search } from 'lucide-react';
import Button from './Button';
import { getAllUsers } from '../../services/user.api';
import { shareBlueprintCopy } from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';
import clsx from 'clsx';

interface ShareTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    blueprintId: string;
    blueprintTitle: string;
}

interface User {
    _id: string;
    fullName: string;
    email: string;
    labName?: string;
    designation?: string;
}

const ShareTemplateModal: React.FC<ShareTemplateModalProps> = ({
    isOpen,
    onClose,
    blueprintId,
    blueprintTitle
}) => {
    const { showMessage } = useMessageBox();

    // User Selection State
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    // Filters (3-Column State)
    const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set());
    const [selectedDesignations, setSelectedDesignations] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    // Progressive Loading State
    const [visibleUserLimit, setVisibleUserLimit] = useState(50);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedUserIds(new Set());
            setSelectedLabs(new Set());
            setSelectedDesignations(new Set());
            setVisibleUserLimit(50);
            setSearchQuery('');
            fetchUsers();
        }
    }, [isOpen]);



    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await getAllUsers(1, 10000);
            if (response.success && response.data?.users) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // --- Derived Data ---
    const uniqueLabs = useMemo(() => {
        const labs = new Set(users.map(u => u.labName).filter(Boolean) as string[]);
        return Array.from(labs).sort();
    }, [users]);

    const availableDesignations = useMemo(() => {
        if (selectedLabs.size === 0) return [];
        const filteredByLab = users.filter(u => u.labName && selectedLabs.has(u.labName));
        const designations = new Set(filteredByLab.map(u => u.designation).filter(Boolean) as string[]);
        return Array.from(designations).sort();
    }, [users, selectedLabs]);

    const filteredUsers = useMemo(() => {
        let result = users;

        // 1. Filter by Lab
        if (selectedLabs.size > 0) {
            result = result.filter(u => u.labName && selectedLabs.has(u.labName));
        }

        // 2. Filter by Designation
        if (selectedDesignations.size > 0) {
            result = result.filter(u => u.designation && selectedDesignations.has(u.designation));
        }

        // 3. Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.fullName?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query)
            );
        }

        // Note: Sort by name
        return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [users, selectedLabs, selectedDesignations, searchQuery]);


    // --- Handlers ---
    const toggleLab = (lab: string) => {
        const newSelectedLabs = new Set(selectedLabs);
        if (newSelectedLabs.has(lab)) {
            newSelectedLabs.delete(lab);
            // Cascade Deselect Users
            const usersToRemove = users.filter(u => u.labName === lab);
            const newSelectedUserIds = new Set(selectedUserIds);
            usersToRemove.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);
        } else {
            newSelectedLabs.add(lab);
        }
        setSelectedLabs(newSelectedLabs);
    };

    const toggleAllLabs = () => {
        if (uniqueLabs.every(l => selectedLabs.has(l))) {
            setSelectedLabs(new Set());
            setSelectedDesignations(new Set());
            setSelectedUserIds(new Set());
        } else {
            setSelectedLabs(new Set(uniqueLabs));
        }
    };

    const toggleDesignation = (desig: string) => {
        const newSelectedDesignations = new Set(selectedDesignations);
        if (newSelectedDesignations.has(desig)) {
            newSelectedDesignations.delete(desig);
            // Cascade Deselect Users
            const usersToRemove = users.filter(u =>
                u.designation === desig &&
                u.labName && selectedLabs.has(u.labName)
            );
            const newSelectedUserIds = new Set(selectedUserIds);
            usersToRemove.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);
        } else {
            newSelectedDesignations.add(desig);
        }
        setSelectedDesignations(newSelectedDesignations);
    };

    const toggleAllDesignations = () => {
        if (availableDesignations.every(d => selectedDesignations.has(d))) {
            const usersInCurrentView = users.filter(u =>
                u.labName && selectedLabs.has(u.labName) &&
                u.designation && selectedDesignations.has(u.designation)
            );
            const newSelectedUserIds = new Set(selectedUserIds);
            usersInCurrentView.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);
            setSelectedDesignations(new Set());
        } else {
            setSelectedDesignations(new Set(availableDesignations));
        }
    };

    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedUserIds(newSet);
    };

    const toggleAllUsers = () => {
        const newSet = new Set(selectedUserIds);
        const allFilteredIds = filteredUsers.map(u => u._id);
        const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => newSet.has(id));

        if (areAllSelected) {
            allFilteredIds.forEach(id => newSet.delete(id));
        } else {
            allFilteredIds.forEach(id => newSet.add(id));
        }
        setSelectedUserIds(newSet);
    };

    const handleLoadMoreUsers = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleUserLimit(prev => prev + 50);
            setIsLoadingMore(false);
        }, 300);
    };

    const handleShare = async () => {
        if (selectedUserIds.size === 0) {
            showMessage({
                title: 'No Users Selected',
                message: 'Please select at least one user to share with.',
                type: 'warning'
            });
            return;
        }

        setIsSharing(true);
        try {
            // Default config for now, can be expanded later
            const payload = {
                targetUserIds: Array.from(selectedUserIds),
                allowDelegation: true,
                allowMultipleSubmissions: false
            };

            const response = await shareBlueprintCopy(blueprintId, payload);
            if (response.success) {
                showMessage({
                    title: 'Success',
                    message: `Blueprint shared with ${selectedUserIds.size} user(s) successfully!`,
                    type: 'success'
                });
                onClose();
            } else {
                showMessage({
                    title: 'Error',
                    message: response.message || 'Failed to share blueprint',
                    type: 'error'
                });
            }
        } catch (error) {
            showMessage({
                title: 'Error',
                message: 'An unexpected error occurred',
                type: 'error'
            });
        } finally {
            setIsSharing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
            <div className="bg-transparent rounded-2xl shadow-none w-full max-w-[95vw] xl:max-w-7xl h-[90vh] overflow-hidden animate-scale-in flex flex-col border-0 ring-0 outline-none" style={{ boxShadow: 'none', border: 'none' }}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-indigo-700/30 bg-indigo-600 shrink-0 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <Share2 className="w-6 h-6 text-indigo-200" />
                            Share Template with others
                        </h3>
                        <p className="text-sm text-indigo-100 mt-1 truncate max-w-md ml-9">{blueprintTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-indigo-500 rounded-full transition-all text-indigo-200 hover:text-white shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area (3 Columns) */}
                <div className="flex-1 overflow-hidden p-4 lg:p-6 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_280px_1fr] gap-6 h-full">

                        {/* 1. Laboratories */}
                        <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm h-full">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Laboratories</h4>
                                </div>
                                <button onClick={toggleAllLabs} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">
                                    {uniqueLabs.every(l => selectedLabs.has(l)) ? 'Deselect' : 'Select All'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {isLoadingUsers ? (
                                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {uniqueLabs.map(lab => (
                                            <label key={lab} className={clsx(
                                                "flex items-center p-2 rounded-lg cursor-pointer transition-colors border",
                                                selectedLabs.has(lab) ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                            )}>
                                                <div className={clsx("w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0", selectedLabs.has(lab) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white")}>
                                                    {selectedLabs.has(lab) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={selectedLabs.has(lab)} onChange={() => toggleLab(lab)} />
                                                <span className={clsx("text-sm font-medium truncate", selectedLabs.has(lab) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300")}>{lab}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Designations */}
                        <div className={clsx("flex flex-col border rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm h-full transition-opacity", selectedLabs.size === 0 ? "opacity-60" : "opacity-100")}>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", selectedLabs.size > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500")}>2</span>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Designations</h4>
                                </div>
                                <button onClick={toggleAllDesignations} disabled={selectedLabs.size === 0} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider disabled:opacity-50">
                                    {availableDesignations.length > 0 && availableDesignations.every(d => selectedDesignations.has(d)) ? 'Deselect' : 'Select All'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {selectedLabs.size === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-4"><Building2 className="w-8 h-8 mb-2 opacity-20" /><p className="text-xs">Select Labs first</p></div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {availableDesignations.map(desig => (
                                            <label key={desig} className={clsx(
                                                "flex items-center p-2 rounded-lg cursor-pointer transition-colors border",
                                                selectedDesignations.has(desig) ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                            )}>
                                                <div className={clsx("w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0", selectedDesignations.has(desig) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white")}>
                                                    {selectedDesignations.has(desig) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={selectedDesignations.has(desig)} onChange={() => toggleDesignation(desig)} />
                                                <span className={clsx("text-sm font-medium truncate", selectedDesignations.has(desig) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300")}>{desig}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Recipients */}
                        <div className={clsx("flex flex-col border rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm h-full transition-opacity", (selectedLabs.size > 0 || searchQuery) ? "opacity-100" : "opacity-60")}>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", (selectedLabs.size > 0 || searchQuery) ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500")}>3</span>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Recipients</h4>
                                </div>

                                {/* Search Bar for Recipients */}
                                <div className="ml-4 flex-1 relative max-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <Search className="w-3 h-3 absolute left-2 top-1.5 text-gray-400" />
                                </div>

                                <button onClick={toggleAllUsers} disabled={filteredUsers.length === 0} className="ml-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider disabled:opacity-50">
                                    {filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u._id)) ? 'Deselect' : 'Select All'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {filteredUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-4">
                                        <Share2 className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-xs">No users found match filters</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                        {filteredUsers.slice(0, visibleUserLimit).map(user => (
                                            <label key={user._id} className={clsx(
                                                "flex items-start p-3 rounded-lg cursor-pointer transition-colors border",
                                                selectedUserIds.has(user._id) ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                            )}>
                                                <div className={clsx("w-4 h-4 rounded border flex items-start justify-center mr-3 mt-0.5 shrink-0", selectedUserIds.has(user._id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white")}>
                                                    {selectedUserIds.has(user._id) && <CheckCircle2 className="w-3 h-3" />}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={selectedUserIds.has(user._id)} onChange={() => toggleUser(user._id)} />
                                                <div className="min-w-0">
                                                    <p className={clsx("text-sm font-bold truncate", selectedUserIds.has(user._id) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200")}>{user.fullName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                    {user.designation && <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{user.designation}</p>}
                                                </div>
                                            </label>
                                        ))}
                                        {filteredUsers.length > visibleUserLimit && (
                                            <button onClick={handleLoadMoreUsers} className="col-span-full py-2 text-xs text-indigo-600 font-bold hover:underline">
                                                {isLoadingMore ? 'Loading...' : 'Load More'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selection Counter Footer */}
                            <div className="p-3 bg-indigo-50/50 border-t border-indigo-100 dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">{selectedUserIds.size} Selected</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Main Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 shrink-0">
                    <Button variant="secondary" onClick={onClose} disabled={isSharing} className="px-6">Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleShare}
                        disabled={isSharing || selectedUserIds.size === 0}
                        icon={isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                        className="px-6"
                    >
                        {isSharing ? 'Sharing...' : 'Share Template'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ShareTemplateModal;
