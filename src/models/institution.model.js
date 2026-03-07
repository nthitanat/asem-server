const { query, queryOne } = require('../utils/db.util');

/**
 * Get paginated list of institutions with their country name
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getAllInstitutions = async (page = 1, limit = 20) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  return await query(
    `SELECT i.*, c.name AS country_name
     FROM institutions i
     LEFT JOIN countries c ON i.country_id = c.id
     ORDER BY i.name ASC
     LIMIT ? OFFSET ?`,
    [parseInt(limit, 10), offset]
  );
};

/**
 * Count all institutions
 * @returns {Promise<number>}
 */
const countInstitutions = async () => {
  const result = await queryOne('SELECT COUNT(*) AS total FROM institutions');
  return result.total;
};

/**
 * Find institution by ID (includes country name)
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
const findInstitutionById = async (id) => {
  return await queryOne(
    `SELECT i.*, c.name AS country_name
     FROM institutions i
     LEFT JOIN countries c ON i.country_id = c.id
     WHERE i.id = ?`,
    [id]
  );
};

/**
 * Find institution by exact name and country_id (for duplicate check)
 * @param {string} name
 * @param {number} countryId
 * @returns {Promise<Object|null>}
 */
const findInstitutionByNameAndCountry = async (name, countryId) => {
  return await queryOne(
    'SELECT * FROM institutions WHERE LOWER(name) = LOWER(?) AND country_id = ?',
    [name, countryId]
  );
};

/**
 * Create a new institution
 * @param {string} name
 * @param {number} countryId
 * @returns {Promise<Object>} Created institution
 */
const createInstitution = async (name, countryId) => {
  const result = await query(
    'INSERT INTO institutions (name, country_id) VALUES (?, ?)',
    [name, countryId]
  );
  return findInstitutionById(result.insertId);
};

/**
 * Update an institution
 * @param {number} id
 * @param {Object} updates - { name?, countryId? }
 * @returns {Promise<Object>} Updated institution
 */
const updateInstitution = async (id, updates) => {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.countryId !== undefined) {
    fields.push('country_id = ?');
    values.push(updates.countryId);
  }

  values.push(id);
  await query(`UPDATE institutions SET ${fields.join(', ')} WHERE id = ?`, values);
  return findInstitutionById(id);
};

/**
 * Delete an institution
 * @param {number} id
 * @returns {Promise<Object>} Result metadata
 */
const deleteInstitution = async (id) => {
  return await query('DELETE FROM institutions WHERE id = ?', [id]);
};

module.exports = {
  getAllInstitutions,
  countInstitutions,
  findInstitutionById,
  findInstitutionByNameAndCountry,
  createInstitution,
  updateInstitution,
  deleteInstitution
};
