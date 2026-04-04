# General Architecture Documentation

**Last Updated**: April 4, 2026 (added Image Upload Workflow section)  
**Purpose**: Comprehensive guide to the Node.js/Express API architecture  
**Audience**: Future developers and AI assistants working with this codebase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Config Files](#config-files-srcconfigjs)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Case Conversion System](#case-conversion-system)
6. [Naming Conventions](#naming-conventions)
7. [Error Handling](#error-handling)
8. [Adding New Resources](#adding-new-resources)
9. [Image Upload Workflow](#image-upload-workflow)
10. [Common Pitfalls](#common-pitfalls)

---

## Architecture Overview

This application follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                           │
│                    (HTTP with camelCase JSON)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │     ROUTES      │  Define endpoints, apply middleware
                    │  (*.routes.js)  │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼────────┐
    │  MIDDLEWARE   │ │ MIDDLEWARE│ │   MIDDLEWARE   │
    │ (auth, role,  │ │ (validate)│ │ (emailVerified)│
    │  rate limit)  │ │           │ │                │
    └───────┬───────┘ └─────┬─────┘ └───────┬────────┘
            └────────────────┼────────────────┘
                             │ (validated camelCase)
                    ┌────────▼────────┐
                    │   CONTROLLERS   │  Handle HTTP layer, format responses
                    │ (*.controller.js│
                    └────────┬────────┘
                             │ (business objects)
                    ┌────────▼────────┐
                    │    SERVICES     │  Business logic, orchestration
                    │  (*.service.js) │
                    └────────┬────────┘
                             │ (domain objects)
                    ┌────────▼────────┐
                    │     MODELS      │  Data access, SQL, case conversion
                    │  (*.model.js)   │
                    └────────┬────────┘
                             │ (snake_case SQL)
                    ┌────────▼────────┐
                    │    DATABASE     │  MySQL with snake_case columns
                    │   (SQL tables)  │
                    └─────────────────┘
```

### Key Architectural Principles

1. **Single Responsibility**: Each layer has ONE clear purpose
2. **Dependency Direction**: Only flows downward (controllers → services → models)
3. **Object Passing**: Always pass complete objects, not individual parameters
4. **Case Consistency**: API uses camelCase, Database uses snake_case, automatic conversion
5. **Error Propagation**: Throws errors up, middleware catches and formats responses

---

## Layer Responsibilities

### 1. Routes (`src/routes/*.routes.js`)

**Purpose**: Define API endpoints and orchestrate middleware chains

**Responsibilities**:
- Define HTTP endpoints (GET, POST, PUT, DELETE)
- Apply middleware in correct order
- Route to appropriate controller methods
- **NO business logic** - only routing and middleware application

**Typical Structure**:
```javascript
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { resourceSchema } = require('../validators/resource.validator');

// Protected admin endpoint
router.post(
  '/',
  authenticateToken,           // 1. Authenticate
  requireEmailVerified,        // 2. Verify email
  requireRole(['admin']),      // 3. Authorize
  validate(resourceSchema),    // 4. Validate
  resourceController.create    // 5. Handle request
);

// Owner-or-admin endpoint (validate params BEFORE ownership check)
router.put(
  '/:id',
  authenticateToken,
  requireEmailVerified,
  validate(idParamSchema, 'params'),   // validate first so param is parsed
  validate(updateSchema, 'body'),
  requireOwnerOrAdmin('id'),           // reads req.params.id
  resourceController.update
);

module.exports = router;
```

**Middleware Execution Order** (protected routes):
1. Rate limiting (auth routes only — `authLimiter`, `passwordResetLimiter`, etc.)
2. Authentication (`authenticateToken`)
3. Email verification (`requireEmailVerified`) — currently only applied in user routes
4. Authorization (`requireRole` / `requireAdmin` / `requireOwnerOrAdmin`)
5. Validation (`validate`)
6. Controller method

> **Note on owner-check routes**: When `requireOwnerOrAdmin` is used, param validation (`validate(idParamSchema, 'params')`) runs **before** the ownership check because it needs `req.params.id` to be parsed.

**Public routes** (no authentication):
Some endpoints skip authentication entirely:
- `GET /countries`, `GET /institutions`, `GET /research-networks` — public list endpoints
- Auth public endpoints: register, login, verify-email, forgot-password, reset-password, refresh-token

---

### 2. Middleware (`src/middleware/*.middleware.js`)

**Purpose**: Cross-cutting concerns that run before controllers

**Available Middleware**:

#### `auth.middleware.js`
- `authenticateToken` - Verifies JWT, attaches `req.user`
- Must run FIRST on protected routes

#### `role.middleware.js`
- `requireRole(roles)` - Factory; check user role against allowed list
- `requireAdmin` - Shorthand for `requireRole(['admin'])`; used by country, institution, researchNetwork routes
- `requireAdminOrModerator` - Shorthand for `requireRole(['admin', 'moderator'])`
- `requireOwnerOrAdmin(paramName)` - Allow owner or admin/moderator (reads `req.params[paramName]`)
- All depend on `authenticateToken` running first

#### `emailVerified.middleware.js`
- `requireEmailVerified` - Blocks unverified email users
- Depends on `authenticateToken` running first
- **Currently only applied in user routes** — country, institution, and researchNetwork admin routes do not enforce it

#### `validate.middleware.js`
- `validate(schema, 'body')` - Validates with Joi schema
- Supports: `'body'`, `'query'`, `'params'`
- Strips unknown fields automatically

#### `rateLimiter.middleware.js`
Exports four rate limiters (runs **before** validation on auth routes). All values are read from environment variables with sensible defaults — **`.env` files are the single source of truth** for rate limit configuration.

| Limiter | Env vars (window / max) | Defaults | Applies to |
|---------|------------------------|----------|------------|
| `apiLimiter` | `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | 15 min / 100 | General API (not currently mounted on routes) |
| `authLimiter` | `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX_REQUESTS` | 15 min / 10 (skips successful) | register, login |
| `passwordResetLimiter` | `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` / `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS` | 1 hour / 3 | forgot-password |
| `emailVerificationLimiter` | `EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS` / `EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS` | 1 hour / 5 | resend-verification |

All return `429` with the standard `errorResponse` format

#### `errorHandler.middleware.js`
- `asyncHandler()` - Wraps async controllers, catches errors
- Global error handler (applied in `server.js`)

**Middleware Pattern**:
```javascript
const middlewareFunction = (req, res, next) => {
  // 1. Check condition
  if (condition) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // 2. Modify request if needed
  req.customProperty = value;
  
  // 3. Pass to next middleware
  next();
};
```

---

### 3. Validators (`src/validators/*.validator.js`)

**Purpose**: Define Joi schemas for request validation in **camelCase**

**Responsibilities**:
- Define field validation rules
- Use camelCase for all field names
- Export schemas for use in routes

**Standard Schema Pattern**:
```javascript
const Joi = require('joi');

const createResourceSchema = Joi.object({
  name: Joi.string()
    .max(255)
    .required()
    .messages({
      'string.max': 'Name cannot exceed 255 characters',
      'any.required': 'Name is required'
    }),
  
  categoryId: Joi.number()      // camelCase!
    .integer()
    .positive()
    .optional(),
  
  isActive: Joi.boolean()       // camelCase!
    .default(true)
});

const updateResourceSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field required

module.exports = {
  createResourceSchema,
  updateResourceSchema
};
```

**Common Field Patterns**:
```javascript
// Required string
name: Joi.string().max(255).required()

// Optional string
description: Joi.string().max(1000).optional()

// Foreign key
parentId: Joi.number().integer().positive().optional()

// Email
email: Joi.string().email().required()

// Boolean
isActive: Joi.boolean().default(true)

// Enum
role: Joi.string().valid('user', 'moderator', 'admin').default('user')

// Password
password: Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .required()
```

**Shared / Reusable Schema Patterns**:

Several validators export common schemas that are reused across resources:

```javascript
// ID parameter validation (country, institution, researchNetwork, user validators)
const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

// Pagination query validation (institution, user validators)
const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  includeDeleted: Joi.boolean().default(false)  // user validator only
});

// Delete query validation (user validator)
const deleteQuerySchema = Joi.object({
  hard: Joi.boolean().default(false)            // soft vs hard delete
});
```

**Auth Validator Schemas** (`auth.validator.js`):

| Schema | Fields | Used for |
|--------|--------|----------|
| `registerSchema` | email, username, password, firstName, lastName, bestContactEmail, institutionId, department, areasOfExpertise, countryId, researchNetworkId, fieldOfStudy | `POST /auth/register` |
| `loginSchema` | email, password | `POST /auth/login` |
| `refreshTokenSchema` | refreshToken | `POST /auth/refresh-token` |
| `emailSchema` | email | Resend verification / forgot password |
| `resetPasswordSchema` | token, newPassword | `POST /auth/reset-password` |
| `changePasswordSchema` | currentPassword, newPassword | `POST /auth/change-password` |
| `verifyTokenQuerySchema` | token (query param) | `GET /auth/verify-email?token=...` |

---

### 4. Controllers (`src/controllers/*.controller.js`)

**Purpose**: Handle HTTP request/response cycle, format API responses

**Responsibilities**:
- Extract data from `req.params`, `req.query`, `req.body`
- Call appropriate service method with complete objects
- Format responses using `response.util.js`
- Handle HTTP status codes
- **NO business logic** - only HTTP coordination

**Standard Controller Pattern**:
```javascript
const resourceService = require('../services/resource.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Create new resource
 * POST /api/v1/resources
 */
const createResource = asyncHandler(async (req, res) => {
  // 1. Call service with entire req.body (already validated)
  const resource = await resourceService.createResource(req.body);
  
  // 2. Return formatted response
  return successResponse(res, { resource }, 'Resource created successfully', 201);
});

/**
 * Get resource by ID
 * GET /api/v1/resources/:id
 */
const getResourceById = asyncHandler(async (req, res) => {
  // 1. Extract and parse parameters
  const { id } = req.params;
  
  // 2. Call service
  const resource = await resourceService.getResourceById(parseInt(id, 10));
  
  // 3. Return response
  return successResponse(res, { resource }, 'Resource retrieved successfully');
});

/**
 * Update resource
 * PUT /api/v1/resources/:id
 */
const updateResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Pass entire req.body as updates object
  const resource = await resourceService.updateResource(parseInt(id, 10), req.body);
  
  return successResponse(res, { resource }, 'Resource updated successfully');
});

/**
 * List resources with pagination
 * GET /api/v1/resources
 */
const listResources = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  
  const result = await resourceService.listResources(page, limit);
  
  return paginatedResponse(
    res,
    result.items,
    result.page,
    result.limit,
    result.total,
    'Resources retrieved successfully'
  );
});

/**
 * Delete resource
 * DELETE /api/v1/resources/:id
 */
const deleteResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query; // For soft/hard delete
  
  await resourceService.deleteResource(parseInt(id, 10), hard === 'true');
  
  return successResponse(res, null, 'Resource deleted successfully');
});

module.exports = {
  createResource,
  getResourceById,
  updateResource,
  listResources,
  deleteResource
};
```

**Response Utilities**:
```javascript
// Standard success
successResponse(res, data, message, statusCode)

// Paginated lists
paginatedResponse(res, items, page, limit, total, message)

// Error (usually via error handler middleware)
errorResponse(res, message, statusCode, code, details)
```

**Rules**:
- ✅ **DO**: Pass entire `req.body` to services
- ✅ **DO**: Use `asyncHandler()` wrapper for async functions
- ✅ **DO**: Parse IDs with `parseInt(id, 10)`
- ❌ **DON'T**: Extract individual fields from `req.body`
- ❌ **DON'T**: Put business logic in controllers
- ❌ **DON'T**: Call models directly

> **Known exception**: `auth.controller.js` `login` extracts `{ email, password }` from `req.body` and passes them as individual arguments to `authService.login(email, password)`. This deviates from the "pass entire object" rule — new controllers should still pass `req.body` as a single object.

---

### 5. Services (`src/services/*.service.js`)

**Purpose**: Implement business logic and orchestrate operations

**Responsibilities**:
- Business rules and validation
- Orchestrate multiple model calls
- Cross-resource operations
- Transaction coordination
- Logging business events
- **NO HTTP concerns** - throw errors, let middleware handle responses

**Standard Service Pattern**:
```javascript
const resourceModel = require('../models/resource.model');
const relatedModel = require('../models/related.model');
const logger = require('../utils/logger.util');

/**
 * Create new resource
 * @param {Object} data - Resource data (camelCase)
 * @returns {Promise<Object>} Created resource (camelCase)
 */
const createResource = async (data) => {
  // 1. Business validation
  const existing = await resourceModel.findByName(data.name);
  if (existing) {
    throw new Error('Resource with this name already exists');
  }
  
  // 2. Validate foreign keys if present
  if (data.categoryId) {
    const category = await relatedModel.findById(data.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
  }
  
  // 3. Call model to create
  const resource = await resourceModel.createResource(data);
  
  // 4. Log business event
  logger.info(`Resource created: ${resource.id} - ${resource.name}`);
  
  // 5. Return result (already camelCase from model)
  return resource;
};

/**
 * Get resource by ID
 * @param {number} id - Resource ID
 * @returns {Promise<Object>} Resource object (camelCase)
 */
const getResourceById = async (id) => {
  const resource = await resourceModel.findResourceById(id);
  
  if (!resource) {
    throw new Error('Resource not found');
  }
  
  return resource;
};

/**
 * Update resource
 * @param {number} id - Resource ID
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated resource (camelCase)
 */
const updateResource = async (id, updates) => {
  // 1. Verify resource exists
  const resource = await resourceModel.findResourceById(id);
  if (!resource) {
    throw new Error('Resource not found');
  }
  
  // 2. Validate uniqueness if name is being changed
  if (updates.name && updates.name !== resource.name) {
    const existing = await resourceModel.findByName(updates.name);
    if (existing) {
      throw new Error('Resource with this name already exists');
    }
  }
  
  // 3. Validate foreign keys if present
  if (updates.categoryId && updates.categoryId !== resource.categoryId) {
    const category = await relatedModel.findById(updates.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
  }
  
  // 4. Update resource
  const updated = await resourceModel.updateResource(id, updates);
  
  // 5. Log
  logger.info(`Resource updated: ${id}`);
  
  return updated;
};

/**
 * List resources with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} { items, total, page, limit }
 */
const listResources = async (page = 1, limit = 20) => {
  const items = await resourceModel.getAllResources(page, limit);
  const total = await resourceModel.countResources();
  
  return {
    items,
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  };
};

/**
 * Delete resource
 * @param {number} id - Resource ID
 * @param {boolean} hard - Hard delete vs soft delete
 * @returns {Promise<Object>} Result message
 */
const deleteResource = async (id, hard = false) => {
  const resource = await resourceModel.findResourceById(id, true); // Include deleted
  
  if (!resource) {
    throw new Error('Resource not found');
  }
  
  if (hard) {
    await resourceModel.hardDeleteResource(id);
    logger.warn(`Resource hard deleted: ${id}`);
    return { message: 'Resource permanently deleted' };
  } else {
    await resourceModel.softDeleteResource(id);
    logger.info(`Resource soft deleted: ${id}`);
    return { message: 'Resource deleted successfully' };
  }
};

module.exports = {
  createResource,
  getResourceById,
  updateResource,
  listResources,
  deleteResource
};
```

**Service Best Practices**:
- ✅ **DO**: Validate business rules
- ✅ **DO**: Check foreign key existence
- ✅ **DO**: Check uniqueness constraints
- ✅ **DO**: Log important business events
- ✅ **DO**: Throw descriptive errors
- ✅ **DO**: Work with camelCase objects
  - ✅ **DO**: Use `beginTransaction()` / `commit()` / `rollback()` from `db.util.js` for multi-step writes

---

### 6. Models (`src/models/*.model.js`)

**Purpose**: Data access layer, SQL queries, case conversion

**Responsibilities**:
- Execute SQL queries
- Convert between camelCase (API) and snake_case (database)
- Return consistent data structures
- Handle soft deletes
- **NO business logic** - only data access

**Standard Model Pattern**:
```javascript
const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

/**
 * Create new resource
 * @param {Object} data - Resource data (camelCase)
 * @returns {Promise<Object>} Created resource (camelCase)
 */
const createResource = async (data) => {
  // 1. Convert camelCase input to snake_case for database
  const snakeData = toSnakeCase(data);
  
  // 2. Prepare SQL with snake_case columns
  const sql = `
    INSERT INTO resources (
      name, category_id, is_active, created_at
    ) VALUES (?, ?, ?, NOW())
  `;
  
  // 3. Execute query with snake_case data
  const result = await query(sql, [
    snakeData.name,
    snakeData.category_id || null,
    snakeData.is_active ?? true
  ]);
  
  // 4. Return via findById (automatic camelCase conversion)
  return findResourceById(result.insertId);
};

/**
 * Find resource by ID
 * @param {number} id - Resource ID
 * @param {boolean} includeDeleted - Include soft-deleted resources
 * @returns {Promise<Object|null>} Resource (camelCase) or null
 */
const findResourceById = async (id, includeDeleted = false) => {
  // 1. Write SQL with snake_case columns
  let sql = `
    SELECT r.*,
           c.name AS category_name
    FROM resources r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.id = ?
  `;
  
  // 2. Handle soft deletes
  if (!includeDeleted) {
    sql += ' AND r.deleted_at IS NULL';
  }
  
  // 3. Execute query
  const result = await queryOne(sql, [id]);
  
  // 4. Convert snake_case result to camelCase
  return result ? toCamelCase(result) : null;
};

/**
 * Get all resources with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Array>} Array of resources (camelCase)
 */
const getAllResources = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT r.*,
           c.name AS category_name
    FROM resources r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const results = await query(sql, [parseInt(limit, 10), offset]);
  
  // Convert array of snake_case to camelCase
  return toCamelCaseArray(results);
};

/**
 * Count total resources
 * @returns {Promise<number>} Total count
 */
const countResources = async () => {
  const sql = `SELECT COUNT(*) as count FROM resources WHERE deleted_at IS NULL`;
  const result = await queryOne(sql);
  return result.count;
};

/**
 * Update resource
 * @param {number} id - Resource ID
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated resource (camelCase)
 */
const updateResource = async (id, updates) => {
  // 1. Convert camelCase updates to snake_case
  const snakeUpdates = toSnakeCase(updates);
  
  // 2. Define allowed fields (snake_case)
  const allowedFields = ['name', 'category_id', 'is_active'];
  
  // 3. Build dynamic UPDATE query
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(snakeUpdates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  // 4. Execute update
  if (fields.length > 0) {
    values.push(id);
    await query(
      `UPDATE resources SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }
  
  // 5. Return updated resource (automatic camelCase)
  return findResourceById(id);
};

/**
 * Soft delete resource
 * @param {number} id - Resource ID
 * @returns {Promise<void>}
 */
const softDeleteResource = async (id) => {
  const sql = `UPDATE resources SET deleted_at = NOW() WHERE id = ?`;
  await query(sql, [id]);
};

/**
 * Hard delete resource
 * @param {number} id - Resource ID
 * @returns {Promise<void>}
 */
const hardDeleteResource = async (id) => {
  const sql = `DELETE FROM resources WHERE id = ?`;
  await query(sql, [id]);
};

/**
 * Find resource by name
 * @param {string} name - Resource name
 * @returns {Promise<Object|null>} Resource (camelCase) or null
 */
const findByName = async (name) => {
  const sql = `SELECT * FROM resources WHERE name = ? AND deleted_at IS NULL`;
  const result = await queryOne(sql, [name]);
  return result ? toCamelCase(result) : null;
};

module.exports = {
  createResource,
  findResourceById,
  getAllResources,
  countResources,
  updateResource,
  softDeleteResource,
  hardDeleteResource,
  findByName
};
```

**Model Best Practices**:
- ✅ **DO**: Use `toSnakeCase()` on all inputs
- ✅ **DO**: Use `toCamelCase()` on single results
- ✅ **DO**: Use `toCamelCaseArray()` on array results
- ✅ **DO**: Write SQL with snake_case column names
- ✅ **DO**: Handle soft deletes with `deleted_at IS NULL`
- ✅ **DO**: Use prepared statements (parameterized queries)
- ✅ **DO**: Join related tables and alias names (e.g., `category_name`)
- ❌ **DON'T**: Return snake_case to services
- ❌ **DON'T**: Put business logic in models
- ❌ **DON'T**: Handle HTTP concerns

---

### 7. Utils (`src/utils/*.util.js`)

**Purpose**: Reusable helper functions

**Available Utilities**:

#### `caseConverter.util.js`
```javascript
toSnakeCase(obj)         // { firstName } → { first_name }
toCamelCase(obj)         // { first_name } → { firstName }
toCamelCaseArray(arr)    // Convert array of objects
```

#### `response.util.js`
```javascript
successResponse(res, data, message, statusCode)
errorResponse(res, message, statusCode, code, details)
paginatedResponse(res, items, page, limit, total, message)
validationErrorResponse(res, errors)
```

#### `db.util.js`
```javascript
initializePool()             // Create mysql2 connection pool (called once at startup)
getPool()                    // Return pool instance (lazy-initializes if needed)
query(sql, params)           // Execute query, return array
queryOne(sql, params)        // Execute query, return single object
beginTransaction()           // Get connection with transaction started; returns connection
commit(connection)           // Commit transaction and release connection
rollback(connection)         // Rollback transaction and release connection
ensureDatabaseExists()       // Auto-create database if missing (called at startup)
testConnection()             // Run SELECT 1 to verify DB connectivity
closePool()                  // End the pool and set it to null (graceful shutdown)
```

#### `logger.util.js`
Winston-backed logger. Writes to console (colorized in dev) + `logs/error.log` + `logs/combined.log` (5 MB rotation, 5 files max). Level is `debug` in development, `info` in production.
```javascript
logger.info(message)                // Info level
logger.warn(message)                // Warning level
logger.error(message)               // Error level
logger.debug(message)               // Debug level (development only)
logger.info(message, { key: val })  // Structured metadata as second argument
```

#### `jwt.util.js`
```javascript
generateAccessToken(payload)        // Access token; expiry read from jwt.config.js
generateRefreshToken(payload)       // Refresh token; expiry read from jwt.config.js
verifyToken(token)                  // Verify & decode; throws if invalid or expired
decodeToken(token)                  // Decode without verification (inspection only)
getExpiryDate(expiresIn)            // Convert '15m'/'7d' string → Date object
```

#### `token.util.js`
Generates and manages **non-JWT** tokens (email verification, password reset).
```javascript
generateSecureToken(bytes)          // crypto.randomBytes hex token (default 32 bytes)
getTokenExpiry(seconds)             // Returns Date of now + N seconds
isTokenExpired(expiryDate)          // Returns true if expiry Date is in the past
hashString(data)                    // SHA256 hex hash; use for storing tokens securely
```

#### `validation.util.js`
Lower-level validation helpers used alongside Joi schemas.
```javascript
isValidEmail(email)                 // Regex email check, returns boolean
isValidUsername(username)           // Alphanumeric/underscore/hyphen, 3–30 chars
validatePasswordStrength(password)  // Returns { valid: boolean, message: string }
sanitizeInput(input)                // Trim + strip < > to prevent XSS
formatJoiErrors(joiError)           // Normalize Joi error → [{ field, message }]
```

#### `tableSync.util.js`
Reads `src/config/tableSchemas.js` and auto-creates/verifies tables at server startup. **Not called directly in application code** — only invoked in `server.js`.
```javascript
syncAllTables()              // Creates or verifies all tables defined in tableSchemas.js
syncTable(tableName, schema) // Sync a single table (create or alter)
tableExists(tableName)       // Check whether a table exists in the current database
```

**Key behaviours**:
- **Topological sort** — resolves FK-dependency order via Kahn's algorithm (with circular-dependency fallback).
- **Interactive confirmation** — prompts before CREATE TABLE or ADD COLUMN; auto-confirms in production or non-TTY environments.
- **Missing FK detection** — detects existing columns that lack a declared foreign key constraint and offers to add them.
- **Type mismatch warnings** — warns when a column's DB type differs from the schema (requires manual ALTER).
- **Extra column warnings** — warns about DB columns not present in the schema (never auto-drops them).

---

## Config Files (`src/config/`)

**Purpose**: Centralize environment-specific settings; loaded once at startup.

| File | What it does |
|------|-------------|
| `env.config.js` | Loads `.env.<NODE_ENV>` (e.g. `.env.development`, `.env.production`). Must be `require`d **first** in `server.js`. Exports `{ nodeEnv, isProduction, isDevelopment, isTest }`. |
| `db.config.js` | MySQL connection pool settings (host, port, credentials, charset `utf8mb4`, collation `utf8mb4_unicode_ci`). Notable defaults: `connectionLimit: 20`, `multipleStatements: false` (security — prevents stacked-query SQL injection), `enableKeepAlive: true`. Consumed by `db.util.js`. |
| `jwt.config.js` | JWT `secret`, `accessTokenExpiry`, `refreshTokenExpiry` from env vars, plus static `issuer: 'asem-server'` and `audience: 'asem-client'` (both are embedded in tokens and validated by `verifyToken`). Consumed by `jwt.util.js`. |
| `email.config.js` | SMTP host/port/auth settings, `from.email` / `from.name` (sender identity), `frontendUrl` (base URL for verification/reset links), and `verification.enabled` flag (`EMAIL_VERIFICATION_ENABLED`). Consumed by `email.service.js`. |
| `tableSchemas.js` | Declarative table definitions. Consumed by `tableSync.util.js` at startup. **Add new tables here — not as raw SQL.** |

**Environment file naming convention** (loaded by `env.config.js`):
```
.env.development   ← NODE_ENV=development
.env.production    ← NODE_ENV=production
.env.test          ← NODE_ENV=test
```

**Environment Variables Reference** (rate limiting):

All rate limit values are configured in `.env` files — the middleware reads them via `process.env` with fallback defaults.

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | API limiter window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | API limiter max requests per window | `100` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth limiter window (ms) | `900000` (15 min) |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Auth limiter max requests (skips successful) | `10` |
| `PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` | Password reset limiter window (ms) | `3600000` (1 hour) |
| `PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS` | Password reset limiter max requests | `3` |
| `EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS` | Email verification limiter window (ms) | `3600000` (1 hour) |
| `EMAIL_VERIFICATION_RATE_LIMIT_MAX_REQUESTS` | Email verification limiter max requests | `5` |

---

## Data Flow Patterns

### CREATE Flow (POST)

```
1. CLIENT
   POST /api/v1/resources
   { "name": "Example", "categoryId": 5, "isActive": true }

2. ROUTE
   - authenticateToken
   - validate(createResourceSchema)
   - resourceController.create

3. CONTROLLER
   const resource = await resourceService.createResource(req.body);
   // req.body = { name, categoryId, isActive } (camelCase)

4. SERVICE
   - Check if name exists
   - Validate categoryId exists
   const resource = await resourceModel.createResource(data);
   // data = { name, categoryId, isActive } (camelCase)

5. MODEL
   const snakeData = toSnakeCase(data);
   // snakeData = { name, category_id, is_active } (snake_case)
   
   INSERT INTO resources (name, category_id, is_active) VALUES (?, ?, ?)
   
   return findResourceById(insertId);
   // Returns: { id, name, categoryId, isActive } (camelCase)

6. RESPONSE
   {
     "success": true,
     "message": "Resource created successfully",
     "data": {
       "resource": {
         "id": 123,
         "name": "Example",
         "categoryId": 5,
         "categoryName": "Category Name",
         "isActive": true,
         "createdAt": "2026-03-15T10:30:00.000Z"
       }
     }
   }
```

### READ Flow (GET)

```
1. CLIENT
   GET /api/v1/resources/123

2. ROUTE
   - authenticateToken
   - validate(idParamSchema, 'params')
   - resourceController.getById

3. CONTROLLER
   const resource = await resourceService.getResourceById(id);

4. SERVICE
   const resource = await resourceModel.findResourceById(id);
   if (!resource) throw new Error('Resource not found');
   return resource;

5. MODEL
   SELECT * FROM resources WHERE id = ? AND deleted_at IS NULL
   return toCamelCase(result);
   // Converts: { category_id } → { categoryId }

6. RESPONSE
   { "success": true, "data": { "resource": {...} } }
```

### UPDATE Flow (PUT)

```
1. CLIENT
   PUT /api/v1/resources/123
   { "name": "Updated", "categoryId": 7 }

2. ROUTE
   - authenticateToken
   - validate(updateResourceSchema)
   - resourceController.update

3. CONTROLLER
   const resource = await resourceService.updateResource(id, req.body);
   // req.body = { name, categoryId } (camelCase)

4. SERVICE
   - Get existing resource
   - Check name uniqueness
   - Validate new categoryId
   const updated = await resourceModel.updateResource(id, updates);
   // updates = { name, categoryId } (camelCase)

5. MODEL
   const snakeUpdates = toSnakeCase(updates);
   // snakeUpdates = { name, category_id } (snake_case)
   
   UPDATE resources SET name = ?, category_id = ? WHERE id = ?
   
   return findResourceById(id);
   // Returns camelCase

6. RESPONSE
   { "success": true, "data": { "resource": {...} } }
```

### LIST Flow (GET with pagination)

```
1. CLIENT
   GET /api/v1/resources?page=2&limit=20

2. ROUTE
   - validate(paginationSchema, 'query')
   - resourceController.list

3. CONTROLLER
   const result = await resourceService.listResources(page, limit);
   return paginatedResponse(res, result.items, ...);

4. SERVICE
   const items = await resourceModel.getAllResources(page, limit);
   const total = await resourceModel.countResources();
   return { items, total, page, limit };

5. MODEL
   SELECT * FROM resources WHERE deleted_at IS NULL LIMIT ? OFFSET ?
   return toCamelCaseArray(results);

6. RESPONSE
   {
     "success": true,
     "data": {
       "items": [...],
       "pagination": {
         "page": 2,
         "limit": 20,
         "total": 150,
         "pages": 8,
         "hasNext": true,
         "hasPrev": true
       }
     }
   }
```

---

## Case Conversion System

### The Problem

- **API Layer**: JavaScript uses camelCase convention
- **Database Layer**: SQL uses snake_case convention
- **Mismatches cause silent failures** (fields dropped in updates)

### The Solution

**Automatic conversion at the model boundary**:

```
┌─────────────────────────────────────────────────────────┐
│ Controllers & Services: camelCase                        │
│ { firstName, institutionId, isActive }                  │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  toSnakeCase()  │ ◄── CONVERSION BOUNDARY
              └────────┬────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Models & Database: snake_case                            │
│ { first_name, institution_id, is_active }               │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  toCamelCase()  │ ◄── CONVERSION BOUNDARY
              └────────┬────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Return to Services: camelCase                            │
│ { firstName, institutionId, isActive }                  │
└─────────────────────────────────────────────────────────┘
```

### Conversion Rules

**Input Conversion** (toSnakeCase):
```javascript
firstName       → first_name
institutionId   → institution_id
isActive        → is_active
emailVerified   → email_verified
```

**Output Conversion** (toCamelCase):
```javascript
first_name      → firstName
institution_id  → institutionId
is_active       → isActive
email_verified  → emailVerified
category_name   → categoryName  (joined columns too!)
```

### Where Conversions Happen

| Location | Function | Purpose |
|----------|----------|---------|
| **Model CREATE** | `toSnakeCase(data)` | Convert API input to SQL |
| **Model UPDATE** | `toSnakeCase(updates)` | Convert API input to SQL |
| **Model READ (single)** | `toCamelCase(result)` | Convert SQL output to API |
| **Model READ (array)** | `toCamelCaseArray(results)` | Convert SQL output to API |

### Critical Rules

✅ **DO**:
- Convert at model boundary ONLY
- Controllers/Services always use camelCase
- SQL queries always use snake_case
- Return from models ALWAYS in camelCase

❌ **DON'T**:
- Convert in controllers or services
- Mix camelCase and snake_case in same layer
- Manually map field names
- Return snake_case from models

---

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Routes | `*.routes.js` | `user.routes.js` |
| Controllers | `*.controller.js` | `user.controller.js` |
| Services | `*.service.js` | `user.service.js` |
| Models | `*.model.js` | `user.model.js` |
| Validators | `*.validator.js` | `user.validator.js` |
| Middleware | `*.middleware.js` | `auth.middleware.js` |
| Utils | `*.util.js` | `response.util.js` |

### Functions

**Controllers** (HTTP action names):
```javascript
createResource
getResourceById
updateResource
deleteResource
listResources
```

**Services** (business action names):
```javascript
createResource
getResourceById
updateResource
deleteResource
listResources
validateResourceOwnership
```

**Models** (data action names):
```javascript
createResource
findResourceById
findResourceByName
getAllResources
countResources
updateResource
softDeleteResource
hardDeleteResource
```

### Variables

| Layer | Convention | Example |
|-------|-----------|---------|
| Controllers | camelCase | `const user = ...` |
| Services | camelCase | `const userId = ...` |
| Models | camelCase (in code) | `const snakeData = ...` |
| Database | snake_case (columns) | `first_name`, `institution_id` |
| API | camelCase (JSON) | `{ "firstName": "John" }` |

---

## Error Handling

### Error Propagation Pattern

```
┌─────────────────────────────────────────────────────────┐
│ LAYER           │ ACTION                                 │
├─────────────────┼────────────────────────────────────────┤
│ Model           │ Throw Error('User not found')         │
│                 │        ↓                               │
│ Service         │ [Let propagate OR catch & rethrow]    │
│                 │        ↓                               │
│ Controller      │ [asyncHandler catches]                │
│                 │        ↓                               │
│ Error Middleware│ Format error response                 │
│                 │        ↓                               │
│ Client          │ Receive JSON error                    │
└─────────────────┴────────────────────────────────────────┘
```

### Throwing Errors (Services & Models)

```javascript
// Not found
if (!resource) {
  throw new Error('Resource not found');
}

// Validation failed
if (existingName) {
  throw new Error('Resource with this name already exists');
}

// Forbidden
if (resource.userId !== currentUserId) {
  throw new Error('You can only edit your own resources');
}

// Invalid state
if (resource.deletedAt) {
  throw new Error('Cannot update deleted resource');
}
```

### Error Response Format

```javascript
// Validation error
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}

// Business logic error
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND"
  }
}

// Authentication error
{
  "success": false,
  "error": {
    "message": "Invalid or expired token",
    "code": "UNAUTHORIZED"
  }
}
```

### Error Middleware

Located in `src/middleware/errorHandler.middleware.js`:

- Catches all thrown errors
- Determines status code from error type
- Formats consistent error responses
- Logs errors server-side

---

## Adding New Resources

Follow this checklist when adding a new resource (e.g., "products"):

### 1. Database Table (`src/config/tableSchemas.js`)

**Do NOT write raw SQL.** Add a new entry to `src/config/tableSchemas.js`. The `tableSync.util.js` utility reads this file at server startup and auto-creates or verifies the table in FK-dependency order.

```javascript
// In src/config/tableSchemas.js → tableSchemas object
products: {
  tableName: 'products',
  columns: {
    id:          { type: 'INT', primaryKey: true, autoIncrement: true, nullable: false },
    name:        { type: 'VARCHAR(255)', nullable: false },
    category_id: { type: 'INT', nullable: true,
                   foreignKey: { table: 'categories', column: 'id', onDelete: 'SET NULL' } },
    is_active:   { type: 'BOOLEAN', default: 'true', nullable: false },
    created_at:  { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP', nullable: false },
    updated_at:  { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', nullable: false },
    deleted_at:  { type: 'TIMESTAMP', nullable: true, default: 'NULL' }
  },
  indexes: [
    { name: 'idx_product_name', columns: ['name'] },
    { name: 'idx_deleted',      columns: ['deleted_at'] }
  ]
}
```

**Rules**:
- Use snake_case for all column names
- Declare `foreignKey` for FK columns — creation order is resolved automatically
- `tableSync` will `ADD COLUMN` for new columns added to existing tables

### 2. Model (`src/models/product.model.js`)

```javascript
const { query, queryOne } = require('../utils/db.util');
const { toSnakeCase, toCamelCase, toCamelCaseArray } = require('../utils/caseConverter.util');

// Implement:
// - createProduct(data)
// - findProductById(id, includeDeleted)
// - getAllProducts(page, limit)
// - countProducts()
// - updateProduct(id, updates)
// - softDeleteProduct(id)
// - hardDeleteProduct(id)
// - findProductByName(name)

module.exports = { ... };
```

### 3. Validator (`src/validators/product.validator.js`)

```javascript
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().max(255).required(),
  categoryId: Joi.number().integer().positive().optional(),  // camelCase!
  isActive: Joi.boolean().default(true)                      // camelCase!
});

const updateProductSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

const productIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

module.exports = { ... };
```

### 4. Service (`src/services/product.service.js`)

```javascript
const productModel = require('../models/product.model');
const logger = require('../utils/logger.util');

// Implement:
// - createProduct(data)
// - getProductById(id)
// - updateProduct(id, updates)
// - deleteProduct(id, hard)
// - listProducts(page, limit)

module.exports = { ... };
```

### 5. Controller (`src/controllers/product.controller.js`)

```javascript
const productService = require('../services/product.service');
const { successResponse, paginatedResponse } = require('../utils/response.util');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

// Implement:
// - createProduct
// - getProductById
// - updateProduct
// - deleteProduct
// - listProducts

module.exports = { ... };
```

### 6. Routes (`src/routes/product.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { 
  createProductSchema,
  updateProductSchema,
  productIdParamSchema
} = require('../validators/product.validator');

router.use(authenticateToken);

router.get('/', productController.listProducts);
router.post('/', requireRole(['admin']), validate(createProductSchema), productController.createProduct);
router.get('/:id', validate(productIdParamSchema, 'params'), productController.getProductById);
router.put('/:id', requireRole(['admin']), validate(productIdParamSchema, 'params'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', requireRole(['admin']), validate(productIdParamSchema, 'params'), productController.deleteProduct);

module.exports = router;
```

### 7. Register Routes (`src/routes/index.js`)

```javascript
const productRoutes = require('./product.routes');

router.use('/products', productRoutes);
```

### 8. Non-CRUD Actions

For actions beyond standard CRUD (e.g., restore a soft-deleted resource), use `POST /:id/<action>`:

```javascript
// Restore soft-deleted user (admin only) — from user.routes.js
router.post(
  '/:id/restore',
  requireEmailVerified,
  requireRole(['admin']),
  validate(userIdParamSchema, 'params'),
  userController.restoreUser
);
```

### Testing Checklist

- [ ] POST /api/v1/products - Create with camelCase input
- [ ] GET /api/v1/products/:id - Returns camelCase response
- [ ] GET /api/v1/products - Returns paginated camelCase array
- [ ] PUT /api/v1/products/:id - Updates with camelCase input
- [ ] DELETE /api/v1/products/:id - Soft delete works
- [ ] Database has snake_case columns
- [ ] Validation errors return correct format
- [ ] Auth/authorization middleware works

---

## Image Upload Workflow

This section describes the general pattern for adding file upload capability to any resource. It uses **multer** (multipart parsing) + **sharp** (resize/compress) + **Express static** (serving). Images are stored on the server disk (on-premise), not in external object storage.

### Packages

| Package | Role |
|---|---|
| `multer` | Parses `multipart/form-data` requests; holds file buffers in memory |
| `sharp` | Resizes and converts buffers to WebP before writing to disk |
| `express.static` | Serves the saved files as public HTTP URLs (built into Express) |

### Storage Layout

All uploads live under `uploads/` in the project root, which is bind-mounted to the container via `docker-compose` volumes:

```
uploads/
  tmp/
    {timestamp}-{random}/     ← written by processImages middleware; auto-cleaned
      {fieldName}.webp
      {fieldName}.webp
  {resource}/
    {resource_id}/             ← final permanent location
      {fieldName}.webp
      {fieldName}.webp
```

The database stores only the **relative URL path** (e.g. `/uploads/products/42/cover.webp`), not binary data.

> **Field names are defined per resource.** A resource decides which image fields it needs (e.g. `cover`, `avatar`, `logo`) and declares them when configuring `uploadFields`. There is no globally mandated set of image field names.

### Upload Middleware (`src/middleware/upload.middleware.js`)

Two exports that slot into any route chain:

```javascript
const { uploadFields, processImages } = require('../middleware/upload.middleware');
```

**`uploadFields`** — multer instance with:
- `storage: memoryStorage()` — files held in buffer, not written to disk yet
- `limits: { fileSize: 5MB }` — hard cap per file
- `fileFilter: imageOnly` — whitelist `image/jpeg`, `image/png`, `image/webp`; rejects others with 400
- `.fields([...])` — declares which field names to accept; **all fields are optional**

**`processImages`** — wrapped with `asyncHandler`; for each buffer in `req.files`:
1. Looks up the resize spec for the field name
2. Runs `sharp` to resize to defined dimensions and convert to WebP
3. Writes output to `/uploads/tmp/{timestamp}-{random}/`
4. Attaches `req.tempImagePaths = { {fieldName}Path?, ... }` for the service to consume
5. Skips silently if no files were uploaded

**Registering image fields for a resource:**

Edit `upload.middleware.js` to add the resource's field names and desired dimensions:

```javascript
// Example: declare which fields this middleware accepts and their resize specs
const IMAGE_SPECS = {
  // Define field name → { width, height } per your resource's needs
  cover:   { width: 800,  height: 600  },
  avatar:  { width: 200,  height: 200  },
  logo:    { width: 400,  height: 200  },
  // ... add more as needed
};

const uploadFields = multer({ ... }).fields(
  Object.keys(IMAGE_SPECS).map(name => ({ name, maxCount: 1 }))
);
```

> Use `fit: 'cover'` for crops to exact dimensions, or `fit: 'inside'` to preserve aspect ratio. Format is always WebP at quality 85.

### Route Chain Order

Upload middleware slots **after** role authorization and **before** body validation:

```javascript
// POST — create with optional images
router.post(
  '/',
  authenticateToken,              // 1. Authenticate
  requireRole([...]),             // 2. Authorize
  uploadFields,                   // 3. Parse multipart, hold buffers in memory
  processImages,                  // 4. Resize + write to /uploads/tmp/
  validate(createSchema, 'body'), // 5. Validate text fields only
  resourceController.create       // 6. Handle request
);

// PUT — update with optional new images
// Params validated BEFORE uploadFields so req.params.id is available
router.put(
  '/:id',
  authenticateToken,
  requireRole([...]),
  validate(idParamSchema, 'params'),  // validate params first
  uploadFields,
  processImages,
  validate(updateSchema, 'body'),
  resourceController.update
);
```

> **Note**: Image fields are **not** declared in Joi schemas. They arrive via `req.files` (parsed by multer) and `req.tempImagePaths` (set by `processImages`), not `req.body`. The Joi schema only validates text fields.

### Controller Pattern

Pass `req.tempImagePaths` alongside `req.body` as a single object — no special handling needed per field:

```javascript
const createResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.createResource({
    ...req.body,
    authorId: req.user.id,
    tempImagePaths: req.tempImagePaths || {}  // {} if no images uploaded
  });
  return successResponse(res, { resource }, 'Resource created successfully', 201);
});

const updateResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.updateResource(
    parseInt(req.params.id, 10),
    {
      ...req.body,
      tempImagePaths: req.tempImagePaths || {}
    }
  );
  return successResponse(res, { resource }, 'Resource updated successfully');
});
```

### Service Pattern

The service moves files from `tmp/` to the final directory and keeps the DB in sync. Use a transaction for multi-step create operations:

```javascript
const createResource = async (data) => {
  const { tempImagePaths = {}, ...resourceData } = data;

  const connection = await beginTransaction();
  try {
    // 1. INSERT row (image URL columns = NULL initially)
    const insertId = await resourceModel.createResource(resourceData);

    // 2. Move temp files → /uploads/{resource}/{id}/ and get URL map
    const imageUrls = Object.keys(tempImagePaths).length > 0
      ? moveImages(insertId, tempImagePaths)  // returns { {fieldName}Url: '/uploads/...' }
      : {};

    // 3. UPDATE row with final URL paths (only if images were uploaded)
    if (Object.keys(imageUrls).length > 0) {
      await resourceModel.updateResource(insertId, imageUrls);
    }

    await commit(connection);
    return resourceModel.findResourceById(insertId);
  } catch (err) {
    await rollback(connection);
    fs.rm(tempDir, { recursive: true, force: true }, () => {});
    throw err;
  }
};

const updateResource = async (id, data) => {
  const { tempImagePaths = {}, ...updates } = data;

  // New upload overwrites the file at the same path — URL in DB stays unchanged
  const imageUrls = Object.keys(tempImagePaths).length > 0
    ? moveImages(id, tempImagePaths)
    : {};

  return resourceModel.updateResource(id, { ...updates, ...imageUrls });
};

const deleteResource = async (id) => {
  await resourceModel.softDeleteResource(id);
  // Remove all images for this resource from disk
  fs.rm(path.join(UPLOADS_DIR, String(id)), { recursive: true, force: true }, () => {});
};
```

**`moveImages` helper** (defined in the service file):
- Creates `/uploads/{resource}/{id}/` directory
- `fs.renameSync` each temp file to `{fieldName}.webp` in the final directory
- Returns `{ {fieldName}Url: '/uploads/{resource}/{id}/{fieldName}.webp', ... }`

### Model Pattern

Each image field is a plain `VARCHAR(500) NULL` column. Name the column after the image's purpose (`{fieldName}_url`). Include all image URL columns in the `allowedFields` whitelist:

```javascript
// In tableSchemas.js — name columns after your resource's image fields
cover_url:  { type: 'VARCHAR(500)', nullable: true, default: 'NULL' },
avatar_url: { type: 'VARCHAR(500)', nullable: true, default: 'NULL' },

// In model updateResource — add image URL columns to the allowed whitelist
const allowedFields = [
  'name', /* ... other text fields ... */,
  'cover_url', 'avatar_url'  // add your resource's image URL columns here
];
```

### Serving Images

In `server.js`, registered once before route mounting (already in place):

```javascript
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { dotfiles: 'deny' }));
```

Clients access images directly via the URL stored in the DB field:
```
GET /uploads/{resource}/{id}/{fieldName}.webp
```

### Docker Volume (required)

Already added to both `docker-compose.dev.yml` and `docker-compose.prod.yml`:

```yaml
volumes:
  - ./uploads:/app/uploads
```

This ensures images persist across container restarts and rebuilds.

### Image Resize Configuration

Define dimensions in `upload.middleware.js` under `IMAGE_SPECS`. Choose values appropriate for the field's purpose in your UI:

```javascript
const IMAGE_SPECS = {
  fieldName: { width: W, height: H }
  // width/height in pixels; uses fit: 'cover' by default
};
```

All images are saved as **WebP at quality 85** regardless of the original format. Adjust quality in `upload.middleware.js` if needed.

### Security Checklist

- ✅ MIME type whitelist in multer `fileFilter` (JPEG, PNG, WebP only)
- ✅ File size limit enforced by multer (`5MB` per file)
- ✅ User-supplied filenames are never used — filenames derived from field name only
- ✅ `express.static` served with `dotfiles: 'deny'`
- ✅ Upload directory is outside the `src/` code tree
- ✅ Image URLs stored as relative paths — no external redirects

### Adding Image Upload to a New Resource (Checklist)

- [ ] Decide which image fields the resource needs and their purpose (e.g. `cover`, `logo`)
- [ ] Add `{fieldName}_url VARCHAR(500) NULL` columns to the `tableSchemas.js` entry
- [ ] Add `{fieldName}_url` columns to model `allowedFields` in `updateResource`
- [ ] Register field names and dimensions in `IMAGE_SPECS` in `upload.middleware.js`
- [ ] Add `uploadFields`, `processImages` to the route chain (after role, before validate)
- [ ] Pass `tempImagePaths: req.tempImagePaths || {}` in controller create/update
- [ ] Add `moveImages` + transaction logic in service create; overwrite logic in service update
- [ ] Add `fs.rm(imageDir, ...)` in service delete
- [ ] Create `uploads/{resource}/` directory with a `.gitkeep` file

---

## Common Pitfalls

### ❌ Pitfall 1: Extracting Fields in Controller

**WRONG**:
```javascript
const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;  // ❌ Don't extract
  const user = await userService.createUser(firstName, lastName);  // ❌ Multiple params
});
```

**CORRECT**:
```javascript
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);  // ✅ Pass entire object
});
```

### ❌ Pitfall 2: Using snake_case in Services

**WRONG**:
```javascript
const updateUser = async (id, updates) => {
  const user = await userModel.findUserById(id);
  if (!user.is_active) {  // ❌ snake_case in service
    throw new Error('User inactive');
  }
};
```

**CORRECT**:
```javascript
const updateUser = async (id, updates) => {
  const user = await userModel.findUserById(id);
  if (!user.isActive) {  // ✅ camelCase in service
    throw new Error('User inactive');
  }
};
```

### ❌ Pitfall 3: Returning snake_case from Models

**WRONG**:
```javascript
const findUserById = async (id) => {
  const result = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  return result;  // ❌ Returns snake_case
};
```

**CORRECT**:
```javascript
const findUserById = async (id) => {
  const result = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  return result ? toCamelCase(result) : null;  // ✅ Convert to camelCase
};
```

### ❌ Pitfall 4: Forgetting allowedFields in UPDATE

**WRONG**:
```javascript
const updateResource = async (id, updates) => {
  const snakeUpdates = toSnakeCase(updates);
  // No filtering - accepts ANY field!
  const sql = Object.keys(snakeUpdates).map(k => `${k} = ?`).join(', ');
  await query(`UPDATE resources SET ${sql}`, Object.values(snakeUpdates));
};
```

**CORRECT**:
```javascript
const updateResource = async (id, updates) => {
  const snakeUpdates = toSnakeCase(updates);
  const allowedFields = ['name', 'category_id', 'is_active'];  // ✅ Whitelist
  
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(snakeUpdates)) {
    if (allowedFields.includes(key)) {  // ✅ Filter allowed
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  await query(`UPDATE resources SET ${fields.join(', ')}`, values);
};
```

### ❌ Pitfall 5: Not Using asyncHandler

**WRONG**:
```javascript
const getUser = async (req, res) => {  // ❌ Error not caught
  const user = await userService.getUserById(req.params.id);
  return successResponse(res, { user });
};
```

**CORRECT**:
```javascript
const getUser = asyncHandler(async (req, res) => {  // ✅ Wrapped
  const user = await userService.getUserById(req.params.id);
  return successResponse(res, { user });
});
```

### ❌ Pitfall 6: Wrong Middleware Order

**WRONG**:
```javascript
router.post(
  '/',
  validate(schema),        // ❌ Validate before auth
  requireRole(['admin']),  // ❌ Check role before auth
  authenticateToken,       // ❌ Auth runs last
  controller.create
);
```

**CORRECT** (admin-only route):
```javascript
router.post(
  '/',
  authenticateToken,       // ✅ 1. Authenticate first
  requireEmailVerified,    // ✅ 2. Check email verified
  requireRole(['admin']),  // ✅ 3. Then check role
  validate(schema),        // ✅ 4. Then validate
  controller.create        // ✅ 5. Finally handle
);
```

**CORRECT** (owner-or-admin route — validate params before ownership check):
```javascript
router.put(
  '/:id',
  authenticateToken,            // ✅ 1. Authenticate
  requireEmailVerified,         // ✅ 2. Check email verified
  validate(idSchema, 'params'), // ✅ 3. Validate params first
  validate(bodySchema, 'body'), // ✅ 4. Validate body
  requireOwnerOrAdmin('id'),    // ✅ 5. Check ownership (needs parsed param)
  controller.update             // ✅ 6. Handle
);
```

### ❌ Pitfall 7: Business Logic in Controllers

**WRONG**:
```javascript
const createUser = asyncHandler(async (req, res) => {
  // ❌ Business logic in controller
  const existingUser = await userModel.findUserByEmail(req.body.email);
  if (existingUser) {
    throw new Error('Email exists');
  }
  
  const user = await userModel.createUser(req.body);
  return successResponse(res, { user });
});
```

**CORRECT**:
```javascript
// Controller - only HTTP coordination
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);  // ✅ Delegate to service
  return successResponse(res, { user });
});

