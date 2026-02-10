/**
 * @fileoverview Service Layer - Business logic and external integrations
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import crypto from 'crypto';
import base64url from 'base64url';
import axios from 'axios';

/**
 * Generate a random code verifier for PKCE
 * Code verifier is a random string between 43-128 characters
 * @returns {string} Base64 URL encoded code verifier
 */
export const generateCodeVerifier = () => {
  const buffer = crypto.randomBytes(32);
  return base64url(buffer);
};

/**
 * Generate code challenge from code verifier using S256 method (SHA-256)
 * @param {string} codeVerifier - The code verifier
 * @returns {string} Base64 URL encoded code challenge
 */
export const generateCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256');
  hash.update(codeVerifier);
  return base64url(hash.digest());
};

/**
 * Generate state parameter for CSRF protection
 * @returns {string} Random state string
 */
export const generateState = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Build the Parichay authorization URL
 * @param {Object} params - Configuration parameters
 * @returns {string} Complete authorization URL
 */
export const buildAuthorizationUrl = ({
  parichayUrl,
  clientId,
  redirectUri,
  codeChallenge,
  state,
  scope = 'user_details'
}) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  });

  return `${parichayUrl}/pnv1/oauth2/authorize?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 * @param {Object} params - Token exchange parameters
 * @returns {Promise<Object>} Token response with access_token, refresh_token, etc.
 */
export const exchangeCodeForToken = async ({
  parichayUrl,
  clientId,
  clientSecret,
  code,
  codeVerifier,
  redirectUri
}) => {
  try {
    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    };

    const response = await axios.post(
      `${parichayUrl}/pnv1/salt/api/oauth2/token`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Parichay Token Exchange Error:', error.response?.data || error.message);
    throw new Error(`Token exchange failed: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Fetch user details from Parichay using access token
 * @param {Object} params - User details fetch parameters
 * @returns {Promise<Object>} User details (FirstName, LastName, Email, MobileNo, Gender)
 */
export const fetchUserDetails = async ({ parichayUrl, accessToken }) => {
  try {
    const response = await axios.get(
      `${parichayUrl}/pnv1/salt/api/oauth2/userdetails`,
      {
        headers: {
          'Authorization': accessToken,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Parichay User Details Fetch Error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch user details: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Refresh access token using refresh token
 * @param {Object} params - Refresh token parameters
 * @returns {Promise<Object>} New token response
 */
export const refreshAccessToken = async ({ parichayUrl, refreshToken }) => {
  try {
    const response = await axios.post(
      `${parichayUrl}/pnv1/salt/api/oauth2/token`,
      { grant_type: 'refresh_token' },
      {
        headers: {
          'Authorization': refreshToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Parichay Token Refresh Error:', error.response?.data || error.message);
    throw new Error(`Token refresh failed: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Revoke access token
 * @param {Object} params - Revoke token parameters
 * @returns {Promise<Object>} Revocation response
 */
export const revokeAccessToken = async ({ parichayUrl, accessToken }) => {
  try {
    const response = await axios.get(
      `${parichayUrl}/pnv1/salt/api/oauth2/revoke`,
      {
        headers: {
          'Authorization': accessToken,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Parichay Token Revoke Error:', error.response?.data || error.message);
    throw new Error(`Token revocation failed: ${error.response?.data?.message || error.message}`);
  }
};
