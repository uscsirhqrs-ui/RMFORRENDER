/**
 * @fileoverview React Component - Page for managing Local References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import {
    Plus,
    Search,
    FolderOpen,
    Clock,
    CheckCircle2,
    Flag,
    AlertCircle,
    EyeOff,
    Archive,
    Building2
} from "lucide-react";
import Button from "../../components/ui/Button";
import StatusCard from "../../components/dashboard/StatusCard";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo2 from "../../assets/images/logo2.svg";

import { getAllLocalReferences, getLocalDashboardStats, getLocalReferenceFilters } from "../../services/localReferences.api";
import type { Reference } from "../../types/Reference.type";
import Table from "../../components/ui/Table";
import AddLocalReferenceModal from "../../components/ui/AddLocalReferenceModal";
import UserProfileViewModal from "../../components/ui/UserProfileViewModal";
import ColumnVisibilityDropdown from "../../components/ui/ColumnVisibilityDropdown";
import DropdownWithCheckboxes from "../../components/ui/DropDownWithCheckBoxes";
import { MobileCardList } from "../../components/ui/MobileCardList";
import { ReferenceMobileCard } from "../../components/ui/ReferenceMobileCard";
import { useAuth } from "../../context/AuthContext";
import BulkUpdateLocalReferenceModal from "../../components/ui/BulkUpdateLocalReferenceModal";
import ExportButton from "../../components/ui/ExportButton";

function LocalReferencesPage() {
    const { user } = useAuth();
    const [references, setReferences] = useState<Reference[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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




    // Filters
    const [availableCreatedByUsers, setAvailableCreatedByUsers] = useState<any[]>([]);
    const [availableMarkedToUsers, setAvailableMarkedToUsers] = useState<any[]>([]);
    const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
    const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
    const [availablePriorities, setAvailablePriorities] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [selectedMarkedTo, setSelectedMarkedTo] = useState<string[]>([]);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState<string[]>([]);
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
    const [subjectFilter, setSubjectFilter] = useState("");
    const [pendingDaysFilter, setPendingDaysFilter] = useState<number | "">("");

    // Active Dashboard Card State
    const [activeCard, setActiveCard] = useState<'open' | 'high' | 'pending' | 'closed' | 'markedToMe' | 'pendingDivision' | null>(null);

    // Pagination & Sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReferences, setTotalReferences] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

    const allHeaders = ['selection', 'refId', 'subject', 'status', 'priority', 'createdBy', 'markedTo', 'markedToDivision', 'createdAt'];

    useEffect(() => {
        if (visibleColumns.length === 0) {
            setVisibleColumns(allHeaders);
        }
    }, [allHeaders]);

    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentPage, rowsPerPage, selectedStatuses, selectedPriorities, selectedMarkedTo, selectedCreatedBy, selectedDivisions, subjectFilter, pendingDaysFilter, sortConfig]);


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

    const fetchReferences = async () => {
        try {
            setLoading(true);
            const filters = {
                status: selectedStatuses,
                priority: selectedPriorities,
                markedTo: selectedMarkedTo,
                createdBy: selectedCreatedBy,
                division: selectedDivisions,
                subject: subjectFilter,
                pendingDays: pendingDaysFilter
            };

            const sort = sortConfig ? {
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction
            } : {};

            const response = await getAllLocalReferences(currentPage, rowsPerPage, filters, sort);

            if (response && response.data) {
                setReferences(response.data.data);
                setTotalPages(response.data.pagination?.totalPages || 1);
                setTotalReferences(response.data.pagination?.total || 0);
            }
        } catch (err) {
            console.error("Error fetching local references:", err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchReferences();
    }, [currentPage, rowsPerPage, selectedStatuses, selectedPriorities, selectedMarkedTo, selectedCreatedBy, selectedDivisions, subjectFilter, pendingDaysFilter, sortConfig]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await getLocalDashboardStats();
            if (res.success && res.data) {
                setStats(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch local stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);



    useEffect(() => {
        const fetchFilters = async () => {
            const res = await getLocalReferenceFilters();
            if (res.success && res.data) {
                if (res.data.createdByUsers) {
                    setAvailableCreatedByUsers(res.data.createdByUsers.filter((u: any) => u.labName === user?.labName));
                }
                if (res.data.markedToUsers) {
                    setAvailableMarkedToUsers(res.data.markedToUsers.filter((u: any) => u.labName === user?.labName));
                }
                if (res.data.divisions) setAvailableDivisions(res.data.divisions);
                if (res.data.statuses) setAvailableStatuses(res.data.statuses);
                if (res.data.priorities) setAvailablePriorities(res.data.priorities);
            }
        };
        fetchFilters();
    }, [user?.labName]);

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'in progress': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'open': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'closed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority?.toLowerCase()) {
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

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-lg text-gray-600 animate-pulse font-heading">Loading Local Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                <StatusCard
                    info={{
                        title: "Open References",
                        refcount: statsLoading ? undefined : stats.openCount,
                        icon: <FolderOpen className="w-5 h-5 text-blue-600" />,
                    }}
                    onClick={() => handleStatusCardClick('open')}
                    isActive={activeCard === 'open'}
                    loading={statsLoading}
                    additionalInfo={stats.openCount > 0 ? "Active lab references" : "No active references"}
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
                    additionalInfo={stats.markedToUserCount > 0 ? "Requires your attention" : "No pending items"}
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
                    additionalInfo={stats.pendingInDivisionCount > 0 ? `Pending in ${user?.division || 'my division'}` : "No pending items"}
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
                    additionalInfo={stats.highPriorityCount > 0 ? "Urgent references" : "No urgent items"}
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
                    additionalInfo={stats.pending7DaysCount > 0 ? "Delayed references" : "No delayed items"}
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
                    additionalInfo={stats.closedThisMonthCount > 0 ? "Completed this month" : "None closed recently"}
                />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 pb-2">
                <div className="flex flex-1 items-center gap-4 md:gap-6 w-full">
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight font-heading flex items-center gap-2 whitespace-nowrap mb-0 ">
                        <Building2 className="w-6 h-6 text-indigo-600 " />
                        Local References
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
                        filename={`Local-References-${user?.labName}`}
                        title={`Local References - ${user?.labName}`}
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
                                pendingDays: pendingDaysFilter
                            };
                            const res = await getAllLocalReferences(1, 10000, filters, sortConfig ? { sortBy: sortConfig.key, sortOrder: sortConfig.direction } : {});
                            return res.data?.data || [];
                        }}
                        logoUrl={logo2}
                        className="h-10 px-6 shadow-lg shadow-gray-200/50 hover:shadow-gray-300/50 whitespace-nowrap font-heading text-sm font-semibold border-gray-200 bg-white text-gray-700"
                    />
                    <Button
                        variant="primary"
                        label="Add New Local Ref"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-10 px-6 shadow-lg shadow-indigo-500/20 whitespace-nowrap font-heading text-sm font-semibold"
                    />
                </div>
            </div>

            <div className="-mt-4 pb-2">
                <p className="text-gray-500 text-xs font-heading">
                    Manage references within <span className="font-bold text-indigo-600 uppercase">{user?.labName}</span>
                    {stats.totalReferences > 0 && <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest font-bold shadow-sm">
                        Total: {totalReferences} of {stats.totalReferences}
                    </span>}
                </p>
            </div>

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
                        options={availableStatuses.map(s => ({ label: s, value: s }))}
                        selectedValues={selectedStatuses}
                        onChange={(vals) => { setSelectedStatuses(vals); setActiveCard(null); }}
                    />

                    <DropdownWithCheckboxes
                        name="Priority"
                        options={availablePriorities.map(p => ({ label: p, value: p }))}
                        selectedValues={selectedPriorities}
                        onChange={(vals) => { setSelectedPriorities(vals); setActiveCard(null); }}
                    />

                    <DropdownWithCheckboxes
                        name="Creator"
                        options={availableCreatedByUsers.map(u => ({ label: u.fullName, value: u.email }))}
                        selectedValues={selectedCreatedBy}
                        onChange={setSelectedCreatedBy}
                    />

                    <DropdownWithCheckboxes
                        name="To User"
                        options={availableMarkedToUsers.map(u => ({ label: u.fullName, value: u.email }))}
                        selectedValues={selectedMarkedTo}
                        onChange={setSelectedMarkedTo}
                    />

                    <DropdownWithCheckboxes
                        name="Division"
                        options={availableDivisions.map(div => ({ label: div, value: div }))}
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
                            label="Mark To..."
                            onClick={() => setIsBulkAssignModalOpen(true)}
                            className="h-8 px-4 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-none"
                        />
                    </div>
                </div>
            )}

            {/* Current Filters Display */}
            {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedMarkedTo.length > 0 || selectedDivisions.length > 0 || subjectFilter || pendingDaysFilter) && (
                <div className="flex flex-wrap items-center gap-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-300 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-heading mr-2">Filters:</span>

                    {selectedStatuses.map(status => (
                        <span key={status} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(status)}`}>
                            {status}
                        </span>
                    ))}

                    {selectedPriorities.map(priority => (
                        <span key={priority} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyles(priority)}`}>
                            {priority}
                        </span>
                    ))}

                    {selectedMarkedTo.map(email => {
                        const u = availableMarkedToUsers.find(user => user.email === email);
                        return (
                            <span key={email} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                To: {u ? u.fullName : email}
                            </span>
                        );
                    })}

                    {selectedCreatedBy.map(email => {
                        const u = availableCreatedByUsers.find(user => user.email === email);
                        return (
                            <span key={email} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                By: {u ? u.fullName : email}
                            </span>
                        );
                    })}

                    {selectedDivisions.map(div => (
                        <span key={div} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-100">
                            Div: {div}
                        </span>
                    ))}

                    {subjectFilter && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-gray-50 text-gray-700 border-gray-100">
                            Subject: "{subjectFilter}"
                        </span>
                    )}

                    {pendingDaysFilter && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-100">
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
                    <Table<Reference>
                        rows={references}
                        visibleColumns={visibleColumns}
                        columnWidths={{ selection: '48px', refId: '120px', subject: '350px' }}
                        sortConfig={sortConfig}
                        onSort={(key, dir) => setSortConfig({ key, direction: dir })}
                        customHeaderRenderers={{
                            selection: () => {
                                const actionableReferences = references.filter(r => {
                                    const markedToDetails = (r as any).markedToDetails;
                                    const markedToEmails = Array.isArray(markedToDetails)
                                        ? markedToDetails.map((d: any) => d.email)
                                        : [markedToDetails?.email || (typeof r.markedTo === 'object' ? (r.markedTo as any)?.email : '')];

                                    return user?.email && r.status !== 'Closed' && markedToEmails.includes(user.email);
                                });

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
                            selection: (row: any) => {
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
                            refId: (row: any) => (
                                <Link to={`/references/local/${row._id}`} className="text-indigo-600 font-bold text-xs hover:underline">
                                    {row.refId}
                                </Link>
                            ),
                            subject: (row: any) => {
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
                                                to={`/references/local/${row._id}`}
                                                className="font-bold text-gray-900 hover:text-indigo-600 transition-colors truncate block leading-none font-heading text-sm"
                                                title={row.subject}
                                            >
                                                {row.subject}
                                            </Link>
                                            {isPendingWithMe && (
                                                <div className="relative group shrink-0" title="Pending with me">
                                                    <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                                </div>
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
                            status: (row: any) => (
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getStatusStyles(row.status)}`}>
                                    <span className="h-1 w-1 rounded-full bg-current" />
                                    {row.status}
                                </span>
                            ),
                            priority: (row: any) => (
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getPriorityStyles(row.priority)}`}>
                                    <span className="text-[10px]">{row.priority?.toLowerCase() === 'high' ? '↑' : row.priority?.toLowerCase() === 'low' ? '↓' : '→'}</span>
                                    {row.priority}
                                </span>
                            ),
                            markedTo: (row: any) => {
                                const detailsArr = Array.isArray((row as any).markedToDetails)
                                    ? (row as any).markedToDetails as any[]
                                    : [(row as any).markedToDetails].filter(Boolean);

                                if (detailsArr.length === 0) return <span className="text-xs text-gray-400">Unmarked</span>;

                                const firstDetail = detailsArr[0];
                                const moreCount = detailsArr.length - 1;
                                const isSelf = user?.email && detailsArr.some(d => d.email === user.email);
                                const userId = typeof row.markedTo === 'string' ? row.markedTo : (Array.isArray(row.markedTo) ? (typeof row.markedTo[0] === 'string' ? row.markedTo[0] : (row.markedTo[0] as any)?._id) : (row.markedTo as any)?._id);

                                return (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (userId) {
                                                    setSelectedProfileUserId(userId);
                                                    setIsProfileModalOpen(true);
                                                }
                                            }}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
                                            title={detailsArr.map(d => `${d.fullName}${d.designation ? `, ${d.designation}` : ""} (${d.labName || 'N/A'})`).join('\n')}
                                        >
                                            {firstDetail.fullName}{moreCount > 0 ? ` +${moreCount}` : ""}
                                        </button>
                                        {isSelf && row.status !== 'Closed' && (
                                            <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                        )}
                                    </div>
                                );
                            },
                            createdBy: (row: any) => {
                                const userId = typeof row.createdBy === 'string' ? row.createdBy : row.createdBy?._id;
                                return (
                                    <button
                                        onClick={() => {
                                            if (userId) {
                                                setSelectedProfileUserId(userId);
                                                setIsProfileModalOpen(true);
                                            }
                                        }}
                                        className="text-xs text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
                                        title={`${row.createdByDetails?.fullName}${row.createdByDetails?.designation ? `, ${row.createdByDetails?.designation}` : ""} (${row.createdByDetails?.labName || 'N/A'})`}
                                    >
                                        {row.createdByDetails?.fullName || 'N/A'}
                                    </button>
                                );
                            },
                            createdAt: (row: any) => (
                                <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                    {new Date(row.createdAt).toLocaleDateString()}
                                </span>
                            )
                        }}
                    />
                )}
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
                            linkBaseUrl="/references/local"
                            statusRenderer={getStatusStyles}
                            additionalInfo={
                                <>
                                    {detailsArr.length > 0 && (
                                        <div className="flex gap-1">
                                            <span className="font-semibold text-gray-500">To:</span>
                                            <span className="truncate">{detailsArr[0].fullName}{detailsArr.length > 1 ? ` +${detailsArr.length - 1}` : ''}</span>
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

            {/* Pagination */}
            {references.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 pb-2 border-t border-gray-100 mt-8">
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

            <AddLocalReferenceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchReferences();
                    fetchStats();
                }}
            />

            <BulkUpdateLocalReferenceModal
                isOpen={isBulkAssignModalOpen}
                onClose={() => setIsBulkAssignModalOpen(false)}
                onSuccess={() => {
                    fetchReferences();
                    setSelectedIds(new Set());
                }}
                selectedIds={Array.from(selectedIds)}
            />

            <UserProfileViewModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                userId={selectedProfileUserId}
            />
        </div>
    );
}

export default LocalReferencesPage;
