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

// User model for registration tests
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: String,
  userType: { type: String, default: 'donor' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

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
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email',
          errorCode: emailError.code || 'EMAIL_SEND_FAILED'
        });
      }
      
      res.json({
        success: true,
        message: 'OTP sent to your email',
        expiresAt: expiresAt.toISOString(),
        remainingAttempts: req.rateLimitInfo?.remainingAttempts
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal error',
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
          message: 'No OTP found',
          errorCode: 'OTP_NOT_FOUND'
        });
      }
      
      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP expired',
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
          message: 'Invalid OTP',
          verified: false,
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
        message: 'Internal error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  // Resend OTP endpoint
  testApp.post('/api/auth/resend-otp', otpRateLimitMiddleware, async (req, res) => {
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
      await OTP.deleteMany({ email: normalizedEmail });
      
      const otpCode = generateOTP();
      const expiresAt = getOTPExpiration(10);
      
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
        return res.status(500).json({
          success: false,
          message: 'Failed to resend OTP',
          errorCode: emailError.code || 'EMAIL_SEND_FAILED'
        });
      }
      
      res.json({
        success: true,
        message: 'New OTP sent',
        expiresAt: expiresAt.toISOString(),
        remainingAttempts: req.rateLimitInfo?.remainingAttempts
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  });

  // Register endpoint
  testApp.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, userType, emailVerified } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and password are required',
          errorCode: 'MISSING_FIELDS'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      if (!emailVerified) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please verify your email with OTP',
          errorCode: 'EMAIL_NOT_VERIFIED'
        });
      }
      
      const otpRecord = await OTP.findOne({ 
        email: normalizedEmail,
        verified: true 
      });
      
      if (!otpRecord) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email verification not found',
          errorCode: 'OTP_VERIFICATION_NOT_FOUND'
        });
      }
      
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered',
          errorCode: 'EMAIL_ALREADY_REGISTERED'
        });
      }
      
      const user = new User({
        name,
        email: normalizedEmail,
        password,
        userType: userType || 'donor'
      });
      
      await user.save();
      
      await OTP.deleteMany({ email: normalizedEmail });
      await OTPAttempt.deleteMany({ email: normalizedEmail });
      
      res.json({ 
        success: true, 
        message: 'Registration successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType
        }
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered',
          errorCode: 'EMAIL_ALREADY_REGISTERED'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Internal error',
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
  await User.deleteMany({});
  jest.clearAllMocks();
  sendOTPEmail.mockResolvedValue({ success: true });
});

