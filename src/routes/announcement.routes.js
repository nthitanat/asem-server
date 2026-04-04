const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdminOrModerator } = require('../middleware/role.middleware');
const { uploadFields, processImages } = require('../middleware/upload.middleware');
const {
  idParamSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementQuerySchema
} = require('../validators/announcement.validator');

// Get all announcements (public)
router.get(
  '/',
  validate(announcementQuerySchema, 'query'),
  announcementController.listAnnouncements
);

// Get announcement by ID (public)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  announcementController.getAnnouncementById
);

// Create announcement (admin or moderator only)
router.post(
  '/',
  authenticateToken,
  requireAdminOrModerator,
  uploadFields,
  processImages,
  validate(createAnnouncementSchema, 'body'),
  announcementController.createAnnouncement
);

// Update announcement (admin or moderator only)
// Params validated before uploadFields so req.params.id is parsed and available
router.put(
  '/:id',
  authenticateToken,
  requireAdminOrModerator,
  validate(idParamSchema, 'params'),
  uploadFields,
  processImages,
  validate(updateAnnouncementSchema, 'body'),
  announcementController.updateAnnouncement
);

// Delete announcement (admin or moderator only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdminOrModerator,
  validate(idParamSchema, 'params'),
  announcementController.deleteAnnouncement
);

module.exports = router;
