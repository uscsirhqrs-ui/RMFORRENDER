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
import InputField from './InputField';
import DropDownWithSearch from './DropDownWithSearch';
import { Calendar, Upload, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { validateField, type ValidationRule } from '../../utils/validationRules';

export interface FormField {
    id: string;
    type: 'text' | 'select' | 'date' | 'radio' | 'checkbox' | 'file' | 'header';
    label: string;
    placeholder?: string;
    section?: string;
    columnSpan?: number;
    description?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    validation?: {
        isNumeric?: boolean;
        isEmail?: boolean;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        rules?: Array<{
            type: 'required' | 'email' | 'numeric' | 'mobile' | 'pan' | 'aadhaar' | 'pincode' | 'ifsc' | 'gstin' | 'pattern' | 'minLength' | 'maxLength' | 'min' | 'max';
            message?: string;
            value?: any;
            pattern?: string;
        }>;
    };
}

interface DynamicFormRendererProps {
    fields: FormField[];
    formData: Record<string, any>;
    onChange?: (id: string, value: any, field: FormField) => void;
    readOnly?: boolean;
    maxFileSizeMB?: number;
    isFileUploadEnabled?: boolean;
    onValidationChange?: (errors: Record<string, string>) => void;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
    fields,
    formData,
    onChange,
    readOnly = false,
    maxFileSizeMB = 1,
    isFileUploadEnabled = true,
    onValidationChange
}) => {
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Validate all required fields on mount and when formData/fields change
    useEffect(() => {
        if (readOnly) return;

        const validateAllFields = () => {
            const errors: Record<string, string> = {};

            fields.forEach(field => {
                // Skip header fields
                if (field.type === 'header') return;

                const rules: ValidationRule[] = [];

                // Add required rule if field is marked as required
                if (field.required) {
                    rules.push({ type: 'required' });
                }

                // Add validation rules from field definition
                if (field.validation?.rules && field.validation.rules.length > 0) {
                    rules.push(...field.validation.rules);
                } else {
                    // Auto-detect validation rules from field label
                    const lowerLabel = field.label.toLowerCase();

                    if (lowerLabel.includes('email') || lowerLabel.includes('e-mail')) {
                        rules.push({ type: 'email' });
                    }
                    if (lowerLabel.includes('mobile') || lowerLabel.includes('phone') || lowerLabel.includes('contact number')) {
                        rules.push({ type: 'mobile' });
                    }
                    if (lowerLabel.includes('pan') && !lowerLabel.includes('company') && !lowerLabel.includes('span')) {
                        rules.push({ type: 'pan' });
                    }
                    if (lowerLabel.includes('aadhaar') || lowerLabel.includes('aadhar')) {
                        rules.push({ type: 'aadhaar' });
                    }
                    if (lowerLabel.includes('pincode') || lowerLabel.includes('pin code') || lowerLabel.includes('postal code')) {
                        rules.push({ type: 'pincode' });
                    }
                    if (lowerLabel.includes('ifsc')) {
                        rules.push({ type: 'ifsc' });
                    }
                    if (lowerLabel.includes('gstin') || (lowerLabel.includes('gst') && lowerLabel.includes('number'))) {
                        rules.push({ type: 'gstin' });
                    }
                }

                // Legacy validation support
                if (field.validation?.isEmail) {
                    rules.push({ type: 'email' });
                }
                if (field.validation?.isNumeric) {
                    rules.push({ type: 'numeric' });
                }

                // Validate the field
                const error = validateField(formData[field.id], rules);
                if (error) {
                    errors[field.id] = error;
                }
            });

            setFieldErrors(errors);
            onValidationChange?.(errors);
        };

        validateAllFields();
    }, [formData, fields, readOnly, onValidationChange]);


    // Helper to check if field requires numeric-only input
    const isNumericField = (field: FormField): boolean => {
        // Check validation rules
        if (field.validation?.rules) {
            const hasNumericRule = field.validation.rules.some(
                rule => rule.type === 'numeric' || rule.type === 'mobile' ||
                    rule.type === 'aadhaar' || rule.type === 'pincode'
            );
            if (hasNumericRule) return true;
        }

        // Check legacy validation flags
        if (field.validation?.isNumeric) return true;

        // Auto-detect from label
        const lowerLabel = field.label.toLowerCase();
        return (
            lowerLabel.includes('mobile') ||
            lowerLabel.includes('phone') ||
            lowerLabel.includes('contact number') ||
            lowerLabel.includes('aadhaar') ||
            lowerLabel.includes('aadhar') ||
            lowerLabel.includes('pincode') ||
            lowerLabel.includes('pin code') ||
            lowerLabel.includes('postal code')
        );
    };

    // Helper to get maximum length for specific field types
    const getMaxLength = (field: FormField): number | undefined => {
        // Check validation rules for specific types
        if (field.validation?.rules) {
            for (const rule of field.validation.rules) {
                switch (rule.type) {
                    case 'mobile': return 10;
                    case 'pan': return 10;
                    case 'aadhaar': return 12;
                    case 'pincode': return 6;
                    case 'ifsc': return 11;
                    case 'gstin': return 15;
                    case 'maxLength': return rule.value;
                }
            }
        }

        // Auto-detect from label
        const lowerLabel = field.label.toLowerCase();
        if (lowerLabel.includes('mobile') || lowerLabel.includes('phone') || lowerLabel.includes('contact number')) {
            return 10;
        }
        if (lowerLabel.includes('pan') && !lowerLabel.includes('company') && !lowerLabel.includes('span')) {
            return 10;
        }
        if (lowerLabel.includes('aadhaar') || lowerLabel.includes('aadhar')) {
            return 12;
        }
        if (lowerLabel.includes('pincode') || lowerLabel.includes('pin code') || lowerLabel.includes('postal code')) {
            return 6;
        }
        if (lowerLabel.includes('ifsc')) {
            return 11;
        }
        if (lowerLabel.includes('gstin') || (lowerLabel.includes('gst') && lowerLabel.includes('number'))) {
            return 15;
        }

        return undefined;
    };

    // Handle key press for numeric fields - prevent non-numeric input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: FormField) => {
        if (!isNumericField(field)) return;

        // Allow: backspace, delete, tab, escape, enter
        if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
            return;
        }
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
            return;
        }
        // Allow: home, end, left, right, up, down
        if (e.keyCode >= 35 && e.keyCode <= 40) {
            return;
        }
        // Prevent if not a number (0-9 on main keyboard or numpad)
        if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    };

    // Helper to safely call onChange if not readOnly
    const handleChange = (id: string, value: any, field: FormField) => {
        if (!readOnly && onChange) {
            // For numeric fields, strip non-numeric characters
            let processedValue = value;
            if (typeof value === 'string' && isNumericField(field)) {
                processedValue = value.replace(/\D/g, '');
            }

            // Enforce maximum length for specific field types
            const maxLength = getMaxLength(field);
            if (maxLength && typeof processedValue === 'string' && processedValue.length > maxLength) {
                processedValue = processedValue.substring(0, maxLength);
            }

            onChange(id, processedValue, field);
            // Clear error when user starts typing
            if (fieldErrors[id]) {
                const newErrors = { ...fieldErrors };
                delete newErrors[id];
                setFieldErrors(newErrors);
                onValidationChange?.(newErrors);
            }
        }
    };

    // Validate field on blur
    const handleBlur = (id: string, value: any, field: FormField) => {
        if (readOnly) return;

        const rules: ValidationRule[] = [];

        // Add required rule if field is marked as required
        if (field.required) {
            rules.push({ type: 'required' });
        }

        // Add validation rules from field definition
        if (field.validation?.rules && field.validation.rules.length > 0) {
            rules.push(...field.validation.rules);
        } else {
            // Auto-detect validation rules from field label if no rules are defined
            const lowerLabel = field.label.toLowerCase();

            if (lowerLabel.includes('email') || lowerLabel.includes('e-mail')) {
                rules.push({ type: 'email' });
            }
            if (lowerLabel.includes('mobile') || lowerLabel.includes('phone') || lowerLabel.includes('contact number')) {
                rules.push({ type: 'mobile' });
            }
            if (lowerLabel.includes('pan') && !lowerLabel.includes('company') && !lowerLabel.includes('span')) {
                rules.push({ type: 'pan' });
            }
            if (lowerLabel.includes('aadhaar') || lowerLabel.includes('aadhar')) {
                rules.push({ type: 'aadhaar' });
            }
            if (lowerLabel.includes('pincode') || lowerLabel.includes('pin code') || lowerLabel.includes('postal code')) {
                rules.push({ type: 'pincode' });
            }
            if (lowerLabel.includes('ifsc')) {
                rules.push({ type: 'ifsc' });
            }
            if (lowerLabel.includes('gstin') || (lowerLabel.includes('gst') && lowerLabel.includes('number'))) {
                rules.push({ type: 'gstin' });
            }
        }

        // Legacy validation support
        if (field.validation?.isEmail) {
            rules.push({ type: 'email' });
        }
        if (field.validation?.isNumeric) {
            rules.push({ type: 'numeric' });
        }

        const error = validateField(value, rules);
        const newErrors = { ...fieldErrors };

        if (error) {
            newErrors[id] = error;
        } else {
            delete newErrors[id];
        }

        setFieldErrors(newErrors);
        onValidationChange?.(newErrors);
    };

    // Group fields by section
    const groupedFields = fields.reduce((acc, field) => {
        const section = field.section || "General Information";
        if (!acc[section]) acc[section] = [];
        acc[section].push(field);
        return acc;
    }, {} as Record<string, FormField[]>);

    return (
        <div className="space-y-10">
            {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
                <div key={sectionName} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{sectionName}</h3>
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {sectionFields.map((field) => (
                            <div
                                key={field.id}
                                className={`${field.columnSpan === 2 || field.type === 'header' || ['checkbox', 'radio', 'file'].includes(field.type) ? 'md:col-span-2' : ''} relative`}
                            >
                                {field.type === 'header' && (
                                    <div className="py-2 border-b-2 border-indigo-600/10 mb-2">
                                        <h4 className="text-sm font-bold text-slate-800">{field.label}</h4>
                                        {field.description && <p className="text-[10px] text-slate-400 mt-0.5">{field.description}</p>}
                                    </div>
                                )}

                                {field.type === 'text' && (
                                    <div>
                                        <InputField
                                            id={field.id}
                                            label={field.label}
                                            type="text"
                                            placeholder={field.placeholder}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleChange(field.id, e.target.value, field)}
                                            onBlur={(e) => handleBlur(field.id, e.target.value, field)}
                                            onKeyDown={(e) => handleKeyDown(e, field)}
                                            maxLength={getMaxLength(field)}
                                            required={field.required}
                                            disabled={readOnly}
                                        />
                                        {fieldErrors[field.id] && (
                                            <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                <span>{fieldErrors[field.id]}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {field.type === 'date' && (
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm ${readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white border-slate-200'}`}
                                                value={formData[field.id] || ''}
                                                onChange={(e) => handleChange(field.id, e.target.value, field)}
                                                disabled={readOnly}
                                            />
                                            <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                {field.type === 'select' && (
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <DropDownWithSearch
                                            placeholder={field.placeholder || "Select an option"}
                                            options={field.options || []}
                                            selectedValue={formData[field.id] || ''}
                                            onChange={(val) => handleChange(field.id, val, field)}
                                            disabled={readOnly}
                                        />
                                    </div>
                                )}

                                {field.type === 'radio' && (
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700">{field.label}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                                            {field.options?.map((opt, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => handleChange(field.id, opt.value, field)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${!readOnly ? 'cursor-pointer hover:border-indigo-200 hover:bg-white' : 'cursor-not-allowed'} ${formData[field.id] === opt.value ? 'bg-indigo-50 border-indigo-200' : 'border-transparent'}`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData[field.id] === opt.value ? 'border-indigo-600 bg-white' : 'border-slate-300 bg-white'}`}>
                                                        {formData[field.id] === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                                    </div>
                                                    <span className="text-[11px] text-slate-600 font-medium">{opt.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {field.type === 'checkbox' && (
                                    <div
                                        onClick={() => !readOnly && handleChange(field.id, !formData[field.id], field)}
                                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${readOnly ? 'bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-indigo-200 cursor-pointer'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${formData[field.id] ? 'bg-indigo-600 border-indigo-500' : 'bg-white border-slate-100'}`}>
                                                <CheckCircle2 className={`w-5 h-5 ${formData[field.id] ? 'text-white' : 'text-indigo-600'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{field.label}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{field.description || (readOnly ? `Simulated checkbox control` : formData[field.id] ? 'Selected' : 'Click to toggle')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-white rounded border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {readOnly ? 'Read Only' : formData[field.id] ? 'Selected' : 'Toggle'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {field.type === 'file' && (
                                    <div className="space-y-2">
                                        <input
                                            id={`file-input-${field.id}`}
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                            onChange={(e) => {
                                                if (readOnly || !isFileUploadEnabled) return;
                                                const file = e.target.files?.[0];
                                                if (file) handleChange(field.id, file, field);
                                            }}
                                            disabled={readOnly || !isFileUploadEnabled}
                                        />
                                        <div
                                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${readOnly ? 'bg-slate-50 border-slate-100 cursor-not-allowed' :
                                                !isFileUploadEnabled ? 'bg-red-50/10 border-red-100 cursor-not-allowed opacity-80' :
                                                    'bg-white border-slate-100 hover:border-indigo-200 cursor-pointer'
                                                } ${formData[field.id] ? 'border-indigo-500 bg-indigo-50/30' : ''}`}
                                            onClick={() => {
                                                if (!readOnly && isFileUploadEnabled) {
                                                    document.getElementById(`file-input-${field.id}`)?.click();
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${formData[field.id] ? 'bg-indigo-600 border-indigo-500 text-white' :
                                                    !isFileUploadEnabled ? 'bg-red-50 border-red-100 text-red-400' :
                                                        'bg-white border-slate-100 text-indigo-600'
                                                    }`}>
                                                    {formData[field.id] ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-700">{field.label}</p>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] flex items-center gap-2">
                                                        {formData[field.id] instanceof File ? (
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="truncate">Selected: {formData[field.id].name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleChange(field.id, null, field); }}
                                                                    className="p-0.5 hover:bg-slate-200 rounded-full transition-colors shrink-0"
                                                                    title="Remove file"
                                                                >
                                                                    <X className="w-2.5 h-2.5 text-slate-500" />
                                                                </button>
                                                            </div>
                                                        ) : formData[field.id]?.url ? (
                                                            <div className="flex items-center gap-2 truncate">
                                                                <a
                                                                    href={formData[field.id].url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 group truncate"
                                                                >
                                                                    <span className="hover:underline truncate">{formData[field.id].name || 'View Uploaded File'}</span>
                                                                </a>
                                                                {!readOnly && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleChange(field.id, null, field); }}
                                                                        className="p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors shrink-0 bg-slate-100/50"
                                                                        title="Delete uploaded file"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <span className="truncate">{field.description || (readOnly ? `No file uploaded` : `Click to upload file`)}</span>
                                                                {!readOnly && isFileUploadEnabled && (
                                                                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight italic">
                                                                        System Limit: Max {maxFileSizeMB}MB
                                                                    </span>
                                                                )}
                                                                {!readOnly && !isFileUploadEnabled && (
                                                                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-tight italic">
                                                                        File Uploads are disabled by Administrator
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!readOnly && isFileUploadEnabled && (
                                                    <span className="px-2 py-1 bg-white rounded border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {formData[field.id] ? 'Change' : 'Upload'}
                                                    </span>
                                                )}
                                                {!readOnly && !isFileUploadEnabled && (
                                                    <span className="px-2 py-1 bg-red-50 rounded border border-red-100 text-[9px] font-bold text-red-400 uppercase tracking-tighter">
                                                        Disabled
                                                    </span>
                                                )}
                                                {readOnly && formData[field.id] && (
                                                    <span className="px-2 py-1 bg-white rounded border border-slate-100 text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">
                                                        Stored
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {fields.length === 0 && (
                <div className="text-center text-gray-400 py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-sm font-medium">No fields to display.</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1">Template is empty</p>
                </div>
            )}
        </div>
    );
};

export default DynamicFormRenderer;
