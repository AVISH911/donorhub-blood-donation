/**
 * Blood Bank API Module
 * Handles blood bank form submission and API integration
 */

/**
 * Collects all blood bank form data from the DOM
 * @returns {Object} - Structured blood bank data object
 */
function collectBloodBankFormData() {
    const formData = {
        name: document.getElementById('bankName').value.trim(),
        address: document.getElementById('bankAddress').value.trim(),
        city: document.getElementById('bankCity').value.trim(),
        phone: document.getElementById('bankPhone').value.trim(),
        email: document.getElementById('bankEmail').value.trim()
    };

    // Collect blood stock data for all blood types
    const bloodStock = {};
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    
    bloodTypes.forEach(type => {
        const inputId = 'stock' + type.replace('+', 'Pos').replace('-', 'Neg');
        const stockValue = document.getElementById(inputId)?.value;
        bloodStock[type] = stockValue ? parseInt(stockValue) : 0;
    });

    formData.bloodStock = bloodStock;

    return formData;
}

/**
 * Submits blood bank data to the backend API
 * @param {Object} formData - Blood bank data
 * @returns {Promise<Object>} - API response with saved blood bank data
 */
async function submitBloodBank(formData) {
    try {
        // Make API call to create blood bank
        const response = await apiCall('/bloodbanks', 'POST', formData);
        
        return response;
        
    } catch (error) {
        // Re-throw to be handled by caller
        throw error;
    }
}

/**
 * Loads blood banks from the backend API with optional city filter
 * @param {Object} filters - Optional filter criteria (city)
 * @returns {Promise<Array>} - Array of blood bank objects
 */
async function loadBloodBanks(filters = {}) {
    try {
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.city) {
            queryParams.append('city', filters.city);
        }
        if (filters.search) {
            queryParams.append('search', filters.search);
        }

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/bloodbanks?${queryString}` : '/bloodbanks';
        
        // Make API call to get blood banks
        const response = await apiCall(endpoint, 'GET');
        
        console.log('Blood banks API response:', response);
        
        // The backend returns the array directly
        if (Array.isArray(response)) {
            return response;
        }
        
        // Fallback: check if it's wrapped in an object
        return response.data || response.bloodbanks || response.banks || [];
        
    } catch (error) {
        console.error('Error loading blood banks:', error);
        // Return empty array on error to prevent UI breaking
        return [];
    }
}

/**
 * Displays blood banks as cards in the DOM
 * @param {Array} banks - Array of blood bank objects
 */
function displayBloodBanks(banks) {
    const bloodBanksContainer = document.getElementById('bloodBanksContainer');
    
    // Clear existing content
    bloodBanksContainer.innerHTML = '';
    
    // Check if there are no banks
    if (!banks || banks.length === 0) {
        bloodBanksContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-hospital" style="font-size: 60px; color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray); margin-bottom: 10px;">No Blood Banks Found</h3>
                <p style="color: var(--gray);">Try adjusting your filters or search criteria.</p>
            </div>
        `;
        return;
    }
    
    // Render each blood bank as a card
    banks.forEach(bank => {
        const bankCard = document.createElement('div');
        bankCard.className = 'blood-bank-card';
        
        // Determine stock status for each blood type
        const getStockStatus = (units) => {
            if (units === undefined || units === null) return 'unknown';
            if (units === 0) return 'critical';
            if (units < 10) return 'low';
            return 'available';
        };
        
        const getStockLabel = (units) => {
            if (units === undefined || units === null) return 'Unknown';
            if (units === 0) return 'Critical';
            if (units < 10) return 'Low';
            return 'Available';
        };
        
        bankCard.innerHTML = `
            <div class="blood-bank-header">
                <div>
                    <div class="blood-bank-name">${bank.name}</div>
                    <div class="blood-bank-type">
                        <i class="fas fa-hospital"></i>
                        <span>Blood Bank</span>
                    </div>
                </div>
                <div class="verification-badge">
                    <i class="fas fa-check-circle"></i>
                    <span>Verified</span>
                </div>
            </div>
            <div class="blood-bank-content">
                <div class="blood-bank-details">
                    <div class="blood-bank-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${bank.address}, ${bank.city}</span>
                    </div>
                    <div class="blood-bank-detail">
                        <i class="fas fa-phone-alt"></i>
                        <span>${bank.phone}</span>
                    </div>
                    <div class="blood-bank-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${bank.email}</span>
                    </div>
                </div>
                
                <div class="blood-stock">
                    <div class="stock-title">Current Blood Stock</div>
                    <div class="blood-groups-grid">
                        ${Object.entries(bank.bloodStock || {}).map(([group, units]) => `
                            <div class="blood-group-stock stock-${getStockStatus(units)}">
                                <div>${group}</div>
                                <div>${getStockLabel(units)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="blood-bank-actions">
                    <button class="btn btn-primary view-details-btn" data-bank-id="${bank._id}">View Details</button>
                    <button class="btn btn-outline" onclick="window.open('tel:${bank.phone}')">Call Now</button>
                </div>
            </div>
        `;
        bloodBanksContainer.appendChild(bankCard);
    });
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bankId = btn.getAttribute('data-bank-id');
            openBloodBankModal(bankId, banks);
        });
    });
}

/**
 * Opens the blood bank detail modal with data
 * @param {string} bankId - ID of the blood bank
 * @param {Array} banks - Array of all blood banks
 */
function openBloodBankModal(bankId, banks) {
    const bank = banks.find(b => b._id === bankId);
    if (!bank) return;
    
    const bloodBankModal = document.getElementById('bloodBankModal');
    
    // Populate modal with bank data
    document.getElementById('modalBankName').textContent = bank.name;
    document.getElementById('modalBankType').textContent = 'Blood Bank';
    document.getElementById('modalBankAddress').textContent = `${bank.address}, ${bank.city}`;
    document.getElementById('modalBankPhone').textContent = bank.phone;
    document.getElementById('modalBankEmail').textContent = bank.email;
    
    // Populate blood stock
    const stockContainer = document.getElementById('modalBloodStock');
    stockContainer.innerHTML = '';
    
    const getStockStatus = (units) => {
        if (units === undefined || units === null) return 'unknown';
        if (units === 0) return 'critical';
        if (units < 10) return 'low';
        return 'available';
    };
    
    const getStockLabel = (units) => {
        if (units === undefined || units === null) return 'Unknown';
        if (units === 0) return 'Critical';
        if (units < 10) return 'Low';
        return 'Available';
    };
    
    Object.entries(bank.bloodStock || {}).forEach(([group, units]) => {
        const stockItem = document.createElement('div');
        stockItem.className = `blood-stock-item stock-${getStockStatus(units)}`;
        stockItem.innerHTML = `
            <div class="blood-group">${group}</div>
            <div class="stock-status">${getStockLabel(units)}</div>
        `;
        stockContainer.appendChild(stockItem);
    });
    
    bloodBankModal.style.display = 'flex';
}
