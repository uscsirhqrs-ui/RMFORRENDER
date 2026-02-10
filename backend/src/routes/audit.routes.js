/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { Router } from "express";
import { SUPERADMIN_ROLE_NAME } from "../constants.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { AuditLog } from "../models/auditLog.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(verifyJWT);
router.use(authorizeRoles(SUPERADMIN_ROLE_NAME));

router.route("/").get(asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, action, user, resource, startDate, endDate } = req.query;


    const query = {};
    if (action) query.action = action;
    if (user) query.user = user;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }


    const logs = await AuditLog.find(query)
        .populate("user", "fullName email labName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await AuditLog.countDocuments(query);

    return res.status(200).json(new ApiResponse(200, "Audit logs fetched successfully", {
        logs,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        }
    }));
}));

router.route("/settings").get(asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: "IS_AUDIT_LOGGING_ENABLED" });

    if (!config) {
        config = await SystemConfig.create({
            key: "IS_AUDIT_LOGGING_ENABLED",
            value: true,
            description: "Master switch for audit trail logging"
        });
    }

    return res.status(200).json(new ApiResponse(200, "Audit settings fetched", {
        isEnabled: config.value
    }));
}));

router.route("/toggle").post(asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: "IS_AUDIT_LOGGING_ENABLED" });

    if (!config) {
        config = await SystemConfig.create({
            key: "IS_AUDIT_LOGGING_ENABLED",
            value: true,
            description: "Master switch for audit trail logging"
        });
    }

    config.value = !config.value;
    await config.save();

    return res.status(200).json(new ApiResponse(200, `Audit logging ${config.value ? "enabled" : "disabled"}`, {
        isEnabled: config.value
    }));
}));

export default router;
