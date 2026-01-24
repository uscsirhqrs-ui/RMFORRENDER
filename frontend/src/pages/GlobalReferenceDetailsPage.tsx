/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReferenceById, handleReopenAction, bulkUpdateReferences } from "../services/globalReferences.api";
import { Eye, EyeOff, Archive, Undo2, Shield } from "lucide-react";
import type { Reference } from "../types/Reference.type";
import Button from "../components/ui/Button";
import { ArrowLeft, Globe } from "lucide-react";
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
    markedTo: any | any[];
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

function GlobalReferenceDetailsPage() {
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
    const [processingAction, setProcessingAction] = useState(false);

    const { showMessage, showConfirm } = useMessageBox();


    const { user: currentUser, hasPermission } = useAuth();
    const isAdmin = hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

    const fetchDetails = useCallback(async (isInitialLoad = false) => {
        if (!id) return;
        try {
            if (isInitialLoad) setLoading(true);

            const response = await getReferenceById(id);
            if (response.success && response.data) {
                setData(response.data);
                console.log("Global Reference data loaded");
            } else {
                if (isInitialLoad) setError("Failed to load reference details");
                else console.error("Failed to load reference details", response);
            }

        } catch (err) {
            if (isInitialLoad) setError("An error occurred while fetching details");
            console.error(err);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [id]);

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
            fetchDetails();
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
            const res = await bulkUpdateReferences([id], action);

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
        addUser(reference.createdBy);
        addUser(reference.markedTo);
        return Array.from(uniqueUsers.values());
    };

    const workflowUsers = getWorkflowUsers();

    return (
        <div className="container mx-auto p-4">
            <button
                onClick={() => {
                    navigate('/references/global');
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Global References
            </button>

            {/* Reopen Request Banner */}
            {reference.reopenRequest && reference.status === 'Closed' && (
                <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
                    <div className="flex items-start">
                        <div className="shrink-0">
                            <span className="text-2xl">🔔</span>
                        </div>
                        <div className="ml-3 w-full">
                            <h3 className="text-lg leading-6 font-medium text-orange-800">
                                Reopening Request Pending
                            </h3>
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
                            </div>
                            {isAdmin && (
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={() => handleReopenRequestAction('approve')}
                                        disabled={processingAction}
                                        className="px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {processingAction ? "Approving..." : "Approve"}
                                    </button>
                                    <button
                                        onClick={() => handleReopenRequestAction('reject')}
                                        disabled={processingAction}
                                        className="px-4 py-2 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-rose-700 disabled:bg-gray-400"
                                    >
                                        {processingAction ? "Rejecting..." : "Reject"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-1 animate-text-gradient">Movement Flow</h2>
                                <p className="text-gray-500 text-sm">Chronological history of the reference.</p>
                            </div>
                            {(isAdmin || (currentUser?._id && movements?.some(m =>
                                (m.markedTo?._id === currentUser._id) || (m.performedBy?._id === currentUser._id)
                            )) || (currentUser?._id && reference.createdBy && (typeof reference.createdBy === 'object' ? reference.createdBy._id === currentUser._id : reference.createdBy === currentUser._id))) && (
                                    <>
                                        {reference.status === 'Closed' ? (
                                            !isAdmin && !reference.reopenRequest && (
                                                <Button
                                                    label="Send Reopening Request"
                                                    className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 shadow-sm text-sm font-medium"
                                                    onClick={() => setIsReopenModalOpen(true)}
                                                />
                                            )
                                        ) : (
                                            <Button
                                                label="Issue Reminder / Seek Inputs"
                                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm text-sm font-medium"
                                                onClick={() => setIsReminderModalOpen(true)}
                                            />
                                        )}
                                    </>
                                )}
                        </div>

                        <div className="relative">
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            <div className="space-y-8">
                                {movements && movements.map((movement) => (
                                    <div key={movement._id} className="relative flex gap-6">
                                        <div className="flex-none">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#a855f7' }}>
                                                {((movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo))?.fullName?.substring(0, 2).toUpperCase()) || "NA"}
                                            </div>
                                        </div>
                                        <div className="grow">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        <button onClick={() => openUserProfile(getUserId(movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo)))} className="hover:text-indigo-600 hover:underline text-left font-semibold">
                                                            {getUserDisplayName(movement.performedBy || (Array.isArray(movement.markedTo) ? movement.markedTo[0] : movement.markedTo))}
                                                        </button>
                                                    </h3>
                                                    <div className="inline-flex items-center gap-1 mt-1">
                                                        <span className="w-2 h-2 rounded-full border border-red-500 flex items-center justify-center"><span className="w-1 h-1 rounded-full bg-red-500"></span></span>
                                                        <span className="text-sm text-gray-600 font-semibold">{movement.statusOnMovement}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(movement.movementDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 rounded-md p-3 mt-2 border border-gray-100">
                                                <p className="text-gray-700 text-sm">{movement.remarks || "No remarks provided."}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!movements || movements.length === 0) && <div className="pl-16 text-gray-500 italic">No movements recorded yet.</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                        <div className="flex justify-between items-stretch mb-6">
                            <div className="flex-1 min-w-0 pr-4 flex flex-col gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 wrap-break-word mr-2">{reference.subject}</h1>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                                        <p className="text-sm text-gray-500"><span className="font-medium mr-1">Ref ID:</span>{reference.refId || 'N/A'}</p>
                                        <p className="text-sm text-gray-500"><span className="font-medium mr-1">Mode:</span>{reference.deliveryMode || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-auto">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        {reference.status}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${reference.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                        {reference.priority} Priority
                                    </span>
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center justify-between py-1">
                                <Button
                                    label="Update"
                                    className="px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm"
                                    onClick={() => setIsUpdateModalOpen(true)}
                                    disabled={!canUpdate}
                                />
                                <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border shadow-sm bg-indigo-50 text-indigo-700 border-indigo-200">
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>Global Ref</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-indigo-700 mb-1">Latest Remarks :</h3>
                            <p className="text-gray-600 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">{reference.remarks || "No description provided."}</p>
                        </div>

                        {isAdmin && (
                            <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Admin Oversight</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {reference.isHidden ? (
                                        <Button label="Unhide" variant="secondary" className="h-8 text-[10px]" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleAdminAction('unhide')} disabled={processingAction} />
                                    ) : (
                                        <Button label="Hide" variant="secondary" className="h-8 text-[10px]" icon={<EyeOff className="w-3.5 h-3.5" />} onClick={() => handleAdminAction('hide')} disabled={processingAction} />
                                    )}
                                    {reference.isArchived ? (
                                        <Button label="Restore" variant="secondary" className="h-8 text-[10px]" icon={<Undo2 className="w-3.5 h-3.5" />} onClick={() => handleAdminAction('unarchive')} disabled={processingAction} />
                                    ) : (
                                        <Button label="Archive" variant="secondary" className="h-8 text-[10px]" icon={<Archive className="w-3.5 h-3.5" />} onClick={() => handleAdminAction('archive')} disabled={processingAction} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <UpdateReferenceModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onSuccess={() => fetchDetails(false)}
                reference={reference}
                referenceType="GlobalReference"
            />
            <IssueReminderModal
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
                reference={reference}
                workflowUsers={workflowUsers}
                referenceType="GlobalReference"
            />
            <ReopenRequestModal
                isOpen={isReopenModalOpen}
                onClose={() => setIsReopenModalOpen(false)}
                reference={reference}
                onSuccess={() => fetchDetails(false)}
                referenceType="GlobalReference"
            />
            <UserProfileViewModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                userId={selectedUserId}
            />
        </div>
    );
}

export default GlobalReferenceDetailsPage;
