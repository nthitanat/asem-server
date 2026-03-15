const { query, queryOne } = require('../utils/db.util');
const { toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Get all research networks
 * @returns {Promise<Array>} List of research networks (camelCase)
 */
const getAllResearchNetworks = async () => {
  const results = await query('SELECT * FROM research_networks ORDER BY name ASC');
  return toCamelCaseArray(results);
};

/**
 * Count all research networks
 * @returns {Promise<number>}
 */
const countResearchNetworks = async () => {
  const result = await queryOne('SELECT COUNT(*) AS total FROM research_networks');
  return result.total;
};

/**
 * Find research network by ID
 * @param {number} id
 * @returns {Promise<Object|null>} Research network (camelCase) or null
 */
const findResearchNetworkById = async (id) => {
  const result = await queryOne('SELECT * FROM research_networks WHERE id = ?', [id]);
  return result ? toCamelCase(result) : null;
};

/**
 * Find research network by name (case-insensitive)
 * @param {string} name
 * @returns {Promise<Object|null>} Research network (camelCase) or null
 */
const findResearchNetworkByName = async (name) => {
  const result = await queryOne(
    'SELECT * FROM research_networks WHERE LOWER(name) = LOWER(?)',
    [name]
  );
  return result ? toCamelCase(result) : null;
};

/**
 * Create a new research network
 * @param {Object} data - { name } (camelCase)
 * @returns {Promise<Object>} Created research network
 */
const createResearchNetwork = async (data) => {
  const { name } = data;
  const result = await query(
    'INSERT INTO research_networks (name) VALUES (?)',
    [name]
  );
  return findResearchNetworkById(result.insertId);
};

/**
 * Update a research network
 * @param {number} id
 * @param {Object} updates - { name? } (camelCase)
 * @returns {Promise<Object>} Updated research network
 */
const updateResearchNetwork = async (id, updates) => {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (fields.length > 0) {
    values.push(id);
    await query(`UPDATE research_networks SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  return findResearchNetworkById(id);
};

/**
 * Delete a research network
 * @param {number} id
 * @returns {Promise<Object>} Result metadata
 */
const deleteResearchNetwork = async (id) => {
  return await query('DELETE FROM research_networks WHERE id = ?', [id]);
};

module.exports = {
  getAllResearchNetworks,
  countResearchNetworks,
  findResearchNetworkById,
  findResearchNetworkByName,
  createResearchNetwork,
  updateResearchNetwork,
  deleteResearchNetwork
};
