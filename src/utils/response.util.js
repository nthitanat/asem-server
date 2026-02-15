/**
 * Standardized API response utilities
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code
 * @param {Array} details - Error details
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code
    }
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Data items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 */
const paginatedResponse = (res, items, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  });
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 */
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse
};
