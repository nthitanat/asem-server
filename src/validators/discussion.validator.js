const Joi = require('joi');

const announcementIdParamSchema = Joi.object({
  announcementId: Joi.number().integer().positive().required().messages({
    'number.base': 'Announcement ID must be a number',
    'number.positive': 'Announcement ID must be a positive number',
    'any.required': 'Announcement ID is required'
  })
});

const discussionIdParamSchema = Joi.object({
  announcementId: Joi.number().integer().positive().required().messages({
    'number.base': 'Announcement ID must be a number',
    'number.positive': 'Announcement ID must be a positive number',
    'any.required': 'Announcement ID is required'
  }),
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Discussion ID must be a number',
    'number.positive': 'Discussion ID must be a positive number',
    'any.required': 'Discussion ID is required'
  })
});

const createDiscussionSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    'string.min': 'Content must not be empty',
    'string.max': 'Content must not exceed 5000 characters',
    'any.required': 'Content is required'
  }),
  parentId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Parent ID must be a number',
    'number.positive': 'Parent ID must be a positive number'
  })
});

const updateDiscussionSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    'string.min': 'Content must not be empty',
    'string.max': 'Content must not exceed 5000 characters',
    'any.required': 'Content is required'
  })
});

const discussionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

module.exports = {
  announcementIdParamSchema,
  discussionIdParamSchema,
  createDiscussionSchema,
  updateDiscussionSchema,
  discussionQuerySchema
};
