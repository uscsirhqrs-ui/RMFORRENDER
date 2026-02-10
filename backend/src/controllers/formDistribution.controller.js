/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ActiveForm } from "../models/activeForm.model.js";
import { CollectedData } from "../models/collectedData.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";
import { User } from "../models/user.model.js";
import { FormAssignment } from "../models/formAssignment.model.js";
import { createNotification } from "./notification.controller.js";
import { sendEmail, getFormSharedEmailTemplate, getFormReminderEmailTemplate } from "../utils/mail.js";
import { FeatureCodes } from "../constants.js";
import { hasPermission } from "../utils/permission.utils.js";

/**
 * Shares a COPY of a template with other users.
 * This creates a new independent template for each recipient.
 */
const shareTemplateCopy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds, deadline, allowDelegation, allowMultipleSubmissions } = req.body; // Array of user IDs and optional deadline

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target users are required", 400);
    }

    const template = await ActiveForm.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to share this template", 403);
    }

    // Permission Check: Inter-lab sharing restriction
    const canInterLab = await hasPermission(req.user.role, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);
    if (!canInterLab) {
        const recipients = await User.find({ _id: { $in: targetUserIds } }).select("labName");
        const unauthorizedRecipients = recipients.filter(r => r.labName !== req.user.labName);
        if (unauthorizedRecipients.length > 0) {
            throw new ApiErrors("You do not have permission to share forms with users from other labs", 403);
        }
    }

    const name = req.user.fullName || req.user.email;
    const results = [];

    for (const userId of targetUserIds) {
        const newTemplate = await ActiveForm.create({
            title: `Shared: ${template.title}`,
            description: template.description,
            fields: template.fields,
            createdBy: userId,
            sharedWithLabs: [],
            sharedWithUsers: [],
            isPublic: false,
            deadline: deadline || template.deadline || null,
            allowDelegation: allowDelegation !== undefined ? allowDelegation : true,
            allowMultipleSubmissions: allowMultipleSubmissions !== undefined ? allowMultipleSubmissions : false
        });

        await createNotification(
            userId,
            "TEMPLATE_SHARED_COPY",
            "Template Copy Received",
            `${name} has shared a template copy "${template.title}" with you. It is now available in your Saved Forms.`,
            newTemplate._id
        );

        results.push(newTemplate._id);
    }

    return res.status(200).json(
        new ApiResponse(200, "Template copies shared successfully", { count: results.length })
    );
});

// Refactored getSharedWithMe to support Parallel Assignments (Task-based view)
/**
 * Gets forms shared WITH the user (for data collection).
 * Returns specific assignments instead of unique templates.
 */
