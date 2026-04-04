const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const emailConfig = require('../config/email.config');
const logger = require('../utils/logger.util');

/**
 * Create SMTP transporter (used in dev with MailDev).
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth
  });
};

/**
 * Send email via Gmail REST API over HTTPS (port 443).
 * This bypasses SMTP firewall entirely — outbound TCP is never used.
 */
const sendViaGmailAPI = async (mailOptions) => {
  const oauth2Client = new google.auth.OAuth2(
    emailConfig.gmail.clientId,
    emailConfig.gmail.clientSecret
  );
  oauth2Client.setCredentials({ refresh_token: emailConfig.gmail.refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Encode subject safely for non-ASCII characters
  const encodedSubject = `=?UTF-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`;

  // Build RFC 2822 MIME message (multipart/alternative for HTML + plain text)
  const boundary = `boundary_${Date.now()}`;
  const rawLines = [
    `From: ${mailOptions.from}`,
    `To: ${mailOptions.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    mailOptions.text || '',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(mailOptions.html).toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}--`
  ];

  const raw = Buffer.from(rawLines.join('\r\n')).toString('base64url');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
};

/**
 * Unified send function — routes to Gmail API (prod) or SMTP (dev).
 */
const sendEmail = async (mailOptions) => {
  if (emailConfig.gmail.refreshToken) {
    return sendViaGmailAPI(mailOptions);
  }
  return createTransporter().sendMail(mailOptions);
};

/**
 * Wrap email body content in the ASEMLLL themed layout
 * @param {string} bodyHtml - Inner HTML content for the email body
 * @returns {string} Full HTML email
 */
const wrapEmailLayout = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f9f5f7; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f5f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #fdf0f6; padding: 30px 40px; text-align: center;">
              <img src="https://engagement.chula.ac.th/asem-icon.png" alt="ASEMLLL Logo" width="80" style="display: block; margin: 0 auto 15px;" />
              <h1 style="color: #333333; margin: 0; font-size: 22px; font-weight: 700; font-family: 'Sarabun', Arial, Helvetica, sans-serif; letter-spacing: 0.02em;">
                ASEM Lifelong Learning Hub
              </h1>
            </td>
          </tr>
          <!-- Accent bar -->
          <tr>
            <td style="background-color: #B00059; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #fdf0f6; padding: 20px 40px; text-align: center; border-top: 1px solid #f0c8de;">
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                This is an automated message from the ASEM Lifelong Learning Hub.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send email verification email
 * @param {Object} user - User object
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} Success
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${emailConfig.frontendUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
    to: user.email,
    subject: 'Verify Your Email Address - ASEM',
    html: wrapEmailLayout(`
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Dear ${user.username},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Thank you for registering on the <strong>ASEM Lifelong Learning Hub</strong>. To complete your registration, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #C9006B;">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; font-family: 'Sarabun', Arial, Helvetica, sans-serif; letter-spacing: 0.02em;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 15px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Or copy and paste this link into your browser:
              </p>

              <!-- Link Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #fdf0f6; border-radius: 6px; padding: 15px 20px; border-left: 4px solid #C9006B;">
                    <p style="color: #666666; font-size: 14px; line-height: 1.7; margin: 0; word-break: break-all; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                      ${verificationUrl}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #B00059; font-size: 14px; line-height: 1.7; margin: 0 0 25px; font-style: italic; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                This link will expire in 24 hours. If you didn't create an account, please ignore this email.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Warm regards,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 10px 0 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                <strong>ASEM Lifelong Learning Hub Team</strong>
              </p>
    `),
    text: `
      Dear ${user.username},
      
      Thank you for registering on the ASEM Lifelong Learning Hub. Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours. If you didn't create an account, please ignore this email.
      
      Warm regards,
      ASEM Lifelong Learning Hub Team
    `
  };

  try {
    await sendEmail(mailOptions);
    logger.info(`Verification email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send verification email to ${user.email}:`, error.message);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success
 */
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${emailConfig.frontendUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
    to: user.email,
    subject: 'Password Reset Request - ASEM',
    html: wrapEmailLayout(`
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Dear ${user.username},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                We received a request to reset your password for your <strong>ASEM Lifelong Learning Hub</strong> account. Click the button below to reset it:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #C9006B;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; font-family: 'Sarabun', Arial, Helvetica, sans-serif; letter-spacing: 0.02em;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 15px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Or copy and paste this link into your browser:
              </p>

              <!-- Link Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #fdf0f6; border-radius: 6px; padding: 15px 20px; border-left: 4px solid #C9006B;">
                    <p style="color: #666666; font-size: 14px; line-height: 1.7; margin: 0; word-break: break-all; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #B00059; font-size: 14px; line-height: 1.7; margin: 0 0 25px; font-style: italic; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Warm regards,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 10px 0 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                <strong>ASEM Lifelong Learning Hub Team</strong>
              </p>
    `),
    text: `
      Dear ${user.username},
      
      We received a request to reset your password for your ASEM Lifelong Learning Hub account. Visit this link to reset it:
      ${resetUrl}
      
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      
      Warm regards,
      ASEM Lifelong Learning Hub Team
    `
  };

  try {
    await sendEmail(mailOptions);
    logger.info(`Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${user.email}:`, error.message);
    throw error;
  }
};

/**
 * Send password changed confirmation email
 * @param {Object} user - User object
 * @returns {Promise<boolean>} Success
 */
const sendPasswordChangedEmail = async (user) => {
  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
    to: user.email,
    subject: 'Password Changed Successfully - ASEM',
    html: wrapEmailLayout(`
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Dear ${user.username},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                This is a confirmation that your password for the <strong>ASEM Lifelong Learning Hub</strong> was successfully changed.
              </p>

              <!-- Notice Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="background-color: #fdf0f6; border-radius: 6px; padding: 20px 25px; border-left: 4px solid #C9006B;">
                    <p style="color: #B00059; font-size: 15px; line-height: 1.7; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                      <strong>Didn't make this change?</strong> Please contact our support team immediately to secure your account.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Warm regards,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 10px 0 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                <strong>ASEM Lifelong Learning Hub Team</strong>
              </p>
    `),
    text: `
      Dear ${user.username},
      
      This is a confirmation that your password for the ASEM Lifelong Learning Hub was successfully changed.
      
      If you didn't make this change, please contact our support team immediately.
      
      Warm regards,
      ASEM Lifelong Learning Hub Team
    `
  };

  try {
    await sendEmail(mailOptions);
    logger.info(`Password changed confirmation sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password changed email to ${user.email}:`, error.message);
    // Don't throw - this is not critical
    return false;
  }
};

