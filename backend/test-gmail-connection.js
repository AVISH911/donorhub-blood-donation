require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('='.repeat(80));
console.log('GMAIL CONNECTION TEST');
console.log('='.repeat(80));
console.log();

// Check environment variables
console.log('1. Checking Environment Variables:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET' : '❌ NOT SET');
if (process.env.EMAIL_PASSWORD) {
  console.log('   Password Length:', process.env.EMAIL_PASSWORD.length, 'characters');
  console.log('   Expected Length: 16 characters (Gmail App Password)');
  console.log('   Has Spaces:', /\s/.test(process.env.EMAIL_PASSWORD) ? '❌ YES (REMOVE SPACES!)' : '✅ NO');
}
console.log();

// Test SMTP connection
console.log('2. Testing SMTP Connection to Gmail:');
console.log('   Host: smtp.gmail.com');
console.log('   Port: 587');
console.log('   Security: STARTTLS');
console.log();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  pool: false,
  connectionTimeout: 120000,
  greetingTimeout: 60000,
  socketTimeout: 120000,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  debug: true,
  logger: true
});

console.log('3. Verifying SMTP Connection...');
console.log('   (This may take up to 2 minutes)');
console.log();

const startTime = Date.now();

transporter.verify()
  .then(() => {
    const duration = Date.now() - startTime;
    console.log('✅ SUCCESS! SMTP connection verified');
    console.log(`   Duration: ${duration}ms`);
    console.log();
    console.log('='.repeat(80));
    console.log('RESULT: Gmail is configured correctly!');
    console.log('='.repeat(80));
    process.exit(0);
  })
  .catch((error) => {
    const duration = Date.now() - startTime;
    console.error('❌ FAILED! SMTP connection error');
    console.error(`   Duration: ${duration}ms`);
    console.error('   Error Code:', error.code || 'N/A');
    console.error('   Error Message:', error.message);
    console.error();
    console.error('='.repeat(80));
    console.error('RESULT: Gmail configuration has issues!');
    console.error('='.repeat(80));
    console.error();
    console.error('TROUBLESHOOTING STEPS:');
    console.error();
    
    if (error.code === 'EAUTH') {
      console.error('❌ Authentication Failed (EAUTH)');
      console.error('   This means your Gmail App Password is incorrect or not set up properly.');
      console.error();
      console.error('   Steps to fix:');
      console.error('   1. Go to https://myaccount.google.com/apppasswords');
      console.error('   2. Sign in with your Gmail account');
      console.error('   3. Create a new App Password for "Mail"');
      console.error('   4. Copy the 16-character password (no spaces!)');
      console.error('   5. Update EMAIL_PASSWORD in your .env file');
      console.error('   6. On Render: Update EMAIL_PASSWORD environment variable');
      console.error('   7. Make sure 2-Step Verification is enabled on your Google account');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('❌ Connection Timeout');
      console.error('   The connection to Gmail SMTP server timed out.');
      console.error();
      console.error('   Possible causes:');
      console.error('   1. Firewall blocking outbound SMTP connections (port 587)');
      console.error('   2. Network connectivity issues');
      console.error('   3. Render free tier cold start delays');
      console.error();
      console.error('   Steps to fix:');
      console.error('   1. Check your network/firewall settings');
      console.error('   2. Try again in a few minutes');
      console.error('   3. On Render: Check if the service is fully started');
    } else if (error.code === 'ECONNECTION' || error.code === 'ENOTFOUND') {
      console.error('❌ Connection Failed');
      console.error('   Cannot connect to Gmail SMTP server.');
      console.error();
      console.error('   Steps to fix:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify DNS resolution is working');
      console.error('   3. Check if smtp.gmail.com is accessible');
    } else {
      console.error('❌ Unknown Error');
      console.error('   Error details:', error);
    }
    
    console.error();
    process.exit(1);
  });
