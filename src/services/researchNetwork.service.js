const researchNetworkModel = require('../models/researchNetwork.model');
const logger = require('../utils/logger.util');

/**
 * Get all research networks
 * @returns {Promise<Array>}
 */
const getAllResearchNetworks = async () => {
  return await researchNetworkModel.getAllResearchNetworks();
};

/**
 * Get research network by ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
const getResearchNetworkById = async (id) => {
  const network = await researchNetworkModel.findResearchNetworkById(id);
  if (!network) {
    const error = new Error('Research network not found');
    error.statusCode = 404;
    throw error;
  }
  return network;
};

/**
 * Create a new research network
 * @param {Object} data - { name }
 * @returns {Promise<Object>}
 */
const createResearchNetwork = async (data) => {
  const { name } = data;
  const existing = await researchNetworkModel.findResearchNetworkByName(name);
  if (existing) {
    const error = new Error('Research network name already exists');
    error.statusCode = 409;
    throw error;
  }

  const network = await researchNetworkModel.createResearchNetwork(data);
  logger.info(`Research network created: ${network.name}`);
  return network;
};

/**
 * Update a research network
 * @param {number} id
 * @param {Object} updates - { name? }
 * @returns {Promise<Object>}
 */
const updateResearchNetwork = async (id, updates) => {
  const network = await researchNetworkModel.findResearchNetworkById(id);
  if (!network) {
    const error = new Error('Research network not found');
    error.statusCode = 404;
    throw error;
  }

  const name = updates.name ?? network.name;
  const duplicate = await researchNetworkModel.findResearchNetworkByName(name);
  if (duplicate && duplicate.id !== id) {
    const error = new Error('Research network name already exists');
    error.statusCode = 409;
    throw error;
  }

  const updated = await researchNetworkModel.updateResearchNetwork(id, updates);
  logger.info(`Research network updated: ${updated.name}`);
  return updated;
};

/**
 * Delete a research network
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteResearchNetwork = async (id) => {
  const network = await researchNetworkModel.findResearchNetworkById(id);
  if (!network) {
    const error = new Error('Research network not found');
    error.statusCode = 404;
    throw error;
  }

  await researchNetworkModel.deleteResearchNetwork(id);
  logger.info(`Research network deleted: ${network.name}`);
};

module.exports = {
  getAllResearchNetworks,
  getResearchNetworkById,
  createResearchNetwork,
  updateResearchNetwork,
  deleteResearchNetwork
};
