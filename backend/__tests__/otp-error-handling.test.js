const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const { OTP, OTPAttempt } = require('../models/OTP');
const { generateOTP, getOTPExpiration } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../services/emailService');
const { otpRateLimitMiddleware } = require('../middleware/otpRateLimit');

// Mock the email service
jest.mock('../services/emailService');

let mongoServer;
let app;

// Setup Express app for testing
const setupApp = () => {
  const testApp = express();
  testApp.use(express.json());

  // Send OTP endpoint
  testApp.post('/api/auth/send-otp', otpRateLimitMiddleware, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
          errorCode: 'EMAIL_REQUIRED'
        });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          errorCode: 'INVALID_EMAIL_FORMAT'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const otpCode = generateOTP();
      const expiresAt = getOTPExpiration(10);
      
      await OTP.deleteMany({ email: normalizedEmail });
      
      const otpRecord = await OTP.create({
        email: normalizedEmail,
        otp: otpCode,
        expiresAt: expiresAt,
        verified: false,
        attempts: 0
      });
      
      try {
        await sendOTPEmail(normalizedEmail, otpCode);
      } catch (emailError) {
        await OTP.deleteOne({ _id: otpRecord._id });
        
        let errorMessage = 'Failed to send OTP email. Please try again.';
        if (emailError.code === 'EMAIL_TIMEOUT') {
          errorMessage = 'Email service timeout. Please try again.';
        } else if (emailError.code === 'EMAIL_AUTH_FAILED') {
          errorMessage = 'Email service is temporarily unavailable. Please contact support.';
        } else if (emailError.code === 'EMAIL_CONNECTION_FAILED') {
          errorMessage = 'Unable to connect to email service. Please try again.';
        }
        
        return res.status(500).json({
          success: false,
          message: errorMessage,
          errorCode: emailError.code || 'EMAIL_SEND_FAILED'
        });
      }
      
      res.json({
        success: true,
        message: 'OTP sent to your email',
        expiresAt: expiresAt.toISOString()
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while sending OTP. Please try again.',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  // Verify OTP endpoint
  testApp.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required',
          errorCode: 'MISSING_FIELDS'
        });
      }
      
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'OTP must be a 6-digit number',
          errorCode: 'INVALID_OTP_FORMAT'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const otpRecord = await OTP.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
      
      if (!otpRecord) {
        return res.status(404).json({
          success: false,
          message: 'No OTP found for this email. Please request a new one.',
          errorCode: 'OTP_NOT_FOUND'
        });
      }
      
      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new code.',
          expired: true,
          errorCode: 'OTP_EXPIRED'
        });
      }
      
      if (otpRecord.verified) {
        return res.json({
          success: true,
          message: 'Email already verified',
          verified: true
        });
      }
      
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      if (otpRecord.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP code. Please try again.',
          verified: false,
          attemptsRemaining: Math.max(0, 5 - otpRecord.attempts),
          errorCode: 'INVALID_OTP'
        });
      }
      
      otpRecord.verified = true;
      await otpRecord.save();
      
      res.json({
        success: true,
        message: 'Email verified successfully',
        verified: true
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while verifying OTP. Please try again.',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  return testApp;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  app = setupApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await OTP.deleteMany({});
  await OTPAttempt.deleteMany({});
  jest.clearAllMocks();
});

