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
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { logActivity } from "../utils/audit.utils.js";
import { createNotification } from "./notification.controller.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import { storageService } from "../services/storage.service.js";

/**
 * Helper to get IP address
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
 * Delegates a form to a subordinate user within the same lab.
 * Creates a new assignment in the delegation chain and updates the sender's status.
 *
 * @route POST /api/v1/forms/workflow/delegate
 * @access Private
 * @param {string} req.body.templateId - ID of the form template
 * @param {string} req.body.assignedToId - ID of the user to delegate to
 * @param {string} req.body.remarks - Delegation instructions/remarks
 * @param {string} [req.body.parentAssignmentId] - ID of parent assignment (if delegating from existing assignment)
 * @returns {Object} Created assignment object
 * @throws {ApiErrors} 400 if required fields missing or form already approved/finalized, 403 if delegation not allowed or cross-lab delegation attempted, 404 if template or user not found
 */
const delegateForm = asyncHandler(async (req, res) => {
    const { templateId, assignedToId, remarks, parentAssignmentId } = req.body;


    let templateCreator = "Unknown";
    let assigneeName = "Unknown";

    if (templateId) {
        const tmpl = await ActiveForm.findById(templateId).populate("createdBy", "fullName");
        if (tmpl && tmpl.createdBy) {
            templateCreator = tmpl.createdBy.fullName;
        }
    }

    if (assignedToId) {
        const assignee = await User.findById(assignedToId).select("fullName");
        if (assignee) {
            assigneeName = assignee.fullName;
        }
    }



    console.log("Backend Delegate Form Request:", {
        "Template ID": templateId,
        "Assigned To": assigneeName,
        "Assigned By": req.user?.fullName,
        "Remarks": remarks
    });


    if (!templateId || !assignedToId) {
        throw new ApiErrors("Template ID and assignee are required", 400);
    }

    const template = await ActiveForm.findById(templateId);
    if (!template) {
        throw new ApiErrors("Form template not found", 404);
    }

    if (template.allowDelegation === false) {
        throw new ApiErrors("Delegation is not allowed for this form.", 403);
    }

    // Check sender's assignment status
    let senderAssignment = null;
    if (parentAssignmentId) {
        senderAssignment = await FormAssignment.findById(parentAssignmentId);
        if (senderAssignment) {
            if (senderAssignment.assignedTo.toString() !== req.user._id.toString()) {
                throw new ApiErrors("Unauthorized: You are not the owner of this assignment", 403);
            }
            if (senderAssignment.status === 'Approved' || senderAssignment.isFinalized) {
                throw new ApiErrors("Cannot delegate: Form is already Approved or Finalized.", 400);
            }
        }
    } else {
        // Root user check
        senderAssignment = await FormAssignment.findOne({
            templateId,
            assignedTo: req.user._id,
            parentAssignmentId: null
        });
        if (senderAssignment && senderAssignment.status === 'Approved') {
            throw new ApiErrors("Cannot delegate: Form is Approved.", 400);
        }
    }

    const targetUser = await User.findById(assignedToId);
    if (!targetUser) {
        throw new ApiErrors("Target user not found", 404);
    }

    if (targetUser.labName !== req.user.labName) {
        throw new ApiErrors(`Forbidden: Delegation is restricted to your own lab (${req.user.labName}) only.`, 403);
    }

    let delegationChain = [req.user._id];
    let topParentId = parentAssignmentId || null;
    let senderAssignmentId = parentAssignmentId;

    // 1. If no parentAssignmentId provided, this might be the A-Main starting the delegation
    if (!parentAssignmentId) {
        // Check if A-Main already has an assignment record
        let existingAssignment = await FormAssignment.findOne({
            templateId,
            assignedTo: req.user._id,
            status: { $ne: 'Returned' }
        });

        if (!existingAssignment) {
            // Create the "Root" assignment for A-Main (Primary Recipient)
            existingAssignment = await FormAssignment.create({
                templateId,
                assignedTo: req.user._id,
                assignedBy: template.createdBy,
                status: 'Edited', // Standardized state
                delegationChain: [template.createdBy],
                parentAssignmentId: null, // They are the root
                lastAction: 'Delegated',
                remarks: "Initial distribution",
                instructions: "Please fill the form" // Default instruction for Root
            });
        }

        senderAssignmentId = existingAssignment._id;
        topParentId = existingAssignment._id; // They are the root
        delegationChain = [template.createdBy, req.user._id];
    } else {
        const parentAssignment = await FormAssignment.findById(parentAssignmentId);
        if (parentAssignment) {
            delegationChain = [...parentAssignment.delegationChain, req.user._id];
            // If the parent is already a delegate, keep its root. If parent is root, use it.
            topParentId = parentAssignment.parentAssignmentId || parentAssignment._id;
        }
    }

    // Find the sender's existing assignment to copy its dataId if any
    const finalSenderAssignment = await FormAssignment.findById(senderAssignmentId);

    const assignment = await FormAssignment.create({
        templateId,
        assignedTo: assignedToId,
        assignedBy: req.user._id,
        status: 'Pending',
        delegationChain,
        parentAssignmentId: senderAssignmentId, // Link to Immediate Parent (Linked List)
        lastAction: 'Pending',
        remarks,
        instructions: remarks, // Save initial remarks as instructions
        dataId: finalSenderAssignment?.dataId || undefined
    });

    // Update sender's assignment status if it wasn't already updated
    if (finalSenderAssignment) {
        finalSenderAssignment.status = 'Edited'; // Mark as processed
        finalSenderAssignment.lastAction = 'Delegated'; // Correctly label the action
        await finalSenderAssignment.save();
    }

    // 4. Record the Movement in CollectedData if it exists
    const dataId = finalSenderAssignment?.dataId || assignment.dataId;
    if (dataId) {
        await CollectedData.findByIdAndUpdate(dataId, {
            $push: {
                movementHistory: {
                    performedBy: req.user._id,
                    action: 'Delegated',
                    remarks,
                    timestamp: new Date()
                }
            }
        });
    }

    await createNotification(
        assignedToId,
        "FORM_DELEGATED",
        "Form Task Assigned",
        `${req.user.fullName} has marked a form "${template.title}" to you for filling/processing.`,
        assignment._id
    );

    await logActivity(req, "FORM_DELEGATION", "FormAssignment", assignment._id, { remarks }, req.user._id);

    return res.status(201).json(
        new ApiResponse(201, "Form delegated successfully", assignment)
    );
});

