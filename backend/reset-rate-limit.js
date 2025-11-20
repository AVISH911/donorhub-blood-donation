// Script to reset OTP rate limits for testing
require('dotenv').config();
const mongoose = require('mongoose');
const { OTPAttempt, OTP } = require('./models/OTP');

async function resetRateLimit() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donorhub');
    console.log('Connected to MongoDB');
    
    // Get email from command line argument
    const email = process.argv[2];
    
    if (email) {
      // Reset specific email
      const normalizedEmail = email.toLowerCase().trim();
      
      const deletedAttempts = await OTPAttempt.deleteMany({ email: normalizedEmail });
      const deletedOTPs = await OTP.deleteMany({ email: normalizedEmail });
      
      console.log(`✓ Reset rate limit for: ${normalizedEmail}`);
      console.log(`  - Deleted ${deletedAttempts.deletedCount} rate limit record(s)`);
      console.log(`  - Deleted ${deletedOTPs.deletedCount} OTP record(s)`);
    } else {
      // Reset all rate limits
      const deletedAttempts = await OTPAttempt.deleteMany({});
      const deletedOTPs = await OTP.deleteMany({});
      
      console.log('✓ Reset all rate limits');
      console.log(`  - Deleted ${deletedAttempts.deletedCount} rate limit record(s)`);
      console.log(`  - Deleted ${deletedOTPs.deletedCount} OTP record(s)`);
    }
    
    await mongoose.connection.close();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetRateLimit();
