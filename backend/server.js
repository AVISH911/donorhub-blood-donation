require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from blood_dona directory
app.use(express.static(path.join(__dirname, '../blood_dona')));

// Import OTP models and utilities
const { OTP, OTPAttempt } = require('./models/OTP');
const { generateOTP, getOTPExpiration } = require('./utils/otpGenerator');
const { sendOTPEmail } = require('./services/emailService');
const { otpRateLimitMiddleware } = require('./middleware/otpRateLimit');

// Connect to MongoDB (uses MONGODB_URI from .env or defaults to local)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/donorhub';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('💡 Check your MONGODB_URI in .env file');
  });

// Simple Schemas
const DonorSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  bloodGroup: String,
  city: String,
  state: String,
  weight: Number,
  gender: String,
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: String,
  userType: { type: String, default: 'donor' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const BloodRequestSchema = new mongoose.Schema({
  patientName: String,
  bloodType: String,
  unitsNeeded: Number,
  hospital: String,
  city: String,
  contactPhone: String,
  urgency: String,
  createdAt: { type: Date, default: Date.now }
});

const BloodBankSchema = new mongoose.Schema({
  name: String,
  address: String,
  city: String,
  phone: String,
  email: String,
  bloodStock: Object
});

const CampSchema = new mongoose.Schema({
  title: String,
  organizer: String,
  date: Date,
  location: String,
  city: String,
  targetDonors: Number,
  donorsRegistered: { type: Number, default: 0 }
});

const DoctorSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  specialization: String,
  hospital: String,
  city: String,
  state: String,
  licenseNumber: String,
  yearsOfExperience: Number,
  createdAt: { type: Date, default: Date.now }
});

// Models
const Donor = mongoose.model('Donor', DonorSchema);
const BloodRequest = mongoose.model('BloodRequest', BloodRequestSchema);
const BloodBank = mongoose.model('BloodBank', BloodBankSchema);
const Camp = mongoose.model('Camp', CampSchema);
const Doctor = mongoose.model('Doctor', DoctorSchema);

// ============= HEALTH CHECK ROUTE =============

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DonorHub API is running' 
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now() 
  });
});

// ============= DONOR ROUTES =============

