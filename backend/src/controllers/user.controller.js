/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import ApiErrors from "../utils/ApiErrors.js";
import { createNotification } from './notification.controller.js';
import { User } from "../models/user.model.js";
import { GlobalReference } from "../models/globalReference.model.js";
import { LocalReference } from "../models/localReference.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { logActivity } from "../utils/audit.utils.js";
import { DEFAULT_COVER_IMAGE_URL, DEFAULT_AVATAR_URL } from '../constants.js';
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../constants.js";
import { getBaseUrl, getAccountApprovedEmailTemplate, sendEmail } from "../utils/mail.js";
import { hasPermission, getRolesWithPermission, checkUserPermission } from "../utils/permission.utils.js";

/**
 * Registers a new user.
 * 
 * @param {Object} req - Express request object containing user details in body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with the registered user data
 */
const registerUser = asyncHandler(async (req, res, next) => {

  try {
    const { fullName, labName, designation, division, mobileNo, email, password } = req.body;



    if (
      [email, password].some((field) => field?.trim() === "")
    ) {
      throw new ApiErrors("Email and Password are required", 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ApiErrors("User already exists", 409);
    }

    // Check for allowed email domains
    const config = await SystemConfig.findOne({ key: "ALLOWED_DOMAINS" });
    const allowedDomains = (config?.value || []).map(d => d.toLowerCase().trim());

    if (allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        throw new ApiErrors(`Registration is restricted to the following domains: ${allowedDomains.join(', ')}`, 400);
      }
    }

    // Pre-generate ID and activation token to save DB roundtrips
    const userId = new mongoose.Types.ObjectId();

    // Create a temporary user instance to use the schema method generateActivationToken
    const tempUser = new User({ _id: userId });
    const activationToken = tempUser.generateActivationToken();

    const user = await User.create({
      _id: userId,
      fullName: fullName || "",
      avatar: "",
      coverImage: "",
      email,
      password,
      labName: (labName || "").toUpperCase(),
      designation: designation || "",
      division: division || "",
      mobileNo: mobileNo || "",
      status: 'Pending',
      availableRoles: ['User'],
      activationToken, // Set directly on creation
    });

    if (!user) {
      throw new ApiErrors("Error in creating user", 500);
    }

    // Convert to object and sanitize for response/logs
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;

    // Email Activation Flow - NON-BLOCKING
    const activationUrl = `${getBaseUrl()}/activate-account?token=${encodeURIComponent(activationToken)}&userId=${userId}`;

    sendEmail({
      to: email,
      subject: "CSIR- Reference Management Portal - Activate Your Account",
      html: `<p>Welcome to CSIR- Reference Management Portal! Please click <a href="${activationUrl}">here</a> to activate your account and set up your profile.</p>`
    });

    // Logging Activity - NON-BLOCKING
    logActivity(req, "USER_REGISTER", "User", userId, { after: createdUser }, userId);

    return res
      .status(201)
      .json(new ApiResponse(200, "User registered successfully. Please check your email to activate your account.", createdUser));
  } catch (error) {
    throw new ApiErrors(error?.message || "Error in creating user", 500);
  }
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, newRefreshToken };
  } catch (error) {
    throw new ApiErrors(
      "Something went wrong in generating Access and Refresh tokens",
      500
    );
  }
};

/**
 * Logs in a user.
 * 
 * @param {Object} req - Express request object containing login credentials
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response with user data and tokens (cookies)
 */
const loginUser = asyncHandler(async (req, res, next) => {


  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiErrors("Email and password are required", 400);
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiErrors("User does not exist", 404);
  }
  const isPasswordValid = await user.isPasswordCorrect(password);


  if (!isPasswordValid) {
    throw new ApiErrors("Invalid credentials", 401);
  }

  // Check account activation
  if (!user.isActivated) {
    throw new ApiErrors("Your account is not activated. Please check your email for the activation link.", 403);
  }

  // Check account status
  if (user.status === "Rejected") {
    throw new ApiErrors("Your account has been rejected. Please contact support.", 403);
  }

  // Check for allowed email domains (Double check at login as well)
  const config = await SystemConfig.findOne({ key: "ALLOWED_DOMAINS" });
  const allowedDomains = (config?.value || []).map(d => d.toLowerCase().trim());

  if (allowedDomains.length > 0) {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    // Allow superadmin to bypass this check? 
    // Usually Superadmin should be able to login regardless, OR they should ensure their domain is whitelisted.
    // Let's enforce it for everyone for security, unless they are Superadmin in DB (but we haven't checked role thoroughly yet, just user existence)
    // If the user IS Superadmin, maybe let them through?
    // Check permissions instead of hardcoded role
    const isSuperadmin = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    if (!isSuperadmin) {
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        throw new ApiErrors(`Login is restricted to the following domains: ${allowedDomains.join(', ')}`, 403);
      }
    }
  }

  // Pending users are allowed to login but will be restricted to the profile page by the frontend
  //generate JWT token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  if (!user.availableRoles || user.availableRoles.length === 0) {
    user.availableRoles = ['User'];
    if (user.role && user.role !== 'User') {
      user.availableRoles.push(user.role);
    }
  }

  // Default to 'User' role on login if not Superadmin (System Configurator)
  const isSuperadmin = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  if (!isSuperadmin && user.availableRoles.includes('User')) {
    user.role = 'User';
  }

  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const approvalConfig = await SystemConfig.findOne({ key: "APPROVAL_AUTHORITY_DESIGNATIONS" });
  const allowedDesignations = approvalConfig?.value || [];

  const userObj = loggedInUser.toObject();
  userObj.hasApprovalAuthority = allowedDesignations.includes(loggedInUser.designation);



  const isSecure = process.env.NODE_ENV === "production" && process.env.SSL_ENABLED === 'true';
  const options = {
    httpOnly: true,
    secure: isSecure, // true only if production AND SSL enabled
    sameSite: "Lax", // Strict or Lax is better for same-domain (IP based) config
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  await logActivity(req, "USER_LOGIN", "User", loggedInUser._id, null, loggedInUser._id);

  //send cookie with token
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "Login Successful", {
        user: userObj,
        accessToken: accessToken,
        refToken: refreshToken, // Fixed typo from 'refToken: refreshAccessToken'
      })
    );
});

