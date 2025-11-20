const mongoose = require('mongoose');

// OTP Schema for storing verification codes
const OTPSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true,
    index: true
  },
  otp: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 600 // Auto-delete after 10 minutes (600 seconds)
  },
  expiresAt: {
    type: Date,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
});

// OTP Attempt Tracking Schema for rate limiting
const OTPAttemptSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  requestCount: {
    type: Number,
    default: 0
  },
  firstRequestAt: {
    type: Date,
    default: Date.now
  },
  blockedUntil: {
    type: Date,
    default: null
  }
});

const OTP = mongoose.model('OTP', OTPSchema);
const OTPAttempt = mongoose.model('OTPAttempt', OTPAttemptSchema);

module.exports = { OTP, OTPAttempt };
