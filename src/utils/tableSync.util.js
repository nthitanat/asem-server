const readline = require('readline');
const { query } = require('./db.util');
const tableSchemas = require('../config/tableSchemas');
const logger = require('./logger.util');

/**
 * Create readline interface for user confirmation
 */
const createReadlineInterface = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};

/**
 * Ask user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User's answer
 */
const askConfirmation = (question) => {
  // Auto-confirm in production or non-interactive environments
  if (process.env.NODE_ENV === 'production' || !process.stdin.isTTY) {
    console.log(`${question} (auto-confirmed in production)`);
    return Promise.resolve(true);
  }
  
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

/**
 * Check if table exists
 * @param {string} tableName - Table name
 * @returns {Promise<boolean>} True if table exists
 */
const tableExists = async (tableName) => {
  const result = await query(
    'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [tableName]
  );
  return result[0].count > 0;
};

/**
 * Get existing table columns
 * @param {string} tableName - Table name
 * @returns {Promise<Array>} Array of column information
 */
const getTableColumns = async (tableName) => {
  return await query(
    `SELECT 
      COLUMN_NAME as column_name,
      COLUMN_TYPE as column_type,
      IS_NULLABLE as is_nullable,
      COLUMN_DEFAULT as column_default,
      COLUMN_KEY as column_key,
      EXTRA as extra
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = ?
    ORDER BY ORDINAL_POSITION`,
    [tableName]
  );
};

/**
 * Get existing foreign key constraints for a table
 * @param {string} tableName - Table name
 * @returns {Promise<Array>} Array of FK constraint information
 */
const getTableForeignKeys = async (tableName) => {
  return await query(
    `SELECT
      CONSTRAINT_NAME as constraint_name,
      COLUMN_NAME as column_name,
      REFERENCED_TABLE_NAME as referenced_table,
      REFERENCED_COLUMN_NAME as referenced_column
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName]
  );
};

/**
 * Build CREATE TABLE SQL statement
 * @param {Object} schema - Table schema
 * @returns {string} CREATE TABLE SQL
 */
const buildCreateTableSQL = (schema) => {
  const { tableName, columns, indexes } = schema;
  const columnDefs = [];
  const foreignKeys = [];

  // Build column definitions
  for (const [columnName, columnDef] of Object.entries(columns)) {
    let sql = `\`${columnName}\` ${columnDef.type}`;

    if (columnDef.nullable === false) {
      sql += ' NOT NULL';
    }

    if (columnDef.default !== undefined) {
      sql += ` DEFAULT ${columnDef.default}`;
    }

    if (columnDef.autoIncrement) {
      sql += ' AUTO_INCREMENT';
    }

    if (columnDef.unique) {
      sql += ' UNIQUE';
    }

    if (columnDef.comment) {
      sql += ` COMMENT '${columnDef.comment}'`;
    }

    columnDefs.push(sql);

    // Handle primary key
    if (columnDef.primaryKey) {
      columnDefs.push(`PRIMARY KEY (\`${columnName}\`)`);
    }

    // Handle foreign key
    if (columnDef.foreignKey) {
      const fk = columnDef.foreignKey;
      foreignKeys.push(
        `FOREIGN KEY (\`${columnName}\`) REFERENCES \`${fk.table}\`(\`${fk.column}\`) ON DELETE ${fk.onDelete || 'CASCADE'}`
      );
    }
  }

  // Add foreign keys
  columnDefs.push(...foreignKeys);

  // Build CREATE TABLE statement
  let createSQL = `CREATE TABLE \`${tableName}\` (\n  ${columnDefs.join(',\n  ')}\n)`;

  // Add indexes
  if (indexes && indexes.length > 0) {
    const indexDefs = indexes.map(index => {
      const columns = index.columns.map(col => `\`${col}\``).join(', ');
      return `CREATE INDEX \`${index.name}\` ON \`${tableName}\` (${columns})`;
    });
    createSQL += ';\n' + indexDefs.join(';\n');
  }

  return createSQL;
};

/**
 * Build ALTER TABLE ADD COLUMN SQL
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {Object} columnDef - Column definition
 * @returns {string} ALTER TABLE SQL
 */
const buildAddColumnSQL = (tableName, columnName, columnDef) => {
  let sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef.type}`;

  if (columnDef.nullable === false) {
    sql += ' NOT NULL';
  }

  if (columnDef.default !== undefined) {
    sql += ` DEFAULT ${columnDef.default}`;
  }

  return sql;
};

/**
 * Build ALTER TABLE ADD FOREIGN KEY SQL
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {Object} fkDef - Foreign key definition
 * @returns {string} ALTER TABLE SQL
 */
const buildAddForeignKeySQL = (tableName, columnName, fkDef) => {
  const constraintName = `fk_${tableName}_${columnName}`;
  return `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${columnName}\`) REFERENCES \`${fkDef.table}\`(\`${fkDef.column}\`) ON DELETE ${fkDef.onDelete || 'CASCADE'}`;
};

