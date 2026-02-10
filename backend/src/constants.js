/**
 * @fileoverview Constants - Application-wide constants and enums
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

export const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dlw8d6p7n/image/upload/v1705606764/avatar_default_qyyz2m.png";
export const DEFAULT_COVER_IMAGE_URL = "https://res.cloudinary.com/dlw8d6p7n/image/upload/v1705606765/cover_default_yq1m8h.jpg";

export const SUPERADMIN_ROLE_NAME = 'Superadmin';

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
};

export const ReferenceType = {
    GLOBAL: 'GREF-',
    LOCAL: 'LREF-',
    VIP: 'VREF-'
};