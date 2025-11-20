require('dotenv').config();
const nodemailer = require('nodemailer');

// Test email configuration
async function testEmailConnection() {
  console.log('🔍 Testing email configuration...\n');
  
  // Check if credentials are loaded
  console.log('📧 Email User:', process.env.EMAIL_USER || '❌ NOT SET');
  console.log('🔑 Email Password:', process.env.EMAIL_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
  console.log('📮 Email Service:', process.env.EMAIL_SERVICE || 'gmail');
  console.log('\n');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email credentials not configured in .env file');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });

  try {
    console.log('🔌 Attempting to connect to Gmail SMTP server...');
    
    // Verify connection
    await transporter.verify();
    
    console.log('✅ SUCCESS! Email configuration is valid.');
    console.log('✅ Connection to Gmail SMTP server established.');
    console.log('\n📨 Sending test email...\n');

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `DonorHub <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'DonorHub Email Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0f0f0;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Email Configuration Test Successful!</h2>
            <p>Your DonorHub email service is configured correctly and working.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>Email Service: ${process.env.EMAIL_SERVICE || 'gmail'}</li>
              <li>Email User: ${process.env.EMAIL_USER}</li>
              <li>Test Time: ${new Date().toLocaleString()}</li>
            </ul>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated test email from DonorHub.
            </p>
          </div>
        </div>
      `,
      text: 'Email configuration test successful! Your DonorHub email service is working correctly.'
    });

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Check your inbox:', process.env.EMAIL_USER);
    console.log('\n🎉 All tests passed! Your email configuration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED\n');
    console.error('Error Type:', error.code || 'Unknown');
    console.error('Error Message:', error.message);
    console.error('\n📋 Troubleshooting Steps:\n');
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication Failed - Your password is INVALID or expired');
      console.error('\n   Solutions:');
      console.error('   1. Generate a new App Password:');
      console.error('      - Go to: https://myaccount.google.com/apppasswords');
      console.error('      - Sign in to your Google Account');
      console.error('      - Click "Generate" and select "Mail" and "Other (Custom name)"');
      console.error('      - Copy the 16-character password');
      console.error('      - Update EMAIL_PASSWORD in your .env file');
      console.error('\n   2. Enable 2-Step Verification if not already enabled:');
      console.error('      - Go to: https://myaccount.google.com/security');
      console.error('      - Enable 2-Step Verification');
      console.error('      - Then create an App Password');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('⏱️  Connection Timeout - Network or firewall issue');
      console.error('\n   Solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Check if port 587 or 465 is blocked by firewall');
      console.error('   3. Try again in a few minutes');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 Connection Failed - Cannot reach Gmail servers');
      console.error('\n   Solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify Gmail SMTP is not blocked');
    } else {
      console.error('\n   General Solutions:');
      console.error('   1. Verify your EMAIL_USER is correct');
      console.error('   2. Regenerate your App Password');
      console.error('   3. Check Gmail security settings');
    }
    
    console.error('\n📖 Full Error Details:');
    console.error(error);
    
    process.exit(1);
  }
}

// Run the test
testEmailConnection();
