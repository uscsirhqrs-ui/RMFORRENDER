/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, AlertTriangle } from 'lucide-react';
import { issueReminder } from '../../services/globalReferences.api';
import { issueLocalReminder } from '../../services/localReferences.api';
import { getSystemConfig } from '../../services/systemConfig.api';
import { SUPERADMIN_ROLE_NAME } from '../../constants';
import DropdownWithCheckboxes from './DropDownWithCheckBoxes';
import type { Reference } from '../../types/Reference.type';

interface IssueReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    reference: Reference | null;
    workflowUsers: any[];
    referenceType?: 'GlobalReference' | 'LocalReference';
}

const IssueReminderModal: React.FC<IssueReminderModalProps> = ({ isOpen, onClose, reference, workflowUsers, referenceType }) => {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [remarks, setRemarks] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [remarksWordLimit, setRemarksWordLimit] = useState(150);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await getSystemConfig();
                if (response.success && response.data) {
                    const limit = response.data['REMARKS_WORD_LIMIT'];
                    if (limit) setRemarksWordLimit(Number(limit));
                }
            } catch (error) {
                console.error("Failed to fetch system config", error);
            }
        };

        if (isOpen) {
            fetchConfig();
            // Pre-select the markedTo user if available?
            // Pre-select the markedTo user if available?
            if (reference && typeof reference.markedTo === 'object' && reference.markedTo !== null) {
                // Explicitly casting or checking ID
                setSelectedUserIds([(reference.markedTo as any)._id]);
            } else if (reference && typeof reference.markedTo === 'string') {
                setSelectedUserIds([reference.markedTo]);
            } else {
                setSelectedUserIds([]);
            }
            setRemarks('');
            setPriority('Medium');
            setMessage(null);
        }
    }, [isOpen, reference]);

    if (!isOpen || !reference) return null;

    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (selectedUserIds.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one recipient.' });
            return;
        }

        if (!remarks.trim()) {
            setMessage({ type: 'error', text: 'Remarks are required.' });
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

        setIsLoading(true);

        try {
            const response = referenceType === 'LocalReference'
                ? await issueLocalReminder(reference._id, selectedUserIds, remarks, priority)
                : await issueReminder(
                    reference._id,
                    selectedUserIds,
                    remarks,
                    priority
                );

            if (response.success) {
                setMessage({ type: 'success', text: 'Reminder sent successfully!' });
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to send reminder' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    const userOptions = workflowUsers
        .filter(u => u.role !== 'Inter Lab sender' && u.role !== SUPERADMIN_ROLE_NAME)
        .map(u => ({
            label: `${u.fullName} (${u.email})`,
            value: u._id,
            title: u.designation ? `${u.designation} at ${u.labName}` : u.labName
        }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Issue Reminder / Seek Inputs
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p>
                            <strong>
                                <span className="text-blue-600 font-bold">{referenceType === 'LocalReference' ? 'Local' : 'Global'}</span> Ref ID:
                            </strong> {reference.refId}
                        </p>
                        <p className="truncate"><strong>Subject:</strong> {reference.subject}</p>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-1 relative z-20">
                            <label className="block text-sm font-medium text-gray-700">Select Recipients <span className="text-red-500">*</span></label>
                            {/* Using z-index to help dropdown show over other elements if needed, though checkbox dropdown usually grows down */}
                            <DropdownWithCheckboxes
                                name="Select Users"
                                options={userOptions}
                                selectedValues={selectedUserIds}
                                onChange={setSelectedUserIds}
                            />
                            {selectedUserIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedUserIds.map(id => {
                                        const user = userOptions.find(u => u.value === id);
                                        return user ? (
                                            <span key={id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {user.label.split('(')[0].trim()}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Select one or more users to receive this email.</p>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="remarks" className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Remarks / Comments <span className="text-red-500">*</span></span>
                                <span className={`text-xs ${getWordCount(remarks) > remarksWordLimit ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                    {getWordCount(remarks)} / {remarksWordLimit} words
                                </span>
                            </label>
                            <textarea
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all resize-none h-32 ${getWordCount(remarks) > remarksWordLimit ? 'border-red-500 focus:ring-red-500 text-red-600' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                placeholder="Enter your reminder message here..."
                                required
                            />
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Reminder
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default IssueReminderModal;
