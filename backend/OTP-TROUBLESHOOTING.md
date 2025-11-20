# OTP Not Saving to Database - Troubleshooting Guide 🔧

## Quick Diagnosis

Run this test script to check if OTP saving works:

```bash
cd backend
node test-otp-save.js
```

This will tell you exactly what's wrong!

---

## Common Issues & Solutions

### 1. MongoDB Not Running ❌

**Symptoms:**
- Error: `ECONNREFUSED`
- Error: `connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
```bash
# Start MongoDB
mongod

# Or if using MongoDB as a service:
# Windows:
net start MongoDB

# Mac/Linux:
sudo systemctl start mongod
```

**Verify MongoDB is running:**
```bash
# Check if MongoDB is listening on port 27017
mongosh
# or
mongo
```

---

### 2. Wrong Database Connection String ❌

**Check your connection in `server.js`:**
```javascript
mongoose.connect('mongodb://localhost:27017/donorhub')
```

**Make sure:**
- Port is `27017` (default MongoDB port)
- Database name is `donorhub`
- MongoDB is running on `localhost`

---

### 3. OTP Model Not Imported ❌

**Check `server.js` has this line:**
```javascript
const { OTP, OTPAttempt } = require('./models/OTP');
```

**Should be near the top of the file!**

---

### 4. Email Service Failing (Blocking Save) ❌

**If email fails, OTP might not save. Check `.env` file:**

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=DonorHub <your-email@gmail.com>
```

**Important:** Use App Password, not regular password!

**Get Gmail App Password:**
1. Go to Google Account Settings
2. Security → 2-Step Verification
3. App Passwords → Generate
4. Copy the 16-character password
5. Paste in `.env` file

---

### 5. Check Server Logs 📋

**When you click "Send OTP", check your server console for:**

```
[SEND-OTP] Processing request for: user@example.com
[SEND-OTP] OTP record created: { email: 'user@example.com', expiresAt: ... }
[EMAIL SERVICE] OTP email sent successfully to user@example.com
```

**If you see errors, they'll tell you what's wrong!**

---

### 6. Verify in MongoDB Directly 🔍

**Open MongoDB shell:**
```bash
mongosh
# or
mongo
```

**Check if OTPs are being saved:**
```javascript
use donorhub
db.otps.find().pretty()
```

**You should see:**
```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  otp: "123456",
  createdAt: ISODate("..."),
  expiresAt: ISODate("..."),
  verified: false,
  attempts: 0
}
```

**If empty, OTPs are not being saved!**

---

### 7. Check for Errors in Code ❌

**In `server.js`, the send-otp endpoint should have:**

```javascript
app.post('/api/auth/send-otp', otpRateLimitMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiration(10);
    
    // THIS LINE SAVES TO DATABASE
    const otpRecord = await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt: expiresAt,
      verified: false,
      attempts: 0
    });
    
    console.log('[SEND-OTP] OTP record created:', otpRecord);
    
    // Send email
    await sendOTPEmail(normalizedEmail, otpCode);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[SEND-OTP] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

### 8. Rate Limiting Blocking Requests ❌

**If you've sent too many OTPs, you might be rate-limited.**

**Reset rate limits:**
```bash
cd backend
node reset-rate-limit.js
```

---

## Step-by-Step Debugging Process

### Step 1: Check MongoDB
```bash
# Is MongoDB running?
mongosh
```

### Step 2: Check Server Logs
```bash
# Start server and watch logs
cd backend
node server.js
```

### Step 3: Test OTP Save
```bash
# Run diagnostic script
node test-otp-save.js
```

### Step 4: Check Database
```bash
# Open MongoDB shell
mongosh

# Switch to donorhub database
use donorhub

# Count OTPs
db.otps.countDocuments()

# View all OTPs
db.otps.find().pretty()
```

### Step 5: Test from Frontend
1. Open your registration page
2. Enter email
3. Click "Send OTP"
4. Check server console for logs
5. Check MongoDB for new OTP record

---

## Still Not Working? 🤔

### Enable Debug Mode

**Add this to `server.js` after MongoDB connection:**

```javascript
mongoose.set('debug', true);
```

**This will show all database queries in console!**

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Send OTP"
4. Check the request to `/api/auth/send-otp`
5. Look at Response

**Should see:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresAt": "2024-..."
}
```

---

## Quick Fix Checklist ✅

- [ ] MongoDB is running
- [ ] Server is running (`node server.js`)
- [ ] `.env` file has email credentials
- [ ] OTP model is imported in `server.js`
- [ ] No errors in server console
- [ ] `test-otp-save.js` passes
- [ ] Can see OTPs in MongoDB shell

---

## Need More Help?

Run the diagnostic script and share the output:
```bash
node test-otp-save.js > otp-test-results.txt
```

This will help identify the exact problem! 🎯
