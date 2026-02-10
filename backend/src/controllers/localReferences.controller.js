/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { LocalReference } from "../models/localReference.model.js";
import { FeatureCodes, SUPERADMIN_ROLE_NAME, ReferenceType } from "../constants.js";
import { LocalMovement } from "../models/localRefMovement.model.js";
import { logActivity } from "../utils/audit.utils.js";
import { sendEmail, getNewReferenceEmailTemplate, getUpdateReferenceEmailTemplate } from "../utils/mail.js";
import mongoose from 'mongoose';
import { createNotification } from './notification.controller.js';
import { generateUniqueRefId, validateRemarks, getUserDisplayName } from "../utils/reference.utils.js";
import { getReferencesWithDetailsPipeline } from "../pipelines/reference.pipelines.js";
import { hasPermission, getRolesWithPermission, checkUserPermission } from "../utils/permission.utils.js";

/**
 * Helper to build the final match criteria for local references based on user permissions and filters.
 * Ensures strict consistency between getAllLocalReferences and getLocalDashboardStats.
 */
const buildLocalReferenceCriteria = async (user, query) => {
    const { isHidden, isArchived, labs } = query;
    const userId = new mongoose.Types.ObjectId(user._id);
    const userLab = user.labName;

    const isSystemAdmin = await checkUserPermission(user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    const hasGlobalAdmin = await checkUserPermission(user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);

    // ONLY Global Admins and System Admins have unrestricted view across labs/office.
    // Local Viewers and Local Managers (own office) are restricted to participation ONLY.
    const canSeeAllLabRefs = isSystemAdmin || hasGlobalAdmin;

    // Base criteria: MUST be in the user's lab UNLESS they are a Global Admin (Superadmin)
    let criteria = hasGlobalAdmin ? {} : { labName: userLab };

    // Lab Filter (Multi-select support, only for Global Admin or those with permission)
    if (labs) {
        const labArray = Array.isArray(labs) ? labs : labs.split(',');
        if (labArray.length > 0) {
            // If not global admin, we already have {labName: userLab}, but we can further restrict it 
            // if they selected their own lab. If they selected another lab and aren't global admin, 
            // the intersection will naturally be empty (which is correct/secure).
            criteria.labName = { $in: labArray };
        }
    }

    // Ownership criteria: non-authorized users only see references they are part of
    if (!canSeeAllLabRefs) {
        criteria.participants = userId;
        criteria.isHidden = { $ne: true };
        criteria.isArchived = { $ne: true };
    } else {
        // Authorized users visibility filters
        if (isHidden !== undefined) {
            criteria.isHidden = isHidden === 'true';
        } else {
            criteria.isHidden = { $ne: true };
        }

        if (isArchived !== undefined) {
            criteria.isArchived = isArchived === 'true';
        } else {
            criteria.isArchived = { $ne: true };
        }
    }

    return criteria;
};

/**
 * Fetches all local references for the user's lab.
 */
export const getAllLocalReferences = asyncHandler(async (req, res) => {
    const {
        status,
        priority,
        markedTo,
        createdBy,
        division,
        subject,
        pendingDays,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const matchCriteria = await buildLocalReferenceCriteria(req.user, req.query);
    const userId = new mongoose.Types.ObjectId(req.user._id);
    // Apply filters
    if (status) matchCriteria.status = { $in: Array.isArray(status) ? status : status.split(',') };
    if (priority) matchCriteria.priority = { $in: Array.isArray(priority) ? priority : priority.split(',') };
    if (division) matchCriteria.markedToDivision = { $in: Array.isArray(division) ? division : division.split(',') };

    // Marked To & Created By (Directly in Details or existing IDs)
    if (markedTo || createdBy) {
        const andConditions = [];

        if (markedTo) {
            if (markedTo === 'me') {
                andConditions.push({ markedTo: userId });
            } else {
                const values = Array.isArray(markedTo) ? markedTo : markedTo.split(',');
                // Resolve emails to IDs for robust filtering
                const users = await User.find({ email: { $in: values } }).select('_id');
                const userIds = users.map(u => u._id);

                andConditions.push({
                    $or: [
                        { 'markedToDetails.email': { $in: values } },
                        { markedTo: { $in: userIds } }
                    ]
                });
            }
        }

        if (createdBy) {
            const values = Array.isArray(createdBy) ? createdBy : createdBy.split(',');
            // Resolve emails to IDs for robust filtering
            const users = await User.find({ email: { $in: values } }).select('_id');
            const userIds = users.map(u => u._id);

            andConditions.push({
                $or: [
                    { 'createdByDetails.email': { $in: values } },
                    { createdBy: { $in: userIds } }
                ]
            });
        }

        if (andConditions.length > 0) {
            matchCriteria.$and = andConditions;
        }
    }

    if (subject) {
        matchCriteria.$or = [
            { subject: { $regex: subject, $options: 'i' } },
            { refId: { $regex: subject, $options: 'i' } }
        ];
    }

    if (pendingDays) {
        const days = parseInt(pendingDays);
        if (!isNaN(days)) {
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            matchCriteria.createdAt = { $lte: cutoffDate };
        }
    }


    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await LocalReference.countDocuments(matchCriteria);
    const pipeline = getReferencesWithDetailsPipeline(matchCriteria);
    pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const data = await LocalReference.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, 'Local references fetched successfully', {
        data,
        pagination: {
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            limit
        }
    }));
});

