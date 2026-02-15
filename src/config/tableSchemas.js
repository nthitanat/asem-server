/**
 * Database table schema definitions
 * Used by tableSync utility to create and validate tables
 */

const tableSchemas = {
  users: {
    tableName: 'users',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      email: {
        type: 'VARCHAR(255)',
        unique: true,
        nullable: false
      },
      username: {
        type: 'VARCHAR(100)',
        unique: true,
        nullable: false
      },
      password_hash: {
        type: 'VARCHAR(255)',
        nullable: false
      },
      first_name: {
        type: 'VARCHAR(100)',
        nullable: true
      },
      last_name: {
        type: 'VARCHAR(100)',
        nullable: true
      },
      best_contact_email: {
        type: 'VARCHAR(255)',
        nullable: true
      },
      institution: {
        type: 'VARCHAR(255)',
        nullable: true
      },
      department: {
        type: 'VARCHAR(255)',
        nullable: true
      },
      areas_of_expertise: {
        type: 'TEXT',
        nullable: true,
        comment: 'JSON array or comma-separated values'
      },
      country: {
        type: 'VARCHAR(100)',
        nullable: true
      },
      research_network: {
        type: 'VARCHAR(255)',
        nullable: true
      },
      field_of_study: {
        type: 'VARCHAR(255)',
        nullable: true
      },
      role: {
        type: "ENUM('admin', 'moderator', 'user')",
        default: "'user'",
        nullable: false
      },
      email_verified: {
        type: 'BOOLEAN',
        default: 'false',
        nullable: false
      },
      is_active: {
        type: 'BOOLEAN',
        default: 'true',
        nullable: false
      },
      deleted_at: {
        type: 'TIMESTAMP',
        nullable: true,
        default: 'NULL'
      },
      created_at: {
        type: 'TIMESTAMP',
        default: 'CURRENT_TIMESTAMP',
        nullable: false
      },
      updated_at: {
        type: 'TIMESTAMP',
        default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        nullable: false
      }
    },
    indexes: [
      { name: 'idx_email', columns: ['email'] },
      { name: 'idx_username', columns: ['username'] },
      { name: 'idx_role', columns: ['role'] },
      { name: 'idx_deleted', columns: ['deleted_at'] }
    ]
  },

  refresh_tokens: {
    tableName: 'refresh_tokens',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      user_id: {
        type: 'INT',
        nullable: false,
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'CASCADE'
        }
      },
      token: {
        type: 'VARCHAR(500)',
        unique: true,
        nullable: false
      },
      expires_at: {
        type: 'DATETIME',
        nullable: false
      },
      created_at: {
        type: 'TIMESTAMP',
        default: 'CURRENT_TIMESTAMP',
        nullable: false
      },
      revoked_at: {
        type: 'TIMESTAMP',
        nullable: true,
        default: 'NULL'
      },
      replaced_by_token: {
        type: 'VARCHAR(500)',
        nullable: true
      }
    },
    indexes: [
      { name: 'idx_token', columns: ['token'] },
      { name: 'idx_user_id', columns: ['user_id'] },
      { name: 'idx_expires', columns: ['expires_at'] }
    ]
  },

  email_verification_tokens: {
    tableName: 'email_verification_tokens',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      user_id: {
        type: 'INT',
        nullable: false,
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'CASCADE'
        }
      },
      token: {
        type: 'VARCHAR(255)',
        unique: true,
        nullable: false
      },
      expires_at: {
        type: 'DATETIME',
        nullable: false
      },
      created_at: {
        type: 'TIMESTAMP',
        default: 'CURRENT_TIMESTAMP',
        nullable: false
      },
      used_at: {
        type: 'TIMESTAMP',
        nullable: true,
        default: 'NULL'
      }
    },
    indexes: [
      { name: 'idx_token', columns: ['token'] },
      { name: 'idx_user_id', columns: ['user_id'] },
      { name: 'idx_expires', columns: ['expires_at'] }
    ]
  },

  password_reset_tokens: {
    tableName: 'password_reset_tokens',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      user_id: {
        type: 'INT',
        nullable: false,
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'CASCADE'
        }
      },
      token: {
        type: 'VARCHAR(255)',
        unique: true,
        nullable: false
      },
      expires_at: {
        type: 'DATETIME',
        nullable: false
      },
      created_at: {
        type: 'TIMESTAMP',
        default: 'CURRENT_TIMESTAMP',
        nullable: false
      },
      used_at: {
        type: 'TIMESTAMP',
        nullable: true,
        default: 'NULL'
      }
    },
    indexes: [
      { name: 'idx_token', columns: ['token'] },
      { name: 'idx_user_id', columns: ['user_id'] },
      { name: 'idx_expires', columns: ['expires_at'] }
    ]
  }
};

module.exports = tableSchemas;
