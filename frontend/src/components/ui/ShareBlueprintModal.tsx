/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState, useEffect } from 'react';
import { X, Share2, Search, UserPlus, Loader2, CheckCircle2, Sliders, Calendar, Users, Settings, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from './Button';
import { getAllUsers } from '../../services/user.api';
import { shareBlueprintCopy } from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';

interface ShareBlueprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    blueprintId: string;
    blueprintTitle: string;
}

interface User {
    _id: string;
    fullName: string;
    email: string;
    labName?: string;
}

const steps = [
    { number: 1, title: 'Delegation Config', icon: Sliders },
    { number: 2, title: 'Form Settings', icon: Settings },
    { number: 3, title: 'Select Recipients', icon: Users }
];

const ShareBlueprintModal: React.FC<ShareBlueprintModalProps> = ({
    isOpen,
    onClose,
    blueprintId,
    blueprintTitle
}) => {
    const { showMessage } = useMessageBox();
    const [currentStep, setCurrentStep] = useState(3);

    // Config State
    const [allowDelegation, setAllowDelegation] = useState(true);
    const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
    const [deadline, setDeadline] = useState('');

    // User Selection State
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state on open
            setCurrentStep(3);
            setAllowDelegation(true);
            setAllowMultipleSubmissions(false);
            setDeadline('');
            setSelectedUserIds(new Set());
            setSearchQuery('');
            fetchUsers();
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredUsers(users);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (user) =>
                        user.fullName?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query) ||
                        user.labName?.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await getAllUsers(1, 1000);
            if (response.success && response.data?.users) {
                setUsers(response.data.users);
                setFilteredUsers(response.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUserIds(newSet);
    };

    const handleShare = async () => {
        if (selectedUserIds.size === 0) {
            showMessage({
                title: 'No Users Selected',
                message: 'Please select at least one user to share with.',
                type: 'warning'
            });
            return;
        }

        setIsSharing(true);
        try {
            const payload = {
                targetUserIds: Array.from(selectedUserIds),
                allowDelegation,
                allowMultipleSubmissions,
                deadline: deadline || undefined // Send undefined if empty string
            };

            const response = await shareBlueprintCopy(blueprintId, payload);
            if (response.success) {
                showMessage({
                    title: 'Success',
                    message: `Blueprint shared with ${selectedUserIds.size} user(s) successfully!`,
                    type: 'success'
                });
                onClose();
            } else {
                showMessage({
                    title: 'Error',
                    message: response.message || 'Failed to share blueprint',
                    type: 'error'
                });
            }
        } catch (error) {
            showMessage({
                title: 'Error',
                message: 'An unexpected error occurred',
                type: 'error'
            });
        } finally {
            setIsSharing(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
                            <span className="truncate">Share Form Wizard</span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md" title={blueprintTitle}>
                            {blueprintTitle}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>

                        {steps.map((step) => {
                            const isActive = step.number === currentStep;
                            const isCompleted = step.number < currentStep;

                            return (
                                <div key={step.number} className="relative z-10 flex flex-col items-center bg-white dark:bg-gray-800 px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive || isCompleted
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-400'
                                        }`}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-gray-400'
                                        }`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">

                    {/* Step 1: Delegation Configuration */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <Sliders className="w-4 h-4" />
                                    Delegation Control
                                </h4>
                                <p className="text-sm text-indigo-800/70 dark:text-indigo-300/70 mb-4">
                                    Decide whether recipients can delegate this form to others (downstream) or if they must fill it themselves.
                                </p>

                                <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div>
                                        <span className="font-bold text-gray-900 dark:text-white block">Allow Delegation</span>
                                        <span className="text-xs text-gray-500">Enable recipients to re-assign this task</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allowDelegation}
                                            onChange={(e) => setAllowDelegation(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Settings */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Deadline */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Submission Deadline (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <p className="text-xs text-gray-500">Recipients will see a countdown and receive reminders as this date approaches.</p>
                            </div>

                            {/* Disable Multiple Responses for now */}
                            {/* 
                            <hr className="border-gray-100 dark:border-gray-700" />

                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div>
                                    <span className="font-bold text-gray-900 dark:text-white block">Allow Multiple Responses</span>
                                    <span className="text-xs text-gray-500">Allow a single user to submit this form multiple times</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowMultipleSubmissions}
                                        onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            */}
                        </div>
                    )}

                    {/* Step 3: Select Recipients */}
                    {currentStep === 3 && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name, email, or lab..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                />
                            </div>

                            {/* Selected Users Count */}
                            {selectedUserIds.size > 0 && (
                                <div className="mb-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg">
                                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {selectedUserIds.size} user(s) selected
                                    </p>
                                </div>
                            )}

                            {/* User List */}
                            <div className="flex-1 overflow-y-auto min-h-[200px] border border-gray-100 dark:border-gray-700 rounded-xl">
                                {isLoadingUsers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                        <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No users found</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {filteredUsers.map((user) => (
                                            <div
                                                key={user._id}
                                                onClick={() => toggleUserSelection(user._id)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedUserIds.has(user._id)
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
                                                    : ''
                                                    }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedUserIds.has(user._id)
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-500'
                                                        }`}
                                                >
                                                    {selectedUserIds.has(user._id) && (
                                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {user.fullName || user.email}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {user.email}
                                                        {user.labName && ` • ${user.labName}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between shrink-0">
                    <Button
                        variant="secondary"
                        onClick={currentStep === 1 ? onClose : prevStep}
                        disabled={isSharing}
                        className="px-6"
                    >
                        {currentStep === 1 ? 'Cancel' : 'Back'}
                    </Button>

                    {currentStep < 3 ? (
                        <Button
                            variant="primary"
                            onClick={nextStep}
                            className="px-6"
                            icon={<ArrowRight className="w-4 h-4" />}
                            iconPosition="right"
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleShare}
                            disabled={isSharing || selectedUserIds.size === 0}
                            icon={isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                            className="px-6"
                        >
                            {isSharing ? 'Sharing...' : `Share (${selectedUserIds.size})`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareBlueprintModal;