/**
 * Creates a new Local Reference.
 * Enforces that markedTo user is in the same lab.
 */
export const createLocalReference = asyncHandler(async (req, res) => {
    const { subject, remarks, status, priority, markedTo, eofficeNo } = req.body;

    if (!remarks || remarks.trim() === '') {
        throw new ApiErrors("Remarks are required", 400);
    }

    await validateRemarks(remarks);

    const markedToUser = await User.findById(markedTo);
    if (!markedToUser) {
        throw new ApiErrors("Assignee not found", 404);
    }

    if (markedToUser._id.toString() === req.user._id.toString()) {
        throw new ApiErrors("You cannot mark a local reference to yourself", 400);
    }

    // LAB ISOLATION CHECK
    if (markedToUser.labName !== req.user.labName) {
        throw new ApiErrors("Forbidden: Local references can only be marked to users within your own lab.", 403);
    }

    const newReference = new LocalReference({
        subject,
        remarks,
        status,
        priority,
        eofficeNo,
        createdBy: req.user._id,
        markedTo: [markedToUser._id],
        refId: await generateUniqueRefId(LocalReference, ReferenceType.LOCAL),
        labName: req.user.labName,
        participants: [req.user._id, markedToUser._id],
        markedToDivision: markedToUser.division,
        createdByDetails: {
            fullName: req.user.fullName,
            email: req.user.email,
            labName: req.user.labName,
            designation: req.user.designation,
            division: req.user.division
        },
        markedToDetails: [{
            _id: markedToUser._id,
            fullName: markedToUser.fullName,
            email: markedToUser.email,
            labName: markedToUser.labName,
            designation: markedToUser.designation,
            division: markedToUser.division
        }]
    });
    await newReference.save();

    // Initial Movement
    const movement = new LocalMovement({
        reference: newReference._id,
        markedTo: newReference.markedTo,
        performedBy: req.user._id,
        performedByDetails: {
            fullName: req.user.fullName,
            email: req.user.email,
            labName: req.user.labName,
            designation: req.user.designation,
            division: req.user.division
        },
        markedToDetails: [{
            _id: markedToUser._id,
            fullName: markedToUser.fullName,
            email: markedToUser.email,
            labName: markedToUser.labName,
            designation: markedToUser.designation,
            division: markedToUser.division
        }],
        statusOnMovement: newReference.status,
        remarks: remarks || 'Local reference created.',
        movementDate: new Date()
    });
    await movement.save();

    await logActivity(req, "LOCAL_REFERENCE_CREATE", "LocalReference", newReference._id, {
        after: newReference.toObject()
    });

    // Notifications (Non-blocking)
    (async () => {
        try {
            const creatorName = getUserDisplayName(req.user);
            await sendEmail({
                to: markedToUser.email,
                subject: `New Local Reference: ${newReference.subject} [${newReference.refId}]`,
                html: getNewReferenceEmailTemplate(newReference, creatorName)
            });

            await createNotification(
                markedTo,
                'REFERENCE_ASSIGNED',
                'New Local Reference',
                `You have been assigned a new local reference: ${subject}`,
                newReference._id,
                'LocalReference'
            );
        } catch (error) {
            console.error("Notification failed for local reference:", error);
        }
    })();

    res.status(201).json(new ApiResponse(201, 'Local reference created successfully', newReference));
});

