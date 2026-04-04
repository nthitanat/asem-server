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
      institution_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'institutions',
          column: 'id',
          onDelete: 'SET NULL'
        }
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
      country_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'countries',
          column: 'id',
          onDelete: 'SET NULL'
        }
      },
      research_network_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'research_networks',
          column: 'id',
          onDelete: 'SET NULL'
        }
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
      { name: 'idx_deleted', columns: ['deleted_at'] },
      { name: 'idx_country_id', columns: ['country_id'] },
      { name: 'idx_institution_id', columns: ['institution_id'] },
      { name: 'idx_research_network_id', columns: ['research_network_id'] }
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
  },

  countries: {
    tableName: 'countries',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      name: {
        type: 'VARCHAR(100)',
        unique: true,
        nullable: false
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
      { name: 'idx_country_name', columns: ['name'] }
    ]
  },

  institutions: {
    tableName: 'institutions',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      name: {
        type: 'VARCHAR(255)',
        nullable: false
      },
      country_id: {
        type: 'INT',
        nullable: false,
        foreignKey: {
          table: 'countries',
          column: 'id',
          onDelete: 'RESTRICT'
        }
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
      { name: 'idx_institution_name', columns: ['name'] },
      { name: 'idx_institution_country', columns: ['country_id'] }
    ]
  },

  research_networks: {
    tableName: 'research_networks',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      name: {
        type: 'VARCHAR(255)',
        unique: true,
        nullable: false
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
      { name: 'idx_research_network_name', columns: ['name'] }
    ]
  },

  announcements: {
    tableName: 'announcements',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      title: {
        type: 'VARCHAR(255)',
        nullable: false
      },
      content: {
        type: 'TEXT',
        nullable: false
      },
      author_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'SET NULL'
        }
      },
      research_network_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'research_networks',
          column: 'id',
          onDelete: 'SET NULL'
        }
      },
      status: {
        type: "ENUM('draft','published','archived')",
        default: "'draft'",
        nullable: false
      },
      is_pinned: {
        type: 'BOOLEAN',
        default: 'false',
        nullable: false
      },
      thumbnail_url: {
        type: 'VARCHAR(500)',
        nullable: true,
        default: 'NULL'
      },
      banner_url: {
        type: 'VARCHAR(500)',
        nullable: true,
        default: 'NULL'
      },
      photo_url: {
        type: 'VARCHAR(500)',
        nullable: true,
        default: 'NULL'
      },
      published_at: {
        type: 'TIMESTAMP',
        nullable: true,
        default: 'NULL'
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
      { name: 'idx_announcement_author', columns: ['author_id'] },
      { name: 'idx_announcement_network', columns: ['research_network_id'] },
      { name: 'idx_announcement_status', columns: ['status'] },
      { name: 'idx_announcement_deleted', columns: ['deleted_at'] },
      { name: 'idx_announcement_published', columns: ['published_at'] }
    ]
  },

  discussions: {
    tableName: 'discussions',
    columns: {
      id: {
        type: 'INT',
        primaryKey: true,
        autoIncrement: true,
        nullable: false
      },
      announcement_id: {
        type: 'INT',
        nullable: false,
        foreignKey: {
          table: 'announcements',
          column: 'id',
          onDelete: 'CASCADE'
        }
      },
      parent_id: {
        type: 'INT',
        nullable: true,
        default: 'NULL',
        foreignKey: {
          table: 'discussions',
          column: 'id',
          onDelete: 'SET NULL'
        }
      },
      author_id: {
        type: 'INT',
        nullable: true,
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'SET NULL'
        }
      },
      content: {
        type: 'TEXT',
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
      { name: 'idx_discussion_announcement', columns: ['announcement_id'] },
      { name: 'idx_discussion_parent', columns: ['parent_id'] },
      { name: 'idx_discussion_author', columns: ['author_id'] },
      { name: 'idx_discussion_deleted', columns: ['deleted_at'] }
    ]
  }
};

module.exports = tableSchemas;
