# OTP Test Suite

This directory contains comprehensive tests for the OTP verification system, including error handling and integration tests.

## Test Files

### 1. otp-error-handling.test.js
Error handling and validation tests for the OTP system.

### 2. otp-integration.test.js
End-to-end integration tests for complete OTP flows.

## Test Coverage

### Error Handling Tests (22 tests)

#### 1. Invalid Email Format Handling (Requirement 1.5)
- Rejects email without @ symbol
- Rejects email without domain
- Rejects empty email
- Rejects missing email field

#### 2. OTP Send Failure Scenarios (Requirement 1.5)
- Handles email service timeout
- Handles email authentication failure
- Handles email connection failure
- Handles generic email send failure
- Verifies OTP is not stored when email fails

#### 3. Invalid OTP Entry (Requirement 2.4)
- Rejects OTP with less than 6 digits
- Rejects OTP with more than 6 digits
- Rejects OTP with non-numeric characters
- Rejects incorrect OTP code
- Tracks verification attempts
- Rejects when OTP not found

#### 4. Expired OTP Handling (Requirements 3.2, 3.3)
- Rejects expired OTP
- Accepts OTP just before expiration

#### 5. Rate Limit Exceeded Scenarios (Requirement 5.3)
- Blocks after 5 OTP requests within 1 hour
- Provides blocked until timestamp
- Maintains separate rate limits for different emails

#### 6. Network Error Handling
- Handles missing email and OTP fields
- Handles malformed request body
- Normalizes email addresses (case-insensitive)

### Integration Tests (15 tests)

#### 1. Complete Send → Verify → Register Flow (Requirements 1.1, 2.2)
- Completes full registration flow with OTP verification
- Rejects registration without OTP verification
- Rejects registration with unverified OTP in database
- Handles case-insensitive email throughout flow

#### 2. Resend OTP Flow (Requirement 4.1)
- Invalidates old OTP and sends new one on resend
- Completes registration after resending OTP
- Resets verification status on resend

#### 3. Change Email Flow (Requirement 7.1)
- Allows sending OTP to new email after changing email
- Handles registration with different emails correctly

#### 4. Rate Limiting Enforcement (Requirement 5.1)
- Enforces rate limit across send and resend operations
- Maintains separate rate limits for different emails
- Allows registration even when rate limited
- Cleans up rate limit records after successful registration

#### 5. Edge Cases and Error Scenarios
- Handles multiple verification attempts correctly
- Prevents duplicate user registration

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- otp-error-handling.test.js
npm test -- otp-integration.test.js

# Run tests in watch mode
npm run test:watch
```

## Test Framework

- **Jest**: Testing framework
- **Supertest**: HTTP assertions
- **MongoDB Memory Server**: In-memory database for testing

## Test Results

All 37 tests pass successfully (22 error handling + 15 integration), covering:
- Invalid email format handling
- OTP send failure scenarios
- Invalid OTP entry
- Expired OTP handling
- Rate limit exceeded scenarios
- Network error handling
- Complete OTP flows (send → verify → register)
- Resend OTP functionality
- Change email functionality
- Rate limiting enforcement
- Edge cases and error scenarios