/**
 * Send welcome email (after email verification)
 * @param {Object} user - User object
 * @returns {Promise<boolean>} Success
 */
const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
    to: user.email,
    subject: 'Welcome to ASEM Lifelong Learning Hub!',
    html: wrapEmailLayout(`
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Dear ${user.username},
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 20px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Your email has been verified successfully. You now have full access to all features on the <strong>ASEM Lifelong Learning Hub</strong>.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 10px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                <strong>Get Started:</strong>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 25px;">
                <tr>
                  <td style="padding: 6px 0; color: #333333; font-size: 15px; line-height: 1.7; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                    <strong style="color: #C9006B;">1. Explore:</strong> Visit your dashboard and discover available resources.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #333333; font-size: 15px; line-height: 1.7; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                    <strong style="color: #C9006B;">2. Connect:</strong> Network with other researchers and professionals.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #333333; font-size: 15px; line-height: 1.7; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                    <strong style="color: #C9006B;">3. Complete Profile:</strong> Update your profile with your latest details.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 25px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #C9006B;">
                    <a href="${emailConfig.frontendUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; font-family: 'Sarabun', Arial, Helvetica, sans-serif; letter-spacing: 0.02em;">
                      Go to ASEMLLL Hub
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0 0 30px; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                If you have any questions, feel free to reach out to our support team.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                Warm regards,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.7; margin: 10px 0 0; font-family: 'Sarabun', Arial, Helvetica, sans-serif;">
                <strong>ASEM Lifelong Learning Hub Team</strong>
              </p>
    `),
    text: `
      Dear ${user.username},
      
      Your email has been verified successfully. You now have full access to all features on the ASEM Lifelong Learning Hub.
      
      Get started by exploring your dashboard and connecting with other researchers.
      
      Warm regards,
      ASEM Lifelong Learning Hub Team
    `
  };

  try {
    await sendEmail(mailOptions);
    logger.info(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send welcome email to ${user.email}:`, error.message);
    // Don't throw - this is not critical
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail
};
