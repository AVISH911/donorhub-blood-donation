// Modal functionality
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');

// Open modal
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    document.querySelector('.tab.active').click();
});

registerBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    document.querySelector('.tab[data-tab="register"]').click();
});

// Close modal
closeModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
    }
});

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
});

// Switch between login and register
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.tab[data-tab="register"]').click();
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.tab[data-tab="login"]').click();
});

// Form submission handlers are in auth.js

// Mobile menu toggle
document.querySelector('.mobile-menu').addEventListener('click', () => {
    const navLinks = document.querySelector('.nav-links');
    navLinks.style.display = 
        navLinks.style.display === 'flex' ? 'none' : 'flex';
});