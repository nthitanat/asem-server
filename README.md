# ASEM Server API

Node.js REST API server with JWT authentication, role-based access control, and MySQL database.

## Features

- 🔐 JWT authentication with access/refresh token rotation
- 📧 Email verification and password reset
- 👥 Role-based access control (admin, moderator, user)
- 🗄️ MySQL database with automatic schema synchronization
- ✅ Input validation with Joi
- 🔒 Security best practices (bcrypt, helmet, rate limiting)
- 📝 Comprehensive logging with Winston
- 🚀 RESTful API design with versioning

## Prerequisites

- Node.js >= 14.x
- MySQL >= 5.7 or >= 8.0
- SMTP server for email sending (Gmail, SendGrid, etc.)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
   - Database credentials
   - JWT secret key (min 32 characters)
   - SMTP server settings
   - Frontend URL

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Documentation

Base URL: `http://localhost:5000/api/v1`

### Authentication Endpoints

#### Public Routes
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/verify-email?token=xxx` - Verify email
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/forgot-password` - Request password reset
- `GET /auth/verify-reset-token?token=xxx` - Verify reset token
- `POST /auth/reset-password` - Reset password with token

#### Protected Routes
- `POST /auth/logout` - Logout user
- `POST /auth/change-password` - Change password
- `GET /auth/me` - Get current user info

### User Endpoints

All user endpoints require authentication and appropriate roles.

- `GET /users` - List users (admin, moderator)
- `POST /users` - Create user (admin)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Soft delete user (admin)
- `DELETE /users/:id?hard=true` - Hard delete user (admin)
- `POST /users/:id/restore` - Restore soft-deleted user (admin)

### Health Check

- `GET /health` - Server health status

## Project Structure

```
asem-server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database queries
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation schemas
│   └── server.js        # Entry point
├── .env                 # Environment variables
└── package.json
```

## Database Schema

The server automatically creates and synchronizes the following tables:

- `users` - User accounts and profiles
- `refresh_tokens` - JWT refresh tokens
- `email_verification_tokens` - Email verification tokens
- `password_reset_tokens` - Password reset tokens

## Table Synchronization Workflow

The table sync utility ([src/utils/tableSync.util.js](src/utils/tableSync.util.js)) runs automatically at server startup and ensures database tables match the schema definitions in [src/config/tableSchemas.js](src/config/tableSchemas.js).

### Workflow Process

#### 1. Server Startup Sequence
```
Server starts → Database connection → Table synchronization → Server ready
```

#### 2. Initialization Phase
- Loads table schemas from [tableSchemas.js](src/config/tableSchemas.js)
- Processes tables in dependency order (respects foreign key relationships):
  - `users` → `refresh_tokens` → `email_verification_tokens` → `password_reset_tokens`

#### 3. Table Synchronization (for each table)

**If table does NOT exist:**
1. Queries `information_schema.tables` to check existence
2. Builds `CREATE TABLE` statement with columns, constraints, and indexes
3. Requests confirmation (development) or auto-confirms (production)
4. Executes CREATE TABLE statement
5. Result: `CREATED` ✅

**If table EXISTS:**
1. Queries `information_schema.columns` for current structure
2. Compares schema definition vs database structure
3. Detects three types of differences:

   **a) Missing Columns** (in schema, not in DB):
   - Generates `ALTER TABLE ADD COLUMN` statement
   - Requests confirmation for each column
   - Executes if confirmed
   
   **b) Extra Columns** (in DB, not in schema):
   - Displays warning message
   - Does NOT delete (safety feature)
   - Requires manual review
   
   **c) Type Mismatches** (column exists but different type):
   - Displays warning with schema vs DB types
   - Does NOT modify (safety feature)
   - Requires manual ALTER TABLE

4. Result: `UP_TO_DATE` ✅ | `UPDATED` ✅ | `WARNINGS` ⚠️ | `ERROR` ❌

#### 4. Summary Report
Displays final status for all tables with changes and warnings:
```
═══════════════════════════════════════════════════════
📊 Database Synchronization Summary:
═══════════════════════════════════════════════════════

users: UP_TO_DATE
refresh_tokens: CREATED
  ✅ Table 'refresh_tokens' created successfully

email_verification_tokens: WARNINGS
  ⚠️  Extra columns: old_column - manual review required
  
password_reset_tokens: UPDATED
  ✅ Added column 'expires_at'
═══════════════════════════════════════════════════════
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Token rotation on refresh
- Rate limiting to prevent brute force
- SQL injection prevention (prepared statements)
- XSS protection with Helmet
- CORS configuration
- Email verification required
- Role-based access control

## Development

```bash
npm run dev
```

## License

ISC
# asem-server
