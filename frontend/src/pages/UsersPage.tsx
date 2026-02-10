/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 2.0.0
 * @since 2026-01-13
 */

import React, { useEffect, useState, useMemo } from 'react';
import { getAllUsers, updateUserStatus, bulkUpdateUserStatus, bulkDeleteUsers, manualActivateUser, bulkActivateUsers } from '../services/user.api';
import { getDesignations } from '../services/settings.api';
import { ShieldCheck, UserPlus, Trash2, XCircle, ShieldAlert, Search } from "lucide-react";
import { useAuth, type User } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import AddAdminModal from "../components/ui/AddAdminModal";
import { FeatureCodes } from "../constants";
import Button from '../components/ui/Button';
import BulkUserManagementModal from '../components/ui/BulkUserManagementModal';
import Table from '../components/ui/Table';
import DropdownWithCheckboxes from '../components/ui/DropDownWithCheckBoxes';
import ColumnVisibilityDropdown from '../components/ui/ColumnVisibilityDropdown';
import { useMessageBox } from '../context/MessageBoxContext';

const UsersPage: React.FC = () => {
    const { user: currentUser, hasPermission, permissions } = useAuth();
    const { showMessage, showConfirm } = useMessageBox();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
    const [isBulkManagementModalOpen, setIsBulkManagementModalOpen] = useState(false);
    const [usersToManage, setUsersToManage] = useState<User[]>([]);

    // ... (rest of the state declarations)
    // Sorting & Filtering
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
    const [allDesignations, setAllDesignations] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const allHeaders = ['selection', 'user', 'fullName', 'labName', 'division', 'designation', 'availableRoles', 'status', 'actions'];

    useEffect(() => {
        if (visibleColumns.length === 0) {
            setVisibleColumns(allHeaders);
        }
    }, []);

    const handleUserUpdate = (updatedUser: User) => {
        setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
    };

    // Pagination & Search States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [totalUsers, setTotalUsers] = useState(0);

    // Initial Filters Data (derived from users or fetched?)
    // Ideally we fetch filters. For now, we derive unique labs from the fetched users (but that's only 20).
    // We'll hardcode Statuses. Labs/Roles can be dynamic if we fetch all or just show what's visible.
    // For better UX, let's hardcode Statuses and fetch Labs via getReferenceFilters or similar if available, or just derive.
    // Given limitations, we'll derive from current list or use search.

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchUsers(currentPage, searchTerm, rowsPerPage);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [currentPage, searchTerm, rowsPerPage, selectedStatuses, selectedLabs, selectedRoles, selectedDesignations]);

    // Fetch initial filter data
    useEffect(() => {
        const fetchFilters = async () => {
            const desigRes = await getDesignations();
            if (desigRes.success) setAllDesignations(desigRes.data.designations);
        };
        fetchFilters();
    }, []);

    // Set initial lab filter for restricted admins
    useEffect(() => {
        if (currentUser?.labName && hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)) {
            setSelectedLabs([currentUser.labName]);
        }
    }, [currentUser?.labName, hasPermission]);

    const fetchUsers = async (page: number = 1, search: string = "", limit: number = rowsPerPage) => {
        setLoading(true);
        try {
            const response = await getAllUsers(page, limit, search, false, {
                status: selectedStatuses,
                labName: selectedLabs,
                roles: selectedRoles,
                designation: selectedDesignations
            });
            if (response.success && response.data) {
                // response.data is { users: [], pagination: {} }
                setUsers(response.data.users || []);
                setTotalPages(response.data.pagination?.totalPages || 1);
                setTotalUsers(response.data.pagination?.total || 0);
                setError(null);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError("Failed to fetch users");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: 'Approved' | 'Pending' | 'Rejected') => {
        setProcessingUserId(userId);
        try {
            const response = await updateUserStatus(userId, newStatus);
            if (response.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
            } else {
                showMessage({ title: 'Error', message: response.message || 'Failed to update status', type: 'error' });
            }
        } finally {
            setProcessingUserId(null);
        }
    };

    const isActionAllowed = (targetUser: User) => {
        if (!currentUser) return false;
        if (targetUser._id === currentUser._id) return false; // Never manage self

        const requesterIsSuper = hasPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
        const requesterCanManageAll = hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
        const requesterCanManageOwn = hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

        // Helper to check target user's capabilities
        const checkTargetPermission = (feature: string) => {
            const perm = permissions.find(p => p.feature === feature);
            return perm?.roles.includes(targetUser.role) || false;
        };

        const targetIsSuper = checkTargetPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
        const targetCanManageAll = checkTargetPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);

        if (requesterIsSuper) {
            return true;
        }

        if (requesterCanManageAll) {
            // Cannot manage System Configurators or peers (other Admins)
            return !targetIsSuper && !targetCanManageAll;
        }

        if (requesterCanManageOwn) {
            // Can only manage users in own lab who are NOT System Configurators or Admins
            return targetUser.labName === currentUser.labName && !targetIsSuper && !targetCanManageAll;
        }

        return false;
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allowedUsers = processedUsers.filter(u => isActionAllowed(u));
            setSelectedUserIds(new Set(allowedUsers.map(u => u._id!)));
        } else {
            setSelectedUserIds(new Set());
        }
    };

    const handleSelectUser = (userId: string) => {
        const targetUser = users.find(u => u._id === userId);
        if (targetUser && !isActionAllowed(targetUser)) return;

        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
    };

    const handleBulkAction = async (status: 'Approved' | 'Pending' | 'Rejected' | 'Activate') => {
        if (selectedUserIds.size === 0) return;
        if (status === 'Activate') {
            const confirmed = await showConfirm({
                title: 'Confirm Bulk Activation',
                message: `Are you sure you want to activate ${selectedUserIds.size} users?`,
                type: 'warning',
                confirmText: 'Activate',
                cancelText: 'Cancel'
            });
            if (!confirmed) return;
        } else {
            const confirmed = await showConfirm({
                title: 'Confirm Status Change',
                message: `Are you sure you want to mark ${selectedUserIds.size} users as ${status}?`,
                type: 'warning',
                confirmText: 'Confirm',
                cancelText: 'Cancel'
            });
            if (!confirmed) return;
        }

        setIsBulkUpdating(true);
        try {
            let response;
            if (status === 'Activate') {
                response = await bulkActivateUsers(Array.from(selectedUserIds));
            } else {
                response = await bulkUpdateUserStatus(Array.from(selectedUserIds), status);
            }

            if (response.success) {
                if (status === 'Activate') {
                    setUsers(users.map(u => selectedUserIds.has(u._id!) ? { ...u, isActivated: true, activationToken: undefined } : u));
                } else {
                    setUsers(users.map(u => selectedUserIds.has(u._id!) ? { ...u, status } : u));
                }
                setSelectedUserIds(new Set());
            } else {
                showMessage({ title: 'Error', message: response.message || 'Bulk action failed', type: 'error' });
            }
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUserIds.size === 0) return;
        const confirmed = await showConfirm({
            title: 'Confirm Bulk Delete',
            message: `Are you sure you want to delete ${selectedUserIds.size} users? This action cannot be undone.`,
            type: 'error',
            confirmText: 'Delete Users',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        setIsBulkUpdating(true);
        try {
            const response = await bulkDeleteUsers(Array.from(selectedUserIds));
            if (response.success) {
                setUsers(users.filter(u => !selectedUserIds.has(u._id!)));
                setSelectedUserIds(new Set());
            } else {
                showMessage({ title: 'Error', message: response.message || 'Delete failed', type: 'error' });
            }
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleManualActivate = async (userId: string) => {
        const confirmed = await showConfirm({
            title: 'Confirm Manual Activation',
            message: "Are you sure you want to manually activate this user? They will be able to login but will still need approval.",
            type: 'warning',
            confirmText: 'Activate',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        setProcessingUserId(userId);
        try {
            const response = await manualActivateUser(userId);
            if (response.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, isActivated: true, status: response.data?.status || 'Pending' } : u));
                showMessage({ title: 'Success', message: "User activated successfully. Account is now Pending approval.", type: 'success' });
            } else {
                showMessage({ title: 'Error', message: response.message || 'Activation failed', type: 'error' });
            }
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleSort = (key: string, direction: 'asc' | 'desc') => {
        setSortConfig({ key, direction });
    };

    const handleClearAllFilters = () => {
        setSearchTerm("");
        setSelectedStatuses([]);

        // Don't clear lab if restricted
        const isRestricted = hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
        if (isRestricted && currentUser?.labName) {
            setSelectedLabs([currentUser.labName]);
        } else {
            setSelectedLabs([]);
        }

        setSelectedRoles([]);
        setSelectedDesignations([]);
        setSortConfig(null);
        setCurrentPage(1);
    };

    const processedUsers = useMemo(() => {
        let result = [...users];

        // 1. All filters now happen on the server
        // This useMemo is kept for sorting (on page) and derived state

        // 2. Sort happens in Table component if we pass onSort, but here we might want to pre-sort
        // Actually, Table component handles sorting if we don't pass onSort, or we can handle it here.
        // Let's rely on Table's internal sorting OR implement it here.
        // Since we have pagination (server-side), client-side sorting only sorts current page.
        // That is acceptable for now. Table component handles it if we DON'T pass onSort, but passing onSort is better for control.
        // Wait, Table.tsx lines 53: "If onSort is provided, we assume the parent handles sorting (server-side)... if onSort || !sortConfig return filteredRows"
        // So if I pass onSort, Table DOES NOT sort.
        // If I want Client-Side sorting, I should NOT pass onSort, OR I should sort here.
        // I want Client-side sorting on the current page. Table does this automatically if I don't pass onSort.
        // BUT I want to control the sort config state to show indicators.
        // If I pass sortConfig, Table uses it for styling.
        // Let's look at Table.tsx line 56: `const sorted = [...filteredRows].sort(...)`. This runs if `!onSort`.
        // So I will NOT pass `onSort`, but I will pass `sortConfig`?
        // No, `internalSortConfig` is used if `externalSortConfig` is not provided.
        // If I want to sync state, I should probably handle sorting here.

        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [users, selectedStatuses, selectedLabs, selectedRoles, sortConfig]);

    if (!hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)) {
        return <Navigate to="/references/local" />;
    }

    const manageableUsers = processedUsers.filter(u => isActionAllowed(u));
    const isAllSelected = manageableUsers.length > 0 && manageableUsers.every(u => selectedUserIds.has(u._id!));

    // Options for Filters (Derived from current page + hardcoded defaults)
    const statusOptions = [
        { label: 'Approved', value: 'Approved' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Rejected', value: 'Rejected' },
    ];

    const labOptions = Array.from(new Set(users.map(u => u.labName).filter(Boolean))).map(lab => ({
        label: lab!, value: lab!
    }));

    const roleOptions = Array.from(new Set(users.flatMap(u => u.availableRoles || []))).map(role => ({
        label: role, value: role
    }));

    const designationOptions = allDesignations.map(d => ({ label: d, value: d }));


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                        User Management
                    </h1>
                    <p className="mt-2 text-gray-600 text-lg">
                        Manage user registrations and account approvals for {" "}
                        <span className="text-indigo-600 font-bold uppercase">
                            {hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES) ? "All Labs" : (currentUser?.labName || "your lab")}
                        </span>{" "}.
                    </p>
                </div>
                {hasPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION) ? (
                    <Button
                        variant="primary"
                        label="Add Administrative User"
                        icon={<UserPlus className="w-4 h-4" />}
                        onClick={() => setIsAddModalOpen(true)}
                        className="shadow-lg shadow-indigo-500/20"
                        disabled={true}
                    />
                ) : (hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)) ? (
                    <Button
                        variant="primary"
                        label="Add Support Admin"
                        icon={<UserPlus className="w-4 h-4" />}
                        onClick={() => setIsAddModalOpen(true)}
                        className="shadow-lg shadow-indigo-500/20"
                    />
                ) : null}
            </div>

            {/* Search Bar - Separate section */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search name, email, lab..."
                        className="pl-10 w-full rounded-2xl pr-4 h-12 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-heading shadow-xs"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Search className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filters Box - Single line for all dropdowns */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[140px]">
                        <DropdownWithCheckboxes
                            name="Status"
                            options={statusOptions}
                            selectedValues={selectedStatuses}
                            onChange={setSelectedStatuses}
                        />
                    </div>
                    <div className="min-w-[200px] flex-1 lg:flex-none">
                        <DropdownWithCheckboxes
                            name="Lab/Institute"
                            options={labOptions}
                            selectedValues={selectedLabs}
                            onChange={setSelectedLabs}
                            disabled={hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)}
                        />
                    </div>
                    <div className="min-w-[140px]">
                        <DropdownWithCheckboxes
                            name="Roles"
                            options={roleOptions}
                            selectedValues={selectedRoles}
                            onChange={(vals) => {
                                setSelectedRoles(vals);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div className="min-w-[140px]">
                        <DropdownWithCheckboxes
                            name="Designations"
                            options={designationOptions}
                            selectedValues={selectedDesignations}
                            onChange={(vals) => {
                                setSelectedDesignations(vals);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <div className="ml-auto">
                        <ColumnVisibilityDropdown
                            allColumns={allHeaders}
                            visibleColumns={visibleColumns}
                            onChange={setVisibleColumns}
                        />
                    </div>
                </div>
            </div>

            {/* Current Filters Display */}
            {((selectedLabs.length > 0 && !(hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES))) ||
                selectedStatuses.length > 0 ||
                selectedRoles.length > 0 ||
                selectedDesignations.length > 0 ||
                searchTerm) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-heading mr-2">Filters:</span>

                        {searchTerm && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-gray-50 text-gray-700 border-gray-100">
                                Search: "{searchTerm}"
                            </span>
                        )}

                        {selectedStatuses.map(status => (
                            <span key={status} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                {status}
                            </span>
                        ))}

                        {/* Only show lab badge if NOT restricted */}
                        {!(hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)) && selectedLabs.map(lab => (
                            <span key={lab} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                Lab: {lab}
                            </span>
                        ))}

                        {selectedRoles.map(role => (
                            <span key={role} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                Role: {role}
                            </span>
                        ))}

                        {selectedDesignations.map(desig => (
                            <span key={desig} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                Designation: {desig}
                            </span>
                        ))}

                        {/* Only show Clear All if there's actually something to clear beyond the restricted lab */}
                        {(searchTerm || selectedStatuses.length > 0 || selectedRoles.length > 0 || selectedDesignations.length > 0 || (selectedLabs.length > 0 && !(hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) && !hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)))) && (
                            <button
                                onClick={handleClearAllFilters}
                                className="ml-auto text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            >
                                Clear All filters
                            </button>
                        )}
                    </div>
                )}

            {/* Bulk Actions Banner */}
            {selectedUserIds.size > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-right duration-300 mb-6">
                    <span className="text-sm font-bold text-indigo-900 font-heading whitespace-nowrap">{selectedUserIds.size} SELECTED</span>
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            label="Approve"
                            icon={<ShieldCheck className="w-4 h-4" />}
                            onClick={() => handleBulkAction('Approved')}
                            loading={isBulkUpdating}
                            disabled={isBulkUpdating}
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
                        />
                        <Button
                            variant="primary"
                            label="Activate"
                            icon={<ShieldCheck className="w-4 h-4" />}
                            onClick={() => handleBulkAction('Activate')}
                            loading={isBulkUpdating}
                            disabled={isBulkUpdating}
                            className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 border-amber-500 shadow-amber-200"
                        />
                        <Button
                            variant="primary"
                            label="Manage"
                            icon={<ShieldAlert className="w-4 h-4" />}
                            onClick={() => {
                                setUsersToManage(users.filter(u => selectedUserIds.has(u._id!)));
                                setIsBulkManagementModalOpen(true);
                            }}
                            className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-indigo-200"
                        />
                        <Button
                            variant="danger"
                            label="Delete"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={handleBulkDelete}
                            loading={isBulkUpdating}
                            disabled={isBulkUpdating}
                            className="h-8 px-3 text-xs bg-red-600 hover:bg-red-700 border-red-500 shadow-red-200"
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className={`transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                <Table<User>
                    rows={processedUsers}
                    visibleColumns={visibleColumns}
                    sortConfig={sortConfig}
                    onSort={handleSort} // Manually handling sort to sync with state
                    columnWidths={{
                        selection: '50px',
                        user: '220px',
                        fullName: '180px',
                        labName: '150px',
                        actions: '180px'
                    }}
                    customHeaderRenderers={{
                        selection: () => (
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    disabled={manageableUsers.length === 0}
                                />
                            </div>
                        )
                    }}
                    customRenderers={{
                        selection: (user) => {
                            const canManage = isActionAllowed(user);
                            return (
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                        checked={selectedUserIds.has(user._id!)}
                                        onChange={() => handleSelectUser(user._id!)}
                                        disabled={!canManage}
                                    />
                                </div>
                            );
                        },
                        user: (user) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-100 uppercase">
                                    {user.initials || user.email.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <button
                                        onClick={() => {
                                            if (isActionAllowed(user)) {
                                                setUsersToManage([user]);
                                                setIsBulkManagementModalOpen(true);
                                            }
                                        }}
                                        className={`text-sm font-medium truncate max-w-[160px] block transition-colors ${isActionAllowed(user) ? 'text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer' : 'text-gray-900'}`}
                                        title={user.email}
                                        disabled={!isActionAllowed(user)}
                                    >
                                        {user.email}
                                    </button>
                                </div>
                            </div>
                        ),
                        fullName: (user) => (
                            <span className="text-sm font-semibold text-gray-800 truncate block" title={user.fullName}>
                                {user.fullName || "N/A"}
                            </span>
                        ),
                        labName: (user) => (
                            <span className="text-sm text-gray-600 italic truncate block" title={user.labName}>
                                {user.labName || "N/A"}
                            </span>
                        ),
                        availableRoles: (user) => (
                            <div className="flex flex-wrap gap-1">
                                {user.availableRoles && user.availableRoles.length > 0 ? (
                                    user.availableRoles.map((role, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {role}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400 italic">None</span>
                                )}
                            </div>
                        ),
                        status: (user) => (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${user.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                user.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                {user.status}
                            </span>
                        ),
                        actions: (user) => {
                            const canManage = isActionAllowed(user);
                            return (
                                <div className="flex items-center justify-end gap-1.5 action-buttons">
                                    {canManage && !user.isActivated && (
                                        <button
                                            onClick={() => handleManualActivate(user._id!)}
                                            disabled={processingUserId === user._id || isBulkUpdating}
                                            className="px-2 py-1 text-[10px] font-bold bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
                                            title="Manually Activate"
                                        >
                                            {processingUserId === user._id ? '...' : 'Activate'}
                                        </button>
                                    )}
                                    {canManage && user.isActivated && user.status !== 'Approved' && (
                                        <button
                                            onClick={() => handleStatusChange(user._id!, 'Approved')}
                                            disabled={processingUserId === user._id || isBulkUpdating}
                                            className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {processingUserId === user._id ? '...' : 'Approve'}
                                        </button>
                                    )}
                                    {canManage && user.status !== 'Rejected' && (
                                        <button
                                            onClick={() => handleStatusChange(user._id!, 'Rejected')}
                                            disabled={processingUserId === user._id || isBulkUpdating}
                                            className="px-2 py-1 text-[10px] font-bold bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            {processingUserId === user._id ? '...' : 'Reject'}
                                        </button>
                                    )}
                                    {!canManage && (
                                        <span className="text-[10px] text-gray-400 font-medium italic">
                                            {user._id === currentUser?._id ? '(You)' : 'Restricted'}
                                        </span>
                                    )}
                                </div>
                            )
                        }
                    }}
                />
            </div>

            <AddAdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchUsers(currentPage, searchTerm, rowsPerPage);
                }}
            />

            {/* Pagination Controls */}
            {totalUsers > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 pb-2 border-t border-gray-100 mt-8">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-heading">Display</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-gray-100/50 border-none rounded-xl px-4 py-1.5 text-xs font-bold text-gray-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer hover:bg-gray-100 font-heading"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <div className="h-4 w-px bg-gray-100 mx-2" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-heading">
                            Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, totalUsers)} of {totalUsers}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                            title="First Page"
                        >«</button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl disabled:opacity-20 disabled:hover:bg-transparent transition-all font-heading"
                        >PREV</button>
                        <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 font-heading">
                            {currentPage}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl disabled:opacity-20 disabled:hover:bg-transparent transition-all font-heading"
                        >NEXT</button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                            title="Last Page"
                        >»</button>
                    </div>
                </div>
            )}

            {/* Bulk Management Modal */}
            {isBulkManagementModalOpen && (
                <BulkUserManagementModal
                    isOpen={isBulkManagementModalOpen}
                    onClose={() => setIsBulkManagementModalOpen(false)}
                    selectedUsers={usersToManage}
                    onUserUpdate={handleUserUpdate}
                />
            )}
        </div>
    );
};

export default UsersPage;
