import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
    createBlueprint,
    getBlueprints,
    getBlueprintById,
    deleteBlueprint
} from '../controllers/formBlueprint.controller.js';

const router = Router();

// Secured routes
router.use(verifyJWT);

// Blueprint Management
router.route('/').post(createBlueprint).get(getBlueprints);
router.route('/:id').get(getBlueprintById).delete(deleteBlueprint);

export default router;