/**
 * Sends a form back to a previous participant in the delegation chain for approval.
 * Allows urgent bypass to skip intermediate users if needed.
 *
 * @route POST /api/v1/forms/workflow/mark-back
 * @access Private
 * @param {string} req.body.assignmentId - ID of current assignment
 * @param {string} req.body.remarks - Remarks for sending back
 * @param {string} [req.body.dataId] - ID of collected data
 * @param {string} [req.body.returnToId] - Optional: ID of specific user to return to (for urgent bypass)
 * @returns {Object} New assignment created for the target user
 * @throws {ApiErrors} 400 if target user not in delegation chain, 403 if unauthorized, 404 if assignment not found
 */
const markBack = asyncHandler(async (req, res) => {
    const { assignmentId, remarks, dataId, returnToId } = req.body;

    const currentAssignment = await FormAssignment.findById(assignmentId);
    if (!currentAssignment) {
        throw new ApiErrors("Assignment not found", 404);
    }

    if (currentAssignment.assignedTo.toString() !== req.user._id.toString()) {
        throw new ApiErrors("Unauthorized to mark back this assignment", 403);
    }

    // Ensure form is "Finalized" if user is a delegate, OR just trust "Mark Final" step happened before.
    // The requirement says: "Mark Final" sets state, then "Send for Approval".
    // We don't strictly enforce isFinalized=true here to allow flexibility, 
    // but the UI will control the flow. Status 'Edited' is fine conceptually as 'Submitted for approval' implies edit done.

    // Determine target recipient (default to assignedBy, or returnToId if provided for bypass)
    let targetUserId = currentAssignment.assignedBy;
    if (returnToId) {
        // Validation: returnToId must be in the delegation chain
        const isInChain = currentAssignment.delegationChain.some(id => id.toString() === returnToId.toString());
        if (!isInChain) {
            throw new ApiErrors("Target user is not in the delegation chain history", 400);
        }
        targetUserId = returnToId;
    }

    const effectiveDataId = dataId || currentAssignment.dataId;
    const template = await ActiveForm.findById(currentAssignment.templateId);

    // 1. Update CollectedData history
    if (effectiveDataId) {
        await CollectedData.findByIdAndUpdate(effectiveDataId, {
            // $set: { status: 'Edited' }, // Status remains 'Edited' globally until Approved/Submitted
            $push: {
                movementHistory: {
                    performedBy: req.user._id,
                    action: 'Sent for Approval', // Updated terminology
                    remarks,
                    timestamp: new Date()
                }
            }
        });
    }

    // 2. Mark current assignment as returned/completed locally
    // currentAssignment.status = 'Edited'; // Keep as is, or marked?
    // If it was 'Pending', it becomes 'Edited'.
    if (currentAssignment.status === 'Pending') currentAssignment.status = 'Edited';
    currentAssignment.isFinalized = true; // Implicitly finalized if sending back? Or explicit?
    // Let's assume explicit "Mark Final" should have happened, but setting it here enforces "No more delegation".
    currentAssignment.isFinalized = true;

    await currentAssignment.save();

    // 3. Create NEW assignment for the target user (Return the ball)
    // The previous chain + current user becomes the new history? or we revert to previous chain state?
    // Actually, we are extending the chain of custody.
    const newDelegationChain = [...currentAssignment.delegationChain, req.user._id];

    // Determine the root for the new assignment logic (same parent chain)
    let newParentId = currentAssignment.parentAssignmentId;
    if (newParentId) {
        const rootAssignment = await FormAssignment.findById(newParentId);
        // If we are marking back to the actual A-Main user, they become the "current holder" which is effectively the root again.
        // But technicaly parentAssignmentId points to the initial root assignment record.
        // We keep pointing to the same root record for consistency unless we are marking TO the root,
        // in which case the root simply regains control.
        // However, creating a NEW assignment for the Root is safer for history tracking than modifying the old one.
    }

    // Special check: If target is Root, ensure we link correctly so they see it as "My Task"
    // The "Root" is defined as the one with parentAssignmentId = null (or derived from it).

    const newAssignment = await FormAssignment.create({
        templateId: currentAssignment.templateId,
        assignedTo: targetUserId,
        assignedBy: req.user._id, // I am sending it back
        status: 'Edited', // It comes back as Edited/for review
        parentAssignmentId: newParentId,
        delegationChain: newDelegationChain,
        lastAction: 'Marked Back',
        remarks: remarks,
        dataId: effectiveDataId || undefined
    });

    await createNotification(
        targetUserId,
        "FORM_MARKED_BACK",
        "Form Returned for Approval",
        `${req.user.fullName} has sent the form "${template.title}" back for your approval.`,
        newAssignment._id
    );

    await logActivity(req, "FORM_MARK_BACK", "FormAssignment", newAssignment._id, { remarks, targetUserId }, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, "Form sent for approval successfully", newAssignment)
    );
});

