/**
 * @fileoverview Type Definition - Reference model
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

type UserSummary = {
    _id: string;
    fullName: string;
    email: string;
    labName?: string;
    designation?: string;
    division?: string;
};

type UserDetails = {
    fullName: string;
    email: string;
    labName: string;
    designation?: string;
};

type Reference = {
    "_id": string;
    "refId": string;
    "subject": string;
    "eofficeNo"?: string;
    "remarks": string;
    "status": string;
    "priority": string;
    "createdBy": string | UserSummary;
    "createdLab"?: string;
    "pendingDivision"?: string;
    "pendingLab"?: string;
    "markedTo": string | UserSummary | (string | UserSummary)[];
    "participants"?: string[];
    "markedToDivision"?: string;
    "createdByDetails"?: UserDetails;
    "markedToDetails"?: UserDetails | UserDetails[];
    "createdAt": string;
    "updatedAt": string;
    "daysSinceCreated"?: number;
    "daysSinceUpdated"?: number;
    "isHidden"?: boolean;
    "isArchived"?: boolean;
    "isInterLab"?: boolean;
    "labName"?: string;
    "deliveryMode"?: 'Eoffice' | 'Email' | 'Physical';
    "deliveryDetails"?: string;
    "sentAt"?: string | Date;
    "reopenRequest"?: {
        "requestId"?: string;
        "requestedBy": string | { _id: string; fullName: string; email: string };
        "reason": string;
        "requestedAt": string;
    };
    "__v"?: number | string;
};

export type { Reference };