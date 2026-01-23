/**
 * @fileoverview Background Job - Scheduled or queue-based task
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import cron from "node-cron";
import { AuditLog } from "../models/auditLog.model.js";

// This will eventually fetch from a global config collection or env variable
// For now, it defaults to 1 year (365 days)
let retentionDays = 365;

export const setRetentionDays = (days) => {
    retentionDays = days;
};

// Run daily at midnight
cron.schedule("0 0 * * *", async () => {
    console.log("Running Audit Log retention cleanup...");

    if (retentionDays === -1) {
        console.log("Retention set to permanent. Skipping cleanup.");
        return;
    }

    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await AuditLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        console.log(`Cleaned up ${result.deletedCount} audit logs older than ${retentionDays} days.`);
    } catch (error) {
        console.error("Error during audit log retention cleanup:", error);
    }
});
