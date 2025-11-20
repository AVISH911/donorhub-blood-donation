# OTP Endpoints Testing Guide

This document provides examples for testing the OTP endpoints using curl or any API testing tool.

## Prerequisites

1. Ensure MongoDB is running on `mongodb://localhost:27017/donorhub`
2. Configure email service in `.env` file (copy from `.env.example`)
3. Start the server: `npm start` or `npm run dev`

## Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/auth/send-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresAt": "2025-11-18T10:10:00.000Z",
  "remainingAttempts": 4
}
```

**Error Responses:**
- 400: Invalid email format
- 429: Rate limit exceeded (too many attempts)
- 500: Email service failure

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\"}"
```

---

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verified": true
}
```

**Error Responses:**
- 400: Invalid OTP format or incorrect OTP
- 404: No OTP found for email
- 400: OTP expired

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"otp\":\"123456\"}"
```

---

### 3. Resend OTP

**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "New OTP sent to your email",
  "expiresAt": "2025-11-18T10:20:00.000Z",
  "remainingAttempts": 3
}
```

**Error Responses:**
- 400: Invalid email format
- 429: Rate limit exceeded
- 500: Email service failure

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\"}"
```

---

## Rate Limiting

- Maximum 5 OTP requests per email within 1 hour
- After 5 attempts, the email is blocked for 1 hour
- Rate limit applies to both send-otp and resend-otp endpoints

## Testing Flow

1. **Send OTP**: Request an OTP for an email address
2. **Check Email**: Verify the OTP code was received
3. **Verify OTP**: Submit the OTP code for verification
4. **Test Resend**: Request a new OTP (invalidates previous one)
5. **Test Rate Limit**: Make 6 requests to trigger rate limiting

## Notes

- OTPs expire after 10 minutes
- Each OTP can only be verified once
- Previous OTPs are invalidated when a new one is requested
- Email must be properly configured in `.env` for emails to send
