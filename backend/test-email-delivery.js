require('dotenv').config();
const { sendOTPEmail, validateEmailConfig } = require('./services/emailService');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL_GMAIL || 'iamtheshadow911@gmail.com';
const TEST_OTP = '123456';

// Helper function to print test results
function printTestResult(testName, passed, message, duration) {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const durationStr = duration ? ` (${duration}ms)` : '';
  console.log(`\n${status} ${testName}${durationStr}`);
  if (message) {
    console.log(`  ${message}`);
  }
}

// Helper function to print section headers
function printSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Test 1: Validate email configuration
async function testEmailConfiguration() {
  printSection('TEST 1: Email Configuration Validation');
  
  const startTime = Date.now();
  const isValid = validateEmailConfig();
  const duration = Date.now() - startTime;
  
  printTestResult(
    'Email Configuration',
    isValid,
    isValid ? 'Email service is properly configured' : 'Email service configuration is invalid',
    duration
  );
  
  return isValid;
}

// Test 2: Send OTP email with valid credentials
async function testValidEmailDelivery() {
  printSection('TEST 2: Email Delivery with Valid Credentials');
  
  console.log(`${colors.blue}Sending OTP to: ${TEST_EMAIL}${colors.reset}`);
  console.log(`${colors.blue}OTP Code: ${TEST_OTP}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    const result = await sendOTPEmail(TEST_EMAIL, TEST_OTP);
    const duration = Date.now() - startTime;
    
    printTestResult(
      'Email Delivery',
      result.success,
      `Email sent successfully! MessageID: ${result.messageId}`,
      duration
    );
    
    // Check if delivery was within 10 seconds (Requirement 2.5)
    const within10Seconds = duration < 10000;
    printTestResult(
      'Delivery Time < 10 seconds',
      within10Seconds,
      within10Seconds 
        ? `Email delivered in ${duration}ms (within acceptable time)` 
        : `Email took ${duration}ms (exceeds 10 second target)`,
      duration
    );
    
    console.log(`\n${colors.yellow}⚠️  Please check your inbox at ${TEST_EMAIL}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Verify that the email arrived and contains OTP: ${TEST_OTP}${colors.reset}`);
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    printTestResult(
      'Email Delivery',
      false,
      `Error: ${error.message} (Code: ${error.code})`,
      duration
    );
    
    return false;
  }
}

// Test 3: Test with invalid credentials
async function testInvalidCredentials() {
  printSection('TEST 3: Error Handling with Invalid Credentials');
  
  console.log(`${colors.blue}Testing error handling by temporarily using invalid credentials${colors.reset}\n`);
  
  // Save original credentials
  const originalUser = process.env.EMAIL_USER;
  const originalPassword = process.env.EMAIL_PASSWORD;
  
  // Set invalid credentials
  process.env.EMAIL_USER = 'invalid@gmail.com';
  process.env.EMAIL_PASSWORD = 'invalidpassword123';
  
  const startTime = Date.now();
  
  try {
    await sendOTPEmail(TEST_EMAIL, TEST_OTP);
    const duration = Date.now() - startTime;
    
    // If we get here, the test failed (should have thrown an error)
    printTestResult(
      'Invalid Credentials Error Handling',
      false,
      'Expected authentication error but email was sent successfully',
      duration
    );
    
    // Restore original credentials
    process.env.EMAIL_USER = originalUser;
    process.env.EMAIL_PASSWORD = originalPassword;
    
    return false;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Restore original credentials
    process.env.EMAIL_USER = originalUser;
    process.env.EMAIL_PASSWORD = originalPassword;
    
    // Check if error was properly categorized
    const isAuthError = error.code === 'EMAIL_AUTH_FAILED';
    const hasProperMessage = error.message.includes('authentication failed');
    
    printTestResult(
      'Invalid Credentials Error Handling',
      isAuthError && hasProperMessage,
      `Error Code: ${error.code}, Message: "${error.message}"`,
      duration
    );
    
    return isAuthError && hasProperMessage;
  }
}

// Test 4: Verify log formatting and masking
async function testLogFormatting() {
  printSection('TEST 4: Log Formatting and Email Masking');
  
  console.log(`${colors.blue}Checking log output for proper formatting and email masking${colors.reset}\n`);
  
  // Capture console output
  const originalLog = console.log;
  const originalError = console.error;
  let logOutput = [];
  
  console.log = (...args) => {
    logOutput.push(args.join(' '));
    originalLog(...args);
  };
  
  console.error = (...args) => {
    logOutput.push(args.join(' '));
    originalError(...args);
  };
  
  try {
    await sendOTPEmail(TEST_EMAIL, TEST_OTP);
  } catch (error) {
    // Ignore errors for this test
  }
  
  // Restore console functions
  console.log = originalLog;
  console.error = originalError;
  
  // Check for proper email masking
  const hasEmailMasking = logOutput.some(log => log.includes('i***@gmail.com'));
  const hasTimestamp = logOutput.some(log => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(log));
  const hasDuration = logOutput.some(log => log.includes('ms'));
  const noExposedOTP = !logOutput.some(log => log.includes(TEST_OTP));
  
  printTestResult(
    'Email Masking',
    hasEmailMasking,
    hasEmailMasking ? 'Email addresses are properly masked in logs' : 'Email masking not found in logs'
  );
  
  printTestResult(
    'Timestamp Logging',
    hasTimestamp,
    hasTimestamp ? 'Timestamps are included in logs' : 'Timestamps not found in logs'
  );
  
  printTestResult(
    'Duration Logging',
    hasDuration,
    hasDuration ? 'Duration metrics are logged' : 'Duration metrics not found in logs'
  );
  
  printTestResult(
    'OTP Security',
    noExposedOTP,
    noExposedOTP ? 'OTP codes are not exposed in logs' : 'WARNING: OTP codes found in logs!'
  );
  
  return hasEmailMasking && hasTimestamp && hasDuration && noExposedOTP;
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.cyan}╔${'═'.repeat(58)}╗${colors.reset}`);
  console.log(`${colors.cyan}║${' '.repeat(10)}EMAIL DELIVERY TEST SUITE${' '.repeat(23)}║${colors.reset}`);
  console.log(`${colors.cyan}╚${'═'.repeat(58)}╝${colors.reset}`);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Run all tests
  const tests = [
    { name: 'Configuration', fn: testEmailConfiguration },
    { name: 'Valid Delivery', fn: testValidEmailDelivery },
    { name: 'Invalid Credentials', fn: testInvalidCredentials },
    { name: 'Log Formatting', fn: testLogFormatting }
  ];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.total++;
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`\n${colors.red}Unexpected error in ${test.name}:${colors.reset}`, error.message);
      results.total++;
      results.failed++;
    }
  }
  
  // Print summary
  printSection('TEST SUMMARY');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  const allPassed = results.failed === 0;
  console.log(`\n${allPassed ? colors.green : colors.red}${'='.repeat(60)}${colors.reset}`);
  console.log(`${allPassed ? colors.green : colors.red}${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}${colors.reset}`);
  console.log(`${allPassed ? colors.green : colors.red}${'='.repeat(60)}${colors.reset}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
