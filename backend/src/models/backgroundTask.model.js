/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import mongoose from "mongoose";

const backgroundTaskSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["FORM_DISTRIBUTION", "FORM_UPDATE", "FORM_LIFECYCLE"],
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
        default: "PENDING"
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    processedItems: {
        type: Number,
        default: 0
    },
    totalItems: {
        type: Number,
        default: 0
    },
    metadata: {
        type: Map,
        of: String
    },
    error: {
        type: String
    }
}, { timestamps: true });

// Index for efficient querying by user and status
backgroundTaskSchema.index({ user: 1, status: 1 });
backgroundTaskSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

export const BackgroundTask = mongoose.model("BackgroundTask", backgroundTaskSchema);
