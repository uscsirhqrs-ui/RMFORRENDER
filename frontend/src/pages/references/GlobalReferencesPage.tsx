/**
 * @fileoverview React Component - Global References Page
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.1.0
 * @since 2026-01-15
 */

import {
    Plus,
    Search,
    EyeOff,
    Archive,
    Flag,
    FolderOpen,
    AlertCircle,
    Clock,
    CheckCircle2,
    Globe
} from "lucide-react";
import Button from "../../components/ui/Button";
import StatusCard from "../../components/dashboard/StatusCard";
import DropdownWithCheckboxes from "../../components/ui/DropDownWithCheckBoxes";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo2 from "../../assets/images/logo2.svg";

import { getAllReferences, getDashboardStats, getReferenceFilters } from "../../services/globalReferences.api";
import type { Reference } from "../../types/Reference.type";
import Table from "../../components/ui/Table";
import { removeColumnsFromJsonArray } from "../../utils/Helperfunctions";
import AddGlobalReferenceModal from "../../components/ui/AddGlobalReferenceModal";
import ColumnVisibilityDropdown from "../../components/ui/ColumnVisibilityDropdown";
import { MobileCardList } from "../../components/ui/MobileCardList";
import { ReferenceMobileCard } from "../../components/ui/ReferenceMobileCard";
import { useAuth } from "../../context/AuthContext";
import { FeatureCodes } from "../../constants";
import UserProfileViewModal from "../../components/ui/UserProfileViewModal";
import BulkUpdateGlobalReferenceModal from "../../components/ui/BulkUpdateGlobalReferenceModal";
import ExportButton from "../../components/ui/ExportButton";

type CheckBoxOption = {
    label: string;
    value: string;
};

/**
 * GlobalReferencesPage Component
 * 
 * Displays a list of global/inter-lab references in a table format with dashboard statistics.
 */