const getSharedWithMe = asyncHandler(async (req, res) => {
    const user = req.user;

    // Pagination & Filter Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9; // Default 9 for grid view
    const view = req.query.view || 'active'; // 'active' | 'archived'
    const status = req.query.status || 'all'; // 'all' | 'new' | 'pending' | 'submitted' | 'expiring'
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // Construct Pipeline based on FormAssignment
    const pipeline = [];

    // Stage 1: Match Assignments for this user
    const matchStage = {
        assignedTo: user._id,
        status: { $ne: 'Returned' } // Don't show returned (inactive) assignments
    };

    pipeline.push({ $match: matchStage });

    // Stage 2: Lookup Template Details (ActiveForm)
    pipeline.push({
        $lookup: {
            from: "activeforms",
            localField: "templateId",
            foreignField: "_id",
            as: "templateDetails"
        }
    });
    pipeline.push({ $unwind: "$templateDetails" });

    // Stage 3: Archive Filtering (Based on Template's archive status for this user)
    // Note: Archiving on template vs assignment level. 
    // Legacy logic used ActiveForm.archivedBy. We'll stick to that.
    if (view === 'archived') {
        pipeline.push({ $match: { "templateDetails.archivedBy": user._id } });
    } else {
        pipeline.push({ $match: { "templateDetails.archivedBy": { $ne: user._id } } });
    }

    // Stage 4: Search
    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { "templateDetails.title": { $regex: search, $options: 'i' } },
                    { "templateDetails.description": { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    // Stage 5: Lookup Creator Details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "templateDetails.createdBy",
            foreignField: "_id",
            as: "creatorDetails",
            pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
        }
    });
    pipeline.push({ $unwind: { path: "$creatorDetails", preserveNullAndEmptyArrays: true } });

    // Stage 6: Lookup Assigner Details (Who assigned this specific task)
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "assignedBy",
            foreignField: "_id",
            as: "assignedByDetails",
            pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
        }
    });
    pipeline.push({ $unwind: { path: "$assignedByDetails", preserveNullAndEmptyArrays: true } });

    // Stage 7: Lookup My Submission (To determine exact status)
    pipeline.push({
        $lookup: {
            from: "collecteddatas",
            localField: "dataId",
            foreignField: "_id",
            as: "mySubmission",
            pipeline: [{ $project: { _id: 1, status: 1 } }]
        }
    });
    pipeline.push({ $unwind: { path: "$mySubmission", preserveNullAndEmptyArrays: true } });

    // Stage 8: Lookup My Delegation (Has this user delegated it out?)
    // We look for an assignment where assignedBy is ME and templateId matches
    pipeline.push({
        $lookup: {
            from: "formassignments",
            let: { templateId: "$templateId", myId: user._id },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$templateId", "$$templateId"] },
                                { $eq: ["$assignedBy", "$$myId"] },
                                { $ne: ["$status", "Returned"] } // Only active delegations
                            ]
                        }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
                // Populate the person I delegated to for UI "Delegated To: X"
                {
                    $lookup: {
                        from: "users",
                        localField: "assignedTo",
                        foreignField: "_id",
                        as: "delegatedToDetails",
                        pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
                    }
                },
                { $unwind: { path: "$delegatedToDetails", preserveNullAndEmptyArrays: true } }
            ],
            as: "myDelegation"
        }
    });
    pipeline.push({ $unwind: { path: "$myDelegation", preserveNullAndEmptyArrays: true } });

    // Stage 8b: Lookup Latest Assignment in My Branch (Current Holder)
    pipeline.push({
        $lookup: {
            from: "formassignments",
            let: { templateId: "$templateId", myId: user._id },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$templateId", "$$templateId"] },
                                { $in: ["$$myId", "$delegationChain"] }
                            ]
                        }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
                {
                    $lookup: {
                        from: "users",
                        localField: "assignedTo",
                        foreignField: "_id",
                        as: "holder",
                        pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
                    }
                },
                { $unwind: "$holder" },
                { $project: { holder: 1 } }
            ],
            as: "latestBranchAssignment"
        }
    });
    pipeline.push({ $unwind: { path: "$latestBranchAssignment", preserveNullAndEmptyArrays: true } });

    // Stage 8: Add Computed Fields & Map to Frontend Structure
    // We map the assignment structure to look like the 'ActiveForm' structure expected by frontend,
    // but populated with assignment-specific metadata.
    pipeline.push({
        $addFields: {
            // Use Template fields as base
            _id: "$templateDetails._id", // Keep template ID as _id for some compatibility? 
            // NO. Keys will clash. 
            // Let's use template info but keep activeForm ID.
            // Frontend uses keys. We instructed to use assignmentId.
            title: "$templateDetails.title",
            description: "$templateDetails.description",
            deadline: "$templateDetails.deadline",
            createdAt: "$createdAt", // Assignment creation date is more relevant for "Received On"
            isActive: "$templateDetails.isActive",
            allowDelegation: "$templateDetails.allowDelegation",

            // Creator info (Original Owner)
            createdBy: "$creatorDetails",

            // Assigner info (Who sent it to me)
            assignedBy: "$assignedByDetails", // New field for frontend to show "Shared By" correctly

            // Status Logic
            isSubmitted: {
                $cond: {
                    if: {
                        $or: [
                            { $eq: ["$status", "Submitted"] },
                            { $eq: ["$status", "Approved"] },
                            { $eq: ["$mySubmission.status", "Submitted"] },
                            { $eq: ["$mySubmission.status", "Approved"] }
                        ]
                    },
                    then: true,
                    else: false
                }
            },
            workflowStatus: {
                $cond: {
                    if: { $gt: ["$mySubmission.status", null] },
                    then: "$mySubmission.status",
                    else: "$status"
                }
            },

            assignmentId: "$_id", // Crucial for parallel handling
            assignment: "$$ROOT", // Embed full assignment if needed
            myDelegation: "$myDelegation", // NEW: Check if I delegated it
            // currentHolder: "$latestBranchAssignment.holder", // The current holder of the ball
            // FIX: If the form is submitted, the holder is the Initiator (Creator), not the submitter
            currentHolder: {
                $cond: {
                    if: { $eq: ["$latestBranchAssignment.status", "Submitted"] },
                    then: "$creatorDetails",
                    else: "$latestBranchAssignment.holder"
                }
            },

            daysToDeadline: {
                $cond: {
                    if: { $ifNull: ["$templateDetails.deadline", false] },
                    then: {
                        $divide: [
                            { $subtract: ["$templateDetails.deadline", new Date()] },
                            1000 * 60 * 60 * 24
                        ]
                    },
                    else: null
                }
            }
        }
    });

    // Stage 9: Status Filtering (Re-applied on computed fields)
    if (status !== 'all') {
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

        if (status === 'submitted') {
            pipeline.push({ $match: { isSubmitted: true } });
        } else if (status === 'pending') {
            pipeline.push({ $match: { isSubmitted: false, $or: [{ deadline: { $exists: false } }, { deadline: { $gt: now } }] } });
        } else if (status === 'expiring') {
            pipeline.push({
                $match: {
                    isSubmitted: false,
                    deadline: { $exists: true },
                    daysToDeadline: { $gte: 0, $lte: 3 }
                }
            });
        } else if (status === 'new') {
            pipeline.push({
                $match: {
                    isSubmitted: false,
                    createdAt: { $gte: twoDaysAgo }
                }
            });
        }
    }

    // Stage 10: Deduplication - Group by Template ID to show only one instance per form
    pipeline.push({
        $sort: { createdAt: -1 } // Ensure we get the latest assignment first
    });

    pipeline.push({
        $group: {
            _id: "$templateId",
            doc: { $first: "$$ROOT" } // Keep the latest assignment document
        }
    });

    pipeline.push({
        $replaceRoot: { newRoot: "$doc" }
    });

    // Stage 11: Sorting (Assignment creation date - re-sort after grouping)
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 12: Faceted Pagination
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }]
        }
    });

    const result = await FormAssignment.aggregate(pipeline);

    const data = result[0].data || [];
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Shared forms (assignments) fetched successfully", {
            forms: data,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        })
    );
});

