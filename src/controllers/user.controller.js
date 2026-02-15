const userService = require('../services/user.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get all users with pagination
 * GET /api/v1/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, includeDeleted } = req.query;
  
  const result = await userService.getAllUsers(page, limit, includeDeleted);
  
  return paginatedResponse(
    res,
    result.users,
    result.page,
    result.limit,
    result.total,
    'Users retrieved successfully'
  );
});

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(parseInt(id, 10));
  
  return successResponse(res, { user }, 'User retrieved successfully');
});

/**
 * Create new user (admin action)
 * POST /api/v1/users
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  
  return successResponse(res, { user }, 'User created successfully', 201);
});

/**
 * Update user
 * PUT /api/v1/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.updateUser(parseInt(id, 10), req.body);
  
  return successResponse(res, { user }, 'User updated successfully');
});

/**
 * Delete user (soft or hard)
 * DELETE /api/v1/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;
  
  const result = await userService.deleteUser(parseInt(id, 10), hard === 'true');
  
  return successResponse(res, null, result.message);
});

/**
 * Restore soft-deleted user
 * POST /api/v1/users/:id/restore
 */
const restoreUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.restoreUser(parseInt(id, 10));
  
  return successResponse(res, { user }, 'User restored successfully');
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser
};
