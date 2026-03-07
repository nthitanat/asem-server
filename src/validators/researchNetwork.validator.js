const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.positive': 'ID must be a positive number',
    'any.required': 'ID is required'
  })
});

const createResearchNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  })
});

const updateResearchNetworkSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  })
});

module.exports = {
  idParamSchema,
  createResearchNetworkSchema,
  updateResearchNetworkSchema
};
