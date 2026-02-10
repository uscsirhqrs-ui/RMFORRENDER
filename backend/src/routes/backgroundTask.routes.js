/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getMyTasks } from "../controllers/backgroundTask.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/my-tasks").get(getMyTasks);

export default router;
