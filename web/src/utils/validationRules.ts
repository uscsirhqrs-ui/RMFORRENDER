/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-08
 */

export interface ValidationRule {
    type: 'required' | 'email' | 'numeric' | 'mobile' | 'pan' | 'aadhaar' | 'pincode' | 'ifsc' | 'gstin' | 'pattern' | 'minLength' | 'maxLength' | 'min' | 'max';
    message?: string;
    value?: any;
    pattern?: string;
}

/**
 * Predefined regex patterns for common validations
 */
export const VALIDATION_PATTERNS = {
    // Standard validations
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    numeric: /^\d+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,

    // Indian government documents
    mobile: /^[6-9]\d{9}$/,                                          // 10 digits starting with 6-9
    pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,                              // AAAAA9999A format
    aadhaar: /^\d{12}$/,                                             // 12 digits
    pincode: /^\d{6}$/,                                              // 6 digits
    ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,                                 // AAAA0999999 format
    gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, // 15 characters

    // Other common patterns
    url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    alphabetic: /^[a-zA-Z\s]+$/,
};

/**
 * Default error messages for each validation type
 */
export const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    numeric: 'Please enter only numbers',
    mobile: 'Please enter a valid 10-digit mobile number starting with 6-9',
    pan: 'Please enter a valid PAN (e.g., ABCDE1234F)',
    aadhaar: 'Please enter a valid 12-digit Aadhaar number',
    pincode: 'Please enter a valid 6-digit pincode',
    ifsc: 'Please enter a valid IFSC code (e.g., SBIN0001234)',
    gstin: 'Please enter a valid 15-character GSTIN',
    pattern: 'Invalid format',
    minLength: 'Minimum length not met',
    maxLength: 'Maximum length exceeded',
    min: 'Value is too small',
    max: 'Value is too large',
    url: 'Please enter a valid URL',
    alphabetic: 'Please enter only letters',
};

/**
 * Validates a single field value against an array of validation rules
 *
 * @param value - The field value to validate
 * @param rules - Array of validation rules to apply
 * @returns Error message string if validation fails, null if valid
 */
export const validateField = (
    value: any,
    rules: ValidationRule[]
): string | null => {
    // Convert value to string for validation
    const stringValue = value?.toString().trim() || '';

    for (const rule of rules) {
        const errorMessage = rule.message || DEFAULT_ERROR_MESSAGES[rule.type] || 'Invalid value';

        switch (rule.type) {
            case 'required':
                if (!stringValue) {
                    return errorMessage;
                }
                break;

            case 'email':
                if (stringValue && !VALIDATION_PATTERNS.email.test(stringValue)) {
                    return errorMessage;
                }
                break;

            case 'numeric':
                if (stringValue && !VALIDATION_PATTERNS.numeric.test(stringValue)) {
                    return errorMessage;
                }
                break;

            case 'mobile':
                if (stringValue && !VALIDATION_PATTERNS.mobile.test(stringValue)) {
                    return errorMessage;
                }
                break;

            case 'pan':
                if (stringValue && !VALIDATION_PATTERNS.pan.test(stringValue.toUpperCase())) {
                    return errorMessage;
                }
                break;

            case 'aadhaar':
                if (stringValue && !VALIDATION_PATTERNS.aadhaar.test(stringValue)) {
                    return errorMessage;
                }
                break;

            case 'pincode':
                if (stringValue && !VALIDATION_PATTERNS.pincode.test(stringValue)) {
                    return errorMessage;
                }
                break;

            case 'ifsc':
                if (stringValue && !VALIDATION_PATTERNS.ifsc.test(stringValue.toUpperCase())) {
                    return errorMessage;
                }
                break;

            case 'gstin':
                if (stringValue && !VALIDATION_PATTERNS.gstin.test(stringValue.toUpperCase())) {
                    return errorMessage;
                }
                break;

            case 'pattern':
                if (rule.pattern && stringValue) {
                    const regex = new RegExp(rule.pattern);
                    if (!regex.test(stringValue)) {
                        return errorMessage;
                    }
                }
                break;

            case 'minLength':
                if (rule.value !== undefined && stringValue.length < rule.value) {
                    return rule.message || `Minimum ${rule.value} characters required`;
                }
                break;

            case 'maxLength':
                if (rule.value !== undefined && stringValue.length > rule.value) {
                    return rule.message || `Maximum ${rule.value} characters allowed`;
                }
                break;

            case 'min':
                if (rule.value !== undefined && stringValue) {
                    const numValue = parseFloat(stringValue);
                    if (!isNaN(numValue) && numValue < rule.value) {
                        return rule.message || `Minimum value is ${rule.value}`;
                    }
                }
                break;

            case 'max':
                if (rule.value !== undefined && stringValue) {
                    const numValue = parseFloat(stringValue);
                    if (!isNaN(numValue) && numValue > rule.value) {
                        return rule.message || `Maximum value is ${rule.value}`;
                    }
                }
                break;

            default:
                break;
        }
    }

    return null; // All validations passed
};

