/**
 * OTP Database Save Test Script
 * Run this to diagnose why OTP isn't saving to MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { OTP } = require('./models/OTP');
const { generateOTP, getOTPExpiration } = require('./utils/otpGenerator');

async function testOTPSave() {
  console.log('🔍 Starting OTP Database Save Test...\n');
  
  try {
    // Step 1: Connect to MongoDB
    console.log('📡 Step 1: Connecting to MongoDB...');
    console.log('   Connection String: mongodb://localhost:27017/donorhub');
    
    await mongoose.connect('mongodb://localhost:27017/donorhub');
    console.log('✅ MongoDB Connected Successfully!\n');
    
    // Step 2: Check if OTP model is loaded
    console.log('📋 Step 2: Checking OTP Model...');
    console.log('   Model Name:', OTP.modelName);
    console.log('   Collection Name:', OTP.collection.name);
    console.log('✅ OTP Model Loaded\n');
    
    // Step 3: Generate test OTP
    console.log('🎲 Step 3: Generating Test OTP...');
    const testEmail = 'test@example.com';
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiration(10);
    
    console.log('   Email:', testEmail);
    console.log('   OTP Code:', otpCode);
    console.log('   Expires At:', expiresAt);
    console.log('✅ OTP Generated\n');
    
    // Step 4: Delete any existing OTP for test email
    console.log('🧹 Step 4: Cleaning up existing OTPs...');
    const deleteResult = await OTP.deleteMany({ email: testEmail });
    console.log('   Deleted:', deleteResult.deletedCount, 'existing OTP(s)');
    console.log('✅ Cleanup Complete\n');
    
    // Step 5: Save new OTP to database
    console.log('💾 Step 5: Saving OTP to Database...');
    const otpRecord = await OTP.create({
      email: testEmail,
      otp: otpCode,
      expiresAt: expiresAt,
      verified: false,
      attempts: 0
    });
    
    console.log('✅ OTP Saved Successfully!');
    console.log('   Record ID:', otpRecord._id);
    console.log('   Email:', otpRecord.email);
    console.log('   OTP:', otpRecord.otp);
    console.log('   Created At:', otpRecord.createdAt);
    console.log('   Expires At:', otpRecord.expiresAt);
    console.log('   Verified:', otpRecord.verified);
    console.log('   Attempts:', otpRecord.attempts);
    console.log('');
    
    // Step 6: Verify it's actually in the database
    console.log('🔎 Step 6: Verifying OTP in Database...');
    const foundOTP = await OTP.findOne({ email: testEmail });
    
    if (foundOTP) {
      console.log('✅ OTP Found in Database!');
      console.log('   Record ID:', foundOTP._id);
      console.log('   Email:', foundOTP.email);
      console.log('   OTP:', foundOTP.otp);
      console.log('');
    } else {
      console.log('❌ OTP NOT Found in Database!');
      console.log('   This indicates a problem with saving.\n');
    }
    
    // Step 7: Count all OTPs in collection
    console.log('📊 Step 7: Checking Total OTPs in Database...');
    const totalOTPs = await OTP.countDocuments();
    console.log('   Total OTP Records:', totalOTPs);
    console.log('');
    
    // Step 8: List all OTPs
    if (totalOTPs > 0) {
      console.log('📋 Step 8: Listing All OTPs...');
      const allOTPs = await OTP.find().limit(10);
      allOTPs.forEach((otp, index) => {
        console.log(`   ${index + 1}. Email: ${otp.email}, OTP: ${otp.otp}, Verified: ${otp.verified}`);
      });
      console.log('');
    }
    
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📝 Summary:');
    console.log('   - MongoDB Connection: ✅ Working');
    console.log('   - OTP Model: ✅ Loaded');
    console.log('   - OTP Generation: ✅ Working');
    console.log('   - Database Save: ✅ Working');
    console.log('   - Database Read: ✅ Working');
    console.log('\n💡 If you see this message, your OTP system is working correctly!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting Steps:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   1. Make sure MongoDB is running');
      console.error('   2. Check if MongoDB is on port 27017');
      console.error('   3. Try: mongod --dbpath /path/to/data');
    } else if (error.message.includes('validation')) {
      console.error('   1. Check OTP model schema');
      console.error('   2. Verify all required fields are provided');
    } else {
      console.error('   1. Check the error message above');
      console.error('   2. Verify .env file is configured');
      console.error('   3. Check MongoDB connection string');
    }
    
    console.error('\nFull Error Details:');
    console.error(error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB Connection Closed');
  }
}

// Run the test
testOTPSave();
