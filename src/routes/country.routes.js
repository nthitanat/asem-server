const express = require('express');
const router = express.Router();
const countryController = require('../controllers/country.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const {
  idParamSchema,
  createCountrySchema,
  updateCountrySchema
} = require('../validators/country.validator');

// Get all countries (public)
router.get(
  '/',
  countryController.getAllCountries
);

// Get country by ID (any authenticated user)
router.get(
  '/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  countryController.getCountryById
);

// Create country (admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  validate(createCountrySchema, 'body'),
  countryController.createCountry
);

// Update country (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateCountrySchema, 'body'),
  countryController.updateCountry
);

// Delete country (admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validate(idParamSchema, 'params'),
  countryController.deleteCountry
);

module.exports = router;
