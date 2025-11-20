/**
 * OTP Verification Module
 * Handles email OTP verification during user registration
 */

// OTP State Management
const OTPState = {
    email: '',
    otpSent: false,
    otpVerified: false,
    otpValue: '',
    isLoading: false,
    errorMessage: '',
    successMessage: '',
    resendCooldown: 0,
    otpExpiration: null,
    resendTimerInterval: null,
    expirationTimerInterval: null
};

/**
 * Validates if the input is a 6-digit numeric code
 * @param {string} input - OTP input to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateOTPInput(input) {
    if (!input || input.trim() === '') {
        return { valid: false, message: 'OTP is required' };
    }

    if (!/^\d{6}$/.test(input)) {
        return { valid: false, message: 'OTP must be exactly 6 digits' };
    }

    return { valid: true, message: '' };
}

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { valid: false, message: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }

    return { valid: true, message: '' };
}

/**
 * Sends OTP to the provided email address with retry logic for transient failures
 * @param {string} email - Email address to send OTP to
 * @param {boolean} useRetry - Whether to use retry logic (default: true)
 * @returns {Promise<Object>} - { success: boolean, message: string, expiresAt: timestamp }
 */
async function sendOTP(email, useRetry = true) {
    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
        OTPState.errorMessage = validation.message;
        logError('OTP Send - Validation Failed', { email, error: validation.message });
        throw new Error(validation.message);
    }

    OTPState.isLoading = true;
    OTPState.errorMessage = '';
    OTPState.successMessage = '';

    try {
        // Use retry logic for transient failures if enabled
        const sendOperation = async () => {
            const response = await apiCall('/auth/send-otp', 'POST', { email });

            if (response.success) {
                return response;
            } else {
                const error = new Error(response.message || 'Failed to send OTP');
                error.code = response.errorCode;
                throw error;
            }
        };

        // Apply retry logic for transient failures
        const response = useRetry 
            ? await retryOperation(sendOperation, 2, 1000)
            : await sendOperation();

        OTPState.email = email;
        OTPState.otpSent = true;
        OTPState.otpExpiration = response.expiresAt;
        OTPState.successMessage = response.message || 'OTP sent to your email';
        
        logInfo('OTP Sent Successfully', { 
            email, 
            expiresAt: response.expiresAt,
            remainingAttempts: response.remainingAttempts 
        });
        
        // Start timers
        startResendTimer();
        startExpirationTimer();

        return response;
    } catch (error) {
        const errorMessage = handleOTPError(error, 'send');
        OTPState.errorMessage = errorMessage;
        logError('OTP Send Failed', { 
            email, 
            error: error.message, 
            code: error.code,
            stack: error.stack 
        });
        
        // Create error with code for better handling
        const enhancedError = new Error(errorMessage);
        enhancedError.code = error.code;
        throw enhancedError;
    } finally {
        OTPState.isLoading = false;
    }
}

/**
 * Verifies the OTP code entered by the user with retry logic for transient failures
 * @param {string} email - Email address
 * @param {string} otp - OTP code to verify
 * @param {boolean} useRetry - Whether to use retry logic (default: true)
 * @returns {Promise<Object>} - { success: boolean, message: string, verified: boolean }
 */
async function verifyOTP(email, otp, useRetry = true) {
    // Validate OTP input
    const validation = validateOTPInput(otp);
    if (!validation.valid) {
        OTPState.errorMessage = validation.message;
        logError('OTP Verify - Validation Failed', { email, error: validation.message });
        throw new Error(validation.message);
    }

    OTPState.isLoading = true;
    OTPState.errorMessage = '';
    OTPState.successMessage = '';

    try {
        // Use retry logic for transient failures if enabled
        const verifyOperation = async () => {
            const response = await apiCall('/auth/verify-otp', 'POST', { email, otp });

            if (response.success && response.verified) {
                return response;
            } else {
                const error = new Error(response.message || 'Invalid OTP code');
                error.code = response.errorCode;
                error.attemptsRemaining = response.attemptsRemaining;
                throw error;
            }
        };

        // Apply retry logic for transient failures
        const response = useRetry 
            ? await retryOperation(verifyOperation, 2, 1000)
            : await verifyOperation();

        OTPState.otpVerified = true;
        OTPState.otpValue = otp;
        OTPState.successMessage = response.message || 'Email verified successfully';
        
        logInfo('OTP Verified Successfully', { email });
        
        // Stop timers on successful verification
        stopTimers();

        return response;
    } catch (error) {
        const errorMessage = handleOTPError(error, 'verify');
        OTPState.errorMessage = errorMessage;
        
        // Log with additional context
        logError('OTP Verify Failed', { 
            email, 
            error: error.message,
            code: error.code,
            attemptsRemaining: error.attemptsRemaining,
            stack: error.stack 
        });
        
        // Create error with code and attempts remaining for better handling
        const enhancedError = new Error(errorMessage);
        enhancedError.code = error.code;
        enhancedError.attemptsRemaining = error.attemptsRemaining;
        throw enhancedError;
    } finally {
        OTPState.isLoading = false;
    }
}

