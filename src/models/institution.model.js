const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Get paginated list of institutions with their country name
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Array>} Array of institutions (camelCase)
 */
const getAllInstitutions = async (page = 1, limit = 20) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const results = await query(
    `SELECT i.*, c.name AS country_name
     FROM institutions i
     LEFT JOIN countries c ON i.country_id = c.id
     ORDER BY i.name ASC
     LIMIT ? OFFSET ?`,
    [parseInt(limit, 10), offset]
  );
  
  // Convert array to camelCase
  return toCamelCaseArray(results);
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
 * @returns {Promise<Object|null>} Institution object (camelCase) or null
 */
const findInstitutionById = async (id) => {
  const result = await queryOne(
    `SELECT i.*, c.name AS country_name
     FROM institutions i
     LEFT JOIN countries c ON i.country_id = c.id
     WHERE i.id = ?`,
    [id]
  );
  
  // Convert to camelCase
  return result ? toCamelCase(result) : null;
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
 * @param {Object} data - Institution data (camelCase: { name, countryId })
 * @returns {Promise<Object>} Created institution (camelCase)
 */
const createInstitution = async (data) => {
  // Convert camelCase to snake_case
  const snakeData = toSnakeCase(data);
  
  const result = await query(
    'INSERT INTO institutions (name, country_id) VALUES (?, ?)',
    [snakeData.name, snakeData.country_id]
  );
  return findInstitutionById(result.insertId);
};

/**
 * Update an institution
 * @param {number} id
 * @param {Object} updates - { name?, countryId? } (camelCase)
 * @returns {Promise<Object>} Updated institution (camelCase)
 */
const updateInstitution = async (id, updates) => {
  // Convert camelCase to snake_case
  const snakeUpdates = toSnakeCase(updates);
  
  const fields = [];
  const values = [];

  if (snakeUpdates.name !== undefined) {
    fields.push('name = ?');
    values.push(snakeUpdates.name);
  }
  if (snakeUpdates.country_id !== undefined) {
    fields.push('country_id = ?');
    values.push(snakeUpdates.country_id);
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
