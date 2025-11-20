/**
 * Camp API Module
 * Handles blood donation camp creation, retrieval, and registration
 */

/**
 * Collects camp form data from the DOM
 * @returns {Object} - Structured camp data
 */
function collectCampFormData() {
    return {
        title: document.getElementById('campTitle').value.trim(),
        organizer: document.getElementById('campOrganizer').value.trim(),
        date: document.getElementById('campDate').value,
        location: document.getElementById('campLocation').value.trim(),
        city: document.getElementById('campCity').value.trim(),
        targetDonors: parseInt(document.getElementById('campTargetDonors').value) || 0,
        time: document.getElementById('campTime')?.value.trim() || '',
        description: document.getElementById('campDescription')?.value.trim() || ''
    };
}

/**
 * Submits a new camp to the backend API
 * @param {Object} formData - Camp data to submit
 * @returns {Promise<Object>} - API response with saved camp data
 */
async function submitCamp(formData) {
    try {
        // Validate required fields
        if (!formData.title || !formData.organizer || !formData.date || 
            !formData.location || !formData.city || !formData.targetDonors) {
            throw new Error('Please fill in all required fields');
        }

        // Make API call
        const response = await apiCall('/camps', 'POST', formData);
        
        return response;

    } catch (error) {
        throw error;
    }
}

/**
 * Loads camps from the backend API with optional city filter
 * @param {Object} filters - Optional filter criteria (e.g., { city: 'New York' })
 * @returns {Promise<Array>} - Array of camp objects
 */
async function loadCamps(filters = {}) {
    try {
        console.log('📡 Loading camps with filters:', filters);
        
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.city && filters.city !== '') {
            queryParams.append('city', filters.city);
        }
        
        const queryString = queryParams.toString();
        const endpoint = queryString ? `/camps?${queryString}` : '/camps';
        
        console.log('🌐 API endpoint:', endpoint);
        
        // Make API call
        const response = await apiCall(endpoint, 'GET');
        
        console.log('📦 Raw API response:', response);
        
        // Handle different response formats
        const camps = Array.isArray(response) ? response : (response?.data || response?.camps || []);
        
        console.log('✅ Parsed camps:', camps.length, 'items');
        
        return camps;

    } catch (error) {
        console.error('❌ Error loading camps:', error);
        throw error;
    }
}

/**
 * Registers a user for a specific camp
 * @param {string} campId - MongoDB ObjectId of the camp
 * @returns {Promise<Object>} - API response with updated camp data
 */
async function registerForCamp(campId) {
    try {
        if (!campId) {
            throw new Error('Camp ID is required');
        }

        // Make API call
        const response = await apiCall(`/camps/${campId}/register`, 'POST');
        
        return response;

    } catch (error) {
        throw error;
    }
}

/**
 * Displays camps in the camps grid container
 * @param {Array} camps - Array of camp objects to display
 */
function displayCamps(camps) {
    const campsContainer = document.getElementById('campsContainer');
    
    if (!campsContainer) {
        return;
    }

    // Clear existing content
    campsContainer.innerHTML = '';

    // Check if camps array is empty
    if (!camps || camps.length === 0) {
        campsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray);">
                <i class="fas fa-campground" style="font-size: 60px; margin-bottom: 20px; color: #ddd;"></i>
                <h3>No camps found</h3>
                <p>There are no blood donation camps matching your criteria.</p>
            </div>
        `;
        return;
    }

    // Render each camp card
    camps.forEach(camp => {
        const campCard = createCampCard(camp);
        campsContainer.appendChild(campCard);
    });

    // Add event listeners to register buttons
    attachRegisterButtonListeners();
}

/**
 * Creates a camp card element
 * @param {Object} camp - Camp data object
 * @returns {HTMLElement} - Camp card DOM element
 */
function createCampCard(camp) {
    const campCard = document.createElement('div');
    campCard.className = 'camp-card';
    
    // Determine camp status based on date
    const campDate = new Date(camp.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let status = 'upcoming';
    if (campDate < today) {
        status = 'past';
    } else if (campDate.toDateString() === today.toDateString()) {
        status = 'ongoing';
    }

    // Calculate progress percentage
    const donorsRegistered = camp.donorsRegistered || 0;
    const targetDonors = camp.targetDonors || 1;
    const progress = Math.round((donorsRegistered / targetDonors) * 100);

    campCard.innerHTML = `
        <div class="camp-image" style="background-image: url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80');">
            <span class="camp-status status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <div class="camp-content">
            <h3 class="camp-title">${camp.title}</h3>
            <div class="camp-organizer">
                <i class="fas fa-user-friends"></i>
                <span>Organized by: ${camp.organizer}</span>
            </div>
            <div class="camp-details">
                <div class="camp-detail">
                    <i class="far fa-calendar-alt"></i>
                    <span>${formatCampDate(camp.date)}</span>
                </div>
                ${camp.time ? `
                <div class="camp-detail">
                    <i class="far fa-clock"></i>
                    <span>${camp.time}</span>
                </div>
                ` : ''}
                <div class="camp-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${camp.location}, ${camp.city}</span>
                </div>
            </div>
            ${status !== 'past' ? `
            <div class="camp-stats">
                <div class="stat">
                    <div class="stat-value">${donorsRegistered}</div>
                    <div class="stat-label">Registered</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${targetDonors}</div>
                    <div class="stat-label">Target</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${progress}%</div>
                    <div class="stat-label">Progress</div>
                </div>
            </div>
            ` : `
            <div class="camp-stats">
                <div class="stat">
                    <div class="stat-value">${donorsRegistered}</div>
                    <div class="stat-label">Donors</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${targetDonors}</div>
                    <div class="stat-label">Target</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${progress}%</div>
                    <div class="stat-label">Achieved</div>
                </div>
            </div>
            `}
            <div class="camp-actions">
                ${status === 'upcoming' ? `
                    <button class="btn btn-primary register-btn" data-camp-id="${camp._id}">Register Now</button>
                    <button class="btn btn-outline">View Details</button>
                ` : status === 'ongoing' ? `
                    <button class="btn btn-primary register-btn" data-camp-id="${camp._id}">Join Now</button>
                    <button class="btn btn-outline">Live Updates</button>
                ` : `
                    <button class="btn btn-outline">View Report</button>
                    <button class="btn btn-outline">Share Results</button>
                `}
            </div>
        </div>
    `;

    return campCard;
}

/**
 * Formats a date string to a readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatCampDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Attaches event listeners to all register buttons
 */
function attachRegisterButtonListeners() {
    document.querySelectorAll('.register-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const campId = this.getAttribute('data-camp-id');
            
            if (!campId) {
                showErrorMessage('Invalid camp ID');
                return;
            }

            // Disable button during registration
            this.disabled = true;
            this.textContent = 'Registering...';

            try {
                await registerForCamp(campId);
                showSuccessMessage('Successfully registered for the camp!');
                
                // Reload camps to show updated registration count
                if (typeof initializeCamps === 'function') {
                    await initializeCamps();
                } else {
                    const cityFilter = document.getElementById('location')?.value || '';
                    const camps = await loadCamps({ city: cityFilter });
                    displayCamps(camps);
                }

            } catch (error) {
                const errorMessage = handleApiError(error);
                showErrorMessage(errorMessage);
                
                // Re-enable button on error
                this.disabled = false;
                this.textContent = 'Register Now';
            }
        });
    });
}
