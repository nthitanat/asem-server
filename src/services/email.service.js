const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');
const logger = require('../utils/logger.util');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth
  });
};

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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ASEM, ${user.username}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `
      Welcome to ASEM, ${user.username}!
      
      Thank you for registering. Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours. If you didn't create an account, please ignore this email.
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.username},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2196F3; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email 
          or contact support if you're concerned about your account security.
        </p>
      </div>
    `,
    text: `
      Password Reset Request
      
      Hi ${user.username},
      
      We received a request to reset your password. Visit this link to reset it:
      ${resetUrl}
      
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Changed</h2>
        <p>Hi ${user.username},</p>
        <p>This is a confirmation that your password was successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          This is an automated message, please do not reply.
        </p>
      </div>
    `,
    text: `
      Password Changed
      
      Hi ${user.username},
      
      This is a confirmation that your password was successfully changed.
      
      If you didn't make this change, please contact our support team immediately.
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
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
    subject: 'Welcome to ASEM!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ASEM!</h2>
        <p>Hi ${user.username},</p>
        <p>Your email has been verified successfully. You now have full access to all features.</p>
        <p>Get started by exploring your dashboard and connecting with other researchers.</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
    `,
    text: `
      Welcome to ASEM!
      
      Hi ${user.username},
      
      Your email has been verified successfully. You now have full access to all features.
      
      Get started by exploring your dashboard and connecting with other researchers.
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
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
