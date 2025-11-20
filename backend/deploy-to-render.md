# Deploy to Render - Quick Guide

## What Changed

We've fixed the email timeout issues by:
1. ✅ Extended SMTP timeouts to 120 seconds (2 minutes)
2. ✅ Disabled connection pooling for better cloud reliability
3. ✅ Relaxed TLS settings for cloud environments
4. ✅ Removed retry logic to prevent compounding delays
5. ✅ Added detailed logging for debugging

## Deployment Steps

### Option 1: Auto-Deploy (If Connected to GitHub)

If your Render service is connected to GitHub:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Monitor Deployment:**
   - Go to https://dashboard.render.com/
   - Select `donorhub-api-mxcl`
   - Go to **Events** tab
   - Wait for "Deploy succeeded" message (2-3 minutes)

3. **Check Logs:**
   - Go to **Logs** tab
   - Look for: `[EMAIL CONFIG] ✅ Email service configured`

### Option 2: Manual Deploy

If not connected to GitHub:

1. **Go to Render Dashboard:**
   https://dashboard.render.com/

2. **Select Your Service:**
   `donorhub-api-mxcl`

3. **Click "Manual Deploy":**
   - Select branch: `main`
   - Click "Deploy"

4. **Wait for Deployment:**
   - Monitor in **Events** tab
   - Check **Logs** tab for errors

## Verify Environment Variables

**CRITICAL**: Before testing, verify these are set correctly:

1. Go to **Environment** tab
2. Check these variables:

```
EMAIL_USER=avishramteke3@gmail.com
EMAIL_PASSWORD=hyyrgzgxtatupjzx
EMAIL_SERVICE=gmail
EMAIL_FROM=DonorHub <noreply@donorhub.com>
```

3. **If EMAIL_PASSWORD is different:**
   - Update it to: `hyyrgzgxtatupjzx`
   - Click "Save Changes"
   - This will trigger a redeploy

## Testing After Deployment

### Step 1: Wait for Service to Wake Up

Render free tier services sleep after inactivity:
- First request may take 30-60 seconds
- Visit: https://donorhub-api-mxcl.onrender.com/
- Wait for response

### Step 2: Test Email Delivery

1. **Go to registration page**
2. **Enter a test email** (use your Gmail)
3. **Click "Send OTP"**
4. **WAIT 2 MINUTES** (new timeout is 120 seconds)
5. **Check your email** (including spam folder)

### Step 3: Monitor Logs

While testing, keep Render logs open:

**Look for these messages:**

✅ **Success:**
```
[EMAIL SERVICE] Starting email send operation to s***@gmail.com
[EMAIL SERVICE] ✅ Email sent successfully | Duration: 3500ms
```

❌ **Still Failing:**
```
[EMAIL SERVICE] ❌ Email send failed
Error Code: ETIMEDOUT
Duration: 120000ms
```

## If Still Failing

If you still see timeout errors after 2 minutes:

### Quick Fix: Switch to SendGrid

SendGrid is more reliable for cloud deployments:

1. **Sign up:** https://sendgrid.com/
2. **Create API Key:**
   - Go to Settings → API Keys
   - Create new key
   - Copy the key

3. **Add to Render:**
   - Go to Environment tab
   - Add: `SENDGRID_API_KEY=<your-key>`
   - Save changes

4. **Update code** (I can help with this)

### Alternative: Check Render Status

- Visit: https://status.render.com/
- Check if there are any ongoing issues
- SMTP connections may be affected by Render outages

## Expected Timeline

- **Deployment:** 2-3 minutes
- **Service wake up:** 30-60 seconds (first request)
- **Email sending:** 3-10 seconds (if working)
- **Total test time:** ~5 minutes

## Success Criteria

Task 8 is complete when:
- ✅ Registration page loads
- ✅ OTP email is received within 2 minutes
- ✅ OTP verification works
- ✅ No timeout errors in Render logs
- ✅ Resend OTP works
- ✅ Multiple registrations work

## Need Help?

If issues persist:
1. Share the Render logs (last 50 lines)
2. Share the exact error message
3. Confirm environment variables are set correctly
4. Check if Gmail App Password is still valid

---

**Current Status:**
- ✅ Code changes committed
- ✅ Gmail connection verified locally
- ⏳ Ready to deploy to Render
- ⏳ Waiting for production testing