/**
 * Marks a form assignment as finalized, preventing further delegation.
 * This is typically done by a delegate before sending the form back for approval.
 *
 * @route POST /api/v1/forms/workflow/mark-final
 * @access Private
 * @param {string} req.body.assignmentId - ID of the assignment to finalize
 * @param {string} [req.body.remarks] - Optional remarks
 * @returns {Object} Updated assignment object
 * @throws {ApiErrors} 403 if unauthorized, 404 if assignment not found
 */
const markFinal = asyncHandler(async (req, res) => {
    const { assignmentId, remarks } = req.body;

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiErrors("Assignment not found", 404);
    }

    if (assignment.assignedTo.toString() !== req.user._id.toString()) {
        throw new ApiErrors("Unauthorized: You are not the owner of this assignment", 403);
    }

    if (assignment.parentAssignmentId === null) {
        // Root user shouldn't theoretically use "Mark Final", they use "Approve".
        // But if they do, it's harmless or could mean "Ready for Submit".
        // Let's allow it but semantic is different.
    }

    assignment.isFinalized = true;

    // Preserve original instructions if missing
    if (!assignment.instructions && assignment.remarks) {
        assignment.instructions = assignment.remarks;
    }

    assignment.status = 'Edited'; // Ensure it's marked as edited
    await assignment.save();

    // Log in movement history
    if (assignment.dataId) {
        await CollectedData.findByIdAndUpdate(assignment.dataId, {
            $push: {
                movementHistory: {
                    performedBy: req.user._id,
                    action: 'Marked Final',
                    remarks: remarks || 'Marked as Final',
                    timestamp: new Date()
                }
            }
        });
    }

    return res.status(200).json(
        new ApiResponse(200, "Form marked as Final", assignment)
    );
});

