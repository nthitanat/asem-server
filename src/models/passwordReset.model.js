const { query, queryOne } = require('../utils/db.util');

/**
 * Create password reset token
 * @param {number} userId - User ID
 * @param {string} token - Reset token
 * @param {Date} expiresAt - Expiry date
 * @returns {Promise<Object>} Created token info
 */
const createResetToken = async (userId, token, expiresAt) => {
  const sql = `
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `;

  const result = await query(sql, [userId, token, expiresAt]);

  return {
    id: result.insertId,
    userId,
    token,
    expiresAt
  };
};

/**
 * Find password reset token
 * @param {string} token - Reset token
 * @returns {Promise<Object|null>} Token info or null
 */
const findResetToken = async (token) => {
  const sql = `
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used_at IS NULL
  `;

  return await queryOne(sql, [token]);
};

/**
 * Mark reset token as used
 * @param {string} token - Reset token
 * @returns {Promise<boolean>} Success
 */
const markTokenAsUsed = async (token) => {
  const sql = `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE token = ?
  `;

  await query(sql, [token]);
  return true;
};

/**
 * Delete old reset tokens for user (invalidate previous requests)
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success
 */
const deleteUserResetTokens = async (userId) => {
  const sql = 'DELETE FROM password_reset_tokens WHERE user_id = ?';
  await query(sql, [userId]);
  return true;
};

/**
 * Delete expired reset tokens (cleanup)
 * @returns {Promise<number>} Number of deleted tokens
 */
const deleteExpiredTokens = async () => {
  const sql = `
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW()
  `;

  const result = await query(sql);
  return result.affectedRows;
};

module.exports = {
  createResetToken,
  findResetToken,
  markTokenAsUsed,
  deleteUserResetTokens,
  deleteExpiredTokens
};
