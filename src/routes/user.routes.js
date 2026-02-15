const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireEmailVerified } = require('../middleware/emailVerified.middleware');
const { requireRole, requireOwnerOrAdmin } = require('../middleware/role.middleware');
const {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  paginationQuerySchema,
  deleteQuerySchema
} = require('../validators/user.validator');

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin and moderator only)
router.get(
  '/',
  requireEmailVerified,
  requireRole(['admin', 'moderator']),
  validate(paginationQuerySchema, 'query'),
  userController.getAllUsers
);

// Create user (admin only)
router.post(
  '/',
  requireEmailVerified,
  requireRole(['admin']),
  validate(createUserSchema, 'body'),
  userController.createUser
);

// Get user by ID (admin, moderator, or self)
router.get(
  '/:id',
  requireEmailVerified,
  validate(userIdParamSchema, 'params'),
  requireOwnerOrAdmin('id'),
  userController.getUserById
);

// Update user (admin, moderator, or self)
router.put(
  '/:id',
  requireEmailVerified,
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  requireOwnerOrAdmin('id'),
  userController.updateUser
);

// Delete user - soft or hard (admin only)
router.delete(
  '/:id',
  requireEmailVerified,
  requireRole(['admin']),
  validate(userIdParamSchema, 'params'),
  validate(deleteQuerySchema, 'query'),
  userController.deleteUser
);

// Restore soft-deleted user (admin only)
router.post(
  '/:id/restore',
  requireEmailVerified,
  requireRole(['admin']),
  validate(userIdParamSchema, 'params'),
  userController.restoreUser
);

module.exports = router;
