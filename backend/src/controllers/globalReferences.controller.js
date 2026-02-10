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
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { GlobalReference } from "../models/globalReference.model.js";
import { GlobalMovement } from "../models/globalRefMovement.model.js";
import { LocalMovement } from "../models/localRefMovement.model.js";
import { LocalReference } from "../models/localReference.model.js";
import { logActivity } from "../utils/audit.utils.js";
import { sendEmail, getNewReferenceEmailTemplate, getUpdateReferenceEmailTemplate, getReminderEmailTemplate, getBaseUrl } from "../utils/mail.js";
import { createNotification } from "./notification.controller.js";
import crypto from 'crypto';
import mongoose from 'mongoose';
import { getCurrentUser } from "./user.controller.js";
import { FeatureCodes, SUPERADMIN_ROLE_NAME, ReferenceType } from "../constants.js";
import { hasPermission, getRolesWithPermission, checkUserPermission } from "../utils/permission.utils.js";
import { generateUniqueRefId } from "../utils/reference.utils.js";
import { getReferencesWithDetailsPipeline } from "../pipelines/reference.pipelines.js";
import { SystemConfig } from "../models/systemConfig.model.js";

/**
 * Helper to build the final match criteria for references based on user permissions and filters.
 * Ensures strict consistency between getAllReferences, getDashboardStats and getFilters.
 */
