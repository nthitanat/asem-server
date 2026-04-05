const fs = require('fs');
const path = require('path');
const { beginTransaction, commit, rollback } = require('../utils/db.util');
const announcementModel = require('../models/announcement.model');
const researchNetworkModel = require('../models/researchNetwork.model');
const logger = require('../utils/logger.util');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/announcements');

/**
 * Build final image URL from announcement ID and field name
 * @param {number} id
 * @param {string} field - 'thumbnail' | 'banner' | 'photo'
 * @returns {string}
 */
const buildImageUrl = (id, field) => `/uploads/announcements/${id}/${field}.webp`;

/**
 * Build final PDF URL from announcement ID
 * @param {number} id
 * @returns {string}
 */
const buildPdfUrl = (id) => `/uploads/announcements/${id}/document.pdf`;

/**
 * Move image/PDF files from temp directory to final announcement directory.
 * Returns an object with URL keys to merge into announcement data.
 * @param {number} announcementId
 * @param {Object} tempImagePaths - { thumbnailPath?, bannerPath?, photoPath?, pdfPath? }
 * @returns {Object} { thumbnailUrl?, bannerUrl?, photoUrl?, pdfUrl? }
 */
const moveImages = (announcementId, tempImagePaths) => {
  const destDir = path.join(UPLOADS_DIR, String(announcementId));
  fs.mkdirSync(destDir, { recursive: true });

  const imageUrls = {};

  const fieldMap = [
    { pathKey: 'thumbnailPath', urlKey: 'thumbnailUrl', filename: 'thumbnail', ext: '.webp' },
    { pathKey: 'bannerPath', urlKey: 'bannerUrl', filename: 'banner', ext: '.webp' },
    { pathKey: 'photoPath', urlKey: 'photoUrl', filename: 'photo', ext: '.webp' },
    { pathKey: 'pdfPath', urlKey: 'pdfUrl', filename: 'document', ext: '.pdf' }
  ];

  for (const { pathKey, urlKey, filename, ext } of fieldMap) {
    if (tempImagePaths[pathKey]) {
      const destPath = path.join(destDir, `${filename}${ext}`);
      fs.renameSync(tempImagePaths[pathKey], destPath);
      if (ext === '.pdf') {
        imageUrls[urlKey] = buildPdfUrl(announcementId);
      } else {
        imageUrls[urlKey] = buildImageUrl(announcementId, filename);
      }
    }
  }

  // Clean up empty temp parent directory
  const tmpDir = path.dirname(Object.values(tempImagePaths).find(Boolean) || '');
  if (tmpDir && tmpDir !== '.') {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }

  return imageUrls;
};

/**
 * Create a new announcement with optional images
 * @param {Object} data - { title, content, status, researchNetworkId, isPinned, authorId, tempImagePaths }
 * @returns {Promise<Object>} Created announcement (camelCase)
 */
const createAnnouncement = async (data) => {
  const { tempImagePaths = {}, ...announcementData } = data;

  if (announcementData.researchNetworkId) {
    const network = await researchNetworkModel.findResearchNetworkById(announcementData.researchNetworkId);
    if (!network) {
      const error = new Error('Research network not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const connection = await beginTransaction();
  try {
    const insertId = await announcementModel.createAnnouncement(announcementData);

    const imageUrls = Object.keys(tempImagePaths).length > 0
      ? moveImages(insertId, tempImagePaths)
      : {};

    if (Object.keys(imageUrls).length > 0) {
      await announcementModel.updateAnnouncement(insertId, imageUrls);
    }

    await commit(connection);
    logger.info(`Announcement created: ${insertId} by user ${announcementData.authorId}`);
    return announcementModel.findAnnouncementById(insertId);
  } catch (err) {
    await rollback(connection);

    // Clean up temp files on failure
    const tempDir = path.dirname(Object.values(tempImagePaths).find(Boolean) || '');
    if (tempDir && tempDir !== '.') {
      fs.rm(tempDir, { recursive: true, force: true }, () => {});
    }

    throw err;
  }
};

/**
 * Get announcement by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
const getAnnouncementById = async (id) => {
  const announcement = await announcementModel.findAnnouncementById(id);
  if (!announcement) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }
  return announcement;
};

/**
 * Update an announcement
 * @param {number} id
 * @param {Object} data - { ...updateFields, tempImagePaths? }
 * @returns {Promise<Object>}
 */
const updateAnnouncement = async (id, data) => {
  const { tempImagePaths = {}, ...updates } = data;

  const existing = await announcementModel.findAnnouncementById(id);
  if (!existing) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }

  if (updates.researchNetworkId && updates.researchNetworkId !== existing.researchNetworkId) {
    const network = await researchNetworkModel.findResearchNetworkById(updates.researchNetworkId);
    if (!network) {
      const error = new Error('Research network not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const imageUrls = Object.keys(tempImagePaths).length > 0
    ? moveImages(id, tempImagePaths)
    : {};

  const finalUpdates = { ...updates, ...imageUrls };
  const updated = await announcementModel.updateAnnouncement(id, finalUpdates);
  logger.info(`Announcement updated: ${id}`);
  return updated;
};

/**
 * Soft delete an announcement and remove its image directory
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteAnnouncement = async (id) => {
  const existing = await announcementModel.findAnnouncementById(id);
  if (!existing) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
  }

  await announcementModel.softDeleteAnnouncement(id);

  const imageDir = path.join(UPLOADS_DIR, String(id));
  fs.rm(imageDir, { recursive: true, force: true }, () => {});

  logger.info(`Announcement soft deleted: ${id}`);
};

/**
 * List announcements with pagination and filters
 * @param {number} page
 * @param {number} limit
 * @param {Object} filters
 * @returns {Promise<Object>} { announcements, total, page, limit }
 */
const listAnnouncements = async (page = 1, limit = 20, filters = {}) => {
  const announcements = await announcementModel.getAllAnnouncements(page, limit, filters);
  const total = await announcementModel.countAnnouncements(filters);

  return {
    announcements,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
};

module.exports = {
  createAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements
};
