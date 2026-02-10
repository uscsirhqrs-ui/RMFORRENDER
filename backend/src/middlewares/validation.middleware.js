/**
 * @fileoverview Express Middleware - Request/response processing
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-28
 */

import { body, param, query, validationResult } from 'express-validator';
import ApiErrors from '../utils/ApiErrors.js';
import validator from 'validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        throw new ApiErrors(errorMessages, 400);
    }
    next();
};

/**
 * Password strength validator
 */
const passwordValidator = (value) => {
    if (value.length < 12) {
        throw new Error('Password must be at least 12 characters long');
    }
    if (!validator.isStrongPassword(value, {
        minLength: 12,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        throw new Error('Password must contain uppercase, lowercase, number, and special character');
    }
    return true;
};

/**
 * Validation rules for user registration
 */
export const validateUserRegistration = [
    body('email')
        .trim()
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail()
        .customSanitizer(value => {
            // Ensure email is a string to prevent NoSQL injection
            return typeof value === 'string' ? value : '';
        }),

    body('password')
        .trim()
        .custom(passwordValidator),

    body('fullName')
        .optional()
        .trim()
        .escape()
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),

    body('labName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Lab name must not exceed 100 characters'),

    body('designation')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Designation must not exceed 100 characters'),

    body('division')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Division must not exceed 100 characters'),

    body('mobileNo')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/).withMessage('Mobile number must be 10 digits'),

    handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const validateUserLogin = [
    body('email')
        .trim()
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail()
        .customSanitizer(value => typeof value === 'string' ? value : ''),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required'),

    handleValidationErrors
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange = [
    body('oldPassword')
        .trim()
        .notEmpty().withMessage('Old password is required'),

    body('newPassword')
        .trim()
        .custom(passwordValidator),

    handleValidationErrors
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset = [
    body('userId')
        .trim()
        .isMongoId().withMessage('Invalid user ID'),

    body('token')
        .trim()
        .notEmpty().withMessage('Token is required'),

    body('newPassword')
        .trim()
        .custom(passwordValidator),

    handleValidationErrors
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
    body('email')
        .trim()
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail()
        .customSanitizer(value => typeof value === 'string' ? value : ''),

    handleValidationErrors
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
    body('fullName')
        .optional()
        .trim()
        .escape()
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),

    body('labName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Lab name must not exceed 100 characters'),

    body('designation')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Designation must not exceed 100 characters'),

    body('division')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Division must not exceed 100 characters'),

    body('mobileNo')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/).withMessage('Mobile number must be 10 digits'),

    body('isSubmitted')
        .optional()
        .isBoolean().withMessage('isSubmitted must be a boolean'),

    handleValidationErrors
];

/**
 * Validation rules for MongoDB ID parameters
 */
export const validateMongoId = [
    param('id')
        .trim()
        .isMongoId().withMessage('Invalid ID format'),

    handleValidationErrors
];

/**
 * Validation rules for user ID in params
 */
export const validateUserId = [
    param('userId')
        .trim()
        .isMongoId().withMessage('Invalid user ID format'),

    handleValidationErrors
];

/**
 * Validation rules for bulk operations
 */
export const validateBulkUserIds = [
    body('userIds')
        .isArray({ min: 1 }).withMessage('User IDs must be a non-empty array')
        .custom((value) => {
            if (!value.every(id => validator.isMongoId(id))) {
                throw new Error('All user IDs must be valid MongoDB IDs');
            }
            return true;
        }),

    handleValidationErrors
];

/**
 * Validation rules for reference creation
 */
export const validateReferenceCreate = [
    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required')
        .isLength({ max: 500 }).withMessage('Subject must not exceed 500 characters'),

    body('remarks')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('Remarks must not exceed 5000 characters'),

    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority value'),

    body('markedTo')
        .optional()
        .trim()
        .isMongoId().withMessage('Invalid markedTo user ID'),

    handleValidationErrors
];

/**
 * Validation rules for pagination
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),

    handleValidationErrors
];
