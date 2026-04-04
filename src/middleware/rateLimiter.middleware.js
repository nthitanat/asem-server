const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response.util');

/**
 * General rate limiter for API routes
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many requests from this IP, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
});

/**
 * Stricter rate limiter for authentication routes
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many authentication attempts, please try again later',
      429,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  }
});

/**
 * Very strict rate limiter for password reset/forgot password
 */
const passwordResetLimiter = rateLimit({
  windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS, 10) || 3,
  message: 'Too many password reset attempts, please try again later',
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many password reset attempts, please try again in an hour',
      429,
      'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    );
  }
});

/**
 * Rate limiter for email verification resend
 */
const emailVerificationLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS, 10) || 5,
  message: 'Too many verification email requests, please try again later',
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many verification email requests, please try again later',
      429,
      'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED'
    );
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
};
