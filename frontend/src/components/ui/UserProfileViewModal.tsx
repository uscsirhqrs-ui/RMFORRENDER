/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useEffect, useState } from 'react';
import { X, Mail, Landmark, User as UserIcon, BadgeCheck, Building2 } from 'lucide-react';
import { getUserById } from '../../services/user.api';
import type { User } from '../../context/AuthContext';

interface UserProfileViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
}

const UserProfileViewModal: React.FC<UserProfileViewModalProps> = ({ isOpen, onClose, userId }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            const fetchUser = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await getUserById(userId);
                    if (response.success) {
                        setUser(response.data);
                    } else {
                        setError(response.message || "Failed to load user profile");
                    }
                } catch (err) {
                    setError("An error occurred while fetching user profile");
                } finally {
                    setLoading(false);
                }
            };
            fetchUser();
        } else if (!isOpen) {
            setUser(null);
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header Background */}
                <div className="relative h-20 bg-linear-to-r from-indigo-600 to-indigo-500 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Avatar Area */}
                    <div className="absolute -bottom-8 left-8">
                        <div className="w-18 h-18 rounded-2xl bg-white p-1 shadow-xl shadow-indigo-500/10 overflow-hidden">
                            <div className="w-full h-full rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-bold font-heading overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    user?.fullName?.charAt(0) || <UserIcon className="w-7 h-7" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-10 pb-4 px-8 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-heading text-xs font-bold tracking-wider opacity-50">Fetching Details</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10">
                            <p className="text-rose-500 font-heading font-semibold mb-4">{error}</p>
                            <button onClick={onClose} className="text-xs font-bold text-indigo-600 tracking-wider hover:underline">Go Back</button>
                        </div>
                    ) : user ? (
                        <>
                            {/* Basic Info */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 font-heading truncate">{user.fullName}</h2>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider border ${user.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        user.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                        {user.status}
                                    </span>
                                    {/* Display Active Role */}
                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-wider">
                                        {user.role}
                                    </span>
                                    {/* Display Other Available Roles */}
                                    {user.availableRoles?.filter(r => r !== user.role).map((role, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-gray-50 text-gray-600 border border-gray-200 tracking-wider">
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-3">
                                <div className="group">
                                    <p className="text-[9px] font-bold text-gray-400 tracking-wider mb-1 pl-1">Email</p>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100/80 transition-all">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                                            <Mail className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 font-heading truncate">{user.email}</p>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-bold text-gray-400 tracking-wider mb-1 pl-1">Lab name</p>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100/80 transition-all">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                                            <Landmark className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 font-heading truncate">{user.labName || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-bold text-gray-400 tracking-wider mb-1 pl-1">Designation</p>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100/80 transition-all">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                                            <BadgeCheck className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 font-heading truncate">{user.designation || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-bold text-gray-400 tracking-wider mb-1 pl-1">Division</p>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100/80 transition-all">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                                            <Building2 className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 font-heading truncate">{user.division || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-bold text-gray-400 tracking-wider mb-1 pl-1">Mobile No</p>
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100/80 transition-all">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                                            <svg className="w-4 h-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 font-heading truncate">{user.mobileNo || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-8 py-3 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row justify-end shrink-0 gap-3">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-500 hover:text-gray-900 shadow-sm hover:shadow-md transition-all font-heading tracking-wider"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div >
    );
};

export default UserProfileViewModal;