/**
 * Validates an entire form's data against field definitions
 * 
 * @param formData - Object containing form field values
 * @param fields - Array of field definitions with validation rules
 * @returns Object mapping field IDs to error messages
 */
export const validateForm = (
    formData: Record<string, any>,
    fields: Array<{ id: string; label: string; validation?: ValidationRule[]; required?: boolean }>
): Record<string, string> => {
    const errors: Record<string, string> = {};

    fields.forEach(field => {
        const rules: ValidationRule[] = [];

        // Add required rule if field is marked as required
        if (field.required) {
            rules.push({ type: 'required' });
        }

        // Add any additional validation rules
        if (field.validation) {
            rules.push(...field.validation);
        }

        const error = validateField(formData[field.id], rules);
        if (error) {
            errors[field.id] = error;
        }
    });

    return errors;
};

/**
 * Auto-detects appropriate validation rules based on field label
 * Used by AI to suggest validations during form generation
 * 
 * @param label - The field label
 * @returns Array of suggested validation rules
 */
export const suggestValidationRules = (label: string): ValidationRule[] => {
    const lowerLabel = label.toLowerCase();
    const rules: ValidationRule[] = [];

    // Email detection
    if (lowerLabel.includes('email') || lowerLabel.includes('e-mail')) {
        rules.push({ type: 'email' });
    }

    // Mobile detection
    if (lowerLabel.includes('mobile') || lowerLabel.includes('phone') || lowerLabel.includes('contact')) {
        rules.push({ type: 'mobile' });
    }

    // PAN detection
    if (lowerLabel.includes('pan')) {
        rules.push({ type: 'pan' });
    }

    // Aadhaar detection
    if (lowerLabel.includes('aadhaar') || lowerLabel.includes('aadhar')) {
        rules.push({ type: 'aadhaar' });
    }

    // Pincode detection
    if (lowerLabel.includes('pincode') || lowerLabel.includes('pin code') || lowerLabel.includes('postal code') || lowerLabel.includes('zip')) {
        rules.push({ type: 'pincode' });
    }

    // IFSC detection
    if (lowerLabel.includes('ifsc')) {
        rules.push({ type: 'ifsc' });
    }

    // GSTIN detection
    if (lowerLabel.includes('gstin') || lowerLabel.includes('gst')) {
        rules.push({ type: 'gstin' });
    }

    // Age detection (numeric with range)
    if (lowerLabel.includes('age')) {
        rules.push({ type: 'numeric' });
        rules.push({ type: 'min', value: 1 });
        rules.push({ type: 'max', value: 120 });
    }

    return rules;
};

/**
 * Formats a value according to validation type (e.g., uppercase for PAN)
 * 
 * @param value - The value to format
 * @param validationType - The type of validation
 * @returns Formatted value
 */
export const formatValue = (value: string, validationType?: string): string => {
    if (!value) return value;

    switch (validationType) {
        case 'pan':
        case 'ifsc':
        case 'gstin':
            return value.toUpperCase();
        case 'mobile':
        case 'aadhaar':
        case 'pincode':
        case 'numeric':
            return value.replace(/\D/g, ''); // Remove non-digits
        case 'email':
            return value.toLowerCase().trim();
        default:
            return value;
    }
};
