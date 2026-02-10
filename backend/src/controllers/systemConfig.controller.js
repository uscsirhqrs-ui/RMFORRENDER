/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import {
    DEFAULT_ALLOWED_DOMAINS,
    DEFAULT_LABS,
    DEFAULT_DESIGNATIONS,
    DEFAULT_DIVISIONS
} from "./settings.controller.js";

/**
 * Get all system configurations.
 * Accessible by all authenticated users (to read limits etc).
 */
export const getSystemConfig = asyncHandler(async (req, res) => {
    // We might want to restrict which configs are returned to general users vs admins eventually.
    // For now, return all is fine, or filter if sensitive.
    const configs = await SystemConfig.find({});

    // Transform into a simple key-value object for easier frontend consumption
    const configMap = {};
    configs.forEach(conf => {
        configMap[conf.key] = conf.value;
    });

    res.status(200).json(new ApiResponse(200, "System configurations fetched successfully", configMap));
});

/**
 * Update system configuration.
 * Only accessible by Superadmin.
 */
export const updateSystemConfig = asyncHandler(async (req, res) => {
    // Expects body like: { "REMARKS_WORD_LIMIT": 200, "ANOTHER_KEY": "value" }
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
        throw new ApiErrors(400, "No configuration updates provided");
    }

    const updatedConfigs = [];

    for (const [key, value] of Object.entries(updates)) {
        const config = await SystemConfig.findOneAndUpdate(
            { key: key.toUpperCase() },
            { $set: { value } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        updatedConfigs.push(config);
    }

    res.status(200).json(new ApiResponse(200, "System configuration updated successfully", updatedConfigs));
});

/**
 * Initialize default configs if they don't exist.
 * Can be called on server startup.
 */
export const initializeDefaultConfigs = async () => {
    const defaults = [
        { key: "REMARKS_WORD_LIMIT", value: 150, description: "Maximum number of words allowed in remarks field" },
        { key: "ARCHIVE_RETENTION_DAYS", value: 365, description: "Days after which closed references are moved to archive" },
        { key: "AUTO_ARCHIVE_ENABLED", value: false, description: "Whether to automatically archive references periodically" },
        { key: "ALLOWED_DOMAINS", value: DEFAULT_ALLOWED_DOMAINS, description: "List of email domains allowed for registration and login" },
        { key: "LABS", value: DEFAULT_LABS, description: "List of CSIR Labs / Institutions" },
        { key: "DESIGNATIONS", value: DEFAULT_DESIGNATIONS, description: "List of standard designations" },
        { key: "DIVISIONS", value: DEFAULT_DIVISIONS, description: "List of divisions / sections" },
        { key: "SHOW_LOGIN_MESSAGE", value: false, description: "Enable showing custom announcement message after login" },
        { key: "LOGIN_MESSAGE_CONTENT", value: "", description: "Content of the custom announcement message" },
        { key: "APPROVAL_AUTHORITY_DESIGNATIONS", value: ["Director General-CSIR", "Director", "Joint Secretary(Admin)"], description: "List of designations authorized for approvals" },
        { key: "MAX_FILE_SIZE_MB", value: 1, description: "Maximum allowed file size for uploads in Megabytes" },
        { key: "FILE_UPLOADS_ENABLED", value: true, description: "Globally enable or disable file uploads in the system" }
    ];

    for (const def of defaults) {
        const exists = await SystemConfig.findOne({ key: def.key });
        if (!exists) {
            await SystemConfig.create(def);

        }
    }
};
