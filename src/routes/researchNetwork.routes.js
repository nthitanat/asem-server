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

// All research network routes require authentication
router.use(authenticateToken);

// Get all research networks (any authenticated user)
router.get(
  '/',
  researchNetworkController.getAllResearchNetworks
);

// Get research network by ID (any authenticated user)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  researchNetworkController.getResearchNetworkById
);

// Create research network (admin only)
router.post(
  '/',
  requireAdmin,
  validate(createResearchNetworkSchema, 'body'),
  researchNetworkController.createResearchNetwork
);

// Update research network (admin only)
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateResearchNetworkSchema, 'body'),
  researchNetworkController.updateResearchNetwork
);

// Delete research network (admin only)
router.delete(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  researchNetworkController.deleteResearchNetwork
);

module.exports = router;
