/**
 * @fileoverview Parichay OAuth Callback Page - Handles OAuth callback from Parichay
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { handleParichayCallback } from '../../services/parichay.api';
import { Loader } from 'lucide-react';

const ParichayCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract code from URL query parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code) {
          throw new Error('Authorization code not found in callback');
        }

        // Retrieve stored PKCE parameters from session storage
        const codeVerifier = sessionStorage.getItem('parichay_code_verifier');
        const storedState = sessionStorage.getItem('parichay_state');

        if (!codeVerifier) {
          throw new Error('Code verifier not found. Session may have expired.');
        }

        if (state !== storedState) {
          throw new Error('State mismatch. Possible CSRF attack detected.');
        }

        // Call backend callback endpoint
        const response = await handleParichayCallback({
          code: code || '',
          state: state || '',
          codeVerifier,
          storedState: storedState || ''
        });

        if (!response.success) {
          throw new Error(response.message || 'Parichay login failed');
        }

        const user = response.user;

        // Login user using auth context
        login({
          _id: user._id,
          fullName: user.fullName || '',
          email: user.email,
          labName: user.labName || '',
          designation: user.designation || '',
          division: user.division || '',
          status: user.status,
          isSubmitted: user.isSubmitted || false,
          role: user.role,
          availableRoles: user.availableRoles || ['User'],
          mobileNo: user.mobileNo || '',
          avatar: user.avatar || '',
          initials: (user.fullName || user.email).slice(0, 2).toUpperCase()
        });

        // Clear session storage
        sessionStorage.removeItem('parichay_code_verifier');
        sessionStorage.removeItem('parichay_state');

        // Determine where to redirect based on user status
        const isApproved = user.status === 'Approved';
        const isProfileComplete = !!(user.labName && user.designation);

        if (!isApproved || !isProfileComplete) {
          navigate('/profile', {
            state: { message: 'Your profile must be completed and approved by an administrator to access the portal features.' }
          });
        } else {
          navigate('/');
        }
      } catch (err: any) {
        console.error('Parichay callback error:', err);
        setError(err.message || 'Failed to complete Parichay login');

        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/auth', { state: { error: err.message } });
        }, 3000);
      }
    };

    processCallback();
  }, [location, navigate, login]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-gray-50 to-gray-100 gap-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Login Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-gray-50 to-gray-100 gap-4">
      <div className="text-center">
        <Loader className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Completing Login</h2>
        <p className="text-gray-600">Authenticating with Parichay...</p>
      </div>
    </div>
  );
};

export default ParichayCallback;
