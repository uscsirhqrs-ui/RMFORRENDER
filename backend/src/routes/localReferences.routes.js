/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllLocalReferences,
    createLocalReference,
    getLocalReferenceById,
    getLocalDashboardStats,
    bulkUpdateLocalReferences,
    deleteLocalReference,
    updateLocalReference,
    issueLocalReminder,
    requestLocalReopen,
    getLocalReferenceFilters
} from "../controllers/localReferences.controller.js";

const router = Router();

// Secure all routes
router.use(verifyJWT);

router.route("/")
    .get(getAllLocalReferences)
    .post(createLocalReference);

router.route("/stats")
    .get(getLocalDashboardStats);

router.route("/getFilters")
    .get(getLocalReferenceFilters);

router.route("/bulk-update")
    .post(bulkUpdateLocalReferences);

router.route("/issue-reminder")
    .post(issueLocalReminder);

router.route("/:id")
    .get(getLocalReferenceById)
    .put(updateLocalReference)
    .delete(deleteLocalReference);

router.route("/:id/request-reopen")
    .post(requestLocalReopen);

export default router;
