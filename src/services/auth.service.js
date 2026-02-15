const userModel = require('../models/user.model');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const emailConfig = require('../config/email.config');
const refreshTokenModel = require('../models/refreshToken.model');
const logger = require('../utils/logger.util');

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} { user, message }
 */
const register = async (userData) => {
  // Check if email already exists
  const existingEmail = await userModel.findUserByEmail(userData.email);
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  // Check if username already exists
  const existingUsername = await userModel.findUserByUsername(userData.username);
  if (existingUsername) {
    throw new Error('Username already taken');
  }

  // Check if email verification is enabled
  const verificationEnabled = emailConfig.verification.enabled;

  // Create user with appropriate verification status
  const user = await userModel.createUser({
    ...userData,
    emailVerified: !verificationEnabled
  });

  let message = 'Registration successful.';

  // Only send verification email if enabled
  if (verificationEnabled) {
    // Generate email verification token
    const verificationToken = await tokenService.generateEmailVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
      message = 'Registration successful. Please check your email to verify your account.';
    } catch (error) {
      logger.error('Failed to send verification email:', error.message);
      message = 'Registration successful. Please check your email to verify your account.';
    }
  } else {
    message = 'Registration successful. You can now log in.';
    logger.info(`New user registered with auto-verification: ${user.username} (${user.email})`);
  }

  logger.info(`New user registered: ${user.username} (${user.email})`);

  return {
    user,
    message
  };
};

/**
 * Login user
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
const login = async (email, password) => {
  // Verify credentials
  const user = await userModel.verifyUserPassword(email, password);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if user is active
  if (!user.is_active) {
    throw new Error('Account is inactive. Please contact support.');
  }

  // Generate tokens
  const { accessToken, refreshToken } = await tokenService.generateTokenPair(user);

  logger.info(`User logged in: ${user.username}`);

  return {
    user,
    accessToken,
    refreshToken,
    emailVerified: user.email_verified
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
const refreshToken = async (refreshToken) => {
  return await tokenService.refreshAccessToken(refreshToken);
};

/**
 * Logout user
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {Promise<boolean>} Success
 */
const logout = async (refreshToken) => {
  await refreshTokenModel.revokeRefreshToken(refreshToken);
  logger.info('User logged out');
  return true;
};

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} { user, message }
 */
const verifyEmail = async (token) => {
  // Verify token
  const userId = await tokenService.verifyEmailToken(token);

  // Update user email_verified status
  await userModel.setEmailVerified(userId, true);

  // Get user
  const user = await userModel.findUserById(userId);

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (error) {
    logger.error('Failed to send welcome email:', error.message);
  }

  logger.info(`Email verified for user: ${user.username}`);

  return {
    user,
    message: 'Email verified successfully'
  };
};

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Promise<Object>} { message }
 */
const resendVerification = async (email) => {
  const user = await userModel.findUserByEmail(email);

  if (!user) {
    // Don't reveal if email exists
    return { message: 'If the email exists, a verification link has been sent.' };
  }

  if (user.email_verified) {
    throw new Error('Email is already verified');
  }

  // Generate new verification token
  const verificationToken = await tokenService.generateEmailVerificationToken(user.id);

  // Send verification email
  await emailService.sendVerificationEmail(user, verificationToken);

  logger.info(`Verification email resent to: ${user.email}`);

  return { message: 'Verification email sent' };
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} { message }
 */
const forgotPassword = async (email) => {
  const user = await userModel.findUserByEmail(email);

  // Always return success to prevent email enumeration
  if (!user) {
    logger.warn(`Password reset requested for non-existent email: ${email}`);
    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  // Generate reset token
  const resetToken = await tokenService.generatePasswordResetToken(user.id);

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    logger.error('Failed to send password reset email:', error.message);
    throw new Error('Failed to send password reset email');
  }

  logger.info(`Password reset email sent to: ${user.email}`);

  return { message: 'If the email exists, a password reset link has been sent.' };
};

/**
 * Verify password reset token (check if valid)
 * @param {string} token - Reset token
 * @returns {Promise<Object>} { valid: boolean }
 */
const verifyResetToken = async (token) => {
  try {
    await tokenService.verifyPasswordResetToken(token);
    return { valid: true };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} { message }
 */
const resetPassword = async (token, newPassword) => {
  // Verify token
  const userId = await tokenService.verifyPasswordResetToken(token);

  // Update password
  await userModel.updatePassword(userId, newPassword);

  // Mark token as used
  await tokenService.markPasswordResetTokenUsed(token);

  // Revoke all refresh tokens (logout all sessions)
  await tokenService.revokeAllUserTokens(userId);

  // Get user and send confirmation email
  const user = await userModel.findUserById(userId);
  try {
    await emailService.sendPasswordChangedEmail(user);
  } catch (error) {
    logger.error('Failed to send password changed email:', error.message);
  }

  logger.info(`Password reset for user: ${user.username}`);

  return { message: 'Password reset successfully' };
};

/**
 * Change password (authenticated user)
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @param {string} currentRefreshToken - Current refresh token to keep
 * @returns {Promise<Object>} { message }
 */
const changePassword = async (userId, currentPassword, newPassword, currentRefreshToken) => {
  // Get user with password
  const user = await userModel.findUserById(userId);
  const userWithPassword = await userModel.findUserByEmail(user.email, true);

  // Verify current password
  const bcrypt = require('bcrypt');
  const isValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);

  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  await userModel.updatePassword(userId, newPassword);

  // Revoke all other refresh tokens (keep current session)
  await tokenService.revokeAllUserTokens(userId, currentRefreshToken);

  // Send confirmation email
  try {
    await emailService.sendPasswordChangedEmail(user);
  } catch (error) {
    logger.error('Failed to send password changed email:', error.message);
  }

  logger.info(`Password changed for user: ${user.username}`);

  return { message: 'Password changed successfully' };
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
};
