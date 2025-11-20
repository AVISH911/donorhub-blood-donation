/**
 * Notification API Module
 * Generates notifications from database data (blood requests, camps, donors)
 */

/**
 * Loads recent activities from the database and generates notifications
 * @returns {Promise<Array>} - Array of notification objects
 */
async function loadNotifications() {
    try {
        console.log('Fetching data from APIs...');
        
        // Load recent data from all endpoints
        const [requestsData, campsData, donorsData] = await Promise.all([
            apiCall('/requests', 'GET').catch(err => { console.error('Requests error:', err); return []; }),
            apiCall('/camps', 'GET').catch(err => { console.error('Camps error:', err); return []; }),
            apiCall('/donors', 'GET').catch(err => { console.error('Donors error:', err); return []; })
        ]);

        console.log('📦 API Responses:', { requestsData, campsData, donorsData });

        // Handle different response formats
        const requests = Array.isArray(requestsData) ? requestsData : (requestsData?.data || requestsData?.requests || []);
        const camps = Array.isArray(campsData) ? campsData : (campsData?.data || campsData?.camps || []);
        const donors = Array.isArray(donorsData) ? donorsData : (donorsData?.data || donorsData?.donors || []);

        console.log('✅ Parsed data:', { 
            requests: requests.length, 
            camps: camps.length, 
            donors: donors.length 
        });
        
        console.log('📋 Requests:', requests);
        console.log('🏕️ Camps:', camps);
        console.log('👥 Donors:', donors);

        const notifications = [];

        // Sort requests by creation date (latest first)
        const sortedRequests = Array.isArray(requests) 
            ? requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            : [];

        // Generate notifications from blood requests (urgent ones)
        console.log('🩸 Generating notifications from', sortedRequests.length, 'blood requests...');
        if (sortedRequests.length > 0) {
            sortedRequests.slice(0, 5).forEach(request => {
                const isUrgent = request.urgency === 'urgent' || request.urgency === 'critical';
                console.log(`   Adding request notification: ${request.patientName} - ${request.bloodType}`);
                notifications.push({
                    id: `request-${request._id}`,
                    type: isUrgent ? 'urgent' : 'info',
                    icon: 'fa-exclamation-circle',
                    title: `${isUrgent ? 'Urgent: ' : ''}Blood Request - ${request.bloodType}`,
                    message: `${request.patientName} needs ${request.unitsNeeded} units of ${request.bloodType} blood at ${request.hospital}, ${request.city}`,
                    time: getTimeAgo(request.createdAt),
                    timestamp: new Date(request.createdAt),
                    unread: isRecent(request.createdAt, 24), // Unread if within 24 hours
                    actionText: 'View Request',
                    actionLink: 'blood_request.html'
                });
            });
        }

        // Sort camps by date (nearest first)
        const sortedCamps = Array.isArray(camps)
            ? camps.sort((a, b) => new Date(a.date) - new Date(b.date))
            : [];

        // Generate notifications from camps (recent and upcoming)
        console.log('🏕️ Generating notifications from', sortedCamps.length, 'camps...');
        if (sortedCamps.length > 0) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            
            // Show camps from last 30 days OR upcoming camps
            const relevantCamps = sortedCamps.filter(camp => {
                const campDate = new Date(camp.date);
                return campDate > thirtyDaysAgo; // Show if within last 30 days or future
            });
            
            console.log(`   Found ${relevantCamps.length} relevant camps (recent or upcoming)`);
            
            relevantCamps.slice(0, 5).forEach(camp => {
                const campDate = new Date(camp.date);
                const isUpcoming = campDate > now;
                const daysDiff = Math.ceil((campDate - now) / (1000 * 60 * 60 * 24));
                
                console.log(`   Adding camp notification: ${camp.title} on ${campDate.toDateString()} (${isUpcoming ? 'upcoming' : 'past'})`);
                
                let timeText;
                let notificationType;
                
                if (isUpcoming) {
                    timeText = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : `In ${daysDiff} days`;
                    notificationType = daysDiff <= 3 ? 'reminder' : 'info';
                } else {
                    const daysAgo = Math.abs(daysDiff);
                    timeText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
                    notificationType = 'success';
                }
                
                notifications.push({
                    id: `camp-${camp._id}`,
                    type: notificationType,
                    icon: isUpcoming ? 'fa-hospital' : 'fa-check-circle',
                    title: isUpcoming ? `Upcoming Camp: ${camp.title}` : `Recent Camp: ${camp.title}`,
                    message: `Organized by ${camp.organizer} at ${camp.location}, ${camp.city}. ${camp.donorsRegistered || 0}/${camp.targetDonors} donors registered.`,
                    time: timeText,
                    timestamp: campDate,
                    unread: isUpcoming && daysDiff <= 7,
                    actionText: isUpcoming ? 'Register Now' : 'View Details',
                    actionLink: 'blood_donation_camp.html'
                });
            });
        }

        // Sort donors by creation date (latest first)
        const sortedDonors = Array.isArray(donors)
            ? donors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            : [];

        // Generate notifications from recent donor registrations
        console.log('👥 Generating notifications from', sortedDonors.length, 'donors...');
        if (sortedDonors.length > 0) {
            const recentDonors = sortedDonors.slice(0, 3);
            console.log(`   Processing ${recentDonors.length} recent donors`);
            recentDonors.forEach(donor => {
                console.log(`   Adding donor notification: ${donor.firstName} ${donor.lastName}`);

                notifications.push({
                    id: `donor-${donor._id}`,
                    type: 'success',
                    icon: 'fa-user-plus',
                    title: 'New Donor Registered',
                    message: `${donor.firstName} ${donor.lastName} (${donor.bloodGroup}) from ${donor.city} joined as a donor.`,
                    time: getTimeAgo(donor.createdAt),
                    timestamp: new Date(donor.createdAt),
                    unread: isRecent(donor.createdAt, 48),
                    actionText: 'View Profile',
                    actionLink: 'find_donor.html'
                });
            });
        }

        // Sort notifications by timestamp (most recent first)
        notifications.sort((a, b) => b.timestamp - a.timestamp);

        console.log('Generated notifications:', notifications.length);
        console.log('Notifications:', notifications);

        return notifications;

    } catch (error) {
        console.error('Error loading notifications:', error);
        console.error('Error stack:', error.stack);
        return [];
    }
}

