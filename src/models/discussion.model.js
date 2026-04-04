const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Find discussion by ID
 * @param {number} id
 * @param {boolean} includeDeleted
 * @returns {Promise<Object|null>} Discussion (camelCase) or null
 */
const findDiscussionById = async (id, includeDeleted = false) => {
  let sql = `
    SELECT d.*,
           u.username AS author_username,
           u.first_name AS author_first_name,
           u.last_name AS author_last_name
    FROM discussions d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.id = ?
  `;

  if (!includeDeleted) {
    sql += ' AND d.deleted_at IS NULL';
  }

  const result = await queryOne(sql, [id]);
  return result ? toCamelCase(result) : null;
};

/**
 * Get discussions for a specific announcement with pagination
 * @param {number} announcementId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getDiscussionsByAnnouncementId = async (announcementId, page = 1, limit = 20) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const sql = `
    SELECT d.*,
           u.username AS author_username,
           u.first_name AS author_first_name,
           u.last_name AS author_last_name
    FROM discussions d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.announcement_id = ?
      AND d.deleted_at IS NULL
    ORDER BY d.created_at ASC
    LIMIT ? OFFSET ?
  `;

  const results = await query(sql, [announcementId, parseInt(limit, 10), offset]);
  return toCamelCaseArray(results);
};

/**
 * Count discussions for an announcement
 * @param {number} announcementId
 * @returns {Promise<number>}
 */
const countDiscussions = async (announcementId) => {
  const result = await queryOne(
    'SELECT COUNT(*) AS total FROM discussions WHERE announcement_id = ? AND deleted_at IS NULL',
    [announcementId]
  );
  return result.total;
};

/**
 * Create a new discussion
 * @param {Object} data - { announcementId, parentId?, authorId, content } (camelCase)
 * @returns {Promise<Object>} Created discussion (camelCase)
 */
const createDiscussion = async (data) => {
  const snakeData = toSnakeCase(data);

  const result = await query(
    `INSERT INTO discussions (announcement_id, parent_id, author_id, content)
     VALUES (?, ?, ?, ?)`,
    [
      snakeData.announcement_id,
      snakeData.parent_id || null,
      snakeData.author_id || null,
      snakeData.content
    ]
  );

  return findDiscussionById(result.insertId);
};

/**
 * Update a discussion
 * @param {number} id
 * @param {Object} updates - { content } (camelCase)
 * @returns {Promise<Object>} Updated discussion (camelCase)
 */
const updateDiscussion = async (id, updates) => {
  const snakeUpdates = toSnakeCase(updates);
  const allowedFields = ['content'];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(snakeUpdates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    await query(
      `UPDATE discussions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  return findDiscussionById(id);
};

/**
 * Soft delete a discussion
 * @param {number} id
 * @returns {Promise<void>}
 */
const softDeleteDiscussion = async (id) => {
  await query('UPDATE discussions SET deleted_at = NOW() WHERE id = ?', [id]);
};

module.exports = {
  findDiscussionById,
  getDiscussionsByAnnouncementId,
  countDiscussions,
  createDiscussion,
  updateDiscussion,
  softDeleteDiscussion
};
