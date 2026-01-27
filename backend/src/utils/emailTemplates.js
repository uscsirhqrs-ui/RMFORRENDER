/**
 * @fileoverview Email Templates - Shared HTML templates for email notifications
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-27
 */

/**
 * Helper to get the correct base URL for emails.
 * Prioritizes IP-based URLs over localhost to ensure network accessibility.
 */
export const getBaseUrl = () => {
    const clientUrls = (process.env.CLIENT_URL || 'http://localhost:3000').split(',');

    // Development Mode Override: Prioritize localhost
    if (process.env.DEV_MODE === 'true') {
        const localUrl = clientUrls.find(url => url.includes('localhost') || url.includes('127.0.0.1'));
        return (localUrl || 'http://localhost:5173').trim();
    }

    // Try to find a non-localhost URL (Production/Network behavior)
    const ipUrl = clientUrls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
    return (ipUrl || clientUrls[0]).trim();
};

/**
 * Generates HTML template for New Reference Notification
 */
export const getNewReferenceEmailTemplate = (reference, creatorName) => {
    const baseUrl = getBaseUrl();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">New Reference Assigned</h2>
        <p>Dear User,</p>
        <p>A new reference has been assigned to you by <strong>${creatorName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ref ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${reference.refId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${reference.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="color: ${reference.priority === 'High' ? 'red' : 'black'}; font-weight: ${reference.priority === 'High' ? 'bold' : 'normal'};">
                ${reference.priority}
              </span>
            </td>
          </tr>
        </table>
  
        <div style="margin-top: 20px; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
          <strong>Remarks:</strong><br/>
          ${reference.remarks}
        </div>
  
        <p style="margin-top: 25px;">
          <a href="${baseUrl}/references/${reference._id}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Reference</a>
        </p>
        
        <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated message. Please do not reply directly to this valid email.</p>
      </div>
    `;
};

/**
 * Generates HTML template for Reference Update Notification
 */
export const getUpdateReferenceEmailTemplate = (reference, actorName, action) => {
    const baseUrl = getBaseUrl();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Reference Updated</h2>
        <p>Dear User,</p>
        <p>The reference <strong>${reference.refId}</strong> has been updated by <strong>${actorName}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${reference.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${reference.status}</td>
          </tr>
        </table>
  
        <div style="margin-top: 20px; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
          <strong>Latest Remarks:</strong><br/>
          ${reference.remarks}
        </div>
  
        <p style="margin-top: 25px;">
           <a href="${baseUrl}/references/${reference._id}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Reference</a>
        </p>
      </div>
    `;
};

/**
 * Generates HTML template for Reminder
 */
export const getReminderEmailTemplate = (reference, senderName, remarks, priority) => {
    const baseUrl = getBaseUrl();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; border-top: 4px solid ${priority === 'High' ? '#ef4444' : '#f59e0b'};">
        <h2 style="color: #111827;">Action Required: Reference Reminder</h2>
        <p>Dear User,</p>
        <p>This is a reminder from <strong>${senderName}</strong> regarding the following reference:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Ref ID:</strong> ${reference.refId}</p>
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${reference.subject}</p>
          <p style="margin: 5px 0;"><strong>Current Status:</strong> ${reference.status}</p>
        </div>
  
        <div style="margin-top: 20px; padding: 15px; border-left: 4px solid ${priority === 'High' ? '#ef4444' : '#f59e0b'}; background-color: #fff7ed;">
          <strong style="color: ${priority === 'High' ? '#b91c1c' : '#92400e'};">Sender's Remarks:</strong><br/>
          <p style="margin-top: 5px; white-space: pre-wrap;">${remarks}</p>
        </div>
  
        <p style="margin-top: 25px;">
           <a href="${baseUrl}/references/${reference._id}" style="background-color: #111827; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Reference</a>
        </p>
      </div>
    `;
};

/**
 * Generates HTML template for Account Approval Notification
 */
export const getAccountApprovedEmailTemplate = (userName) => {
    const baseUrl = getBaseUrl();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; border-top: 4px solid #10b981;">
        <h2 style="color: #111827;">Account Approved</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>We are pleased to inform you that your account has been approved by the administrator.</p>
        
        <p>You can now log in to the portal and access all features.</p>
  
        <p style="margin-top: 25px;">
           <a href="${baseUrl}/login" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Portal</a>
        </p>
        
        <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `;
};

/**
 * Generates HTML template for Form Template Sharing Notification
 */
export const getFormSharedEmailTemplate = (template, sharedByName) => {
    const baseUrl = getBaseUrl();
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; border-top: 4px solid #4f46e5;">
        <h2 style="color: #4f46e5;">New Data Collection Form Shared</h2>
        <p>Dear User,</p>
        <p>A new data collection form <strong>"${template.title}"</strong> has been shared with you by <strong>${sharedByName}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Form Title:</strong> ${template.title}</p>
          <p style="margin: 5px 0;"><strong>Description:</strong> ${template.description || 'No description provided'}</p>
        </div>
  
        <p>Please click the button below to view and fill the form.</p>
  
        <p style="margin-top: 25px;">
           <a href="${baseUrl}/data-collection" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Data Collection Page</a>
        </p>
        
        <p style="font-size: 12px; color: #888; margin-top: 30px;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `;
};
