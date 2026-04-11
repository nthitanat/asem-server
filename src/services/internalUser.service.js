const userModel = require('../models/user.model');
const logger = require('../utils/logger.util');

/**
 * Return email + name for users matching the given filters.
 * @param {Object} filters - camelCase filter object (researchNetworkId?, countryId?, institutionId?, isActive?)
 * @returns {Promise<Array>} Array of { email, firstName, lastName }
 */
const getUserEmails = async (filters) => {
  const entries = await userModel.findUserEmailsByFilter(filters);
  logger.info(`Internal user email query returned ${entries.length} entries`, { filters });
  return entries;
};

module.exports = {
  getUserEmails
};
