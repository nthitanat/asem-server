const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'asem_db',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: false, // Security: prevent SQL injection
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci'
};

module.exports = dbConfig;
