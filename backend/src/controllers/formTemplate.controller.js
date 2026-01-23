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
 * Creates a new form template.
 */
import { processFormDistribution } from "../utils/backgroundService.js";
import { BackgroundTask } from "../models/backgroundTask.model.js";

/**
 * Creates a new form template.
 */
const createTemplate = asyncHandler(async (req, res) => {
    const { title, description, fields, sharedWithLabs, sharedWithUsers, isPublic, deadline } = req.body;

    if (!title || !fields || !Array.isArray(fields) || fields.length === 0) {
        throw new ApiErrors("Title and at least one field are required", 400);
    }

    const template = await FormTemplate.create({
        title,
        description,
        fields,
        sharedWithLabs: sharedWithLabs || [],
        sharedWithUsers: sharedWithUsers || [],
        isPublic: isPublic || false,
        allowMultipleSubmissions: req.body.allowMultipleSubmissions || false,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        deadline: deadline || null,
        createdBy: req.user._id
    });

    await logActivity(req, "FORM_TEMPLATE_CREATE", "FormTemplate", template._id, { after: template }, req.user._id);

    // Create Background Task for Distribution
    let taskId = null;
    if ((sharedWithUsers && sharedWithUsers.length > 0) || (sharedWithLabs && sharedWithLabs.length > 0)) {
        const bgTask = await BackgroundTask.create({
            user: req.user._id,
            type: "FORM_DISTRIBUTION",
            status: "PENDING",
            metadata: {
                templateId: template._id.toString(),
                templateTitle: template.title
            }
        });
        taskId = bgTask._id;

        // Process in background (FIRE AND FORGET)
        processFormDistribution(bgTask._id, template, req.user, "SHARED");
    }

    return res.status(201).json(
        new ApiResponse(201, "Form template created successfully. Distribution is running in background.", {
            ...template.toObject(),
            taskId
        })
    );
});

/**
 * Updates an existing form template.
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, fields, sharedWithLabs, sharedWithUsers, isPublic, deadline } = req.body;

    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to update this template", 403);
    }

    const previousState = { ...template.toObject() };

    template.title = title || template.title;
    template.description = description || template.description;
    template.fields = fields || template.fields;
    template.sharedWithLabs = sharedWithLabs || template.sharedWithLabs;
    template.sharedWithUsers = sharedWithUsers || template.sharedWithUsers;
    template.isPublic = isPublic !== undefined ? isPublic : template.isPublic;
    template.allowMultipleSubmissions = req.body.allowMultipleSubmissions !== undefined ? req.body.allowMultipleSubmissions : template.allowMultipleSubmissions;
    template.isActive = req.body.isActive !== undefined ? req.body.isActive : template.isActive;
    template.deadline = deadline !== undefined ? deadline : template.deadline;

    await template.save();

    await logActivity(req, "FORM_TEMPLATE_UPDATE", "FormTemplate", template._id, { before: previousState, after: template }, req.user._id);

    const { notifyUsers } = req.body;
    let taskId = null;

    if (notifyUsers !== false) {
        // Create Background Task to update users
        // Only if there are users to update
        let shouldNotify = false;
        if ((template.sharedWithUsers && template.sharedWithUsers.length > 0) || (template.sharedWithLabs && template.sharedWithLabs.length > 0)) {
            shouldNotify = true;
        }

        if (shouldNotify) {
            const bgTask = await BackgroundTask.create({
                user: req.user._id,
                type: "FORM_DISTRIBUTION",
                status: "PENDING",
                metadata: {
                    templateId: template._id.toString(),
                    templateTitle: template.title
                }
            });
            taskId = bgTask._id;

            // Process in background
            processFormDistribution(bgTask._id, template, req.user, "UPDATED", previousState);
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Form template updated successfully. Notifications are sending in background.", {
            ...template.toObject(),
            taskId
        })
    );
});

/**
 * Gets templates created by or accessible to the user.
 */
const getTemplates = asyncHandler(async (req, res) => {
    const user = req.user;
    const { mineOnly } = req.query;

    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    let filter = {};
    if (mineOnly === 'true') {
        filter = { createdBy: user._id };
    } else if (!isSuperadmin) {
        filter = {
            $or: [
                { createdBy: user._id },
                { sharedWithUsers: user._id },
                { sharedWithLabs: user.labName },
                { isPublic: true }
            ]
        };
    }

    let templates = await FormTemplate.find(filter)
        .populate('createdBy', 'fullName designation labName')
        .sort({ createdAt: -1 });

    const templatesWithStatus = await Promise.all(templates.map(async (template) => {
        const isSubmitted = await CollectedData.exists({
            templateId: template._id,
            submittedBy: user._id
        });

        const responseCount = await CollectedData.countDocuments({
            templateId: template._id
        });

        const templateObj = template.toObject();
        return {
            ...templateObj,
            isSubmitted: !!isSubmitted,
            responseCount: responseCount || 0
        };
    }));

    return res.status(200).json(
        new ApiResponse(200, "Templates fetched successfully", templatesWithStatus)
    );
});

/**
 * Gets a specific form template by ID.
 */
const getTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await FormTemplate.findById(id).populate('createdBy', 'fullName designation labName');

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const user = req.user;
    const isCreator = template.createdBy?._id?.toString() === user._id.toString();
    const isSharedUser = template.sharedWithUsers.includes(user._id);
    const isSharedLab = template.sharedWithLabs.includes(user.labName);
    const isPublic = template.isPublic;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to access this template", 403);
    }

    return res.status(200).json(
        new ApiResponse(200, "Template fetched successfully", template)
    );
});

/**
 * Deletes a form template.
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const isCreator = template.createdBy.toString() === req.user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());

    if (!isCreator && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to delete this template", 403);
    }

    await FormTemplate.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, "Template deleted successfully", null)
    );
});

/**
 * Clones a form template for the current user.
 */
const cloneTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSharedUser = template.sharedWithUsers.includes(user._id);
    const isSharedLab = template.sharedWithLabs.includes(user.labName);
    const isPublic = template.isPublic;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to access this template", 403);
    }

    const clonedTemplate = await FormTemplate.create({
        title: `Copy of ${template.title}`,
        description: template.description,
        fields: template.fields,
        createdBy: user._id,
        sharedWithLabs: [],
        sharedWithUsers: [],
        isPublic: false
    });

    await logActivity(req, "FORM_TEMPLATE_CLONE", "FormTemplate", clonedTemplate._id, {
        sourceTemplateId: template._id,
        newTemplate: clonedTemplate
    }, user._id);

    return res.status(201).json(
        new ApiResponse(201, "Template cloned successfully", clonedTemplate)
    );
});

export {
    createTemplate,
    updateTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    cloneTemplate
};
