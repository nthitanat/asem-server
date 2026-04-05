# ASEM Server — API Documentation

**Last Updated**: April 4, 2026  
**API Version**: v1

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://engagement.chula.ac.th/asem-api/api/v1` |
| **Development** | `http://localhost:5001/api/v1` |

> All endpoints below are relative to the Base URL unless otherwise stated.

---

## Table of Contents

1. [Response Format](#response-format)
2. [Authentication](#authentication)
3. [Error Codes](#error-codes)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Auth](#auth)
   - [Users](#users)
   - [Countries](#countries)
   - [Institutions](#institutions)
   - [Research Networks](#research-networks)
   - [Announcements](#announcements)
   - [Discussions](#discussions)
6. [Static Files](#static-files)
7. [Quick Reference — All Endpoints](#quick-reference--all-endpoints)

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "code": "ERROR_CODE"
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ]
  }
}
```

---

## Authentication

Protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

- **Access tokens** are short-lived JWTs.
- **Refresh tokens** are long-lived and used to obtain new access tokens.
- Tokens include `issuer: "asem-server"` and `audience: "asem-client"` claims.

### Roles

| Role | Description |
|------|-------------|
| `user` | Default role. Standard access. |
| `moderator` | Can manage announcements and view users. |
| `admin` | Full access to all resources. |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/query/params validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `AUTH_ERROR` | 401 | Invalid credentials (email/password) |
| `TOKEN_ERROR` | 401 | Token expired, invalid, or revoked |
| `INVALID_TOKEN` | 400 | Reset/verification token invalid |
| `ACCOUNT_INACTIVE` | 403 | User account is deactivated |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource or route not found |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `USERNAME_EXISTS` | 409 | Username already taken |
| `DUPLICATE_ENTRY` | 409 | Generic duplicate entry |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

| Scope | Window | Max Requests | Applied To |
|-------|--------|-------------|------------|
| General API | 15 min | 100 | All `/api` routes |
| Auth (register, login) | 15 min | 10 (skips successful) | `POST /auth/register`, `POST /auth/login` |
| Password Reset | 1 hour | 3 | `POST /auth/forgot-password` |
| Email Verification | 1 hour | 5 | `POST /auth/resend-verification` |

Rate-limited responses return `429 Too Many Requests`:

```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later.",
    "code": "TOO_MANY_REQUESTS"
  }
}
```

---

## Endpoints

---

### Health Check

#### `GET /health`

> **Note**: This is relative to the root URL (`https://engagement.chula.ac.th/asem-api/health` or `http://localhost:5001/health`), not the API base.

**Auth**: None

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "uptime": 12345.678,
    "timestamp": "2026-04-04T12:00:00.000Z"
  }
}
```

#### `GET /api/v1/health`

**Auth**: None

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "version": "v1",
    "uptime": 12345.678,
    "timestamp": "2026-04-04T12:00:00.000Z"
  }
}
```

---

### Auth

#### `POST /auth/register`

Register a new user account.

**Auth**: None  
**Rate Limit**: `authLimiter` (15 min / 10 requests)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Valid email address |
| `username` | string | ✅ | Alphanumeric, 3–30 characters |
| `password` | string | ✅ | Min 8 chars, must include uppercase, lowercase, digit, special char (`@$!%*?&`) |
| `firstName` | string | ❌ | Max 100 characters |
| `lastName` | string | ❌ | Max 100 characters |
| `bestContactEmail` | string | ❌ | Valid email |
| `institutionId` | integer | ❌ | Positive integer (valid institution ID) |
| `department` | string | ❌ | Max 255 characters |
| `areasOfExpertise` | string | ❌ | Max 1000 characters |
| `countryId` | integer | ❌ | Positive integer (valid country ID) |
| `researchNetworkId` | integer | ❌ | Positive integer (valid research network ID) |
| `fieldOfStudy` | string | ❌ | Max 255 characters |

**Example Request**:
```json
{
  "email": "john.doe@example.com",
  "username": "johndoe",
  "password": "SecurePass1!",
  "firstName": "John",
  "lastName": "Doe",
  "institutionId": 1,
  "countryId": 5,
  "researchNetworkId": 2,
  "department": "Computer Science",
  "fieldOfStudy": "Artificial Intelligence"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "bestContactEmail": null,
      "institutionId": 1,
      "department": "Computer Science",
      "areasOfExpertise": null,
      "countryId": 5,
      "researchNetworkId": 2,
      "fieldOfStudy": "Artificial Intelligence",
      "role": "user",
      "emailVerified": false,
      "isActive": true,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `409` | `EMAIL_EXISTS` | Email already registered |
| `409` | `USERNAME_EXISTS` | Username already taken |
| `400` | `VALIDATION_ERROR` | Invalid input fields |

---

#### `POST /auth/login`

Authenticate a user and receive tokens.

**Auth**: None  
**Rate Limit**: `authLimiter` (15 min / 10 requests)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Registered email address |
| `password` | string | ✅ | Account password |

**Example Request**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass1!"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "emailVerified": true,
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "emailVerified": true
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_ERROR` | Invalid email or password |
| `403` | `ACCOUNT_INACTIVE` | Account is deactivated |

---

#### `POST /auth/refresh-token`

Obtain a new access token using a refresh token.

**Auth**: None

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | ✅ | Valid, non-expired refresh token |

**Example Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `401` | `TOKEN_ERROR` | Refresh token expired, revoked, or invalid |

---

#### `POST /auth/logout`

Revoke the refresh token to log out.

**Auth**: 🔒 Bearer Token

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | ✅ | The refresh token to revoke |

**Example Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

#### `GET /auth/verify-email`

Verify email address using the token sent via email.

**Auth**: None

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Email verification token |

**Example Request**:
```
GET /auth/verify-email?token=abc123def456...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Token missing |
| `401` | `TOKEN_ERROR` | Token invalid or expired |

---

#### `POST /auth/resend-verification`

Resend the email verification link.

**Auth**: None  
**Rate Limit**: `emailVerificationLimiter` (1 hour / 5 requests)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Registered email address |

**Example Request**:
```json
{
  "email": "john.doe@example.com"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": null
}
```

---

#### `POST /auth/forgot-password`

Request a password reset email.

**Auth**: None  
**Rate Limit**: `passwordResetLimiter` (1 hour / 3 requests)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Registered email address |

**Example Request**:
```json
{
  "email": "john.doe@example.com"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent.",
  "data": null
}
```

> The response is intentionally identical whether the email exists or not (to prevent user enumeration).

---

#### `GET /auth/verify-reset-token`

Check whether a password reset token is still valid.

**Auth**: None

**Query Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Password reset token |

**Example Request**:
```
GET /auth/verify-reset-token?token=abc123def456...
```

**Response** `200 OK` (valid token):
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true
  }
}
```

**Response** `400 Bad Request` (invalid token):
```json
{
  "success": false,
  "error": {
    "message": "Token is invalid or has expired",
    "code": "INVALID_TOKEN"
  }
}
```

---

#### `POST /auth/reset-password`

Reset password using the reset token.

**Auth**: None

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Password reset token |
| `newPassword` | string | ✅ | New password (min 8 chars, uppercase, lowercase, digit, special char) |

**Example Request**:
```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecure1!"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `401` | `TOKEN_ERROR` | Token invalid or expired |
| `400` | `VALIDATION_ERROR` | Password doesn't meet requirements |

---

#### `POST /auth/change-password`

Change password for the currently authenticated user.

**Auth**: 🔒 Bearer Token

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPassword` | string | ✅ | Current account password |
| `newPassword` | string | ✅ | New password (min 8 chars, uppercase, lowercase, digit, special char) |

**Example Request**:
```json
{
  "currentPassword": "OldSecure1!",
  "newPassword": "NewSecure2@"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_ERROR` | Current password incorrect |
| `400` | `VALIDATION_ERROR` | New password doesn't meet requirements |

---

#### `GET /auth/me`

Retrieve the currently authenticated user's profile.

**Auth**: 🔒 Bearer Token

**Example Request**:
```
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "User data retrieved",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "bestContactEmail": null,
      "institutionId": 1,
      "department": "Computer Science",
      "areasOfExpertise": null,
      "countryId": 5,
      "researchNetworkId": 2,
      "fieldOfStudy": "Artificial Intelligence",
      "role": "user",
      "emailVerified": true,
      "isActive": true,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

---

### Users

> All user endpoints require authentication. Most require email verification.

#### `GET /users`

List all users with pagination. **Admin & Moderator only.**

**Auth**: 🔒 Bearer Token (admin, moderator)  
**Email Verified**: ✅ Required

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1) |
| `limit` | integer | `20` | Items per page (1–100) |
| `includeDeleted` | boolean | `false` | Include soft-deleted users |

**Example Request**:
```
GET /users?page=1&limit=10&includeDeleted=false
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "email": "admin@example.com",
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User",
        "bestContactEmail": null,
        "institutionId": 1,
        "department": "IT",
        "areasOfExpertise": null,
        "countryId": 1,
        "researchNetworkId": null,
        "fieldOfStudy": null,
        "role": "admin",
        "emailVerified": true,
        "isActive": true,
        "deletedAt": null,
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "email": "john.doe@example.com",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "bestContactEmail": "john.personal@gmail.com",
        "institutionId": 1,
        "department": "Computer Science",
        "areasOfExpertise": "AI, Machine Learning",
        "countryId": 5,
        "researchNetworkId": 2,
        "fieldOfStudy": "Artificial Intelligence",
        "role": "user",
        "emailVerified": true,
        "isActive": true,
        "deletedAt": null,
        "createdAt": "2026-01-15T08:30:00.000Z",
        "updatedAt": "2026-03-20T14:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### `GET /users/:id`

Get a single user by ID. **Admin, Moderator, or Self.**

**Auth**: 🔒 Bearer Token (owner, admin, moderator)  
**Email Verified**: ✅ Required

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID (positive integer) |

**Example Request**:
```
GET /users/10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "bestContactEmail": null,
      "institutionId": 1,
      "department": "Computer Science",
      "areasOfExpertise": "AI, Machine Learning",
      "countryId": 5,
      "researchNetworkId": 2,
      "fieldOfStudy": "Artificial Intelligence",
      "role": "user",
      "emailVerified": true,
      "isActive": true,
      "deletedAt": null,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `403` | `FORBIDDEN` | Not owner or admin |
| `404` | `NOT_FOUND` | User not found |

---

#### `POST /users`

Create a new user (admin action — bypasses email verification flow).

**Auth**: 🔒 Bearer Token (admin only)  
**Email Verified**: ✅ Required

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Valid email address |
| `username` | string | ✅ | Alphanumeric, 3–30 chars |
| `password` | string | ✅ | Min 8 chars with complexity requirements |
| `firstName` | string | ❌ | Max 100 chars |
| `lastName` | string | ❌ | Max 100 chars |
| `bestContactEmail` | string | ❌ | Valid email |
| `institutionId` | integer | ❌ | Valid institution ID |
| `department` | string | ❌ | Max 255 chars |
| `areasOfExpertise` | string | ❌ | Max 1000 chars |
| `countryId` | integer | ❌ | Valid country ID |
| `researchNetworkId` | integer | ❌ | Valid research network ID |
| `fieldOfStudy` | string | ❌ | Max 255 chars |
| `role` | string | ❌ | `"admin"`, `"moderator"`, or `"user"` |

**Example Request**:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass1!",
  "firstName": "New",
  "lastName": "User",
  "role": "moderator",
  "institutionId": 3,
  "countryId": 1
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 11,
      "email": "newuser@example.com",
      "username": "newuser",
      "firstName": "New",
      "lastName": "User",
      "bestContactEmail": null,
      "institutionId": 3,
      "department": null,
      "areasOfExpertise": null,
      "countryId": 1,
      "researchNetworkId": null,
      "fieldOfStudy": null,
      "role": "moderator",
      "emailVerified": false,
      "isActive": true,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

---

#### `PUT /users/:id`

Update user profile. **Admin, Moderator, or Self.**

**Auth**: 🔒 Bearer Token (owner, admin, moderator)  
**Email Verified**: ✅ Required

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |

**Request Body** (`application/json`) — at least one field required:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ❌ | Valid email |
| `username` | string | ❌ | Alphanumeric, 3–30 chars |
| `firstName` | string | ❌ | Max 100 chars (can be empty string) |
| `lastName` | string | ❌ | Max 100 chars (can be empty string) |
| `bestContactEmail` | string | ❌ | Valid email (can be empty string) |
| `institutionId` | integer | ❌ | Valid institution ID |
| `department` | string | ❌ | Max 255 chars (can be empty string) |
| `areasOfExpertise` | string | ❌ | Max 1000 chars (can be empty string) |
| `countryId` | integer | ❌ | Valid country ID |
| `researchNetworkId` | integer | ❌ | Valid research network ID |
| `fieldOfStudy` | string | ❌ | Max 255 chars (can be empty string) |
| `role` | string | ❌ | `"admin"`, `"moderator"`, or `"user"` (admin only) |
| `isActive` | boolean | ❌ | Activate/deactivate account (admin only) |

**Example Request**:
```json
{
  "firstName": "Jonathan",
  "department": "Data Science",
  "areasOfExpertise": "NLP, Computer Vision"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "Jonathan",
      "lastName": "Doe",
      "bestContactEmail": null,
      "institutionId": 1,
      "department": "Data Science",
      "areasOfExpertise": "NLP, Computer Vision",
      "countryId": 5,
      "researchNetworkId": 2,
      "fieldOfStudy": "Artificial Intelligence",
      "role": "user",
      "emailVerified": true,
      "isActive": true,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:30:00.000Z"
    }
  }
}
```

---

#### `DELETE /users/:id`

Delete a user (soft or hard delete). **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)  
**Email Verified**: ✅ Required

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `hard` | boolean | `false` | `true` = permanent delete, `false` = soft delete |

**Example Request** (soft delete):
```
DELETE /users/10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request** (hard delete):
```
DELETE /users/10?hard=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "User soft deleted successfully",
  "data": null
}
```

---

#### `POST /users/:id/restore`

Restore a soft-deleted user. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)  
**Email Verified**: ✅ Required

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | User ID |

**Example Request**:
```
POST /users/10/restore
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "user": {
      "id": 10,
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "emailVerified": true,
      "isActive": true,
      "deletedAt": null,
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T13:00:00.000Z"
    }
  }
}
```

---

### Countries

#### `GET /countries`

List all countries. **Public** — no authentication required.

**Auth**: None

**Example Request**:
```
GET /countries
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Countries retrieved successfully",
  "data": {
    "countries": [
      {
        "id": 1,
        "name": "Thailand",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Japan",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": 3,
        "name": "Germany",
        "createdAt": "2026-01-15T00:00:00.000Z",
        "updatedAt": "2026-01-15T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### `GET /countries/:id`

Get a single country by ID.

**Auth**: 🔒 Bearer Token (any authenticated user)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Country ID |

**Example Request**:
```
GET /countries/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Country retrieved successfully",
  "data": {
    "country": {
      "id": 1,
      "name": "Thailand",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `404` | `NOT_FOUND` | Country not found |

---

#### `POST /countries`

Create a new country. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Country name, 1–100 chars |

**Example Request**:
```json
{
  "name": "South Korea"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Country created successfully",
  "data": {
    "country": {
      "id": 4,
      "name": "South Korea",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `409` | `DUPLICATE_ENTRY` | Country name already exists |

---

#### `PUT /countries/:id`

Update a country. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Country ID |

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Updated country name, 1–100 chars |

**Example Request**:
```json
{
  "name": "Republic of Korea"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Country updated successfully",
  "data": {
    "country": {
      "id": 4,
      "name": "Republic of Korea",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:30:00.000Z"
    }
  }
}
```

---

#### `DELETE /countries/:id`

Delete a country. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Country ID |

**Example Request**:
```
DELETE /countries/4
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Country deleted successfully",
  "data": null
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INTERNAL_ERROR` | Cannot delete — country has associated institutions (FK RESTRICT) |

---

### Institutions

#### `GET /institutions`

List all institutions with pagination. **Public** — no authentication required.

**Auth**: None

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1) |
| `limit` | integer | `20` | Items per page (1–100) |

**Example Request**:
```
GET /institutions?page=1&limit=10
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Institutions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Chulalongkorn University",
        "countryId": 1,
        "countryName": "Thailand",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "University of Tokyo",
        "countryId": 2,
        "countryName": "Japan",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### `GET /institutions/country/:countryId`

List institutions belonging to a specific country with pagination. **Public** — no authentication required.

**Auth**: None

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `countryId` | integer | Country ID (positive integer) |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1) |
| `limit` | integer | `20` | Items per page (1–100) |

**Example Request**:
```
GET /institutions/country/1?page=1&limit=10
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Institutions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Chulalongkorn University",
        "countryId": 1,
        "countryName": "Thailand",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `404` | `NOT_FOUND` | Country not found |

---

#### `GET /institutions/:id`

Get a single institution by ID.

**Auth**: 🔒 Bearer Token (any authenticated user)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Institution ID |

**Example Request**:
```
GET /institutions/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Institution retrieved successfully",
  "data": {
    "institution": {
      "id": 1,
      "name": "Chulalongkorn University",
      "countryId": 1,
      "countryName": "Thailand",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

---

#### `POST /institutions`

Create a new institution. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Institution name, 1–255 chars |
| `countryId` | integer | ✅ | Associated country ID |

**Example Request**:
```json
{
  "name": "Seoul National University",
  "countryId": 4
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Institution created successfully",
  "data": {
    "institution": {
      "id": 3,
      "name": "Seoul National University",
      "countryId": 4,
      "countryName": "Republic of Korea",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

---

#### `PUT /institutions/:id`

Update an institution. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Institution ID |

**Request Body** (`application/json`) — at least one field required:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ❌ | Updated name, 1–255 chars |
| `countryId` | integer | ❌ | Updated country ID |

**Example Request**:
```json
{
  "name": "SNU - Seoul National University"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Institution updated successfully",
  "data": {
    "institution": {
      "id": 3,
      "name": "SNU - Seoul National University",
      "countryId": 4,
      "countryName": "Republic of Korea",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:30:00.000Z"
    }
  }
}
```

---

#### `DELETE /institutions/:id`

Delete an institution. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Institution ID |

**Example Request**:
```
DELETE /institutions/3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Institution deleted successfully",
  "data": null
}
```

---

### Research Networks

#### `GET /research-networks`

List all research networks. **Public** — no authentication required.

**Auth**: None

**Example Request**:
```
GET /research-networks
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Research networks retrieved successfully",
  "data": {
    "researchNetworks": [
      {
        "id": 1,
        "name": "ASEAN Research Network",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "EU-Asia Science Bridge",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### `GET /research-networks/:id`

Get a single research network by ID.

**Auth**: 🔒 Bearer Token (any authenticated user)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Research network ID |

**Example Request**:
```
GET /research-networks/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Research network retrieved successfully",
  "data": {
    "researchNetwork": {
      "id": 1,
      "name": "ASEAN Research Network",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

---

#### `POST /research-networks`

Create a new research network. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Network name, 1–255 chars |

**Example Request**:
```json
{
  "name": "Pacific Rim Innovation Network"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Research network created successfully",
  "data": {
    "researchNetwork": {
      "id": 3,
      "name": "Pacific Rim Innovation Network",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

---

#### `PUT /research-networks/:id`

Update a research network. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Research network ID |

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Updated name, 1–255 chars |

**Example Request**:
```json
{
  "name": "Pacific Rim Innovation & Research Network"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Research network updated successfully",
  "data": {
    "researchNetwork": {
      "id": 3,
      "name": "Pacific Rim Innovation & Research Network",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:30:00.000Z"
    }
  }
}
```

---

#### `DELETE /research-networks/:id`

Delete a research network. **Admin only.**

**Auth**: 🔒 Bearer Token (admin only)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Research network ID |

**Example Request**:
```
DELETE /research-networks/3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Research network deleted successfully",
  "data": null
}
```

---

### Announcements

#### `GET /announcements`

List announcements with pagination and optional filters. **Public** — no authentication required.

**Auth**: None

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1) |
| `limit` | integer | `20` | Items per page (1–100) |
| `status` | string | — | Filter by status: `"draft"`, `"published"`, or `"archived"` |
| `researchNetworkId` | integer | — | Filter by research network ID |

**Example Request**:
```
GET /announcements?page=1&limit=5&status=published
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Announcements retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "ASEM Annual Conference 2026",
        "content": "We are pleased to announce the upcoming ASEM Annual Conference...",
        "authorId": 1,
        "researchNetworkId": 1,
        "status": "published",
        "isPinned": true,
        "thumbnailUrl": "/uploads/announcements/1/thumbnail.webp",
        "bannerUrl": "/uploads/announcements/1/banner.webp",
        "photoUrl": null,
        "publishedAt": "2026-03-15T09:00:00.000Z",
        "createdAt": "2026-03-10T08:00:00.000Z",
        "updatedAt": "2026-03-15T09:00:00.000Z"
      },
      {
        "id": 2,
        "title": "New Partnership Announcement",
        "content": "ASEM is proud to partner with...",
        "authorId": 3,
        "researchNetworkId": null,
        "status": "published",
        "isPinned": false,
        "thumbnailUrl": "/uploads/announcements/2/thumbnail.webp",
        "bannerUrl": null,
        "photoUrl": "/uploads/announcements/2/photo.webp",
        "publishedAt": "2026-03-20T10:00:00.000Z",
        "createdAt": "2026-03-18T14:00:00.000Z",
        "updatedAt": "2026-03-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 12,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### `GET /announcements/:id`

Get a single announcement by ID. **Public.**

**Auth**: None

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Announcement ID |

**Example Request**:
```
GET /announcements/1
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Announcement retrieved successfully",
  "data": {
    "announcement": {
      "id": 1,
      "title": "ASEM Annual Conference 2026",
      "content": "We are pleased to announce the upcoming ASEM Annual Conference...",
      "authorId": 1,
      "researchNetworkId": 1,
      "status": "published",
      "isPinned": true,
      "thumbnailUrl": "/uploads/announcements/1/thumbnail.webp",
      "bannerUrl": "/uploads/announcements/1/banner.webp",
      "photoUrl": null,
      "publishedAt": "2026-03-15T09:00:00.000Z",
      "deletedAt": null,
      "createdAt": "2026-03-10T08:00:00.000Z",
      "updatedAt": "2026-03-15T09:00:00.000Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `404` | `NOT_FOUND` | Announcement not found |

---

#### `POST /announcements`

Create a new announcement. **Admin or Moderator only.**

**Auth**: 🔒 Bearer Token (admin, moderator)  
**Content-Type**: `multipart/form-data` (when uploading images) or `application/json`

**Form Fields / Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Announcement title, 1–255 chars |
| `content` | string | ✅ | Announcement content (rich text / HTML) |
| `status` | string | ❌ | `"draft"` (default), `"published"`, or `"archived"` |
| `researchNetworkId` | integer | ❌ | Associated research network ID |
| `isPinned` | boolean | ❌ | Pin to top (default: `false`) |

**Image Fields** (optional, `multipart/form-data`):

| Field | Max Size | Accepted Formats | Output Size |
|-------|----------|------------------|-------------|
| `thumbnail` | 5 MB | JPEG, PNG, WebP | 300×200 WebP |
| `banner` | 5 MB | JPEG, PNG, WebP | 1200×400 WebP |
| `photo` | 5 MB | JPEG, PNG, WebP | 1200×800 WebP |

> Images are automatically resized and converted to WebP format.

**Example Request** (JSON, no images):
```json
{
  "title": "Call for Papers — ASEM 2026",
  "content": "We invite researchers to submit papers for the ASEM 2026 conference...",
  "status": "published",
  "researchNetworkId": 1,
  "isPinned": false
}
```

**Example Request** (cURL with images):
```bash
curl -X POST https://engagement.chula.ac.th/asem-api/api/v1/announcements \
  -H "Authorization: Bearer eyJhbGci..." \
  -F "title=Call for Papers — ASEM 2026" \
  -F "content=We invite researchers to submit papers..." \
  -F "status=draft" \
  -F "thumbnail=@./image-thumb.jpg" \
  -F "banner=@./image-banner.png"
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Announcement created successfully",
  "data": {
    "announcement": {
      "id": 5,
      "title": "Call for Papers — ASEM 2026",
      "content": "We invite researchers to submit papers for the ASEM 2026 conference...",
      "authorId": 1,
      "researchNetworkId": 1,
      "status": "published",
      "isPinned": false,
      "thumbnailUrl": "/uploads/announcements/5/thumbnail.webp",
      "bannerUrl": "/uploads/announcements/5/banner.webp",
      "photoUrl": null,
      "publishedAt": "2026-04-04T12:00:00.000Z",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  }
}
```

---

#### `PUT /announcements/:id`

Update an announcement. **Admin or Moderator only.**

**Auth**: 🔒 Bearer Token (admin, moderator)  
**Content-Type**: `multipart/form-data` or `application/json`

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Announcement ID |

**Form Fields / Body** — at least one field required:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ❌ | Updated title, 1–255 chars |
| `content` | string | ❌ | Updated content |
| `status` | string | ❌ | `"draft"`, `"published"`, or `"archived"` |
| `researchNetworkId` | integer | ❌ | Updated research network ID |
| `isPinned` | boolean | ❌ | Pin/unpin |

Image fields (`thumbnail`, `banner`, `photo`) are the same as CREATE — uploading a new image replaces the existing one.

**Example Request**:
```json
{
  "title": "Updated: Call for Papers — ASEM 2026",
  "status": "published"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Announcement updated successfully",
  "data": {
    "announcement": {
      "id": 5,
      "title": "Updated: Call for Papers — ASEM 2026",
      "content": "We invite researchers to submit papers for the ASEM 2026 conference...",
      "authorId": 1,
      "researchNetworkId": 1,
      "status": "published",
      "isPinned": false,
      "thumbnailUrl": "/uploads/announcements/5/thumbnail.webp",
      "bannerUrl": "/uploads/announcements/5/banner.webp",
      "photoUrl": null,
      "publishedAt": "2026-03-15T09:00:00.000Z",
      "createdAt": "2026-04-04T12:00:00.000Z",
      "updatedAt": "2026-04-04T13:00:00.000Z"
    }
  }
}
```

---

#### `DELETE /announcements/:id`

Soft-delete an announcement. **Admin or Moderator only.**

**Auth**: 🔒 Bearer Token (admin, moderator)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Announcement ID |

**Example Request**:
```
DELETE /announcements/5
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Announcement deleted successfully",
  "data": null
}
```

---

### Discussions

Discussions are nested under announcements: `/announcements/:announcementId/discussions`

Discussions support **threaded replies** via the optional `parentId` field.

#### `GET /announcements/:announcementId/discussions`

List discussions for an announcement with pagination. **Public.**

**Auth**: None

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `announcementId` | integer | Parent announcement ID |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1) |
| `limit` | integer | `20` | Items per page (1–100) |

**Example Request**:
```
GET /announcements/1/discussions?page=1&limit=10
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Discussions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "announcementId": 1,
        "parentId": null,
        "authorId": 10,
        "content": "Great announcement! Looking forward to participating.",
        "deletedAt": null,
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-01T10:00:00.000Z"
      },
      {
        "id": 2,
        "announcementId": 1,
        "parentId": 1,
        "authorId": 5,
        "content": "Me too! Are there any specific topics of interest this year?",
        "deletedAt": null,
        "createdAt": "2026-04-01T11:30:00.000Z",
        "updatedAt": "2026-04-01T11:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

#### `GET /announcements/:announcementId/discussions/:id`

Get a single discussion by ID. **Public.**

**Auth**: None

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `announcementId` | integer | Parent announcement ID |
| `id` | integer | Discussion ID |

**Example Request**:
```
GET /announcements/1/discussions/1
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Discussion retrieved successfully",
  "data": {
    "discussion": {
      "id": 1,
      "announcementId": 1,
      "parentId": null,
      "authorId": 10,
      "content": "Great announcement! Looking forward to participating.",
      "deletedAt": null,
      "createdAt": "2026-04-01T10:00:00.000Z",
      "updatedAt": "2026-04-01T10:00:00.000Z"
    }
  }
}
```

---

#### `POST /announcements/:announcementId/discussions`

Create a new discussion (comment or reply) on an announcement. **Authenticated users.**

**Auth**: 🔒 Bearer Token (any authenticated user)

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `announcementId` | integer | Parent announcement ID |

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Discussion content, 1–5000 chars |
| `parentId` | integer | ❌ | ID of parent discussion for threaded replies |

**Example Request** (top-level comment):
```json
{
  "content": "This is a great initiative! How can we contribute?"
}
```

**Example Request** (reply to discussion #1):
```json
{
  "content": "You can contribute by submitting a paper before the deadline.",
  "parentId": 1
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Discussion created successfully",
  "data": {
    "discussion": {
      "id": 3,
      "announcementId": 1,
      "parentId": 1,
      "authorId": 10,
      "content": "You can contribute by submitting a paper before the deadline.",
      "deletedAt": null,
      "createdAt": "2026-04-04T14:00:00.000Z",
      "updatedAt": "2026-04-04T14:00:00.000Z"
    }
  }
}
```

---

#### `PUT /announcements/:announcementId/discussions/:id`

Update a discussion. **Authenticated** — ownership checked in service (author, admin, or moderator can edit).

**Auth**: 🔒 Bearer Token

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `announcementId` | integer | Parent announcement ID |
| `id` | integer | Discussion ID |

**Request Body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Updated content, 1–5000 chars |

**Example Request**:
```json
{
  "content": "Updated: You can contribute by submitting a paper before May 15, 2026."
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Discussion updated successfully",
  "data": {
    "discussion": {
      "id": 3,
      "announcementId": 1,
      "parentId": 1,
      "authorId": 10,
      "content": "Updated: You can contribute by submitting a paper before May 15, 2026.",
      "deletedAt": null,
      "createdAt": "2026-04-04T14:00:00.000Z",
      "updatedAt": "2026-04-04T14:30:00.000Z"
    }
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `403` | `FORBIDDEN` | Not the author and not admin/moderator |
| `404` | `NOT_FOUND` | Discussion not found |

---

#### `DELETE /announcements/:announcementId/discussions/:id`

Soft-delete a discussion. **Authenticated** — ownership checked in service (author, admin, or moderator can delete).

**Auth**: 🔒 Bearer Token

**Path Parameters**:

| Param | Type | Description |
|-------|------|-------------|
| `announcementId` | integer | Parent announcement ID |
| `id` | integer | Discussion ID |

**Example Request**:
```
DELETE /announcements/1/discussions/3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Discussion deleted successfully",
  "data": null
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| `403` | `FORBIDDEN` | Not the author and not admin/moderator |
| `404` | `NOT_FOUND` | Discussion not found |

---

## Static Files

Uploaded announcement images are served as static files:

| Environment | URL Pattern |
|-------------|-------------|
| **Production** | `https://engagement.chula.ac.th/asem-api/uploads/announcements/{id}/{type}.webp` |
| **Development** | `http://localhost:5001/uploads/announcements/{id}/{type}.webp` |

Where `{type}` is `thumbnail`, `banner`, or `photo`.

---

## Quick Reference — All Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/health` | — | — | Server health check |
| `GET` | `/api/v1/health` | — | — | API health check |
| **Auth** | | | | |
| `POST` | `/auth/register` | — | — | Register new user |
| `POST` | `/auth/login` | — | — | Login |
| `POST` | `/auth/refresh-token` | — | — | Refresh access token |
| `POST` | `/auth/logout` | 🔒 | any | Logout (revoke refresh token) |
| `GET` | `/auth/verify-email` | — | — | Verify email (query: `token`) |
| `POST` | `/auth/resend-verification` | — | — | Resend verification email |
| `POST` | `/auth/forgot-password` | — | — | Request password reset |
| `GET` | `/auth/verify-reset-token` | — | — | Check reset token validity |
| `POST` | `/auth/reset-password` | — | — | Reset password with token |
| `POST` | `/auth/change-password` | 🔒 | any | Change own password |
| `GET` | `/auth/me` | 🔒 | any | Get current user profile |
| **Users** | | | | |
| `GET` | `/users` | 🔒 | admin, moderator | List users (paginated) |
| `POST` | `/users` | 🔒 | admin | Create user |
| `GET` | `/users/:id` | 🔒 | owner, admin, mod | Get user by ID |
| `PUT` | `/users/:id` | 🔒 | owner, admin, mod | Update user |
| `DELETE` | `/users/:id` | 🔒 | admin | Delete user (soft/hard) |
| `POST` | `/users/:id/restore` | 🔒 | admin | Restore soft-deleted user |
| **Countries** | | | | |
| `GET` | `/countries` | — | — | List all countries |
| `GET` | `/countries/:id` | 🔒 | any | Get country by ID |
| `POST` | `/countries` | 🔒 | admin | Create country |
| `PUT` | `/countries/:id` | 🔒 | admin | Update country |
| `DELETE` | `/countries/:id` | 🔒 | admin | Delete country |
| **Institutions** | | | | |
| `GET` | `/institutions` | — | — | List institutions (paginated) |
| `GET` | `/institutions/country/:countryId` | — | — | List institutions by country (paginated) |
| `GET` | `/institutions/:id` | 🔒 | any | Get institution by ID |
| `POST` | `/institutions` | 🔒 | admin | Create institution |
| `PUT` | `/institutions/:id` | 🔒 | admin | Update institution |
| `DELETE` | `/institutions/:id` | 🔒 | admin | Delete institution |
| **Research Networks** | | | | |
| `GET` | `/research-networks` | — | — | List all research networks |
| `GET` | `/research-networks/:id` | 🔒 | any | Get research network by ID |
| `POST` | `/research-networks` | 🔒 | admin | Create research network |
| `PUT` | `/research-networks/:id` | 🔒 | admin | Update research network |
| `DELETE` | `/research-networks/:id` | 🔒 | admin | Delete research network |
| **Announcements** | | | | |
| `GET` | `/announcements` | — | — | List announcements (paginated, filterable) |
| `GET` | `/announcements/:id` | — | — | Get announcement by ID |
| `POST` | `/announcements` | 🔒 | admin, moderator | Create announcement (multipart) |
| `PUT` | `/announcements/:id` | 🔒 | admin, moderator | Update announcement (multipart) |
| `DELETE` | `/announcements/:id` | 🔒 | admin, moderator | Soft-delete announcement |
| **Discussions** | | | | |
| `GET` | `/announcements/:aId/discussions` | — | — | List discussions (paginated) |
| `GET` | `/announcements/:aId/discussions/:id` | — | — | Get discussion by ID |
| `POST` | `/announcements/:aId/discussions` | 🔒 | any | Create discussion |
| `PUT` | `/announcements/:aId/discussions/:id` | 🔒 | author, admin, mod | Update discussion |
| `DELETE` | `/announcements/:aId/discussions/:id` | 🔒 | author, admin, mod | Soft-delete discussion |
