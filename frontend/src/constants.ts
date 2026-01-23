/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000/api/v1`;
export const SUPERADMIN_ROLE_NAME = 'Superadmin';

// constants/roleCodes.ts
export const FeatureCodes = {
    FEATURE_VIEW_OWN_OFFICE_SENDER: 'VIEW_REFS_OWN',
    FEATURE_VIEW_INTER_OFFICE_SENDER: 'VIEW_REFS_GLOBAL',
    FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE: 'MANAGE_REFS_LOCAL_OWN',
    FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES: 'MANAGE_REFS_LOCAL_ALL',
    FEATURE_MANAGE_GLOBAL_REFERENCES: 'MANAGE_REFS_GLOBAL',
    FEATURE_FORM_MANAGEMENT: 'MANAGE_FORMS',
    FEATURE_MANAGE_USERS_OWN_OFFICE: 'MANAGE_USERS_OWN',
    FEATURE_MANAGE_USERS_ALL_OFFICES: 'MANAGE_USERS_ALL',
    FEATURE_AUDIT_TRAILS: 'VIEW_AUDIT_TRAILS',
    FEATURE_SYSTEM_CONFIGURATION: 'SYSTEM_CONFIG',


    // ...
} as const;