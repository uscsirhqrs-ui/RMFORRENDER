import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getMyTasks } from "../controllers/backgroundTask.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/my-tasks").get(getMyTasks);

export default router;
