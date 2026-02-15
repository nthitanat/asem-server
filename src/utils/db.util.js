const mysql = require('mysql2/promise');
const dbConfig = require('../config/db.config');
const logger = require('./logger.util');

let pool = null;

/**
 * Initialize database connection pool
 */
const initializePool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info('Database connection pool initialized');
  }
  return pool;
};

/**
 * Get database connection pool
 */
const getPool = () => {
  if (!pool) {
    return initializePool();
  }
  return pool;
};

/**
 * Execute a query with parameters (prepared statement)
 * @param {string} sql - SQL query with placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
const query = async (sql, params = []) => {
  try {
    const connection = getPool();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', {
      sql: sql.substring(0, 100),
      error: error.message
    });
    throw error;
  }
};

/**
 * Execute a query and return the first row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} First row or null
 */
const queryOne = async (sql, params = []) => {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
};

/**
 * Begin a transaction
 * @returns {Promise<Connection>} Database connection with transaction started
 */
const beginTransaction = async () => {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  return connection;
};

/**
 * Commit a transaction
 * @param {Connection} connection - Database connection
 */
const commit = async (connection) => {
  await connection.commit();
  connection.release();
};

/**
 * Rollback a transaction
 * @param {Connection} connection - Database connection
 */
const rollback = async (connection) => {
  await connection.rollback();
  connection.release();
};

/**
 * Ensure database exists, create if it doesn't
 */
const ensureDatabaseExists = async () => {
  let connection = null;
  try {
    const { database, ...connectionConfig } = dbConfig;
    
    // Connect to MySQL server without specifying database
    connection = await mysql.createConnection(connectionConfig);
    
    logger.info(`Checking if database '${database}' exists...`);
    
    // Check if database exists
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [database]
    );
    
    if (databases.length === 0) {
      // Database doesn't exist, create it
      logger.info(`Database '${database}' not found. Creating...`);
      
      await connection.query(
        `CREATE DATABASE \`${database}\` CHARACTER SET ${dbConfig.charset} COLLATE ${dbConfig.collation}`
      );
      
      logger.info(`Database '${database}' created successfully`);
    } else {
      logger.info(`Database '${database}' already exists`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error ensuring database exists:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const connection = getPool();
    await connection.query('SELECT 1');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    throw error;
  }
};

/**
 * Close database connection pool
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
};

module.exports = {
  initializePool,
  getPool,
  query,
  queryOne,
  beginTransaction,
  commit,
  rollback,
  ensureDatabaseExists,
  testConnection,
  closePool
};
