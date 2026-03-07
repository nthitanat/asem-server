const countryModel = require('../models/country.model');
const logger = require('../utils/logger.util');

/**
 * Get all countries
 * @returns {Promise<Array>}
 */
const getAllCountries = async () => {
  return await countryModel.getAllCountries();
};

/**
 * Get country by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
const getCountryById = async (id) => {
  const country = await countryModel.findCountryById(id);
  if (!country) {
    const error = new Error('Country not found');
    error.statusCode = 404;
    throw error;
  }
  return country;
};

/**
 * Create a new country
 * @param {string} name
 * @returns {Promise<Object>}
 */
const createCountry = async (name) => {
  const existing = await countryModel.findCountryByName(name);
  if (existing) {
    const error = new Error('Country name already exists');
    error.statusCode = 409;
    throw error;
  }

  const country = await countryModel.createCountry(name);
  logger.info(`Country created: ${country.name}`);
  return country;
};

/**
 * Update a country
 * @param {number} id
 * @param {string} name
 * @returns {Promise<Object>}
 */
const updateCountry = async (id, name) => {
  const country = await countryModel.findCountryById(id);
  if (!country) {
    const error = new Error('Country not found');
    error.statusCode = 404;
    throw error;
  }

  const duplicate = await countryModel.findCountryByName(name);
  if (duplicate && duplicate.id !== id) {
    const error = new Error('Country name already exists');
    error.statusCode = 409;
    throw error;
  }

  const updated = await countryModel.updateCountry(id, name);
  logger.info(`Country updated: ${updated.name}`);
  return updated;
};

/**
 * Delete a country
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteCountry = async (id) => {
  const country = await countryModel.findCountryById(id);
  if (!country) {
    const error = new Error('Country not found');
    error.statusCode = 404;
    throw error;
  }

  await countryModel.deleteCountry(id);
  logger.info(`Country deleted: ${country.name}`);
};

module.exports = {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry
};
