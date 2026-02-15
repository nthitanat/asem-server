# ASEM Server API Documentation

Base URL: `http://localhost:5000/api/v1`

## Authentication

All protected endpoints require a JWT access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

## Endpoints

---

## 🔐 Authentication Endpoints

### 1. Register New User
**POST** `/auth/register`

Creates a new user account and sends email verification.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "bestContactEmail": "john.doe@work.com",
  "institution": "University Name",
  "department": "Computer Science",
  "areasOfExpertise": "AI, Machine Learning",
  "country": "USA",
  "researchNetwork": "Academic Research Network"
}
```

**Required Fields:**
- `email` - Valid email address
- `username` - 3-30 alphanumeric characters
- `password` - Min 8 chars, must include uppercase, lowercase, number, and special character

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "role": "user",
      "email_verified": false,
      ...
    }
  }
}
```

---

### 2. Login
**POST** `/auth/login`

Authenticate user and get access/refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "emailVerified": false
  }
}
```

**Note:** Users can login with unverified email, but some actions require verification.

---

### 3. Refresh Access Token
**POST** `/auth/refresh-token`

Get a new access token using refresh token (token rotation).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

**Note:** Old refresh token is revoked (rotation strategy).

---

### 4. Logout
**POST** `/auth/logout` 🔒

Revoke refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`

---

### 5. Verify Email
**GET** `/auth/verify-email?token=<verification_token>`

Verify user's email address.

**Query Parameters:**
- `token` - Email verification token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": { ... }
  }
}
```

---

### 6. Resend Verification Email
**POST** `/auth/resend-verification`

Resend email verification link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Rate Limit:** 5 requests per hour per IP

---

### 7. Forgot Password
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

**Note:** Always returns success to prevent email enumeration.

**Rate Limit:** 3 requests per hour per IP

---

### 8. Verify Reset Token
**GET** `/auth/verify-reset-token?token=<reset_token>`

Check if password reset token is valid.

**Query Parameters:**
- `token` - Password reset token

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true
  }
}
```

---

### 9. Reset Password
**POST** `/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Note:** All user sessions are terminated after password reset.

---

### 10. Change Password
**POST** `/auth/change-password` 🔒

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "refreshToken": "current_refresh_token" 
}
```

**Response:** `200 OK`

**Note:** All other sessions are terminated except current one.

---

### 11. Get Current User
**GET** `/auth/me` 🔒

Get authenticated user's information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User data retrieved",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "role": "user",
      "emailVerified": true
    }
  }
}
```

---

## 👥 User Management Endpoints

### 1. Get All Users
**GET** `/users` 🔒 👑 Admin/Moderator

List all users with pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20, max: 100)
- `includeDeleted` (optional) - Include soft-deleted users (default: false)

**Example:**
```
GET /api/v1/users?page=1&limit=20
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Required:** Email verified + Admin or Moderator role

---

### 2. Get User by ID
**GET** `/users/:id` 🔒

Get specific user details.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` - User ID

**Example:**
```
GET /api/v1/users/5
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "user@example.com",
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      ...
    }
  }
}
```

**Permissions:** Admin, Moderator, or the user themselves

---

### 3. Create User
**POST** `/users` 🔒 👑 Admin Only

Manually create a new user account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "Password123!",
  "firstName": "New",
  "lastName": "User",
  "role": "moderator",
  ... (same fields as registration)
}
```

**Optional:** `role` field (admin, moderator, user)

**Response:** `201 Created`

**Required:** Email verified + Admin role

---

### 4. Update User
**PUT** `/users/:id` 🔒

Update user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` - User ID

**Request Body:** (all fields optional)
```json
{
  "email": "newemail@example.com",
  "username": "newusername",
  "firstName": "Updated",
  "lastName": "Name",
  "institution": "New University",
  "department": "New Department",
  "areasOfExpertise": "Updated expertise",
  "country": "Canada",
  "researchNetwork": "New network",
  "role": "moderator",
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": { ... }
  }
}
```

**Permissions:** Admin, Moderator, or the user themselves

---

### 5. Delete User
**DELETE** `/users/:id` 🔒 👑 Admin Only

Delete user (soft or hard delete).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` - User ID

**Query Parameters:**
- `hard` (optional) - Set to "true" for permanent deletion (default: false)

**Examples:**
```
DELETE /api/v1/users/5              (soft delete)
DELETE /api/v1/users/5?hard=true    (permanent delete)
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Warning:** Hard delete is permanent and cannot be undone!

**Required:** Email verified + Admin role

---

### 6. Restore User
**POST** `/users/:id/restore` 🔒 👑 Admin Only

Restore a soft-deleted user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `id` - User ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "user": { ... }
  }
}
```

**Required:** Email verified + Admin role

---

## 🏥 Health Check

### Server Health
**GET** `/health`

Check if server is running.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "uptime": 12345,
    "timestamp": "2026-02-14T10:30:00.000Z"
  }
}
```

### API Health
**GET** `/api/v1/health`

Check if API is running.

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `UNAUTHORIZED` | Authentication required or failed |
| `TOKEN_REQUIRED` | No access token provided |
| `TOKEN_EXPIRED` | Access token has expired |
| `INVALID_TOKEN` | Token is invalid |
| `EMAIL_NOT_VERIFIED` | Email verification required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ENTRY` | Email or username already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| General API | 100 requests / 15 min |
| Login/Register | 10 requests / 15 min |
| Password Reset | 3 requests / 1 hour |
| Email Verification | 5 requests / 1 hour |

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **user** | Access own profile, update own info |
| **moderator** | All user permissions + view all users |
| **admin** | All permissions including user management |

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

## Token Lifetimes

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Email Verification Token:** 24 hours
- **Password Reset Token:** 1 hour

---

## Testing with cURL

### Complete Registration Flow

1. **Register:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Verify Email:**
```bash
curl "http://localhost:5000/api/v1/auth/verify-email?token=YOUR_TOKEN"
```

3. **Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

4. **Access Protected Route:**
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Legend

- 🔒 = Requires authentication
- 👑 = Requires admin/moderator role
- ✉️ = Verified email required
