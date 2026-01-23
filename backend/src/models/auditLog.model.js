/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        resource: {
            type: String,
            required: true,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
            index: true,
        },
        changes: {
            before: { type: Object },
            after: { type: Object },
        },
        metadata: {
            ip: String,
            userAgent: String,
            method: String,
            url: String,
        },
    },
    {
        timestamps: true,
    }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
