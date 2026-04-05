const discussionModel = require('../models/discussion.model');
const announcementModel = require('../models/announcement.model');
const logger = require('../utils/logger.util');

/**
 * Create a new discussion under an announcement
 * @param {Object} data - { announcementId, parentId?, authorId, content }
 * @returns {Promise<Object>}
 */
const createDiscussion = async (data) => {
  const announcement = await announcementModel.findAnnouncementById(data.announcementId);
  if (!announcement) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }

  if (announcement.discussionEnabled === false) {
    const error = new Error('Discussions are disabled for this announcement');
    error.statusCode = 403;
    throw error;
  }

  if (data.parentId) {
    const parent = await discussionModel.findDiscussionById(data.parentId);
    if (!parent) {
      const error = new Error('Parent discussion not found');
      error.statusCode = 404;
      throw error;
    }
    if (parent.announcementId !== data.announcementId) {
      const error = new Error('Parent discussion does not belong to this announcement');
      error.statusCode = 400;
      throw error;
    }
  }

  const discussion = await discussionModel.createDiscussion(data);
  logger.info(`Discussion created: ${discussion.id} under announcement ${data.announcementId}`);
  return discussion;
};

/**
 * Get discussion by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
const getDiscussionById = async (id) => {
  const discussion = await discussionModel.findDiscussionById(id);
  if (!discussion) {
    const error = new Error('Discussion not found');
    error.statusCode = 404;
    throw error;
  }
  return discussion;
};

/**
 * Update a discussion (author or admin/moderator only)
 * @param {number} id
 * @param {Object} updates - { content }
 * @param {Object} currentUser - req.user
 * @returns {Promise<Object>}
 */
const updateDiscussion = async (id, updates, currentUser) => {
  const discussion = await discussionModel.findDiscussionById(id);
  if (!discussion) {
    const error = new Error('Discussion not found');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = discussion.authorId === currentUser.id;
  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'moderator';

  if (!isOwner && !isPrivileged) {
    const error = new Error('You can only edit your own discussions');
    error.statusCode = 403;
    throw error;
  }

  const updated = await discussionModel.updateDiscussion(id, updates);
  logger.info(`Discussion updated: ${id}`);
  return updated;
};

/**
 * Soft delete a discussion (author or admin/moderator only)
 * @param {number} id
 * @param {Object} currentUser - req.user
 * @returns {Promise<void>}
 */
const deleteDiscussion = async (id, currentUser) => {
  const discussion = await discussionModel.findDiscussionById(id);
  if (!discussion) {
    const error = new Error('Discussion not found');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = discussion.authorId === currentUser.id;
  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'moderator';

  if (!isOwner && !isPrivileged) {
    const error = new Error('You can only delete your own discussions');
    error.statusCode = 403;
    throw error;
  }

  await discussionModel.softDeleteDiscussion(id);
  logger.info(`Discussion soft deleted: ${id}`);
};

/**
 * List discussions for an announcement with pagination
 * @param {number} announcementId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Object>} { discussions, total, page, limit }
 */
const listDiscussions = async (announcementId, page = 1, limit = 20) => {
  const announcement = await announcementModel.findAnnouncementById(announcementId);
  if (!announcement) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }

  const discussions = await discussionModel.getDiscussionsByAnnouncementId(announcementId, page, limit);
  const total = await discussionModel.countDiscussions(announcementId);

  return {
    discussions,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
};

module.exports = {
  createDiscussion,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  listDiscussions
};
