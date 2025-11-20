const API_URL = 'http://localhost:5000/api';

// Load donors when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 frontend-api.js DOMContentLoaded fired');
    console.log('📍 Current path:', window.location.pathname);
    
    if (window.location.pathname.includes('find_donor')) {
        console.log('✅ On find_donor page - initializing');
        
        // Load all donors initially
        loadAllDonors();
        
        // Attach search form handler
        const searchForm = document.getElementById('donorSearchForm');
        console.log('📋 Search form element:', searchForm ? 'FOUND' : 'NOT FOUND');
        
        if (searchForm) {
            console.log('📝 Attaching submit event listener to search form');
            searchForm.addEventListener('submit', handleSearchSubmit);
        } else {
            console.error('❌ Search form not found!');
        }
        
        // Attach sort handler
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            console.log('📊 Attaching change event listener to sort dropdown');
            sortBy.addEventListener('change', handleSort);
        }
    } else {
        console.log('ℹ️ Not on find_donor page, skipping initialization');
    }
});

// Handle search form submission
async function handleSearchSubmit(e) {
    console.log('🎯 Search form submitted!');
    e.preventDefault();
    console.log('✋ Default form submission prevented');
    
    const bloodGroup = document.getElementById('bloodGroup').value;
    const location = document.getElementById('location').value;
    
    console.log('🔍 Searching for:', { bloodGroup, location });
    
    await searchDonors(bloodGroup, location);
}

// Search donors function with API filters
async function searchDonors(bloodGroup, city) {
    try {
        // Build query parameters
        const params = new URLSearchParams();
        if (bloodGroup) params.append('bloodGroup', bloodGroup);
        if (city) params.append('city', city);
        
        const url = `${API_URL}/donors${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const donors = await response.json();
        displayDonors(donors);
        
    } catch (error) {
        console.error('Error searching donors:', error);
        
        // Show user-friendly error message
        const donorsGrid = document.getElementById('donorsGrid');
        if (donorsGrid) {
            donorsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #e53935; margin-bottom: 20px;"></i>
                    <h3>Unable to load donors</h3>
                    <p style="color: #666;">Please ensure the backend server is running on http://localhost:5000</p>
                    <button onclick="loadAllDonors()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Load all donors from API
async function loadAllDonors() {
    try {
        const response = await fetch(`${API_URL}/donors`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const donors = await response.json();
        displayDonors(donors);
        
    } catch (error) {
        console.error('Error loading donors:', error);
        
        // Show user-friendly error message
        const donorsGrid = document.getElementById('donorsGrid');
        if (donorsGrid) {
            donorsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 60px; color: #e53935; margin-bottom: 20px;"></i>
                    <h3>Unable to load donors</h3>
                    <p style="color: #666;">Please ensure the backend server is running on http://localhost:5000</p>
                    <button onclick="loadAllDonors()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Handle sorting
let currentDonors = [];

async function handleSort() {
    const sortBy = document.getElementById('sortBy').value;
    
    if (currentDonors.length === 0) {
        return;
    }
    
    let sortedDonors = [...currentDonors];
    
    if (sortBy === 'recent') {
        // Sort by most recent registration (createdAt field)
        sortedDonors.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Most recent first
        });
    } else if (sortBy === 'availability') {
        // Sort by blood group (alphabetically)
        sortedDonors.sort((a, b) => {
            return a.bloodGroup.localeCompare(b.bloodGroup);
        });
    } else if (sortBy === 'distance') {
        // Sort by city name (alphabetically) as a proxy for distance
        sortedDonors.sort((a, b) => {
            return (a.city || '').localeCompare(b.city || '');
        });
    }
    
    displayDonors(sortedDonors);
}

// Display donors in grid
function displayDonors(donors) {
    const donorsGrid = document.getElementById('donorsGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!donorsGrid) return;
    
    // Store current donors for sorting
    currentDonors = donors;
    
    // Update count
    if (resultsCount) {
        resultsCount.textContent = donors.length;
    }
    
    // Clear grid
    donorsGrid.innerHTML = '';
    
    // Check if no donors
    if (donors.length === 0) {
        donorsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-users" style="font-size: 60px; color: #ddd; margin-bottom: 20px;"></i>
                <h3>No donors found</h3>
                <p style="color: #666;">Try adjusting your search criteria or register as a donor</p>
            </div>
        `;
        return;
    }
    
    // Display each donor
    donors.forEach(donor => {
        const donorCard = document.createElement('div');
        donorCard.className = 'donor-card';
        
        // Format last donation date if available
        let lastDonationText = 'Not specified';
        if (donor.lastDonation) {
            const lastDonationDate = new Date(donor.lastDonation);
            const monthsAgo = Math.floor((Date.now() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
            lastDonationText = monthsAgo > 0 ? `${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago` : 'Recently';
        }
        
        donorCard.innerHTML = `
            <div class="donor-header">
                <div class="donor-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="donor-info">
                    <h3>${donor.firstName} ${donor.lastName}</h3>
                    <span class="donor-blood-group">${donor.bloodGroup}</span>
                </div>
            </div>
            <div class="donor-details">
                <div class="donor-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${donor.city || 'N/A'}${donor.state ? ', ' + donor.state : ''}</span>
                </div>
                <div class="donor-detail">
                    <i class="fas fa-phone-alt"></i>
                    <span>${donor.phone || 'N/A'}</span>
                </div>
                <div class="donor-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${donor.email || 'N/A'}</span>
                </div>
                <div class="donor-detail">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Last donation: ${lastDonationText}</span>
                </div>
                <div class="donor-detail">
                    <i class="fas fa-weight"></i>
                    <span>Weight: ${donor.weight || 'N/A'} kg</span>
                </div>
                <div class="donor-detail">
                    <i class="fas fa-venus-mars"></i>
                    <span>${donor.gender ? donor.gender.charAt(0).toUpperCase() + donor.gender.slice(1) : 'N/A'}</span>
                </div>
            </div>
            <div class="donor-actions">
                <button class="btn-contact" onclick="contactDonor('${donor.phone}', '${donor.firstName}')">
                    <i class="fas fa-phone-alt"></i> Contact
                </button>
                <button class="btn-view" onclick="viewDonorProfile('${donor._id}')">
                    <i class="fas fa-user"></i> View Profile
                </button>
            </div>
        `;
        
        donorsGrid.appendChild(donorCard);
    });
}

// Contact donor
function contactDonor(phone, name) {
    alert(`📞 Contact ${name} at: ${phone}`);
}

// View donor profile
function viewDonorProfile(donorId) {
    alert(`Viewing profile: ${donorId}`);
}