/**
 * Get Local Reference by ID
 */
export const getLocalReferenceById = asyncHandler(async (req, res) => {
    const reference = await LocalReference.findById(req.params.id).lean();

    if (!reference) {
        throw new ApiErrors('Local reference not found', 404);
    }

    const isSystemAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    const hasGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
    const isAdmin = isSystemAdmin || hasGlobalAdmin;

    // Access Check: Same lab OR Global Admin
    if (!hasGlobalAdmin && reference.labName !== req.user.labName) {
        throw new ApiErrors('Forbidden: This reference belongs to another lab', 403);
    }
    const isParticipant = reference.participants.some(p => p.toString() === req.user._id.toString());

    if (!isAdmin && !isParticipant) {
        const inHistory = await LocalMovement.exists({
            reference: reference._id,
            $or: [{ markedTo: req.user._id }, { performedBy: req.user._id }]
        });
        if (!inHistory) {
            throw new ApiErrors('Forbidden: You do not have access to this reference', 403);
        }
    }

    const movements = await LocalMovement.find({ reference: reference._id })
        .sort({ movementDate: 1 })
        .lean();

    res.status(200).json(new ApiResponse(200, 'Local reference fetched successfully', { reference, movements }));
});

/**
 * Fetches dashboard statistics for local references in the user's lab.
 */
export const getLocalDashboardStats = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const baseCriteria = await buildLocalReferenceCriteria(req.user, req.query);

    const [openCount, highPriorityCount, pending7DaysCount, closedThisMonthCount, markedToUserCount, pendingInDivisionCount, totalReferences] = await Promise.all([
        LocalReference.countDocuments({ ...baseCriteria, status: { $ne: 'Closed' } }),
        LocalReference.countDocuments({ ...baseCriteria, priority: 'High', status: { $ne: 'Closed' } }),
        LocalReference.countDocuments({
            ...baseCriteria,
            createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            status: { $ne: 'Closed' }
        }),
        LocalReference.countDocuments({
            ...baseCriteria,
            status: 'Closed',
            updatedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }),
        LocalReference.countDocuments({ ...baseCriteria, markedTo: userId, status: { $ne: 'Closed' } }),
        req.user.division ? LocalReference.countDocuments({ ...baseCriteria, markedToDivision: req.user.division, status: { $ne: 'Closed' } }) : Promise.resolve(0),
        LocalReference.countDocuments(baseCriteria)
    ]);

    res.status(200).json(new ApiResponse(200, 'Local stats fetched successfully', {
        openCount,
        highPriorityCount,
        pending7DaysCount,
        closedThisMonthCount,
        markedToUserCount,
        pendingInDivisionCount,
        totalReferences
    }));
});

/**
 * Bulk updates for Local References.
 */
