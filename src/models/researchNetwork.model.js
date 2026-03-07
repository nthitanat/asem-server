const { query, queryOne } = require('../utils/db.util');

/**
 * Get all research networks
 * @returns {Promise<Array>}
 */
const getAllResearchNetworks = async () => {
  return await query('SELECT * FROM research_networks ORDER BY name ASC');
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
 * @returns {Promise<Object|null>}
 */
const findResearchNetworkById = async (id) => {
  return await queryOne('SELECT * FROM research_networks WHERE id = ?', [id]);
};

/**
 * Find research network by name (case-insensitive)
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
const findResearchNetworkByName = async (name) => {
  return await queryOne(
    'SELECT * FROM research_networks WHERE LOWER(name) = LOWER(?)',
    [name]
  );
};

/**
 * Create a new research network
 * @param {string} name
 * @returns {Promise<Object>} Created research network
 */
const createResearchNetwork = async (name) => {
  const result = await query(
    'INSERT INTO research_networks (name) VALUES (?)',
    [name]
  );
  return findResearchNetworkById(result.insertId);
};

/**
 * Update a research network
 * @param {number} id
 * @param {string} name
 * @returns {Promise<Object>} Updated research network
 */
const updateResearchNetwork = async (id, name) => {
  await query('UPDATE research_networks SET name = ? WHERE id = ?', [name, id]);
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
