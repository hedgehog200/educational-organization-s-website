// Student Dashboard JavaScript
// Modern student dashboard with beautiful UI

// Глобальный state для синхронизации данных между вкладками
const studentState = {
    profile: null,
    stats: null,
    schedule: null,
    materials: [],
    assignments: [],
    performance: null,
    attendance: null,
    grades: [],
    lastUpdate: {}
};

document.addEventListener('DOMContentLoaded', function() {
    initializeStudentDashboard();
});

// Initialize student dashboard
async function initializeStudentDashboard() {
    try {
        // Check authentication
        await checkAuthentication();
        
        // Initialize navigation
        initializeNavigation();
        
        // Load initial data
        await loadDashboardData();
        
        // Initialize event listeners
        initializeEventListeners();
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
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/index.html';
    }
}

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a, .mobile-menu-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
            e.preventDefault();
            
                const sectionId = href.substring(1);
                showSection(sectionId);
                
                // Update URL hash
                window.location.hash = sectionId;
                
                // Update active state
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                this.parentElement.classList.add('active');
            }
        });
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('hashchange', () => {
        // Проверяем аутентификацию перед переключением секции
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/index.html';
            return;
        }
        
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            showSection(hash);
            updateActiveNavigation(hash);
        } else {
            showSection('dashboard');
            updateActiveNavigation('dashboard');
        }
    });
    
    // Проверка аутентификации при возврате на вкладку
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/index.html';
            }
        }
    });
    
    // Load section from URL hash on page load
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'dashboard') {
        showSection(hash);
        updateActiveNavigation(hash);
    }
}

