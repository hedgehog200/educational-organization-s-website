document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the correct page
    if (!document.querySelector('.welcome-section')) {
        return; // Exit if not on the dashboard page
    }
    
    // Fetch student data
    fetchStudentData();
    
    // Setup notification interactions
    setupNotifications();
    
    // Setup event reminder functionality
    setupEventReminders();
});

async function fetchStudentData() {
    try {
        // Fetch user profile
        const profileResponse = await fetch('/api/auth/user');
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
            throw new Error('User not authenticated');
        }
        
        // Fetch user stats
        const statsResponse = await fetch('/api/user/stats');
        const statsData = await statsResponse.json();
        
        // Fetch user events
        const eventsResponse = await fetch('/api/user/events');
        const eventsData = await eventsResponse.json();
        
        // Update welcome section
        const welcomeH2 = document.querySelector('.welcome-section h2');
        const welcomeP = document.querySelector('.welcome-section p');
        
        if (welcomeH2) {
            welcomeH2.textContent = `Добро пожаловать, ${profileData.user.full_name}!`;
        }
        
        if (welcomeP) {
            welcomeP.textContent = `Специальность: ${profileData.user.specialty}`;
        }
        
        // Show admin navigation if user is admin
        if (profileData.user.role === 'admin') {
            const adminNavItem = document.getElementById('adminNavItem');
            if (adminNavItem) {
                adminNavItem.style.display = 'block';
            }
        }
        
        // Update stats
        if (statsData.success) {
            updateStats(statsData.stats);
        }
        
        // Update assignments
        if (eventsData.success) {
            updateEvents(eventsData.events);
        }
        
    } catch (error) {
        console.error('Error fetching student data:', error);
        // Show fallback data
        showFallbackData();
    }
}

function updateStats(stats) {
    const statCards = document.querySelectorAll('.stat-card p');
    if (statCards.length >= 4) {
        statCards[0].textContent = stats.averageGrade || '0.0';
        statCards[1].textContent = `${stats.completedAssignments || 0}/${stats.totalAssignments || 0}`;
        statCards[2].textContent = `${stats.attendance || 0}%`;
        statCards[3].textContent = `${stats.semester || 1}/4`;
    }
}

function showFallbackData() {
    // Show fallback data when API is not available
    const statCards = document.querySelectorAll('.stat-card p');
    if (statCards.length >= 4) {
        statCards[0].textContent = '4.2';
        statCards[1].textContent = '8/12';
        statCards[2].textContent = '92%';
        statCards[3].textContent = '3/4';
    }
}

function updateEvents(events) {
    // Update events/assignments section
    const eventsContainer = document.querySelector('.events-container');
    if (!eventsContainer) return;
    
    // Clear existing events
    const eventsList = eventsContainer.querySelector('.events-list');
    if (eventsList) {
        eventsList.innerHTML = '';
        
        // Add events
        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            eventElement.innerHTML = `
                <div class="event-info">
                    <h4>${event.title}</h4>
                    <p>${event.subject}</p>
                    <span class="event-date">${formatDate(event.dueDate)}</span>
                </div>
                <div class="event-actions">
                    <button class="btn btn-sm btn-primary">Просмотр</button>
                </div>
            `;
            eventsList.appendChild(eventElement);
        });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function setupNotifications() {
    const notificationBell = document.querySelector('.notifications i');
    if (notificationBell) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.querySelector('.notifications-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }
    
    // Mark notifications as read
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.remove('unread');
            updateNotificationCount();
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        const dropdown = document.querySelector('.notifications-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    });
}

function updateNotificationCount() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.querySelector('.badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function setupEventReminders() {
    const reminderButtons = document.querySelectorAll('.btn-reminder');
    reminderButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const eventCard = this.closest('.event-card');
            const eventName = eventCard.querySelector('h3').textContent;
            const eventDate = eventCard.querySelector('.event-date .day').textContent + ' ' + 
                             eventCard.querySelector('.event-date .month').textContent;
            const eventDetails = eventCard.querySelector('.event-details p').textContent;
            
            // Send to server to set up reminder
            fetch('php/set_reminder.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventName: eventName,
                    eventDate: eventDate,
                    eventDetails: eventDetails
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Напоминание установлено!');
                } else {
                    alert('Ошибка при установке напоминания');
                }
            });
        });
    });
}

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Show corresponding content
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // If "All" tab is selected, populate it with all assignments
        if (tabId === 'all') {
            populateAllAssignments();
        }
    });
});

// Populate "All" tab with assignments from both active and completed tabs
function populateAllAssignments() {
    const allTabContent = document.getElementById('all-tab').querySelector('.assignments-list');
    const activeAssignments = document.getElementById('active-tab').querySelector('.assignments-list').innerHTML;
    const completedAssignments = document.getElementById('completed-tab').querySelector('.assignments-list').innerHTML;
    
    allTabContent.innerHTML = activeAssignments + completedAssignments;
    
    // Re-attach event listeners to the cloned elements
    attachEventListeners(allTabContent);
}

