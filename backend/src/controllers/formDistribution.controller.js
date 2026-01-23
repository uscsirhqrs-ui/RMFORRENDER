import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { FormTemplate } from "../models/formTemplate.model.js";
import { CollectedData } from "../models/collectedData.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";
import { User } from "../models/user.model.js";
import { createNotification } from "./notification.controller.js";
import { sendEmail, getFormSharedEmailTemplate } from "../utils/mail.js";

/**
 * Shares a COPY of a template with other users.
 * This creates a new independent template for each recipient.
 */
const shareTemplateCopy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds, deadline } = req.body; // Array of user IDs and optional deadline

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target users are required", 400);
    }

    const template = await FormTemplate.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to share this template", 403);
    }

    const name = req.user.fullName || req.user.email;
    const results = [];

    for (const userId of targetUserIds) {
        const newTemplate = await FormTemplate.create({
            title: `Shared: ${template.title}`,
            description: template.description,
            fields: template.fields,
            createdBy: userId,
            sharedWithLabs: [],
            sharedWithUsers: [],
            isPublic: false,
            deadline: deadline || template.deadline || null
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

/**
 * Gets forms shared WITH the user (for data collection).
 */
const getSharedWithMe = asyncHandler(async (req, res) => {
    const user = req.user;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    // Pagination & Filter Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9; // Default 9 for grid view
    const view = req.query.view || 'active'; // 'active' | 'archived'
    const status = req.query.status || 'all'; // 'all' | 'new' | 'pending' | 'submitted' | 'expiring'
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // 1. Initial Match (Access Rights & Archive Status)
    const accessMatch = {
        $or: [
            { sharedWithUsers: user._id },
            { sharedWithLabs: user.labName },
            { isPublic: true }
        ]
    };

    if (!isSuperadmin) {
        accessMatch.createdBy = { $ne: user._id };
    }

    // Archive Logic
    if (view === 'archived') {
        accessMatch.archivedBy = user._id;
    } else {
        // Active view (default): Not archived by me
        accessMatch.archivedBy = { $ne: user._id };
    }

    // Search Logic
    if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        accessMatch.$or = accessMatch.$or ?
            accessMatch.$or.map(cond => ({ ...cond, $or: [{ title: searchRegex }, { description: searchRegex }] })) : // This logic is flawed for ANDing
            [{ title: searchRegex }, { description: searchRegex }];

        // Correct Search Logic: AND the Access checks with OR of Search
        // We will combine them in the $match stage cleanly
    }

    // Construct Pipeline
    const pipeline = [];

    // Stage 1: Match Access & Archive
    let matchStage = { ...accessMatch };
    if (search) {
        matchStage = {
            $and: [
                accessMatch,
                { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
            ]
        };
    }

    pipeline.push({ $match: matchStage });

    // Stage 2: Lookup Creator Details (Populate)
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

    // Stage 3: Lookup My Submission (To determine isSubmitted)
    pipeline.push({
        $lookup: {
            from: "collecteddatas",
            let: { templateId: "$_id", userId: user._id },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$templateId", "$$templateId"] },
                                { $eq: ["$submittedBy", "$$userId"] }
                            ]
                        }
                    }
                },
                { $limit: 1 },
                { $project: { _id: 1 } } // We only need existence
            ],
            as: "mySubmission"
        }
    });

    // Stage 4: Add Computed Fields
    pipeline.push({
        $addFields: {
            createdBy: "$creatorDetails", // Map back to original structure
            isSubmitted: { $gt: [{ $size: "$mySubmission" }, 0] },
            daysToDeadline: {
                $cond: {
                    if: { $ifNull: ["$deadline", false] },
                    then: {
                        $divide: [
                            { $subtract: ["$deadline", new Date()] },
                            1000 * 60 * 60 * 24
                        ]
                    },
                    else: null
                }
            }
        }
    });

    // Stage 5: Status Filtering
    if (status !== 'all') {
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

        if (status === 'submitted') {
            pipeline.push({ $match: { isSubmitted: true } });
        } else if (status === 'pending') {
            pipeline.push({ $match: { isSubmitted: false, $or: [{ deadline: { $exists: false } }, { deadline: { $gt: now } }] } });
        } else if (status === 'expiring') {
            // Expiring within 3 days (0 to 3 days remaining)
            pipeline.push({
                $match: {
                    isSubmitted: false,
                    deadline: { $exists: true },
                    daysToDeadline: { $gte: 0, $lte: 3 }
                }
            });
        } else if (status === 'new') {
            // Created recently (< 2 days) AND not submitted
            pipeline.push({
                $match: {
                    isSubmitted: false,
                    createdAt: { $gte: twoDaysAgo }
                }
            });
        }
    }

    // Stage 6: Sorting
    // Default: Priority (Expiring Soon) -> Created Date
    pipeline.push({
        $sort: { createdAt: -1 }
    });

    // Stage 7: Faceted Pagination
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }]
        }
    });

    const result = await FormTemplate.aggregate(pipeline);

    const data = result[0].data || [];
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Shared forms fetched successfully", {
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

    // Stage 3: Lookup Response Count
    pipeline.push({
        $lookup: {
            from: "collecteddatas",
            localField: "_id",
            foreignField: "templateId",
            as: "responses" // This could be heavy if thousands of responses. Just Count is needed.
            // Optimization: Use $count in sub-pipeline if possible?
            // "collecteddatas" might be huge. Loading all response docs into array just to count is bad.
            // Better: lookup metadata or use $facet? No, $lookup pipeline can count.
        }
    });

    pipeline.push({
        $addFields: {
            createdBy: "$creatorDetails",
            responseCount: { $size: "$responses" } // This still loads them. 
        }
    });
    // To optimize responseCount safely without loading docs in memory:
    // We should use a different structure or accept this cost. 
    // Given scope, $size is okay for now, but strictly speaking it's heavy.
    // Correct way:
    // pipeline: [ { $match: { $expr: { $eq: ["$templateId", "$$tId"] } } }, { $count: "count" } ]
    // But let's stick to $size for consistency with existing code if it wasn't counting via lookup before? 
    // Existing code was `CollectedData.countDocuments`.
    // Let's just project `_id` in the lookup to minimize memory size.

    // Optimized Lookup for Count
    pipeline[pipeline.length - 2] = {
        $lookup: {
            from: "collecteddatas",
            localField: "_id",
            foreignField: "templateId",
            as: "responses",
            pipeline: [{ $project: { _id: 1 } }]
        }
    };

    // Stage 4: Sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 5: Pagination
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }]
        }
    });

    const result = await FormTemplate.aggregate(pipeline);

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

    const template = await FormTemplate.findById(id);
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
        await FormTemplate.findByIdAndUpdate(id, { $addToSet: { archivedBy: user._id } });
    } else {
        await FormTemplate.findByIdAndUpdate(id, { $pull: { archivedBy: user._id } });
    }

    return res.status(200).json(
        new ApiResponse(200, archive ? "Form archived" : "Form unarchived")
    );
});

export {
    shareTemplateCopy,
    getSharedWithMe,
    getSharedByMe,
    toggleArchive
};
