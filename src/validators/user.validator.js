const Joi = require('joi');

/**
 * Create user validation schema
 */
const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .max(100)
    .optional(),
  
  lastName: Joi.string()
    .max(100)
    .optional(),
  
  bestContactEmail: Joi.string()
    .email()
    .optional(),
  
  institution: Joi.string()
    .max(255)
    .optional(),
  
  department: Joi.string()
    .max(255)
    .optional(),
  
  areasOfExpertise: Joi.string()
    .max(1000)
    .optional(),
  
  country: Joi.string()
    .max(100)
    .optional(),
  
  researchNetwork: Joi.string()
    .max(255)
    .optional(),
  
  fieldOfStudy: Joi.string()
    .max(255)
    .optional(),
  
  role: Joi.string()
    .valid('admin', 'moderator', 'user')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, moderator, user'
    })
});

/**
 * Update user validation schema
 */
const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters'
    }),
  
  firstName: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  lastName: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  bestContactEmail: Joi.string()
    .email()
    .optional()
    .allow(''),
  
  institution: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  
  department: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  
  areasOfExpertise: Joi.string()
    .max(1000)
    .optional()
    .allow(''),
  
  country: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  researchNetwork: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  
  fieldOfStudy: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  
  role: Joi.string()
    .valid('admin', 'moderator', 'user')
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, moderator, user'
    }),
  
  isActive: Joi.boolean()
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * User ID parameter validation
 */
const userIdParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required'
    })
});

/**
 * Pagination query validation
 */
const paginationQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
  
  includeDeleted: Joi.boolean()
    .optional()
    .default(false)
});

/**
 * Delete query validation
 */
const deleteQuerySchema = Joi.object({
  hard: Joi.boolean()
    .optional()
    .default(false)
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  paginationQuerySchema,
  deleteQuerySchema
};
