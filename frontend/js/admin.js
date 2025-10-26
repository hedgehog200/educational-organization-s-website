// Admin Panel JavaScript
// Modern admin panel with beautiful UI

document.addEventListener('DOMContentLoaded', function() {
    // Небольшая задержка для загрузки данных аутентификации
    setTimeout(() => {
        if (!checkAuthOnLoad()) {
            return;
        }
        
        initializeAdminPanel();
        initAdminNotifications();
    }, 100);
});

// Проверка аутентификации при загрузке страницы
function checkAuthOnLoad() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('userData');
    
    if (!token) {
        window.location.href = '/';
        return false;
    }
    
    // Проверяем роль из localStorage или из userData
    let actualRole = userRole;
    if (!actualRole && userData) {
        try {
            const user = JSON.parse(userData);
            actualRole = user.role;
            if (actualRole) {
                localStorage.setItem('userRole', actualRole);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Редиректим только если роль ТОЧНО не admin
    // Если роли нет вообще - даем шанс checkAuthentication() проверить на сервере
    if (actualRole && actualRole !== 'admin') {
        if (actualRole === 'teacher') {
            window.location.href = '/teacher.html';
        } else if (actualRole === 'student') {
            window.location.href = '/lk.html';
        } else {
            window.location.href = '/';
        }
        return false;
    }
    
    return true;
}

// Initialize admin panel
async function initializeAdminPanel() {
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
        console.error('Error initializing admin panel:', error);
        showNotification('Ошибка инициализации панели', 'error');
    }
}

// Check user authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (!token) {
        window.location.href = '/';
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
            
            if (user.role !== 'admin') {
                window.location.href = '/lk.html';
                return;
            }
            
            // Update admin name
            document.getElementById('adminName').textContent = user.fullName || user.name || 'Администратор';
            
            // Сохраняем все данные пользователя в localStorage
            localStorage.setItem('userData', JSON.stringify(user));
            localStorage.setItem('userRole', user.role);
            localStorage.setItem('userId', user.id);
            
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/';
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
            window.location.href = '/';
            return;
        }
        
        // Проверяем роль из userRole или userData
        let userRole = localStorage.getItem('userRole');
        if (!userRole) {
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    userRole = user.role;
                    if (userRole) {
                        localStorage.setItem('userRole', userRole);
                    }
                } catch (e) {
                    console.error('Error parsing userData:', e);
                }
            }
        }
        
        // Редиректим только если роль ТОЧНО не admin
        if (userRole && userRole !== 'admin') {
            window.location.href = '/lk.html';
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
                window.location.href = '/';
                return;
            }
            
            // Проверяем роль из userRole или userData
            let userRole = localStorage.getItem('userRole');
            if (!userRole) {
                const userData = localStorage.getItem('userData');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        userRole = user.role;
                        if (userRole) {
                            localStorage.setItem('userRole', userRole);
                        }
                    } catch (e) {
                        console.error('Error parsing userData:', e);
                    }
                }
            }
            
            // Редиректим только если роль ТОЧНО не admin
            if (userRole && userRole !== 'admin') {
                window.location.href = '/lk.html';
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
    const sections = document.querySelectorAll('.admin-section');
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
        case 'users':
            await loadUsersData();
            break;
        case 'groups':
            await loadGroupsData();
            break;
        case 'subjects':
            await loadSubjects();
            break;
        case 'attendance':
            await loadAttendanceData();
            break;
        case 'reports':
            await loadReportsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load statistics
        const statsResponse = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            if (statsData.success) {
                updateStatsCards(statsData.stats);
            } else {
                console.error('Stats request failed:', statsData.message);
                showNotification('Ошибка: ' + statsData.message, 'error');
            }
        } else {
            const errorText = await statsResponse.text();
            console.error('Stats request failed with status:', statsResponse.status, errorText);
            showNotification(`Ошибка загрузки статистики (${statsResponse.status})`, 'error');
        }
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Ошибка загрузки данных панели: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update statistics cards
function updateStatsCards(stats) {
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        totalStudents: document.getElementById('totalStudents'),
        totalTeachers: document.getElementById('totalTeachers'),
        totalGroups: document.getElementById('totalGroups')
    };
    
    if (elements.totalUsers) elements.totalUsers.textContent = stats.total || 0;
    if (elements.totalStudents) elements.totalStudents.textContent = stats.students || 0;
    if (elements.totalTeachers) elements.totalTeachers.textContent = stats.teachers || 0;
    if (elements.totalGroups) elements.totalGroups.textContent = stats.groups || 0;
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/admin/activity?limit=10', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.activities) {
                displayActivities(data.activities);
            } else {
                console.error('Failed to load activities:', data.message);
                // Показываем заглушку если нет данных
                displayActivities([]);
            }
        } else {
            console.error('Activity request failed with status:', response.status);
            displayActivities([]);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        displayActivities([]);
    }
}

