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
