/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-27
 */

import axios from 'axios';

/**
 * Sends an email using MailerSend API.
 * @param {string} to - Recipient email address(es)
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
export const sendEmail = async ({ to, subject, html }) => {
    const API_KEY = process.env.MAILERSEND_API_KEY;
    const SENDER_EMAIL = process.env.MAILERSEND_SENDER_EMAIL || process.env.RESET_SEND_EMAIL || 'info@trial-z3m5jgr1m09ldpyo.mlsender.net';
    const SENDER_NAME = process.env.MAILERSEND_SENDER_NAME || "Reference Management Portal";

    if (!API_KEY) {
        console.error("❌ [MailerSend] API Key missing in environment variables");
        return { success: false, error: "API Key missing" };
    }

    // Handle multiple recipients if necessary (MailerSend expects array of objects)
    const recipients = (to || '').split(',').map(email => ({ email: email.trim() }));

    const data = {
        from: {
            email: SENDER_EMAIL,
            name: SENDER_NAME,
        },
        to: recipients,
        subject: subject,
        html: html,
    };

    try {
        const response = await axios.post('https://api.mailersend.com/v1/email', data, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${API_KEY}`,
            },
        });


        return { success: true, messageId: response.headers['x-message-id'] };
    } catch (error) {
        console.error("Error sending email (MailerSend):", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};
