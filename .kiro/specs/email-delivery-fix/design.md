# Email Delivery Fix - Design Document

## Overview

This design addresses the email delivery failures in the DonorHub application deployed on Render. The root cause analysis indicates that the current email service configuration has overly aggressive timeouts (60 seconds) and insufficient error handling for cloud deployment environments. The solution involves optimizing the nodemailer configuration, implementing proper retry logic with exponential backoff, and enhancing error reporting.

## Architecture

### Current Architecture Issues

1. **Timeout Configuration**: 60-second timeouts are too long and cause the client to timeout before receiving a response
2. **Connection Pooling**: Current pool settings may not be optimal for serverless/cloud environments
3. **Error Handling**: Generic error messages don't provide actionable feedback
4. **Retry Logic**: Existing retry mechanism uses fixed delays and may not handle transient failures effectively

### Proposed Architecture

```
Client Request → Express Endpoint → Email Service → Gmail SMTP
                      ↓                    ↓
                 Rate Limiter      Retry Handler
                      ↓                    ↓
                 OTP Database      Error Logger
```

## Components and Interfaces

### 1. Email Service Configuration (`emailService.js`)

**Optimized Transporter Settings:**

```javascript
{
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 10,
  rateDelta: 1000,
  rateLimit: 3,
  connectionTimeout: 20000,  // 20 seconds
  greetingTimeout: 15000,    // 15 seconds
  socketTimeout: 30000,      // 30 seconds
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }
}
```

**Key Changes:**
- Reduced timeouts to prevent client-side timeouts
- Explicit SMTP host and port configuration
- TLS security settings
- Optimized connection pool for cloud environments

### 2. Retry Logic with Exponential Backoff

**Implementation Strategy:**

```javascript
const sendWithRetry = async (mailOptions, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

**Rationale:**
- Exponential backoff reduces server load during transient failures
- Maximum 3 retries balances reliability with response time
- Total maximum time: ~7 seconds (within acceptable UX limits)

### 3. Enhanced Error Categorization

**Error Types and Handling:**

| Error Code | Nodemailer Error | User Message | HTTP Status |
|------------|------------------|--------------|-------------|
| EMAIL_AUTH_FAILED | EAUTH | "Email service authentication failed" | 500 |
| EMAIL_TIMEOUT | ETIMEDOUT | "Email service timeout. Please try again" | 500 |
| EMAIL_CONNECTION_FAILED | ECONNECTION, ENOTFOUND | "Unable to connect to email service" | 500 |
| EMAIL_NOT_CONFIGURED | Missing env vars | "Email service not configured" | 500 |
| INVALID_EMAIL | Invalid format | "Invalid email address" | 400 |

### 4. Configuration Validation

**Startup Validation Function:**

```javascript
const validateEmailConfig = () => {
  const required = ['EMAIL_USER', 'EMAIL_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`[EMAIL CONFIG] Missing: ${missing.join(', ')}`);
    return false;
  }
  
  // Validate Gmail App Password format (16 chars, no spaces)
  const appPassword = process.env.EMAIL_PASSWORD;
  if (appPassword.length !== 16 || /\s/.test(appPassword)) {
    console.warn('[EMAIL CONFIG] EMAIL_PASSWORD may not be a valid Gmail App Password');
  }
  
  console.log('[EMAIL CONFIG] ✓ Email service configured');
  console.log(`[EMAIL CONFIG] ✓ Using: ${process.env.EMAIL_USER}`);
  return true;
};
```

### 5. Comprehensive Logging

**Log Structure:**

```javascript
{
  timestamp: ISO8601,
  operation: 'SEND_OTP',
  email: 'masked@email',
  attempt: 1,
  duration: 1234,
  status: 'success|failure',
  errorCode: 'EMAIL_TIMEOUT',
  messageId: 'smtp-id'
}
```

**Masking Strategy:**
- Email: `a***@gmail.com` (show first char and domain)
- OTP: Never log actual OTP codes
- Credentials: Never log passwords

## Data Models

No changes to existing data models (OTP, User) are required. The fix is isolated to the email service layer.

## Error Handling

### Client-Side Error Handling

The frontend should handle these error codes:

```javascript
switch (error.errorCode) {
  case 'EMAIL_TIMEOUT':
    // Show retry button
    break;
  case 'EMAIL_AUTH_FAILED':
    // Show "service unavailable" message
    break;
  case 'EMAIL_CONNECTION_FAILED':
    // Show "check internet connection" message
    break;
  default:
    // Generic error message
}
```

### Server-Side Error Recovery

1. **Transient Errors** (timeout, connection): Automatic retry with backoff
2. **Authentication Errors**: Log critical alert, no retry
3. **Invalid Input**: Return 400 error immediately, no retry

## Testing Strategy

### 1. Unit Tests

- Test email configuration validation
- Test retry logic with mock failures
- Test error categorization
- Test email masking in logs

### 2. Integration Tests

- Test actual email delivery to test Gmail account
- Test timeout scenarios
- Test authentication failure handling
- Test rate limiting integration

### 3. Manual Testing on Render

**Test Scenarios:**

1. **Happy Path**: Register with valid email, verify OTP delivery
2. **Timeout Simulation**: Test with network throttling
3. **Invalid Credentials**: Temporarily use wrong password
4. **Rate Limiting**: Send multiple OTP requests rapidly
5. **Email Validation**: Test with invalid email formats

### 4. Monitoring

**Key Metrics to Track:**

- Email delivery success rate
- Average delivery time
- Retry attempt distribution
- Error type frequency
- Timeout occurrences

## Deployment Considerations

### Environment Variables on Render

Ensure these are set in Render dashboard:

```
EMAIL_SERVICE=gmail
EMAIL_USER=avishramteke3@gmail.com
EMAIL_PASSWORD=<16-char-app-password>
EMAIL_FROM=DonorHub <noreply@donorhub.com>
```

### Gmail App Password Verification

1. Verify the app password is still valid (they can expire)
2. Ensure "Less secure app access" is NOT enabled (use App Passwords instead)
3. Verify 2FA is enabled on the Gmail account
4. Test the credentials locally before deploying

### Render-Specific Considerations

1. **Cold Starts**: First email after idle period may be slower
2. **Outbound Connections**: Verify Render allows SMTP on port 587
3. **Environment Variables**: Ensure they're properly set in Render dashboard
4. **Logs**: Use Render's log viewer to monitor email operations

## Implementation Priority

1. **High Priority**: Update email service configuration (timeouts, connection settings)
2. **High Priority**: Implement exponential backoff retry logic
3. **Medium Priority**: Add configuration validation on startup
4. **Medium Priority**: Enhance error categorization and logging
5. **Low Priority**: Add comprehensive unit tests

## Rollback Plan

If the changes cause issues:

1. Revert `emailService.js` to previous version
2. Increase timeouts back to 60 seconds temporarily
3. Monitor logs for specific error patterns
4. Investigate Gmail account status and credentials
