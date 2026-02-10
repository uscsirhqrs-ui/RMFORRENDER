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
import { FormTemplate } from "../models/formTemplate.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Creates a new form blueprint (Reusable Template).
 */
const createBlueprint = asyncHandler(async (req, res) => {
    const { title, description, fields, isPublic, category } = req.body;

    if (!title || !fields || fields.length === 0) {
        throw new ApiErrors("Title and at least one field are required", 400);
    }

    // Add Mandatory Declaration Section
    const declarationField = {
        id: "declaration_checkbox",
        type: "checkbox",
        label: "I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.",
        section: "Declaration",
        required: true
    };

    // Append to fields
    const updatedFields = [...fields, declarationField];

    const blueprint = await FormTemplate.create({
        title,
        description,
        fields: updatedFields,
        isPublic: isPublic || false,
        category: category || "General",
        createdBy: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, "Blueprint created successfully", blueprint)
    );
});

/**
 * Gets blueprints (Templates) accessible to the user.
 * Returns public blueprints + blueprints created by the user.
 */
const getBlueprints = asyncHandler(async (req, res) => {
    const user = req.user;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    const { mineOnly } = req.query;

    let filter = {};

    if (mineOnly === 'true') {
        filter = { createdBy: user._id };
    } else {
        // Show my blueprints + public blueprints
        filter = {
            $or: [
                { createdBy: user._id },
                { isPublic: true }
            ]
        };
    }

    const blueprints = await FormTemplate.find(filter)
        .populate('createdBy', 'fullName designation labName')
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "Blueprints fetched successfully", blueprints)
    );
});

/**
 * Gets a specific blueprint by ID.
 * Used for "Use this Template".
 */
const getBlueprintById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const blueprint = await FormTemplate.findById(id).populate('createdBy', 'fullName designation labName');

    if (!blueprint) {
        throw new ApiErrors("Blueprint not found", 404);
    }

    // Access check: Only creator or if public
    const isCreator = blueprint.createdBy._id.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !blueprint.isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to access this blueprint", 403);
    }

    return res.status(200).json(
        new ApiResponse(200, "Blueprint fetched successfully", blueprint)
    );
});

/**
 * Deletes a blueprint.
 */
const deleteBlueprint = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const blueprint = await FormTemplate.findById(id);

    if (!blueprint) {
        throw new ApiErrors("Blueprint not found", 404);
    }

    const isCreator = blueprint.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to delete this blueprint", 403);
    }

    await FormTemplate.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, "Blueprint deleted successfully", null)
    );
});

/**
 * Shares a blueprint copy with target users.
 * Each recipient gets their own editable copy.
 */
const shareBlueprintCopy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds } = req.body;

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target user IDs are required", 400);
    }

    // Fetch the original blueprint
    const originalBlueprint = await FormTemplate.findById(id);
    if (!originalBlueprint) {
        throw new ApiErrors("Blueprint not found", 404);
    }

    // Access check: Only creator or public blueprints can be shared
    const isCreator = originalBlueprint.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !originalBlueprint.isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to share this blueprint", 403);
    }

    // Create copies for each target user
    const createdCopies = [];
    for (const targetUserId of targetUserIds) {
        const blueprintCopy = await FormTemplate.create({
            title: `SharedCopy-${originalBlueprint.title}`,
            description: originalBlueprint.description,
            fields: originalBlueprint.fields,
            category: originalBlueprint.category,
            isPublic: false, // Recipients get private copies
            createdBy: targetUserId
        });
        createdCopies.push(blueprintCopy);

        // Send notification to recipient
        try {
            const { createNotification } = await import('./notification.controller.js');
            await createNotification(
                targetUserId,
                'form_blueprint_shared',
                'Blueprint Shared With You',
                `${req.user.fullName || req.user.email} shared a form blueprint "${originalBlueprint.title}" with you.`,
                blueprintCopy._id,
                'FormTemplate'
            );
        } catch (error) {
            console.error(`Failed to send notification to user ${targetUserId}:`, error);
        }
    }

    return res.status(200).json(
        new ApiResponse(200, `Blueprint shared with ${createdCopies.length} user(s)`, {
            count: createdCopies.length,
            sharedWith: targetUserIds
        })
    );
});

export {
    createBlueprint as createTemplate,
    getBlueprints as getTemplates,
    getBlueprintById as getTemplateById,
    deleteBlueprint as deleteTemplate,
    shareBlueprintCopy as shareTemplate,
    updateBlueprint as updateTemplate
};

/**
 * Updates an existing form blueprint.
 */
const updateBlueprint = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, fields, category, isPublic } = req.body;

    const blueprint = await FormTemplate.findById(id);

    if (!blueprint) {
        throw new ApiErrors("Blueprint not found", 404);
    }

    const isCreator = blueprint.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to update this blueprint", 403);
    }

    // Update fields if provided
    if (title) blueprint.title = title;
    if (description !== undefined) blueprint.description = description;
    if (fields) blueprint.fields = fields;
    if (category) blueprint.category = category;
    if (isPublic !== undefined) blueprint.isPublic = isPublic;

    await blueprint.save();

    return res.status(200).json(
        new ApiResponse(200, "Blueprint updated successfully", blueprint)
    );
});

