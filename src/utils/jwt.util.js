const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');
const logger = require('./logger.util');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error.message);
    throw error;
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} JWT token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error.message);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying token:', error.message);
      throw error;
    }
  }
};

/**
 * Decode JWT token without verification (for inspection)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error.message);
    return null;
  }
};

/**
 * Get token expiry date
 * @param {string} expiresIn - Expiry time string (e.g., '15m', '7d')
 * @returns {Date} Expiry date
 */
const getExpiryDate = (expiresIn) => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error('Invalid expiresIn format');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': // seconds
      return new Date(now.getTime() + value * 1000);
    case 'm': // minutes
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h': // hours
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  getExpiryDate
};
