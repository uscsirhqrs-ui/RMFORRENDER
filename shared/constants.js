// Dynamic API URL selection: defaults to specific IP for Mobile, but uses localhost if running in browser
const isLocalhost = typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost';
export const API_BASE_URL = isLocalhost
    ? "http://localhost:8000/api/v1"
    : "http://10.43.13.241:8000/api/v1";

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

export const FormStatus = {
    PENDING: 'Pending',
    EDITED: 'Edited',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RETURNED: 'Returned'
};

export const FormAction = {
    INITIATED: 'Initiated',
    DELEGATED: 'Delegated',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    MARKED_BACK: 'Marked Back',
    SENT_FOR_APPROVAL: 'Sent for Approval',
    EDITED: 'Edited'
};

export const MovementType = {
    INITIATED: 'Initiated',
    DELEGATED: 'Delegated',
    RETURNED: 'Returned',
    SUBMITTED: 'Submitted',
    ACTION: 'Action'
};
