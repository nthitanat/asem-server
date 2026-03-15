const institutionModel = require('../models/institution.model');
const countryModel = require('../models/country.model');
const logger = require('../utils/logger.util');

/**
 * Get paginated list of institutions
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Object>} { institutions, total, page, limit }
 */
const getAllInstitutions = async (page = 1, limit = 20) => {
  const institutions = await institutionModel.getAllInstitutions(page, limit);
  const total = await institutionModel.countInstitutions();

  return {
    institutions,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
};

/**
 * Get institution by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
const getInstitutionById = async (id) => {
  const institution = await institutionModel.findInstitutionById(id);
  if (!institution) {
    const error = new Error('Institution not found');
    error.statusCode = 404;
    throw error;
  }
  return institution;
};

/**
 * Create a new institution
 * @param {Object} data - { name, countryId } (camelCase)
 * @returns {Promise<Object>}
 */
const createInstitution = async (data) => {
  const { name, countryId } = data;
  
  const country = await countryModel.findCountryById(countryId);
  if (!country) {
    const error = new Error('Country not found');
    error.statusCode = 404;
    throw error;
  }

  const duplicate = await institutionModel.findInstitutionByNameAndCountry(name, countryId);
  if (duplicate) {
    const error = new Error('Institution with this name already exists in the given country');
    error.statusCode = 409;
    throw error;
  }

  const institution = await institutionModel.createInstitution(data);
  logger.info(`Institution created: ${institution.name}`);
  return institution;
};

/**
 * Update an institution
 * @param {number} id
 * @param {Object} updates - { name?, countryId? }
 * @returns {Promise<Object>}
 */
const updateInstitution = async (id, updates) => {
  const institution = await institutionModel.findInstitutionById(id);
  if (!institution) {
    const error = new Error('Institution not found');
    error.statusCode = 404;
    throw error;
  }

  if (updates.countryId !== undefined) {
    const country = await countryModel.findCountryById(updates.countryId);
    if (!country) {
      const error = new Error('Country not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const resolvedCountryId = updates.countryId ?? institution.countryId;
  const resolvedName = updates.name ?? institution.name;

  const duplicate = await institutionModel.findInstitutionByNameAndCountry(
    resolvedName,
    resolvedCountryId
  );
  if (duplicate && duplicate.id !== id) {
    const error = new Error('Institution with this name already exists in the given country');
    error.statusCode = 409;
    throw error;
  }

  const updated = await institutionModel.updateInstitution(id, updates);
  logger.info(`Institution updated: ${updated.name}`);
  return updated;
};

/**
 * Delete an institution
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteInstitution = async (id) => {
  const institution = await institutionModel.findInstitutionById(id);
  if (!institution) {
    const error = new Error('Institution not found');
    error.statusCode = 404;
    throw error;
  }

  await institutionModel.deleteInstitution(id);
  logger.info(`Institution deleted: ${institution.name}`);
};

module.exports = {
  getAllInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution
};