/**
 * Approves a filled form. Requires approval authority designation.
 * Updates the collected data status to 'Approved'.
 *
 * @route POST /api/v1/forms/workflow/approve
 * @access Private (requires approval authority designation)
 * @param {string} req.body.assignmentId - ID of the assignment to approve
 * @param {string} [req.body.remarks] - Approval remarks
 * @returns {Object} Updated assignment object
 * @throws {ApiErrors} 403 if user lacks approval authority or is unauthorized, 404 if assignment or data not found
 */
const approveForm = asyncHandler(async (req, res) => {
    const { assignmentId, remarks } = req.body;

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment || !assignment.dataId) {
        throw new ApiErrors("Active assignment or data not found", 404);
    }

    // 1. Logic Check: Only the current holder of the assignment can take action
    if (assignment.assignedTo.toString() !== req.user._id.toString()) {
        throw new ApiErrors("Unauthorized: You are not the current holder of this assignment.", 403);
    }

    // 2. Permission Check: Check for Designation-based approval authority
    const config = await SystemConfig.findOne({ key: "APPROVAL_AUTHORITY_DESIGNATIONS" });
    let allowedDesignations = [];
    if (config && config.value) {
        if (Array.isArray(config.value)) {
            allowedDesignations = config.value;
        } else if (typeof config.value === 'string') {
            allowedDesignations = config.value.split(',').map(d => d.trim());
        }
    }

    if (!allowedDesignations.includes(req.user.designation)) {
        throw new ApiErrors(`Forbidden: Your designation (${req.user.designation || 'N/A'}) is not authorized to provide approvals.`, 403);
    }

    // 3. Workflow Check: Removed restriction that only A-Main can approve. 
    // Any user with proper designation in the chain can approve.

    await CollectedData.findByIdAndUpdate(assignment.dataId, {
        $set: { status: 'Approved' },
        $push: {
            movementHistory: {
                performedBy: req.user._id,
                action: 'Approved',
                remarks,
                timestamp: new Date()
            }
        }
    });

    assignment.status = 'Approved';
    assignment.lastAction = 'Approved';

    // Preserve original instructions if missing before overwriting remarks
    if (!assignment.instructions && assignment.remarks) {
        assignment.instructions = assignment.remarks;
    }

    assignment.remarks = remarks;
    assignment.isFinalized = true; // Implicitly finalized
    await assignment.save();

    await logActivity(req, "FORM_APPROVAL", "CollectedData", assignment.dataId, { status: 'Approved', remarks }, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, `Form Approved successfully`, assignment)
    );
});

/**
 * Submits an approved form back to the distributor (final step).
 * Only approved forms can be submitted.
 *
 * @route POST /api/v1/forms/workflow/submit-to-distributor
 * @access Private
 * @param {string} req.body.assignmentId - ID of the assignment to submit
 * @param {string} [req.body.remarks] - Submission remarks
 * @returns {Object} Updated assignment object
 * @throws {ApiErrors} 400 if form not approved, 404 if assignment or template not found
 */
const submitToDistributor = asyncHandler(async (req, res) => {
    const { assignmentId, remarks } = req.body;

    const assignment = await FormAssignment.findById(assignmentId);
    if (!assignment || !assignment.dataId) {
        throw new ApiErrors("Assignment or data not found", 404);
    }

    // Check if delegation is allowed for this form
    const template = await ActiveForm.findById(assignment.templateId);
    if (!template) {
        throw new ApiErrors("Template not found", 404);
    }

    // Strict Check: Only "Approved" status is allowed for submission.
    // "Edited" forms cannot be submitted directly. They must be Approved first.
    // If delegation is disabled, saveDraft handles auto-approval.
    if (assignment.status !== 'Approved') {

        throw new ApiErrors("Form must be Approved before submitting to distributor.", 400);
    }

    /* Reverted relaxed check
    if (template.allowDelegation !== false) {
        if (assignment.status !== 'Approved') {
             throw new ApiErrors("Form must be Approved before submitting to distributor (Delegation Enabled)", 400);
        }
    } else {
        // Restricted mode: Edited or Approved are fine
        if (assignment.status !== 'Edited' && assignment.status !== 'Approved') {
             throw new ApiErrors("Form must be fully filled (Edited) before submitting", 400);
        }
    }
    */

    // 3. Workflow Check: Removed restriction that only A-Main can submit.
    // Any user with properly approved assignment can submit.
    /*
    if (assignment.parentAssignmentId) {
        throw new ApiErrors("Only A-Main can perform the final submission", 403);
    }
    */

    await CollectedData.findByIdAndUpdate(assignment.dataId, {
        $set: { status: 'Submitted' },
        $push: {
            movementHistory: {
                performedBy: req.user._id,
                action: 'Submitted',
                remarks,
                timestamp: new Date()
            }
        }
    });

    assignment.status = 'Submitted';
    assignment.lastAction = 'Submitted';

    // Preserve original instructions if missing before overwriting remarks
    if (!assignment.instructions && assignment.remarks) {
        assignment.instructions = assignment.remarks;
    }

    assignment.remarks = remarks;
    await assignment.save();

    await logActivity(req, "FORM_FINAL_SUBMISSION", "CollectedData", assignment.dataId, { remarks }, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, "Form submitted to distributor successfully", assignment)
    );
});

