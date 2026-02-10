/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import * as nodemailerProvider from './nodemailer.mail.js';
import * as mailersendProvider from './mailersend.mail.js';

// Re-export templates and utilities for backward compatibility
export * from './emailTemplates.js';

/**
 * Main sendEmail function that delegates to the configured provider.
 * The provider is determined by the EMAIL_PROVIDER environment variable.
 * 
 * IMPORTANT: This function is NON-BLOCKING by default. It returns immediately
 * and sends emails in the background. This prevents email sending from blocking
 * API responses and improves overall application performance.
 * 
 * If you need to wait for email confirmation (rare cases), use sendEmailSync instead.
 */
export const sendEmail = (options) => {
  // Send email asynchronously in the background (non-blocking)
  (async () => {
    try {
      const provider = (process.env.EMAIL_PROVIDER || 'nodemailer').toLowerCase();

      switch (provider) {
        case 'mailersend':
          await mailersendProvider.sendEmail(options);
          break;
        case 'nodemailer':
        default:
          await nodemailerProvider.sendEmail(options);
          break;
      }
    } catch (error) {
      console.error('Background email sending failed:', error);
      // Optionally log to a monitoring service or database
    }
  })();

  // Return immediately without waiting for email to be sent
  return Promise.resolve({ queued: true });
};

/**
 * Synchronous version of sendEmail for rare cases where you need to wait
 * for email confirmation before proceeding.
 * 
 * Use this sparingly - most cases should use the non-blocking sendEmail.
 */
export const sendEmailSync = async (options) => {
  const provider = (process.env.EMAIL_PROVIDER || 'nodemailer').toLowerCase();

  switch (provider) {
    case 'mailersend':
      return mailersendProvider.sendEmail(options);
    case 'nodemailer':
    default:
      return nodemailerProvider.sendEmail(options);
  }
};