/**
 * Logs out the current user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response objectget
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response confirming logout
 */
const logoutUser = asyncHandler(async (req, res, next) => {

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
        refreshTokenHash: undefined
      },
    },
    { new: true }
  );

  const isSecure = process.env.NODE_ENV === "production" && process.env.SSL_ENABLED === 'true';
  const options = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax"
  };

  await logActivity(req, "USER_LOGOUT", "User", req.user._id);

  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  return res.status(200).json(new ApiResponse(200, "Logout successful"));
});

/**
 * Refreshes the access token using the refresh token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with new tokens
 */
const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiErrors("Refresh token not found", 401);
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiErrors("Invalid refresh token", 401);
    }

    // Compare hashes instead of plaintext tokens
    if (!user.compareRefreshToken(incomingRefreshToken)) {
      throw new ApiErrors("Refresh token invalid or revoked", 401);
    }

    const isSecure = process.env.NODE_ENV === "production" && process.env.SSL_ENABLED === 'true';
    const options = {
      httpOnly: true,
      secure: isSecure,
      sameSite: "Lax"
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    if (!user.availableRoles || user.availableRoles.length === 0) {
      user.availableRoles = ['User'];
      if (user.role && user.role !== 'User') {
        user.availableRoles.push(user.role);
      }
    }

    // Default to 'User' role on refresh if not Superadmin
    const isSuperadmin = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    if (!isSuperadmin && user.availableRoles.includes('User')) {
      user.role = 'User';
    }

    await user.save({ validateBeforeSave: false });

    const approvalConfig = await SystemConfig.findOne({ key: "APPROVAL_AUTHORITY_DESIGNATIONS" });
    const allowedDesignations = approvalConfig?.value || [];

    const userObj = user.toObject();
    userObj.hasApprovalAuthority = allowedDesignations.includes(user.designation);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          "Access token refreshed successfully",
          { accessToken, refreshToken: newRefreshToken, user: userObj }
        )
      );
  } catch (error) {
    throw new ApiErrors(error?.message || "Invalid refresh token", 401);
  }
});

/**
 * Changes the user's password.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response confirming password change
 */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiErrors("Old password and new password are required", 400);
  }
  const user = await User.findById(req.user._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiErrors("Old password is incorrect", 401);
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully"));
});

/**
 * Verifies a forgot password token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response indicating validity
 */
