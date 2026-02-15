# ASEM Server - Quick Start Guide

## Prerequisites Checklist

- [x] Node.js >= 14.x installed
- [x] MySQL >= 5.7 or >= 8.0 installed and running
- [ ] SMTP server credentials (Gmail, SendGrid, etc.)
- [ ] Database created in MySQL

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure MySQL Database

Create a database in MySQL:

```sql
CREATE DATABASE asem_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure Environment Variables

The `.env` file has been created. Update the following values:

**Database Settings:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=asem_db
DB_USER=root
DB_PASSWORD=your_mysql_password
```

**JWT Secret (IMPORTANT):**
```env
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
```

**Email Settings (Choose one):**

**Option A: Gmail**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

To get Gmail App Password:
1. Go to Google Account Settings
2. Security → 2-Step Verification (must be enabled)
3. App Passwords → Generate new password
4. Use this password in SMTP_PASS

**Option B: SendGrid**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Frontend URL:**
```env
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 5. Database Table Synchronization

On first startup, the server will:
1. Check if tables exist
2. Show you what needs to be created/updated
3. Ask for confirmation before making changes

Example output:
```
📋 Creating table: users

CREATE TABLE `users` (...)

Create table 'users'? (y/n): y
✅ Table 'users' created successfully
```

Just answer `y` to create all tables.

## Testing the API

### Health Check

```bash
curl http://localhost:5000/health
```

### Register a User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User",
    "institution": "Test University",
    "country": "USA"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

## Project Structure

```
asem-server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers (thin layer)
│   ├── middleware/      # Express middleware
│   ├── models/          # Database queries (raw SQL)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── validators/      # Input validation schemas
│   └── server.js        # Entry point
├── logs/                # Application logs
├── .env                 # Environment variables (DO NOT COMMIT)
├── .env.example         # Environment template
└── package.json
```

## Common Issues & Solutions

### Issue: "Access denied for user"
**Solution:** Update DB_USER and DB_PASSWORD in .env

### Issue: "Database does not exist"
**Solution:** Create the database in MySQL:
```sql
CREATE DATABASE asem_db;
```

### Issue: "Failed to send email"
**Solution:** 
- Check SMTP credentials
- For Gmail: Enable App Passwords
- Test with a simple SMTP tool first

### Issue: "Port 5000 already in use"
**Solution:** Change PORT in .env or stop the other process

## Next Steps

1. **Create an Admin User:**
   After registration, manually update the database:
   ```sql
   UPDATE users SET role = 'admin', email_verified = true WHERE email = 'your-email@example.com';
   ```

2. **Test All Endpoints:**
   - Use Postman or Thunder Client
   - Import the API collection (see API_DOCUMENTATION.md)

3. **Production Deployment:**
   - Set NODE_ENV=production
   - Use a strong JWT_SECRET
   - Configure proper SMTP service
   - Set up SSL/TLS
   - Use environment-specific .env files

## API Base URL

Development: `http://localhost:5000/api/v1`

## Available Endpoints

### Authentication
- POST `/auth/register` - Register new user
- POST `/auth/login` - Login
- POST `/auth/refresh-token` - Refresh access token
- POST `/auth/logout` - Logout
- GET `/auth/verify-email?token=xxx` - Verify email
- POST `/auth/resend-verification` - Resend verification email
- POST `/auth/forgot-password` - Request password reset
- POST `/auth/reset-password` - Reset password
- POST `/auth/change-password` - Change password (authenticated)
- GET `/auth/me` - Get current user info

### Users
- GET `/users` - List all users (admin/moderator)
- POST `/users` - Create user (admin)
- GET `/users/:id` - Get user by ID
- PUT `/users/:id` - Update user
- DELETE `/users/:id` - Delete user (admin)
- POST `/users/:id/restore` - Restore deleted user (admin)

## Support

For issues or questions, check the logs in the `logs/` directory:
- `error.log` - Error logs
- `combined.log` - All logs

## Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Update database credentials
- [ ] Configure proper SMTP service
- [ ] Review CORS_ORIGINS for production
- [ ] Never commit .env file to git
- [ ] Use HTTPS in production
- [ ] Regularly update dependencies
- [ ] Monitor logs for suspicious activity