/**
 * Gets forms shared BY the user (distributed for collection).
 */
const getSharedByMe = asyncHandler(async (req, res) => {
    const user = req.user;

    // Pagination & Filter Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const view = req.query.view || 'active'; // 'active' | 'archived'
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // 1. Initial Match
    // Only show forms CREATED by the user (Primary Distributor)
    // Delegated forms are viewed in "Shared With Me"
    const matchCriteria = {
        createdBy: user._id,
        $or: [
            { sharedWithUsers: { $exists: true, $not: { $size: 0 } } },
            { sharedWithLabs: { $exists: true, $not: { $size: 0 } } },
            { isPublic: true }
        ]
    };

    // Archive Logic
    if (view === 'archived') {
        matchCriteria.archivedBy = user._id;
    } else {
        matchCriteria.archivedBy = { $ne: user._id };
    }

    const pipeline = [];

    // Stage 1: Match
    let matchStage = { ...matchCriteria };
    if (search) {
        matchStage.$or = matchStage.$or || []; // Should generally exist from above, but rigorous check
        // We need to be careful mixing $or from above.
        // Let's use $and
        matchStage = {
            $and: [
                matchCriteria,
                { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
            ]
        };
    }
    pipeline.push({ $match: matchStage });

    // Stage 2: Lookup Populations
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorDetails",
            pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
        }
    });
    pipeline.push({ $unwind: { path: "$creatorDetails", preserveNullAndEmptyArrays: true } });

    // Stage 3: Lookup Shared Users Details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "sharedWithUsers",
            foreignField: "_id",
            as: "sharedUserDetails",
            pipeline: [{ $project: { fullName: 1, email: 1, designation: 1, labName: 1 } }]
        }
    });

    // Stage 4: Lookup Submissions for this template
    pipeline.push({
        $lookup: {
            from: "collecteddatas",
            localField: "_id",
            foreignField: "templateId",
            as: "allSubmissions",
            pipeline: [
                { $match: { status: 'Submitted' } }, // Only count explicitly submitted responses
                { $project: { submittedBy: 1, createdAt: 1, status: 1 } }
            ]
        }
    });

    // Stage 5: Lookup Assignments to track Current Holder
    pipeline.push({
        $lookup: {
            from: "formassignments",
            localField: "_id",
            foreignField: "templateId",
            as: "allAssignments",
            pipeline: [
                { $sort: { createdAt: -1 } }, // Latest first
                {
                    $lookup: {
                        from: "users",
                        localField: "assignedTo",
                        foreignField: "_id",
                        as: "holderDetails",
                        pipeline: [{ $project: { fullName: 1, designation: 1, labName: 1 } }]
                    }
                },
                { $unwind: { path: "$holderDetails", preserveNullAndEmptyArrays: true } },
                { $project: { delegationChain: 1, holderDetails: 1, status: 1 } }
            ]
        }
    });

    // Stage 5: Add Computed Fields & Map Status
    pipeline.push({
        $addFields: {
            createdBy: "$creatorDetails",
            responseCount: { $size: "$allSubmissions" },
            // Populate sharedWithUsers with status and Current Holder
            sharedWithUsers: {
                $map: {
                    input: "$sharedUserDetails",
                    as: "user",
                    in: {
                        _id: "$$user._id",
                        fullName: "$$user.fullName",
                        email: "$$user.email",
                        designation: "$$user.designation",
                        labName: "$$user.labName",
                        isSubmitted: {
                            $in: ["$$user._id", "$allSubmissions.submittedBy"]
                        },
                        // Find the current holder for the chain involving this user
                        currentHolder: {
                            $let: {
                                vars: {
                                    latestAssignment: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$allAssignments",
                                                    as: "asn",
                                                    // Check if this user is in the delegation chain of the assignment
                                                    cond: { $in: ["$$user._id", "$$asn.delegationChain"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                },
                                in: "$$latestAssignment.holderDetails"
                            }
                        },
                        submission: {
                            $let: {
                                vars: {
                                    submission: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$allSubmissions",
                                                    as: "sub",
                                                    cond: { $eq: ["$$sub.submittedBy", "$$user._id"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                },
                                in: {
                                    date: "$$submission.createdAt",
                                    status: "$$submission.status"
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Stage 4: Sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 5: Pagination
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }]
        }
    });

    const result = await ActiveForm.aggregate(pipeline);

    const data = result[0].data || [];
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Distributed forms fetched successfully", {
            forms: data,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        })
    );
});

/**
 * Toggles archive status for a form template (Per User).
 */
const toggleArchive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { archive } = req.body; // true = archive, false = unarchive
    const user = req.user;

    const template = await ActiveForm.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Check permissions? 
    // Shared With Me: Can archive if I am in sharedWithUsers or sharedWithLabs or Public.
    // Creator: Can archive their own.

    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSharedUser = template.sharedWithUsers.includes(user._id);
    const isSharedLab = template.sharedWithLabs.includes(user.labName);
    const isPublic = template.isPublic;

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic) {
        // If not relevant to me at all, why archive? But okay to block.
        throw new ApiErrors("Unauthorized to access this template", 403);
    }

    if (archive) {
        await ActiveForm.findByIdAndUpdate(id, { $addToSet: { archivedBy: user._id } });
    } else {
        await ActiveForm.findByIdAndUpdate(id, { $pull: { archivedBy: user._id } });
    }

    return res.status(200).json(
        new ApiResponse(200, archive ? "Form archived" : "Form unarchived")
    );
});

