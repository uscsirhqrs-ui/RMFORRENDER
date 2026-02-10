/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getArchivableCount, performBatchArchiving } from '../controllers/archive.controller.js';
import ApiErrors from '../utils/ApiErrors.js';
import { SUPERADMIN_ROLE_NAME } from '../constants.js';

const router = Router();

// All archive routes require authentication and Superadmin role
router.use(verifyJWT);
router.use((req, res, next) => {
    if (req.user.role !== SUPERADMIN_ROLE_NAME) {
        return next(new ApiErrors(403, "Forbidden: Only Superadmin can perform archiving operations"));
    }
    next();
});

router.route('/count').get(getArchivableCount);
router.route('/run').post(performBatchArchiving);

export default router;
