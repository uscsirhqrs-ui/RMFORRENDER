/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-08
 */

import { useState, useCallback } from 'react';
import { validateField, validateForm, type ValidationRule } from '../utils/validationRules';

interface FormField {
    id: string;
    label: string;
    validation?: ValidationRule[];
    required?: boolean;
}

interface UseFormValidationReturn {
    errors: Record<string, string>;
    validateSingleField: (fieldId: string, value: any, field: FormField) => string | null;
    validateAllFields: (formData: Record<string, any>, fields: FormField[]) => boolean;
    clearError: (fieldId: string) => void;
    clearAllErrors: () => void;
    hasErrors: boolean;
}

/**
 * Custom hook for managing form validation
 * 
 * @returns Validation state and helper functions
 */
export const useFormValidation = (): UseFormValidationReturn => {
    const [errors, setErrors] = useState<Record<string, string>>({});

    /**
     * Validates a single field and updates error state
     */
    const validateSingleField = useCallback((
        fieldId: string,
        value: any,
        field: FormField
    ): string | null => {
        const rules: ValidationRule[] = [];

        // Add required rule if field is marked as required
        if (field.required) {
            rules.push({ type: 'required' });
        }

        // Add any additional validation rules
        if (field.validation) {
            rules.push(...field.validation);
        }

        const error = validateField(value, rules);

        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[fieldId] = error;
            } else {
                delete newErrors[fieldId];
            }
            return newErrors;
        });

        return error;
    }, []);

    /**
     * Validates all fields in the form
     * 
     * @returns true if form is valid, false otherwise
     */
    const validateAllFields = useCallback((
        formData: Record<string, any>,
        fields: FormField[]
    ): boolean => {
        const newErrors = validateForm(formData, fields);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, []);

    /**
     * Clears error for a specific field
     */
    const clearError = useCallback((fieldId: string) => {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
        });
    }, []);

    /**
     * Clears all errors
     */
    const clearAllErrors = useCallback(() => {
        setErrors({});
    }, []);

    return {
        errors,
        validateSingleField,
        validateAllFields,
        clearError,
        clearAllErrors,
        hasErrors: Object.keys(errors).length > 0
    };
};