/**
 * Saves form draft data without changing workflow status.
 * Handles file uploads and auto-approves if delegation is disabled.
 *
 * @route POST /api/v1/forms/workflow/save-draft
 * @access Private
 * @param {string} req.body.templateId - ID of the form template
 * @param {Object} req.body.data - Form field data (JSON or JSON string)
 * @param {string} [req.body.assignmentId] - Optional assignment ID
 * @param {Array} [req.files] - Uploaded files (multipart/form-data)
 * @returns {Object} Saved submission and assignment objects
 * @throws {ApiErrors} 400 if required fields missing or invalid data format, 404 if template not found
 */
const saveDraft = asyncHandler(async (req, res) => {
    let { templateId, data, assignmentId } = req.body;

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

    // Check Template Constraints (for Auto-Approval Logic)
    const template = await ActiveForm.findById(templateId);
    if (!template) {
        throw new ApiErrors("Template not found", 404);
    }

    // Determine target status: If delegation is disabled, auto-approve immediately
    let targetStatus = 'Edited';
    let targetAction = 'Draft Updated';

    if (template.allowDelegation === false) {
        targetStatus = 'Approved';
        targetAction = 'Auto-Approved (Restricted Mode)';
    }

    // Capture IP Address
    const ipAddress = getIpAddress(req);

    let submission = null;

    if (assignmentId) {
        const assignment = await FormAssignment.findById(assignmentId);
        if (assignment && assignment.dataId) {
            submission = await CollectedData.findById(assignment.dataId);
        }

        // update status based on logic
        if (assignment) {
            assignment.status = targetStatus;
            assignment.lastAction = targetAction;
            // Ensure isFinalized is true if Approved?
            if (targetStatus === 'Approved') assignment.isFinalized = true;
            await assignment.save();
        }
    }

    if (!submission) {
        submission = await CollectedData.findOne({
            templateId,
            submittedBy: req.user._id,
            status: { $in: ['Edited', 'Pending', 'Approved'] } // Include Approved to allow updates
        });
    }

    if (submission) {
        submission.set('data', data);
        submission.markModified('data');
        submission.status = targetStatus;
        submission.ipAddress = ipAddress;

        submission.movementHistory.push({
            performedBy: req.user._id,
            action: targetAction,
            remarks: targetStatus === 'Approved' ? 'Auto-approved by system (No Delegation)' : 'Data modified in draft',
            timestamp: new Date()
        });
        await submission.save();
    } else {
        submission = await CollectedData.create({
            templateId,
            data,
            labName: req.user.labName || "Unknown",
            submittedBy: req.user._id,
            status: targetStatus,
            ipAddress,
            movementHistory: [{
                performedBy: req.user._id,
                action: targetStatus === 'Approved' ? 'Created & Approved' : 'Draft Created',
                remarks: targetStatus === 'Approved' ? 'Initial auto-approval' : 'Initial draft saved',
                timestamp: new Date()
            }]
        });
    }

    // Check/Create Assignment if missing (Auto-start workflow for Root)
    let activeAssignment = null;
    if (assignmentId) {
        activeAssignment = await FormAssignment.findById(assignmentId);
    } else {
        // Try to find existing assignment for this user and template
        activeAssignment = await FormAssignment.findOne({
            templateId,
            assignedTo: req.user._id,
            status: { $ne: 'Returned' } // Get the active one
        });

        // If still no assignment, and this is a user saving their own/shared form -> Create Root Assignment
        if (!activeAssignment) {
            // Need template details to know creator
            const templateDetails = await ActiveForm.findById(templateId);
            if (templateDetails) {
                activeAssignment = await FormAssignment.create({
                    templateId,
                    assignedTo: req.user._id,
                    assignedBy: templateDetails.createdBy, // Initially assigned by creator
                    status: targetStatus,
                    delegationChain: [templateDetails.createdBy],
                    parentAssignmentId: null, // Root
                    lastAction: targetAction,
                    remarks: "Workflow started via Draft Save",
                    instructions: "Please fill the form", // Default instruction for Root
                    dataId: submission._id,
                    isFinalized: targetStatus === 'Approved'
                });
            }
        }
    }

    // Update assignment status if linked and needed (just in case it wasn't caught above)
    if (activeAssignment) {
        if (!activeAssignment.dataId) {
            activeAssignment.dataId = submission._id;
        }
        // Force update status
        activeAssignment.status = targetStatus;
        activeAssignment.lastAction = targetAction;
        if (targetStatus === 'Approved') activeAssignment.isFinalized = true;

        await activeAssignment.save();
    }

    return res.status(200).json(
        new ApiResponse(200, "Draft saved and status updated", { submission, assignment: activeAssignment })
    );
});

