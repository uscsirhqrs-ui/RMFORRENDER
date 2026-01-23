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
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/').get(getNotifications);
router.route('/:id/read').patch(markAsRead);
router.route('/read-all').patch(markAllAsRead);

export default router;
