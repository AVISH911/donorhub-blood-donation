/**
 * Blood Request API Module
 * Handles blood request form submission and API integration
 */

/**
 * Collects all blood request form data from the DOM
 * @returns {Object} - Structured blood request data object
 */
function collectRequestFormData() {
    const formData = {
        patientName: document.getElementById('patientName').value.trim(),
        bloodType: document.getElementById('bloodType').value,
        unitsNeeded: parseInt(document.getElementById('unitsNeeded').value),
        hospital: document.getElementById('hospital').value.trim(),
        city: document.getElementById('hospitalAddress').value.trim().split(',').pop().trim() || 'Unknown',
        contactPhone: document.getElementById('contactPhone').value.trim(),
        urgency: document.getElementById('urgency').value,
        requiredDate: document.getElementById('requiredDate').value || undefined,
        hospitalAddress: document.getElementById('hospitalAddress').value.trim() || undefined,
        contactName: document.getElementById('contactName').value.trim() || undefined,
        contactRelation: document.getElementById('contactRelation').value || undefined,
        description: document.getElementById('description').value.trim() || undefined
    };

    // Add blood component data if selected
    const bloodComponent = document.getElementById('bloodComponent').value;
    const componentUnits = parseInt(document.getElementById('componentUnits').value);
    
    if (bloodComponent && componentUnits > 0) {
        formData.bloodComponent = bloodComponent;
        formData.componentUnits = componentUnits;
    }

    return formData;
}

/**
 * Submits blood request data to the backend API
 * @param {Object} formData - Blood request data
 * @returns {Promise<Object>} - API response with saved request data
 */
async function submitBloodRequest(formData) {
    try {
        // Make API call to create blood request
        const response = await apiCall('/requests', 'POST', formData);
        
        return response;
        
    } catch (error) {
        // Re-throw to be handled by caller
        throw error;
    }
}

/**
 * Loads blood requests from the backend API with optional filters
 * @param {Object} filters - Optional filter criteria (bloodType, component, urgency, city)
 * @returns {Promise<Array>} - Array of blood request objects
 */
async function loadBloodRequests(filters = {}) {
    try {
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.bloodType) {
            queryParams.append('bloodType', filters.bloodType);
        }
        if (filters.component) {
            queryParams.append('bloodComponent', filters.component);
        }
        if (filters.urgency) {
            queryParams.append('urgency', filters.urgency);
        }
        if (filters.city) {
            queryParams.append('city', filters.city);
        }
        if (filters.search) {
            queryParams.append('search', filters.search);
        }

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/requests?${queryString}` : '/requests';
        
        // Make API call to get blood requests
        const response = await apiCall(endpoint, 'GET');
        
        // Return the requests array
        return response.data || response.requests || response || [];
        
    } catch (error) {
        // Return empty array on error to prevent UI breaking
        return [];
    }
}

/**
 * Displays blood requests as cards in the DOM
 * @param {Array} requests - Array of blood request objects
 */
function displayBloodRequests(requests) {
    const requestsContainer = document.getElementById('requestsContainer');
    const emptyState = document.getElementById('emptyState');
    const requestsCount = document.getElementById('requestsCount');
    
    // Clear existing content
    requestsContainer.innerHTML = '';
    
    // Check if there are no requests
    if (!requests || requests.length === 0) {
        emptyState.style.display = 'block';
        requestsCount.textContent = '0';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    requestsCount.textContent = requests.length;
    
    // Component information for display
    const componentNames = {
        "PRC": "Packed Red Cells (PRC)",
        "FFP": "Fresh Frozen Plasma (FFP)",
        "PLT": "Platelets (PLT)",
        "CRYO": "Cryoprecipitate (CRYO)",
        "WB": "Whole Blood (WB)",
        "LDP": "Leukocyte-Depleted PRC (LDP)",
        "SDP": "Single Donor Platelets (SDP)"
    };
    
    // Render each request as a card
    requests.forEach(request => {
        const componentBadge = request.bloodComponent ? 
            `<div class="component-badge">${componentNames[request.bloodComponent] || request.bloodComponent}</div>` : '';
        
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        requestCard.innerHTML = `
            <div class="request-header">
                <div>
                    <div class="request-title">${request.patientName} - ${request.bloodType}</div>
                    ${componentBadge}
                    <div class="request-detail">
                        <i class="fas fa-hospital"></i>
                        <span>${request.hospital}, ${request.city}</span>
                    </div>
                </div>
                <div class="request-urgency urgency-${request.urgency}">
                    ${request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Urgency
                </div>
            </div>
            <div class="request-content">
                <div class="request-details">
                    <div class="request-detail">
                        <i class="fas fa-tint"></i>
                        <span>${request.unitsNeeded} unit(s) needed</span>
                    </div>
                    ${request.bloodComponent && request.componentUnits ? `
                    <div class="request-detail">
                        <i class="fas fa-vial"></i>
                        <span>Component: ${componentNames[request.bloodComponent] || request.bloodComponent} (${request.componentUnits} unit(s))</span>
                    </div>
                    ` : ''}
                    <div class="request-detail">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Required by: ${formatRequestDate(request.requiredDate)}</span>
                    </div>
                    ${request.contactName ? `
                    <div class="request-detail">
                        <i class="fas fa-user"></i>
                        <span>Contact: ${request.contactName}${request.contactRelation ? ' (' + request.contactRelation + ')' : ''}</span>
                    </div>
                    ` : ''}
                    <div class="request-detail">
                        <i class="fas fa-phone"></i>
                        <span>${request.contactPhone}</span>
                    </div>
                </div>
                
                ${request.description ? `
                <div class="request-description">
                    ${request.description}
                </div>
                ` : ''}
                
                <div class="request-stats">
                    <div class="stat">
                        <div class="stat-value">${request.responses || 0}</div>
                        <div class="stat-label">Responses</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${request.donorsFound || 0}</div>
                        <div class="stat-label">Donors Found</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${getTimeAgo(request.createdAt)}</div>
                        <div class="stat-label">Posted</div>
                    </div>
                </div>
                
                <div class="request-actions">
                    <button class="btn btn-primary btn-full respond-btn" data-request-id="${request._id}">
                        <i class="fas fa-hand-holding-medical"></i> Respond to Request
                    </button>
                    <button class="btn btn-outline share-btn" data-request-id="${request._id}">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
        `;
        requestsContainer.appendChild(requestCard);
    });
    
    // Add event listeners to respond buttons
    document.querySelectorAll('.respond-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const requestId = btn.getAttribute('data-request-id');
            respondToRequest(requestId, requests);
        });
    });
}

/**
 * Formats date to readable format
 * @param {string|Date} dateString - Date to format
 * @returns {string} - Formatted date string
 */
function formatRequestDate(dateString) {
    if (!dateString) return 'Not specified';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Calculates time ago from a date
 * @param {string|Date} dateString - Date to calculate from
 * @returns {string} - Time ago string (e.g., "2 hours ago")
 */
function getTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
        return formatRequestDate(dateString);
    }
}

/**
 * Handles responding to a blood request
 * @param {string} requestId - ID of the request to respond to
 * @param {Array} requests - Array of all requests
 */
function respondToRequest(requestId, requests) {
    const request = requests.find(r => r._id === requestId);
    if (!request) return;
    
    alert(`Thank you for your willingness to help! You are responding to ${request.patientName}'s request for ${request.bloodType} blood.\n\nWe will connect you with ${request.contactName || 'the contact person'} at ${request.contactPhone} to coordinate the donation.`);
}
