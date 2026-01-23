/**
 * @fileoverview Parichay OAuth Controller - Handles OAuth flow with Parichay
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchUserDetails
} from "../services/parichay.service.js";

/**
 * Step 1: Redirect user to Parichay login
 * Generates PKCE parameters and redirects to Parichay authorization endpoint
 */
export const getParichayAuthorizationUrl = asyncHandler(async (req, res, next) => {
  try {
    
    const parichayUrl = process.env.PARICHAY_URL;
    const clientId = process.env.PARICHAY_CLIENT_ID;
    const clientSecret = process.env.PARICHAY_CLIENT_SECRET;
    const redirectUri = process.env.PARICHAY_REDIRECT_URI;

    if (!parichayUrl || !clientId || !clientSecret || !redirectUri) {
      throw new ApiErrors("Parichay configuration is missing", 500);
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store code verifier and state in session (to be validated on callback)
    // Client should store these securely
    const authorizationUrl = buildAuthorizationUrl({
      parichayUrl,
      clientId,
      redirectUri,
      codeChallenge,
      state
    });

    // Return the authorization URL and PKCE data to frontend
    // Frontend will store code verifier and state, then redirect to authorization URL
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          authorizationUrl,
          codeVerifier,
          state
        },
        "Authorization URL generated successfully"
      )
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json(
      new ApiResponse(
        error.statusCode || 500,
        null,
        error.message || "Failed to generate authorization URL"
      )
    );
  }
});

/**
 * Step 2: Handle OAuth callback
 * Exchanges authorization code for tokens and creates/updates user
 */
export const handleParichayCallback = asyncHandler(async (req, res, next) => {
  try {
    const { code, state, codeVerifier, storedState } = req.body;

    

    if (!code || !codeVerifier) {
      throw new ApiErrors("Authorization code and code verifier are required", 400);
    }

    // Verify state for CSRF protection
    if (state !== storedState) {
      throw new ApiErrors("State mismatch - possible CSRF attack", 400);
    }

    const parichayUrl = process.env.PARICHAY_URL;
    const clientId = process.env.PARICHAY_CLIENT_ID;
    const clientSecret = process.env.PARICHAY_CLIENT_SECRET;
    const redirectUri = process.env.PARICHAY_REDIRECT_URI;

    if (!parichayUrl || !clientId || !clientSecret || !redirectUri) {
      throw new ApiErrors("Parichay configuration is missing", 500);
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForToken({
      parichayUrl,
      clientId,
      clientSecret,
      code,
      codeVerifier,
      redirectUri
    });

    const { access_token, refresh_token, expires_in } = tokenResponse;

    if (!access_token) {
      throw new ApiErrors("Failed to obtain access token", 500);
    }

    // Fetch user details from Parichay
    const userDetails = await fetchUserDetails({
      parichayUrl,
      accessToken: access_token
    });

    // Map Parichay user details to our user model
    const parichayEmail = userDetails.Email?.toLowerCase().trim();
    const parichayFirstName = userDetails.FirstName || "";
    const parichayLastName = userDetails.LastName || "";
    const parichayMobileNo = userDetails.MobileNo || "";

    if (!parichayEmail) {
      throw new ApiErrors("Email not received from Parichay", 400);
    }

    // Check for allowed email domains
    const config = await SystemConfig.findOne({ key: "ALLOWED_DOMAINS" });
    const allowedDomains = (config?.value || []).map(d => d.toLowerCase().trim());

    if (allowedDomains.length > 0) {
      const emailDomain = parichayEmail.split('@')[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        throw new ApiErrors(`Access restricted to the following domains: ${allowedDomains.join(', ')}`, 403);
      }
    }

    // Find or create user
    let user = await User.findOne({ email: parichayEmail });

    if (!user) {
      // Create new user from Parichay data
      // Generate a temporary password (user won't use it for Parichay login)
      const tempPassword = require('crypto').randomBytes(16).toString('hex');

      user = await User.create({
        fullName: `${parichayFirstName} ${parichayLastName}`.trim(),
        email: parichayEmail,
        mobileNo: parichayMobileNo,
        password: tempPassword,
        parichayId: userDetails.Id || parichayEmail, // Unique identifier from Parichay
        parichayAccessToken: access_token,
        parichayRefreshToken: refresh_token,
        parichayTokenExpiry: new Date(Date.now() + expires_in * 1000),
        status: 'Pending', // New users are pending by default
        availableRoles: ['User'],
        isActivated: true, // Assume activated via Parichay
      });

      console.log(`New Parichay user created: ${parichayEmail}`);
    } else {
      // Update existing user with new tokens
      user.parichayAccessToken = access_token;
      user.parichayRefreshToken = refresh_token;
      user.parichayTokenExpiry = new Date(Date.now() + expires_in * 1000);
      user.parichayId = userDetails.Id || parichayEmail;

      // Update name if it was empty
      if (!user.fullName) {
        user.fullName = `${parichayFirstName} ${parichayLastName}`.trim();
      }

      // Update mobile if provided and not empty
      if (parichayMobileNo && !user.mobileNo) {
        user.mobileNo = parichayMobileNo;
      }

      await user.save({ validateBeforeSave: false });

      console.log(`Parichay user updated: ${parichayEmail}`);
    }

    // Generate JWT tokens for our system (same as regular login)
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY;
    const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY;

    const jwt = require('jsonwebtoken');

    // Create access token
    const jwtAccessToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: user.role
      },
      accessTokenSecret,
      { expiresIn: accessTokenExpiry }
    );

    // Create refresh token
    const jwtRefreshToken = jwt.sign(
      {
        _id: user._id
      },
      refreshTokenSecret,
      { expiresIn: refreshTokenExpiry }
    );

    // Save refresh token to user
    user.refreshToken = jwtRefreshToken;
    await user.save({ validateBeforeSave: false });

    // Set cookies
    const accessTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const refreshTokenMaxAge = 10 * 24 * 60 * 60 * 1000; // 10 days

    res.cookie("accessToken", jwtAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessTokenMaxAge
    });

    res.cookie("refreshToken", jwtRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshTokenMaxAge
    });

    // Get user without sensitive data
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -parichayAccessToken -parichayRefreshToken"
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: jwtAccessToken
        },
        "Parichay login successful"
      )
    );
  } catch (error) {
    console.error("Parichay callback error:", error.message);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(
        error.statusCode || 500,
        null,
        error.message || "Parichay login failed"
      )
    );
  }
});

/**
 * Logout and revoke Parichay tokens
 */
export const revokeParichayToken = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiErrors("Unauthorized", 401);
    }

    const user = await User.findById(req.user._id);

    if (!user || !user.parichayAccessToken) {
      throw new ApiErrors("User is not connected to Parichay", 400);
    }

    // Attempt to revoke token with Parichay
    const { revokeAccessToken } = await import("../services/parichay.service.js");
    
    try {
      await revokeAccessToken({
        parichayUrl: process.env.PARICHAY_URL,
        accessToken: user.parichayAccessToken
      });
    } catch (revokeError) {
      console.warn("Failed to revoke Parichay token:", revokeError.message);
      // Continue with local logout even if revoke fails
    }

    // Clear Parichay tokens from database
    user.parichayAccessToken = null;
    user.parichayRefreshToken = null;
    user.parichayTokenExpiry = null;
    user.refreshToken = null; // Clear JWT refresh token too
    await user.save({ validateBeforeSave: false });

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json(
      new ApiResponse(200, null, "Logged out successfully")
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json(
      new ApiResponse(
        error.statusCode || 500,
        null,
        error.message || "Logout failed"
      )
    );
  }
});
