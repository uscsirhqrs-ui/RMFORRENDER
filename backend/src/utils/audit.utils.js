/**
 * @fileoverview Utility Functions - Helper functions and common utilities
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { AuditLog } from "../models/auditLog.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";

/**
 * Logs a user activity into the AuditLog collection.
 * ...
 */
export const logActivity = async (req, action, resource, resourceId, changes = null, manualUserId = null) => {
    try {
        // Check if logging is enabled
        const config = await SystemConfig.findOne({ key: "IS_AUDIT_LOGGING_ENABLED" });
        if (config && config.value === false) {
            console.log("DEBUG: Audit logging is currently PAUSED. Skipping log creation.");
            return;
        }

        const userId = manualUserId || req.user?._id;
        console.log(`DEBUG: logActivity attempt - Action: ${action}, Resource: ${resource}, User: ${userId}`);

        if (!userId) {
            console.warn("DEBUG: No userId provided or found in request. Skipping log.");
            return;
        }

        // Safer metadata extraction
        const ip = req.ip ||
            req.headers['x-forwarded-for'] ||
            req.socket?.remoteAddress ||
            req.connection?.remoteAddress ||
            "unknown";

        const logData = {
            user: userId,
            action,
            resource,
            resourceId,
            changes,
            metadata: {
                ip,
                userAgent: req.headers?.['user-agent'] || "unknown",
                method: req.method || "unknown",
                url: req.originalUrl || req.url || "unknown",
            },
        };

        console.log("DEBUG: Creating AuditLog with data:", JSON.stringify(logData, null, 2));

        const logEntry = await AuditLog.create(logData);
        console.log("DEBUG: Audit log entry created successfully. ID:", logEntry._id);
    } catch (error) {
        console.error("DEBUG: CRITICAL ERROR in logActivity:", error);
    }
};
