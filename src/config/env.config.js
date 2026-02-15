const path = require('path');
const fs = require('fs');

// Determine which environment we're running in
const nodeEnv = process.env.NODE_ENV || 'development';

// Construct the path to the environment-specific .env file
const envFile = `.env.${nodeEnv}`;
const envPath = path.resolve(process.cwd(), envFile);

// Load the environment-specific file
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`✓ Loaded environment: ${nodeEnv} (${envFile})`);
} else {
  console.warn(`⚠ Warning: ${envFile} not found, falling back to .env`);
  require('dotenv').config();
}

// Export environment information for use in other parts of the application
module.exports = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test'
};
