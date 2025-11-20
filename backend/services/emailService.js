const nodemailer = require('nodemailer');

// Email masking function to show only first character and domain
const maskEmail = (email) => {
  if (!email || !email.includes('@')) {
    return '[invalid-email]';
  }
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '***';
  return `${maskedLocal}@${domain}`;
};

// Get formatted timestamp for logs
const getTimestamp = () => {
  return new Date().toISOString();
};

// Validate email configuration on startup
const validateEmailConfig = () => {
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] Validating email service configuration...`);
  
  // Check for required environment variables
  const required = ['EMAIL_USER', 'EMAIL_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`[${getTimestamp()}] [EMAIL CONFIG] ❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error(`[${getTimestamp()}] [EMAIL CONFIG] ❌ Email service will not function properly`);
    return false;
  }
  
  // Validate Gmail App Password format (16 characters, no spaces)
  const appPassword = process.env.EMAIL_PASSWORD;
  if (appPassword.length !== 16 || /\s/.test(appPassword)) {
    console.warn(`[${getTimestamp()}] [EMAIL CONFIG] ⚠️  EMAIL_PASSWORD may not be a valid Gmail App Password`);
    console.warn(`[${getTimestamp()}] [EMAIL CONFIG] ⚠️  Gmail App Passwords should be 16 characters without spaces`);
  }
  
  // Log configuration status without exposing credentials
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] ✅ Email service configured`);
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] ✅ Using email: ${process.env.EMAIL_USER}`);
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] ✅ Password length: ${appPassword.length} characters`);
  
  return true;
};

// Configure Nodemailer transporter with optimized settings for cloud deployment
const createTransporter = () => {
  // Log transporter creation for debugging
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] Creating email transporter...`);
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] SMTP Host: smtp.gmail.com:587`);
  console.log(`[${getTimestamp()}] [EMAIL CONFIG] Auth User: ${process.env.EMAIL_USER}`);
  
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Disable connection pooling for more reliable cloud deployment
    pool: false,
    // Maximum timeouts for cloud environments (Render free tier)
    connectionTimeout: 120000,  // 120 seconds (2 minutes)
    greetingTimeout: 60000,     // 60 seconds
    socketTimeout: 120000,      // 120 seconds (2 minutes)
    // TLS security settings
    tls: {
      rejectUnauthorized: false, // More lenient for cloud environments
      minVersion: 'TLSv1.2'
    },
    // Additional debugging
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
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

    // Single attempt with long timeout (no retries to avoid compounding delays)
    let lastError;
    const startTime = Date.now();
    const maskedEmail = maskEmail(email);
    
    // Log start of email send operation with masked email
    console.log(`[${getTimestamp()}] [EMAIL SERVICE] Starting email send operation to ${maskedEmail}`);
    console.log(`[${getTimestamp()}] [EMAIL SERVICE] Using SMTP: smtp.gmail.com:587`);
    console.log(`[${getTimestamp()}] [EMAIL SERVICE] Timeout settings: connection=120s, socket=120s`);
    
    try {
      console.log(`[${getTimestamp()}] [EMAIL SERVICE] Attempting to send email to ${maskedEmail}`);
      
      const info = await transporter.sendMail(mailOptions);
      const duration = Date.now() - startTime;
      
      // Log success with messageId and duration in milliseconds
      console.log(`[${getTimestamp()}] [EMAIL SERVICE] ✅ Email sent successfully to ${maskedEmail} | MessageID: ${info.messageId} | Duration: ${duration}ms`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (err) {
      lastError = err;
      const duration = Date.now() - startTime;
      
      // Log failure with error type, error code, and duration
      console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Email send failed | Email: ${maskedEmail} | Error Type: ${err.name || 'Unknown'} | Error Code: ${err.code || 'N/A'} | Duration: ${duration}ms | Message: ${err.message}`);
      
      // Log full error stack for debugging
      if (err.stack) {
        console.error(`[${getTimestamp()}] [EMAIL SERVICE] Error stack: ${err.stack}`);
      }
      
      throw lastError;
    }
  } catch (error) {
    const maskedEmail = maskEmail(email);
    
    // Log error with timestamp, error type, error code
    console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Error sending OTP email | Email: ${maskedEmail} | Error Type: ${error.name || 'Unknown'} | Error Code: ${error.code || 'N/A'} | Message: ${error.message}`);
    
    // Re-throw with original message if already formatted
    if (error.code && (error.code.startsWith('EMAIL_') || error.code === 'INVALID_EMAIL' || error.code === 'INVALID_OTP')) {
      throw error;
    }
    
    // Categorize nodemailer errors for better user feedback
    // Map EAUTH errors to EMAIL_AUTH_FAILED
    if (error.code === 'EAUTH') {
      const authError = new Error('Email service authentication failed');
      authError.code = 'EMAIL_AUTH_FAILED';
      console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Authentication failed | Email: ${maskedEmail} | Error Code: EMAIL_AUTH_FAILED`);
      throw authError;
    }
    
    // Map ETIMEDOUT errors to EMAIL_TIMEOUT with retry suggestion
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      const timeoutError = new Error('Email service timeout. Please try again');
      timeoutError.code = 'EMAIL_TIMEOUT';
      console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Timeout occurred | Email: ${maskedEmail} | Error Code: EMAIL_TIMEOUT`);
      throw timeoutError;
    }
    
    // Map ECONNECTION/ENOTFOUND errors to EMAIL_CONNECTION_FAILED
    if (error.code === 'ECONNECTION' || error.code === 'ENOTFOUND' || error.message.includes('connection')) {
      const connError = new Error('Unable to connect to email service');
      connError.code = 'EMAIL_CONNECTION_FAILED';
      console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Connection failed | Email: ${maskedEmail} | Error Code: EMAIL_CONNECTION_FAILED`);
      throw connError;
    }
    
    // Generic email error for any other nodemailer errors
    const genericError = new Error('Failed to send OTP email. Please try again');
    genericError.code = 'EMAIL_SEND_FAILED';
    genericError.originalError = error.message;
    console.error(`[${getTimestamp()}] [EMAIL SERVICE] ❌ Generic send failure | Email: ${maskedEmail} | Error Code: EMAIL_SEND_FAILED | Original: ${error.message}`);
    throw genericError;
  }
};

module.exports = {
  sendOTPEmail,
  validateEmailConfig
};
