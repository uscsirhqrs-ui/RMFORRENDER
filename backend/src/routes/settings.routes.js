/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { Router } from 'express';
import {
    getAllowedDomains,
    updateAllowedDomains,
    getLabs,
    updateLabs,
    getDesignations,
    updateDesignations,
    getDivisions,
    updateDivisions,
    getFeaturePermissions,
    updateFeaturePermissions
} from '../controllers/settings.controller.js';
import { verifyJWT, checkPermission } from '../middlewares/auth.middleware.js';
import { FeatureCodes } from '../constants.js';

const router = Router();

// Public route to fetch allowed domains (needed for frontend validation during registration/login)
router.route('/allowed-domains').get(getAllowedDomains);

// Protected routes for Allowed Domains
router.route('/allowed-domains').put(
    verifyJWT,
    checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION),
    updateAllowedDomains
);

// Labs routes
router.route('/labs').get(verifyJWT, getLabs);
router.route('/labs').put(
    verifyJWT,
    checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION),
    updateLabs
);

// Designations routes
router.route('/designations').get(verifyJWT, getDesignations);
router.route('/designations').put(
    verifyJWT,
    checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION),
    updateDesignations
);

// Divisions routes
router.route('/divisions').get(verifyJWT, getDivisions);
router.route('/divisions').put(
    verifyJWT,
    checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION),
    updateDivisions
);

// Feature Permissions routes
router.route('/feature-permissions').get(verifyJWT, getFeaturePermissions);
router.route('/feature-permissions').put(
    verifyJWT,
    checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION),
    updateFeaturePermissions
);

export default router;
