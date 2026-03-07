const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.positive': 'ID must be a positive number',
    'any.required': 'ID is required'
  })
});

const createInstitutionSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  }),
  countryId: Joi.number().integer().positive().required().messages({
    'number.base': 'Country ID must be a number',
    'number.positive': 'Country ID must be a positive number',
    'any.required': 'Country ID is required'
  })
});

const updateInstitutionSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters'
  }),
  countryId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Country ID must be a number',
    'number.positive': 'Country ID must be a positive number'
  })
}).min(1).messages({
  'object.min': 'At least one field (name or countryId) must be provided'
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  idParamSchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  paginationQuerySchema
};
