const express = require('express');
const router = express.Router();
const internalUserController = require('../controllers/internalUser.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateInternalApiKey } = require('../middleware/auth.middleware');
const { userEmailsQuerySchema } = require('../validators/internalUser.validator');

// GET /internal/v1/users/emails
router.get(
  '/users/emails',
  authenticateInternalApiKey,
  validate(userEmailsQuerySchema, 'query'),
  internalUserController.getUserEmails
);

module.exports = router;