describe('OTP Error Handling Tests', () => {
  
  // Test invalid email format handling (Requirement 1.5)
  describe('Invalid Email Format Handling', () => {
    
    test('should reject email without @ symbol', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'invalidemail.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_EMAIL_FORMAT');
      expect(response.body.message).toBe('Invalid email format');
    });
    
    test('should reject email without domain', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'user@' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_EMAIL_FORMAT');
    });
    
    test('should reject empty email', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email is required');
    });
    
    test('should reject missing email field', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email is required');
    });
  });

  // Test OTP send failure scenarios (Requirement 1.5)
  describe('OTP Send Failure Scenarios', () => {
    
    test('should handle email service timeout', async () => {
      const timeoutError = new Error('Email service timeout. Please try again.');
      timeoutError.code = 'EMAIL_TIMEOUT';
      sendOTPEmail.mockRejectedValue(timeoutError);
      
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('EMAIL_TIMEOUT');
      expect(response.body.message).toBe('Email service timeout. Please try again.');
      
      // Verify OTP was not stored
      const otpRecord = await OTP.findOne({ email: 'test@example.com' });
      expect(otpRecord).toBeNull();
    });
    
    test('should handle email authentication failure', async () => {
      const authError = new Error('Email service authentication failed. Please contact support.');
      authError.code = 'EMAIL_AUTH_FAILED';
      sendOTPEmail.mockRejectedValue(authError);
      
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('EMAIL_AUTH_FAILED');
      expect(response.body.message).toBe('Email service is temporarily unavailable. Please contact support.');
    });
    
    test('should handle email connection failure', async () => {
      const connError = new Error('Unable to connect to email service. Please try again.');
      connError.code = 'EMAIL_CONNECTION_FAILED';
      sendOTPEmail.mockRejectedValue(connError);
      
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('EMAIL_CONNECTION_FAILED');
      expect(response.body.message).toBe('Unable to connect to email service. Please try again.');
    });
    
    test('should handle generic email send failure', async () => {
      const genericError = new Error('Failed to send OTP email. Please try again.');
      genericError.code = 'EMAIL_SEND_FAILED';
      sendOTPEmail.mockRejectedValue(genericError);
      
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('EMAIL_SEND_FAILED');
    });
  });

  // Test invalid OTP entry (Requirement 2.4)
  describe('Invalid OTP Entry', () => {
    
    test('should reject OTP with less than 6 digits', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '12345' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_OTP_FORMAT');
      expect(response.body.message).toBe('OTP must be a 6-digit number');
    });
    
    test('should reject OTP with more than 6 digits', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '1234567' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_OTP_FORMAT');
    });
    
    test('should reject OTP with non-numeric characters', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '12345a' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_OTP_FORMAT');
    });
    
    test('should reject incorrect OTP code', async () => {
      // Create OTP record
      await OTP.create({
        email: 'test@example.com',
        otp: '123456',
        expiresAt: getOTPExpiration(10),
        verified: false,
        attempts: 0
      });
      
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '654321' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_OTP');
      expect(response.body.message).toBe('Invalid OTP code. Please try again.');
      expect(response.body.verified).toBe(false);
    });
    
    test('should track verification attempts', async () => {
      await OTP.create({
        email: 'test@example.com',
        otp: '123456',
        expiresAt: getOTPExpiration(10),
        verified: false,
        attempts: 0
      });
      
      // First attempt
      const response1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '111111' });
      
      expect(response1.body.attemptsRemaining).toBe(4);
      
      // Second attempt
      const response2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '222222' });
      
      expect(response2.body.attemptsRemaining).toBe(3);
    });
    
    test('should reject when OTP not found', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'nonexistent@example.com', otp: '123456' });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('OTP_NOT_FOUND');
      expect(response.body.message).toBe('No OTP found for this email. Please request a new one.');
    });
  });

  // Test expired OTP handling (Requirement 3.2, 3.3)
  describe('Expired OTP Handling', () => {
    
    test('should reject expired OTP', async () => {
      // Create expired OTP (expired 1 minute ago)
      const expiredTime = new Date(Date.now() - 60000);
      await OTP.create({
        email: 'test@example.com',
        otp: '123456',
        expiresAt: expiredTime,
        verified: false,
        attempts: 0
      });
      
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('OTP_EXPIRED');
      expect(response.body.message).toBe('OTP has expired. Please request a new code.');
      expect(response.body.expired).toBe(true);
    });
    
    test('should accept OTP just before expiration', async () => {
      // Create OTP expiring in 10 seconds
      const expiresAt = new Date(Date.now() + 10000);
      await OTP.create({
        email: 'test@example.com',
        otp: '123456',
        expiresAt: expiresAt,
        verified: false,
        attempts: 0
      });
      
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.verified).toBe(true);
    });
  });

  // Test rate limit exceeded scenarios (Requirement 5.3)
  describe('Rate Limit Exceeded Scenarios', () => {
    
    test('should block after 5 OTP requests within 1 hour', async () => {
      sendOTPEmail.mockResolvedValue({ success: true });
      
      const email = 'ratelimit@example.com';
      
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/send-otp')
          .send({ email });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
      
      // 6th request should be blocked
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many attempts');
    });
    
    test('should provide blocked until timestamp', async () => {
      sendOTPEmail.mockResolvedValue({ success: true });
      
      const email = 'blocked@example.com';
      
      // Make 5 requests to trigger block
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/send-otp')
          .send({ email });
      }
      
      // 6th request
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(response.status).toBe(429);
      expect(response.body.blockedUntil).toBeDefined();
      expect(new Date(response.body.blockedUntil)).toBeInstanceOf(Date);
    });
    
    test('should maintain separate rate limits for different emails', async () => {
      sendOTPEmail.mockResolvedValue({ success: true });
      
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';
      
      // Make 5 requests for email1
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/send-otp')
          .send({ email: email1 });
      }
      
      // email1 should be blocked
      const response1 = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email1 });
      
      expect(response1.status).toBe(429);
      
      // email2 should still work
      const response2 = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email2 });
      
      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
    });
  });

  // Test network error handling
  describe('Network Error Handling', () => {
    
    test('should handle missing email and OTP fields in verify endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('MISSING_FIELDS');
      expect(response.body.message).toBe('Email and OTP are required');
    });
    
    test('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send('invalid json')
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
    });
    
    test('should normalize email addresses', async () => {
      sendOTPEmail.mockResolvedValue({ success: true });
      
      // Send OTP with uppercase email
      const response1 = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'Test@Example.COM' });
      
      expect(response1.status).toBe(200);
      
      // Verify OTP with lowercase email should work
      const otpRecord = await OTP.findOne({ email: 'test@example.com' });
      expect(otpRecord).not.toBeNull();
      
      const response2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: otpRecord.otp });
      
      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);
    });
  });
});
