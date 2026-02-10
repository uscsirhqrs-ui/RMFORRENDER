/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

// Prefer dynamic hostname in development to allow network access (IP based) without CORS/Cookie issues
export const API_BASE_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
export const SUPERADMIN_ROLE_NAME = 'Superadmin';

// constants/roleCodes.ts
export const FeatureCodes = {
    FEATURE_VIEW_OWN_OFFICE_SENDER: 'VIEW_REFS_OWN',
    FEATURE_VIEW_INTER_OFFICE_SENDER: 'VIEW_REFS_GLOBAL',
    FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE: 'MANAGE_REFS_LOCAL_OWN',
    FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES: 'MANAGE_REFS_LOCAL_ALL',
    FEATURE_MANAGE_GLOBAL_REFERENCES: 'MANAGE_REFS_GLOBAL',
    FEATURE_FORM_MANAGEMENT_OWN_LAB: 'MANAGE_FORMS_OWN',
    FEATURE_FORM_MANAGEMENT_INTER_LAB: 'MANAGE_FORMS_INTER',
    FEATURE_MANAGE_USERS_OWN_OFFICE: 'MANAGE_USERS_OWN',
    FEATURE_MANAGE_USERS_ALL_OFFICES: 'MANAGE_USERS_ALL',
    FEATURE_AUDIT_TRAILS: 'VIEW_AUDIT_TRAILS',
    FEATURE_SYSTEM_CONFIGURATION: 'SYSTEM_CONFIG',


    // ...
} as const;

// Form Workflow Constants (Type-safe alternative to enums)
export const FormStatus = {
    PENDING: 'Pending',
    EDITED: 'Edited',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RETURNED: 'Returned'
} as const;

export const FormAction = {
    INITIATED: 'Initiated',
    DELEGATED: 'Delegated',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    MARKED_BACK: 'Marked Back',
    SENT_FOR_APPROVAL: 'Sent for Approval',
    EDITED: 'Edited'
} as const;

export const MovementType = {
    INITIATED: 'Initiated',
    DELEGATED: 'Delegated',
    RETURNED: 'Returned',
    SUBMITTED: 'Submitted',
    ACTION: 'Action'
} as const;

// Type exports for type safety
export type FormStatusType = typeof FormStatus[keyof typeof FormStatus];
export type FormActionType = typeof FormAction[keyof typeof FormAction];
export type MovementTypeType = typeof MovementType[keyof typeof MovementType];