const express = require('express');
const router = express.Router();
const researchNetworkController = require('../controllers/researchNetwork.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const {
  idParamSchema,
  createResearchNetworkSchema,
  updateResearchNetworkSchema
} = require('../validators/researchNetwork.validator');

// Get all research networks (public)
router.get(
  '/',
  researchNetworkController.getAllResearchNetworks
);

// Get research network by ID (any authenticated user)
router.get(
  '/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  researchNetworkController.getResearchNetworkById
);

// Create research network (admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  validate(createResearchNetworkSchema, 'body'),
  researchNetworkController.createResearchNetwork
);

// Update research network (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateResearchNetworkSchema, 'body'),
  researchNetworkController.updateResearchNetwork
);

// Delete research network (admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  researchNetworkController.deleteResearchNetwork
);

module.exports = router;
