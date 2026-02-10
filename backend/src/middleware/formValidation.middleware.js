/**
 * @fileoverview Express Middleware - Request/response processing
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-08
 */

import { validateForm } from '../utils/validationRules.js';
import ApiErrors from '../utils/ApiErrors.js';

/**
 * Middleware to validate form submission data
 * 
 * Expects req.body to contain:
 * - formData: Object with field values
 * - fields: Array of field definitions with validation rules
 */
export const validateFormSubmission = (req, res, next) => {
    const { formData, fields } = req.body;

    if (!formData || !fields) {
        return next();
    }

    // Validate the form data
    const errors = validateForm(formData, fields);

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
        throw new ApiErrors('Form validation failed', 400, errors);
    }

    // Validation passed, continue to next middleware
    next();
};

/**
 * Validates form data against a form schema
 * Used when the form schema is already loaded
 * 
 * @param {Object} formData - The form data to validate
 * @param {Object} formSchema - The form schema with fields
 * @returns {Object} Validation errors object (empty if valid)
 */
export const validateAgainstSchema = (formData, formSchema) => {
    if (!formSchema || !formSchema.fields) {
        return {};
    }

    return validateForm(formData, formSchema.fields);
};
