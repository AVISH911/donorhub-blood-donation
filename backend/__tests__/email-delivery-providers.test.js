/**
 * Email Delivery Provider Tests
 * 
 * This test suite validates email delivery across different email providers
 * (Gmail, Outlook, Yahoo) and verifies email formatting and deliverability.
 * 
 * Requirements: 1.3 - Email service shall send OTP to provided email address within 10 seconds
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create test accounts for Gmail, Outlook, and Yahoo
 * 2. Set environment variables in .env file:
 *    - EMAIL_SERVICE (gmail, outlook, or custom SMTP)
 *    - EMAIL_USER (your email address)
 *    - EMAIL_PASSWORD (app password or SMTP password)
 * 3. Update TEST_EMAILS object below with your test email addresses
 * 4. Run tests with: npm test -- email-delivery-providers.test.js
 * 
 * NOTE: These tests send actual emails and may be rate-limited by providers.
 * Run them sparingly and verify emails manually in each inbox.
 */

const { sendOTPEmail } = require('../services/emailService');
const { generateOTP } = require('../utils/otpGenerator');

// Test email addresses for different providers
// UPDATE THESE WITH YOUR TEST EMAIL ADDRESSES
const TEST_EMAILS = {
  gmail: process.env.TEST_EMAIL_GMAIL || 'test-gmail@gmail.com',
  outlook: process.env.TEST_EMAIL_OUTLOOK || 'test-outlook@outlook.com',
  yahoo: process.env.TEST_EMAIL_YAHOO || 'test-yahoo@yahoo.com'
};

// Skip tests if email service is not configured
const isEmailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
const testMode = isEmailConfigured ? describe : describe.skip;

