/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, FileText, AlertTriangle } from 'lucide-react';
import { updateReference } from '../../services/globalReferences.api';
import { updateLocalReference } from '../../services/localReferences.api';
import { getAllUsers } from '../../services/user.api';
import { getSystemConfig } from '../../services/systemConfig.api';
import InputField from './InputField';
import DropDownWithSearch from './DropDownWithSearch';
import type { Reference } from '../../types/Reference.type';
import { useAuth } from '../../context/AuthContext';
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from '../../constants';

interface UpdateReferenceModalProps {
    /** Controls visibility of the modal */
    isOpen: boolean;
    /** Callback function to close the modal */
    onClose: () => void;
    /** Callback function triggered after a successful update */
    onSuccess: () => void;
    /** The reference object to be updated */
    reference: Reference | null;
    /** The type of the reference (e.g., 'LocalReference') */
    referenceType?: string;
}

/**
 * Modal component for updating an existing reference.
 * Pre-fills the form with existing data and allows modification.
 */
const UpdateReferenceModal: React.FC<UpdateReferenceModalProps> = ({ isOpen, onClose, onSuccess, reference, referenceType }) => {
    const [subject, setSubject] = useState('');
    const [remarks, setRemarks] = useState('');
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Medium');
    const [markedTo, setMarkedTo] = useState('');
    const [eofficeNo, setEofficeNo] = useState('');
    const [deliveryMode, setDeliveryMode] = useState('Eoffice');
    const [deliveryDetails, setDeliveryDetails] = useState('');
    const [sentDate, setSentDate] = useState('');
    const [selectedLab, setSelectedLab] = useState('');
    const [users, setUsers] = useState<any[]>([]); // Using any[] for now as User type might differ
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [remarksWordLimit, setRemarksWordLimit] = useState(150);
    const [featurePermissions, setFeaturePermissions] = useState<any[]>([]);

    // Filter users by selected lab and exclude Admins, Delegated Admins, and self
    const { user: currentUser, hasPermission } = useAuth();

    // 1. Filter out restricted users (Superadmin and Self) AND check for required permissions
    const eligibleUsers = users.filter(u => {
        // Only Superadmin should be hidden from normal reference workflows
        if (u.role === SUPERADMIN_ROLE_NAME) return false;

        // Use String() to ensure consistent comparison of IDs
        const isSelf = currentUser?._id && u._id && String(u._id) === String(currentUser._id);
        const isSelfEmail = currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase();

        // Debugging self-visibility
        // if (u.email === currentUser?.email) {

        // }

        if (isSelf || isSelfEmail) return false;

        // Permission based filtering
        // Logic: The target user must have the "Add/Update/View" permission for the relevant scope.
        // If it's a LocalReference, they need 'Add/Update/View References(own lab)'.
        // If it's a GlobalReference, they need 'Add/Update/View References(inter lab)'.

        if (featurePermissions.length > 0) {
            const requiredFeature = referenceType === 'LocalReference'
                ? FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER
                : FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER;

            const permConfig = featurePermissions.find((p: any) => p.feature === requiredFeature);

            if (permConfig && Array.isArray(permConfig.roles)) {
                // If user's role is NOT in the allowed roles for this feature, filter them out.
                // We check against the user's primary role.
                // NOTE: 'u.role' is the primary role. 'u.availableRoles' might be relevant if we want to be generous,
                // but usually assignment is based on primary active role context.
                // Let's check if *any* of their available roles grant access, to be safe/inclusive.
                const userRoles = u.availableRoles && Array.isArray(u.availableRoles) ? u.availableRoles : [u.role];
                const hasAccess = userRoles.some((r: string) => permConfig.roles.includes(r));

                if (!hasAccess) return false;
            }
        }

        return true;
    });

    // 2. Derive available labs from the eligible users only
    const labs = Array.from(new Set(eligibleUsers.map(u => u.labName).filter(Boolean))).sort();

    // Ensure current user's lab is always in the list if it's a local reference
    if (referenceType === 'LocalReference' && currentUser?.labName && !labs.includes(currentUser.labName)) {
        labs.push(currentUser.labName);
        labs.sort();
    }

    // 3. Filter eligible users by the selected lab
    const filteredUsers = selectedLab
        ? eligibleUsers.filter(u => {
            if (u.labName !== selectedLab) return false;
            // For Global References, we might have extra checks, but the permission check above covers most of it.
            // Specifically, 'Add/Update/View References(inter lab)' is usually what defines an Inter Lab sender.
            return true;
        })
        : [];

    const remarksRef = useRef<HTMLTextAreaElement>(null);

    // Check if user is admin
    // Check if user is admin (Global or Local)
    // Note: For UI purposes, we just check if they have admin rights. Backend enforces strict access.
    // However, strictly speaking, a Local Admin looks like an Admin only for their own lab's references.
    const isGlobalAdmin = hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES) || hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);
    const isLocalAdmin = hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
    const isAdmin = isGlobalAdmin || isLocalAdmin;

    // Refine isAdmin logic: If only Local Admin, and reference is from another lab, treat as normal user?
    // But this modal is only open if they have access.
    // If they opened it, they likely have access.
    // So generic isAdmin flag is probably fine for UI controls (like priority field enabling).

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await getAllUsers(1, 1000); // Get a larger set for selection
                if (response.success) {
                    let userData = Array.isArray(response.data) ? response.data : (response.data?.users || []);
                    // Normalize data to ensure _id exists
                    userData = userData.map((u: any) => ({
                        ...u,
                        _id: u._id || u.id
                    }));
                    setUsers(userData);
                }
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };

        const fetchConfig = async () => {
            try {
                const response = await getSystemConfig();
                if (response.success && response.data) {
                    const limit = response.data['REMARKS_WORD_LIMIT'];
                    if (limit) setRemarksWordLimit(Number(limit));

                    const perms = response.data['FEATURE_PERMISSIONS'];
                    if (perms && Array.isArray(perms)) {
                        setFeaturePermissions(perms);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch system config", error);
            }
        };

        fetchUsers();
        fetchConfig();
    }, []);

    // Populate form when reference data changes
    useEffect(() => {
        if (reference) {
            setSubject(reference.subject || '');
            setRemarks('');

            if (reference.status === 'Open' || reference.status === 'Reopened') {
                setStatus('In Progress');
            } else if (reference.status === 'Closed' && isAdmin) {
                setStatus('Reopened');
            } else {
                setStatus(reference.status || 'In Progress');
            }

            setPriority(reference.priority || 'Medium');
            const markedToValue = Array.isArray(reference.markedTo)
                ? (typeof reference.markedTo[0] === 'object' ? (reference.markedTo[0] as any)?._id : reference.markedTo[0])
                : (typeof reference.markedTo === 'object' && reference.markedTo !== null
                    ? (reference.markedTo as any)._id // internal ID if object
                    : reference.markedTo); // string if just ID
            setMarkedTo(markedToValue || '');
            setEofficeNo(reference.eofficeNo || '');
            setDeliveryMode(reference.deliveryMode || 'Eoffice');
            setDeliveryDetails(reference.deliveryDetails || '');
            setSentDate(reference.sentAt ? new Date(reference.sentAt).toISOString().split('T')[0] : '');

            // Set the lab for the marked user to enable the dropdown correctly
            const firstMarkedTo = Array.isArray(reference.markedTo) ? reference.markedTo[0] : reference.markedTo;
            if (typeof firstMarkedTo === 'object' && firstMarkedTo !== null) {
                setSelectedLab((firstMarkedTo as any).labName || '');
            } else if (markedToValue && users.length > 0) {
                const foundUser = users.find(u => u._id === markedToValue);
                if (foundUser) setSelectedLab(foundUser.labName || '');
            }

            // Focus remarks field
            setTimeout(() => {
                remarksRef.current?.focus();
            }, 100);

            // Special logic for LocalReference: default lab to current user's lab and disable selection if marked to them
            if (referenceType === 'LocalReference' && currentUser?.labName) {
                const markedToId = typeof reference.markedTo === 'object' && reference.markedTo !== null
                    ? (reference.markedTo as any)._id
                    : reference.markedTo;

                if (String(markedToId) === String(currentUser._id)) {
                    setSelectedLab(currentUser.labName);
                } else {
                    // Even if not marked to self, it's a local reference, so lab must be same
                    setSelectedLab(currentUser.labName);
                }
            }
        }
    }, [reference?._id, isOpen, users, referenceType, currentUser?._id, currentUser?.labName]);

    if (!isOpen || !reference) return null;

    const isClosing = reference?.status !== 'Closed' && status === 'Closed';
    const isReopening = reference?.status === 'Closed' && status === 'Reopened';

    const performUpdate = async () => {
        setMessage(null);
        setIsLoading(true);

        try {
            const response = referenceType === 'LocalReference'
                ? await updateLocalReference(reference._id, {
                    subject,
                    remarks,
                    status,
                    priority,
                    markedTo,
                    eofficeNo,
                })
                : await updateReference(reference._id, {
                    subject,
                    remarks,
                    status,
                    priority,
                    markedTo, // Sending ID string
                    eofficeNo,
                    deliveryMode,
                    deliveryDetails,
                    sentAt: sentDate,
                });

            if (response.success) {

                let secondsLeft = 3;
                setMessage({ type: 'success', text: `Reference updated successfully. Auto closing in ${secondsLeft} seconds...` });
                onSuccess(); // Refresh data immediately
                setShowConfirmClose(false); // Close confirmation if open

                const intervalId = setInterval(() => {
                    secondsLeft -= 1;
                    if (secondsLeft > 0) {
                        setMessage({ type: 'success', text: `Reference updated successfully. Auto closing in ${secondsLeft} seconds...` });
                    } else {
                        clearInterval(intervalId);

                        onClose();
                        setMessage(null);
                    }
                }, 1000);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to update reference' });
                setShowConfirmClose(false);
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
            setShowConfirmClose(false);
        } finally {
            setIsLoading(false);
        }
    };

    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRemarks(e.target.value);
    };

    // Dynamic Label Logic
    const getDetailsLabel = () => {
        if (deliveryMode === 'Eoffice') return 'Issue No.';
        return 'Sent To';
    };

    const getDetailsPlaceholder = () => {
        if (deliveryMode === 'Eoffice') return 'Enter e-office issue no.';
        if (deliveryMode === 'Email') return 'Enter recipient email/name';
        return 'Enter recipient address/name';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!remarks.trim()) {
            setMessage({ type: 'error', text: 'Remarks are required' });
            return;
        }

        const charLimit = remarksWordLimit * 50;

        if (remarks.length > charLimit) {
            setMessage({ type: 'error', text: `Remarks cannot exceed ${charLimit} characters` });
            return;
        }

        if (getWordCount(remarks) > remarksWordLimit) {
            setMessage({ type: 'error', text: `Remarks cannot exceed ${remarksWordLimit} words` });
            return;
        }

        if (status !== 'Closed' && markedTo && currentUser?._id && String(markedTo) === String(currentUser._id)) {
            setMessage({ type: 'error', text: 'You cannot mark a reference to yourself' });
            return;
        }

        // Validate Delivery Details
        if (referenceType !== 'LocalReference' && !deliveryDetails.trim()) {
            setMessage({ type: 'error', text: `${getDetailsLabel()} is required` });
            return;
        }

        if (deliveryDetails.length > 60) {
            setMessage({ type: 'error', text: `${getDetailsLabel()} cannot exceed 60 characters` });
            return;
        }

        if (referenceType !== 'LocalReference' && !sentDate) {
            setMessage({ type: 'error', text: 'Sent Date is required' });
            return;
        }

        if (isClosing) {
            setShowConfirmClose(true);
            return;
        }

        await performUpdate();
    };

    // Check if current user is the assignee (Marked To) - Handle Array or Single value
    const isAssignee = currentUser?._id && (() => {
        if (Array.isArray(reference.markedTo)) {
            return reference.markedTo.some(m => {
                const id = typeof m === 'object' && m !== null ? (m as any)._id : m;
                return String(id) === String(currentUser._id);
            });
        }
        const id = typeof reference.markedTo === 'object' && reference.markedTo !== null
            ? (reference.markedTo as any)._id
            : reference.markedTo;
        return String(id) === String(currentUser._id);
    })();

    // Can Reopen: Admin OR Assignee
    const canReopen = isAdmin || isAssignee;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[90vh] animate-scale-in overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">
                            {referenceType === 'LocalReference' ? 'Update Local Reference' : 'Update Global Reference'}
                        </h3>
                        {reference?.refId && (
                            <p className="text-sm font-medium text-gray-500 mt-0.5">
                                {referenceType === 'LocalReference' ? 'Local' : 'Global'} Ref ID: {reference.refId}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField
                            id="subject"
                            label="Subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject"
                            icon={<FileText className="w-4 h-4 text-gray-400" />}
                            required
                            readOnly={!isAdmin}
                            className={!isAdmin ? "bg-gray-200 cursor-not-allowed opacity-70" : ""}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 1. Mode Sent (Disabled) */}
                            {referenceType !== 'LocalReference' && (
                                <div className="space-y-1">
                                    <label htmlFor="deliveryMode" className="block text-sm font-medium text-gray-700">Mode Sent <span className="text-red-500">*</span></label>
                                    <select
                                        id="deliveryMode"
                                        value={deliveryMode}
                                        onChange={(e) => setDeliveryMode(e.target.value as any)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-200 cursor-not-allowed opacity-70 text-sm"
                                        disabled
                                    >
                                        <option value="Eoffice">Eoffice</option>
                                        <option value="Email">Email</option>
                                        <option value="Physical">Physical</option>
                                    </select>
                                </div>
                            )}

                            {/* 2. Sent To / E-office No (Disabled) */}
                            {referenceType !== 'LocalReference' ? (
                                deliveryMode === 'Eoffice' ? (
                                    <InputField
                                        id="eofficeNo"
                                        label="E-office No."
                                        type="text"
                                        value={eofficeNo}
                                        onChange={(e) => setEofficeNo(e.target.value)}
                                        placeholder="E-office number"
                                        icon={<FileText className="w-4 h-4 text-gray-400" />}
                                        readOnly={true}
                                        className="bg-gray-200 cursor-not-allowed opacity-70"
                                    />
                                ) : (
                                    <div className="space-y-1">
                                        <label htmlFor="deliveryDetails" className="block text-sm font-medium text-gray-700">
                                            {getDetailsLabel()} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="deliveryDetails"
                                            type="text"
                                            value={deliveryDetails}
                                            onChange={(e) => setDeliveryDetails(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-200 cursor-not-allowed opacity-70 text-sm"
                                            placeholder={getDetailsPlaceholder()}
                                            disabled
                                        />
                                    </div>
                                )
                            ) : (
                                // For Local Reference, just show E-office if present or placeholder? 
                                // Actually local refs usually just have E-office or nothing?
                                // Based on existing code, LocalRef doesn't rely on deliveryMode/Details same way.
                                // The original code had eofficeNo always visible. Let's keep it visible for LocalRef too.
                                <InputField
                                    id="eofficeNo"
                                    label="E-office No."
                                    type="text"
                                    value={eofficeNo}
                                    onChange={(e) => setEofficeNo(e.target.value)}
                                    placeholder="E-office number"
                                    icon={<FileText className="w-4 h-4 text-gray-400" />}
                                    readOnly={true}
                                    className="bg-gray-200 cursor-not-allowed opacity-70"
                                />
                            )}

                            {/* 3. Sent Date (Disabled) */}
                            {referenceType !== 'LocalReference' && (
                                <div className="space-y-1">
                                    <label htmlFor="sentDate" className="block text-sm font-medium text-gray-700">Sent Date <span className="text-red-500">*</span></label>
                                    <input
                                        id="sentDate"
                                        type="date"
                                        value={sentDate}
                                        onChange={(e) => setSentDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-200 cursor-not-allowed opacity-70 text-sm"
                                        disabled
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="remarks" className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Remarks <span className="text-red-500">*</span></span>
                                <span className={`text-xs ${getWordCount(remarks) > remarksWordLimit ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                    {getWordCount(remarks)} / {remarksWordLimit} words
                                </span>
                            </label>
                            <textarea
                                id="remarks"
                                ref={remarksRef}
                                value={remarks}
                                onChange={handleRemarksChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all resize-none h-24 ${getWordCount(remarks) > remarksWordLimit ? 'border-red-500 focus:ring-red-500 text-red-600' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                placeholder={isClosing ? "Enter closing remarks" : isReopening ? "Enter reopening remarks" : "Enter remarks"}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`space-y-1 ${status === 'Closed' ? 'col-span-2' : ''}`}>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                                >
                                    {reference?.status === 'Closed' ? (
                                        <>
                                            <option value="Closed">Closed</option>
                                            {canReopen && <option value="Reopened">Reopen</option>}
                                        </>
                                    ) : (
                                        <>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Closed">Closed</option>
                                            {reference?.status === 'Reopened' && <option value="Reopened">Reopened</option>}
                                        </>
                                    )}
                                </select>
                            </div>

                            {status !== 'Closed' && (
                                <div className="space-y-1">
                                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority <span className="text-red-500">*</span></label>
                                    <select
                                        id="priority"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white ${!isAdmin ? 'bg-gray-200! cursor-not-allowed opacity-70' : ''}`}
                                        disabled={!isAdmin}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Status Messages */}
                        {status === 'Closed' && reference.status !== 'Closed' && (
                            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                                <span className="font-semibold">Note:</span> This reference will be automatically marked to the <span className="font-bold">Administrators</span> upon closing.
                            </div>
                        )}
                        {reference.status === 'Closed' && !canReopen && (
                            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded-md border border-gray-200">
                                <span className="font-semibold">Info:</span> Only Main Admins or current Assignees have the rights to reopen this reference.
                            </div>
                        )}

                        {status !== 'Closed' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="lab" className="block text-sm font-medium text-gray-700">Select Lab / Unit<span className="text-red-500">*</span></label>
                                    <DropDownWithSearch
                                        placeholder="Select Lab"
                                        options={labs.map((lab: string) => ({ label: lab, value: lab }))}
                                        selectedValue={selectedLab}
                                        onChange={(value) => {
                                            setSelectedLab(value);
                                            setMarkedTo(''); // Reset user when lab changes
                                        }}
                                        disabled={referenceType === 'LocalReference'}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="markedTo" className="block text-sm font-medium text-gray-700">Marked To <span className="text-red-500">*</span></label>
                                    <DropDownWithSearch
                                        placeholder={selectedLab ? "Select a user" : "Select Lab first"}
                                        options={filteredUsers.map((u: any) => ({
                                            label: `${u.fullName || u.email.split('@')[0]}${u.designation ? `, ${u.designation}` : ""} (${u.email})`,
                                            value: u._id
                                        }))}
                                        selectedValue={markedTo}
                                        onChange={(value) => setMarkedTo(value)}
                                        disabled={!selectedLab}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            {(reference.status !== 'Closed' || status !== 'Closed') && (
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Update Reference
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
            {/* Confirmation Overlay */}
            {showConfirmClose && (
                <div className="absolute inset-0 z-10 bg-white/95 flex items-center justify-center p-6 animate-fade-in">
                    <div className="text-center space-y-4 max-w-sm">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">Are you sure?</h4>
                        <p className="text-gray-600">
                            You are about to close this reference. Once closed, only <span className="font-semibold text-gray-900">System Admins</span> can reopen it.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmClose(false)}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={performUpdate}
                                disabled={isLoading}
                                className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md font-medium flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Closing...
                                    </>
                                ) : (
                                    <>
                                        Confirm Close
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpdateReferenceModal;