export const bulkUpdateLocalReferences = asyncHandler(async (req, res, next) => {
    const { ids, action, force } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ApiErrors('Invalid or empty IDs array', 400);
    }



    const hasGlobalAdmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
    const hasLocalAdmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);

    // NOTE: We removed the admin-only check here. Regular users can now bulk assign references marked to them.
    // Admins have broader permissions (can manage any reference in their scope).
    // The actual ownership validation happens later in the 'assign' action case.

    // Verify all IDs belong to user's lab if only local admin (or regular user)
    if (!hasGlobalAdmin) {
        const count = await LocalReference.countDocuments({
            _id: { $in: ids },
            labName: req.user.labName
        });
        if (count !== ids.length) {
            throw new ApiErrors('Forbidden: You can only manage references within your own lab', 403);
        }
    }

    let updateFields = {};
    switch (action) {
        case 'hide':
            updateFields = { isHidden: true };
            break;
        case 'unhide':
            updateFields = { isHidden: false };
            break;
        case 'archive':
            // Validation: References must be 'Closed' OR (Old enough AND Force=true)

            // 1. Check for references that are ACTIVE and RECENT (Cannot archive ever)
            // Retention policy: 365 days (default) based on updatedAt
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 365);

            const activeRecentCount = await LocalReference.countDocuments({
                _id: { $in: ids },
                status: { $ne: 'Closed' },
                updatedAt: { $gt: cutoffDate }
            });

            if (activeRecentCount > 0) {
                throw new ApiErrors("Cannot archive active references updated within the last 1 year.", 400);
            }

            // 2. Check for references that are ACTIVE but OLD (Allowed with warning/confirmation)
            const activeOldCount = await LocalReference.countDocuments({
                _id: { $in: ids },
                status: { $ne: 'Closed' },
                updatedAt: { $lte: cutoffDate }
            });

            if (activeOldCount > 0 && !force) {
                // Return a specific error/status to trigger frontend confirmation
                throw new ApiErrors("CONFIRM_ARCHIVE: Selected items include active references older than 1 year. Confirm to archive?", 409);
            }

            updateFields = { isArchived: true };
            break;
        case 'unarchive':
            updateFields = { isArchived: false };
            break;
        case 'assign':
            const { assignTo, remarks } = req.body;
            if (!assignTo) throw new ApiErrors("Assignee ID is required for assignment", 400);

            const targetUser = await User.findById(assignTo);
            if (!targetUser) throw new ApiErrors("Assignee not found", 404);

            const finalRemarks = remarks || "Forwarded for consideration/perusal/necessary action please";

            // LAB ISOLATION: Target must be in same lab (or is Superadmin/Global Admin? No, Local Refs are strictly Local usually)
            // Allow assigning to Superadmins even if different lab? Maybe. But mostly same lab.
            if (targetUser.labName !== req.user.labName) {
                // Check if target is Global Admin?
                // Simple rule: Local Reference = Same Lab.
                throw new ApiErrors("Forbidden: Can only assign local references to users in the same lab", 403);
            }

            // Fetch all refs to validate
            const refsToAssign = await LocalReference.find({ _id: { $in: ids } });

            // UPFRONT VALIDATION: Check all references before processing any
            const validationErrors = [];
            const isAdmin = hasGlobalAdmin || hasLocalAdmin;



            for (const ref of refsToAssign) {
                // 1. Ownership Check
                const isMarkedToUser = Array.isArray(ref.markedTo)
                    ? ref.markedTo.some(id => {
                        const idStr = id.toString();
                        const userIdStr = req.user._id.toString();
                        return idStr === userIdStr;
                    })
                    : ref.markedTo && ref.markedTo.toString() === req.user._id.toString();


                if (!isMarkedToUser && !isAdmin) {
                    validationErrors.push({
                        refId: ref.refId,
                        reason: 'Not currently assigned to you'
                    });
                }
            }



            // If any validation errors, throw detailed error
            if (validationErrors.length > 0) {
                const errorDetails = validationErrors.map(e => `${e.refId} (${e.reason})`).join(', ');
                throw new ApiErrors(
                    `Cannot reassign ${validationErrors.length} reference(s): ${errorDetails}. You can only reassign references currently marked to you.`,
                    403
                );
            }

            // All validations passed, now process updates
            for (const refId of ids) {
                const ref = await LocalReference.findById(refId);
                if (!ref) continue;

                // Update fields
                ref.markedTo = [targetUser._id];
                ref.markedToDivision = targetUser.division;
                ref.markedToDetails = [{
                    _id: targetUser._id,
                    fullName: targetUser.fullName,
                    email: targetUser.email,
                    labName: targetUser.labName,
                    designation: targetUser.designation,
                    division: targetUser.division
                }];

                // Add to participants (Target and Actor)
                const participantsToAdd = [targetUser._id, req.user._id];
                participantsToAdd.forEach(id => {
                    if (!ref.participants.some(p => p.toString() === id.toString())) {
                        ref.participants.push(id);
                    }
                });

                // Update latest remarks
                ref.remarks = finalRemarks;

                await ref.save();

                // Log Movement
                await LocalMovement.create({
                    reference: ref._id,
                    markedTo: ref.markedTo,
                    performedBy: req.user._id,
                    performedByDetails: {
                        fullName: req.user.fullName,
                        email: req.user.email,
                        labName: req.user.labName,
                        designation: req.user.designation,
                        division: req.user.division
                    },
                    markedToDetails: [{
                        _id: targetUser._id,
                        fullName: targetUser.fullName,
                        email: targetUser.email,
                        labName: targetUser.labName,
                        designation: targetUser.designation,
                        division: targetUser.division
                    }],
                    statusOnMovement: ref.status,
                    remarks: finalRemarks,
                    movementDate: new Date()
                });

                // Notification (Async)
                createNotification(
                    targetUser._id,
                    'REFERENCE_ASSIGNED',
                    'Local Reference Assigned',
                    `Local Reference ${ref.refId} has been assigned to you.`,
                    ref._id,
                    'LocalReference'
                ).catch(err => console.error("Notification Error", err));
            }

            res.status(200).json(new ApiResponse(200, "References assigned successfully"));
            return; // Exit here as we handled response
        default:
            throw new ApiErrors('Invalid action specified', 400);
    }

    const result = await LocalReference.updateMany(
        { _id: { $in: ids } },
        { $set: updateFields }
    );

    await logActivity(req, `LOCAL_REFERENCE_BULK_${action.toUpperCase()}`, "LocalReference", null, {
        ids,
        action,
        updateFields
    });

    res.status(200).json(new ApiResponse(200, `Bulk ${action} successful`, { modifiedCount: result.modifiedCount }));
});

