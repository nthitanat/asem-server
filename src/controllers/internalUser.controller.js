const internalUserService = require('../services/internalUser.service');
const { successResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Return email + name list for users matching optional query filters.
 * GET /internal/v1/users/emails
 */
const getUserEmails = asyncHandler(async (req, res) => {
  // req.query has already been validated and coerced by validate middleware
  const entries = await internalUserService.getUserEmails(req.query);
  return successResponse(res, { entries }, 'User emails retrieved successfully');
});

module.exports = {
  getUserEmails
};
