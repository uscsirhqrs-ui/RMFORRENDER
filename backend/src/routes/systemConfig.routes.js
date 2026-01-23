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
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getSystemConfig, updateSystemConfig } from '../controllers/systemConfig.controller.js';
import ApiErrors from '../utils/ApiErrors.js';
import { SUPERADMIN_ROLE_NAME } from '../constants.js';

const router = Router();

router.use(verifyJWT);

// Get config is allowed for all authenticated users
router.route('/').get(getSystemConfig);

// Update config is restricted to Superadmin only
router.route('/').put((req, res, next) => {
    if (req.user.role !== SUPERADMIN_ROLE_NAME) {
        return next(new ApiErrors(403, "Forbidden: Only Superadmin can update system settings"));
    }
    next();
}, updateSystemConfig);

export default router;