/**
 * Delete a Local Reference.
 */
export const deleteLocalReference = asyncHandler(async (req, res) => {
    const referenceId = req.params.id;
    const reference = await LocalReference.findById(referenceId);

    if (!reference) {
        throw new ApiErrors('Reference not found', 404);
    }

    if (reference.labName !== req.user.labName) {
        throw new ApiErrors('Forbidden: This reference belongs to another lab', 403);
    }

    const hasGlobalAdmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
    const hasLocalAdmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
    const isAdmin = hasGlobalAdmin || hasLocalAdmin;

    // Only Admin or Creator (if allowed?) usually deletion is stricter.
    // Let's assume Admin OR Creator.
    const isCreator = reference.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
        throw new ApiErrors('Forbidden: You do not have permission to delete this reference', 403);
    }

    await LocalReference.findByIdAndDelete(referenceId);
    await logActivity(req, "LOCAL_REFERENCE_DELETE", "LocalReference", referenceId, {
        before: reference.toObject()
    });

    res.status(200).json(new ApiResponse(200, "Reference deleted successfully"));
});

/**
 * Update a Local Reference.
 */
export const updateLocalReference = asyncHandler(async (req, res) => {
    const referenceId = req.params.id;
    const { subject, remarks, status, priority, markedTo, eofficeNo } = req.body;

    const reference = await LocalReference.findById(referenceId);
    if (!reference) {
        throw new ApiErrors("Local reference not found", 404);
    }

    // Access Check: Same lab OR Global Admin
    const isGlobalAdmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
    if (!isGlobalAdmin && reference.labName !== req.user.labName) {
        throw new ApiErrors("Forbidden: This reference belongs to another lab", 403);
    }

    const beforeState = reference.toObject();

    // 1. CLOSING: Auto-assign to all Local Admins
    let newMarkedTo = markedTo;
    if (status === 'Closed' && reference.status !== 'Closed') {
        const localAdminRoles = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
        const globalAdminRoles = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);

        // Find ALL approved users who:
        // 1. Belong to the same lab AND have `Manage References(own lab)` in availableRoles
        // 2. OR Have `Manage References(all labs)` in availableRoles
        let admins = await User.find({
            $or: [
                {
                    labName: reference.labName,
                    availableRoles: { $in: localAdminRoles }
                },
                {
                    availableRoles: { $in: globalAdminRoles }
                }
            ],
            status: 'Approved'
        }).select('_id fullName email labName');

        // Fallback: If no admins found, search for Superadmin role in availableRoles
        if (admins.length === 0) {
            admins = await User.find({
                availableRoles: SUPERADMIN_ROLE_NAME, // Keep this or look up by permission?
                // Ideally look up by permission, but availableRoles usually stores Roles.
                // We'll leave this as 'Superadmin' because it's looking up ROLES in the DB array, not checking a user object.
                // UNLESS we first find which roles have "System Configuration".
                status: 'Approved'
            }).select('_id fullName email labName');
        }

        if (admins.length > 0) {
            newMarkedTo = admins.map(u => u._id);
        } else {
            console.warn("No authorized admins found to assign closed local reference to. Keeping current markedTo.");
            newMarkedTo = Array.isArray(reference.markedTo) ? reference.markedTo : [reference.markedTo];
        }
    }

    if (status !== 'Closed' && newMarkedTo && String(newMarkedTo) === String(req.user._id)) {
        throw new ApiErrors("You cannot mark a local reference to yourself", 400);
    }

    const nextUsers = await User.find({ _id: { $in: Array.isArray(newMarkedTo) ? newMarkedTo : [newMarkedTo] } });
    if (nextUsers.length === 0) {
        throw new ApiErrors("Assignee(s) not found", 404);
    }

    // LAB ISOLATION CHECK: Ensure marked to users are in the reference's lab (or are Superadmins)
    // LAB ISOLATION CHECK: Ensure marked to users are in the reference's lab (or are Superadmins)
    const nextUsersAreSuperadmins = await Promise.all(nextUsers.map(u => checkUserPermission(u, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)));

    // Check if any user is NOT in same lab AND NOT a superadmin
    const invalidUser = nextUsers.find((u, index) => u.labName !== reference.labName && !nextUsersAreSuperadmins[index]);

    if (invalidUser) {
        throw new ApiErrors("Forbidden: Local references can only be marked to users within the reference's lab.", 403);
    }

    reference.subject = subject || reference.subject;
    reference.remarks = remarks || reference.remarks;
    reference.status = status || reference.status;
    reference.priority = priority || reference.priority;
    reference.eofficeNo = eofficeNo !== undefined ? eofficeNo : reference.eofficeNo;

    reference.markedTo = nextUsers.map(u => u._id);
    reference.markedToDivision = nextUsers[0].division;
    reference.markedToDetails = nextUsers.map(u => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        labName: u.labName,
        designation: u.designation,
        division: u.division
    }));

    // Add to participants (Both target and actor)
    const participantsToAdd = [...nextUsers.map(u => u._id), req.user._id];
    participantsToAdd.forEach(id => {
        if (!reference.participants.some(p => p.toString() === id.toString())) {
            reference.participants.push(id);
        }
    });

    await reference.save();

    await logActivity(req, "LOCAL_REFERENCE_UPDATE", "LocalReference", reference._id, {
        before: beforeState,
        after: reference.toObject()
    });

    const movement = new LocalMovement({
        reference: reference._id,
        // onModel: 'LocalReference',
        markedTo: reference.markedTo,
        performedBy: req.user._id,
        performedByDetails: {
            fullName: req.user.fullName,
            email: req.user.email,
            labName: req.user.labName,
            designation: req.user.designation,
            division: req.user.division
        },
        markedToDetails: reference.markedToDetails,
        statusOnMovement: reference.status,
        remarks: remarks || 'Local reference updated.',
        movementDate: new Date()
    });
    await movement.save();

    // Notifications (Non-blocking)
    (async () => {
        try {
            const actorName = getUserDisplayName(req.user);
            for (const user of nextUsers) {
                if (user._id.toString() !== req.user._id.toString()) {
                    // Email
                    if (user.email) {
                        const emailContent = getUpdateReferenceEmailTemplate(reference, actorName, 'Update');
                        sendEmail({
                            to: user.email,
                            subject: `Local Reference Updated: ${reference.subject} [${reference.refId}]`,
                            html: emailContent
                        }).catch(err => console.error(`Failed to send email to ${user.email}:`, err));
                    }

                    // Internal Notification
                    await createNotification(
                        user._id,
                        'REFERENCE_ASSIGNED',
                        'Local Reference Updated',
                        `A local reference has been assigned or updated to you: ${reference.subject}`,
                        reference._id,
                        'LocalReference'
                    );
                }
            }
        } catch (error) {
            console.error("Notification failed for local reference update:", error);
        }
    })();

    res.status(200).json(new ApiResponse(200, "Local reference updated successfully", reference));
});

