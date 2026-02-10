/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Get the Parichay authorization URL
 * @returns {Promise<Object>} Response with authorizationUrl, codeVerifier, and state
 */
export const getParichayAuthUrl = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parichay/auth-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server returned non-JSON response (status ${response.status}): ${text}`);
        }
        // If response is OK but not JSON, wrap text
        data = { data: text };
      }
    }

    if (!response.ok) {
      throw new Error((data && data.message) || `Failed to get Parichay auth URL (status ${response.status})`);
    }

    return {
      success: true,
      data: data.data
    };
  } catch (error: any) {
    console.error('Parichay Auth URL Error:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to get Parichay authorization URL'
    };
  }
};

/**
 * Handle Parichay OAuth callback
 * @param {Object} params - Callback parameters
 * @returns {Promise<Object>} Response with user data and access token
 */
export const handleParichayCallback = async (params: {
  code: string;
  state: string;
  codeVerifier: string;
  storedState: string;
}): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parichay/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      credentials: 'include'
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server returned non-JSON response (status ${response.status}): ${text}`);
        }
        data = { data: text };
      }
    }

    if (!response.ok) {
      throw new Error((data && data.message) || `Parichay login failed (status ${response.status})`);
    }

    return {
      success: true,
      data: data.data,
      user: data.data?.user
    };
  } catch (error: any) {
    console.error('Parichay Callback Error:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to complete Parichay login'
    };
  }
};

/**
 * Revoke Parichay token and logout
 * @returns {Promise<Object>} Response with logout status
 */
export const revokeParichayToken = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parichay/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server returned non-JSON response (status ${response.status}): ${text}`);
        }
        data = { message: text };
      }
    }

    if (!response.ok) {
      throw new Error((data && data.message) || `Failed to revoke token (status ${response.status})`);
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error('Parichay Revoke Error:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to revoke Parichay token'
    };
  }
};