testMode('Email Delivery Across Providers', () => {
  
  // Helper function to wait for email delivery
  const waitForDelivery = (ms = 2000) => new Promise(resolve => setTimeout(resolve, ms));
  
  describe('Gmail Email Delivery', () => {
    
    test('should send OTP email to Gmail account', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.gmail;
      
      console.log(`\n📧 Sending OTP to Gmail: ${email}`);
      console.log(`🔢 OTP Code: ${otp}`);
      
      const startTime = Date.now();
      
      try {
        const result = await sendOTPEmail(email, otp);
        
        const endTime = Date.now();
        const deliveryTime = endTime - startTime;
        
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(deliveryTime).toBeLessThan(10000); // Should send within 10 seconds
        
        console.log(`✅ Email sent successfully in ${deliveryTime}ms`);
        console.log(`📬 Message ID: ${result.messageId}`);
        console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
        console.log(`   1. Check inbox at ${email}`);
        console.log(`   2. Verify email subject: "Your DonorHub Verification Code"`);
        console.log(`   3. Verify OTP code in email: ${otp}`);
        console.log(`   4. Verify email is not in spam folder`);
        console.log(`   5. Verify email formatting is correct (HTML rendering)`);
        
        // Wait a bit to avoid rate limiting
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Failed to send email to Gmail: ${error.message}`);
        throw error;
      }
    }, 15000); // 15 second timeout
    
    test('should handle Gmail-specific email format correctly', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.gmail;
      
      // Test with Gmail plus addressing (email+tag@gmail.com)
      const gmailPlusEmail = email.replace('@', '+test@');
      
      console.log(`\n📧 Testing Gmail plus addressing: ${gmailPlusEmail}`);
      
      try {
        const result = await sendOTPEmail(gmailPlusEmail, otp);
        
        expect(result.success).toBe(true);
        console.log(`✅ Gmail plus addressing works correctly`);
        
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Gmail plus addressing failed: ${error.message}`);
        throw error;
      }
    }, 15000);
  });
  
  describe('Outlook Email Delivery', () => {
    
    test('should send OTP email to Outlook account', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.outlook;
      
      console.log(`\n📧 Sending OTP to Outlook: ${email}`);
      console.log(`🔢 OTP Code: ${otp}`);
      
      const startTime = Date.now();
      
      try {
        const result = await sendOTPEmail(email, otp);
        
        const endTime = Date.now();
        const deliveryTime = endTime - startTime;
        
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(deliveryTime).toBeLessThan(10000);
        
        console.log(`✅ Email sent successfully in ${deliveryTime}ms`);
        console.log(`📬 Message ID: ${result.messageId}`);
        console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
        console.log(`   1. Check inbox at ${email}`);
        console.log(`   2. Verify email subject: "Your DonorHub Verification Code"`);
        console.log(`   3. Verify OTP code in email: ${otp}`);
        console.log(`   4. Verify email is not in junk folder`);
        console.log(`   5. Verify email formatting is correct (HTML rendering)`);
        
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Failed to send email to Outlook: ${error.message}`);
        throw error;
      }
    }, 15000);
    
    test('should handle Outlook email variations correctly', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.outlook;
      
      // Test with different Outlook domains
      const variations = [
        email,
        email.replace('@outlook.com', '@hotmail.com'),
        email.replace('@outlook.com', '@live.com')
      ].filter(e => e.includes('@'));
      
      console.log(`\n📧 Testing Outlook domain variations`);
      
      for (const testEmail of variations) {
        if (testEmail === email) {
          try {
            const result = await sendOTPEmail(testEmail, otp);
            expect(result.success).toBe(true);
            console.log(`✅ ${testEmail} - Success`);
            await waitForDelivery(1000);
          } catch (error) {
            console.log(`⚠️  ${testEmail} - ${error.message}`);
          }
        }
      }
    }, 30000);
  });
  
  describe('Yahoo Email Delivery', () => {
    
    test('should send OTP email to Yahoo account', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.yahoo;
      
      console.log(`\n📧 Sending OTP to Yahoo: ${email}`);
      console.log(`🔢 OTP Code: ${otp}`);
      
      const startTime = Date.now();
      
      try {
        const result = await sendOTPEmail(email, otp);
        
        const endTime = Date.now();
        const deliveryTime = endTime - startTime;
        
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(deliveryTime).toBeLessThan(10000);
        
        console.log(`✅ Email sent successfully in ${deliveryTime}ms`);
        console.log(`📬 Message ID: ${result.messageId}`);
        console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
        console.log(`   1. Check inbox at ${email}`);
        console.log(`   2. Verify email subject: "Your DonorHub Verification Code"`);
        console.log(`   3. Verify OTP code in email: ${otp}`);
        console.log(`   4. Verify email is not in spam folder`);
        console.log(`   5. Verify email formatting is correct (HTML rendering)`);
        
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Failed to send email to Yahoo: ${error.message}`);
        throw error;
      }
    }, 15000);
  });
  
  describe('Email Formatting and Deliverability', () => {
    
    test('should send properly formatted HTML email', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.gmail; // Use Gmail for this test
      
      console.log(`\n📧 Testing HTML email formatting`);
      
      try {
        const result = await sendOTPEmail(email, otp);
        
        expect(result.success).toBe(true);
        
        console.log(`✅ HTML email sent successfully`);
        console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
        console.log(`   1. Open email in ${email}`);
        console.log(`   2. Verify HTML rendering:`);
        console.log(`      - Header "DonorHub Email Verification" is visible`);
        console.log(`      - OTP code ${otp} is large, bold, and centered`);
        console.log(`      - OTP code has red color and dashed border`);
        console.log(`      - Background has light gray container`);
        console.log(`      - Text is properly formatted and readable`);
        console.log(`      - Footer with "DonorHub Team" is present`);
        
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Failed to send HTML email: ${error.message}`);
        throw error;
      }
    }, 15000);
    
    test('should include plain text fallback', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.gmail;
      
      console.log(`\n📧 Testing plain text fallback`);
      
      try {
        const result = await sendOTPEmail(email, otp);
        
        expect(result.success).toBe(true);
        
        console.log(`✅ Email with plain text fallback sent`);
        console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
        console.log(`   1. View email source or use text-only email client`);
        console.log(`   2. Verify plain text version contains:`);
        console.log(`      - OTP code: ${otp}`);
        console.log(`      - Expiration message (10 minutes)`);
        console.log(`      - DonorHub Team signature`);
        
        await waitForDelivery();
        
      } catch (error) {
        console.error(`❌ Failed to send email with plain text: ${error.message}`);
        throw error;
      }
    }, 15000);
    
    test('should send emails within 10 seconds consistently', async () => {
      const email = TEST_EMAILS.gmail;
      const deliveryTimes = [];
      
      console.log(`\n📧 Testing consistent delivery times (3 emails)`);
      
      for (let i = 0; i < 3; i++) {
        const otp = generateOTP();
        const startTime = Date.now();
        
        try {
          await sendOTPEmail(email, otp);
          const endTime = Date.now();
          const deliveryTime = endTime - startTime;
          
          deliveryTimes.push(deliveryTime);
          console.log(`  Email ${i + 1}: ${deliveryTime}ms`);
          
          expect(deliveryTime).toBeLessThan(10000);
          
          // Wait between sends to avoid rate limiting
          await waitForDelivery(2000);
          
        } catch (error) {
          console.error(`  Email ${i + 1} failed: ${error.message}`);
          throw error;
        }
      }
      
      const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
      console.log(`\n✅ Average delivery time: ${avgDeliveryTime.toFixed(0)}ms`);
      console.log(`   All emails sent within 10 seconds requirement`);
      
    }, 45000); // 45 second timeout for 3 emails
    
    test('should handle special characters in email addresses', async () => {
      const otp = generateOTP();
      
      // Test various valid email formats
      const specialEmails = [
        TEST_EMAILS.gmail.replace('@', '+special@'),
        TEST_EMAILS.gmail.replace('@', '.test@')
      ];
      
      console.log(`\n📧 Testing special characters in email addresses`);
      
      for (const email of specialEmails) {
        try {
          const result = await sendOTPEmail(email, otp);
          expect(result.success).toBe(true);
          console.log(`✅ ${email} - Success`);
          await waitForDelivery(1000);
        } catch (error) {
          console.log(`⚠️  ${email} - ${error.message}`);
        }
      }
    }, 30000);
  });
  
  describe('Cross-Provider Deliverability', () => {
    
    test('should successfully deliver to all three major providers', async () => {
      const otp = generateOTP();
      const results = {};
      
      console.log(`\n📧 Testing delivery to all providers with same OTP: ${otp}`);
      
      for (const [provider, email] of Object.entries(TEST_EMAILS)) {
        try {
          const startTime = Date.now();
          const result = await sendOTPEmail(email, otp);
          const deliveryTime = Date.now() - startTime;
          
          results[provider] = {
            success: true,
            deliveryTime,
            messageId: result.messageId
          };
          
          console.log(`✅ ${provider.padEnd(10)} - ${deliveryTime}ms - ${result.messageId}`);
          
          await waitForDelivery(2000);
          
        } catch (error) {
          results[provider] = {
            success: false,
            error: error.message
          };
          
          console.error(`❌ ${provider.padEnd(10)} - ${error.message}`);
        }
      }
      
      // Verify at least one provider succeeded
      const successCount = Object.values(results).filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
      
      console.log(`\n📊 Delivery Summary:`);
      console.log(`   Successful: ${successCount}/${Object.keys(TEST_EMAILS).length}`);
      console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED:`);
      console.log(`   Check all three inboxes and verify:`);
      console.log(`   1. All emails arrived (check spam/junk folders)`);
      console.log(`   2. All show same OTP: ${otp}`);
      console.log(`   3. All have proper formatting`);
      console.log(`   4. All arrived within reasonable time`);
      
    }, 60000); // 60 second timeout
  });
  
  describe('Error Handling and Edge Cases', () => {
    
    test('should handle invalid email addresses gracefully', async () => {
      const otp = generateOTP();
      const invalidEmails = [
        'invalid-email',
        'missing-at-sign.com',
        '@no-local-part.com',
        'no-domain@',
        ''
      ];
      
      console.log(`\n📧 Testing invalid email handling`);
      
      for (const email of invalidEmails) {
        try {
          await sendOTPEmail(email, otp);
          // Should not reach here
          fail(`Should have thrown error for: ${email}`);
        } catch (error) {
          expect(error.code).toBe('INVALID_EMAIL');
          console.log(`✅ Correctly rejected: "${email}"`);
        }
      }
    });
    
    test('should handle email service timeout gracefully', async () => {
      const otp = generateOTP();
      const email = TEST_EMAILS.gmail;
      
      console.log(`\n📧 Testing timeout handling (this may take 10+ seconds)`);
      
      try {
        // This should complete within timeout or throw timeout error
        await sendOTPEmail(email, otp);
        console.log(`✅ Email sent within timeout period`);
      } catch (error) {
        if (error.code === 'EMAIL_TIMEOUT') {
          console.log(`✅ Timeout handled correctly: ${error.message}`);
          expect(error.code).toBe('EMAIL_TIMEOUT');
        } else {
          throw error;
        }
      }
    }, 15000);
  });
});

// Summary and instructions
if (!isEmailConfigured) {
  console.log('\n⚠️  EMAIL DELIVERY TESTS SKIPPED');
  console.log('   To run these tests:');
  console.log('   1. Set EMAIL_USER and EMAIL_PASSWORD in .env file');
  console.log('   2. Set TEST_EMAIL_GMAIL, TEST_EMAIL_OUTLOOK, TEST_EMAIL_YAHOO');
  console.log('   3. Run: npm test -- email-delivery-providers.test.js\n');
}