/**
 * Issue a reminder for a Local Reference.
 */
export const issueLocalReminder = asyncHandler(async (req, res) => {
    const { referenceId, userIds, remarks, priority } = req.body;

    const reference = await LocalReference.findById(referenceId);
    if (!reference) {
        throw new ApiErrors("Local reference not found", 404);
    }

    if (reference.labName !== req.user.labName) {
        throw new ApiErrors("Forbidden: This reference belongs to another lab", 403);
    }

    // Logic for sending emails and notifications
    for (const userId of userIds) {
        const targetUser = await User.findById(userId);
        if (targetUser && targetUser.labName === req.user.labName) {
            // Send Email (Placeholder or use getReminderEmailTemplate if available)
            // For now, use a simple notification
            await createNotification(
                userId,
                'REFERENCE_REMINDER',
                'Local Reference Reminder',
                `Reminder for reference: ${reference.subject}. ${remarks}`,
                reference._id,
                'LocalReference'
            );
        }
    }

    await logActivity(req, "LOCAL_REFERENCE_REMINDER", "LocalReference", reference._id, {
        userIds,
        remarks,
        priority
    });

    res.status(200).json(new ApiResponse(200, "Reminders issued successfully"));
});

/**
 * Request to reopen a closed Local Reference.
 */
export const requestLocalReopen = asyncHandler(async (req, res) => {
    const referenceId = req.params.id;
    const { remarks } = req.body;

    const reference = await LocalReference.findById(referenceId);
    if (!reference) {
        throw new ApiErrors("Local reference not found", 404);
    }

    if (reference.labName !== req.user.labName) {
        throw new ApiErrors("Forbidden: This reference belongs to another lab", 403);
    }

    if (reference.status !== 'Closed') {
        throw new ApiErrors("Reference is not closed", 400);
    }

    // Generate Request ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestId = `REQ-${dateStr}-${randomSuffix}`;

    reference.reopenRequest = {
        requestId,
        requestedBy: req.user._id,
        reason: remarks,
        requestedAt: new Date()
    };

    await reference.save();

    await logActivity(req, "LOCAL_REFERENCE_REOPEN_REQUEST", "LocalReference", reference._id, {
        remarks
    });

    res.status(200).json(new ApiResponse(200, "Reopen request submitted successfully"));
});

