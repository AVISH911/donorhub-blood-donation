# Implementation Plan

- [x] 1. Update email service configuration with optimized settings





  - Modify `backend/services/emailService.js` to use optimized SMTP configuration
  - Set explicit host (smtp.gmail.com) and port (587) values
  - Reduce connection timeout to 20 seconds, greeting timeout to 15 seconds, socket timeout to 30 seconds
  - Configure connection pool with maxConnections: 3 and maxMessages: 10
  - Add TLS security settings with minVersion: 'TLSv1.2'
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Implement exponential backoff retry logic





  - Replace existing fixed-delay retry mechanism in `sendOTPEmail` function
  - Implement exponential backoff with delays: 1s, 2s, 4s for up to 3 attempts
  - Log each retry attempt with attempt number and delay duration
  - Ensure total retry time stays under 10 seconds
  - _Requirements: 2.2, 2.4, 5.1_

- [x] 3. Add email configuration validation on startup





  - Create `validateEmailConfig()` function in `emailService.js`
  - Check for presence of EMAIL_USER and EMAIL_PASSWORD environment variables
  - Validate Gmail App Password format (16 characters, no spaces)
  - Log configuration status without exposing credentials
  - Call validation function when server starts in `server.js`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Enhance error categorization and user feedback





  - Update error handling in `sendOTPEmail` to categorize nodemailer errors
  - Map EAUTH errors to EMAIL_AUTH_FAILED with appropriate message
  - Map ETIMEDOUT errors to EMAIL_TIMEOUT with retry suggestion
  - Map ECONNECTION/ENOTFOUND errors to EMAIL_CONNECTION_FAILED
  - Ensure all error responses include errorCode field
  - Update error messages in `/api/auth/send-otp` endpoint to use new error codes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Improve logging for diagnostics





  - Implement email masking function to show only first character and domain
  - Add detailed logging at start of email send operation with masked email
  - Log success with messageId and duration in milliseconds
  - Log failures with error type, error code, and duration
  - Add timestamp to all email service logs
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Test email delivery in development environment





  - Run the server locally with valid Gmail credentials
  - Test OTP email delivery to a test Gmail account
  - Verify email arrives within 10 seconds
  - Check logs for proper formatting and masking
  - Test with invalid credentials to verify error handling
  - _Requirements: 2.1, 2.5, 3.4_

- [x] 7. Verify Render deployment configuration





  - Check that EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM are set in Render dashboard
  - Verify EMAIL_PASSWORD is a valid 16-character Gmail App Password
  - Ensure no extra spaces or formatting issues in environment variables
  - Redeploy application to Render with updated code
  - Monitor Render logs during first OTP send attempt
  - _Requirements: 1.1, 1.2, 4.1_

- [-] 8. Perform end-to-end testing on production




  - Access https://donorhub-api-mxcl.onrender.com/ registration page
  - Attempt to register with a valid Gmail address
  - Verify OTP email is received within 30 seconds
  - Test OTP verification with received code
  - Check Render logs for any errors or warnings
  - Test retry scenario by triggering multiple OTP requests
  - _Requirements: 2.1, 2.2, 2.5, 3.4_
