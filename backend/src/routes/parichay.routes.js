/**
 * @fileoverview API Routes - Defines endpoint routes and middleware
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import { Router } from 'express';
import {
  getParichayAuthorizationUrl,
  handleParichayCallback,
  revokeParichayToken
} from '../controllers/parichay.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/parichay/auth-url
 * Returns the Parichay authorization URL with PKCE parameters
 * Frontend will redirect user to this URL
 */
router.route('/auth-url').get(getParichayAuthorizationUrl);

/**
 * POST /api/parichay/callback
 * Handles the OAuth callback after user authorizes on Parichay
 * Body: { code, state, codeVerifier, storedState }
 */
router.route('/callback').post(handleParichayCallback);

/**
 * POST /api/parichay/logout
 * Revokes Parichay access token and logs out user
 * Protected route - requires JWT authentication
 */
router.route('/logout').post(verifyJWT, revokeParichayToken);

export default router;
