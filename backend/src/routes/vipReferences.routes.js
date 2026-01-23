/**
 * @fileoverview API Routes - Defines placeholder routes for VIP References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllVIPReferences,
    createVIPReference
} from "../controllers/vipReferences.controller.js";

const router = Router();

// Secure all routes
router.use(verifyJWT);

router.route("/")
    .get(getAllVIPReferences)
    .post(createVIPReference);

export default router;
