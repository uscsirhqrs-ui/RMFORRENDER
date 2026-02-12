/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { sendPasswordResetLink } from '../../services/user.api';
/**



/**
 * A functional React component for the Forgot Password form, styled with Tailwind CSS.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const emailInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call (replace with your actual API endpoint and fetch logic)
      const response = await sendPasswordResetLink({ email })


      // Use response properties (adjust based on your ApiResponse interface)
      if (response.success) {
        setIsSubmitted(true);
      } else {
        console.error('Failed:', response.message);
        setError(response.message || 'Request failed');
      }

    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };


  if (isSubmitted) {
    return (
      <div className='flex justify-center'>
        <div className="p-8 shadow-lg rounded-lg max-w-md w-full bg-white text-justify">
          <div className=' flex justify-center'><Mail /></div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800  flex justify-center">Request Submitted</h2>
          <p className="text-gray-600 ">
            "If an account is associated with <span className='font-bold'>'{email}'</span> then you will receive instructions to reset your password. Please check your Inbox/Spam folder. If you do not receive an email then ensure that you have entered the correct email address."
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8 bg-white shadow-lg rounded-lg max-w-md w-full container mx-auto text-center">
      <KeyRound className="mx-auto h-12 w-12 text-primary mb-4" />
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Forgot Password</h2>
      <p className="mb-6 text-gray-600">Enter your registered email address to receive a password reset link.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block font-bold text-sm  text-gray-700 mb-1 text-left">
            Email Address :
          </label>
          <input
            type="email"
            id="email"
            ref={emailInputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
            aria-describedby={error ? 'error-message' : undefined}
          />
        </div>
        {error && (
          <p id="error-message" className="text-sm text-red-600 mt-1">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-700 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
};
export default ForgotPassword;
