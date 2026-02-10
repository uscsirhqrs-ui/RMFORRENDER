/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState } from 'react';
import Button from './Button';
import DynamicFormRenderer from './DynamicFormRenderer';
import {
    X, Save, Clock
} from 'lucide-react';
import { MovementHistory } from './MovementHistory';

interface FormFillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: any;
    formData: any;
    setFormData: (data: any) => void;
    isReadOnly: boolean;

    // Actions
    onSaveDraft: () => void;
    onApprove: () => void;
    onMarkFinal: () => void;

    // Loading States
    isSubmitting?: boolean;
    isSavingDraft: boolean;
    isApproving: boolean;
    isMarkingFinal: boolean;

    // Context Data
    fullChain: any[];
    isChainLoading: boolean;
    currentAssignment: any;
    isRootUser?: boolean;
    maxFileSizeMB: number;
    isFileUploadEnabled: boolean;

    // Helper functionality
    formatDate: (date: string) => string;
    isExpiringSoon: (date: string) => boolean;

    // Permissions
    allowDelegation?: boolean;
    hasApprovalAuthority?: boolean;
    onSubmitForApproval?: () => void;
}



export const FormFillingModal: React.FC<FormFillingModalProps> = ({
    isOpen,
    onClose,
    template,
    formData,
    setFormData,
    isReadOnly,
    onSaveDraft,
    isSavingDraft,
    isApproving,
    isMarkingFinal,
    fullChain,
    isChainLoading,
    maxFileSizeMB,
    isFileUploadEnabled,
    formatDate,
    isExpiringSoon,
    onApprove,
    hasApprovalAuthority,
}) => {
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Check if form has validation errors
    const hasValidationErrors = Object.keys(validationErrors).length > 0;

    if (!isOpen || !template) return null;
    // Assuming status logic is handled by parent passing the right callbacks or we check status here?
    // Parent should handle enable/disable logic ideally, but let's check basic conditions
    // If isReadOnly, buttons are hidden anyway (except maybe Mark Back?)

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold font-headline">{template.title}</h2>
                        <p className="text-indigo-100 text-xs mt-1">{template.description}</p>
                    </div>
                    {template.deadline && (
                        <div className={`flex flex-col items-end ${isExpiringSoon(template.deadline) ? 'animate-pulse' : ''}`}>
                            <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Submission Deadline</span>
                            <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded text-white backdrop-blur-sm">
                                {formatDate(template.deadline)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        disabled={isSavingDraft || isApproving || isMarkingFinal}
                        className={`p-2 hover:bg-white/10 rounded-full transition-colors ${(isSavingDraft || isApproving || isMarkingFinal) ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-indigo-50/50 border-b border-indigo-100 p-1 shrink-0">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all rounded-xl ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-gray-500 hover:text-indigo-400'}`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        Form Data
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all rounded-xl ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-gray-500 hover:text-indigo-400'}`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Workflow History
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1 global-scrollbar bg-white">
                    <div className="flex flex-col gap-8">
                        {activeTab === 'history' ? (
                            <MovementHistory
                                history={fullChain}
                                isLoading={isChainLoading}
                            />
                        ) : (
                            /* Form Renderer */
                            <DynamicFormRenderer
                                fields={template.fields || []}
                                formData={formData || {}}
                                onChange={(id, value) => setFormData((prev: any) => ({ ...prev, [id]: value }))}
                                onValidationChange={setValidationErrors}
                                readOnly={isReadOnly}
                                maxFileSizeMB={maxFileSizeMB}
                                isFileUploadEnabled={isFileUploadEnabled}
                            />
                        )}


                        {/* Declaration for Approvers */}
                        {!isReadOnly && activeTab === 'form' && hasApprovalAuthority && (
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3 mb-2 animate-in fade-in slide-in-from-bottom-2">
                                <input
                                    type="checkbox"
                                    id="declaration"
                                    className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                                    checked={formData['declaration_checkbox'] === true || formData['declaration_checkbox'] === 'true'}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, declaration_checkbox: e.target.checked }))}
                                />
                                <label htmlFor="declaration" className="text-sm text-indigo-900/80 leading-relaxed cursor-pointer select-none font-medium">
                                    I hereby declare that I have reviewed the information provided in this form and it is accurate to the best of my knowledge. I approve this submission.
                                </label>
                            </div>
                        )}

                        {/* Actions */}
                        {!isReadOnly && activeTab === 'form' && (
                            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={isSavingDraft || isApproving || isMarkingFinal}
                                    label="Cancel"
                                    className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 h-[42px]"
                                />

                                <Button
                                    variant="secondary"
                                    onClick={onSaveDraft}
                                    loading={isSavingDraft}
                                    disabled={hasValidationErrors || isApproving || isMarkingFinal}
                                    icon={<Save className="w-4 h-4" />}
                                    label={isSavingDraft ? "Saving..." : "Save Draft"}
                                    className="w-full sm:w-auto h-[42px] whitespace-nowrap"
                                />

                                {/* Restore Approve Button for users with authority */}
                                {hasApprovalAuthority && (
                                    <Button
                                        variant="primary"
                                        onClick={onApprove}
                                        loading={isApproving}
                                        disabled={hasValidationErrors || isSavingDraft || isMarkingFinal || !formData['declaration_checkbox']}
                                        icon={<div className="w-4 h-4">✓</div>}
                                        label={isApproving ? "Approving..." : "Approve"}
                                        className="w-full sm:w-auto h-[42px] whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
