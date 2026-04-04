const discussionService = require('../services/discussion.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * List discussions for an announcement
 * GET /api/v1/announcements/:announcementId/discussions
 */
const listDiscussions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const announcementId = parseInt(req.params.announcementId, 10);
  const result = await discussionService.listDiscussions(announcementId, page, limit);
  return paginatedResponse(
    res,
    result.discussions,
    result.page,
    result.limit,
    result.total,
    'Discussions retrieved successfully'
  );
});

/**
 * Get discussion by ID
 * GET /api/v1/announcements/:announcementId/discussions/:id
 */
const getDiscussionById = asyncHandler(async (req, res) => {
  const discussion = await discussionService.getDiscussionById(parseInt(req.params.id, 10));
  return successResponse(res, { discussion }, 'Discussion retrieved successfully');
});

/**
 * Create a new discussion
 * POST /api/v1/announcements/:announcementId/discussions
 */
const createDiscussion = asyncHandler(async (req, res) => {
  const discussion = await discussionService.createDiscussion({
    ...req.body,
    announcementId: parseInt(req.params.announcementId, 10),
    authorId: req.user.id
  });
  return successResponse(res, { discussion }, 'Discussion created successfully', 201);
});

/**
 * Update a discussion
 * PUT /api/v1/announcements/:announcementId/discussions/:id
 */
const updateDiscussion = asyncHandler(async (req, res) => {
  const discussion = await discussionService.updateDiscussion(
    parseInt(req.params.id, 10),
    req.body,
    req.user
  );
  return successResponse(res, { discussion }, 'Discussion updated successfully');
});

/**
 * Delete a discussion
 * DELETE /api/v1/announcements/:announcementId/discussions/:id
 */
const deleteDiscussion = asyncHandler(async (req, res) => {
  await discussionService.deleteDiscussion(parseInt(req.params.id, 10), req.user);
  return successResponse(res, null, 'Discussion deleted successfully');
});

module.exports = {
  listDiscussions,
  getDiscussionById,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion
};
