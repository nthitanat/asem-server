const institutionService = require('../services/institution.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get all institutions with pagination
 * GET /api/v1/institutions
 */
const getAllInstitutions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await institutionService.getAllInstitutions(page, limit);
  return paginatedResponse(
    res,
    result.institutions,
    result.page,
    result.limit,
    result.total,
    'Institutions retrieved successfully'
  );
});

/**
 * Get institution by ID
 * GET /api/v1/institutions/:id
 */
const getInstitutionById = asyncHandler(async (req, res) => {
  const institution = await institutionService.getInstitutionById(
    parseInt(req.params.id, 10)
  );
  return successResponse(res, { institution }, 'Institution retrieved successfully');
});

/**
 * Create a new institution
 * POST /api/v1/institutions
 */
const createInstitution = asyncHandler(async (req, res) => {
  const institution = await institutionService.createInstitution(req.body);
  return successResponse(res, { institution }, 'Institution created successfully', 201);
});

/**
 * Update an institution
 * PUT /api/v1/institutions/:id
 */
const updateInstitution = asyncHandler(async (req, res) => {
  const institution = await institutionService.updateInstitution(
    parseInt(req.params.id, 10),
    req.body
  );
  return successResponse(res, { institution }, 'Institution updated successfully');
});

/**
 * Delete an institution
 * DELETE /api/v1/institutions/:id
 */
const deleteInstitution = asyncHandler(async (req, res) => {
  await institutionService.deleteInstitution(parseInt(req.params.id, 10));
  return successResponse(res, null, 'Institution deleted successfully');
});

module.exports = {
  getAllInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution
};
