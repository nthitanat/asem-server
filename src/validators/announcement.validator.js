const Joi = require('joi');

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.positive': 'ID must be a positive number',
    'any.required': 'ID is required'
  })
});

const createAnnouncementSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Title must not be empty',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().min(1).required().messages({
    'string.min': 'Content must not be empty',
    'any.required': 'Content is required'
  }),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft').messages({
    'any.only': 'Status must be draft, published, or archived'
  }),
  researchNetworkId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Research network ID must be a number',
    'number.positive': 'Research network ID must be a positive number'
  }),
  isPinned: Joi.boolean().default(false),
  discussionEnabled: Joi.boolean().default(true),
  iframeUrl: Joi.string().uri().max(2048).allow('', null).optional().messages({
    'string.uri': 'Iframe URL must be a valid URI',
    'string.max': 'Iframe URL must not exceed 2048 characters'
  })
});

const updateAnnouncementSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Title must not be empty',
    'string.max': 'Title must not exceed 255 characters'
  }),
  content: Joi.string().min(1).optional().messages({
    'string.min': 'Content must not be empty'
  }),
  status: Joi.string().valid('draft', 'published', 'archived').optional().messages({
    'any.only': 'Status must be draft, published, or archived'
  }),
  researchNetworkId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Research network ID must be a number',
    'number.positive': 'Research network ID must be a positive number'
  }),
  isPinned: Joi.boolean().optional(),
  discussionEnabled: Joi.boolean().optional(),
  iframeUrl: Joi.string().uri().max(2048).allow('', null).optional().messages({
    'string.uri': 'Iframe URL must be a valid URI',
    'string.max': 'Iframe URL must not exceed 2048 characters'
  })
});

const announcementQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('draft', 'published', 'archived').optional(),
  researchNetworkId: Joi.number().integer().positive().optional()
});

module.exports = {
  idParamSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementQuerySchema
};