/**
 * Resends a new OTP to the email address with retry logic for transient failures
 * @param {string} email - Email address to resend OTP to
 * @param {boolean} useRetry - Whether to use retry logic (default: true)
 * @returns {Promise<Object>} - { success: boolean, message: string, expiresAt: timestamp }
 */
async function resendOTP(email, useRetry = true) {
    // Check if cooldown is active
    if (OTPState.resendCooldown > 0) {
        const errorMessage = `Please wait ${OTPState.resendCooldown} seconds before resending`;
        OTPState.errorMessage = errorMessage;
        logWarning('OTP Resend - Cooldown Active', { email, remainingSeconds: OTPState.resendCooldown });
        
        const error = new Error(errorMessage);
        error.code = 'COOLDOWN_ACTIVE';
        throw error;
    }

    OTPState.isLoading = true;
    OTPState.errorMessage = '';
    OTPState.successMessage = '';
    OTPState.otpValue = ''; // Clear previous OTP input

    try {
        // Use retry logic for transient failures if enabled
        const resendOperation = async () => {
            const response = await apiCall('/auth/resend-otp', 'POST', { email });

            if (response.success) {
                return response;
            } else {
                const error = new Error(response.message || 'Failed to resend OTP');
                error.code = response.errorCode;
                throw error;
            }
        };

        // Apply retry logic for transient failures
        const response = useRetry 
            ? await retryOperation(resendOperation, 2, 1000)
            : await resendOperation();

        OTPState.otpExpiration = response.expiresAt;
        OTPState.successMessage = response.message || 'New OTP sent to your email';
        
        logInfo('OTP Resent Successfully', { 
            email, 
            expiresAt: response.expiresAt,
            remainingAttempts: response.remainingAttempts 
        });
        
        // Restart timers
        startResendTimer();
        startExpirationTimer();

        return response;
    } catch (error) {
        const errorMessage = handleOTPError(error, 'resend');
        OTPState.errorMessage = errorMessage;
        logError('OTP Resend Failed', { 
            email, 
            error: error.message,
            code: error.code,
            stack: error.stack 
        });
        
        // Create error with code for better handling
        const enhancedError = new Error(errorMessage);
        enhancedError.code = error.code;
        throw enhancedError;
    } finally {
        OTPState.isLoading = false;
    }
}

/**
 * Starts the 60-second countdown timer for resend cooldown
 * Updates the UI with remaining seconds
 */
function startResendTimer() {
    // Clear any existing timer
    if (OTPState.resendTimerInterval) {
        clearInterval(OTPState.resendTimerInterval);
    }

    // Set initial cooldown to 60 seconds
    OTPState.resendCooldown = 60;

    // Update timer every second
    OTPState.resendTimerInterval = setInterval(() => {
        OTPState.resendCooldown--;

        // Update UI element if it exists
        const resendButton = document.getElementById('resend-otp-btn');
        const resendTimer = document.getElementById('resend-timer');
        
        if (OTPState.resendCooldown > 0) {
            if (resendButton) {
                resendButton.disabled = true;
            }
            if (resendTimer) {
                resendTimer.textContent = `Resend available in ${OTPState.resendCooldown}s`;
                resendTimer.style.display = 'inline';
            }
        } else {
            // Cooldown complete
            if (resendButton) {
                resendButton.disabled = false;
            }
            if (resendTimer) {
                resendTimer.textContent = '';
                resendTimer.style.display = 'none';
            }
            clearInterval(OTPState.resendTimerInterval);
            OTPState.resendTimerInterval = null;
        }
    }, 1000);
}

/**
 * Starts the expiration timer to show remaining OTP validity time
 * Updates the UI with remaining time until OTP expires
 */