/**
 * Fetches the detailed delegation chain history for an assignment.
 */
/**
 * Helper to build timeline from assignments
 */
const buildTimeline = (currentAssignment, allAssignments, currentIdForHighlight) => {
    // Build a map for easy lookup
    const assignmentMap = new Map();
    // Filter assignments to the same dataId to isolate this specific chain
    // (Crucial for safely using time-based fallbacks)
    const chainAssignments = currentAssignment.dataId
        ? allAssignments.filter(a => a.dataId && a.dataId.toString() === currentAssignment.dataId.toString())
        : allAssignments;

    chainAssignments.forEach(a => assignmentMap.set(a._id.toString(), a));

    // Debug: Log all assignments
    console.log('\n=== ALL ASSIGNMENTS ===');
    allAssignments.forEach(a => {
        console.log(`ID: ${a._id.toString().slice(-6)}, AssignedTo: ${a.assignedTo?.fullName}, AssignedBy: ${a.assignedBy?.fullName}, ParentID: ${a.parentAssignmentId ? a.parentAssignmentId.toString().slice(-6) : 'null'}, DataID: ${a.dataId ? a.dataId.toString().slice(-6) : 'null'}`);
    });
    console.log('======================\n');

    // Trace back from currentAssignment to Root
    const uniqueAssignments = [];
    // Ensure we start with the populated version from the map
    let curr = assignmentMap.get(currentAssignment._id.toString()) || currentAssignment;
    const visited = new Set();

    while (curr) {
        if (visited.has(curr._id.toString())) break;
        visited.add(curr._id.toString());
        console.log(`[Traceback] Visiting: ${curr.assignedTo?.fullName}, AssignedBy: ${curr.assignedBy?.fullName}, ParentID: ${curr.parentAssignmentId}`);
        uniqueAssignments.unshift(curr);

        let parentFound = false;

        if (curr.parentAssignmentId) {
            let parent = assignmentMap.get(curr.parentAssignmentId.toString());
            if (!parent) {
                parent = allAssignments.find(a => a._id.toString() === curr.parentAssignmentId.toString());
                console.log(`[Traceback] Parent ${curr.parentAssignmentId} found in global list: ${!!parent}`);
            }

            if (parent) {
                console.log(`[Traceback] Checking continuity: Parent.AssignedTo=${parent.assignedTo?.fullName}, Curr.AssignedBy=${curr.assignedBy?.fullName}`);
                if (parent.assignedTo._id.toString() === curr.assignedBy._id.toString()) {
                    console.log(`[Traceback] ✓ Continuity OK, moving to parent`);
                    curr = parent;
                    parentFound = true;
                } else {
                    console.log(`[Traceback] ✗ Continuity FAILED, trying fallbacks`);
                }
            }
        }

        if (!parentFound) {
            console.log(`[Traceback] No parent found, trying fallbacks for ${curr.assignedBy?.fullName}`);

            // Fallback 1: Search within the SAME delegation chain (same dataId) first
            let prev = null;
            if (curr.dataId) {
                prev = allAssignments.find(a =>
                    a.dataId && a.dataId.toString() === curr.dataId.toString() &&
                    a.assignedTo._id.toString() === curr.assignedBy._id.toString() &&
                    new Date(a.createdAt) < new Date(curr.createdAt)
                );
                console.log(`[Traceback] Fallback 1 (Same chain): ${prev ? prev.assignedTo?.fullName : 'none'}`);
            }

            // Fallback 2: Global time-based search (if not found in same chain)
            if (!prev) {
                prev = allAssignments.find(a =>
                    a.assignedTo._id.toString() === curr.assignedBy._id.toString() &&
                    new Date(a.createdAt) < new Date(curr.createdAt)
                );
                console.log(`[Traceback] Fallback 2 (Time-based): ${prev ? prev.assignedTo?.fullName : 'none'}`);
            }

            // Fallback 3: Root assignment search
            if (!prev) {
                prev = allAssignments.find(a =>
                    a.assignedTo._id.toString() === curr.assignedBy._id.toString() &&
                    !a.parentAssignmentId
                );
                console.log(`[Traceback] Fallback 3 (Root): ${prev ? prev.assignedTo?.fullName : 'none'}`);
            }

            // Fallback 4: Chain time-based (last resort)
            if (!prev) {
                const candidates = chainAssignments.filter(a => new Date(a.createdAt) < new Date(curr.createdAt));
                if (candidates.length > 0) {
                    candidates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    prev = candidates[0];
                    console.log(`[Traceback] Fallback 4 (Chain time): ${prev.assignedTo?.fullName}`);
                }
            }

            if (prev && !visited.has(prev._id.toString())) {
                console.log(`[Traceback] Moving to fallback: ${prev.assignedTo?.fullName}`);
                curr = prev;
            } else {
                console.log(`[Traceback] Dead end - no more parents`);
                curr = null;
            }
        }
    }

    // Trace descendants
    let child = assignmentMap.get(currentAssignment._id.toString()) || currentAssignment;
    while (child) {
        let next = allAssignments.find(a =>
            a.parentAssignmentId && a.parentAssignmentId.toString() === child._id.toString()
        );

        if (!next) {
            next = allAssignments.find(a =>
                a.assignedBy._id.toString() === child.assignedTo._id.toString() &&
                new Date(a.createdAt) > new Date(child.createdAt)
            );
        }

        if (next) {
            if (visited.has(next._id.toString())) break;
            visited.add(next._id.toString());
            uniqueAssignments.push(next);
            child = next;
        } else {
            child = null;
        }
    }

    // Build timeline from sorted assignments
    const timeline = uniqueAssignments.map((segment, index) => {
        const type = index === 0 ? 'Initiated' : (segment.lastAction === 'Marked Back' ? 'Returned' : 'Delegated');

        // Use instructions if available to preserve the original delegation message.
        // Falls back to remarks for actions like "Returned" or legacy data.
        let displayRemarks = segment.instructions || segment.remarks;

        // Fallback for legacy data where remarks weren't saved
        if ((type === 'Initiated' || type === 'Delegated') && !displayRemarks) {
            displayRemarks = "Please fill the form";
        }

        return {
            _id: segment._id,
            type,
            fromUser: segment.assignedBy,
            toUser: segment.assignedTo,
            date: segment.createdAt,
            remarks: displayRemarks,
            action: segment.lastAction,
            status: segment.status,
            isCurrent: segment._id.toString() === currentIdForHighlight?.toString()
        };
    });

    // FIX: If the form is "Submitted", visually show it returning to the Distributor
    const lastSegment = uniqueAssignments[uniqueAssignments.length - 1];
    if (lastSegment && lastSegment.status === 'Submitted') {
        timeline.push({
            _id: `${lastSegment._id}_submitted`,
            type: 'Returned',
            fromUser: lastSegment.assignedTo, // Person who submitted
            toUser: lastSegment.assignedBy,   // Person who gathers it (Distributor)
            date: lastSegment.updatedAt,      // Submission time
            remarks: lastSegment.remarks, // Submission remarks
            action: 'Submitted',
            status: 'Submitted',
            isCurrent: true
        });

        // Find the Root Initiator (The very first person in the chain)
        // detailedAssignments are chronologically sorted. uniqueAssignments[0] is the root assignment.
        // The Root Assignment was assignedTo the first filler, assignedBy the Distributor/Initiator.
        if (uniqueAssignments.length > 0) {
            const rootAssignment = uniqueAssignments[0];
            // Update the 'toUser' of the submission to be the Initiator
            timeline[timeline.length - 1].toUser = rootAssignment.assignedBy;
        }
    }

    return timeline;
};

