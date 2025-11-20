const nodemailer = require('nodemailer');

// Configure Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Email template for OTP
const createOTPEmailTemplate = (otp) => {
  return {
    subject: 'Your DonorHub Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #e74c3c;
            letter-spacing: 8px;
            margin: 30px 0;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            border: 2px dashed #e74c3c;
          }
          .header {
            color: #e74c3c;
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="header">DonorHub Email Verification</h1>
          <p>Hello,</p>
          <p>Your verification code for DonorHub registration is:</p>
          <div class="otp-code">${otp}</div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>DonorHub Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello,

Your verification code for DonorHub registration is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
DonorHub Team
    `
  };
};

// Send OTP email function with error handling
const sendOTPEmail = async (email, otp) => {
  try {
    // Validate email
    if (!email || !email.includes('@')) {
      const error = new Error('Invalid email address');
      error.code = 'INVALID_EMAIL';
      throw error;
    }

    // Validate OTP
    if (!otp || otp.length !== 6) {
      const error = new Error('Invalid OTP code');
      error.code = 'INVALID_OTP';
      throw error;
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.');
      const error = new Error('Email service not configured. Please contact support.');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    const transporter = createTransporter();
    const emailTemplate = createOTPEmailTemplate(otp);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `DonorHub <${process.env.EMAIL_USER}>`,
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    // Set timeout for email sending (10 seconds)
    const sendWithTimeout = Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 10000)
      )
    ]);

    const info = await sendWithTimeout;
    
    console.log(`[EMAIL SERVICE] OTP email sent successfully to ${email}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending OTP email:', {
      email,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Categorize errors for better user feedback
    if (error.code === 'EAUTH' || error.code === 'ENOTFOUND') {
      const authError = new Error('Email service authentication failed. Please contact support.');
      authError.code = 'EMAIL_AUTH_FAILED';
      throw authError;
    }
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      const timeoutError = new Error('Email service timeout. Please try again.');
      timeoutError.code = 'EMAIL_TIMEOUT';
      throw timeoutError;
    }
    
    if (error.code === 'ECONNECTION' || error.message.includes('connection')) {
      const connError = new Error('Unable to connect to email service. Please try again.');
      connError.code = 'EMAIL_CONNECTION_FAILED';
      throw connError;
    }
    
    // Re-throw with original message if already formatted
    if (error.code && error.code.startsWith('EMAIL_') || error.code === 'INVALID_EMAIL' || error.code === 'INVALID_OTP') {
      throw error;
    }
    
    // Generic email error
    const genericError = new Error('Failed to send OTP email. Please try again.');
    genericError.code = 'EMAIL_SEND_FAILED';
    genericError.originalError = error.message;
    throw genericError;
  }
};

module.exports = {
  sendOTPEmail
};
