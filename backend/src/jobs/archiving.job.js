/**
 * @fileoverview Background Job - Automated reference archiving
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import cron from "node-cron";
import { SystemConfig } from "../models/systemConfig.model.js";
import { LocalReference } from "../models/localReference.model.js";
import { GlobalReference } from "../models/globalReference.model.js";
import { ArchivedLocalReference } from "../models/archivedLocalReference.model.js";
import { ArchivedGlobalReference } from "../models/archivedGlobalReference.model.js";
import mongoose from "mongoose";

// Run daily at 2:00 AM (Central standard time or local)
cron.schedule("0 2 * * *", async () => {
    console.log("[Archiving Job] Starting automated archiving...");

    try {
        // Fetch configs
        const configs = await SystemConfig.find({
            key: { $in: ["AUTO_ARCHIVE_ENABLED", "ARCHIVE_RETENTION_DAYS"] }
        });

        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);

        if (!configMap["AUTO_ARCHIVE_ENABLED"]) {
            console.log("[Archiving Job] Automated archiving is disabled. Skipping.");
            return;
        }

        const retentionDays = parseInt(configMap["ARCHIVE_RETENTION_DAYS"]) || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const query = {
            status: 'Closed',
            updatedAt: { $lt: cutoffDate }
        };

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Archive Local
            const localToMove = await LocalReference.find(query).session(session);
            if (localToMove.length > 0) {
                const prepared = localToMove.map(ref => {
                    const obj = ref.toObject();
                    obj.originalId = obj._id;
                    delete obj._id;
                    obj.archivedAt = new Date();
                    return obj;
                });
                await ArchivedLocalReference.insertMany(prepared, { session });
                await LocalReference.deleteMany(query, { session });
            }

            // Archive Global
            const globalToMove = await GlobalReference.find(query).session(session);
            if (globalToMove.length > 0) {
                const prepared = globalToMove.map(ref => {
                    const obj = ref.toObject();
                    obj.originalId = obj._id;
                    delete obj._id;
                    obj.archivedAt = new Date();
                    return obj;
                });
                await ArchivedGlobalReference.insertMany(prepared, { session });
                await GlobalReference.deleteMany(query, { session });
            }

            await session.commitTransaction();
            console.log(`[Archiving Job] Successfully archived ${localToMove.length} local and ${globalToMove.length} global references.`);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error("[Archiving Job] Failed:", error);
    }
});
