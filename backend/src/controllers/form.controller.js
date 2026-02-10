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
import { ActiveForm } from "../models/activeForm.model.js";
import { CollectedData } from "../models/collectedData.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";
import { User } from "../models/user.model.js";
import { FormAssignment } from "../models/formAssignment.model.js";
import { createNotification } from "./notification.controller.js";
import { sendEmail, getFormSharedEmailTemplate } from "../utils/mail.js";
import { FeatureCodes } from "../constants.js";
import { hasPermission } from "../utils/permission.utils.js";

/**
 * Creates a new form template.
 */
const createTemplate = asyncHandler(async (req, res) => {

    const { title, description, fields: rawFields, sharedWithLabs, sharedWithUsers, isPublic } = req.body;

    if (!title || !rawFields || !Array.isArray(rawFields) || rawFields.length === 0) {

        throw new ApiErrors("Title and at least one field are required", 400);
    }

    // Permission Check: Inter-lab sharing restriction
    const canInterLab = await hasPermission(req.user.role, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);
    if (!canInterLab) {
        // If not allowed for inter-lab, sharedWithLabs must only contain the user's own lab
        if (sharedWithLabs && Array.isArray(sharedWithLabs)) {
            const unauthorizedLabs = sharedWithLabs.filter(lab => lab !== req.user.labName);
            if (unauthorizedLabs.length > 0) {
                throw new ApiErrors("You do not have permission to share forms with other labs", 403);
            }
        }
    }

    // Sanitize fields
    const validTypes = ['text', 'select', 'date', 'checkbox', 'radio', 'file', 'header'];
    const fields = rawFields.map(f => ({
        ...f,
        type: f.type ? f.type.toLowerCase() : 'text',
        // Ensure options exist for select/radio
        options: (['select', 'radio'].includes(f.type?.toLowerCase()) && (!f.options || f.options.length === 0))
            ? [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }]
            : f.options
    }));


    // Validate types after sanitization
    const invalidField = fields.find(f => !validTypes.includes(f.type));
    if (invalidField) {
        throw new ApiErrors(`Invalid field type detected: ${invalidField.type}`, 400);
    }

    try {

        const template = await ActiveForm.create({
            title,
            description,
            fields,
            sharedWithLabs: sharedWithLabs || [],
            sharedWithUsers: sharedWithUsers || [],
            isPublic: isPublic || false,
            allowMultipleSubmissions: req.body.allowMultipleSubmissions || false,
            allowDelegation: req.body.allowDelegation !== undefined ? req.body.allowDelegation : true,
            deadline: req.body.deadline || undefined,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
            createdBy: req.user._id
        });


        await logActivity(req, "FORM_TEMPLATE_CREATE", "ActiveForm", template._id, { after: template }, req.user._id);

        // Notification & Email logic for shared users
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
                // Create FormAssignment for the recipient
                // Check if already exists (robustness)
                const existing = await FormAssignment.findOne({
                    templateId: template._id,
                    assignedTo: user._id
                });

                if (!existing) {
                    await FormAssignment.create({
                        templateId: template._id,
                        assignedTo: user._id,
                        assignedBy: req.user._id,
                        status: 'Pending',
                        delegationChain: [req.user._id],
                        parentAssignmentId: null, // Root recipient
                        lastAction: 'Edited',
                        remarks: req.body.fillingInstructions || "Form distributed",
                        instructions: req.body.fillingInstructions || "Please fill the form"
                    });
                }

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
    } catch (error) {
        console.error("Template Creation Error:", error);
        throw new ApiErrors(error.message || "Failed to create template", 500);
    }
});

