const researchNetworkService = require('../services/researchNetwork.service');
const { successResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get all research networks
 * GET /api/v1/research-networks
 */
const getAllResearchNetworks = asyncHandler(async (req, res) => {
  const researchNetworks = await researchNetworkService.getAllResearchNetworks();
  return successResponse(res, { researchNetworks }, 'Research networks retrieved successfully');
});

/**
 * Get research network by ID
 * GET /api/v1/research-networks/:id
 */
const getResearchNetworkById = asyncHandler(async (req, res) => {
  const researchNetwork = await researchNetworkService.getResearchNetworkById(
    parseInt(req.params.id, 10)
  );
  return successResponse(res, { researchNetwork }, 'Research network retrieved successfully');
});

/**
 * Create a new research network
 * POST /api/v1/research-networks
 */
const createResearchNetwork = asyncHandler(async (req, res) => {
  const researchNetwork = await researchNetworkService.createResearchNetwork(req.body);
  return successResponse(res, { researchNetwork }, 'Research network created successfully', 201);
});

/**
 * Update a research network
 * PUT /api/v1/research-networks/:id
 */
const updateResearchNetwork = asyncHandler(async (req, res) => {
  const researchNetwork = await researchNetworkService.updateResearchNetwork(
    parseInt(req.params.id, 10),
    req.body
  );
  return successResponse(res, { researchNetwork }, 'Research network updated successfully');
});

/**
 * Delete a research network
 * DELETE /api/v1/research-networks/:id
 */
const deleteResearchNetwork = asyncHandler(async (req, res) => {
  await researchNetworkService.deleteResearchNetwork(parseInt(req.params.id, 10));
  return successResponse(res, null, 'Research network deleted successfully');
});

module.exports = {
  getAllResearchNetworks,
  getResearchNetworkById,
  createResearchNetwork,
  updateResearchNetwork,
  deleteResearchNetwork
};
