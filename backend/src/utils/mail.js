/**
 * @fileoverview Email Dispatcher - Routes email requests to the configured provider
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
 */
export const sendEmail = async (options) => {
  const provider = (process.env.EMAIL_PROVIDER || 'nodemailer').toLowerCase();

  switch (provider) {
    case 'mailersend':
      return mailersendProvider.sendEmail(options);
    case 'nodemailer':
    default:
      return nodemailerProvider.sendEmail(options);
  }
};