/**
 * Updates an existing form template.
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, fields: rawFields, sharedWithLabs, sharedWithUsers, isPublic } = req.body;

    const template = await ActiveForm.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    // Check ownership
    const isSuperadmin = ['superadmin', 'admin'].includes(req.user.role?.toLowerCase());
    if (template.createdBy.toString() !== req.user._id.toString() && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to update this template", 403);
    }

    // Permission Check: Inter-lab sharing restriction for updates
    if (sharedWithLabs && Array.isArray(sharedWithLabs)) {
        const canInterLab = await hasPermission(req.user.role, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);
        if (!canInterLab) {
            const unauthorizedLabs = sharedWithLabs.filter(lab => lab !== req.user.labName);
            if (unauthorizedLabs.length > 0) {
                throw new ApiErrors("You do not have permission to share forms with other labs", 403);
            }
        }
    }

    // Sanitize fields if provided
    let fields = undefined;
    if (rawFields) {
        const validTypes = ['text', 'select', 'date', 'checkbox', 'radio', 'file', 'header'];
        fields = rawFields.map(f => ({
            ...f,
            type: f.type ? f.type.toLowerCase() : 'text',
            options: (['select', 'radio'].includes(f.type?.toLowerCase()) && (!f.options || f.options.length === 0))
                ? [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }]
                : f.options
        }));

        const invalidField = fields.find(f => !validTypes.includes(f.type));
        if (invalidField) {
            throw new ApiErrors(`Invalid field type detected: ${invalidField.type}`, 400);
        }
    }

    const previousState = { ...template.toObject() };

    template.title = title || template.title;
    template.description = description || template.description;
    template.fields = fields || template.fields;
    template.sharedWithLabs = sharedWithLabs || template.sharedWithLabs;
    template.sharedWithUsers = sharedWithUsers || template.sharedWithUsers;
    template.isPublic = isPublic !== undefined ? isPublic : template.isPublic;
    template.allowMultipleSubmissions = req.body.allowMultipleSubmissions !== undefined ? req.body.allowMultipleSubmissions : template.allowMultipleSubmissions;
    template.allowDelegation = req.body.allowDelegation !== undefined ? req.body.allowDelegation : template.allowDelegation;
    template.deadline = req.body.deadline !== undefined ? req.body.deadline : template.deadline;
    template.isActive = req.body.isActive !== undefined ? req.body.isActive : template.isActive;

    try {
        await template.save();

        await logActivity(req, "FORM_TEMPLATE_UPDATE", "ActiveForm", template._id, { before: previousState, after: template }, req.user._id);

        // Trigger notifications for NEWLY shared users/labs if any
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
                // Create FormAssignment for the recipient if it doesn't exist
                const existing = await FormAssignment.findOne({
                    templateId: template._id,
                    assignedTo: user._id
                });

                if (!existing) {
                    await FormAssignment.create({
                        templateId: template._id,
                        assignedTo: user._id,
                        assignedBy: req.user._id,
                        status: 'Pending',
                        delegationChain: [req.user._id],
                        parentAssignmentId: null, // Root recipient
                        lastAction: 'Edited',
                        remarks: req.body.fillingInstructions || "Form distributed/updated",
                        instructions: req.body.fillingInstructions || "Please fill the form"
                    });
                }

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
    } catch (error) {
        console.error("Template Update Error:", error);
        throw new ApiErrors(error.message || "Failed to update template", 500);
    }
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
    let templates = await ActiveForm.find(filter)
        .populate('createdBy', 'fullName designation labName')
        .sort({ createdAt: -1 });

    // Check if the current user has submitted data for each template
    const templatesWithStatus = await Promise.all(templates.map(async (template) => {
        // Check if anyone in my branch has submitted/drafted
        const branchUsers = await FormAssignment.find({
            templateId: template._id,
            $or: [{ assignedTo: user._id }, { assignedBy: user._id }, { delegationChain: user._id }]
        }).distinct('assignedTo');

        const isSubmitted = await CollectedData.exists({
            templateId: template._id,
            submittedBy: { $in: [...branchUsers, user._id] }
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

    const template = await ActiveForm.findById(templateId);
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

    const { assignmentId } = req.body;
    let submission = null;

    if (assignmentId) {
        const assignment = await FormAssignment.findById(assignmentId);
        if (assignment && assignment.dataId) {
            submission = await CollectedData.findById(assignment.dataId);
        }
    }

    if (!submission) {
        // Fallback: Check for existing draft
        submission = await CollectedData.findOne({
            templateId,
            submittedBy: req.user._id,
            status: 'Edited'
        });
    }

    if (submission) {
        submission.data = data;
        submission.status = 'Edited'; // Standardized state
        submission.ipAddress = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress;
        submission.movementHistory.push({
            performedBy: req.user._id,
            action: 'Updated',
            remarks: 'Data revised',
            timestamp: new Date()
        });
        await submission.save();
    } else {
        submission = await CollectedData.create({
            templateId,
            data,
            labName: req.user.labName || "Unknown",
            submittedBy: req.user._id,
            status: 'Edited',
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            movementHistory: [{
                performedBy: req.user._id,
                action: 'Initial Submission',
                remarks: 'Form filled and submitted',
                timestamp: new Date()
            }]
        });
    }

    // Update assignment status if linked
    if (assignmentId) {
        const assignment = await FormAssignment.findById(assignmentId);
        if (assignment) {
            assignment.status = 'Edited';
            assignment.lastAction = 'Submitted';
            assignment.dataId = submission._id;
            await assignment.save();
        }
    }

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
    const template = await ActiveForm.findById(id).populate('createdBy', 'fullName designation labName');

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

    // Check if user is delegated this form
    const isDelegated = await FormAssignment.exists({
        templateId: id,
        $or: [
            { assignedTo: user._id },
            { delegationChain: user._id }
        ]
    });

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic && !isSuperadmin && !isDelegated) {
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
    const template = await ActiveForm.findById(id);

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

    await ActiveForm.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, "Template deleted successfully", null)
    );
});

/**
 * Clones a form template for the current user.
 */
const cloneTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { shareWithMyLabOnly } = req.body;

    const original = await ActiveForm.findById(id);
    if (!original) throw new ApiErrors("Original template not found", 404);

    // Access control: User must be able to view the template to clone it
    // (Creator, Shared, or Public)
    const user = req.user;
    const isCreator = original.createdBy.toString() === user._id.toString();
    const isSharedUser = original.sharedWithUsers.includes(user._id);
    const isSharedLab = original.sharedWithLabs.includes(user.labName);
    const isPublic = original.isPublic;
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());

    if (!isCreator && !isSharedUser && !isSharedLab && !isPublic && !isSuperadmin) {
        throw new ApiErrors("Unauthorized to access this template", 403);
    }

    // Create a copy
    const clonedTemplate = await ActiveForm.create({
        title: `${original.title} (Copy)`,
        description: original.description,
        fields: original.fields, // Deep copy via Mongoose create
        createdBy: user._id,
        sharedWithLabs: [], // Reset sharing
        sharedWithUsers: [], // Reset sharing
        isPublic: false // Default to private
    });

    await logActivity(req, "FORM_TEMPLATE_CLONE", "ActiveForm", clonedTemplate._id, {
        sourceTemplateId: original._id,
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

    const template = await ActiveForm.findById(id);
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
        const newTemplate = await ActiveForm.create({
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
    const template = await ActiveForm.findById(id);

    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    const user = req.user;
    const isCreator = template.createdBy.toString() === user._id.toString();
    const isSuperadmin = ['superadmin', 'admin'].includes(user.role?.toLowerCase());



    // Build query clauses
    let query;

    if (isCreator || isSuperadmin) {
        // Creator/Admin: Show ONLY 'Submitted' responses from others, but allow own drafts
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
        // Regular User/Delegate: Show branch submissions with status filter
        const assignments = await FormAssignment.find({
            templateId: id,
            $or: [
                { assignedTo: user._id },
                { assignedBy: user._id },
                { delegationChain: user._id }
            ]
        });

        const branchUserIds = new Set();
        assignments.forEach(a => {
            branchUserIds.add(a.assignedTo.toString());
            branchUserIds.add(a.assignedBy.toString());
            a.delegationChain.forEach(id => branchUserIds.add(id.toString()));
        });

        if (branchUserIds.size > 0) {
            query = {
                templateId: id,
                $or: [
                    { submittedBy: user._id }, // My own submissions
                    {
                        submittedBy: { $in: Array.from(branchUserIds), $ne: user._id },
                        status: 'Submitted'
                    }
                ]
            };
        } else {
            // No branch - only show own submissions
            query = {
                templateId: id,
                submittedBy: user._id
            };
        }
    }



    const submissions = await CollectedData.find(query)
        .populate('submittedBy', 'fullName email designation labName')
        .populate('movementHistory.performedBy', 'fullName email designation labName avatar')
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

