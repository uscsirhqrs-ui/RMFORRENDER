/**
 * @fileoverview React Component - Modal for bulk updating local references
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-22
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Users } from 'lucide-react';
import { bulkUpdateLocalReferences, getLocalReferenceFilters } from '../../services/localReferences.api';
import DropDownWithSearch from './DropDownWithSearch';
import { useAuth } from '../../context/AuthContext';


interface BulkUpdateLocalReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedIds: string[];
}

const BulkUpdateLocalReferenceModal: React.FC<BulkUpdateLocalReferenceModalProps> = ({ isOpen, onClose, onSuccess, selectedIds }) => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [assignTo, setAssignTo] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch filters to get eligible users (users in same lab)
                const res = await getLocalReferenceFilters();
                if (res.success && res.data && res.data.markedToUsers) {
                    // Filter out self and Superadmins (optional, but keep consistent with rule)
                    // Rule: Can assign to anyone in lab (except self)
                    const validUsers = res.data.markedToUsers.filter((u: any) => {
                        const isSelf = currentUser?._id && u._id && String(u._id) === String(currentUser._id);
                        const isSelfEmail = currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase();
                        // Ensure same lab (should be guaranteed by API, but double check)
                        const isSameLab = u.labName === currentUser?.labName;
                        return !isSelf && !isSelfEmail && isSameLab;
                    });
                    setUsers(validUsers);
                }
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        if (!assignTo) {
            setMessage({ type: 'error', text: 'Please select a user to assign references to.' });
            setIsLoading(false);
            return;
        }

        try {
            // Pass the assignTo ID in the extra data object
            const response = await bulkUpdateLocalReferences(selectedIds, 'assign', false, { assignTo, remarks });

            if (response.success) {
                setMessage({ type: 'success', text: 'References reassigned successfully' });
                setTimeout(() => {
                    onSuccess();
                    onClose();
                    setMessage(null);
                    setAssignTo('');
                    setRemarks('');
                }, 1500);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to update references' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in border border-indigo-100 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900 font-heading flex items-center gap-2">
                            <Users className="w-6 h-6 text-indigo-600" />
                            Bulk Assign Local References
                        </h3>
                        <p className="text-xs text-indigo-600 font-heading">
                            Reassign {selectedIds.length} reference{selectedIds.length !== 1 ? 's' : ''} within {currentUser?.labName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-indigo-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {message && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-gray-700 font-heading">Assign To (User) <span className="text-rose-500">*</span></label>
                            <DropDownWithSearch
                                placeholder="Select a colleague"
                                options={users.map((u: any) => ({
                                    label: `${u.fullName || u.email.split('@')[0]}${u.designation ? `, ${u.designation}` : ""} (${u.email})`,
                                    value: u._id
                                }))}
                                selectedValue={assignTo}
                                onChange={(value) => setAssignTo(value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-gray-700 font-heading">Remarks (Optional)</label>
                            <textarea
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-heading resize-none h-20"
                                placeholder="Enter remarks (default: Forwarded for consideration/perusal/necessary action please)"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
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
                                disabled={isLoading || !assignTo}
                                className="w-full sm:w-auto px-8 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-heading"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Assign
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BulkUpdateLocalReferenceModal;
