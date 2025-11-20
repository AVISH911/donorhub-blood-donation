/**
 * Interactive Email Delivery Test
 * 
 * This script allows you to manually test email delivery to any email address.
 * Useful for quick testing during development.
 */

const readline = require('readline');
const { sendOTPEmail } = require('./services/emailService');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ask question
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Main function
async function main() {
  console.log(`${colors.blue}${'='.repeat(60)}`);
  console.log(`INTERACTIVE EMAIL DELIVERY TEST`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
  
  // Check configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log(`${colors.red}Error: Email service not configured${colors.reset}`);
    console.log(`Please set EMAIL_USER and EMAIL_PASSWORD in your .env file\n`);
    rl.close();
    process.exit(1);
  }
  
  console.log(`${colors.green}Email service configured:${colors.reset}`);
  console.log(`  Service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
  console.log(`  From: ${process.env.EMAIL_USER}\n`);
  
  let continueTest = true;
  
  while (continueTest) {
    // Get email address
    const email = await question(`${colors.cyan}Enter email address to test (or 'quit' to exit): ${colors.reset}`);
    
    if (email.toLowerCase() === 'quit' || email.toLowerCase() === 'q') {
      continueTest = false;
      break;
    }
    
    // Validate email format
    if (!email.includes('@')) {
      console.log(`${colors.red}Invalid email format. Please try again.\n${colors.reset}`);
      continue;
    }
    
    // Generate OTP
    const otp = generateOTP();
    console.log(`\n${colors.yellow}Generated OTP: ${otp}${colors.reset}`);
    console.log(`Sending email to: ${email}...`);
    
    // Send email
    const startTime = Date.now();
    try {
      const result = await sendOTPEmail(email, otp);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`${colors.green}✓ Email sent successfully!${colors.reset}`);
      console.log(`  Message ID: ${result.messageId}`);
      console.log(`  Duration: ${duration}ms`);
      
      if (duration > 10000) {
        console.log(`  ${colors.yellow}⚠ Warning: Delivery took longer than 10 seconds${colors.reset}`);
      }
      
      console.log(`\n${colors.cyan}Please check the inbox for: ${email}${colors.reset}`);
      console.log(`Verify the following:`);
      console.log(`  □ Email received (check spam folder if not in inbox)`);
      console.log(`  □ Subject: "Your DonorHub Verification Code"`);
      console.log(`  □ OTP code: ${otp}`);
      console.log(`  □ HTML formatting displays correctly`);
      console.log(`  □ Expiration notice: 10 minutes\n`);
      
    } catch (error) {
      console.log(`${colors.red}✗ Email delivery failed${colors.reset}`);
      console.log(`  Error: ${error.message}`);
      console.log(`  Code: ${error.code || 'N/A'}\n`);
    }
    
    // Ask if user wants to continue
    const again = await question(`${colors.cyan}Test another email? (y/n): ${colors.reset}`);
    if (again.toLowerCase() !== 'y' && again.toLowerCase() !== 'yes') {
      continueTest = false;
    }
    console.log('');
  }
  
  console.log(`${colors.blue}Test session ended. Goodbye!${colors.reset}\n`);
  rl.close();
}

// Run
main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});