/**
 * Fetches the detailed delegation chain history for an assignment.
 */
const getChainDetails = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;

    const currentAssignment = await FormAssignment.findById(assignmentId);
    if (!currentAssignment) {
        throw new ApiErrors("Assignment not found", 404);
    }

    const allAssignments = await FormAssignment.find({
        templateId: currentAssignment.templateId
    })
        .populate('assignedBy', 'fullName designation labName avatar')
        .populate('assignedTo', 'fullName designation labName avatar')
        .sort({ createdAt: 1 })
        .lean(); // Chronological order

    let timeline = buildTimeline(currentAssignment, allAssignments, assignmentId);

    // Fetch permitted designations
    const config = await SystemConfig.findOne({ key: 'APPROVAL_AUTHORITY_DESIGNATIONS' });
    let allowedDesignations = [];

    if (config && config.value) {
        if (Array.isArray(config.value)) {
            allowedDesignations = config.value;
        } else if (typeof config.value === 'string') {
            allowedDesignations = config.value.split(',').map(d => d.trim());
        }
    }

    // Augment timeline with hasApprovalAuthority
    timeline = timeline.map(item => {
        if (item.fromUser) {
            item.fromUser.hasApprovalAuthority = allowedDesignations.includes(item.fromUser.designation);
        }
        if (item.toUser) {
            item.toUser.hasApprovalAuthority = allowedDesignations.includes(item.toUser.designation);
        }
        return item;
    });

    return res.status(200).json(
        new ApiResponse(200, "Chain details fetched", timeline)
    );
});

