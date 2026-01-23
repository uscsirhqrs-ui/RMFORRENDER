/**
 * @fileoverview Data Model - Defines database schema and model methods
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // Can be Number, String, Object, etc.
        required: true
    },
    description: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);
