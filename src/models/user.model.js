const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');
const bcrypt = require('bcrypt');

/**
 * Create new user
 * @param {Object} userData - User data (camelCase)
 * @returns {Promise<Object>} Created user (without password, camelCase)
 */
const createUser = async (userData) => {
  // Convert camelCase input to snake_case for database
  const snakeData = toSnakeCase(userData);
  
  // Extract fields with defaults
  const email = snakeData.email;
  const username = snakeData.username;
  const password = snakeData.password;
  const role = snakeData.role || 'user';
  const emailVerified = snakeData.email_verified || false;

  // Hash password
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);

  const sql = `
    INSERT INTO users (
      email, username, password_hash, first_name, last_name,
      best_contact_email, institution_id, department, areas_of_expertise,
      country_id, research_network_id, field_of_study, role, email_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    email,
    username,
    passwordHash,
    snakeData.first_name || null,
    snakeData.last_name || null,
    snakeData.best_contact_email || null,
    snakeData.institution_id || null,
    snakeData.department || null,
    snakeData.areas_of_expertise || null,
    snakeData.country_id || null,
    snakeData.research_network_id || null,
    snakeData.field_of_study || null,
    role,
    emailVerified ? 1 : 0
  ]);

  return findUserById(result.insertId);
};

/**
 * Find user by ID
 * @param {number} id - User ID
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object (camelCase) or null
 */
const findUserById = async (id, includeDeleted = false) => {
  let sql = `
    SELECT u.*,
           c.name AS country_name,
           i.name AS institution_name,
           rn.name AS research_network_name
    FROM users u
    LEFT JOIN countries c ON u.country_id = c.id
    LEFT JOIN institutions i ON u.institution_id = i.id
    LEFT JOIN research_networks rn ON u.research_network_id = rn.id
    WHERE u.id = ?
  `;

  if (!includeDeleted) {
    sql += ' AND u.deleted_at IS NULL';
  }

  const user = await queryOne(sql, [id]);

  if (!user) {
    return null;
  }

  // Remove password hash before converting to camelCase
  delete user.password_hash;
  
  // Convert snake_case to camelCase for API response
  return toCamelCase(user);
};

/**
 * Find user by email
 * @param {string} email - Email address
 * @param {boolean} includePassword - Include password hash
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object (camelCase) or null
 */
const findUserByEmail = async (email, includePassword = false, includeDeleted = false) => {
  let sql = `
    SELECT u.*,
           c.name AS country_name,
           i.name AS institution_name,
           rn.name AS research_network_name
    FROM users u
    LEFT JOIN countries c ON u.country_id = c.id
    LEFT JOIN institutions i ON u.institution_id = i.id
    LEFT JOIN research_networks rn ON u.research_network_id = rn.id
    WHERE u.email = ?
  `;

  if (!includeDeleted) {
    sql += ' AND u.deleted_at IS NULL';
  }

  const user = await queryOne(sql, [email]);

  if (!user) {
    return null;
  }

  if (!includePassword) {
    delete user.password_hash;
  }

  // Convert snake_case to camelCase for API response
  return toCamelCase(user);
};

/**
 * Find user by username
 * @param {string} username - Username
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object (camelCase) or null
 */
const findUserByUsername = async (username, includeDeleted = false) => {
  let sql = 'SELECT * FROM users WHERE username = ?';
  
  if (!includeDeleted) {
    sql += ' AND deleted_at IS NULL';
  }

  const user = await queryOne(sql, [username]);
  
  if (!user) {
    return null;
  }

  delete user.password_hash;
  
  // Convert snake_case to camelCase for API response
  return toCamelCase(user);
};

/**
 * Get all users with pagination
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Array>} Array of users (camelCase)
 */
const getAllUsers = async (page = 1, limit = 20, includeDeleted = false) => {
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.best_contact_email,
           u.institution_id, i.name AS institution_name,
           u.department, u.areas_of_expertise,
           u.country_id, c.name AS country_name,
           u.research_network_id, rn.name AS research_network_name,
           u.field_of_study, u.role, u.email_verified, u.is_active,
           u.deleted_at, u.created_at, u.updated_at
    FROM users u
    LEFT JOIN countries c ON u.country_id = c.id
    LEFT JOIN institutions i ON u.institution_id = i.id
    LEFT JOIN research_networks rn ON u.research_network_id = rn.id
  `;

  if (!includeDeleted) {
    sql += ' WHERE u.deleted_at IS NULL';
  }

  sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';

  const users = await query(sql, [limit, offset]);
  
  // Convert array of snake_case objects to camelCase
  return toCamelCaseArray(users);
};

