# ASEM API Documentation

**Base URL:** `https://engagement.chula.ac.th/asem-api`  
**API Version:** `v1`  
**API Prefix:** `/api/v1`  
**Last Tested:** 2026-03-07

---

## Table of Contents

- [Base URL & Versioning](#base-url--versioning)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)
- [Health Endpoints](#health-endpoints)
- [Auth Endpoints](#auth-endpoints)
  - [POST /auth/register](#post-authregister)
  - [POST /auth/login](#post-authlogin)
  - [POST /auth/logout](#post-authlogout)
  - [POST /auth/refresh-token](#post-authrefresh-token)
  - [GET /auth/me](#get-authme)
  - [POST /auth/change-password](#post-authchange-password)
  - [GET /auth/verify-email](#get-authverify-email)
  - [POST /auth/resend-verification](#post-authresend-verification)
  - [POST /auth/forgot-password](#post-authforgot-password)
  - [GET /auth/verify-reset-token](#get-authverify-reset-token)
  - [POST /auth/reset-password](#post-authreset-password)
- [User Endpoints](#user-endpoints)
  - [GET /users](#get-users)
  - [POST /users](#post-users)
  - [GET /users/:id](#get-usersid)
  - [PUT /users/:id](#put-usersid)
  - [DELETE /users/:id](#delete-usersid)
  - [POST /users/:id/restore](#post-usersidrestore)
- [Country Endpoints](#country-endpoints)
  - [GET /countries](#get-countries)
  - [GET /countries/:id](#get-countriesid)
  - [POST /countries](#post-countries)
  - [PUT /countries/:id](#put-countriesid)
  - [DELETE /countries/:id](#delete-countriesid)
- [Institution Endpoints](#institution-endpoints)
  - [GET /institutions](#get-institutions)
  - [GET /institutions/:id](#get-institutionsid)
  - [POST /institutions](#post-institutions)
  - [PUT /institutions/:id](#put-institutionsid)
  - [DELETE /institutions/:id](#delete-institutionsid)
- [Research Network Endpoints](#research-network-endpoints)
  - [GET /research-networks](#get-research-networks)
  - [GET /research-networks/:id](#get-research-networksid)
  - [POST /research-networks](#post-research-networks)
  - [PUT /research-networks/:id](#put-research-networksid)
  - [DELETE /research-networks/:id](#delete-research-networksid)
- [Password Requirements](#password-requirements)
- [Roles & Permissions](#roles--permissions)
- [Token Lifetimes](#token-lifetimes)
- [Known Issues](#known-issues)

---

## Base URL & Versioning

| Environment | Base URL |
|---|---|
| Production | `https://engagement.chula.ac.th/asem-api` |
| API v1 prefix | `https://engagement.chula.ac.th/asem-api/api/v1` |

All API endpoints below are relative to the **API v1 prefix** unless otherwise noted.

---

## Authentication

Protected endpoints require a JWT access token passed in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via [POST /auth/login](#post-authlogin) or [POST /auth/refresh-token](#post-authrefresh-token).

Access tokens are **short-lived** (15 minutes). Use the refresh token to obtain a new access token before expiry. Each refresh rotates both tokens — the old refresh token is revoked.

---

## Response Format

All responses follow a consistent envelope format.

### Success

```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```

### Success (Paginated)

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "details": [
      { "field": "email", "message": "Please provide a valid email address" }
    ]
  }
}
```

> `details` is only present on validation errors (HTTP 400).

---

## Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body / query failed validation |
| 400 | `INVALID_TOKEN` | Token is malformed, expired, or not found |
| 401 | `TOKEN_REQUIRED` | Authorization header is missing |
| 401 | `INVALID_TOKEN` | Access token is invalid or expired |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `FORBIDDEN` | Authenticated but lacks required role |
| 403 | `EMAIL_NOT_VERIFIED` | Account email has not been verified |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate email or username |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 429 | `AUTH_RATE_LIMIT_EXCEEDED` | Too many auth attempts |
| 429 | `PASSWORD_RESET_RATE_LIMIT_EXCEEDED` | Too many password reset requests |
| 429 | `EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED` | Too many verification emails requested |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Rate Limiting

| Applies To | Window | Max Requests | Notes |
|---|---|---|---|
| General API | 15 min | 100 | Per IP |
| `POST /auth/register`, `POST /auth/login` | 15 min | 10 | Successful requests not counted |
| `POST /auth/forgot-password` | 1 hour | 3 | Per IP |
| `POST /auth/resend-verification` | 1 hour | 5 | Per IP |

Rate limit information is returned in `RateLimit-*` response headers.

---

## Health Endpoints

### GET /health

Basic server health check. No authentication required.

**URL:** `GET https://engagement.chula.ac.th/asem-api/health`

**Response 200**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "uptime": 1172293.897,
    "timestamp": "2026-03-07T04:54:32.491Z"
  }
}
```

---

### GET /api/v1/health

API version health check. No authentication required.

**URL:** `GET https://engagement.chula.ac.th/asem-api/api/v1/health`

**Response 200**
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "version": "v1",
    "uptime": 1172293.909,
    "timestamp": "2026-03-07T04:54:32.503Z"
  }
}
```

---

## Auth Endpoints

### POST /auth/register

Register a new user account. Sends a verification email after registration.

**Rate limit:** 10 requests / 15 min per IP (failed only)

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | ✅ | Valid email format |
| `username` | string | ✅ | Alphanumeric, 3–30 characters |
| `password` | string | ✅ | Min 8 chars, must contain uppercase, lowercase, number, and special char (`@$!%*?&`) |
| `firstName` | string | ❌ | Max 100 chars |
| `lastName` | string | ❌ | Max 100 chars |
| `bestContactEmail` | string | ❌ | Valid email format |
| `institutionId` | integer | ❌ | Must reference an existing institution ID |
| `department` | string | ❌ | Max 255 chars |
| `areasOfExpertise` | string | ❌ | Max 1000 chars |
| `countryId` | integer | ❌ | Must reference an existing country ID |
| `researchNetworkId` | integer | ❌ | Must reference an existing research network ID |
| `fieldOfStudy` | string | ❌ | Max 255 chars |

**Example Request**
```json
{
  "email": "jane.doe@example.com",
  "username": "janedoe",
  "password": "Secure@1234",
  "firstName": "Jane",
  "lastName": "Doe",
  "institutionId": 1,
  "countryId": 1
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Registration successful. You can now log in.",
  "data": {
    "user": {
      "id": 4,
      "email": "jane.doe@example.com",
      "username": "janedoe",
      "first_name": "Jane",
      "last_name": "Doe"
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing required fields or invalid format |
| 409 | `CONFLICT` | Email or username already in use |
| 429 | `AUTH_RATE_LIMIT_EXCEEDED` | Rate limit hit |

> ⚠️ **Known Issue:** Duplicate email/username currently returns **500** instead of **409**. Fix pending.

---

### POST /auth/login

Authenticate and obtain access + refresh tokens.

**Rate limit:** 10 requests / 15 min per IP (failed only)

**Request Body**

| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Example Request**
```json
{
  "email": "jane.doe@example.com",
  "password": "Secure@1234"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 4,
      "email": "jane.doe@example.com",
      "username": "janedoe",
      "first_name": "Jane",
      "last_name": "Doe",
      "role": "user",
      "is_email_verified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 429 | `AUTH_RATE_LIMIT_EXCEEDED` | Rate limit hit |

> ⚠️ **Known Issue:** Wrong password currently returns **500** instead of **401**. Fix pending.

---

### POST /auth/logout

Invalidate the current refresh token. Requires authentication.

**Auth:** Bearer token required

**Request Body**

| Field | Type | Required |
|---|---|---|
| `refreshToken` | string | ✅ |

**Example Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `refreshToken` |
| 401 | `TOKEN_REQUIRED` | No Authorization header |

---

### POST /auth/refresh-token

Exchange a valid refresh token for a new access token. Old refresh token is revoked (rotation).

**Request Body**

| Field | Type | Required |
|---|---|---|
| `refreshToken` | string | ✅ |

**Example Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
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

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `refreshToken` |
| 400 | `INVALID_TOKEN` | Refresh token expired or not found |

---

### GET /auth/me

Returns the currently authenticated user's profile.

**Auth:** Bearer token required

**Response 200**
```json
{
  "success": true,
  "message": "User data retrieved",
  "data": {
    "user": {
      "id": 4,
      "email": "jane.doe@example.com",
      "username": "janedoe",
      "first_name": "Jane",
      "last_name": "Doe",
      "role": "user",
      "is_email_verified": false
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 401 | `INVALID_TOKEN` | Token expired or invalid |

---

### POST /auth/change-password

Change password for the currently authenticated user. Invalidates all existing refresh tokens.

**Auth:** Bearer token required

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `currentPassword` | string | ✅ | Must match current password |
| `newPassword` | string | ✅ | Min 8 chars, complexity required |
| `refreshToken` | string | ❌ | Optionally revoke the current session token |

**Example Request**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewSecure@456"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 401 | `INVALID_CREDENTIALS` | Wrong current password |

---

### GET /auth/verify-email

Verify a user's email address using a one-time token sent by email.

**Query Parameters**

| Parameter | Type | Required |
|---|---|---|
| `token` | string | ✅ |

**Example**
```
GET /api/v1/auth/verify-email?token=<verification_token>
```

**Response 200**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `token` query param |
| 400 | `INVALID_TOKEN` | Token expired or invalid |

> ⚠️ **Known Issue:** Invalid token format currently returns **500**. Fix pending.

---

### POST /auth/resend-verification

Resend the email verification link to a registered email address.

**Rate limit:** 5 requests / hour per IP

**Request Body**

| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |

**Example Request**
```json
{
  "email": "jane.doe@example.com"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 429 | `EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED` | Rate limit hit |

> ⚠️ **Known Issue:** Currently returns **500** — SMTP service not configured on production server.

---

### POST /auth/forgot-password

Request a password reset email. Always returns success to prevent email enumeration.

**Rate limit:** 3 requests / hour per IP

**Request Body**

| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |

**Example Request**
```json
{
  "email": "jane.doe@example.com"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent.",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 429 | `PASSWORD_RESET_RATE_LIMIT_EXCEEDED` | Rate limit hit |

> ⚠️ **Known Issue:** Currently returns **500** — SMTP service not configured on production server.

---

### GET /auth/verify-reset-token

Check whether a password reset token is still valid before showing the reset form.

**Query Parameters**

| Parameter | Type | Required |
|---|---|---|
| `token` | string | ✅ |

**Example**
```
GET /api/v1/auth/verify-reset-token?token=<reset_token>
```

**Response 200** (valid token)
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true
  }
}
```

**Response 400** (invalid / expired token)
```json
{
  "success": false,
  "error": {
    "message": "Invalid reset token",
    "code": "INVALID_TOKEN"
  }
}
```

---

### POST /auth/reset-password

Reset a user's password using the token received by email. All sessions are terminated after reset.

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `token` | string | ✅ | Valid reset token from email |
| `newPassword` | string | ✅ | Min 8 chars, complexity required |

**Example Request**
```json
{
  "token": "<reset_token>",
  "newPassword": "NewSecure@456"
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 400 | `INVALID_TOKEN` | Token expired, used, or not found |

---

## User Endpoints

All user endpoints require:
- **Authentication:** `Authorization: Bearer <access_token>`
- **Email verified:** The account's email must be verified

---

### GET /users

Retrieve a paginated list of all users.

**Auth:** Bearer token required  
**Role:** `admin` or `moderator`

**Query Parameters**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `page` | integer | `1` | Min 1 |
| `limit` | integer | `20` | Min 1, Max 100 |
| `includeDeleted` | boolean | `false` | Include soft-deleted users |

**Example**
```
GET /api/v1/users?page=1&limit=20&includeDeleted=false
```

**Response 200**
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
        "first_name": "Admin",
        "last_name": "User",
        "role": "admin",
        "is_email_verified": true,
        "is_active": true,
        "created_at": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin or moderator |
| 403 | `EMAIL_NOT_VERIFIED` | Email not verified |

---

### POST /users

Create a new user (admin-initiated, bypasses self-registration flow).

**Auth:** Bearer token required  
**Role:** `admin`

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | ✅ | Valid email |
| `username` | string | ✅ | Alphanumeric, 3–30 chars |
| `password` | string | ✅ | Min 8 chars, complexity required |
| `role` | string | ❌ | `admin`, `moderator`, or `user` (default: `user`) |
| `firstName` | string | ❌ | Max 100 chars |
| `lastName` | string | ❌ | Max 100 chars |
| `bestContactEmail` | string | ❌ | Valid email |
| `institutionId` | integer | ❌ | Must reference an existing institution ID |
| `department` | string | ❌ | Max 255 chars |
| `areasOfExpertise` | string | ❌ | Max 1000 chars |
| `countryId` | integer | ❌ | Must reference an existing country ID |
| `researchNetworkId` | integer | ❌ | Must reference an existing research network ID |
| `fieldOfStudy` | string | ❌ | Max 255 chars |

**Response 201**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "newuser@example.com",
      "username": "newuser",
      "role": "user"
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 409 | `CONFLICT` | Email or username already exists |

---

### GET /users/:id

Retrieve a single user by ID.

**Auth:** Bearer token required  
**Access:** Admin, moderator, or the user themselves (`id` matches token's user ID)

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 4,
      "email": "jane.doe@example.com",
      "username": "janedoe",
      "first_name": "Jane",
      "last_name": "Doe",
      "role": "user",
      "institution_id": 1,
      "institution_name": "Chulalongkorn University",
      "country_id": 1,
      "country_name": "Thailand",
      "research_network_id": null,
      "research_network_name": null,
      "is_email_verified": true,
      "is_active": true,
      "created_at": "2026-03-07T04:54:32.000Z"
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | Accessing another user's data without permission |
| 404 | `NOT_FOUND` | User does not exist |

---

### PUT /users/:id

Update a user's profile fields. At least one field must be provided.

**Auth:** Bearer token required  
**Access:** Admin, moderator, or the user themselves

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Request Body** *(at least one field required)*

| Field | Type | Constraints |
|---|---|---|
| `email` | string | Valid email |
| `username` | string | Alphanumeric, 3–30 chars |
| `firstName` | string | Max 100 chars |
| `lastName` | string | Max 100 chars |
| `bestContactEmail` | string | Valid email |
| `institutionId` | integer | Must reference an existing institution ID |
| `department` | string | Max 255 chars |
| `areasOfExpertise` | string | Max 1000 chars |
| `countryId` | integer | Must reference an existing country ID |
| `researchNetworkId` | integer | Must reference an existing research network ID |
| `fieldOfStudy` | string | Max 255 chars |
| `role` | string | `admin`, `moderator`, or `user` |
| `isActive` | boolean | Activate / deactivate account |

**Example Request**
```json
{
  "firstName": "Jane",
  "institutionId": 1,
  "countryId": 1
}
```

**Response 200**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": { }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields provided or invalid values |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | Not owner, admin, or moderator |
| 404 | `NOT_FOUND` | User does not exist |

---

### DELETE /users/:id

Delete a user. Supports soft delete (default, restorable) or hard (permanent) delete.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `hard` | boolean | `false` | `true` = permanent delete; `false` = soft delete |

**Examples**
```
DELETE /api/v1/users/5           (soft delete)
DELETE /api/v1/users/5?hard=true (permanent delete)
```

**Response 200**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

> ⚠️ Hard delete is permanent and cannot be undone.

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | User does not exist |

---

### POST /users/:id/restore

Restore a soft-deleted user.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": {
    "user": { }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | User not found or not soft-deleted |

---

## Country Endpoints

All country endpoints require authentication. Write operations (POST/PUT/DELETE) require `admin` role.

---

### GET /countries

Retrieve all countries.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Response 200**
```json
{
  "success": true,
  "message": "Countries retrieved successfully",
  "data": {
    "countries": [
      { "id": 1, "name": "Thailand", "created_at": "2026-03-07T00:00:00.000Z", "updated_at": "2026-03-07T00:00:00.000Z" }
    ]
  }
}
```

---

### GET /countries/:id

Retrieve a single country by ID.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Country retrieved successfully",
  "data": {
    "country": { "id": 1, "name": "Thailand", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 404 | `NOT_FOUND` | Country does not exist |

---

### POST /countries

Create a new country.

**Auth:** Bearer token required  
**Role:** `admin`

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–100 characters |

**Example Request**
```json
{ "name": "Thailand" }
```

**Response 201**
```json
{
  "success": true,
  "message": "Country created successfully",
  "data": {
    "country": { "id": 1, "name": "Thailand", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 409 | `CONFLICT` | Country name already exists |

---

### PUT /countries/:id

Update a country name.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–100 characters |

**Response 200**
```json
{
  "success": true,
  "message": "Country updated successfully",
  "data": {
    "country": { "id": 1, "name": "Updated Name", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Country does not exist |
| 409 | `CONFLICT` | Country name already exists |

---

### DELETE /countries/:id

Delete a country. Fails if any institutions are still linked to it.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Country deleted successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Country does not exist |
| 500 | `INTERNAL_ERROR` | Institutions are still linked to this country (FK RESTRICT) |

---

## Institution Endpoints

All institution endpoints require authentication. Write operations (POST/PUT/DELETE) require `admin` role.

---

### GET /institutions

Retrieve a paginated list of institutions. Each record includes the linked `country_name`.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Query Parameters**

| Parameter | Type | Default | Constraints |
|---|---|---|---|
| `page` | integer | `1` | Min 1 |
| `limit` | integer | `20` | Min 1, Max 100 |

**Example**
```
GET /api/v1/institutions?page=1&limit=20
```

**Response 200**
```json
{
  "success": true,
  "message": "Institutions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Chulalongkorn University",
        "country_id": 1,
        "country_name": "Thailand",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /institutions/:id

Retrieve a single institution by ID.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Institution retrieved successfully",
  "data": {
    "institution": {
      "id": 1,
      "name": "Chulalongkorn University",
      "country_id": 1,
      "country_name": "Thailand",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 404 | `NOT_FOUND` | Institution does not exist |

---

### POST /institutions

Create a new institution.

**Auth:** Bearer token required  
**Role:** `admin`

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–255 characters |
| `countryId` | integer | ✅ | Must reference an existing country ID |

**Example Request**
```json
{
  "name": "Chulalongkorn University",
  "countryId": 1
}
```

**Response 201**
```json
{
  "success": true,
  "message": "Institution created successfully",
  "data": {
    "institution": {
      "id": 1,
      "name": "Chulalongkorn University",
      "country_id": 1,
      "country_name": "Thailand",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | `countryId` does not reference a valid country |
| 409 | `CONFLICT` | Institution with same name already exists in that country |

---

### PUT /institutions/:id

Update an institution. At least one field must be provided.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Request Body** *(at least one field required)*

| Field | Type | Constraints |
|---|---|---|
| `name` | string | 1–255 characters |
| `countryId` | integer | Must reference an existing country ID |

**Response 200**
```json
{
  "success": true,
  "message": "Institution updated successfully",
  "data": {
    "institution": { }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields provided or invalid values |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Institution or country does not exist |
| 409 | `CONFLICT` | Institution with same name already exists in that country |

---

### DELETE /institutions/:id

Delete an institution permanently.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Institution deleted successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Institution does not exist |

---

## Research Network Endpoints

All research network endpoints require authentication. Write operations (POST/PUT/DELETE) require `admin` role.

---

### GET /research-networks

Retrieve all research networks.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Response 200**
```json
{
  "success": true,
  "message": "Research networks retrieved successfully",
  "data": {
    "researchNetworks": [
      { "id": 1, "name": "ASEAN Research Network", "created_at": "...", "updated_at": "..." }
    ]
  }
}
```

---

### GET /research-networks/:id

Retrieve a single research network by ID.

**Auth:** Bearer token required  
**Role:** Any authenticated user

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Research network retrieved successfully",
  "data": {
    "researchNetwork": { "id": 1, "name": "ASEAN Research Network", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 404 | `NOT_FOUND` | Research network does not exist |

---

### POST /research-networks

Create a new research network.

**Auth:** Bearer token required  
**Role:** `admin`

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–255 characters |

**Example Request**
```json
{ "name": "ASEAN Research Network" }
```

**Response 201**
```json
{
  "success": true,
  "message": "Research network created successfully",
  "data": {
    "researchNetwork": { "id": 1, "name": "ASEAN Research Network", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 409 | `CONFLICT` | Research network name already exists |

---

### PUT /research-networks/:id

Update a research network name.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Request Body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | ✅ | 1–255 characters |

**Response 200**
```json
{
  "success": true,
  "message": "Research network updated successfully",
  "data": {
    "researchNetwork": { "id": 1, "name": "Updated Name", "created_at": "...", "updated_at": "..." }
  }
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Research network does not exist |
| 409 | `CONFLICT` | Research network name already exists |

---

### DELETE /research-networks/:id

Delete a research network permanently.

**Auth:** Bearer token required  
**Role:** `admin`

**Path Parameter**

| Parameter | Type | Required |
|---|---|---|
| `id` | positive integer | ✅ |

**Response 200**
```json
{
  "success": true,
  "message": "Research network deleted successfully",
  "data": null
}
```

**Error Responses**

| Status | Code | Trigger |
|---|---|---|
| 401 | `TOKEN_REQUIRED` | No Authorization header |
| 403 | `FORBIDDEN` | User is not admin |
| 404 | `NOT_FOUND` | Research network does not exist |

---

## Password Requirements

All password fields must satisfy:

- Minimum **8 characters**
- At least one **uppercase** letter (A–Z)
- At least one **lowercase** letter (a–z)
- At least one **digit** (0–9)
- At least one **special character** from: `@ $ ! % * ? &`

**Valid example:** `Secure@1234`

---

## Roles & Permissions

| Action | `user` | `moderator` | `admin` |
|---|---|---|---|
| Login / Register | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| View all users (`GET /users`) | ❌ | ✅ | ✅ |
| View any user (`GET /users/:id`) | ❌ | ✅ | ✅ |
| Update any user | ❌ | ✅ | ✅ |
| Create user (`POST /users`) | ❌ | ❌ | ✅ |
| Delete user | ❌ | ❌ | ✅ |
| Restore user | ❌ | ❌ | ✅ |
| View countries / institutions / research networks | ✅ | ✅ | ✅ |
| Create / update / delete countries | ❌ | ❌ | ✅ |
| Create / update / delete institutions | ❌ | ❌ | ✅ |
| Create / update / delete research networks | ❌ | ❌ | ✅ |

---

## Token Lifetimes

| Token | Lifetime |
|---|---|
| Access Token | 15 minutes |
| Refresh Token | 7 days |
| Email Verification Token | 24 hours |
| Password Reset Token | 1 hour |

---

## Known Issues

The following endpoints currently return **500 Internal Server Error** and are tracked for fixes:

| Endpoint | Expected Behaviour | Root Cause |
|---|---|---|
| `POST /auth/register` with duplicate email/username | 409 Conflict | Unhandled DB duplicate key error |
| `POST /auth/login` with wrong password | 401 Unauthorized | bcrypt compare error not caught in service |
| `GET /auth/verify-email?token=<invalid>` | 400 Bad Request | Token lookup exception not caught |
| `POST /auth/resend-verification` | 200 OK | SMTP/email service not configured on server |
| `POST /auth/forgot-password` | 200 OK | SMTP/email service not configured on server |

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
  "institutionId": 1,
  "department": "Computer Science",
  "areasOfExpertise": "AI, Machine Learning",
  "countryId": 1,
  "researchNetworkId": 1
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
