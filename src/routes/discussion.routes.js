const express = require('express');
// mergeParams: true — inherits :announcementId from parent router
const router = express.Router({ mergeParams: true });
const discussionController = require('../controllers/discussion.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  announcementIdParamSchema,
  discussionIdParamSchema,
  createDiscussionSchema,
  updateDiscussionSchema,
  discussionQuerySchema
} = require('../validators/discussion.validator');

// List discussions for an announcement (public)
router.get(
  '/',
  validate(discussionQuerySchema, 'query'),
  discussionController.listDiscussions
);

// Get discussion by ID (public)
router.get(
  '/:id',
  validate(discussionIdParamSchema, 'params'),
  discussionController.getDiscussionById
);

// Create a discussion (authenticated)
router.post(
  '/',
  authenticateToken,
  validate(announcementIdParamSchema, 'params'),
  validate(createDiscussionSchema, 'body'),
  discussionController.createDiscussion
);

// Update a discussion (authenticated — ownership checked in service)
router.put(
  '/:id',
  authenticateToken,
  validate(discussionIdParamSchema, 'params'),
  validate(updateDiscussionSchema, 'body'),
  discussionController.updateDiscussion
);

// Delete a discussion (authenticated — ownership checked in service)
router.delete(
  '/:id',
  authenticateToken,
  validate(discussionIdParamSchema, 'params'),
  discussionController.deleteDiscussion
);

module.exports = router;
