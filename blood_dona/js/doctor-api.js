/**
 * Doctor Registration API Module
 * Handles doctor registration form submission and API integration
 */

/**
 * Collects all doctor form data from the DOM
 * @returns {Object} - Structured doctor data object
 */
function collectDoctorFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        specialization: document.getElementById('specialization').value,
        hospital: document.getElementById('hospital')?.value.trim() || '',
        city: document.getElementById('city')?.value.trim() || '',
        state: document.getElementById('state')?.value.trim() || '',
        licenseNumber: document.getElementById('licenseNumber')?.value.trim() || '',
        yearsOfExperience: parseInt(document.getElementById('experience')?.value) || 0
    };
}

/**
 * Submits doctor registration data to the backend API
 * @param {Object} formData - Doctor registration data
 * @returns {Promise<Object>} - API response with saved doctor data
 */
async function submitDoctorRegistration(formData) {
    try {
        // Make API call to register doctor
        const response = await apiCall('/doctors', 'POST', formData);
        
        return response;
        
    } catch (error) {
        // Re-throw to be handled by caller
        throw error;
    }
}

/**
 * Displays success message for doctor registration
 * @param {Object} doctorData - Saved doctor information from API response
 */
function displayDoctorSuccess(doctorData) {
    alert(`✅ Registration Successful!\n\nWelcome Dr. ${doctorData.firstName} ${doctorData.lastName}!\n\nYour registration has been saved to the database.`);
}

/**
 * Displays error alert to the user
 * @param {string} errorMessage - Error message to display
 */
function displayDoctorError(errorMessage) {
    alert(`❌ Registration Error\n\n${errorMessage}`);
}
