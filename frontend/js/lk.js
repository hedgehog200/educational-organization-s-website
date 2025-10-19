// Student Dashboard JavaScript
// Modern student dashboard with beautiful UI

document.addEventListener('DOMContentLoaded', function() {
    initializeStudentDashboard();
});

// Initialize student dashboard
async function initializeStudentDashboard() {
    try {
        console.log('Initializing student dashboard...');
        
        // Check authentication
        await checkAuthentication();
        
        // Initialize navigation
        initializeNavigation();
        
        // Load initial data
        await loadDashboardData();
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('Student dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing student dashboard:', error);
        showNotification('Ошибка инициализации кабинета', 'error');
    }
}

// Check user authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/index.html';
        return;
    }
    
    try {
        // Verify token with server
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Update student name and info
            document.getElementById('studentName').textContent = user.fullName || user.name || 'Студент';
            document.getElementById('welcomeName').textContent = user.fullName || user.name || 'Студент';
            
            // Update student info
            const studentInfo = document.getElementById('studentInfo');
            if (studentInfo) {
                studentInfo.textContent = `Группа: ${user.group_name || 'Не указана'} | Специальность: ${user.specialty || 'Не указана'}`;
            }
            
            // Show admin navigation if user is admin
            if (user.role === 'admin') {
                const adminNavItem = document.getElementById('adminNavItem');
                if (adminNavItem) {
                    adminNavItem.style.display = 'block';
                }
            }
            
            localStorage.setItem('userData', JSON.stringify(user));
            
        } else {
            console.log('Token verification failed, redirecting to login');
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/index.html';
    }
}

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                const sectionId = href.substring(1);
                showSection(sectionId);
                
                // Update active state
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                this.parentElement.classList.add('active');
            }
        });
    });
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.student-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section data if needed
        loadSectionData(sectionId);
    }
}

// Load data for specific section
async function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'schedule':
            await loadScheduleData();
            break;
        case 'materials':
            await loadMaterialsData();
            break;
        case 'assignments':
            await loadAssignmentsData();
            break;
        case 'performance':
            await loadPerformanceData();
            break;
        case 'attendance':
            await loadAttendanceData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load student statistics
        await loadStudentStats();
        
        // Load upcoming events
        await loadUpcomingEvents();
        
        // Load recent assignments
        await loadRecentAssignments();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Ошибка загрузки данных панели', 'error');
    } finally {
        showLoading(false);
    }
}

// Load student statistics
async function loadStudentStats() {
    try {
        const response = await fetch('/api/user/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateStudentStats(data.stats);
            }
        }
    } catch (error) {
        console.error('Error loading student stats:', error);
        // Use default values if API fails
        updateStudentStats({
            averageGrade: 4.7,
            completedAssignments: '24/30',
            attendanceRate: '92%',
            currentSemester: '3/8'
        });
    }
}

// Update student statistics
function updateStudentStats(stats) {
    const elements = {
        averageGrade: document.getElementById('averageGrade'),
        completedAssignments: document.getElementById('completedAssignments'),
        attendanceRate: document.getElementById('attendanceRate'),
        currentSemester: document.getElementById('currentSemester')
    };
    
    if (elements.averageGrade) elements.averageGrade.textContent = stats.averageGrade || '4.7';
    if (elements.completedAssignments) elements.completedAssignments.textContent = stats.completedAssignments || '24/30';
    if (elements.attendanceRate) elements.attendanceRate.textContent = stats.attendanceRate || '92%';
    if (elements.currentSemester) elements.currentSemester.textContent = stats.currentSemester || '3/8';
}

