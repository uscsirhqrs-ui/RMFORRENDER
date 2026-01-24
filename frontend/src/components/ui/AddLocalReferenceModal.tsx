/**
 * @fileoverview React Component - Modal for adding Local References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, FileText, Building2 } from 'lucide-react';
import { createLocalReference } from '../../services/localReferences.api';
import { getAllUsers } from '../../services/user.api';
import { getSystemConfig } from '../../services/systemConfig.api';
import InputField from './InputField';
import DropDownWithSearch from './DropDownWithSearch';
import { useAuth } from '../../context/AuthContext';
import { SUPERADMIN_ROLE_NAME } from '../../constants';

interface AddLocalReferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddLocalReferenceModal: React.FC<AddLocalReferenceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user: currentUser } = useAuth();
    const [subject, setSubject] = useState('');
    const [remarks, setRemarks] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [priority, setPriority] = useState('Medium');
    const [markedTo, setMarkedTo] = useState('');
    const [eofficeNo, setEofficeNo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [remarksWordLimit, setRemarksWordLimit] = useState(150);

    // Filter users to only those in the SAME LAB as current user
    // Filter users to only those in the SAME LAB as current user
    // Filter users to only those in the SAME LAB as current user
    const labUsers = (Array.isArray(users) ? users : []).filter(u => {
        const isSameLab = u.labName === currentUser?.labName;
        const isSelf = currentUser?._id && u._id && String(u._id) === String(currentUser._id);
        const isSelfEmail = currentUser?.email && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase();
        const isSuperadmin = u.role === SUPERADMIN_ROLE_NAME;

        return isSameLab && !isSelf && !isSelfEmail && !isSuperadmin;
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, configRes] = await Promise.all([
                    getAllUsers(1, 1000), // Get a larger set for selection
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
                if (configRes.success && configRes.data['REMARKS_WORD_LIMIT']) {
                    setRemarksWordLimit(Number(configRes.data['REMARKS_WORD_LIMIT']));
                }
            } catch (err) {
                console.error("Failed to fetch data for Local Reference modal", err);
            }
        };

        if (isOpen) fetchData();
    }, [isOpen]);

    if (!isOpen) return null;

    const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        if (getWordCount(remarks) > remarksWordLimit) {
            setMessage({ type: 'error', text: `Remarks cannot exceed ${remarksWordLimit} words` });
            setIsLoading(false);
            return;
        }

        if (markedTo && currentUser?._id && String(markedTo) === String(currentUser._id)) {
            setMessage({ type: 'error', text: 'You cannot mark a local reference to yourself' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await createLocalReference({
                subject,
                remarks,
                status: 'Open',
                priority,
                markedTo,
                eofficeNo
            });

            if (response.success) {
                setMessage({ type: 'success', text: 'Local reference added successfully' });
                setSubject('');
                setRemarks('');
                setMarkedTo('');
                setEofficeNo('');

                setTimeout(() => {
                    onSuccess();
                    onClose();
                    setMessage(null);
                }, 1500);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to add local reference' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in border border-indigo-100">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900 font-heading flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            Add Local Reference
                        </h3>
                        <p className="text-xs text-indigo-600 font-heading">Internal to {currentUser?.labName}</p>
                        {/* <p className="text-xs text-indigo-600 font-heading">CREATED BY USER: {currentUser?.email}</p> */}
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-indigo-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

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

                        <InputField
                            id="eofficeNo"
                            label="E-office No. (Optional)"
                            type="text"
                            value={eofficeNo}
                            onChange={(e) => setEofficeNo(e.target.value)}
                            placeholder="Enter E-office number"
                            icon={<FileText className="w-4 h-4 text-indigo-400" />}
                        />

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 flex justify-between font-heading">
                                <span>Remarks <span className="text-rose-500">*</span></span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${getWordCount(remarks) > remarksWordLimit ? 'text-rose-500' : 'text-gray-400'}`}>
                                    {getWordCount(remarks)} / {remarksWordLimit} words
                                </span>
                            </label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-xl focus:ring-4 outline-none transition-all resize-none h-24 font-heading text-sm ${getWordCount(remarks) > remarksWordLimit ? 'border-rose-200 focus:ring-rose-500/5 text-rose-600' : 'border-gray-100 focus:ring-indigo-500/5 focus:border-indigo-200'
                                    }`}
                                placeholder="Enter detailed remarks"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700 font-heading">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 h-10 border border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all bg-white font-heading text-sm"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700 font-heading">Marked To <span className="text-rose-500">*</span></label>
                                <DropDownWithSearch
                                    placeholder="Select a colleague"
                                    options={labUsers.map((u: any) => ({
                                        label: `${u.fullName || u.email}${u.designation ? `, ${u.designation}` : ""}`,
                                        value: u._id
                                    }))}
                                    selectedValue={markedTo}
                                    onChange={setMarkedTo}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 h-10 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest transition-colors font-heading"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !markedTo}
                                className="px-8 h-10 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 font-bold text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-heading"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Local Ref
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddLocalReferenceModal;
