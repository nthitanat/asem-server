const { generateAccessToken, generateRefreshToken, getExpiryDate } = require('../utils/jwt.util');
const { generateSecureToken, getTokenExpiry, isTokenExpired } = require('../utils/token.util');
const refreshTokenModel = require('../models/refreshToken.model');
const emailVerificationModel = require('../../emailVerification.model');
const passwordResetModel = require('../models/passwordReset.model');
const jwtConfig = require('../config/jwt.config');
const logger = require('../utils/logger.util');

/**
 * Generate access and refresh tokens for user
 * @param {Object} user - User object
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
const generateTokenPair = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    emailVerified: user.email_verified
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Save refresh token to database
  const expiresAt = getExpiryDate(jwtConfig.refreshTokenExpiry);
  await refreshTokenModel.saveRefreshToken(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
};

/**
 * Refresh access token using refresh token
 * @param {string} oldRefreshToken - Current refresh token
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
const refreshAccessToken = async (oldRefreshToken) => {
  // Find token in database
  const tokenRecord = await refreshTokenModel.findRefreshToken(oldRefreshToken);

  if (!tokenRecord) {
    throw new Error('Invalid refresh token');
  }

  // Check if expired
  if (isTokenExpired(tokenRecord.expires_at)) {
    throw new Error('Refresh token has expired');
  }

  // Generate new token pair
  const payload = {
    id: tokenRecord.user_id
  };

  const accessToken = generateAccessToken({
    id: tokenRecord.user_id,
    // Note: In production, you should fetch fresh user data here
    // to ensure role/email changes are reflected
  });

  const refreshToken = generateRefreshToken(payload);

  // Save new refresh token
  const expiresAt = getExpiryDate(jwtConfig.refreshTokenExpiry);
  await refreshTokenModel.saveRefreshToken(tokenRecord.user_id, refreshToken, expiresAt);

  // Revoke old refresh token (rotation)
  await refreshTokenModel.revokeRefreshToken(oldRefreshToken, refreshToken);

  logger.info(`Refresh token rotated for user ${tokenRecord.user_id}`);

  return { accessToken, refreshToken };
};

/**
 * Generate email verification token
 * @param {number} userId - User ID
 * @returns {Promise<string>} Verification token
 */
const generateEmailVerificationToken = async (userId) => {
  const token = generateSecureToken();
  const expirySeconds = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY, 10) || 86400;
  const expiresAt = getTokenExpiry(expirySeconds);

  // Delete old verification tokens for this user
  await emailVerificationModel.deleteUserVerificationTokens(userId);

  // Create new token
  await emailVerificationModel.createVerificationToken(userId, token, expiresAt);

  return token;
};

/**
 * Verify email verification token
 * @param {string} token - Verification token
 * @returns {Promise<number>} User ID
 */
const verifyEmailToken = async (token) => {
  const tokenRecord = await emailVerificationModel.findVerificationToken(token);

  if (!tokenRecord) {
    throw new Error('Invalid verification token');
  }

  if (isTokenExpired(tokenRecord.expires_at)) {
    throw new Error('Verification token has expired');
  }

  // Mark token as used
  await emailVerificationModel.markTokenAsUsed(token);

  return tokenRecord.user_id;
};

/**
 * Generate password reset token
 * @param {number} userId - User ID
 * @returns {Promise<string>} Reset token
 */
const generatePasswordResetToken = async (userId) => {
  const token = generateSecureToken();
  const expirySeconds = parseInt(process.env.PASSWORD_RESET_EXPIRY, 10) || 3600;
  const expiresAt = getTokenExpiry(expirySeconds);

  // Delete old reset tokens for this user
  await passwordResetModel.deleteUserResetTokens(userId);

  // Create new token
  await passwordResetModel.createResetToken(userId, token, expiresAt);

  return token;
};

/**
 * Verify password reset token
 * @param {string} token - Reset token
 * @returns {Promise<number>} User ID
 */
const verifyPasswordResetToken = async (token) => {
  const tokenRecord = await passwordResetModel.findResetToken(token);

  if (!tokenRecord) {
    throw new Error('Invalid reset token');
  }

  if (isTokenExpired(tokenRecord.expires_at)) {
    throw new Error('Reset token has expired');
  }

  return tokenRecord.user_id;
};

/**
 * Mark password reset token as used
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success
 */
const markPasswordResetTokenUsed = async (token) => {
  await passwordResetModel.markTokenAsUsed(token);
  return true;
};

/**
 * Revoke all refresh tokens for user
 * @param {number} userId - User ID
 * @param {string} exceptToken - Token to keep (current session)
 * @returns {Promise<boolean>} Success
 */
const revokeAllUserTokens = async (userId, exceptToken = null) => {
  await refreshTokenModel.revokeAllUserTokens(userId, exceptToken);
  logger.info(`All refresh tokens revoked for user ${userId}`);
  return true;
};

module.exports = {
  generateTokenPair,
  refreshAccessToken,
  generateEmailVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  markPasswordResetTokenUsed,
  revokeAllUserTokens
};
