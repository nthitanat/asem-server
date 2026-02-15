const { validationErrorResponse } = require('../utils/response.util');
const { formatJoiErrors } = require('../utils/validation.util');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Property to validate ('body', 'query', 'params')
 * @returns {Function} Middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Show all errors
      stripUnknown: true // Remove unknown properties
    });

    if (error) {
      const errors = formatJoiErrors(error);
      return validationErrorResponse(res, errors);
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = {
  validate
};
