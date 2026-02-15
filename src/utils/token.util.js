const crypto = require('crypto');

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes (default: 32)
 * @returns {string} Hex string token
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate token expiry date
 * @param {number} seconds - Number of seconds until expiry
 * @returns {Date} Expiry date
 */
const getTokenExpiry = (seconds) => {
  const now = new Date();
  return new Date(now.getTime() + seconds * 1000);
};

/**
 * Check if token is expired
 * @param {Date|string} expiryDate - Token expiry date
 * @returns {boolean} True if expired
 */
const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Hash a string using SHA256
 * @param {string} data - Data to hash
 * @returns {string} Hex string hash
 */
const hashString = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = {
  generateSecureToken,
  getTokenExpiry,
  isTokenExpired,
  hashString
};
