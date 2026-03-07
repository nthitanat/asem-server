const express = require('express');
const router = express.Router();
const institutionController = require('../controllers/institution.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const {
  idParamSchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  paginationQuerySchema
} = require('../validators/institution.validator');

// Get all institutions with pagination (public)
router.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  institutionController.getAllInstitutions
);

// Get institution by ID (any authenticated user)
router.get(
  '/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  institutionController.getInstitutionById
);

// Create institution (admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  validate(createInstitutionSchema, 'body'),
  institutionController.createInstitution
);

// Update institution (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateInstitutionSchema, 'body'),
  institutionController.updateInstitution
);

// Delete institution (admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  institutionController.deleteInstitution
);

module.exports = router;
