const { query, queryOne } = require('./src/utils/db.util');

/**
 * Create email verification token
 * @param {number} userId - User ID
 * @param {string} token - Verification token
 * @param {Date} expiresAt - Expiry date
 * @returns {Promise<Object>} Created token info
 */
const createVerificationToken = async (userId, token, expiresAt) => {
  const sql = `
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
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
 * Find verification token
 * @param {string} token - Verification token
 * @returns {Promise<Object|null>} Token info or null
 */
const findVerificationToken = async (token) => {
  const sql = `
    SELECT * FROM email_verification_tokens
    WHERE token = ? AND used_at IS NULL
  `;

  return await queryOne(sql, [token]);
};

/**
 * Mark verification token as used
 * @param {string} token - Verification token
 * @returns {Promise<boolean>} Success
 */
const markTokenAsUsed = async (token) => {
  const sql = `
    UPDATE email_verification_tokens
    SET used_at = NOW()
    WHERE token = ?
  `;

  await query(sql, [token]);
  return true;
};

/**
 * Delete old verification tokens for user
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success
 */
const deleteUserVerificationTokens = async (userId) => {
  const sql = 'DELETE FROM email_verification_tokens WHERE user_id = ?';
  await query(sql, [userId]);
  return true;
};

/**
 * Delete expired verification tokens (cleanup)
 * @returns {Promise<number>} Number of deleted tokens
 */
const deleteExpiredTokens = async () => {
  const sql = `
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW()
  `;

  const result = await query(sql);
  return result.affectedRows;
};

module.exports = {
  createVerificationToken,
  findVerificationToken,
  markTokenAsUsed,
  deleteUserVerificationTokens,
  deleteExpiredTokens
};
