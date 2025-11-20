/**
 * Donor Registration API Module
 * Handles donor registration form submission and API integration
 */

/**
 * Collects all donor form data from the DOM
 * @returns {Object} - Structured donor data object
 */
function collectDonorFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        bloodGroup: document.getElementById('bloodGroup').value,
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        weight: parseInt(document.getElementById('weight').value),
        gender: document.getElementById('gender').value,
        dateOfBirth: document.getElementById('dateOfBirth').value || undefined,
        address: document.getElementById('address').value.trim() || undefined,
        zipCode: document.getElementById('zipCode').value.trim() || undefined,
        country: document.getElementById('country').value || undefined,
        lastDonation: document.getElementById('lastDonation').value || undefined,
        healthConditions: document.getElementById('healthConditions').value || undefined
    };
}

/**
 * Submits donor registration data to the backend API
 * @param {Object} formData - Donor registration data
 * @returns {Promise<Object>} - API response with saved donor data
 */
async function submitDonorRegistration(formData) {
    try {
        // Make API call to register donor
        const response = await apiCall('/donors', 'POST', formData);
        
        return response;
        
    } catch (error) {
        // Re-throw to be handled by caller
        throw error;
    }
}

/**
 * Displays success modal with donor confirmation details
 * @param {Object} donorData - Saved donor information from API response
 */
function displayDonorSuccess(donorData) {
    const successModal = document.getElementById('successModal');
    
    // Update modal content with donor details
    const modalContent = successModal.querySelector('.modal-content p');
    if (donorData && donorData.firstName && donorData.bloodGroup) {
        modalContent.textContent = `Thank you ${donorData.firstName} for registering as a ${donorData.bloodGroup} blood donor. Your information has been saved and you'll be notified when there's a need for your blood type.`;
    }
    
    // Show the modal
    successModal.style.display = 'flex';
}

/**
 * Displays error alert to the user
 * @param {string} errorMessage - Error message to display
 */
function displayDonorError(errorMessage) {
    // Create error alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = 'error-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        background-color: #f44336;
        color: white;
        padding: 16px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start;">
            <i class="fas fa-exclamation-circle" style="margin-right: 12px; font-size: 20px;"></i>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 4px;">Registration Error</strong>
                <span style="font-size: 14px;">${errorMessage}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; margin-left: 10px; padding: 0; line-height: 1;">&times;</button>
        </div>
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('donor-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'donor-alert-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}
