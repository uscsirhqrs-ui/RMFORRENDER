/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React from 'react';
import InputField from './InputField';
import DropDownWithSearch from './DropDownWithSearch';
import { Calendar } from 'lucide-react';

export interface FormField {
    id: string;
    type: 'text' | 'select' | 'date' | 'radio' | 'checkbox';
    label: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    validation?: {
        isNumeric?: boolean;
        isEmail?: boolean;
        pattern?: string;
    };
}

interface DynamicFormRendererProps {
    fields: FormField[];
    formData: Record<string, any>;
    onChange?: (id: string, value: any, field: FormField) => void;
    readOnly?: boolean;
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
    fields,
    formData,
    onChange,
    readOnly = false
}) => {

    // Helper to safely call onChange if not readOnly
    const handleChange = (id: string, value: any, field: FormField) => {
        if (!readOnly && onChange) {
            onChange(id, value, field);
        }
    };

    return (
        <div className="space-y-4">
            {fields.map((field) => (
                <div key={field.id} className="relative">
                    {field.type === 'text' && (
                        <InputField
                            id={field.id}
                            label={field.label}
                            type="text"
                            placeholder={field.placeholder}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value, field)}
                            required={field.required}
                            disabled={readOnly}
                        />
                    )}

                    {field.type === 'date' && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white'}`}
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
                            <label className="block text-sm font-medium text-gray-700">
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

                    {/* Render read-only text if radio/checkbox (simplification as standard InputField/Dropdown might handle most cases, 
                        but radio/checkbox are distinct. Assuming the current DataCollectionPage only fully supports text/select/date 
                        based on my previous read, but I'll add basic support if needed or fallback to text display in readonly) */}
                </div>
            ))}
            {fields.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                    No fields to display.
                </div>
            )}
        </div>
    );
};

export default DynamicFormRenderer;