// Отображение активностей
function displayActivities(activities) {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
    
    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <p style="color: #999; text-align: center;">Пока нет активности</p>
                </div>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = activities.map(activity => {
        const icon = getActivityIcon(activity.action_type);
        const timeAgo = getTimeAgo(activity.created_at);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.action_description}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Получить иконку для типа активности
function getActivityIcon(actionType) {
    const icons = {
        'user_created': 'fas fa-user-plus',
        'user_updated': 'fas fa-user-edit',
        'user_deleted': 'fas fa-user-times',
        'login': 'fas fa-sign-in-alt',
        'logout': 'fas fa-sign-out-alt',
        'group_created': 'fas fa-layer-group',
        'group_updated': 'fas fa-edit',
        'group_deleted': 'fas fa-trash',
        'attendance_marked': 'fas fa-calendar-check',
        'material_uploaded': 'fas fa-file-upload',
        'assignment_created': 'fas fa-tasks',
        'assignment_graded': 'fas fa-check-circle',
        'password_changed': 'fas fa-key',
        'settings_updated': 'fas fa-cog'
    };
    
    return icons[actionType] || 'fas fa-info-circle';
}

// Получить относительное время (например, "2 минуты назад")
function getTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} ${getMinutesText(diffMins)} назад`;
    if (diffHours < 24) return `${diffHours} ${getHoursText(diffHours)} назад`;
    if (diffDays < 7) return `${diffDays} ${getDaysText(diffDays)} назад`;
    
    return past.toLocaleDateString('ru-RU');
}

function getMinutesText(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'минуту';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'минуты';
    return 'минут';
}

function getHoursText(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'час';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'часа';
    return 'часов';
}

function getDaysText(n) {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
    return 'дней';
}

// Load users data
async function loadUsersData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayUsers(data.users);
            } else {
                showNotification('Ошибка загрузки пользователей', 'error');
            }
        } else {
            showNotification('Ошибка загрузки пользователей', 'error');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    } finally {
        showLoading(false);
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.full_name || 'Не указано'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${getRoleDisplayName(user.role)}</span></td>
            <td>${user.group_name || 'Не указано'}</td>
            <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <button class="btn-secondary" onclick="editUser(${user.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="deleteUser(${user.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Администратор',
        'teacher': 'Преподаватель',
        'student': 'Студент'
    };
    return roleNames[role] || role;
}

// Load groups data
async function loadGroupsData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayGroups(data.groups);
            } else {
                showNotification('Ошибка загрузки групп', 'error');
            }
        } else {
            showNotification('Ошибка загрузки групп', 'error');
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        showNotification('Ошибка загрузки групп', 'error');
    } finally {
        showLoading(false);
    }
}

// Display groups
function displayGroups(groups) {
    const groupsGrid = document.getElementById('groupsGrid');
    if (!groupsGrid) return;
    
    if (groups.length === 0) {
        groupsGrid.innerHTML = '<div class="loading">Группы не найдены</div>';
        return;
    }
    
    groupsGrid.innerHTML = groups.map(group => `
        <div class="group-card">
            <div class="group-header">
                <div class="group-name">${group.name}</div>
                <div class="group-students">${group.student_count || 0} студентов</div>
            </div>
            <div class="group-info">
                <p><strong>Специальность:</strong> ${group.specialty || 'Не указано'}</p>
                <p><strong>Год:</strong> ${group.year || 'Не указан'}</p>
                <p><strong>Описание:</strong> ${group.description || 'Нет описания'}</p>
            </div>
            <div class="group-actions">
                <button class="btn-primary" onclick="showGroupStudents('${group.name}', ${group.id})">
                    <i class="fas fa-users"></i> Студенты
                </button>
                <button class="btn-primary" onclick="editGroup(${group.id})">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn-icon btn-danger" onclick="deleteGroup(${group.id})" title="Удалить группу">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Показать студентов группы
async function showGroupStudents(groupName, groupId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupName)}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                displayGroupStudentsModal(groupName, data.students);
            } else {
                showNotification('Ошибка загрузки студентов', 'error');
            }
        } else {
            showNotification('Ошибка загрузки студентов', 'error');
        }
    } catch (error) {
        console.error('Error loading group students:', error);
        showNotification('Ошибка загрузки студентов', 'error');
    } finally {
        showLoading(false);
    }
}

