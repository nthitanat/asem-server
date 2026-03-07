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

// All country routes require authentication
router.use(authenticateToken);

// Get all countries (any authenticated user)
router.get(
  '/',
  countryController.getAllCountries
);

// Get country by ID (any authenticated user)
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  countryController.getCountryById
);

// Create country (admin only)
router.post(
  '/',
  requireAdmin,
  validate(createCountrySchema, 'body'),
  countryController.createCountry
);

// Update country (admin only)
router.put(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  validate(updateCountrySchema, 'body'),
  countryController.updateCountry
);

// Delete country (admin only)
router.delete(
  '/:id',
  requireAdmin,
  validate(idParamSchema, 'params'),
  countryController.deleteCountry
);

module.exports = router;
