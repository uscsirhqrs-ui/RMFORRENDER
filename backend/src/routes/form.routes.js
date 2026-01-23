import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
    createTemplate,
    updateTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    cloneTemplate
} from '../controllers/formTemplate.controller.js';
import {
    shareTemplateCopy,
    getSharedWithMe,
    getSharedByMe,
    toggleArchive
} from '../controllers/formDistribution.controller.js';
import {
    submitData,
    getFormSubmissions,
    updateData
} from '../controllers/formResponse.controller.js';

const router = Router();

// Secured routes
router.use(verifyJWT);

// Template Management
router.route('/templates').post(createTemplate).get(getTemplates);
router.route('/templates/:id').get(getTemplateById).patch(updateTemplate).delete(deleteTemplate);
router.route('/templates/:id/clone').post(cloneTemplate);

// Distribution & Sharing
router.route('/templates/:id/share-copy').post(shareTemplateCopy);
router.route('/shared/with-me').get(getSharedWithMe);
router.route('/shared/by-me').get(getSharedByMe);
router.route('/templates/:id/archive').patch(toggleArchive);

// Responses & Submissions
router.route('/templates/:id/submissions').get(getFormSubmissions);
router.route('/submit').post(submitData).patch(updateData);

export default router;
