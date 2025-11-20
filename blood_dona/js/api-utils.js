/**
 * API Utility Module
 * Centralized API configuration and helper functions for making HTTP requests
 */

// API Configuration
// Automatically uses deployed backend in production, localhost in development
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'  // Development
        : 'https://donorhub-api.onrender.com/api',  // Production - Update with your actual backend URL
    TIMEOUT: 10000, // 10 seconds
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

/**
 * Makes an HTTP request to the backend API with error handling
 * @param {string} endpoint - API endpoint (e.g., '/donors', '/requests')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} data - Request body data (optional)
 * @returns {Promise<Object>} - API response data
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const options = {
        method: method,
        headers: { ...API_CONFIG.HEADERS }
    };

    // Add body for POST, PUT, PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        options.body = JSON.stringify(data);
    }

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        // Parse response
        const responseData = await response.json();

        // Check if response is ok
        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        return responseData;

    } catch (error) {

        // Handle specific error types
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please try again.');
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Unable to connect to server. Please ensure the backend is running.');
        }

        // Re-throw the error to be handled by caller
        throw error;
    }
}

/**
 * Converts error objects into user-friendly error messages
 * @param {Error} error - Error object
 * @returns {string} - User-friendly error message
 */
function handleApiError(error) {
    // Network/Connection errors
    if (error.message.includes('Unable to connect to server')) {
        return 'Unable to connect to server. Please ensure the backend is running.';
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
        return 'Request timeout. The server is taking too long to respond. Please try again.';
    }

    // Rate limiting errors (429)
    if (error.message.includes('Too many attempts') || error.message.includes('rate limit')) {
        return error.message; // Already user-friendly from backend
    }

    // Authentication errors (401)
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return 'Authentication failed. Please try again.';
    }

    // Not found errors (404)
    if (error.message.includes('404') || error.message.includes('Not Found')) {
        return error.message || 'The requested resource was not found.';
    }

    // Validation errors (400)
    if (error.message.includes('validation') || error.message.includes('required') || error.message.includes('Invalid')) {
        return error.message;
    }

    // Duplicate entry errors
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        return error.message;
    }

    // Email service errors
    if (error.message.includes('email') && error.message.includes('Failed')) {
        return error.message;
    }

    // Database errors
    if (error.message.includes('database') || error.message.includes('Database')) {
        return 'A temporary database error occurred. Please try again.';
    }

    // Generic server errors (500)
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        return 'An error occurred on the server. Please try again later.';
    }

    // Service unavailable (503)
    if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
        return 'The service is temporarily unavailable. Please try again later.';
    }

    // Default error message
    return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if the backend server is running and accessible
 * @returns {Promise<boolean>} - True if backend is accessible, false otherwise
 */
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000) // 3 second timeout for health check
        });

        return response.ok;

    } catch (error) {
        return false;
    }
}

/**
 * Displays a success message to the user
 * @param {string} message - Success message to display
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showSuccessMessage(message, duration = 3000) {
    // Create success alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; animation: slideIn 0.3s ease-out;';
    alertDiv.innerHTML = `
        <strong>Success!</strong> ${message}
    `;

    document.body.appendChild(alertDiv);

    // Remove after duration
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, duration);
}

/**
 * Displays an error message to the user
 * @param {string} message - Error message to display
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showErrorMessage(message, duration = 5000) {
    // Create error alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; animation: slideIn 0.3s ease-out;';
    alertDiv.innerHTML = `
        <strong>Error!</strong> ${message}
    `;

    document.body.appendChild(alertDiv);

    // Remove after duration
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, duration);
}
