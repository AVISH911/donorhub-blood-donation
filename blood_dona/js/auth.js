// Create this file as: auth.js
// Add this script to your HTML pages

const API_URL = 'http://localhost:5000/api';

// ============= AUTHENTICATION FUNCTIONS =============

// Register new user
async function register(name, email, password, userType, emailVerified = false) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, userType, emailVerified })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Save user info to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isLoggedIn', 'true');
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    throw error;
  }
}

// Login user
async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Save user info to localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isLoggedIn', 'true');
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    throw error;
  }
}

// Logout user
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
  window.location.href = 'index.html';
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

// Get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Update UI based on login status
function updateAuthUI() {
  const user = getCurrentUser();
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const authButtons = document.querySelector('.auth-buttons');
  
  if (isLoggedIn() && user) {
    // User is logged in - show user info
    if (authButtons) {
      authButtons.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="color: #333; font-weight: 500;">
            <i class="fas fa-user-circle"></i> ${user.name}
          </span>
          <button class="btn btn-outline" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      `;
    }
  } else {
    // User is not logged in - show login/register buttons
    if (loginBtn) {
      loginBtn.style.display = 'inline-block';
    }
    if (registerBtn) {
      registerBtn.style.display = 'inline-block';
    }
  }
}

// ============= MODAL FUNCTIONALITY =============

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  // Login form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        const result = await login(email, password);
        alert('✅ ' + result.message);
        
        // Close modal
        document.getElementById('loginModal').style.display = 'none';
        
        // Update UI
        updateAuthUI();
        
        // Redirect to home or reload
        window.location.reload();
        
      } catch (error) {
        alert('❌ ' + error.message);
      }
    });
  }
  
  // Register form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const userType = document.getElementById('registerUserType').value;
      
      // Validate required fields
      if (!name) {
        alert('❌ Please enter your full name');
        return;
      }
      
      if (!email) {
        alert('❌ Please enter your email address');
        return;
      }
      
      if (!password) {
        alert('❌ Please enter a password');
        return;
      }
      
      if (password.length < 6) {
        alert('❌ Password must be at least 6 characters long');
        return;
      }
      
      // Validate user type is selected
      if (!userType || userType === '') {
        alert('❌ Please select a user type (Donor, Recipient, or Hospital)');
        return;
      }
      
      // Check if OTP is verified (Requirement 2.5)
      const otpStateData = typeof getOTPState === 'function' ? getOTPState() : null;
      const emailVerified = otpStateData ? otpStateData.otpVerified : false;
      
      if (!emailVerified) {
        alert('❌ Please verify your email with OTP before registering');
        
        // Show OTP section if not visible
        const otpSection = document.getElementById('otpSection');
        const sendOtpBtn = document.getElementById('sendOtpBtn');
        if (otpSection && otpSection.style.display === 'none' && sendOtpBtn) {
          alert('💡 Click "Send OTP" button to verify your email');
        }
        return;
      }
      
      // Disable submit button to prevent double submission
      const submitBtn = document.getElementById('registerSubmitBtn');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
      
      try {
        // Include verification status in registration payload
        const result = await register(name, email, password, userType, emailVerified);
        
        // Show success message
        alert('✅ ' + result.message);
        
        // Close modal
        document.getElementById('loginModal').style.display = 'none';
        
        // Update UI
        updateAuthUI();
        
        // Redirect to home or reload
        window.location.reload();
        
      } catch (error) {
        // Handle specific error types
        let errorMessage = error.message || 'Registration failed. Please try again.';
        
        // Add helpful context for specific errors
        if (errorMessage.includes('already registered')) {
          errorMessage += '\n\n💡 Try logging in instead.';
        } else if (errorMessage.includes('verify your email')) {
          errorMessage += '\n\n💡 Please complete the OTP verification first.';
        } else if (errorMessage.includes('server error') || errorMessage.includes('unexpected error')) {
          errorMessage += '\n\n💡 Please try again in a few moments.';
        }
        
        alert('❌ ' + errorMessage);
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
  
  // Update UI on page load
  updateAuthUI();
});

// ============= PROTECT ROUTES =============

// Call this function on pages that require login
function requireAuth() {
  if (!isLoggedIn()) {
    alert('🔒 Please login first to access this feature');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ============= PROTECT NAVIGATION LINKS =============

// Protect all navigation links except Home
function protectNavigation() {
  document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-links a, .feature-card, .box');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || link.getAttribute('onclick');
      
      // Skip if it's the home page or empty
      if (!href || href === '#' || href === 'index.html' || href.includes('index.html')) {
        return;
      }
      
      // Add click event to check login
      link.addEventListener('click', function(e) {
        if (!isLoggedIn()) {
          e.preventDefault();
          e.stopPropagation();
          
          // Show custom alert
          showLoginAlert();
          return false;
        }
      });
    });
    
    // Also protect the feature boxes on home page
    const featureBoxes = document.querySelectorAll('.box');
    featureBoxes.forEach(box => {
      box.addEventListener('click', function(e) {
        if (!isLoggedIn()) {
          e.preventDefault();
          e.stopPropagation();
          showLoginAlert();
          return false;
        }
      });
    });
  });
}

// Show custom login alert
function showLoginAlert() {
  // Create custom modal alert
  const alertModal = document.createElement('div');
  alertModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  alertModal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 5px 30px rgba(0,0,0,0.3);
    ">
      <div style="
        width: 60px;
        height: 60px;
        background: #fff3cd;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      ">
        <i class="fas fa-lock" style="font-size: 30px; color: #856404;"></i>
      </div>
      <h2 style="margin-bottom: 15px; color: #333;">Login Required</h2>
      <p style="color: #666; margin-bottom: 25px;">
        Please login or register to access this feature
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="this.closest('.custom-alert-modal').remove()" style="
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
        ">Cancel</button>
        <button onclick="openLoginModal()" style="
          padding: 10px 20px;
          background: #e53935;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
        ">Login Now</button>
      </div>
    </div>
  `;
  
  alertModal.className = 'custom-alert-modal';
  document.body.appendChild(alertModal);
  
  // Close on background click
  alertModal.addEventListener('click', function(e) {
    if (e.target === alertModal) {
      alertModal.remove();
    }
  });
}

// Open login modal
function openLoginModal() {
  // Remove custom alert
  const customAlert = document.querySelector('.custom-alert-modal');
  if (customAlert) customAlert.remove();
  
  // Open login modal
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
}

// Call this to protect navigation
protectNavigation();