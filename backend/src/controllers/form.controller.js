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
const createTemplate = asyncHandler(async (req, res) => {
    const { title, description, fields, sharedWithLabs, sharedWithUsers, isPublic } = req.body;

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
        createdBy: req.user._id
    });

    await logActivity(req, "FORM_TEMPLATE_CREATE", "FormTemplate", template._id, { after: template }, req.user._id);

    // Notification & Email logic for shared users
    // Consolidate specific users and users from shared labs
    let targetUserIds = new Set(sharedWithUsers || []);

    if (sharedWithLabs && Array.isArray(sharedWithLabs) && sharedWithLabs.length > 0) {
        const labUsers = await User.find({ labName: { $in: sharedWithLabs } }).select("_id");
        labUsers.forEach(u => targetUserIds.add(u._id.toString()));
    }

    if (targetUserIds.size > 0) {
        const users = await User.find({ _id: { $in: Array.from(targetUserIds) } });
        const name = req.user.fullName || req.user.email;
        const designation = req.user.designation ? `, ${req.user.designation}` : "";
        const lab = req.user.labName ? ` (${req.user.labName})` : "";
        const sharedByName = `${name}${designation}${lab}`;

        for (const user of users) {
            // Create in-app notification
            await createNotification(
                user._id,
                "FORM_SHARED",
                "New Form Shared",
                `A new form "${title}" has been shared with you by ${sharedByName}.`,
                template._id
            );

            // Send email notification
            if (user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `New Form Shared: ${title}`,
                    html: getFormSharedEmailTemplate(template, sharedByName)
                });
            }
        }
    }

    return res.status(201).json(
        new ApiResponse(201, "Form template created successfully", template)
    );
});

/**
 * Updates an existing form template.
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, fields, sharedWithLabs, sharedWithUsers, isPublic } = req.body;

    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Check ownership
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

    await template.save();

    await logActivity(req, "FORM_TEMPLATE_UPDATE", "FormTemplate", template._id, { before: previousState, after: template }, req.user._id);

    // Trigger notifications for NEWLY shared users/labs if any
    // For simplicity, we'll re-notify anyone who is currently in the list
    // In a production app, we'd find the diff.
    const { notifyUsers } = req.body;

    let targetUserIds = new Set(template.sharedWithUsers || []);
    if (template.sharedWithLabs && template.sharedWithLabs.length > 0) {
        const labUsers = await User.find({ labName: { $in: template.sharedWithLabs } }).select("_id");
        labUsers.forEach(u => targetUserIds.add(u._id.toString()));
    }

    if (notifyUsers !== false && targetUserIds.size > 0) {
        const users = await User.find({ _id: { $in: Array.from(targetUserIds) } });
        const name = req.user.fullName || req.user.email;
        const designation = req.user.designation ? `, ${req.user.designation}` : "";
        const lab = req.user.labName ? ` (${req.user.labName})` : "";
        const sharedByName = `${name}${designation}${lab}`;

        for (const user of users) {
            await createNotification(
                user._id,
                "FORM_UPDATED",
                "Form Updated/Shared",
                `The form "${template.title}" has been updated or newly shared with you by ${sharedByName}.`,
                template._id
            );

            if (user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `Form Updated/Shared: ${template.title}`,
                    html: getFormSharedEmailTemplate(template, sharedByName)
                });
            }
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Form template updated successfully", template)
    );
});

/**
 * Gets templates accessible to the user (Created by them, shared with them, or public).
 */
