/**
 * @fileoverview Nodemailer Email Provider - Implementation for sending emails via SMTP
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-27
 */

import nodemailer from 'nodemailer';

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || true,
    auth: {
        user: (process.env.RESET_SEND_EMAIL || '').trim(),
        pass: (process.env.RESET_SEND_APP_PASS || '').replace(/\s/g, ''),
    },
});

// Verify connection configuration on startup
transporter.verify(function (error, success) {
    if (error) {
        console.error("❌ [Nodemailer] Connection Failed:", error);
    } else {
        console.log("✅ [Nodemailer] Server is ready to take our messages");
        console.log(`[Nodemailer] Sending from: ${process.env.RESET_SEND_EMAIL}`);
    }
});

/**
 * Sends an email using Nodemailer.
 * @param {string} to - Recipient email address(es)
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
export const sendEmail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: `Reference Management Portal <${process.env.RESET_SEND_EMAIL}>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent (Nodemailer): ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email (Nodemailer):", error);
        return { success: false, error: error.message };
    }
};
