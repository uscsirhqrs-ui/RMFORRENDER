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
import {
    X,
    ChevronLeft,
    ChevronRight,
    UserCheck,
    UserX,
    ShieldCheck,
    ShieldAlert,
    Loader2,
    Save,
    CheckCircle2,
    Info
} from 'lucide-react';
import Button from './Button';
import { type User, useAuth } from '../../context/AuthContext';
import { updateUserStatus, updateUserRoles, manualActivateUser } from '../../services/user.api';
import { SUPERADMIN_ROLE_NAME } from '../../constants';

interface BulkUserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedUsers: User[];
    onUserUpdate: (updatedUser: User) => void;
}

const BulkUserManagementModal: React.FC<BulkUserManagementModalProps> = ({
    isOpen,
    onClose,
    selectedUsers,
    onUserUpdate
}) => {
    const { permissions } = useAuth(); // rename to avoid confusion with selected user
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state for current user
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('');
    const [isActivated, setIsActivated] = useState<boolean>(false);

    const currentUser = selectedUsers[currentIndex];

    useEffect(() => {
        if (currentUser) {
            setAvailableRoles(currentUser.availableRoles || []);
            setStatus(currentUser.status);
            setIsActivated(currentUser.isActivated || false);
            setMessage(null);
        }
    }, [currentIndex, currentUser]);

    if (!isOpen || !currentUser) return null;

    const handleNext = () => {
        if (currentIndex < selectedUsers.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const toggleRole = (role: string) => {
        setAvailableRoles(prev => {
            // Check if we are currently enabling the role (it's not in the list)
            const isEnabling = !prev.includes(role);
            let newRoles = prev;

            if (isEnabling) {
                // If enabling 'Inter Lab sender', remove 'User'
                if (role === 'Inter Lab sender') {
                    newRoles = newRoles.filter(r => r !== 'User');
                }
                // If enabling 'User', remove 'Inter Lab sender'
                if (role === 'User') {
                    newRoles = newRoles.filter(r => r !== 'Inter Lab sender');
                }
                // Add the new role
                return [...newRoles, role];
            } else {
                // If disabling a role
                return prev.filter(r => r !== role);
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            // 1. Update Roles
            const rolesResponse = await updateUserRoles(currentUser._id, availableRoles);

            // 2. Update Status if changed
            if (status !== currentUser.status) {
                await updateUserStatus(currentUser._id, status as any);
            }

            // 3. Update Activation if changed
            if (isActivated && !currentUser.isActivated) {
                await manualActivateUser(currentUser._id);
            }

            if (rolesResponse.success) {
                setMessage({ type: 'success', text: 'User details updated successfully' });
                onUserUpdate({
                    ...currentUser,
                    availableRoles,
                    status: status as any,
                    isActivated
                });

                // Automatically move to next user after a brief delay
                setTimeout(() => {
                    if (currentIndex < selectedUsers.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                    }
                }, 500);
            } else {
                setMessage({ type: 'error', text: rolesResponse.message || 'Failed to update roles' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred during update' });
        } finally {
            setIsSaving(false);
        }
    };

    const allRoles = Array.from(new Set(permissions.flatMap(p => p.roles)))
        .filter(role => role !== SUPERADMIN_ROLE_NAME)
        .sort();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in border border-white/20 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                {/* Header */}
                <div className="px-4 py-4 sm:px-8 sm:py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                            Manage Selected Users
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Processing user <span className="font-bold text-indigo-600 font-heading">{currentIndex + 1}</span> of <span className="font-bold text-gray-700 dark:text-gray-300 font-heading">{selectedUsers.length}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:rotate-90"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 shrink-0">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                        style={{ width: `${((currentIndex + 1) / selectedUsers.length) * 100}%` }}
                    />
                </div>

                <div className="p-4 sm:p-8 overflow-y-auto flex-1">
                    {/* User Info Card */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl p-4 sm:p-6 border border-indigo-100/50 dark:border-indigo-800/30 mb-6 sm:mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none font-heading relative overflow-hidden group shrink-0">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                            ) : (
                                currentUser.initials || currentUser.fullName?.charAt(0) || currentUser.email?.charAt(0).toUpperCase()
                            )}
                            <div className="absolute inset-0 bg-linear-to-tr from-indigo-600/20 to-transparent" />
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                            <h4 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                                {currentUser.fullName || currentUser.email?.split('@')[0]}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 font-medium truncate text-sm sm:text-base">{currentUser.email}</p>
                            {currentUser.designation && (
                                <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mt-1 flex items-center gap-2">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    {currentUser.designation}
                                </p>
                            )}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2 sm:mt-3">
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${currentUser.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    currentUser.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                    {currentUser.status}
                                </span>
                                {currentUser.isActivated && (
                                    <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                                        Activated
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                        {/* Status & Activation */}
                        <div className="lg:col-span-5 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Status Management</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setStatus('Approved')}
                                        className={`flex-1 flex items-center sm:flex-col justify-center gap-3 sm:gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all group ${status === 'Approved'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 scale-[1.02] shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-500'
                                            }`}
                                    >
                                        <UserCheck className={`w-5 h-5 sm:w-6 sm:h-6 ${status === 'Approved' ? 'animate-bounce' : 'group-hoverScale'}`} />
                                        <span className="text-xs font-bold uppercase tracking-wide">Approve</span>
                                    </button>
                                    <button
                                        onClick={() => setStatus('Rejected')}
                                        className={`flex-1 flex items-center sm:flex-col justify-center gap-3 sm:gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all group ${status === 'Rejected'
                                            ? 'bg-rose-50 border-rose-500 text-rose-700 scale-[1.02] shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-500'
                                            }`}
                                    >
                                        <UserX className={`w-5 h-5 sm:w-6 sm:h-6 ${status === 'Rejected' ? 'animate-pulse' : 'group-hoverScale'}`} />
                                        <span className="text-xs font-bold uppercase tracking-wide">Reject</span>
                                    </button>
                                </div>
                            </div>

                            {!currentUser.isActivated && (
                                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                    <div className="flex items-start gap-4">
                                        <Info className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                                        <div className="flex-1">
                                            <h5 className="text-sm font-bold text-blue-900 dark:text-blue-300">Waitlist Activation</h5>
                                            <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-1 leading-relaxed">
                                                This user has not activated their account. Do you want to manually activate them?
                                            </p>
                                            <button
                                                onClick={() => setIsActivated(!isActivated)}
                                                className={`mt-3 w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isActivated
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                                                    }`}
                                            >
                                                {isActivated ? 'Will Be Activated' : 'Activate Manually'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Multi-Role Management */}
                        <div className="lg:col-span-7">
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Privilege Assignment</label>
                            <div className="space-y-2">
                                {allRoles.map(role => (
                                    <div
                                        key={role}
                                        onClick={() => toggleRole(role)}
                                        className={`group flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${availableRoles.includes(role)
                                            ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30'
                                            : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-indigo-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${availableRoles.includes(role)
                                                ? 'bg-indigo-600 border-indigo-600'
                                                : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500 group-hover:border-indigo-400'
                                                }`}>
                                                {availableRoles.includes(role) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            </div>
                                            <span className={`text-sm font-bold ${availableRoles.includes(role) ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {role}
                                            </span>
                                        </div>
                                        {role === 'Inter Lab sender' && (
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                        )}
                                        {role === 'Delegated Admin' && (
                                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-4 leading-relaxed italic px-2">
                                <span className="font-bold">Note:</span> 'User' and 'Inter Lab sender' roles are mutually exclusive. Selecting one will deselect the other.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-4 py-4 sm:px-8 sm:py-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row justify-between items-stretch sm:items-center shrink-0 gap-4">
                    <div className="flex gap-2 order-2 md:order-1">
                        <Button
                            variant="secondary"
                            onClick={handlePrevious}
                            disabled={currentIndex === 0 || isSaving}
                            icon={<ChevronLeft className="w-4 h-4" />}
                            className="bg-white dark:bg-gray-700 flex-1 md:flex-none justify-center py-2.5"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleNext}
                            disabled={currentIndex === selectedUsers.length - 1 || isSaving}
                            icon={<ChevronRight className="w-4 h-4" />}
                            iconPosition="right"
                            className="bg-white dark:bg-gray-700 flex-1 md:flex-none justify-center py-2.5"

                        >
                            Next
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 order-1 md:order-2">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={isSaving}
                            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            className="flex-1 md:flex-none justify-center py-3 sm:py-2 min-w-[160px]"
                        >
                            {isSaving ? 'Processing...' : 'Save & Continue'}
                        </Button>
                        {currentIndex === selectedUsers.length - 1 && (
                            <Button
                                variant="primary"
                                onClick={onClose}
                                className="bg-black! bg-none! text-white hover:bg-gray-800! border-none px-6 shadow-none flex-1 md:flex-none justify-center py-3 sm:py-2"
                            >
                                Finish
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkUserManagementModal;
