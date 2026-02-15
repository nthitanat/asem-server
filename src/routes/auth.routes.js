const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
} = require('../middleware/rateLimiter.middleware');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  emailSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyTokenQuerySchema
} = require('../validators/auth.validator');

// Public routes
router.post(
  '/register',
  authLimiter,
  validate(registerSchema, 'body'),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema, 'body'),
  authController.login
);

router.post(
  '/refresh-token',
  validate(refreshTokenSchema, 'body'),
  authController.refreshToken
);

router.get(
  '/verify-email',
  validate(verifyTokenQuerySchema, 'query'),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  emailVerificationLimiter,
  validate(emailSchema, 'body'),
  authController.resendVerification
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(emailSchema, 'body'),
  authController.forgotPassword
);

router.get(
  '/verify-reset-token',
  validate(verifyTokenQuerySchema, 'query'),
  authController.verifyResetToken
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema, 'body'),
  authController.resetPassword
);

// Protected routes (require authentication)
router.post(
  '/logout',
  authenticateToken,
  validate(refreshTokenSchema, 'body'),
  authController.logout
);

router.post(
  '/change-password',
  authenticateToken,
  validate(changePasswordSchema, 'body'),
  authController.changePassword
);

router.get(
  '/me',
  authenticateToken,
  authController.getCurrentUser
);

module.exports = router;
