// Script to view stored OTPs
require('dotenv').config();
const mongoose = require('mongoose');
const { OTP } = require('./models/OTP');

async function viewOTPs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donorhub');
    console.log('Connected to MongoDB\n');
    
    // Get email from command line argument
    const email = process.argv[2];
    
    let otps;
    if (email) {
      // Get OTPs for specific email
      const normalizedEmail = email.toLowerCase().trim();
      otps = await OTP.find({ email: normalizedEmail }).sort({ createdAt: -1 });
      console.log(`OTPs for: ${normalizedEmail}\n`);
    } else {
      // Get all OTPs
      otps = await OTP.find({}).sort({ createdAt: -1 });
      console.log('All OTPs:\n');
    }
    
    if (otps.length === 0) {
      console.log('No OTPs found.');
    } else {
      otps.forEach((otp, index) => {
        const isExpired = new Date() > otp.expiresAt;
        console.log(`${index + 1}. Email: ${otp.email}`);
        console.log(`   OTP Code: ${otp.otp}`);
        console.log(`   Verified: ${otp.verified ? 'Yes' : 'No'}`);
        console.log(`   Attempts: ${otp.attempts}`);
        console.log(`   Expires: ${otp.expiresAt.toLocaleString()}`);
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✓ VALID'}`);
        console.log(`   Created: ${otp.createdAt.toLocaleString()}`);
        console.log('');
      });
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

viewOTPs();
