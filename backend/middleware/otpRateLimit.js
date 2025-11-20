const { OTPAttempt } = require('../models/OTP');

/**
 * Check OTP rate limit for an email address
 * Blocks after 5 requests within 1 hour
 * Automatically unblocks after timeout period
 */
const checkOTPRateLimit = async (email) => {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('[RATE-LIMIT] Checking rate limit for:', normalizedEmail);
    
    // Find existing attempt record
    let attempt = await OTPAttempt.findOne({ email: normalizedEmail });
    
    // If no record exists, create first attempt
    if (!attempt) {
      attempt = await OTPAttempt.create({ 
        email: normalizedEmail, 
        requestCount: 1,
        firstRequestAt: new Date()
      });
      console.log('[RATE-LIMIT] First request for:', normalizedEmail);
      return { 
        allowed: true,
        remainingAttempts: 4
      };
    }
    
    // Check if currently blocked
    if (attempt.blockedUntil && attempt.blockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((attempt.blockedUntil - new Date()) / 60000);
      console.warn('[RATE-LIMIT] Request blocked for:', normalizedEmail, {
        blockedUntil: attempt.blockedUntil,
        minutesRemaining
      });
      return { 
        allowed: false, 
        message: `Too many attempts. Please try again in ${minutesRemaining} minute(s).`,
        blockedUntil: attempt.blockedUntil,
        errorCode: 'RATE_LIMIT_BLOCKED'
      };
    }
    
    // Check if within 1 hour window
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (attempt.firstRequestAt > oneHourAgo) {
      // Still within the 1-hour window
      if (attempt.requestCount >= 5) {
        // Block for 1 hour from now
        attempt.blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
        await attempt.save();
        
        console.warn('[RATE-LIMIT] Rate limit exceeded, blocking:', normalizedEmail, {
          requestCount: attempt.requestCount,
          blockedUntil: attempt.blockedUntil
        });
        
        return { 
          allowed: false, 
          message: 'Too many attempts. Please try again in 1 hour.',
          blockedUntil: attempt.blockedUntil,
          errorCode: 'RATE_LIMIT_EXCEEDED'
        };
      }
      
      // Increment counter
      attempt.requestCount += 1;
      await attempt.save();
      
      console.log('[RATE-LIMIT] Request allowed:', normalizedEmail, {
        requestCount: attempt.requestCount,
        remainingAttempts: 5 - attempt.requestCount
      });
      
      return { 
        allowed: true,
        remainingAttempts: 5 - attempt.requestCount
      };
    } else {
      // Reset counter (new 1-hour window)
      attempt.requestCount = 1;
      attempt.firstRequestAt = new Date();
      attempt.blockedUntil = null;
      await attempt.save();
      
      console.log('[RATE-LIMIT] Rate limit window reset for:', normalizedEmail);
      
      return { 
        allowed: true,
        remainingAttempts: 4
      };
    }
  } catch (error) {
    console.error('[RATE-LIMIT] Error checking rate limit:', {
      email,
      error: error.message,
      stack: error.stack
    });
    
    // On error, allow the request but log the issue
    return { 
      allowed: true,
      error: true,
      message: 'Rate limit check failed, allowing request'
    };
  }
};

/**

/**
 * Express middleware for rate limiting OTP requests
 */
const otpRateLimitMiddleware = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const rateLimitResult = await checkOTPRateLimit(email);
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        message: rateLimitResult.message,
        blockedUntil: rateLimitResult.blockedUntil
      });
    }
    
    // Attach rate limit info to request for logging
    req.rateLimitInfo = {
      remainingAttempts: rateLimitResult.remainingAttempts
    };
    
    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // Allow request to proceed on middleware error
    next();
  }
};

module.exports = {
  checkOTPRateLimit,
  otpRateLimitMiddleware
};
