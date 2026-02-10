/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
    createTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    shareTemplate,
    updateTemplate
} from '../controllers/formTemplate.controller.js';

const router = Router();

// Secured routes
router.use(verifyJWT);

// Template Management
router.route('/').post(createTemplate).get(getTemplates);
router.route('/:id').get(getTemplateById).delete(deleteTemplate).patch(updateTemplate);
router.route('/:id/share-copy').post(shareTemplate);

export default router;