// Attach event listeners to assignment buttons
function attachEventListeners(container) {
    // View buttons
    container.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', function() {
            const assignmentItem = this.closest('.assignment-item');
            const assignmentId = assignmentItem.getAttribute('data-id');
            viewAssignmentDetails(assignmentId);
        });
    });
    
    // Submit buttons
    container.querySelectorAll('.btn-submit').forEach(button => {
        button.addEventListener('click', function() {
            const assignmentId = this.getAttribute('data-assignment-id');
            openSubmissionModal(assignmentId);
        });
    });
    
    // Feedback buttons
    container.querySelectorAll('.btn-feedback').forEach(button => {
        button.addEventListener('click', function() {
            const assignmentItem = this.closest('.assignment-item');
            const assignmentId = assignmentItem.getAttribute('data-id');
            openFeedbackModal(assignmentId);
        });
    });
}

// Attach event listeners to initial elements
attachEventListeners(document);

// Function to view assignment details (placeholder)
function viewAssignmentDetails(assignmentId) {
    console.log(`Viewing details for assignment ${assignmentId}`);
    // This would typically open a modal or navigate to a details page
    alert(`Просмотр задания #${assignmentId}`);
}

// Function to open submission modal
function openSubmissionModal(assignmentId) {
    const modal = document.getElementById('assignmentModal');
    const assignmentIdInput = document.getElementById('assignment_id');
    const assignmentTitle = document.getElementById('assignment-title');
    const assignmentSubject = document.getElementById('assignment-subject');
    const assignmentDeadline = document.getElementById('assignment-deadline');
    
    // Find the assignment data
    const assignmentItem = document.querySelector(`.assignment-item[data-id="${assignmentId}"]`);
    const title = assignmentItem.querySelector('h3').textContent;
    const subject = assignmentItem.querySelector('.assignment-subject').textContent.trim();
    const deadline = assignmentItem.querySelector('.assignment-deadline').textContent.trim();
    
    // Populate the modal
    assignmentIdInput.value = assignmentId;
    assignmentTitle.textContent = title;
    assignmentSubject.textContent = subject;
    assignmentDeadline.textContent = deadline;
    
    // Show the modal
    modal.style.display = 'block';
}

// Function to open feedback modal
function openFeedbackModal(assignmentId) {
    const modal = document.getElementById('feedbackModal');
    
    // Find the assignment data
    const assignmentItem = document.querySelector(`.assignment-item[data-id="${assignmentId}"]`);
    const title = assignmentItem.querySelector('h3').textContent;
    const subject = assignmentItem.querySelector('.assignment-subject').textContent.trim();
    
    // Populate the modal (in a real app, you would fetch feedback data from the server)
    document.getElementById('feedback-assignment-title').textContent = title;
    document.getElementById('feedback-subject').textContent = subject;
    
    // Show the modal
    modal.style.display = 'block';
}

// Close modals when clicking the X
const closeButtons = document.querySelectorAll('.close-modal');
closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    });
});

// Close modals when clicking outside the content
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Search functionality
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const assignmentItems = document.querySelectorAll('.assignment-item');
        
        assignmentItems.forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const subject = item.querySelector('.assignment-subject').textContent.toLowerCase();
            const description = item.querySelector('.assignment-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || subject.includes(searchTerm) || description.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Filter functionality
const applyFilterBtn = document.querySelector('.apply-filter');
if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', function() {
        // Get selected filter options
        const statusFilters = Array.from(document.querySelectorAll('.filter-group:nth-child(1) input:checked'))
            .map(input => input.parentElement.textContent.trim().toLowerCase());
        
        const subjectFilters = Array.from(document.querySelectorAll('.filter-group:nth-child(2) input:checked'))
            .map(input => input.parentElement.textContent.trim().toLowerCase());
        
        const deadlineFilters = Array.from(document.querySelectorAll('.filter-group:nth-child(3) input:checked'))
            .map(input => input.parentElement.textContent.trim().toLowerCase());
        
        // Apply filters
        const assignmentItems = document.querySelectorAll('.assignment-item');
        assignmentItems.forEach(item => {
            const status = item.querySelector('.assignment-status').textContent.toLowerCase();
            const subject = item.querySelector('.assignment-subject').textContent.toLowerCase();
            
            // Check if the item matches the selected filters
            const matchesStatus = statusFilters.some(filter => status.includes(filter)) || statusFilters.includes('все статусы');
            const matchesSubject = subjectFilters.some(filter => subject.includes(filter)) || subjectFilters.includes('все предметы');
            
            // For deadline, we would need more complex logic in a real app
            // This is a simplified version
            const matchesDeadline = deadlineFilters.includes('все сроки');
            
            if (matchesStatus && matchesSubject && matchesDeadline) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Close the filter dropdown
        const filterOptions = document.querySelector('.filter-options');
        if (filterOptions) {
            filterOptions.style.display = 'none';
        }
    });
}

// Reset filter
const resetFilterBtn = document.querySelector('.reset-filter');
if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', function() {
        // Reset all checkboxes
        document.querySelectorAll('.filter-group input').forEach(input => {
            if (input.parentElement.textContent.trim().toLowerCase().includes('все')) {
                input.checked = true;
            } else {
                input.checked = false;
            }
        });
        
        // Show all assignments
        document.querySelectorAll('.assignment-item').forEach(item => {
            item.style.display = 'block';
        });
    });
}

// Support button
const supportBtn = document.getElementById('supportBtn');
if (supportBtn) {
    supportBtn.addEventListener('click', function() {
        const supportModal = document.getElementById('supportModal');
        if (supportModal) {
            supportModal.style.display = 'block';
        }
    });
}
