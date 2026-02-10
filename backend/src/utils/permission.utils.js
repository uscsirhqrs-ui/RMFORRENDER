/**
 * @fileoverview Utility Functions - Helper functions and common utilities
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { SystemConfig } from "../models/systemConfig.model.js";

/**
 * Checks if a specific role has permission for a feature based on SystemConfig.
 * 
 * @param {string} role - The user's role
 * @param {string} featureName - The feature to check
 * @returns {Promise<boolean>} True if permitted, false otherwise
 */
export const hasPermission = async (role, featureName) => {
    const config = await SystemConfig.findOne({ key: "FEATURE_PERMISSIONS" });
    if (!config || !Array.isArray(config.value)) {
        return false;
    }

    const permission = config.value.find(p => p.feature === featureName);
    return permission ? permission.roles.includes(role) : false;
};

/**
 * Checks if ANY of the user's available roles has permission for a feature.
 * 
 * @param {Object} user - The user object from req.user
 * @param {string} featureName - The feature to check
 * @returns {Promise<boolean>} True if permitted, false otherwise
 */
export const checkUserPermission = async (user, featureName) => {
    if (!user) return false;

    // Check active role
    if (await hasPermission(user.role, featureName)) return true;

    // Check all available roles
    if (user.availableRoles && user.availableRoles.length > 0) {
        const results = await Promise.all(
            user.availableRoles.map(role => hasPermission(role, featureName))
        );
        return results.some(res => res === true);
    }

    return false;
};

/**
 * Gets all roles that have a specific permission.
 * 
 * @param {string} featureName - The feature to check
 * @returns {Promise<string[]>} List of roles
 */
export const getRolesWithPermission = async (featureName) => {
    const config = await SystemConfig.findOne({ key: "FEATURE_PERMISSIONS" });
    if (!config || !Array.isArray(config.value)) {
        return [];
    }

    const permission = config.value.find(p => p.feature === featureName);
    return permission ? permission.roles : [];
};
