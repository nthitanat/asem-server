const { query, queryOne } = require('../utils/db.util');
const bcrypt = require('bcrypt');

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user (without password)
 */
const createUser = async (userData) => {
  const {
    email,
    username,
    password,
    firstName,
    lastName,
    bestContactEmail,
    institution,
    department,
    areasOfExpertise,
    country,
    researchNetwork,
    fieldOfStudy,
    role = 'user',
    emailVerified = false
  } = userData;

  // Hash password
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);

  const sql = `
    INSERT INTO users (
      email, username, password_hash, first_name, last_name,
      best_contact_email, institution, department, areas_of_expertise,
      country, research_network, field_of_study, role, email_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    email,
    username,
    passwordHash,
    firstName || null,
    lastName || null,
    bestContactEmail || null,
    institution || null,
    department || null,
    areasOfExpertise || null,
    country || null,
    researchNetwork || null,
    fieldOfStudy || null,
    role,
    emailVerified ? 1 : 0
  ]);

  return findUserById(result.insertId);
};

/**
 * Find user by ID
 * @param {number} id - User ID
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object or null
 */
const findUserById = async (id, includeDeleted = false) => {
  let sql = 'SELECT * FROM users WHERE id = ?';
  
  if (!includeDeleted) {
    sql += ' AND deleted_at IS NULL';
  }

  const user = await queryOne(sql, [id]);
  
  if (user) {
    delete user.password_hash;
  }
  
  return user;
};

/**
 * Find user by email
 * @param {string} email - Email address
 * @param {boolean} includePassword - Include password hash
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email, includePassword = false, includeDeleted = false) => {
  let sql = 'SELECT * FROM users WHERE email = ?';
  
  if (!includeDeleted) {
    sql += ' AND deleted_at IS NULL';
  }

  const user = await queryOne(sql, [email]);
  
  if (user && !includePassword) {
    delete user.password_hash;
  }
  
  return user;
};

/**
 * Find user by username
 * @param {string} username - Username
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByUsername = async (username, includeDeleted = false) => {
  let sql = 'SELECT * FROM users WHERE username = ?';
  
  if (!includeDeleted) {
    sql += ' AND deleted_at IS NULL';
  }

  const user = await queryOne(sql, [username]);
  
  if (user) {
    delete user.password_hash;
  }
  
  return user;
};

/**
 * Get all users with pagination
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @param {boolean} includeDeleted - Include soft-deleted users
 * @returns {Promise<Array>} Array of users
 */
const getAllUsers = async (page = 1, limit = 20, includeDeleted = false) => {
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT id, email, username, first_name, last_name, best_contact_email,
           institution, department, areas_of_expertise, country, research_network,
           field_of_study, role, email_verified, is_active, deleted_at, created_at, updated_at
    FROM users
  `;
  
  if (!includeDeleted) {
    sql += ' WHERE deleted_at IS NULL';
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  return await query(sql, [limit, offset]);
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
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (id, updates) => {
  const allowedFields = [
    'email', 'username', 'first_name', 'last_name', 'best_contact_email',
    'institution', 'department', 'areas_of_expertise', 'country',
    'research_network', 'field_of_study', 'role', 'is_active'
  ];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
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
 * @returns {Promise<Object|null>} User object if password is correct, null otherwise
 */
const verifyUserPassword = async (email, password) => {
  const user = await findUserByEmail(email, true, false);
  
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    return null;
  }

  delete user.password_hash;
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
  restoreUser
};
