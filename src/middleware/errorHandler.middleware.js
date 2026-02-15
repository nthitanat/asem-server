const logger = require('../utils/logger.util');
const { errorResponse } = require('../utils/response.util');

/**
 * Global error handler middleware
 * Must be placed after all routes
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return errorResponse(res, 'Unauthorized access', 401, 'UNAUTHORIZED');
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Duplicate entry found', 409, 'DUPLICATE_ENTRY');
  }

  if (err.message.includes('Token')) {
    return errorResponse(res, err.message, 401, 'TOKEN_ERROR');
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return errorResponse(res, message, statusCode, 'INTERNAL_ERROR');
};

/**
 * Async error wrapper to catch async errors
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};
