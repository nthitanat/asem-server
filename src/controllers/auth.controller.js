const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Register new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  
  return successResponse(res, result, result.message, 201);
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  
  return successResponse(res, result, 'Login successful');
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  
  return successResponse(res, result, 'Token refreshed successfully');
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  
  return successResponse(res, null, 'Logged out successfully');
});

/**
 * Verify email with token
 * GET /api/v1/auth/verify-email?token=xxx
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const result = await authService.verifyEmail(token);
  
  return successResponse(res, result, result.message);
});

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerification(email);
  
  return successResponse(res, null, result.message);
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  
  return successResponse(res, null, result.message);
});

/**
 * Verify reset token
 * GET /api/v1/auth/verify-reset-token?token=xxx
 */
const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const result = await authService.verifyResetToken(token);
  
  if (result.valid) {
    return successResponse(res, result, 'Token is valid');
  } else {
    return errorResponse(res, result.message, 400, 'INVALID_TOKEN');
  }
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  
  return successResponse(res, null, result.message);
});

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  // Get current refresh token from header or body
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
  
  const result = await authService.changePassword(userId, currentPassword, newPassword, refreshToken);
  
  return successResponse(res, null, result.message);
});

/**
 * Get current user info
 * GET /api/v1/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return successResponse(res, { user: req.user }, 'User data retrieved');
});

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
  changePassword,
  getCurrentUser
};