// Отобразить модальное окно со студентами группы
function displayGroupStudentsModal(groupName, students) {
    const modal = document.getElementById('groupStudentsModal');
    if (!modal) {
        console.error('Group students modal not found');
        return;
    }
    
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');
    
    if (modalTitle) {
        modalTitle.textContent = `Студенты группы ${groupName}`;
    }
    
    if (modalBody) {
        if (students.length === 0) {
            modalBody.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>Нет студентов</h3>
                    <p>В группе ${groupName} пока нет студентов</p>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="students-list">
                    <table class="students-table">
                        <thead>
                            <tr>
                                <th>№</th>
                                <th>ФИО</th>
                                <th>Email</th>
                                <th>Специальность</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.map((student, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>
                                        <div class="student-name">
                                            <i class="fas fa-user-graduate"></i>
                                            ${student.full_name || 'Не указано'}
                                        </div>
                                    </td>
                                    <td>${student.email || 'Не указан'}</td>
                                    <td>${student.specialty || 'Не указано'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="editUser(${student.id}); closeModal('groupStudentsModal');" title="Редактировать">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer-info">
                    <p><strong>Всего студентов:</strong> ${students.length}</p>
                </div>
            `;
        }
    }
    
    modal.style.display = 'flex';
}

// Load attendance data
async function loadAttendanceData() {
    try {
        showLoading(true);
        
        // Load attendance stats
        const statsResponse = await fetch('/api/admin/attendance/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                updateAttendanceStats(statsData.stats);
            }
        }
        
        // Load attendance records
        const response = await fetch('/api/admin/attendance', {
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

// Update attendance statistics
function updateAttendanceStats(stats) {
    const elements = {
        overallAttendance: document.getElementById('overallAttendance'),
        studentsToday: document.getElementById('studentsToday'),
        absencesThisWeek: document.getElementById('absencesThisWeek')
    };
    
    if (elements.overallAttendance) elements.overallAttendance.textContent = `${Math.round(stats.overallAttendance || 0)}%`;
    if (elements.studentsToday) elements.studentsToday.textContent = stats.studentsToday || 0;
    if (elements.absencesThisWeek) elements.absencesThisWeek.textContent = stats.absencesThisWeek || 0;
}

// Display attendance records
function displayAttendance(attendance) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Записи посещаемости не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = attendance.map(record => `
        <tr>
            <td>${record.student_name || 'Не указано'}</td>
            <td>${record.group_name || 'Не указано'}</td>
            <td>${record.subject_name || 'Не указано'}</td>
            <td>${formatDate(record.date)}</td>
            <td><span class="status-badge status-${record.status}">${getStatusDisplayName(record.status)}</span></td>
            <td>
                <button class="btn-secondary" onclick="editAttendance(${record.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="deleteAttendance(${record.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get status display name
function getStatusDisplayName(status) {
    const statusNames = {
        'present': 'Присутствовал',
        'absent': 'Отсутствовал',
        'late': 'Опоздал'
    };
    return statusNames[status] || status;
}

// Load reports data
async function loadReportsData() {
    // Reports data would be loaded here
}

// Load settings data
async function loadSettingsData() {
    // Settings data would be loaded here
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            searchUsers(this.value);
        });
    }
    
    // Form submissions
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    const addGroupForm = document.getElementById('addGroupForm');
    if (addGroupForm) {
        addGroupForm.addEventListener('submit', handleAddGroup);
    }
    
    // Edit user form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    // Edit group form
    const editGroupForm = document.getElementById('editGroupForm');
    if (editGroupForm) {
        editGroupForm.addEventListener('submit', handleEditGroup);
    }
    
    // Attendance form
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleAttendance);
    }
    
    // Edit attendance form
    const editAttendanceForm = document.getElementById('editAttendanceForm');
    if (editAttendanceForm) {
        editAttendanceForm.addEventListener('submit', handleEditAttendance);
    }
    
    // Reports form
    const reportsForm = document.getElementById('reportsForm');
    if (reportsForm) {
        reportsForm.addEventListener('submit', handleReports);
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettings);
    }
}

// Search users
function searchUsers(query) {
    const rows = document.querySelectorAll('#usersTableBody tr');
    const searchTerm = query.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Утилиты перенесены в utils.js

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Modal functions
async function showAddUserModal() {
    await loadGroupsForUserForm();
    showModal('addUserModal');
    
    // Setup role-based fields after modal is shown
    setTimeout(() => {
        setupRoleBasedFields();
    }, 300);
}

// Add event delegation for role changes
document.addEventListener('change', function(event) {
    if (event.target && event.target.id === 'userRole') {
        const specialtyGroup = document.getElementById('specialtyGroup');
        const groupGroup = document.getElementById('groupGroup');
        
        if (specialtyGroup && groupGroup) {
            toggleFieldsBasedOnRole(event.target.value, specialtyGroup, groupGroup);
        }
    }
});


// Load groups for user form dropdown
async function loadGroupsForUserForm() {
    try {
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                populateGroupDropdown(data.groups, 'userGroup');
            } else {
                populateGroupDropdown([], 'userGroup');
            }
        } else {
            populateGroupDropdown([], 'userGroup');
        }
    } catch (error) {
        console.error('Error loading groups for user form:', error);
        populateGroupDropdown([], 'userGroup');
    }
}

// Load groups for edit user form dropdown
async function loadGroupsForEditForm() {
    try {
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                populateGroupDropdown(data.groups, 'editUserGroup');
            } else {
                populateGroupDropdown([], 'editUserGroup');
            }
        } else {
            populateGroupDropdown([], 'editUserGroup');
        }
    } catch (error) {
        console.error('Error loading groups for edit form:', error);
        populateGroupDropdown([], 'editUserGroup');
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Setup role-based field visibility
function setupRoleBasedFields() {
    const roleSelect = document.getElementById('userRole');
    const specialtyGroup = document.getElementById('specialtyGroup');
    const groupGroup = document.getElementById('groupGroup');
    
    if (!roleSelect || !specialtyGroup || !groupGroup) {
        return;
    }
    
    // Remove any existing event listeners
    const newRoleSelect = roleSelect.cloneNode(true);
    roleSelect.parentNode.replaceChild(newRoleSelect, roleSelect);
    
    // Add event listener for role changes
    newRoleSelect.addEventListener('change', function() {
        toggleFieldsBasedOnRole(this.value, specialtyGroup, groupGroup);
    });
    
    // Set initial state
    toggleFieldsBasedOnRole(newRoleSelect.value, specialtyGroup, groupGroup);
}

// Toggle fields based on selected role
function toggleFieldsBasedOnRole(role, specialtyGroup, groupGroup) {
    if (!specialtyGroup || !groupGroup) {
        return;
    }
    
    // Reset fields
    specialtyGroup.classList.remove('hidden');
    groupGroup.classList.remove('hidden');
    
    // Clear values when hiding
    const specialtySelect = document.getElementById('userSpecialty');
    const groupSelect = document.getElementById('userGroup');
    const specialtyLabel = specialtyGroup.querySelector('label');
    const groupLabel = groupGroup.querySelector('label');
    
    if (role === 'teacher') {
        // For teachers: hide group, show specialty
        groupGroup.classList.add('hidden');
        specialtyGroup.classList.remove('hidden');
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа';
        
        // Ensure specialty dropdown is visible and clickable
        if (specialtySelect) {
            specialtySelect.style.display = 'block';
            specialtySelect.style.pointerEvents = 'auto';
            specialtySelect.style.zIndex = '10';
        }
    } else if (role === 'admin') {
        // For admins: hide both group and specialty
        specialtyGroup.classList.add('hidden');
        groupGroup.classList.add('hidden');
        if (specialtySelect) specialtySelect.value = '';
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'student') {
        // For students: show both group and specialty
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа *';
    } else {
        // Default: show both
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    }
}

function showAddGroupModal() {
    showModal('addGroupModal');
}


// Clear user form when modal is closed
function clearUserForm() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.reset();
        
        // Reset field visibility
        const specialtyGroup = document.getElementById('specialtyGroup');
        const groupGroup = document.getElementById('groupGroup');
        
        if (specialtyGroup && groupGroup) {
            specialtyGroup.classList.remove('hidden');
            groupGroup.classList.remove('hidden');
        }
    }
}