function GlobalReferencesPage() {
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();

    // Access check using dynamic permissions
    useEffect(() => {
        if (user && !hasPermission(FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER)) {
            navigate('/references/local');
        }
    }, [user, hasPermission, navigate]);

    const [references, setReferences] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Filters and Data Options State
    const [availableCreatedByUsers, setAvailableCreatedByUsers] = useState<{ _id: string, fullName: string, designation: string, email: string, labName?: string, division?: string }[]>([]);
    const [availableMarkedToUsers, setAvailableMarkedToUsers] = useState<{ _id: string, fullName: string, designation: string, email: string, labName?: string, division?: string }[]>([]);
    const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
    const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
    const [availablePriorities, setAvailablePriorities] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

    // Statistics State
    const [stats, setStats] = useState({
        openCount: 0,
        highPriorityCount: 0,
        pending7DaysCount: 0,
        closedThisMonthCount: 0,
        markedToUserCount: 0,
        pendingInDivisionCount: 0,
        totalReferences: 0
    });

    // Filter States
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [selectedMarkedTo, setSelectedMarkedTo] = useState<string[]>([]);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState<string[]>([]);
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [subjectFilter, setSubjectFilter] = useState("");
    const [pendingDaysFilter, setPendingDaysFilter] = useState<number | "">("");

    // Scope is generic for Global References (includes both Inter-lab and same-lab if created as Global)
    const scopeFilter = 'inter-lab';

    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReferences, setTotalReferences] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Active Dashboard Card State
    const [activeCard, setActiveCard] = useState<'open' | 'high' | 'pending' | 'closed' | 'markedToMe' | 'pendingDivision' | null>(null);

    const statusOptions: CheckBoxOption[] = availableStatuses.map(s => ({
        label: s,
        value: s
    }));

    const priorityOptions: CheckBoxOption[] = availablePriorities.map(p => ({
        label: p,
        value: p
    }));

    const markedToOptions: CheckBoxOption[] = availableMarkedToUsers.map(u => ({
        label: `${u.fullName}${u.designation ? `, ${u.designation}` : ""} (${u.labName || 'N/A'})`,
        value: u.email,
        title: `${u.fullName}${u.designation ? ` | ${u.designation}` : ""} | ${u.labName || 'N/A'} (${u.email})`
    }));

    const createdByOptions: CheckBoxOption[] = availableCreatedByUsers.map(u => ({
        label: `${u.fullName}${u.designation ? `, ${u.designation}` : ""} (${u.labName || 'N/A'})`,
        value: u.email,
        title: `${u.fullName}${u.designation ? ` | ${u.designation}` : ""} | ${u.labName || 'N/A'} (${u.email})`
    }));

    const divisionOptions: CheckBoxOption[] = availableDivisions.map(div => ({
        label: div,
        value: div
    }));

    const fetchFilters = async () => {
        try {
            const res = await getReferenceFilters('inter-lab');
            if (res.success && res.data) {
                if (res.data.createdByUsers) setAvailableCreatedByUsers(res.data.createdByUsers);
                if (res.data.markedToUsers) setAvailableMarkedToUsers(res.data.markedToUsers);
                if (res.data.divisions) setAvailableDivisions(res.data.divisions);
                if (res.data.statuses) setAvailableStatuses(res.data.statuses);
                if (res.data.priorities) setAvailablePriorities(res.data.priorities);
            }
        } catch (error) {
            console.error("Failed to fetch reference filters:", error);
        }
    };

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await getDashboardStats(scopeFilter);
            if (res.success && res.data) {
                setStats(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchReferencesFromBackend = async () => {
        try {
            setLoading(true);
            const filters = {
                status: selectedStatuses,
                priority: selectedPriorities,
                markedTo: selectedMarkedTo,
                createdBy: selectedCreatedBy,
                division: selectedDivisions,
                subject: subjectFilter,
                pendingDays: pendingDaysFilter,
                scope: scopeFilter,
            };

            const sort = sortConfig ? {
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction
            } : {};

            const response = await getAllReferences(currentPage, rowsPerPage, filters, sort);

            if (response && response.data) {
                const keysToRemove: (keyof Reference)[] = ["__v"];
                const result = removeColumnsFromJsonArray(response.data.data, keysToRemove);
                setReferences(result as Reference[]);
                setTotalPages(response.data.pagination?.totalPages || 1);
                setTotalReferences(response.data.pagination?.total || 0);
            }
        } catch (err) {
            console.error("Error fetching references:", err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchFilters();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchReferencesFromBackend();
    }, [currentPage, rowsPerPage, selectedStatuses, selectedPriorities, selectedMarkedTo, selectedCreatedBy, selectedDivisions, subjectFilter, pendingDaysFilter, sortConfig]);

    const allHeaders = useMemo(() => ['selection', 'refId', 'subject', 'status', 'priority', 'createdBy', 'markedTo', 'markedToDivision', 'createdLab', 'pendingDivision', 'createdAt', 'daysSinceCreated'], []);

    useEffect(() => {
        if (visibleColumns.length === 0) {
            setVisibleColumns(allHeaders);
        }
    }, [allHeaders]);

    const openUserProfile = (userId: string) => {
        setSelectedUserId(userId);
        setIsProfileModalOpen(true);
    };

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'in progress': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'reopened': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'open': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'closed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const handleStatusCardClick = (type: 'open' | 'high' | 'pending' | 'closed' | 'markedToMe' | 'pendingDivision') => {
        if (activeCard === type) {
            handleClearAllFilters();
            return;
        }

        setActiveCard(type);
        setCurrentPage(1);

        // Reset all filters before applying status card filter
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        setSelectedMarkedTo([]);
        setSelectedCreatedBy([]);
        setSelectedDivisions([]);
        setSubjectFilter("");
        setPendingDaysFilter("");

        switch (type) {
            case 'open':
                setSelectedStatuses(['Open', 'In Progress', 'Reopened']);
                break;
            case 'high':
                setSelectedPriorities(['High']);
                setSelectedStatuses(['Open', 'In Progress', 'Reopened']);
                break;
            case 'pending':
                setPendingDaysFilter(8);
                setSelectedStatuses(['Open', 'In Progress', 'Reopened']);
                break;
            case 'closed':
                setSelectedStatuses(['Closed']);
                break;
            case 'markedToMe':
                if (user?.email) {
                    setSelectedMarkedTo([user.email]);
                }
                setSelectedStatuses(['Open', 'In Progress', 'Reopened']);
                break;
            case 'pendingDivision':
                if (user?.division) {
                    setSelectedDivisions([user.division]);
                }
                setSelectedStatuses(['Open', 'In Progress', 'Reopened']);
                break;
        }
    };

    const handleClearAllFilters = () => {
        setSelectedStatuses([]);
        setSelectedPriorities([]);
        setSelectedMarkedTo([]);
        setSelectedCreatedBy([]);
        setSelectedDivisions([]);
        setSubjectFilter("");
        setPendingDaysFilter("");
        setActiveCard(null);
        setCurrentPage(1);
    };

    const handleSort = (key: string, direction: 'asc' | 'desc') => {
        setSortConfig({ key, direction });
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

    // Clear selection when filters change (optional, but safer)
    useEffect(() => {
        setSelectedIds(new Set());
    }, [selectedStatuses, selectedPriorities, selectedMarkedTo, selectedCreatedBy, selectedDivisions, subjectFilter, pendingDaysFilter, scopeFilter]);

    const handleSelectAll = () => {
        // Filter references that are marked to the current user
        const actionableReferences = references.filter(r => {
            const markedToDetails = (r as any).markedToDetails;
            const markedToEmails = Array.isArray(markedToDetails)
                ? markedToDetails.map((d: any) => d.email)
                : [markedToDetails?.email || (typeof r.markedTo === 'object' ? (r.markedTo as any)?.email : '')];

            return user?.email && r.status !== 'Closed' && markedToEmails.includes(user.email);
        });

        const actionableIds = actionableReferences.map(r => r._id);
        const allSelected = actionableIds.length > 0 && actionableIds.every(id => selectedIds.has(id));

        const newSelected = new Set(selectedIds);
        if (allSelected) {
            actionableIds.forEach(id => newSelected.delete(id));
        } else {
            actionableIds.forEach(id => newSelected.add(id));
        }
        setSelectedIds(newSelected);
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };




    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-lg text-gray-600 animate-pulse font-heading">Loading Global Dashboard...</div>
            </div>
        );
    }

    return (
        <>
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
                {/* Status Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                    <StatusCard
                        info={{
                            title: "All Open References",
                            refcount: statsLoading ? undefined : stats.openCount,
                            icon: <FolderOpen className="w-5 h-5 text-blue-600" />,
                        }}
                        onClick={() => handleStatusCardClick('open')}
                        isActive={activeCard === 'open'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.openCount > 0 ? "Total active references" : "No active references"}
                    />
                    <StatusCard
                        info={{
                            title: "Pending with me",
                            refcount: statsLoading ? undefined : stats.markedToUserCount,
                            icon: <Flag className="w-5 h-5 text-red-600 animate-bounce" fill="currentColor" />,
                        }}
                        onClick={() => handleStatusCardClick('markedToMe')}
                        isActive={activeCard === 'markedToMe'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.markedToUserCount > 0 ? "Pending with me" : "No pending references"}
                    />
                    <StatusCard
                        info={{
                            title: "Pending in My Div",
                            refcount: statsLoading ? undefined : stats.pendingInDivisionCount,
                            icon: <FolderOpen className="w-5 h-5 text-indigo-600" />,
                        }}
                        onClick={() => handleStatusCardClick('pendingDivision')}
                        isActive={activeCard === 'pendingDivision'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.pendingInDivisionCount > 0 ? "Pending in my division" : "No pending references"}
                    />
                    <StatusCard
                        info={{
                            title: "High Priority",
                            refcount: statsLoading ? undefined : stats.highPriorityCount,
                            icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
                        }}
                        onClick={() => handleStatusCardClick('high')}
                        isActive={activeCard === 'high'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.highPriorityCount > 0 ? "Currently active references" : "No active references"}
                    />
                    <StatusCard
                        info={{
                            title: "Pending > 7 Days",
                            refcount: statsLoading ? undefined : stats.pending7DaysCount,
                            icon: <Clock className="w-5 h-5 text-amber-600" />,
                        }}
                        onClick={() => handleStatusCardClick('pending')}
                        isActive={activeCard === 'pending'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.pending7DaysCount > 0 ? " Pending for more than 7 days" : "No pending references"}
                    />
                    <StatusCard
                        info={{
                            title: "Closed This Month",
                            refcount: statsLoading ? undefined : stats.closedThisMonthCount,
                            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
                        }}
                        onClick={() => handleStatusCardClick('closed')}
                        isActive={activeCard === 'closed'}
                        loading={statsLoading}
                        additionalInfo={statsLoading ? undefined : stats.closedThisMonthCount > 0 ? "Closed this month" : "No closed references"}
                    />
                </div>

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 pb-2">
                    <div className="flex flex-1 items-center gap-4 md:gap-6 w-full">
                        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight font-heading flex items-center gap-2 whitespace-nowrap mb-0">
                            <Globe className="w-6 h-6 text-indigo-600" />
                            Global References---abcd
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ExportButton
                            data={references}
                            columns={[
                                { header: 'Ref ID', dataKey: 'refId' },
                                { header: 'Subject', dataKey: 'subject' },
                                { header: 'Priority', dataKey: 'priority' },
                                { header: 'Status', dataKey: 'status' },
                                {
                                    header: 'Created By',
                                    dataKey: 'createdByDetails',
                                    formatter: (val) => {
                                        if (!val) return 'N/A';
                                        const name = val.fullName || 'Unknown';
                                        const designation = val.designation ? `, ${val.designation}` : '';
                                        const lab = val.labName ? ` (${val.labName})` : '';
                                        return `${name}${designation}${lab}`;
                                    }
                                },
                                {
                                    header: 'Marked To',
                                    dataKey: 'markedToDetails',
                                    formatter: (val) => {
                                        if (!val || !Array.isArray(val) || val.length === 0) return 'N/A';
                                        return val.map(u => {
                                            const name = u.fullName || 'Unknown';
                                            const designation = u.designation ? `, ${u.designation}` : '';
                                            const lab = u.labName ? ` (${u.labName})` : '';
                                            return `${name}${designation}${lab}`;
                                        }).join('; ');
                                    }
                                },
                                {
                                    header: 'Division',
                                    dataKey: 'markedToDetails',
                                    formatter: (val) => {
                                        if (!val || !Array.isArray(val) || val.length === 0) return 'N/A';
                                        const divisions = Array.from(new Set(val.map(u => u.division).filter(Boolean)));
                                        return divisions.length > 0 ? divisions.join(', ') : 'N/A';
                                    }
                                },
                                {
                                    header: 'Date',
                                    dataKey: 'createdAt',
                                    formatter: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
                                },
                                { header: 'Remarks', dataKey: 'remarks' }
                            ]}
                            filename={`Global-References-${user?.labName}`}
                            title={`Global References - ${user?.labName}`}
                            exportedBy={user ? `${user.fullName} (${user.email})` : 'Unknown User'}
                            filterSummary={[
                                selectedStatuses.length > 0 && `Status: ${selectedStatuses.join(', ')}`,
                                selectedPriorities.length > 0 && `Priority: ${selectedPriorities.join(', ')}`,
                                selectedMarkedTo.length > 0 && `To: ${selectedMarkedTo.map(e => availableMarkedToUsers.find(u => u.email === e)?.fullName || e).join(', ')}`,
                                selectedCreatedBy.length > 0 && `By: ${selectedCreatedBy.map(e => availableCreatedByUsers.find(u => u.email === e)?.fullName || e).join(', ')}`,
                                selectedDivisions.length > 0 && `Div: ${selectedDivisions.join(', ')}`,
                                subjectFilter && `Subject: "${subjectFilter}"`,
                                pendingDaysFilter && `Pending >= ${pendingDaysFilter} Days`
                            ].filter(Boolean).join(' | ')}
                            onExportAll={async () => {
                                const filters = {
                                    status: selectedStatuses,
                                    priority: selectedPriorities,
                                    markedTo: selectedMarkedTo,
                                    createdBy: selectedCreatedBy,
                                    division: selectedDivisions,
                                    subject: subjectFilter,
                                    pendingDays: pendingDaysFilter,
                                    scope: scopeFilter,
                                };
                                const sort = sortConfig ? {
                                    sortBy: sortConfig.key,
                                    sortOrder: sortConfig.direction
                                } : {};

                                const res = await getAllReferences(1, 10000, filters, sort);
                                return res.data?.data || [];
                            }}
                            logoUrl={logo2}
                            className="h-10 px-6 shadow-lg shadow-gray-200/50 hover:shadow-gray-300/50 whitespace-nowrap font-heading text-sm font-semibold border-gray-200 bg-white text-gray-700"
                        />
                        <Button
                            variant="primary"
                            label="Add New Global Ref"
                            icon={<Plus />}
                            onClick={() => setIsAddModalOpen(true)}
                            className="h-10 px-6 shadow-lg shadow-indigo-500/20 whitespace-nowrap font-heading text-sm font-semibold"
                        />
                    </div>
                </div>

                <div className="-mt-4 pb-2">
                    <p className="text-gray-500 text-xs font-heading">
                        Send references to any <span className="text-indigo-600 font-bold">CSIR lab/unit.</span> The <span className="text-indigo-600 font-bold">Inter lab sender</span> role is required for sending/receiving global references.
                        {stats.totalReferences > 0 && <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest font-bold shadow-sm">
                            Total: {totalReferences} of {stats.totalReferences}
                        </span>}
                    </p>
                </div>

                {/* Filters Bar */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 items-center">
                        <div className="relative col-span-1 md:col-span-1 lg:col-span-1">
                            <input
                                type="text"
                                placeholder="Search subject/ID..."
                                className="pl-9 w-full rounded-lg pr-4 h-10 border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading"
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                        </div>

                        <DropdownWithCheckboxes
                            name="Status"
                            options={statusOptions}
                            selectedValues={selectedStatuses}
                            onChange={(vals) => { setSelectedStatuses(vals); setActiveCard(null); }}
                        />
                        <DropdownWithCheckboxes
                            name="Priority"
                            options={priorityOptions}
                            selectedValues={selectedPriorities}
                            onChange={(vals) => { setSelectedPriorities(vals); setActiveCard(null); }}
                        />

                        <DropdownWithCheckboxes
                            name="Creator"
                            options={createdByOptions}
                            selectedValues={selectedCreatedBy}
                            onChange={setSelectedCreatedBy}
                        />
                        <DropdownWithCheckboxes
                            name="To User"
                            options={markedToOptions}
                            selectedValues={selectedMarkedTo}
                            onChange={setSelectedMarkedTo}
                        />
                        <DropdownWithCheckboxes
                            name="Division"
                            options={divisionOptions}
                            selectedValues={selectedDivisions}
                            onChange={setSelectedDivisions}
                        />
                        <input
                            type="number"
                            min={0}
                            className="w-full h-10 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-heading"
                            value={pendingDaysFilter}
                            onChange={(e) => {
                                setPendingDaysFilter(e.target.value ? Number(e.target.value) : "");
                                setActiveCard(null);
                            }}
                            placeholder="DAYS >="
                        />
                        <div className="flex justify-end">
                            <ColumnVisibilityDropdown
                                allColumns={allHeaders}
                                visibleColumns={visibleColumns}
                                onChange={setVisibleColumns}
                            />
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-indigo-900 font-heading">
                                {selectedIds.size} selected
                            </span>
                            <span className="h-4 w-px bg-indigo-200" />
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                                Deselect All
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="primary"
                                label="Mark To Check..."
                                onClick={() => setIsBulkAssignModalOpen(true)}
                                className="h-8 px-4 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-none"
                            />
                        </div>
                    </div>
                )}

                {/* Current Filters Display */}
                {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedMarkedTo.length > 0 || selectedCreatedBy.length > 0 || subjectFilter || pendingDaysFilter) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="text-xs pl-2 pr-1 font-semibold text-gray-600  tracking-widest font-heading mr-1">Current Filters:</span>

                        {selectedStatuses.map(status => (
                            <span key={status} className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(status)}`}>
                                {status}
                            </span>
                        ))}

                        {selectedPriorities.map(priority => (
                            <span key={priority} className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyles(priority)}`}>
                                {priority}
                            </span>
                        ))}

                        {selectedMarkedTo.map(email => {
                            const user = availableMarkedToUsers.find(u => u.email === email);
                            return (
                                <span key={email} className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                                    <span className="opacity-50">To:</span> {user ? user.fullName : email}
                                </span>
                            );
                        })}

                        {selectedCreatedBy.map(email => {
                            const user = availableCreatedByUsers.find(u => u.email === email);
                            return (
                                <span key={email} className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                                    <span className="opacity-50">By:</span> {user ? user.fullName : email}
                                </span>
                            );
                        })}

                        {selectedDivisions.map(div => (
                            <span key={div} className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                                <span className="opacity-50">Pending Div:</span> {div}
                            </span>
                        ))}

                        {subjectFilter && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-gray-100 text-gray-700 border-gray-200">
                                Subject: "{subjectFilter}"
                            </span>
                        )}

                        {pendingDaysFilter && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-100">
                                Pending &gt;= {pendingDaysFilter} Days
                            </span>
                        )}

                        <button
                            onClick={handleClearAllFilters}
                            className="ml-auto text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                            Clear All filters
                        </button>
                    </div>
                )}

                {/* Table Area */}
                <div className="relative">
                    <div className={`hidden md:block transition-all duration-300 ${loading ? 'opacity-40 grayscale-[0.5] pointer-events-none' : 'opacity-100'}`}>
                        {references.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-gray-400 font-medium font-heading">No references found matching your filters.</p>
                                <Button
                                    variant="secondary"
                                    className="mt-4 text-[10px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 px-4 py-1.5 font-heading"
                                    onClick={handleClearAllFilters}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Table<Reference>
                                    rows={references}
                                    visibleColumns={visibleColumns}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    columnWidths={{ selection: '48px', refId: '120px', subject: '350px' }}
                                    customHeaderRenderers={{
                                        selection: () => {
                                            const actionableReferences = references.filter(r => {
                                                const markedToDetails = (r as any).markedToDetails;
                                                const markedToEmails = Array.isArray(markedToDetails)
                                                    ? markedToDetails.map((d: any) => d.email)
                                                    : [markedToDetails?.email || (typeof r.markedTo === 'object' ? (r.markedTo as any)?.email : '')];

                                                return user?.email && r.status !== 'Closed' && markedToEmails.includes(user.email);
                                            });

                                            // Determine if all ACTIONABLE references are selected
                                            const isAllSelected = actionableReferences.length > 0 && actionableReferences.every(r => selectedIds.has(r._id));

                                            return (
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                    disabled={actionableReferences.length === 0}
                                                    title={actionableReferences.length === 0 ? "No references available for bulk action" : "Select all your references"}
                                                />
                                            );
                                        }
                                    }}
                                    customRenderers={{
                                        selection: (row: Reference) => {
                                            const markedToDetails = (row as any).markedToDetails;
                                            const markedToEmails = Array.isArray(markedToDetails)
                                                ? markedToDetails.map((d: any) => d.email)
                                                : [markedToDetails?.email || (typeof row.markedTo === 'object' ? (row.markedTo as any)?.email : '')];

                                            const isMarkedToMe = user?.email &&
                                                row.status !== 'Closed' &&
                                                markedToEmails.includes(user.email);

                                            return (
                                                <div className="flex justify-center" title={!isMarkedToMe ? "You can only select references marked to you" : undefined}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                        checked={selectedIds.has(row._id)}
                                                        onChange={() => isMarkedToMe && handleSelectRow(row._id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        disabled={!isMarkedToMe}
                                                    />
                                                </div>
                                            );
                                        },
                                        refId: (row: Reference) => (
                                            <Link
                                                to={`/references/global/${row._id}`}
                                                className="text-gray-900 font-bold text-xs hover:text-indigo-600 transition-colors hover:underline"
                                                title={`View details for ${row.refId}`}
                                            >
                                                {row.refId || 'N/A'}
                                            </Link>
                                        ),
                                        subject: (row: Reference) => {
                                            const markedToDetails = (row as any).markedToDetails;
                                            const markedToEmails = Array.isArray(markedToDetails)
                                                ? markedToDetails.map(d => d.email)
                                                : [markedToDetails?.email || (typeof row.markedTo === 'object' ? (row.markedTo as any)?.email : '')];

                                            const isPendingWithMe = user?.email &&
                                                row.status !== 'Closed' &&
                                                markedToEmails.includes(user.email);

                                            return (
                                                <div className="flex flex-col overflow-visible">
                                                    <div className="flex items-center gap-2 hover:underline">
                                                        <Link
                                                            to={`/references/global/${row._id}`}
                                                            className="font-bold text-gray-900 hover:text-indigo-600 transition-colors truncate block leading-none font-heading"
                                                            title={row.subject}
                                                        >
                                                            {row.subject}
                                                        </Link>
                                                        {isPendingWithMe && (
                                                            <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                                        )}
                                                        {row.isHidden && <EyeOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                                        {row.isArchived && <Archive className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                                    </div>
                                                    <span
                                                        className="text-gray-400 text-[11px] font-medium truncate block tracking-normal mt-1"
                                                        title={row.remarks || "No additional remarks"}
                                                    >
                                                        {row.remarks || "No additional remarks"}
                                                    </span>
                                                </div>
                                            );
                                        },
                                        status: (row: Reference) => (
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1 ${getStatusStyles(row.status || '')}`} title={row.status}>
                                                <span className="h-1 w-1 rounded-full bg-current" />
                                                {row.status}
                                            </span>
                                        ),
                                        priority: (row: Reference) => (
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1 ${getPriorityStyles(row.priority || '')}`} title={row.priority}>
                                                <span className="text-[10px] leading-none">{row.priority?.toLowerCase() === 'high' ? '↑' : row.priority?.toLowerCase() === 'low' ? '↓' : '→'}</span>
                                                {row.priority}
                                            </span>
                                        ),
                                        markedTo: (row: Reference) => {
                                            const detailsArr = Array.isArray((row as any).markedToDetails)
                                                ? (row as any).markedToDetails as any[]
                                                : [(row as any).markedToDetails].filter(Boolean);

                                            if (detailsArr.length === 0) return <span>Unmarked</span>;

                                            const firstDetail = detailsArr[0];
                                            const moreCount = detailsArr.length - 1;
                                            const isSelf = user?.email && detailsArr.some(d => d.email === user.email);
                                            const userId = typeof row.markedTo === 'string' ? row.markedTo : (Array.isArray(row.markedTo) ? (typeof row.markedTo[0] === 'string' ? row.markedTo[0] : (row.markedTo[0] as any)?._id) : (row.markedTo as any)?._id);

                                            return (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="flex flex-col truncate cursor-pointer hover:bg-gray-50/50 p-1 rounded transition-colors"
                                                        onClick={() => {
                                                            if (userId) openUserProfile(userId);
                                                        }}
                                                        title={detailsArr.map(d => `${d.fullName}${d.designation ? `, ${d.designation}` : ""} (${d.labName || "N/A"})`).join('\n')}
                                                    >
                                                        <span className="text-indigo-600 font-bold text-xs truncate underline underline-offset-2 decoration-indigo-200">
                                                            {firstDetail.fullName}{moreCount > 0 ? ` +${moreCount}` : ""}
                                                        </span>
                                                        <span className="text-gray-400 text-[10px] font-medium truncate tracking-tight">
                                                            {firstDetail.labName || "N/A"}
                                                        </span>
                                                    </div>
                                                    {isSelf && row.status !== 'Closed' && (
                                                        <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                                    )}
                                                </div>
                                            );
                                        },
                                        createdBy: (row: Reference) => {
                                            const details = (row as any).createdByDetails;
                                            const userId = typeof row.createdBy === 'string' ? row.createdBy : (row.createdBy as any)?._id;

                                            return (
                                                <div
                                                    className="flex flex-col truncate cursor-pointer hover:bg-gray-50/50 p-1 rounded transition-colors"
                                                    onClick={() => {
                                                        if (userId) openUserProfile(userId);
                                                    }}
                                                    title={`${details?.fullName || "Unmarked"}${details?.designation ? `, ${details.designation}` : ""} (${details?.labName || "N/A"})`}
                                                >
                                                    <span className="text-gray-900 font-bold text-xs truncate hover:text-indigo-600 transition-colors">
                                                        {details?.fullName || "Unmarked"}
                                                    </span>
                                                    <span className="text-gray-400 text-[10px] font-medium truncate tracking-tight">
                                                        {details?.labName || (typeof row.createdBy === 'object' ? (row.createdBy as any).fullName : row.createdBy)}
                                                    </span>
                                                </div>
                                            );
                                        },
                                        createdLab: (row: Reference) => (
                                            <span className="text-gray-500 text-xs font-bold truncate block">
                                                {(row as any).createdLab || 'N/A'}
                                            </span>
                                        ),
                                        pendingDivision: (row: Reference) => (
                                            <span className="text-gray-500 text-xs font-bold truncate block" title={row.pendingDivision || 'N/A'}>
                                                {row.pendingDivision || 'N/A'}
                                            </span>
                                        ),
                                        createdAt: (row: Reference) => (
                                            <span className="text-gray-500 text-xs font-bold whitespace-nowrap">
                                                {new Date(row.createdAt).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: '2-digit'
                                                })}
                                            </span>
                                        ),
                                        daysSinceCreated: (row: Reference) => {
                                            const diffTime = Math.abs(new Date().getTime() - new Date(row.createdAt).getTime());
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-bold ${diffDays > 7 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {diffDays}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Days</span>
                                                </div>
                                            );
                                        }
                                    }}
                                />

                                {/* Pagination */}
                                {references.length > 0 && (
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 pb-2 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-heading">Display</span>
                                            <select
                                                value={rowsPerPage}
                                                onChange={(e) => {
                                                    setRowsPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="bg-gray-100/50 border-none rounded-xl px-4 py-1.5 text-xs font-bold text-gray-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer hover:bg-gray-100 font-heading"
                                            >
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                            <div className="h-4 w-px bg-gray-100 mx-2" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-heading">
                                                Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, totalReferences)} of {totalReferences}
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
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile View */}
                <MobileCardList
                    data={references}
                    keyExtractor={(row) => row._id}
                    emptyMessage="No references found matching your filters."
                    renderItem={(row) => {
                        const markedToDetails = (row as any).markedToDetails;
                        const markedToEmails = Array.isArray(markedToDetails)
                            ? markedToDetails.map((d: any) => d.email)
                            : [markedToDetails?.email || (typeof row.markedTo === 'object' ? (row.markedTo as any)?.email : '')];

                        const isMarkedToMe = user?.email &&
                            row.status !== 'Closed' &&
                            markedToEmails.includes(user.email);

                        const detailsArr = Array.isArray((row as any).markedToDetails)
                            ? (row as any).markedToDetails as any[]
                            : [(row as any).markedToDetails].filter(Boolean);

                        return (
                            <ReferenceMobileCard
                                data={row}
                                isSelected={selectedIds.has(row._id)}
                                onToggleSelect={() => isMarkedToMe && handleSelectRow(row._id)}
                                disableSelection={!isMarkedToMe}
                                linkBaseUrl="/references/global"
                                statusRenderer={getStatusStyles}
                                additionalInfo={
                                    <>
                                        {detailsArr.length > 0 && (
                                            <div className="flex gap-1 justify-between">
                                                <div className="flex gap-1 overflow-hidden">
                                                    <span className="font-semibold text-gray-500 whitespace-nowrap">To:</span>
                                                    <span className="truncate">{detailsArr[0].fullName}{detailsArr.length > 1 ? ` +${detailsArr.length - 1}` : ''}</span>
                                                </div>
                                                {detailsArr[0].division && (
                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">
                                                        {detailsArr[0].division}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {row.createdByDetails && (
                                            <div className="flex gap-1">
                                                <span className="font-semibold text-gray-500">By:</span>
                                                <span className="truncate">{row.createdByDetails.fullName}</span>
                                            </div>
                                        )}
                                    </>
                                }
                            />
                        );
                    }}
                />
            </div >

            <AddGlobalReferenceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchReferencesFromBackend();
                    fetchStats();
                    setSelectedIds(new Set());
                }}
                defaultScope="inter-lab"
            />

            <BulkUpdateGlobalReferenceModal
                isOpen={isBulkAssignModalOpen}
                onClose={() => setIsBulkAssignModalOpen(false)}
                onSuccess={() => {
                    fetchReferencesFromBackend();
                    fetchStats();
                    setSelectedIds(new Set());
                }}
                selectedIds={Array.from(selectedIds)}
            />

            <UserProfileViewModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                userId={selectedUserId}
            />
        </>
    );
}

export default GlobalReferencesPage;