// Service - business logic
const createUser = async (data) => {
  const existingUser = await userModel.findUserByEmail(data.email);
  if (existingUser) {
    throw new Error('Email exists');
  }
  return await userModel.createUser(data);
};
```

### ❌ Pitfall 8: SQL Injection

**WRONG**:
```javascript
const findByName = async (name) => {
  const sql = `SELECT * FROM resources WHERE name = '${name}'`;  // ❌ Injection risk!
  return await query(sql);
};
```

**CORRECT**:
```javascript
const findByName = async (name) => {
  const sql = `SELECT * FROM resources WHERE name = ?`;  // ✅ Parameterized
  return await queryOne(sql, [name]);
};
```

---

## Summary

### Key Architecture Principles

1. **Layered Architecture**: Routes → Middleware → Controllers → Services → Models → Database
2. **Single Responsibility**: Each layer has ONE clear purpose
3. **Object Passing**: Pass complete objects, not individual parameters
4. **Case Convention**: camelCase in code, snake_case in database, automatic conversion at model boundary
5. **Error Handling**: Throw errors, let middleware format responses
6. **Consistent Patterns**: All resources follow identical structure

### Quick Reference

| When you... | Do this... |
|------------|-----------|
| Add new table | Add entry to `tableSchemas.js`; `tableSync` auto-creates it at startup |
| Add new endpoint | Create route → validator → controller → service → model |
| Accept input | Validate with Joi in camelCase |
| Call model | Pass object, receive camelCase back |
| Write SQL | Use snake_case columns, parameterized queries |
| Return data | Models convert to camelCase automatically |
| Handle errors | Throw descriptive errors, middleware handles rest |
| Check auth | Apply middleware: auth → role → validate → controller |

### File Creation Order (New Resource)

1. `tableSchemas.js` entry (snake_case columns, FK declarations)
2. Model (with case conversion)
3. Validator (camelCase schemas)
4. Service (business logic)
5. Controller (HTTP handling)
6. Routes (endpoint + middleware)
7. Register in `src/routes/index.js`

---

## Questions for Future AI

When working with this codebase, ask yourself:

1. **Am I in the right layer?**
   - Business logic → Service
   - HTTP handling → Controller
   - Data access → Model

2. **Am I using the right case?**
   - Code → camelCase
   - SQL → snake_case
   - Converting at model boundary? YES

3. **Am I passing objects or individual params?**
   - Should be: Objects

4. **Am I following the standard pattern?**
   - Look at existing user/institution implementations

5. **Did I apply middleware in correct order?**
   - Auth → Role → Validate → Controller

6. **Am I handling errors correctly?**
   - Throwing errors, not returning them
   - Using asyncHandler wrapper

---

**END OF GENERAL ARCHITECTURE DOCUMENTATION**
