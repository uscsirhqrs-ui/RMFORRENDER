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
import { FormAssignment } from "../models/formAssignment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";
import { storageService } from "../services/storage.service.js";

/**
 * Helper to robustly capture IP address
 */
const getIpAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim())
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || req.socket?.remoteAddress
        || req.ip;
    return ip || "Unknown";
};

/**
 * Submits data for a specific form template.
 */
const submitData = asyncHandler(async (req, res) => {
    let { templateId, data } = req.body;

    // Handle multipart/form-data where fields are strings
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (error) {
            throw new ApiErrors("Invalid data format. Expected JSON string for 'data' field.", 400);
        }
    }

    if (!templateId || !data) {
        throw new ApiErrors("Template ID and data are required", 400);
    }

    // Process File Uploads
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            // Find which field this file belongs to
            // Multer 'any()' puts all files in req.files
            // We assume fieldname matches the form field ID
            const result = await storageService.upload(file.path);
            if (result) {
                // Update data object with file metadata
                data[file.fieldname] = {
                    url: result.url,
                    id: result.id,
                    provider: result.provider,
                    name: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                };
            }
        }
    }

    const template = await ActiveForm.findById(templateId);
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

    // Capture IP Address using helper
    const ipAddress = getIpAddress(req);

    const submission = await CollectedData.create({
        templateId,
        data,
        labName: req.user.labName || "Unknown",
        submittedBy: req.user._id,
        status: 'Edited',
        ipAddress,
        movementHistory: [{
            performedBy: req.user._id,
            action: 'Initial Submission',
            remarks: 'Form submitted',
            timestamp: new Date()
        }]
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
    const template = await ActiveForm.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());



    let query;

    if (isCreator || isSuperadmin) {
        // Creator/Admin: Show own submissions (any status) OR others' submissions (only if 'Submitted')
        query = {
            templateId: id,
            $or: [
                { submittedBy: user._id }, // My own submissions (any status)
                {
                    submittedBy: { $ne: user._id }, // Others' submissions
                    status: 'Submitted' // Must be Submitted
                }
            ]
        };
    } else {
        // Regular User: Show submissions linked to their assignments
        // KEY FIX: Only show the specific data instance linked to my assignment chain (dataId)
        // This ensures I see the same draft as my delegator if dataId was passed.
        const myAssignments = await FormAssignment.find({
            templateId: id,
            $or: [
                { assignedTo: user._id },
                { assignedBy: user._id },
                { delegationChain: user._id }
            ]
        }).distinct('dataId');

        // Filter out nulls
        const validDataIds = myAssignments.filter(id => id != null);

        query = {
            templateId: id,
            $or: [
                { submittedBy: user._id }, // My own submissions
                {
                    _id: { $in: validDataIds }, // Explicitly linked data (even if Edited/Draft by someone else)
                },
                {
                    // Fallback: If no dataId link yet, show Submitted ones from branch
                    submittedBy: { $ne: user._id },
                    status: 'Submitted'
                }
            ]
        };
    }



    const submissions = await CollectedData.find(query)
        .populate('submittedBy', 'fullName email designation labName mobileNo')
        .populate('movementHistory.performedBy', 'fullName email designation labName avatar')
        .sort({ createdAt: -1 })
        .lean();


    return res.status(200).json(
        new ApiResponse(200, "Submissions fetched successfully", submissions)
    );
});

/**
 * Updates an existing submission for a specific form template.
 */
const updateData = asyncHandler(async (req, res) => {
    let { templateId, data } = req.body;

    // Handle multipart/form-data where fields are strings
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (error) {
            throw new ApiErrors("Invalid data format. Expected JSON string for 'data' field.", 400);
        }
    }

    if (!templateId || !data) {
        throw new ApiErrors("Template ID and data are required", 400);
    }

    // Process File Uploads
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            const result = await storageService.upload(file.path);
            if (result) {
                // Update data object with file metadata
                data[file.fieldname] = {
                    url: result.url,
                    id: result.id,
                    provider: result.provider,
                    name: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                };
            }
        }
    }

    const template = await ActiveForm.findById(templateId);
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

    // Capture IP Address using helper
    const ipAddress = getIpAddress(req);

    submission.set('data', data);
    submission.markModified('data');
    submission.status = 'Edited'; // Ensure status is 'Edited' when updated
    submission.ipAddress = ipAddress;
    submission.movementHistory.push({
        performedBy: req.user._id,
        action: 'Updated',
        remarks: 'Submission revised',
        timestamp: new Date()
    });
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

