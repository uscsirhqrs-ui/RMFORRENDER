/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.1
 * @since 2026-01-13
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, FileText, Globe } from 'lucide-react';
import { addReference } from '../../services/globalReferences.api';
import { getAllUsers } from '../../services/user.api';
import { getSystemConfig } from '../../services/systemConfig.api';
import InputField from './InputField';
import DropDownWithSearch from './DropDownWithSearch';
import { useAuth } from '../../context/AuthContext';
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from '../../constants';


interface AddReferenceModalProps {
    /** Controls visibility of the modal */
    isOpen: boolean;
    /** Callback function to close the modal */
    onClose: () => void;
    /** Callback function triggered after a successful reference addition (e.g., to refresh the list) */
    onSuccess: () => void;
}

const AddGlobalReferenceModal: React.FC<AddReferenceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user: currentUser, permissions } = useAuth(); // Get current user and permissions
    const [subject, setSubject] = useState('');
    const [remarks, setRemarks] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Medium');
    const [markedTo, setMarkedTo] = useState('');
    const [deliveryMode, setDeliveryMode] = useState('Eoffice');
    const [deliveryDetails, setDeliveryDetails] = useState('');
    const [sentDate, setSentDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLab, setSelectedLab] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [remarksWordLimit, setRemarksWordLimit] = useState(150);

    // 1. Filter out restricted users (those with Manage References permission, and Self)
    const eligibleUsers = users.filter(u => {
        // Dynamic Permission Check:
        const interLabPermission = permissions.find(p => p.feature === FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER);
        const allowedRoles = interLabPermission?.roles || [];
        const hasInterLabSenderPermission = u.availableRoles?.some((role: string) => allowedRoles.includes(role));

        // Use String() to ensure consistent comparison of IDs
        const isSelf = currentUser?._id && u._id && String(u._id) === String(currentUser._id);
        // Backup check with email in case IDs have issues
        const isSelfEmail = currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase();

        const isSuperadmin = u.role === SUPERADMIN_ROLE_NAME;

        return hasInterLabSenderPermission && !isSelf && !isSelfEmail && !isSuperadmin;
    });

    // 2. Derive available labs from the eligible users only
    const labs = Array.from(new Set(eligibleUsers.map(u => u.labName).filter(Boolean))).sort();

    // 3. Filter eligible users by the selected lab
    const filteredUsers = selectedLab
        ? eligibleUsers.filter(u => u.labName === selectedLab)
        : [];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, configRes] = await Promise.all([
                    getAllUsers(1, 1000), // Increase limit to fetch all labs/users for global selection
                    getSystemConfig()
                ]);

                if (userRes.success) {
                    let userData = Array.isArray(userRes.data) ? userRes.data : (userRes.data?.users || []);
                    // Normalize data
                    userData = userData.map((u: any) => ({
                        ...u,
                        _id: u._id || u.id
                    }));
                    setUsers(userData);
                }

                if (configRes.success && configRes.data) {
                    const limit = configRes.data['REMARKS_WORD_LIMIT'];
                    if (limit) setRemarksWordLimit(Number(limit));
                }
            } catch (err) {
                console.error("Failed to fetch data for AddReferenceModal", err);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setRemarks(text);
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
        setMessage(null);
        setIsLoading(true);

        const charLimit = remarksWordLimit * 50;

        if (remarks.length > charLimit) {
            setMessage({ type: 'error', text: `Remarks cannot exceed ${charLimit} characters` });
            setIsLoading(false);
            return;
        }

        if (getWordCount(remarks) > remarksWordLimit) {
            setMessage({ type: 'error', text: `Remarks cannot exceed ${remarksWordLimit} words` });
            setIsLoading(false);
            return;
        }

        // Validate Delivery Details
        if (!deliveryDetails.trim()) {
            setMessage({ type: 'error', text: `${getDetailsLabel()} is required` });
            setIsLoading(false);
            return;
        }

        if (deliveryDetails.length > 60) {
            setMessage({ type: 'error', text: `${getDetailsLabel()} cannot exceed 60 characters` });
            setIsLoading(false);
            return;
        }

        if (!sentDate) {
            setMessage({ type: 'error', text: 'Sent Date is required' });
            setIsLoading(false);
            return;
        }

        if (markedTo && currentUser?._id && String(markedTo) === String(currentUser._id)) {
            setMessage({ type: 'error', text: 'You cannot mark a reference to yourself' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await addReference({
                subject,
                remarks,
                status,
                priority,
                markedTo,
                deliveryMode,
                deliveryDetails,
                sentAt: sentDate,
                tags: []
            });

            if (response.success) {
                setMessage({ type: 'success', text: 'Reference added successfully' });
                // Reset form
                setSubject('');
                setRemarks('');
                setStatus('Open');
                setPriority('Medium');
                setMarkedTo('');
                setDeliveryMode('Eoffice');
                setDeliveryDetails('');
                setSentDate(new Date().toISOString().split('T')[0]);
                setSelectedLab('');

                setTimeout(() => {
                    onSuccess();
                    onClose();
                    setMessage(null);
                }, 1500);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to add reference' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden animate-scale-in border border-indigo-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900 font-heading flex items-center gap-2">
                            <Globe className="w-6 h-6 text-indigo-600" />
                            Add Global Reference
                        </h3>
                        <p className="text-xs text-indigo-600 font-heading">
                            Cross-lab collaboration
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-indigo-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>


                {/* Body */}
                <div className="p-6">
                    {message && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
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
                            icon={<FileText className="w-4 h-4 text-indigo-400" />}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="deliveryMode" className="block text-sm font-semibold text-gray-700 font-heading">Mode Sent <span className="text-rose-500">*</span></label>
                                <select
                                    id="deliveryMode"
                                    value={deliveryMode}
                                    onChange={(e) => setDeliveryMode(e.target.value)}
                                    className="w-full px-4 h-10 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all bg-white font-heading text-sm"
                                >
                                    <option value="Eoffice">Eoffice</option>
                                    <option value="Email">Email</option>
                                    <option value="Physical">Physical</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="deliveryDetails" className="block text-sm font-semibold text-gray-700 font-heading">
                                    {getDetailsLabel()} <span className="text-rose-500">*</span>
                                    <span className={`text-[10px] ml-1 uppercase font-bold tracking-wider ${deliveryDetails.length > 60 ? 'text-rose-500' : 'text-gray-400'}`}>
                                        (Max 60 chars)
                                    </span>
                                </label>
                                <input
                                    id="deliveryDetails"
                                    type="text"
                                    value={deliveryDetails}
                                    onChange={(e) => setDeliveryDetails(e.target.value)}
                                    className={`w-full px-4 h-10 border rounded-xl focus:ring-4 outline-none transition-all font-heading text-sm ${deliveryDetails.length > 60 ? 'border-rose-200 focus:ring-rose-500/5 text-rose-600' : 'border-gray-100 focus:ring-indigo-500/5 focus:border-indigo-200'}`}
                                    placeholder={getDetailsPlaceholder()}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="sentDate" className="block text-sm font-semibold text-gray-700 font-heading">Sent Date <span className="text-rose-500">*</span></label>
                                <input
                                    id="sentDate"
                                    type="date"
                                    value={sentDate}
                                    onChange={(e) => setSentDate(e.target.value)}
                                    className="w-full px-4 h-10 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all bg-white font-heading text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="remarks" className="text-sm font-semibold text-gray-700 flex justify-between font-heading">
                                <span>Remarks <span className="text-rose-500">*</span></span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${getWordCount(remarks) > remarksWordLimit ? 'text-rose-500' : 'text-gray-400'}`}>
                                    {getWordCount(remarks)} / {remarksWordLimit} words
                                </span>
                            </label>
                            <textarea
                                id="remarks"
                                value={remarks}
                                onChange={handleRemarksChange}
                                className={`w-full px-4 py-2 border rounded-xl focus:ring-4 outline-none transition-all resize-none h-24 font-heading text-sm ${getWordCount(remarks) > remarksWordLimit ? 'border-rose-200 focus:ring-rose-500/5 text-rose-600' : 'border-gray-100 focus:ring-indigo-500/5 focus:border-indigo-200'
                                    }`}
                                placeholder="Enter detailed remarks"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="status" className="block text-sm font-semibold text-gray-700 font-heading">Status</label>
                                <select
                                    id="status"
                                    value={status}
                                    disabled={true}
                                    className="w-full px-4 h-10 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all bg-gray-50 cursor-not-allowed opacity-70 font-heading text-sm"
                                >
                                    <option value="Open">Open</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 font-heading">Priority <span className="text-rose-500">*</span></label>
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 h-10 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all bg-white font-heading text-sm"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="lab" className="block text-sm font-semibold text-gray-700 font-heading">Select Lab / Unit <span className="text-rose-500">*</span></label>
                                <DropDownWithSearch
                                    placeholder="Select Lab"
                                    options={labs.map((lab: string) => ({ label: lab, value: lab }))}
                                    selectedValue={selectedLab}
                                    onChange={(value) => {
                                        setSelectedLab(value);
                                        setMarkedTo(''); // Reset user when lab changes
                                    }}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="markedTo" className="block text-sm font-semibold text-gray-700 font-heading">Marked To (User) <span className="text-rose-500">*</span></label>
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

                        <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-6 h-10 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest transition-colors font-heading"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !markedTo}
                                className="w-full sm:w-auto px-8 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-heading"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Reference
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    );
};

export default AddGlobalReferenceModal;