async function showAttendanceModal() {
    await loadGroupsForAttendanceForm();
    showModal('attendanceModal');
}

function showReportModal() {
    loadGroupsForReportForm();
    showModal('reportsModal');
}

function showSettingsModal() {
    loadSettingsData();
    showModal('settingsModal');
}

// Form handlers
async function handleAddUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        full_name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        specialty: formData.get('specialty'),
        group_name: formData.get('group')
    };
    
    // Валидация
    if (!userData.full_name || !userData.email || !userData.password || !userData.role) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    if (userData.password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    if (!isValidEmail(userData.email)) {
        showNotification('Введите корректный email адрес', 'error');
        return;
    }
    
    // Валидация в зависимости от роли
    if (userData.role === 'student') {
        if (!userData.specialty) {
            showNotification('Для студента необходимо указать специальность', 'error');
            return;
        }
        if (!userData.group_name) {
            showNotification('Для студента необходимо указать группу', 'error');
            return;
        }
    } else if (userData.role === 'teacher') {
        if (!userData.specialty) {
            showNotification('Для преподавателя необходимо указать специальность', 'error');
            return;
        }
    }
    
    try {
        showLoading(true);
        
        // Отключаем кнопку отправки
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Создание...';
        
        const response = await apiRequest('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Пользователь успешно создан', 'success');
                closeModal('addUserModal');
                event.target.reset();
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка создания пользователя', 'error');
            }
        } else {
            const error = await response.json();
            let errorMessage = 'Ошибка создания пользователя';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (response.status === 400) {
                errorMessage = 'Проверьте правильность заполнения полей';
            } else if (response.status === 409) {
                errorMessage = 'Пользователь с таким email уже существует';
            } else if (response.status === 500) {
                errorMessage = 'Внутренняя ошибка сервера';
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Ошибка создания пользователя', 'error');
    } finally {
        showLoading(false);
        
        // Восстанавливаем кнопку отправки
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Создать пользователя';
        }
    }
}

async function handleAddGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const groupData = {
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        year: formData.get('year'),
        description: formData.get('description')
    };
    
    try {
        showLoading(true);
        
        const response = await apiRequest('/api/admin/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(groupData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно создана', 'success');
                closeModal('addGroupModal');
                event.target.reset();
                await loadGroupsData();
                
                // Обновляем dropdown'ы с группами во всех формах
                await refreshAllGroupDropdowns();
            } else {
                showNotification(data.message || 'Ошибка создания группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка создания группы', 'error');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showNotification('Ошибка создания группы', 'error');
    } finally {
        showLoading(false);
    }
}

