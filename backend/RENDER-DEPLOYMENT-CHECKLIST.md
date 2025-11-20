# Render Deployment Configuration Checklist

This checklist helps ensure your Render deployment is properly configured for email delivery.

## Pre-Deployment Verification

### 1. Check Environment Variables in Render Dashboard

Access your Render dashboard at: https://dashboard.render.com/

Navigate to: **Your Service (donorhub-api-mxcl) → Environment**

Verify the following environment variables are set:

- [ ] **EMAIL_USER**
  - Value: `avishramteke3@gmail.com` (or your Gmail address)
  - No extra spaces before or after
  
- [ ] **EMAIL_PASSWORD**
  - Must be a 16-character Gmail App Password
  - Format: `abcdabcdabcdabcd` (no spaces, no dashes)
  - **NOT** your regular Gmail password
  - No extra spaces before or after
  
- [ ] **EMAIL_FROM**
  - Value: `DonorHub <noreply@donorhub.com>` (or your preferred from address)
  - No extra spaces before or after

### 2. Verify Gmail App Password

If you don't have a Gmail App Password or need to create a new one:

1. Go to https://myaccount.google.com/security
2. Ensure 2-Step Verification is enabled
3. Go to "App passwords" section
4. Generate a new app password for "Mail"
5. Copy the 16-character password (it will be shown with spaces, but remove them)
6. Update EMAIL_PASSWORD in Render with the password (no spaces)

### 3. Local Verification (Optional but Recommended)

Before deploying, test the configuration locally:

```bash
cd backend
node verify-render-config.js
```

This script will check:
- All required environment variables are set
- EMAIL_PASSWORD is 16 characters with no spaces
- EMAIL_USER is a valid email format

## Deployment Steps

### 4. Deploy to Render

**Option A: Automatic Deployment (if connected to Git)**
1. Commit your changes:
   ```bash
   git add .
   git commit -m "Fix email delivery configuration"
   git push origin main
   ```
2. Render will automatically detect the push and start deployment
3. Monitor the deployment in Render dashboard

**Option B: Manual Deployment**
1. Go to Render dashboard
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"

### 5. Monitor Deployment Logs

1. In Render dashboard, go to **Logs** tab
2. Watch for these startup messages:
   ```
   [EMAIL CONFIG] ✓ Email service configured
   [EMAIL CONFIG] ✓ Using: avishramteke3@gmail.com
   ```
3. If you see warnings or errors, check your environment variables

### 6. Test Email Delivery

After deployment completes:

1. Go to: https://donorhub-api-mxcl.onrender.com/
2. Navigate to registration page
3. Enter a test email address (use your own Gmail for testing)
4. Click "Send OTP"
5. Check your email inbox (should arrive within 10-30 seconds)

### 7. Monitor First OTP Send Attempt

In Render logs, look for:

**Success indicators:**
```
[EMAIL] Sending OTP to a***@gmail.com (attempt 1)
[EMAIL] ✓ Email sent successfully in 2345ms
```

**Failure indicators:**
```
[EMAIL] ✗ Email send failed: EMAIL_AUTH_FAILED
[EMAIL] ✗ Email send failed: EMAIL_TIMEOUT
```

## Troubleshooting

### Issue: "Email service authentication failed"

**Cause:** Invalid Gmail App Password

**Solution:**
1. Generate a new Gmail App Password
2. Update EMAIL_PASSWORD in Render (remove all spaces)
3. Redeploy

### Issue: "Email service timeout"

**Cause:** Network connectivity or SMTP server issues

**Solution:**
1. Check Render status page for outages
2. Verify Gmail SMTP is not blocked
3. Check if your Gmail account has any security alerts

### Issue: Environment variables not updating

**Cause:** Render caches environment variables

**Solution:**
1. After updating environment variables in Render dashboard
2. Click "Save Changes" (this triggers a redeploy)
3. Wait for deployment to complete
4. Verify new values are loaded in logs

### Issue: "EMAIL_PASSWORD may not be a valid Gmail App Password"

**Cause:** Password length is not 16 characters or contains spaces

**Solution:**
1. Check the password in Render dashboard
2. Ensure it's exactly 16 characters
3. Remove any spaces or special characters
4. Save and redeploy

## Post-Deployment Verification

- [ ] Deployment completed successfully
- [ ] Startup logs show email configuration is valid
- [ ] Test OTP email was received
- [ ] OTP verification works correctly
- [ ] No errors in Render logs during email send

## Additional Notes

- **Cold Starts:** First email after idle period may take longer (up to 30 seconds)
- **Rate Limiting:** Multiple OTP requests are rate-limited to prevent abuse
- **Retry Logic:** System automatically retries failed emails up to 3 times
- **Logging:** All email operations are logged with masked email addresses

## Support

If issues persist after following this checklist:

1. Check backend/EMAIL-DELIVERY-TEST-RESULTS.md for test results
2. Review backend/OTP-TROUBLESHOOTING.md for common issues
3. Verify Gmail account security settings
4. Check Render service logs for detailed error messages