/**
 * Count total users
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<number>} Total count
 */
const countUsers = async (includeDeleted = false) => {
  let sql = 'SELECT COUNT(*) as count FROM users';
  
  if (!includeDeleted) {
    sql += ' WHERE deleted_at IS NULL';
  }

  const result = await queryOne(sql);
  return result.count;
};

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated user (camelCase)
 */
const updateUser = async (id, updates) => {
  // Convert camelCase input to snake_case for database
  const snakeUpdates = toSnakeCase(updates);
  
  const allowedFields = [
    'email', 'username', 'first_name', 'last_name', 'best_contact_email',
    'institution_id', 'department', 'areas_of_expertise', 'country_id',
    'research_network_id', 'field_of_study', 'role', 'is_active'
  ];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(snakeUpdates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(id);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, values);

  return findUserById(id);
};

/**
 * Update user password
 * @param {number} id - User ID
 * @param {string} newPassword - New password (plain text)
 * @returns {Promise<boolean>} Success
 */
const updatePassword = async (id, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);
  
  const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
  await query(sql, [passwordHash, id]);
  
  return true;
};

/**
 * Verify user password
 * @param {string} email - Email address
 * @param {string} password - Password to verify
 * @returns {Promise<Object|null>} User object (camelCase) if password is correct, null otherwise
 */
const verifyUserPassword = async (email, password) => {
  const user = await findUserByEmail(email, true, false);
  
  if (!user) {
    return null;
  }

  // Note: findUserByEmail now returns camelCase, so passwordHash instead of password_hash
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }

  delete user.passwordHash;
  return user;
};

/**
 * Set email verified status
 * @param {number} id - User ID
 * @param {boolean} verified - Verified status
 * @returns {Promise<boolean>} Success
 */
const setEmailVerified = async (id, verified = true) => {
  const sql = 'UPDATE users SET email_verified = ? WHERE id = ?';
  await query(sql, [verified, id]);
  return true;
};

/**
 * Soft delete user
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success
 */
const softDeleteUser = async (id) => {
  const sql = 'UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?';
  await query(sql, [id]);
  return true;
};

/**
 * Hard delete user (permanent)
 * @param {number} id - User ID
 * @returns {Promise<boolean>} Success
 */
const hardDeleteUser = async (id) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  await query(sql, [id]);
  return true;
};

/**
 * Restore soft-deleted user
 * @param {number} id - User ID
 * @returns {Promise<Object>} Restored user
 */
const restoreUser = async (id) => {
  const sql = 'UPDATE users SET deleted_at = NULL, is_active = 1 WHERE id = ?';
  await query(sql, [id]);
  return findUserById(id);
};

/**
 * Get email, firstName, lastName for users matching optional filters.
 * Used only by the internal /internal/v1/users/emails endpoint.
 *
 * @param {Object} filters - camelCase filter object
 * @param {number} [filters.researchNetworkId]
 * @param {number} [filters.countryId]
 * @param {number} [filters.institutionId]
 * @param {boolean} [filters.isActive=true]
 * @returns {Promise<Array>} Array of { email, firstName, lastName } (camelCase)
 */
const findUserEmailsByFilter = async (filters = {}) => {
  const snakeFilters = toSnakeCase(filters);

  const conditions = ['u.deleted_at IS NULL'];
  const params = [];

  // isActive defaults to true — only return active users unless explicitly false
  const isActive = snakeFilters.is_active !== undefined ? snakeFilters.is_active : true;
  conditions.push('u.is_active = ?');
  params.push(isActive ? 1 : 0);

  if (snakeFilters.research_network_id) {
    conditions.push('u.research_network_id = ?');
    params.push(snakeFilters.research_network_id);
  }
  if (snakeFilters.country_id) {
    conditions.push('u.country_id = ?');
    params.push(snakeFilters.country_id);
  }
  if (snakeFilters.institution_id) {
    conditions.push('u.institution_id = ?');
    params.push(snakeFilters.institution_id);
  }

  const sql = `
    SELECT u.email, u.first_name, u.last_name
    FROM users u
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.first_name ASC, u.last_name ASC
  `;

  const results = await query(sql, params);
  return toCamelCaseArray(results);
};

module.exports = {
  createUser,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  getAllUsers,
  countUsers,
  updateUser,
  updatePassword,
  verifyUserPassword,
  setEmailVerified,
  softDeleteUser,
  hardDeleteUser,
  restoreUser,
  findUserEmailsByFilter
};
