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
import { verifyJWT, checkPermission } from '../middlewares/auth.middleware.js';
import { FeatureCodes } from '../constants.js';
import {
    createTemplate,
    updateTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
    cloneTemplate
} from '../controllers/form.controller.js';
import {
    shareTemplateCopy,
    getSharedWithMe,
    getSharedByMe,
    toggleArchive,
    sendReminders
} from '../controllers/formDistribution.controller.js';
import {
    submitData,
    getFormSubmissions,
    updateData
} from '../controllers/formResponse.controller.js';
import {
    delegateForm,
    markBack,
    approveForm,
    submitToDistributor,
    saveDraft,
    getChainDetails,
    markFinal,
    getChainBySubmissionId
} from '../controllers/formWorkflow.controller.js';
import { dynamicUpload } from '../middlewares/multer.middleware.js';

const router = Router();

// Secured routes
router.use(verifyJWT);

// Template Management
router.route('/templates').post(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), createTemplate).get(getTemplates);
router.route('/templates/:id')
    .get(getTemplateById)
    .put(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), updateTemplate)
    .patch(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), updateTemplate)
    .delete(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), deleteTemplate);
router.route('/templates/:id/clone').post(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), cloneTemplate);

// Distribution & Sharing
router.route('/share/copy').post(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), shareTemplateCopy);
router.route('/shared-with-me').get(getSharedWithMe);
router.route('/shared-by-me').get(getSharedByMe);
router.route('/archive/:id').patch(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), toggleArchive);
router.route('/reminders/:id').post(checkPermission([FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB, FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB]), sendReminders);

// Response Collection
router.route('/submit').post(dynamicUpload, submitData).put(dynamicUpload, updateData);
router.route('/responses/:id').get(getFormSubmissions);
router.route('/responses/:submissionId').put(dynamicUpload, updateData);

// Workflow Management
router.route('/workflow/delegate').post(dynamicUpload, delegateForm);
router.route('/workflow/mark-back').post(dynamicUpload, markBack);
router.route('/workflow/mark-final').post(dynamicUpload, markFinal);
router.route('/workflow/approve').post(dynamicUpload, approveForm);
router.route('/workflow/submit-distributor').post(dynamicUpload, submitToDistributor);
router.route('/workflow/draft').post(dynamicUpload, saveDraft);
router.route('/workflow/chain/:assignmentId').get(getChainDetails);
router.route('/workflow/chain/submission/:submissionId').get(getChainBySubmissionId);

export default router;
