const userModel = require('../models/user.model');
const logger = require('../utils/logger.util');

/**
 * Get all users with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object>} { users, total, page, limit }
 */
const getAllUsers = async (page = 1, limit = 20, includeDeleted = false) => {
  const users = await userModel.getAllUsers(page, limit, includeDeleted);
  const total = await userModel.countUsers(includeDeleted);

  return {
    users,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
};

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object>} User object
 */
const getUserById = async (id) => {
  const user = await userModel.findUserById(id);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Create new user (admin action)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData) => {
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

  const user = await userModel.createUser(userData);
  logger.info(`User created by admin: ${user.username}`);

  return user;
};

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (id, updates) => {
  const user = await userModel.findUserById(id);

  if (!user) {
    throw new Error('User not found');
  }

  // Check email uniqueness if being updated
  if (updates.email && updates.email !== user.email) {
    const existingEmail = await userModel.findUserByEmail(updates.email);
    if (existingEmail) {
      throw new Error('Email already in use');
    }
  }

  // Check username uniqueness if being updated
  if (updates.username && updates.username !== user.username) {
    const existingUsername = await userModel.findUserByUsername(updates.username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }
  }

  const updatedUser = await userModel.updateUser(id, updates);
  logger.info(`User updated: ${updatedUser.username}`);

  return updatedUser;
};

/**
 * Delete user (soft or hard)
 * @param {number} id - User ID
 * @param {boolean} hard - Permanent deletion
 * @returns {Promise<Object>} { message }
 */
const deleteUser = async (id, hard = false) => {
  const user = await userModel.findUserById(id, true);

  if (!user) {
    throw new Error('User not found');
  }

  if (hard) {
    await userModel.hardDeleteUser(id);
    logger.warn(`User permanently deleted: ${user.username} (ID: ${id})`);
    return { message: 'User permanently deleted' };
  } else {
    await userModel.softDeleteUser(id);
    logger.info(`User soft deleted: ${user.username} (ID: ${id})`);
    return { message: 'User deleted successfully' };
  }
};

/**
 * Restore soft-deleted user
 * @param {number} id - User ID
 * @returns {Promise<Object>} Restored user
 */
const restoreUser = async (id) => {
  const user = await userModel.findUserById(id, true);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.deleted_at) {
    throw new Error('User is not deleted');
  }

  const restoredUser = await userModel.restoreUser(id);
  logger.info(`User restored: ${restoredUser.username}`);

  return restoredUser;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser
};
