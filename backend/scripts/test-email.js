import dotenv from 'dotenv';
dotenv.config({ path: './.env' }); // Explicitly load .env BEFORE importing mail.js

console.log('Testing Email Configuration...');

// Use dynamic import to ensure dotenv is loaded first
const start = async () => {
    try {
        const { sendEmail } = await import('../src/utils/mail.js');

        console.log('Email User:', process.env.RESET_SEND_EMAIL);
        console.log('Email Pass Configured:', !!process.env.RESET_SEND_APP_PASS);

        console.log('Sending test email...');
        await sendEmail({
            to: process.env.RESET_SEND_EMAIL,
            subject: 'Test Email from Debug Script (Fixed)',
            html: '<p>If you see this, email sending is working!</p>'
        });
        console.log('Test email function called.');
    } catch (error) {
        console.error('Test script failed:', error);
    }
};

start();