// Load upcoming events
async function loadUpcomingEvents() {
    // This would typically come from an API
    const events = [
        {
            day: '15',
            month: 'Сен',
            title: 'Контрольная работа',
            description: 'Математика, 10:00 - 11:30, ауд. 305'
        },
        {
            day: '17',
            month: 'Сен',
            title: 'Сдача лабораторной работы',
            description: 'Программирование, 13:00 - 14:30, ауд. 412'
        },
        {
            day: '20',
            month: 'Сен',
            title: 'Конференция',
            description: 'Актовый зал, 15:00 - 17:00'
        }
    ];
    
    const eventsList = document.getElementById('upcomingEvents');
    if (eventsList) {
        eventsList.innerHTML = events.map(event => `
            <div class="event-item">
                <div class="event-date">
                    <span class="day">${event.day}</span>
                    <span class="month">${event.month}</span>
                </div>
                <div class="event-content">
                    <h4>${event.title}</h4>
                    <p>${event.description}</p>
                </div>
                <div class="event-actions">
                    <button class="action-btn" title="Напомнить">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="action-btn" title="Добавить в календарь">
                        <i class="fas fa-calendar-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Load recent assignments
async function loadRecentAssignments() {
    try {
        const response = await fetch('/api/user/assignments?limit=3', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayRecentAssignments(data.assignments);
            }
        }
    } catch (error) {
        console.error('Error loading recent assignments:', error);
        // Use default assignments if API fails
        displayRecentAssignments([
            {
                id: 1,
                title: 'Курсовая работа',
                subject: 'Базы данных',
                deadline: '25 сентября',
                progress: 60,
                status: 'pending'
            },
            {
                id: 2,
                title: 'Лабораторная работа №5',
                subject: 'Программирование',
                deadline: '17 сентября',
                progress: 30,
                status: 'urgent'
            }
        ]);
    }
}

// Display recent assignments
function displayRecentAssignments(assignments) {
    const assignmentsGrid = document.getElementById('recentAssignments');
    if (!assignmentsGrid) return;
    
    assignmentsGrid.innerHTML = assignments.map(assignment => `
        <div class="assignment-card">
            <div class="assignment-header">
                <h3>${assignment.title}</h3>
                <span class="assignment-status ${assignment.status}">${getStatusText(assignment.status)}</span>
            </div>
            <div class="assignment-info">
                <p><i class="fas fa-book"></i> ${assignment.subject}</p>
                <p><i class="fas fa-calendar"></i> Срок сдачи: ${assignment.deadline}</p>
            </div>
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress" style="width: ${assignment.progress}%;"></div>
                </div>
                <span class="progress-text">Выполнено: ${assignment.progress}%</span>
            </div>
        </div>
    `).join('');
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'pending': 'В процессе',
        'urgent': 'Срочно',
        'completed': 'Выполнено',
        'overdue': 'Просрочено'
    };
    return statusTexts[status] || status;
}

// Load schedule data
async function loadScheduleData() {
    try {
        showLoading(true);
        
        // This would typically come from an API
        const scheduleData = generateSampleSchedule();
        displaySchedule(scheduleData);
        
    } catch (error) {
        console.error('Error loading schedule data:', error);
        showNotification('Ошибка загрузки расписания', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate sample schedule data
function generateSampleSchedule() {
    const timeSlots = ['8:30-10:00', '10:15-11:45', '12:30-14:00', '14:15-15:45'];
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const classes = [
        { name: 'Математика', teacher: 'Фатина Т.П.', room: '305' },
        { name: 'Программирование', teacher: 'Сидоров С.С.', room: '412' },
        { name: 'Базы данных', teacher: 'Слепова О.С.', room: '401' },
        { name: 'Информационная безопасность', teacher: 'Кузнецов К.К.', room: '308' }
    ];
    
    const schedule = [];
    
    timeSlots.forEach((time, timeIndex) => {
        days.forEach((day, dayIndex) => {
            if (dayIndex < 5) { // Only weekdays
                const classIndex = (timeIndex + dayIndex) % classes.length;
                schedule.push({
                    time: time,
                    day: dayIndex,
                    class: classes[classIndex]
                });
            }
        });
    });
    
    return schedule;
}

// Display schedule
function displaySchedule(scheduleData) {
    const scheduleBody = document.getElementById('scheduleBody');
    if (!scheduleBody) return;
    
    const timeSlots = ['8:30-10:00', '10:15-11:45', '12:30-14:00', '14:15-15:45'];
    
    scheduleBody.innerHTML = timeSlots.map(time => {
        const daySlots = Array(6).fill(null);
        
        scheduleData.forEach(item => {
            if (item.time === time) {
                daySlots[item.day] = item;
            }
        });
        
        return `
            <div class="schedule-slot time-slot">${time}</div>
            ${daySlots.map(slot => `
                <div class="schedule-slot ${slot ? 'has-class' : ''}">
                    ${slot ? `
                        <div class="schedule-class">
                            <div class="class-name">${slot.class.name}</div>
                            <div class="class-info">${slot.class.teacher}</div>
                            <div class="class-time">Ауд. ${slot.class.room}</div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        `;
    }).join('');
}

// Load materials data
async function loadMaterialsData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/user/materials', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayMaterials(data.materials);
            }
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        // Use default materials if API fails
        displayMaterials([
            {
                id: 1,
                title: 'Лекция №5 по программированию',
                subject: 'Программирование',
                type: 'pdf',
                size: '2.3 MB',
                date: '10 сентября'
            },
            {
                id: 2,
                title: 'Видеолекция по базам данных',
                subject: 'Базы данных',
                type: 'video',
                size: '45 мин',
                date: '8 сентября'
            }
        ]);
    } finally {
        showLoading(false);
    }
}

// Display materials
function displayMaterials(materials) {
    const materialsGrid = document.getElementById('materialsGrid');
    if (!materialsGrid) return;
    
    materialsGrid.innerHTML = materials.map(material => `
        <div class="material-card">
            <div class="material-icon">
                <i class="fas fa-${material.type === 'pdf' ? 'file-pdf' : 'file-video'}"></i>
            </div>
            <div class="material-content">
                <h3>${material.title}</h3>
                <p>Добавлено: ${material.date}</p>
                <div class="material-meta">
                    <span class="subject-tag">${material.subject}</span>
                    <span class="file-size">${material.size}</span>
                </div>
            </div>
            <div class="material-actions">
                <button class="btn-primary" onclick="${material.type === 'pdf' ? 'downloadMaterial' : 'watchVideo'}(${material.id})">
                    <i class="fas fa-${material.type === 'pdf' ? 'download' : 'play'}"></i> 
                    ${material.type === 'pdf' ? 'Скачать' : 'Смотреть'}
                </button>
            </div>
        </div>
    `).join('');
}

// Load assignments data
async function loadAssignmentsData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/user/assignments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayAssignments(data.assignments);
            }
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showNotification('Ошибка загрузки заданий', 'error');
    } finally {
        showLoading(false);
    }
}

// Display assignments
function displayAssignments(assignments) {
    const assignmentsList = document.getElementById('assignmentsList');
    if (!assignmentsList) return;
    
    if (assignments.length === 0) {
        assignmentsList.innerHTML = '<div class="loading">Задания не найдены</div>';
        return;
    }
    
    assignmentsList.innerHTML = assignments.map(assignment => `
        <div class="assignment-item">
            <div class="assignment-header">
                <h3>${assignment.title}</h3>
                <span class="assignment-status ${assignment.status}">${getStatusText(assignment.status)}</span>
            </div>
            <div class="assignment-details">
                <p><i class="fas fa-book"></i> ${assignment.subject}</p>
                <p><i class="fas fa-calendar"></i> Срок сдачи: ${assignment.deadline}</p>
                <p><i class="fas fa-user"></i> Преподаватель: ${assignment.teacher}</p>
            </div>
            <div class="assignment-progress">
                <div class="progress-bar">
                    <div class="progress" style="width: ${assignment.progress}%;"></div>
                </div>
                <span class="progress-text">Выполнено: ${assignment.progress}%</span>
            </div>
            <div class="assignment-actions">
                <button class="btn-primary" onclick="submitAssignment(${assignment.id})">
                    <i class="fas fa-upload"></i> Сдать работу
                </button>
                <button class="btn-secondary" onclick="viewAssignment(${assignment.id})">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        </div>
    `).join('');
}

// Load performance data
async function loadPerformanceData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/user/performance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayPerformance(data.performance);
            }
        }
    } catch (error) {
        console.error('Error loading performance data:', error);
        showNotification('Ошибка загрузки данных успеваемости', 'error');
    } finally {
        showLoading(false);
    }
}

// Display performance data
function displayPerformance(performance) {
    // This would display performance charts and statistics
    console.log('Performance data:', performance);
}

// Load attendance data
async function loadAttendanceData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/user/attendance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayAttendance(data.attendance);
            }
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

// Display attendance data
function displayAttendance(attendance) {
    // This would display attendance calendar and statistics
    console.log('Attendance data:', attendance);
}

// Initialize event listeners
function initializeEventListeners() {
    // Material search
    const materialSearch = document.getElementById('materialSearch');
    if (materialSearch) {
        materialSearch.addEventListener('input', function() {
            searchMaterials(this.value);
        });
    }
    
    // Subject filter
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        subjectFilter.addEventListener('change', function() {
            filterMaterials(this.value);
        });
    }
    
    // Assignment filters
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.textContent.toLowerCase();
            filterAssignments(filter);
            
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Search materials
function searchMaterials(query) {
    const materialCards = document.querySelectorAll('.material-card');
    const searchTerm = query.toLowerCase();
    
    materialCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filter materials by subject
function filterMaterials(subject) {
    const materialCards = document.querySelectorAll('.material-card');
    
    materialCards.forEach(card => {
        if (!subject || card.querySelector('.subject-tag').textContent === subject) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filter assignments
function filterAssignments(filter) {
    const assignmentItems = document.querySelectorAll('.assignment-item');
    
    assignmentItems.forEach(item => {
        const status = item.querySelector('.assignment-status').classList.contains(filter);
        
        if (filter === 'all' || status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Утилиты перенесены в utils.js

// Modal functions
function showProfileModal() {
    showModal('profileModal');
}

// Action functions
function downloadMaterial(materialId) {
    showNotification('Скачивание материала...', 'info');
    // Implement download logic
}

function watchVideo(videoId) {
    showNotification('Открытие видео...', 'info');
    // Implement video watching logic
}

function submitAssignment(assignmentId) {
    showNotification('Функция сдачи задания будет добавлена позже', 'info');
    // Implement assignment submission logic
}

function viewAssignment(assignmentId) {
    showNotification('Функция просмотра задания будет добавлена позже', 'info');
    // Implement assignment viewing logic
}

function editProfile() {
    showNotification('Функция редактирования профиля будет добавлена позже', 'info');
    // Implement profile editing logic
}

// Schedule navigation
function previousWeek() {
    showNotification('Переход к предыдущей неделе', 'info');
    // Implement week navigation
}

function nextWeek() {
    showNotification('Переход к следующей неделе', 'info');
    // Implement week navigation
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;
document.head.appendChild(style);