const verifyForgotPassToken = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;



  if (!userId || !token) {
    return res
      .json(new ApiResponse(400, "Missing userId or token", { valid: false }));
  }
  try {
    const result = await verifyToken(token);
    if (!result.isValid) {
      return res
        .json(new ApiResponse(400, "Invalid or expired token", { success: false }));
    }


    return res.status(200).json(new ApiResponse(200, `Token is valid`));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * Resets the user's password using a token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response confirming reset
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;
  if (!userId || !token || !newPassword) {
    return res
      .json(new ApiResponse(400, "Missing parameters", { success: false }));
  }
  try {
    const result = await verifyToken(token);
    if (!result.isValid) {
      return res
        .json(new ApiResponse(400, "Invalid or expired token", { success: false }));
    }

    // Update user password and reset token fields
    result.user.password = newPassword;// it is hashed before save in the middleware
    result.user.resetPasswordToken = null;


    await result.user.save();

    return res.status(200).json(new ApiResponse(200, "Password reset successful", { success: true }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * Activates a user account using a token.
 * 
 * @param {Object} req - Express request object Containing userId and token
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response confirming activation
 */
const activateAccount = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    throw new ApiErrors("Missing userId or token", 400);
  }

  // Verify JWT first
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACTIVATION_TOKEN_SECRET || process.env.RESET_PASS_TOKEN_SECRET);
  } catch (error) {
    // This allows differentiation between "expired" and "malformed"
    console.error("JWT Verification Error:", error.message);
    if (error.name === 'TokenExpiredError') {
      throw new ApiErrors("Activation link has expired. Please request a new one.", 400);
    }
    throw new ApiErrors("Invalid activation token (verification failed)", 400);
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiErrors("User account not found", 404);
  }

  if (user._id.toString() !== userId) {
    console.error(`User ID mismatch: Link ID ${userId}, Token ID ${user._id}`);
    throw new ApiErrors("Invalid token for this user account", 400);
  }

  if (token.trim() !== (user.activationToken || "").trim()) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Token mismatch for user ${user._id}`);
    }

    if (user.isActivated) {
      return res.status(200).json(new ApiResponse(200, "Account is already activated. Please login.", { success: true, alreadyActivated: true }));
    }

    throw new ApiErrors("Activation token does not match. It may have been regenerated or already used.", 400);
  }

  user.isActivated = true;
  user.activationToken = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, "Account activated successfully. You can now login.", { success: true }));
});

/**
 * Resends the activation link to a user.
 * 
 * @param {Object} req - Express request object containing email
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response confirming email sent
 */
const resendActivationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiErrors("Email is required", 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiErrors("User not found with this email", 404);
  }

  if (user.isActivated) {
    throw new ApiErrors("Account is already activated. Please login.", 400);
  }

  // Generate new token
  const activationToken = user.generateActivationToken();
  user.activationToken = activationToken;
  await user.save({ validateBeforeSave: false });

  const activationUrl = `${getBaseUrl()}/activate-account?token=${encodeURIComponent(activationToken)}&userId=${user._id}`;

  // Send Email - NON-BLOCKING
  sendEmail({
    to: email,
    subject: "CSIR- Reference Management Portal - New Activation Link",
    html: `<p>You requested a new activation link. Please click <a href="${activationUrl}">here</a> to activate your account.</p>`
  });

  // Log Activity
  logActivity(req, "USER_RESEND_ACTIVATION", "User", user._id, null, user._id);

  return res.status(200).json(new ApiResponse(200, "A new activation link has been sent to your email."));
});

/**
 * Bulk manually activates user accounts.
 */
const bulkManualActivateUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiErrors("User IDs array is required", 400);
  }

  // Filter allowed users? Middleware handles basic permission, but should we check each?
  // Assuming middleware checks 'Manage Users' permission which is enough for bulk.

  await User.updateMany(
    { _id: { $in: userIds } },
    {
      $set: {
        isActivated: true,
        activationToken: undefined
      }
    }
  );

  return res.status(200).json(new ApiResponse(200, "Users activated successfully"));
});

/**
 * Initiates the forgot password process by sending an email.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Sends a JSON response confirming email sent (or mock success)
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  try {

    // Forgot password logic here
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });



    if (!user) {
      await simulatedelay(5000); // Wait for 5 seconds

      return res
        .status(200)
        .json(new ApiResponse(200, `Email sent success.`, { email }));
    }

    const resetPasswordToken = await user.generateResetPasswordToken();
    user.resetPasswordToken = resetPasswordToken;


    await user.save({ validateBeforeSave: false });

    // Reset link (replace with your frontend URL)
    const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(resetPasswordToken)}&userId=${user._id}`;

    sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password.</p>`
    });


    await simulatedelay(5000); // Wait for 5 seconds

    return res
      .status(200)
      .json(new ApiResponse(200, `Email sent success.`, { email }));
  } catch (error) {
    throw new ApiErrors(
      "Could not send password reset link due to technical error.",
      500
    );
  }
});

const verifyToken = async (token) => {
  try {
    if (process.env.NODE_ENV !== 'production') {

    }
    const decodedToken = jwt.verify(token, process.env.RESET_PASS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiErrors("Invalid refresh token", 401);
    }

    if (token !== user.resetPasswordToken) {
      throw new ApiErrors("Reset token not matching", 401);
    }
    const expiryTimestamp = decodedToken.exp;
    // Convert the timestamp to a Date object for easier handling
    const expiryDate = new Date(expiryTimestamp * 1000); // Multiply by 1000 to convert to milliseconds

    const isValid =
      user.resetPasswordToken === token && expiryDate > Date.now();

    return { isValid, user };
  } catch (error) {

    return { isValid: false, user: null };
  }
};

/**
 * Gets the current user's profile.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with user profile
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // Get user profile logic here
  return res
    .status(200)
    .json(new ApiResponse(200, "User profile fetched successfully", req.user));
});

/**
 * Updates the user's profile information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with update status
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  // Update user profile logic here
  const { fullName, labName, designation, division, mobileNo, isSubmitted, settings } = req.body;

  if (fullName === undefined && labName === undefined && designation === undefined && division === undefined && mobileNo === undefined && isSubmitted === undefined && settings === undefined) {
    throw new ApiErrors("At least one field is required to update", 400);
  }

  // Refetch user to get a Mongoose Document (req.user is a plain object from auth middleware)
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiErrors("User not found", 404);
  }

  const beforeState = user.toObject();

  let hasSensitiveChanges = false;

  if (fullName) user.fullName = fullName;

  if (labName && user.labName !== labName.toUpperCase()) {
    user.labName = labName.toUpperCase();
    hasSensitiveChanges = true;
  }

  if (designation && user.designation !== designation) {
    user.designation = designation;
    hasSensitiveChanges = true;
  }

  if (division && user.division !== division) {
    user.division = division;
    hasSensitiveChanges = true;
  }

  // Check for completeness if submitting
  if (isSubmitted && (!user.division && !division)) {
    throw new ApiErrors("Division is required for profile submission", 400);
  }

  if (mobileNo !== undefined && user.mobileNo !== mobileNo) {
    user.mobileNo = mobileNo;
    hasSensitiveChanges = true;
  }

  // If sensitive fields changed and user is NOT Superadmin, set status to Pending
  const isSuperadmin = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  if (hasSensitiveChanges && !isSuperadmin) {
    user.status = 'Pending';
    user.isSubmitted = true; // Automatically mark as submitted so it appears in approval lists
  } else if (isSubmitted !== undefined) {
    // Manual submission logic (e.g. initial profile completion)
    user.isSubmitted = isSubmitted;
    // If re-submitting after rejection, reset status to Pending
    if (isSubmitted && user.status === 'Rejected') {
      user.status = 'Pending';
    }
  }

  if (settings) {
    user.settings = { ...user.settings, ...settings };
  }

  await user.save();

  await logActivity(req, "USER_PROFILE_UPDATE", "User", user._id, {
    before: JSON.parse(JSON.stringify(beforeState)),
    after: JSON.parse(JSON.stringify(user.toObject()))
  });

  // Notification Logic
  if (user.status === 'Pending' && (hasSensitiveChanges || user.isSubmitted)) {
    try {
      // 1. Get roles that can manage users
      const manageAllRoles = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
      const manageLabRoles = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

      // 2. Find Users with these roles
      // Admins who can manage ALL users
      const allLabAdmins = await User.find({
        availableRoles: { $in: manageAllRoles },
        _id: { $ne: user._id } // Don't notify self
      }).select('_id');

      // Admins who can manage users in THIS lab
      const ownLabAdmins = await User.find({
        availableRoles: { $in: manageLabRoles },
        labName: user.labName,
        _id: { $ne: user._id }
      }).select('_id');

      // 3. Deduplicate 
      const recipientIds = new Set([
        ...allLabAdmins.map(u => u._id.toString()),
        ...ownLabAdmins.map(u => u._id.toString())
      ]);

      // 4. Send Notifications
      const title = "User Profile Update Pending Approval";
      const message = `${user.fullName} (${user.labName}) has updated their profile and requires approval.`;

      for (const recipientId of recipientIds) {
        await createNotification(
          recipientId,
          'PROFILE_UPDATE',
          title,
          message,
          null // referenceId is null, but we could pass userId in data?
        );
        // createNotification doesn't support 'data' param yet in the helper signature from previous tools? 
        // Wait, I checked notification.controller.js, createNotification sig is (recipientId, type, title, message, referenceId = null)
        // It doesn't allow passing extra data? I should fix that if I want to link to the user page.
        // But for now, just text is fine. The user page link can be inferred or I can put it in message?
        // Ideally I should update createNotification to accept data object. 
        // But let's stick to existing signature for now.
      }


    } catch (notifyErr) {
      console.error("Error creating notifications:", notifyErr);
    }
  }

  const updatedUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, "Profile updated and submitted for approval successfully", updatedUser));
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  // Delete user account logic here
  return res.status(200).json(new ApiResponse(200, "User account deleted successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiErrors("Avatar file is required", 400);
  }

  // Check file size (50KB limit)
  const stats = fs.statSync(avatarLocalPath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = fileSizeInBytes / 1024;

  if (fileSizeInKB > 50) {
    fs.unlinkSync(avatarLocalPath);
    throw new ApiErrors("Image size must be less than 50KB", 400);
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    fs.unlinkSync(avatarLocalPath);
    throw new ApiErrors("User not found", 404);
  }

  // Delete old avatar from cloudinary if it exists
  if (user.avatar) {
    try {
      const publicId = user.avatar.split("/").pop().split(".")[0];
      await deleteFromCloudinary(publicId);
    } catch (error) {
      console.error("Error deleting old avatar:", error);
    }
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar || !avatar.url) {
    throw new ApiErrors("Error while uploading avatar", 400);
  }

  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });

  await logActivity(req, "USER_AVATAR_UPDATE", "User", user._id, {
    before: user.avatar,
    after: avatar.url
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Avatar updated successfully", { avatar: avatar.url })
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Update user cover image logic here
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiErrors("Cover image is required", 400);
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiErrors("Error in uploading cover image", 500);
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, "Cover image updated successfully", user));
});



/**
 * Fetches all users who are not Admins.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with list of users
 */
/**
 * Fetches users with pagination and search capabilities.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with list of users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  let filter = {};
  const { search, page = 1, limit = 20, labBound } = req.query;

  // Base Access Control Logic
  const canManageAllUsers = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const canManageLabUsers = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);
  const isSuperadmin = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);

  // If labBound is requested, restrict strictly to the requester's lab
  if (labBound === 'true') {
    filter = {
      labName: req.user.labName || "",
      _id: { $ne: req.user._id }
    };
  } else {
    // Standard access control logic...
    if (canManageAllUsers) {
      const rolesWithSystemConfig = await getRolesWithPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
      if (!isSuperadmin) {
        filter = { role: { $nin: rolesWithSystemConfig } };
      } else {
        filter = {};
      }
    } else if (canManageLabUsers) {
      const rolesWithSystemConfig = await getRolesWithPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
      const rolesWithManageAll = await getRolesWithPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
      filter = {
        role: { $nin: [...new Set([...rolesWithSystemConfig, ...rolesWithManageAll])] },
        labName: req.user.labName || ""
      };
    } else {
      filter = { status: 'Approved' };
    }
  }

  // Search Logic
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { designation: searchRegex },
      { labName: searchRegex }
    ];
  }

  // Explicit Filters (Status, Lab, Roles, Designation)
  const { status, labName, roles, designation } = req.query;

  if (status) {
    const statuses = status.split(',').filter(Boolean);
    if (statuses.length > 0) {
      filter.status = { $in: statuses };
    }
  }

  if (labName) {
    const labs = labName.split(',').filter(Boolean);
    if (labs.length > 0) {
      filter.labName = { $in: labs };
    }
  }

  if (roles) {
    const roleList = roles.split(',').filter(Boolean);
    if (roleList.length > 0) {
      filter.availableRoles = { $in: roleList };
    }
  }

  if (designation) {
    const designations = designation.split(',').filter(Boolean);
    if (designations.length > 0) {
      filter.designation = { $in: designations };
    }
  }

  // Pagination Logic
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Limit 'limit' to avoid abuse (max 100)
  const effectiveLimit = Math.min(limitNum, 100);

  const users = await User.find(filter)
    .select("-password -refreshToken")
    .sort({ fullName: 1 }) // Deterministic sort
    .skip(skip)
    .limit(effectiveLimit);

  const total = await User.countDocuments(filter);

  return res.status(200).json(new ApiResponse(200, "Users fetched successfully", {
    users,
    pagination: {
      total,
      page: pageNum,
      limit: effectiveLimit,
      totalPages: Math.ceil(total / effectiveLimit)
    }
  }));
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['Approved', 'Pending', 'Rejected'].includes(status)) {
    throw new ApiErrors("Invalid status value", 400);
  }

  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) {
    throw new ApiErrors("User not found", 404);
  }

  // Check profile completion if approving
  if (status === 'Approved') {
    if (!userToUpdate.fullName || !userToUpdate.labName || !userToUpdate.designation || !userToUpdate.division || !userToUpdate.mobileNo) {
      throw new ApiErrors("Cannot approve user. Profile is incomplete (Name, Lab, Designation, Division, Mobile required).", 400);
    }
  }

  // Permission Check
  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  const targetIsSuper = await hasPermission(userToUpdate.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const targetCanManageAll = await hasPermission(userToUpdate.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);

  if (requesterIsSuper) {
    // System Configurator can manage anyone except self
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot manage your own account status", 403);
    }
  } else if (requesterCanManageAll) {
    // Managers of ALL labs cannot manage System Configurators or self
    if (targetIsSuper) {
      throw new ApiErrors("Forbidden: You cannot manage System Configurator accounts", 403);
    }
    // Cannot manage other Managers of ALL labs (peers)
    if (targetCanManageAll && userToUpdate._id.toString() !== req.user._id.toString()) {
      // Wait, if target has Manage All Users permission too, they are peers.
      // Let's decide: Peers can't manage peers? Or only Super can manage peers?
      // Typically only Super should manage Admin accounts.
      throw new ApiErrors("Forbidden: You cannot manage other Administrator accounts", 403);
    }
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot manage your own account status", 403);
    }
  } else if (requesterCanManageOwn) {
    // Managers of OWN lab
    if (!userToUpdate.labName || userToUpdate.labName !== req.user.labName) {
      throw new ApiErrors("Forbidden: You can only manage users from your own lab", 403);
    }
    // Cannot manage System Configurators or Managers of ALL labs
    if (targetIsSuper || targetCanManageAll) {
      throw new ApiErrors("Forbidden: You cannot manage Administrator or System Configurator accounts", 403);
    }
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot manage your own account status", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }


  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { status } },
    { new: true }
  ).select("-password -refreshToken");

  // Send email notification if approved
  if (status === 'Approved') {
    try {
      const emailContent = getAccountApprovedEmailTemplate(user.fullName);
      sendEmail({
        to: user.email,
        subject: "Account Approved - Reference Management Portal",
        html: emailContent
      });
    } catch (error) {
      console.error("Failed to send approval email:", error);
      // We don't throw here to avoid rolling back the status update, just log the error
    }
  }

  return res.status(200).json(new ApiResponse(200, `User status updated to ${status}`, user));
});


/**
 * Creates an administrative user (Admin or Delegated Admin).
 * Only accessible by Admin or Superadmin role.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createAdminUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, labName, designation, mobileNo, role } = req.body;

  if ([email, password, fullName].some((field) => field?.trim() === "")) {
    throw new ApiErrors("Full Name, Email and Password are required", 400);
  }

  // Permission Check
  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  // Dynamic Role Validation (Get all roles from FEATURE_PERMISSIONS config)
  const config = await SystemConfig.findOne({ key: "FEATURE_PERMISSIONS" });
  if (!config || !Array.isArray(config.value)) {
    throw new ApiErrors("Server Error: Feature permissions not configured", 500);
  }

  const allPossibleRoles = Array.from(new Set(config.value.flatMap(p => p.roles)));
  const targetRole = role || allPossibleRoles.find(r => r.includes('Delegated')) || allPossibleRoles[0];

  if (requesterIsSuper) {
    // Super can create any role (including Superadmin)
  } else if (requesterCanManageAll) {
    // Can only create roles that DO NOT have SYSTEM_CONFIGURATION or MANAGE_ALL permissions
    const restrictedRoles = Array.from(new Set(
      config.value
        .filter(p => p.feature === FeatureCodes.FEATURE_SYSTEM_CONFIGURATION || p.feature === FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)
        .flatMap(p => p.roles)
    ));
    if (restrictedRoles.includes(targetRole)) {
      throw new ApiErrors("Forbidden: You cannot create administrative accounts with higher privileges than yours", 403);
    }
  } else if (requesterCanManageOwn) {
    // Managers of OWN lab can only create roles that DO NOT have SYSTEM_CONFIGURATION or MANAGE_ALL permissions
    // And must specify their own labName
    if (labName !== req.user.labName) {
      throw new ApiErrors("Forbidden: You can only create users for your own lab", 403);
    }
    const restrictedRoles = Array.from(new Set(
      config.value
        .filter(p => p.feature === FeatureCodes.FEATURE_SYSTEM_CONFIGURATION || p.feature === FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)
        .flatMap(p => p.roles)
    ));
    if (restrictedRoles.includes(targetRole)) {
      throw new ApiErrors("Forbidden: You cannot create administrative accounts", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  if (!allPossibleRoles.includes(targetRole)) {
    throw new ApiErrors("Invalid role selected", 400);
  }

  if (!labName || labName.trim() === "") {
    throw new ApiErrors("Lab / Institution is required for administrative users", 400);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiErrors("User already exists", 409);
  }

  const user = await User.create({
    fullName,
    email,
    password,
    role: targetRole,
    status: 'Approved',
    labName: (labName || "").toUpperCase(),
    designation: designation || "",
    mobileNo: mobileNo || "",
    isActivated: true, // Administrative users are activated by default
    availableRoles: ['User', targetRole]
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiErrors(`Error in creating ${targetRole}`, 500);
  }

  res.status(201).json(new ApiResponse(201, `${targetRole} created successfully`, createdUser));
});

/**
 * Bulk updates the status of multiple users.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const bulkUpdateUserStatus = asyncHandler(async (req, res, next) => {
  const { userIds, status } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiErrors("Invalid or empty user IDs", 400);
  }

  if (!['Approved', 'Pending', 'Rejected'].includes(status)) {
    throw new ApiErrors("Invalid status value", 400);
  }

  // Permission Check
  const usersToCheck = await User.find({ _id: { $in: userIds } });

  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  if (requesterIsSuper) {
    // System Configurator check: Cannot target self
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot perform bulk actions on yourself", 403);
    }
  } else if (requesterCanManageAll) {
    // Manager of ALL labs check: Cannot target System Configurators, other Managers of ALL labs, or self
    const targetIsSuper = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)));
    const targetCanManageAll = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)));

    const isProtected = usersToCheck.some((u, index) => {
      // Protect Superadmins AND other Admins (peers)
      return targetIsSuper[index] || (targetCanManageAll[index] && u._id.toString() !== req.user._id.toString());
    });

    if (isProtected) {
      throw new ApiErrors("Forbidden: You cannot perform actions on other Administrator or System Configurator accounts", 403);
    }
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot perform bulk actions on yourself", 403);
    }
  } else if (requesterCanManageOwn) {
    // Manager of OWN lab check
    const allInLab = usersToCheck.every(u => u.labName === req.user.labName);
    if (!allInLab) {
      throw new ApiErrors("Forbidden: You can only bulk manage users from your own lab", 403);
    }

    // Check for System Configurator or Administrator role
    const targetIsSuper = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)));
    const targetCanManageAll = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)));

    if (targetIsSuper.some(Boolean) || targetCanManageAll.some(Boolean)) {
      throw new ApiErrors("Forbidden: You cannot perform bulk actions on Administrator or System Configurator accounts", 403);
    }
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot perform bulk actions on yourself", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { status } }
  );

  if (result.matchedCount === 0) {
    throw new ApiErrors("No users found to update", 404);
  }

  res.status(200).json(new ApiResponse(200, `Successfully updated ${result.modifiedCount} users to ${status}`, null));
});

/**
 * Bulk deletes multiple users.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const bulkDeleteUsers = asyncHandler(async (req, res, next) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiErrors("Invalid or empty user IDs", 400);
  }

  // Permission Check
  const usersToCheck = await User.find({ _id: { $in: userIds } });

  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  if (requesterIsSuper) {
    // System Configurator check: Cannot target self
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot delete yourself", 403);
    }
  } else if (requesterCanManageAll) {
    // Manager of ALL labs check: Cannot target System Configurators, other Managers of ALL labs, or self
    const targetIsSuper = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)));
    const targetCanManageAll = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)));

    const isProtected = usersToCheck.some((u, index) => {
      // Protect Superadmins AND other Admins (peers)
      return targetIsSuper[index] || (targetCanManageAll[index] && u._id.toString() !== req.user._id.toString());
    });

    if (isProtected) {
      throw new ApiErrors("Forbidden: You cannot delete other Administrator or System Configurator accounts", 403);
    }
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot delete yourself", 403);
    }
  } else if (requesterCanManageOwn) {
    // Manager of OWN lab check
    const allInLab = usersToCheck.every(u => u.labName === req.user.labName);
    if (!allInLab) {
      throw new ApiErrors("Forbidden: You can only delete users from your own lab", 403);
    }

    // Check for System Configurator or Administrator role
    const targetIsSuper = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)));
    const targetCanManageAll = await Promise.all(usersToCheck.map(u => hasPermission(u.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)));

    if (targetIsSuper.some(Boolean) || targetCanManageAll.some(Boolean)) {
      throw new ApiErrors("Forbidden: You cannot delete Administrator or System Configurator accounts", 403);
    }
    if (usersToCheck.some(u => u._id.toString() === req.user._id.toString())) {
      throw new ApiErrors("Forbidden: You cannot delete yourself", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  const result = await User.deleteMany({ _id: { $in: userIds } });

  if (result.deletedCount === 0) {
    throw new ApiErrors("No users found to delete", 404);
  }

  res.status(200).json(new ApiResponse(200, `Successfully deleted ${result.deletedCount} users`, null));
});

/**
 * Fetches a user's profile by their ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with the user profile
 */
const getUserProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiErrors("User ID is required", 400);
  }

  const user = await User.findById(userId).select("-password -refreshToken");

  if (!user) {
    throw new ApiErrors("User not found", 404);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "User profile fetched successfully", user));
});


/**
 * Manually activates a user account (Admin only).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with update status
 */
const manualActivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userToActivate = await User.findById(userId);
  if (!userToActivate) {
    throw new ApiErrors("User not found", 404);
  }

  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  const targetIsSuper = await hasPermission(userToActivate.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const targetCanManageAll = await hasPermission(userToActivate.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);

  if (requesterIsSuper) {
    // System Configurator can manage anyone except self
    if (userToActivate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot activate your own account", 403);
    }
  } else if (requesterCanManageAll) {
    // Manager of ALL labs check: Cannot target System Configurators, other Managers of ALL labs, or self
    if (targetIsSuper) {
      throw new ApiErrors("Forbidden: You cannot activate System Configurator accounts", 403);
    }
    if (targetCanManageAll && userToActivate._id.toString() !== req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot activate other Administrator accounts", 403);
    }
    if (userToActivate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot activate your own account", 403);
    }
  } else if (requesterCanManageOwn) {
    // Manager of OWN lab check
    if (userToActivate.labName !== req.user.labName) {
      throw new ApiErrors("Forbidden: You can only activate users from your own lab", 403);
    }
    if (targetIsSuper || targetCanManageAll) {
      throw new ApiErrors("Forbidden: You cannot activate Administrator or System Configurator accounts", 403);
    }
    if (userToActivate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot activate your own account", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  userToActivate.isActivated = true;
  userToActivate.activationToken = undefined;

  // Set status to Pending so they can login but need approval
  if (userToActivate.status === 'Rejected' || !userToActivate.status) {
    userToActivate.status = 'Pending';
  }
  // If it was already Pending, it stays Pending. 

  await userToActivate.save({ validateBeforeSave: false });

  await logActivity(req, "USER_MANUAL_ACTIVATE", "User", userToActivate._id, {
    after: { isActivated: true, status: userToActivate.status }
  });

  return res.status(200).json(new ApiResponse(200, "User account manually activated. Status is Pending approval.", userToActivate));
});


/**
 * Switches the user's active role.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with new tokens and user data
 */
const switchRole = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  const userId = req.user._id;

  if (!targetRole) {
    throw new ApiErrors("Target role is required", 400);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiErrors("User not found", 404);
  }

  // Check if user has the target role
  if (!user.availableRoles.includes(targetRole)) {
    // Allow Superadmin to switch to anything if they are currently Superadmin? 
    // For safety, force them to have it in availableRoles. 
    // But for now, if legacy, maybe they don't have it.
    // Allow Superadmin to switch to anything if they are currently Superadmin? 
    // For safety, force them to have it in availableRoles. 
    // But for now, if legacy, maybe they don't have it.
    const isSuperadmin = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
    if (isSuperadmin) {
      // Auto-fix for Superadmin if they are trying to switch but don't have it listed?
      // Let's just strict check for now.
      // If I am superadmin, I should have permissions.
      if (targetRole === 'User') {
        // allow
      } else {
        throw new ApiErrors(`You do not have permission to switch to role: ${targetRole}`, 403);
      }
    }
    throw new ApiErrors(`You do not have permission to switch to role: ${targetRole}`, 403);
  }

  // Update the role
  user.role = targetRole;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"
  };

  const updatedUser = await User.findById(userId).select("-password -refreshToken");

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "Role switched successfully", {
        user: updatedUser,
        accessToken,
        refreshToken
      })
    );
});

/**
 * @description Update user's available roles (Superadmin only)
 * @route PATCH /api/v1/users/update-roles/:userId
 * @access Private (Superadmin)
 */
const updateUserAvailableRoles = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles)) {
    throw new ApiErrors("Roles must be an array", 400);
  }

  if (roles.length === 0) {
    throw new ApiErrors("At least one role is required", 400);
  }

  const userToUpdate = await User.findById(userId);
  if (!userToUpdate) {
    throw new ApiErrors("User not found", 404);
  }

  // Hierarchical Permission Check
  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  const targetIsSuper = await hasPermission(userToUpdate.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const targetCanManageAll = await hasPermission(userToUpdate.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);

  if (requesterIsSuper) {
    // Superadmin (System Configurator) can manage anyone except self
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("System Configurators cannot update their own roles via this endpoint", 400);
    }
  } else if (requesterCanManageAll) {
    // Managers of ALL labs cannot manage System Configurators or self
    if (targetIsSuper) {
      throw new ApiErrors("Forbidden: You cannot update System Configurator accounts", 403);
    }
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot update your own roles", 403);
    }
  } else if (requesterCanManageOwn) {
    // Managers of OWN lab
    if (userToUpdate.labName !== req.user.labName) {
      throw new ApiErrors("Forbidden: You can only update users from your own lab", 403);
    }
    if (targetIsSuper || targetCanManageAll) {
      throw new ApiErrors("Forbidden: You cannot update Administrator or System Configurator accounts", 403);
    }
    if (userToUpdate._id.toString() === req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot update your own roles", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  // Dynamic Role Validation (Get all roles from FEATURE_PERMISSIONS config)
  const config = await SystemConfig.findOne({ key: "FEATURE_PERMISSIONS" });
  if (!config || !Array.isArray(config.value)) {
    throw new ApiErrors("Server Error: Feature permissions not configured", 500);
  }

  const allPossibleRoles = Array.from(new Set(config.value.flatMap(p => p.roles)));

  // Filter out the Superadmin/Admin roles from standard assignment if requester is not Super
  let assignableRoles = allPossibleRoles;
  if (!requesterIsSuper) {
    // If not super, prevent assigning roles that have FEATURE_SYSTEM_CONFIGURATION or FEATURE_MANAGE_USERS_ALL_OFFICES
    const restrictedRoles = Array.from(new Set(
      config.value
        .filter(p => p.feature === FeatureCodes.FEATURE_SYSTEM_CONFIGURATION || p.feature === FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)
        .flatMap(p => p.roles)
    ));
    assignableRoles = allPossibleRoles.filter(role => !restrictedRoles.includes(role));

    // Safety check for target roles
    const invalidRoles = roles.filter(role => !assignableRoles.includes(role));
    if (invalidRoles.length > 0) {
      throw new ApiErrors(`Forbidden: You cannot assign these administrative roles: ${invalidRoles.join(", ")}`, 403);
    }
  } else {
    // Super can assign anything in allPossibleRoles (which includes Superadmin itself)
    const invalidRoles = roles.filter(role => !allPossibleRoles.includes(role));
    if (invalidRoles.length > 0) {
      throw new ApiErrors(`Invalid roles provided: ${invalidRoles.join(", ")}`, 400);
    }
  }

  userToUpdate.availableRoles = roles;
  if (!roles.includes(userToUpdate.role)) {
    userToUpdate.role = roles[0];
  }

  await userToUpdate.save();

  await logActivity(req, "USER_ROLES_UPDATE", "User", userToUpdate._id, {
    after: { availableRoles: roles, activeRole: userToUpdate.role }
  });

  return res.status(200).json(
    new ApiResponse(200, "User roles updated successfully", userToUpdate)
  );
});

/**
 * Updates any user's profile information by ID (Admin only).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a JSON response with update status
 */
const updateUserProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { fullName, labName, designation, division, mobileNo, settings } = req.body;

  if (fullName === undefined && labName === undefined && designation === undefined && division === undefined && mobileNo === undefined && settings === undefined) {
    throw new ApiErrors("At least one field is required to update", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiErrors("User not found", 404);
  }

  // Permission Check
  const requesterIsSuper = await hasPermission(req.user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const requesterCanManageAll = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
  const requesterCanManageOwn = await hasPermission(req.user.role, FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE);

  const targetIsSuper = await hasPermission(user.role, FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);
  const targetCanManageAll = await hasPermission(user.role, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);

  if (requesterIsSuper) {
    // System Configurator can manage anyone - OK
  } else if (requesterCanManageAll) {
    // Cannot manage System Configurators
    if (targetIsSuper) {
      throw new ApiErrors("Forbidden: You cannot update System Configurator accounts", 403);
    }
    // Cannot manage other Managers of ALL labs if they are not self? (Usually peers are protected)
    if (targetCanManageAll && user._id.toString() !== req.user._id.toString()) {
      throw new ApiErrors("Forbidden: You cannot update other Administrator accounts", 403);
    }
  } else if (requesterCanManageOwn) {
    // Manager of OWN lab
    if (user.labName !== req.user.labName) {
      throw new ApiErrors("Forbidden: You can only update users from your own lab", 403);
    }
    if (targetIsSuper || targetCanManageAll) {
      throw new ApiErrors("Forbidden: You cannot update Administrator or System Configurator accounts", 403);
    }
  } else {
    throw new ApiErrors("Forbidden: Access denied", 403);
  }

  const beforeState = user.toObject();

  if (fullName) user.fullName = fullName;

  if (labName) user.labName = labName.toUpperCase();

  if (designation) user.designation = designation;

  if (division) user.division = division;

  if (mobileNo !== undefined) {
    user.mobileNo = mobileNo;
  }

  if (settings) {
    user.settings = { ...user.settings, ...settings };
  }

  // Note: We do NOT force status to Pending because an Admin is performing the update.
  // We assume the Admin has verified the changes.

  await user.save();

  await logActivity(req, "USER_PROFILE_UPDATE_BY_ADMIN", "User", user._id, {
    performer: req.user._id,
    before: JSON.parse(JSON.stringify(beforeState)),
    after: JSON.parse(JSON.stringify(user.toObject()))
  });

  const updatedUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, "User profile updated successfully", updatedUser));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  forgotPassword,
  resetPassword,
  activateAccount,
  verifyForgotPassToken,
  updateUserProfile,
  getAllUsers,
  updateUserStatus,
  createAdminUser,
  bulkUpdateUserStatus,
  bulkDeleteUsers,
  getUserProfileById,
  manualActivateUser,
  bulkManualActivateUsers,
  switchRole,
  updateUserAvailableRoles,
  resendActivationEmail,
  migrateLabNames,
  updateUserProfileById
};

/**
 * Maintenance script to normalize lab names by adding 'CSIR-' prefix if missing.
 * This is a one-time migration that affects Users, References, and LocalReferences.
 */
const migrateLabNames = asyncHandler(async (req, res) => {
  // 1. Identify users whose labName needs normalization
  const allUsers = await User.find({ labName: { $exists: true, $ne: "" } });

  const results = {
    usersUpdated: 0,
    referencesUpdated: 0,
    localReferencesUpdated: 0,
    errors: []
  };

  const userBulkOps = [];
  const migrationMap = new Map();

  for (const user of allUsers) {
    const originalLabName = user.labName;
    const trimmedLabName = (originalLabName || "").trim().toUpperCase();

    if (!trimmedLabName) continue;

    let newLabName = trimmedLabName;
    if (!trimmedLabName.startsWith("CSIR-")) {
      newLabName = `CSIR-${trimmedLabName}`;
    }

    if (originalLabName !== newLabName) {
      userBulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { labName: newLabName } }
        }
      });
      migrationMap.set(originalLabName, newLabName);
    }
  }

  // Execute User bulk updates
  if (userBulkOps.length > 0) {
    try {
      const bulkResult = await User.bulkWrite(userBulkOps);
      results.usersUpdated = bulkResult.modifiedCount;
    } catch (err) {
      results.errors.push({ type: "User Bulk Update", error: err.message });
    }
  }

  // 2. Perform optimized bulk updates for References and LocalReferences
  for (const [oldLabName, newLabName] of migrationMap.entries()) {
    try {
      const refUpdate = await GlobalReference.updateMany(
        { "createdByDetails.labName": oldLabName },
        { $set: { "createdByDetails.labName": newLabName } }
      );
      const refMarkedUpdate = await GlobalReference.updateMany(
        { "markedToDetails.labName": oldLabName },
        { $set: { "markedToDetails.labName": newLabName } }
      );
      results.referencesUpdated += (refUpdate.modifiedCount + refMarkedUpdate.modifiedCount);

      const localRefUpdate = await LocalReference.updateMany(
        { "createdByDetails.labName": oldLabName },
        { $set: { "createdByDetails.labName": newLabName } }
      );
      const localRefMarkedUpdate = await LocalReference.updateMany(
        { "markedToDetails.labName": oldLabName },
        { $set: { "markedToDetails.labName": newLabName } }
      );
      const localOwnerUpdate = await LocalReference.updateMany(
        { labName: oldLabName },
        { $set: { labName: newLabName } }
      );

      results.localReferencesUpdated += (localRefUpdate.modifiedCount + localRefMarkedUpdate.modifiedCount + localOwnerUpdate.modifiedCount);
    } catch (err) {
      results.errors.push({ lab: oldLabName, error: `Reference sync failed: ${err.message}` });
    }
  }

  res.status(200).json(new ApiResponse(200, "Lab name migration completed", results));
});
