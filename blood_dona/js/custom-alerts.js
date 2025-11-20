/**
 * Custom Alert System
 * Provides styled confirm and alert dialogs
 */

// Custom Confirm Dialog
function customConfirm(message, title = 'localhost:5000 says') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        // Create alert box
        const alertBox = document.createElement('div');
        alertBox.className = 'custom-alert-box';
        
        alertBox.innerHTML = `
            <div class="custom-alert-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-alert-body">
                ${message}
            </div>
            <div class="custom-alert-footer">
                <button class="custom-alert-btn custom-alert-btn-primary" id="customConfirmOk">OK</button>
                <button class="custom-alert-btn custom-alert-btn-secondary" id="customConfirmCancel">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
        
        // Handle OK button
        const okBtn = document.getElementById('customConfirmOk');
        okBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        // Handle Cancel button
        const cancelBtn = document.getElementById('customConfirmCancel');
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
        
        // Handle overlay click (close on background click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(false);
            }
        });
        
        // Handle Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Focus OK button
        okBtn.focus();
    });
}

// Custom Alert Dialog
function customAlert(message, title = 'localhost:5000 says') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        // Create alert box
        const alertBox = document.createElement('div');
        alertBox.className = 'custom-alert-box';
        
        alertBox.innerHTML = `
            <div class="custom-alert-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-alert-body">
                ${message}
            </div>
            <div class="custom-alert-footer">
                <button class="custom-alert-btn custom-alert-btn-primary" id="customAlertOk">OK</button>
            </div>
        `;
        
        overlay.appendChild(alertBox);
        document.body.appendChild(overlay);
        
        // Handle OK button
        const okBtn = document.getElementById('customAlertOk');
        okBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        // Handle overlay click (close on background click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(true);
            }
        });
        
        // Handle Enter and Escape keys
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', keyHandler);
                resolve(true);
            }
        };
        document.addEventListener('keydown', keyHandler);
        
        // Focus OK button
        okBtn.focus();
    });
}
