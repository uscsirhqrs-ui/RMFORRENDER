import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { FormBlueprint } from "../models/formBlueprint.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Creates a new form blueprint (Reusable Template).
 */
const createBlueprint = asyncHandler(async (req, res) => {
    const { title, description, fields, isPublic, category } = req.body;

    if (!title || !fields || fields.length === 0) {
        throw new ApiErrors("Title and at least one field are required", 400);
    }

    const blueprint = await FormBlueprint.create({
        title,
        description,
        fields,
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

    const blueprints = await FormBlueprint.find(filter)
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
    const blueprint = await FormBlueprint.findById(id).populate('createdBy', 'fullName designation labName');

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
    const blueprint = await FormBlueprint.findById(id);

    if (!blueprint) {
        throw new ApiErrors("Blueprint not found", 404);
    }

    const isCreator = blueprint.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to delete this blueprint", 403);
    }

    await FormBlueprint.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, "Blueprint deleted successfully", null)
    );
});

export {
    createBlueprint,
    getBlueprints,
    getBlueprintById,
    deleteBlueprint
};
