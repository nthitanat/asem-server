const announcementService = require('../services/announcement.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * List announcements with pagination
 * GET /api/v1/announcements
 */
const listAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit, status, researchNetworkId } = req.query;
  const result = await announcementService.listAnnouncements(page, limit, { status, researchNetworkId });
  return paginatedResponse(
    res,
    result.announcements,
    result.page,
    result.limit,
    result.total,
    'Announcements retrieved successfully'
  );
});

/**
 * Get announcement by ID
 * GET /api/v1/announcements/:id
 */
const getAnnouncementById = asyncHandler(async (req, res) => {
  const announcement = await announcementService.getAnnouncementById(parseInt(req.params.id, 10));
  return successResponse(res, { announcement }, 'Announcement retrieved successfully');
});

/**
 * Create a new announcement
 * POST /api/v1/announcements
 */
const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.createAnnouncement({
    ...req.body,
    authorId: req.user.id,
    tempImagePaths: req.tempImagePaths || {}
  });
  return successResponse(res, { announcement }, 'Announcement created successfully', 201);
});

/**
 * Update an announcement
 * PUT /api/v1/announcements/:id
 */
const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await announcementService.updateAnnouncement(
    parseInt(req.params.id, 10),
    {
      ...req.body,
      tempImagePaths: req.tempImagePaths || {}
    }
  );
  return successResponse(res, { announcement }, 'Announcement updated successfully');
});

/**
 * Soft delete an announcement
 * DELETE /api/v1/announcements/:id
 */
const deleteAnnouncement = asyncHandler(async (req, res) => {
  await announcementService.deleteAnnouncement(parseInt(req.params.id, 10));
  return successResponse(res, null, 'Announcement deleted successfully');
});

module.exports = {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
