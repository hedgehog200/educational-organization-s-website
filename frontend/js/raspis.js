document.addEventListener('DOMContentLoaded', function() {
    
    const currentDate = new Date();
    let currentWeekStart = getWeekStartDate(currentDate);
    let currentView = 'week'; 
    let selectedDay = currentDate;
    
    
    const dateSelector = document.querySelector('.current-week');
    const prevButton = document.querySelector('.btn-prev');
    const nextButton = document.querySelector('.btn-next');
    const viewButtons = document.querySelectorAll('.btn-view');
    const weeklyView = document.querySelector('.schedule-weekly');
    const dailyView = document.querySelector('.schedule-daily');
    const filterForm = document.querySelector('.schedule-filters');
    const resetFilterButton = document.querySelector('.btn-filter-reset');
    const appointmentButtons = document.querySelectorAll('.btn-appointment');
    const appointmentModal = document.getElementById('appointmentModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const supportModal = document.getElementById('supportModal');
    const supportChatButton = document.querySelector('.support-chat-button');
    
    // Initialize the page
    initializePage();
    
    /**
     * Initialize the schedule page
     */
    function initializePage() {
        // Set current week display
        updateDateDisplay();
        
        // Add event listeners
        addEventListeners();
        
        // Load initial schedule data
        loadScheduleData();
    }
    
    /**
     * Add all event listeners
     */
    function addEventListeners() {
        // Navigation buttons
        if (prevButton) {
            prevButton.addEventListener('click', navigatePrevious);
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', navigateNext);
        }
        
        // View toggle buttons
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const view = this.getAttribute('data-view');
                changeView(view);
            });
        });
        
        // Filter reset button
        if (resetFilterButton) {
            resetFilterButton.addEventListener('click', resetFilters);
        }
        
        // Filter change events
        if (filterForm) {
            const filterSelects = filterForm.querySelectorAll('select');
            filterSelects.forEach(select => {
                select.addEventListener('change', applyFilters);
            });
        }
        
        // Appointment buttons
        appointmentButtons.forEach(button => {
            button.addEventListener('click', openAppointmentModal);
        });
        
        // Close modal buttons
        closeModalButtons.forEach(button => {
            button.addEventListener('click', closeAllModals);
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === appointmentModal) {
                appointmentModal.style.display = 'none';
            }
            if (event.target === supportModal) {
                supportModal.style.display = 'none';
            }
        });
        
        // Support chat button
        if (supportChatButton) {
            supportChatButton.addEventListener('click', openSupportChat);
        }
        
        // Appointment form submission
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', submitAppointment);
        }
        
        // Class card click events
        const classCards = document.querySelectorAll('.class-card');
        classCards.forEach(card => {
            card.addEventListener('click', showClassDetails);
        });
        
        // Download buttons
        const downloadButtons = document.querySelectorAll('.download-btn');
        downloadButtons.forEach(button => {
            button.addEventListener('click', downloadSchedule);
        });
    }
    
    /**
     * Navigate to previous week/day
     */
    function navigatePrevious() {
        if (currentView === 'week') {
            // Go to previous week
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        } else {
            // Go to previous day
            selectedDay.setDate(selectedDay.getDate() - 1);
        }
        
        updateDateDisplay();
        loadScheduleData();
    }
    
    /**
     * Navigate to next week/day
     */
    function navigateNext() {
        if (currentView === 'week') {
            // Go to next week
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        } else {
            // Go to next day
            selectedDay.setDate(selectedDay.getDate() + 1);
        }
        
        updateDateDisplay();
        loadScheduleData();
    }
    
    /**
     * Update the date display based on current view
     */
    function updateDateDisplay() {
        if (currentView === 'week') {
            // Format: "12 - 18 сентября 2023"
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const startDay = currentWeekStart.getDate();
            const endDay = weekEnd.getDate();
            const month = getMonthName(weekEnd.getMonth());
            const year = weekEnd.getFullYear();
            
            dateSelector.textContent = `${startDay} - ${endDay} ${month} ${year}`;
        } else {
            // Format: "12 сентября 2023, Понедельник"
            const day = selectedDay.getDate();
            const month = getMonthName(selectedDay.getMonth());
            const year = selectedDay.getFullYear();
            const weekday = getDayName(selectedDay.getDay());
            
            const dailyDateElement = document.querySelector('.daily-date');
            if (dailyDateElement) {
                dailyDateElement.textContent = `${day} ${month} ${year}, ${weekday}`;
            }
        }
    }
    
    /**
     * Change between weekly and daily views
     */
    function changeView(view) {
        currentView = view;
        
        // Update active button
        viewButtons.forEach(button => {
            if (button.getAttribute('data-view') === view) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Show/hide appropriate view
        if (view === 'week') {
            weeklyView.style.display = 'block';
            if (dailyView) dailyView.style.display = 'none';
        } else {
            weeklyView.style.display = 'none';
            if (dailyView) dailyView.style.display = 'block';
            
            // If daily view doesn't exist, create it
            if (!dailyView) {
                createDailyView();
            }
        }
        
        updateDateDisplay();
        loadScheduleData();
    }
    
    /**
     * Create the daily view if it doesn't exist
     */
    function createDailyView() {
        const main = document.querySelector('main');
        
        // Create daily view container
        const dailyViewDiv = document.createElement('section');
        dailyViewDiv.className = 'schedule-daily';
        
        // Create daily header
        const dailyHeader = document.createElement('div');
        dailyHeader.className = 'daily-header';
        
        const dailyDate = document.createElement('div');
        dailyDate.className = 'daily-date';
        
        const dailyNavigation = document.createElement('div');
        dailyNavigation.className = 'daily-navigation';
        
        const todayButton = document.createElement('button');
        todayButton.innerHTML = '<i class="fas fa-calendar-day"></i> Сегодня';
        todayButton.addEventListener('click', goToToday);
        
        dailyNavigation.appendChild(todayButton);
        dailyHeader.appendChild(dailyDate);
        dailyHeader.appendChild(dailyNavigation);
        
        // Create daily classes container
        const dailyClasses = document.createElement('div');
        dailyClasses.className = 'daily-classes';
        
        // Add to the view
        dailyViewDiv.appendChild(dailyHeader);
        dailyViewDiv.appendChild(dailyClasses);
        
        // Insert after weekly view
        weeklyView.insertAdjacentElement('afterend', dailyViewDiv);
        
        // Update reference
        dailyView = dailyViewDiv;
    }
    
    /**
     * Go to today's schedule
     */
    function goToToday() {
        const today = new Date();
        
        if (currentView === 'week') {
            currentWeekStart = getWeekStartDate(today);
        } else {
            selectedDay = today;
        }
        
        updateDateDisplay();
        loadScheduleData();
    }
    
    /**
     * Reset all filters
     */
    function resetFilters(event) {
        if (event) event.preventDefault();
        
        const filterSelects = filterForm.querySelectorAll('select');
        filterSelects.forEach(select => {
            select.value = 'all';
        });
        
        applyFilters();
    }
    
    /**
     * Apply filters to the schedule
     */
    function applyFilters() {
        showLoading();
        
        // Get filter values
        const teacherFilter = document.getElementById('teacher-filter').value;
        const subjectFilter = document.getElementById('subject-filter').value;
        const roomFilter = document.getElementById('room-filter').value;
        
        // Apply filters to class cards
        const classCards = document.querySelectorAll('.class-card');
        
        classCards.forEach(card => {
            let showCard = true;
            
            // Check teacher filter
            if (teacherFilter !== 'all') {
                const teacherText = card.textContent.toLowerCase();
                const teacherName = document.querySelector(`#teacher-filter option[value="${teacherFilter}"]`).textContent.toLowerCase();
                if (!teacherText.includes(teacherName)) {
                    showCard = false;
                }
            }
            
            // Check subject filter
            if (subjectFilter !== 'all' && showCard) {
                const subjectText = card.querySelector('h3').textContent.toLowerCase();
                const subjectName = document.querySelector(`#subject-filter option[value="${subjectFilter}"]`).textContent.toLowerCase();
                if (!subjectText.includes(subjectName)) {
                    showCard = false;
                }
            }
            
            // Check room filter
            if (roomFilter !== 'all' && showCard) {
                const roomText = card.textContent.toLowerCase();
                if (!roomText.includes(`ауд. ${roomFilter.toLowerCase()}`)) {
                    showCard = false;
                }
            }
            
            // Show/hide card
            if (showCard) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
        
        hideLoading();
    }
    
    /**
     * Open the appointment modal
     */
    function openAppointmentModal(event) {
        // Get teacher info from the clicked button's parent
        const teacherItem = this.closest('.teacher-item');
        const teacherName = teacherItem.querySelector('h3').textContent;
        const subjectName = teacherItem.querySelector('p').textContent;
        
        // Populate the form
        document.getElementById('teacher').value = teacherName;
        document.getElementById('subject').value = subjectName;
        
        // Clear previous options
        const dateSelect = document.getElementById('appointment_date');
        const timeSelect = document.getElementById('appointment_time');
        
        dateSelect.innerHTML = '<option value="">Выберите дату</option>';
        timeSelect.innerHTML = '<option value="">Выберите время</option>';
        
        // Add dummy dates (in real app, these would come from the server)
        const today = new Date();
        for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            const option = document.createElement('option');
            option.value = formatDateForInput(date);
            option.textContent = formatDateForDisplay(date);
            dateSelect.appendChild(option);
        }
        
        // Show the modal
        appointmentModal.style.display = 'block';
    }
    
    /**
     * Handle date selection in appointment form
     */
    document.getElementById('appointment_date').addEventListener('change', function() {
        const selectedDate = this.value;
        const timeSelect = document.getElementById('appointment_time');
        
        // Clear previous options
        timeSelect.innerHTML = '<option value="">Выберите время</option>';
        
        // Add dummy time slots (in real app, these would come from the server)
        const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
        
        timeSlots.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });
    });
    
    /**
     * Submit appointment form
     */
    function submitAppointment(event) {
        event.preventDefault();
        
        // Get form data
        const teacher = document.getElementById('teacher').value;
        const subject = document.getElementById('subject').value;
        const date = document.getElementById('appointment_date').value;
        const time = document.getElementById('appointment_time').value;
        const reason = document.getElementById('appointment_reason').value;
        
        // Validate form
        if (!date || !time || !reason) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }
        
        // Show loading
        showLoading();
        
        // Simulate API call
        setTimeout(() => {
            // Hide loading
            hideLoading();
            
            // Close modal
            appointmentModal.style.display = 'none';
            
            // Show success message
            alert(`Вы успешно записаны на консультацию к преподавателю ${teacher} по предмету "${subject}" на ${formatDateForDisplay(new Date(date))} в ${time}.`);
            
            // Reset form
            document.getElementById('appointmentForm').reset();
        }, 1000);
    }
    
    /**
     * Open support chat modal
     */
    function openSupportChat() {
        supportModal.style.display = 'block';
    }
    
    /**
     * Close all modals
     */
    function closeAllModals() {
        appointmentModal.style.display = 'none';
        supportModal.style.display = 'none';
    }
    
    /**
     * Show class details when clicking on a class card
     */
    function showClassDetails() {
        const className = this.querySelector('h3').textContent;
        const classType = this.querySelector('p').textContent;
        const classLocation = this.textContent.match(/Ауд\. (\d+)/i) ? this.textContent.match(/Ауд\. (\d+)/i)[0] : 'Не указана';
        const classTeacher = this.textContent.match(/[А-Я][а-я]+ [А-Я]\.[А-Я]\./) ? this.textContent.match(/[А-Я][а-я]+ [А-Я]\.[А-Я]\./)[0] : 'Не указан';
        
        // Create a custom modal for class details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Close button
        const closeButton = document.createElement('span');
        closeButton.className = 'close-modal';
        closeButton.innerHTML = '×';
        closeButton.onclick = function() {
            document.body.removeChild(modal);
        };
        
        // Class details content
        const content = `
            <h2>${className}</h2>
            <div class="class-details">
                <p><strong>Тип занятия:</strong> ${classType}</p>
                <p><strong>Аудитория:</strong> ${classLocation}</p>
                <p><strong>Преподаватель:</strong> ${classTeacher}</p>
                
                <div class="class-materials">
                    <h3>Материалы к занятию</h3>
                    <ul>
                        <li><a href="#"><i class="fas fa-file-pdf"></i> Лекция.pdf</a></li>
                        <li><a href="#"><i class="fas fa-file-powerpoint"></i> Презентация.pptx</a></li>
                        <li><a href="#"><i class="fas fa-tasks"></i> Задания к занятию</a></li>
                    </ul>
                </div>
                
                <div class="class-actions">
                    <button class="btn-reminder"><i class="fas fa-bell"></i> Напомнить</button>
                    <button class="btn-calendar"><i class="fas fa-calendar-plus"></i> Добавить в календарь</button>
                </div>
            </div>
        `;
        
        modalContent.innerHTML = content;
        modalContent.prepend(closeButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close when clicking outside
        window.onclick = function(event) {
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }    
    /**
     * Download schedule in different formats
     */
    function downloadSchedule(event) {
        event.preventDefault();
        
        const format = this.textContent.trim().toLowerCase();
        showLoading();
        
        // Simulate download delay
        setTimeout(() => {
            hideLoading();
            
            // In a real application, this would trigger a server request
            // to generate the appropriate file format
            if (format.includes('pdf')) {
                alert('Расписание в формате PDF успешно скачано');
            } else if (format.includes('excel')) {
                alert('Расписание в формате Excel успешно скачано');
            } else if (format.includes('ical')) {
                alert('Расписание в формате iCal успешно скачано');
            }
        }, 1000);
    }
    
    /**
     * Load schedule data from server
     * In this demo, we're just simulating the loading
     */
    function loadScheduleData() {
        showLoading();
        
        // Simulate API call delay
        setTimeout(() => {
            // In a real application, this would fetch data from the server
            // based on the selected date range and filters
            
            // For demo purposes, we'll just update the current classes
            highlightCurrentClass();
            
            hideLoading();
        }, 500);
    }
    
    /**
     * Highlight the current class in the schedule
     */
    function highlightCurrentClass() {
        // Remove previous highlights
        const allClasses = document.querySelectorAll('.class-card');
        allClasses.forEach(card => {
            card.classList.remove('current');
        });
        
        // Get current time
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Only highlight if we're in week view and it's a weekday
        if (currentView === 'week' && currentDay >= 1 && currentDay <= 5) {
            // Find the column for the current day (adjust for Sunday being 0)
            const dayColumn = document.querySelectorAll('.day-column')[currentDay - 1];
            
            if (dayColumn) {
                // Find all classes in this day
                const classes = dayColumn.querySelectorAll('.class-card');
                
                // Check each class time
                classes.forEach(classCard => {
                    // Extract time from parent element or from the card text
                    let timeText = '';
                    const parentTimeSlot = classCard.closest('.time-slot');
                    
                    if (parentTimeSlot) {
                        timeText = parentTimeSlot.textContent;
                    } else {
                        // Try to find time in the card text
                        const timeMatch = classCard.textContent.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
                        if (timeMatch) {
                            timeText = timeMatch[0];
                        }
                    }
                    
                    // Parse time range
                    const timeRange = parseTimeRange(timeText);
                    
                    if (timeRange) {
                        const { startHour, startMinute, endHour, endMinute } = timeRange;
                        
                        // Calculate current time in minutes since midnight
                        const currentTimeInMinutes = currentHour * 60 + currentMinute;
                        
                        // Calculate class start and end in minutes since midnight
                        const classStartInMinutes = startHour * 60 + startMinute;
                        const classEndInMinutes = endHour * 60 + endMinute;
                        
                        // Check if current time is within class time
                        if (currentTimeInMinutes >= classStartInMinutes && currentTimeInMinutes <= classEndInMinutes) {
                            classCard.classList.add('current');
                        }
                    }
                });
            }
        }
    }
    
    /**
     * Parse a time range string like "8:30 - 10:00"
     */
    function parseTimeRange(timeText) {
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        
        if (timeMatch) {
            return {
                startHour: parseInt(timeMatch[1], 10),
                startMinute: parseInt(timeMatch[2], 10),
                endHour: parseInt(timeMatch[3], 10),
                endMinute: parseInt(timeMatch[4], 10)
            };
        }
        
        return null;
    }
    
    // Функция showLoading перенесена в utils.js
    
    /**
     * Hide loading indicator
     */
    function hideLoading() {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Get the start date of the week containing the given date
     */
    function getWeekStartDate(date) {
        const result = new Date(date);
        const day = result.getDay();
        
        // Adjust to get Monday as the first day
        const diff = result.getDate() - day + (day === 0 ? -6 : 1);
        result.setDate(diff);
        
        return result;
    }
    
    /**
     * Format a date for display
     */
    function formatDateForDisplay(date) {
        const day = date.getDate();
        const month = getMonthName(date.getMonth());
        const weekday = getDayName(date.getDay());
        
        return `${day} ${month}, ${weekday}`;
    }
    
    /**
     * Format a date for input fields
     */
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Get month name in Russian
     */
    function getMonthName(monthIndex) {
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        
        return months[monthIndex];
    }
    
    /**
     * Get day name in Russian
     */
    function getDayName(dayIndex) {
        const days = [
            'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
            'Четверг', 'Пятница', 'Суббота'
        ];
        
        return days[dayIndex];
    }
    
    // Support chat functionality
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    
    if (sendMessageButton && messageInput && chatMessages) {
        sendMessageButton.addEventListener('click', sendMessage);
        
        // Allow sending message with Enter key
        messageInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
    
    /**
     * Send a message in the support chat
     */
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (message) {
            // Add user message to chat
            const userMessageHTML = `
                <div class="message user">
                    <div class="message-content">
                        <p>${escapeHTML(message)}</p>
                        <span class="message-time">${getCurrentTime()}</span>
                    </div>
                </div>
            `;
            
            chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
            
            // Clear input
            messageInput.value = '';
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Simulate response after a short delay
            setTimeout(() => {
                const supportMessageHTML = `
                    <div class="message support">
                        <div class="message-content">
                            <p>Спасибо за ваше сообщение! Мы обработаем ваш запрос в ближайшее время.</p>
                            <span class="message-time">${getCurrentTime()}</span>
                        </div>
                    </div>
                `;
                
                chatMessages.insertAdjacentHTML('beforeend', supportMessageHTML);
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }
    }
    
    /**
     * Get current time formatted as HH:MM
     */
    function getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    /**
     * Escape HTML special characters to prevent XSS
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add reminder functionality
    document.querySelectorAll('.btn-reminder').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent triggering parent card click
            
            // Get event details from the parent card
            const card = this.closest('.event-card') || this.closest('.class-card');
            const eventTitle = card.querySelector('h3').textContent;
            
            // Show confirmation
            alert(`Напоминание о событии "${eventTitle}" будет отправлено за 1 час до начала.`);
        });
    });
    
    // Add to calendar functionality
    document.querySelectorAll('.btn-calendar').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent triggering parent card click
            
            // Get event details from the parent card
            const card = this.closest('.event-card') || this.closest('.class-card');
            const eventTitle = card.querySelector('h3').textContent;
            
            // Show confirmation
            alert(`Событие "${eventTitle}" добавлено в ваш календарь.`);
        });
    });
    
    // Initialize tooltips
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        const tooltipText = tooltip.getAttribute('data-tooltip');
        if (tooltipText) {
            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'tooltiptext';
            tooltipSpan.textContent = tooltipText;
            tooltip.appendChild(tooltipSpan);
        }
    });
    
    // Print schedule functionality
    const printButton = document.querySelector('.print-schedule');
    if (printButton) {
        printButton.addEventListener('click', function() {
            window.print();
        });
    }
});

