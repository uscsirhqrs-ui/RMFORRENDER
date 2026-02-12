/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";


import { verifyResetLink, resetPassword } from '../../services/user.api';
import { useMessageBox } from '../../context/MessageBoxContext';

const ResetPassword: React.FC = () => {
  const { showMessage } = useMessageBox();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // States for token verification and form inputs
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Extract token and userId from query params
  const token: string | null = searchParams.get("token");
  const userId: string | null = searchParams.get("userId");

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (token && userId) {
          const response = await verifyResetLink({ userId, token });

          if (response.success) {
            setIsTokenValid(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setIsTokenValid(false);
          }
        }
      } catch (err) {
        setIsTokenValid(false);
      }
    };
    verifyToken();
  }, [token, userId]);

  // Handle password reset form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }
    try {
      const response = await resetPassword({ userId, token, newPassword });
      if (response.success) {
        showMessage({ title: 'Success', message: "Password reset successful! Redirecting to login...", type: 'success' });
        navigate("/login");
      } else {
        setErrorMessage(response.message || "Password reset failed.");
      }
    } catch {
      setErrorMessage("An error occurred while resetting password.");
    }
  };

  if (isTokenValid === null) {
    return <div>Verifying reset link failed as token is null...</div>;
  }

  if (!isTokenValid) {
    return <div>Invalid or expired reset link.</div>;
  }

  return (
    <div className="flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Reset Password</h2>
          <p className="text-sm text-gray-500">Enter your new password to secure your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium text-muted">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => { setShowPassword(!showPassword) }}
              >
                <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => { setShowPassword(!showPassword) }}
              >
                <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            Reset Password
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>

  );
};

export default ResetPassword;
