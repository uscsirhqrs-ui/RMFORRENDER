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
    createReference,
    getAllReferences,
    getReferenceById,
    updateReference,
    deleteReference,
    bulkUpdateReferences,
    issueReminder,
    requestReopen,
    handleReopenAction,
    getDashboardStats,
    getReferenceFilters
} from '../controllers/globalReferences.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

//secured routes
// router.use(verifyJWT);

//secured routes
router.route('/createReference').post(verifyJWT, createReference);

router.route('/getDashboardStats').get(verifyJWT, getDashboardStats);
router.route('/getFilters').get(verifyJWT, getReferenceFilters);
router.route('/getAllReferences').get(verifyJWT, getAllReferences);

router.route('/getReferenceById/:id').get(verifyJWT, getReferenceById);
router.route('/updateReference/:id').put(verifyJWT, updateReference);
router.route('/deleteReference/:id').delete(verifyJWT, deleteReference);
router.route('/bulkUpdate').patch(verifyJWT, bulkUpdateReferences);
router.route('/issueReminder').post(verifyJWT, issueReminder);
router.route('/:id/request-reopen').post(verifyJWT, requestReopen);
router.route('/:id/handle-reopen-request').post(verifyJWT, handleReopenAction);

export default router;