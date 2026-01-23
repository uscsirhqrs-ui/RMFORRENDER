import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { FormTemplate } from "../models/formTemplate.model.js";
import { CollectedData } from "../models/collectedData.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";

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

    if (template.deadline) {
        const deadlineEnd = new Date(template.deadline);
        deadlineEnd.setHours(23, 59, 59, 999);

        if (deadlineEnd < new Date()) {
            throw new ApiErrors("The submission period for this form has expired.", 403);
        }
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
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) || req.socket.remoteAddress || req.ip;

    const submission = await CollectedData.create({
        templateId,
        data,
        labName: req.user.labName || "Unknown",
        submittedBy: req.user._id,
        ipAddress
    });

    await logActivity(req, "FORM_DATA_SUBMISSION", "CollectedData", submission._id, { after: submission }, req.user._id);

    return res.status(201).json(
        new ApiResponse(201, "Data submitted successfully", submission)
    );
});

/**
 * Gets submissions for a specific form template.
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

/**
 * Updates an existing submission for a specific form template.
 */
const updateData = asyncHandler(async (req, res) => {
    const { templateId, data } = req.body;

    if (!templateId || !data) {
        throw new ApiErrors("Template ID and data are required", 400);
    }

    const template = await FormTemplate.findById(templateId);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    if (template.isActive === false) {
        throw new ApiErrors("This form is no longer accepting responses.", 403);
    }

    if (template.deadline) {
        const deadlineEnd = new Date(template.deadline);
        deadlineEnd.setHours(23, 59, 59, 999);

        if (deadlineEnd < new Date()) {
            throw new ApiErrors("The submission period for this form has expired.", 403);
        }
    }

    let submission = await CollectedData.findOne({
        templateId,
        submittedBy: req.user._id
    });

    if (!submission) {
        throw new ApiErrors("No existing submission found to update.", 404);
    }

    // Capture IP Address
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) || req.socket.remoteAddress || req.ip;

    submission.data = data;
    submission.ipAddress = ipAddress;
    await submission.save();

    await logActivity(req, "FORM_DATA_UPDATE", "CollectedData", submission._id, { after: submission }, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, "Data updated successfully", submission)
    );
});

export {
    submitData,
    getFormSubmissions,
    updateData
};