// User management functions
async function editUser(userId) {
    try {
        showLoading(true);
        
        // Load user data
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const user = data.user;
                
                // Load groups for dropdown FIRST
                await loadGroupsForEditForm();
                
                // Then populate form (including group selection)
                document.getElementById('editUserId').value = user.id;
                document.getElementById('editUserFullName').value = user.full_name || '';
                document.getElementById('editUserEmail').value = user.email || '';
                document.getElementById('editUserRole').value = user.role || '';
                document.getElementById('editUserSpecialty').value = user.specialty || '';
                
                // Установка группы после загрузки dropdown'а
                const groupSelect = document.getElementById('editUserGroup');
                if (groupSelect && user.group_name) {
                    groupSelect.value = user.group_name;
                }
                
                document.getElementById('editUserActive').checked = user.is_active || false;
                
                // Clear password field
                document.getElementById('editUserPassword').value = '';
                
                // Setup role-based fields
                setTimeout(() => {
                    setupEditRoleBasedFields();
                }, 300);
                
                showModal('editUserModal');
            } else {
                showNotification('Ошибка загрузки данных пользователя', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных пользователя', 'error');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Ошибка загрузки данных пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Пользователь успешно удален', 'success');
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка удаления пользователя', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления пользователя', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Ошибка удаления пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

// Group management functions
async function editGroup(groupId) {
    try {
        showLoading(true);
        
        // Load group data
        const response = await fetch(`/api/admin/groups/${groupId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const group = data.group;
                
                // Populate form
                document.getElementById('editGroupId').value = group.id;
                document.getElementById('editGroupName').value = group.name || '';
                document.getElementById('editGroupSpecialty').value = group.specialty || '';
                document.getElementById('editGroupYear').value = group.year || '';
                document.getElementById('editGroupDescription').value = group.description || '';
                
                showModal('editGroupModal');
            } else {
                showNotification('Ошибка загрузки данных группы', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных группы', 'error');
        }
    } catch (error) {
        console.error('Error loading group data:', error);
        showNotification('Ошибка загрузки данных группы', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно удалена', 'success');
                await loadGroupsData();
                
                // Обновляем dropdown'ы с группами во всех формах
                await refreshAllGroupDropdowns();
            } else {
                showNotification(data.message || 'Ошибка удаления группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления группы', 'error');
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        showNotification('Ошибка удаления группы', 'error');
    } finally {
        showLoading(false);
    }
}

// Attendance management functions
async function editAttendance(attendanceId) {
    try {
        showLoading(true);
        
        // Load attendance data
        const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const attendance = data.attendance;
                
                // Populate form
                document.getElementById('editAttendanceId').value = attendance.id;
                document.getElementById('editAttendanceStudent').value = attendance.student_name || '';
                document.getElementById('editAttendanceGroup').value = attendance.group_name || '';
                document.getElementById('editAttendanceSubject').value = attendance.subject_name || '';
                document.getElementById('editAttendanceDate').value = attendance.date || '';
                document.getElementById('editAttendanceStatus').value = attendance.status || '';
                document.getElementById('editAttendanceNotes').value = attendance.notes || '';
                
                showModal('editAttendanceModal');
            } else {
                showNotification('Ошибка загрузки данных посещаемости', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteAttendance(attendanceId) {
    if (!confirm('Вы уверены, что хотите удалить эту запись посещаемости?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/attendance/${attendanceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Запись посещаемости успешно удалена', 'success');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка удаления записи', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления записи', 'error');
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showNotification('Ошибка удаления записи', 'error');
    } finally {
        showLoading(false);
    }
}

// Report functions
function generateReport(type) {
    // Set the report type and show modal
    document.getElementById('reportType').value = type;
    loadGroupsForReportForm();
    showModal('reportsModal');
}

// Export functions
function exportUsers() {
    showNotification('Функция экспорта пользователей будет добавлена позже', 'info');
}

// New modal functions
async function loadGroupsForAttendanceForm() {
    try {
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                populateGroupDropdown(data.groups, 'attendanceGroup');
            }
        }
    } catch (error) {
        console.error('Error loading groups for attendance:', error);
    }
}

function loadGroupsForReportForm() {
    // Load groups for report form
    loadGroupsForAttendanceForm().then(() => {
        const attendanceSelect = document.getElementById('attendanceGroup');
        const reportSelect = document.getElementById('reportGroup');
        if (attendanceSelect && reportSelect) {
            reportSelect.innerHTML = attendanceSelect.innerHTML;
        }
    });
}

async function loadSettingsData() {
    try {
        const response = await fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const settings = data.settings;
                
                // Populate settings form
                document.getElementById('settingCollegeName').value = settings.collegeName || 'Университетский Колледж ВолГУ';
                document.getElementById('settingAcademicYear').value = settings.academicYear || '2024-2025';
                document.getElementById('settingMaxStudents').value = settings.maxStudents || 30;
                document.getElementById('settingEmailNotifications').checked = settings.emailNotifications || true;
                document.getElementById('settingPushNotifications').checked = settings.pushNotifications || true;
                document.getElementById('settingAttendanceAlerts').checked = settings.attendanceAlerts || true;
                document.getElementById('settingSessionTimeout').value = settings.sessionTimeout || 60;
                document.getElementById('settingRequireStrongPasswords').checked = settings.requireStrongPasswords || true;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Setup role-based fields for edit user form
function setupEditRoleBasedFields() {
    const roleSelect = document.getElementById('editUserRole');
    const specialtyGroup = document.getElementById('editSpecialtyGroup');
    const groupGroup = document.getElementById('editGroupGroup');
    
    if (!roleSelect || !specialtyGroup || !groupGroup) {
        return;
    }
    
    // Add event listener for role changes
    roleSelect.addEventListener('change', function() {
        toggleEditFieldsBasedOnRole(this.value, specialtyGroup, groupGroup);
    });
    
    // Set initial state
    toggleEditFieldsBasedOnRole(roleSelect.value, specialtyGroup, groupGroup);
}

// Toggle fields based on selected role for edit form
function toggleEditFieldsBasedOnRole(role, specialtyGroup, groupGroup) {
    if (!specialtyGroup || !groupGroup) {
        return;
    }
    
    // Reset fields
    specialtyGroup.classList.remove('hidden');
    groupGroup.classList.remove('hidden');
    
    // Clear values when hiding
    const specialtySelect = document.getElementById('editUserSpecialty');
    const groupSelect = document.getElementById('editUserGroup');
    const specialtyLabel = specialtyGroup.querySelector('label');
    const groupLabel = groupGroup.querySelector('label');
    
    if (role === 'teacher') {
        // For teachers: hide group, show specialty
        groupGroup.classList.add('hidden');
        specialtyGroup.classList.remove('hidden');
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'admin') {
        // For admins: hide both group and specialty
        specialtyGroup.classList.add('hidden');
        groupGroup.classList.add('hidden');
        if (specialtySelect) specialtySelect.value = '';
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'student') {
        // For students: show both group and specialty
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа *';
    } else {
        // Default: show both
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    }
}

// Populate group dropdown helper
function populateGroupDropdown(groups, selectId) {
    const groupSelect = document.getElementById(selectId);
    if (!groupSelect) {
        return;
    }
    
    // Сохраняем текущее выбранное значение
    const currentValue = groupSelect.value;
    
    // Clear existing options except the first one
    groupSelect.innerHTML = '<option value="">Выберите группу</option>';
    
    if (groups && groups.length > 0) {
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.name;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение, если оно еще существует
        if (currentValue) {
            const optionExists = Array.from(groupSelect.options).some(opt => opt.value === currentValue);
            if (optionExists) {
                groupSelect.value = currentValue;
            }
        }
    } else {
        // Add option if no groups available
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Группы не найдены';
        option.disabled = true;
        groupSelect.appendChild(option);
    }
}

// Обновить все dropdown'ы с группами во всех формах
async function refreshAllGroupDropdowns() {
    try {
        // Загружаем актуальный список групп
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.groups) {
                // Обновляем все dropdown'ы
                const dropdownIds = [
                    'userGroup',          // Форма создания пользователя
                    'editUserGroup',      // Форма редактирования пользователя
                    'attendanceGroup',    // Форма посещаемости
                    'reportGroup'         // Форма отчетов
                ];
                
                dropdownIds.forEach(id => {
                    const select = document.getElementById(id);
                    if (select) {
                        populateGroupDropdown(data.groups, id);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error refreshing group dropdowns:', error);
    }
}

// Load students for attendance
async function loadStudentsForAttendance(groupName) {
    try {
        const response = await fetch(`/api/admin/groups/${groupName}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayStudentsForAttendance(data.students);
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Display students for attendance marking
function displayStudentsForAttendance(students) {
    const studentsList = document.getElementById('studentsList');
    if (!studentsList) return;
    
    studentsList.innerHTML = students.map(student => `
        <div class="student-attendance-item">
            <div class="student-info">
                <span class="student-name">${student.full_name || student.name}</span>
                <span class="student-id">ID: ${student.id}</span>
            </div>
            <div class="attendance-status">
                <select name="student_${student.id}_status" required>
                    <option value="">Выберите статус</option>
                    <option value="present">Присутствовал</option>
                    <option value="absent">Отсутствовал</option>
                    <option value="late">Опоздал</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Event listener for group change in attendance form
document.addEventListener('change', function(event) {
    if (event.target && event.target.id === 'attendanceGroup') {
        if (event.target.value) {
            loadStudentsForAttendance(event.target.value);
        } else {
            document.getElementById('studentsList').innerHTML = '';
        }
    }
});

// Form handlers for new modals
async function handleEditUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('userId');
    const userData = {
        full_name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        specialty: formData.get('specialty'),
        group_name: formData.get('group'),
        is_active: formData.get('isActive') === 'on'
    };
    
    // Валидация пароля если он предоставлен
    if (userData.password && userData.password.trim() !== '') {
        if (userData.password.length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'error');
            showLoading(false);
            return;
        }
    } else {
        // Remove empty password
        delete userData.password;
    }
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const passwordChanged = userData.password ? ' (пароль изменен)' : '';
                showNotification(`Пользователь успешно обновлен${passwordChanged}`, 'success');
                closeModal('editUserModal');
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка обновления пользователя', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления пользователя', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Ошибка обновления пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const groupId = formData.get('groupId');
    const groupData = {
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        year: formData.get('year'),
        description: formData.get('description')
    };
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(groupData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно обновлена', 'success');
                closeModal('editGroupModal');
                await loadGroupsData();
                
                // Обновляем dropdown'ы с группами во всех формах
                await refreshAllGroupDropdowns();
            } else {
                showNotification(data.message || 'Ошибка обновления группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления группы', 'error');
        }
    } catch (error) {
        console.error('Error updating group:', error);
        showNotification('Ошибка обновления группы', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAttendance(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const attendanceData = {
        group: formData.get('group'),
        subject: formData.get('subject'),
        date: formData.get('date'),
        time: formData.get('time'),
        students: []
    };
    
    // Collect student attendance data
    const studentSelects = document.querySelectorAll('[name^="student_"][name$="_status"]');
    studentSelects.forEach(select => {
        if (select.value) {
            const studentId = select.name.match(/student_(\d+)_status/)[1];
            attendanceData.students.push({
                student_id: studentId,
                status: select.value
            });
        }
    });
    
    try {
        showLoading(true);
        
        const response = await apiRequest('/api/admin/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Посещаемость успешно отмечена', 'success');
                closeModal('attendanceModal');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка отметки посещаемости', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка отметки посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showNotification('Ошибка отметки посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditAttendance(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const attendanceId = formData.get('attendanceId');
    const attendanceData = {
        date: formData.get('date'),
        status: formData.get('status'),
        notes: formData.get('notes')
    };
    
    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/attendance/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Посещаемость успешно обновлена', 'success');
                closeModal('editAttendanceModal');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка обновления посещаемости', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        showNotification('Ошибка обновления посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleReports(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const reportData = {
        type: formData.get('type'),
        group: formData.get('group'),
        dateFrom: formData.get('dateFrom'),
        dateTo: formData.get('dateTo'),
        format: formData.get('format')
    };
    
    try {
        showLoading(true);
        
        const response = await apiRequest('/api/admin/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Отчёт успешно создан', 'success');
                closeModal('reportsModal');
                
                // Download the report if URL provided
                if (data.reportUrl) {
                    window.open(data.reportUrl, '_blank');
                }
            } else {
                showNotification(data.message || 'Ошибка создания отчёта', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка создания отчёта', 'error');
        }
    } catch (error) {
        console.error('Error creating report:', error);
        showNotification('Ошибка создания отчёта', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSettings(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const settingsData = {
        collegeName: formData.get('collegeName'),
        academicYear: formData.get('academicYear'),
        maxStudents: parseInt(formData.get('maxStudents')),
        emailNotifications: formData.get('emailNotifications') === 'on',
        pushNotifications: formData.get('pushNotifications') === 'on',
        attendanceAlerts: formData.get('attendanceAlerts') === 'on',
        sessionTimeout: parseInt(formData.get('sessionTimeout')),
        requireStrongPasswords: formData.get('requireStrongPasswords') === 'on'
    };
    
    try {
        showLoading(true);
        
        const response = await apiRequest('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(settingsData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Настройки успешно сохранены', 'success');
                closeModal('settingsModal');
            } else {
                showNotification(data.message || 'Ошибка сохранения настроек', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка сохранения настроек', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Ошибка сохранения настроек', 'error');
    } finally {
        showLoading(false);
    }
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

// Инициализация уведомлений для админ-панели
function initAdminNotifications() {
    if (!window.notificationSystem) {
        return;
    }

    // Добавляем демо-уведомления
    setTimeout(() => {
        notificationSystem.info('Добро пожаловать', 'Панель администратора загружена');
    }, 1000);

    // Уведомления о действиях пользователей
    setupUserActionNotifications();
    
    // Уведомления о системных событиях
    setupSystemNotifications();
}

// Настройка уведомлений о действиях пользователей
function setupUserActionNotifications() {
    // Перехватываем создание пользователей
    const originalShowAddUserModal = window.showAddUserModal;
    if (originalShowAddUserModal) {
        window.showAddUserModal = function() {
            notificationSystem.info('Создание пользователя', 'Открыта форма создания нового пользователя');
            return originalShowAddUserModal();
        };
    }

    // Перехватываем редактирование пользователей
    const originalEditUser = window.editUser;
    if (originalEditUser) {
        window.editUser = function(userId) {
            notificationSystem.info('Редактирование пользователя', `Открыта форма редактирования пользователя ID: ${userId}`);
            return originalEditUser(userId);
        };
    }
}

// Настройка системных уведомлений
function setupSystemNotifications() {
    // Симулируем системные события
    setInterval(() => {
        const events = [
            {
                type: 'info',
                title: 'Новый пользователь',
                message: 'Зарегистрирован новый студент в системе'
            },
            {
                type: 'warning',
                title: 'Низкая посещаемость',
                message: 'В группе ИБАСкд-232 низкая посещаемость'
            },
            {
                type: 'success',
                title: 'Задача выполнена',
                message: 'Автоматическое резервное копирование завершено'
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        notificationSystem[event.type](event.title, event.message);
    }, 30000); // Каждые 30 секунд
}

// Функции для уведомлений о конкретных действиях
function notifyUserCreated(userData) {
    notificationSystem.success('Пользователь создан', `Создан пользователь: ${userData.full_name}`);
}

function notifyUserUpdated(userData) {
    notificationSystem.info('Пользователь обновлен', `Обновлен пользователь: ${userData.full_name}`);
}

function notifyUserDeleted(userId) {
    notificationSystem.warning('Пользователь удален', `Удален пользователь с ID: ${userId}`);
}

function notifyGroupCreated(groupData) {
    notificationSystem.success('Группа создана', `Создана группа: ${groupData.name}`);
}

function notifyAttendanceMarked(studentName, status) {
    const statusText = status === 'present' ? 'присутствует' : 'отсутствует';
    notificationSystem.info('Посещаемость отмечена', `${studentName} - ${statusText}`);
}

function notifyReportGenerated(reportType) {
    notificationSystem.success('Отчет сгенерирован', `Создан отчет: ${reportType}`);
}

function notifySystemError(error) {
    notificationSystem.error('Системная ошибка', error.message || 'Произошла неизвестная ошибка');
}

// =========================================
// УПРАВЛЕНИЕ ДИСЦИПЛИНАМИ
// =========================================

// Загрузить дисциплины
async function loadSubjects() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/subjects-detailed', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            if (data.success) {
                displaySubjects(data.subjects);
            } else {
                showNotification('Ошибка: ' + data.message, 'error');
            }
        } else {
            showNotification(`Ошибка загрузки дисциплин (${response.status})`, 'error');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        showNotification('Ошибка загрузки дисциплин: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Отобразить дисциплины в таблице
function displaySubjects(subjects) {
    const tbody = document.getElementById('subjectsTableBody');
    
    if (!tbody) return;

    if (subjects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>Нет дисциплин</h3>
                    <p>Создайте первую дисциплину, нажав на кнопку выше</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = subjects.map(subject => {
        // Форматирование преподавателей с бейджами
        let teachersHTML = '';
        if (subject.teachers) {
            const teacherNames = subject.teachers.split(', ');
            teachersHTML = `
                <div class="teachers-list">
                    ${teacherNames.map(name => `
                        <span class="teacher-badge">
                            <i class="fas fa-user"></i> ${name}
                        </span>
                    `).join('')}
                </div>
            `;
        } else {
            teachersHTML = '<span class="no-teachers"><i class="fas fa-user-slash"></i> Не назначено</span>';
        }

        return `
            <tr>
                <td>${subject.id}</td>
                <td><strong>${subject.name}</strong></td>
                <td>${subject.description || '<span style="color: #999;">—</span>'}</td>
                <td><span class="credits-badge"><i class="fas fa-clock"></i> ${subject.credits || 0} ч</span></td>
                <td>${teachersHTML}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-icon" onclick="showAssignTeacherModal(${subject.id}, '${subject.name.replace(/'/g, "\\'")}');" title="Назначить преподавателя">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    <button class="btn-icon" onclick="editSubject(${subject.id});" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteSubject(${subject.id}, '${subject.name.replace(/'/g, "\\'")}');" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Показать модальное окно создания дисциплины
function showAddSubjectModal() {
    const modal = document.getElementById('addSubjectModal');
    if (modal) {
        // Очищаем форму
        document.getElementById('addSubjectForm').reset();
        modal.style.display = 'flex';
    }
}

// Обработка создания дисциплины
async function handleAddSubject(event) {
    event.preventDefault();
    
    const name = document.getElementById('subjectName').value;
    const description = document.getElementById('subjectDescription').value;
    const credits = document.getElementById('subjectCredits').value;

    try {
        showLoading(true);
        
        const response = await apiRequest('/api/admin/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name,
                description,
                credits: parseInt(credits) || 0
            })
        });

        if (response.success) {
            showNotification('Дисциплина успешно создана', 'success');
            closeModal('addSubjectModal');
            loadSubjects(); // Перезагружаем список
        } else {
            showNotification('Ошибка: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error creating subject:', error);
        showNotification('Ошибка создания дисциплины', 'error');
    } finally {
        showLoading(false);
    }
}

// Редактировать дисциплину
async function editSubject(subjectId) {
    try {
        // Получаем данные дисциплины
        const response = await fetch('/api/admin/subjects', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const subject = data.subjects.find(s => s.id === subjectId);
            
            if (subject) {
                // Заполняем форму
                document.getElementById('editSubjectId').value = subject.id;
                document.getElementById('editSubjectName').value = subject.name;
                document.getElementById('editSubjectDescription').value = subject.description || '';
                document.getElementById('editSubjectCredits').value = subject.credits || 0;
                document.getElementById('editSubjectActive').checked = subject.is_active === 1;
                
                // Показываем модальное окно
                const modal = document.getElementById('editSubjectModal');
                if (modal) {
                    modal.style.display = 'flex';
                }
            }
        }
    } catch (error) {
        console.error('Error loading subject for edit:', error);
        showNotification('Ошибка загрузки данных дисциплины', 'error');
    }
}

// Обработка редактирования дисциплины
async function handleEditSubject(event) {
    event.preventDefault();
    
    const id = document.getElementById('editSubjectId').value;
    const name = document.getElementById('editSubjectName').value;
    const description = document.getElementById('editSubjectDescription').value;
    const credits = document.getElementById('editSubjectCredits').value;
    const is_active = document.getElementById('editSubjectActive').checked ? 1 : 0;

    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/subjects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name,
                description,
                credits: parseInt(credits) || 0,
                is_active
            })
        });

        if (response.success) {
            showNotification('Дисциплина успешно обновлена', 'success');
            closeModal('editSubjectModal');
            loadSubjects(); // Перезагружаем список
        } else {
            showNotification('Ошибка: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error updating subject:', error);
        showNotification('Ошибка обновления дисциплины', 'error');
    } finally {
        showLoading(false);
    }
}

// Удалить дисциплину
async function deleteSubject(subjectId, subjectName) {
    if (!confirm(`Вы уверены, что хотите удалить дисциплину "${subjectName}"?\n\nДисциплина будет деактивирована, но данные сохранятся.`)) {
        return;
    }

    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/subjects/${subjectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.success) {
            showNotification('Дисциплина успешно удалена', 'success');
            loadSubjects(); // Перезагружаем список
        } else {
            showNotification('Ошибка: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        showNotification('Ошибка удаления дисциплины', 'error');
    } finally {
        showLoading(false);
    }
}

// Показать модальное окно назначения преподавателя
async function showAssignTeacherModal(subjectId, subjectName) {
    try {
        // Загружаем список всех преподавателей
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            
            // Фильтруем только преподавателей и админов
            const teachers = data.users.filter(u => u.role === 'teacher' || u.role === 'admin');
            
            // Заполняем select
            const select = document.getElementById('assignTeacherId');
            select.innerHTML = '<option value="">Выберите преподавателя</option>';
            teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = `${teacher.full_name} (${teacher.email})`;
                select.appendChild(option);
            });
            
            // Заполняем форму
            document.getElementById('assignSubjectId').value = subjectId;
            document.getElementById('assignSubjectName').value = subjectName;
            
            // Показываем модальное окно
            const modal = document.getElementById('assignTeacherModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        showNotification('Ошибка загрузки списка преподавателей', 'error');
    }
}

// Обработка назначения преподавателя
async function handleAssignTeacher(event) {
    event.preventDefault();
    
    const subjectId = document.getElementById('assignSubjectId').value;
    const teacherId = document.getElementById('assignTeacherId').value;

    if (!teacherId) {
        showNotification('Выберите преподавателя', 'warning');
        return;
    }

    try {
        showLoading(true);
        
        const response = await apiRequest(`/api/admin/subjects/${subjectId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                teacher_id: parseInt(teacherId)
            })
        });

        if (response.success) {
            showNotification('Преподаватель успешно назначен', 'success');
            closeModal('assignTeacherModal');
            loadSubjects(); // Перезагружаем список
        } else {
            showNotification('Ошибка: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error assigning teacher:', error);
        showNotification('Ошибка назначения преподавателя', 'error');
    } finally {
        showLoading(false);
    }
}

// Функция выхода из системы
async function logout() {
    try {
        // Вызываем API для выхода на сервере
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
            };
            
            // Добавляем Authorization header если есть токен
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            await apiRequest('/api/auth/logout', {
                method: 'POST',
                headers: headers
            });
        } catch (apiError) {
            console.error('Server logout error:', apiError);
            // Продолжаем выход даже если запрос к серверу не удался
        }
        
        // Очищаем токен аутентификации
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userData');
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // Заменяем текущую страницу в истории, чтобы нельзя было вернуться
        window.history.replaceState(null, '', '/');
        
        // Перенаправляем на главную страницу
        window.location.replace('../public/index.html');
        
    } catch (error) {
        console.error('Error during logout:', error);
        // В случае ошибки все равно перенаправляем на главную
        window.location.replace('../public/index.html');
    }
}

// Защита от кнопки "Назад" браузера
window.addEventListener('beforeunload', function(e) {
    // Если пользователь пытается покинуть админ панель через кнопку "Назад"
    if (window.location.pathname.includes('admin.html')) {
        // Очищаем данные аутентификации
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
    }
});

// Обработка кнопки "Назад" браузера - отключено, мешает работе вкладок
// ПРИМЕЧАНИЕ: hashchange обрабатывается в initializeNavigation()
// Переходы между вкладками (hash navigation) должны работать свободно