// Register new donor
app.post('/api/donors', async (req, res) => {
  try {
    const donor = new Donor(req.body);
    await donor.save();
    res.json({ success: true, message: 'Donor registered successfully!', donor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all donors (with optional filters)
app.get('/api/donors', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    let filter = {};
    
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = new RegExp(city, 'i');
    
    const donors = await Donor.find(filter).sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single donor
app.get('/api/donors/:id', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============= DOCTOR ROUTES =============

// Register new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.json({ success: true, message: 'Doctor registered successfully!', doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all doctors (with optional filters)
app.get('/api/doctors', async (req, res) => {
  try {
    const { specialization, city } = req.query;
    let filter = {};
    
    if (specialization) filter.specialization = specialization;
    if (city) filter.city = new RegExp(city, 'i');
    
    const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single doctor
app.get('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============= BLOOD REQUEST ROUTES =============

// Create blood request
app.post('/api/requests', async (req, res) => {
  try {
    const request = new BloodRequest(req.body);
    await request.save();
    res.json({ success: true, message: 'Blood request posted successfully!', request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all blood requests
app.get('/api/requests', async (req, res) => {
  try {
    const { bloodType, city, urgency } = req.query;
    let filter = {};
    
    if (bloodType) filter.bloodType = bloodType;
    if (city) filter.city = new RegExp(city, 'i');
    if (urgency) filter.urgency = urgency;
    
    const requests = await BloodRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============= BLOOD BANK ROUTES =============

// Add blood bank
app.post('/api/bloodbanks', async (req, res) => {
  try {
    const bank = new BloodBank(req.body);
    await bank.save();
    res.json({ success: true, message: 'Blood bank added!', bank });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all blood banks
app.get('/api/bloodbanks', async (req, res) => {
  try {
    const { city } = req.query;
    let filter = {};
    
    if (city) filter.city = new RegExp(city, 'i');
    
    const banks = await BloodBank.find(filter);
    res.json(banks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============= CAMP ROUTES =============

// Create camp
app.post('/api/camps', async (req, res) => {
  try {
    const camp = new Camp(req.body);
    await camp.save();
    res.json({ success: true, message: 'Camp created successfully!', camp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all camps
app.get('/api/camps', async (req, res) => {
  try {
    const { city } = req.query;
    let filter = {};
    
    if (city) filter.city = new RegExp(city, 'i');
    
    const camps = await Camp.find(filter).sort({ date: 1 });
    res.json(camps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register for camp
app.post('/api/camps/:id/register', async (req, res) => {
  try {
    const camp = await Camp.findById(req.params.id);
    camp.donorsRegistered += 1;
    await camp.save();
    res.json({ success: true, message: 'Registered for camp!', camp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= AUTHENTICATION ROUTES =============

// ============= OTP ROUTES =============

// Send OTP endpoint
app.post('/api/auth/send-otp', otpRateLimitMiddleware, async (req, res) => {
  const startTime = Date.now();
  let normalizedEmail = null;
  
  try {
    const { email } = req.body;
    
    // Validate email format
    if (!email) {
      console.warn('[SEND-OTP] Missing email in request');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        errorCode: 'EMAIL_REQUIRED'
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('[SEND-OTP] Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errorCode: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Normalize email
    normalizedEmail = email.toLowerCase().trim();
    console.log('[SEND-OTP] Processing request for:', normalizedEmail);
    
    // Generate 6-digit OTP code
    const otpCode = generateOTP();
    
    // Calculate expiration time (10 minutes)
    const expiresAt = getOTPExpiration(10);
    
    // Invalidate any existing OTP for this email
    const deletedCount = await OTP.deleteMany({ email: normalizedEmail });
    if (deletedCount.deletedCount > 0) {
      console.log(`[SEND-OTP] Invalidated ${deletedCount.deletedCount} existing OTP(s) for:`, normalizedEmail);
    }
    
    // Store OTP in database
    const otpRecord = await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt: expiresAt,
      verified: false,
      attempts: 0
    });
    
    console.log('[SEND-OTP] OTP record created:', { email: normalizedEmail, expiresAt });
    
    // Send OTP via email service
    try {
      await sendOTPEmail(normalizedEmail, otpCode);
      console.log('[SEND-OTP] Email sent successfully to:', normalizedEmail);
    } catch (emailError) {
      // If email fails, delete the OTP record
      await OTP.deleteOne({ _id: otpRecord._id });
      
      console.error('[SEND-OTP] Email sending failed:', {
        email: normalizedEmail,
        error: emailError.message,
        code: emailError.code
      });
      
      // Return specific error message based on error code
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
    
    const duration = Date.now() - startTime;
    console.log(`[SEND-OTP] Request completed successfully in ${duration}ms for:`, normalizedEmail);
    
    // Return success response with expiration timestamp
    res.json({
      success: true,
      message: 'OTP sent to your email',
      expiresAt: expiresAt.toISOString(),
      remainingAttempts: req.rateLimitInfo?.remainingAttempts
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[SEND-OTP] Unexpected error:', {
      email: normalizedEmail,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while sending OTP. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Verify OTP endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
  const startTime = Date.now();
  let normalizedEmail = null;
  
  try {
    const { email, otp } = req.body;
    
    // Validate input
    if (!email || !otp) {
      console.warn('[VERIFY-OTP] Missing required fields:', { hasEmail: !!email, hasOtp: !!otp });
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
        errorCode: 'MISSING_FIELDS'
      });
    }
    
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      console.warn('[VERIFY-OTP] Invalid OTP format:', { email, otpLength: otp.length });
      return res.status(400).json({
        success: false,
        message: 'OTP must be a 6-digit number',
        errorCode: 'INVALID_OTP_FORMAT'
      });
    }
    
    // Normalize email
    normalizedEmail = email.toLowerCase().trim();
    console.log('[VERIFY-OTP] Processing verification for:', normalizedEmail);
    
    // Find OTP record by email address
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail 
    }).sort({ createdAt: -1 }); // Get the most recent OTP
    
    if (!otpRecord) {
      console.warn('[VERIFY-OTP] No OTP record found for:', normalizedEmail);
      return res.status(404).json({
        success: false,
        message: 'No OTP found for this email. Please request a new one.',
        errorCode: 'OTP_NOT_FOUND'
      });
    }
    
    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      console.warn('[VERIFY-OTP] OTP expired for:', normalizedEmail, {
        expiresAt: otpRecord.expiresAt,
        now: new Date()
      });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.',
        expired: true,
        errorCode: 'OTP_EXPIRED'
      });
    }
    
    // Check if already verified
    if (otpRecord.verified) {
      console.log('[VERIFY-OTP] Email already verified:', normalizedEmail);
      return res.json({
        success: true,
        message: 'Email already verified',
        verified: true
      });
    }
    
    // Increment attempt counter
    otpRecord.attempts += 1;
    await otpRecord.save();
    
    console.log('[VERIFY-OTP] Attempt count:', { email: normalizedEmail, attempts: otpRecord.attempts });
    
    // Compare provided OTP with stored value
    if (otpRecord.otp !== otp) {
      console.warn('[VERIFY-OTP] Invalid OTP code for:', normalizedEmail, {
        attempts: otpRecord.attempts
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please try again.',
        verified: false,
        attemptsRemaining: Math.max(0, 5 - otpRecord.attempts),
        errorCode: 'INVALID_OTP'
      });
    }
    
    // Mark OTP as verified if correct
    otpRecord.verified = true;
    await otpRecord.save();
    
    const duration = Date.now() - startTime;
    console.log(`[VERIFY-OTP] Verification successful in ${duration}ms for:`, normalizedEmail);
    
    // Return verification result
    res.json({
      success: true,
      message: 'Email verified successfully',
      verified: true
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[VERIFY-OTP] Unexpected error:', {
      email: normalizedEmail,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while verifying OTP. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Resend OTP endpoint
app.post('/api/auth/resend-otp', otpRateLimitMiddleware, async (req, res) => {
  const startTime = Date.now();
  let normalizedEmail = null;
  
  try {
    const { email } = req.body;
    
    // Validate email format
    if (!email) {
      console.warn('[RESEND-OTP] Missing email in request');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        errorCode: 'EMAIL_REQUIRED'
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('[RESEND-OTP] Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errorCode: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Normalize email
    normalizedEmail = email.toLowerCase().trim();
    console.log('[RESEND-OTP] Processing resend request for:', normalizedEmail);
    
    // Invalidate any existing OTP for the email
    const deletedCount = await OTP.deleteMany({ email: normalizedEmail });
    if (deletedCount.deletedCount > 0) {
      console.log(`[RESEND-OTP] Invalidated ${deletedCount.deletedCount} existing OTP(s) for:`, normalizedEmail);
    }
    
    // Generate new OTP code
    const otpCode = generateOTP();
    
    // Calculate expiration time (10 minutes)
    const expiresAt = getOTPExpiration(10);
    
    // Store new OTP in database
    const otpRecord = await OTP.create({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt: expiresAt,
      verified: false,
      attempts: 0
    });
    
    console.log('[RESEND-OTP] New OTP record created:', { email: normalizedEmail, expiresAt });
    
    // Send new email
    try {
      await sendOTPEmail(normalizedEmail, otpCode);
      console.log('[RESEND-OTP] Email sent successfully to:', normalizedEmail);
    } catch (emailError) {
      // If email fails, delete the OTP record
      await OTP.deleteOne({ _id: otpRecord._id });
      
      console.error('[RESEND-OTP] Email sending failed:', {
        email: normalizedEmail,
        error: emailError.message,
        code: emailError.code
      });
      
      // Return specific error message based on error code
      let errorMessage = 'Failed to resend OTP email. Please try again.';
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
    
    const duration = Date.now() - startTime;
    console.log(`[RESEND-OTP] Request completed successfully in ${duration}ms for:`, normalizedEmail);
    
    // Return success with new expiration
    res.json({
      success: true,
      message: 'New OTP sent to your email',
      expiresAt: expiresAt.toISOString(),
      remainingAttempts: req.rateLimitInfo?.remainingAttempts
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[RESEND-OTP] Unexpected error:', {
      email: normalizedEmail,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while resending OTP. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const startTime = Date.now();
  let normalizedEmail = null;
  
  try {
    const { name, email, password, userType, emailVerified } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      console.warn('[REGISTER] Missing required fields:', { 
        hasName: !!name, 
        hasEmail: !!email, 
        hasPassword: !!password 
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required',
        errorCode: 'MISSING_FIELDS'
      });
    }
    
    // Normalize email
    normalizedEmail = email.toLowerCase().trim();
    
    // Check if email is verified via OTP (Requirement 2.5)
    if (!emailVerified) {
      console.warn('[REGISTER] Email not verified:', normalizedEmail);
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email with OTP before registering',
        errorCode: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // Verify OTP verification status in database
    const otpRecord = await OTP.findOne({ 
      email: normalizedEmail,
      verified: true 
    });
    
    if (!otpRecord) {
      console.warn('[REGISTER] OTP verification not found in database:', normalizedEmail);
      return res.status(400).json({ 
        success: false, 
        message: 'Email verification not found. Please verify your email with OTP',
        errorCode: 'OTP_VERIFICATION_NOT_FOUND'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.warn('[REGISTER] User already exists:', normalizedEmail);
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered. Please login instead.',
        errorCode: 'EMAIL_ALREADY_REGISTERED'
      });
    }
    
    console.log('[REGISTER] Creating new user:', normalizedEmail);
    
    // Create new user
    const user = new User({
      name,
      email: normalizedEmail,
      password, // In production, you should hash this!
      userType: userType || 'donor'
    });
    
    await user.save();
    
    console.log('[REGISTER] User created successfully:', normalizedEmail);
    
    // Clean up OTP records after successful registration
    await OTP.deleteMany({ email: normalizedEmail });
    await OTPAttempt.deleteMany({ email: normalizedEmail });
    
    console.log('[REGISTER] OTP records cleaned up for:', normalizedEmail);
    
    const duration = Date.now() - startTime;
    console.log(`[REGISTER] Registration completed successfully in ${duration}ms for:`, normalizedEmail);
    
    res.json({ 
      success: true, 
      message: 'Registration successful! Your email has been verified.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[REGISTER] Unexpected error:', {
      email: normalizedEmail,
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`
    });
    
    // Handle specific database errors
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered. Please login instead.',
        errorCode: 'EMAIL_ALREADY_REGISTERED'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred during registration. Please try again.',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Login successful
    res.json({ 
      success: true, 
      message: 'Login successful!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// Get current user info
app.get('/api/auth/me', async (req, res) => {
  try {
    // Get email from query parameter
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email required' 
      });
    }
    
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// Logout (client-side will clear localStorage)
app.post('/api/auth/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
