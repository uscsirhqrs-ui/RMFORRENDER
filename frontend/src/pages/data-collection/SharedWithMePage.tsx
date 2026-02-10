/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FormCard } from '../../components/ui/FormCard';
import {
    Send, GitCommit, Eye, ArrowUpRight,
    User, Search, Edit, Download
} from 'lucide-react';
import Button from '../../components/ui/Button';
import {
    getSharedWithMe,
    getActiveFormById,
    getFormSubmissions,
    delegateForm, markBackForm, approveForm, markFormFinal,
    finalizeAndSubmitToDistributor,
    saveFormDraft, getChainDetails,
    getChainByDataId
} from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';
import { FormFillingModal } from '../../components/ui/FormFillingModal';
import MarkToModal from '../../components/ui/MarkToModal';
import DelegationChainModal from '../../components/ui/DelegationChainModal';
import UserProfileViewModal from '../../components/ui/UserProfileViewModal';
import { getSystemConfig } from '../../services/systemConfig.api';
import { generateSubmissionPDF } from '../../utils/pdfGenerator';

export default function SharedWithMePage() {
    const { user } = useAuth();
    const { showMessage, showPrompt } = useMessageBox();

    // State
    const [forms, setForms] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [layoutMode] = useState<'grid' | 'list'>('grid'); // Removed setter, fixed layout for now
    const [selectedFormIds] = useState<Set<string>>(new Set()); // Removed setter

    // Modal States
    const [isFillingModalOpen, setIsFillingModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<any | null>(null);
    const [isRootUser, setIsRootUser] = useState(false);

    // Action Loading States
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isMarkingFinal, setIsMarkingFinal] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [isSendingForApproval, setIsSendingForApproval] = useState(false);

    // Additional Modals
    const [isMarkToModalOpen, setIsMarkToModalOpen] = useState(false);
    const [markToMode, setMarkToMode] = useState<'delegate' | 'approval'>('delegate');
    const [delegatingTemplateId, setDelegatingTemplateId] = useState<string | null>(null);
    const [parentAssignmentId, setParentAssignmentId] = useState<string | null>(null); // For delegation
    const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null); // For marking back/approval
    const [chainUsers, setChainUsers] = useState<any[]>([]); // For approval mode

    const [viewingChainForm, setViewingChainForm] = useState<any | null>(null);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
    const [systemConfig, setSystemConfig] = useState<Record<string, any>>({});

    // Chain Data (for Filling Modal context)
    const [fullChain, setFullChain] = useState<any[]>([]);
    const [isChainLoading, setIsChainLoading] = useState(false);

    useEffect(() => {
        getSystemConfig()
            .then(res => {
                if (res.success) setSystemConfig(res.data);
            })
            .catch(err => console.error("Failed to fetch system config", err));

        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchForms(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, viewMode]);

    const fetchForms = async (page = pagination.page, showSkeleton = true) => {
        if (showSkeleton) setIsLoading(true);
        try {
            const params = {
                page,
                limit: pagination.limit,
                view: viewMode,
                search: searchQuery
            };
            const response = await getSharedWithMe(params);
            if (response.success) {
                setForms((response as any).data.forms);
                if ((response as any).data.pagination) {
                    setPagination((response as any).data.pagination);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (showSkeleton) setIsLoading(false);
        }
    };

    // Helper: Refresh single form
    const refreshForm = async (silent = false) => {
        fetchForms(pagination.page, !silent);
    };

    // --- Actions ---

    const handleFillClick = async (form: any) => {
        const templateId = form._id; // _id is templateId in this view
        const assignment = form.assignment; // matches specific assignment

        try {
            // 1. Start Chain Fetch in Background (Non-blocking for Modal Open)
            if (assignment?._id) {
                setIsChainLoading(true);
                getChainDetails(assignment._id)
                    .then((res: any) => {
                        if (res.success && res.data) setFullChain(res.data);
                    })
                    .catch(err => console.error("Failed to load chain", err))
                    .finally(() => setIsChainLoading(false));
            } else {
                setFullChain([]);
            }

            // 2. Fetch Template & Submissions concurrently
            const [templateRes, submissionsRes] = await Promise.all([
                getActiveFormById(templateId),
                getFormSubmissions(templateId)
            ]);

            if (templateRes.success) {
                const template = (templateRes as any).data;
                setSelectedTemplate(template);
                setFormData({});

                setCurrentAssignment(assignment || null);

                // Determine ReadOnly State
                // ReadOnly if:
                // 1. Form is inactive/expired (and not mine to manage?)
                // 2. I have delegated it out (myDelegation exists and is newer than assignment)
                // 3. I have marked it final (isFinalized locally in assignment)
                // 4. It is globally approved/submitted

                const isFormActive = template.isActive && (!template.deadline || new Date(template.deadline) > new Date());
                const isDelegatedByMe = form.myDelegation &&
                    (!assignment || new Date(form.myDelegation.createdAt) > new Date(assignment.createdAt));

                const isCreator = user?._id && (String(template.createdBy) === String(user._id) || String(template.createdBy?._id) === String(user._id));
                const isRoot = isCreator || (assignment && !assignment.parentAssignmentId) || (!assignment && !form.myDelegation);
                setIsRootUser(!!isRoot);

                const isMyWorkFinalized = assignment?.isFinalized || assignment?.status === 'Submitted';
                const isApprovedByAuthority = assignment?.status === 'Approved';

                // Allow editing if status is 'Edited' (overrides isFinalized which might be stale)
                const isEdited = assignment?.status === 'Edited';

                // Allow editing if approved but I am the root user OR have approval authority (to make final adjustments before submission)
                const canEditApproved = (isApprovedByAuthority && (isRoot || user?.hasApprovalAuthority)) || isEdited;

                setIsReadOnly(!isFormActive || !!isDelegatedByMe || (isMyWorkFinalized && !canEditApproved));

                // Process Submissions Data
                if (submissionsRes.success && (submissionsRes as any).data && Array.isArray((submissionsRes as any).data)) {
                    const submissions = (submissionsRes as any).data;
                    const sharedDataId = assignment?.dataId;
                    let sharedRecord = null;

                    if (sharedDataId) {
                        sharedRecord = submissions.find((s: any) => String(s._id) === String(sharedDataId));
                    }

                    // Fallback logic for finding relevant data
                    if (!sharedRecord) {
                        // Check for my own draft first (most reliable if dataId is not synced)
                        const myDraft = submissions.find((s: any) =>
                            String(s.submittedBy?._id || s.submittedBy) === String(user?._id) &&
                            s.status === 'Edited'
                        );

                        if (myDraft) {
                            sharedRecord = myDraft;
                        } else if (!form.isSubmitted) {
                            // Historical fallback
                            sharedRecord = submissions.find((s: any) => s.status === 'Edited');
                        } else {
                            sharedRecord = submissions[0]; // Just take first if finalized
                        }
                    }

                    if (sharedRecord) {
                        setFormData(sharedRecord.data || {});
                    }
                }

                setIsFillingModalOpen(true);
            }
        } catch (error: any) {
            console.error(error);
            showMessage({ message: error.message || 'Failed to open form', type: 'error' });
        }
    };

    const handleSaveDraft = async () => {
        if (!selectedTemplate) return;
        setIsSavingDraft(true);
        try {
            const response = await saveFormDraft({
                templateId: selectedTemplate._id,
                data: formData,
                assignmentId: currentAssignment?._id
            });
            if (response.success || (response as any).data?.success) {
                // Update assignment if returned (auto-created)
                if ((response as any).data?.assignment) {
                    setCurrentAssignment((response as any).data.assignment);
                }
                showMessage({ title: 'Saved', message: 'Draft saved successfully', type: 'success' });
                setIsFillingModalOpen(false); // Close modal after draft save
                refreshForm(true); // Silent refresh to avoid grid flicker
            } else {
                throw new Error(response.message || 'Save returned unsuccessful status');
            }
        } catch (error: any) {
            showMessage({ message: error.message || 'Failed to save draft', type: 'error' });
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedTemplate?._id) return;

        // Check for Declaration
        if (formData['declaration_checkbox'] !== true && formData['declaration_checkbox'] !== 'true') {
            showMessage({ message: 'You must agree to the declaration before approving.', type: 'error' });
            return;
        }

        // Root User Action
        const remarks = await showPrompt({
            title: 'Approve Form?',
            message: "Are you sure you want to approve this form? After approval, you will not be able to delegate it further. Only 'Edit Response' and 'Submit Response' actions will be available.",
            confirmText: 'Approve',
            cancelText: 'Cancel',
            inputLabel: 'Approval Remarks (Optional)',
            inputPlaceholder: 'Enter any final remarks...'
        });
        if (remarks === null) return;

        setIsApproving(true);
        try {
            // First save data to ensure latest
            const saveRes = await saveFormDraft({
                templateId: selectedTemplate._id,
                data: formData,
                assignmentId: currentAssignment?._id
            });

            if (!saveRes.success) throw new Error(saveRes.message || "Failed to save draft before approval");

            let activeAssignmentId = currentAssignment?._id;
            if ((saveRes as any).data?.assignment) {
                setCurrentAssignment((saveRes as any).data.assignment);
                activeAssignmentId = (saveRes as any).data.assignment._id;
            }

            if (!activeAssignmentId) throw new Error("Could not determine active assignment for approval");

            if (!activeAssignmentId) throw new Error("Could not determine active assignment for approval");

            const res = await approveForm({ assignmentId: activeAssignmentId, remarks });
            if (res.success) {
                showMessage({ title: 'Approved', message: 'Form approved successfully.', type: 'success' });
                setIsFillingModalOpen(false);
                refreshForm();
            }
        } catch (e: any) {
            showMessage({ message: e.message, type: 'error' });
        } finally {
            setIsApproving(false);
        }
    };

    const handleOpenApprovalFromModal = async () => {
        if (!selectedTemplate?._id || !currentAssignment?._id) return;

        setIsFillingModalOpen(false);
        setMarkToMode('approval');
        setDelegatingTemplateId(selectedTemplate._id);
        setCurrentAssignmentId(currentAssignment._id);

        if (fullChain && fullChain.length > 0) {
            const uniqueUsers = new Map();
            fullChain.forEach((segment: any) => {
                if (segment.fromUser && segment.fromUser._id !== user?._id) {
                    uniqueUsers.set(segment.fromUser._id, segment.fromUser);
                }
            });
            setChainUsers(Array.from(uniqueUsers.values()));
        } else {
            // Fallback if chain is empty (shouldn't happen for approval flow usually, but possibly first step)
            setChainUsers([]);
        }
        setIsMarkToModalOpen(true);
    };

    const handleMarkFinal = async () => {
        if (!selectedTemplate?._id || !currentAssignment?._id) return;

        // Delegate Action
        const remarks = await showPrompt({
            title: 'Mark as Final?',
            message: 'Are you sure you want to mark this form as final? You will not be able to edit it further unless you unfinalize it.',
            confirmText: 'Mark Final',
            cancelText: 'Cancel',
            inputLabel: 'Remarks (Optional)',
            inputPlaceholder: 'Enter remarks...'
        });
        if (remarks === null) return;

        setIsMarkingFinal(true);
        try {
            // Save first
            await saveFormDraft({
                templateId: selectedTemplate._id,
                data: formData,
                assignmentId: currentAssignment._id
            });

            const res = await markFormFinal({ assignmentId: currentAssignment._id, remarks });
            if (res.success) {
                showMessage({ title: 'Finalized', message: 'Form marked as final. You can now send it for approval.', type: 'success' });
                setIsFillingModalOpen(false);
                refreshForm();
            }
        } catch (e: any) {
            showMessage({ message: e.message, type: 'error' });
        } finally {
            setIsMarkingFinal(false);
        }
    };

    const handleSubmitToDistributor = async (assignmentId: string) => {
        const remarks = await showPrompt({
            title: 'Submit to Distributor',
            message: 'Are you sure you want to submit this final version to the distributor?',
            confirmText: 'Submit Final',
            cancelText: 'Cancel',
            inputLabel: 'Remarks (Optional)',
            inputPlaceholder: 'Any remarks for the distributor...',
            initialValue: 'Submitted please.'
        });
        if (remarks === null) return;

        try {
            const res = await finalizeAndSubmitToDistributor({ assignmentId, remarks });
            if (res.success) {
                showMessage({ title: 'Success', message: 'Form submitted to distributor.', type: 'success' });
                refreshForm();
            }
        } catch (e: any) {
            showMessage({ message: e.message, type: 'error' });
        }
    };

    // --- Delegation & Approval Flow (MarkToModal) ---

    const openDelegateModal = (form: any) => {
        setMarkToMode('delegate');
        setDelegatingTemplateId(form._id);
        setParentAssignmentId(form.assignment?._id || null);
        setIsMarkToModalOpen(true);
    };

    const openSendForApprovalModal = async (form: any) => {
        setMarkToMode('approval');
        setDelegatingTemplateId(form._id);
        setCurrentAssignmentId(form.assignment?._id);

        // Fetch chain users to populate the picker
        if (form.assignment?._id) {
            // Need to handle potential explicit type mismatch by using 'any'
            const res: any = await getChainDetails(form.assignment._id);
            if (res.success && res.data) {
                const delegationAllowed = form.allowDelegation !== false;
                const hasAuthority = user?.hasApprovalAuthority;

                // Case 1: Delegation Disabled -> MUST send back to Assigner (Initiator/Distributor)
                if (!delegationAllowed) {
                    // We only allow sending back to the person who assigned it to me
                    if (form.assignedBy) {
                        setChainUsers([form.assignedBy]);
                    } else {
                        // Fallback: Use chain to find previous link
                        const uniqueUsers = new Map();
                        res.data.forEach((segment: any) => {
                            if (segment.fromUser && segment.fromUser._id !== user?._id) {
                                uniqueUsers.set(segment.fromUser._id, segment.fromUser);
                            }
                        });
                        // Just show all previous if assignedBy is missing (shouldn't happen)
                        setChainUsers(Array.from(uniqueUsers.values()));
                    }
                }
                // Case 2: Delegation Enabled
                else {
                    const uniqueUsers = new Map();
                    res.data.forEach((segment: any) => {
                        if (segment.fromUser && segment.fromUser._id !== user?._id) {
                            // User Requirement: Check for non-approval role
                            // "A user with non approval role should not be allowed to send the form to the initiator."
                            // Interpret: If I don't have authority, I can only send to intermediates, NOT the Root Initiator.
                            // But wait, if I am the first delegate, the ONLY person I can send to is the Initiator.
                            // This implies a multi-level chain: Initiator -> A -> B. 
                            // If I am B (no authority), I should send to A, not Initiator.
                            // Implementation: Filter out the absolute root (Creator) if !hasAuthority

                            const isInitiator = segment.fromUser._id === form.createdBy?._id;

                            if (!hasAuthority && isInitiator) {
                                // Skip Initiator for non-authority users
                                return;
                            }

                            uniqueUsers.set(segment.fromUser._id, segment.fromUser);
                        }
                    });
                    setChainUsers(Array.from(uniqueUsers.values()));
                }
                setIsMarkToModalOpen(true);
            }
        }
    };

    const handleMarkToAction = async (targetUserId: string, remarks: string) => {
        if (markToMode === 'delegate') {
            if (!delegatingTemplateId) return;
            setIsDelegating(true);
            try {
                const response = await delegateForm({
                    templateId: delegatingTemplateId,
                    assignedToId: targetUserId,
                    remarks,
                    parentAssignmentId: parentAssignmentId || undefined
                });
                if (response.success) {
                    showMessage({ title: 'Delegated', message: 'Form delegated successfully', type: 'success' });
                    setIsMarkToModalOpen(false);
                    fetchForms();
                }
            } catch (error: any) {
                showMessage({ message: error.message || 'Failed to delegate', type: 'error' });
            } finally {
                setIsDelegating(false);
            }
        } else {
            // Approval Mode
            if (!currentAssignmentId) return;
            setIsSendingForApproval(true); // Reusing state var
            try {
                const response = await markBackForm({
                    assignmentId: currentAssignmentId,
                    remarks,
                    returnToId: targetUserId // Specific target in chain
                });
                if (response.success) {
                    showMessage({ title: 'Sent', message: 'Form sent for approval successfully', type: 'success' });
                    setIsMarkToModalOpen(false);
                    fetchForms();
                }
            } catch (error: any) {
                showMessage({ message: error.message || 'Failed to send for approval', type: 'error' });
            } finally {
                setIsSendingForApproval(false);
            }
        }
    };

    const handleDownloadSubmittedPDF = async (form: any) => {
        try {
            const templateId = form._id;
            const assignment = form.assignment;

            // Fetch Template and Submissions
            const [templateRes, submissionsRes] = await Promise.all([
                getActiveFormById(templateId),
                getFormSubmissions(templateId)
            ]);

            if (!templateRes.success) throw new Error("Failed to load template");
            if (!submissionsRes.success) throw new Error("Failed to load submission data");

            const template = (templateRes as any).data;
            const submissions = (submissionsRes as any).data;

            // Logic to find the correct submission
            let submission = null;
            if (assignment?.dataId) {
                submission = submissions.find((s: any) => String(s._id) === String(assignment.dataId));
            }
            if (!submission) {
                // Try to find the one that is 'Submitted' or 'Approved'
                submission = submissions.find((s: any) => s.status === 'Submitted' || s.status === 'Approved');
            }
            // Fallback to first if only one and it looks done
            if (!submission && submissions.length > 0 && (form.isSubmitted || form.workflowStatus === 'Submitted')) {
                submission = submissions[0];
            }

            if (!submission) {
                showMessage({ message: "No submission data found to download.", type: 'error' });
                return;
            }

            // Fetch Chain
            let chainHistory = [];
            const chainRes = await getChainByDataId(submission._id);
            if (chainRes.success && (chainRes as any).data) {
                chainHistory = (chainRes as any).data;
            }

            await generateSubmissionPDF(submission, template, chainHistory);

        } catch (error: any) {
            console.error(error);
            showMessage({ message: "Failed to download PDF", type: 'error' });
        }
    };

    // --- Render Logic ---

    const renderActions = (form: any) => {
        const assignment = form.assignment;
        const myDelegation = form.myDelegation;
        const delegationAllowed = form.allowDelegation !== false;

        // Root User if original recipient or creator
        const isAMain = (assignment && !assignment.parentAssignmentId) || (!assignment && !myDelegation);

        // Status checks
        const isDelegatedOut = myDelegation && (!assignment || new Date(myDelegation.createdAt) > new Date(assignment.createdAt));
        const isFinalized = assignment?.isFinalized;
        const isApproved = form.workflowStatus === 'Approved' || assignment?.status === 'Approved';
        const isSubmitted = form.workflowStatus === 'Submitted' || assignment?.status === 'Submitted';
        const isEdited = (assignment?.status || form.workflowStatus) === 'Edited';

        const shouldShowSubmit = (isApproved && (isAMain || user?.hasApprovalAuthority) && !isSubmitted) || (!delegationAllowed && isEdited && !isSubmitted);

        const showSubmitSideBySide = !isDelegatedOut && shouldShowSubmit;
        const buttonClass = showSubmitSideBySide
            ? "flex-1 h-10 px-2 pl-2 pr-4 min-w-0 text-[13px] font-semibold tracking-tighter" // Increased size, adjusted padding to shift content slightly left
            : "flex-1 h-10 px-4"; // Equal width, standard height

        return (
            <div className="flex flex-col gap-1 w-full">
                {(assignment || myDelegation) && (
                    <button
                        onClick={(e) => { e?.stopPropagation(); setViewingChainForm(form); }}
                        className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 flex items-center justify-end gap-1 transition-colors self-end h-4"
                    >
                        <GitCommit className="w-3 h-3" />
                        View Chain
                    </button>
                )}

                <div className="flex gap-2 items-stretch w-full">
                    {/* Primary Action Button */}
                    {(() => {
                        const primaryLabel = (() => {
                            if (isDelegatedOut) return "View Response";

                            // Correct logic: Check if EITHER is 'Edited'
                            // assignment.status might be 'Pending' (from initial creation) but workflowStatus might be 'Edited' (from draft save)
                            // or vice versa. We want to show Edit Response if ANY indicates edited.
                            const isEditedState = (assignment?.status === 'Edited') || (form.workflowStatus === 'Edited');

                            if (isAMain || user?.hasApprovalAuthority) {
                                if (isApproved && !isSubmitted) return "Edit Response";
                                if (isSubmitted) return "View Submitted";
                                return isEditedState ? "Edit Response" : "Open & Fill Form";
                            } else {
                                if (isApproved && !isSubmitted) return "View Response";
                                if (isFinalized) return "View Final Response";
                                return isEditedState ? "Edit Response" : "Open & Fill Form";
                            }
                        })();

                        const primaryIcon = (() => {
                            if (primaryLabel === "Edit Response") return <Edit className="w-4 h-4 text-white" />;
                            if (primaryLabel.includes("View")) return <Eye className="w-4 h-4" />;
                            return <ArrowUpRight className="w-4 h-4" />;
                        })();

                        return (
                            <>
                                <Button
                                    label={primaryLabel}
                                    className={buttonClass}
                                    onClick={(e) => {
                                        e?.stopPropagation();
                                        handleFillClick(form);
                                    }}
                                    icon={primaryIcon}
                                    variant={isDelegatedOut || (isApproved && !(isAMain || user?.hasApprovalAuthority)) ? "secondary" : "primary"}
                                />
                                {isSubmitted && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadSubmittedPDF(form);
                                        }}
                                        className="flex items-center gap-2 px-3 pl-3 pr-4 bg-white border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm h-10 text-[13px] font-semibold tracking-tighter"
                                        title="Download Response"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Response
                                    </button>
                                )}
                            </>
                        );
                    })()}

                    {/* Secondary Action / Helper Info */}
                    {isDelegatedOut ? (
                        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 h-10 justify-between overflow-hidden">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <User className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-xs font-bold truncate" title="Current holder of the form">
                                    {form.currentHolder?.fullName || myDelegation.delegatedToDetails?.fullName || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    ) : !isSubmitted && (
                        // If I have the ball (Not delegated out) AND not submitted
                        <div className="flex flex-1 gap-2 min-w-0">
                            {/* Delegate Button: Show if delegation allowed, I have authority, AND NOT approved/submitted yet */}
                            {/* User Req: Pending/Edited -> Delegate. Approved -> NO Delegate. */}
                            {!isApproved && delegationAllowed && user?.hasApprovalAuthority && (
                                <Button
                                    label="Delegate"
                                    variant="secondary"
                                    className="flex-1 h-10 px-1.5 min-w-0"
                                    icon={<Send className="w-3.5 h-3.5 text-indigo-500" />}
                                    onClick={(e) => { e?.stopPropagation(); openDelegateModal(form); }}
                                />
                            )}

                            {/* Send Approval: Show for non-main users who DO NOT have approval authority explicitly */}
                            {/* If I have approval authority, I use Delegate or Submit, not Send Approval */}
                            {/* User Req for Approval Role: Only Delegate or Submit. */}
                            {!isApproved && !isAMain && !user?.hasApprovalAuthority && (
                                <Button
                                    label="Send for Approval"
                                    variant="secondary"
                                    className="flex-1 h-10 px-2 min-w-0 text-xs font-medium"
                                    icon={<Send className="w-3.5 h-3.5 text-indigo-600" />}
                                    onClick={(e) => { e?.stopPropagation(); openSendForApprovalModal(form); }}
                                />
                            )}

                            {/* Submit Response: Show if Approved (for authority) OR if delegation disabled but edited */}
                            {/* User Req: Approved -> Edit Response + Submit Response */}
                            {shouldShowSubmit && (
                                <Button
                                    label="Submit Response"
                                    variant="secondary"
                                    className={buttonClass}
                                    icon={<Send className="w-3.5 h-3.5 text-indigo-500" />}
                                    onClick={(e) => {
                                        e?.stopPropagation();
                                        handleSubmitToDistributor(assignment._id);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter">Shared With Me</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold tracking-widest opacity-60">Forms assigned to you or your lab</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a form..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            <button onClick={() => setViewMode('active')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'active' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Active</button>
                            <button onClick={() => setViewMode('archived')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'archived' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Archived</button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-2xl" />)}
                    </div>
                ) : forms.length > 0 ? (
                    layoutMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forms.map(form => (
                                <FormCard
                                    key={form.assignmentId || form._id}
                                    form={form}
                                    variant="received"
                                    layoutMode="grid"
                                    selected={selectedFormIds.has(form._id)}
                                    // onToggleSelection={} 
                                    onViewProfile={setViewingProfileId}
                                    actions={renderActions(form)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-gray-50">
                                    {forms.map(form => (
                                        <FormCard
                                            key={form.assignmentId || form._id}
                                            form={form}
                                            variant="received"
                                            layoutMode="list"
                                            selected={selectedFormIds.has(form._id)}
                                            onViewProfile={setViewingProfileId}
                                            actions={renderActions(form)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="p-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 font-headline">No forms found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">You haven't been invited to fill any forms yet.</p>
                    </div>
                )}
            </div>

            <FormFillingModal
                isOpen={isFillingModalOpen}
                onClose={() => setIsFillingModalOpen(false)}
                template={selectedTemplate}
                formData={formData}
                setFormData={setFormData}
                isReadOnly={isReadOnly}
                onSaveDraft={handleSaveDraft}
                onApprove={handleApprove}
                onMarkFinal={handleMarkFinal}
                isSavingDraft={isSavingDraft}
                isApproving={isApproving}
                isMarkingFinal={isMarkingFinal}
                fullChain={fullChain}
                isChainLoading={isChainLoading}
                currentAssignment={currentAssignment}
                isRootUser={isRootUser && !!user?.hasApprovalAuthority}
                maxFileSizeMB={systemConfig.MAX_FILE_SIZE_MB || 1}
                isFileUploadEnabled={systemConfig.FILE_UPLOADS_ENABLED ?? true}
                formatDate={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                isExpiringSoon={(d) => {
                    const deadline = new Date(d);
                    const now = new Date();
                    const diff = deadline.getTime() - now.getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    return days >= 0 && days <= 3;
                }}
                allowDelegation={selectedTemplate?.allowDelegation !== false}
                hasApprovalAuthority={!!user?.hasApprovalAuthority}
                onSubmitForApproval={handleOpenApprovalFromModal}
            />

            {isMarkToModalOpen && (
                <MarkToModal
                    isOpen={isMarkToModalOpen}
                    onClose={() => setIsMarkToModalOpen(false)}
                    title={markToMode === 'delegate' ? "Delegate Form" : "Send for Approval"}
                    onMark={handleMarkToAction}
                    loading={isDelegating || isSendingForApproval}
                    mode={markToMode}
                    chainUsers={chainUsers}
                />
            )}


            {viewingChainForm && (
                <DelegationChainModal
                    isOpen={!!viewingChainForm}
                    onClose={() => setViewingChainForm(null)}
                    form={viewingChainForm}
                    currentUser={user}
                    onViewProfile={setViewingProfileId}
                />
            )}

            {viewingProfileId && (
                <UserProfileViewModal
                    isOpen={!!viewingProfileId}
                    onClose={() => setViewingProfileId(null)}
                    userId={viewingProfileId}
                />
            )}
        </div>
    );
}
