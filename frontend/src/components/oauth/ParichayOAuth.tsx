/**
 * @fileoverview Parichay OAuth Component - Handles Parichay login flow
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-16
 */

import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import Button from '../ui/Button';
import { getParichayAuthUrl } from '../../services/parichay.api';

interface ParichayOAuthProps {
  onLoginStart?: () => void;
  onError?: (error: string) => void;
}

const ParichayOAuth: React.FC<ParichayOAuthProps> = ({ onLoginStart, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleParichayLogin = async () => {
    try {
      setIsLoading(true);
      onLoginStart?.();

      // Get authorization URL and PKCE parameters
      const response = await getParichayAuthUrl();

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate Parichay login');
      }

      const { authorizationUrl, codeVerifier, state } = response.data || {};

      // Validate authorizationUrl before redirecting
      if (!authorizationUrl || typeof authorizationUrl !== 'string' || authorizationUrl.trim() === '') {
        console.error('Invalid authorizationUrl from getParichayAuthUrl:', response);
        throw new Error('Invalid authorization URL received from server');
      }

      // Store PKCE parameters in session storage (secure, cleared on tab close)
      sessionStorage.setItem('parichay_code_verifier', codeVerifier);
      sessionStorage.setItem('parichay_state', state);

      // Redirect to Parichay authorization endpoint
      window.location.href = authorizationUrl;
    } catch (error: any) {
      console.error('Parichay login error:', error);
      onError?.(error.message || 'Failed to initiate Parichay login');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={handleParichayLogin}
        disabled={isLoading}
        icon={!isLoading ? <LogIn size={18} /> : undefined}
        iconPosition="left"
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? 'Redirecting to Parichay...' : 'Login with Parichay'}
      </Button>
      
      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-sm text-gray-500 px-2">OR</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>
    </div>
  );
};

export default ParichayOAuth;
