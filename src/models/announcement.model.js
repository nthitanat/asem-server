const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Find announcement by ID (includes author name)
 * @param {number} id
 * @param {boolean} includeDeleted
 * @returns {Promise<Object|null>} Announcement (camelCase) or null
 */
const findAnnouncementById = async (id, includeDeleted = false) => {
  let sql = `
    SELECT a.*,
           u.username AS author_username,
           u.first_name AS author_first_name,
           u.last_name AS author_last_name,
           rn.name AS research_network_name
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    LEFT JOIN research_networks rn ON a.research_network_id = rn.id
    WHERE a.id = ?
  `;

  if (!includeDeleted) {
    sql += ' AND a.deleted_at IS NULL';
  }

  const result = await queryOne(sql, [id]);
  return result ? toCamelCase(result) : null;
};

/**
 * Get all announcements with pagination and optional filters
 * @param {number} page
 * @param {number} limit
 * @param {Object} filters - { status?, researchNetworkId? }
 * @returns {Promise<Array>}
 */
const getAllAnnouncements = async (page = 1, limit = 20, filters = {}) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const conditions = ['a.deleted_at IS NULL'];
  const values = [];

  if (filters.status) {
    conditions.push('a.status = ?');
    values.push(filters.status);
  }
  if (filters.researchNetworkId) {
    conditions.push('a.research_network_id = ?');
    values.push(filters.researchNetworkId);
  }

  const where = conditions.join(' AND ');

  const sql = `
    SELECT a.*,
           u.username AS author_username,
           u.first_name AS author_first_name,
           u.last_name AS author_last_name,
           rn.name AS research_network_name
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    LEFT JOIN research_networks rn ON a.research_network_id = rn.id
    WHERE ${where}
    ORDER BY a.is_pinned DESC, a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  values.push(parseInt(limit, 10), offset);
  const results = await query(sql, values);
  return toCamelCaseArray(results);
};

/**
 * Count announcements with optional filters
 * @param {Object} filters
 * @returns {Promise<number>}
 */
const countAnnouncements = async (filters = {}) => {
  const conditions = ['deleted_at IS NULL'];
  const values = [];

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }
  if (filters.researchNetworkId) {
    conditions.push('research_network_id = ?');
    values.push(filters.researchNetworkId);
  }

  const result = await queryOne(
    `SELECT COUNT(*) AS total FROM announcements WHERE ${conditions.join(' AND ')}`,
    values
  );
  return result.total;
};

/**
 * Create a new announcement
 * @param {Object} data - Announcement data (camelCase)
 * @returns {Promise<Object>} insertId
 */
const createAnnouncement = async (data) => {
  const snakeData = toSnakeCase(data);

  const result = await query(
    `INSERT INTO announcements (title, content, author_id, research_network_id, status, is_pinned, discussion_enabled, iframe_url, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snakeData.title,
      snakeData.content,
      snakeData.author_id || null,
      snakeData.research_network_id || null,
      snakeData.status || 'draft',
      snakeData.is_pinned ?? false,
      snakeData.discussion_enabled ?? true,
      snakeData.iframe_url || null,
      snakeData.status === 'published' ? new Date() : null
    ]
  );

  return result.insertId;
};

/**
 * Update an announcement
 * @param {number} id
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated announcement (camelCase)
 */
const updateAnnouncement = async (id, updates) => {
  const snakeUpdates = toSnakeCase(updates);

  const allowedFields = [
    'title', 'content', 'status', 'is_pinned',
    'research_network_id', 'thumbnail_url', 'banner_url', 'photo_url',
    'discussion_enabled', 'iframe_url', 'pdf_url', 'published_at'
  ];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(snakeUpdates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  // Auto-set published_at when status changes to published
  if (snakeUpdates.status === 'published' && !snakeUpdates.published_at) {
    fields.push('published_at = NOW()');
  }

  if (fields.length > 0) {
    values.push(id);
    await query(
      `UPDATE announcements SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  return findAnnouncementById(id);
};

/**
 * Soft delete an announcement
 * @param {number} id
 * @returns {Promise<void>}
 */
const softDeleteAnnouncement = async (id) => {
  await query('UPDATE announcements SET deleted_at = NOW() WHERE id = ?', [id]);
};

module.exports = {
  findAnnouncementById,
  getAllAnnouncements,
  countAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  softDeleteAnnouncement
};
