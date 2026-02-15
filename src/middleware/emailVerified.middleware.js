const { errorResponse } = require('../utils/response.util');
const emailConfig = require('../config/email.config');
const logger = require('../utils/logger.util');

/**
 * Middleware to check if user's email is verified
 * Should be used after authenticateToken
 */
const requireEmailVerified = (req, res, next) => {
  // Skip verification check if email verification is disabled
  if (!emailConfig.verification.enabled) {
    return next();
  }

  if (!req.user) {
    logger.warn('Email verification check failed: No user in request');
    return errorResponse(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
  }

  if (!req.user.emailVerified) {
    logger.warn(`Email verification required: User ${req.user.username} (${req.user.email}) has not verified their email`);
    return errorResponse(
      res,
      'Email verification required. Please verify your email to access this resource.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  next();
};

module.exports = {
  requireEmailVerified
};
