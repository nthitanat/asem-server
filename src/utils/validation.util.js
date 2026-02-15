/**
 * Validation utility functions
 */

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePasswordStrength = (password) => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true, message: 'Password is strong' };
};

/**
 * Sanitize user input (remove dangerous characters)
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, ''); // Remove < and > to prevent XSS
};

/**
 * Validate username format
 * @param {string} username - Username
 * @returns {boolean} True if valid
 */
const isValidUsername = (username) => {
  // Alphanumeric, underscore, hyphen, 3-30 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * Format validation errors from Joi
 * @param {Object} joiError - Joi validation error
 * @returns {Array} Array of formatted errors
 */
const formatJoiErrors = (joiError) => {
  return joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
};

module.exports = {
  isValidEmail,
  validatePasswordStrength,
  sanitizeInput,
  isValidUsername,
  formatJoiErrors
};