/**
 * Fetches unique filter values (Divisions, Statuses, Priorities, CreatedBy, MarkedTo) for Local References.
 * Checks permissions to determine if the user sees all lab references (Admin) or only their own (User).
 */
export const getLocalReferenceFilters = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const userLab = req.user.labName;

    const isSystemAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    const hasGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);

    // ONLY Global Admins and System Admins have unrestricted view for filters.
    // Local Managers and Viewers are restricted to participation.
    const canSeeAllFilters = isSystemAdmin || hasGlobalAdmin;



    // Base match criteria
    let matchCriteria = {};

    if (canSeeAllFilters) {
        // Authorized users see all references for their lab (or all labs if Global Admin)
        matchCriteria = hasGlobalAdmin ? {} : { labName: userLab };
    } else {
        // Normal users only see references they participate in
        matchCriteria = {
            participants: userId,
            labName: userLab // Redundant but safe
        };
    }

    const { isArchived, isHidden } = req.query;

    // Filter by Archived status (Default: Exclude archived)
    if (isArchived !== undefined) {
        matchCriteria.isArchived = isArchived === 'true';
    } else {
        matchCriteria.isArchived = { $ne: true };
    }

    // Filter by Hidden status (Default: Exclude hidden)
    if (isHidden !== undefined) {
        matchCriteria.isHidden = isHidden === 'true';
    } else {
        matchCriteria.isHidden = { $ne: true };
    }

    // Aggregation Pipeline
    const pipeline = [
        { $match: matchCriteria },
        {
            $facet: {
                uniqueDivisions: [
                    { $group: { _id: "$markedToDivision" } },
                    { $match: { _id: { $ne: "Unknown" } } }
                ],
                uniqueStatuses: [{ $group: { _id: "$status" } }],
                uniquePriorities: [{ $group: { _id: "$priority" } }],
                uniqueCreatedBy: [
                    { $group: { _id: "$createdByDetails.email", details: { $first: "$createdByDetails" } } }
                ],
                uniqueMarkedTo: [
                    { $unwind: { path: "$markedToDetails", preserveNullAndEmptyArrays: true } },
                    { $group: { _id: "$markedToDetails.email", details: { $first: "$markedToDetails" } } },
                    { $match: { _id: { $ne: null } } }
                ],
                uniqueLabs: [
                    { $group: { _id: "$labName" } },
                    { $match: { _id: { $ne: null } } }
                ]
            }
        }
    ];

    const results = await LocalReference.aggregate(pipeline);

    // Extract and format data
    let creationUsers = [];
    let assignmentUsers = [];
    let divs = [];
    let stats = [];
    let prios = [];
    let labs = [];

    if (results && results[0]) {
        const data = results[0];

        // Process Users
        const createdByMap = new Map();
        (data.uniqueCreatedBy || []).forEach(item => {
            if (item.details && item.details.email) {
                createdByMap.set(item.details.email, item.details);
            }
        });
        creationUsers = Array.from(createdByMap.values()).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

        const markedToMap = new Map();
        (data.uniqueMarkedTo || []).forEach(item => {
            if (item.details && item.details.email) {
                markedToMap.set(item.details.email, item.details);
            }
        });
        assignmentUsers = Array.from(markedToMap.values()).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));


        // Process other fields
        divs = (data.uniqueDivisions || []).map(d => d._id).filter(Boolean).sort();
        stats = (data.uniqueStatuses || []).map(d => d._id).filter(Boolean).sort();
        prios = (data.uniquePriorities || []).map(d => d._id).filter(Boolean).sort();
        labs = (data.uniqueLabs || []).map(d => d._id).filter(Boolean).sort();
    }

    // Fetch ALL approved users in the same lab for bulk assignment dropdown
    // This is separate from markedToUsers which is used for filtering
    const allLabUsers = await User.find({
        labName: userLab,
        status: 'Approved'
    }).select('_id fullName email labName designation division').lean();

    // Format all lab users
    const formattedAllLabUsers = allLabUsers.map(u => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        labName: u.labName,
        designation: u.designation,
        division: u.division
    })).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

    res.status(200).json(new ApiResponse(200, 'Local reference filters fetched successfully', {
        createdByUsers: creationUsers,
        markedToUsers: assignmentUsers, // Users from existing references (for filter dropdowns)
        allLabUsers: formattedAllLabUsers, // All approved lab users (for bulk assign dropdown)
        divisions: divs,
        statuses: stats,
        priorities: prios,
        labs
    }));
});