/**
 * Sends reminders to users who haven't submitted the form.
 */
const sendReminders = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds } = req.body; // Array of user IDs to remind

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target users are required", 400);
    }

    const template = await ActiveForm.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Only Creator or Superadmin can send reminders
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to send reminders for this form", 403);
    }

    const name = req.user.fullName || req.user.email;
    const sentCount = 0;

    for (const userId of targetUserIds) {
        // Double check if they haven't submitted? 
        // Optional, but good practice. For now, rely on frontend sending correct list.

        await createNotification(
            userId,
            "FORM_REMINDER",
            "Form Submission Reminder",
            `Reminder: Please submit the form "${template.title}" shared by ${name}.`,
            template._id
        );

        // Ideally send email too
        // const user = await User.findById(userId);
        // if (user?.email) { ... }
    }

    return res.status(200).json(
        new ApiResponse(200, "Reminders sent successfully")
    );
});

/**
 * Sends reminders to users who haven't submitted the form.
 * (Updated with Email Support)
 */
const sendRemindersWithEmail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds } = req.body; // Array of user IDs to remind

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target users are required", 400);
    }

    const template = await ActiveForm.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Only Creator or Superadmin can send reminders
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to send reminders for this form", 403);
    }

    const name = req.user.fullName || req.user.email;

    // Fetch user details for email
    const users = await User.find({ _id: { $in: targetUserIds } }).select("email fullName");

    for (const user of users) {
        // Create in-app notification
        await createNotification(
            user._id,
            "FORM_REMINDER",
            "Form Submission Reminder",
            `Reminder: Please submit the form "${template.title}" shared by ${name}.`,
            template._id,
            "Form" // referenceType
        );

        // Send Email
        if (user.email) {
            const emailHtml = getFormReminderEmailTemplate(template, name);
            sendEmail({
                to: user.email,
                subject: `Reminder: Action Required for "${template.title}"`,
                html: emailHtml
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, `Reminders sent to ${users.length} users`)
    );
});

export {
    shareTemplateCopy,
    getSharedWithMe,
    getSharedByMe,
    toggleArchive,
    sendRemindersWithEmail as sendReminders
};

