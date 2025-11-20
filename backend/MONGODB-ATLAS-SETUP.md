# MongoDB Atlas Setup Guide 🌐

## What is MongoDB Atlas?

MongoDB Atlas is a **cloud-hosted MongoDB database**. Instead of running MongoDB on your computer, your data is stored on MongoDB's servers in the cloud.

### Benefits:
✅ **Accessible from anywhere** - Your data is online, not just on your computer  
✅ **Always available** - No need to start MongoDB manually  
✅ **Automatic backups** - Your data is safe  
✅ **Free tier** - 512MB storage for free  
✅ **Scalable** - Can grow as your app grows  

---

## Step-by-Step Setup

### Step 1: Get Your MongoDB Atlas Password

You need to replace `<db_password>` in your connection string with your actual database password.

**Your current connection string:**
```
mongodb+srv://DonorHub_db_avishramteke3:<db_password>@donorhubdatabase.5u8k1rq.mongodb.net/donorhub
```

**Where to find your password:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Login to your account
3. Click "Database Access" in left sidebar
4. Find user: `DonorHub_db_avishramteke3`
5. Click "Edit" → "Edit Password"
6. Either view or reset your password
7. Copy the password

### Step 2: Update Your .env File

Open `backend/.env` and replace `<db_password>` with your actual password:

**Before:**
```env
MONGODB_URI=mongodb+srv://DonorHub_db_avishramteke3:<db_password>@donorhubdatabase.5u8k1rq.mongodb.net/donorhub?retryWrites=true&w=majority
```

**After (example):**
```env
MONGODB_URI=mongodb+srv://DonorHub_db_avishramteke3:MySecurePassword123@donorhubdatabase.5u8k1rq.mongodb.net/donorhub?retryWrites=true&w=majority
```

⚠️ **Important:** Replace `MySecurePassword123` with YOUR actual password!

### Step 3: Whitelist Your IP Address

MongoDB Atlas only allows connections from approved IP addresses for security.

**To allow your IP:**
1. Go to MongoDB Atlas Dashboard
2. Click "Network Access" in left sidebar
3. Click "Add IP Address"
4. Choose one:
   - **"Add Current IP Address"** - Only your current computer
   - **"Allow Access from Anywhere"** - Any computer (use `0.0.0.0/0`)
5. Click "Confirm"

**For development, use "Allow Access from Anywhere" (0.0.0.0/0)**

### Step 4: Test the Connection

Run this test script:

```bash
cd backend
node test-otp-save.js
```

**If successful, you'll see:**
```
✅ MongoDB Connected Successfully!
📍 Database: donorhub
🌐 Host: donorhubdatabase.5u8k1rq.mongodb.net
```

**If it fails, you'll see an error telling you what's wrong!**

### Step 5: Start Your Server

```bash
cd backend
node server.js
```

**Look for:**
```
✅ MongoDB Connected Successfully!
📍 Database: donorhub
🌐 Host: donorhubdatabase.5u8k1rq.mongodb.net
🚀 Server running on http://localhost:5000
```

---

## Verify Data is Saving to Atlas

### Option 1: MongoDB Atlas Dashboard

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Click "Browse Collections"
3. Select database: `donorhub`
4. You should see collections: `donors`, `users`, `otps`, etc.
5. Click on any collection to view data

### Option 2: MongoDB Compass (Desktop App)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open Compass
3. Paste your connection string (with password)
4. Click "Connect"
5. Browse your data visually

---

## Switching Between Local and Atlas

### Use Local MongoDB:
```env
# In .env file
MONGODB_URI=mongodb://localhost:27017/donorhub
```

### Use MongoDB Atlas:
```env
# In .env file
MONGODB_URI=mongodb+srv://DonorHub_db_avishramteke3:YourPassword@donorhubdatabase.5u8k1rq.mongodb.net/donorhub?retryWrites=true&w=majority
```

Just change the `MONGODB_URI` in `.env` and restart your server!

---

## Common Issues & Solutions

### ❌ Error: "Authentication failed"

**Problem:** Wrong password in connection string

**Solution:**
1. Go to MongoDB Atlas → Database Access
2. Reset password for user `DonorHub_db_avishramteke3`
3. Update `.env` file with new password

---

### ❌ Error: "IP not whitelisted"

**Problem:** Your IP address is not allowed

**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Add IP Address: `0.0.0.0/0` (allow all)
3. Wait 1-2 minutes for changes to apply

---

### ❌ Error: "ENOTFOUND" or "connection timeout"

**Problem:** Can't reach MongoDB Atlas servers

**Solution:**
1. Check your internet connection
2. Check if firewall is blocking MongoDB (port 27017)
3. Try different network (mobile hotspot)

---

### ❌ Data not showing in Atlas

**Problem:** Still connected to local MongoDB

**Solution:**
1. Check `.env` file has correct `MONGODB_URI`
2. Restart your server
3. Check server logs for connection confirmation

---

## Security Best Practices

### ✅ DO:
- Use strong passwords
- Keep `.env` file private (never commit to Git)
- Use IP whitelisting in production
- Rotate passwords regularly

### ❌ DON'T:
- Share your connection string publicly
- Commit `.env` file to GitHub
- Use simple passwords like "password123"
- Allow 0.0.0.0/0 in production (only for development)

---

## Will This Work Over Network? 🌐

**YES!** That's the whole point of MongoDB Atlas!

### How it works:

**Local MongoDB:**
```
Your Computer → Local MongoDB (only on your computer)
❌ Not accessible from other computers
❌ Stops when you turn off computer
```

**MongoDB Atlas:**
```
Your Computer → Internet → MongoDB Atlas Cloud
✅ Accessible from ANY computer with internet
✅ Always running (24/7)
✅ Your friends can access the same data
✅ Works on different networks
```

### Example Scenario:

1. **You** register a donor from your home WiFi
2. Data saves to MongoDB Atlas (in the cloud)
3. **Your friend** on different WiFi can see that donor
4. **You** on mobile data can also see it
5. **Anyone** with the app can access the same database

**This is perfect for:**
- Team projects
- Deploying to production
- Testing from different devices
- Sharing data across locations

---

## Next Steps

1. ✅ Replace `<db_password>` in `.env`
2. ✅ Whitelist your IP (or use 0.0.0.0/0)
3. ✅ Run `node test-otp-save.js` to test
4. ✅ Start server: `node server.js`
5. ✅ Test registration from your website
6. ✅ Check data in MongoDB Atlas dashboard

**Your data will now be stored in the cloud and accessible from anywhere! 🚀**

---

## Questions?

- **Q: Will my local data transfer to Atlas?**  
  A: No, they're separate. You'll start fresh with Atlas.

- **Q: Is it free?**  
  A: Yes! Free tier gives you 512MB storage.

- **Q: Can I switch back to local?**  
  A: Yes! Just change `MONGODB_URI` in `.env`

- **Q: Is my data safe?**  
  A: Yes! MongoDB Atlas has automatic backups and security.

- **Q: Can multiple people use it at once?**  
  A: Yes! That's the benefit of cloud database.

---

**You're all set! Your app will now store data in the cloud! ☁️**
