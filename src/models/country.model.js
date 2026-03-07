const { query, queryOne } = require('../utils/db.util');

/**
 * Get all countries
 * @returns {Promise<Array>} List of countries
 */
const getAllCountries = async () => {
  return await query('SELECT * FROM countries ORDER BY name ASC');
};

/**
 * Count all countries
 * @returns {Promise<number>} Total count
 */
const countCountries = async () => {
  const result = await queryOne('SELECT COUNT(*) AS total FROM countries');
  return result.total;
};

/**
 * Find country by ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
const findCountryById = async (id) => {
  return await queryOne('SELECT * FROM countries WHERE id = ?', [id]);
};

/**
 * Find country by name (case-insensitive)
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
const findCountryByName = async (name) => {
  return await queryOne('SELECT * FROM countries WHERE LOWER(name) = LOWER(?)', [name]);
};

/**
 * Create a new country
 * @param {string} name
 * @returns {Promise<Object>} Created country
 */
const createCountry = async (name) => {
  const result = await query('INSERT INTO countries (name) VALUES (?)', [name]);
  return findCountryById(result.insertId);
};

/**
 * Update a country
 * @param {number} id
 * @param {string} name
 * @returns {Promise<Object>} Updated country
 */
const updateCountry = async (id, name) => {
  await query('UPDATE countries SET name = ? WHERE id = ?', [name, id]);
  return findCountryById(id);
};

/**
 * Delete a country
 * @param {number} id
 * @returns {Promise<Object>} Result metadata
 */
const deleteCountry = async (id) => {
  return await query('DELETE FROM countries WHERE id = ?', [id]);
};

module.exports = {
  getAllCountries,
  countCountries,
  findCountryById,
  findCountryByName,
  createCountry,
  updateCountry,
  deleteCountry
};
