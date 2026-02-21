-- MySQL Initialization Script
-- This script runs automatically when the MySQL container is first created

-- Set timezone
SET time_zone = '+00:00';

-- Optional: Create additional databases if needed
-- CREATE DATABASE IF NOT EXISTS asem_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges (if needed for specific operations)
-- GRANT ALL PRIVILEGES ON *.* TO 'asem_user'@'%' WITH GRANT OPTION;
-- FLUSH PRIVILEGES;

-- Log initialization
SELECT 'MySQL initialization completed' AS message;