const buildReferenceCriteria = async (user, query) => {
  const { scope, isHidden, isArchived } = query;
  const userId = new mongoose.Types.ObjectId(user._id);
  const userLab = user.labName;

  // 1. Permission Check
  const hasGlobalAdmin = await checkUserPermission(user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
  const canManageOwnLab = await checkUserPermission(user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
  const hasGlobalRefAdmin = await checkUserPermission(user, FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);
  const isSystemAdmin = await checkUserPermission(user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const canSeeAllGlobal = isSystemAdmin || hasGlobalAdmin || hasGlobalRefAdmin;
  const canSeeAllLocalOwn = canManageOwnLab;

  // 2. Ownership/Scope Base Criteria
  let criteria = {};
  if (canSeeAllGlobal) {
    criteria = {};
  } else if (canSeeAllLocalOwn) {
    criteria = {
      $or: [
        { participants: userId },
        { 'createdByDetails.labName': userLab },
        { 'markedToDetails.labName': userLab }
      ]
    };
  } else {
    criteria = { participants: userId };
  }

  // 3. Visibility Filters (Hidden/Archived)
  if (canSeeAllGlobal) {
    if (isHidden !== undefined) criteria.isHidden = isHidden === 'true';
    else criteria.isHidden = { $ne: true };

    if (isArchived !== undefined) criteria.isArchived = isArchived === 'true';
    else criteria.isArchived = { $ne: true };
  } else {
    criteria.isHidden = { $ne: true };
    criteria.isArchived = { $ne: true };
  }

  // 4. Scope Filter (Inter-lab vs Local)
  // No longer using isInterLab flag as refType/collection determines global scope.

  return criteria;
};

/**
 * Fetches all references from the database.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with the list of references
 */
export const getAllReferences = asyncHandler(async (req, res, next) => {
  const {
    status,
    priority,
    markedTo,
    createdBy,
    division,
    subject,
    pendingDays,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const baseCriteria = await buildReferenceCriteria(req.user, req.query);
  const userId = new mongoose.Types.ObjectId(req.user._id);

  let filterCriteria = {};

  // Status Filter
  if (status) {
    filterCriteria.status = { $in: Array.isArray(status) ? status : status.split(',') };
  }

  // Priority Filter
  if (priority) {
    filterCriteria.priority = { $in: Array.isArray(priority) ? priority : priority.split(',') };
  }

  // Division (Denormalized)
  if (division) {
    filterCriteria.markedToDivision = { $in: Array.isArray(division) ? division : division.split(',') };
  }

  // Marked To & Created By (Directly in Details or existing IDs)
  if (markedTo || createdBy) {
    const andConditions = [];

    if (markedTo) {
      if (markedTo === 'me') {
        andConditions.push({ markedTo: userId });
      } else {
        const values = Array.isArray(markedTo) ? markedTo : markedTo.split(',');
        const users = await User.find({ email: { $in: values } }).select('_id');
        const userIds = users.map(u => u._id);

        andConditions.push({
          $or: [
            { 'markedToDetails.email': { $in: values } },
            { markedTo: { $in: userIds } }
          ]
        });
      }
    }

    if (createdBy) {
      const values = Array.isArray(createdBy) ? createdBy : createdBy.split(',');
      const users = await User.find({ email: { $in: values } }).select('_id');
      const userIds = users.map(u => u._id);

      andConditions.push({
        $or: [
          { 'createdByDetails.email': { $in: values } },
          { createdBy: { $in: userIds } }
        ]
      });
    }

    if (andConditions.length > 0) {
      filterCriteria.$and = andConditions;
    }
  }

  // Pending Days (Optimized to date range)
  if (pendingDays) {
    const days = parseInt(pendingDays);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    filterCriteria.createdAt = { $lte: cutoffDate };
  }

  // Combine Filters: Using $and to ensure all filter groups (Subject/Search and Lab) are applied together
  // instead of polluting a single $or array.
  const searchFilter = subject ? {
    $or: [
      { subject: { $regex: subject, $options: 'i' } },
      { refId: { $regex: subject, $options: 'i' } }
    ]
  } : null;

  const labFilter = filterCriteria.$or ? { $or: filterCriteria.$or } : null;
  delete filterCriteria.$or;

  const finalMatch = { ...baseCriteria, ...filterCriteria };
  const andConditions = [];
  if (searchFilter) andConditions.push(searchFilter);
  if (labFilter) andConditions.push(labFilter);

  if (andConditions.length > 0) {
    finalMatch.$and = andConditions;
  }

  const total = await GlobalReference.countDocuments(finalMatch);
  const pipeline = getReferencesWithDetailsPipeline(finalMatch);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Use countDocuments on the final matchCriteria (indexed)
  const totalReferences = total;

  pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  const references = await GlobalReference.aggregate(pipeline);

  res.status(200).json(new ApiResponse(200, 'References fetched successfully', {
    data: references,
    pagination: {
      total: totalReferences,
      currentPage: page,
      totalPages: Math.ceil(totalReferences / limit),
      limit
    }
  }));
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const baseCriteria = await buildReferenceCriteria(req.user, req.query);

  const [openCount, highPriorityCount, pending7DaysCount, closedThisMonthCount, markedToUserCount, pendingInDivisionCount, totalReferences] = await Promise.all([
    GlobalReference.countDocuments({ ...baseCriteria, status: { $ne: 'Closed' } }),
    GlobalReference.countDocuments({ ...baseCriteria, priority: 'High', status: { $ne: 'Closed' } }),
    GlobalReference.countDocuments({
      ...baseCriteria,
      createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: { $ne: 'Closed' }
    }),
    GlobalReference.countDocuments({
      ...baseCriteria,
      status: 'Closed',
      updatedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    }),
    GlobalReference.countDocuments({ ...baseCriteria, markedTo: userId, status: { $ne: 'Closed' } }),
    req.user.division ? GlobalReference.countDocuments({ ...baseCriteria, markedToDivision: req.user.division, status: { $ne: 'Closed' } }) : Promise.resolve(0),
    GlobalReference.countDocuments(baseCriteria)
  ]);

  res.status(200).json(new ApiResponse(200, 'Stats fetched successfully', {
    openCount,
    highPriorityCount,
    pending7DaysCount,
    closedThisMonthCount,
    markedToUserCount,
    pendingInDivisionCount,
    totalReferences
  }));
});

/**
 * Fetches unique users, divisions, statuses, and priorities to populate filter dropdowns.
 * Role-aware: Normal users only see options present in references they participate in.
 * Supports 'scope' query param: 'lab' (Local), 'inter-lab' (Global), or undefined (Both).
 */
export const getReferenceFilters = asyncHandler(async (req, res) => {
  const { scope } = req.query;
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const hasGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
  const canManageOwnLab = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
  const hasGlobalRefAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);
  const hasGlobalRefView = await checkUserPermission(req.user, FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER);

  const isSystemAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  // Admin or user with global view permission can see all global filters
  const canSeeAllGlobalFilters = isSystemAdmin || hasGlobalAdmin || hasGlobalRefAdmin;
  // Local admin (Manage own lab) or View own lab permission can see all local filters
  const hasLocalView = await checkUserPermission(req.user, FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER);
  const canSeeAllLocalFilters = isSystemAdmin || hasGlobalAdmin;

  // We'll branch later, but for the "isAdmin" block (which uses facet search), let's use canSeeAllGlobalFilters
  const useFacetSearch = canSeeAllGlobalFilters || hasGlobalAdmin; // Superadmins always use facet

  // Widening the "Normal User" query is safer.

  // Let's set isAdmin = isGlobalAdmin ONLY. 
  // Local Admins fall into "else" but we change the match criteria there.

  const { isArchived, isHidden } = req.query;

  // Base Logic for Archival/Hidden Filter
  const applyVisibilityFilters = (matchCriteria) => {
    if (isArchived !== undefined) {
      matchCriteria.isArchived = isArchived === 'true';
    } else {
      matchCriteria.isArchived = { $ne: true };
    }

    if (isHidden !== undefined) {
      matchCriteria.isHidden = isHidden === 'true';
    } else {
      matchCriteria.isHidden = { $ne: true };
    }
  };

  let createdByUsers = [];
  let markedToUsers = [];
  let divisions = [];
  let statuses = [];
  let priorities = [];

  // Helper to extract values from aggregation result
  const extractValues = (result, createdByMap, markedToMap) => {
    if (!result) return { divs: [], stats: [], prios: [] };

    // Add unique creators to their map
    (result.uniqueCreatedBy || []).forEach(item => {
      if (item.details && item.details.email) {
        createdByMap.set(item.details.email, {
          fullName: item.details.fullName,
          email: item.details.email,
          labName: item.details.labName,
          designation: item.details.designation
        });
      }
    });

    // Add unique assignees to their map
    (result.uniqueMarkedTo || []).forEach(item => {
      if (item.details && item.details.email) {
        markedToMap.set(item.details.email, {
          fullName: item.details.fullName,
          email: item.details.email,
          labName: item.details.labName,
          designation: item.details.designation
        });
      }
    });

    return {
      divs: (result.uniqueDivisions || []).map(d => d._id),
      stats: (result.uniqueStatuses || []).map(s => s._id),
      prios: (result.uniquePriorities || []).map(p => p._id)
    };
  };

  if (canSeeAllGlobalFilters) {
    // ADMIN LOGIC: Use Aggregation to show only values PRESENT in the data
    const createdByMap = new Map();
    const markedToMap = new Map();
    const allDivs = new Set();
    const allStats = new Set();
    const allPrios = new Set();

    const aggregateFilters = (Model, matchCriteria) => {
      return Model.aggregate([
        { $match: matchCriteria },
        {
          $facet: {
            uniqueDivisions: [
              { $group: { _id: "$markedToDivision" } },
              { $match: { _id: { $ne: "Unknown" } } }
            ],
            uniqueStatuses: [{ $group: { _id: "$status" } }],
            uniquePriorities: [{ $group: { _id: "$priority" } }],
            uniqueCreatedBy: [
              { $group: { _id: "$createdByDetails.email", details: { $first: "$createdByDetails" } } }
            ],
            uniqueMarkedTo: [
              { $unwind: { path: "$markedToDetails", preserveNullAndEmptyArrays: true } },
              { $group: { _id: "$markedToDetails.email", details: { $first: "$markedToDetails" } } },
              { $match: { _id: { $ne: null } } }
            ]
          }
        }
      ]);
    };

    const promises = [];

    // Global Pipeline
    if (!scope || scope === 'inter-lab') {
      const match = {}; // Admin sees all
      applyVisibilityFilters(match); // Apply filters
      promises.push(aggregateFilters(GlobalReference, match));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Local Pipeline
    if (!scope || scope === 'lab') {
      const match = {};
      applyVisibilityFilters(match); // Apply filters
      promises.push(aggregateFilters(LocalReference, match));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [refFilters, localFilters] = await Promise.all(promises);

    if (refFilters && refFilters[0]) {
      const { divs, stats, prios } = extractValues(refFilters[0], createdByMap, markedToMap);

      divs.forEach(d => allDivs.add(d));
      stats.forEach(s => allStats.add(s));
      prios.forEach(p => allPrios.add(p));
    }

    if (localFilters && localFilters[0]) {
      const { divs, stats, prios } = extractValues(localFilters[0], createdByMap, markedToMap);

      divs.forEach(d => allDivs.add(d));
      stats.forEach(s => allStats.add(s));
      prios.forEach(p => allPrios.add(p));
    }

    // STRICT FILTERING: Only show users found in the data, do NOT merge all approved users.
    createdByUsers = Array.from(createdByMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    markedToUsers = Array.from(markedToMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    divisions = Array.from(allDivs).filter(Boolean);
    statuses = Array.from(allStats).filter(Boolean);
    priorities = Array.from(allPrios).filter(Boolean);

  } else {
    // NORMAL USER LOGIC: Only see options from references they participate in
    const createdByMap = new Map();
    const markedToMap = new Map();
    const allDivs = new Set();
    const allStats = new Set();
    const allPrios = new Set();

    const aggregateFilters = (Model, matchCriteria) => {
      return Model.aggregate([
        { $match: matchCriteria },
        {
          $facet: {
            uniqueDivisions: [
              { $group: { _id: "$markedToDivision" } },
              { $match: { _id: { $ne: "Unknown" } } }
            ],
            uniqueStatuses: [{ $group: { _id: "$status" } }],
            uniquePriorities: [{ $group: { _id: "$priority" } }],
            uniqueCreatedBy: [
              { $group: { _id: "$createdByDetails.email", details: { $first: "$createdByDetails" } } }
            ],
            uniqueMarkedTo: [
              { $unwind: { path: "$markedToDetails", preserveNullAndEmptyArrays: true } },
              { $group: { _id: "$markedToDetails.email", details: { $first: "$markedToDetails" } } },
              { $match: { _id: { $ne: null } } }
            ]
          }
        }
      ]);
    };

    const promises = [];

    // Global Pipeline
    if (!scope || scope === 'inter-lab') {
      let match = { participants: userId };

      if (canSeeAllLocalFilters) {
        // Widen scope if they have lab view/manage permission
        match = {
          $or: [
            { participants: userId },
            { 'createdByDetails.labName': req.user.labName },
            { 'markedToDetails.labName': req.user.labName }
          ]
        };
      }

      // Explicitly for inter-lab scope, ensure it matches global refs logic

      applyVisibilityFilters(match); // Apply filters to user scope

      promises.push(aggregateFilters(GlobalReference, match));
    } else {
      promises.push(Promise.resolve([]));
    }

    // Local Pipeline
    if (!scope || scope === 'lab') {
      let match = { participants: userId };

      if (canSeeAllLocalFilters) {
        match = {
          $or: [
            { participants: userId },
            { labName: req.user.labName }
          ]
        };
      }


      applyVisibilityFilters(match); // Apply filters to user local scope

      promises.push(aggregateFilters(LocalReference, match));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [refFilters, localFilters] = await Promise.all(promises);


    if (refFilters && refFilters[0]) {
      const { divs, stats, prios } = extractValues(refFilters[0], createdByMap, markedToMap);
      divs.forEach(d => allDivs.add(d));
      stats.forEach(s => allStats.add(s));
      prios.forEach(p => allPrios.add(p));
    }

    if (localFilters && localFilters[0]) {
      const { divs, stats, prios } = extractValues(localFilters[0], createdByMap, markedToMap);

      divs.forEach(d => allDivs.add(d));
      stats.forEach(s => allStats.add(s));
      prios.forEach(p => allPrios.add(p));
    } else {

    }

    createdByUsers = Array.from(createdByMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    markedToUsers = Array.from(markedToMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    divisions = Array.from(allDivs).filter(Boolean);
    statuses = Array.from(allStats).filter(Boolean);
    priorities = Array.from(allPrios).filter(Boolean);
  }

  res.status(200).json(new ApiResponse(200, 'Filters fetched successfully', {
    createdByUsers,
    markedToUsers,
    divisions: divisions.sort(),
    statuses: statuses.sort(),
    priorities: priorities.sort()
  }));
});

/**
 * Fetches a specific reference by its ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with the reference data
 */
export const getReferenceById = asyncHandler(async (req, res, next) => {
  const referenceId = req.params.id;
  const userId = req.user._id;

  // Try to find in main GlobalReference collection first
  const reference = await GlobalReference.findById(referenceId).lean();

  const onModel = 'GlobalReference';

  // TODO: Add GlobalReference and VIPReference check here in future phases

  if (!reference) {

    return next(new ApiErrors('Reference not found', 404));
  }

  // For LocalReference, enforce lab isolation
  if (onModel === 'LocalReference' && reference.labName !== req.user.labName) {
    return next(new ApiErrors('Forbidden: This reference belongs to another lab and cannot be accessed from this context.', 403));
  }

  // Enforce access: allow if the user created the reference or it was marked to them, or if user is Admin
  try {
    const requesterId = userId.toString();
    const createdById = reference.createdBy && reference.createdBy._id ? reference.createdBy._id.toString() : reference.createdBy?.toString();
    const markedToId = reference.markedTo && reference.markedTo._id ? reference.markedTo._id.toString() : reference.markedTo?.toString();

    const isSystemAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    const hasGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
    const hasGlobalRefAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

    const canSeeAllGlobal = isSystemAdmin || hasGlobalAdmin || hasGlobalRefAdmin;

    // Robust markedTo check (handle array and objects)
    const isMarkedTo = Array.isArray(reference.markedTo)
      ? reference.markedTo.some(m => String(m._id || m) === requesterId)
      : String(reference.markedTo?._id || reference.markedTo) === requesterId;

    if (!canSeeAllGlobal && requesterId !== createdById && !isMarkedTo) {
      // Check if user is in movement history
      const inHistory = await GlobalMovement.exists({
        reference: referenceId,
        $or: [{ markedTo: userId }, { performedBy: userId }]
      });

      if (!inHistory) {
        return next(new ApiErrors('Forbidden: You do not have access to this reference', 403));
      }
    }
  } catch (err) {
    return next(new ApiErrors('Forbidden: You do not have access to this reference', 403));
  }

  // Fetch movements for this reference
  const movements = await GlobalMovement.find({ reference: referenceId })
    .sort({ movementDate: 1 }) // Sort by date ascending
    .lean();

  res.status(200).json(new ApiResponse(200, 'Reference fetched successfully', { reference, movements, type: onModel }));
});
/**
 
/**
 * Helper to validate remarks against word limit.
 * Fetches limit from SystemConfig (defaulting to 150).
 */
const validateRemarks = async (remarks) => {
  if (!remarks) return; // Allow empty remarks if validation handled elsewhere for requiredness

  // Basic word count splitting by whitespace
  const wordCount = remarks.trim().split(/\s+/).length;

  const config = await SystemConfig.findOne({ key: 'REMARKS_WORD_LIMIT' });
  const limit = config ? parseInt(config.value) : 150;

  if (wordCount > limit) {
    throw new ApiErrors(`Remarks exceed the maximum word limit of ${limit} words (Current: ${wordCount})`, 400);
  }
};

/**
 * Helper to get formatted user display name
 */
const getUserDisplayName = (user) => {
  if (!user) return "Unknown User";
  const name = user.fullName || "Unknown User";
  const designation = user.designation ? `, ${user.designation}` : "";
  const lab = user.labName ? ` (${user.labName})` : "";
  return `${name}${designation}${lab}`;
};

/**
 * Creates a new reference.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with the created reference
 */
export const createReference = asyncHandler(async (req, res, next) => {
  const { subject, remarks, status, priority, markedTo, eofficeNo, deliveryMode, deliveryDetails, sentAt } = req.body;

  const canCreateGlobal = await hasPermission(req.user.role, FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER);

  // SECURITY CHECK: Only roles with permission can create references in this (Global) module
  if (!canCreateGlobal) {
    return next(new ApiErrors('Forbidden: You do not have permission to create global references.', 403));
  }

  if (deliveryMode && deliveryDetails) {
    if (deliveryDetails.length > 60) {
      throw new ApiErrors("Delivery details cannot exceed 60 characters", 400);
    }
  }

  if (!remarks || remarks.trim() === '') {
    throw new ApiErrors("Remarks are required", 400);
  }

  await validateRemarks(remarks);

  const createdBy = req.user._id;

  const markedToUser = await User.findById(markedTo);
  if (!markedToUser) {
    throw new ApiErrors("Assignee not found", 404);
  }

  if (markedToUser._id.toString() === req.user._id.toString()) {
    throw new ApiErrors("You cannot mark a reference to yourself", 400);
  }

  const newReference = new GlobalReference({
    subject,
    remarks,
    status,
    priority,
    createdBy,
    markedTo: [markedTo],
    eofficeNo,
    deliveryMode,
    deliveryDetails,
    sentAt,
    refId: await generateUniqueRefId(GlobalReference, ReferenceType.GLOBAL),
    participants: [createdBy, markedTo],
    markedToDivision: markedToUser.division,
    createdByDetails: {
      fullName: req.user.fullName,
      email: req.user.email,
      labName: req.user.labName,
      designation: req.user.designation,
      division: req.user.division
    },
    markedToDetails: [{
      _id: markedToUser._id,
      fullName: markedToUser.fullName,
      email: markedToUser.email,
      labName: markedToUser.labName,
      designation: markedToUser.designation,
      division: markedToUser.division
    }]
  });
  await newReference.save();

  // Create initial movement
  const movement = new GlobalMovement({
    reference: newReference._id,
    markedTo: newReference.markedTo,
    performedBy: req.user._id,
    performedByDetails: {
      fullName: req.user.fullName,
      email: req.user.email,
      labName: req.user.labName,
      designation: req.user.designation,
      division: req.user.division
    },
    markedToDetails: [{
      _id: markedToUser._id,
      fullName: markedToUser.fullName,
      email: markedToUser.email,
      labName: markedToUser.labName,
      designation: markedToUser.designation,
      division: markedToUser.division
    }],
    statusOnMovement: newReference.status,
    remarks: remarks || 'Reference created.',
    movementDate: new Date()
  });
  await movement.save();

  await logActivity(req, "REFERENCE_CREATE", "Reference", newReference._id, {
    after: JSON.parse(JSON.stringify(newReference.toObject()))
  });

  // --- Send Email & Notification (Non-blocking) ---
  (async () => {
    try {
      if (markedToUser && markedToUser.email) {
        const creatorName = getUserDisplayName(req.user);
        const emailContent = getNewReferenceEmailTemplate(newReference, creatorName);
        await sendEmail({
          to: markedToUser.email,
          subject: `New Reference Assigned: ${newReference.subject} [${newReference.refId}]`,
          html: emailContent
        });

        // --- NOTIFICATION TRIGGER ---
        // Notify the user who is marked
        await createNotification(
          markedTo,
          'REFERENCE_ASSIGNED',
          'New Reference Assigned',
          `You have been assigned a new reference: ${subject}`,
          newReference._id,
          'GlobalReference'
        );
      }
    } catch (emailError) {
      console.error("Failed to send creation email:", emailError);
    }
  })();

  res.status(201).json(new ApiResponse(201, 'Reference created successfully', newReference));
});

/**
 * Updates an existing reference by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with the updated reference
 */
export const updateReference = asyncHandler(async (req, res, next) => {
  const referenceId = req.params.id;
  const { subject, remarks, status, priority, markedTo, eofficeNo, deliveryMode, deliveryDetails, sentAt } = req.body;

  let reference = await GlobalReference.findById(referenceId);
  let onModel = 'GlobalReference';

  if (!reference) {
    reference = await LocalReference.findById(referenceId);
    if (reference) {
      onModel = 'LocalReference';
    }
  }

  if (!reference) {
    return next(new ApiErrors('Reference not found', 404));
  }

  if (deliveryMode && deliveryDetails) {
    if (deliveryDetails.length > 60) {
      throw new ApiErrors("Delivery details cannot exceed 60 characters", 400);
    }
  }

  // For LocalReference, enforce lab isolation for access
  if (onModel === 'LocalReference' && reference.labName !== req.user.labName) {
    return next(new ApiErrors('Forbidden: This reference belongs to another lab.', 403));
  }

  // Enforce access: only creator, markedTo, or Admin can update
  // Access Check
  const requesterId = req.user._id.toString();
  const createdById = reference.createdBy && reference.createdBy._id ? reference.createdBy._id.toString() : reference.createdBy?.toString();
  const markedToId = reference.markedTo && reference.markedTo._id ? reference.markedTo._id.toString() : reference.markedTo?.toString();

  const isGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
  const isLocalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);

  const canEdit = isGlobalAdmin ||
    (isLocalAdmin && (reference.labName === req.user.labName || reference.createdByDetails?.labName === req.user.labName)); // Local admin can edit if it belongs to their lab

  if (!canEdit && requesterId !== createdById && requesterId !== markedToId) {
    return next(new ApiErrors('Forbidden: You do not have permission to update this reference', 403));
  }

  // Logic for Closing and Reopening
  let newMarkedTo = markedTo;

  if (status !== 'Closed' && newMarkedTo && newMarkedTo.toString() === requesterId) {
    throw new ApiErrors("You cannot mark a reference to yourself", 400);
  }

  // 1. CLOSING: Auto-assign to ALL Global Admins
  if (status && status === 'Closed' && reference.status !== 'Closed') {
    // Find roles with "Manage Global References" permission
    const authorizedRoles = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

    // Find ALL approved users who have these roles in their AVAILABLE roles
    let hqSuperadmins = await User.find({
      availableRoles: { $in: authorizedRoles },
      status: 'Approved'
    }).select('_id fullName email labName');

    // Fallback: If no users found with authorized roles, specifically catch Superadmin role in availableRoles
    if (hqSuperadmins.length === 0) {
      hqSuperadmins = await User.find({
        availableRoles: 'Superadmin',
        status: 'Approved'
      }).select('_id fullName email labName');
    }

    if (hqSuperadmins.length > 0) {
      newMarkedTo = hqSuperadmins.map(u => u._id);
    } else {
      console.warn("No Global Admins found to assign closed reference to. Keeping current markedTo.");
      newMarkedTo = Array.isArray(reference.markedTo) ? reference.markedTo : [reference.markedTo];
    }
  }
  // 2. REOPENING: Restriction Check
  else if (reference.status === 'Closed' && status && status !== 'Closed') {
    // User is reopening.
    if (req.user.role === 'Delegated Admin') {
      return next(new ApiErrors('Forbidden: Delegated Admins cannot reopen closed references.', 403));
    }

    if (req.user.role === 'Inter Lab sender') {
      // Check if Admin belongs to CSIR HQRS
      if (!req.user.labName || !/CSIR\s*HQRS/i.test(req.user.labName)) {
        return next(new ApiErrors('Forbidden: Only CSIR HQRS Admins or Superadmins can reopen references.', 403));
      }
    }
    // Superadmin is always allowed.
  }

  // If status is being changed out of 'Closed', clear any pending reopen request
  if (reference.status === 'Closed' && status && status !== 'Closed') {
    reference.reopenRequest = undefined;
  }

  const beforeState = reference.toObject();

  if (remarks) {
    await validateRemarks(remarks);
  }

  reference.subject = subject || reference.subject;
  reference.remarks = remarks || reference.remarks;
  reference.status = status || reference.status;
  reference.priority = priority || reference.priority;
  reference.eofficeNo = eofficeNo !== undefined ? eofficeNo : reference.eofficeNo;

  // New Fields
  if (deliveryMode) reference.deliveryMode = deliveryMode;
  if (deliveryDetails !== undefined) reference.deliveryDetails = deliveryDetails;
  if (sentAt) reference.sentAt = sentAt;

  if (newMarkedTo) {
    const nextUsers = await User.find({ _id: { $in: Array.isArray(newMarkedTo) ? newMarkedTo : [newMarkedTo] } });

    if (nextUsers.length > 0) {
      reference.markedTo = nextUsers.map(u => u._id);
      reference.markedToDivision = nextUsers[0].division; // Pick first for division mapping
      reference.markedToDetails = nextUsers.map(u => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        labName: u.labName,
        designation: u.designation,
        division: u.division
      }));

      // Add to participants (Both target and actor)
      const participantsToAdd = [...nextUsers.map(u => u._id), req.user._id];
      participantsToAdd.forEach(id => {
        if (!reference.participants.some(p => p.toString() === id.toString())) {
          reference.participants.push(id);
        }
      });
    }
  }

  await reference.save();

  await logActivity(req, "REFERENCE_UPDATE", "GlobalReference", reference._id, {
    before: JSON.parse(JSON.stringify(beforeState)),
    after: JSON.parse(JSON.stringify(reference.toObject()))
  });


  // Create a new movement record
  const MovementModel = onModel === 'LocalReference' ? LocalMovement : GlobalMovement;
  const movement = new MovementModel({
    reference: reference._id,
    // onModel: onModel,
    markedTo: reference.markedTo,
    performedBy: req.user._id,
    performedByDetails: {
      fullName: req.user.fullName,
      email: req.user.email,
      labName: req.user.labName,
      designation: req.user.designation,
      division: req.user.division
    },
    markedToDetails: reference.markedToDetails,
    statusOnMovement: reference.status,
    remarks: reference.remarks,
    movementDate: new Date()
  });
  await movement.save();

  // --- Send Email & Notification (Non-blocking) ---
  (async () => {
    try {
      // 1. Notify Marked To Users (if not self)
      const markedToIds = Array.isArray(reference.markedTo) ? reference.markedTo : [reference.markedTo];

      // Optimize: Fetch all users in one query
      const markedToUsers = await User.find({
        _id: { $in: markedToIds },
        email: { $exists: true, $ne: "" }
      });

      const emailPromises = [];
      const notificationPromises = [];
      const actorName = getUserDisplayName(req.user);

      for (const user of markedToUsers) {
        if (user._id.toString() !== req.user._id.toString()) {
          // Email
          const emailContent = getUpdateReferenceEmailTemplate(reference, actorName, 'Update');
          emailPromises.push(
            sendEmail({
              to: user.email,
              subject: `Reference Updated: ${reference.subject} [${reference.refId}]`,
              html: emailContent
            }).catch(err => console.error(`Failed to send email to ${user.email}:`, err))
          );
        }
      }

      // 2. Notify Creator (if not self and not in markedTo list)
      const creatorUser = await User.findById(reference.createdBy);
      const isMarkedToCreator = markedToIds.some(id => id.toString() === reference.createdBy.toString());

      if (creatorUser && creatorUser.email && creatorUser._id.toString() !== req.user._id.toString() && !isMarkedToCreator) {
        const emailContent = getUpdateReferenceEmailTemplate(reference, actorName, 'Update');
        emailPromises.push(
          sendEmail({
            to: creatorUser.email,
            subject: `Reference Update (My Ref): ${reference.subject} [${reference.refId}]`,
            html: emailContent
          }).catch(err => console.error(`Failed to send email to creator ${creatorUser.email}:`, err))
        );
      }

      // --- NOTIFICATION TRIGGER ---
      // We can iterate markedToIds again or use the fetched users
      for (const id of markedToIds) {
        if (id.toString() !== req.user._id.toString()) {
          const refType = 'Reference';
          notificationPromises.push(
            createNotification(
              id,
              'REFERENCE_ASSIGNED',
              `${refType} Assigned/Updated`,
              `A ${refType.toLowerCase()} has been assigned or updated to you: ${reference.subject}`,
              reference._id,
              onModel
            ).catch(err => console.error(`Failed to create notification for ${id}:`, err))
          );
        }
      }

      // Execute all in parallel (background)
      await Promise.all([...emailPromises, ...notificationPromises]);

    } catch (bgError) {
      console.error("Background task error in updateReference:", bgError);
    }
  })();

  res.status(200).json(new ApiResponse(200, 'Reference updated successfully', reference));
});

/**
 * Deletes a reference by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response confirming deletion
 */
export const deleteReference = asyncHandler(async (req, res, next) => {
  const reference = await GlobalReference.findById(referenceId);

  if (!reference) {
    return next(new ApiErrors('Reference not found', 404));
  }

  // Enforce access: only creator, markedTo, or Admin can delete
  try {
    const requesterId = req.user._id.toString();
    const createdById = reference.createdBy && reference.createdBy._id ? reference.createdBy._id.toString() : reference.createdBy?.toString();
    const markedToId = reference.markedTo && reference.markedTo._id ? reference.markedTo._id.toString() : reference.markedTo?.toString();

    const isAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

    if (!isAdmin && requesterId !== createdById && requesterId !== markedToId) {
      return next(new ApiErrors('Forbidden: You do not have permission to delete this reference', 403));
    }
  } catch (err) {
    return next(new ApiErrors('Forbidden: You do not have permission to delete this reference', 403));
  }

  await GlobalReference.findByIdAndDelete(referenceId);
  await logActivity(req, "REFERENCE_DELETE", "GlobalReference", referenceId, {
    before: JSON.parse(JSON.stringify(reference.toObject()))
  });

  return res.status(200).json(new ApiResponse(200, "Reference deleted successfully"));
});

/**
 * Performs bulk updates on multiple references.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response confirming bulk update
 */
export const bulkUpdateReferences = asyncHandler(async (req, res, next) => {
  const { ids, action, force } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new ApiErrors('Invalid or empty IDs array', 400));
  }

  if (ids.length === 0) {
    return next(new ApiErrors('Invalid or empty IDs array', 400));
  }

  if (req.user.role !== 'Inter Lab sender' && req.user.role !== 'Superadmin') {
    return next(new ApiErrors('Forbidden: Only Admins can perform bulk actions', 403));
  }

  let updateFields = {};
  switch (action) {
    case 'hide':
      updateFields = { isHidden: true };
      break;
    case 'unhide':
      updateFields = { isHidden: false };
      break;
    case 'archive':
      // Validation: References must be 'Closed' OR (Old enough AND Force=true)

      // 1. Check for references that are ACTIVE and RECENT (Cannot archive ever)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365);

      const activeRecentCount = await GlobalReference.countDocuments({
        _id: { $in: ids },
        status: { $ne: 'Closed' },
        updatedAt: { $gt: cutoffDate }
      });

      if (activeRecentCount > 0) {
        return next(new ApiErrors("Cannot archive active references updated within the last 1 year.", 400));
      }

      // 2. Check for references that are ACTIVE but OLD (Allowed with warning/confirmation)
      const activeOldCount = await GlobalReference.countDocuments({
        _id: { $in: ids },
        status: { $ne: 'Closed' },
        updatedAt: { $lte: cutoffDate }
      });

      if (activeOldCount > 0 && !force) {
        return next(new ApiErrors("CONFIRM_ARCHIVE: Selected items include active references older than 1 year. Confirm to archive?", 409));
      }

      updateFields = { isArchived: true };
      break;
    case 'unarchive':
      updateFields = { isArchived: false };
      break;
    case 'assign':
      const { assignTo, remarks } = req.body;
      if (!assignTo) {
        return next(new ApiErrors('Assignee is required for this action', 400));
      }

      const assignee = await User.findById(assignTo);
      if (!assignee) {
        return next(new ApiErrors('Assignee not found', 404));
      }

      const finalRemarks = remarks || "Forwarded for consideration/perusal/necessary action please";

      // We need to iterate to handle history and notifications individually 
      const refsToUpdate = await GlobalReference.find({ _id: { $in: ids } });

      for (const ref of refsToUpdate) {
        // Ownership Check
        const isMarkedToUser = Array.isArray(ref.markedTo)
          ? ref.markedTo.some(id => id.toString() === req.user._id.toString())
          : ref.markedTo && ref.markedTo.toString() === req.user._id.toString();

        const isAdmin = req.user.role === 'Superadmin' || req.user.role === 'Inter Lab sender'; // Or check specific permissions

        if (!isMarkedToUser && !isAdmin) {
          throw new ApiErrors(`Forbidden: You can only reassign references currently marked to you. Ref: ${ref.refId}`, 403);
        }

        // Skip self-assignment
        if (assignee._id.toString() === req.user._id.toString()) continue;

        // Update Reference
        ref.markedTo = [assignee._id];
        ref.markedToDivision = assignee.division;
        ref.markedToDetails = [{
          _id: assignee._id,
          fullName: assignee.fullName,
          email: assignee.email,
          labName: assignee.labName,
          designation: assignee.designation,
          division: assignee.division
        }];

        // Add to participants (Target and Actor)
        const participantsToAdd = [assignee._id, req.user._id];
        participantsToAdd.forEach(id => {
          if (!ref.participants.some(p => p.toString() === id.toString())) {
            ref.participants.push(id);
          }
        });

        // Update latest remarks
        ref.remarks = finalRemarks;

        await ref.save();

        // Create Movement
        await GlobalMovement.create({
          reference: ref._id,
          markedTo: [assignee._id],
          performedBy: req.user._id,
          performedByDetails: {
            fullName: req.user.fullName,
            email: req.user.email,
            labName: req.user.labName,
            designation: req.user.designation,
            division: req.user.division
          },
          markedToDetails: [{
            _id: assignee._id,
            fullName: assignee.fullName,
            email: assignee.email,
            labName: assignee.labName,
            designation: assignee.designation,
            division: assignee.division
          }],
          statusOnMovement: ref.status,
          remarks: finalRemarks,
          movementDate: new Date()
        });

        // Notify Assignee
        if (assignee.email) {
          try {
            // Notification (Async)
            await createNotification(
              assignee._id,
              'REFERENCE_ASSIGNED',
              'Reference Assigned',
              `You have been assigned a reference via bulk update: ${ref.subject}`,
              ref._id,
              'GlobalReference'
            );
          } catch (e) {
            console.error(`Failed to notify for ref ${ref.refId}:`, e);
          }
        }
      }

      res.status(200).json(new ApiResponse(200, `Bulk assignment successful`));
      return;

    default:
      return next(new ApiErrors('Invalid action specified', 400));
  }

  const result = await GlobalReference.updateMany(
    { _id: { $in: ids } },
    { $set: updateFields }
  );

  await logActivity(req, `REFERENCE_BULK_${action.toUpperCase()}`, "GlobalReference", null, {
    ids,
    action,
    updateFields
  });

  res.status(200).json(new ApiResponse(200, `Bulk ${action} successful`, { modifiedCount: result.modifiedCount }));
});


/**
 * Issues a reminder for a reference.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const issueReminder = asyncHandler(async (req, res, next) => {
  const { referenceId, userIds, remarks, priority } = req.body;

  if (!referenceId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiErrors("Reference ID and at least one recipient are required", 400);
  }

  const reference = await GlobalReference.findById(referenceId);

  if (!reference) {
    throw new ApiErrors("Reference not found", 404);
  }

  // Fetch details for email
  const users = await User.find({ _id: { $in: userIds } });

  const validEmails = users.filter(u => u.email).map(u => u.email);

  if (validEmails.length > 0) {
    try {
      const senderName = getUserDisplayName(req.user);
      const emailContent = getReminderEmailTemplate(reference, senderName, remarks || "No remarks provided.", priority || "Medium");
      // Send individually or BCC? 'to' accepts comma separated.
      await sendEmail({
        to: validEmails.join(','),
        subject: `Reminder: ${reference.subject} [${reference.refId}]`,
        html: emailContent
      });

      await logActivity(req, "REFERENCE_REMINDER", "Reference", referenceId, {
        recipients: validEmails,
        priority
      });

      // --- NOTIFICATION TRIGGER ---
      for (const recipientId of userIds) {
        await createNotification(
          recipientId,
          'REMINDER',
          `Action Reminder: ${priority}`,
          `Reminder for reference "${reference.subject}": ${remarks || 'Please update status.'}`,
          referenceId,
          'GlobalReference'
        );
      }

    } catch (error) {
      console.error("Error sending reminder emails", error);
      throw new ApiErrors("Failed to send reminder emails", 500);
    }
  }

  res.status(200).json(new ApiResponse(200, "Reminder sent successfully"));
});

/**
 * Request to reopen a closed reference.
 * Sends email to Superadmins and CSIR HQRS Admins.
 */
export const requestReopen = asyncHandler(async (req, res, next) => {
  const referenceId = req.params.id;
  const { remarks } = req.body;
  const userId = req.user._id;

  let reference = await GlobalReference.findById(referenceId).populate('createdBy markedTo');
  let onModel = 'GlobalReference';

  if (!reference) {
    reference = await LocalReference.findById(referenceId).populate('createdBy markedTo');
    if (reference) {
      onModel = 'LocalReference';
    }
  }

  if (!reference) {
    return next(new ApiErrors('Reference not found', 404));
  }

  if (reference.status !== 'Closed') {
    return next(new ApiErrors('Reference is not closed', 400));
  }

  // Verify user involvement
  const createdById = reference.createdBy && (reference.createdBy._id || reference.createdBy).toString();
  const isCreator = createdById === userId.toString();

  const markedToIds = Array.isArray(reference.markedTo)
    ? reference.markedTo.map(m => (m._id || m).toString())
    : [reference.markedTo && (reference.markedTo._id || reference.markedTo).toString()].filter(Boolean);

  const isMarkedTo = markedToIds.includes(userId.toString());

  if (!isCreator && !isMarkedTo) {
    const MoveModel = onModel === 'LocalReference' ? LocalMovement : GlobalMovement;
    const inHistory = await MoveModel.exists({
      reference: referenceId,
      $or: [{ markedTo: userId }, { performedBy: userId }]
    });
    if (!inHistory && req.user.role !== 'Inter Lab sender' && req.user.role !== 'Superadmin') {
      return next(new ApiErrors('Forbidden: You are not part of this reference workflow', 403));
    }
  }

  // Find Recipients: Superadmins + CSIR HQRS Admins
  const adminRecipients = await User.find({
    $or: [
      { role: 'Superadmin', status: 'Approved' },
      { role: 'Inter Lab sender', labName: { $regex: /CSIR\s*HQRS/i }, status: 'Approved' }
    ]
  }).select('_id email');

  // Collect all involved User IDs
  const involvedUserIds = new Set();

  // Add Admins
  adminRecipients.forEach(u => involvedUserIds.add(u._id.toString()));

  // Add Creator and Current Holder
  if (reference.createdBy) involvedUserIds.add((reference.createdBy._id || reference.createdBy).toString());
  if (Array.isArray(reference.markedTo)) {
    reference.markedTo.forEach(m => involvedUserIds.add((m._id || m).toString()));
  } else if (reference.markedTo) {
    involvedUserIds.add((reference.markedTo._id || reference.markedTo).toString());
  }

  // Add users from Movement History
  const MoveModel = onModel === 'LocalReference' ? LocalMovement : GlobalMovement;
  const movements = await MoveModel.find({ reference: referenceId }).select('markedTo performedBy');
  movements.forEach(m => {
    if (Array.isArray(m.markedTo)) {
      m.markedTo.forEach(id => involvedUserIds.add(id.toString()));
    } else if (m.markedTo) {
      involvedUserIds.add(m.markedTo.toString());
    }

    if (m.performedBy) involvedUserIds.add(m.performedBy.toString());
  });

  // Fetch emails for all collected IDs
  const allRecipients = await User.find({
    _id: { $in: Array.from(involvedUserIds) },
    email: { $exists: true, $ne: '' } // Ensure email exists
  }).select('email');

  const validEmails = allRecipients.filter(u => u.email).map(u => u.email);

  // Generate Request ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const requestId = `REQ-${dateStr}-${randomSuffix}`;

  // Persist the request in the database
  reference.reopenRequest = {
    requestId,
    requestedBy: userId,
    reason: remarks,
    requestedAt: new Date()
  };
  await reference.save();

  // Send emails and notifications (non-blocking thanks to centralized mail utility)
  if (validEmails.length > 0) {
    const requesterName = getUserDisplayName(req.user);
    const baseUrl = getBaseUrl ? getBaseUrl() : (process.env.CLIENT_URL || 'http://localhost:3000');

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Reopening Request</h2>
        <p><strong>${requesterName}</strong> has requested to reopen the following closed reference.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Ref ID:</strong> ${reference.refId}</p>
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${reference.subject}</p>
        </div>

        <div style="margin-top: 15px;">
          <strong>Reason/Remarks:</strong><br/>
          <p>${remarks || 'No remarks provided.'}</p>
        </div>

        <p style="margin-top: 25px;">
           <a href="${baseUrl}/references/${reference._id}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Reference</a>
        </p>
      </div>
    `;

    const uniqueEmails = [...new Set(validEmails)];

    // sendEmail is now non-blocking by default - no need to await
    sendEmail({
      to: uniqueEmails.join(','),
      subject: `Reopening Request: ${reference.subject} [${reference.refId}]`,
      html: emailContent
    });

    // logActivity is also non-blocking
    logActivity(req, "REFERENCE_REOPEN_REQUEST", "Reference", referenceId, {
      requestedBy: userId,
      remarks
    });

    // Create notifications in parallel (non-blocking)
    const notificationPromises = [];
    for (const recipientId of involvedUserIds) {
      if (recipientId.toString() !== userId.toString()) {
        notificationPromises.push(
          createNotification(
            recipientId,
            'REOPEN_REQUEST',
            'Reopening Request',
            `${requesterName} requested to reopen: ${reference.subject}`,
            reference._id,
            onModel
          )
        );
      }
    }

    // Fire and forget - send all notifications in parallel
    Promise.all(notificationPromises).catch(err =>
      console.error('Error creating notifications:', err)
    );
  }

  res.status(200).json(new ApiResponse(200, "Reopening request sent successfully"));
});

/**
 * Handle Reopen Request Action (Approve or Reject).
 */
export const handleReopenAction = asyncHandler(async (req, res, next) => {
  const referenceId = req.params.id;
  const { action, reason } = req.body; // reason is for rejection normally, original reason is in reopenRequest

  let reference = await GlobalReference.findById(referenceId);
  let onModel = 'GlobalReference';

  if (!reference) {
    reference = await LocalReference.findById(referenceId);
    if (reference) {
      onModel = 'LocalReference';
    }
  }

  if (!reference) {
    return next(new ApiErrors('Reference not found', 404));
  }

  if (!reference.reopenRequest || !reference.reopenRequest.requestedBy) {
    return next(new ApiErrors('No pending reopen request found for this reference', 400));
  }

  // Security Check: Determine who can approve/reject based on permissions only
  const isGlobalAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
  const isLocalLabAdmin = await checkUserPermission(req.user, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);

  // For Local References: Allow Global Admins or Local Lab Admins (same lab)
  // For Global References: Allow Global Admins only
  let hasPermission = false;

  if (onModel === 'LocalReference') {
    // Local reference: Allow if user is Global Admin or Local Lab Admin for the same lab
    const isSameLab = reference.labName === req.user.labName;
    hasPermission = isGlobalAdmin || (isLocalLabAdmin && isSameLab);
  } else {
    // Global reference: Only Global Admins
    hasPermission = isGlobalAdmin;
  }

  if (!hasPermission) {
    return next(new ApiErrors('Forbidden: You do not have permission to handle reopening requests.', 403));
  }

  const requesterId = reference.reopenRequest.requestedBy;
  const originalReason = reference.reopenRequest.reason;
  const requestId = reference.reopenRequest.requestId;

  if (action === 'approve') {
    reference.status = 'Reopened';
    reference.remarks = `Reopened as per request no. ${requestId || 'N/A'}, Reason: ${originalReason || 'No reason specified'}`;
    reference.markedTo = [requesterId];
  } else if (action === 'reject') {
    // Keep status as 'Closed'
    reference.remarks = `Reopening remarks rejected- ${reason || 'No specific reason provided.'}`;
    reference.markedTo = [requesterId];
  } else {
    return next(new ApiErrors('Invalid action. Must be approve or reject.', 400));
  }

  // Clear request
  reference.reopenRequest = undefined;

  // Update markedToDetails
  const nextUsers = await User.find({ _id: { $in: [requesterId] } });
  if (nextUsers.length > 0) {
    reference.markedToDetails = nextUsers.map(u => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      labName: u.labName,
      designation: u.designation,
      division: u.division
    }));
    reference.markedToDivision = nextUsers[0].division;
  }

  await reference.save();

  // Create movement record
  const MovementModel = onModel === 'LocalReference' ? LocalMovement : GlobalMovement;
  const movement = new MovementModel({
    reference: reference._id,
    markedTo: reference.markedTo,
    performedBy: req.user._id,
    performedByDetails: {
      fullName: req.user.fullName,
      email: req.user.email,
      labName: req.user.labName,
      designation: req.user.designation,
      division: req.user.division
    },
    markedToDetails: reference.markedToDetails,
    statusOnMovement: reference.status,
    remarks: reference.remarks,
    movementDate: new Date()
  });
  await movement.save();

  await logActivity(req, `REFERENCE_REOPEN_${action.toUpperCase()}`, onModel, reference._id, {
    action,
    reason,
    status: reference.status
  });

  // Notify the user who requested it
  await createNotification(
    requesterId,
    action === 'approve' ? 'REOPEN_APPROVED' : 'REOPEN_REJECTED',
    `Reopening Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
    `Your request to reopen reference "${reference.subject}" has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
    reference._id,
    onModel
  );

  res.status(200).json(new ApiResponse(200, `Reopening request ${action}ed successfully`, reference));
});

