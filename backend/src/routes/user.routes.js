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
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    verifyForgotPassToken,
    forgotPassword,
    resetPassword,
    activateAccount,
    getAllUsers,
    getCurrentUser,
    updateUserProfile,
    updateUserStatus,
    createAdminUser,
    bulkUpdateUserStatus,
    bulkDeleteUsers,
    getUserProfileById,
    updateUserAvatar,
    switchRole,
    updateUserAvailableRoles,
    migrateLabNames,
    manualActivateUser,
    bulkManualActivateUsers,
    resendActivationEmail,
    updateUserProfileById
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT, checkPermission } from "../middlewares/auth.middleware.js";
import { FeatureCodes } from "../constants.js";
import {
    validateUserRegistration,
    validateUserLogin,
    validatePasswordChange,
    validatePasswordReset,
    validateForgotPassword,
    validateProfileUpdate,
    validateUserId,
    validateBulkUserIds
} from '../middlewares/validation.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    validateUserRegistration,
    registerUser
);

router.route("/login").post(validateUserLogin, loginUser);
router.route("/forgot-password").post(validateForgotPassword, forgotPassword);
router.route("/verify-token").post(verifyForgotPassToken);
router.route("/reset-password").post(validatePasswordReset, resetPassword);
router.route("/activate-account").post(activateAccount);
router.route("/resend-activation").post(validateForgotPassword, resendActivationEmail);

// secured routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/switch-role').post(verifyJWT, switchRole);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, validatePasswordChange, changePassword);
router.route('/getAllUsers').get(verifyJWT, getAllUsers);
router.route('/status/bulk').patch(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateBulkUserIds, bulkUpdateUserStatus);
router.route('/status/:userId').patch(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateUserId, updateUserStatus);
router.route('/delete/bulk').post(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateBulkUserIds, bulkDeleteUsers);
router.route('/profile').get(verifyJWT, getCurrentUser);
router.route('/profile/:userId')
    .get(verifyJWT, validateUserId, getUserProfileById)
    .patch(verifyJWT, validateUserId, validateProfileUpdate, updateUserProfileById);
router.route('/profile').patch(verifyJWT, validateProfileUpdate, updateUserProfile);
router.route('/avatar').patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route('/admin-creation').post(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateUserRegistration, createAdminUser);
router.route('/activate-manual/bulk').post(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateBulkUserIds, bulkManualActivateUsers);
router.route('/activate-manual/:userId').post(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]), validateUserId, manualActivateUser);
router.route('/update-roles/:userId').patch(verifyJWT, checkPermission([FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION]), validateUserId, updateUserAvailableRoles);
router.route('/maintenance/migrate-labs').post(verifyJWT, checkPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION), migrateLabNames);

export default router;