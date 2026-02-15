const { verifyToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Authentication middleware - verify JWT access token
 * Extracts token from Authorization header and verifies it
 * Adds user data to req.user if valid
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return errorResponse(res, 'Access token is required', 401, 'TOKEN_REQUIRED');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Add user data to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      emailVerified: decoded.emailVerified
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed:', error.message);
    
    if (error.message === 'Token has expired') {
      return errorResponse(res, 'Access token has expired', 401, 'TOKEN_EXPIRED');
    }
    
    return errorResponse(res, 'Invalid access token', 401, 'INVALID_TOKEN');
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that have different behavior for authenticated users
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
        emailVerified: decoded.emailVerified
      };
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
