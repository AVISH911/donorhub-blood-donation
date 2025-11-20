# Render Email Delivery Troubleshooting Guide

## Current Status

✅ **Local Testing**: Gmail SMTP connection verified successfully (1.6 seconds)
❌ **Production (Render)**: Email sending timeout errors

## Root Cause Analysis

The email service works perfectly locally but times out on Render. This indicates:

1. **Network Latency**: Render's free tier has slower network connections
2. **Cold Starts**: Free tier services sleep after inactivity, causing delays
3. **Firewall/Security**: Possible SMTP port restrictions
4. **Resource Limits**: Free tier CPU/memory constraints

## Solutions Implemented

### 1. Extended Timeouts
```javascript
connectionTimeout: 120000,  // 120 seconds (2 minutes)
greetingTimeout: 60000,     // 60 seconds
socketTimeout: 120000,      // 120 seconds
```

### 2. Disabled Connection Pooling
```javascript
pool: false  // More reliable for cloud environments
```

### 3. Relaxed TLS Settings
```javascript
tls: {
  rejectUnauthorized: false,  // More lenient for cloud
  minVersion: 'TLSv1.2'
}
```

### 4. Removed Retry Logic
- Single attempt with long timeout instead of multiple short attempts
- Prevents compounding delays

## Verification Steps

### Step 1: Verify Environment Variables on Render

1. Go to https://dashboard.render.com/
2. Select your service: `donorhub-api-mxcl`
3. Go to **Environment** tab
4. Verify these variables are set:

```
EMAIL_USER=avishramteke3@gmail.com
EMAIL_PASSWORD=hyyrgzgxtatupjzx
EMAIL_SERVICE=gmail
EMAIL_FROM=DonorHub <noreply@donorhub.com>
```

**CRITICAL**: 
- EMAIL_PASSWORD must be EXACTLY 16 characters
- NO spaces, NO dashes
- Copy-paste directly from your .env file

### Step 2: Check Render Logs

1. Go to **Logs** tab in Render dashboard
2. Look for these log messages:

**Good signs:**
```
[EMAIL CONFIG] ✅ Email service configured
[EMAIL CONFIG] ✅ Using email: avishramteke3@gmail.com
[EMAIL SERVICE] Starting email send operation
```

**Bad signs:**
```
[EMAIL SERVICE] ❌ Email send failed
Error Code: ETIMEDOUT
Error: Email sending timeout
```

### Step 3: Test Email Sending

After deploying the updated code:

1. Wait 2-3 minutes for deployment to complete
2. Visit: https://donorhub-api-mxcl.onrender.com/
3. Try to register with a test email
4. **Wait at least 2 minutes** before assuming it failed
5. Check Render logs for detailed error messages

## Alternative Solutions

If timeouts persist, consider these alternatives:

### Option 1: Use SendGrid (Recommended for Production)

SendGrid has better cloud integration and reliability:

```bash
npm install @sendgrid/mail
```

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: 'noreply@donorhub.com',
  subject: 'Your DonorHub Verification Code',
  html: emailTemplate.html
};

await sgMail.send(msg);
```

**Pros:**
- Free tier: 100 emails/day
- Better cloud performance
- No SMTP connection issues
- Faster delivery

**Setup:**
1. Sign up at https://sendgrid.com/
2. Create API key
3. Add to Render environment: `SENDGRID_API_KEY`

### Option 2: Use Mailgun

Similar to SendGrid, optimized for cloud:

```bash
npm install mailgun-js
```

**Pros:**
- Free tier: 5,000 emails/month
- Good documentation
- Reliable delivery

### Option 3: Upgrade Render Plan

Render's paid plans have:
- Better network performance
- No cold starts
- Higher resource limits
- Faster SMTP connections

**Cost:** Starting at $7/month

## Testing Checklist

Before marking task 8 as complete:

- [ ] Deploy updated code to Render
- [ ] Wait for deployment to complete (check Logs tab)
- [ ] Verify environment variables are set correctly
- [ ] Test registration with a real Gmail address
- [ ] Wait at least 2 minutes for email delivery
- [ ] Check email inbox (including spam folder)
- [ ] Check Render logs for success/error messages
- [ ] Test OTP verification with received code
- [ ] Test resend OTP functionality
- [ ] Verify no timeout errors in logs

## Expected Behavior

### Success Scenario:
```
[EMAIL SERVICE] Starting email send operation to s***@gmail.com
[EMAIL SERVICE] Using SMTP: smtp.gmail.com:587
[EMAIL SERVICE] Timeout settings: connection=120s, socket=120s
[EMAIL SERVICE] ✅ Email sent successfully to s***@gmail.com | MessageID: <...> | Duration: 3500ms
```

### Failure Scenario:
```
[EMAIL SERVICE] ❌ Email send failed | Email: s***@gmail.com
Error Code: ETIMEDOUT
Duration: 120000ms
```

## Next Steps

1. **Deploy the updated code** (already committed)
2. **Push to GitHub** (triggers Render auto-deploy)
3. **Monitor Render logs** during deployment
4. **Test email delivery** after deployment completes
5. **If still failing**: Consider switching to SendGrid

## Contact Information

If issues persist after trying all solutions:
- Check Render status: https://status.render.com/
- Render support: https://render.com/docs/support
- Gmail App Passwords: https://myaccount.google.com/apppasswords
