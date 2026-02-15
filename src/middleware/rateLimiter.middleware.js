const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response.util');

/**
 * General rate limiter for API routes
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
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
