# General Architecture Documentation

**Last Updated**: March 15, 2026  
**Purpose**: Comprehensive guide to the Node.js/Express API architecture  
**Audience**: Future developers and AI assistants working with this codebase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Data Flow Patterns](#data-flow-patterns)
4. [Case Conversion System](#case-conversion-system)
5. [Standard Patterns by Layer](#standard-patterns-by-layer)
6. [Naming Conventions](#naming-conventions)
7. [Error Handling](#error-handling)
8. [Adding New Resources](#adding-new-resources)
9. [Common Pitfalls](#common-pitfalls)

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

// Endpoint with middleware chain
router.post(
  '/',
  authenticateToken,           // 1. Authenticate
  requireRole(['admin']),      // 2. Authorize
  validate(resourceSchema),    // 3. Validate
  resourceController.create    // 4. Handle request
);

module.exports = router;
```

**Middleware Execution Order**:
1. Authentication (`authenticateToken`)
2. Authorization (`requireRole`, `requireOwnerOrAdmin`)
3. Email verification (`requireEmailVerified`)
4. Validation (`validate`)
5. Controller method

---

### 2. Middleware (`src/middleware/*.middleware.js`)

**Purpose**: Cross-cutting concerns that run before controllers

**Available Middleware**:

#### `auth.middleware.js`
- `authenticateToken` - Verifies JWT, attaches `req.user`
- Must run FIRST on protected routes

#### `role.middleware.js`
- `requireRole(['admin', 'moderator'])` - Check user role
- `requireOwnerOrAdmin('userId')` - Allow owner or admin
- Depends on `authenticateToken` running first

#### `emailVerified.middleware.js`
- `requireEmailVerified` - Blocks unverified email users
- Depends on `authenticateToken` running first

#### `validate.middleware.js`
- `validate(schema, 'body')` - Validates with Joi schema
- Supports: `'body'`, `'query'`, `'params'`
- Strips unknown fields automatically

#### `rateLimiter.middleware.js`
- Rate limiting (configured per environment)

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
- ❌ **DON'T**: Handle HTTP responses
- ❌ **DON'T**: Access `req` or `res` objects
- ❌ **DON'T**: Write SQL queries

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
query(sql, params)       // Execute query, return array
queryOne(sql, params)    // Execute query, return single object
```

#### `logger.util.js`
```javascript
logger.info(message)     // Info level
logger.warn(message)     // Warning level
logger.error(message)    // Error level
```

#### `jwt.util.js`
```javascript
generateToken(payload, expiresIn)
verifyToken(token)
```

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

### 1. Database Table

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_name (name),
  INDEX idx_deleted (deleted_at)
);
```

**Note**: Use snake_case for all column names!

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

**CORRECT**:
```javascript
router.post(
  '/',
  authenticateToken,       // ✅ 1. Authenticate first
  requireRole(['admin']),  // ✅ 2. Then check role
  validate(schema),        // ✅ 3. Then validate
  controller.create        // ✅ 4. Finally handle
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
| Add new endpoint | Create route → validator → controller → service → model |
| Accept input | Validate with Joi in camelCase |
| Call model | Pass object, receive camelCase back |
| Write SQL | Use snake_case columns, parameterized queries |
| Return data | Models convert to camelCase automatically |
| Handle errors | Throw descriptive errors, middleware handles rest |
| Check auth | Apply middleware: auth → role → validate → controller |

### File Creation Order (New Resource)

1. Database table (snake_case)
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