/**
 * Compare column types
 * @param {string} schemaType - Type from schema
 * @param {string} dbType - Type from database
 * @returns {boolean} True if types match
 */
const columnTypesMatch = (schemaType, dbType) => {
  // Normalize types for comparison
  const normalizedSchemaType = schemaType.toLowerCase().replace(/\s+/g, '');
  const normalizedDbType = dbType.toLowerCase().replace(/\s+/g, '');
  
  return normalizedSchemaType === normalizedDbType;
};

/**
 * Synchronize single table
 * @param {string} tableName - Table name
 * @param {Object} schema - Table schema
 * @returns {Promise<Object>} Sync result
 */
const syncTable = async (tableName, schema) => {
  const result = {
    tableName,
    action: null,
    changes: [],
    warnings: []
  };

  try {
    const exists = await tableExists(tableName);

    if (!exists) {
      // Table doesn't exist, create it
      logger.info(`Table '${tableName}' does not exist. Creating...`);
      console.log(`\n📋 Creating table: ${tableName}`);
      
      const createSQL = buildCreateTableSQL(schema);
      console.log(`\n${createSQL}\n`);
      
      const confirmed = await askConfirmation(`Create table '${tableName}'?`);
      
      if (confirmed) {
        // Split and execute each statement (CREATE TABLE + indexes)
        const statements = createSQL.split(';\n').filter(s => s.trim());
        for (const statement of statements) {
          await query(statement);
        }
        
        result.action = 'CREATED';
        result.changes.push(`Table '${tableName}' created successfully`);
        logger.info(`Table '${tableName}' created successfully`);
        console.log(`✅ Table '${tableName}' created successfully\n`);
      } else {
        result.action = 'SKIPPED';
        result.warnings.push(`User skipped creation of table '${tableName}'`);
        logger.warn(`User skipped creation of table '${tableName}'`);
        console.log(`⏭️  Skipped table '${tableName}'\n`);
      }
    } else {
      // Table exists, check for column differences
      const existingColumns = await getTableColumns(tableName);
      const existingColumnNames = existingColumns.map(col => col.column_name);
      const schemaColumnNames = Object.keys(schema.columns);

      // Find missing columns
      const missingColumns = schemaColumnNames.filter(
        col => !existingColumnNames.includes(col)
      );

      // Find extra columns (in DB but not in schema)
      const extraColumns = existingColumnNames.filter(
        col => !schemaColumnNames.includes(col)
      );

      // Check for type mismatches
      const typeMismatches = [];
      for (const col of existingColumns) {
        const schemaCol = schema.columns[col.column_name];
        if (schemaCol && !columnTypesMatch(schemaCol.type, col.column_type)) {
          typeMismatches.push({
            column: col.column_name,
            schemaType: schemaCol.type,
            dbType: col.column_type
          });
        }
      }

      // Check for missing FK constraints on existing columns
      const existingFKs = await getTableForeignKeys(tableName);
      const existingFKColumns = existingFKs.map(fk => fk.column_name);
      const missingFKs = [];
      for (const [colName, colDef] of Object.entries(schema.columns)) {
        if (
          colDef.foreignKey &&
          existingColumnNames.includes(colName) &&
          !existingFKColumns.includes(colName)
        ) {
          missingFKs.push({ columnName: colName, fkDef: colDef.foreignKey });
        }
      }

      // Report findings
      if (missingColumns.length === 0 && extraColumns.length === 0 && typeMismatches.length === 0 && missingFKs.length === 0) {
        result.action = 'UP_TO_DATE';
        logger.info(`Table '${tableName}' is up to date`);
        console.log(`✅ Table '${tableName}' is up to date\n`);
        return result;
      }

      console.log(`\n⚠️  Table '${tableName}' requires updates:`);

      // Handle missing columns
      if (missingColumns.length > 0) {
        console.log(`\n  Missing columns: ${missingColumns.join(', ')}`);
        result.warnings.push(`Missing columns: ${missingColumns.join(', ')}`);

        for (const columnName of missingColumns) {
          const columnDef = schema.columns[columnName];
          const addSQL = buildAddColumnSQL(tableName, columnName, columnDef);
          console.log(`\n  ${addSQL}`);
          
          const confirmed = await askConfirmation(`Add column '${columnName}' to '${tableName}'?`);
          
          if (confirmed) {
            await query(addSQL);
            result.changes.push(`Added column '${columnName}'`);
            logger.info(`Added column '${columnName}' to '${tableName}'`);
            console.log(`  ✅ Column '${columnName}' added\n`);

            // Also add FK constraint if this column has a foreign key definition
            if (columnDef.foreignKey) {
              const addFKSQL = buildAddForeignKeySQL(tableName, columnName, columnDef.foreignKey);
              console.log(`  ${addFKSQL}`);
              const fkConfirmed = await askConfirmation(`Add foreign key constraint on '${columnName}'?`);
              if (fkConfirmed) {
                await query(addFKSQL);
                result.changes.push(`Added FK constraint on '${columnName}' -> ${columnDef.foreignKey.table}.${columnDef.foreignKey.column}`);
                logger.info(`Added FK constraint on '${columnName}' in '${tableName}'`);
                console.log(`  ✅ FK constraint on '${columnName}' added\n`);
              } else {
                result.warnings.push(`User skipped FK constraint on '${columnName}'`);
                console.log(`  ⏭️  Skipped FK constraint on '${columnName}'\n`);
              }
            }
          } else {
            result.warnings.push(`User skipped adding column '${columnName}'`);
            console.log(`  ⏭️  Skipped column '${columnName}'\n`);
          }
        }
      }

      // Warn about extra columns
      if (extraColumns.length > 0) {
        console.log(`\n  ⚠️  Extra columns in database (not in schema): ${extraColumns.join(', ')}`);
        console.log(`  These columns will NOT be automatically removed.`);
        result.warnings.push(`Extra columns: ${extraColumns.join(', ')} - manual review required`);
        logger.warn(`Extra columns in '${tableName}': ${extraColumns.join(', ')}`);
      }

      // Warn about type mismatches
      if (typeMismatches.length > 0) {
        console.log(`\n  ⚠️  Column type mismatches:`);
        for (const mismatch of typeMismatches) {
          console.log(`    - ${mismatch.column}: schema=${mismatch.schemaType}, db=${mismatch.dbType}`);
          result.warnings.push(
            `Column '${mismatch.column}' type mismatch - schema: ${mismatch.schemaType}, db: ${mismatch.dbType}`
          );
        }
        console.log(`  These require manual ALTER TABLE commands - please review carefully.`);
        logger.warn(`Type mismatches in '${tableName}' require manual review`);
      }

      // Handle missing FK constraints on existing columns
      if (missingFKs.length > 0) {
        console.log(`\n  Missing foreign key constraints on: ${missingFKs.map(f => f.columnName).join(', ')}`);
        result.warnings.push(`Missing FK constraints: ${missingFKs.map(f => f.columnName).join(', ')}`);

        for (const { columnName, fkDef } of missingFKs) {
          const addFKSQL = buildAddForeignKeySQL(tableName, columnName, fkDef);
          console.log(`\n  ${addFKSQL}`);

          const confirmed = await askConfirmation(`Add foreign key constraint on '${columnName}' in '${tableName}'?`);

          if (confirmed) {
            await query(addFKSQL);
            result.changes.push(`Added FK constraint on '${columnName}' -> ${fkDef.table}.${fkDef.column}`);
            logger.info(`Added FK constraint on '${columnName}' in '${tableName}'`);
            console.log(`  ✅ FK constraint on '${columnName}' added\n`);
          } else {
            result.warnings.push(`User skipped FK constraint on '${columnName}'`);
            console.log(`  ⏭️  Skipped FK constraint on '${columnName}'\n`);
          }
        }
      }

      result.action = result.changes.length > 0 ? 'UPDATED' : 'WARNINGS';
      console.log('');
    }
  } catch (error) {
    result.action = 'ERROR';
    result.warnings.push(`Error: ${error.message}`);
    logger.error(`Error syncing table '${tableName}':`, error.message);
    console.error(`❌ Error syncing table '${tableName}': ${error.message}\n`);
  }

  return result;
};

/**
 * Synchronize all tables
 * @returns {Promise<Array>} Array of sync results
 */
const syncAllTables = async () => {
  console.log('\n🔄 Starting database table synchronization...\n');
  logger.info('Starting database table synchronization');

  const results = [];

  // Sync tables in order (users first, then tables with foreign keys)
  const tableOrder = ['users', 'refresh_tokens', 'email_verification_tokens', 'password_reset_tokens'];

  for (const tableName of tableOrder) {
    const schema = tableSchemas[tableName];
    if (schema) {
      const result = await syncTable(tableName, schema);
      results.push(result);
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Database Synchronization Summary:');
  console.log('═══════════════════════════════════════════════════════');
  
  for (const result of results) {
    console.log(`\n${result.tableName}: ${result.action}`);
    if (result.changes.length > 0) {
      result.changes.forEach(change => console.log(`  ✅ ${change}`));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  logger.info('Database table synchronization completed');

  return results;
};

module.exports = {
  syncAllTables,
  syncTable,
  tableExists
};
