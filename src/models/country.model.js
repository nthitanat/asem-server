const { query, queryOne } = require('../utils/db.util');
const { toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Get all countries
 * @returns {Promise<Array>} List of countries (camelCase)
 */
const getAllCountries = async () => {
  const results = await query('SELECT * FROM countries ORDER BY name ASC');
  return toCamelCaseArray(results);
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
 * @returns {Promise<Object|null>} Country (camelCase) or null
 */
const findCountryById = async (id) => {
  const result = await queryOne('SELECT * FROM countries WHERE id = ?', [id]);
  return result ? toCamelCase(result) : null;
};

/**
 * Find country by name (case-insensitive)
 * @param {string} name
 * @returns {Promise<Object|null>} Country (camelCase) or null
 */
const findCountryByName = async (name) => {
  const result = await queryOne('SELECT * FROM countries WHERE LOWER(name) = LOWER(?)', [name]);
  return result ? toCamelCase(result) : null;
};

/**
 * Create a new country
 * @param {Object} data - { name } (camelCase)
 * @returns {Promise<Object>} Created country
 */
const createCountry = async (data) => {
  const { name } = data;
  const result = await query('INSERT INTO countries (name) VALUES (?)', [name]);
  return findCountryById(result.insertId);
};

/**
 * Update a country
 * @param {number} id
 * @param {Object} updates - { name? } (camelCase)
 * @returns {Promise<Object>} Updated country
 */
const updateCountry = async (id, updates) => {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (fields.length > 0) {
    values.push(id);
    await query(`UPDATE countries SET ${fields.join(', ')} WHERE id = ?`, values);
  }

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
