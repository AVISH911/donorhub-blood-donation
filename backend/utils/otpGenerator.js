/**
 * Generate a 6-digit numeric OTP code
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
  // Generate random number between 100000 and 999999
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

/**
 * Calculate OTP expiration time
 * @param {number} minutes - Minutes until expiration (default: 10)
 * @returns {Date} Expiration timestamp
 */
const getOTPExpiration = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOTP,
  getOTPExpiration
};
