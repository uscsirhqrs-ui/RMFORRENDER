/**
 * @fileoverview Utility Functions - Helper functions for reference management
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import crypto from 'crypto';
import ApiErrors from "./ApiErrors.js";
import { SystemConfig } from "../models/systemConfig.model.js";

/**
 * Generates a unique RefID with prefix and 7-character hex
 * @param {mongoose.Model} Model - The Mongoose model to check for uniqueness against
 * @param {string} prefix - The prefix for the RefID (e.g., 'GREF-', 'LREF-')
 * @returns {Promise<string>} A unique RefID
 */
export const generateUniqueRefId = async (Model, prefix = '') => {
    let refId;
    let isUnique = false;
    while (!isUnique) {
        // Generate 4 bytes = 8 hex chars, slice to 7
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 7);
        refId = `${prefix}${randomPart}`;
        const existing = await Model.findOne({ refId });
        if (!existing) {
            isUnique = true;
        }
    }
    return refId;
};

/**
 * Validates remarks against the word limit in SystemConfig
 * @param {string} remarks - The remarks text to validate
 * @throws {ApiErrors} if word limit is exceeded
 */
export const validateRemarks = async (remarks) => {
    if (!remarks) return;

    const wordCount = remarks.trim().split(/\s+/).length;
    const config = await SystemConfig.findOne({ key: 'REMARKS_WORD_LIMIT' });
    const limit = config ? parseInt(config.value) : 150;

    if (wordCount > limit) {
        throw new ApiErrors(400, `Remarks exceed the maximum word limit of ${limit} words (Current: ${wordCount})`);
    }
};

/**
 * Formats a user's details for display
 * @param {Object} user - User document
 * @returns {string} Formatted display name
 */
export const getUserDisplayName = (user) => {
    if (!user) return "Unknown User";
    const name = user.fullName || "Unknown User";
    const designation = user.designation ? `, ${user.designation}` : "";
    const lab = user.labName ? ` (${user.labName})` : "";
    return `${name}${designation}${lab}`;
};
