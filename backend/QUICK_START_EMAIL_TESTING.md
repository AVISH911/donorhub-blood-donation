# Quick Start: Email Delivery Testing

## 🚀 Quick Setup (5 minutes)

### Step 1: Configure Email Service

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your email credentials:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

3. **Get Gmail App Password** (if using Gmail):
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Go to: https://myaccount.google.com/apppasswords
   - Generate password for "Mail"
   - Copy the 16-character password
   - Paste into `EMAIL_PASSWORD`

### Step 2: Add Test Email Addresses (Optional)

Add test emails to `.env`:
```env
TEST_EMAIL_GMAIL=your-test@gmail.com
TEST_EMAIL_OUTLOOK=your-test@outlook.com
TEST_EMAIL_YAHOO=your-test@yahoo.com
```

### Step 3: Run Tests

Choose one of these methods:

#### Method 1: Automated Test Suite (Recommended)
```bash
cd backend
npm run test:email
```

This will:
- ✓ Test configuration
- ✓ Test email formatting
- ✓ Test delivery timing
- ✓ Send emails to all configured providers
- ✓ Show detailed results

#### Method 2: Interactive Testing
```bash
cd backend
npm run test:email-interactive
```

This allows you to:
- Enter any email address
- Send test OTP emails on demand
- Verify delivery in real-time

#### Method 3: Direct Script Execution
```bash
cd backend
node __tests__/email-delivery-test.js
```

## ✅ What to Check

After sending test emails, verify in each inbox:

1. **Email Received**
   - Check inbox (and spam folder)
   - Should arrive within 10 seconds

2. **Email Content**
   - Subject: "Your DonorHub Verification Code"
   - 6-digit OTP code clearly visible
   - Expiration notice: 10 minutes

3. **Email Formatting**
   - HTML version displays with styling
   - OTP code is large, bold, centered
   - Red color scheme
   - Mobile responsive

## 🐛 Common Issues

### "Email service not configured"
**Solution**: Set `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

### "Authentication failed"
**Solution**: 
- Use App Password, not regular password
- Enable 2-Step Verification in Google Account
- Regenerate App Password

### "Email not received"
**Solution**:
- Check spam/junk folder
- Verify email address is correct
- Wait up to 1 minute for delivery

### "Email in spam folder"
**Solution**:
- Add sender to contacts
- Mark as "Not Spam"
- This is normal for development testing

## 📊 Test Results

Document your results in:
- `backend/__tests__/EMAIL_TEST_RESULTS.md`

## 📚 Full Documentation

For detailed information, see:
- `backend/EMAIL_DELIVERY_TESTING.md` - Complete testing guide
- `backend/__tests__/email-delivery-test.js` - Test implementation

## 🎯 Requirements Coverage

This testing covers **Requirement 1.3**:
> "WHEN the OTP is generated, THE Email Service SHALL send the code to the provided email address within 10 seconds"

## 💡 Tips

1. **Use Real Email Addresses**: Test with actual Gmail, Outlook, and Yahoo accounts
2. **Check Spam Folders**: Development emails often go to spam
3. **Test on Mobile**: Verify responsive design on mobile devices
4. **Document Issues**: Use EMAIL_TEST_RESULTS.md to track findings
5. **Test Multiple Times**: Verify consistency across multiple sends

## 🔒 Security Notes

- Never commit `.env` file to version control
- Use App Passwords, not regular passwords
- Rotate credentials regularly
- Use dedicated email service in production (SendGrid, AWS SES, etc.)

## ✨ Next Steps

After successful testing:
1. ✓ Mark task as complete
2. ✓ Document any issues found
3. ✓ Update email template if needed
4. ✓ Configure production email service
5. ✓ Set up monitoring and alerts
