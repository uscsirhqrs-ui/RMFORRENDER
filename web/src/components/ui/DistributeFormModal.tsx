/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Share2, Loader2, CheckCircle2, Sliders, Calendar, Users, Settings, ArrowRight, Copy, Building2, FileText } from 'lucide-react';
import Button from './Button';
import { getAllUsers } from '../../services/user.api';
import { getSystemConfig } from '../../services/systemConfig.api';
import { useMessageBox } from '../../context/MessageBoxContext';
import clsx from 'clsx';

interface DistributeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    formTitle: string;
    onDistribute: (data: DistributionData) => void;
    isDistributing?: boolean;
}

export interface DistributionData {
    targetUserIds: string[];
    allowDelegation: boolean;
    allowMultipleSubmissions: boolean;
    deadline?: string;
    fillingInstructions?: string;
}

interface User {
    _id: string;
    fullName: string;
    email: string;
    labName?: string;
    designation?: string;
}

const steps = [
    { number: 1, title: 'Delegation Config', icon: Sliders },
    { number: 2, title: 'Form Settings', icon: Settings },
    { number: 3, title: 'Select Recipients', icon: Users }
];

const DistributeFormModal: React.FC<DistributeFormModalProps> = ({
    isOpen,
    onClose,
    formTitle,
    onDistribute,
    isDistributing = false
}) => {
    const { showMessage } = useMessageBox();
    const [currentStep, setCurrentStep] = useState(1);

    // Config State
    const [allowDelegation, setAllowDelegation] = useState(true);
    const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
    const [deadline, setDeadline] = useState('');
    const [fillingInstructions, setFillingInstructions] = useState('');

    // User Selection State
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Filters (New 3-Column State)
    const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set());
    const [selectedDesignations, setSelectedDesignations] = useState<Set<string>>(new Set());
    const [approvalAuthorityDesignations, setApprovalAuthorityDesignations] = useState<string[]>([]);

    // Progressive Loading State
    const [visibleUserLimit, setVisibleUserLimit] = useState(50);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setAllowDelegation(true);
            setAllowMultipleSubmissions(false);
            setDeadline('');
            setFillingInstructions('');
            setSelectedUserIds(new Set());
            setSelectedLabs(new Set());
            setSelectedDesignations(new Set());
            setVisibleUserLimit(50);
            fetchUsers();
            fetchSystemConfig();
        }
    }, [isOpen]);

    const fetchSystemConfig = async () => {
        try {
            const response = await getSystemConfig();
            if (response.success && response.data?.APPROVAL_AUTHORITY_DESIGNATIONS) {
                setApprovalAuthorityDesignations(response.data.APPROVAL_AUTHORITY_DESIGNATIONS);
            }
        } catch (error) {
            console.error('Failed to fetch system config:', error);
        }
    };

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await getAllUsers(1, 10000);
            if (response.success && response.data?.users) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // --- Derived Data ---
    const uniqueLabs = useMemo(() => {
        const labs = new Set(users.map(u => u.labName).filter(Boolean) as string[]);
        return Array.from(labs).sort();
    }, [users]);

    const availableDesignations = useMemo(() => {
        if (selectedLabs.size === 0) return [];
        const filteredUsers = users.filter(u => u.labName && selectedLabs.has(u.labName));
        let designationsList = filteredUsers.map(u => u.designation).filter(Boolean) as string[];

        // Apply Approval Authority Filter if Delegation is enabled
        if (allowDelegation) {
            designationsList = designationsList.filter(d => approvalAuthorityDesignations.includes(d));
        }

        const designations = new Set(designationsList);
        return Array.from(designations).sort();
    }, [users, selectedLabs, allowDelegation, approvalAuthorityDesignations]);

    const filteredUsers = useMemo(() => {
        if (selectedLabs.size === 0) return [];
        let result = users.filter(u => u.labName && selectedLabs.has(u.labName));
        if (selectedDesignations.size === 0) return [];
        result = result.filter(u => u.designation && selectedDesignations.has(u.designation));

        // Note: filteredUsers already naturally respects the designation list because
        // designations are selected ONLY from the availableDesignations list.
        return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [users, selectedLabs, selectedDesignations]);

    // Reset selections if delegation toggle changes to ensure consistency
    useEffect(() => {
        setSelectedDesignations(new Set());
        setSelectedUserIds(new Set());
    }, [allowDelegation]);

    // Check "Select All" states
    const areAllLabsSelected = uniqueLabs.length > 0 && uniqueLabs.every(l => selectedLabs.has(l));
    const areAllDesignationsSelected = availableDesignations.length > 0 && availableDesignations.every(d => selectedDesignations.has(d));
    const areAllUsersSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u._id));


    // --- Handlers ---
    const toggleLab = (lab: string) => {
        const newSelectedLabs = new Set(selectedLabs);
        const isSelecting = !newSelectedLabs.has(lab);

        if (isSelecting) {
            newSelectedLabs.add(lab);
        } else {
            newSelectedLabs.delete(lab);
            // Cascade Deselect: Remove users belonging to this lab
            const usersToRemove = users.filter(u => u.labName === lab);
            const newSelectedUserIds = new Set(selectedUserIds);
            usersToRemove.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);
        }
        setSelectedLabs(newSelectedLabs);
    };

    const toggleAllLabs = () => {
        if (areAllLabsSelected) {
            // Deselect All Labs -> Clear everything
            setSelectedLabs(new Set());
            setSelectedDesignations(new Set());
            setSelectedUserIds(new Set());
        } else {
            setSelectedLabs(new Set(uniqueLabs));
        }
    };

    const toggleDesignation = (desig: string) => {
        const newSelectedDesignations = new Set(selectedDesignations);
        const isSelecting = !newSelectedDesignations.has(desig);

        if (isSelecting) {
            newSelectedDesignations.add(desig);
        } else {
            newSelectedDesignations.delete(desig);
            // Cascade Deselect: Remove users with this designation (only within currently selected labs)
            // We need to check filtering logic: Users are filtered by Lab AND Designation.
            // If we remove a designation, any user with that designation (who was previously visible/selected) should be removed.
            const usersToRemove = users.filter(u =>
                u.designation === desig &&
                u.labName && selectedLabs.has(u.labName)
            );
            const newSelectedUserIds = new Set(selectedUserIds);
            usersToRemove.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);
        }
        setSelectedDesignations(newSelectedDesignations);
    };

    const toggleAllDesignations = () => {
        if (areAllDesignationsSelected) {
            // Deselect All Designations -> Deselect currently filtered users who matched these designations
            // Since we are clearing ALL designations, effectively we are removing all users who were selected based on designation filtering.
            // But wait, if designations is empty, filteredUsers is empty. 
            // So we should remove ALL users that fall under the currently selected LABS from the selection?
            // Or just clear the selection of users that matched the PREVIOUS designations?

            // Simpler approach that matches user expectation: 
            // If I clear designations, I "lose" the users I found via them.
            // But if I selected a user, then cleared designations, should they remain?
            // Typically yes in a generic filter, but in this "Drill down" wizard, probably no.
            // Let's stick to the visible set: The users that were visible are the ones we deselect.

            // Let's identify users that match the Current Selected Labs + Current Selected Designations
            const usersInCurrentView = users.filter(u =>
                u.labName && selectedLabs.has(u.labName) &&
                u.designation && selectedDesignations.has(u.designation)
            );

            const newSelectedUserIds = new Set(selectedUserIds);
            usersInCurrentView.forEach(u => newSelectedUserIds.delete(u._id));
            setSelectedUserIds(newSelectedUserIds);

            setSelectedDesignations(new Set());
        } else {
            setSelectedDesignations(new Set(availableDesignations));
        }
    };

    const toggleUser = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedUserIds(newSet);
    };

    const toggleAllUsers = () => {
        const newSet = new Set(selectedUserIds);
        const allFilteredIds = filteredUsers.map(u => u._id);

        if (areAllUsersSelected) {
            // Deselect all filtered users
            allFilteredIds.forEach(id => newSet.delete(id));
        } else {
            // Select all filtered users
            allFilteredIds.forEach(id => newSet.add(id));
        }
        setSelectedUserIds(newSet);
    };

    const handleLoadMoreUsers = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleUserLimit(prev => prev + 50);
            setIsLoadingMore(false);
        }, 300);
    };

    const handleConfirm = () => {
        if (selectedUserIds.size === 0) {
            showMessage({
                title: 'No Users Selected',
                message: 'Please select at least one user to distribute to.',
                type: 'warning'
            });
            return;
        }
        const data: DistributionData = {
            targetUserIds: Array.from(selectedUserIds),
            allowDelegation,
            allowMultipleSubmissions,
            deadline: deadline || undefined,
            fillingInstructions: fillingInstructions || "Please fill the form"
        };
        onDistribute(data);
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
            <div className={clsx(
                "rounded-2xl shadow-2xl w-full overflow-hidden animate-scale-in flex flex-col transition-all duration-300 ease-in-out",
                currentStep === 3 ? "max-w-[98vw] xl:max-w-7xl h-[95vh] sm:h-[90vh]" : "max-w-2xl max-h-[90vh]"
            )}>
                {/* Header (Blue Theme) with Integrated Stepper */}
                <div className="px-6 py-5 border-b border-indigo-700/30 bg-indigo-600 shrink-0 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Share2 className="w-6 h-6 text-indigo-200" />
                                Distribute Form Wizard
                            </h3>
                            <p className="text-sm text-indigo-100 mt-1 truncate max-w-md ml-9">{formTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-indigo-500 rounded-full transition-all text-indigo-200 hover:text-white shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Integrated Stepper */}
                    <div className="flex items-center justify-between relative max-w-xl mx-auto w-full">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500/50 z-0"></div>
                        {steps.map((step) => {
                            const isActive = step.number === currentStep;
                            const isCompleted = step.number < currentStep;
                            return (
                                <div key={step.number} className="relative z-10 flex flex-col items-center px-2">
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                                        isActive || isCompleted
                                            ? "bg-white border-white text-indigo-600"
                                            : "bg-indigo-700 border-indigo-500 text-indigo-300"
                                    )}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-4 h-4" />}
                                    </div>
                                    <span className={clsx(
                                        "text-[10px] font-bold mt-1 uppercase tracking-wide",
                                        isActive ? "text-white" : "text-indigo-300"
                                    )}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative flex flex-col bg-white dark:bg-gray-800">

                    {/* Step 1 & 2: Simple Container */}
                    {currentStep !== 3 ? (
                        <div className="overflow-y-auto p-6 flex flex-col gap-6">
                            <div className="text-center w-full mb-2">
                                {currentStep === 1 && <p className="text-sm text-gray-500 dark:text-gray-400">Configure delegation metrics.</p>}
                                {currentStep === 2 && <p className="text-sm text-gray-500 dark:text-gray-400">Set deadlines and submission rules.</p>}
                            </div>

                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-xl mx-auto w-full">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                            <Sliders className="w-4 h-4" />
                                            Delegation Control
                                        </h4>
                                        <p className="text-sm text-indigo-800/70 dark:text-indigo-300/70 mb-5">
                                            Allow recipients to re-assign this task to their subordinates?
                                        </p>
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <div>
                                                <span className="font-bold text-gray-900 dark:text-white block">Allow Delegation</span>
                                                <span className="text-xs text-gray-500">Enable downstream assignment</span>
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

                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-xl mx-auto w-full">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Filling Instructions (Optional)
                                        </label>
                                        <textarea
                                            value={fillingInstructions}
                                            onChange={(e) => setFillingInstructions(e.target.value)}
                                            placeholder="Provide specific instructions or remarks for the recipients..."
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[100px] resize-none"
                                        />
                                        <p className="text-xs text-gray-500">This will be shown as the initial remark.</p>
                                    </div>

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
                                        <p className="text-xs text-gray-500">Recipients will see a countdown.</p>
                                    </div>
                                    {/* Disable Multiple Responses for now */}
                                    {/* 
                                    <hr className="border-gray-100 dark:border-gray-700" />
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <div>
                                            <span className="font-bold text-gray-900 dark:text-white block">Allow Multiple Responses</span>
                                            <span className="text-xs text-gray-500">Single user can submit multiple times</span>
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
                        </div>
                    ) : (
                        // Step 3: Full Height Columns (Responsive)
                        <div className="flex-1 lg:overflow-hidden overflow-y-auto p-4 lg:p-6 animate-in slide-in-from-right-4 duration-300 h-full">
                            <div className="grid grid-cols-1 lg:grid-cols-[250px_250px_1fr] gap-6 h-auto lg:h-full">
                                {/* Laboratories */}
                                <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 h-[300px] lg:h-full shrink-0 shadow-sm">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 lg:p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>
                                            <h4 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Laboratories</h4>
                                        </div>
                                        <button
                                            onClick={toggleAllLabs}
                                            disabled={isLoadingUsers}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider disabled:opacity-50"
                                        >
                                            {areAllLabsSelected ? 'Deselect' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-gray-800">
                                        {uniqueLabs.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                            </div>
                                        ) : (
                                            <div className="space-y-0.5">
                                                {uniqueLabs.map(lab => (
                                                    <label key={lab} className={clsx(
                                                        "flex items-center p-2 rounded-lg cursor-pointer transition-colors border",
                                                        selectedLabs.has(lab)
                                                            ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                            : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                                    )}>
                                                        <div className={clsx(
                                                            "w-3.5 h-3.5 rounded border flex items-center justify-center mr-3 transition-colors shrink-0",
                                                            selectedLabs.has(lab) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
                                                        )} onClick={(e) => { e.preventDefault(); toggleLab(lab); }}>
                                                            {selectedLabs.has(lab) && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                        </div>
                                                        <span className={clsx("text-xs font-medium truncate", selectedLabs.has(lab) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300")} onClick={() => toggleLab(lab)}>
                                                            {lab}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Designations */}
                                <div className={clsx(
                                    "flex flex-col border rounded-xl overflow-hidden transition-all duration-300 h-[300px] lg:h-full shrink-0 shadow-sm",
                                    selectedLabs.size > 0 ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-100" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60"
                                )}>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 lg:p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", selectedLabs.size > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500")}>2</span>
                                            <h4 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Designations</h4>
                                        </div>
                                        <button
                                            onClick={toggleAllDesignations}
                                            disabled={selectedLabs.size === 0}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {areAllDesignationsSelected ? 'Deselect' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        {selectedLabs.size === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <Building2 className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-[10px] uppercase font-bold tracking-tight">Select Labs first</p>
                                            </div>
                                        ) : availableDesignations.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <p className="text-xs italic">No designations found.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-0.5">
                                                {availableDesignations.map(desig => (
                                                    <label key={desig} className={clsx(
                                                        "flex items-center p-2 rounded-lg cursor-pointer transition-colors border",
                                                        selectedDesignations.has(desig)
                                                            ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                            : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                                    )}>
                                                        <div className={clsx(
                                                            "w-3.5 h-3.5 rounded border flex items-center justify-center mr-3 transition-colors shrink-0",
                                                            selectedDesignations.has(desig) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
                                                        )} onClick={(e) => { e.preventDefault(); toggleDesignation(desig); }}>
                                                            {selectedDesignations.has(desig) && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                        </div>
                                                        <span className={clsx("text-xs font-medium truncate", selectedDesignations.has(desig) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300")} onClick={() => toggleDesignation(desig)}>
                                                            {desig}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Users */}
                                <div className={clsx(
                                    "flex flex-col border rounded-xl overflow-hidden transition-all duration-300 h-[400px] lg:h-full shrink-0 shadow-sm",
                                    selectedLabs.size > 0 && selectedDesignations.size > 0 ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-100" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60"
                                )}>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 lg:p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-10">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", selectedLabs.size > 0 && selectedDesignations.size > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500")}>3</span>
                                            <h4 className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Recipients</h4>
                                        </div>
                                        <button
                                            onClick={toggleAllUsers}
                                            disabled={selectedLabs.size === 0 || selectedDesignations.size === 0}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {areAllUsersSelected ? 'Deselect' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        {selectedLabs.size === 0 || selectedDesignations.size === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <Share2 className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-[10px] uppercase font-bold tracking-tight">Select Lab & Designation</p>
                                            </div>
                                        ) : filteredUsers.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                                <p className="text-xs italic">No users match.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-2">
                                                {filteredUsers.slice(0, visibleUserLimit).map(user => (
                                                    <label key={user._id} className={clsx(
                                                        "flex items-center p-2 rounded-lg cursor-pointer transition-colors border",
                                                        selectedUserIds.has(user._id)
                                                            ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                            : "hover:bg-gray-50 border-transparent dark:hover:bg-gray-700/50"
                                                    )}>
                                                        <div className={clsx(
                                                            "w-3.5 h-3.5 rounded border flex items-center justify-center mr-3 transition-colors shrink-0",
                                                            selectedUserIds.has(user._id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
                                                        )} onClick={(e) => { e.preventDefault(); toggleUser(user._id); }}>
                                                            {selectedUserIds.has(user._id) && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0" onClick={() => toggleUser(user._id)}>
                                                            <p className={clsx("text-xs font-medium truncate", selectedUserIds.has(user._id) ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300")}>
                                                                {user.fullName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 truncate">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </label>
                                                ))}

                                                {filteredUsers.length > visibleUserLimit && (
                                                    <div className="col-span-full pt-2 pb-1 text-center">
                                                        <button
                                                            onClick={handleLoadMoreUsers}
                                                            disabled={isLoadingMore}
                                                            className="text-xs text-indigo-600 font-bold hover:underline disabled:opacity-50"
                                                        >
                                                            {isLoadingMore ? 'Loading...' : `Load More`}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Sticky Footer for Selection Count */}
                                    {filteredUsers.length > 0 && selectedUserIds.size > 0 && (
                                        <div className="p-2 sm:p-3 bg-indigo-50/50 border-t border-indigo-100 dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center sticky bottom-0">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                                                {selectedUserIds.size} Selected
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between shrink-0">
                    <div className="flex gap-3">
                        {currentStep === 3 && (
                            <Button
                                variant="secondary"
                                className="hidden sm:flex"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    showMessage({ title: 'Link Copied', message: 'Form link copied to clipboard', type: 'success' });
                                }}
                                icon={<Copy className="w-3 h-3" />}
                            >
                                Copy Link
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={currentStep === 1 ? onClose : prevStep}
                            disabled={isDistributing}
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
                                onClick={handleConfirm}
                                disabled={isDistributing || selectedUserIds.size === 0}
                                icon={isDistributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                                className="px-6"
                            >
                                {isDistributing ? 'Distributing...' : `Distribute Form`}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributeFormModal;
