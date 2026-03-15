const countryService = require('../services/country.service');
const { successResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get all countries
 * GET /api/v1/countries
 */
const getAllCountries = asyncHandler(async (req, res) => {
  const countries = await countryService.getAllCountries();
  return successResponse(res, { countries }, 'Countries retrieved successfully');
});

/**
 * Get country by ID
 * GET /api/v1/countries/:id
 */
const getCountryById = asyncHandler(async (req, res) => {
  const country = await countryService.getCountryById(parseInt(req.params.id, 10));
  return successResponse(res, { country }, 'Country retrieved successfully');
});

/**
 * Create a new country
 * POST /api/v1/countries
 */
const createCountry = asyncHandler(async (req, res) => {
  const country = await countryService.createCountry(req.body);
  return successResponse(res, { country }, 'Country created successfully', 201);
});

/**
 * Update a country
 * PUT /api/v1/countries/:id
 */
const updateCountry = asyncHandler(async (req, res) => {
  const country = await countryService.updateCountry(
    parseInt(req.params.id, 10),
    req.body
  );
  return successResponse(res, { country }, 'Country updated successfully');
});

/**
 * Delete a country
 * DELETE /api/v1/countries/:id
 */
const deleteCountry = asyncHandler(async (req, res) => {
  await countryService.deleteCountry(parseInt(req.params.id, 10));
  return successResponse(res, null, 'Country deleted successfully');
});

module.exports = {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry
};