/**
 * Fetches the chain history by Submission ID (collectedData ID).
 * Falls back to simple movement history if no assignment chain exists.
 */
const getChainBySubmissionId = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;

    // 1. Try to find a related assignment (any assignment pointing to this data)
    // We sort by createdAt desc to get the latest one likely to have the dataId
    const assignment = await FormAssignment.findOne({ dataId: submissionId }).sort({ createdAt: -1 });

    if (assignment) {
        const allAssignments = await FormAssignment.find({
            templateId: assignment.templateId
        })
            .populate('assignedBy', 'fullName designation labName avatar')
            .populate('assignedTo', 'fullName designation labName avatar')
            .sort({ createdAt: 1 });

        // Use the found assignment as the "current" reference for root detection
        const timeline = buildTimeline(assignment, allAssignments, assignment._id);

        return res.status(200).json(
            new ApiResponse(200, "Chain fetched via assignment", timeline)
        );
    }

    // 2. Fallback: Build chain solely from CollectedData.movementHistory
    const submission = await CollectedData.findById(submissionId)
        .populate('movementHistory.performedBy', 'fullName designation labName avatar')
        .populate('submittedBy', 'fullName designation labName avatar');

    if (!submission) {
        throw new ApiErrors("Submission not found", 404);
    }

    // Map movementHistory to Timeline format
    // This is a simplified view since we don't have 'toUser' in movementHistory explicitly
    const timeline = submission.movementHistory.map((history, index) => {
        let type = 'Action';
        if (index === 0) type = 'Initiated';
        if (history.action === 'Delegated') type = 'Delegated';
        if (history.action === 'Submitted') type = 'Submitted';
        if (history.action === 'Marked Back' || history.action === 'Sent for Approval') type = 'Returned';

        return {
            _id: history._id || `${submission._id}_${index}`,
            type,
            fromUser: history.performedBy,   // User doing the action
            toUser: null,                    // Unknown target in this simplified view
            date: history.timestamp,
            remarks: history.remarks,
            instructions: history.remarks,   // Use remarks as instructions/desc
            action: history.action,
            status: submission.status,       // Current global status
            isCurrent: index === submission.movementHistory.length - 1
        };
    });

    return res.status(200).json(
        new ApiResponse(200, "Chain fetched from submission history", timeline)
    );
});

export {
    delegateForm,
    markBack,
    markFinal,
    approveForm,
    submitToDistributor,
    saveDraft,
    getChainDetails,
    getChainBySubmissionId
};