/**
 * Checks if a date is recent (within specified hours)
 * @param {string} dateString - ISO date string
 * @param {number} hours - Number of hours to consider as recent
 * @returns {boolean}
 */
function isRecent(dateString, hours) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    return diffHours <= hours;
}

/**
 * Converts a date to a relative time string (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
function getTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
}

/**
 * Displays notifications in the DOM
 * @param {Array} notifications - Array of notification objects
 */
function displayNotifications(notifications) {
    console.log('displayNotifications called with:', notifications);
    
    const container = document.querySelector('.notifications-container');
    const emptyState = document.querySelector('.empty-state');

    console.log('Container found:', !!container);
    console.log('Empty state found:', !!emptyState);

    if (!container) {
        console.error('Notifications container not found!');
        return;
    }

    // Clear existing notifications
    container.innerHTML = '';
    console.log('Container cleared');

    // Show empty state if no notifications
    if (!notifications || notifications.length === 0) {
        console.log('No notifications to display');
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    console.log('Displaying', notifications.length, 'notifications');

    if (emptyState) emptyState.style.display = 'none';

    // Render each notification
    notifications.forEach(notification => {
        const notificationEl = createNotificationElement(notification);
        container.appendChild(notificationEl);
    });

    // Update unread count
    updateUnreadCount();

    // Attach event listeners
    attachNotificationEventListeners();
}

/**
 * Creates a notification DOM element
 * @param {Object} notification - Notification data object
 * @returns {HTMLElement}
 */
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.unread ? 'unread' : ''}`;
    div.setAttribute('data-type', notification.type);
    div.setAttribute('data-id', notification.id);

    div.innerHTML = `
        <div class="notification-icon ${notification.type}">
            <i class="fas ${notification.icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-header">
                <h4>${notification.title}</h4>
                <span class="notification-time">${notification.time}</span>
            </div>
            <p class="notification-message">${notification.message}</p>
            <div class="notification-actions">
                <button class="action-btn primary" onclick="window.location.href='${notification.actionLink}'">${notification.actionText}</button>
                <button class="action-btn mark-read">Mark as Read</button>
                <button class="action-btn delete">Delete</button>
            </div>
        </div>
    `;

    return div;
}

/**
 * Attaches event listeners to notification action buttons
 */
function attachNotificationEventListeners() {
    // Mark as read buttons
    document.querySelectorAll('.mark-read').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const notification = e.target.closest('.notification-item');
            notification.classList.remove('unread');
            updateUnreadCount();
        });
    });

    // Delete buttons
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const notification = e.target.closest('.notification-item');
            notification.remove();
            
            // Check if all notifications are deleted
            const visibleNotifications = document.querySelectorAll('.notification-item');
            if (visibleNotifications.length === 0) {
                const emptyState = document.querySelector('.empty-state');
                if (emptyState) emptyState.style.display = 'block';
            }
            
            updateUnreadCount();
        });
    });
}

/**
 * Updates the unread notification count badge
 */
function updateUnreadCount() {
    const unreadItems = document.querySelectorAll('.notification-item.unread');
    const unreadCountEl = document.getElementById('unreadCount');
    if (unreadCountEl) {
        unreadCountEl.textContent = unreadItems.length;
    }
}

/**
 * Filters notifications by type
 * @param {string} type - Notification type (all, urgent, reminder, info, success)
 */
function filterNotifications(type) {
    const notifications = document.querySelectorAll('.notification-item');
    
    notifications.forEach(notification => {
        if (type === 'all') {
            notification.style.display = 'flex';
        } else {
            const notificationType = notification.getAttribute('data-type');
            notification.style.display = notificationType === type ? 'flex' : 'none';
        }
    });

    // Check if any notifications are visible
    const visibleNotifications = Array.from(notifications).filter(n => n.style.display !== 'none');
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.style.display = visibleNotifications.length === 0 ? 'block' : 'none';
    }
}