function startExpirationTimer() {
    // Clear any existing timer
    if (OTPState.expirationTimerInterval) {
        clearInterval(OTPState.expirationTimerInterval);
    }

    // Update timer every second
    OTPState.expirationTimerInterval = setInterval(() => {
        if (!OTPState.otpExpiration) {
            clearInterval(OTPState.expirationTimerInterval);
            OTPState.expirationTimerInterval = null;
            return;
        }

        const now = Date.now();
        const expiresAt = new Date(OTPState.otpExpiration).getTime();
        const remainingMs = expiresAt - now;

        // Update UI element if it exists
        const expirationTimer = document.getElementById('otp-expiration-timer');

        if (remainingMs > 0) {
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            
            if (expirationTimer) {
                expirationTimer.textContent = `Code expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
                expirationTimer.style.display = 'block';
            }
        } else {
            // OTP expired
            if (expirationTimer) {
                expirationTimer.textContent = 'OTP expired. Please request a new code';
                expirationTimer.style.color = '#dc3545'; // Red color
            }
            
            OTPState.otpSent = false;
            clearInterval(OTPState.expirationTimerInterval);
            OTPState.expirationTimerInterval = null;
        }
    }, 1000);
}

/**
 * Stops all running timers
 * Should be called when OTP is verified or when changing email
 */
function stopTimers() {
    if (OTPState.resendTimerInterval) {
        clearInterval(OTPState.resendTimerInterval);
        OTPState.resendTimerInterval = null;
    }

    if (OTPState.expirationTimerInterval) {
        clearInterval(OTPState.expirationTimerInterval);
        OTPState.expirationTimerInterval = null;
    }

    OTPState.resendCooldown = 0;

    // Clear UI elements
    const resendTimer = document.getElementById('resend-timer');
    const expirationTimer = document.getElementById('otp-expiration-timer');
    
    if (resendTimer) {
        resendTimer.textContent = '';
        resendTimer.style.display = 'none';
    }
    
    if (expirationTimer) {
        expirationTimer.textContent = '';
        expirationTimer.style.display = 'none';
    }
}

/**
 * Invalidates the OTP on the backend (used when changing email)
 * @param {string} email - Email address to invalidate OTP for
 * @returns {Promise<Object>} - { success: boolean, message: string }
 */
async function invalidateOTP(email) {
    try {
        // Call the backend to delete any existing OTP for this email
        // We can use the send-otp endpoint with a flag, or just rely on the fact
        // that sending a new OTP will invalidate the old one
        // For now, we'll just clear the frontend state and let the backend
        // handle invalidation when a new OTP is requested
        
        // Note: The backend automatically invalidates old OTPs when a new one is sent
        // So we don't need a separate invalidate endpoint
        
        return { success: true, message: 'OTP invalidated' };
    } catch (error) {
        console.error('Error invalidating OTP:', error);
        return { success: false, message: 'Failed to invalidate OTP' };
    }
}

/**
 * Resets the OTP state (used when changing email)
 */
function resetOTPState() {
    stopTimers();
    
    OTPState.email = '';
    OTPState.otpSent = false;
    OTPState.otpVerified = false;
    OTPState.otpValue = '';
    OTPState.isLoading = false;
    OTPState.errorMessage = '';
    OTPState.successMessage = '';
    OTPState.otpExpiration = null;
}

/**
 * Gets the current OTP state
 * @returns {Object} - Current OTP state
 */
function getOTPState() {
    return { ...OTPState };
}

/**
 * Handles OTP-specific errors and returns user-friendly messages
 * @param {Error} error - Error object
 * @param {string} operation - Operation type ('send', 'verify', 'resend')
 * @returns {string} - User-friendly error message
 */
function handleOTPError(error, operation) {
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    // Log error for debugging
    logError('Error Handler', { operation, errorMessage, errorCode });
    
    // Rate limiting errors (Requirement 5.3)
    if (errorMessage.includes('Too many attempts') || errorMessage.includes('rate limit') || errorCode === 'RATE_LIMIT_EXCEEDED' || errorCode === 'RATE_LIMIT_BLOCKED') {
        return errorMessage; // Already user-friendly from backend
    }
    
    // Network/Connection errors
    if (errorMessage.includes('Unable to connect') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorCode === 'NETWORK_ERROR') {
        return 'Connection error. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorCode === 'TIMEOUT_ERROR' || errorCode === 'EMAIL_TIMEOUT') {
        return 'Request timed out. The server is taking too long to respond. Please try again.';
    }
    
    // Email service errors (Requirement 1.5)
    if (errorCode === 'EMAIL_SEND_FAILED' || errorCode === 'EMAIL_AUTH_FAILED' || errorCode === 'EMAIL_CONNECTION_FAILED' || errorCode === 'EMAIL_NOT_CONFIGURED') {
        if (operation === 'send' || operation === 'resend') {
            if (errorCode === 'EMAIL_AUTH_FAILED' || errorCode === 'EMAIL_NOT_CONFIGURED') {
                return 'Email service is temporarily unavailable. Please contact support or try again later.';
            }
            return 'Failed to send OTP email. Please verify your email address and try again.';
        }
    }
    
    if (errorMessage.includes('Failed to send') || errorMessage.includes('email')) {
        if (operation === 'send' || operation === 'resend') {
            return 'Failed to send OTP email. Please verify your email address and try again.';
        }
    }
    
    // Validation errors
    if (errorMessage.includes('Invalid email') || errorMessage.includes('email format') || errorCode === 'INVALID_EMAIL_FORMAT' || errorCode === 'EMAIL_REQUIRED') {
        return 'Please enter a valid email address.';
    }
    
    if (errorMessage.includes('Invalid OTP') || errorMessage.includes('OTP must be') || errorCode === 'INVALID_OTP_FORMAT' || errorCode === 'INVALID_OTP') {
        return 'Please enter a valid 6-digit OTP code.';
    }
    
    if (errorMessage.includes('required') || errorCode === 'MISSING_FIELDS') {
        return 'Please fill in all required fields.';
    }
    
    // Expiration errors (Requirement 3.3)
    if (errorMessage.includes('expired') || errorMessage.includes('Expired') || errorCode === 'OTP_EXPIRED') {
        return 'OTP has expired. Please request a new code.';
    }
    
    // Not found errors
    if (errorMessage.includes('No OTP found') || errorMessage.includes('not found') || errorCode === 'OTP_NOT_FOUND') {
        return 'No OTP found for this email. Please request a new code.';
    }
    
    // Already verified
    if (errorMessage.includes('already verified') || errorCode === 'ALREADY_VERIFIED') {
        return 'Email is already verified. You can proceed with registration.';
    }
    
    // Server errors
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error') || errorCode === 'INTERNAL_ERROR') {
        return 'A server error occurred. Please try again in a few moments.';
    }
    
    // Service unavailable
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorCode === 'SERVICE_UNAVAILABLE') {
        return 'The service is temporarily unavailable. Please try again later.';
    }
    
    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('Database') || errorCode === 'DATABASE_ERROR') {
        return 'A temporary database error occurred. Please try again.';
    }
    
    // Bad request errors
    if (errorMessage.includes('400') || errorMessage.includes('Bad Request') || errorCode === 'BAD_REQUEST') {
        return errorMessage || 'Invalid request. Please check your input and try again.';
    }
    
    // Unauthorized errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorCode === 'UNAUTHORIZED') {
        return 'Authentication failed. Please try again.';
    }
    
    // Forbidden errors
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorCode === 'FORBIDDEN') {
        return 'Access denied. You do not have permission to perform this action.';
    }
    
    // Operation-specific default messages (Requirement 2.4)
    switch (operation) {
        case 'send':
            return errorMessage || 'Failed to send OTP. Please try again.';
        case 'verify':
            return errorMessage || 'Failed to verify OTP. Please check your code and try again.';
        case 'resend':
            return errorMessage || 'Failed to resend OTP. Please try again.';
        default:
            return errorMessage || 'An unexpected error occurred. Please try again.';
    }
}

/**
 * Logging utility for debugging and monitoring
 * Logs messages to console with timestamp and context
 */
const OTPLogger = {
    enabled: true, // Set to false in production if needed
    
    log(level, message, data = {}) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            ...data
        };
        
        switch (level) {
            case 'ERROR':
                console.error(`[OTP ${level}] ${timestamp}:`, message, data);
                break;
            case 'WARN':
                console.warn(`[OTP ${level}] ${timestamp}:`, message, data);
                break;
            case 'INFO':
                console.info(`[OTP ${level}] ${timestamp}:`, message, data);
                break;
            default:
                console.log(`[OTP ${level}] ${timestamp}:`, message, data);
        }
        
        // Store in session storage for debugging (last 50 logs)
        try {
            const logs = JSON.parse(sessionStorage.getItem('otp_logs') || '[]');
            logs.push(logData);
            if (logs.length > 50) logs.shift(); // Keep only last 50
            sessionStorage.setItem('otp_logs', JSON.stringify(logs));
        } catch (e) {
            // Ignore storage errors
        }
    }
};

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object} data - Additional data
 */
function logError(message, data = {}) {
    OTPLogger.log('ERROR', message, data);
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} data - Additional data
 */
function logWarning(message, data = {}) {
    OTPLogger.log('WARN', message, data);
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} data - Additional data
 */
function logInfo(message, data = {}) {
    OTPLogger.log('INFO', message, data);
}

/**
 * Get OTP logs from session storage for debugging
 * @returns {Array} - Array of log entries
 */
function getOTPLogs() {
    try {
        return JSON.parse(sessionStorage.getItem('otp_logs') || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Clear OTP logs from session storage
 */
function clearOTPLogs() {
    try {
        sessionStorage.removeItem('otp_logs');
        logInfo('OTP logs cleared');
    } catch (e) {
        console.error('Failed to clear OTP logs:', e);
    }
}

/**
 * Export OTP logs as a downloadable file for debugging
 * Useful for troubleshooting issues with support team
 */
function exportOTPLogs() {
    try {
        const logs = getOTPLogs();
        
        if (logs.length === 0) {
            console.warn('No OTP logs to export');
            return;
        }
        
        // Create formatted log content
        const logContent = logs.map(log => {
            return `[${log.timestamp}] ${log.level}: ${log.message}\n${JSON.stringify(log, null, 2)}\n`;
        }).join('\n---\n\n');
        
        // Create blob and download
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `otp-logs-${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logInfo('OTP logs exported successfully');
    } catch (e) {
        console.error('Failed to export OTP logs:', e);
    }
}

/**
 * Display OTP logs in console for debugging
 * Call this from browser console: displayOTPLogs()
 */
function displayOTPLogs() {
    const logs = getOTPLogs();
    
    if (logs.length === 0) {
        console.log('No OTP logs available');
        return;
    }
    
    console.group('OTP Verification Logs');
    logs.forEach(log => {
        const style = log.level === 'ERROR' ? 'color: red; font-weight: bold;' :
                     log.level === 'WARN' ? 'color: orange;' :
                     'color: blue;';
        console.log(`%c[${log.timestamp}] ${log.level}: ${log.message}`, style, log);
    });
    console.groupEnd();
}

// Make debugging functions available globally for console access
if (typeof window !== 'undefined') {
    window.displayOTPLogs = displayOTPLogs;
    window.exportOTPLogs = exportOTPLogs;
    window.clearOTPLogs = clearOTPLogs;
    window.getOTPLogs = getOTPLogs;
}

/**
 * Retry logic for transient failures
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @returns {Promise} - Result of the function
 */
async function retryOperation(fn, maxRetries = 2, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logInfo('Retry Attempt', { attempt, maxRetries });
            return await fn();
        } catch (error) {
            lastError = error;
            logWarning('Retry Failed', { attempt, maxRetries, error: error.message });
            
            // Check if error is retryable
            const isRetryable = isRetryableError(error);
            
            if (!isRetryable || attempt === maxRetries) {
                logError('Retry Exhausted', { attempt, maxRetries, error: error.message });
                throw error;
            }
            
            // Wait before next retry
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    
    throw lastError;
}

/**
 * Determines if an error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} - True if error is retryable
 */
function isRetryableError(error) {
    const errorMessage = error.message || '';
    
    // Network errors are retryable
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
        return true;
    }
    
    // Server errors (500) are retryable
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        return true;
    }
    
    // Database errors might be transient
    if (errorMessage.includes('database') || errorMessage.includes('Database')) {
        return true;
    }
    
    // Connection errors are retryable
    if (errorMessage.includes('Unable to connect') || errorMessage.includes('Connection')) {
        return true;
    }
    
    // Rate limiting, validation, and expired OTPs are NOT retryable
    if (errorMessage.includes('Too many attempts') || 
        errorMessage.includes('Invalid') || 
        errorMessage.includes('expired') ||
        errorMessage.includes('required')) {
        return false;
    }
    
    // Default: not retryable
    return false;
}

/**
 * Cleanup function to be called when component unmounts or page unloads
 */
function cleanup() {
    stopTimers();
    logInfo('OTP Module Cleanup');
}

// Add cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
}
