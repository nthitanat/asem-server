const { errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Role-based access control middleware factory
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated (should be used after authenticateToken)
    if (!req.user) {
      logger.warn('Role check failed: No user in request');
      return errorResponse(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Role check failed: User ${req.user.username} (${req.user.role}) attempted to access route requiring ${allowedRoles.join(' or ')}`);
      return errorResponse(
        res, 
        'Insufficient permissions', 
        403, 
        'FORBIDDEN'
      );
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Check if user is admin or moderator
 */
const requireAdminOrModerator = requireRole(['admin', 'moderator']);

/**
 * Check if user is accessing their own resource or is admin/moderator
 * @param {string} paramName - Name of route parameter containing user ID (default: 'id')
 */
const requireOwnerOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    const resourceUserId = parseInt(req.params[paramName], 10);
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    // Allow if user is admin, moderator, or accessing their own resource
    if (userRole === 'admin' || userRole === 'moderator' || resourceUserId === currentUserId) {
      next();
    } else {
      logger.warn(`Access denied: User ${req.user.username} attempted to access resource belonging to user ID ${resourceUserId}`);
      return errorResponse(
        res, 
        'Access denied', 
        403, 
        'FORBIDDEN'
      );
    }
  };
};

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrModerator,
  requireOwnerOrAdmin
};
