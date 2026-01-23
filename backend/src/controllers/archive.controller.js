/**
 * @fileoverview API Controller - Handles reference archiving logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { LocalReference } from "../models/localReference.model.js";
import { GlobalReference } from "../models/globalReference.model.js";
import { ArchivedLocalReference } from "../models/archivedLocalReference.model.js";
import { ArchivedGlobalReference } from "../models/archivedGlobalReference.model.js";
import mongoose from "mongoose";

/**
 * Get count of references archivable before a specific date.
 * Strictly filters by status 'Closed'.
 */
export const getArchivableCount = asyncHandler(async (req, res) => {
    const { date, type } = req.query; // date: YYYY-MM-DD, type: 'local' | 'global'

    if (!date) {
        throw new ApiErrors(400, "Date cutoff is required");
    }

    const cutoffDate = new Date(date);
    const query = {
        status: 'Closed',
        updatedAt: { $lt: cutoffDate } // Using updatedAt ensures it's been closed for long enough
    };

    let count = 0;
    if (type === 'local') {
        count = await LocalReference.countDocuments(query);
    } else if (type === 'global') {
        count = await GlobalReference.countDocuments(query);
    } else {
        const localCount = await LocalReference.countDocuments(query);
        const globalCount = await GlobalReference.countDocuments(query);
        count = localCount + globalCount;
    }

    res.status(200).json(new ApiResponse(200, "Archivable count fetched", { count }));
});

/**
 * Perform manual batch archiving.
 * Offloads data to archive collections and removes from active collections.
 */
export const performBatchArchiving = asyncHandler(async (req, res) => {
    const { date, type } = req.body;

    if (!date) {
        throw new ApiErrors(400, "Date cutoff is required");
    }

    const cutoffDate = new Date(date);
    const query = {
        status: 'Closed',
        updatedAt: { $lt: cutoffDate }
    };

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let archivedLocal = 0;
        let archivedGlobal = 0;

        // Process Local References
        if (!type || type === 'local') {
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
                archivedLocal = localToMove.length;
            }
        }

        // Process Global References
        if (!type || type === 'global') {
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
                archivedGlobal = globalToMove.length;
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(new ApiResponse(200, "Archiving process completed", {
            local: archivedLocal,
            global: archivedGlobal,
            total: archivedLocal + archivedGlobal
        }));

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiErrors(500, "Archiving process failed: " + error.message);
    }
});