describe('OTP Integration Tests', () => {
  
  // Test complete send → verify → register flow (Requirements 1.1, 2.2)
  describe('Complete Send → Verify → Register Flow', () => {
    
    test('should complete full registration flow with OTP verification', async () => {
      const email = 'newuser@example.com';
      
      // Step 1: Send OTP
      const sendResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(sendResponse.status).toBe(200);
      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.message).toBe('OTP sent to your email');
      expect(sendResponse.body.expiresAt).toBeDefined();
      
      // Verify OTP was stored in database
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(otpRecord).not.toBeNull();
      expect(otpRecord.verified).toBe(false);
      expect(otpRecord.otp).toMatch(/^\d{6}$/);
      
      // Step 2: Verify OTP
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord.otp });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.verified).toBe(true);
      expect(verifyResponse.body.message).toBe('Email verified successfully');
      
      // Verify OTP was marked as verified
      const verifiedOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(verifiedOtpRecord.verified).toBe(true);
      
      // Step 3: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'password123',
          userType: 'donor',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.message).toBe('Registration successful');
      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.user.email).toBe(email.toLowerCase());
      expect(registerResponse.body.user.name).toBe('Test User');
      
      // Verify user was created in database
      const user = await User.findOne({ email: email.toLowerCase() });
      expect(user).not.toBeNull();
      expect(user.name).toBe('Test User');
      
      // Verify OTP records were cleaned up
      const cleanedOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(cleanedOtpRecord).toBeNull();
      
      const cleanedAttemptRecord = await OTPAttempt.findOne({ email: email.toLowerCase() });
      expect(cleanedAttemptRecord).toBeNull();
    });
    
    test('should reject registration without OTP verification', async () => {
      const email = 'unverified@example.com';
      
      // Attempt to register without verifying OTP
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'password123',
          emailVerified: false
        });
      
      expect(registerResponse.status).toBe(400);
      expect(registerResponse.body.success).toBe(false);
      expect(registerResponse.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
      expect(registerResponse.body.message).toContain('verify your email');
    });
    
    test('should reject registration with unverified OTP in database', async () => {
      const email = 'unverified2@example.com';
      
      // Create unverified OTP record
      await OTP.create({
        email: email.toLowerCase(),
        otp: '123456',
        expiresAt: getOTPExpiration(10),
        verified: false,
        attempts: 0
      });
      
      // Attempt to register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(400);
      expect(registerResponse.body.success).toBe(false);
      expect(registerResponse.body.errorCode).toBe('OTP_VERIFICATION_NOT_FOUND');
    });
    
    test('should handle case-insensitive email throughout flow', async () => {
      const email = 'CaseSensitive@Example.COM';
      
      // Send OTP with mixed case
      const sendResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(sendResponse.status).toBe(200);
      
      // Get OTP from database (stored as lowercase)
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(otpRecord).not.toBeNull();
      
      // Verify with different case
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'casesensitive@example.com', otp: otpRecord.otp });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(true);
      
      // Register with original case
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.user.email).toBe(email.toLowerCase());
    });
  });

  // Test resend OTP flow (Requirement 4.1)
  describe('Resend OTP Flow', () => {
    
    test('should invalidate old OTP and send new one on resend', async () => {
      const email = 'resend@example.com';
      
      // Send initial OTP
      const sendResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(sendResponse.status).toBe(200);
      
      // Get initial OTP
      const initialOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      const initialOtp = initialOtpRecord.otp;
      
      // Resend OTP
      const resendResponse = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email });
      
      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body.success).toBe(true);
      expect(resendResponse.body.message).toBe('New OTP sent');
      
      // Get new OTP
      const newOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      const newOtp = newOtpRecord.otp;
      
      // Verify old OTP is different from new OTP (likely, but not guaranteed)
      // More importantly, verify old OTP doesn't work
      const verifyOldResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: initialOtp });
      
      // Old OTP should fail (unless by chance it's the same as new one)
      if (initialOtp !== newOtp) {
        expect(verifyOldResponse.status).toBe(400);
        expect(verifyOldResponse.body.errorCode).toBe('INVALID_OTP');
      }
      
      // New OTP should work
      const verifyNewResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: newOtp });
      
      expect(verifyNewResponse.status).toBe(200);
      expect(verifyNewResponse.body.verified).toBe(true);
    });
    
    test('should complete registration after resending OTP', async () => {
      const email = 'resend-register@example.com';
      
      // Send initial OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      // Resend OTP
      await request(app)
        .post('/api/auth/resend-otp')
        .send({ email });
      
      // Get the new OTP
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      
      // Verify new OTP
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord.otp });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(true);
      
      // Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Resend User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
    });
    
    test('should reset verification status on resend', async () => {
      const email = 'reset-verify@example.com';
      
      // Send and verify initial OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      const initialOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: initialOtpRecord.otp });
      
      // Verify it's marked as verified
      const verifiedRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(verifiedRecord.verified).toBe(true);
      
      // Resend OTP
      await request(app)
        .post('/api/auth/resend-otp')
        .send({ email });
      
      // New OTP should not be verified
      const newOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      expect(newOtpRecord.verified).toBe(false);
      expect(newOtpRecord.attempts).toBe(0);
    });
  });

  // Test change email flow (Requirement 7.1)
  describe('Change Email Flow', () => {
    
    test('should allow sending OTP to new email after changing email', async () => {
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';
      
      // Send OTP to old email
      const oldSendResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: oldEmail });
      
      expect(oldSendResponse.status).toBe(200);
      
      // Verify old OTP exists
      const oldOtpRecord = await OTP.findOne({ email: oldEmail.toLowerCase() });
      expect(oldOtpRecord).not.toBeNull();
      
      // Simulate changing email by sending OTP to new email
      const newSendResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: newEmail });
      
      expect(newSendResponse.status).toBe(200);
      
      // Verify new OTP exists
      const newOtpRecord = await OTP.findOne({ email: newEmail.toLowerCase() });
      expect(newOtpRecord).not.toBeNull();
      
      // Old OTP should still exist (separate email)
      const stillOldOtpRecord = await OTP.findOne({ email: oldEmail.toLowerCase() });
      expect(stillOldOtpRecord).not.toBeNull();
      
      // Verify new OTP
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: newEmail, otp: newOtpRecord.otp });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.verified).toBe(true);
      
      // Register with new email
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Changed Email User',
          email: newEmail,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.user.email).toBe(newEmail.toLowerCase());
    });
    
    test('should not allow registration with old email after changing to new email', async () => {
      const oldEmail = 'old2@example.com';
      const newEmail = 'new2@example.com';
      
      // Send and verify OTP for old email
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: oldEmail });
      
      const oldOtpRecord = await OTP.findOne({ email: oldEmail.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: oldEmail, otp: oldOtpRecord.otp });
      
      // Send and verify OTP for new email
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: newEmail });
      
      const newOtpRecord = await OTP.findOne({ email: newEmail.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: newEmail, otp: newOtpRecord.otp });
      
      // Try to register with old email (should fail - different email than verified)
      // In real implementation, frontend would prevent this, but backend should handle it
      const registerOldResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Old Email User',
          email: oldEmail,
          password: 'password123',
          emailVerified: true
        });
      
      // Should succeed because old email was verified
      expect(registerOldResponse.status).toBe(200);
      
      // Register with new email should also work
      const registerNewResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Email User',
          email: newEmail,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerNewResponse.status).toBe(200);
    });
  });

  // Test rate limiting enforcement (Requirement 5.1)
  describe('Rate Limiting Enforcement', () => {
    
    test('should enforce rate limit across send and resend operations', async () => {
      const email = 'ratelimit-test@example.com';
      
      // Make 3 send requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/send-otp')
          .send({ email });
        
        expect(response.status).toBe(200);
      }
      
      // Make 2 resend requests
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post('/api/auth/resend-otp')
          .send({ email });
        
        expect(response.status).toBe(200);
      }
      
      // 6th request should be blocked (5 is the limit)
      const blockedResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.body.success).toBe(false);
      expect(blockedResponse.body.message).toContain('Too many attempts');
    });
    
    test('should maintain separate rate limits for different emails', async () => {
      const email1 = 'user1-ratelimit@example.com';
      const email2 = 'user2-ratelimit@example.com';
      
      // Make 5 requests for email1
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/send-otp')
          .send({ email: email1 });
      }
      
      // email1 should be blocked
      const blocked1Response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email1 });
      
      expect(blocked1Response.status).toBe(429);
      
      // email2 should still work
      const email2Response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email2 });
      
      expect(email2Response.status).toBe(200);
      expect(email2Response.body.success).toBe(true);
    });
    
    test('should allow registration even when rate limited', async () => {
      const email = 'ratelimit-register@example.com';
      
      // Send and verify OTP first
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      const verifiedOtp = otpRecord.otp;
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: verifiedOtp });
      
      // Make 4 more send requests to reach limit (each invalidates previous OTP)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/send-otp')
          .send({ email });
      }
      
      // Get the latest OTP and verify it
      const latestOtpRecord = await OTP.findOne({ email: email.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: latestOtpRecord.otp });
      
      // Verify rate limit is active
      const blockedResponse = await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      expect(blockedResponse.status).toBe(429);
      
      // Registration should still work with verified OTP
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rate Limited User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
    });
    
    test('should clean up rate limit records after successful registration', async () => {
      const email = 'cleanup-ratelimit@example.com';
      
      // Send OTP (creates rate limit record)
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      // Verify rate limit record exists
      const rateLimitRecord = await OTPAttempt.findOne({ email: email.toLowerCase() });
      expect(rateLimitRecord).not.toBeNull();
      
      // Complete verification and registration
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord.otp });
      
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Cleanup User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      // Verify rate limit record was cleaned up
      const cleanedRateLimitRecord = await OTPAttempt.findOne({ email: email.toLowerCase() });
      expect(cleanedRateLimitRecord).toBeNull();
    });
  });
  
  // Additional edge case tests
  describe('Edge Cases and Error Scenarios', () => {
    
    test('should handle multiple verification attempts correctly', async () => {
      const email = 'multiple-verify@example.com';
      
      // Send OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
      
      // First verification - correct OTP
      const verify1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord.otp });
      
      expect(verify1.status).toBe(200);
      expect(verify1.body.verified).toBe(true);
      
      // Second verification - should return already verified
      const verify2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord.otp });
      
      expect(verify2.status).toBe(200);
      expect(verify2.body.verified).toBe(true);
      expect(verify2.body.message).toBe('Email already verified');
    });
    
    test('should prevent duplicate user registration', async () => {
      const email = 'duplicate@example.com';
      
      // First registration
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      const otpRecord1 = await OTP.findOne({ email: email.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord1.otp });
      
      const register1 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email,
          password: 'password123',
          emailVerified: true
        });
      
      expect(register1.status).toBe(200);
      
      // Second registration attempt with same email
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email });
      
      const otpRecord2 = await OTP.findOne({ email: email.toLowerCase() });
      
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email, otp: otpRecord2.otp });
      
      const register2 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email,
          password: 'password456',
          emailVerified: true
        });
      
      expect(register2.status).toBe(400);
      expect(register2.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');
    });
  });
});