const getTemplates = asyncHandler(async (req, res) => {
    const user = req.user;

    // Filter: 
    // 1. Created by user
    // 2. Shared with user ID
    // 3. Shared with user's Lab
    // 4. Public templates
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    // Filter: 
    // 1. Created by user
    // 2. Shared with user ID
    // 3. Shared with user's Lab
    // 4. Public templates
    // 5. OR if Superadmin, return ALL
    let filter = {};
    if (!isSuperadmin) {
        filter = {
            $or: [
                { createdBy: user._id },
                { sharedWithUsers: user._id },
                { sharedWithLabs: user.labName },
                { isPublic: true }
            ]
        };
    }

    // Populate createdBy to get fullName, designation, and labName
    let templates = await FormTemplate.find(filter)
        .populate('createdBy', 'fullName designation labName')
        .sort({ createdAt: -1 });

    // Check if the current user has submitted data for each template
    const templatesWithStatus = await Promise.all(templates.map(async (template) => {
        const isSubmitted = await CollectedData.exists({
            templateId: template._id,
            submittedBy: user._id
        });

        const responseCount = await CollectedData.countDocuments({
            templateId: template._id
        });

        // Convert to plain object and add isSubmitted and responseCount
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
 * Submits data for a specific form template.
 */
const submitData = asyncHandler(async (req, res) => {
    const { templateId, data } = req.body;

    if (!templateId || !data) {
        throw new ApiErrors("Template ID and data are required", 400);
    }

    const template = await FormTemplate.findById(templateId);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    if (template.isActive === false) {
        throw new ApiErrors("This form is not accepting responses at the moment.", 403);
    }

    if (!template.allowMultipleSubmissions) {
        const existingSubmission = await CollectedData.findOne({
            templateId,
            submittedBy: req.user._id
        });

        if (existingSubmission) {
            throw new ApiErrors("You have already submitted a response for this form.", 409);
        }
    }

    // Capture IP Address
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    const submission = await CollectedData.create({
        templateId,
        data,
        labName: req.user.labName || "Unknown",
        submittedBy: req.user._id,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress
    });

    await logActivity(req, "FORM_DATA_SUBMISSION", "CollectedData", submission._id, { after: submission }, req.user._id);

    return res.status(201).json(
        new ApiResponse(201, "Data submitted successfully", submission)
    );
});

/**
 * Gets a specific form template by ID.
 */
const getTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Access control check
    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
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

    // Only creator or Superadmin can delete
    // Only creator or Superadmin can delete
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

    // Access control: User must be able to view the template to clone it
    // (Creator, Shared, or Public)
    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSharedUser = template.sharedWithUsers.includes(user._id);
    const isSharedLab = template.sharedWithLabs.includes(user.labName);
    const isPublic = template.isPublic;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to access this template", 403);
    }

    // Create a copy
    const clonedTemplate = await FormTemplate.create({
        title: `${template.title} (Copy)`,
        description: template.description,
        fields: template.fields, // Deep copy via Mongoose create
        createdBy: user._id,
        sharedWithLabs: [], // Reset sharing
        sharedWithUsers: [], // Reset sharing
        isPublic: false // Default to private
    });

    await logActivity(req, "FORM_TEMPLATE_CLONE", "FormTemplate", clonedTemplate._id, {
        sourceTemplateId: template._id,
        newTemplate: clonedTemplate
    }, user._id);

    return res.status(201).json(
        new ApiResponse(201, "Template cloned successfully", clonedTemplate)
    );
});

/**
 * Shares a COPY of a template with other users.
 * This creates a new independent template for each recipient.
 */
const shareTemplateCopy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetUserIds } = req.body; // Array of user IDs

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new ApiErrors("Target users are required", 400);
    }

    const template = await FormTemplate.findById(id);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Only Creator or Superadmin can share-copy
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to share this template", 403);
    }

    const name = req.user.fullName || req.user.email;
    const results = [];

    for (const userId of targetUserIds) {
        // Create a copy for this user
        const newTemplate = await FormTemplate.create({
            title: `Shared: ${template.title}`,
            description: template.description,
            fields: template.fields,
            createdBy: userId, // Assign ownership to recipient
            sharedWithLabs: [],
            sharedWithUsers: [],
            isPublic: false
        });

        // Notify Recipient
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
 * Gets submissions for a specific form template.
 * - Creator/Superadmin: Gets ALL submissions
 * - Regular User: Gets ONLY their own submissions
 */
const getFormSubmissions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const template = await FormTemplate.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    let filter = { templateId: id };

    // If not creator and not superadmin, restrict to own submissions
    if (!isCreator && !isSuperadmin) {
        filter.submittedBy = user._id;
    }

    const submissions = await CollectedData.find(filter)
        .populate('submittedBy', 'fullName email designation labName')
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "Submissions fetched successfully", submissions)
    );
});

export {
    createTemplate,
    updateTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    submitData,
    cloneTemplate,
    shareTemplateCopy,
    getFormSubmissions
};
