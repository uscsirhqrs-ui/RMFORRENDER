/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getReferenceById, handleReopenAction, bulkUpdateReferences } from "../services/globalReferences.api";
import { getLocalReferenceById, bulkUpdateLocalReferences } from "../services/localReferences.api";
import { Eye, EyeOff, Archive, Undo2, Shield, Printer } from "lucide-react";
import { exportReferenceReportPDF } from "../utils/exportUtils";
import logo2 from "../assets/images/logo2.svg";
import type { Reference } from "../types/Reference.type";
import Button from "../components/ui/Button";
import { ArrowLeft, Flag, Globe, Building2 } from "lucide-react";
import UserProfileViewModal from "../components/ui/UserProfileViewModal";
import UpdateReferenceModal from "../components/ui/UpdateReferenceModal";
import IssueReminderModal from "../components/ui/IssueReminderModal";
import ReopenRequestModal from "../components/ui/ReopenRequestModal";
import { useAuth } from "../context/AuthContext";
import { FeatureCodes } from '../constants';
import { useMessageBox } from "../context/MessageBoxContext";

interface Movement {
    _id: string;
    reference: string;
    markedTo: any | any[]; // Can be single or array of users
    performedBy?: {
        _id: string;
        fullName: string;
        email: string;
    };
    statusOnMovement: string;
    remarks: string;
    movementDate: string;
    createdAt: string;
}

interface ReferenceDetailsResponse {
    reference: Reference;
    movements: Movement[];
    type?: string;
}

function ReferenceDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ReferenceDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [refType, setRefType] = useState<'GlobalReference' | 'LocalReference'>('GlobalReference');
    const [processingAction, setProcessingAction] = useState(false);
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

    // Track which movements have their admin lists expanded
    const { showMessage, showConfirm } = useMessageBox();
    const [expandedMovements, setExpandedMovements] = useState<Record<string, boolean>>({});
    const [showSidebarAdmins, setShowSidebarAdmins] = useState(false);

    const toggleMovementAdminList = (movementId: string) => {
        setExpandedMovements(prev => ({
            ...prev,
            [movementId]: !prev[movementId]
        }));
    };

    const { user: currentUser, hasPermission } = useAuth();
    const isAdmin = hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE) ||
        hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES) ||
        hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

    const location = useLocation();
    const isLocalPath = useMemo(() => location.pathname.includes('/local/'), [location.pathname]);

    const fetchDetails = useCallback(async (isInitialLoad = false) => {
        if (!id) return;
        try {
            if (isInitialLoad) setLoading(true);

            // Optimization: If we are on a specific route, try that first
            if (isLocalPath) {
                const localResponse = await getLocalReferenceById(id);
                if (localResponse.success && localResponse.data) {
                    setData(localResponse.data);
                    setRefType('LocalReference');
                    return;
                }
                // Fallback for unified robustness
                const globalResponse = await getReferenceById(id);
                if (globalResponse.success && globalResponse.data) {
                    setData(globalResponse.data);
                    setRefType('GlobalReference');
                    return;
                }
            } else {
                // Attempt Global first
                try {
                    const globalResponse = await getReferenceById(id);
                    if (globalResponse.success && globalResponse.data) {
                        setData(globalResponse.data);
                        setRefType('GlobalReference');
                        return;
                    }
                } catch (gErr) {
                    console.log("Global fetch failed, trying local fallback", gErr);
                }

                // Attempt Local second
                try {
                    const localResponse = await getLocalReferenceById(id);
                    if (localResponse.success && localResponse.data) {
                        setData(localResponse.data);
                        setRefType('LocalReference');
                        return;
                    }
                } catch (lErr) {
                    console.log("Local fetch failed", lErr);
                }
            }

            if (isInitialLoad) setError("Failed to load reference details");
        } catch (err) {
            if (isInitialLoad) setError("An error occurred while fetching details");
            console.error(err);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [id, isLocalPath]);

    useEffect(() => {
        fetchDetails(true);
    }, [fetchDetails]);



    const handleReopenRequestAction = async (action: 'approve' | 'reject') => {
        let reason = "";
        if (action === 'reject') {
            const input = window.prompt("Please enter a reason for rejection (optional):");
            if (input === null) return; // User cancelled
            reason = input;
        } else {
            const confirmed = await showConfirm({
                title: 'Confirm Approval',
                message: "Are you sure you want to approve this reopening request?",
                type: 'warning',
                confirmText: 'Approve',
                cancelText: 'Cancel'
            });
            if (!confirmed) return;
        }

        setProcessingAction(true);
        try {
            await handleReopenAction(id!, action, reason);
            fetchDetails(); // Refresh data
        } catch (err: any) {
            showMessage({ title: 'Error', message: err.message || `Failed to ${action} request`, type: 'error' });
        } finally {
            setProcessingAction(false);
        }
    };

    const handleAdminAction = async (action: 'hide' | 'unhide' | 'archive' | 'unarchive') => {
        if (!id) return;
        const confirmed = await showConfirm({
            title: `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            message: `Are you sure you want to ${action} this reference?`,
            type: 'warning',
            confirmText: 'Yes, proceed',
            cancelText: 'No'
        });
        if (!confirmed) return;

        setProcessingAction(true);
        try {
            const res = refType === 'GlobalReference'
                ? await bulkUpdateReferences([id], action)
                : await bulkUpdateLocalReferences([id], action);

            if (res.success) {
                fetchDetails();
            } else {
                showMessage({ title: 'Action Failed', message: res.message || "Action failed", type: 'error' });
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || "An error occurred";
            showMessage({ title: 'Error', message: errorMessage, type: 'error' });
        } finally {
            setProcessingAction(false);
        }
    };

    const handlePrint = async () => {
        if (!data) return;
        const { reference, movements } = data;
        const filename = `${reference.refId || 'Reference'}-Report`;
        const title = `${refType === 'LocalReference' ? 'Local' : 'Global'} Reference Movement Report`;
        const exportedBy = currentUser ? `${currentUser.fullName} (${currentUser.email})` : 'System';

        await exportReferenceReportPDF(reference, movements, title, filename, exportedBy, logo2, printOrientation);
    };

    const openUserProfile = (userId: string) => {
        if (userId) {
            setSelectedUserId(userId);
            setIsProfileModalOpen(true);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!data) return <div className="p-8 text-center">Reference not found</div>;

    const { reference, movements } = data;

    const getUserDisplayName = (user: any) => {
        if (!user) return "Unknown User";
        if (typeof user === 'string') return user;
        const name = user.fullName || "Unknown User";
        const designation = user.designation ? `, ${user.designation}` : "";
        const lab = user.labName ? ` (${user.labName})` : "";
        return `${name}${designation}${lab}`;
    };

    const getUserId = (user: any) => {
        if (!user) return null;
        if (typeof user === 'string') return user;
        return user._id;
    };

    const canUpdate = isAdmin || (
        currentUser?._id &&
        reference.markedTo &&
        (Array.isArray(reference.markedTo)
            ? reference.markedTo.some(m => {
                const id = typeof m === 'object' && m !== null ? (m as any)._id : m;
                return String(id) === String(currentUser._id);
            })
            : (typeof reference.markedTo === 'object' && reference.markedTo !== null
                ? String((reference.markedTo as any)._id) === String(currentUser._id)
                : String(reference.markedTo) === String(currentUser._id)))
    );

    const getWorkflowUsers = () => {
        const uniqueUsers = new Map<string, any>();

        // Helper to add user
        const addUser = (u: any) => {
            if (!u) return;
            if (Array.isArray(u)) {
                u.forEach(item => addUser(item));
                return;
            }
            if (u && typeof u === 'object' && (u._id || u.id)) {
                uniqueUsers.set(String(u._id || u.id), u);
            }
        };

        // Add users from movements
        if (movements) {
            movements.forEach(m => {
                if (Array.isArray(m.markedTo)) {
                    m.markedTo.forEach((u: any) => addUser(u));
                } else {
                    addUser(m.markedTo);
                }
                addUser(m.performedBy);
            });
        }

        // Add creator and current assignee
        addUser(reference.createdBy);
        addUser(reference.markedTo);

        return Array.from(uniqueUsers.values());
    };

    const workflowUsers = getWorkflowUsers();

    return (
        <div className="container mx-auto p-4">
            {/* Back button and Print Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <button
                    onClick={() => {
                        navigate(-1);
                    }}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">{refType === 'LocalReference' ? 'Back to Local References' : 'Back to Global References'}</span>
                </button>

                {/* Orientation Selection & Print Action */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
                        <button
                            onClick={() => setPrintOrientation('portrait')}
                            className={`flex-1 sm:px-3 py-1.5 text-xs rounded-md transition-all ${printOrientation === 'portrait' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Portrait Mode"
                        >
                            Portrait
                        </button>
                        <button
                            onClick={() => setPrintOrientation('landscape')}
                            className={`flex-1 sm:px-3 py-1.5 text-xs rounded-md transition-all ${printOrientation === 'landscape' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Landscape Mode"
                        >
                            Landscape
                        </button>
                    </div>

                    <Button
                        label="Print"
                        variant="secondary"
                        className="h-9 sm:h-10 w-full sm:w-32 shadow-lg shadow-gray-200/50 hover:shadow-gray-300/50 whitespace-nowrap font-heading text-sm font-semibold border-gray-200 bg-white text-gray-700 uppercase tracking-wider"
                        icon={<Printer className="w-4 h-4" />}
                        onClick={handlePrint}
                    />
                </div>
            </div>

            {/* Reopen Request Banner - Visible to Admins AND Requester */}
            {reference.reopenRequest && reference.status === 'Closed' && (
                <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
                    <div className="flex items-start">
                        <div className="shrink-0">
                            <span className="text-2xl">🔔</span>
                        </div>
                        <div className="ml-3 w-full">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg leading-6 font-medium text-orange-800">
                                    Reopening Request Pending
                                </h3>
                                {reference.reopenRequest?.requestId && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        ID: {reference.reopenRequest?.requestId}
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-sm text-orange-700">
                                <p>
                                    <button
                                        onClick={() => openUserProfile(getUserId(reference.reopenRequest?.requestedBy))}
                                        className="font-bold hover:text-orange-900 hover:underline text-left inline"
                                    >
                                        {getUserDisplayName(reference.reopenRequest.requestedBy)}
                                    </button> has requested to reopen this reference.
                                </p>
                                <p className="mt-1">
                                    <strong>Reason:</strong> {reference.reopenRequest.reason}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    Requested on: {new Date(reference.reopenRequest.requestedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="mt-4">
                                {isAdmin ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleReopenRequestAction('approve')}
                                            disabled={processingAction}
                                            className="px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-green-700 shadow-sm transition-all flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {processingAction ? "Approving..." : "Approve"}
                                        </button>
                                        <button
                                            onClick={() => handleReopenRequestAction('reject')}
                                            disabled={processingAction}
                                            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-rose-700 shadow-sm transition-all flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {processingAction ? "Rejecting..." : "Reject"}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600 italic">
                                        The request to reopen this reference is pending for approval.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Movement Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1 animate-text-gradient">Movement Flow</h2>
                                <p className="text-gray-500 text-sm">Chronological history of the reference.</p>
                            </div>
                            {/* Reminder / Reopen Request Button */}
                            {(isAdmin || (currentUser?._id && movements?.some(m =>
                                (m.markedTo?._id === currentUser._id) || (m.performedBy?._id === currentUser._id)
                            )) || (currentUser?._id && reference.createdBy && (typeof reference.createdBy === 'object' ? reference.createdBy._id === currentUser._id : reference.createdBy === currentUser._id))) && (
                                    <div className="w-full sm:w-auto">
                                        {reference.status === 'Closed' ? (
                                            /* HIDE BUTTON if Admin OR if Request is already Pending */
                                            !isAdmin && !reference.reopenRequest && (
                                                <Button
                                                    label="Reopening Request"
                                                    className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white hover:bg-orange-700 shadow-sm text-sm font-bold uppercase tracking-wider"
                                                    onClick={() => setIsReopenModalOpen(true)}
                                                />
                                            )
                                        ) : (
                                            <Button
                                                label="Issue Reminder / Seek Inputs"
                                                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm text-sm font-bold uppercase tracking-wider"
                                                onClick={() => setIsReminderModalOpen(true)}
                                            />
                                        )}
                                    </div>
                                )}
                        </div>

                        <div className="relative overflow-visible">
                            {/* Vertical Line */}
                            <div className="absolute left-6 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-100 italic"></div>

                            <div className="space-y-8">
                                {movements && movements.map((movement) => (
                                    <div key={movement._id} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 group">
                                        {/* Status Circle */}
                                        <div className="flex-none flex sm:block items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-4 border-white ring-1 ring-gray-100"
                                                style={{ backgroundColor: '#a855f7' }}
                                            >
                                                {((movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo))?.fullName?.substring(0, 2).toUpperCase()) || "NA"}
                                            </div>
                                            {/* Date for mobile - beside avatar */}
                                            <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                {new Date(movement.movementDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="grow">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 flex flex-wrap">
                                                        <button
                                                            onClick={() => openUserProfile(getUserId(movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo)))}
                                                            className="hover:text-indigo-600 hover:underline text-left font-semibold wrap-break-word"
                                                        >
                                                            {getUserDisplayName(movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo))}
                                                        </button>
                                                    </h3>
                                                    <div className="inline-flex items-center gap-1 mt-1">
                                                        <span className="w-2 h-2 rounded-full border border-red-500 flex items-center justify-center">
                                                            <span className="w-1 h-1 rounded-full bg-red-500"></span>
                                                        </span>
                                                        <span className="text-sm text-gray-600 font-semibold">{movement.statusOnMovement}</span>
                                                    </div>
                                                    {movement.performedBy && (
                                                        <div className="text-xs text-gray-500 mt-2 mb-1">
                                                            <span>Next marked to: </span>
                                                            {Array.isArray(movement.markedTo) && movement.markedTo.length > 1 ? (
                                                                <div className="inline-block relative">
                                                                    <button
                                                                        onClick={() => toggleMovementAdminList(movement._id)}
                                                                        className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                                                    >
                                                                        All Relevant Administrators ({movement.markedTo.length})
                                                                        {currentUser?._id && Array.isArray(movement.markedTo) && movement.markedTo.some(m => String(getUserId(m)) === String(currentUser._id)) && (
                                                                            <Flag className="w-2.5 h-2.5 text-red-500 animate-bounce" fill="currentColor" />
                                                                        )}
                                                                    </button>
                                                                    {expandedMovements[movement._id] && (
                                                                        <div className="absolute z-10 left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[250px] max-h-[200px] overflow-y-auto">
                                                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2 border-b pb-1">Assigned Admins</p>
                                                                            <div className="space-y-1.5">
                                                                                {movement.markedTo.map((m: any, idx: number) => (
                                                                                    <div key={m._id || idx} className="flex flex-col">
                                                                                        <button
                                                                                            onClick={() => openUserProfile(getUserId(m))}
                                                                                            className="text-xs text-indigo-600 hover:underline text-left font-medium"
                                                                                        >
                                                                                            {m.fullName || "Unknown Admin"}
                                                                                        </button>
                                                                                        <span className="text-[10px] text-gray-400 italic">
                                                                                            {m.designation || "Admin"} ({m.labName || "CSIR"})
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openUserProfile(getUserId(Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo))}
                                                                    className="hover:text-indigo-600 hover:underline text-left text-indigo-600 font-medium"
                                                                >
                                                                    {getUserDisplayName(Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo)}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(movement.movementDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 rounded-md p-3 mt-2 border border-gray-100">
                                                <p className="text-gray-700 text-sm">{movement.remarks || "No remarks provided."}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(!movements || movements.length === 0) && (
                                    <div className="pl-16 text-gray-500 italic">No movements recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Reference Details Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 lg:sticky lg:top-6">
                        {/* Details Header - Stacked on mobile */}
                        <div className="flex flex-col gap-6 mb-8">
                            {/* Title and Info Area */}
                            <div className="space-y-4">
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight tracking-tight wrap-break-word">{reference.subject}</h1>

                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Reference ID</span>
                                            <span className="text-sm font-semibold text-gray-700 wrap-break-word">{reference.refId || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Mode Sent</span>
                                            <span className="text-sm font-semibold text-gray-700">{reference.deliveryMode || 'N/A'}</span>
                                        </div>
                                        {reference.deliveryMode && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                    {reference.deliveryMode === 'Eoffice' ? 'Issue No' : 'Sent To'}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-700 wrap-break-word">{reference.deliveryDetails || 'N/A'}</span>
                                            </div>
                                        )}
                                        {reference.sentAt && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Sent Date</span>
                                                <span className="text-sm font-semibold text-gray-700">{new Date(reference.sentAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {reference.eofficeNo && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">E-office No</span>
                                                <span className="text-sm font-semibold text-gray-700 break-all">{reference.eofficeNo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        {reference.status}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-wider">
                                        {reference.priority === 'High' ? '↑' : reference.priority === 'Medium' ? '→' : '↓'} {reference.priority} Priority
                                    </span>
                                </div>
                            </div>

                            {/* Actions Area */}
                            <div className="flex flex-row items-center justify-between gap-4 pt-4 border-t border-gray-50">
                                <Button
                                    label="Update Reference"
                                    variant="primary"
                                    className="flex-1 h-11 shadow-lg shadow-indigo-500/20 font-heading text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                                    onClick={() => setIsUpdateModalOpen(true)}
                                    disabled={!canUpdate}
                                />
                                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold border shadow-sm ${refType === 'LocalReference'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}>
                                    {refType === 'LocalReference' ? <Building2 className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    <span className="hidden sm:inline italic">Type: </span>
                                    {refType === 'LocalReference' ? 'Local Ref' : 'Global Ref'}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-indigo-700 mb-1 flex items-center gap-2">
                                <span>Latest Remarks :</span>
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
                                {reference.remarks || "No description provided."}
                            </p>
                        </div>

                        {isAdmin && (
                            <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> Admin Oversight
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {reference.isHidden ? (
                                        <Button
                                            label="Unhide"
                                            variant="secondary"
                                            className="h-8 text-[10px] font-bold uppercase"
                                            icon={<Eye className="w-3.5 h-3.5" />}
                                            onClick={() => handleAdminAction('unhide')}
                                            disabled={processingAction}
                                        />
                                    ) : (
                                        <Button
                                            label="Hide"
                                            variant="secondary"
                                            className="h-8 text-[10px] font-bold uppercase"
                                            icon={<EyeOff className="w-3.5 h-3.5" />}
                                            onClick={() => handleAdminAction('hide')}
                                            disabled={processingAction}
                                        />
                                    )}

                                    {reference.isArchived ? (
                                        <Button
                                            label="Restore"
                                            variant="secondary"
                                            className="h-8 text-[10px] font-bold uppercase"
                                            icon={<Undo2 className="w-3.5 h-3.5" />}
                                            onClick={() => handleAdminAction('unarchive')}
                                            disabled={processingAction}
                                        />
                                    ) : (
                                        <Button
                                            label="Archive"
                                            variant="secondary"
                                            className="h-8 text-[10px] font-bold uppercase"
                                            icon={<Archive className="w-3.5 h-3.5" />}
                                            onClick={() => handleAdminAction('archive')}
                                            disabled={processingAction}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="w-4">📅</span>
                                <span>Created: {new Date(reference.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-gray-600">
                                <span className="w-4 mt-0.5">👤</span>
                                <div className="flex-1">
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Created by:</p>
                                    <button
                                        onClick={() => openUserProfile(getUserId(reference.createdBy))}
                                        className="text-sm font-medium hover:text-indigo-600 hover:underline text-left inline wrap-break-word"
                                    >
                                        {getUserDisplayName(reference.createdBy)}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-gray-600">
                                <span className="w-4 mt-0.5">📥</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-400 leading-none mb-1 flex items-center gap-2">
                                        <span className="animate-text-gradient font-bold uppercase tracking-widest text-[10px]">Currently Marked to:</span>
                                    </p>
                                    <div className="block mt-1">
                                        {Array.isArray(reference.markedTo) && reference.markedTo.length > 1 ? (
                                            <div className="inline-block w-full">
                                                <button
                                                    onClick={() => setShowSidebarAdmins(!showSidebarAdmins)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1.5 text-sm"
                                                >
                                                    All Relevant Administrators ({reference.markedTo.length})
                                                    {currentUser?._id && reference.markedTo.some(m => String(getUserId(m)) === String(currentUser._id)) && reference.status !== 'Closed' && (
                                                        <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                                    )}
                                                </button>
                                                {showSidebarAdmins && (
                                                    <div className="mt-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {(reference.markedToDetails as any[])?.map((admin: any, idx: number) => (
                                                            <button
                                                                key={admin._id || idx}
                                                                onClick={() => openUserProfile(getUserId(admin))}
                                                                className="text-xs text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
                                                            >
                                                                {admin.fullName || admin.email}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => openUserProfile(getUserId(Array.isArray(reference.markedTo) ? reference.markedTo[0] : reference.markedTo))}
                                                    className="text-sm text-gray-600 hover:text-indigo-600 hover:underline text-left leading-snug wrap-break-word"
                                                >
                                                    {getUserDisplayName(Array.isArray(reference.markedTo) ? reference.markedTo[0] : reference.markedTo)}
                                                </button>
                                                {currentUser?._id && reference.markedTo && reference.status !== 'Closed' && (
                                                    (Array.isArray(reference.markedTo)
                                                        ? reference.markedTo.some(m => String(getUserId(m)) === String(currentUser._id))
                                                        : String(getUserId(reference.markedTo)) === String(currentUser._id)) && (
                                                        <Flag className="w-3 h-3 text-red-500 animate-bounce" fill="currentColor" />
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center animate-text-gradient">
                        <p className="text-[11px] text-slate-400 mb-4 italic px-2 wrap-break-word">Update button will be enabled only if the reference is currently assigned to you</p>
                        <p className="text-[11px] font-bold text-slate-300 px-2 wrap-break-word">© {new Date().getFullYear()} Council of Scientific & Industrial Research</p>
                    </div>
                </div>
            </div>

            <UpdateReferenceModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onSuccess={() => fetchDetails(false)}
                reference={reference}
                referenceType={refType}
            />
            <IssueReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                reference={reference}
                workflowUsers={workflowUsers}
                referenceType={refType}
            />
            <ReopenRequestModal
                isOpen={isReopenModalOpen}
                onClose={() => setIsReopenModalOpen(false)}
                reference={reference}
                onSuccess={() => fetchDetails(false)}
                referenceType={refType}
            />

            <UserProfileViewModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                userId={selectedUserId}
            />
        </div>
    );
}

export default ReferenceDetailsPage;
