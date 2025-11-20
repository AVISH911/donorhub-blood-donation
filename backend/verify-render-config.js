/**
 * Render Configuration Verification Script
 * 
 * This script helps verify that all required environment variables
 * are properly configured for email delivery on Render.
 * 
 * Run this script locally to validate your configuration before deploying.
 */

const chalk = require('chalk') || { green: (s) => s, red: (s) => s, yellow: (s) => s, blue: (s) => s };

console.log('\n' + '='.repeat(60));
console.log('  RENDER DEPLOYMENT CONFIGURATION VERIFICATION');
console.log('='.repeat(60) + '\n');

// Check if running in production/Render environment
const isRender = process.env.RENDER === 'true';
console.log(`Environment: ${isRender ? 'Render (Production)' : 'Local Development'}\n`);

// Required environment variables
const requiredVars = [
  { name: 'EMAIL_USER', description: 'Gmail account email address' },
  { name: 'EMAIL_PASSWORD', description: 'Gmail App Password (16 characters)' },
  { name: 'EMAIL_FROM', description: 'From address for emails' }
];

let allValid = true;
const issues = [];

console.log('Checking required environment variables:\n');

requiredVars.forEach(({ name, description }) => {
  const value = process.env[name];
  
  if (!value) {
    console.log(`❌ ${name}: MISSING`);
    console.log(`   Description: ${description}\n`);
    issues.push(`${name} is not set`);
    allValid = false;
    return;
  }

  console.log(`✓ ${name}: SET`);
  
  // Specific validations
  if (name === 'EMAIL_USER') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      console.log(`   ⚠️  Warning: Does not appear to be a valid email format`);
      issues.push(`${name} format may be invalid`);
    } else {
      console.log(`   Value: ${value}`);
    }
  }
  
  if (name === 'EMAIL_PASSWORD') {
    // Check for Gmail App Password format (16 characters, no spaces)
    const hasSpaces = /\s/.test(value);
    const length = value.length;
    
    if (hasSpaces) {
      console.log(`   ❌ ERROR: Contains spaces (should be removed)`);
      issues.push(`${name} contains spaces`);
      allValid = false;
    } else if (length !== 16) {
      console.log(`   ⚠️  Warning: Length is ${length} characters (Gmail App Passwords are typically 16 characters)`);
      issues.push(`${name} length is ${length}, expected 16`);
    } else {
      console.log(`   ✓ Valid format (16 characters, no spaces)`);
    }
    
    // Mask the password for display
    const masked = value.substring(0, 2) + '*'.repeat(length - 4) + value.substring(length - 2);
    console.log(`   Masked value: ${masked}`);
  }
  
  if (name === 'EMAIL_FROM') {
    console.log(`   Value: ${value}`);
  }
  
  console.log('');
});

// Additional checks
console.log('\nAdditional Configuration Checks:\n');

// Check MongoDB connection
if (process.env.MONGODB_URI) {
  console.log('✓ MONGODB_URI: SET');
} else {
  console.log('⚠️  MONGODB_URI: NOT SET (may cause database connection issues)');
}

// Check JWT secret
if (process.env.JWT_SECRET) {
  console.log('✓ JWT_SECRET: SET');
} else {
  console.log('⚠️  JWT_SECRET: NOT SET (may cause authentication issues)');
}

// Check PORT
const port = process.env.PORT || 5000;
console.log(`✓ PORT: ${port}`);

console.log('\n' + '='.repeat(60));

if (allValid && issues.length === 0) {
  console.log('✅ ALL CHECKS PASSED - Configuration is valid!');
  console.log('='.repeat(60) + '\n');
  console.log('Next steps:');
  console.log('1. Commit and push your code changes to trigger Render deployment');
  console.log('2. Monitor Render logs during deployment');
  console.log('3. Test OTP email delivery after deployment completes\n');
  process.exit(0);
} else {
  console.log('⚠️  CONFIGURATION ISSUES DETECTED');
  console.log('='.repeat(60) + '\n');
  console.log('Issues found:');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  console.log('\nPlease fix these issues in the Render dashboard:');
  console.log('1. Go to https://dashboard.render.com/');
  console.log('2. Select your service (donorhub-api-mxcl)');
  console.log('3. Go to Environment tab');
  console.log('4. Add/update the missing or invalid variables');
  console.log('5. Save changes (this will trigger a redeploy)\n');
  process.exit(1);
}
