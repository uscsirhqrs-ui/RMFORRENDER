/**
 * @fileoverview Express Middleware - Request/response processing
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";


/**
 * Middleware to verify JWT access token.
 * Extracts token from cookies or Authorization header.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {ApiErrors} If token is missing, invalid, or expired
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiErrors("Unauthorized access, token missing", 401);
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiErrors("User not found", 404);
        }

        // Self-healing: Ensure active role is valid
        if (user.availableRoles && user.availableRoles.length > 0 && !user.availableRoles.includes(user.role)) {
            console.warn(`[verifyJWT] Healing invalid role '${user.role}' for user '${user._id}'. Switching to '${user.availableRoles[0]}'`);
            user.role = user.availableRoles[0];
            await user.save({ validateBeforeSave: false }); // Bypass validation to just save the fix
        }

        req.user = user;
        next();

    }
    catch (error) {
        throw new ApiErrors(error?.message || "Invalid token", 401);
    }
})

/**
 * Middleware to check if the user's role has permission for a specific feature.
 * Fetches configuration from SystemConfig.
 * 
 * @param {string} featureName - The name of the feature to check
 */
export const checkPermission = (featureNames) => asyncHandler(async (req, _, next) => {
    if (!req.user) {
        throw new ApiErrors("Unauthorized access, user not found", 401);
    }

    const featuresToCheck = Array.isArray(featureNames) ? featureNames : [featureNames];

    const config = await SystemConfig.findOne({ key: "FEATURE_PERMISSIONS" });
    if (!config || !Array.isArray(config.value)) {
        throw new ApiErrors("Internal Server Error: Feature permissions not configured", 500);
    }

    // Check if user has permission for ANY of the requested features
    const hasAccess = featuresToCheck.some(featureName => {
        const permission = config.value.find(p => p.feature === featureName);
        return permission && permission.roles.includes(req.user.role);
    });

    if (!hasAccess) {
        throw new ApiErrors(`Forbidden: Your role (${req.user.role}) does not have permission to access required features`, 403);
    }

    next();
});

/**
 * Middleware to verify if the user has an Admin role.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {ApiErrors} If user is not an Admin
 */
export const verifyAdmin = asyncHandler(async (req, _, next) => {
    if (req.user?.role !== 'Inter Lab sender' && req.user?.role !== 'Superadmin') {
        throw new ApiErrors("Unauthorized access, Admin role required", 403);
    }
    next();
})

/**
 * Middleware to authorize specific roles.
 * 
 * @param {...string} roles - List of allowed roles
 */
export const authorizeRoles = (...roles) => {
    return (req, _, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new ApiErrors(`Role: ${req.user?.role || "Guest"} is not allowed to access this resource`, 403);
        }
        next();
    };
};