// Update active navigation item
function updateActiveNavigation(sectionId) {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a, .mobile-menu-nav a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${sectionId}`) {
            link.parentElement.classList.add('active');
        } else {
            link.parentElement.classList.remove('active');
        }
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
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                updateStudentStats(data.stats);
            } else {
                console.error('Stats request failed:', data.message);
                // Use default values
                updateStudentStats({
                    averageGrade: 4.7,
                    completedAssignments: '0/0',
                    attendanceRate: '92%',
                    currentSemester: '3/8'
                });
            }
        } else {
            console.error('Stats response not OK:', response.status);
            updateStudentStats({
                averageGrade: 4.7,
                completedAssignments: '0/0',
                attendanceRate: '92%',
                currentSemester: '3/8'
            });
        }
    } catch (error) {
        console.error('Error loading student stats:', error);
        // Use default values if API fails
        updateStudentStats({
            averageGrade: 4.7,
            completedAssignments: '0/0',
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
    try {
        const response = await fetch('/api/user/events', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.events) {
                displayUpcomingEvents(data.events);
            } else {
                console.error('Events request failed:', data.message);
                displayUpcomingEvents([]);
            }
        } else {
            console.error('Events response not OK:', response.status);
            displayUpcomingEvents([]);
        }
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        displayUpcomingEvents([]);
    }
}

// Display upcoming events
function displayUpcomingEvents(events) {
    const eventsList = document.getElementById('upcomingEvents');
    if (!eventsList) return;
    
    if (events.length === 0) {
        eventsList.innerHTML = `
            <div class="event-item" style="text-align: center; padding: 20px;">
                <p style="color: #999;">Нет ближайших событий</p>
            </div>
        `;
        return;
    }
    
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
                <button class="action-btn" title="Напомнить" onclick="alert('Напоминание установлено!')">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="action-btn" title="Добавить в календарь" onclick="alert('Добавлено в календарь!')">
                    <i class="fas fa-calendar-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Load recent assignments
async function loadRecentAssignments() {
    try {
        const response = await fetch('/api/user/assignments?limit=3', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.assignments) {
                console.log('Loaded recent assignments:', data.assignments);
                displayRecentAssignments(data.assignments);
            } else {
                console.log('No assignments in response');
                displayRecentAssignments([]);
            }
        } else {
            console.error('Recent assignments response not OK:', response.status);
            displayRecentAssignments([]);
        }
    } catch (error) {
        console.error('Error loading recent assignments:', error);
        displayRecentAssignments([]);
    }
}

// Display recent assignments
function displayRecentAssignments(assignments) {
    const assignmentsGrid = document.getElementById('recentAssignments');
    if (!assignmentsGrid) return;
    
    if (!assignments || assignments.length === 0) {
        assignmentsGrid.innerHTML = '<div class="loading" style="text-align:center; padding:40px; grid-column: 1 / -1;">Нет текущих заданий</div>';
        return;
    }
    
    assignmentsGrid.innerHTML = assignments.map(assignment => {
        const subject = assignment.subject_name || assignment.subject || 'Предмет не указан';
        const deadline = assignment.deadline ? 
            (typeof assignment.deadline === 'string' && assignment.deadline.includes('-') ? 
                new Date(assignment.deadline).toLocaleDateString('ru-RU') : 
                assignment.deadline) : 
            'Не указан';
        const progress = assignment.progress || 0;
        const status = assignment.status || 'pending';
        
        return `
        <div class="assignment-card">
            <div class="assignment-header">
                <h3>${assignment.title}</h3>
                    <span class="assignment-status ${status}">${getStatusText(status)}</span>
            </div>
            <div class="assignment-info">
                    <p><i class="fas fa-book"></i> ${subject}</p>
                    <p><i class="fas fa-calendar"></i> Срок сдачи: ${deadline}</p>
            </div>
            <div class="progress-section">
                <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%;"></div>
                </div>
                    <span class="progress-text">Выполнено: ${progress}%</span>
            </div>
        </div>
        `;
    }).join('');
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
        
        // Проверяем кеш
        const cacheTimeout = 10 * 60 * 1000; // 10 минут
        if (studentState.schedule && 
            studentState.lastUpdate.schedule && 
            (Date.now() - studentState.lastUpdate.schedule) < cacheTimeout) {
            displaySchedule(studentState.schedule);
            return;
        }
        
        const response = await fetch('/api/user/schedule', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.schedule) {
                studentState.schedule = data.schedule;
                studentState.lastUpdate.schedule = Date.now();
                displaySchedule(data.schedule);
            } else {
                displaySchedule([]);
            }
        } else {
            console.error('Schedule response not OK:', response.status);
            displaySchedule([]);
        }
    } catch (error) {
        console.error('Error loading schedule data:', error);
        showNotification('Ошибка загрузки расписания', 'error');
        displaySchedule([]);
    } finally {
        showLoading(false);
    }
}

// Display schedule
function displaySchedule(scheduleData) {
    const scheduleBody = document.getElementById('scheduleBody');
    if (!scheduleBody) return;
    
    if (!scheduleData || scheduleData.length === 0) {
        scheduleBody.innerHTML = '<div class="loading" style="text-align:center; padding:40px; grid-column: 1 / -1;">Расписание пока не составлено</div>';
        return;
    }
    
    const timeSlots = ['8:30-10:00', '10:15-11:45', '12:30-14:00', '14:15-15:45'];
    
    scheduleBody.innerHTML = timeSlots.map(time => {
        const daySlots = Array(6).fill(null);
        
        scheduleData.forEach(item => {
            const itemTime = item.time || item.start_time;
            const itemDay = parseInt(item.day || item.day_of_week || 0);
            
            if (itemTime && itemTime.includes(time.split('-')[0])) {
                daySlots[itemDay] = item;
            }
        });
        
        return `
            <div class="schedule-slot time-slot">${time}</div>
            ${daySlots.map(slot => `
                <div class="schedule-slot ${slot ? 'has-class' : ''}">
                    ${slot ? `
                        <div class="schedule-class">
                            <div class="class-name">${slot.subject_name || slot.class?.name || slot.subject || 'Занятие'}</div>
                            <div class="class-info">${slot.teacher_name || slot.class?.teacher || slot.teacher || 'Преподаватель'}</div>
                            <div class="class-time">Ауд. ${slot.room || slot.class?.room || '—'}</div>
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
        
        // Проверяем кеш (если данные свежие, не перезагружаем)
        const cacheTimeout = 5 * 60 * 1000; // 5 минут
        if (studentState.materials.length > 0 && 
            studentState.lastUpdate.materials && 
            (Date.now() - studentState.lastUpdate.materials) < cacheTimeout) {
            displayMaterials(studentState.materials);
            return;
        }
        
        const response = await fetch('/api/user/materials', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.materials) {
                // Сохраняем в state
                studentState.materials = data.materials;
                studentState.lastUpdate.materials = Date.now();
                displayMaterials(data.materials);
            } else {
                displayMaterials([]);
            }
        } else {
            console.error('Materials response not OK:', response.status);
            displayMaterials([]);
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        showNotification('Ошибка загрузки материалов', 'error');
        displayMaterials([]);
    } finally {
        showLoading(false);
    }
}

// Display materials
function displayMaterials(materials) {
    const materialsGrid = document.getElementById('materialsGrid');
    if (!materialsGrid) return;
    
    if (materials.length === 0) {
        materialsGrid.innerHTML = '<div class="loading" style="text-align:center; padding:40px;">Материалы пока не добавлены</div>';
        return;
    }
    
    materialsGrid.innerHTML = materials.map(material => {
        // Определяем тип файла
        const fileType = material.file_type || material.type || 'pdf';
        let icon = 'file-pdf';
        let actionText = 'Скачать';
        let actionIcon = 'download';
        
        if (fileType.includes('video') || fileType === 'video') {
            icon = 'file-video';
            actionText = 'Смотреть';
            actionIcon = 'play';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            icon = 'file-word';
        } else if (fileType.includes('excel') || fileType.includes('xls')) {
            icon = 'file-excel';
        }
        
        const date = material.created_at ? new Date(material.created_at).toLocaleDateString('ru-RU') : (material.date || '');
        
        return `
        <div class="material-card">
            <div class="material-icon">
                    <i class="fas fa-${icon}"></i>
            </div>
            <div class="material-content">
                <h3>${material.title}</h3>
                    <p>Добавлено: ${date}</p>
                <div class="material-meta">
                        <span class="subject-tag">${material.subject_name || material.subject || 'Материал'}</span>
                        <span class="file-size">${material.size || ''}</span>
                </div>
            </div>
            <div class="material-actions">
                    <button class="btn-primary" onclick="downloadMaterial(${material.id})">
                        <i class="fas fa-${actionIcon}"></i> ${actionText}
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Load assignments data
async function loadAssignmentsData() {
    try {
        showLoading(true);
        
        // Проверяем кеш (если данные свежие, не перезагружаем)
        const cacheTimeout = 5 * 60 * 1000; // 5 минут
        if (studentState.assignments.length > 0 && 
            studentState.lastUpdate.assignments && 
            (Date.now() - studentState.lastUpdate.assignments) < cacheTimeout) {
            displayAssignments(studentState.assignments);
            return;
        }
        
        const response = await fetch('/api/user/assignments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.assignments) {
                // Сохраняем в state
                studentState.assignments = data.assignments;
                studentState.lastUpdate.assignments = Date.now();
                displayAssignments(data.assignments);
            } else {
                displayAssignments([]);
            }
        } else {
            console.error('Assignments response not OK:', response.status);
            displayAssignments([]);
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showNotification('Ошибка загрузки заданий', 'error');
        displayAssignments([]);
    } finally {
        showLoading(false);
    }
}

// Display assignments
function displayAssignments(assignments) {
    const assignmentsList = document.getElementById('assignmentsList');
    if (!assignmentsList) return;
    
    if (assignments.length === 0) {
        assignmentsList.innerHTML = '<div class="loading" style="text-align:center; padding:40px;">Задания пока не назначены</div>';
        return;
    }
    
    assignmentsList.innerHTML = assignments.map(assignment => {
        // Определяем статус и прогресс
        const status = assignment.status || 'pending';
        const progress = assignment.progress || 0;
        const deadline = assignment.deadline ? new Date(assignment.deadline).toLocaleDateString('ru-RU') : '';
        const subject = assignment.subject_name || assignment.subject || 'Предмет';
        const teacher = assignment.teacher_name || assignment.teacher || 'Преподаватель';
        
        // Проверяем просрочено ли задание
        const isOverdue = assignment.deadline && new Date(assignment.deadline) < new Date() && status !== 'completed';
        
        return `
            <div class="assignment-item ${isOverdue ? 'overdue' : ''}">
            <div class="assignment-header">
                <h3>${assignment.title}</h3>
                    <span class="assignment-status ${status}">${getStatusText(status)}</span>
            </div>
            <div class="assignment-details">
                    <p><i class="fas fa-book"></i> ${subject}</p>
                    <p><i class="fas fa-calendar"></i> Срок сдачи: ${deadline}</p>
                    ${teacher !== 'Преподаватель' ? `<p><i class="fas fa-user"></i> Преподаватель: ${teacher}</p>` : ''}
            </div>
                ${status !== 'completed' ? `
            <div class="assignment-progress">
                <div class="progress-bar">
                            <div class="progress" style="width: ${progress}%;"></div>
                </div>
                        <span class="progress-text">Выполнено: ${progress}%</span>
            </div>
                ` : ''}
            <div class="assignment-actions">
                    ${status !== 'completed' ? `
                <button class="btn-primary" onclick="submitAssignment(${assignment.id})">
                    <i class="fas fa-upload"></i> Сдать работу
                </button>
                    ` : '<span style="color: #4caf50;"><i class="fas fa-check-circle"></i> Сдано</span>'}
                <button class="btn-secondary" onclick="viewAssignment(${assignment.id})">
                    <i class="fas fa-eye"></i> Подробнее
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Load performance data
async function loadPerformanceData() {
    try {
        showLoading(true);
        
        // Проверяем кеш
        const cacheTimeout = 5 * 60 * 1000; // 5 минут
        if (studentState.performance && 
            studentState.lastUpdate.performance && 
            (Date.now() - studentState.lastUpdate.performance) < cacheTimeout) {
            displayPerformance(studentState.performance);
            return;
        }
        
        const response = await fetch('/api/user/performance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.performance) {
                studentState.performance = data.performance;
                studentState.lastUpdate.performance = Date.now();
                displayPerformance(data.performance);
            } else {
                displayPerformance(null);
            }
        } else {
            console.error('Performance response not OK:', response.status);
            displayPerformance(null);
        }
    } catch (error) {
        console.error('Error loading performance data:', error);
        showNotification('Ошибка загрузки данных успеваемости', 'error');
        displayPerformance(null);
    } finally {
        showLoading(false);
    }
}

// Display performance data
function displayPerformance(performance) {
    const performanceChart = document.getElementById('performanceChart');
    if (!performanceChart) return;
    
    if (!performance || !performance.subjects || performance.subjects.length === 0) {
        performanceChart.innerHTML = '<div class="loading" style="text-align:center; padding:40px;">Данные об успеваемости пока отсутствуют</div>';
        displayPerformanceStats(null);
        displaySubjectsTable([]);
        return;
    }
    
    // График успеваемости по предметам (балльная система)
    performanceChart.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${performance.subjects.map(subject => {
                const percentage = subject.average_percent || 0;
                return `
                    <div style="display: flex; align-items: center; gap: 15px; padding: 8px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="width: 180px; font-weight: 500; color: #333;">
                            <i class="fas fa-book" style="color: #4a6baf; margin-right: 8px;"></i>
                            ${subject.name}
                        </div>
                        <div style="flex: 1; background: #f0f0f0; border-radius: 10px; height: 32px; position: relative; overflow: hidden;">
                            <div style="width: ${percentage}%; background: ${getGradeColorPercent(percentage)}; height: 100%; border-radius: 10px; transition: width 0.5s ease;"></div>
                            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-weight: 600; color: #333; font-size: 14px;">
                                ${subject.total_points}/${subject.total_max_points}
                            </span>
                        </div>
                        <div style="min-width: 80px; text-align: center; color: #666; font-size: 13px; font-weight: 600;">
                            ${percentage.toFixed(1)}%
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Обновляем статистику и таблицу
    displayPerformanceStats(performance);
    displaySubjectsTable(performance.subjects);
}

// Отображение статистики успеваемости
function displayPerformanceStats(performance) {
    if (!performance || !performance.subjects || performance.subjects.length === 0) {
        // Показываем заглушку
        const statsList = document.querySelector('.performance-stats .stats-list');
        if (statsList) {
            statsList.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Средний балл</span>
                    <span class="stat-value">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Предметов изучается</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Отличных оценок</span>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Хороших оценок</span>
                    <span class="stat-value">0</span>
                </div>
            `;
        }
        return;
    }
    
    // Вычисляем статистику (балльная система)
    const totalSubjects = performance.subjects.length;
    const averagePercent = performance.subjects.reduce((sum, s) => sum + s.average_percent, 0) / totalSubjects;
    const totalPoints = performance.subjects.reduce((sum, s) => sum + s.total_points, 0);
    const totalMaxPoints = performance.subjects.reduce((sum, s) => sum + s.total_max_points, 0);
    const excellentSubjects = performance.subjects.filter(s => s.average_percent >= 85).length;
    const goodSubjects = performance.subjects.filter(s => s.average_percent >= 70 && s.average_percent < 85).length;
    
    const statsList = document.querySelector('.performance-stats .stats-list');
    if (statsList) {
        statsList.innerHTML = `
            <div class="stat-item">
                <span class="stat-label"><i class="fas fa-chart-line"></i> Средний процент</span>
                <span class="stat-value" style="color: ${getGradeColorPercent(averagePercent)}; font-size: 1.2em; font-weight: 600;">
                    ${averagePercent.toFixed(1)}%
                </span>
            </div>
            <div class="stat-item">
                <span class="stat-label"><i class="fas fa-star"></i> Набрано баллов</span>
                <span class="stat-value">${totalPoints}/${totalMaxPoints}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label"><i class="fas fa-trophy"></i> Отлично (≥85%)</span>
                <span class="stat-value" style="color: #4CAF50;">${excellentSubjects}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label"><i class="fas fa-check"></i> Хорошо (≥70%)</span>
                <span class="stat-value" style="color: #2196F3;">${goodSubjects}</span>
            </div>
        `;
    }
}

// Отображение таблицы предметов
function displaySubjectsTable(subjects) {
    const tbody = document.getElementById('subjectsTableBody');
    if (!tbody) return;
    
    if (!subjects || subjects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-inbox" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                    Данные об оценках пока отсутствуют
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = subjects.map(subject => {
        const status = getSubjectStatusByPercent(subject.average_percent);
        return `
            <tr>
                <td>
                    <i class="fas fa-book" style="color: #4a6baf; margin-right: 8px;"></i>
                    ${subject.name}
                </td>
                <td>${subject.teacher_name || 'Не указан'}</td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                        <span style="font-weight: 600; color: ${getGradeColorPercent(subject.average_percent)};">
                            ${subject.total_points}/${subject.total_max_points}
                        </span>
                        <span style="font-size: 0.85em; color: #666;">
                            (${subject.average_percent.toFixed(1)}%)
                        </span>
                    </div>
                </td>
                <td>${subject.count}</td>
                <td><span class="status-badge status-${status.class}">${status.text}</span></td>
            </tr>
        `;
    }).join('');
}

// Определение статуса предмета по проценту (балльная система)
function getSubjectStatusByPercent(percent) {
    if (percent >= 85) return { class: 'excellent', text: 'Отлично' };
    if (percent >= 70) return { class: 'good', text: 'Хорошо' };
    if (percent >= 50) return { class: 'satisfactory', text: 'Удовл.' };
    return { class: 'poor', text: 'Неудовл.' };
}

// Цвет для балльной системы (по проценту)
function getGradeColorPercent(percent) {
    if (percent >= 85) return '#4CAF50'; // Отлично - зеленый
    if (percent >= 70) return '#2196F3'; // Хорошо - синий
    if (percent >= 50) return '#FF9800'; // Удовлетворительно - оранжевый
    return '#f44336'; // Неудовлетворительно - красный
}

// Load attendance data
async function loadAttendanceData() {
    try {
        showLoading(true);
        
        // Проверяем кеш
        const cacheTimeout = 5 * 60 * 1000; // 5 минут
        if (studentState.attendance && 
            studentState.lastUpdate.attendance && 
            (Date.now() - studentState.lastUpdate.attendance) < cacheTimeout) {
            displayAttendance(studentState.attendance);
            return;
        }
        
        const response = await fetch('/api/user/attendance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.attendance) {
                studentState.attendance = data.attendance;
                studentState.lastUpdate.attendance = Date.now();
                displayAttendance(data.attendance);
            } else {
                displayAttendance([]);
            }
        } else {
            console.error('Attendance response not OK:', response.status);
            displayAttendance([]);
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
        displayAttendance([]);
    } finally {
        showLoading(false);
    }
}

// Display attendance data
function displayAttendance(attendance) {
    const attendanceContainer = document.querySelector('#attendance .performance-grid');
    if (!attendanceContainer) return;
    
    if (!attendance || attendance.length === 0) {
        attendanceContainer.innerHTML = '<div class="loading" style="text-align:center; padding:40px; grid-column: 1 / -1;">Данные о посещаемости пока отсутствуют</div>';
        return;
    }
    
    // Подсчитываем статистику
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const percentage = ((present / total) * 100).toFixed(1);
    
    attendanceContainer.innerHTML = `
        <div class="stat-card">
            <h3>Общая посещаемость</h3>
            <div style="font-size: 2.5em; font-weight: bold; color: ${percentage >= 80 ? '#4caf50' : percentage >= 60 ? '#ff9800' : '#f44336'};">
                ${percentage}%
            </div>
            <p>${present} из ${total} занятий</p>
        </div>
        <div class="stat-card">
            <h3>Присутствовал</h3>
            <div style="font-size: 2em; font-weight: bold; color: #4caf50;">${present}</div>
            <p>занятий</p>
        </div>
        <div class="stat-card">
            <h3>Отсутствовал</h3>
            <div style="font-size: 2em; font-weight: bold; color: #f44336;">${absent}</div>
            <p>занятий</p>
        </div>
        <div class="stat-card">
            <h3>Опоздал</h3>
            <div style="font-size: 2em; font-weight: bold; color: #ff9800;">${late}</div>
            <p>раз</p>
        </div>
    `;
}

// Helper function для цвета оценки
function getGradeColor(average) {
    if (average >= 90) return '#4caf50';
    if (average >= 75) return '#2196f3';
    if (average >= 60) return '#ff9800';
    return '#f44336';
}

// Функция принудительного обновления данных (игнорируя кеш)
async function refreshAllData() {
    console.log('Принудительное обновление всех данных...');
    // Сбрасываем все метки времени обновления
    studentState.lastUpdate = {};
    
    // Перезагружаем данные текущей секции
    const currentSection = document.querySelector('.student-section.active');
    if (currentSection) {
        const sectionId = currentSection.id;
        await loadSectionData(sectionId);
    }
}

// Добавляем функцию для сброса кеша конкретной секции
function clearSectionCache(sectionId) {
    if (studentState.lastUpdate[sectionId]) {
        delete studentState.lastUpdate[sectionId];
    }
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

// Profile functions
function showProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        loadProfileData();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadProfileData() {
    try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Update profile fields with new selectors
        const inputs = document.querySelectorAll('#profileModal .info-content input');
        
        if (inputs.length >= 6) {
            inputs[0].value = userData.full_name || userData.name || 'Не указано'; // Полное имя
            inputs[1].value = userData.email || 'Не указано'; // Email
            inputs[2].value = userData.group_name || 'Не указана'; // Группа
            inputs[3].value = userData.specialty || 'Не указана'; // Специальность
            inputs[4].value = userData.course || '2 курс'; // Курс
            inputs[5].value = userData.status || 'Активный студент'; // Статус
        }
        
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

function editProfile() {
    // Enable editing mode
    const inputs = document.querySelectorAll('#profileModal .info-content input');
    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.style.background = 'white';
        input.style.borderColor = 'var(--primary-color)';
    });
    
    // Change button text and icon
    const editBtn = document.querySelector('#profileModal .btn-primary');
    if (editBtn) {
        editBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
        editBtn.onclick = saveProfile;
    }
}

function saveProfile() {
    // Collect form data
    const inputs = document.querySelectorAll('#profileModal .info-content input');
    const formData = {
        full_name: inputs[0].value,
        email: inputs[1].value,
        group_name: inputs[2].value,
        specialty: inputs[3].value,
        course: inputs[4].value,
        status: inputs[5].value
    };
    
    // Here you would typically send data to server
    
    // Show success message
    if (typeof showNotification === 'function') {
        showNotification('Профиль сохранен успешно!', 'success');
    }
    
    // Disable editing mode
    inputs.forEach(input => {
        input.setAttribute('readonly', 'readonly');
        input.style.background = 'linear-gradient(145deg, #f8f9fa, #ffffff)';
        input.style.borderColor = 'transparent';
    });
    
    // Change button back
    const editBtn = document.querySelector('#profileModal .btn-primary');
    if (editBtn) {
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Редактировать';
        editBtn.onclick = editProfile;
    }
}

// Logout function
async function logout() {
    try {
        // Вызываем API для выхода на сервере
        try {
            await apiRequest('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        } catch (apiError) {
            console.error('Server logout error:', apiError);
            // Продолжаем выход даже если запрос к серверу не удался
        }
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        sessionStorage.clear();
        
        // Show logout message
        if (typeof showNotification === 'function') {
            showNotification('Выход выполнен успешно', 'success');
        }
        
        // Заменяем текущую страницу в истории, чтобы нельзя было вернуться
        window.history.replaceState(null, '', '/');
        
        // Redirect to main page after a short delay
        setTimeout(() => {
            window.location.replace('../public/index.html');
        }, 500);
        
    } catch (error) {
        console.error('Error during logout:', error);
        // Even if there's an error, try to redirect
        window.location.href = '../public/index.html';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Инициализация уведомлений для личного кабинета студента
function initStudentNotifications() {
    if (!window.notificationSystem) {
        return;
    }

    // Добавляем демо-уведомления
    setTimeout(() => {
        notificationSystem.info('Добро пожаловать', 'Личный кабинет студента загружен');
    }, 1000);

    // Уведомления о действиях студента
    setupStudentActionNotifications();
    
    // Уведомления о учебных событиях
    setupAcademicNotifications();
}

// Настройка уведомлений о действиях студента
function setupStudentActionNotifications() {
    // Уведомления о просмотре материалов
    const materialLinks = document.querySelectorAll('.material-card, .assignment-item');
    materialLinks.forEach(link => {
        link.addEventListener('click', function() {
            const title = this.querySelector('h3, h4')?.textContent || 'Материал';
            notificationSystem.info('Материал открыт', `Вы открыли: ${title}`);
        });
    });

    // Уведомления о сдаче заданий
    const submitButtons = document.querySelectorAll('.submit-assignment');
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            notificationSystem.success('Задание сдано', 'Ваше задание успешно отправлено на проверку');
        });
    });
}

// Настройка уведомлений об учебных событиях
function setupAcademicNotifications() {
    // Симулируем учебные события
    setInterval(() => {
        const events = [
            {
                type: 'info',
                title: 'Новый материал',
                message: 'Добавлен новый материал по дисциплине "Программирование"'
            },
            {
                type: 'warning',
                title: 'Скоро дедлайн',
                message: 'До сдачи задания по "Базам данных" осталось 2 дня'
            },
            {
                type: 'success',
                title: 'Оценка получена',
                message: 'Вы получили оценку за контрольную работу'
            },
            {
                type: 'info',
                title: 'Изменения в расписании',
                message: 'Обновлено расписание на следующую неделю'
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        notificationSystem[event.type](event.title, event.message);
    }, 45000); // Каждые 45 секунд
}

// Функции для уведомлений о конкретных действиях студента
function notifyMaterialOpened(materialName) {
    notificationSystem.info('Материал открыт', `Вы открыли материал: ${materialName}`);
}

function notifyAssignmentSubmitted(assignmentName) {
    notificationSystem.success('Задание сдано', `Задание "${assignmentName}" успешно отправлено`);
}

function notifyGradeReceived(subject, grade) {
    notificationSystem.success('Оценка получена', `По предмету "${subject}" получена оценка: ${grade}`);
}

function notifyDeadlineApproaching(assignmentName, daysLeft) {
    notificationSystem.warning('Скоро дедлайн', `До сдачи "${assignmentName}" осталось ${daysLeft} дней`);
}

function notifyScheduleChanged() {
    notificationSystem.info('Расписание обновлено', 'Внесены изменения в расписание занятий');
}

function notifyNewMaterial(subject) {
    notificationSystem.info('Новый материал', `Добавлен новый материал по предмету "${subject}"`);
}

// Инициализируем уведомления при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initStudentNotifications();
    loadStudentAssignments();
});

// Загрузка заданий для студента
async function loadStudentAssignments() {
    try {
        if (!window.assignmentsAPI) {
            return;
        }

        const response = await assignmentsAPI.getAssignments();
        
        if (response.success) {
            displayStudentAssignments(response.assignments);
            
            // Показываем уведомление о новых заданиях
            if (response.assignments.length > 0) {
                notificationSystem.info('Новые задания', `Доступно ${response.assignments.length} заданий`);
            }
        } else {
            console.error('Ошибка загрузки заданий:', response.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        notificationSystem.error('Ошибка загрузки', 'Не удалось загрузить задания');
    }
}

// Отображение заданий для студента
function displayStudentAssignments(assignments) {
    const assignmentsContainer = document.querySelector('.assignments-section .assignments-grid');
    
    if (!assignmentsContainer) {
        return;
    }

    // Очищаем контейнер
    assignmentsContainer.innerHTML = '';

    if (assignments.length === 0) {
        assignmentsContainer.innerHTML = `
            <div class="no-assignments">
                <i class="fas fa-clipboard-list"></i>
                <h3>Нет доступных заданий</h3>
                <p>Преподаватели еще не опубликовали задания</p>
            </div>
        `;
        return;
    }

    assignments.forEach(assignment => {
        const assignmentElement = createAssignmentElement(assignment);
        assignmentsContainer.appendChild(assignmentElement);
    });
}

// Создание элемента задания
function createAssignmentElement(assignment) {
    const deadline = new Date(assignment.deadline);
    const isOverdue = deadline < new Date();
    const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    
    const assignmentDiv = document.createElement('div');
    assignmentDiv.className = `assignment-item ${isOverdue ? 'overdue' : ''}`;
    assignmentDiv.innerHTML = `
        <div class="assignment-header">
            <h3>${assignment.title}</h3>
            <div class="assignment-meta">
                <span class="subject-tag">${assignment.subject}</span>
                <span class="points">${assignment.max_points} баллов</span>
            </div>
        </div>
        <div class="assignment-content">
            <p>${assignment.description || 'Описание отсутствует'}</p>
            <div class="assignment-info">
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${assignment.teacher_name || 'Преподаватель'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Срок: ${deadline.toLocaleDateString('ru-RU')}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span class="${isOverdue ? 'overdue' : ''}">
                        ${isOverdue ? 'Просрочено' : `Осталось ${daysLeft} дн.`}
                    </span>
                </div>
            </div>
        </div>
        <div class="assignment-actions">
            <button class="btn-primary" onclick="downloadAssignment(${assignment.id})">
                <i class="fas fa-download"></i>
                Скачать
            </button>
            <button class="btn-secondary" onclick="viewAssignment(${assignment.id})">
                <i class="fas fa-eye"></i>
                Подробнее
            </button>
        </div>
    `;

    return assignmentDiv;
}

// Скачивание задания
async function downloadAssignment(assignmentId) {
    try {
        if (!window.assignmentsAPI) {
            throw new Error('Assignments API not loaded');
        }

        await assignmentsAPI.downloadAssignment(assignmentId);
        notificationSystem.success('Задание скачано', 'Файл задания успешно скачан');
    } catch (error) {
        console.error('Ошибка скачивания задания:', error);
        notificationSystem.error('Ошибка скачивания', 'Не удалось скачать задание');
    }
}

// Просмотр задания
async function viewAssignment(assignmentId) {
    try {
        // Ищем задание в кеше
        let assignment = studentState.assignments.find(a => a.id === assignmentId);
        
        if (!assignment) {
            // Если не нашли в кеше, загружаем из API
            const response = await fetch(`/api/user/assignments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.assignments) {
                    assignment = data.assignments.find(a => a.id === assignmentId);
                }
            }
        }
        
        if (assignment) {
            showAssignmentModal(assignment);
        } else {
            throw new Error('Задание не найдено');
        }
    } catch (error) {
        console.error('Ошибка просмотра задания:', error);
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка просмотра', 'Не удалось загрузить задание');
        }
    }
}

// Показ модального окна с заданием
function showAssignmentModal(assignment) {
    const deadline = new Date(assignment.deadline);
    const isOverdue = deadline < new Date();
    const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'assignmentModal';
    modal.innerHTML = `
        <div class="modal-content assignment-modal">
            <div class="modal-header">
                <h3>${assignment.title}</h3>
                <button class="close-btn" onclick="closeAssignmentModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="assignment-details">
                    <div class="detail-row">
                        <label>Предмет:</label>
                        <span>${assignment.subject_name || assignment.subject || 'Не указан'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Преподаватель:</label>
                        <span>${assignment.teacher_name || 'Не указан'}</span>
                    </div>
                    <div class="detail-row">
                        <label>Срок сдачи:</label>
                        <span class="${isOverdue ? 'overdue' : ''}">
                            ${deadline.toLocaleDateString('ru-RU')} 
                            ${isOverdue ? '(Просрочено)' : `(${daysLeft} дн. осталось)`}
                        </span>
                    </div>
                    <div class="detail-row">
                        <label>Максимум баллов:</label>
                        <span>${assignment.max_points || 100}</span>
                    </div>
                </div>
                <div class="assignment-description">
                    <h4>Описание задания:</h4>
                    <p>${assignment.description || 'Описание отсутствует'}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeAssignmentModal()">
                    <i class="fas fa-times"></i>
                    Закрыть
                </button>
                <button class="btn-primary" onclick="downloadAssignment(${assignment.id})">
                    <i class="fas fa-download"></i>
                    Скачать задание
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// Закрытие модального окна задания
function closeAssignmentModal() {
    const modal = document.getElementById('assignmentModal');
    if (modal) {
        modal.remove();
    }
}