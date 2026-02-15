const { query, queryOne } = require('../utils/db.util');

/**
 * Save refresh token to database
 * @param {number} userId - User ID
 * @param {string} token - Refresh token
 * @param {Date} expiresAt - Expiry date
 * @returns {Promise<Object>} Saved token info
 */
const saveRefreshToken = async (userId, token, expiresAt) => {
  const sql = `
    INSERT INTO refresh_tokens (user_id, token, expires_at)
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
 * Find refresh token
 * @param {string} token - Refresh token
 * @returns {Promise<Object|null>} Token info or null
 */
const findRefreshToken = async (token) => {
  const sql = `
    SELECT * FROM refresh_tokens
    WHERE token = ? AND revoked_at IS NULL
  `;

  return await queryOne(sql, [token]);
};

/**
 * Revoke refresh token
 * @param {string} token - Refresh token to revoke
 * @param {string} replacedByToken - New token that replaces this one
 * @returns {Promise<boolean>} Success
 */
const revokeRefreshToken = async (token, replacedByToken = null) => {
  const sql = `
    UPDATE refresh_tokens
    SET revoked_at = NOW(), replaced_by_token = ?
    WHERE token = ?
  `;

  await query(sql, [replacedByToken, token]);
  return true;
};

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId - User ID
 * @param {string} exceptToken - Token to exclude from revocation
 * @returns {Promise<boolean>} Success
 */
const revokeAllUserTokens = async (userId, exceptToken = null) => {
  let sql = `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = ? AND revoked_at IS NULL
  `;

  const params = [userId];

  if (exceptToken) {
    sql += ' AND token != ?';
    params.push(exceptToken);
  }

  await query(sql, params);
  return true;
};

/**
 * Delete expired tokens (cleanup)
 * @returns {Promise<number>} Number of deleted tokens
 */
const deleteExpiredTokens = async () => {
  const sql = `
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
  `;

  const result = await query(sql);
  return result.affectedRows;
};

/**
 * Get all active tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of tokens
 */
const getUserTokens = async (userId) => {
  const sql = `
    SELECT token, expires_at, created_at
    FROM refresh_tokens
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
  `;

  return await query(sql, [userId]);
};

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  deleteExpiredTokens,
  getUserTokens
};
